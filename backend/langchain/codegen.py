import os
import re
import logging
from dataclasses import dataclass

from dotenv import load_dotenv
load_dotenv()

from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.exceptions import OutputParserException

try:
    import groq
except ImportError:
    groq = None

from prompts import DESIGN_SYSTEM_CONTEXT, CODEGEN_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

if not logger.handlers:
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    file_handler = logging.FileHandler("auragen_codegen.log", encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)


MODEL_NAME = os.getenv("CODEGEN_MODEL", "llama-3.3-70b-versatile")
TEMPERATURE = 0.3

REQUIRED_ENV_VARS = ("GROQ_API_KEY",)


class CodegenError(Exception):
    """Base exception for codegen failures."""


class ConfigurationError(CodegenError):
    """Raised when required config/env is missing."""


class InvalidInputError(CodegenError):
    """Raised when caller-supplied inputs fail validation."""


class GenerationError(CodegenError):
    """Raised when the LLM call itself fails (timeout, API error, rate limit, etc.)."""


class EmptyOutputError(CodegenError):
    """Raised when the model returns nothing usable."""


class MalformedComponentError(CodegenError):
    """Raised when extracted code doesn't meet the design-system's output contract."""


@dataclass
class FrictionContext:
    cognitive_load_score: int
    field_name: str
    signal_summary: str
    original_field_type: str


def _check_env():
    missing = [v for v in REQUIRED_ENV_VARS if not os.getenv(v)]
    if missing:
        raise ConfigurationError(
            f"Missing required environment variable(s): {', '.join(missing)}"
        )


def _validate_inputs(cognitive_load_score, field_name, signal_summary, original_field_type):
    errors = []

    if not isinstance(cognitive_load_score, (int, float)):
        errors.append("cognitive_load_score must be numeric")
    elif not (0 <= cognitive_load_score <= 100):
        errors.append("cognitive_load_score must be between 0 and 100")

    if not field_name or not str(field_name).strip():
        errors.append("field_name must be a non-empty string")

    if not signal_summary or not str(signal_summary).strip():
        errors.append("signal_summary must be a non-empty string")

    if not original_field_type or not str(original_field_type).strip():
        errors.append("original_field_type must be a non-empty string")

    if errors:
        raise InvalidInputError("; ".join(errors))


def _build_chain():
    try:
        prompt = PromptTemplate(
            input_variables=[
                "design_system",
                "cognitive_load_score",
                "field_name",
                "signal_summary",
                "original_field_type",
            ],
            template=CODEGEN_PROMPT_TEMPLATE,
        )
        llm = ChatGroq(model=MODEL_NAME, temperature=TEMPERATURE)
        parser = StrOutputParser()
        return prompt | llm | parser
    except Exception as e:
        raise ConfigurationError(f"Failed to build generation chain: {e}") from e


_chain = None


def _get_chain():
    global _chain
    if _chain is None:
        logger.info("Building generation chain (model=%s, temperature=%s)", MODEL_NAME, TEMPERATURE)
        _chain = _build_chain()
    return _chain


def generate_component(
    cognitive_load_score,
    field_name,
    signal_summary,
    original_field_type,
    max_retries=2,
):
    """
    Generate a simplified React (.tsx) replacement component for a UI field
    that a user is struggling with, based on detected friction signals.

    Args:
        cognitive_load_score (int|float): Friction Engine's score (0-100)
            for how much difficulty the user is having with this field.
        field_name (str): Human-readable name of the field/section, e.g.
            "Annual Income" or "Country".
        signal_summary (str): Short description of the telemetry signals
            that triggered this, e.g. "3 rage clicks, 4s hesitation".
        original_field_type (str): Description of the current UI element
            being replaced.
        max_retries (int): Retry attempts on transient LLM failures.
            Default 2 (3 total attempts).

    Returns:
        str: Clean TSX source code, fence stripped, guaranteed to contain
            'export default'.

    Raises:
        ConfigurationError, InvalidInputError, GenerationError,
        EmptyOutputError, MalformedComponentError
    """

    _check_env()
    _validate_inputs(cognitive_load_score, field_name, signal_summary, original_field_type)

    chain = _get_chain()

    prompt_inputs = {
        "design_system": DESIGN_SYSTEM_CONTEXT,
        "cognitive_load_score": cognitive_load_score,
        "field_name": field_name,
        "signal_summary": signal_summary,
        "original_field_type": original_field_type,
    }

    # --- Log what's being sent (Day 5) ---
    logger.info(
        "PROMPT SENT | field_name=%r | cognitive_load_score=%s | "
        "signal_summary=%r | original_field_type=%r",
        field_name, cognitive_load_score, signal_summary, original_field_type,
    )
    logger.debug("Full prompt inputs: %s", prompt_inputs)

    last_exc = None
    raw_output = None
    for attempt in range(1, max_retries + 2):
        try:
            raw_output = chain.invoke(prompt_inputs)
            break
        except OutputParserException as e:
            logger.error("Failed to parse model output: %s", e)
            raise GenerationError(f"Failed to parse model output: {e}") from e
        except Exception as e:
            last_exc = e
            is_rate_limit = groq is not None and isinstance(e, getattr(groq, "RateLimitError", ()))
            is_timeout = "timeout" in str(e).lower()
            logger.warning(
                "generate_component attempt %d/%d failed (%s): %s",
                attempt, max_retries + 1, type(e).__name__, e,
            )
            if attempt == max_retries + 1:
                kind = "rate limit" if is_rate_limit else "timeout" if is_timeout else "API error"
                raise GenerationError(
                    f"LLM call failed after {attempt} attempt(s) ({kind}): {e}"
                ) from e
            continue
    else:
        raise GenerationError(f"LLM call failed: {last_exc}") from last_exc

    response_preview = (raw_output or "")[:300].replace("\n", " ")
    logger.info(
        "RESPONSE RECEIVED | field_name=%r | length=%d chars | preview=%r",
        field_name, len(raw_output or ""), response_preview,
    )
    logger.debug("Full raw response: %s", raw_output)

    if not raw_output or not raw_output.strip():
        raise EmptyOutputError("Model returned an empty response")

    code = _extract_code_block(raw_output)

    if not code:
        raise EmptyOutputError("No usable code found in model output")

    _validate_component_contract(code, field_name)

    logger.info("Generation succeeded for field_name=%r (%d chars of code)", field_name, len(code))

    return code


def _extract_code_block(text):
    if not text:
        return ""
    match = re.search(r"```(?:tsx|jsx|javascript)?\s*(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    raise MalformedComponentError(
        "Model output did not contain a fenced code block "
        "(expected a single ```tsx ... ``` block per the design-system contract)"
    )


def _validate_component_contract(code, field_name):
    if "export default" not in code:
        raise MalformedComponentError(
            "Generated component has no 'export default' "
            "(design system requires a single default export)"
        )

    if not re.search(r"\b[A-Z][A-Za-z0-9]*(Wizard|Step)\b", code):
        logger.warning(
            "Generated component for field '%s' doesn't follow the "
            "'...Wizard'/'...Step' naming convention", field_name,
        )

    forbidden_imports = ("@mui", "antd", "shadcn", "styled-components")
    for lib in forbidden_imports:
        if lib in code:
            logger.warning(
                "Generated component for field '%s' imports disallowed "
                "library '%s' per design-system rules", field_name, lib,
            )


if __name__ == "__main__":
    sample = FrictionContext(
        cognitive_load_score=82,
        field_name="Annual Income",
        signal_summary="3 rage clicks, 4s hesitation, field re-focused 5 times",
        original_field_type="numeric currency input with tooltip",
    )

    print("Generating component for sample friction context...\n")
    try:
        code = generate_component(
            sample.cognitive_load_score,
            sample.field_name,
            sample.signal_summary,
            sample.original_field_type,
        )
        print(code)
    except ConfigurationError as e:
        print(f"Configuration error — check your .env / API keys: {e}")
    except InvalidInputError as e:
        print(f"Invalid input: {e}")
    except GenerationError as e:
        print(f"Generation failed: {e}")
    except EmptyOutputError as e:
        print(f"Model returned nothing usable: {e}")
    except MalformedComponentError as e:
        print(f"Generated component failed contract validation: {e}")
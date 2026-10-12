import os
import re
import logging
import hashlib
import json
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

from prompts import (
    DESIGN_SYSTEM_CONTEXT,
    CODEGEN_PROMPT_TEMPLATE,
    build_context_section,
)
from dom_sanitizer import (
    sanitize_dom_snapshot,
    sanitize_field_values,
)
from babel_bridge import (
    validate_component_code,
    SyntaxValidationError,
    SecurityValidationError,
    ValidatorUnavailableError,
)

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


MODEL_NAME = os.getenv("CODEGEN_MODEL", "openai/gpt-oss-120b")
TEMPERATURE = 0.3
MAX_OUTPUT_TOKENS = 1024
CACHE_MAX_ENTRIES = 100
CACHE_TTL_SECONDS = 300
CACHE_VERSION = "week4-v1"

_component_cache = {}


def _build_cache_key(
    cognitive_load_score,
    field_name,
    signal_summary,
    original_field_type,
    sanitized_dom,
    sanitized_values,
):
    """Build a deterministic cache key from generation-affecting inputs."""
    cache_payload = {
        "cache_version": CACHE_VERSION,
        "model": MODEL_NAME,
        "temperature": TEMPERATURE,
        "max_output_tokens": MAX_OUTPUT_TOKENS,
        "design_system": DESIGN_SYSTEM_CONTEXT,
        "cognitive_load_score": cognitive_load_score,
        "field_name": field_name,
        "signal_summary": signal_summary,
        "original_field_type": original_field_type,
        "sanitized_dom": sanitized_dom,
        "sanitized_values": sanitized_values,
    }

    payload = json.dumps(
        cache_payload,
        ensure_ascii=True,
        sort_keys=True,
        separators=(",", ":"),
    )

    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


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


def _validate_inputs(
    cognitive_load_score,
    field_name,
    signal_summary,
    original_field_type,
    dom_snapshot=None,
    field_values=None,
):
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
def _get_cached_component(cache_key):
    """Return a non-expired cached component, or None on cache miss."""
    entry = _component_cache.get(cache_key)

    if entry is None:
        return None

    cached_at, component_code = entry

    import time

    if time.time() - cached_at > CACHE_TTL_SECONDS:
        _component_cache.pop(cache_key, None)
        return None

    return component_code


def _store_cached_component(cache_key, component_code):
    """Store a validated component and enforce the cache size limit."""
    import time

    if len(_component_cache) >= CACHE_MAX_ENTRIES:
        oldest_key = min(
            _component_cache,
            key=lambda key: _component_cache[key][0],
        )
        _component_cache.pop(oldest_key, None)

    _component_cache[cache_key] = (
        time.time(),
        component_code,
    )

def _build_chain():
    try:
        prompt = PromptTemplate(
            input_variables=[
                "design_system",
                "cognitive_load_score",
                "field_name",
                "signal_summary",
                "original_field_type",
                "context_section",
            ],
            template=CODEGEN_PROMPT_TEMPLATE,
        )
        llm = ChatGroq(
    model=MODEL_NAME,
    temperature=TEMPERATURE,
    max_tokens=MAX_OUTPUT_TOKENS,
    reasoning_effort="low",
)
        parser = StrOutputParser()
        return prompt | llm | parser
    except Exception as e:
        raise ConfigurationError(f"Failed to build generation chain: {e}") from e


_chain = None


def _get_chain():
    global _chain
    if _chain is None:
        logger.info("Building generation chain (model=%s, temperature=%s, max_tokens=%s)",
                     MODEL_NAME, TEMPERATURE, MAX_OUTPUT_TOKENS)
        _chain = _build_chain()
    return _chain


def generate_component(
    cognitive_load_score,
    field_name,
    signal_summary,
    original_field_type,
    max_retries=2,
    dom_snapshot=None,
    field_values=None,
):
    """
    Generate a simplified React (.tsx) replacement component for a UI field
    that a user is struggling with, based on detected friction signals.

    Retries the full generate -> extract -> validate cycle up to
    (max_retries + 1) times, so a truncated response, an empty response,
    or a response that fails safety/contract validation all get a real
    second chance before this function gives up.

    Args:
        cognitive_load_score (int|float): Friction Engine's score (0-100)
            for how much difficulty the user is having with this field.
        field_name (str): Human-readable name of the field/section, e.g.
            "Annual Income" or "Country".
        signal_summary (str): Short description of the telemetry signals
            that triggered this, e.g. "3 rage clicks, 4s hesitation".
        original_field_type (str): Description of the current UI element
            being replaced.
        max_retries (int): Retry attempts on transient failures.
            Default 2 (3 total attempts).

    Returns:
        str: Clean TSX source code, fence stripped, guaranteed to contain
            'export default', and guaranteed to pass Babel syntax +
            security validation.

    Raises:
        ConfigurationError, InvalidInputError, GenerationError,
        EmptyOutputError, MalformedComponentError
    """

    _check_env()
    _validate_inputs(
        cognitive_load_score,
        field_name,
        signal_summary,
        original_field_type,
        dom_snapshot,
        field_values,
    )

    sanitized_dom = sanitize_dom_snapshot(dom_snapshot)
    sanitized_values = sanitize_field_values(field_values)

    cache_key = _build_cache_key(
        cognitive_load_score=cognitive_load_score,
        field_name=field_name,
        signal_summary=signal_summary,
        original_field_type=original_field_type,
        sanitized_dom=sanitized_dom,
        sanitized_values=sanitized_values,
    )

    cached_component = _get_cached_component(cache_key)

    if cached_component is not None:
        logger.info(
            "CACHE HIT | field_name=%r | cache_age_limit_seconds=%s",
            field_name,
            CACHE_TTL_SECONDS,
        )
        return cached_component

    logger.info("CACHE MISS | field_name=%r", field_name)

    context_section = build_context_section(
        dom_snapshot=sanitized_dom,
        field_values=sanitized_values,
    )

    chain = _get_chain()   

    prompt_inputs = {
        "design_system": DESIGN_SYSTEM_CONTEXT,
        "cognitive_load_score": cognitive_load_score,
        "field_name": field_name,
        "signal_summary": signal_summary,
        "original_field_type": original_field_type,
        "context_section": context_section,
    }

    field_value_lengths = {
        key: len(value)
        for key, value in sanitized_values.items()
    }

    logger.info(
        "PROMPT SENT | field_name=%r | cognitive_load_score=%s | "
        "signal_summary=%r | original_field_type=%r | "
        "dom_context_chars=%d | field_value_lengths=%s",
        field_name,
        cognitive_load_score,
        signal_summary,
        original_field_type,
        len(sanitized_dom),
        field_value_lengths,
    )
    logger.debug("Full prompt inputs: %s", prompt_inputs)

    total_attempts = max_retries + 1
    last_exc = None

    for attempt in range(1, total_attempts + 1):
        # --- 1. Call the LLM ---
        try:
            raw_output = chain.invoke(prompt_inputs)
        except OutputParserException as e:
            logger.error("Failed to parse model output: %s", e)
            raise GenerationError(f"Failed to parse model output: {e}") from e
        except Exception as e:
            last_exc = e
            is_rate_limit = groq is not None and isinstance(e, getattr(groq, "RateLimitError", ()))
            is_timeout = "timeout" in str(e).lower()
            logger.warning(
                "generate_component attempt %d/%d: LLM call failed (%s): %s",
                attempt, total_attempts, type(e).__name__, e,
            )
            if attempt == total_attempts:
                kind = "rate limit" if is_rate_limit else "timeout" if is_timeout else "API error"
                raise GenerationError(
                    f"LLM call failed after {attempt} attempt(s) ({kind}): {e}"
                ) from e
            continue

        response_preview = (raw_output or "")[:300].replace("\n", " ")
        logger.info(
            "RESPONSE RECEIVED | field_name=%r | attempt=%d/%d | length=%d chars | preview=%r",
            field_name, attempt, total_attempts, len(raw_output or ""), response_preview,
        )
        logger.debug("Full raw response: %s", raw_output)

        # --- 2. Reject empty output, retry ---
        if not raw_output or not raw_output.strip():
            last_exc = EmptyOutputError("Model returned an empty response")
            logger.warning("generate_component attempt %d/%d: empty output, retrying", attempt, total_attempts)
            if attempt == total_attempts:
                raise last_exc
            continue

        # --- 3. Extract code block (tolerates a truncated/unterminated fence) ---
        try:
            code = _extract_code_block(raw_output)
        except MalformedComponentError as e:
            last_exc = e
            logger.warning("generate_component attempt %d/%d: extraction failed (%s), retrying",
                            attempt, total_attempts, e)
            if attempt == total_attempts:
                raise
            continue

        if not code:
            last_exc = EmptyOutputError("No usable code found in model output")
            logger.warning("generate_component attempt %d/%d: no code extracted, retrying",
                            attempt, total_attempts)
            if attempt == total_attempts:
                raise last_exc
            continue

        # --- 4. Babel syntax + security validation ---
        try:
            validate_component_code(code)
        except SyntaxValidationError as e:
            last_exc = MalformedComponentError(f"Generated code has syntax errors: {e.errors}")
            logger.warning("generate_component attempt %d/%d: syntax validation failed (%s), retrying",
                            attempt, total_attempts, e.errors)
            if attempt == total_attempts:
                raise last_exc from e
            continue
        except SecurityValidationError as e:
            last_exc = MalformedComponentError(f"Generated code failed security checks: {e.flags}")
            logger.warning("generate_component attempt %d/%d: security validation failed (%s), retrying",
                            attempt, total_attempts, e.flags)
            if attempt == total_attempts:
                raise last_exc from e
            continue
        except ValidatorUnavailableError as e:
            # Infra problem, not a generation problem — don't burn retries on it.
            logger.error("Babel validator unavailable: %s", e)
            raise GenerationError(f"Safety validation unavailable, refusing to ship unverified code: {e}") from e

        # --- 5. Design-system contract validation ---
        try:
            _validate_component_contract(code, field_name)
        except MalformedComponentError as e:
            last_exc = e
            logger.warning("generate_component attempt %d/%d: contract validation failed (%s), retrying",
                            attempt, total_attempts, e)
            if attempt == total_attempts:
                raise
            continue

        logger.info("Generation succeeded for field_name=%r on attempt %d/%d (%d chars of code)",
                     field_name, attempt, total_attempts, len(code))
        _store_cached_component(cache_key, code)

        logger.info(
            "CACHE STORE | field_name=%r | cache_entries=%d",
            field_name,
            len(_component_cache),
        )   
        return code

    # Should be unreachable — every branch above either returns or raises on the last attempt.
    raise GenerationError(f"Generation failed after {total_attempts} attempt(s): {last_exc}") from last_exc



async def stream_component(
    cognitive_load_score,
    field_name,
    signal_summary,
    original_field_type,
    max_retries=2,
    dom_snapshot=None,
    field_values=None,
):
    """
    Stream LLM output chunks while preserving the existing validation pipeline.

    Chunks are yielded as they arrive from LangChain's async stream.
    The complete response is accumulated and validated only after streaming
    finishes. Only fully validated component code is stored in the cache.

    Yields:
        str: Incremental LLM output chunks.

    Raises:
        ConfigurationError, InvalidInputError, GenerationError,
        EmptyOutputError, MalformedComponentError
    """
    _check_env()

    _validate_inputs(
        cognitive_load_score,
        field_name,
        signal_summary,
        original_field_type,
        dom_snapshot,
        field_values,
    )

    sanitized_dom = sanitize_dom_snapshot(dom_snapshot)
    sanitized_values = sanitize_field_values(field_values)

    cache_key = _build_cache_key(
        cognitive_load_score=cognitive_load_score,
        field_name=field_name,
        signal_summary=signal_summary,
        original_field_type=original_field_type,
        sanitized_dom=sanitized_dom,
        sanitized_values=sanitized_values,
    )

    cached_component = _get_cached_component(cache_key)

    if cached_component is not None:
        logger.info(
            "STREAM CACHE HIT | field_name=%r | cache_age_limit_seconds=%s",
            field_name,
            CACHE_TTL_SECONDS,
        )
        yield cached_component
        return

    logger.info("STREAM CACHE MISS | field_name=%r", field_name)

    context_section = build_context_section(
        dom_snapshot=sanitized_dom,
        field_values=sanitized_values,
    )

    chain = _get_chain()

    prompt_inputs = {
        "design_system": DESIGN_SYSTEM_CONTEXT,
        "cognitive_load_score": cognitive_load_score,
        "field_name": field_name,
        "signal_summary": signal_summary,
        "original_field_type": original_field_type,
        "context_section": context_section,
    }

    field_value_lengths = {
        key: len(value)
        for key, value in sanitized_values.items()
    }

    logger.info(
        "STREAM PROMPT SENT | field_name=%r | cognitive_load_score=%s | "
        "signal_summary=%r | original_field_type=%r | "
        "dom_context_chars=%d | field_value_lengths=%s",
        field_name,
        cognitive_load_score,
        signal_summary,
        original_field_type,
        len(sanitized_dom),
        field_value_lengths,
    )

    total_attempts = max_retries + 1
    last_exc = None

    for attempt in range(1, total_attempts + 1):
        chunks = []
        streamed_chars = 0

        try:
            async for chunk in chain.astream(prompt_inputs):
                if chunk is None:
                    continue

                if isinstance(chunk, str):
                    chunk_text = chunk
                elif hasattr(chunk, "content"):
                    chunk_text = chunk.content or ""
                else:
                    chunk_text = str(chunk)

                if not chunk_text:
                    continue

                chunks.append(chunk_text)
                streamed_chars += len(chunk_text)

                yield chunk_text

        except Exception as e:
            last_exc = e
            is_rate_limit = (
                groq is not None
                and isinstance(e, getattr(groq, "RateLimitError", ()))
            )
            is_timeout = "timeout" in str(e).lower()

            logger.warning(
                "stream_component attempt %d/%d: LLM stream failed "
                "(%s): %s",
                attempt,
                total_attempts,
                type(e).__name__,
                e,
            )

            if attempt == total_attempts:
                kind = (
                    "rate limit"
                    if is_rate_limit
                    else "timeout"
                    if is_timeout
                    else "API error"
                )
                raise GenerationError(
                    f"LLM streaming failed after {attempt} attempt(s) "
                    f"({kind}): {e}"
                ) from e

            continue

        raw_output = "".join(chunks)

        logger.info(
            "STREAM RESPONSE COMPLETE | field_name=%r | attempt=%d/%d | "
            "length=%d chars",
            field_name,
            attempt,
            total_attempts,
            streamed_chars,
        )

        if not raw_output or not raw_output.strip():
            last_exc = EmptyOutputError("Model returned an empty response")
            logger.warning(
                "stream_component attempt %d/%d: empty output, retrying",
                attempt,
                total_attempts,
            )

            if attempt == total_attempts:
                raise last_exc

            continue

        try:
            code = _extract_code_block(raw_output)
        except MalformedComponentError as e:
            last_exc = e
            logger.warning(
                "stream_component attempt %d/%d: extraction failed (%s), retrying",
                attempt,
                total_attempts,
                e,
            )

            if attempt == total_attempts:
                raise

            continue

        if not code:
            last_exc = EmptyOutputError("No usable code found in model output")
            logger.warning(
                "stream_component attempt %d/%d: no code extracted, retrying",
                attempt,
                total_attempts,
            )

            if attempt == total_attempts:
                raise last_exc

            continue

        try:
            validate_component_code(code)

        except SyntaxValidationError as e:
            last_exc = MalformedComponentError(
                f"Generated code has syntax errors: {e.errors}"
            )

            logger.warning(
                "stream_component attempt %d/%d: syntax validation failed (%s), retrying",
                attempt,
                total_attempts,
                e.errors,
            )

            if attempt == total_attempts:
                raise last_exc from e

            continue

        except SecurityValidationError as e:
            last_exc = MalformedComponentError(
                f"Generated code failed security checks: {e.flags}"
            )

            logger.warning(
                "stream_component attempt %d/%d: security validation failed (%s), retrying",
                attempt,
                total_attempts,
                e.flags,
            )

            if attempt == total_attempts:
                raise last_exc from e

            continue

        except ValidatorUnavailableError as e:
            logger.error("Babel validator unavailable: %s", e)
            raise GenerationError(
                "Safety validation unavailable, refusing to ship "
                f"unverified code: {e}"
            ) from e

        try:
            _validate_component_contract(code, field_name)

        except MalformedComponentError as e:
            last_exc = e

            logger.warning(
                "stream_component attempt %d/%d: contract validation failed (%s), retrying",
                attempt,
                total_attempts,
                e,
            )

            if attempt == total_attempts:
                raise

            continue

        _store_cached_component(cache_key, code)

        logger.info(
            "STREAM GENERATION SUCCEEDED | field_name=%r | "
            "attempt=%d/%d | code_chars=%d | cache_entries=%d",
            field_name,
            attempt,
            total_attempts,
            len(code),
            len(_component_cache),
        )

        return

    raise GenerationError(
        f"Streaming generation failed after {total_attempts} attempt(s): "
        f"{last_exc}"
    ) from last_exc

def _extract_code_block(text):
    if not text:
        return ""

    match = re.search(r"```(?:tsx|jsx|javascript)?\s*(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Fallback: opening fence present but no closing fence — likely a truncated
    # response (e.g. hit max_tokens mid-generation). Use what's there; downstream
    # Babel validation will catch it if the partial code isn't actually valid.
    open_match = re.search(r"```(?:tsx|jsx|javascript)?\s*(.*)", text, re.DOTALL)
    if open_match and open_match.group(1).strip():
        logger.warning("Fenced code block appears truncated (no closing fence) — using partial content")
        return open_match.group(1).strip()

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
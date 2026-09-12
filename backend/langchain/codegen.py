import os
import re
from dataclasses import dataclass

from dotenv import load_dotenv
load_dotenv()

from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from prompts import DESIGN_SYSTEM_CONTEXT, CODEGEN_PROMPT_TEMPLATE


MODEL_NAME = os.getenv("CODEGEN_MODEL", "gpt-4o-mini")
TEMPERATURE = 0.3


@dataclass
class FrictionContext:
    cognitive_load_score: int
    field_name: str
    signal_summary: str
    original_field_type: str


def _build_chain():
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


_chain = None


def _get_chain():
    global _chain
    if _chain is None:
        _chain = _build_chain()
    return _chain


def generate_component(cognitive_load_score, field_name, signal_summary, original_field_type):
    chain = _get_chain()
    raw_output = chain.invoke({
        "design_system": DESIGN_SYSTEM_CONTEXT,
        "cognitive_load_score": cognitive_load_score,
        "field_name": field_name,
        "signal_summary": signal_summary,
        "original_field_type": original_field_type,
    })
    return _extract_code_block(raw_output)


def _extract_code_block(text):
    match = re.search(r"```(?:tsx|jsx|javascript)?\s*(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()


if __name__ == "__main__":
    sample = FrictionContext(
        cognitive_load_score=82,
        field_name="Annual Income",
        signal_summary="3 rage clicks, 4s hesitation, field re-focused 5 times",
        original_field_type="numeric currency input with tooltip",
    )

    print("Generating component for sample friction context...\n")
    code = generate_component(
        sample.cognitive_load_score,
        sample.field_name,
        sample.signal_summary,
        sample.original_field_type,
    )
    print(code)
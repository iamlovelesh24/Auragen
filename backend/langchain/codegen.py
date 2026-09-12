"""
codegen.py
-----------
Week 1 deliverable: LangChain pipeline (Code-Gen Agent) that takes a
"friction context" (produced later by the Friction Engine telemetry) and
returns a simplified, pre-styled React component as a string.

This week you can (and should) test it with MOCKED friction contexts —
you don't need the real telemetry hook wired up yet.

Usage:
    from codegen import generate_component

    code = generate_component(
        cognitive_load_score=82,
        field_name="Annual Income",
        signal_summary="3 rage clicks, 4s hesitation, field re-focused 5 times",
        original_field_type="numeric currency input with tooltip",
    )
    print(code)
"""

import os
import re
from dataclasses import dataclass

from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from prompts import DESIGN_SYSTEM_CONTEXT, CODEGEN_PROMPT_TEMPLATE


MODEL_NAME = os.getenv("CODEGEN_MODEL", "gpt-4o")
TEMPERATURE = 0.3  # low temperature: we want consistent, valid, on-style code


@dataclass
class FrictionContext:
    """Mirrors what the Friction Engine (React + WebSockets) will eventually
    send over the wire. Defined here so Week-1 testing has a clear shape,
    and so M/L/R know what fields to send once telemetry is wired up."""
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

    llm = ChatOpenAI(model=MODEL_NAME, temperature=TEMPERATURE)

    parser = StrOutputParser()

    return prompt | llm | parser


_chain = None


def _get_chain():
    global _chain
    if _chain is None:
        _chain = _build_chain()
    return _chain


def generate_component(
    cognitive_load_score: int,
    field_name: str,
    signal_summary: str,
    original_field_type: str,
) -> str:
import pytest
from unittest.mock import patch, MagicMock

import codegen
from codegen import (
    generate_component,
    MalformedComponentError,
    EmptyOutputError,
)


MOCK_INCOME_RESPONSE = """```tsx
export default function AnnualIncomeStepWizard() {
  return <div>Annual Income Wizard</div>;
}
````"""

MOCK_DROPDOWN_RESPONSE = """```tsx
export default function CountrySelectStepWizard() {
  return <div>Country Select Wizard</div>;
}
```"""

MOCK_MALFORMED_RESPONSE = "Sorry, here's your component: export default function Foo() { return <div/>; }"

MOCK_EMPTY_RESPONSE = ""


def _mock_chain(response_text):
    fake_chain = MagicMock()
    fake_chain.invoke.return_value = response_text
    return fake_chain


@patch("codegen._get_chain")
def test_generate_component_numeric_income(mock_get_chain):
    mock_get_chain.return_value = _mock_chain(MOCK_INCOME_RESPONSE)

    with patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}):
        code = generate_component(
            cognitive_load_score=82,
            field_name="Annual Income",
            signal_summary="3 rage clicks, 4s hesitation, field re-focused 5 times",
            original_field_type="numeric currency input with tooltip",
        )

    assert "export default" in code
    assert "AnnualIncomeStepWizard" in code
    mock_get_chain.return_value.invoke.assert_called_once()


@patch("codegen._get_chain")
def test_generate_component_dropdown_country(mock_get_chain):
    mock_get_chain.return_value = _mock_chain(MOCK_DROPDOWN_RESPONSE)

    with patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}):
        code = generate_component(
            cognitive_load_score=67,
            field_name="Country",
            signal_summary="scrolled dropdown list 8 times, 6s hesitation, abandoned twice",
            original_field_type="native <select> dropdown with 195 options",
        )

    assert "export default" in code
    assert "CountrySelectStepWizard" in code
    mock_get_chain.return_value.invoke.assert_called_once()

    call_args = mock_get_chain.return_value.invoke.call_args[0][0]
    assert call_args["field_name"] == "Country"
    assert call_args["original_field_type"] == "native <select> dropdown with 195 options"


@patch("codegen._get_chain")
def test_generate_component_malformed_output_raises(mock_get_chain):
    mock_get_chain.return_value = _mock_chain(MOCK_MALFORMED_RESPONSE)

    with patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}):
        with pytest.raises(MalformedComponentError):
            generate_component(
                cognitive_load_score=50,
                field_name="Phone Number",
                signal_summary="repeated backspacing",
                original_field_type="text input",
            )


@patch("codegen._get_chain")
def test_generate_component_empty_output_raises(mock_get_chain):
    mock_get_chain.return_value = _mock_chain(MOCK_EMPTY_RESPONSE)

    with patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}):
        with pytest.raises(EmptyOutputError):
            generate_component(
                cognitive_load_score=50,
                field_name="Phone Number",
                signal_summary="repeated backspacing",
                original_field_type="text input",
            )
# ---------------------------------------------------------------------------
# Day 6: Unit tests for _extract_code_block() in isolation
# ---------------------------------------------------------------------------

def test_extract_code_block_with_tsx_fence():
    text = "Here's your component:\n```tsx\nexport default function Foo() {}\n```"
    result = codegen._extract_code_block(text)
    assert result == "export default function Foo() {}"


def test_extract_code_block_with_plain_fence_no_language():
    text = "```\nexport default function Bar() {}\n```"
    result = codegen._extract_code_block(text)
    assert result == "export default function Bar() {}"


def test_extract_code_block_with_jsx_fence():
    text = "```jsx\nexport default function Baz() { return <div/>; }\n```"
    result = codegen._extract_code_block(text)
    assert "export default function Baz()" in result


def test_extract_code_block_strips_surrounding_whitespace():
    text = "```tsx\n\n\n  export default function Padded() {}  \n\n\n```"
    result = codegen._extract_code_block(text)
    assert result == "export default function Padded() {}"


def test_extract_code_block_no_fence_raises():
    text = "Sorry, I can't help with that today."
    with pytest.raises(MalformedComponentError):
        codegen._extract_code_block(text)


def test_extract_code_block_empty_string_returns_empty():
    result = codegen._extract_code_block("")
    assert result == ""


def test_extract_code_block_none_returns_empty():
    result = codegen._extract_code_block(None)
    assert result == ""


def test_extract_code_block_multiline_component():
    text = """```tsx
import React from 'react';

export default function MultiLine() {
  return (
    <div>
      <p>Hello</p>
    </div>
  );
}
```"""
    result = codegen._extract_code_block(text)
    assert result.startswith("import React")
    assert "export default function MultiLine()" in result
    assert result.endswith("}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

import pytest
from babel_bridge import validate_component_code, SyntaxValidationError, SecurityValidationError

VALID = '''
import React from "react";
interface Props { value: string; onChange: (v: string) => void; }
export default function SimpleInput({ value, onChange }: Props) {
  return <input className="ds-input" value={value} onChange={(e) => onChange(e.target.value)} />;
}
'''

def test_valid_passes():
    assert validate_component_code(VALID)["valid"] is True

def test_syntax_error_caught():
    with pytest.raises(SyntaxValidationError):
        validate_component_code(VALID.replace("}", "", 1))

def test_eval_flagged():
    with pytest.raises(SecurityValidationError):
        validate_component_code(VALID.replace("return <input", 'eval("x"); return <input'))

def test_dangerous_html_flagged():
    bad = VALID.replace(
        "return <input",
        'return <div dangerouslySetInnerHTML={{__html: value}}><input'
    ).replace("/>;", "/></div>;")
    with pytest.raises(SecurityValidationError):
        validate_component_code(bad)

def test_disallowed_import_flagged():
    bad = VALID.replace('import React from "react";', 'import React from "react";\nimport fs from "fs";')
    with pytest.raises(SecurityValidationError):
        validate_component_code(bad)
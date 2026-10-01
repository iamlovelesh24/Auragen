"""
dom_sanitizer.py - sanitize untrusted DOM snapshots and typed field values
before they are shown to the code-gen LLM.

Fail-closed rules:
  * only whitelisted tags and attributes are re-emitted (everything else is dropped)
  * script/style/template/svg/iframe/textarea content is dropped
  * HTML comments are dropped
  * password, card and other sensitive fields are dropped entirely
  * the `value` attribute is never emitted (typed data travels via field_values)
  * output is capped at MAX_SNAPSHOT_CHARS
"""
from __future__ import annotations

import html
import re
from html.parser import HTMLParser

MAX_RAW_CHARS = 200_000
MAX_SNAPSHOT_CHARS = 4000
MAX_TEXT_NODE_CHARS = 80
MAX_ATTR_CHARS = 100
MAX_FIELDS = 50
MAX_VALUE_CHARS = 500

ALLOWED_TAGS = {
    "form", "fieldset", "legend", "label", "input", "select", "option",
    "optgroup", "textarea", "button", "div", "span", "p", "small",
    "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
}
VOID_TAGS = {"input", "br", "hr"}
DROP_CONTENT_TAGS = {
    "script", "style", "textarea", "noscript", "template",
    "iframe", "object", "embed", "svg", "head", "title",
}
ALLOWED_ATTRS = {
    "id", "name", "type", "placeholder", "for", "required", "pattern",
    "min", "max", "minlength", "maxlength", "step", "autocomplete",
    "role", "aria-label", "aria-describedby", "aria-invalid",
    "disabled", "readonly", "inputmode",
}

_SENSITIVE_SUBSTRINGS = (
    "pass", "pwd", "card", "cvv", "cvc", "csc", "ssn", "social",
    "secret", "token", "iban", "routing", "credential",
)
_SENSITIVE_WORD_RE = re.compile(r"(?:^|[^a-z])(?:pin|otp|cc)(?:[^a-z]|$)")
_FIELD_KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_.\-]{0,63}$")
_URI_RE = re.compile(r"(?i)\b(?:data|javascript|vbscript):\S*")
_URI_ATTR_RE = re.compile(r"(?i)^\s*(?:data|javascript|vbscript):")
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_CARD_LIKE_RE = re.compile(r"[\d][\d \-]{11,21}[\d]")


def is_sensitive_name(name) -> bool:
    if not isinstance(name, str):
        return False
    n = name.lower()
    if any(s in n for s in _SENSITIVE_SUBSTRINGS):
        return True
    return bool(_SENSITIVE_WORD_RE.search(n))


def _looks_like_card_number(value: str) -> bool:
    if not _CARD_LIKE_RE.fullmatch(value.strip()):
        return False
    digits = re.sub(r"\D", "", value)
    return 13 <= len(digits) <= 19


class _Sanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self.skip_depth = 0

    @staticmethod
    def _input_is_sensitive(tag: str, attrs: dict) -> bool:
        if tag == "input" and (attrs.get("type") or "").lower() == "password":
            return True
        if (attrs.get("autocomplete") or "").lower().startswith(("cc-", "new-password", "current-password")):
            return True
        return is_sensitive_name(attrs.get("name")) or is_sensitive_name(attrs.get("id"))

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attr_map = {k.lower(): v for k, v in attrs}
        if self.skip_depth:
            if tag in DROP_CONTENT_TAGS:
                self.skip_depth += 1
            return
        if tag in ("input", "textarea", "select") and self._input_is_sensitive(tag, attr_map):
            if tag in DROP_CONTENT_TAGS:
                self.skip_depth += 1
            return
        if tag in ALLOWED_TAGS:
            parts = []
            for k, v in attr_map.items():
                allowed = k in ALLOWED_ATTRS or (k == "value" and tag == "option")
                if not allowed:
                    continue
                if v is None:
                    parts.append(k)
                    continue
                if _URI_ATTR_RE.match(v):
                    continue
                parts.append(f'{k}="{html.escape(v[:MAX_ATTR_CHARS], quote=True)}"')
            self.out.append(f"<{tag}{' ' + ' '.join(parts) if parts else ''}>")
            if tag in VOID_TAGS:
                return
        if tag in DROP_CONTENT_TAGS:
            self.skip_depth += 1

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in DROP_CONTENT_TAGS:
            if self.skip_depth:
                self.skip_depth -= 1
            if tag == "textarea":
                self.out.append("</textarea>")
            return
        if self.skip_depth:
            return
        if tag in ALLOWED_TAGS and tag not in VOID_TAGS:
            self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if self.skip_depth:
            return
        text = " ".join(data.split())
        if not text:
            return
        text = _URI_RE.sub("[removed]", text)[:MAX_TEXT_NODE_CHARS]
        self.out.append(html.escape(text, quote=False) + " ")


def sanitize_dom_snapshot(raw) -> str:
    """Return a sanitized, size-capped HTML-ish snapshot ('' if nothing safe)."""
    if raw is None:
        return ""
    if not isinstance(raw, str):
        raise TypeError("dom_snapshot must be an HTML string")
    parser = _Sanitizer()
    try:
        parser.feed(raw[:MAX_RAW_CHARS])
        parser.close()
    except Exception:
        return ""  # fail closed
    result = "".join(parser.out).strip()
    result = result.replace("<<<", "").replace(">>>", "")
    if len(result) > MAX_SNAPSHOT_CHARS:
        marker = "[truncated]"
        result = result[: MAX_SNAPSHOT_CHARS - len(marker)]
        if result.rfind("<") > result.rfind(">"):
            result = result[: result.rfind("<")]
        result += marker
    return result


def sanitize_field_values(values) -> dict:
    """Return {field_name: cleaned_string}, dropping sensitive or malformed entries."""
    if values is None:
        return {}
    if not isinstance(values, dict):
        raise TypeError("field_values must be a dict of field name -> typed string")
    clean: dict[str, str] = {}
    for key, val in values.items():
        if len(clean) >= MAX_FIELDS:
            break
        if not isinstance(key, str) or not _FIELD_KEY_RE.match(key) or is_sensitive_name(key):
            continue
        if isinstance(val, bool) or not isinstance(val, (str, int, float)):
            continue
        text = _CONTROL_RE.sub("", str(val))[:MAX_VALUE_CHARS]
        text = text.replace("<<<", "").replace(">>>", "")
        if _looks_like_card_number(text):
            continue
        clean[key] = text
    return clean


def field_log_summary(values) -> dict:
    """Safe-to-log view: field name -> length. Never includes the values."""
    if not isinstance(values, dict):
        return {}
    return {str(k): len(v) if isinstance(v, str) else 0 for k, v in values.items()}

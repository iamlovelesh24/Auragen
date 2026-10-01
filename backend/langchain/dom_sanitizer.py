"""
dom_sanitizer.py - sanitize untrusted DOM snapshots and typed field values
before they are shown to the code-gen LLM.

Fail-closed rules:
  * only whitelisted tags and attributes are re-emitted (everything else is dropped)
  * script/style/template/svg/iframe/object content is dropped
  * textarea content is dropped but the textarea field itself is kept
  * sensitive fields (password, card, ...) are dropped completely, including
    the children of a sensitive <select>
  * HTML comments are dropped
  * the `value` attribute is never emitted (typed data travels via field_values)
  * any value containing a run of 13+ digits (card-like) is dropped
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
MAX_VALUE_SCAN_CHARS = 5000

ALLOWED_TAGS = {
    "form", "fieldset", "legend", "label", "input", "select", "option",
    "optgroup", "textarea", "button", "div", "span", "p", "small",
    "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
}
VOID_TAGS = {"input", "br", "hr"}
FIELD_TAGS = {"input", "textarea", "select"}
# Tags whose content is dropped (they have a start tag and an end tag).
DROP_CONTENT_TAGS = {
    "script", "style", "noscript", "template",
    "iframe", "object", "svg", "head", "title",
}
# Void tags that are simply ignored (no content, so never start a skip).
IGNORED_VOID_TAGS = {"embed"}
ALLOWED_ATTRS = {
    "id", "name", "type", "placeholder", "for", "required", "pattern",
    "min", "max", "minlength", "maxlength", "step", "autocomplete",
    "role", "aria-label", "aria-describedby", "aria-invalid",
    "disabled", "readonly", "inputmode",
}

_SENSITIVE_SUBSTRINGS = (
    "password", "passwd", "passcode", "passphrase", "passport", "pwd",
    "card", "cvv", "cvc", "csc", "ssn", "social",
    "secret", "token", "iban", "routing", "credential",
)
_SENSITIVE_WORD_RE = re.compile(r"(?:^|[^a-z])(?:pin|otp|cc|pass)(?:[^a-z]|$)")
_CAMEL_PASS_RE = re.compile(r"[a-z0-9]Pass(?![a-z])")
_FIELD_KEY_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_.\-\[\]]{0,63}")
_URI_RE = re.compile(r"(?i)\b(?:data|javascript|vbscript):\S*")
_URI_ATTR_RE = re.compile(r"(?i)^\s*(?:data|javascript|vbscript):")
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_CARD_SEQ_RE = re.compile(r"\d[\d \-]{11,21}\d")


def is_sensitive_name(name) -> bool:
    if not isinstance(name, str):
        return False
    n = name.lower()
    if any(s in n for s in _SENSITIVE_SUBSTRINGS):
        return True
    if _SENSITIVE_WORD_RE.search(n):
        return True
    return bool(_CAMEL_PASS_RE.search(name))


def _contains_card_number(text: str) -> bool:
    """True if text contains a run of 13+ digits (spaces/dashes allowed)."""
    for m in _CARD_SEQ_RE.finditer(text):
        if len(re.sub(r"\D", "", m.group())) >= 13:
            return True
    return False


def _strip_delimiters(text: str) -> str:
    """Remove <<< and >>> repeatedly so they cannot be rebuilt by removal."""
    while "<<<" in text or ">>>" in text:
        text = text.replace("<<<", "").replace(">>>", "")
    return text


class _Sanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self.skip_tag: str | None = None  # tag whose content is being dropped
        self.skip_depth = 0               # nesting count of that same tag
        self.skip_close = ""              # closing tag to emit when skip ends

    def _begin_skip(self, tag: str, close: str = "") -> None:
        self.skip_tag = tag
        self.skip_depth = 1
        self.skip_close = close

    @staticmethod
    def _field_is_sensitive(tag: str, attrs: dict) -> bool:
        if tag == "input" and (attrs.get("type") or "").lower() == "password":
            return True
        if (attrs.get("autocomplete") or "").lower().startswith(
            ("cc-", "new-password", "current-password")
        ):
            return True
        return is_sensitive_name(attrs.get("name")) or is_sensitive_name(attrs.get("id"))

    @staticmethod
    def _render_start(tag: str, attrs: dict) -> str:
        parts = []
        for k, v in attrs.items():
            allowed = k in ALLOWED_ATTRS or (k == "value" and tag == "option")
            if not allowed:
                continue
            if v is None:
                parts.append(k)
                continue
            if _URI_ATTR_RE.match(v):
                continue
            parts.append(f'{k}="{html.escape(v[:MAX_ATTR_CHARS], quote=True)}"')
        return f"<{tag}{' ' + ' '.join(parts) if parts else ''}>"

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attr_map = {k.lower(): v for k, v in attrs}
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth += 1
            return
        if tag in IGNORED_VOID_TAGS:
            return
        if tag in FIELD_TAGS and self._field_is_sensitive(tag, attr_map):
            if tag != "input":
                self._begin_skip(tag)  # drop children and the closing tag too
            return
        if tag in ALLOWED_TAGS:
            self.out.append(self._render_start(tag, attr_map))
            if tag in VOID_TAGS:
                return
            if tag == "textarea":
                self._begin_skip("textarea", "</textarea>")
            return
        if tag in DROP_CONTENT_TAGS:
            self._begin_skip(tag)

    def handle_startendtag(self, tag, attrs):
        tag = tag.lower()
        if self.skip_tag:
            return
        attr_map = {k.lower(): v for k, v in attrs}
        if tag in IGNORED_VOID_TAGS:
            return
        if tag in FIELD_TAGS and self._field_is_sensitive(tag, attr_map):
            return
        if tag in ALLOWED_TAGS:
            self.out.append(self._render_start(tag, attr_map))
            if tag not in VOID_TAGS:
                self.out.append(f"</{tag}>")
        # self-closing drop tags (e.g. <svg/>) have no content: nothing to skip

    def handle_endtag(self, tag):
        tag = tag.lower()
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth -= 1
                if self.skip_depth == 0:
                    if self.skip_close:
                        self.out.append(self.skip_close)
                    self.skip_tag = None
                    self.skip_close = ""
            return
        if tag in ALLOWED_TAGS and tag not in VOID_TAGS:
            self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if self.skip_tag:
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
    result = _strip_delimiters("".join(parser.out).strip())
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
        if not isinstance(key, str) or not _FIELD_KEY_RE.fullmatch(key) or is_sensitive_name(key):
            continue
        if isinstance(val, bool) or not isinstance(val, (str, int, float)):
            continue
        text = _CONTROL_RE.sub("", str(val))[:MAX_VALUE_SCAN_CHARS]
        if _contains_card_number(text):
            continue
        clean[key] = _strip_delimiters(text[:MAX_VALUE_CHARS])
    return clean


def field_log_summary(values) -> dict:
    """Safe-to-log view: field name -> length. Never includes the values."""
    if not isinstance(values, dict):
        return {}
    return {str(k): len(v) if isinstance(v, str) else 0 for k, v in values.items()}

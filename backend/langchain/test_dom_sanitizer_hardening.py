"""Regression tests for the dom_sanitizer hardening fixes."""
import pytest

import dom_sanitizer as d


def test_delimiter_cannot_be_rebuilt_in_values():
    out = d.sanitize_field_values({"note": "<<>>><"})
    assert all("<<<" not in v and ">>>" not in v for v in out.values())


def test_delimiter_cannot_be_rebuilt_in_snapshot():
    out = d.sanitize_dom_snapshot("<form><p>&lt;&lt;&gt;&gt;&gt;&lt;</p></form>")
    assert "<<<" not in out and ">>>" not in out


def test_sensitive_select_dropped_with_children():
    out = d.sanitize_dom_snapshot(
        '<form><select name="password_hint"><option value="a">First pet</option></select></form>'
    )
    assert out == "<form></form>"


def test_sensitive_textarea_has_no_stray_close_tag():
    out = d.sanitize_dom_snapshot(
        '<form><textarea name="secret_note">hi</textarea><input name="ok"></form>'
    )
    assert out == '<form><input name="ok"></form>'
    assert "textarea" not in out


def test_normal_textarea_kept_without_contents():
    out = d.sanitize_dom_snapshot('<form><textarea name="bio">private text</textarea></form>')
    assert '<textarea name="bio"></textarea>' in out
    assert "private text" not in out


@pytest.mark.parametrize("markup", ['<embed src="x">', "<svg/>"])
def test_embed_and_selfclosing_svg_do_not_swallow_later_fields(markup):
    out = d.sanitize_dom_snapshot(f'<form><input name="a">{markup}<input name="b"></form>')
    assert 'name="a"' in out and 'name="b"' in out


def test_svg_with_content_is_dropped_but_later_fields_kept():
    out = d.sanitize_dom_snapshot('<form><svg><path d="x"/></svg><input name="b"></form>')
    assert "path" not in out and 'name="b"' in out


def test_nested_same_tag_skip_balances():
    out = d.sanitize_dom_snapshot(
        '<form><select name="pin"><option>1</option></select><input name="after"></form>'
    )
    assert 'name="after"' in out and "option" not in out


@pytest.mark.parametrize("key,kept", [
    ("passport_no", False),
    ("user_pass", False),
    ("userPass", False),
    ("pass", False),
    ("passenger_name", True),
    ("user[email]", True),
    ("address.line1", True),
    ("email\n", False),
])
def test_key_policy(key, kept):
    assert (key in d.sanitize_field_values({key: "v"})) is kept


def test_card_number_inside_sentence_dropped():
    out = d.sanitize_field_values({"notes": "my card is 4111 1111 1111 1111"})
    assert out == {}


def test_card_number_with_dashes_dropped():
    assert d.sanitize_field_values({"x": "4111-1111-1111-1111"}) == {}


def test_twelve_digit_phone_kept():
    out = d.sanitize_field_values({"phone": "+91 98765 43210"})
    assert out == {"phone": "+91 98765 43210"}


def test_values_never_in_log_summary():
    summary = d.field_log_summary({"email": "secret@example.com"})
    assert summary == {"email": 18}
    assert "secret@example.com" not in str(summary)

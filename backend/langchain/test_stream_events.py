import asyncio

from fastapi.testclient import TestClient

import stream_api
import stream_events as se

ARGS = dict(
    cognitive_load_score=80,
    field_name="email",
    signal_summary="long hesitation",
    original_field_type="text",
)


class FakeChain:
    def __init__(self, attempts):
        self.attempts = list(attempts)

    async def astream(self, _inputs):
        for chunk in self.attempts.pop(0):
            yield chunk


def patch_common(monkeypatch, attempts, cached=None):
    stored = {}
    monkeypatch.setattr(se, "_check_env", lambda: None)
    monkeypatch.setattr(se, "_get_chain", lambda: FakeChain(attempts))
    monkeypatch.setattr(se, "_get_cached_component", lambda key: cached)
    monkeypatch.setattr(
        se, "_store_cached_component", lambda key, code: stored.update({key: code})
    )
    monkeypatch.setattr(se, "_extract_code_block", lambda raw: raw.strip())
    monkeypatch.setattr(se, "validate_component_code", lambda code: None)
    monkeypatch.setattr(se, "_validate_component_contract", lambda code, name: None)
    return stored


def collect(**overrides):
    async def run():
        return [e async for e in se.stream_component_events(**{**ARGS, **overrides})]
    return asyncio.run(run())


def test_success_emits_final_valid_and_caches(monkeypatch):
    stored = patch_common(monkeypatch, [["export default ", "function A(){}"]])
    events = collect()
    assert events[0] == {"type": "attempt_start", "attempt": 1}
    assert events[-1]["status"] == "valid"
    assert events[-1]["tsx"] == "export default function A(){}"
    assert events[-1]["cached"] is False
    assert list(stored.values()) == ["export default function A(){}"]


def test_retry_restarts_and_final_uses_second_attempt(monkeypatch):
    patch_common(monkeypatch, [["bad"], ["good"]])
    calls = {"n": 0}

    def contract(code, name):
        calls["n"] += 1
        if code == "bad":
            raise se.MalformedComponentError("bad contract")

    monkeypatch.setattr(se, "_validate_component_contract", contract)
    events = collect()
    starts = [e["attempt"] for e in events if e["type"] == "attempt_start"]
    assert starts == [1, 2]
    assert events[-1]["status"] == "valid"
    assert events[-1]["tsx"] == "good"


def test_validator_unavailable_is_not_retried(monkeypatch):
    patch_common(monkeypatch, [["x"], ["y"]])

    def boom(code):
        raise se.ValidatorUnavailableError("node missing")

    monkeypatch.setattr(se, "validate_component_code", boom)
    events = collect()
    assert [e["type"] for e in events].count("attempt_start") == 1
    assert events[-1]["status"] == "error"
    assert events[-1]["reason"] == "validator_unavailable"


def test_all_attempts_fail_gives_error_final(monkeypatch):
    patch_common(monkeypatch, [[""], [""], [""]])
    events = collect()
    assert events[-1]["status"] == "error"
    assert events[-1]["reason"] == "validation_failed"


def test_cache_hit_returns_cached_final(monkeypatch):
    patch_common(monkeypatch, [], cached="export default function A(){}")
    events = collect()
    assert events == [
        {"type": "final", "status": "valid",
         "tsx": "export default function A(){}", "cached": True}
    ]


def test_endpoint_streams_sse(monkeypatch):
    async def fake(**kwargs):
        yield {"type": "attempt_start", "attempt": 1}
        yield {"type": "final", "status": "valid", "tsx": "x", "cached": False}

    monkeypatch.setattr(stream_api, "stream_component_events", fake)
    client = TestClient(stream_api.app)
    resp = client.post("/generate", json=ARGS)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    assert resp.text.count("data: ") == 2
    assert client.post("/generate", json={"field_name": "x"}).status_code == 422
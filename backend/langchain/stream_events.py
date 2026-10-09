"""Structured-event streaming on top of codegen's validation pipeline.

Events:
  {"type": "attempt_start", "attempt": n}   client should clear its buffer
  {"type": "chunk", "text": "..."}          progress display only
  {"type": "final", "status": "valid", "tsx": "...", "cached": bool}
  {"type": "final", "status": "error", "reason": "...", "message": "..."}

Only the "final" valid event carries renderable, validated code.
"""
from codegen import (
    DESIGN_SYSTEM_CONTEXT,
    ConfigurationError,
    EmptyOutputError,
    InvalidInputError,
    MalformedComponentError,
    SecurityValidationError,
    SyntaxValidationError,
    ValidatorUnavailableError,
    _build_cache_key,
    _check_env,
    _extract_code_block,
    _get_cached_component,
    _get_chain,
    _store_cached_component,
    _validate_component_contract,
    _validate_inputs,
    build_context_section,
    logger,
    sanitize_dom_snapshot,
    sanitize_field_values,
    validate_component_code,
)


def _error(reason, exc):
    return {
        "type": "final",
        "status": "error",
        "reason": reason,
        "message": str(exc),
    }


def _check_output(raw_output, field_name):
    """Same order as stream_component: extract, syntax/security, contract."""
    if not raw_output or not raw_output.strip():
        raise EmptyOutputError("Model returned an empty response")
    code = _extract_code_block(raw_output)
    if not code:
        raise EmptyOutputError("No usable code found in model output")
    try:
        validate_component_code(code)
    except SyntaxValidationError as e:
        raise MalformedComponentError(
            f"Generated code has syntax errors: {e.errors}"
        ) from e
    except SecurityValidationError as e:
        raise MalformedComponentError(
            f"Generated code failed security checks: {e.flags}"
        ) from e
    _validate_component_contract(code, field_name)
    return code


async def stream_component_events(
    cognitive_load_score,
    field_name,
    signal_summary,
    original_field_type,
    max_retries=2,
    dom_snapshot=None,
    field_values=None,
):
    try:
        _check_env()
        _validate_inputs(
            cognitive_load_score,
            field_name,
            signal_summary,
            original_field_type,
            dom_snapshot,
            field_values,
        )
    except ConfigurationError as e:
        yield _error("configuration_error", e)
        return
    except InvalidInputError as e:
        yield _error("invalid_input", e)
        return

    sanitized_dom = sanitize_dom_snapshot(dom_snapshot)
    sanitized_values = sanitize_field_values(field_values)

    cache_key = _build_cache_key(
        cognitive_load_score=cognitive_load_score,
        field_name=field_name,
        signal_summary=signal_summary,
        original_field_type=original_field_type,
        sanitized_dom=sanitized_dom,
        sanitized_values=sanitized_values,
    )

    cached = _get_cached_component(cache_key)
    if cached is not None:
        logger.info("EVENTS CACHE HIT | field_name=%r", field_name)
        yield {"type": "final", "status": "valid", "tsx": cached, "cached": True}
        return

    chain = _get_chain()
    prompt_inputs = {
        "design_system": DESIGN_SYSTEM_CONTEXT,
        "cognitive_load_score": cognitive_load_score,
        "field_name": field_name,
        "signal_summary": signal_summary,
        "original_field_type": original_field_type,
        "context_section": build_context_section(
            dom_snapshot=sanitized_dom,
            field_values=sanitized_values,
        ),
    }

    total_attempts = max_retries + 1
    last_reason, last_message = "generation_failed", "Generation failed"

    for attempt in range(1, total_attempts + 1):
        yield {"type": "attempt_start", "attempt": attempt}
        chunks = []

        try:
            async for chunk in chain.astream(prompt_inputs):
                if chunk is None:
                    continue
                if isinstance(chunk, str):
                    text = chunk
                elif hasattr(chunk, "content"):
                    text = chunk.content or ""
                else:
                    text = str(chunk)
                if not text:
                    continue
                chunks.append(text)
                yield {"type": "chunk", "text": text}
        except Exception as e:
            logger.warning(
                "events attempt %d/%d: LLM stream failed (%s)",
                attempt, total_attempts, type(e).__name__,
            )
            last_reason, last_message = "llm_error", f"{type(e).__name__}: {e}"
            continue

        try:
            code = _check_output("".join(chunks), field_name)
        except ValidatorUnavailableError as e:
            logger.error("Babel validator unavailable: %s", e)
            yield _error("validator_unavailable", e)
            return
        except (EmptyOutputError, MalformedComponentError) as e:
            logger.warning(
                "events attempt %d/%d: rejected (%s)",
                attempt, total_attempts, e,
            )
            last_reason, last_message = "validation_failed", str(e)
            continue

        _store_cached_component(cache_key, code)
        logger.info(
            "EVENTS GENERATION SUCCEEDED | field_name=%r | attempt=%d/%d",
            field_name, attempt, total_attempts,
        )
        yield {"type": "final", "status": "valid", "tsx": code, "cached": False}
        return

    yield {
        "type": "final",
        "status": "error",
        "reason": last_reason,
        "message": last_message,
    }
# babel_bridge.py
import json
import subprocess
from pathlib import Path

NODE_SCRIPT = Path(__file__).parent / "babel_validator" / "validate.mjs"
NODE_TIMEOUT_SECONDS = 8


class SyntaxValidationError(Exception):
    def __init__(self, errors):
        self.errors = errors
        super().__init__(f"Babel syntax validation failed: {errors}")


class SecurityValidationError(Exception):
    def __init__(self, flags):
        self.flags = flags
        super().__init__(f"Security validation failed: {flags}")


class ValidatorUnavailableError(Exception):
    pass


def validate_component_code(tsx_code: str) -> dict:
    """Pipes generated TSX through the Babel validator. Raises on failure."""
    if not NODE_SCRIPT.exists():
        raise ValidatorUnavailableError(f"Validator script not found at {NODE_SCRIPT}")

    try:
        proc = subprocess.run(
            ["node", str(NODE_SCRIPT)],
            input=tsx_code, capture_output=True, text=True,
            timeout=NODE_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired as exc:
        raise ValidatorUnavailableError("Babel validator timed out") from exc
    except FileNotFoundError as exc:
        raise ValidatorUnavailableError("Node.js not found on PATH") from exc

    if not proc.stdout.strip():
        raise ValidatorUnavailableError(f"Validator crashed: {proc.stderr.strip()}")

    try:
        result = json.loads(proc.stdout.strip())
    except json.JSONDecodeError as exc:
        raise ValidatorUnavailableError(f"Bad validator output: {proc.stdout!r}") from exc

    if result["stage"] == "syntax":
        raise SyntaxValidationError(result["errors"])
    if result["stage"] == "security" or not result["valid"]:
        raise SecurityValidationError(result.get("securityFlags", result.get("errors")))

    return result

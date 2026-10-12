import json
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from stream_events import stream_component_events


# ============================================================
# FastAPI application
# ============================================================

app = FastAPI(
    title="AuraGen Code Generation API",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://auragen-blush.vercel.app",
]

frontend_url = os.getenv("FRONTEND_URL")

if frontend_url:
    allowed_origins.append(frontend_url)


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ============================================================
# Request model
# ============================================================

class GenerateRequest(BaseModel):
    cognitive_load_score: float = Field(
        ...,
        ge=0,
        le=100,
    )

    field_name: str

    signal_summary: str

    original_field_type: str

    max_retries: int = Field(
        default=2,
        ge=0,
        le=5,
    )

    dom_snapshot: str | None = None

    field_values: dict[str, str] | None = None


# ============================================================
# Health check
# ============================================================

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "AuraGen Code Generation API",
    }


# ============================================================
# Code generation endpoint
# ============================================================

@app.post("/generate")
async def generate(req: GenerateRequest):

    async def sse():
        try:
            async for event in stream_component_events(
                **req.model_dump()
            ):
                yield (
                    f"data: {json.dumps(event)}\n\n"
                )

        except Exception as exc:
            # Keep the SSE connection controlled even if
            # something unexpected happens inside generation.
            error_event = {
                "type": "final",
                "status": "error",
                "reason": "server_error",
                "message": str(exc),
            }

            yield (
                f"data: {json.dumps(error_event)}\n\n"
            )

    return StreamingResponse(
        sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )



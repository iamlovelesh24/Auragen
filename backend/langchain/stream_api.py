import json
from typing import Any, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from stream_events import stream_component_events

app = FastAPI(title="AuraGen generation service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


class GenerateRequest(BaseModel):
    cognitive_load_score: float = Field(ge=0, le=100)
    field_name: str
    signal_summary: str
    original_field_type: str
    max_retries: int = Field(default=2, ge=0, le=3)
    dom_snapshot: Optional[Any] = None
    field_values: Optional[Any] = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate")
async def generate(req: GenerateRequest):
    async def sse():
        async for event in stream_component_events(**req.model_dump()):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        sse(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
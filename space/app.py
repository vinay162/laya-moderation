"""REST API for the Laya moderation demo. Runs on a free Hugging Face CPU Space."""

import os
import threading
import time
from collections import defaultdict, deque

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from scoring import LABELS, Scorer

APPROVE_BELOW = 0.10
REMOVE_AT = 0.90
MAX_TEXT = 1200
RATE_LIMIT = 20  # requests per minute per IP
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173").split(",")
    if o.strip()
]

app = FastAPI(title="Laya moderation API", version="1.0.0", docs_url="/docs", redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    max_age=3600,
)

scorer: Scorer | None = None
load_error: str | None = None
served = 0


def _load():
    global scorer, load_error
    try:
        scorer = Scorer()
    except Exception as e:  # reported by /health so failures are visible
        load_error = f"{type(e).__name__}: {e}"


# Load in the background so /health answers while the model downloads.
threading.Thread(target=_load, daemon=True).start()


class TextIn(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def check_text(cls, v: str) -> str:
        v = v.strip()
        if not 1 <= len(v) <= MAX_TEXT:
            raise ValueError(f"text must be 1 to {MAX_TEXT} characters")
        return v


class AskIn(TextIn):
    question: str = Field(...)

    @field_validator("question")
    @classmethod
    def check_question(cls, v: str) -> str:
        v = v.strip()
        if not 3 <= len(v) <= 200:
            raise ValueError("question must be 3 to 200 characters")
        return v


_hits: dict[str, deque] = defaultdict(deque)
_hits_lock = threading.Lock()


def _guard(request: Request) -> Scorer:
    """Rate limit per client IP, count the request (never its text), and check the model is ready."""
    global served
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")
    now = time.monotonic()
    with _hits_lock:
        q = _hits[ip]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= RATE_LIMIT:
            raise HTTPException(429, "Too many requests. Please wait a minute and try again.")
        q.append(now)
        served += 1
    if scorer is None:
        raise HTTPException(503, "The model is still loading. Try again in a few seconds.")
    return scorer


def decide(p_toxic: float) -> str:
    if p_toxic < APPROVE_BELOW:
        return "approve"
    if p_toxic >= REMOVE_AT:
        return "remove"
    return "review"


def _ms(t0: float) -> int:
    return round((time.perf_counter() - t0) * 1000)


@app.get("/")
def root():
    return {"name": "Laya moderation API", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    return {
        "status": "error" if load_error else "ok",
        "model_loaded": scorer is not None,
        "requests_served": served,
        **({"error": load_error} if load_error else {}),
    }


@app.post("/predict/stage1")
def stage1(body: TextIn, request: Request):
    s = _guard(request)
    t0 = time.perf_counter()
    p = s.calibrated(body.text, ["toxic"])
    return {"p": p, "decision": decide(p["toxic"]), "ms": _ms(t0)}


@app.post("/predict/stage2")
def stage2(body: TextIn, request: Request):
    s = _guard(request)
    t0 = time.perf_counter()
    p = s.calibrated(body.text, LABELS[1:])
    return {"p": p, "ms": _ms(t0)}


@app.post("/predict/full")
def full(body: TextIn, request: Request):
    s = _guard(request)
    t0 = time.perf_counter()
    p = s.calibrated(body.text, LABELS)
    return {"p": p, "decision": decide(p["toxic"]), "ms": _ms(t0)}


@app.post("/ask")
def ask(body: AskIn, request: Request):
    s = _guard(request)
    t0 = time.perf_counter()
    return {"p_yes": s.ask(body.text, body.question), "calibrated": False, "ms": _ms(t0)}

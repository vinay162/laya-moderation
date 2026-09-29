"""Routing thresholds and input limits shared by the Gradio app and the FastAPI server."""

APPROVE_BELOW = 0.10
REMOVE_AT = 0.90
MAX_TEXT = 1200
MIN_QUESTION = 3
MAX_QUESTION = 200


def decide(p_toxic: float) -> str:
    """approve below 0.10, remove at 0.90 or above, otherwise send to a person."""
    if p_toxic < APPROVE_BELOW:
        return "approve"
    if p_toxic >= REMOVE_AT:
        return "remove"
    return "review"


def clean_text(text) -> str:
    text = (text or "").strip()
    if not 1 <= len(text) <= MAX_TEXT:
        raise ValueError(f"text must be 1 to {MAX_TEXT} characters")
    return text


def clean_question(question) -> str:
    question = (question or "").strip()
    if not MIN_QUESTION <= len(question) <= MAX_QUESTION:
        raise ValueError(f"question must be {MIN_QUESTION} to {MAX_QUESTION} characters")
    return question

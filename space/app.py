"""Laya moderation API on Hugging Face ZeroGPU.

The demo site calls the four API endpoints below with Gradio's JavaScript client. The small page on the
Space itself is only there so visitors to the Space can try it too. Text is scored in memory and never
stored or logged.
"""

import threading
import time

import gradio as gr
import spaces

from policy import MAX_QUESTION, MAX_TEXT, clean_question, clean_text, decide
from scoring import LABELS, Scorer

# On ZeroGPU the model is placed on the GPU here, at import time, as the ZeroGPU docs require.
scorer = Scorer()

# A CPU copy answers when the GPU can't: the visitor's daily ZeroGPU allowance is used up, or no GPU
# is free. Slower, but nobody gets turned away. Loaded in the background so startup isn't delayed.
cpu_scorer: Scorer | None = scorer if scorer.device == "cpu" else None
_cpu_ready = threading.Event()


def _load_cpu():
    global cpu_scorer
    if cpu_scorer is None:
        cpu_scorer = Scorer(device="cpu")
    _cpu_ready.set()


threading.Thread(target=_load_cpu, daemon=True).start()


# ZeroGPU checks the reserved duration against the visitor's remaining allowance, so keep it short:
# one comment takes well under a second on the GPU.
@spaces.GPU(duration=5)
def _margins_gpu(text: str, instructions: list[str]):
    t0 = time.perf_counter()
    m = scorer.margins(text, instructions)
    return m, round((time.perf_counter() - t0) * 1000)


def _margins(text: str, instructions: list[str]):
    """Raw scores, the model time in ms, and which device answered."""
    if scorer.device != "cpu":
        try:
            m, ms = _margins_gpu(text, instructions)
            return m, ms, "gpu"
        except Exception as e:  # quota used up, no GPU free, or a GPU timeout
            # Only the reason is logged, never the visitor's text.
            print(f"GPU unavailable, using CPU: {type(e).__name__}: {str(e)[:200]}", flush=True)
    _cpu_ready.wait()
    t0 = time.perf_counter()
    m = cpu_scorer.margins(text, instructions)
    return m, round((time.perf_counter() - t0) * 1000), "cpu"


def _text(text: str) -> str:
    try:
        return clean_text(text)
    except ValueError as e:
        raise gr.Error(str(e)) from e


def stage1(text: str) -> dict:
    """Calibrated P(toxic) and the routing decision: approve below 0.10, remove at 0.90 or above."""
    text = _text(text)
    m, ms, device = _margins(text, scorer.instructions(["toxic"]))
    p = scorer.platt_probs(["toxic"], m)
    return {"p": p, "decision": decide(p["toxic"]), "ms": ms, "device": device}


def stage2(text: str) -> dict:
    """Calibrated probabilities for the other five labels."""
    text = _text(text)
    labels = LABELS[1:]
    m, ms, device = _margins(text, scorer.instructions(labels))
    return {"p": scorer.platt_probs(labels, m), "ms": ms, "device": device}


def full(text: str) -> dict:
    """All six calibrated probabilities and the routing decision."""
    text = _text(text)
    m, ms, device = _margins(text, scorer.instructions(LABELS))
    p = scorer.platt_probs(LABELS, m)
    return {"p": p, "decision": decide(p["toxic"]), "ms": ms, "device": device}


def ask(text: str, question: str) -> dict:
    """P(yes) for any yes/no question about the text. Not calibrated."""
    text = _text(text)
    try:
        question = clean_question(question)
    except ValueError as e:
        raise gr.Error(str(e)) from e
    m, ms, device = _margins(text, [question])
    return {"p_yes": scorer.ask_prob(float(m[0])), "calibrated": False, "ms": ms, "device": device}


with gr.Blocks(title="Laya moderation API") as demo:
    gr.Markdown(
        "# Laya moderation API\n"
        "Scores a comment on six toxicity labels with a fine-tuned "
        "[Laya](https://huggingface.co/convaiinnovations/laya) model. "
        "The full demo lives on the project site; see [the code on GitHub](https://github.com/vinay162/laya-moderation). "
        "A demo only, not for real moderation decisions."
    )
    with gr.Row():
        with gr.Column():
            comment = gr.Textbox(label="Comment", lines=5, max_length=MAX_TEXT)
            score = gr.Button("Score all six labels", variant="primary")
            question = gr.Textbox(label="Your own yes/no question (uncalibrated)", max_length=MAX_QUESTION)
            ask_btn = gr.Button("Ask")
        with gr.Column():
            result = gr.JSON(label="Result")
    # The page's own buttons get separate private names so the public API keeps /full and /ask.
    score.click(full, comment, result, api_name="ui_full", api_visibility="private")
    ask_btn.click(ask, [comment, question], result, api_name="ui_ask", api_visibility="private")

    gr.api(stage1, api_name="stage1")
    gr.api(stage2, api_name="stage2")
    gr.api(full, api_name="full")
    gr.api(ask, api_name="ask")

demo.queue(default_concurrency_limit=1)

if __name__ == "__main__":
    demo.launch()

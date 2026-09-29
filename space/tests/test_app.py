"""The Gradio endpoints the demo site calls: shapes, decisions and input checks."""

import gradio as gr
import pytest

import app
from policy import decide


def test_stage1():
    r = app.stage1("Thanks")
    assert set(r) == {"p", "decision", "ms", "device"}
    assert set(r["p"]) == {"toxic"}
    assert r["decision"] == "approve"


def test_stage2():
    r = app.stage2("Thanks")
    assert set(r["p"]) == {"severe_toxic", "obscene", "threat", "insult", "identity_hate"}


def test_full_matches_split():
    full = app.full("Asshole")
    split = {**app.stage1("Asshole")["p"], **app.stage2("Asshole")["p"]}
    assert full["decision"] == decide(full["p"]["toxic"])
    for label, value in full["p"].items():
        assert split[label] == pytest.approx(value, abs=1e-4)


def test_ask():
    r = app.ask("Great work!", "Is this sarcastic?")
    assert r["calibrated"] is False
    assert 0 <= r["p_yes"] <= 1


@pytest.mark.parametrize(
    "call",
    [
        lambda: app.stage1("   "),
        lambda: app.full("x" * 1201),
        lambda: app.ask("hello", "?"),
        lambda: app.ask("hello", "q" * 201),
    ],
)
def test_rejects_bad_input(call):
    with pytest.raises(gr.Error):
        call()


def test_falls_back_to_cpu_when_gpu_is_unavailable(monkeypatch):
    """When ZeroGPU refuses (quota used up, no GPU free), the CPU copy answers with the same scores."""
    expected = app.full("Asshole")["p"]
    real = app.scorer

    class GpuScorer:
        device = "cuda"

        def __getattr__(self, name):
            return getattr(real, name)

    def no_gpu(*_):
        raise RuntimeError("You have exceeded your GPU quota")

    monkeypatch.setattr(app, "scorer", GpuScorer())
    monkeypatch.setattr(app, "_margins_gpu", no_gpu)
    r = app.full("Asshole")
    assert r["device"] == "cpu"
    for label, value in expected.items():
        assert r["p"][label] == pytest.approx(value, abs=1e-6)

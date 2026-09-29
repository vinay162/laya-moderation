"""The CPU scorer must reproduce the calibrated probabilities from the Kaggle GPU run.

The GPU run used fp16, so small differences are expected; anything above the tolerance means the
scoring does not match training (question wording, truncation, option order, Platt or model revision).
"""

import json
from pathlib import Path

import pytest

from scoring import LABELS, Scorer

GOLDEN = json.loads((Path(__file__).parent / "golden.json").read_text(encoding="utf-8"))
TOL = GOLDEN["tolerance"]


@pytest.fixture(scope="session")
def scorer():
    return Scorer()


@pytest.mark.parametrize("case", GOLDEN["cases"], ids=lambda c: c["text"][:24])
def test_matches_gpu_run(scorer, case):
    got = scorer.calibrated(case["text"], LABELS)
    for label, expected in zip(LABELS, case["p"]):
        assert abs(got[label] - expected) <= TOL, f"{label}: got {got[label]:.4f}, expected {expected}"


def test_stage_split_matches_full(scorer):
    """Asking toxic alone, then the other five, gives the same numbers as asking all six at once."""
    text = GOLDEN["cases"][1]["text"]
    full = scorer.calibrated(text, LABELS)
    split = {**scorer.calibrated(text, ["toxic"]), **scorer.calibrated(text, LABELS[1:])}
    for label in LABELS:
        assert split[label] == pytest.approx(full[label], abs=1e-4)


def test_custom_question_is_a_probability(scorer):
    p = scorer.ask("What a lovely day, thanks for your help!", "Is this comment polite?")
    assert 0.0 <= p <= 1.0

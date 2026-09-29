"""API behaviour: validation, routing decisions, response shapes and rate limiting."""

import time

import pytest
from fastapi.testclient import TestClient

import app as api


@pytest.fixture(scope="module")
def client():
    c = TestClient(api.app)
    for _ in range(600):  # wait for the background model load
        if c.get("/health").json()["model_loaded"]:
            break
        time.sleep(1)
    return c


@pytest.fixture(autouse=True)
def fresh_rate_limit():
    api._hits.clear()


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


@pytest.mark.parametrize(
    "p, expected", [(0.0, "approve"), (0.0999, "approve"), (0.1, "review"), (0.8999, "review"), (0.9, "remove")]
)
def test_decision_thresholds(p, expected):
    assert api.decide(p) == expected


def test_stage1_shape(client):
    r = client.post("/predict/stage1", json={"text": "Thanks"}).json()
    assert set(r) == {"p", "decision", "ms"}
    assert set(r["p"]) == {"toxic"}
    assert r["decision"] == "approve"


def test_stage2_shape(client):
    r = client.post("/predict/stage2", json={"text": "Thanks"}).json()
    assert set(r["p"]) == {"severe_toxic", "obscene", "threat", "insult", "identity_hate"}


def test_full_shape(client):
    r = client.post("/predict/full", json={"text": "Asshole"}).json()
    assert len(r["p"]) == 6
    assert r["decision"] == api.decide(r["p"]["toxic"])


def test_ask_is_marked_uncalibrated(client):
    r = client.post("/ask", json={"text": "Great work!", "question": "Is this sarcastic?"}).json()
    assert r["calibrated"] is False
    assert 0 <= r["p_yes"] <= 1


@pytest.mark.parametrize(
    "path, body",
    [
        ("/predict/stage1", {"text": "   "}),
        ("/predict/stage1", {"text": "x" * 1201}),
        ("/predict/full", {}),
        ("/ask", {"text": "hello", "question": "?"}),
        ("/ask", {"text": "hello", "question": "q" * 201}),
    ],
)
def test_rejects_bad_input(client, path, body):
    assert client.post(path, json=body).status_code == 422


def test_rate_limit(client):
    codes = [client.post("/predict/stage1", json={"text": "hi"}).status_code for _ in range(api.RATE_LIMIT + 1)]
    assert codes[:-1] == [200] * api.RATE_LIMIT
    assert codes[-1] == 429

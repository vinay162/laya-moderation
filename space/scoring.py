"""Loads the fine-tuned Laya model and scores comments exactly the way the Kaggle notebooks did.

The question wording, the 1,200 character truncation, the empty criteria and the Platt formula must not
change, because the calibration was fitted on exactly this setup. The model runs in float32 on whatever
device is available: a ZeroGPU GPU on Hugging Face, or the CPU when run locally.
"""

import json
import os
import threading

import numpy as np
import torch
from huggingface_hub import snapshot_download
from laya.agent import _fix_tokenizer_config
from laya.common import QTYPES, build_model, build_sequence
from safetensors.torch import load_file
from transformers import AutoTokenizer

LABELS = ["toxic", "severe_toxic", "obscene", "threat", "insult", "identity_hate"]
REPO = os.environ.get("MODEL_REPO", "Vinay57/laya-jigsaw-moderation")
REVISION = os.environ.get("MODEL_REVISION", "9e558ae5594479efd78d35660d12ea27444ce075")


def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


class Scorer:
    def __init__(self, device: str | None = None):
        d = snapshot_download(REPO, revision=REVISION, token=os.environ.get("HF_TOKEN") or None)
        _fix_tokenizer_config(d)
        with open(os.path.join(d, "rl_agent_config.json")) as f:
            self.cfg = json.load(f)
        with open(os.path.join(d, "calibration_platt.json")) as f:
            calib = json.load(f)
        self.questions = calib["questions"]
        self.platt = calib["platt"]
        self.max_chars = calib["max_chars"]
        self.noul = QTYPES["noul"]
        # Default temperature, used only for custom questions, which have no Platt fit.
        self.t_default = float(self.cfg["temperature"][self.noul])

        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.tok = AutoTokenizer.from_pretrained(os.path.join(d, "tokenizer"))
        model = build_model(self.cfg, encoder_dir=os.path.join(d, "encoder"))
        model.load_state_dict(load_file(os.path.join(d, "model.safetensors")), strict=True)
        self.model = model.float().eval().to(self.device)
        if self.device == "cpu":
            torch.set_num_threads(max(1, os.cpu_count() or 1))
        # One forward pass at a time: the free CPU has 2 cores, and ZeroGPU hands out one GPU per call.
        self.lock = threading.Lock()

    def margins(self, text: str, instructions: list[str]) -> np.ndarray:
        """Raw score per question: logit(yes) minus logit(no). All questions go in one batch."""
        state = {"comment": text[: self.max_chars]}
        seqs = [
            build_sequence(
                self.tok,
                state,
                {"t": "noul", "ins": ins, "crit": {}},
                self.cfg["max_len"],
                self.cfg["head_max_len"],
            )
            for ins in instructions
        ]
        n, length = len(seqs), max(len(s) for s, _ in seqs)
        k = max(len(m) for _, m in seqs)
        ids = torch.full((n, length), self.tok.pad_token_id, dtype=torch.long)
        att = torch.zeros((n, length), dtype=torch.long)
        mpos = torch.zeros((n, k), dtype=torch.long)
        mmask = torch.zeros((n, k), dtype=torch.bool)
        for i, (s, m) in enumerate(seqs):
            ids[i, : len(s)] = torch.tensor(s)
            att[i, : len(s)] = 1
            mpos[i, : len(m)] = torch.tensor(m)
            mmask[i, : len(m)] = True
        qtype = torch.full((n,), self.noul, dtype=torch.long)
        dev = self.device
        with self.lock, torch.inference_mode():
            logits, _ = self.model(ids.to(dev), att.to(dev), mpos.to(dev), mmask.to(dev), qtype.to(dev))
        lg = logits.float()[:, :2].cpu().numpy()  # option order is [false, true]
        return lg[:, 1] - lg[:, 0]

    def instructions(self, labels: list[str]) -> list[str]:
        return [self.questions[label]["instructions"] for label in labels]

    def platt_probs(self, labels: list[str], margins: np.ndarray) -> dict[str, float]:
        """Calibrated probabilities for the trained questions: p = sigmoid(a * score + b)."""
        return {
            label: float(_sigmoid(self.platt[label]["a"] * margins[i] + self.platt[label]["b"]))
            for i, label in enumerate(labels)
        }

    def ask_prob(self, margin: float) -> float:
        """Uncalibrated probability for a custom question, using the model's default temperature."""
        return float(_sigmoid(margin / self.t_default))

    def calibrated(self, text: str, labels: list[str]) -> dict[str, float]:
        return self.platt_probs(labels, self.margins(text, self.instructions(labels)))

    def ask(self, text: str, question: str) -> float:
        return self.ask_prob(self.margins(text, [question])[0])

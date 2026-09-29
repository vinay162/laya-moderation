---
title: Laya Moderation API
emoji: 🛡️
colorFrom: gray
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
short_description: Calibrated toxic comment scoring with a fine-tuned Laya model
---

# Laya moderation API

A small REST API that scores comments with a fine-tuned [Laya](https://huggingface.co/convaiinnovations/laya) model ([Vinay57/laya-jigsaw-moderation](https://huggingface.co/Vinay57/laya-jigsaw-moderation)). It powers the "Try it live" page of the [demo site](https://github.com/vinay162/laya-moderation).

It runs on a free 2 vCPU machine, so the first request after a quiet spell can take a minute or two while the Space wakes up.

## Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/health` | | `status`, `model_loaded` |
| POST | `/predict/stage1` | `{"text"}` | calibrated P(toxic), a routing decision, time taken |
| POST | `/predict/stage2` | `{"text"}` | calibrated P for the other five labels |
| POST | `/predict/full` | `{"text"}` | all six calibrated probabilities and the decision |
| POST | `/ask` | `{"text", "question"}` | P(yes) for your own yes/no question (not calibrated) |

The decision is `approve` below 0.10, `remove` at 0.90 or above, and `review` in between. Text is 1 to 1,200 characters, questions 3 to 200. Each IP gets 20 requests a minute.

Submitted text is scored in memory and never stored or logged.

## Example

```bash
curl -X POST https://vinay57-laya-moderation-demo.hf.space/predict/full \
  -H "Content-Type: application/json" \
  -d '{"text": "Thanks for fixing the references!"}'
```

This is a demo, not a production moderation service.

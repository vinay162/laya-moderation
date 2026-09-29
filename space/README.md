---
title: Laya Moderation API
emoji: 🛡️
colorFrom: gray
colorTo: blue
sdk: gradio
sdk_version: 6.29.0
python_version: "3.12"
app_file: app.py
pinned: false
license: apache-2.0
short_description: Calibrated toxic comment scoring with fine-tuned Laya
models:
  - Vinay57/laya-jigsaw-moderation
---

# Laya moderation API

Scores comments with a fine-tuned [Laya](https://huggingface.co/convaiinnovations/laya) model ([Vinay57/laya-jigsaw-moderation](https://huggingface.co/Vinay57/laya-jigsaw-moderation)). It powers the "Try it live" page of the [demo site](https://github.com/vinay162/laya-moderation) and runs on Hugging Face ZeroGPU, which lends it a GPU only while a request is being scored.

## API

| Endpoint | Inputs | Returns |
|---|---|---|
| `/stage1` | `text` | calibrated P(toxic), a routing decision, model time in ms |
| `/stage2` | `text` | calibrated P for the other five labels |
| `/full` | `text` | all six calibrated probabilities and the decision |
| `/ask` | `text`, `question` | P(yes) for your own yes/no question (not calibrated) |

The decision is `approve` below 0.10, `remove` at 0.90 or above, and `review` in between. Text is 1 to 1,200 characters, questions 3 to 200.

```python
from gradio_client import Client

client = Client("Vinay57/laya-moderation-demo")
print(client.predict("Thanks for fixing the references!", api_name="/full"))
```

Submitted text is scored in memory and never stored or logged. This is a demo, not a production moderation service.

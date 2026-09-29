FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# CPU-only PyTorch first, so the requirements below don't pull the multi-GB CUDA build.
RUN pip install torch==2.14.0 --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

# Hugging Face runs Space containers as uid 1000.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    HF_HOME=/home/user/.cache/huggingface \
    PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user/app

COPY --chown=user app.py scoring.py ./

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]

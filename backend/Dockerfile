FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && curl -fsSL -o /tmp/audiowaveform.deb \
        https://github.com/bbc/audiowaveform/releases/download/1.10.2/audiowaveform_1.10.2-1-13_amd64.deb \
    && apt-get install -y --no-install-recommends /tmp/audiowaveform.deb \
    && rm -f /tmp/audiowaveform.deb \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

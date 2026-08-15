# docker/docker-compose.yml builds this with context ../backend
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencies first — this layer caches until requirements.txt changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Non-root. Nothing in this container needs to write to its own filesystem.
RUN useradd --create-home --uid 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# No --reload here. Add it in a compose override for local development.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
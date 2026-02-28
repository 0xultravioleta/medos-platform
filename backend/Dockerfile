FROM python:3.12-slim AS base

WORKDIR /app

# Security: non-root user
RUN addgroup --system medos && adduser --system --group medos

# Install dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# Copy application
COPY src/ src/

# Switch to non-root user
USER medos

EXPOSE 8000

CMD ["uvicorn", "medos.main:app", "--host", "0.0.0.0", "--port", "8000"]

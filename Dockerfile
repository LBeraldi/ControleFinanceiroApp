FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY controle-financeiro-react/ ./
RUN corepack enable \
    && pnpm install --frozen-lockfile --prod=false \
    && pnpm build


FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY controle-financeiro/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY controle-financeiro/ ./controle-financeiro/
COPY --from=frontend-builder /app/frontend/dist/ ./controle-financeiro/src/static/

WORKDIR /app/controle-financeiro

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--timeout", "120", "src.main:app"]

# Docker

## O que foi preparado

- `Dockerfile`: gera o frontend React e embute o build dentro do backend Flask.
- `docker-compose.yml`: sobe a aplicacao completa na porta `5000`.
- `tunnel` opcional: cria um dominio temporario via Cloudflare Tunnel (`trycloudflare.com`).
- Volume `cf_app_data`: persiste o banco SQLite fora do container.

## Como subir localmente

```bash
docker compose up --build -d
```

Aplicacao local:

```text
http://localhost:5000
```

## Como subir com dominio temporario

```bash
docker compose --profile tunnel up --build -d
```

Depois disso, veja a URL publica nos logs do tunel:

```bash
docker compose logs tunnel
```

O log vai mostrar um endereco `https://...trycloudflare.com` apontando para sua aplicacao.

## Variaveis opcionais

Se quiser habilitar IA ou cotacoes com token, copie `.env.example` para `.env` e preencha:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
BRAPI_TOKEN=
```

O `docker compose` carregara esse arquivo automaticamente.

## Parar

```bash
docker compose down
```

Para parar e remover tambem o volume de dados:

```bash
docker compose down -v
```

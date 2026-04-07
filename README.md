# Controle Financeiro App

Aplicacao de controle financeiro com:

- backend em Flask
- frontend em React + Vite
- banco local SQLite

O projeto esta dividido em duas pastas principais:

- `controle-financeiro`: API Flask
- `controle-financeiro-react`: interface web React

## Requisitos

Instale estes itens antes de rodar:

- Python 3.11 ou superior
- Node.js 20 ou superior
- pnpm 10 ou superior

Se nao tiver `pnpm`, instale com:

```bash
npm install -g pnpm
```

## Estrutura

```text
CF-APP/
|- controle-financeiro/
|  |- src/
|  |- requirements.txt
|- controle-financeiro-react/
|  |- src/
|  |- package.json
|- docker-compose.yml
|- Dockerfile
```

## Como rodar localmente

Abra dois terminais: um para o backend e outro para o frontend.

### 1. Backend Flask

Entre na pasta do backend:

```bash
cd controle-financeiro
```

Crie e ative um ambiente virtual.

Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Windows CMD:

```bat
python -m venv .venv
.venv\Scripts\activate.bat
```

Linux/macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Instale as dependencias:

```bash
pip install -r requirements.txt
```

Suba a API:

```bash
python src/main.py
```

Backend esperado:

- URL: `http://127.0.0.1:5000`
- API base: `http://127.0.0.1:5000/api`

### 2. Frontend React

Em outro terminal, entre na pasta do frontend:

```bash
cd controle-financeiro-react
```

Instale as dependencias:

```bash
pnpm install
```

Suba o Vite:

```bash
pnpm dev
```

Frontend esperado:

- URL: `http://127.0.0.1:5173`

## Como acessar

Com backend e frontend ligados:

- frontend: `http://127.0.0.1:5173`
- API Flask: `http://127.0.0.1:5000/api`

## Variaveis de ambiente

Na raiz existe um arquivo `.env.example`.

As variaveis mais importantes sao:

- `OPENAI_API_KEY`: habilita recursos de IA
- `OPENAI_MODEL`: modelo usado no backend
- `BRAPI_TOKEN`: melhora acesso a dados de mercado da brapi
- `VITE_API_BASE_URL`: opcional no frontend, para apontar a API manualmente

### Exemplo de configuracao

Backend:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
BRAPI_TOKEN=
```

Frontend:

Se precisar forcar a URL da API no Vite, crie um `.env` dentro de `controle-financeiro-react`:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

Observacao:

- em ambiente local, o frontend ja tenta usar `http://127.0.0.1:5000/api` automaticamente
- se mudar `vite.config.js` ou arquivos `.env`, reinicie o frontend

## Banco de dados

O backend usa SQLite local.

O banco fica em:

```text
controle-financeiro/src/database/app.db
```

As tabelas sao criadas automaticamente na inicializacao do Flask.

## Rodando com Docker

Se preferir, use Docker:

```bash
docker compose up --build
```

Isso sobe a aplicacao principal na porta:

- `http://127.0.0.1:5000`

Observacao:

- o `docker-compose.yml` sobe o backend
- o frontend React em modo desenvolvimento continua sendo mais pratico fora do Docker

## Build do frontend

Para gerar build de producao:

```bash
cd controle-financeiro-react
pnpm build
```

## Problemas comuns

### 1. "A API retornou HTML em vez de JSON"

Causas mais comuns:

- backend Flask nao esta rodando
- frontend foi aberto sem o backend ativo
- o frontend precisa ser reiniciado depois de mudar `vite.config.js` ou `.env`

Checklist:

1. confirme que `python src/main.py` esta rodando
2. abra `http://127.0.0.1:5000/api/dashboard`
3. se aparecer JSON, a API esta viva
4. reinicie o frontend com `pnpm dev`

### 2. Porta 5000 ocupada

Se a porta estiver em uso, finalize o processo antigo ou troque a porta no backend e no frontend.

### 3. `pnpm` bloqueado no PowerShell

Se o PowerShell bloquear scripts, tente:

```powershell
pnpm.cmd dev
pnpm.cmd build
```

### 4. Ativo sem cotacao na aba de investimentos

Hoje o sistema funciona melhor com ativos suportados pelas fontes configuradas, como:

- `PETR4`
- `VALE3`
- `ITUB4`
- `USD-BRL`
- `BTC-BRL`

Alguns tickers podem existir na busca, mas nao ter cotacao/historico disponiveis sem suporte adicional da API externa.

## Endpoints uteis para teste

- `GET /api/dashboard`
- `GET /api/gastos`
- `GET /api/receitas`
- `GET /api/contas`
- `GET /api/metas`
- `GET /api/investimentos`
- `GET /api/investimentos/mercado`
- `GET /api/investimentos/painel-mercado`

## Fluxo recomendado para quem acabou de baixar

1. clone o repositorio
2. suba o backend
3. suba o frontend
4. abra o navegador em `http://127.0.0.1:5173`
5. valide a API abrindo `http://127.0.0.1:5000/api/dashboard`

## Observacoes finais

- o projeto ainda esta evoluindo
- alguns recursos dependem de APIs externas
- para ambiente de desenvolvimento, sempre prefira backend e frontend em terminais separados

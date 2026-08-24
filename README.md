# FitSaaS + Hermes

Aplicacao pessoal de monitoramento de treino, progresso e medidas.

## Arquitetura

```text
Usuario
  |
  v
React / Vite
  |
  v
FastAPI
  |
  +-- /api/analytics -> indicadores deterministicos em Python
  |
  +-- /api/agent ----> indicadores -> interpretacao por IA
```

O frontend nunca chama Hermes, Gemini, Claude ou OpenAI diretamente.
Chaves ficam apenas no backend.

## Acesso

O usuario pode criar uma conta pela tela inicial e registrar seus dados de treino.

## Frontend

No Windows, de dois cliques em:

```text
INICIAR_FRONTEND.bat
```

Ou pelo terminal:

```bash
npm install
npm run dev
```

Abra:

```text
http://localhost:5173
```

## Backend

No Windows, de dois cliques em:

```text
INICIAR_BACKEND.bat
```

Ou manualmente:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

Teste:

```text
http://localhost:8000
```

## Hermes

O Hermes deve expor o API Server compativel com OpenAI:

```text
POST http://127.0.0.1:8642/v1/chat/completions
```

Variaveis esperadas em `backend/.env`:

```env
HERMES_BASE_URL=http://127.0.0.1:8642
HERMES_API_KEY=troque-esta-chave
HERMES_MODEL=hermes-agent
HERMES_TIMEOUT_SECONDS=90
```

O frontend e `/api/analytics` funcionam sem Hermes.
Somente o chat de Insights IA depende do Hermes.

Para usar o Hermes em nuvem, configure `HERMES_BASE_URL` com a URL publica ou
privada do servidor onde o gateway estiver hospedado.

## Persistencia

O backend possui uma primeira camada de persistencia em SQLite:

```text
users
workout_plans
exercises
load_logs
measurements
```

O frontend sincroniza o estado da aplicacao com `/api/state`.
Para producao, a proxima evolucao recomendada e migrar a persistencia para
PostgreSQL/Supabase com autenticacao propria.

## Testes

Dentro de `backend`:

```bash
python -m unittest discover -s tests
```

Build do frontend:

```bash
npm run build
```

## Frequencia registrada

O indicador atual nao se chama aderencia formal.

Calculo atual:

```text
dias unicos registrados nos ultimos 28 dias / 4 = media semanal
media semanal / meta semanal = cobertura da meta
```

Para aderencia formal, uma evolucao futura deve adicionar sessoes planejadas
e sessoes concluidas.

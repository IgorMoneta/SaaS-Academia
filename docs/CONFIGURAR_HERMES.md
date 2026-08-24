# Configurar Hermes no FitSaaS

O FitSaaS **não chama Gemini, Claude ou OpenAI diretamente**.

Ele chama o API Server do Hermes:

```text
FitSaaS -> FastAPI -> Hermes -> modelo escolhido no Hermes
```

## 1. Escolha o modelo do Hermes

Com o Hermes instalado:

```bash
hermes model
```

Você pode selecionar, por exemplo, Google Gemini.

Para Gemini, o Hermes aceita `GOOGLE_API_KEY` ou `GEMINI_API_KEY`.

## 2. Habilite o API Server

No arquivo:

```text
~/.hermes/.env
```

adicione:

```env
API_SERVER_ENABLED=true
API_SERVER_KEY=uma-chave-forte-aqui
```

## 3. Inicie o gateway

```bash
hermes gateway
```

O API Server deve aparecer em:

```text
http://127.0.0.1:8642
```

## 4. Configure o FitSaaS

Copie:

```text
backend/.env.example
```

para:

```text
backend/.env
```

e use a mesma chave:

```env
HERMES_BASE_URL=http://127.0.0.1:8642
HERMES_API_KEY=uma-chave-forte-aqui
HERMES_MODEL=hermes-agent
HERMES_TIMEOUT_SECONDS=90
```

## 5. Teste o Hermes antes do FitSaaS

No Windows PowerShell:

```powershell
$headers = @{
  Authorization = "Bearer uma-chave-forte-aqui"
  "Content-Type" = "application/json"
}

$body = @{
  model = "hermes-agent"
  messages = @(
    @{
      role = "user"
      content = "Responda apenas: Hermes funcionando."
    }
  )
  stream = $false
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8642/v1/chat/completions" `
  -Method Post `
  -Headers $headers `
  -Body $body
```

Se o Hermes responder, abra o FitSaaS e use a aba **Insights IA**.

## Trocar a LLM

Não altere o código do FitSaaS.

Execute novamente:

```bash
hermes model
```

e escolha outro provider/modelo.

O backend continuará chamando `hermes-agent`.

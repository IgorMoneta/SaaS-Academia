# Arquitetura

## Frontend

O frontend cuida de:

- interface;
- entrada de dados;
- registro de carga;
- registro de medidas;
- envio dos dados ao backend;
- exibicao dos resultados.

Ele nao chama Hermes nem qualquer LLM diretamente.

## Backend

### `/api/analytics`

Recebe dados do usuario e calcula:

- dias com registro nos ultimos 28 dias;
- media de dias registrados por semana;
- cobertura da meta semanal;
- evolucao de carga;
- estimativa comparativa de e1RM;
- mudancas em medidas corporais.

### `/api/agent`

Calcula os mesmos indicadores e envia o JSON final para o Hermes.

O Hermes recebe numeros ja prontos e produz a interpretacao em linguagem
natural.

## Contrato principal

Entrada conceitual:

```json
{
  "user_id": "u1",
  "meta_semanal": 4,
  "measurements": [],
  "load_logs": [],
  "exercises": []
}
```

## Por que nao usar a LLM para calcular?

Calculos deterministicos sao:

- mais faceis de testar;
- reproduziveis;
- mais baratos;
- menos sujeitos a alucinacao.

A LLM fica responsavel por interpretacao e comunicacao.

## Persistencia

O backend possui uma primeira camada de persistencia em SQLite e expoe:

```text
GET /api/state
PUT /api/state
```

Essa camada permite sair do armazenamento exclusivo no navegador.
Para producao, a proxima etapa recomendada e mover a persistencia para
PostgreSQL/Supabase, com autenticacao e permissao por usuario.

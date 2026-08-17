# ClickUp Webhook Worker

Cloudflare Worker que recebe webhooks do ClickUp e dispara automações no pipeline local.

## Setup

```bash
cd agents/clickup-webhook-worker
npm install
```

## Configurar Secrets

```bash
wrangler secret put CLICKUP_TOKEN
# Insira seu Personal API Token do ClickUp

wrangler secret put CLICKUP_WEBHOOK_SECRET
# Insira o secret configurado no ClickUp
```

## Deploy

```bash
wrangler deploy
```

## Configurar no ClickUp

1. Acesse **Settings → Apps → Webhooks**
2. Clique em **Add Webhook**
3. URL: `https://clickup-webhook-worker.seu-subdomain.workers.dev/webhook`
4. Events:
   - `taskCreated`
   - `taskUpdated`
   - `taskStatusUpdated`
5. Secret: o mesmo valor definido em `CLICKUP_WEBHOOK_SECRET`

## Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET/POST | Health check |
| `/webhook` | POST | Recebe eventos do ClickUp |

## Eventos Suportados

### taskCreated
- Registra novo candidato na lista "Cadastro de Deputados"
- Registra novas tarefas na lista "Conteúdo & Mídia"

### taskUpdated
- Detecta mudanças em campos customizados relevantes

### taskStatusUpdated
- Quando uma etapa do workflow é concluída, loga qual etapa foi completada
- Pode ser estendido para disparar pipeline-orchestrator automaticamente

## Desenvolvimento

```bash
wrangler dev          # Servidor local
wrangler tail --pretty  # Logs em tempo real
```

## Arquitetura

```
ClickUp → Webhook → Worker → (futuro: executa scripts via API)
```

O Worker atual apenas recebe e loga eventos. Para executar scripts,
é necessário configurar um mecanismo de polling ou usar o MCP ClickUp.

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `CLICKUP_TOKEN` | Personal API Token do ClickUp |
| `CLICKUP_WEBHOOK_SECRET` | Secret para validação de assinatura |
| `CLICKUP_API_ROOT` | URL base da API (default: https://api.clickup.com/api/v2) |
| `CANDIDATES_LIST_ID` | ID da lista Cadastro de Deputados |
| `CONTENT_LIST_ID` | ID da lista Conteúdo & Mídia |
| `SITES_LIST_ID` | ID da lista Sites dos Candidatos |

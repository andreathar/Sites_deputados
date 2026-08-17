# ClickUp Automation Guide — Sites Deputados

Guia completo de automação entre o ClickUp e o pipeline local de geração de sites, intros e jingles.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLICKUP (Cloud)                              │
│                                                                     │
│  Cadastro de Deputados ←→ Conteúdo & Mídia ←→ Sites dos Candidatos │
│         (901715749173)        (901715749176)       (901716074162)    │
│                                                                     │
│  Webhook Events ──────────────────────────────────────┐             │
└───────────────────────────────────────────────────────│─────────────┘
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PIPELINE LOCAL                                    │
│                                                                     │
│  sync-clickup-workflow.mjs  ←→  auto-task-creator.mjs              │
│           ↕                           ↕                             │
│  pipeline-orchestrator.mjs  ←→  upload-clickup.mjs                 │
│                                                                     │
│  clickup-webhook-worker (Cloudflare Worker)                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Fluxo Bidirecional

1. **ClickUp → Local**: Webhook recebe eventos e dispara scripts
2. **Local → ClickUp**: Scripts atualizam status, criam tarefas, enviam uploads
3. **Sync de Status**: Sincronização automática entre campos customizados e arquivos locais

## Setup

### 1. Variáveis de Ambiente

```bash
# Token do ClickUp (Personal API Token)
export CLICKUP_TOKEN=pk_seu_token_aqui

# Secret do Webhook (para validação)
export CLICKUP_WEBHOOK_SECRET=seu_secret_aqui
```

### 2. Deploy do Webhook Worker

```bash
cd agents/clickup-webhook-worker
npm install
wrangler deploy
```

### 3. Configurar Webhook no ClickUp

1. Acesse **Settings → Apps → Webhooks**
2. Clique em **Add Webhook**
3. URL: `https://seu-worker.seu-subdomain.workers.dev/webhook`
4. Events:
   - `taskCreated`
   - `taskUpdated`
   - `taskStatusUpdated`
5. Secret: defina o mesmo valor de `CLICKUP_WEBHOOK_SECRET`

### 4. Configurar Automações no ClickUp

Na lista **Conteúdo & Mídia**, crie automações:

| Trigger | Ação | Descrição |
|---------|------|-----------|
| Status muda para "Concluído" | Webhook | Notifica pipeline local |
| Tarefa criada | Webhook | Dispara auto-task-creator |
| Campo customizado atualizado | Webhook | Sincroniza status |

## Scripts

### sync-clickup-workflow.mjs

Sincroniza o workflow de produção entre ClickUp e arquivos locais.

```bash
# Vincular site a candidato
node tools/sync-clickup-workflow.mjs --bind --site deputado-01 --candidate CANDIDATO-46

# Prévia (sem alterar nada)
node tools/sync-clickup-workflow.mjs --site deputado-01

# Aplicar mudanças
node tools/sync-clickup-workflow.mjs --site deputado-01 --apply

# Processar todos os sites
node tools/sync-clickup-workflow.mjs --all --apply

# Sincronizar status ClickUp → local
node tools/sync-clickup-workflow.mjs --sync-status --all

# Sincronizar status local → ClickUp
node tools/sync-clickup-workflow.mjs --sync-status --all --to-clickup
```

**Flags:**
- `--bind` — Vincula site.toml ao candidato do ClickUp
- `--site <slug>` — Processa site específico
- `--all` — Processa todos os sites
- `--apply` — Aplica mudanças (sem isso, mostra prévia)
- `--sync-status` — Modo de sincronização de status
- `--to-clickup` — Direção: local → ClickUp (padrão é ClickUp → local)

### auto-task-creator.mjs

Cria tarefas automaticamente quando novos candidatos são adicionados.

```bash
# Criar workflow para todos os candidatos sem workflow
node tools/auto-task-creator.mjs --all

# Criar para candidato específico
node tools/auto-task-creator.mjs --candidate CANDIDATO-46

# Prévia
node tools/auto-task-creator.mjs --all --dry-run
```

**Tarefas criadas por candidato:**
1. `[Workflow] Lancamento digital — {nome}` (pai)
2. `[Jingle] Aprovar letra — {nome}`
3. `[Jingle] Gerar audio ElevenLabs — {nome}`
4. `[Intro] Renderizar video Remotion — {nome}`
5. `[Site] Sincronizar e publicar assets — {nome}`

### pipeline-orchestrator.mjs

Orquestra todo o pipeline de produção.

```bash
# Pipeline completo para um candidato
node tools/pipeline-orchestrator.mjs --candidate deputado-01

# Pipeline para todos
node tools/pipeline-orchestrator.mjs --all

# Prévia
node tools/pipeline-orchestrator.mjs --candidate deputado-01 --dry-run

# Começar de um estágio específico
node tools/pipeline-orchestrator.mjs --candidate deputado-01 --stage jingle
```

**Estágios do pipeline:**
1. `validate_lyrics` — Verifica se a letra existe e é válida
2. `generate_jingle` — Gera áudio via ElevenLabs
3. `render_intro` — Renderiza vídeo via Remotion
4. `sync_assets` — Sincroniza assets para o site
5. `deploy_site` — Faz deploy para Cloudflare Pages
6. `update_clickup` — Atualiza status no ClickUp

### upload-clickup.mjs

Faz upload de vídeos renderizados para o ClickUp.

```bash
# Upload com atualização de status
node tools/upload-clickup.mjs --update-status

# Upload com comentário
node tools/upload-clickup.mjs --add-comment

# Prévia
node tools/upload-clickup.mjs --dry-run
```

## Campos Customizados

### Cadastro de Deputados (901715749173)

| Campo | ID | Tipo | Uso |
|-------|----|------|-----|
| Candidato | fc7d6c54-bf34-4411-ae94-43bad0912aca | tasks | Link entre listas |
| Status do Site | 8ec5139c-8506-495f-8ad5-36357e881c05 | drop_down | Status do site |

### Status do Site (opções)

| Status | Valor Local | Descrição |
|--------|-------------|-----------|
| Não iniciado | not_started | Site não começou |
| Domínio pendente | domain_pending | Aguardando domínio |
| Em desenvolvimento | in_development | Em construção |
| No ar | live | Site publicado |
| Precisa ajustes | needs_adjustments | Necessita correções |

### Conteúdo & Mídia (901715749176)

| Campo | ID | Tipo | Uso |
|-------|----|------|-----|
| Deputado | — | drop_down | Vincula tarefa ao candidato |
| Tipo de Conteúdo | — | drop_down | Tipo de produção |
| Plataforma | — | labels | Onde publicar |
| Gerado por IA | — | checkbox | Rastreia automação |

## Fluxos de Automação

### 1. Novo Candidato Adicionado

```
Cadastro de Deputados (novo candidato)
    ↓ webhook: taskCreated
auto-task-creator.mjs
    ↓ cria tarefas em Conteúdo & Mídia
Workflow completo criado com dependências
```

### 2. Letra Aprovada

```
Tarefa "Aprovar letra" → Status: Concluído
    ↓ webhook: taskStatusUpdated
pipeline-orchestrator.mjs --stage jingle
    ↓ gera jingle via ElevenLabs
    ↓ atualiza status para "Jingle OK"
```

### 3. Intro Renderizada

```
Tarefa "Renderizar intro" → Status: Concluído
    ↓ webhook: taskStatusUpdated
upload-clickup.mjs
    ↓ upload do MP4
    ↓ adiciona comentário com detalhes
    ↓ atualiza "Status do Site" → "Em desenvolvimento"
```

### 4. Site Publicado

```
Deploy concluído
    ↓ manual ou webhook
sync-clickup-workflow.mjs --sync-status --to-clickup
    ↓ atualiza "Status do Site" → "No ar"
    ↓ atualiza site.toml local
```

## Troubleshooting

### Problemas Comuns

#### "Token inválido"
```bash
# Verificar se o token está definido
echo $CLICKUP_TOKEN

# Testar conexão
curl -H "Authorization: $CLICKUP_TOKEN" https://api.clickup.com/api/v2/team
```

#### "Webhook não recebe eventos"
1. Verifique se o Worker está rodando: `wrangler tail`
2. Verifique o URL no ClickUp Settings → Webhooks
3. Teste com um evento manual no ClickUp
4. Verifique os logs do Worker

#### "Status não sincroniza"
```bash
# Verificar status local
cat sites/deputado-01/site.toml | grep site_status

# Forçar sincronização
node tools/sync-clickup-workflow.mjs --sync-status --site deputado-01 --apply
```

#### "Tarefas duplicadas"
O `sync-clickup-workflow.mjs` é idempotente — usa marcadores para detectar tarefas existentes. Se houver duplicatas:

```bash
# Remover marcadores e recriar
grep -r "campaign-site-workflow" sites/*/site.toml
```

### Debug Mode

Para verbose output, adicione `DEBUG=1`:

```bash
DEBUG=1 node tools/sync-clickup-workflow.mjs --site deputado-01 --apply
```

### Logs do Worker

```bash
cd agents/clickup-webhook-worker
wrangler tail --pretty
```

## Integração com MCP

O projeto usa o MCP ClickUp para acesso direto via agentes AI. Os scripts também podem ser chamados pelo MCP:

```
# Criar tarefa via MCP
clickup_create_task(name="Teste", list_id="901715749173")

# Buscar tarefas
clickup_search(keywords="[Workflow] Lancamento")
```

## Referência Rápida

| Comando | Descrição |
|---------|-----------|
| `--bind --site X --candidate Y` | Vincula site ao candidato |
| `--site X` | Prévia para site específico |
| `--site X --apply` | Aplica workflow |
| `--all --apply` | Aplica para todos |
| `--sync-status --all` | Sync ClickUp → local |
| `--sync-status --all --to-clickup` | Sync local → ClickUp |
| `--candidate X --stage Y` | Pipeline de um estágio |
| `--dry-run` | Sem alterar nada |

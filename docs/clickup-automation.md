# Automacao ClickUp por candidato

Este repositorio usa o ClickUp como fonte operacional e os arquivos em
`sites/deputado-XX/` como fonte de producao. A integracao conecta ambos sem
inferir candidatos por ordem de pasta — cada vinculo e explicito e auditavel.

## Fluxo criado

Para cada candidato vinculado, `remotion-video/tools/sync-clickup-workflow.mjs`
cria um pacote na lista **Conteúdo & Mídia**:

1. **Aprovar letra** — o time escreve e aprova `assets/lyrics/jingle.txt`.
2. **Gerar áudio ElevenLabs** — produz `assets/jingles/jingle.mp3`.
3. **Renderizar vídeo Remotion** — sincroniza os assets e gera a intro MP4.
4. **Sincronizar e publicar assets** — valida e publica o site.

As etapas têm a relação **Candidato** apontando para a tarefa em **Cadastro de
Deputados** e as dependências bloqueantes são:

$$\text{letra} \rightarrow \text{jingle} \rightarrow \text{intro} \rightarrow \text{publicação}$$

Uma tarefa-pai `Workflow — Lançamento digital` agrupa as quatro etapas. Cada
tarefa contém um marcador interno; por isso o sincronizador é idempotente e
executá-lo novamente não cria duplicatas.

## Vincular uma pasta a um candidato

Antes de criar tarefas, vincule o diretório correto à tarefa do ClickUp. Use o
ID normal ou o ID personalizado da tarefa de cadastro:

```text
cd remotion-video
node tools/sync-clickup-workflow.mjs --bind --site deputado-01 --candidate CANDIDATO-46
```

Esse comando grava no `site.toml`:

- `clickup_task_id` — identificador estável da tarefa de cadastro;
- `clickup_url` — link direto para a tarefa;
- `candidate_name` — nome atual no ClickUp.

Ele não escolhe o candidato automaticamente. Isso é intencional: os diretórios
atuais podem ser placeholders, enquanto o cadastro contém candidatos reais.

## Criar e manter o workflow

Com o vínculo salvo, confira a prévia primeiro:

```text
cd remotion-video
npm run clickup:workflow -- --site deputado-01
```

Para materializar as tarefas faltantes e as dependências:

```text
npm run clickup:workflow -- --site deputado-01 --apply
```

Após vincular todos os sites, execute o lote:

```text
node tools/sync-clickup-workflow.mjs --all
node tools/sync-clickup-workflow.mjs --all --apply
```

O script exige `CLICKUP_TOKEN`. O token e `ELEVENLABS_API_KEY` devem ficar
somente no `.env` ignorado pelo Git; não inclua chaves em `site.toml` nem em
descrições de tarefas.

## Execução das tarefas

Quando as tarefas forem liberadas, os operadores executam a cadeia local:

```text
node tools/generate-jingles.mjs --site deputado-01
node tools/sync-assets.mjs
node tools/render-one.mjs deputado-01
node tools/upload-clickup.mjs --data candidatos.sites.json
```

O último passo já anexa as intros à tarefa de cadastro correspondente quando o
arquivo de dados contém `taskId`. Para uma operação completa, mantenha o
vínculo ClickUp no `site.toml` e gere os dados a partir do cadastro antes do
upload.

## Novos scripts de automação

### auto-task-creator.mjs

Cria tarefas de workflow automaticamente para candidatos que ainda não possuem workflow:

```text
cd remotion-video
node tools/auto-task-creator.mjs --all              # Cria workflows faltantes
node tools/auto-task-creator.mjs --all --dry-run    # Prévia sem alterações
node tools/auto-task-creator.mjs --candidate CANDIDATO-46  # Candidato específico
```

### pipeline-orchestrator.mjs

Orquestra todo o pipeline de produção (letra → jingle → intro → deploy):

```text
cd remotion-video
node tools/pipeline-orchestrator.mjs --candidate deputado-01
node tools/pipeline-orchestrator.mjs --all --dry-run
node tools/pipeline-orchestrator.mjs --candidate deputado-01 --stage jingle
```

Estágios: `validate_lyrics`, `generate_jingle`, `render_intro`, `sync_assets`, `deploy_site`, `update_clickup`

### sync-clickup-workflow.mjs (atualizado)

Agora com sincronização bidirecional de status:

```text
cd remotion-video
node tools/sync-clickup-workflow.mjs --sync-status --all              # ClickUp → local
node tools/sync-clickup-workflow.mjs --sync-status --all --to-clickup  # local → ClickUp
```

### upload-clickup.mjs (atualizado)

Agora com atualização de status e comentários:

```text
cd remotion-video
node tools/upload-clickup.mjs --update-status --add-comment  # Upload completo
node tools/upload-clickup.mjs --dry-run                       # Prévia
```

## Webhook Worker

O Cloudflare Worker em `agents/clickup-webhook-worker/` recebe webhooks do ClickUp e dispara automações:

```text
cd agents/clickup-webhook-worker
npm install
wrangler deploy
```

Configure o webhook no ClickUp:
1. Settings → Apps → Webhooks
2. URL: `https://seu-worker.seu-subdomain.workers.dev/webhook`
3. Events: `taskCreated`, `taskUpdated`, `taskStatusUpdated`

## Visões e automações recomendadas no ClickUp

- Filtrar **Conteúdo & Mídia** por `Candidato` para ver cada esteira.
- Criar uma view bloqueada por dependências para identificar o gargalo entre
  letra, jingle, intro e publicação.
- Atualizar a tarefa de **Sites dos Candidatos** relacionada quando a etapa de
  publicação estiver concluída: `Foto tratada OK`, `Logomarca OK`, `Vídeo OK`,
  `Status do deploy Cloudflare` e `URL do site`.
- Manter revisão jurídica humana antes da etapa de geração/publicação. O
  conteúdo automatizado é rascunho de produção e deve cumprir a legislação
  eleitoral aplicável.
- Usar `--sync-status` para manter campos `Status do Site` sincronizados entre
  ClickUp e arquivos locais (`site.toml`).
#!/usr/bin/env node
/**
 * Materializa no ClickUp o fluxo de producao por candidato:
 *
 * aprovar letra -> gerar jingle (ElevenLabs) -> renderizar intro (Remotion)
 *                -> sincronizar/publicar assets do site
 *
 * O vinculo e deliberadamente explicito: cada sites/deputado-XX/site.toml
 * precisa ter clickup_task_id. Isso evita associar um candidato real a uma
 * pasta placeholder apenas por ordem alfabetica.
 *
 * SINCRONIZACAO BIDIRECIONAL:
 *   - Sincroniza status do ClickUp para arquivos locais
 *   - Sincroniza status de arquivos locais para ClickUp
 *   - Atualiza campos customizados automaticamente
 *
 * Uso:
 *   node tools/sync-clickup-workflow.mjs --bind --site deputado-01 --candidate CANDIDATO-46
 *   node tools/sync-clickup-workflow.mjs --site deputado-01
 *   node tools/sync-clickup-workflow.mjs --site deputado-01 --apply
 *   node tools/sync-clickup-workflow.mjs --all --apply
 *   node tools/sync-clickup-workflow.mjs --sync-status --all        # Sincronizar status
 *   node tools/sync-clickup-workflow.mjs --sync-status --site deputado-01
 */
import fs from "node:fs";
import path from "node:path";

const API_ROOT = "https://api.clickup.com/api/v2";
const CANDIDATES_LIST_ID = "901715749173";
const CONTENT_LIST_ID = "901715749176";
const SITES_LIST_ID = "901716074162";
const CANDIDATE_RELATION_FIELD_ID = "fc7d6c54-bf34-4411-ae94-43bad0912aca";
const STATUS_DO_SITE_FIELD_ID = "8ec5139c-8506-495f-8ad5-36357e881c05";
const SITES_ROOT = path.join("..", "sites");
const MARKER_PREFIX = "campaign-site-workflow";

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] || null;
};

const apply = has("--apply");
const bind = has("--bind");
const all = has("--all");
const syncStatus = has("--sync-status");
const selectedSite = valueAfter("--site");
const candidateReference = valueAfter("--candidate");
const token = process.env.CLICKUP_TOKEN;

// Status mapping between ClickUp and local files
const STATUS_MAP = {
  "Não iniciado": "not_started",
  "Domínio pendente": "domain_pending",
  "Em desenvolvimento": "in_development",
  "No ar": "live",
  "Precisa ajustes": "needs_adjustments",
};

const STATUS_MAP_REVERSE = Object.fromEntries(
  Object.entries(STATUS_MAP).map(([k, v]) => [v, k])
);

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function usage() {
  console.log(`
Uso:
  node tools/sync-clickup-workflow.mjs --bind --site deputado-01 --candidate CANDIDATO-46
  node tools/sync-clickup-workflow.mjs --site deputado-01 [--apply]
  node tools/sync-clickup-workflow.mjs --all [--apply]
  node tools/sync-clickup-workflow.mjs --sync-status --all        # Sincronizar status ClickUp -> local
  node tools/sync-clickup-workflow.mjs --sync-status --site deputado-01
  node tools/sync-clickup-workflow.mjs --sync-status --all --to-clickup  # Sincronizar status local -> ClickUp

Sem --apply o comando apenas mostra a prévia. Veja docs/clickup-automation.md.
`);
}

if ((!selectedSite && !all) || (selectedSite && all) || (bind && !candidateReference)) {
  usage();
  process.exit(1);
}
if (!token) fail("Defina CLICKUP_TOKEN no ambiente antes de sincronizar o ClickUp.");

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_ROOT}${endpoint}`, {
    ...options,
    headers: {
      Authorization: token,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(`ClickUp ${response.status}: ${text.slice(0, 500)}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function siteDirectory(slug) {
  const dir = path.join(SITES_ROOT, slug);
  if (!fs.existsSync(path.join(dir, "site.toml"))) {
    fail(`Nao encontrei ${path.join(dir, "site.toml")}.`);
  }
  return dir;
}

function readTomlValue(text, key) {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*[\"']([^\"']*)[\"']\\s*$`, "m"));
  return match?.[1] ?? "";
}

function setTomlValue(text, key, value) {
  const line = `${key} = ${JSON.stringify(value)}`;
  const pattern = new RegExp(`^${key}\\s*=.*$`, "m");
  return pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`;
}

function workflowMarker(candidateTaskId, stage) {
  return `<!-- ${MARKER_PREFIX}:candidate=${candidateTaskId};stage=${stage} -->`;
}

// ============================================================================
// BIDIRECTIONAL STATUS SYNC
// ============================================================================

/**
 * Read local site status from site.toml
 * Returns the current status as a string key
 */
function readLocalStatus(slug) {
  const file = path.join(SITES_ROOT, slug, "site.toml");
  if (!fs.existsSync(file)) return null;
  const toml = fs.readFileSync(file, "utf8");
  return readTomlValue(toml, "site_status") || "not_started";
}

/**
 * Write local site status to site.toml
 */
function writeLocalStatus(slug, status) {
  const file = path.join(SITES_ROOT, slug, "site.toml");
  if (!fs.existsSync(file)) return;
  const toml = fs.readFileSync(file, "utf8");
  const updated = setTomlValue(toml, "site_status", status);
  fs.writeFileSync(file, updated);
}

/**
 * Get ClickUp task status for the site task
 */
async function getClickUpSiteStatus(candidateTaskId) {
  try {
    const task = await request(
      `/task/${encodeURIComponent(candidateTaskId)}?custom_task_ids=true&team_id=90171438905`
    );
    
    // Find the Status do Site field
    for (const field of task.custom_fields || []) {
      if (field.id === STATUS_DO_SITE_FIELD_ID) {
        if (field.value != null && field.type_config?.options) {
          return field.type_config.options[field.value]?.name || null;
        }
      }
    }
    return null;
  } catch (error) {
    console.error(`    ⚠️ Erro ao buscar status do ClickUp: ${error.message}`);
    return null;
  }
}

/**
 * Update ClickUp task status
 */
async function setClickUpSiteStatus(candidateTaskId, statusName) {
  const statusValue = STATUS_MAP[statusName] || statusName;
  const localStatus = STATUS_MAP_REVERSE[statusValue] || statusName;
  
  try {
    // Get the field option ID for this status
    const task = await request(
      `/task/${encodeURIComponent(candidateTaskId)}?custom_task_ids=true&team_id=90171438905`
    );
    
    let optionId = null;
    for (const field of task.custom_fields || []) {
      if (field.id === STATUS_DO_SITE_FIELD_ID) {
        for (const option of field.type_config?.options || []) {
          if (option.name === statusName || option.name === localStatus) {
            optionId = option.orderindex;
            break;
          }
        }
        break;
      }
    }
    
    if (optionId == null) {
      console.log(`    ⚠️ Opção de status não encontrada: ${statusName}`);
      return false;
    }
    
    await request(`/task/${encodeURIComponent(candidateTaskId)}/field/${STATUS_DO_SITE_FIELD_ID}`, {
      method: "POST",
      body: JSON.stringify({ value: optionId }),
    });
    
    return true;
  } catch (error) {
    console.error(`    ⚠️ Erro ao atualizar status: ${error.message}`);
    return false;
  }
}

/**
 * Sync status FROM ClickUp TO local files
 */
async function syncStatusFromClickUp(slug) {
  const file = path.join(SITES_ROOT, slug, "site.toml");
  if (!fs.existsSync(file)) {
    console.log(`⏭️  ${slug}: site.toml não encontrado`);
    return;
  }
  
  const toml = fs.readFileSync(file, "utf8");
  const candidateTaskId = readTomlValue(toml, "clickup_task_id");
  
  if (!candidateTaskId) {
    console.log(`⏭️  ${slug}: sem clickup_task_id`);
    return;
  }
  
  const clickUpStatus = await getClickUpSiteStatus(candidateTaskId);
  if (!clickUpStatus) {
    console.log(`  ℹ️  ${slug}: sem status no ClickUp`);
    return;
  }
  
  const localStatus = readLocalStatus(slug);
  const localStatusName = STATUS_MAP_REVERSE[localStatus] || localStatus;
  
  if (localStatusName === clickUpStatus) {
    console.log(`  ✓ ${slug}: status já sincronizado (${clickUpStatus})`);
    return;
  }
  
  console.log(`  🔄 ${slug}: ClickUp "${clickUpStatus}" → local "${localStatusName}"`);
  
  if (apply) {
    writeLocalStatus(slug, STATUS_MAP[clickUpStatus] || clickUpStatus);
    console.log(`    ↳ Atualizado localmente`);
  }
}

/**
 * Sync status FROM local files TO ClickUp
 */
async function syncStatusToClickUp(slug) {
  const file = path.join(SITES_ROOT, slug, "site.toml");
  if (!fs.existsSync(file)) {
    console.log(`⏭️  ${slug}: site.toml não encontrado`);
    return;
  }
  
  const toml = fs.readFileSync(file, "utf8");
  const candidateTaskId = readTomlValue(toml, "clickup_task_id");
  
  if (!candidateTaskId) {
    console.log(`⏭️  ${slug}: sem clickup_task_id`);
    return;
  }
  
  const localStatus = readLocalStatus(slug);
  const localStatusName = STATUS_MAP_REVERSE[localStatus] || "Não iniciado";
  
  const clickUpStatus = await getClickUpSiteStatus(candidateTaskId);
  
  if (localStatusName === clickUpStatus) {
    console.log(`  ✓ ${slug}: status já sincronizado (${localStatusName})`);
    return;
  }
  
  console.log(`  🔄 ${slug}: local "${localStatusName}" → ClickUp "${clickUpStatus || 'N/A'}"`);
  
  if (apply) {
    const success = await setClickUpSiteStatus(candidateTaskId, localStatusName);
    if (success) {
      console.log(`    ↳ Atualizado no ClickUp`);
    }
  }
}

/**
 * Check if all workflow tasks for a candidate are complete
 * and auto-update the site status if needed
 */
async function checkAndAutoUpdateStatus(slug) {
  const file = path.join(SITES_ROOT, slug, "site.toml");
  if (!fs.existsSync(file)) return;
  
  const toml = fs.readFileSync(file, "utf8");
  const candidateTaskId = readTomlValue(toml, "clickup_task_id");
  
  if (!candidateTaskId) return;
  
  const contentTasks = await listContentTasks();
  const workflowStages = ["lyrics", "jingle", "intro", "publish"];
  let allComplete = true;
  
  for (const stage of workflowStages) {
    const marker = workflowMarker(candidateTaskId, stage);
    const task = contentTasks.find(t => t.description?.includes(marker));
    
    if (!task || task.status?.status !== "closed") {
      allComplete = false;
      break;
    }
  }
  
  if (allComplete) {
    const localStatus = readLocalStatus(slug);
    if (localStatus !== "live") {
      console.log(`  🎉 ${slug}: todas as tarefas do workflow concluídas!`);
      if (apply) {
        writeLocalStatus(slug, "live");
        await setClickUpSiteStatus(candidateTaskId, "No ar");
        console.log(`    ↳ Status atualizado para "live"`);
      }
    }
  }
}

function workflowTasks(candidate, slug) {
  const context = `Candidato: [${candidate.name}](${candidate.url})\n\n`;
  return [
    {
      stage: "parent",
      name: `[Workflow] Lancamento digital — ${candidate.name}`,
      description: `${workflowMarker(candidate.id, "parent")}\n${context}Acompanhe este pacote de producao. As subtarefas mantem a cadeia de entrega e nao devem ser movidas para outro candidato.`,
    },
    {
      stage: "lyrics",
      name: `[Jingle] Aprovar letra — ${candidate.name}`,
      description: `${workflowMarker(candidate.id, "lyrics")}\n${context}Responsavel: Conteudo & Midia.\n\n1. Escreva e aprove a letra em \`sites/${slug}/assets/lyrics/jingle.txt\`.\n2. Confirme aderencia juridica e de marca antes de concluir.`,
    },
    {
      stage: "jingle",
      name: `[Jingle] Gerar audio ElevenLabs — ${candidate.name}`,
      description: `${workflowMarker(candidate.id, "jingle")}\n${context}Execute \`node tools/generate-jingles.mjs --site ${slug}\` dentro de \`remotion-video/\`.\n\nResultado esperado: \`sites/${slug}/assets/jingles/jingle.mp3\`.`,
    },
    {
      stage: "intro",
      name: `[Intro] Renderizar video Remotion — ${candidate.name}`,
      description: `${workflowMarker(candidate.id, "intro")}\n${context}Execute \`node tools/sync-assets.mjs\` e depois \`node tools/render-one.mjs ${slug}\` dentro de \`remotion-video/\`.\n\nAnexe o MP4 final a esta tarefa e preserve o selo de conteudo produzido com IA.`,
    },
    {
      stage: "publish",
      name: `[Site] Sincronizar e publicar assets — ${candidate.name}`,
      description: `${workflowMarker(candidate.id, "publish")}\n${context}Valide foto, logo, jingle e intro. Em seguida, gere/sincronize o site e atualize a tarefa de site relacionada com a URL do deploy.`,
    },
  ];
}

async function getCandidate(reference) {
  const task = await request(
    `/task/${encodeURIComponent(reference)}?custom_task_ids=true&team_id=90171438905`
  );
  if (task.list?.id !== CANDIDATES_LIST_ID) {
    fail(`A tarefa ${reference} nao pertence a lista Cadastro de Deputados.`);
  }
  return task;
}

async function listContentTasks() {
  const tasks = [];
  let page = 0;
  while (true) {
    const data = await request(`/list/${CONTENT_LIST_ID}/task?include_closed=true&subtasks=true&page=${page}`);
    tasks.push(...(data.tasks ?? []));
    if (data.last_page || !(data.tasks ?? []).length) return tasks;
    page += 1;
  }
}

function findExistingTask(tasks, candidateTaskId, stage) {
  const marker = workflowMarker(candidateTaskId, stage);
  return tasks.find((task) => task.description?.includes(marker));
}

async function createTask(definition, candidateTaskId, parentId) {
  return request(`/list/${CONTENT_LIST_ID}/task`, {
    method: "POST",
    body: JSON.stringify({
      name: definition.name,
      markdown_description: definition.description,
      priority: "normal",
      ...(parentId ? { parent: parentId } : {}),
      custom_fields: [
        {
          id: CANDIDATE_RELATION_FIELD_ID,
          value: JSON.stringify({ add: [candidateTaskId], rem: [] }),
        },
      ],
    }),
  });
}

async function ensureDependency(taskId, dependsOn) {
  try {
    await request(`/task/${taskId}/dependency`, {
      method: "POST",
      body: JSON.stringify({ depends_on: dependsOn }),
    });
    console.log(`    ↳ dependencia criada: ${taskId} aguarda ${dependsOn}`);
  } catch (error) {
    if (error.status === 400 || error.status === 409) {
      console.log(`    ↳ dependencia ja existe: ${taskId} aguarda ${dependsOn}`);
      return;
    }
    throw error;
  }
}

async function bindSite(slug) {
  const dir = siteDirectory(slug);
  const candidate = await getCandidate(candidateReference);
  const file = path.join(dir, "site.toml");
  let text = fs.readFileSync(file, "utf8");
  text = setTomlValue(text, "clickup_task_id", candidate.id);
  text = setTomlValue(text, "clickup_url", candidate.url);
  text = setTomlValue(text, "candidate_name", candidate.name);
  fs.writeFileSync(file, text);
  console.log(`✅ ${slug} vinculado a ${candidate.name} (${candidate.custom_id || candidate.id}).`);
}

async function syncSite(slug, contentTasks) {
  const file = path.join(siteDirectory(slug), "site.toml");
  const toml = fs.readFileSync(file, "utf8");
  const candidateTaskId = readTomlValue(toml, "clickup_task_id");
  if (!candidateTaskId) {
    console.log(`⏭️  ${slug}: sem clickup_task_id; vincule primeiro com --bind.`);
    return;
  }

  const candidate = await getCandidate(candidateTaskId);
  const definitions = workflowTasks(candidate, slug);
  console.log(`\n${apply ? "🔄" : "👀"} ${slug} → ${candidate.name}`);
  const resolved = new Map();

  for (const definition of definitions) {
    const existing = findExistingTask(contentTasks, candidate.id, definition.stage);
    if (existing) {
      resolved.set(definition.stage, existing);
      console.log(`  = ${definition.stage}: ${existing.id}`);
      continue;
    }

    if (!apply) {
      console.log(`  + ${definition.stage}: ${definition.name}`);
      continue;
    }

    const parentId = definition.stage === "parent" ? null : resolved.get("parent")?.id;
    if (definition.stage !== "parent" && !parentId) {
      throw new Error("Nao foi possivel determinar a tarefa pai do workflow.");
    }
    const created = await createTask(definition, candidate.id, parentId);
    contentTasks.push(created);
    resolved.set(definition.stage, created);
    console.log(`  + ${definition.stage}: ${created.id}`);
  }

  if (!apply) return;
  await ensureDependency(resolved.get("jingle").id, resolved.get("lyrics").id);
  await ensureDependency(resolved.get("intro").id, resolved.get("jingle").id);
  await ensureDependency(resolved.get("publish").id, resolved.get("intro").id);
}

async function main() {
  if (bind) {
    await bindSite(selectedSite);
    return;
  }

  const targets = all
    ? fs
        .readdirSync(SITES_ROOT, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^deputado-\d+$/.test(entry.name))
        .map((entry) => entry.name)
        .sort()
    : [selectedSite];

  // Status sync mode
  if (syncStatus) {
    const toClickUp = has("--to-clickup");
    console.log(`\n🔄 Sincronizando status ${toClickUp ? "local → ClickUp" : "ClickUp → local"} para ${targets.length} site(s).\n`);
    
    for (const slug of targets) {
      try {
        if (toClickUp) {
          await syncStatusToClickUp(slug);
        } else {
          await syncStatusFromClickUp(slug);
        }
        // Also check if workflow is complete and auto-update status
        await checkAndAutoUpdateStatus(slug);
      } catch (error) {
        console.error(`  ❌ ${slug}: ${error.message}`);
      }
    }
    
    console.log(apply ? "\n✅ Status sincronizado." : "\nPrévia concluída. Rode novamente com --apply para aplicar.");
    return;
  }

  const contentTasks = await listContentTasks();
  console.log(`${apply ? "Aplicando" : "Previa"} para ${targets.length} site(s).`);
  for (const slug of targets) await syncSite(slug, contentTasks);
  console.log(apply ? "\n✅ Workflow sincronizado." : "\nPrévia concluida. Rode novamente com --apply para criar o que falta.");
}

main().catch((error) => fail(error.message));
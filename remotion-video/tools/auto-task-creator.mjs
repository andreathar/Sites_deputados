#!/usr/bin/env node
/**
 * auto-task-creator.mjs — Cria tarefas de workflow automaticamente para novos candidatos.
 *
 * Monitora a lista "Cadastro de Deputados" no ClickUp e cria tarefas
 * de workflow na lista "Conteúdo & Mídia" para cada candidato que ainda
 * não possui um workflow.
 *
 * Uso:
 *   node tools/auto-task-creator.mjs --all                    # Cria workflows faltantes
 *   node tools/auto-task-creator.mjs --candidate CANDIDATO-46  # Para candidato específico
 *   node tools/auto-task-creator.mjs --all --dry-run           # Prévia sem alterações
 *   node tools/auto-task-creator.mjs --all --apply             # Aplica mudanças
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

// Load .env from project root (../../ relative to tools/)
const __dirname = path.dirname(new URL(import.meta.url).pathname);
config({ path: path.join(__dirname, "..", "..", ".env") });

const API_ROOT = "https://api.clickup.com/api/v2";
const CANDIDATES_LIST_ID = "901715749173";
const CONTENT_LIST_ID = "901715749176";
const SITES_LIST_ID = "901716074162";
const CANDIDATE_RELATION_FIELD_ID = "fc7d6c54-bf34-4411-ae94-43bad0912aca";
const SITES_ROOT = path.join("..", "sites");
const MARKER_PREFIX = "campaign-site-workflow";

// CLI parsing
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] || null;
};

const apply = has("--apply");
const dryRun = has("--dry-run");
const all = has("--all");
const candidateRef = valueAfter("--candidate");
const token = process.env.CLICKUP_TOKEN;

if (!token) {
  console.error("❌ Defina CLICKUP_TOKEN no ambiente.");
  process.exit(1);
}

if (!all && !candidateRef) {
  console.log(`
Uso:
  node tools/auto-task-creator.mjs --all [--apply] [--dry-run]
  node tools/auto-task-creator.mjs --candidate CANDIDATO-46 [--apply] [--dry-run]

Cria tarefas de workflow para candidatos que ainda não possuem workflow.
`);
  process.exit(1);
}

// ============================================================================
// ClickUp API helpers
// ============================================================================

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

// ============================================================================
// Data fetching
// ============================================================================

async function getAllTasks(listId, includeClosed = false) {
  const tasks = [];
  let page = 0;
  while (true) {
    const data = await request(
      `/list/${listId}/task?include_closed=${includeClosed}&subtasks=false&page=${page}`
    );
    tasks.push(...(data.tasks ?? []));
    if (data.last_page || !(data.tasks ?? []).length) return tasks;
    page += 1;
  }
}

async function getCandidateTask(reference) {
  return request(
    `/task/${encodeURIComponent(reference)}?custom_task_ids=true&team_id=90171438905`
  );
}

// ============================================================================
// Workflow task definitions (same as sync-clickup-workflow.mjs)
// ============================================================================

function workflowMarker(candidateTaskId, stage) {
  return `<!-- ${MARKER_PREFIX}:candidate=${candidateTaskId};stage=${stage} -->`;
}

function buildWorkflowTasks(candidate, slug) {
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

// ============================================================================
// Task creation
// ============================================================================

function findExistingTask(contentTasks, candidateTaskId, stage) {
  const marker = workflowMarker(candidateTaskId, stage);
  return contentTasks.find((task) => task.description?.includes(marker));
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

// ============================================================================
// Site slug resolution
// ============================================================================

function findSiteSlug(candidateName) {
  // Try to match by site.toml candidate_name
  if (fs.existsSync(SITES_ROOT)) {
    const dirs = fs.readdirSync(SITES_ROOT, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const tomlPath = path.join(SITES_ROOT, d.name, "site.toml");
      if (fs.existsSync(tomlPath)) {
        const toml = fs.readFileSync(tomlPath, "utf8");
        const match = toml.match(/candidate_name\s*=\s*"([^"]+)"/);
        if (match && match[1] === candidateName) {
          return d.name;
        }
      }
    }
  }
  return null;
}

// ============================================================================
// Main logic
// ============================================================================

async function processCandidate(candidate, contentTasks) {
  const slug = findSiteSlug(candidate.name) || candidate.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  console.log(`\n${dryRun ? "👀" : "🔄"} ${candidate.name} (${slug})`);

  // Check if workflow already exists
  const existingParent = findExistingTask(contentTasks, candidate.id, "parent");
  if (existingParent) {
    console.log(`  ✓ Workflow já existe (${existingParent.id})`);
    return { status: "exists", slug, candidate: candidate.name };
  }

  const definitions = buildWorkflowTasks(candidate, slug);

  if (dryRun) {
    console.log(`  + Criaria ${definitions.length} tarefas de workflow`);
    for (const d of definitions) {
      console.log(`    - ${d.stage}: ${d.name}`);
    }
    return { status: "dry-run", slug, candidate: candidate.name };
  }

  // Create tasks
  const resolved = new Map();
  for (const definition of definitions) {
    const parentId = definition.stage === "parent" ? null : resolved.get("parent")?.id;
    if (definition.stage !== "parent" && !parentId) {
      throw new Error("Nao foi possivel determinar a tarefa pai do workflow.");
    }

    const created = await createTask(definition, candidate.id, parentId);
    contentTasks.push(created);
    resolved.set(definition.stage, created);
    console.log(`  + ${definition.stage}: ${created.id}`);
  }

  // Set up dependencies
  await ensureDependency(resolved.get("jingle").id, resolved.get("lyrics").id);
  await ensureDependency(resolved.get("intro").id, resolved.get("jingle").id);
  await ensureDependency(resolved.get("publish").id, resolved.get("intro").id);

  return { status: "created", slug, candidate: candidate.name };
}

async function main() {
  console.log(`${dryRun ? "Prévia" : "Criando"} workflows de candidatos...\n`);

  // Fetch all candidates
  const candidateTasks = await getAllTasks(CANDIDATES_LIST_ID);
  console.log(`${candidateTasks.length} candidato(s) encontrado(s) na lista Cadastro de Deputados.`);

  // Filter to specific candidate if requested
  let candidates = candidateTasks;
  if (candidateRef) {
    const single = await getCandidateTask(candidateRef);
    candidates = [single];
  }

  // Fetch existing content tasks
  const contentTasks = await getAllTasks(CONTENT_LIST_ID, true);
  console.log(`${contentTasks.length} tarefa(s) existente(s) na lista Conteúdo & Mídia.\n`);

  // Process each candidate
  const results = { created: [], exists: [], dryRun: [], errors: [] };
  for (const candidate of candidates) {
    try {
      const result = await processCandidate(candidate, contentTasks);
      if (result.status === "created") results.created.push(result);
      else if (result.status === "exists") results.exists.push(result);
      else if (result.status === "dry-run") results.dryRun.push(result);
    } catch (error) {
      console.error(`  ❌ ${candidate.name}: ${error.message}`);
      results.errors.push({ candidate: candidate.name, error: error.message });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("RESUMO:");
  console.log(`  Criados: ${results.created.length}`);
  console.log(`  Já existiam: ${results.exists.length}`);
  if (dryRun) console.log(`  Prévia: ${results.dryRun.length}`);
  console.log(`  Erros: ${results.errors.length}`);

  if (results.errors.length) {
    console.log("\nErros:");
    for (const e of results.errors) {
      console.log(`  - ${e.candidate}: ${e.error}`);
    }
  }

  if (!apply && !dryRun) {
    console.log("\n💡 Rode com --apply para criar as tarefas.");
  }
}

main().catch((error) => {
  console.error(`\n❌ Erro fatal: ${error.message}`);
  process.exit(1);
});

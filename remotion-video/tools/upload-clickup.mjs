#!/usr/bin/env node
/**
 * upload-clickup.mjs — Upload de vídeos renderizados para o ClickUp.
 *
 * Com sincronização bidirecional de status:
 *   - Após upload bem-sucedido, atualiza "Status do Site" no ClickUp
 *   - Adiciona comentário com detalhes do upload
 *   - Sincroniza status de volta para arquivo local (site.toml)
 *
 * Uso:
 *   node tools/upload-clickup.mjs                           # Upload básico
 *   node tools/upload-clickup.mjs --update-status           # Atualiza status após upload
 *   node tools/upload-clickup.mjs --add-comment             # Adiciona comentário
 *   node tools/upload-clickup.mjs --update-status --add-comment  # Ambos
 *   node tools/upload-clickup.mjs --dry-run                 # Prévia sem upload
 *   node tools/upload-clickup.mjs --data candidatos.json    # Arquivo de dados customizado
 */
import fs from "node:fs";
import path from "node:path";

const API_ROOT = "https://api.clickup.com/api/v2";
const TOKEN = process.env.CLICKUP_TOKEN;
const STATUS_DO_SITE_FIELD_ID = "8ec5139c-8506-495f-8ad5-36357e881c05";
const OUT_DIR = "out";

// CLI parsing
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] || null;
};

const updateStatus = has("--update-status");
const addComment = has("--add-comment");
const dryRun = has("--dry-run");
const dataFile = valueAfter("--data") || "candidatos.json";

if (!TOKEN) {
  console.error("❌ Defina CLICKUP_TOKEN no ambiente.");
  process.exit(1);
}

if (!fs.existsSync(dataFile)) {
  console.error(`❌ Arquivo ${dataFile} não encontrado.`);
  process.exit(1);
}

const candidatos = JSON.parse(fs.readFileSync(dataFile, "utf8"));

// ============================================================================
// ClickUp API helpers
// ============================================================================

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_ROOT}${endpoint}`, {
    ...options,
    headers: {
      Authorization: TOKEN,
      ...(options.body && !options.isFormData ? { "Content-Type": "application/json" } : {}),
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

async function uploadAttachment(taskId, videoPath) {
  const url = `${API_ROOT}/task/${taskId}/attachment`;
  const fileBuffer = fs.readFileSync(videoPath);
  const fileName = path.basename(videoPath);

  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: "video/mp4" });
  formData.append("attachment", blob, fileName);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: TOKEN,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ClickUp API ${res.status}: ${errText}`);
  }

  return res.json();
}

async function addTaskComment(taskId, comment) {
  return apiRequest(`/task/${taskId}/comment`, {
    method: "POST",
    body: JSON.stringify({ comment_text: comment }),
  });
}

async function updateSiteStatus(taskId, statusName) {
  try {
    const task = await apiRequest(
      `/task/${taskId}?custom_task_ids=true&team_id=90171438905`
    );
    
    for (const field of task.custom_fields || []) {
      if (field.id === STATUS_DO_SITE_FIELD_ID) {
        for (const option of field.type_config?.options || []) {
          if (option.name === statusName) {
            await apiRequest(`/task/${taskId}/field/${STATUS_DO_SITE_FIELD_ID}`, {
              method: "POST",
              body: JSON.stringify({ value: option.orderindex }),
            });
            return true;
          }
        }
      }
    }
  } catch (error) {
    console.error(`    ⚠️ Erro ao atualizar status: ${error.message}`);
  }
  return false;
}

// ============================================================================
// Local status sync
// ============================================================================

function readLocalStatus(slug) {
  const tomlPath = path.join("..", "sites", slug, "site.toml");
  if (!fs.existsSync(tomlPath)) return null;
  const toml = fs.readFileSync(tomlPath, "utf8");
  const match = toml.match(/site_status\s*=\s*"([^"]+)"/);
  return match?.[1] || null;
}

function writeLocalStatus(slug, status) {
  const tomlPath = path.join("..", "sites", slug, "site.toml");
  if (!fs.existsSync(tomlPath)) return;
  
  const toml = fs.readFileSync(tomlPath, "utf8");
  const pattern = /site_status\s*=.*$/m;
  const newLine = `site_status = "${status}"`;
  
  const updated = pattern.test(toml) 
    ? toml.replace(pattern, newLine)
    : `${toml.trimEnd()}\n${newLine}\n`;
  
  fs.writeFileSync(tomlPath, updated);
}

// ============================================================================
// Upload logic
// ============================================================================

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function processCandidate(c) {
  const slug = c.slug || slugify(c.nome);
  const videoPath = path.join(OUT_DIR, `intro-${slug}.mp4`);

  if (!c.taskId) {
    console.warn(`⚠️ ${c.nome}: sem taskId do ClickUp. Pulando.`);
    return { status: "skipped", reason: "no_task_id" };
  }

  if (!fs.existsSync(videoPath)) {
    console.warn(`⚠️ ${c.nome}: vídeo ${videoPath} não encontrado. Pulando.`);
    return { status: "skipped", reason: "video_not_found" };
  }

  if (dryRun) {
    console.log(`👀 ${c.nome}: faria upload de ${videoPath}`);
    return { status: "dry-run" };
  }

  try {
    console.log(`📤 ${c.nome}: enviando ${videoPath}...`);
    const startTime = Date.now();
    await uploadAttachment(c.taskId, videoPath);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`  ✅ Upload concluído em ${duration}s`);

    // Update status if requested
    if (updateStatus) {
      console.log(`  🔄 Atualizando status para "Em desenvolvimento"...`);
      await updateSiteStatus(c.taskId, "Em desenvolvimento");
      writeLocalStatus(slug, "in_development");
      console.log(`  ✅ Status atualizado`);
    }

    // Add comment if requested
    if (addComment) {
      const stats = fs.statSync(videoPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      const timestamp = new Date().toISOString();
      
      const comment = [
        `🎬 **Vídeo da intro enviado**`,
        ``,
        `- **Arquivo**: ${path.basename(videoPath)}`,
        `- **Tamanho**: ${sizeMB} MB`,
        `- **Enviado em**: ${timestamp}`,
        ``,
        `> Vídeo gerado automaticamente via Remotion.`,
      ].join("\n");

      await addTaskComment(c.taskId, comment);
      console.log(`  💬 Comentário adicionado`);
    }

    return { status: "uploaded" };
  } catch (error) {
    console.error(`  ❌ Erro ao enviar ${c.nome}: ${error.message}`);
    return { status: "error", error: error.message };
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(`${dryRun ? "👀 Prévia" : "🚀 Upload"} de vídeos para o ClickUp...`);
  console.log(`${candidatos.length} candidato(s) para processar.\n`);

  const results = { uploaded: [], skipped: [], errors: [], dryRun: [] };

  for (const c of candidatos) {
    const result = await processCandidate(c);
    
    if (result.status === "uploaded") results.uploaded.push(c.nome);
    else if (result.status === "skipped") results.skipped.push(c.nome);
    else if (result.status === "dry-run") results.dryRun.push(c.nome);
    else if (result.status === "error") results.errors.push({ nome: c.nome, error: result.error });
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("RESUMO:");
  console.log(`  Enviados: ${results.uploaded.length}`);
  console.log(`  Pulados: ${results.skipped.length}`);
  if (dryRun) console.log(`  Prévia: ${results.dryRun.length}`);
  console.log(`  Erros: ${results.errors.length}`);

  if (results.errors.length) {
    console.log("\nErros:");
    for (const e of results.errors) {
      console.log(`  - ${e.nome}: ${e.error}`);
    }
  }
}

main().catch((error) => {
  console.error(`\n❌ Erro fatal: ${error.message}`);
  process.exit(1);
});

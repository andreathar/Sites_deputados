#!/usr/bin/env node
/**
 * pipeline-orchestrator.mjs — Orquestra todo o pipeline de produção por candidato.
 *
 * Estágios do pipeline:
 *   1. validate_lyrics  — Verifica se a letra existe e é válida
 *   2. generate_jingle  — Gera áudio via ElevenLabs
 *   3. render_intro     — Renderiza vídeo via Remotion
 *   4. sync_assets      — Sincroniza assets para o site
 *   5. deploy_site      — Faz deploy para Cloudflare Pages
 *   6. update_clickup   — Atualiza status no ClickUp
 *
 * Uso:
 *   node tools/pipeline-orchestrator.mjs --candidate deputado-01
 *   node tools/pipeline-orchestrator.mjs --all
 *   node tools/pipeline-orchestrator.mjs --candidate deputado-01 --stage jingle
 *   node tools/pipeline-orchestrator.mjs --candidate deputado-01 --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { config } from "dotenv";

// Load .env from project root (../../ relative to tools/)
const __dirname = path.dirname(new URL(import.meta.url).pathname);
config({ path: path.join(__dirname, "..", "..", ".env") });

const API_ROOT = "https://api.clickup.com/api/v2";
const CANDIDATES_LIST_ID = "901715749173";
const CONTENT_LIST_ID = "901715749176";
const STATUS_DO_SITE_FIELD_ID = "8ec5139c-8506-495f-8ad5-36357e881c05";
const SITES_ROOT = path.join("..", "sites");
const REMOTION_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

// CLI parsing
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] || null;
};

const dryRun = has("--dry-run");
const all = has("--all");
const candidateSlug = valueAfter("--candidate");
const startStage = valueAfter("--stage");
const token = process.env.CLICKUP_TOKEN;

const STAGES = ["validate_lyrics", "generate_jingle", "render_intro", "sync_assets", "deploy_site", "update_clickup"];

if (!token) {
  console.error("❌ Defina CLICKUP_TOKEN no ambiente.");
  process.exit(1);
}

if (!all && !candidateSlug) {
  console.log(`
Uso:
  node tools/pipeline-orchestrator.mjs --candidate deputado-01 [--stage <stage>] [--dry-run]
  node tools/pipeline-orchestrator.mjs --all [--dry-run]

Estágios: ${STAGES.join(", ")}
`);
  process.exit(1);
}

// ============================================================================
// ClickUp API
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

async function updateTaskStatus(taskId, statusName) {
  try {
    const task = await request(`/task/${taskId}?custom_task_ids=true&team_id=90171438905`);
    for (const field of task.custom_fields || []) {
      if (field.id === STATUS_DO_SITE_FIELD_ID) {
        for (const option of field.type_config?.options || []) {
          if (option.name === statusName) {
            await request(`/task/${taskId}/field/${STATUS_DO_SITE_FIELD_ID}`, {
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
// Pipeline stages
// ============================================================================

class PipelineContext {
  constructor(slug) {
    this.slug = slug;
    this.siteDir = path.join(SITES_ROOT, slug);
    this.tomlPath = path.join(this.siteDir, "site.toml");
    this.results = {};
    this.startTime = Date.now();
  }

  get toml() {
    return fs.existsSync(this.tomlPath) ? fs.readFileSync(this.tomlPath, "utf8") : null;
  }

  log(stage, message) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`  [${elapsed}s] ${stage}: ${message}`);
  }

  async updateClickUpStatus(status) {
    const toml = this.toml;
    if (!toml) return;
    const match = toml.match(/clickup_task_id\s*=\s*"([^"]+)"/);
    if (!match) return;
    
    if (!dryRun) {
      await updateTaskStatus(match[1], status);
    }
    this.log("clickup", `Status → ${status}`);
  }
}

// Stage implementations

async function validateLyrics(ctx) {
  const lyricsPath = path.join(ctx.siteDir, "assets", "lyrics", "jingle.txt");
  
  if (!fs.existsSync(lyricsPath)) {
    ctx.log("lyrics", "❌ Arquivo de letra não encontrado");
    return { success: false, error: "lyrics_not_found" };
  }

  const content = fs.readFileSync(lyricsPath, "utf8").trim();
  if (content.length < 20) {
    ctx.log("lyrics", "❌ Letra muito curta (mínimo 20 caracteres)");
    return { success: false, error: "lyrics_too_short" };
  }

  if (content.length > 500) {
    ctx.log("lyrics", "⚠️ Letra muito longa (máximo 500 caracteres)");
  }

  ctx.log("lyrics", `✅ Letra válida (${content.length} caracteres)`);
  return { success: true };
}

async function generateJingle(ctx) {
  const jinglePath = path.join(ctx.siteDir, "assets", "jingles", "jingle.mp3");
  
  if (fs.existsSync(jinglePath)) {
    ctx.log("jingle", "✅ Jingle já existe");
    return { success: true, skipped: true };
  }

  const lyricsPath = path.join(ctx.siteDir, "assets", "lyrics", "jingle.txt");
  if (!fs.existsSync(lyricsPath)) {
    ctx.log("jingle", "❌ Letra não encontrada");
    return { success: false, error: "lyrics_not_found" };
  }

  if (dryRun) {
    ctx.log("jingle", "👀 Geraria jingle via ElevenLabs");
    return { success: true, dryRun: true };
  }

  try {
    ctx.log("jingle", "🎵 Gerando jingle via ElevenLabs...");
    execSync(`node tools/generate-jingles.mjs --site ${ctx.slug}`, {
      cwd: REMOTION_DIR,
      stdio: "inherit",
    });
    ctx.log("jingle", "✅ Jingle gerado");
    return { success: true };
  } catch (error) {
    ctx.log("jingle", `❌ Erro ao gerar jingle: ${error.message}`);
    return { success: false, error: "jingle_generation_failed" };
  }
}

async function renderIntro(ctx) {
  const videoPath = path.join(ctx.siteDir, "assets", "videos", "intro.mp4");
  
  if (fs.existsSync(videoPath)) {
    ctx.log("intro", "✅ Intro já existe");
    return { success: true, skipped: true };
  }

  if (dryRun) {
    ctx.log("intro", "👀 Renderizaria intro via Remotion");
    return { success: true, dryRun: true };
  }

  try {
    ctx.log("intro", "🎬 Renderizando intro via Remotion...");
    
    // Sync assets first
    execSync("node tools/sync-assets.mjs", {
      cwd: REMOTION_DIR,
      stdio: "inherit",
    });
    
    // Render
    execSync(`node tools/render-one.mjs ${ctx.slug}`, {
      cwd: REMOTION_DIR,
      stdio: "inherit",
    });
    
    ctx.log("intro", "✅ Intro renderizada");
    return { success: true };
  } catch (error) {
    ctx.log("intro", `❌ Erro ao renderizar intro: ${error.message}`);
    return { success: false, error: "intro_render_failed" };
  }
}

async function syncAssets(ctx) {
  const assetsDir = path.join(ctx.siteDir, "assets");
  const publicDir = path.join(ctx.siteDir, "public");
  
  if (!fs.existsSync(assetsDir)) {
    ctx.log("sync", "⚠️ Diretório assets não encontrado");
    return { success: true, skipped: true };
  }

  if (dryRun) {
    ctx.log("sync", "👀 Sincronizaria assets");
    return { success: true, dryRun: true };
  }

  try {
    ctx.log("sync", "📦 Sincronizando assets...");
    execSync("node tools/sync-assets.mjs", {
      cwd: REMOTION_DIR,
      stdio: "inherit",
    });
    ctx.log("sync", "✅ Assets sincronizados");
    return { success: true };
  } catch (error) {
    ctx.log("sync", `❌ Erro ao sincronizar: ${error.message}`);
    return { success: false, error: "sync_failed" };
  }
}

async function deploySite(ctx) {
  const pkgPath = path.join(ctx.siteDir, "package.json");
  
  if (!fs.existsSync(pkgPath)) {
    ctx.log("deploy", "⚠️ package.json não encontrado");
    return { success: true, skipped: true };
  }

  if (dryRun) {
    ctx.log("deploy", "👀 Faria deploy para Cloudflare Pages");
    return { success: true, dryRun: true };
  }

  try {
    ctx.log("deploy", "🚀 Fazendo deploy...");
    execSync("npm run deploy", {
      cwd: ctx.siteDir,
      stdio: "inherit",
    });
    ctx.log("deploy", "✅ Deploy concluído");
    return { success: true };
  } catch (error) {
    ctx.log("deploy", `❌ Erro no deploy: ${error.message}`);
    return { success: false, error: "deploy_failed" };
  }
}

async function updateClickUp(ctx) {
  if (dryRun) {
    ctx.log("clickup", "👀 Atualizaria status no ClickUp");
    return { success: true, dryRun: true };
  }

  await ctx.updateClickUpStatus("No ar");
  return { success: true };
}

const STAGE_HANDLERS = {
  validate_lyrics: validateLyrics,
  generate_jingle: generateJingle,
  render_intro: renderIntro,
  sync_assets: syncAssets,
  deploy_site: deploySite,
  update_clickup: updateClickUp,
};

// ============================================================================
// Main
// ============================================================================

async function runPipeline(slug) {
  const ctx = new PipelineContext(slug);
  
  if (!fs.existsSync(ctx.tomlPath)) {
    console.log(`⏭️  ${slug}: site.toml não encontrado`);
    return { slug, status: "skipped" };
  }

  console.log(`\n🔄 Pipeline: ${slug}`);

  // Determine start stage
  let startIndex = 0;
  if (startStage) {
    startIndex = STAGES.indexOf(startStage);
    if (startIndex === -1) {
      console.error(`❌ Estágio inválido: ${startStage}`);
      return { slug, status: "error", error: "invalid_stage" };
    }
  }

  // Run stages
  for (let i = startIndex; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const handler = STAGE_HANDLERS[stage];
    
    if (!handler) {
      console.error(`❌ Handler não encontrado: ${stage}`);
      continue;
    }

    const result = await handler(ctx);
    ctx.results[stage] = result;

    if (!result.success && !result.skipped) {
      console.log(`\n❌ Pipeline falhou em ${stage}`);
      return { slug, status: "failed", failedAt: stage, results: ctx.results };
    }
  }

  console.log(`\n✅ Pipeline concluído: ${slug}`);
  return { slug, status: "completed", results: ctx.results };
}

async function main() {
  console.log(`${dryRun ? "👀 Prévia" : "🚀 Executando"} pipeline...\n`);

  let slugs = [];
  if (all) {
    slugs = fs
      .readdirSync(SITES_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^deputado-\d+$/.test(d.name))
      .map((d) => d.name)
      .sort();
  } else {
    slugs = [candidateSlug];
  }

  console.log(`${slugs.length} candidato(s) para processar.`);

  const results = [];
  for (const slug of slugs) {
    const result = await runPipeline(slug);
    results.push(result);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("RESUMO:");
  
  const completed = results.filter((r) => r.status === "completed");
  const failed = results.filter((r) => r.status === "failed");
  const skipped = results.filter((r) => r.status === "skipped");

  console.log(`  Concluídos: ${completed.length}`);
  console.log(`  Falharam: ${failed.length}`);
  console.log(`  Pulados: ${skipped.length}`);

  if (failed.length) {
    console.log("\nFalhas:");
    for (const f of failed) {
      console.log(`  - ${f.slug}: falhou em ${f.failedAt}`);
    }
  }
}

main().catch((error) => {
  console.error(`\n❌ Erro fatal: ${error.message}`);
  process.exit(1);
});

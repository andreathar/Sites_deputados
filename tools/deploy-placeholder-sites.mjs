#!/usr/bin/env node
/**
 * Compila e publica os sites placeholder em Cloudflare Pages.
 *
 * O deploy usa uma configuracao temporaria sem NEWSLETTER_KV. As Pages
 * Functions continuam ativas, mas inscricoes nao sao persistidas ate que o KV
 * de producao seja provisionado.
 *
 * Uso:
 *   node tools/deploy-placeholder-sites.mjs --all --build
 *   node tools/deploy-placeholder-sites.mjs --all --build --install --apply
 *   node tools/deploy-placeholder-sites.mjs --all --build --deploy --apply
 */
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITES_ROOT = path.join(ROOT, "sites");
const PREVIEW_BRANCH = "placeholder";
const args = process.argv.slice(2);
const has = (argument) => args.includes(argument);
const valueAfter = (argument) => {
  const index = args.indexOf(argument);
  return index === -1 ? null : args[index + 1] || null;
};

const all = has("--all");
const selectedSite = valueAfter("--site");
const shouldBuild = has("--build");
const shouldInstall = has("--install");
const shouldDeploy = has("--deploy");
const apply = has("--apply");

function usage() {
  console.log(`
Uso:
  node tools/deploy-placeholder-sites.mjs --all --build
  node tools/deploy-placeholder-sites.mjs --all --build --install --apply
  node tools/deploy-placeholder-sites.mjs --all --build --deploy --apply
  node tools/deploy-placeholder-sites.mjs --site deputado-01 --build --deploy --apply

Opcoes:
  --all             seleciona todos os diretorios deputado-XX
  --site <slug>     seleciona somente um diretorio
  --build           compila os sites selecionados
  --install         instala dependencias ausentes antes do build
  --deploy          cria projetos Pages ausentes e publica em preview
  --apply           permite operacoes que escrevem ou alteram Cloudflare

Sem --apply, o comando executa apenas a previsualizacao. O deploy usa a branch
"${PREVIEW_BRANCH}" e publica em ${PREVIEW_BRANCH}.<projeto>.pages.dev.
`);
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if ((!all && !selectedSite) || (all && selectedSite) || (!shouldBuild && !shouldDeploy)) {
  usage();
  process.exit(1);
}
if (shouldInstall && !shouldBuild) fail("--install requer --build.");
if (shouldDeploy && !shouldBuild) fail("--deploy requer --build para evitar publicar artefatos desatualizados.");
if (shouldInstall && !apply) {
  fail("--install altera o ambiente; execute novamente com --apply.");
}

function run(command, commandArgs, options) {
  console.log(`    $ ${command} ${commandArgs.join(" ")}`);
  execFileSync(command, commandArgs, {stdio: "inherit", ...options});
}

function targets() {
  if (selectedSite) return [selectedSite];
  return fs
    .readdirSync(SITES_ROOT, {withFileTypes: true})
    .filter((entry) => entry.isDirectory() && /^deputado-\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function ensureSite(slug) {
  const siteDir = path.join(SITES_ROOT, slug);
  if (!fs.existsSync(path.join(siteDir, "package.json"))) fail(`${slug} nao possui package.json.`);
  return siteDir;
}

function needsInstall(siteDir) {
  return !fs.existsSync(path.join(siteDir, "node_modules", "vite", "bin", "vite.js"));
}

function buildSite(slug) {
  const siteDir = ensureSite(slug);
  if (needsInstall(siteDir)) {
    if (!shouldInstall) throw new Error("dependencias ausentes; rode com --build --install --apply");
    run("npm", ["install", "--no-audit", "--no-fund"], {cwd: siteDir});
  }
  run("npm", ["run", "build"], {cwd: siteDir});
  if (!fs.existsSync(path.join(siteDir, "dist", "index.html"))) {
    throw new Error("build terminou sem dist/index.html");
  }
}

function temporaryPagesConfig(slug) {
  const file = path.join(os.tmpdir(), `pages-placeholder-${slug}.toml`);
  fs.writeFileSync(
    file,
    `name = "${slug}"\ncompatibility_date = "2026-08-17"\npages_build_output_dir = "dist"\n`
  );
  return file;
}

function listProjects() {
  const stdout = execFileSync("npx", ["wrangler", "pages", "project", "list", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  });
  return new Set(JSON.parse(stdout).map((project) => project.name));
}

function deploySite(slug, existingProjects) {
  const siteDir = ensureSite(slug);
  const config = temporaryPagesConfig(slug);
  try {
    if (!existingProjects.has(slug)) {
      run("npx", ["wrangler", "pages", "project", "create", slug, "--production-branch", "main"], {cwd: siteDir});
      existingProjects.add(slug);
    }
    run("npx", [
      "wrangler", "pages", "deploy", "dist", "--project-name", slug,
      "--branch", PREVIEW_BRANCH,
      "--commit-message", "Placeholder inicial para personalizacao de campanha",
      "--config", config,
    ], {cwd: siteDir});
  } finally {
    fs.rmSync(config, {force: true});
  }
}

function main() {
  const sites = targets();
  const failures = [];
  console.log(`\n${apply ? "🔄 Executando" : "👀 Previa"} para ${sites.length} site(s).\n`);

  if (!apply) {
    for (const slug of sites) {
      const siteDir = ensureSite(slug);
      const installNote = needsInstall(siteDir) ? "; instalar dependencias" : "";
      const actions = [shouldBuild ? "build" : null, shouldDeploy ? `deploy → ${PREVIEW_BRANCH}.${slug}.pages.dev` : null].filter(Boolean).join("; ");
      console.log(`  👀 ${slug}: ${actions}${installNote}`);
    }
    console.log("\nPrevia concluida. Acrescente --apply para executar.");
    return;
  }

  for (const slug of sites) {
    console.log(`\n▶ ${slug}`);
    try {
      if (shouldBuild) buildSite(slug);
    } catch (error) {
      failures.push({slug, message: error.message});
      console.error(`  ❌ build: ${error.message}`);
    }
  }

  if (shouldDeploy && failures.length === 0) {
    const projects = listProjects();
    for (const slug of sites) {
      console.log(`\n☁️  ${slug}`);
      try {
        deploySite(slug, projects);
        console.log(`  ✅ URL esperada: https://${PREVIEW_BRANCH}.${slug}.pages.dev`);
      } catch (error) {
        failures.push({slug, message: error.message});
        console.error(`  ❌ deploy: ${error.message}`);
      }
    }
  }

  if (failures.length) {
    console.error(`\n❌ ${failures.length} site(s) falharam:`);
    for (const failure of failures) console.error(`  - ${failure.slug}: ${failure.message}`);
    process.exit(1);
  }
  console.log(`\n✅ ${sites.length} site(s) concluídos.`);
}

main();
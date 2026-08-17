// Sincroniza os assets de cada site (sites/deputado-XX/assets/) para
// public/candidatos/<slug>/ e gera candidatos.sites.json para o batch render.
//
// Convencao de origem (mantida de sites/ASSETS.md):
//   sites/deputado-XX/assets/foto/    -> foto-raw.*   (prep-fotos.mjs remove o fundo)
//   sites/deputado-XX/assets/logo/    -> logo.*
//   sites/deputado-XX/assets/jingles/ -> jingle.*     (gerado por generate-jingles.mjs)
//   sites/deputado-XX/assets/audio/   -> jingle.*     (fallback legado, opcional)
//
// Uso: node tools/sync-assets.mjs
// Depois: node tools/render-batch.mjs --sites
import fs from "node:fs";
import path from "node:path";

const SITES_ROOT = path.join("..", "sites");
const PUBLIC_ROOT = path.join("public", "candidatos");

const FOTO_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".JPG", ".PNG", ".JPEG"];
const LOGO_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
const AUDIO_EXTS = [".mp3", ".wav", ".m4a", ".ogg", ".aac"];

// Parser TOML minimo (so chave = "valor" e comentarios).
function parseToml(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;
    const m = clean.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  }
  return out;
}

function firstFile(dir, exts) {
  if (!fs.existsSync(dir)) return null;
  for (const f of fs.readdirSync(dir)) {
    const ext = path.extname(f);
    if (exts.includes(ext)) return path.join(dir, f);
  }
  return null;
}

function copyIfNewer(src, dest) {
  if (!fs.existsSync(dest) || fs.statSync(src).mtimeMs > fs.statSync(dest).mtimeMs) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return true;
  }
  return false;
}

function getSiteDirs() {
  if (!fs.existsSync(SITES_ROOT)) return [];
  return fs
    .readdirSync(SITES_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^deputado-\d+$/.test(d.name))
    .map((d) => path.join(SITES_ROOT, d.name))
    .sort();
}

const candidatos = [];
let copiados = 0;

for (const siteDir of getSiteDirs()) {
  const tomlPath = path.join(siteDir, "site.toml");
  if (!fs.existsSync(tomlPath)) continue;
  const toml = parseToml(fs.readFileSync(tomlPath, "utf8"));

  // Slug usado no public/candidatos/. Prefere o slug do site.toml; fallback do folder.
  const slug = (toml.slug || path.basename(siteDir)).toLowerCase();
  const destDir = path.join(PUBLIC_ROOT, slug);
  fs.mkdirSync(destDir, { recursive: true });

  const fotoSrc = firstFile(path.join(siteDir, "assets", "foto"), FOTO_EXTS);
  const logoSrc = firstFile(path.join(siteDir, "assets", "logo"), LOGO_EXTS);
  // Jingle: prioriza assets/jingles/ (gerado por generate-jingles.mjs); fallback
  // para assets/audio/ (convencao antiga).
  const audioSrc =
    firstFile(path.join(siteDir, "assets", "jingles"), AUDIO_EXTS) ||
    firstFile(path.join(siteDir, "assets", "audio"), AUDIO_EXTS);

  if (fotoSrc) {
    if (copyIfNewer(fotoSrc, path.join(destDir, `foto-raw${path.extname(fotoSrc)}`))) {
      copiados++;
      console.log(`  foto: ${path.relative(process.cwd(), fotoSrc)}`);
    }
  }
  if (logoSrc) {
    if (copyIfNewer(logoSrc, path.join(destDir, `logo${path.extname(logoSrc)}`))) {
      copiados++;
      console.log(`  logo: ${path.relative(process.cwd(), logoSrc)}`);
    }
  }
  if (audioSrc) {
    if (copyIfNewer(audioSrc, path.join(destDir, `jingle${path.extname(audioSrc)}`))) {
      copiados++;
      console.log(`  jingle: ${path.relative(process.cwd(), audioSrc)}`);
    }
  }

  candidatos.push({
    // Preserva o vínculo explícito do site com o cadastro no ClickUp para que
    // upload-clickup.mjs possa anexar a intro à tarefa correta.
    taskId: toml.clickup_task_id || "",
    nome: toml.candidate_name || slug,
    numero: toml.numero || "",
    mensagem: toml.mensagem || "",
    corPrimaria: toml.corPrimaria || "#1b6ef3",
    fotoPath: fotoSrc ? `candidatos/${slug}/foto.png` : "",
    logoPath: logoSrc ? `candidatos/${slug}/logo${path.extname(logoSrc)}` : "",
    audioPath: audioSrc ? `candidatos/${slug}/jingle${path.extname(audioSrc)}` : "",
    slug,
  });
}

fs.writeFileSync(
  "candidatos.sites.json",
  JSON.stringify(candidatos, null, 2)
);
console.log(
  `\nOK: ${candidatos.length} deputado(s) em candidatos.sites.json (${copiados} asset(s) copiado(s)).`
);
console.log("Rode: node tools/render-batch.mjs --sites");

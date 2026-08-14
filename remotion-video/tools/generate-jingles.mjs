// Gera o jingle de cada deputado a partir das letras em sites/deputado-XX/assets/lyrics/
// usando a API de Text-to-Speech da ElevenLabs (chave em .env -> ELEVENLABS_API_KEY).
// O audio gerado e salvo em sites/deputado-XX/assets/jingles/jingle.mp3.
//
// Convencao:
//   sites/deputado-XX/assets/lyrics/jingle.txt   -> letra do jingle (qualquer .txt serve)
//   sites/deputado-XX/assets/jingles/jingle.mp3  -> audio gerado (consumido pelo sync-assets.mjs)
//
// Opcoes do site.toml (opcionais):
//   jingle_voice = "TX3L..."   -> voz especifica para o deputado (sobrescreve a padrao)
//
// Uso:
//   node tools/generate-jingles.mjs                (todos os sites com letra)
//   node tools/generate-jingles.mjs --site deputado-01
//   node tools/generate-jingles.mjs --force        (regenera mesmo se jingle.mp3 ja existe)
import fs from "node:fs";
import path from "node:path";

const SITES_ROOT = path.join("..", "sites");

// Voz padrao: Liam - Energetic, Social Media Creator (boa para jingle de campanha).
const DEFAULT_VOICE = "TX3LPaxmHKxFdv7VOQHJ";
const MODEL_ID = "eleven_multilingual_v2"; // suporta PT-BR
const OUTPUT_FORMAT = "mp3_44100_128";

const LYRICS_NAMES = ["jingle.txt", "letra.txt", "lyrics.txt"];

function parseToml(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;
    const m = clean.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  }
  return out;
}

function loadApiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  // Fallback: le o .env na raiz do monorepo (Sites_deputados/.env).
  for (const candidate of [path.join("..", ".env"), path.join("..", "..", ".env")]) {
    if (fs.existsSync(candidate)) {
      const text = fs.readFileSync(candidate, "utf8");
      const line = text
        .split("\n")
        .find((l) => l.trim().startsWith("ELEVENLABS_API_KEY="));
      if (line) {
        return line.split("=").slice(1).join("=").trim();
      }
    }
  }
  return null;
}

function getSiteDirs() {
  if (!fs.existsSync(SITES_ROOT)) return [];
  return fs
    .readdirSync(SITES_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^deputado-\d+$/.test(d.name))
    .map((d) => path.join(SITES_ROOT, d.name))
    .sort();
}

function findLyrics(dir) {
  const lyricsDir = path.join(dir, "assets", "lyrics");
  if (!fs.existsSync(lyricsDir)) return null;
  // Prefere nomes convencionais; senao, o primeiro .txt.
  for (const n of LYRICS_NAMES) {
    const p = path.join(lyricsDir, n);
    if (fs.existsSync(p)) return p;
  }
  const txt = fs
    .readdirSync(lyricsDir)
    .find((f) => f.endsWith(".txt"));
  return txt ? path.join(lyricsDir, txt) : null;
}

async function generateJingle(apiKey, siteDir, lyricsFile, outFile) {
  const text = fs.readFileSync(lyricsFile, "utf8").trim();
  if (!text) {
    console.warn(`  (letra vazia em ${lyricsFile}, pulando)`);
    return false;
  }

  const toml = parseToml(
    fs.readFileSync(path.join(siteDir, "site.toml"), "utf8")
  );
  const voice = toml.jingle_voice || process.env.JINGLE_VOICE || DEFAULT_VOICE;

  console.log(`  Gerando jingle com voz ${voice} (${text.length} chars)...`);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=${OUTPUT_FORMAT}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `ElevenLabs ${res.status} ${path.basename(siteDir)}: ${(await res.text()).slice(0, 300)}`
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, buf);
  console.log(`  OK -> ${path.relative(process.cwd(), outFile)} (${buf.length} bytes)`);
  return true;
}

const apiKey = loadApiKey();
if (!apiKey) {
  console.error(
    "Defina ELEVENLABS_API_KEY (no .env da raiz ou como variavel de ambiente)."
  );
  process.exit(1);
}

const force = process.argv.includes("--force");
const onlySite = process.argv.indexOf("--site");
const only = onlySite !== -1 ? process.argv[onlySite + 1] : null;

const sites = getSiteDirs().filter((d) =>
  only ? path.basename(d) === only : true
);

let gerados = 0;
let pulados = 0;

for (const siteDir of sites) {
  const slug = path.basename(siteDir);
  const lyricsFile = findLyrics(siteDir);
  const outFile = path.join(siteDir, "assets", "jingles", "jingle.mp3");

  if (!lyricsFile) {
    console.log(`- ${slug}: sem letra em assets/lyrics/, pulando`);
    pulados++;
    continue;
  }

  if (fs.existsSync(outFile) && !force) {
    console.log(`- ${slug}: jingle.mp3 ja existe (use --force para regenerar)`);
    pulados++;
    continue;
  }

  console.log(`- ${slug}: ${path.relative(process.cwd(), lyricsFile)}`);
  try {
    if (await generateJingle(apiKey, siteDir, lyricsFile, outFile)) {
      gerados++;
    }
  } catch (e) {
    console.error(`  ERRO: ${e.message}`);
    pulados++;
  }
}

console.log(
  `\nPronto: ${gerados} jingle(s) gerado(s), ${pulados} pulado(s).`
);
console.log("Depois rode: node tools/sync-assets.mjs && node tools/render-batch.mjs --sites");

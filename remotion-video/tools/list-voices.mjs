// Lista as vozes disponiveis na conta ElevenLabs (chave em .env na raiz).
// Uso: node tools/list-voices.mjs
import fs from "node:fs";
import path from "node:path";

function loadApiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  for (const candidate of [path.join("..", ".env"), path.join("..", "..", ".env")]) {
    if (fs.existsSync(candidate)) {
      const line = fs
        .readFileSync(candidate, "utf8")
        .split("\n")
        .find((l) => l.trim().startsWith("ELEVENLABS_API_KEY="));
      if (line) return line.split("=").slice(1).join("=").trim();
    }
  }
  return null;
}

const key = loadApiKey();
if (!key) {
  console.error("Defina ELEVENLABS_API_KEY no .env da raiz.");
  process.exit(1);
}

const res = await fetch("https://api.elevenlabs.io/v1/voices", {
  headers: { "xi-api-key": key },
});
if (!res.ok) {
  console.error(`ElevenLabs ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const data = await res.json();
for (const v of data.voices) {
  console.log(`${v.voice_id}  ${v.name}`);
}
console.log(`\nTOTAL: ${data.voices.length} vozes`);

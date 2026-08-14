// Renderiza uma intro por candidato chamando a CLI do Remotion.
// Le candidatos.json (ou candidatos.mock.json com --mock) e gera out/intro-<slug>.mp4
// Uso: node tools/render-batch.mjs           (usa candidatos.json)
//      node tools/render-batch.mjs --mock     (usa candidatos.mock.json)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const useMock = process.argv.includes("--mock");
const dataFile = useMock ? "candidatos.mock.json" : "candidatos.json";

if (!fs.existsSync(dataFile)) {
  console.error(`Nao encontrei ${dataFile}. Rode fetch-candidatos.mjs primeiro (ou use --mock).`);
  process.exit(1);
}

const candidatos = JSON.parse(fs.readFileSync(dataFile, "utf8"));
fs.mkdirSync("out", { recursive: true });

const slugify = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const c of candidatos) {
  const slug = slugify(c.nome);
  const propsFile = path.join(os.tmpdir(), `intro-${slug}.json`);
  fs.writeFileSync(propsFile, JSON.stringify(c));
  const out = `out/intro-${slug}.mp4`;
  console.log(`Renderizando ${c.nome} -> ${out}`);
  execFileSync(
    "npx",
    ["remotion", "render", "Intro", out, `--props=${propsFile}`],
    { stdio: "inherit" }
  );
}

console.log(`\nPronto: ${candidatos.length} intros em ./out`);

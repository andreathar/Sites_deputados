// Renderiza uma intro por candidato chamando a CLI do Remotion.
// Antes de renderizar, recorta o fundo das fotos (rembg) via prep-fotos.mjs.
//
// Le candidatos.json (ou candidatos.mock.json com --mock / candidatos.sites.json com --sites)
// e gera out/intro-<slug>.mp4
//
// Uso: node tools/render-batch.mjs              (usa candidatos.json do ClickUp)
//      node tools/render-batch.mjs --mock        (usa candidatos.mock.json)
//      node tools/render-batch.mjs --sites       (usa candidatos.sites.json, gerado por sync-assets.mjs)
//      node tools/render-batch.mjs --skip-prep   (nao roda o recorte de fundo)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { prepFotos } from "./prep-fotos.mjs";

const useMock = process.argv.includes("--mock");
const useSites = process.argv.includes("--sites");
const skipPrep = process.argv.includes("--skip-prep");
const dataFile = useMock ? "candidatos.mock.json" : useSites ? "candidatos.sites.json" : "candidatos.json";

if (!fs.existsSync(dataFile)) {
  console.error(
    `Nao encontrei ${dataFile}. Rode fetch-candidatos.mjs primeiro (ou use --mock).`
  );
  process.exit(1);
}

// Passo 1: recorte de fundo (idempotente, so processa o que mudou)
if (!skipPrep) {
  prepFotos();
}

// Passo 2: renderizacao
const candidatos = JSON.parse(fs.readFileSync(dataFile, "utf8"));
fs.mkdirSync("out", { recursive: true });

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const compositionArgIdx = process.argv.indexOf("--composition");
const compositionName = compositionArgIdx !== -1 ? process.argv[compositionArgIdx + 1] : "Intro";

for (const c of candidatos) {
  const slug = slugify(c.nome);
  const props = { ...c };

  // Se o candidato tiver o campo citacao no JSON e o template for QuotePost, mapeia
  if (compositionName === "QuotePost" && !props.citacao) {
    props.citacao = props.mensagem || "Trabalhando pelo desenvolvimento e futuro do Distrito Federal.";
  }

  // Se a foto nao existe em public/, limpa o path para o template usar o placeholder.
  if (props.fotoPath) {
    const fotoFile = path.join("public", props.fotoPath);
    if (!fs.existsSync(fotoFile)) {
      console.warn(`  (sem foto em ${fotoFile}, usando placeholder)`);
      props.fotoPath = "";
    }
  }

  // Se o jingle nao existe em public/, desativa o audio para nao quebrar o render.
  if (props.audioPath) {
    const audioFile = path.join("public", props.audioPath);
    if (!fs.existsSync(audioFile)) {
      console.warn(`  (sem jingle em ${audioFile}, seguindo sem audio)`);
      props.audioPath = "";
    }
  }

  const propsFile = path.join(os.tmpdir(), `intro-${slug}.json`);
  fs.writeFileSync(propsFile, JSON.stringify(props));
  const out = `out/${compositionName.toLowerCase()}-${slug}.mp4`;
  console.log(`Renderizando (${compositionName}) ${c.nome} -> ${out}`);
  execFileSync("npx", ["remotion", "render", compositionName, out, `--props=${propsFile}`], {
    stdio: "inherit",
  });
}

console.log(`\nPronto: ${candidatos.length} videos gerados com a composicao ${compositionName} em ./out`);


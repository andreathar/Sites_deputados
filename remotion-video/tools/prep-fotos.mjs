// Recorta o fundo das fotos dos candidatos usando rembg, gerando PNGs transparentes.
//
// Convencao: em public/candidatos/<slug>/ coloque a foto original como
//   foto-raw.png (ou .jpg/.jpeg/.webp)
// Este script gera foto.png (fundo removido), que e o que o template consome.
//
// So processa quando foto.png nao existe ou quando a foto-raw e mais nova,
// entao rodar de novo e barato (nao reprocessa o que ja esta pronto).
//
// Requisito: rembg instalado e no PATH.
//   pipx install rembg   (recomendado)   ou   pip install "rembg[cli]"
//
// Uso: node tools/prep-fotos.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BASE = path.join("public", "candidatos");
const RAW_NAMES = ["foto-raw.png", "foto-raw.jpg", "foto-raw.jpeg", "foto-raw.webp"];

function hasRembg() {
  try {
    execFileSync("rembg", ["--help"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function findRaw(dir) {
  for (const n of RAW_NAMES) {
    const p = path.join(dir, n);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function needsCut(raw, out) {
  if (!fs.existsSync(out)) return true;
  return fs.statSync(raw).mtimeMs > fs.statSync(out).mtimeMs;
}

export function prepFotos() {
  if (!fs.existsSync(BASE)) {
    console.log("Sem public/candidatos/ ainda, nada para recortar.");
    return;
  }
  if (!hasRembg()) {
    console.warn(
      "rembg nao encontrado no PATH. Pulei o recorte de fundo.\n" +
        "Instale com: pipx install rembg  (ou pip install \"rembg[cli]\")\n" +
        "O batch segue usando foto.png se ja existir, ou o placeholder."
    );
    return;
  }

  const dirs = fs
    .readdirSync(BASE, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(BASE, d.name));

  let cortadas = 0;
  for (const dir of dirs) {
    const raw = findRaw(dir);
    if (!raw) continue; // sem foto original; template usa placeholder
    const out = path.join(dir, "foto.png");
    if (!needsCut(raw, out)) continue;
    console.log(`Recortando fundo: ${path.basename(dir)}`);
    execFileSync("rembg", ["i", raw, out], { stdio: "inherit" });
    cortadas++;
  }
  console.log(cortadas ? `\nRecorte concluido: ${cortadas} foto(s).` : "Nada novo para recortar.");
}

// Permite rodar isolado: node tools/prep-fotos.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  prepFotos();
}

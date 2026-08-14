// Recorta o fundo das fotos dos candidatos usando rembg (via API Python),
// gerando PNGs transparentes.
//
// Convencao: em public/candidatos/<slug>/ coloque a foto original como
//   foto-raw.png (ou .jpg/.jpeg/.webp)
// Este script gera foto.png (fundo removido), que e o que o template consome.
// So processa quando foto.png nao existe ou quando a foto-raw e mais nova,
// entao rodar de novo e barato (nao reprocessa o que ja esta pronto).
//
// Requisito: rembg instalado no .venv do projeto (raiz do monorepo).
//   uv pip install --python .venv/bin/python "rembg[cpu]"
//
// Uso: node tools/prep-fotos.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BASE = path.join("public", "candidatos");
const RAW_NAMES = ["foto-raw.png", "foto-raw.jpg", "foto-raw.jpeg", "foto-raw.webp"];

// Caminhos provaveis do interpretador do venv do monorepo (raiz acima de tools/).
const PY_CANDIDATES = [
  path.join("..", ".venv", "bin", "python"),
  path.join("..", "..", ".venv", "bin", "python"),
  path.join(".venv", "bin", "python"),
];

function findPython() {
  for (const p of PY_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function hasRembg(python) {
  try {
    execFileSync(python, ["-c", "import rembg"], { stdio: "ignore" });
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

  const python = findPython();
  if (!python || !hasRembg(python)) {
    console.warn(
      "rembg nao encontrado no venv do projeto. Pulei o recorte de fundo.\n" +
        "Instale com: uv pip install --python .venv/bin/python \"rembg[cpu]\"\n" +
        "O batch segue usando foto.png se ja existir, ou o placeholder."
    );
    return;
  }

  const cutScript = path.join("tools", "rembg-cut.py");

  // O sandbox/ambiente deste projeto injeta SSL_CERT_FILE/CURL_CA_BUNDLE com um
  // bundle quebrado, o que derruba o requests/pooch do rembg ao baixar modelos.
  // Apontamos para os certificados do sistema para o Python conseguir baixar o
  // modelo u2net.onnx na primeira execucao.
  const safeEnv = { ...process.env };
  delete safeEnv.SSL_CERT_FILE;
  delete safeEnv.CURL_CA_BUNDLE;
  safeEnv.SSL_CERT_FILE = "/etc/ssl/certs/ca-certificates.crt";
  safeEnv.CURL_CA_BUNDLE = "/etc/ssl/certs/ca-certificates.crt";
  // O sandbox deste ambiente nao expoe ~/.u2net ao Python; usamos o modelo
  // local ja baixado dentro do workspace (models/u2net/u2net.onnx).
  const modelHome = path.resolve("models", "u2net");
  if (fs.existsSync(path.join(modelHome, "u2net.onnx"))) {
    safeEnv.U2NET_HOME = modelHome;
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
    execFileSync(python, [cutScript, raw, out], { stdio: "inherit", env: safeEnv });
    cortadas++;
  }
  console.log(
    cortadas ? `\nRecorte concluido: ${cortadas} foto(s).` : "Nada novo para recortar."
  );
}

// Permite rodar isolado: node tools/prep-fotos.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  prepFotos();
}

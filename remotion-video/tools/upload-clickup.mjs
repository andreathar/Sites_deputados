// Upload dos videos renderizados de volta para as tarefas correspondentes no ClickUp.
// Uso: CLICKUP_TOKEN=pk_xxx node tools/upload-clickup.mjs
//      CLICKUP_TOKEN=pk_xxx node tools/upload-clickup.mjs --data candidatos.json

import fs from "node:fs";
import path from "node:path";

const TOKEN = process.env.CLICKUP_TOKEN;
const dataFile = process.argv.includes("--data")
  ? process.argv[process.argv.indexOf("--data") + 1]
  : "candidatos.json";

if (!TOKEN) {
  console.error("Defina CLICKUP_TOKEN com seu Personal API Token do ClickUp.");
  process.exit(1);
}

if (!fs.existsSync(dataFile)) {
  console.error(`Arquivo ${dataFile} nao encontrado.`);
  process.exit(1);
}

const candidatos = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const OUT_DIR = "out";

async function uploadAttachment(taskId, videoPath) {
  const url = `https://api.clickup.com/api/v2/task/${taskId}/attachment`;
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

  const data = await res.json();
  return data;
}

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function main() {
  console.log(`Iniciando upload de vídeos para o ClickUp... (${candidatos.length} candidatos)`);
  let enviados = 0;

  for (const c of candidatos) {
    const slug = c.slug || slugify(c.nome);
    const videoPath = path.join(OUT_DIR, `intro-${slug}.mp4`);

    if (!c.taskId) {
      console.warn(`⚠️ Candidato ${c.nome} sem taskId do ClickUp. Pulando upload.`);
      continue;
    }

    if (!fs.existsSync(videoPath)) {
      console.warn(`⚠️ Video ${videoPath} nao encontrado para ${c.nome}. Pulando.`);
      continue;
    }

    try {
      console.log(`Enviando ${videoPath} para task ${c.taskId} (${c.nome})...`);
      await uploadAttachment(c.taskId, videoPath);
      console.log(`  ✅ Upload concluido com sucesso para ${c.nome}`);
      enviados++;
    } catch (err) {
      console.error(`  ❌ Erro ao enviar para ${c.nome}: ${err.message}`);
    }
  }

  console.log(`\nFinalizado: ${enviados} video(s) anexado(s) no ClickUp.`);
}

main();

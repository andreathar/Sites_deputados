// Puxa os candidatos da lista Cadastro de Deputados no ClickUp e monta candidatos.json.
// Uso: CLICKUP_TOKEN=pk_xxx node tools/fetch-candidatos.mjs
import fs from "node:fs";

const TOKEN = process.env.CLICKUP_TOKEN;
const LIST_ID = "901715749173"; // Cadastro de Deputados

if (!TOKEN) {
  console.error("Defina CLICKUP_TOKEN com seu Personal API Token do ClickUp.");
  process.exit(1);
}

// Nome do campo no ClickUp -> chave usada no template. Ajuste se renomear.
const FIELD_MAP = {
  "Numero eleitoral": "numero",
  "Mensagem da intro": "mensagem",
  "Cor primaria": "corPrimaria",
};

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function getTasks() {
  const url = `https://api.clickup.com/api/v2/list/${LIST_ID}/task?include_closed=false&subtasks=false`;
  const res = await fetch(url, { headers: { Authorization: TOKEN } });
  if (!res.ok) throw new Error(`ClickUp ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.tasks ?? [];
}

function readFields(task) {
  const out = {};
  for (const f of task.custom_fields ?? []) {
    const key = FIELD_MAP[f.name];
    if (!key || f.value == null) continue;
    if (f.type === "drop_down" && f.type_config?.options) {
      out[key] = f.type_config.options[f.value]?.name ?? "";
    } else {
      out[key] = String(f.value);
    }
  }
  return out;
}

const tasks = await getTasks();
const candidatos = [];
const faltando = [];

for (const t of tasks) {
  const nome = t.name.trim();
  const slug = slugify(nome);
  const fields = readFields(t);
  const registro = {
    nome,
    numero: fields.numero ?? "",
    mensagem: fields.mensagem ?? "",
    corPrimaria: fields.corPrimaria || "#1b6ef3",
    fotoPath: `candidatos/${slug}/foto.png`,
    logoPath: `candidatos/${slug}/logo.png`,
  };
  if (!registro.numero || !registro.mensagem) faltando.push(nome);
  candidatos.push(registro);
}

fs.writeFileSync("candidatos.json", JSON.stringify(candidatos, null, 2));
console.log(`OK ${candidatos.length} candidatos gravados em candidatos.json`);
if (faltando.length) {
  console.warn(`\nFaltando numero ou mensagem em ${faltando.length}:`);
  for (const n of faltando) console.warn(`  - ${n}`);
}

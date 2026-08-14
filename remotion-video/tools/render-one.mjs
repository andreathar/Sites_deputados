import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const slug = process.argv[2] || "deputado-01";
const data = JSON.parse(fs.readFileSync("candidatos.sites.json", "utf8"));
const c = data.find((x) => x.slug === slug);
if (!c) {
  console.error("nao achei " + slug);
  process.exit(1);
}
console.log(
  "Props:",
  JSON.stringify({
    nome: c.nome,
    fotoPath: c.fotoPath,
    audioPath: c.audioPath,
  })
);
const propsFile = path.join(os.tmpdir(), "intro-" + slug + ".json");
fs.writeFileSync(propsFile, JSON.stringify(c));
execFileSync(
  "npx",
  ["remotion", "render", "Intro", "out/intro-" + slug + ".mp4", "--props=" + propsFile],
  { stdio: "inherit" }
);
console.log("OK -> out/intro-" + slug + ".mp4");

#!/usr/bin/env node
/**
 * fetch-geojson.mjs — baixa e simplifica o GeoJSON das Regioes Administrativas
 * do Distrito Federal, para a secao Atuacao dos sites.
 *
 * O que faz:
 *   1. Baixa o GeoJSON oficial em WGS84 (lat/lng) da IDE-DF; se falhar, tenta o IBRAM.
 *   2. Simplifica a geometria com mapshaper (reduz de varios MB para ~100-300KB).
 *   3. Salva em tools/site-template/public/df-ras.geojson.
 *      Com --all, copia tambem para sites/<slug>/public/df-ras.geojson de cada site ja gerado.
 *
 * Requisito: mapshaper (dependencia de dev).
 *   npm install -D mapshaper
 *
 * Uso:
 *   node tools/fetch-geojson.mjs                 # baixa + simplifica no template
 *   node tools/fetch-geojson.mjs --pct 5         # simplificacao mais agressiva (5% dos pontos)
 *   node tools/fetch-geojson.mjs --all           # copia para todos os sites em sites/
 *   node tools/fetch-geojson.mjs --keep-raw      # mantem o arquivo bruto baixado (df-ras.raw.geojson)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TEMPLATE_PUBLIC = path.join(__dirname, 'site-template', 'public')
const SITES_DIR = path.join(ROOT, 'sites')

// Fontes oficiais, em ordem de preferencia. Ambas exportam GeoJSON em WGS84
// (outSR=4326) e usam o campo ra_nome para o nome da Regiao Administrativa.
const SOURCES = [
  {
    nome: 'IDE-DF (Publico/LIMITES)',
    url: 'https://www.geoservicos.ide.df.gov.br/arcgis/rest/services/Publico/LIMITES/FeatureServer/1/query?where=1%3D1&outFields=ra_nome&outSR=4326&f=geojson',
  },
  {
    nome: 'IBRAM (Regioes_Administrativas_DF_2025)',
    url: 'https://onda.ibram.df.gov.br/server/rest/services/Territorio/Regioes_Administrativas_DF_2025/FeatureServer/0/query?where=1%3D1&outFields=ra_nome&outSR=4326&f=geojson',
  },
]

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name)
  if (i === -1) return fallback
  const next = process.argv[i + 1]
  return next && !next.startsWith('--') ? next : true
}

const pct = Number(arg('--pct', '8')) // % de pontos a MANTER (menor = mais simples)
const copyAll = process.argv.includes('--all')
const keepRaw = process.argv.includes('--keep-raw')

async function download() {
  for (const src of SOURCES) {
    try {
      process.stdout.write(`Baixando de ${src.nome}... `)
      const res = await fetch(src.url, {
        headers: {
          // Alguns servidores ArcGIS exigem um User-Agent de navegador.
          'User-Agent':
            'Mozilla/5.0 (compatible; sites-deputados/1.0; +https://github.com/andreathar/Sites_deputados)',
          Accept: 'application/json,application/geo+json,*/*',
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      const json = JSON.parse(text) // valida que e JSON de verdade
      if (!json.features || !json.features.length) throw new Error('sem features')
      console.log(`OK (${json.features.length} regioes)`)
      return text
    } catch (e) {
      console.log(`falhou (${e.message})`)
    }
  }
  throw new Error(
    'Nao consegui baixar de nenhuma fonte. Baixe manualmente pela URL da IDE-DF e salve como df-ras.raw.geojson nesta pasta, depois rode com --from-raw.'
  )
}

function simplify(rawFile, outFile, keepPct) {
  // Usa a CLI do mapshaper via npx. Visvalingam mantem melhor a forma das RAs.
  // clean corrige eventuais geometrias invalidas apos simplificar.
  console.log(`Simplificando para ${keepPct}% dos pontos...`)
  execFileSync(
    'npx',
    [
      'mapshaper',
      rawFile,
      '-simplify',
      `visvalingam ${keepPct}%`,
      'keep-shapes',
      '-clean',
      '-o',
      'format=geojson',
      'precision=0.00001',
      outFile,
    ],
    { stdio: 'inherit' }
  )
}

async function main() {
  fs.mkdirSync(TEMPLATE_PUBLIC, { recursive: true })
  const rawFile = path.join(TEMPLATE_PUBLIC, 'df-ras.raw.geojson')
  const outFile = path.join(TEMPLATE_PUBLIC, 'df-ras.geojson')

  // Permite reaproveitar um arquivo baixado manualmente: --from-raw
  if (process.argv.includes('--from-raw')) {
    if (!fs.existsSync(rawFile)) {
      console.error(`Esperava ${rawFile} para --from-raw, mas nao existe.`)
      process.exit(1)
    }
    console.log('Usando df-ras.raw.geojson ja presente.')
  } else {
    const text = await download()
    fs.writeFileSync(rawFile, text)
  }

  const beforeKB = (fs.statSync(rawFile).size / 1024).toFixed(0)
  simplify(rawFile, outFile, pct)
  const afterKB = (fs.statSync(outFile).size / 1024).toFixed(0)
  console.log(`Tamanho: ${beforeKB}KB -> ${afterKB}KB`)

  if (!keepRaw) fs.rmSync(rawFile, { force: true })

  if (copyAll && fs.existsSync(SITES_DIR)) {
    const built = fs
      .readdirSync(SITES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(SITES_DIR, d.name, 'public')))
    for (const d of built) {
      const dest = path.join(SITES_DIR, d.name, 'public', 'df-ras.geojson')
      fs.copyFileSync(outFile, dest)
    }
    console.log(`Copiado para ${built.length} site(s) ja gerado(s).`)
  }

  console.log(`\nPronto: ${path.relative(ROOT, outFile)}`)
  if (!copyAll) {
    console.log('Dica: rode com --all para copiar para os sites ja gerados em sites/.')
  }
}

main().catch((e) => {
  console.error('\nERRO:', e.message)
  process.exit(1)
})

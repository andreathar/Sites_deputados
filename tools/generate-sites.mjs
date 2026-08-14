#!/usr/bin/env node
/**
 * generate-sites.mjs — Batch-generate one React site per deputado.
 *
 * Reads each `sites/<slug>/site.toml` + `assets/` and scaffolds a full
 * Vite + React app (from `tools/site-template/`) into `sites/<slug>/`.
 *
 * Usage:
 *   node tools/generate-sites.mjs                  # all sites
 *   node tools/generate-sites.mjs --only deputado-01
 *   node tools/generate-sites.mjs --force          # regenerate even if built
 *   node tools/generate-sites.mjs --dry-run        # show what would happen
 *
 * SKILL: see .agents/skills/deputado-site/SKILL.md
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SITES_DIR = path.join(ROOT, 'sites')
const TEMPLATE_DIR = path.join(__dirname, 'site-template')

const SKIP_TEMPLATE = new Set(['node_modules', 'dist', '.git'])
const MEDIA_DIRS = { foto: 'foto', logo: 'logo', jingle: 'jingles' }
const MEDIA_TARGETS = { foto: 'foto', logo: 'logo', jingle: 'jingle' }

// ---------------------------------------------------------------------------
// Minimal TOML parser (flat tables, arrays of strings, array-of-tables)
// ---------------------------------------------------------------------------
function parseToml(src) {
  const root = {}
  let current = root
  const lines = src.split(/\r?\n/)
  for (let raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue

    if (line.startsWith('[[') && line.endsWith(']]')) {
      const name = line.slice(2, -2).trim()
      if (!root[name]) root[name] = []
      current = {}
      root[name].push(current)
      continue
    }
    if (line.startsWith('[') && line.endsWith(']')) {
      const name = line.slice(1, -1).trim()
      if (!root[name]) root[name] = {}
      current = root[name]
      continue
    }

    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const valueStr = stripComment(line.slice(eq + 1).trim())
    current[key] = parseTomlValue(valueStr)
  }
  return root
}

function stripComment(s) {
  // naive: cut trailing # only when not inside quotes
  let inStr = false
  let quote = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (c === quote && s[i - 1] !== '\\') inStr = false
    } else if (c === '"' || c === "'") {
      inStr = true
      quote = c
    } else if (c === '#') {
      return s.slice(0, i).trim()
    }
  }
  return s
}

function parseTomlValue(s) {
  if (!s) return ''
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim()
    if (!inner) return []
    return splitTopLevel(inner).map(parseTomlValue)
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n')
  }
  if (s === 'true') return true
  if (s === 'false') return false
  const num = Number(s)
  if (s !== '' && !Number.isNaN(num)) return num
  return s
}

function splitTopLevel(s) {
  const parts = []
  let depth = 0
  let cur = ''
  let inStr = false
  let quote = ''
  for (const c of s) {
    if (inStr) {
      cur += c
      if (c === quote && cur[cur.length - 2] !== '\\') inStr = false
      continue
    }
    if (c === '"' || c === "'") { inStr = true; quote = c; cur += c; continue }
    if (c === '[' || c === '{') depth++
    if (c === ']' || c === '}') depth--
    if (c === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const log = (...a) => console.log(...a)

function readToml(siteDir) {
  const file = path.join(siteDir, 'site.toml')
  if (!fs.existsSync(file)) return null
  return parseToml(fs.readFileSync(file, 'utf8'))
}

function firstRealFile(dir) {
  if (!fs.existsSync(dir)) return null
  const files = fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith('.')) // skip .gitkeep, hidden
    .sort()
  if (!files.length) return null
  return path.join(dir, files[0])
}

function copyDir(src, dest, skip = SKIP_TEMPLATE) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(s, d, skip)
    else if (!fs.existsSync(d)) fs.copyFileSync(s, d)
  }
}

function writeIfChanged(file, content) {
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null
  if (prev === content) return false
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
  return true
}

const jsStr = (s) => JSON.stringify(s ?? '')
const jsBool = (b) => (b ? 'true' : 'false')

function buildSiteConfig(cfg, media, siteDir) {
  const proposals = Array.isArray(cfg.proposals)
    ? cfg.proposals.map((p, i) =>
        typeof p === 'string'
          ? { titulo: p, descricao: '' }
          : { titulo: p.titulo || `Proposta ${i + 1}`, descricao: p.descricao || '' }
      )
    : []

  const mediaProp = (key) => (media[key] ? jsStr(`/${MEDIA_TARGETS[key]}.${media[key].ext}`) : 'null')

  return `// ============================================================
// site-config.js — generated by tools/generate-sites.mjs
// This file is AUTO-GENERATED from site.toml + assets. Do not
// hand-edit it; edit the source data and re-run the generator.
// ============================================================

export default {
  slug: ${jsStr(cfg.slug)},
  name: ${jsStr(cfg.candidate_name)},
  number: ${jsStr(cfg.number ?? '')},
  party: ${jsStr(cfg.party ?? '')},
  role: ${jsStr(cfg.role ?? 'Candidatura')},
  placeholder: ${jsBool(cfg.placeholder === true)},
  tagline: ${jsStr(cfg.tagline ?? 'Juntos por um futuro melhor.')},
  bio: ${jsStr(cfg.bio ?? `Conheça as ideias e propostas de ${cfg.candidate_name}. Em breve mais informações.`)},
  proposals: ${JSON.stringify(proposals, null, 2)},
  media: {
    foto: ${mediaProp('foto')},
    logo: ${mediaProp('logo')},
    jingle: ${mediaProp('jingle')}
  },
  social: {
    instagram: ${jsStr(cfg.instagram ?? '')},
    facebook: ${jsStr(cfg.facebook ?? '')},
    whatsapp: ${jsStr(cfg.whatsapp ?? '')}
  },
  links: {
    clickup: ${jsStr(cfg.clickup_url ?? '')}
  }
}
`
}

function collectMedia(siteDir) {
  const media = {}
  for (const kind of Object.keys(MEDIA_DIRS)) {
    const dir = path.join(siteDir, 'assets', MEDIA_DIRS[kind])
    const file = firstRealFile(dir)
    if (file) {
      const ext = path.extname(file).replace(/^\./, '')
      media[kind] = { path: file, ext: ext || 'jpg' }
    }
  }
  return media
}

function generateSite(siteDir, opts) {
  const cfg = readToml(siteDir)
  if (!cfg) return { status: 'skip', reason: 'no site.toml' }

  const folder = path.basename(siteDir)
  const slug = cfg.slug || folder
  const name = cfg.candidate_name || slug

  if (opts.dryRun) {
    return { status: 'dry-run', slug, name }
  }

  const dest = path.join(SITES_DIR, slug)
  fs.mkdirSync(dest, { recursive: true })

  // Already generated?
  const marker = path.join(dest, 'src', 'site-config.js')
  if (fs.existsSync(marker) && !opts.force) {
    return { status: 'skip', slug, name, reason: 'already generated (use --force)' }
  }

  // 1) copy template
  copyDir(TEMPLATE_DIR, dest)

  // 2) collect + copy media
  const media = collectMedia(siteDir)
  const publicDir = path.join(dest, 'public')
  fs.mkdirSync(publicDir, { recursive: true })
  for (const kind of Object.keys(media)) {
    const target = path.join(publicDir, `${MEDIA_TARGETS[kind]}.${media[kind].ext}`)
    fs.copyFileSync(media[kind].path, target)
  }

  // 3) generate site-config.js
  writeIfChanged(path.join(dest, 'src', 'site-config.js'), buildSiteConfig(cfg, media, siteDir))

  // 4) patch index.html title + package.json name + wrangler.toml
  const indexHtml = path.join(dest, 'index.html')
  let html = fs.readFileSync(indexHtml, 'utf8')
  html = html.split('__NAME__').join(name)
  html = html.split('__SLUG__').join(slug)
  fs.writeFileSync(indexHtml, html)

  const pkg = path.join(dest, 'package.json')
  let pkgJson = fs.readFileSync(pkg, 'utf8')
  pkgJson = pkgJson.split('__NAME__').join(name)
  pkgJson = pkgJson.split('__SLUG__').join(slug)
  fs.writeFileSync(pkg, pkgJson)

  const wrangler = path.join(dest, 'wrangler.toml')
  let wr = fs.readFileSync(wrangler, 'utf8')
  wr = wr.split('__SLUG__').join(slug)
  fs.writeFileSync(wrangler, wr)

  return { status: 'generated', slug, name, media: Object.keys(media) }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2)
  const only = []
  const opts = { force: false, dryRun: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--only') only.push(args[++i])
    else if (a === '--force') opts.force = true
    else if (a === '--dry-run') opts.dryRun = true
    else if (a.startsWith('--only=')) only.push(a.slice(7))
  }

  if (!fs.existsSync(TEMPLATE_DIR)) {
    log(`❌ Template not found: ${TEMPLATE_DIR}`)
    process.exit(1)
  }
  if (!fs.existsSync(SITES_DIR)) {
    log(`❌ Sites dir not found: ${SITES_DIR}`)
    process.exit(1)
  }

  const siteDirs = fs
    .readdirSync(SITES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(SITES_DIR, d.name))
    .filter((d) => fs.existsSync(path.join(d, 'site.toml')))

  const targets = siteDirs.filter((d) => {
    if (!only.length) return true
    return only.includes(path.basename(d))
  })

  log(`📦 Deputado Site Generator — ${targets.length} site(s)`)
  log('')

  const summary = { generated: [], skipped: [], errors: [] }
  for (const dir of targets) {
    try {
      const r = generateSite(dir, opts)
      if (r.status === 'generated') {
        log(`  ✅ ${r.slug}  (${r.name})  media: ${r.media.join(', ') || 'none'}`)
        summary.generated.push(r.slug)
      } else if (r.status === 'skip') {
        log(`  ⏭️  ${r.slug}  — ${r.reason}`)
        summary.skipped.push(r.slug)
      } else if (r.status === 'dry-run') {
        log(`  👀 would generate ${r.slug}  (${r.name})`)
        summary.generated.push(r.slug)
      }
    } catch (err) {
      log(`  ❌ ${path.basename(dir)} — ${err.message}`)
      summary.errors.push(path.basename(dir))
    }
  }

  log('')
  log(`Done: ${summary.generated.length} generated, ${summary.skipped.length} skipped, ${summary.errors.length} errors.`)
  if (!opts.dryRun) {
    log('')
    log('Next steps per site (cd sites/<slug>):')
    log('  npm install')
    log('  npm run dev            # local dev (newsletter via wrangler pages dev)')
    log('  npm run deploy         # build + publish to Cloudflare Pages')
  }
}

main()

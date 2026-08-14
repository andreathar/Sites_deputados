# AGENTS.md — Sites_deputados

Manager for 30 React websites (deputados data sites). Own project root.

## Structure

- `sites/`   — one folder per React site (drop a React app per site)
- `tools/`   — utilities/scripts for deployments & automation
- `agents/`  — AI agent code / MCP integrations
- `docs/`    — project docs, design, feature lists
- `infra/`   — terraform / cloud infra
- `.herdr/`  — herdr project config
- `.venv/`   — Python virtualenv for agent tooling

## Conventions

- Create a new site: `cd sites && npx create-react-app <site-name>`
- Per-site herdr config: TOML under `~/.config/herdr/.../projects/` or `cloudmanic.herdr-plus/projects/`
- Root is NOT a git repo — `Projects_SSD` (parent) holds the workspace git/AGENTS.md

Sites_deputados — manager for 30 React websites

Structure:
- sites/         — each site gets its own folder (drop a React app per site)
- tools/         — utilities, scripts used for deployments or automation
- agents/        — AI agent code / MCP integrations
- docs/          — project docs, design, feature lists
- infra/         — terraform / cloud infra as needed

Creating a new site
1. cd sites
2. npx create-react-app <site-name> or follow your preferred React template

Python virtualenv: a .venv will be created at the project root for agent tooling.

To add per-site herdr config, drop a TOML into `~/.config/herdr/.../projects/` or
use the global `cloudmanic.herdr-plus/projects/` folder we set up earlier.

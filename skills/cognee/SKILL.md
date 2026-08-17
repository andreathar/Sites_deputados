# Cognee brain — Sites_deputados

This project has its own Cognee dataset and ontology, set up 2026-08-16 following
`/mnt/data/Projects_SSD/cognee/docs/BRAIN_PLAYBOOK.md`. If the Cognee Claude Code
plugin is installed, memory is automatic — do not call the HTTP API manually for
routine recall/save. This file documents what's specific to this project.

## Dataset and ontology

- Dataset: `claude_project_sites_deputados`, set via this project's
  `.claude/settings.json` (`COGNEE_PLUGIN_DATASET`). Takes effect from the *next*
  Claude Code session onward — not retroactively in one already running.
- Ontology: `ontology_key=sites_deputados`
  (`/mnt/data/Projects_SSD/cognee/ontologies/sites_deputados.ttl`), registered on
  the `:8011` bridge. Entities: `SiteInstance`, `SiteTemplate`, `GenerationTool`,
  `Agent`, `VideoRender`, `DeployTarget`, `DataSource` — the site-generation
  *system*, not any individual site's content.
- Bootstrapped 2026-08-16 from this project's own `README.md` + `AGENTS.md` via
  `cognee/scripts/bootstrap_project_dataset.py`.

## Scope boundary — read before storing anything here

This brain knows about the **generator system**: how sites get built, which
tools produce them, where they deploy, what templates exist. It must **never**
contain a deputado's actual biographical, political, or campaign content — that
lives inside each generated site under `sites/<name>/`, not in Cognee. If asked
to "remember" something about a specific deputado's content, that does not
belong in this dataset.

## Scope decision (2026-08-16)

One brain for the whole system, not one per deputado/campaign. If a future need
arises to reason about an individual campaign's specific state (not just how the
generator works), that's a deliberately larger scope — see the open question at
the end of `BRAIN_PLAYBOOK.md`'s "Applying this to campaign management" section
before building it, don't default into it.

## For explicit, ontology-guided "remember this" calls

The automatic hooks don't pass `ontology_key` (a known plugin limitation — see
`cognee-architecture.json`). For a deliberate call that should apply the
ontology, POST directly instead of using the shell wrapper:
```
curl -X POST http://localhost:8011/api/v1/remember \
  -H "X-Api-Key: $(python3 -c "import json;print(json.load(open('$HOME/.cognee-plugin/api_key.json'))['api_key'])")" \
  -F "data=@<file>;type=text/plain" \
  -F "datasetName=claude_project_sites_deputados" \
  -F "node_set=project_docs" \
  -F "ontology_key=sites_deputados"
```
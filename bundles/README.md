# Heru skill bundles

The 19 Heru extensions are grouped into three independently buildable bundles:

- `heru-agent-engineering` — agent architecture, memory, context, code archeology, reverse engineering, and orchestration.
- `heru-research-ml` — academic writing and machine-learning workflows.
- `heru-web-tooling` — Laravel, frontend UI, and Python tooling.

Build a bundle into a clean directory with:

```bash
node scripts/build-bundle.js --bundle heru-research-ml --out ./dist/heru-research-ml
```

The output contains `bundle.json` and the selected `skills/<name>/SKILL.md` directories. The source repository remains unchanged.

# OpenTaiko Web / WASM

Independent browser prototype for local TJA chart practice.

- Static site; deployable on Cloudflare Pages with no build step.
- Build output directory: repository root (/).
- TJA files are parsed locally in the browser.
- No chart or audio upload to a server.
- Touch controls and keyboard controls (F/J = Don, D/K = Ka).

> This is an independent prototype, not an official OpenTaiko release or a complete port. Scoring, chart commands, branches, skins, and other game features are incomplete.

## Cloudflare Pages deployment

Create a Pages project and connect this GitHub repository.

- Project name: `opentaiko`
- Production branch: `main`
- Framework preset: `None`
- Build command: leave empty
- Build output directory: `/`

Cloudflare Pages will publish the static files from the repository root. Every push to `main` will trigger a deployment.

## Run locally

Open the repository through any static HTTP server.

Original project: https://github.com/0auBSQ/OpenTaiko

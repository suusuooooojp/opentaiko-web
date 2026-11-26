# OpenTaiko Web port experiment

Deployment currently serving the prototype:

- https://opentaiko-web.rdgdtrdr.workers.dev/

**Important:** this is not a full OpenTaiko WebAssembly port. The current browser demo uses a separate hand-written interface and simplified TJA playback. It does not reuse OpenTaiko's original screens, skin/Lua pipeline, or runtime, so it does not yet satisfy the requirement to prohibit an independent UI.

See [PORTING_STATUS.md](./PORTING_STATUS.md) for the upstream compatibility findings, blockers, and the implementation sequence for a real browser port that reuses OpenTaiko's existing UI.

Upstream project: https://github.com/0auBSQ/OpenTaiko

## Current prototype

- Static browser page
- Local TJA text parsing
- Simplified note rendering and hit judgement
- Touch and keyboard input

These are prototype-only features and must not be represented as full OpenTaiko functionality.

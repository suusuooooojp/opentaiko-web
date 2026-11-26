# OpenTaiko Web port status

## Current deployment

The existing Worker URL is:

- https://opentaiko-web.rdgdtrdr.workers.dev/

It currently serves the repository's small JavaScript TJA demo. It is **not** an OpenTaiko build and does not contain the OpenTaiko runtime or original OpenTaiko screens.

## Requirement: do not create an independent UI

The current `index.html`, `style.css`, and `app.js` implement a separate, hand-written interface and a simplified note renderer. They do not reuse OpenTaiko's menu, song-select, gameplay, skin, or Lua UI. Therefore this implementation does not satisfy the no-independent-UI requirement.

Do not extend this demo as if it were the real port. A proper implementation must render the existing OpenTaiko screens and reuse its UI/skin pipeline.

## Upstream compatibility findings

The upstream project is https://github.com/0auBSQ/OpenTaiko.

The current upstream `OpenTaiko/OpenTaiko.csproj` targets `net10.0`, builds a desktop `WinExe`, and references FDK plus FFmpeg.AutoGen, LightningDB, SQLite/EF Core, NLua, SevenZip, and Discord Rich Presence. The project also contains platform-specific native libraries and desktop graphics/audio assumptions.

A browser build cannot be produced by simply uploading the desktop release or changing a static-hosting setting. The browser target needs explicit replacements/adapters for at least:

- Graphics: replace desktop OpenGL/window/context creation with WebGL2/WebGPU-compatible rendering while retaining the existing OpenTaiko screen and skin logic.
- Input: map keyboard, touch, and gamepad events to the existing input abstraction.
- Audio: replace desktop/native audio output and FFmpeg/native decoding with Web Audio-compatible playback/decoding.
- Native dependencies: remove or replace native FFmpeg, LMDB/LightningDB, and other platform-specific P/Invoke dependencies for the browser target.
- Filesystem: map song/chart/skin loading and persistent settings to browser storage and user-selected files.
- Lua and assets: preserve the upstream Lua/skin pipeline and package the required runtime assets.

## Safe implementation sequence

1. Keep the current Worker as a deployment target; verify its deployed content after each release.
2. Create a separate browser-target branch based on the upstream OpenTaiko source and retain upstream licensing notices.
3. Identify and isolate graphics, audio, input, storage, and platform services behind interfaces.
4. Implement browser adapters for those services without replacing the existing UI.
5. Compile the browser target in CI, run automated smoke tests, and only then publish the generated static assets to Cloudflare.
6. Keep the current demo clearly labelled as a prototype until the real runtime is running.

## Current status

- Worker endpoint responds and serves the current prototype.
- A full OpenTaiko WebAssembly/browser port is not yet implemented.
- No claim of WASM execution, original UI reuse, or full gameplay compatibility should be made until verified in a real browser.

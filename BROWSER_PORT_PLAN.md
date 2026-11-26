# Browser port engineering plan — reuse OpenTaiko UI

This branch is an isolated engineering track. It does not replace the deployed prototype or claim that a browser build already exists.

## Non-negotiable requirement

**No independent/custom game UI.** The browser build must run OpenTaiko's own C# stage system, textures, Lua skin scripts, song selection, play screen, and result screens. HTML is only a host shell for the canvas, audio, file permissions, and browser lifecycle. Do not reimplement screens in HTML/CSS/React.

## Source audit (upstream main, inspected 2026-11-26)

| Area | Upstream source | Browser blocker | Required direction |
|---|---|---|---|
| App entry | `OpenTaiko/src/Common/Program.cs` | Windows DLL loading, OS/CPU assumptions, native FFmpeg loading, desktop process startup | Add a browser-specific host entry point; do not run desktop `Main` in the browser |
| Window / context | `FDK/src/01.Framework/Core/Game.cs` | Uses Silk.NET.Windowing, Silk.NET.Windowing.Sdl, GLFW and native game-window lifecycle | Separate game loop/context lifecycle from the desktop window host; browser host owns requestAnimationFrame and WebGL context |
| Rendering | `FDK/src/04.Graphics/CTexture.cs` | Direct static calls to `Game.Gl` and OpenGL buffer/shader APIs | Preserve CTexture and stage-facing rendering API; introduce a renderer/context backend boundary, then implement WebGL2 calls via a browser bridge |
| Audio | `FDK/src/03.Sound/ISoundDevice.cs`, `CSoundDeviceBASS.cs` | ManagedBass/BASS device and stream APIs require native runtime | Keep the sound-device contract; implement browser audio using Web Audio and AudioWorklet/AudioBuffer via JS interop |
| Input | `FDK/src/02.Input/IInputDevice.cs`, `CInputManager.cs` | Current device contract exposes Silk input device types and polling | Add a browser input implementation that translates keyboard, pointer/touch and gamepad events into existing `STInputEvent` semantics |
| Video / decoding | `FDK/src/04.Graphics/CVideoDecoder.cs` | FFmpeg.AutoGen and native codec libraries | Use HTMLMediaElement/WebCodecs where supported; preserve timing/texture handoff semantics |
| Persistence | `OpenTaiko/OpenTaiko.csproj` and database code | Local filesystem and native SQLite/LightningDB assumptions | IndexedDB/OPFS adapter or browser-supported SQLite; keep save/schema compatibility |
| Lua / skins | `OpenTaiko/src/Lua`, `OpenTaiko/Global/Modules` | Existing Lua runtime and asset path assumptions | Preserve Lua modules and skin assets; make resource resolution asynchronous/browser-safe without changing screen definitions |

### Verified dependency facts

- `OpenTaiko/OpenTaiko.csproj` targets `net10.0`, references FDK, FFmpeg.AutoGen, LightningDB, SQLite/EF Core, NLua, SevenZip and other packages.
- `FDK/FDK.csproj` references Silk.NET.Windowing, Silk.NET.Input, Silk.NET.OpenGLES, ManagedBass, FFmpeg.AutoGen, SkiaSharp and HarfBuzz.
- `Game.cs` directly imports Silk windowing/SDL/GLFW and OpenGLES APIs.
- `CTexture.cs` directly calls the static `Game.Gl` OpenGL context.
- `IInputDevice.cs` exposes `Silk.NET.Input.IInputDevice`.
- `ISoundDevice.cs` exposes ManagedBass stream procedure types.

These facts mean a simple `dotnet publish` target switch is not a working browser port.

## Implementation order

### Phase 0 — isolate and prove the browser host (this branch)
- Keep the existing Worker deployment untouched.
- Record the exact native boundaries and required adapters.
- Build a tiny .NET browser-host experiment that can create a canvas WebGL2 context, receive keyboard/pointer events, and schedule a frame. This is only a host proof, not the game.

### Phase 1 — make FDK hostable without changing screens
- Move desktop window creation and frame scheduling behind a host interface.
- Move GL context acquisition behind a renderer host interface while keeping `CTexture` and all stage call sites stable.
- Make input polling consume normalized events from either Silk or browser host.
- Keep desktop and iOS implementations working; browser is additive.

### Phase 2 — audio, storage and media
- Add a Web Audio-backed sound device with deterministic chart-clock timing and latency calibration.
- Add browser song/skin file access and IndexedDB/OPFS save storage.
- Replace native video/audio decode paths only for browser target.

### Phase 3 — run original game screens
- Load the existing OpenTaiko startup stage and default skin.
- Verify title → song select → play → result using original stage classes and assets.
- Run TJA fixtures against existing chart/game logic and compare judgement timing.
- Only after this is successful may the project be described as an OpenTaiko browser/WASM port.

## Acceptance criteria

- No replacement HTML game screens or hand-drawn gameplay renderer.
- Original C# stage classes are instantiated.
- Original skin/Lua modules are loaded.
- Existing chart parser and gameplay judgement code are used.
- Audio clock drift and input latency are measured on iPad Safari.
- CI produces a browser artifact and a smoke test confirms WebGL2 + audio + input.
- Existing Worker and current production URL are not changed until the browser build passes.

## Important limitation

The source audit is not a completed port. This branch intentionally does not add an unbuildable project file or a fake WASM artifact. The first executable deliverable is the browser-host proof; integrating the real runtime comes after its interfaces are defined and tested.

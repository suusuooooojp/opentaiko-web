# Browser host proof

This is a deliberately minimal browser platform host, not an alternative game UI.

It provides:
- WebGL2 context and resize handling
- requestAnimationFrame scheduling
- normalized keyboard and pointer event queue
- gamepad snapshots
- Web Audio context, decode and scheduling
- browser file picker and ArrayBuffer access
- IndexedDB settings/file storage

It draws nothing and contains no menu, note renderer, song select or gameplay implementation. Those remain the responsibility of OpenTaiko's original C# stages and skin system.

Open `host.html` through a static HTTP server and inspect `window.openTaikoHost.capabilities` in the browser console. This proves browser APIs only; it does not yet prove that FDK/OpenTaiko can run against the bridge.

## Next integration requirement

Implement a .NET WebAssembly host that imports this module through JS interop, then adapt FDK's desktop window, GL, sound and input boundaries without changing OpenTaiko stage/UI code.

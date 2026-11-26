// Browser platform host proof for the OpenTaiko runtime.
// This file is a platform bridge only: it does not draw or implement any game UI.
export function createOpenTaikoHost(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError("A canvas element is required");

  const gl = canvas.getContext("webgl2", {
    alpha: false, antialias: true, depth: false, stencil: false,
    premultipliedAlpha: false, preserveDrawingBuffer: false
  });
  const queue = [];
  let audioContext = null;
  let raf = 0;
  let dbPromise = null;

  const push = (type, event) => {
    const rect = canvas.getBoundingClientRect();
    queue.push({
      type,
      code: event.code ?? "",
      key: event.key ?? "",
      button: event.button ?? -1,
      buttons: event.buttons ?? 0,
      pointerId: event.pointerId ?? -1,
      pointerType: event.pointerType ?? "",
      x: "clientX" in event ? (event.clientX - rect.left) * canvas.width / Math.max(1, rect.width) : 0,
      y: "clientY" in event ? (event.clientY - rect.top) * canvas.height / Math.max(1, rect.height) : 0,
      timeStamp: event.timeStamp
    });
  };

  for (const name of ["keydown", "keyup"]) {
    window.addEventListener(name, e => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
      push(name, e);
    }, { passive: false });
  }
  for (const name of ["pointerdown", "pointerup", "pointermove", "pointercancel"]) {
    canvas.addEventListener(name, e => {
      if (name === "pointerdown") canvas.setPointerCapture?.(e.pointerId);
      push(name, e);
    }, { passive: true });
  }
  window.addEventListener("gamepadconnected", e => push("gamepadconnected", e));
  window.addEventListener("gamepaddisconnected", e => push("gamepaddisconnected", e));
  document.addEventListener("visibilitychange", () => push("visibilitychange", {
    key: document.visibilityState, timeStamp: performance.now()
  }));

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl?.viewport(0, 0, width, height);
    }
    return { width, height, dpr };
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  function openDatabase() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open("opentaiko-browser", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
        if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function storeGet(store, key) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction(store, "readonly").objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }
  async function storePut(store, key, value) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  return Object.freeze({
    capabilities: Object.freeze({
      webgl2: !!gl,
      webAudio: typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined",
      indexedDB: typeof indexedDB !== "undefined",
      pointerEvents: typeof PointerEvent !== "undefined",
      gamepad: typeof navigator.getGamepads === "function",
      fileApi: typeof File !== "undefined"
    }),
    getContext() { return gl; },
    getCanvasSize: resize,
    pollEvents() { return queue.splice(0, queue.length); },
    getGamepads() {
      return Array.from(navigator.getGamepads?.() ?? []).filter(Boolean).map(p => ({
        index: p.index, id: p.id, connected: p.connected,
        axes: Array.from(p.axes), buttons: p.buttons.map(b => ({ pressed: b.pressed, value: b.value }))
      }));
    },
    requestFrame(callback) {
      if (typeof callback !== "function") throw new TypeError("callback must be a function");
      cancelAnimationFrame(raf);
      const tick = now => { callback(now); raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    },
    async resumeAudio() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("Web Audio is unavailable");
      audioContext ??= new AudioContextClass({ latencyHint: "interactive" });
      if (audioContext.state !== "running") await audioContext.resume();
      return { currentTime: audioContext.currentTime, sampleRate: audioContext.sampleRate, baseLatency: audioContext.baseLatency ?? 0 };
    },
    async decodeAudio(arrayBuffer) {
      await this.resumeAudio();
      return audioContext.decodeAudioData(arrayBuffer.slice(0));
    },
    scheduleAudio(buffer, when = 0, offset = 0, duration) {
      if (!audioContext || audioContext.state !== "running") throw new Error("Call resumeAudio() from a user gesture first");
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      if (duration == null) source.start(Math.max(audioContext.currentTime, when), offset);
      else source.start(Math.max(audioContext.currentTime, when), offset, duration);
      return { stop: () => source.stop(), startedAt: audioContext.currentTime };
    },
    async pickFiles(accept = "*/*", multiple = true) {
      const input = document.querySelector("#files");
      input.accept = accept;
      input.multiple = multiple;
      return new Promise(resolve => {
        input.onchange = () => resolve(Array.from(input.files ?? []).map(file => ({
          name: file.name, type: file.type, size: file.size, lastModified: file.lastModified, file
        })));
        input.click();
      });
    },
    readFile(file) { return file.arrayBuffer(); },
    storage: Object.freeze({
      get: (key) => storeGet("settings", key),
      put: (key, value) => storePut("settings", key, value),
      getFile: (key) => storeGet("files", key),
      putFile: (key, value) => storePut("files", key, value)
    }),
    dispose() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      audioContext?.close();
      audioContext = null;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    }
  });
}

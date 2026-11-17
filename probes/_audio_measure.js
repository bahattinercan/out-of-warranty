#!/usr/bin/env node
/* Ses sondası ölçüm koşucusu — bağımlılıksız.
 *
 * `probes/_audio_probe.html?measure=1` sayfasını headless Chrome'da açar, sondanın
 * koştuğu temsilî senaryoların ölçümlerini toplar ve kapıları denetler.
 *
 * Neden CDP? Tarayıcıda gerçek Web Audio grafiği gerekiyor; Node'daki vm sahte
 * AudioContext yalnız sözleşmeleri doğrular (bkz. tests/audio.js), tını/seviye
 * ölçmez. Bu koşucu gerçek motoru çalıştırır ama KULAK yerine geçmez: öznel
 * dinleme hâlâ `_audio_probe.html` üzerinden insan tarafından yapılır.
 *
 * Kullanım:
 *   node probes/_audio_measure.js [--json <yol>] [--keep-open]
 * Çıkış kodu: kapılar geçtiyse 0, aksi hâlde 1.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const DEFAULTS = {
  json: path.join(ROOT, "art", "build", "audio-measure.json"),
  timeoutMs: 180000,
  window: "900,700",
};

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

function findBrowser() {
  for (const candidate of CHROME_CANDIDATES) {
    try { if (fs.existsSync(candidate)) return candidate; } catch (error) { /* yoksay */ }
  }
  throw new Error("Chrome/Edge bulunamadı; CHROME_PATH ortam değişkeni ver.");
}

function args() {
  const parsed = { ...DEFAULTS, keepOpen: false };
  const list = process.argv.slice(2);
  for (let i = 0; i < list.length; i++) {
    if (list[i] === "--json") parsed.json = path.resolve(list[++i]);
    else if (list[i] === "--timeout") parsed.timeoutMs = Number(list[++i]) || DEFAULTS.timeoutMs;
    else if (list[i] === "--keep-open") parsed.keepOpen = true;
  }
  return parsed;
}

class Cdp {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = [];
  }
  open() {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.url);
      this.socket.onopen = () => resolve(this);
      this.socket.onerror = (event) => reject(new Error("CDP soketi açılamadı: " + (event.message || "bilinmeyen")));
      this.socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.id && this.pending.has(message.id)) {
          const { resolve: done, reject: fail } = this.pending.get(message.id);
          this.pending.delete(message.id);
          if (message.error) fail(new Error(message.error.message)); else done(message.result);
        } else if (message.method) {
          for (const handler of this.handlers) handler(message);
        }
      };
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  on(handler) { this.handlers.push(handler); }
  close() { try { this.socket.close(); } catch (error) { /* yoksay */ } }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pageTarget(port) {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch (error) { /* tarayıcı henüz açılmadı */ }
    await sleep(150);
  }
  throw new Error("Headless tarayıcı hata ayıklama portu açılmadı.");
}

function gateReport(gates) {
  const checks = [
    ["kırpılma yok", gates.clipFree === true],
    ["tepe ≤ -1 dBFS", gates.peakCeiling === true],
    ["sahneler duyulur (≥ -45 dBFS)", gates.audible === true],
    ["yoğun patlama tepe payı ≤ +9 dB", gates.denseHeadroom != null && gates.denseHeadroom <= 9],
    ["kenar sesler yana düşer (|denge| ≥ 0.5)", gates.spatialEdges === true],
    ["merkez ses merkezde (|denge| ≤ 0.15)", gates.spatialCenter === true],
    ["mono/mobil miks merkezde (|denge| ≤ 0.05)", gates.monoSafe === true],
    ["kritik ses müziğin ≥ 12 dB üstünde", gates.maskingMarginDb != null && gates.maskingMarginDb >= 12],
    ["kritik tepe müzik tepesinin ≥ 3 dB üstünde", gates.hitOverMusicPeakDb != null && gates.hitOverMusicPeakDb >= 3],
    ["silah tınıları ayrışır (merkez oranı ≥ 1.5×)", gates.weaponCentroidSpread != null && gates.weaponCentroidSpread >= 1.5],
  ];
  return checks;
}

(async () => {
  const options = args();
  const browser = findBrowser();
  const port = 9300 + Math.floor(Math.random() * 90);
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdp-audio-"));
  const pageUrl = pathToFileURL(path.join(ROOT, "probes", "_audio_probe.html")).href + "?measure=1";

  const child = spawn(browser, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--hide-scrollbars",
    "--autoplay-policy=no-user-gesture-required",
    `--window-size=${options.window}`,
    "about:blank",
  ], { stdio: "ignore" });

  let cdp = null;
  const consoleErrors = [];
  let exitCode = 0;
  try {
    const target = await pageTarget(port);
    cdp = await new Cdp(target.webSocketDebuggerUrl).open();
    cdp.on((message) => {
      if (message.method === "Runtime.exceptionThrown") {
        consoleErrors.push("istisna: " + (message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text));
      } else if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        consoleErrors.push("konsol: " + message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" "));
      }
    });
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");
    await cdp.send("Page.navigate", { url: pageUrl });

    const started = Date.now();
    let result = null;
    while (Date.now() - started < options.timeoutMs) {
      await sleep(700);
      const evaluation = await cdp.send("Runtime.evaluate", {
        expression: "JSON.stringify({ result: window.__measureResult || null, error: window.__measureError || null })",
        returnByValue: true,
      });
      const payload = JSON.parse(evaluation.result.value || "{}");
      if (payload.error) throw new Error("Sonda hatası: " + payload.error);
      if (payload.result) { result = payload.result; break; }
    }
    if (!result) throw new Error(`Ölçüm ${options.timeoutMs} ms içinde tamamlanmadı.`);

    const checks = gateReport(result.gates);
    console.log("Ses ölçümü (headless Chrome, gerçek motor)\n");
    console.log("Sahneler:");
    for (const [key, scene] of Object.entries(result.scenes)) {
      console.log(`  ${key.padEnd(11)} tepe ${String(scene.peakDb).padStart(6)} dBFS · RMS ${String(scene.rmsDb).padStart(6)} dBFS · merkez ${String(scene.centroidHz).padStart(5)} Hz · canlı ${scene.maxVoices}`);
    }
    console.log("\nKonum (patlama x → denge):");
    for (const event of result.spatialEvents) {
      console.log(`  x=${String(event.x).padStart(3)} tepe ${String(event.peakDb).padStart(6)} dBFS · denge ${String(event.balanceDb).padStart(6)} dB · oran ${event.panRatio}`);
    }
    console.log("Mono/mobil simülasyonu:");
    for (const event of result.monoSpatial || []) {
      console.log(`  x=${String(event.x).padStart(3)} oran ${event.panRatio} (merkez beklenir)`);
    }
    console.log("\nSilah tınıları (tepe / merkez):");
    for (const weapon of result.weapons) {
      console.log(`  ${weapon.id.padEnd(14)} ${String(weapon.peakDb).padStart(6)} dBFS · ${String(weapon.centroidHz).padStart(5)} Hz`);
    }
    console.log("\nKapılar:");
    for (const [label, pass] of checks) console.log(`  ${pass ? "✓" : "✗"} ${label}`);
    console.log(`\nMaskeleme payı: ${result.gates.maskingMarginDb} dB (müzik RMS) · ${result.gates.hitOverMusicPeakDb} dB (müzik tepe) · yoğun patlama payı: ${result.gates.denseHeadroom} dB · tını oranı: ${result.gates.weaponCentroidSpread}×`);
    if (consoleErrors.length) {
      console.log("\nKonsol hataları:");
      for (const line of consoleErrors) console.log("  " + line);
    }
    const failed = checks.filter(([, pass]) => !pass);
    if (failed.length || consoleErrors.length) exitCode = 1;

    fs.mkdirSync(path.dirname(options.json), { recursive: true });
    fs.writeFileSync(options.json, JSON.stringify({ ...result, checks, consoleErrors }, null, 2));
    console.log(`\nRapor: ${path.relative(ROOT, options.json)}`);
    console.log(exitCode === 0 ? "Ses ölçüm kapıları geçti ✅" : "Ses ölçüm kapıları KALDI ✗");
  } catch (error) {
    exitCode = 1;
    console.error("Ölçüm başarısız: " + (error && error.message || error));
  } finally {
    if (cdp && options.keepOpen) await sleep(1500);
    try { cdp?.close(); } catch (error) { /* yoksay */ }
    if (options.keepOpen) console.log("Tarayıcı açık bırakıldı (--keep-open): " + pageUrl);
    child.kill();
    if (!options.keepOpen) {
      try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (error) { /* kilitli olabilir */ }
    }
    process.exitCode = exitCode;
  }
})();

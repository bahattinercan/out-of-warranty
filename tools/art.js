#!/usr/bin/env node
/* art.js — AI sanat üretim hattının orkestrasyonu (bağımlılıksız).
 *
 * Plan: docs/art-uretim-plani-ai3090.md — Faz A.
 * Boru hattı: gen (ai3090'da Z-Image) → pick (art-prep.py ile hazırla) → index
 * (js/assets-manifest.js üret) → check (art-gate.js).
 *
 * Neden bu dosya var: her varlığın prompt'u, seed'i ve paleti kayıtlı olmalı;
 * "beğendim bunu koy" elle kopyalama olursa yeniden üretilemez ve stil kayması
 * fark edilmez. Manifest tek doğruluk kaynağı, `js/assets-manifest.js` onun
 * çalışma anındaki kopyası (file://'de fetch yasak).
 *
 * Kullanım:
 *   node tools/art.js gen --zone scrapyard --layer far --prompt "..." [--n 6] [--size 1920x1080]
 *   node tools/art.js pick --id bg/scrapyard-far --src art/build/scrapyard/far/cand-02-seed140034.png
 *   node tools/art.js index
 *   node tools/art.js list
 *   node tools/art.js check
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "assets", "manifest.json");
const INDEX_JS = path.join(ROOT, "js", "assets-manifest.js");
const BUILD = path.join(ROOT, "art", "build");
const IS_WIN = process.platform === "win32";

// Katman kuyrukları `assets/styles/card.md` §2 ile aynı olmak zorunda.
const LAYER_TAIL = {
  far: ", distant industrial silhouette layer, horizontal band composition, matte flat shading, no perspective distortion, side view",
  mid: ", isolated foreground machinery silhouette, flat pure green #00ff00 background, no shadow on background, no gradient background, centered",
  tex: ", seamless tileable texture, top-down flat lighting, even edges, no vignette, no objects",
  ui: ", isolated ui panel piece, centered, flat shading, pure green #00ff00 background",
};

// Varlık tipine göre hazırlama varsayılanları (art-prep.py argümanları).
const PICK_DEFAULTS = {
  // Uzak katman: moloz gürültüsü sadeleştirilir (kullanıcı geri bildirimi 2026-11-14).
  // Uzak katman: moloz gürültüsü master üzerinde sadeleştirilir (kullanıcı geri bildirimi 2026-11-14).
  far: { size: "960x540", alpha: "none", sat: 0.45, simplify: 7, haze: 0.2, q: 82, tile: false },
  // Orta katman gökyüzünün önünde koyu silüet olmalı: doygunluk kısılır, değer düşürülür.
  mid: { size: "960x540", alpha: "chroma", sat: 0.15, value: 0.9, band: 0.42, q: 82, tile: false },
  tex: { size: "512x512", alpha: "none", sat: 0.42, q: 84, tile: true },
  ui: { size: "512x512", alpha: "chroma", sat: 0.6, q: 84, tile: false },
  portraits: { size: "256x256", alpha: "chroma", sat: 0.6, q: 84, tile: false },
  robots: { size: "512x544", alpha: "source", sat: 0.7, q: 84, tile: false },
};

function die(msg, code = 1) {
  console.error("art: " + msg);
  process.exit(code);
}

function readStyleCard() {
  const file = path.join(ROOT, "assets", "styles", "card.md");
  if (!fs.existsSync(file)) die("assets/styles/card.md yok");
  const md = fs.readFileSync(file, "utf8");
  const m = md.match(/```\n([\s\S]*?)```/);
  if (!m) die("card.md içinde ilk ``` bloğu (STYLE_CARD) bulunamadı");
  return m[1].replace(/\s*\n\s*/g, " ").trim();
}

/* Bölge paletleri oyunun kendi kaynağından okunur: kopyalamak, maps.js ile
 * ayrışma riski demek (menü/savaş farklı renk → oyuncu haritayı tanımaz). */
function readZonePalettes() {
  const src = fs.readFileSync(path.join(ROOT, "js", "maps.js"), "utf8");
  const start = src.indexOf("const FACTORY_ZONES = {");
  if (start < 0) die("maps.js içinde FACTORY_ZONES bulunamadı");
  const end = src.indexOf("\n};", start);
  const literal = src.slice(start, end + 3);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(literal + "\n;globalThis.__Z = FACTORY_ZONES;", sandbox);
  const zones = sandbox.__Z;
  const out = {};
  for (const key of Object.keys(zones)) {
    const z = zones[key];
    out[z.zoneId] = { sky: z.sky || [], dirt: z.dirt, accent: z.grassTop };
  }
  return out;
}

function hexToRgb(hex) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb) {
  return "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function mixHex(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}

/* Orta katman paleti: bölgenin toprak renginden türeyen 3 tonlu silüet.
 * Neden bölge paleti değil: 5 renkli bölge paletinde ara değer (gri/yeşilimsi
 * makine gövdesi) en yakın olarak GÖKYÜZÜ rengine düşüyordu ve katman delik
 * gibi görünüyordu (2026-11-14, üçüncü hata). Silüet kendi tonlarıyla kalır. */
function silhouettePalette(zone, steps = 3) {
  const dark = mixHex(zone.dirt, "#000000", 0.45);
  const light = mixHex(zone.dirt, zone.sky[zone.sky.length - 1] || "#ffffff", 0.28);
  if (steps <= 2) return [dark, light];
  return [dark, zone.dirt, light];
}

function toWinPath(p) {
  const m = /^\/([a-zA-Z])\/(.*)$/.exec(p);
  return m ? `${m[1].toUpperCase()}:/${m[2]}` : p;
}

function runAI(prompt, opts) {
  const cmd = [
    "ai", "image", JSON.stringify(prompt),
    "--size", opts.size, "--steps", String(opts.steps),
    "--n", "1", "--seed", String(opts.seed), "--on", opts.node,
  ].join(" ");
  const shell = IS_WIN ? spawnSync("bash", ["-lc", cmd], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    : spawnSync("bash", ["-c", cmd], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const out = (shell.stdout || "") + (shell.stderr || "");
  // Çıktı satırı: `<yol> | 24.2s | seed=N` — yol BOŞLUK içerebilir
  // ("Command Center"), bu yüzden `\S+` yerine satır/pipe sınırı kullanılır.
  const m = out.match(/(\/[^\n|]*?\.png)\s*\|/);
  if (!m) die(`ai image çıktısı okunamadı (seed ${opts.seed}):\n${out.trim().slice(-400)}`);
  return { file: toWinPath(m[1]), stdout: out };
}

function cmdGen(args) {
  const zone = argOf(args, "--zone");
  const layer = argOf(args, "--layer") || "far";
  const scene = argOf(args, "--prompt");
  if (!zone || !scene) die("gen: --zone ve --prompt zorunlu");
  if (!LAYER_TAIL[layer]) die(`gen: bilinmeyen katman '${layer}' (far|mid|tex|ui)`);
  const n = Number(argOf(args, "--n") || 6);
  const size = argOf(args, "--size") || (layer === "far" || layer === "mid" ? "1920x1080" : "1024x1024");
  const steps = Number(argOf(args, "--steps") || 8);
  const node = argOf(args, "--on") || "ai3090";
  const base = Number(argOf(args, "--base") || 140000);

  const dir = path.join(BUILD, zone, layer);
  fs.mkdirSync(dir, { recursive: true });
  const card = readStyleCard();
  const fullPrompt = `${card}${LAYER_TAIL[layer]}, ${scene}`;
  const records = [];

  for (let i = 0; i < n; i++) {
    const seed = base + i * 17;
    process.stdout.write(`gen ${zone}/${layer} ${i + 1}/${n} seed=${seed} … `);
    const res = runAI(fullPrompt, { size, steps, seed, node });
    const name = `cand-${String(i + 1).padStart(2, "0")}-seed${seed}.png`;
    const dest = path.join(dir, name);
    fs.copyFileSync(res.file, dest);
    const kb = (fs.statSync(dest).size / 1024).toFixed(0);
    console.log(`${kb} KB → ${path.relative(ROOT, dest)}`);
    records.push({ file: name, seed, size, steps, prompt: fullPrompt });
  }

  const genFile = path.join(dir, "gen.json");
  const prev = fs.existsSync(genFile) ? JSON.parse(fs.readFileSync(genFile, "utf8")) : {};
  const merged = Object.assign({}, prev);
  for (const r of records) merged[r.file] = r;
  fs.writeFileSync(genFile, JSON.stringify(merged, null, 2) + "\n");
  console.log(`\n${records.length} aday hazır: ${path.relative(ROOT, dir)}`);
  console.log("Seçim insan işi: gözle bakıp en iyi adayı `pick` ile yayına al.");
}

function cmdPick(args) {
  const id = argOf(args, "--id");
  const src = argOf(args, "--src");
  if (!id || !src) die("pick: --id ve --src zorunlu");
  if (!fs.existsSync(src)) die(`pick: kaynak yok: ${src}`);
  const parts = id.split("/");
  // Arka planda tip katmandır (bg/<bölge>-far|mid), diğerlerinde klasör adı.
  const kind = parts[0] === "bg" ? (/-mid$/.test(parts[1] || "") ? "mid" : "far") : parts[0];
  const dflt = PICK_DEFAULTS[kind] || PICK_DEFAULTS.far;

  const size = argOf(args, "--size") || dflt.size;
  const alpha = argOf(args, "--alpha") || dflt.alpha;
  const sat = argOf(args, "--sat") || String(dflt.sat);
  const value = argOf(args, "--value") || String(dflt.value || 1);
  const q = argOf(args, "--q") || String(dflt.q);
  const tile = args.includes("--tile") || dflt.tile;

  // Palet: bg varlıklarında bölge paleti (maps.js'ten), diğerlerinde açık argüman.
  let palette = argOf(args, "--palette");
  let zone = argOf(args, "--zone");
  let floor = argOf(args, "--floor");
  if (!palette && parts[0] === "bg") {
    zone = zone || id.split("/")[1].replace(/-(far|mid)$/, "");
    const zones = readZonePalettes();
    if (!zones[zone]) die(`pick: '${zone}' bölgesi maps.js'te yok`);
    const z = zones[zone];
    palette = (kind === "mid" ? silhouettePalette(z) : z.sky.concat([z.dirt, z.accent]))
      .filter(Boolean).join(",");
    // Uzak katmanda silüetin altındaki boş zemin, bölge toprağının gökyüzüne
    // çekilmiş tonuyla boyanır (hava perspektifi: ön plan arazisinden açık).
    if (kind === "far" && !floor) floor = mixHex(z.dirt, z.sky[z.sky.length - 1] || "#ffffff", 0.18);
  }

  const outRel = `assets/${id}.webp`;
  const pyArgs = [path.join(ROOT, "tools", "art-prep.py"),
    "--in", src, "--out", path.join(ROOT, outRel), "--size", size,
    "--alpha", alpha, "--sat", sat, "--q", q,
  ];
  pyArgs.push("--value", value);
  pyArgs.push("--band", String(dflt.band || 0));
  pyArgs.push("--simplify", String(dflt.simplify || 0));
  if (floor) pyArgs.push("--floor", floor);
  // Arazi üst çizgisi oyunda ~0.62 H; uzak silüet onun üstünde durmalı ki
  // tepelerin arkasından yükselen bir skyline olarak okunsun.
  if (floor) pyArgs.push("--base-at", argOf(args, "--base-at") || "0.62");
  if (dflt.haze) pyArgs.push("--haze", String(dflt.haze));
  if (palette) pyArgs.push("--palette", palette);
  if (tile) pyArgs.push("--tile");

  const py = IS_WIN ? "python" : "python3";
  const run = spawnSync(py, pyArgs, { encoding: "utf8" });
  if (run.status !== 0) die(`art-prep.py başarısız:\n${(run.stderr || "").trim()}`);
  const stats = JSON.parse((run.stdout || "").trim().split("\n").pop());

  // Üretim kaydı (seed/prompt) varsa manifest satırına taşınır → yeniden üretilebilirlik.
  const genFile = path.join(path.dirname(src), "gen.json");
  const gen = fs.existsSync(genFile) ? JSON.parse(fs.readFileSync(genFile, "utf8")) : {};
  const rec = gen[path.basename(src)] || {};

  const manifest = readManifest();
  const entry = {
    id,
    file: outRel,
    w: stats.w,
    h: stats.h,
    alpha: !!stats.alpha,
    kb: stats.kb,
    seed: rec.seed != null ? rec.seed : null,
    size: rec.size || null,
    steps: rec.steps != null ? rec.steps : null,
    prompt: rec.prompt || null,
    generationSource: rec.source || null,
    derivedFrom: rec.derivedFrom || null,
    palette: palette ? palette.split(",") : [],
    zone: zone || null,
    phase: argOf(args, "--phase") || phaseOf(id),
    gate: "pending",
    stats: {
      srcMeanDrift: stats.srcMeanDrift,
      srcMaxDrift: stats.srcMaxDrift,
      coverage: stats.coverage,
      seamLR: stats.seamLR,
      seamTB: stats.seamTB,
    },
  };
  manifest.assets = manifest.assets.filter((a) => a.id !== id).concat([entry])
    .sort((a, b) => a.id.localeCompare(b.id));
  writeManifest(manifest);
  writeIndex(manifest);
  console.log(`${id} → ${outRel} · ${stats.kb} KB · ${stats.w}×${stats.h}` +
    (stats.srcMeanDrift != null ? ` · palet sapması ort ${stats.srcMeanDrift}/azami ${stats.srcMaxDrift}` : ""));
  console.log("Sonraki: node tools/art-gate.js");
}

function phaseOf(id) {
  if (id.startsWith("bg/")) return "B";
  if (id.startsWith("tex/")) return "C";
  if (id.startsWith("ui/")) return "D";
  if (id.startsWith("portraits/")) return "E";
  if (id.startsWith("robots/")) return "R";
  return "?";
}

function readManifest() {
  if (!fs.existsSync(MANIFEST)) return { version: 1, assets: [] };
  const raw = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  if (!Array.isArray(raw.assets)) raw.assets = [];
  return raw;
}

function writeManifest(manifest) {
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
}

// `js/assets-manifest.js` üretilir; art-gate ve release testi ikisinin
// ayrışmadığını denetler (ayrışırsa oyun 404 alır, sessizce prosedürel çizime düşer).
function writeIndex(manifest) {
  const lines = manifest.assets.map((a) => `  ${JSON.stringify(a.id)}: ${JSON.stringify(a.file)},`);
  const body = lines.length ? lines.join("\n") + "\n" : "";
  const src = `/* assets-manifest.js — ÜRETİLMİŞ DOSYA, elle düzenleme.
 *
 * Kaynak: \`assets/manifest.json\`. \`node tools/art.js index\` bu dosyayı yeniden yazar.
 * \`tools/art-gate.js\` ikisinin ayrışmadığını denetler.
 *
 * Neden ayrı bir JS dosyası: oyun \`file://\` üzerinden açılıyor ve \`fetch()\` orada
 * engelli, yani manifest.json çalışma anında okunamıyor. Yüklenecek yolların
 * senkron bir kopyası gerekiyor; bu dosya o kopyadır (klasik script, global const).
 */
const ASSET_INDEX = {
${body}};
`;
  fs.writeFileSync(INDEX_JS, src);
  return manifest.assets.length;
}

function cmdIndex() {
  const count = writeIndex(readManifest());
  console.log(`js/assets-manifest.js yazıldı · ${count} varlık`);
}

function cmdList() {
  const manifest = readManifest();
  if (!manifest.assets.length) { console.log("manifest boş"); return; }
  let total = 0;
  for (const a of manifest.assets) {
    total += a.kb || 0;
    const flags = [a.alpha ? "alfa" : "opak", a.gate || "-"].join("/");
    console.log(`${a.id.padEnd(26)} ${String(a.kb).padStart(7)} KB  ${a.w}×${a.h}  ${flags}`);
  }
  console.log(`\ntoplam ${manifest.assets.length} varlık · ${total.toFixed(1)} KB`);
}

function cmdCheck() {
  const run = spawnSync(process.execPath, [path.join(ROOT, "tools", "art-gate.js")], { stdio: "inherit" });
  process.exit(run.status || 0);
}

function argOf(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case "gen": cmdGen(rest); break;
  case "pick": cmdPick(rest); break;
  case "index": cmdIndex(); break;
  case "list": cmdList(); break;
  case "check": cmdCheck(); break;
  default:
    console.log(`art — sanat üretim hattı

  node tools/art.js gen  --zone <bölge> --layer far|mid|tex|ui --prompt "sahne" [--n 6] [--size 1920x1080] [--base 140000]
  node tools/art.js pick --id bg/<bölge>-far --src art/build/.../cand-02-seed140034.png [--palette "#.."] [--tile]
  node tools/art.js index      assets/manifest.json → js/assets-manifest.js
  node tools/art.js list       manifest özeti + boyut
  node tools/art.js check      tools/art-gate.js kapıları`);
}

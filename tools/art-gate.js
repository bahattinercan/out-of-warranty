#!/usr/bin/env node
/* art-gate.js — sanat varlıklarının kapıları (bağımlılıksız).
 *
 * Plan: docs/art-uretim-plani-ai3090.md §6 (varlık sözleşmesi) ve §7.5 (boyut bütçesi).
 *
 * Ne sınanır:
 *  1. Manifest şeması: zorunlu alanlar dolu, id tekil, dosya adı id ile uyumlu,
 *     prompt ve üretim izi kayıtlı (seed'li model çıktısı veya kaynak aracı/türetilmiş kaynak).
 *  2. Dosya gerçekten var, WebP ve kayıtlı boyut/ölçüyle tutarlı.
 *  3. Grup bütçeleri ve paket üst sınırı (Poki 8 MB).
 *  4. `js/assets-manifest.js` manifest ile aynı (ayrışırsa oyun sessizce 404 alır).
 *  5. Tip kapıları: doku dikişi, alfa kapsamı, arka planın opak olması.
 *  6. Kapsam raporu: kaç bölge/katman hazır (Faz B ilerlemesi) — uyarı, hata değil.
 *
 * Çalıştır: node tools/art-gate.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "assets", "manifest.json");
const INDEX_JS = path.join(ROOT, "js", "assets-manifest.js");

// §7.5 bütçe tablosu (KB).
const BUDGET = [
  { prefix: "bg/", maxKb: 1536, perAsset: 220, label: "arka plan (9×2)" },
  { prefix: "tex/", maxKb: 1229, perAsset: 200, label: "doku (10)" },
  { prefix: "ui/", maxKb: 410, perAsset: 120, label: "UI kiti (9)" },
  { prefix: "portraits/", maxKb: 1024, perAsset: 60, label: "portre (34)" },
  { prefix: "robots/", maxKb: 3072, perAsset: 100, label: "robot sprite (34)" },
  { prefix: "robot-models/", maxKb: 512, perAsset: 24, label: "robot model parts (68 SVG)" },
  { prefix: "atlases/", maxKb: 2048, perAsset: 512, label: "görsel atlasları" },
  { prefix: "weapons/", maxKb: 256, perAsset: 120, label: "silah sprite'ları" },
];
const PACKAGE_MAX_KB = 8 * 1024; // Poki kapısı (tests/release.js ile aynı)
const ZONES = ["scrapyard", "assembly", "warehouse", "cooling", "paint", "loading", "waste", "sandblast", "foundry"];

let pass = 0;
let fail = 0;
const failures = [];
const warnings = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}
function warn(name) { warnings.push(name); }

const manifest = fs.existsSync(MANIFEST)
  ? JSON.parse(fs.readFileSync(MANIFEST, "utf8"))
  : { version: 1, assets: [] };
const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
check("assets/manifest.json okunuyor ve `assets` dizisi var", Array.isArray(manifest.assets));

// ── 1) Şema ───────────────────────────────────────────────────────────────
const ids = new Set();
for (const a of assets) {
  const tag = a && a.id ? a.id : "(id yok)";
  check(`${tag}: zorunlu alanlar dolu`, !!(a.id && a.file && a.w && a.h && a.w > 0 && a.h > 0 &&
    typeof a.kb === "number" && typeof a.alpha === "boolean" && a.phase), JSON.stringify(a && a.id));
  check(`${tag}: id tekil`, !ids.has(a.id));
  ids.add(a.id);
  const modelPart = a.id.startsWith("robot-models/");
  const expectedFile = modelPart
    ? `assets/robot-models/${a.id.slice("robot-models/".length).replace(/-(body|head)$/, "/$1")}.svg`
    : `assets/${a.id}.webp`;
  check(`${tag}: dosya adı id ile uyumlu`, a.file === expectedFile, a.file);
  check(`${tag}: prompt kayıtlı`, typeof a.prompt === "string" && a.prompt.length > 40);
  check(`${tag}: üretim izi kayıtlı`, (Number.isInteger(a.seed) && a.seed > 0) ||
    (typeof a.generationSource === "string" && a.generationSource.length > 0));
  // Uzak katman bölge paletinin tamamını taşır (5 renk); orta katman bilinçli
  // olarak toprak tonlarından türeyen 3 tonlu silüet paleti kullanır (bkz. art.js
  // `silhouettePalette` — 5 renkli palet ara değeri gökyüzüne eşliyordu).
  if (a.id.startsWith("bg/")) {
    const need = a.id.endsWith("-mid") ? 3 : 5;
    check(`${tag}: bölge paleti kayıtlı (≥${need})`, Array.isArray(a.palette) && a.palette.length >= need);
  }
}

// ── 2) Dosya + ölçü ───────────────────────────────────────────────────────
let totalKb = 0;
for (const a of assets) {
  const abs = path.join(ROOT, a.file);
  if (!fs.existsSync(abs)) { check(`${a.id}: dosya var`, false, a.file); continue; }
  const buf = fs.readFileSync(abs);
  const kb = buf.length / 1024;
  totalKb += kb;
  if (a.id.startsWith("robot-models/")) {
    check(`${a.id}: SVG kökü`, buf.toString("utf8").startsWith("<svg "));
  } else {
    check(`${a.id}: WebP imzası`, buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP");
  }
  check(`${a.id}: kayıtlı boyut doğru (${a.kb} KB)`, Math.abs(kb - a.kb) <= Math.max(3, a.kb * 0.06), `${kb.toFixed(1)} KB`);
  const per = (BUDGET.find((b) => a.id.startsWith(b.prefix)) || {}).perAsset;
  if (per) check(`${a.id}: varlık başına bütçe (≤ ${per} KB)`, kb <= per, `${kb.toFixed(1)} KB`);

  // 5) Tip kapıları
  const st = a.stats || {};
  if (a.id.startsWith("bg/") && a.id.endsWith("-far")) {
    check(`${a.id}: uzak katman opak olmalı`, a.alpha === false);
  }
  if (a.id.startsWith("bg/") && a.id.endsWith("-mid")) {
    check(`${a.id}: orta katman alfa taşımalı`, a.alpha === true);
    check(`${a.id}: alfa kapsamı makul (%3–90)`, (st.coverage || 0) >= 3 && (st.coverage || 0) <= 90, `${st.coverage}%`);
  }
  if (a.id.startsWith("tex/")) {
    check(`${a.id}: dikişsiz (LR ≤ 12)`, (st.seamLR || 0) <= 12, `${st.seamLR}`);
    check(`${a.id}: dikişsiz (TB ≤ 12)`, (st.seamTB || 0) <= 12, `${st.seamTB}`);
  }
  if (a.id.startsWith("ui/") || a.id.startsWith("portraits/")) {
    check(`${a.id}: alfa var`, a.alpha === true);
  }
  if (a.id.startsWith("robots/")) {
    check(`${a.id}: alfa var`, a.alpha === true);
  }
  // Palet yakınlığı kalite sinyali: eşik aşılırsa uyarı (kantizasyon zaten düzeltiyor).
  if (st.srcMeanDrift != null && st.srcMeanDrift > 20) {
    warn(`${a.id}: AI çıktısı bölge paletinden uzak (ort ${st.srcMeanDrift}) — prompt'a renk adı ekle`);
  }
}

// ── 3) Bütçeler ───────────────────────────────────────────────────────────
for (const b of BUDGET) {
  const group = assets.filter((a) => a.id.startsWith(b.prefix));
  if (!group.length) continue;
  const sum = group.reduce((s, a) => s + (a.kb || 0), 0);
  check(`${b.label} bütçesi (≤ ${b.maxKb} KB)`, sum <= b.maxKb, `${sum.toFixed(0)} KB / ${group.length} varlık`);
}
check("paket üst sınırı (Poki < 8 MB)", totalKb < PACKAGE_MAX_KB, `${totalKb.toFixed(0)} KB sanat`);

// ── 4) Manifest ↔ çalışma anı indeksi ─────────────────────────────────────
const indexJs = fs.existsSync(INDEX_JS) ? fs.readFileSync(INDEX_JS, "utf8") : "";
for (const a of assets) {
  check(`indeks: ${a.id}`, indexJs.indexOf(`"${a.id}": "${a.file}"`) >= 0);
}
const indexEntries = (indexJs.match(/^\s*"[^"]+":\s*"[^"]+",?$/gm) || []).length;
check("indekste fazladan kayıt yok", indexEntries === assets.length, `indeks ${indexEntries} / manifest ${assets.length}`);

// ── 6) Kapsam raporu ──────────────────────────────────────────────────────
const bgDone = assets.filter((a) => a.id.startsWith("bg/"));
const zonesReady = ZONES.filter((z) =>
  bgDone.some((a) => a.id === `bg/${z}-far`) && bgDone.some((a) => a.id === `bg/${z}-mid`));
console.log("── kapsam ────────────────────────────────────────");
console.log(`arka plan katmanı : ${bgDone.length}/18 · tam bölge ${zonesReady.length}/${ZONES.length}`);
for (const b of BUDGET) {
  const group = assets.filter((a) => a.id.startsWith(b.prefix));
  if (group.length) console.log(`${b.label.padEnd(18)}: ${group.length} varlık · ${group.reduce((s, a) => s + (a.kb || 0), 0).toFixed(0)} KB`);
}
if (!bgDone.length) warn("hiç arka plan varlığı yok — oyun prosedürel çizimde (Faz B bekliyor)");

// ── Özet ──────────────────────────────────────────────────────────────────
console.log("────────────────────────────────────────────────");
for (const w of warnings) console.log("  ⚠ " + w);
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exitCode = 1;
}

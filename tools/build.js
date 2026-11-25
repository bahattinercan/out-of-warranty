#!/usr/bin/env node
/* Kapalı test / demo paketi üreteci (F6) — bağımlılıksız.
 *
 * Ne yapar: yayına girecek dosyaları toplar, sürümü `js/version.js`'ten okur ve
 * itch.io'ya yüklenecek ZIP'i yazar (depolama yöntemi: STORE — sıkıştırma yok,
 * çünkü oyun dosyaları zaten küçük ve tarayıcı açılışında sıkıştırma sunucu
 * tarafında yapılıyor; bağımlılık eklememek için ZIP'i kendimiz yazıyoruz).
 *
 * Kullanım:
 *   node tools/build.js                 → dist/out-of-warranty-<sürüm>.zip + manifest
 *   node tools/build.js --mobile        → dist/out-of-warranty-<sürüm>-mobile.zip + manifest
 *   node tools/build.js --dry           → yalnız dosya listesi + toplam boyut
 *   node tools/build.js --out=C:/yol    → farklı çıktı klasörü
 *
 * Yayın kuralı: pakette YALNIZ oyun çalışır dosyaları olur. `_*.html` sondaları,
 * `tests/`, `docs/`, `tools/`, `screenshots/` ve `.git` DIŞARIDA kalır; bu kural
 * `tests/release.js` ile kilitlidir. Lisans belgeleri paket kökünde yer alır.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
// Paket kökü: index.html + bu klasörlerin tamamı.
const PACKAGE_FILES = ["index.html", "LICENSE", "THIRD-PARTY-NOTICES.md"];
const PACKAGE_DIRS = ["css", "js", "fonts", "assets"];
// Paket dışı bırakılması ZORUNLU desenler (release testi de aynı listeyi kullanır).
const EXCLUDED_PREFIXES = ["_", "tests/", "docs/", "tools/", "probes/", "screenshots/", ".git/", "css/_",
  // Sanat: kaynak doküman ve build-zamanı manifest pakete girmez. Çalışma anında
  // yollar `js/assets-manifest.js`ten geliyor; card.md ise üretim talimatı.
  "assets/styles/", "assets/manifest.json"];
// Source-only rig drafts are intentionally not loaded by index.html until they
// pass visual acceptance and receive a runtime atlas registration.
const UNREGISTERED_RIG_SCRIPTS = new Set([
  "js/rigs/aslan.js", "js/rigs/kaplan.js", "js/rigs/tilki.js"
]);

// ── CRC32 (ZIP gerekli) ─────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── Dosya toplama ───────────────────────────────────────────────────────────

function walk(dir, rel, out) {
  const abs = path.join(dir, rel);
  if (!fs.existsSync(abs)) return out;
  for (const name of fs.readdirSync(abs).sort()) {
    const childRel = rel ? rel + "/" + name : name;
    const childAbs = path.join(dir, childRel);
    const st = fs.statSync(childAbs);
    if (st.isDirectory()) walk(dir, childRel, out);
    else if (st.isFile()) out.push(childRel);
  }
  return out;
}

/* Pakete girecek dosyalar (POSIX yoluyla, sıralı). Desen denetimi burada da
 * uygulanır: yanlışlıkla sonda/test dosyası pakete sızmasın. */
function collectFiles(root) {
  const base = root || ROOT;
  const files = [];
  for (const f of PACKAGE_FILES) if (fs.existsSync(path.join(base, f))) files.push(f);
  for (const d of PACKAGE_DIRS) walk(base, d, files);
  return files
    .filter((rel) => !UNREGISTERED_RIG_SCRIPTS.has(rel))
    .filter((rel) => !EXCLUDED_PREFIXES.some((p) => rel.startsWith(p) || rel.includes("/_") || rel.endsWith(".tmp")))
    .sort();
}

// ── Sürüm ───────────────────────────────────────────────────────────────────

function readVersion(root) {
  const base = root || ROOT;
  const src = fs.readFileSync(path.join(base, "js", "version.js"), "utf8");
  const v = /GAME_VERSION\s*=\s*"([^"]+)"/.exec(src);
  const c = /GAME_CHANNEL\s*=\s*"([^"]+)"/.exec(src);
  if (!v) throw new Error("GAME_VERSION bulunamadı (js/version.js)");
  return { version: v[1], channel: c ? c[1] : "" };
}

// ── ZIP yazımı (STORE) ──────────────────────────────────────────────────────

function dosDateTime(date) {
  const d = date || new Date();
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
  const day = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f);
  return { time, day };
}

/* entries: [{ path, data(Buffer) }] → ZIP Buffer. */
function buildZip(entries, when) {
  const { time, day } = dosDateTime(when);
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.path, "utf8");
    const crc = crc32(e.data);
    const size = e.data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);           // version needed
    local.writeUInt16LE(0x0800, 6);       // UTF-8 ad bayrağı
    local.writeUInt16LE(0, 8);            // STORE
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);        // compressed
    local.writeUInt32LE(size, 22);        // uncompressed
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);           // extra
    locals.push(local, name, e.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);         // version made by
    central.writeUInt16LE(20, 6);         // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(size, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);         // extra
    central.writeUInt16LE(0, 32);         // comment
    central.writeUInt16LE(0, 34);         // disk
    central.writeUInt16LE(0, 36);         // internal attrs
    central.writeUInt32LE(0, 38);         // external attrs
    central.writeUInt32LE(offset, 42);    // local header offset
    centrals.push(central, name);

    offset += local.length + name.length + e.data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([Buffer.concat(locals), centralBuf, eocd]);
}

/* ZIP'i geri okur (testler için): merkezi dizin kayıtları + EOCD doğrulaması.
 * Dönüş: { entries:[{path, crc, size, method, offset}], comment:"" } |
 *        { error: "..." } */
function listZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return { error: "EOCD yok" };
  const total = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (cdOffset + cdSize !== eocd) return { error: "merkezi dizin boyutu tutmuyor" };
  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) return { error: "merkezi dizin imzası bozuk" };
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const csize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commLen = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString("utf8");
    entries.push({ path: name, method, crc, csize, size, offset });
    p += 46 + nameLen + extraLen + commLen;
  }
  return { entries };
}

// ZIP içinden tek dosyayı çıkar (STORE varsayımı; test için yeterli).
function extractStored(buf, entry) {
  const p = entry.offset;
  if (buf.readUInt32LE(p) !== 0x04034b50) return null;
  const nameLen = buf.readUInt16LE(p + 26);
  const extraLen = buf.readUInt16LE(p + 28);
  const start = p + 30 + nameLen + extraLen;
  return buf.slice(start, start + entry.size);
}

// ── Paket üretimi ───────────────────────────────────────────────────────────

function build(opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const outDir = o.out || path.join(root, "dist");
  const target = o.mobile ? "mobile" : "desktop";
  const { version, channel } = readVersion(root);
  const files = collectFiles(root);
  const entries = files.map((rel) => {
    let data = fs.readFileSync(path.join(root, rel));
    if (o.mobile && rel === "index.html") {
      const html = data.toString("utf8");
      if (!html.includes('<html lang="tr">')) throw new Error('Mobil profil işareti için <html lang="tr"> bulunamadı');
      data = Buffer.from(html.replace('<html lang="tr">', '<html lang="tr" data-build-profile="mobile">'), "utf8");
    }
    return { path: rel, data };
  });
  const manifest = {
    version,
    channel,
    target,
    createdAt: new Date().toISOString(),
    totalBytes: entries.reduce((n, e) => n + e.data.length, 0),
    files: entries.map((e) => ({ path: e.path, bytes: e.data.length, crc32: crc32(e.data).toString(16).padStart(8, "0") })),
  };
  if (o.dry) return { version, channel, files: manifest.files, totalBytes: manifest.totalBytes, manifest };

  fs.mkdirSync(outDir, { recursive: true });
  const zipBuf = buildZip(entries, new Date());
  const safeVersion = version.replace(/[^\w.-]/g, "_");
  const suffix = o.mobile ? "-mobile" : "";
  const zipPath = path.join(outDir, "out-of-warranty-" + safeVersion + suffix + ".zip");
  const manifestPath = path.join(outDir, "manifest-" + safeVersion + suffix + ".json");
  fs.writeFileSync(zipPath, zipBuf);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return { version, channel, zipPath, manifestPath, bytes: zipBuf.length, files: manifest.files, totalBytes: manifest.totalBytes, manifest };
}

module.exports = { ROOT, PACKAGE_FILES, PACKAGE_DIRS, EXCLUDED_PREFIXES, crc32, collectFiles, readVersion, buildZip, listZip, extractStored, build };

// ── CLI ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const outArg = args.find((a) => a.startsWith("--out="));
  const mobile = args.includes("--mobile");
  const res = build({ dry, mobile, out: outArg ? outArg.slice(6) : undefined });
  const list = res.files;
  console.log(`sürüm: ${res.version} (${res.channel}) · ${list.length} dosya · ${(res.totalBytes / 1024).toFixed(1)} KB`);
  for (const f of list) console.log(`  ${String(f.bytes).padStart(8)}  ${f.path}`);
  if (dry) {
    console.log("(kuru çalışma: ZIP yazılmadı)");
  } else {
    console.log(`paket: ${res.zipPath} (${(res.bytes / 1024).toFixed(1)} KB)`);
    console.log(`manifest: ${res.manifestPath}`);
  }
}

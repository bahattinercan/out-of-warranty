/* Yayın paketi testi (F6) — "kapalı test ZIP'i eksiksiz mi?" sorusunun bekçisi.
 * Çalıştır: node tests/release.js
 *
 * Ne sınanır:
 *  1. Paket listesi: index.html + css/js/fonts TAM; sonda (`_*.html`), tests,
 *     docs, tools, screenshots DIŞARIDA.
 *  2. index.html'in istediği her script/stil dosyası diskte VAR ve pakette var;
 *     script sırası korunmuş (bağımlılık sırası bozulursa oyun açılmaz).
 *  3. Klasik script kuralı: js dosyalarında üst düzey `import`/`export` yok
 *     (`file://` çift tıklamada ES module çalışmaz).
 *  4. Sürüm tek kaynaktan: `js/version.js` semver; yayın metni aynı sürümü yazar.
 *  5. ZIP gerçekten yazılıyor ve okunabiliyor: merkezi dizin sayısı manifest ile
 *     aynı, `index.html` bayt bayt aynı, CRC'ler tutuyor.
 *  6. Lisans kapisi: paket belgeleri ve font lisanslari eksiksiz.
 *  7. Boyut kapilari: Poki < 8 MB, itch.io < 50 MB.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const B = require("../tools/build.js");

const ROOT = path.resolve(process.env.OOW_RELEASE_ROOT || path.join(__dirname, ".."));

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

// ── 1) Paket listesi ──────────────────────────────────────────────────────
const files = B.collectFiles(ROOT);
const has = (p) => files.indexOf(p) >= 0;
check("paket boş değil", files.length > 20, String(files.length));
for (const required of ["index.html", "css/style.css", "js/game.js", "js/i18n.js", "js/portal.js",
  "js/diagnostics.js", "js/version.js", "js/main.js", "js/net/protocol.js", "js/online-lobby.js"]) {
  check("pakette var: " + required, has(required));
}
check("fontlar pakette", files.filter((f) => f.startsWith("fonts/") && f.endsWith(".woff2")).length === 8,
  String(files.filter((f) => f.startsWith("fonts/") && f.endsWith(".woff2")).length));

const leaked = files.filter((f) =>
  f.startsWith("_") || f.startsWith("tests/") || f.startsWith("docs/") ||
  f.startsWith("tools/") || f.startsWith("probes/") || f.startsWith("screenshots/") || f.endsWith(".tmp") ||
  /(^|\/)_[^/]*\.html$/.test(f) || /(^|\/)_[^/]*\.js$/.test(f));
check("sonda/test/belge dosyası pakete sızmadı", leaked.length === 0, leaked.join(", "));

// ── 1b) Sanat varlıkları: manifest ↔ disk ↔ paket ↔ çalışma anı indeksi ──
// Üçünün ayrışması sessiz bir hatadır: oyun 404 alır, konsola düşer ve prosedürel
// çizime geri döner — yani "AI arka planlar yayında yok" ancak gözle fark edilir.
const artManifest = fs.existsSync(path.join(ROOT, "assets", "manifest.json"))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "manifest.json"), "utf8"))
  : { assets: [] };
const artAssets = Array.isArray(artManifest.assets) ? artManifest.assets : [];
const artNotOnDisk = artAssets.filter((a) => !fs.existsSync(path.join(ROOT, a.file)));
check("sanat varlıklarının hepsi diskte", artNotOnDisk.length === 0, artNotOnDisk.map((a) => a.file).join(", "));
const artNotInPkg = artAssets.filter((a) => !has(a.file));
check("sanat varlıklarının hepsi pakette", artNotInPkg.length === 0, artNotInPkg.map((a) => a.file).join(", "));
const artIndexSrc = fs.readFileSync(path.join(ROOT, "js", "assets-manifest.js"), "utf8");
const artDrift = artAssets.filter((a) => artIndexSrc.indexOf(`"${a.id}": "${a.file}"`) < 0);
check("ASSET_INDEX manifest ile aynı", artDrift.length === 0, artDrift.map((a) => a.id).join(", "));

// ── 2) index.html bağlantıları ve script sırası ───────────────────────────
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const refs = [];
const re = /<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g;
let m;
while ((m = re.exec(html))) refs.push(m[1]);
const missingOnDisk = refs.filter((r) => !fs.existsSync(path.join(ROOT, r)));
check("index.html'in istediği her dosya diskte", missingOnDisk.length === 0, missingOnDisk.join(", "));
const missingInPkg = refs.filter((r) => !has(r.replace(/^\.\//, "")));
check("index.html'in istediği her dosya pakette", missingInPkg.length === 0, missingInPkg.join(", "));

const scriptOrder = [];
const sre = /<script src="js\/([^"]+)"/g;
while ((m = sre.exec(html))) scriptOrder.push(m[1]);
const idx = (f) => scriptOrder.indexOf(f);
const orderRules = [
  ["i18n.js", "game.js"],
  ["version.js", "game.js"],
  ["portal.js", "game.js"],
  ["diagnostics.js", "main.js"],
  ["net/protocol.js", "net/session.js"],
  ["net/protocol.js", "net/transport.js"],
  ["net/session.js", "net/adapter.js"],
  ["net/adapter.js", "online-lobby.js"],
  ["online-lobby.js", "game.js"],
  ["game.js", "main.js"],
];
for (const [a, b] of orderRules) {
  check(`script sırası: ${a} → ${b}`, idx(a) >= 0 && idx(b) >= 0 && idx(a) < idx(b),
    `${a}=${idx(a)} ${b}=${idx(b)}`);
}
// Paketteki her js dosyası index.html'den yüklenmeli; fazladan/eksik script yok.
const pkgJs = files.filter((f) => f.startsWith("js/") && f.endsWith(".js")).map((f) => f.slice(3)).sort();
const loadedJs = scriptOrder.slice().sort();
check("paketteki her js dosyası index.html'de yükleniyor",
  pkgJs.join("|") === loadedJs.join("|"),
  `paket: ${pkgJs.length} · yüklenen: ${loadedJs.length} · fark: ` +
  pkgJs.filter((f) => loadedJs.indexOf(f) < 0).concat(loadedJs.filter((f) => pkgJs.indexOf(f) < 0)).join(","));

// ── 3) Klasik script kuralı ───────────────────────────────────────────────
const jsFiles = files.filter((f) => f.startsWith("js/") && f.endsWith(".js"));
const moduleUsers = jsFiles.filter((f) => {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  return /^\s*(?:import|export)\s/m.test(src);
});
check("js dosyalarında ES module ifadesi yok (file:// kuralı)", moduleUsers.length === 0, moduleUsers.join(", "));
const fetchUsers = jsFiles.filter((f) => {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  // Yerel dosya fetch/decode `file://` CORS yüzünden patlar; CDN yüklemesi serbest.
  return /\bfetch\s*\(\s*["'`]/.test(src);
});
check("js dosyaları yerel varlık fetch etmiyor", fetchUsers.length === 0, fetchUsers.join(", "));

/* Sözdizimi kapısı: paketlenen her js dosyası classic script olarak DERLENEBİLMELİ.
 * Bu kapı gerçek bir hatayı yakaladı: rapor metnindeki kaçış dizisi bozulup
 * diagnostics.js "Uncaught SyntaxError" verdiği hâlde paket testleri yeşildi
 * (dosya yapısal olarak yerindeydi) — oyun ise portal/tanılama olmadan açılıyordu. */
const syntaxErrors = [];
for (const f of jsFiles) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  try { new Function(src); }
  catch (e) { syntaxErrors.push(f + ": " + (e && e.message)); }
}
check("paketteki her js dosyası derleniyor (sözdizimi)", syntaxErrors.length === 0, syntaxErrors.join(" | "));

// ── 4) Sürüm tek kaynaktan ────────────────────────────────────────────────
const ver = B.readVersion(ROOT);
check("sürüm semver biçiminde", /^\d+\.\d+\.\d+$/.test(ver.version), ver.version);
check("sürüm kanalı tanımlı", !!ver.channel, ver.channel);
const itchDoc = fs.readFileSync(path.join(ROOT, "docs", "itch-yayin-metni.md"), "utf8");
check("yayın metni aynı sürümü yazıyor", itchDoc.indexOf(ver.version) >= 0, ver.version);
const projDoc = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
check("CLAUDE.md sürümü yazıyor", projDoc.indexOf(ver.version) >= 0, ver.version);

// ── 4b) Lisans belgeleri ─────────────────────────────────────────────
const licenseNotice = fs.existsSync(path.join(ROOT, "THIRD-PARTY-NOTICES.md"))
  ? fs.readFileSync(path.join(ROOT, "THIRD-PARTY-NOTICES.md"), "utf8") : "";
const licenseText = fs.existsSync(path.join(ROOT, "LICENSE"))
  ? fs.readFileSync(path.join(ROOT, "LICENSE"), "utf8") : "";
check("pakette var: LICENSE", has("LICENSE"));
check("pakette var: THIRD-PARTY-NOTICES.md", has("THIRD-PARTY-NOTICES.md"));
check("LICENSE hak saklidir ifadesi iceriyor", licenseText.includes("All rights reserved"));
check("ucuncu taraf bildirimi SIL OFL, PeerJS ve MIT iceriyor",
  ["SIL Open Font License", "PeerJS", "MIT"].every((term) => licenseNotice.includes(term)));
const fontLicenses = ["fonts/LICENSE-ChakraPetch.txt", "fonts/LICENSE-RussoOne.txt"];
for (const fontLicense of fontLicenses) {
  check("font lisansi pakette: " + fontLicense, has(fontLicense));
  const text = fs.existsSync(path.join(ROOT, fontLicense))
    ? fs.readFileSync(path.join(ROOT, fontLicense), "utf8") : "";
  check("font lisansi OFL 1.1 iceriyor: " + fontLicense,
    text.includes("SIL OPEN FONT LICENSE Version 1.1"));
}
const fontFamilies = [
  { family: "ChakraPetch", licenses: ["fonts/LICENSE-ChakraPetch.txt"] },
  { family: "RussoOne", licenses: ["fonts/LICENSE-RussoOne.txt"] },
];
for (const { family, licenses } of fontFamilies) {
  const shipped = files.some((f) => f.startsWith("fonts/") && f.endsWith(".woff2") && f.includes(family));
  check("woff2 ailesinin lisansi pakette: " + family, !shipped || licenses.some(has));
}

// ── 5) ZIP gerçekten yazılıyor ve okunabiliyor ────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "oow-build-"));
let built = null;
try {
  built = B.build({ root: ROOT, out: tmp });
  check("ZIP yazıldı", !!built.zipPath && fs.existsSync(built.zipPath), String(built.zipPath));
  const buf = fs.readFileSync(built.zipPath);
  const listed = B.listZip(buf);
  check("ZIP merkezi dizini okunuyor", !listed.error, listed.error);
  if (!listed.error) {
    check("ZIP girdi sayısı manifest ile aynı", listed.entries.length === built.files.length,
      `${listed.entries.length} / ${built.files.length}`);
    const names = listed.entries.map((e) => e.path).sort();
    const want = built.files.map((f) => f.path).sort();
    check("ZIP içerik listesi manifest ile aynı", names.join("|") === want.join("|"));
    check("ZIP'te sıkıştırma yok (STORE)", listed.entries.every((e) => e.method === 0));
    // Rastgele iki dosyayı bayt bayt karşılaştır.
    for (const probe of ["index.html", "js/game.js"]) {
      const entry = listed.entries.filter((e) => e.path === probe)[0];
      const data = entry ? B.extractStored(buf, entry) : null;
      const original = fs.readFileSync(path.join(ROOT, probe));
      check(`ZIP'ten çıkan ${probe} orijinaliyle aynı`,
        !!data && data.length === original.length && data.equals(original),
        data ? `${data.length} / ${original.length}` : "yok");
      if (data) check(`${probe} CRC doğru`, B.crc32(data) === entry.crc, `${B.crc32(data)} / ${entry.crc}`);
    }
  }
  const manifestOnDisk = JSON.parse(fs.readFileSync(built.manifestPath, "utf8"));
  check("manifest dosyası yazıldı ve sürümü taşıyor", manifestOnDisk.version === ver.version);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ── 7) Boyut kapilariıları ─────────────────────────────────────────────────────
const kb = (built ? built.totalBytes : 0) / 1024;
check("paket Poki sınırının altında (< 8 MB)", kb < 8 * 1024, `${kb.toFixed(1)} KB`);
check("paket itch.io sınırının altında (< 50 MB)", kb < 50 * 1024, `${kb.toFixed(1)} KB`);
check("paket makul büyüklükte (> 300 KB — eksik dosya olmasın)", kb > 300, `${kb.toFixed(1)} KB`);

// ── Özet ──────────────────────────────────────────────────────────────────
console.log("────────────────────────────────────────────────");
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exitCode = 1;
}

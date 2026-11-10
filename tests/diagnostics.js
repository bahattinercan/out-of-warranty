/* Tanılama testi (F6) — kapalı testteki 🐞 Rapor düğmesinin davranışı.
 * Çalıştır: node tests/diagnostics.js
 *
 * Ne sınanır: hata yakalama (error + unhandledrejection) ve düğmeyi gösterme,
 * ?rapor=1 ile düğmenin açık gelmesi, rapor metninin alanları (sürüm/kanal/
 * durum/FPS/kayıtlar), panoya kopyalama (clipboard API + execCommand yedeği),
 * ağa hiçbir şey göndermemesi (yalnız yerel) ve kayıt sınırı (bellek).
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "js");
// i18n.js yüklenmez: açılışta DOM'a bağlanır. Tanılama `getLocale` yoksa
// dil alanını boş bırakır (typeof koruması) — testin odağı bu değil.
const FILES = ["version.js", "portal.js", "diagnostics.js"];

// ── Sahte DOM (yalnız tanılamanın dokunduğu yüzey) ─────────────────────────
function makeEnv(opts) {
  const o = opts || {};
  const listeners = {};
  const els = new Map();
  const clipboard = { text: null, throws: false };
  function el(id) {
    return {
      id, _cls: new Set(), textContent: "",
      classList: {
        add(c) { this._s = this._s || new Set(); this._s.add(c); },
        remove(c) { this._s = this._s || new Set(); this._s.delete(c); },
        contains(c) { return !!(this._s && this._s.has(c)); },
      },
      setAttribute() {}, appendChild() {}, removeChild() {}, select() {}, style: {},
    };
  }
  const document = {
    getElementById(id) {
      if (!els.has(id)) els.set(id, el(id));
      return els.get(id);
    },
    createElement(tag) { const e = el("tmp-" + tag); e.value = ""; els.set(e.id, e); return e; },
    execCommand: () => (o.execCommand === undefined ? true : o.execCommand),
    body: { appendChild() {}, removeChild() {} },
  };
  const window = {
    addEventListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    location: { search: o.search || "" },
    dispatch(ev, payload) { for (const fn of listeners[ev] || []) fn(payload); },
  };
  const navigator = o.noClipboard
    ? {}
    : { clipboard: { writeText(text) { if (clipboard.throws) throw new Error("izin yok"); clipboard.text = text; } } };
  return { document, window, navigator, clipboard, els, listeners };
}

function load(env) {
  const sandbox = {
    console, Math, JSON, Object, Array, String, Number, Boolean, Promise, Error, Date, Set, Map, Infinity, NaN,
    document: env.document, window: env.window, navigator: env.navigator, location: env.window.location,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(FILES.map((f) => fs.readFileSync(path.join(JS_DIR, f), "utf8")).join("\n;\n") +
    "\n;globalThis.__D = { DIAG, GAME_VERSION, GAME_CHANNEL, reportTextFor: () => DIAG.reportText() };",
  sandbox, { filename: "diag-bundle.js" });
  return sandbox.__D;
}

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

// ── 1) Kurulum + hata yakalama ────────────────────────────────────────────
const env = makeEnv({});
const D = load(env);
const wrap = env.document.getElementById("report-control");
wrap.classList.add("hidden");
const game = { state: "AIMING", mode: "computer", players: [1, 2], turnId: 7, storageOk: true, profile: { scrap: 123, robots: { a: 1, b: 2 } }, online: null };

check("install ilk çağrıda kurulur", D.DIAG.install({ game }) === true);
check("ikinci install yok sayılır", D.DIAG.install({ game }) === false);
check("kurulumda FPS 0, hata yok", D.DIAG.fps === 0 && D.DIAG.errors.length === 0);

env.window.dispatch("error", { message: "test hatası", filename: "js/game.js", lineno: 42 });
check("pencere hatası kaydedilir", D.DIAG.errors.length === 1 && D.DIAG.errors[0].message === "test hatası");
check("hata dosya/satır bilgisi taşır",
  D.DIAG.errors[0].extra.source === "game.js" && D.DIAG.errors[0].extra.line === "42",
  JSON.stringify(D.DIAG.errors[0].extra));
check("hata olunca rapor düğmesi görünür", wrap.classList.contains("hidden") === false);
env.window.dispatch("unhandledrejection", { reason: new Error("söz reddi") });
check("reddedilen söz kaydedilir", D.DIAG.errors.length === 2 && /söz reddi/.test(D.DIAG.errors[1].message));

// Kayıt sınırı: 20'yi aşınca en eskiler düşer.
for (let i = 0; i < 30; i++) D.DIAG.record("note", "n" + i);
check("kayıt listesi sınırlı (bellek)", D.DIAG.errors.length === 20, String(D.DIAG.errors.length));
check("en yeni kayıt korunur", D.DIAG.errors[19].message === "n29", D.DIAG.errors[19].message);

// ── 2) FPS örnekleme ──────────────────────────────────────────────────────
const D2 = load(makeEnv({}));
D2.DIAG.frame(1000);           // pencere başlangıcı
for (let i = 0; i < 32; i++) D2.DIAG.frame(1000 + (i + 1) * 33);   // ~31 kare / 1 sn
check("FPS ölçülür (30 kare ≈ 30 fps)", D2.DIAG.fps >= 25 && D2.DIAG.fps <= 35, String(D2.DIAG.fps));

// ── 3) Rapor metni ────────────────────────────────────────────────────────
D.DIAG.frame(0);
D.DIAG.frame(2000);
const text = D.DIAG.reportText();
check("rapor sürüm + kanal taşır", text.indexOf(D.GAME_VERSION) >= 0 && text.indexOf(D.GAME_CHANNEL) >= 0);
check("rapor oyun durumunu taşır", /state: AIMING/.test(text) && /mode: computer/.test(text));
check("rapor profil/depolama bilgisi taşır", /profile: scrap=123 robots=2 storage=ok/.test(text));
D.DIAG.record("error", "son hata");
const text2 = D.DIAG.reportText();
check("rapor son kayıtları taşır", /log:/.test(text2) && /\[error\] son hata/.test(text2));
check("rapor Türkçe UI metni içermez (teknik etiketler)", !/hata raporu|sürüm:/.test(text));
const snap = D.DIAG.snapshot();
check("snapshot makine-okunur alanlar", snap.version === D.GAME_VERSION && snap.diag === 1 && snap.state === "AIMING");
check("snapshot ağ/portal bilgisi içerir", snap.portal && snap.portal.provider === "none" && snap.online === null);

// ── 4) Panoya kopyalama ───────────────────────────────────────────────────
check("clipboard API ile kopyalanır", D.DIAG.copyReport() === true);
check("panoya yazılan metin raporu taşır",
  !!env.clipboard.text && env.clipboard.text.indexOf(D.GAME_VERSION) > 0 && /state: AIMING/.test(env.clipboard.text));

const envNoClip = makeEnv({ noClipboard: true, execCommand: true });
const D3 = load(envNoClip);
check("clipboard yokken execCommand yedeği çalışır", D3.DIAG.copyReport() === true);
const envBad = makeEnv({ noClipboard: true, execCommand: false });
const D4 = load(envBad);
check("kopyalama başarısızsa false döner (düğme geri bildirim verir)", D4.DIAG.copyReport() === false);

// ── 5) ?rapor=1 ile düğme açık gelir ─────────────────────────────────────
const envRep = makeEnv({ search: "?rapor=1" });
const D5 = load(envRep);
const wrap5 = envRep.document.getElementById("report-control");
wrap5.classList.add("hidden");
D5.DIAG.install({});
check("?rapor=1 düğmeyi görünür yapar", wrap5.classList.contains("hidden") === false);

// ── 6) Ağa çıkmadığının kanıtı: tanılama yalnız yerel API kullanır ───────
const diagSrc = fs.readFileSync(path.join(JS_DIR, "diagnostics.js"), "utf8");
check("tanılama fetch/XHR/WebSocket kullanmaz",
  !/\bfetch\s*\(/.test(diagSrc) && !/XMLHttpRequest/.test(diagSrc) && !/WebSocket/.test(diagSrc));

// ── Özet ─────────────────────────────────────────────────────────────────
console.log("────────────────────────────────────────────────");
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exitCode = 1;
}

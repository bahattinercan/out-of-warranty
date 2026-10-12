/* Yerelleştirme regresyonları — saf Node, bağımlılıksız.
 * Çalıştır: node tests/i18n.js
 *
 * Sözleşme: kod içindeki her t("...") anahtarının sözlükte karşılığı olmalı,
 * sözlükte kodda kullanılmayan anahtar kalmamalı (yazım hatası bekçisi),
 * zorunlu diller (i18n.js > LANG_REQUIRED) tam çevrilmiş olmalı ve her t()
 * çağrısı Türkçe kaynak metnini taşımalıdır — TR sözlüğü bilerek boştur,
 * dolayısıyla fallback'siz bir çağrı ekranda anahtar gösterir.
 * Ayrıca: fallback zinciri, kalıp ({ad}) doldurma, dil etiketi normalizasyonu,
 * dil tercihinin kalıcılığı ve DOM'suz ortamda (Node) guard davranışı.
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "js");
const I18N_SRC = fs.readFileSync(path.join(JS_DIR, "i18n.js"), "utf8");
const EXPORT = "\n;globalThis.__I18N_TEST = { I18N, LANG_ORDER, LANG_LABELS, LANG_REQUIRED, " +
  "I18N_DYNAMIC_PREFIXES, I18N_STORAGE_KEY, t, setLocale, getLocale, normalizeLocale, applyDomTranslations };";

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

// i18n.js'in DOM yolu (metin / title / aria-label) Node'da sınanabilsin diye
// minik bir sahte document: querySelectorAll yalnız üç öznitelik seçicisine
// yanıt verir, gerisi boş döner.
function fakeDocument() {
  const mk = (attrs, text) => ({
    textContent: text,
    _attrs: Object.assign({}, attrs),
    getAttribute(k) { return this._attrs[k] === undefined ? null : this._attrs[k]; },
    setAttribute(k, v) { this._attrs[k] = v; },
  });
  const textNode = mk({ "data-i18n": "hud.fullscreen" }, "Tam Ekran");
  const titleNode = mk({ "data-i18n-title": "hud.quit.title", title: "Menüye dön (Esc)" }, "");
  const ariaNode = mk({ "data-i18n-aria": "hud.robots" }, "");
  ariaNode._attrs["aria-label"] = "Robotlar";
  return {
    textNode, titleNode, ariaNode,
    querySelectorAll(sel) {
      if (sel === "[data-i18n]") return [textNode];
      if (sel === "[data-i18n-title]") return [titleNode];
      if (sel === "[data-i18n-aria]") return [ariaNode];
      return [];
    },
    getElementById() { return null; },
  };
}

// i18n.js'i taze bir sandbox'ta yükler. `navigator: null` → tarayıcı dili yok;
// `noStorage: true` → localStorage erişilemiyor (gizli sekme senaryosu);
// `fakeDom: true` → DOM çeviri yolu sınanır.
function boot(opts) {
  const o = opts || {};
  const storage = Object.assign({}, o.storage);
  const sandbox = { console, Math, Object, Array, Set, Map, String };
  if (o.navigator !== null) sandbox.navigator = o.navigator || { language: "tr-TR" };
  if (o.fakeDom) sandbox.document = fakeDocument();
  if (o.noStorage !== true) {
    sandbox.localStorage = {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
    };
  }
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(I18N_SRC + EXPORT, sandbox, { filename: "i18n-bundle.js" });
  return { api: sandbox.__I18N_TEST, storage, document: sandbox.document || null };
}

const I = boot().api;

// Dinamik anahtar ailelerinin kapsadığı kimlikler gerçek kataloglardan gelir:
// yeni bir dal/yuva eklenirse çeviri anahtarı da eklenmelidir (yoksa EN'de
// sessizce Türkçe görünür).
const idsSrc = ["progression.js", "parts.js"]
  .map((f) => fs.readFileSync(path.join(JS_DIR, f), "utf8")).join("\n;\n") +
  "\n;globalThis.__IDS = { BRANCHES, BRANCH_LABELS, SLOT_LABELS };";
const idSandbox = { console, Math, Object, Array, Set, Map, String };
idSandbox.globalThis = idSandbox;
vm.createContext(idSandbox);
vm.runInContext(idsSrc, idSandbox, { filename: "ids-bundle.js" });
const IDS = idSandbox.__IDS;

// ── 1) Kod içindeki anahtarlar ─────────────────────────────────────────────
const codeFiles = fs.readdirSync(JS_DIR).filter((f) => f.endsWith(".js"));
const usedKeys = new Set(), keysWithFallback = new Set(), dynamicUsed = new Set();
// `\+` yakalaması: `t("workshop.branch." + branch, ...)` gibi ÇALIŞMA ZAMANINDA
// üretilen anahtarlar. Bunlar sabit anahtar değildir; önek olarak bildirilmeleri
// gerekir (I18N_DYNAMIC_PREFIXES) ve kapsadıkları kimlikler kataloglardan
// doğrulanır.
const callRe = /\bt\(\s*"([^"]+)"\s*(\+|,)?/g;
for (const f of codeFiles) {
  const src = fs.readFileSync(path.join(JS_DIR, f), "utf8");
  let m;
  while ((m = callRe.exec(src))) {
    if (m[2] === "+") { dynamicUsed.add(m[1]); continue; }
    usedKeys.add(m[1]);
    if (m[2] === ",") keysWithFallback.add(m[1]);
  }
}
check("kodda t() anahtarı bulundu", usedKeys.size > 0, `${usedKeys.size} anahtar`);

// index.html'deki data-i18n* öznitelikleri de anahtar kullanır; öğenin kendi
// Türkçe metni/başlığı o anahtarın TR kaynağıdır (t() fallback'i gerekmez).
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const htmlKeys = new Set();
const attrRe = /data-i18n(?:-title|-aria)?="([^"]+)"/g;
let hm;
while ((hm = attrRe.exec(html))) { htmlKeys.add(hm[1]); usedKeys.add(hm[1]); }
check("index.html i18n özniteliği taşıyor", htmlKeys.size >= 15, `${htmlKeys.size} anahtar`);

const missingInEn = [...usedKeys].filter((k) => I.I18N.en[k] === undefined);check("kullanılan her anahtar `en` sözlüğünde var", missingInEn.length === 0, missingInEn.join(", "));

const isDynamicKey = (k) => I.I18N_DYNAMIC_PREFIXES.some((p) => k.startsWith(p));
const orphan = Object.keys(I.I18N.en).filter((k) => !usedKeys.has(k) && !isDynamicKey(k));
check("sözlükte kodda kullanılmayan anahtar yok", orphan.length === 0, orphan.join(", "));

// Dinamik aileler: önek gerçekten karşılık buluyor mu ve katalog kimlikleri
// eksiksiz çevrilmiş mi?
for (const pre of I.I18N_DYNAMIC_PREFIXES) {
  check(`dinamik önek sözlükte var: ${pre}`, Object.keys(I.I18N.en).some((k) => k.startsWith(pre)));
  check(`bildirilen önek kodda üretiliyor: ${pre}`, dynamicUsed.has(pre));
}
for (const pre of dynamicUsed) {
  check(`kodda üretilen dinamik önek bildirilmiş: ${pre}`, I.I18N_DYNAMIC_PREFIXES.indexOf(pre) >= 0);
}
for (const b of IDS.BRANCHES) {
  check(`dal çevirisi var: ${b}`, I.I18N.en["workshop.branch." + b] !== undefined);
}
for (const sl of Object.keys(IDS.SLOT_LABELS)) {
  check(`yuva çevirisi var: ${sl}`, I.I18N.en["workshop.slot." + sl] !== undefined);
}

for (const lang of I.LANG_REQUIRED) {
  const dict = I.I18N[lang] || {};
  const gap = [...usedKeys].filter((k) => dict[k] === undefined);
  check(`zorunlu dil tam çevrilmiş: ${lang}`, gap.length === 0, gap.slice(0, 8).join(", "));
}

// Her t() çağrısı Türkçe kaynak metnini taşımalı: TR sözlüğü boş olduğu için
// fallback'siz çağrı ekranda ham anahtar ("menu.mode.market.sub") gösterir.
const noTrSource = [...usedKeys].filter((k) => !keysWithFallback.has(k) && !htmlKeys.has(k) && I.I18N.tr[k] === undefined);
check("her t()/data-i18n anahtarı Türkçe kaynak taşıyor", noTrSource.length === 0, noTrSource.join(", "));

// ── 2) Sözlük bütünlüğü ────────────────────────────────────────────────────
const orderSet = new Set(I.LANG_ORDER);
check("her sözlük LANG_ORDER içinde", Object.keys(I.I18N).every((l) => orderSet.has(l)), Object.keys(I.I18N).join(", "));
check("her dilin görünen etiketi var", I.LANG_ORDER.every((l) => !!I.LANG_LABELS[l]));
for (const lang of Object.keys(I.I18N)) {
  const empty = Object.entries(I.I18N[lang]).filter(([, v]) => String(v).trim() === "").map(([k]) => k);
  check(`${lang}: boş çeviri değeri yok`, empty.length === 0, empty.join(", "));
  if (lang === "tr") continue; // TR kaynak sözlüğü kod metinlerini de taşıyabilir
  const extra = Object.keys(I.I18N[lang]).filter((k) => I.I18N.en[k] === undefined);
  check(`${lang}: en'de olmayan anahtar taşımıyor`, extra.length === 0, extra.join(", "));
}

// ── 3) Fallback zinciri ve kalıplar ───────────────────────────────────────
const tr = boot();
check("varsayılan dil tr", tr.api.getLocale() === "tr");
check("tr: çeviri yoksa çağrı metni döner", tr.api.t("menu.mode.workshop.title", "ATÖLYE") === "ATÖLYE");
check("fallback yoksa anahtarın kendisi döner (görünür hata)", tr.api.t("yok.boyle.anahtar") === "yok.boyle.anahtar");
check("DOM yoksa applyDomTranslations güvenli", tr.api.applyDomTranslations() === 0);

const en = boot();
en.api.setLocale("en");
check("en: sözlük değeri", en.api.t("menu.mode.workshop.title", "ATÖLYE") === "WORKSHOP");
check("en: marka başlığı", en.api.t("brand.title", "GARANTİ DIŞI") === "OUT OF WARRANTY");
check("en: kalıp doldurma", (() => {
  const tpl = I.I18N.en["menu.mode.workshop.sub"];
  const filled = en.api.t("menu.mode.workshop.sub", "x", { scrap: 1240 });
  // Kopya metni teste kopyalanmaz: sözlükteki kalıp doldurulmuş sonuçla
  // karşılaştırılır, böylece metin değişince test kırılmaz.
  return filled === tpl.replace("{scrap}", "1240") && filled.indexOf("{") < 0 && filled.indexOf("1240") >= 0;
})(), en.api.t("menu.mode.workshop.sub", "x", { scrap: 1240 }));
check("kalıp: eksik değişken yer tutucu olarak kalır", en.api.t("menu.mode.market.sub", "x", { n: 6 }).indexOf("{scrap}") >= 0);
check("en: bilinmeyen anahtar çağrı metnine düşer", en.api.t("yok.boyle.anahtar", "Yedek") === "Yedek");

// ── 4) Dil etiketi normalizasyonu ve kalıcılık ────────────────────────────
const cases = [["en-US", "en"], ["tr-TR", "tr"], ["zh-CN", "zh-Hans"], ["zh-TW", "zh-Hans"],
  ["ru-RU", "ru"], ["pt-PT", "pt-BR"], ["es-419", "es-ES"], ["de-DE", "en"], ["", "tr"]];
for (const [tag, want] of cases) {
  check(`normalize ${JSON.stringify(tag)} → ${want}`, I.normalizeLocale(tag) === want, `= ${I.normalizeLocale(tag)}`);
}
const nav = boot({ navigator: { language: "en-GB" } });
check("tarayıcı dili ilk açılışta uygulanır", nav.api.getLocale() === "en");
check("ilk tespit depoya yazılmaz", !("nwo_locale" in nav.storage));
const noNav = boot({ navigator: null });
check("tarayıcı dili yoksa tr kalır", noNav.api.getLocale() === "tr");
const saved = boot({ storage: { nwo_locale: "en" }, navigator: { language: "tr-TR" } });
check("kayıtlı tercih tarayıcı dilini ezer", saved.api.getLocale() === "en");
check("kayıtlı tercih yeniden yazılmaz", saved.storage.nwo_locale === "en");
const badSaved = boot({ storage: { nwo_locale: "klingon" } });
check("bozuk kayıtlı tercih → en", badSaved.api.getLocale() === "en");
en.api.setLocale("de-DE");
check("kullanıcı seçimi normalize edilerek saklanır", en.storage.nwo_locale === "en", String(en.storage.nwo_locale));
check("seçim sonrası dil değişti", en.api.getLocale() === "en");
const noStore = boot({ navigator: null, noStorage: true });
check("localStorage yoksa çökmez", noStore.api.getLocale() === "tr");
check("localStorage yokken setLocale çökmez", (() => { try { noStore.api.setLocale("en"); return noStore.api.getLocale() === "en"; } catch (e) { return false; } })());

// ── 5) DOM çeviri yolu (metin / title / aria-label) ───────────────────────
const dom = boot({ fakeDom: true });
const dn = dom.document;
check("DOM: tr'de metin değişmez", dn.textNode.textContent === "Tam Ekran");
dom.api.setLocale("en");
check("DOM: metin çevrilir", dn.textNode.textContent === "Fullscreen", dn.textNode.textContent);
check("DOM: title çevrilir", dn.titleNode._attrs.title === "Back to menu (Esc)", dn.titleNode._attrs.title);
check("DOM: aria-label çevrilir", dn.ariaNode._attrs["aria-label"] === "Robots", dn.ariaNode._attrs["aria-label"]);
const domTrSources = [["data-i18n", "hud.fullscreen"]].length; // yalnız okunurluk için
check("DOM: çevrilen düğüm sayısı döner", dom.api.applyDomTranslations() === 3, String(dom.api.applyDomTranslations()));

// ── 6) Yerel `t` gölgelemesi bekçisi ─────────────────────────────────────
// `const t = this.tutorial;` gibi bir yerel değişken, aynı fonksiyon içindeki
// t() çağrılarını gölgeler ve çalışma zamanında "t is not a function" üretir
// (bu hata iki kez yaşandı: durum şeridi ve eğitim koçu). Kapsamlar süslü
// parantez derinliğiyle bulunur; yorumlar ve string literalleri soyulur.
function clearCode(line) {
  return line
    .replace(/\/\/.*$/, "")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/`(?:\\.|[^`\\])*`/g, "``");
}
const shadowed = [];
for (const f of codeFiles) {
  const src = fs.readFileSync(path.join(JS_DIR, f), "utf8");
  const srcLines = src.split("\n");
  let depth = 0, decl = null;
  const scopes = [];
  for (let i = 0; i < srcLines.length; i++) {
    const code = clearCode(srcLines[i]);
    if (decl !== null && depth < decl.depth) { scopes.push({ start: decl.line, end: i }); decl = null; }
    if (decl === null && /\b(const|let|var)\s+t\s*=/.test(code)) decl = { depth, line: i + 1 };
    depth += (code.match(/{/g) || []).length - (code.match(/}/g) || []).length;
  }
  for (const sc of scopes) {
    const body = srcLines.slice(sc.start - 1, sc.end).join("\n");
    if (/\bt\("/.test(body)) shadowed.push(`${f}:${sc.start}`);
  }
}
check("yerel `t` değişkeni t() çağrısını gölgelemiyor", shadowed.length === 0, shadowed.join(", "));

// ── Özet ──────────────────────────────────────────────────────────────────
console.log(`\ni18n: ${pass} geçti, ${fail} kaldı`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exit(1);
}

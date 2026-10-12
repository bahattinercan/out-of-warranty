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
  "I18N_STORAGE_KEY, t, setLocale, getLocale, normalizeLocale, applyDomTranslations };";

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

// i18n.js'i taze bir sandbox'ta yükler. `navigator: null` → tarayıcı dili yok;
// `noStorage: true` → localStorage erişilemiyor (gizli sekme senaryosu).
function boot(opts) {
  const o = opts || {};
  const storage = Object.assign({}, o.storage);
  const sandbox = { console, Math, Object, Array, Set, Map, String };
  if (o.navigator !== null) sandbox.navigator = o.navigator || { language: "tr-TR" };
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
  return { api: sandbox.__I18N_TEST, storage };
}

const I = boot().api;

// ── 1) Kod içindeki anahtarlar ─────────────────────────────────────────────
const codeFiles = fs.readdirSync(JS_DIR).filter((f) => f.endsWith(".js"));
const usedKeys = new Set(), keysWithFallback = new Set();
const callRe = /\bt\(\s*"([^"]+)"\s*(,)?/g;
for (const f of codeFiles) {
  const src = fs.readFileSync(path.join(JS_DIR, f), "utf8");
  let m;
  while ((m = callRe.exec(src))) {
    usedKeys.add(m[1]);
    if (m[2] === ",") keysWithFallback.add(m[1]);
  }
}
check("kodda t() anahtarı bulundu", usedKeys.size > 0, `${usedKeys.size} anahtar`);

const missingInEn = [...usedKeys].filter((k) => I.I18N.en[k] === undefined);
check("kullanılan her anahtar `en` sözlüğünde var", missingInEn.length === 0, missingInEn.join(", "));

const orphan = Object.keys(I.I18N.en).filter((k) => !usedKeys.has(k));
check("sözlükte kodda kullanılmayan anahtar yok", orphan.length === 0, orphan.join(", "));

for (const lang of I.LANG_REQUIRED) {
  const dict = I.I18N[lang] || {};
  const gap = [...usedKeys].filter((k) => dict[k] === undefined);
  check(`zorunlu dil tam çevrilmiş: ${lang}`, gap.length === 0, gap.slice(0, 8).join(", "));
}

// Her t() çağrısı Türkçe kaynak metnini taşımalı: TR sözlüğü boş olduğu için
// fallback'siz çağrı ekranda ham anahtar ("menu.mode.market.sub") gösterir.
const noTrSource = [...usedKeys].filter((k) => !keysWithFallback.has(k) && I.I18N.tr[k] === undefined);
check("her t() çağrısı Türkçe kaynak metni taşıyor", noTrSource.length === 0, noTrSource.join(", "));

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

// ── Özet ──────────────────────────────────────────────────────────────────
console.log(`\ni18n: ${pass} geçti, ${fail} kaldı`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exit(1);
}

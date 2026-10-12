/* Metin yerelleştirme (F2, 12 Ekim 2026) — klasik script, global `I18N`/`t`.
 *
 * TASARIM: Türkçe metinler KODUN İÇİNDE kaynak metindir (mevcut hâli korunur);
 * diğer diller yalnızca birer "override" sözlüğüdür. `t(key, "Türkçe metin")`
 * çağrısı seçili dilde çeviri varsa onu, yoksa verilen Türkçe metni döndürür.
 * Böylece: (a) TR hiçbir koşulda bozulmaz, (b) çeviriler ekran ekran eklenir,
 * (c) eksik çeviri oyunu kırmaz — yalnız Türkçe görünür.
 *
 * Anahtar kuralı: `<ekran>.<öğe>[.<alan>]` → "menu.mode.computer.title".
 * Süzgeç/kalıp: `t("menu.mode.workshop.sub", "Robotlarını kalibre et • {scrap}
 * Hurda", { scrap })` — `{ad}` yer tutucuları `vars` ile doldurulur.
 *
 * DENETİM: tests/i18n.js kod içindeki `t(<anahtar>)` çağrılarının tamamının
 * sözlükte bulunduğunu, sözlükte kodda kullanılmayan anahtar kalmadığını ve
 * her dilin anahtar kümesinin aynı olduğunu doğrular. Yeni anahtar eklerken
 * önce koda yaz, sonra sözlüğe ekle (test sırayı sana söyler).
 *
 * Sıra: index.html'de metin kullanan HERKESTEN önce yüklenir (audio.js'ten de
 * önce), çünkü `GAME_TITLE` gibi başlıklar çizim anında buradan çevrilir.
 */
const LANG_ORDER = ["tr", "en", "zh-Hans", "ru", "es-ES", "pt-BR"];
// Yayın öncesi TAM çeviri zorunlu diller. tests/i18n.js bu dillerde kod içindeki
// her anahtarın karşılığını arar; diğer diller eksik olabilir (kısmi çeviri
// serbest, eksik yerler Türkçe görünür).
const LANG_REQUIRED = ["en"];
const LANG_LABELS = {
  "tr": "Türkçe",
  "en": "English",
  "zh-Hans": "简体中文",
  "ru": "Русский",
  "es-ES": "Español",
  "pt-BR": "Português (BR)",
};
// Dil tercihi kendi anahtarında tutulur (nwo_muted / nwo_volume gibi profil
// dışı). Profil şemasına taşınması F2b'de yapılacak; o zamana kadar bu anahtar
// tek kaynaktır ve profil silinince dil tercihi kaybolmaz.
const I18N_STORAGE_KEY = "nwo_locale";

/* Sözlükler. `tr` BİLEREK boş: kaynak metinler kodun içindedir. Yeni bir dil
 * eklerken buraya anahtar kümesi eklenir; küme `en` ile birebir aynı olmalıdır
 * (tests/i18n.js eşitliği zorlar). */
const I18N = {
  tr: {},
  en: {
    // ── Marka ve menü ──────────────────────────────────────────────────
    "brand.title": "OUT OF WARRANTY",
    "menu.tagline": "Start the arena allocation protocol",
    "menu.hint": "Pick a section with the mouse",
    "menu.mode.computer.title": "Versus Automated Units",
    "menu.mode.computer.sub": "1 operator vs 1–3 factory robots",
    "menu.mode.local.title": "Local Operators",
    "menu.mode.local.sub": "2–6 players on one device",
    "menu.mode.workshop.title": "WORKSHOP",
    "menu.mode.workshop.sub": "Calibrate robots • {scrap} Scrap",
    "menu.mode.market.title": "AMMO MARKET",
    "menu.mode.market.sub": "In depot: {n} shells • {scrap} Scrap",
    "menu.mode.market.subEmpty": "Shared ammo depot • {scrap} Scrap",
    "menu.mode.tutorial.title": "HOW TO PLAY",
    "menu.mode.tutorial.sub": "Controls and turn rules",
    "tutorial.title": "HOW TO PLAY",
  },
  "zh-Hans": {},
  ru: {},
  "es-ES": {},
  "pt-BR": {},
};

let _i18nLocale = "tr";

// Tarayıcı dil etiketini (BCP 47) desteklediğimiz kümeye indirger. Tanınmayan
// dil İngilizceye düşer (uluslararası yayın dili); etiket hiç yoksa oyunun
// kendi dili (tr) kalır — yayın öncesi varsayılan davranış.
function normalizeLocale(tag) {
  if (!tag || typeof tag !== "string") return "tr";
  const low = tag.toLowerCase();
  if (low.startsWith("tr")) return "tr";
  if (low.startsWith("en")) return "en";
  if (low.startsWith("zh")) return "zh-Hans"; // Hant yok: ilk sürümde Basit Çince
  if (low.startsWith("ru")) return "ru";
  if (low.startsWith("es")) return "es-ES";
  if (low.startsWith("pt")) return "pt-BR";
  return "en";
}

function getLocale() {
  return _i18nLocale;
}

// Dili değiştirir. `persist: false` ile yalnız oturumluk değişir (ilk açılış
// tespiti böyle çalışır: kullanıcı seçimi değil, tarayıcı ipucu).
function setLocale(lang, opts) {
  const next = normalizeLocale(lang);
  _i18nLocale = next;
  if (!opts || opts.persist !== false) {
    try { if (typeof localStorage !== "undefined" && localStorage) localStorage.setItem(I18N_STORAGE_KEY, next); } catch (e) { /* yoksay */ }
  }
  applyDomTranslations();
  return next;
}

// Çeviri: seçili dil → (varsa) tr sözlüğü → çağrı yerinin Türkçe metni → anahtar.
// Anahtarın görünmesi eksik çevirinin sessizce kaybolmaması içindir (fallback
// verilmeyen çağrı hemen fark edilir).
function t(key, fallback, vars) {
  const dict = I18N[_i18nLocale] || {};
  let out = dict[key];
  if (out === undefined) out = (I18N.tr || {})[key];
  if (out === undefined) out = fallback;
  if (out === undefined) return key;
  if (vars && out.indexOf("{") >= 0) {
    out = out.replace(/\{(\w+)\}/g, (m, name) => (vars[name] === undefined ? m : String(vars[name])));
  }
  return out;
}

// DOM metinleri: <span data-i18n="key"> ve title için data-i18n-title.
// Canvas dışı arayüz (HUD, kaplama düğmeleri) bu iki öznitelikle çevrilir;
// özniteliği olmayan düğüm DOM'un kendi (Türkçe) metnini korur.
function applyDomTranslations(root) {
  if (typeof document === "undefined" || !document || !document.querySelectorAll) return 0;
  const scope = root || document;
  let n = 0;
  const nodes = scope.querySelectorAll("[data-i18n]");
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    const key = el.getAttribute("data-i18n");
    const fb = el.getAttribute("data-i18n-fallback") || el.textContent;
    el.textContent = t(key, fb);
    n++;
  }
  const titled = scope.querySelectorAll("[data-i18n-title]");
  for (let i = 0; i < titled.length; i++) {
    const el = titled[i];
    el.setAttribute("title", t(el.getAttribute("data-i18n-title"), el.getAttribute("title") || ""));
    n++;
  }
  return n;
}

// İlk açılış: kayıtlı tercih → tarayıcı dili → tr. Kayıtlı tercih varsa
// uygulanır; yoksa tespit edilen dil yalnız oturumluk kalır (kullanıcı kendi
// seçimini yapana kadar depoya yazılmaz).
(function initLocale() {
  let saved = null;
  try { if (typeof localStorage !== "undefined" && localStorage) saved = localStorage.getItem(I18N_STORAGE_KEY); } catch (e) { /* yoksay */ }
  if (saved) { setLocale(saved, { persist: false }); return; }
  const nav = typeof navigator !== "undefined" && navigator ? navigator.language : null;
  setLocale(nav ? normalizeLocale(nav) : "tr", { persist: false });
})();

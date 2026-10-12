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
    "menu.mode.market.subEmpty": "Shared depot • {scrap} Scrap",
    "menu.mode.tutorial.title": "HOW TO PLAY",
    "menu.mode.tutorial.sub": "Controls and turn rules",
    "tutorial.title": "HOW TO PLAY",
    // ── Savaş HUD'u (dil seçici, üst şerit, alt panel) ──────────────────
    "hud.language": "Language",
    "hud.fullscreen": "Fullscreen",
    "hud.fullscreen.title": "Fullscreen (F)",
    "hud.quit": "Quit",
    "hud.quit.title": "Back to menu (Esc)",
    "hud.audio.group": "Sound settings",
    "hud.volume": "Volume level",
    "hud.mute.off": "Mute",
    "hud.mute.on": "Unmute",
    "hud.mute.labelOff": "Sound",
    "hud.mute.labelOn": "Muted",
    "hud.powerMarker": "Last shot power",
    "hud.goWorkshop": "Go to workshop",
    "hud.playAgain": "Play again",
    "hud.mainMenu": "Main menu",
    "hud.robots": "Robots",
    "hud.weaponList.title": "Toggle weapon list (1–9)",
    "hud.weaponToggle.a": "WEAPON",
    "hud.weaponToggle.b": "SWITCH",
    "hud.slot.weapon": "Selected weapon",
    "hud.slot.skill": "Built-in module (Q)",
    "hud.slot.teleport": "Teleport ball",
    "hud.slot.hook": "Grapple",
    "hud.slot.teleportShort": "Teleport",
    // Durum şeridi (canvas ekranları) — {n}/{name}/{secs}/{dir}/{value} kalıpları
    "hud.banner.mode": "Selecting game mode…",
    "hud.banner.difficulty": "Selecting difficulty…",
    "hud.banner.botCount": "Selecting opponent count…",
    "hud.banner.playerCount": "Selecting player count…",
    "hud.banner.charSelect": "Player {n} is picking a robot…",
    "hud.banner.mapSelect": "Selecting factory zone…",
    "hud.banner.workshop": "Workshop",
    "hud.banner.market": "Ammo Market",
    "hud.banner.tutorial": "How to Play — controls and turn rules",
    "hud.banner.alloc": "Allocation Complete",
    "hud.banner.turn": "Turn: {name}  ⏱ {secs}s",
    "hud.wind": "Wind: {dir} {value}",
    "hud.wind.changed": "Wind changed: {dir} {value}",
    "hud.wind.none": "Wind: -",
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
  if (typeof document !== "undefined" && document && document.getElementById) {
    const sel = document.getElementById("locale-select");
    if (sel && sel.value !== next) sel.value = next;
  }
  if (typeof document !== "undefined" && document && document.dispatchEvent && typeof CustomEvent === "function") {
    document.dispatchEvent(new CustomEvent("localechange", { detail: { locale: next } }));
  }
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
  // aria-label ayrı öznitelik: ekran okuyucu metni görsel metinden farklı
  // olabilir (ör. ikon düğmesinin "Sesi kapat" etiketi).
  const aria = scope.querySelectorAll("[data-i18n-aria]");
  for (let i = 0; i < aria.length; i++) {
    const el = aria[i];
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"), el.getAttribute("aria-label") || ""));
    n++;
  }
  return n;
}

// Dil seçici: seçenekler LANG_ORDER/LANG_LABELS'ten üretilir — yeni dil
// eklendiğinde HTML'de değişiklik gerekmez. Seçim değişince tercih depoya
// yazılır, DOM metinleri uygulanır ve `localechange` olayı yayınlanır (oyun
// HUD'u kendini yeniler: sıra/rüzgar/yuva adları).
function buildLocaleSelect() {
  if (typeof document === "undefined" || !document || !document.getElementById) return false;
  const sel = document.getElementById("locale-select");
  if (!sel) return false;
  sel.textContent = "";
  for (let i = 0; i < LANG_ORDER.length; i++) {
    const lang = LANG_ORDER[i];
    const opt = document.createElement("option");
    opt.value = lang;
    opt.textContent = LANG_LABELS[lang] || lang;
    sel.appendChild(opt);
  }
  sel.value = _i18nLocale;
  if (!sel._i18nWired) {
    sel._i18nWired = true;
    sel.addEventListener("change", () => setLocale(sel.value));
  }
  return true;
}

// İlk açılış: kayıtlı tercih → tarayıcı dili → tr. Kayıtlı tercih varsa
// uygulanır; yoksa tespit edilen dil yalnız oturumluk kalır (kullanıcı kendi
// seçimini yapana kadar depoya yazılmaz).
(function initLocale() {
  let saved = null;
  try { if (typeof localStorage !== "undefined" && localStorage) saved = localStorage.getItem(I18N_STORAGE_KEY); } catch (e) { /* yoksay */ }
  if (saved) {
    setLocale(saved, { persist: false });
  } else {
    const nav = typeof navigator !== "undefined" && navigator ? navigator.language : null;
    setLocale(nav ? normalizeLocale(nav) : "tr", { persist: false });
  }
  // Dil seçici DOM'u hazırsa şimdi kur; betik <head>'e taşınırsa
  // DOMContentLoaded'da yeniden denemek için kendini bağlar.
  if (!buildLocaleSelect()) {
    if (typeof document !== "undefined" && document && document.addEventListener) {
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildLocaleSelect);
    }
  }
})();

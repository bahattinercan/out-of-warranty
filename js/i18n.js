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
// Çalışma zamanında ÜRETİLEN anahtar aileleri (ör. dal/yuva adları: anahtar
// kimlikten kurulur, `t("workshop.branch." + branch, ...)`). tests/i18n.js bu
// öneklerle başlayan sözlük anahtarlarını "kodda kullanılıyor" sayar; hangi
// kimliklerin gerçekten var olduğunu ayrıca kataloglardan doğrular.
const I18N_DYNAMIC_PREFIXES = ["workshop.branch.", "workshop.slot.", "tutorial.coach.", "market.tab.", "weapon."];
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
    // ── Ortak metinler ────────────────────────────────────────────────────
    "common.back": "‹ Back",
    "common.forward": "Forward ›",
    "common.mainMenu": "‹ Main Menu",
    "common.page": "Page {n} / {total}",
    "common.pageShort": "{n}/{total}",
    "common.scrap": "Scrap: {scrap}",
    // ── Atölye (F2b-2) ───────────────────────────────────────────────────
    "workshop.title": "WORKSHOP",
    "workshop.subtitleParts": "Install parts — parts apply in the same matches as upgrades",
    "workshop.subtitleUpgrades": "Calibrate your robots — upgrades only apply in matches versus the computer",
    "workshop.robotMeta": "{label} · {role}",
    "workshop.serviceLevel": "Service Level {level}{suffix}",
    "workshop.masterService": " — Master Service",
    "workshop.robotCardMeta": "Lv. {level} • {tiers}/9",
    "workshop.stats": "Matches {matches} • Wins {wins}",
    "workshop.maxCalibration": "Full Calibration",
    "workshop.branchDone": "This branch is complete",
    "workshop.tier": "Tier {tier}",
    "workshop.branchPanel": "{branch} — {tier}",
    "workshop.action.locked": "{branch} — Tier {tier} locked",
    "workshop.action.short": "{branch} — Tier {tier} — {cost} Scrap",
    "workshop.action.upgrade": "{branch} — Upgrade tier {tier} — {cost} Scrap",
    "workshop.reason.serviceLevel": "Service Level {level} required",
    "workshop.reason.shortScrap": "{cost} Scrap short",
    "workshop.current.irreversible": "Current: {tier} • cannot be undone",
    "workshop.current.needsLevel": "Current: {tier} • Lv. {level} required • {cost} Scrap",
    "workshop.tab.upgrades": "UPGRADES",
    "workshop.tab.parts": "PARTS",
    "workshop.pickPart": "{slot} {index} — pick a part",
    "workshop.noPartInInventory": "No {slot} part in inventory — buy one in the Market",
    "workshop.clearSlot": "Leave empty",
    "workshop.clearSubSlot": "Clear this sub-slot",
    "workshop.partHere": "✓ here",
    "workshop.partInSlot": "✓ in slot {index}",
    "workshop.empty": "Empty",
    "workshop.partsHint": "Click a cell → pick a part • {perSlot} parts per slot • removal is free",
    // Dinamik aile (I18N_DYNAMIC_PREFIXES): dal ve yuva adları
    "workshop.branch.chassis": "Chassis",
    "workshop.branch.module": "Attachment",
    "workshop.branch.core": "Core",
    "workshop.slot.helmet": "Helmet",
    "workshop.slot.body": "Body",
    "workshop.slot.tool": "Tool",
    "workshop.slot.feet": "Feet",
    // ── Nasıl Oynanır ekranı ve eğitim koçu (F2b-3) ───────────────────────
    "tutorial.panel.aim.title": "YOUR TURN — SHOOTING",
    "tutorial.panel.move.title": "MOVEMENT",
    "tutorial.panel.weapons.title": "WEAPONS AND MODULES",
    "tutorial.panel.rules.title": "RULES AND TIPS",
    "tutorial.aim.mouse.key": "Mouse",
    "tutorial.aim.mouse.desc": "Aim — the guide line follows the mouse",
    "tutorial.aim.click.key": "Left click",
    "tutorial.aim.click.desc": "Hold → power builds, release → fire",
    "tutorial.aim.cancel.key": "Right click / Esc",
    "tutorial.aim.cancel.desc": "Cancel the shot",
    "tutorial.move.walk.key": "A / D  ← →",
    "tutorial.move.walk.desc": "Walk (costs energy)",
    "tutorial.move.jump.key": "W / ↑",
    "tutorial.move.jump.desc": "Jump (costs energy)",
    "tutorial.move.energy.key": "⚡ Energy",
    "tutorial.move.energy.desc": "Refills every turn — runs out fast",
    "tutorial.weapons.select.key": "1–9 / Wheel",
    "tutorial.weapons.select.desc": "Pick a weapon (ammo is limited)",
    "tutorial.weapons.module.key": "Q",
    "tutorial.weapons.module.desc": "Use the built-in module — a damaging one uses that turn's shot",
    "tutorial.weapons.panel.key": "Bottom panel",
    "tutorial.weapons.panel.desc": "The selected weapon's description shows at the bottom",
    "tutorial.rules.timer.key": "⏱ 25 s",
    "tutorial.rules.timer.desc": "When time runs out the turn passes to the opponent",
    "tutorial.rules.wind.key": "🌀 Wind",
    "tutorial.rules.wind.desc": "Pushes the shell off course — watch the gauge up top",
    "tutorial.rules.audio.key": "M • Esc / ⏏",
    "tutorial.rules.audio.desc": "Mute • leave the match and return to the menu",
    "tutorial.strip.flow": "One turn: move → aim → charge → fire",
    "tutorial.strip.turn": "When the shot resolves or time runs out the turn passes on — last robot standing wins",
    "tutorial.play": "▶ PLAY THE TUTORIAL",
    "tutorial.play.desc": "Simple round: 1v1, no wind, step-by-step guidance",
    "tutorial.status.resolving": "Resolving the shot…",
    "tutorial.status.opponent": "Opponent's turn — watch and learn",
    "tutorial.status.done": "✓ Done! Next step…",
    "tutorial.badge": "TUTORIAL",
    // Dinamik aile: koç adımları (indeksle üretilir)
    "tutorial.coach.0": "Walk with A / D or ← → (costs energy)",
    "tutorial.coach.1": "Jump with W or ↑ (costs energy)",
    "tutorial.coach.2": "Aim with the mouse — turn the line",
    "tutorial.coach.3": "Hold left click → power builds → release and fire",
    "tutorial.coach.4": "Free for all! Take out the opponent — try the Q module and weapons 1–9",
    // ── Cephane Pazarı (F2b-4) ──────────────────────────────────────────
    "market.title": "MARKET",
    "market.tab.ammo": "AMMO",
    "market.tab.helmet": "HELMET",
    "market.tab.body": "BODY",
    "market.tab.tool": "TOOL",
    "market.tab.feet": "FEET",
    "market.depotSummary": "Shared depot: {total} shells • {weapons} weapons",
    "market.partsSummary": "{slot} slot: {have}/{total} parts • equip in the Workshop",
    "market.full": "Full",
    "market.price": "{price} Scrap",
    "market.ammoMeta": "Base {base} • Battle ≤{max} • Depot {have}/{cap}",
    "market.bulkShift": "Shift ×{qty}",
    "market.ammoNote": "The depot banks up to {cap}; a match loads only the battle cap and the rest returns afterwards • Shift ×{qty} / Ctrl ×{big}",
    "market.ammoFallback": "Ammo",
    "market.owned": "Owned",
    "market.equippedOne": "Equipped → {robot}",
    "market.equippedMany": "Equipped → on {count} robots",
    "market.inInventory": "In inventory • equip in the Workshop",
    "market.partUsable": "Fits the {slot} slot • equips on any robot",
    "market.partsNote": "{slot} parts are a one-time purchase • the same part fits every robot (no copies needed) • equip in the Workshop",
    "market.prev": "‹ Previous",
    "market.next": "Next ›",
    "market.fail": "Purchase failed",
    "market.ammoDepotFull": "{label} depot is full (limit {cap})",
    "market.scrapRequired": "Need {cost} Scrap for {label}",
    "market.notSellable": "{label} is not for sale",
    "market.ammoBought": "{qty}× {label} bought  (−{cost} Scrap)",
    "market.partFallback": "Part",
    "market.alreadyOwned": "{label} is already in your inventory — equip it in the Workshop",
    "market.unknownPart": "Unknown part",
    "market.partBought": "{label} bought (−{cost} Scrap) — equip it on a robot in the Workshop",
    // ── Atölye takma bildirimleri ───────────────────────────────────────
    "workshop.failEquip": "Equip failed",
    "workshop.notOwned": "That part is not in your inventory",
    "workshop.slotMismatch": "That part does not fit this slot",
    "workshop.invalidIndex": "Invalid sub-slot",
    "workshop.slotWhere": "{slot} {index}",
    "workshop.equipped": "{part} equipped ({where})",
    "workshop.cleared": "{where} slot cleared",
    // ── Maç sonu kaplaması + depolama uyarısı ───────────────────────────
    "overlay.tutorial.winTitle": "Tutorial complete! 🎓",
    "overlay.tutorial.winSub": "You're ready — start real matches from the main menu.",
    "overlay.tutorial.lossTitle": "You lost the tutorial match",
    "overlay.tutorial.lossSub": "Don't worry — hit 'Play Again' to retry the same round.",
    "overlay.tutorial.drawTitle": "A draw!",
    "overlay.match.winTitle": "{name} took the scrap round! 🏆",
    "overlay.match.drawTitle": "The round ended in a draw!",
    "overlay.match.drawSub": "Both robots were destroyed.",
    "overlay.reward": "+{scrap} Scrap  •  +{xp} Service XP",
    "overlay.levelUp": "{robot}Service Level {before} → {after}",
    "storage.warning": "Progress could not be saved this session.",
    // ── Veri katalogları: silahlar (F2c-1) ──────────────────────────────
    "weapon.bazooka.name": "Bazooka",
    "weapon.bazooka.special": "Balanced",
    "weapon.bazooka.desc": "Balanced rocket. Explodes where it hits.",
    "weapon.grenade.name": "Grenade",
    "weapon.grenade.special": "Bounces • fuse",
    "weapon.grenade.desc": "Rolls and bounces, then explodes when the fuse runs out.",
    "weapon.sniper.name": "Sniper",
    "weapon.sniper.special": "Fast • piercing",
    "weapon.sniper.desc": "Flies very fast and straight; heavy damage on a direct hit.",
    "weapon.shotgun.name": "Shotgun",
    "weapon.shotgun.special": "5 pellets",
    "weapon.shotgun.desc": "Five pellets per shot; wide spread, short range.",
    "weapon.cluster.name": "Cluster",
    "weapon.cluster.special": "Splits mid-air",
    "weapon.cluster.desc": "Splits into fragments on impact and sets off several explosions.",
    "weapon.triple.name": "Triple Rocket",
    "weapon.triple.special": "3 rockets • spread",
    "weapon.triple.desc": "Fires three rockets at once; wide spread.",
    "weapon.sticky.name": "Sticky Bomb",
    "weapon.sticky.special": "Sticks • fuse",
    "weapon.sticky.desc": "Sticks where it lands and blows up on a short fuse.",
    "weapon.rubber.name": "Rubber Bomb",
    "weapon.rubber.special": "Very bouncy • fuse",
    "weapon.rubber.desc": "Bounces hard off walls; explodes when the fuse runs out.",
    "weapon.rubbertrio.name": "Rubber Trio",
    "weapon.rubbertrio.special": "3 bounces",
    "weapon.rubbertrio.desc": "Three bouncy bombs; wide spread.",
    "weapon.grenadetrio.name": "Grenade Trio",
    "weapon.grenadetrio.special": "3 bombs • fuse",
    "weapon.grenadetrio.desc": "Three grenades; wide spread, fuse-detonated.",
    "weapon.megacluster.name": "Mega Cluster",
    "weapon.megacluster.special": "8 fragments",
    "weapon.megacluster.desc": "Splits into eight fragments on impact.",
    "weapon.nuke.name": "Nuke",
    "weapon.nuke.special": "Huge blast",
    "weapon.nuke.desc": "Massive blast. Slow but devastating.",
    "weapon.barrage.name": "Rocket Barrage",
    "weapon.barrage.special": "5 rockets",
    "weapon.barrage.desc": "Five rockets per shot; wide spread.",
    "weapon.mirv.name": "MIRV",
    "weapon.mirv.special": "Splits overhead",
    "weapon.mirv.desc": "Splits into fragments at the top of its arc.",
    "weapon.airstrike.name": "Airstrike",
    "weapon.airstrike.special": "Strike from above",
    "weapon.airstrike.desc": "Six bombs rain down on the mouse target.",
    "weapon.drill.name": "Drill",
    "weapon.drill.special": "Piercing",
    "weapon.drill.desc": "Drills through terrain, then explodes.",
    "weapon.mine.name": "Mine",
    "weapon.mine.special": "Triggers on approach",
    "weapon.mine.desc": "Dropped on the ground; hits whoever comes near once armed.",
    "weapon.napalm.name": "Napalm",
    "weapon.napalm.special": "Burning field",
    "weapon.napalm.desc": "Explodes and leaves a burning area behind.",
    "weapon.teleportball.name": "Teleport Ball",
    "weapon.teleportball.special": "Teleports",
    "weapon.teleportball.desc": "Teleports you above where it lands; deals no damage.",
    "weapon.hook.name": "Hook",
    "weapon.hook.special": "Pulls you",
    "weapon.hook.desc": "Flies straight and pulls you to whatever it grabs; deals no damage.",
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
  applyDataTranslations();
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

// ── Veri kataloğu çevirisi ───────────────────────────────────────────────
// Katalog dosyaları (weapons/parts/characters/maps) Türkçe kaynak metni taşır ve
// i18n.js'ten SONRA yüklenir; bu yüzden çeviri yükleme anında değil, dil
// uygulanırken yapılır (setLocale). Özgün Türkçe değerler ilk uygulamada
// saklanır, böylece Türkçeye dönüldüğünde katalog birebir eski hâline döner.
//
// Kimlik A kararı: model kodları (characters > label: FIX-8, maps > forLabel)
// ÇEVRİLMEZ — marka kimliğinin parçası, hangi dilde olursa olsun aynı kalır.
// Kapsam testi (tests/i18n.js) anahtar listesini bu yapılandırmadan üretir:
// buraya kaydedilmeyen katalog alanı çevrilmez, Türkçe kalır.
const DATA_CATALOGS = [
  {
    // Katalog globali i18n.js'ten SONRA yüklenir; o ana kadar tanımsızdır ve test
    // paketi tüm dosyaları tek betikte birleştirdiğinde de TDZ hatası verir —
    // try/catch ikisini de sessizce "katalog henüz yok" sayar.
    get: () => { try { return WEAPONS; } catch (e) { return null; } },
    prefix: "weapon",
    paths: [
      { key: "name", id: "id", at: ["name"] },
      { key: "special", id: "id", at: ["special"] },
      { key: "desc", id: "id", at: ["desc"] },
    ],
  },
  // Sıradaki dilimler: PARTS (label/desc), CHARACTERS (role + skill.label/desc),
  // MAPS (label/skillLabel + bölge adı). Kaydedilene kadar Türkçe kalırlar.
];

// Katalog nesnesi → { anahtar: türkçe değer }: dil geri alınırken özgün metin.
const _dataOriginals = new Map();

// Kayıtlı katalogların çeviri önekleri ("weapon." gibi) — test bekçisi bunları
// dinamik anahtar ailesi olarak tanır.
function dataTranslationPrefixes() {
  return DATA_CATALOGS.map((cat) => cat.prefix + ".");
}

// Uygulanacak (tutucu nesne, alan, anahtar) üçlülerini üretir: çeviri ile kapsam
// testi aynı listeyi kullanır, anahtar üretimi tek yerde kalsın diye.
function dataTranslationEntries() {
  const out = [];
  for (const cat of DATA_CATALOGS) {
    const list = cat.get();
    if (!list) continue;                    // katalog henüz yüklenmedi
    for (const item of list) {
      for (const p of cat.paths) {
        const holder = p.at.length === 1 ? item : item[p.at[0]];
        const id = item[p.id];
        if (!holder || !id) continue;
        out.push({ holder, at: p.at[p.at.length - 1], key: cat.prefix + "." + id + "." + p.key });
      }
    }
  }
  return out;
}

// Kayıtlı katalogları seçili dile çevirir. Katalog henüz yüklenmemişse sessizce
// geçer (i18n.js kataloglardan önce yüklenir; ilk çağrı bu yüzden boş dönebilir
// — asıl uygulama main.js'te ve her dil değişiminde yapılır).
function applyDataTranslations() {
  for (const e of dataTranslationEntries()) {
    let orig = _dataOriginals.get(e.holder);
    if (!orig) { orig = {}; _dataOriginals.set(e.holder, orig); }
    if (!(e.key in orig)) orig[e.key] = e.holder[e.at];
    if (typeof orig[e.key] !== "string") continue;
    e.holder[e.at] = t(e.key, orig[e.key]);
  }
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
  // Kataloglar bu betikten SONRA yüklendiği için ilk uygulama boş döner; tüm
  // klasik betikler çalıştıktan sonra (DOMContentLoaded) bir kez daha uygula.
  // Sondalar da böylece tarayıcı dilini (?locale=en veya --lang=en-US) katalog
  // metinlerine yansıtır. Fonksiyon idempotenttir; main.js'teki çağrı da güvenli.
  if (typeof document !== "undefined" && document && document.addEventListener) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyDataTranslations);
    else applyDataTranslations();
  }
})();

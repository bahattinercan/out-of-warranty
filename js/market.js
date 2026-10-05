/* Cephane pazarı ve ortak depo (envanter) — saf ekonomi katmanı (DOM'a ve
 * localStorage'a dokunmaz, tıpkı progression.js gibi tarayıcısız test edilir).
 *
 * Kural: oyuncu Hurda karşılığında fazladan mühimmat alır. Alınan mermi
 * profildeki ORTAK DEPODA bekler (envanter); depo tüm robotlar tarafından
 * paylaşılır. Maç başında depo o robotun mermilerine yüklenir, maç bitince
 * harcanmayan kısım depoya geri yazılır. Böylece satın alma kalıcıdır — sayfa
 * yenilense bile kaybolmaz — ama tüketim maçla sınırlıdır.
 *
 * Taban mühimmat ücretsizdir ve önce tüketilmiş sayılır: depodan gelen ek mermi
 * ancak taban adet bittiğinde harcanır. `settleDepot`, elde kalan mermiyi
 * envantere döndürür (bkz. unspentDepot türetimi).
 *
 * İKİ KATMAN (fiyat/denge planı): depo uzun vadeli STOKtur — 999'a kadar birikir.
 * Savaşta kullanım ise silah başına `battleMax` TAVANIYLA sınırlanır: maç başına
 * depodan yalnız `battleMax - tabanMühimmat` kadar yüklenir. Böylece depoda 999
 * mermi dururken bile bir maçta o silahtan sınırlı sayıda atış yapılır.
 *
 * Bazuka sınırsız mühimmatlıdır: satılmaz, depoda tutulmaz, tavana bağlanmaz.
 *
 * Fiyatlar açıkça tablolanır (denge tek yerden ayarlanır); tabloda olmayan bir
 * silah için tek atış gücünden türetilmiş yedek fiyat kullanılır, böylece
 * ileride eklenen cephane pazarda kendiliğinden görünür.
 */

const AMMO_DEPOT_CAP = 999;    // silah başına depoda tutulabilecek en fazla mermi (uzun vadeli stok)
const AMMO_BULK_QTY = 10;      // "toplu al" (Shift + tık) adedi
const AMMO_BULK_QTY_BIG = 50;  // "büyük toplu al" (Ctrl/Alt + tık) adedi

// Fiyat üreteci: tek atış gücüne (weapons.js > weaponPowerScore) doğrusal bağlı.
// AMMO_PRICES tablosu bilinçli istisnaları tutar (ucuz başlangıç cephanesi ve
// hasarsız yardımcı silahlar); tabloda olmayan her cephane buradan fiyatlanır.
const AMMO_PRICE_K = 0.8;      // Hurda / güç puanı
const AMMO_PRICE_BASE = 20;    // sabit pay (zayıf cephaneyi de anlamlı kılar)
const AMMO_PRICE_MIN = 30;
const AMMO_PRICE_MAX = 130;

// Satın alınabilir cephanenin Hurda fiyatı (mermi başına). Sınırsız mühimmatlı
// Bazuka bilinçli olarak yoktur: `isSellableWeapon` onu satış dışı bırakır.
// Listelenen değerler ya bilinçli istisnadır ya da ammoBasePrice formülünün
// çıktısıdır (tests/market.js ikisinin ayrışmadığını doğrular).
const AMMO_PRICES = {
  // İstisnalar: ucuz başlayan cephane + hasarsız yardımcı silahlar.
  grenade: 30, teleportball: 40, hook: 35,
  // Formül çıktıları (güç puanı × 0.8 + 20, 30–130 aralığına kırpılır).
  sniper: 60, shotgun: 58, cluster: 78, triple: 65, sticky: 55,
  rubber: 47, rubbertrio: 58, grenadetrio: 65, megacluster: 108, nuke: 84,
  barrage: 73, mirv: 78, airstrike: 87, drill: 47, mine: 47, napalm: 57,
};

function weaponById(weaponId) {
  if (typeof WEAPONS === "undefined" || !Array.isArray(WEAPONS)) return null;
  return WEAPONS.find((w) => w && w.id === weaponId) || null;
}

// Sınırsız mühimmatlı (∞) silahlar satılamaz; depoda da tutulmaz.
function isSellableWeapon(spec) {
  return !!spec && spec.ammo !== Infinity;
}

// Tabloda olmayan cephane için formül fiyatı (güç puanı → Hurda).
function ammoBasePrice(spec) {
  const p = typeof weaponPowerScore === "function" ? weaponPowerScore(spec) : 0;
  return clampNumber(Math.round(AMMO_PRICE_K * p + AMMO_PRICE_BASE), AMMO_PRICE_MIN, AMMO_PRICE_MAX);
}

// Mermi başına fiyat; satılamayan/bilinmeyen silahta null.
function ammoPriceFor(weaponId) {
  const spec = typeof weaponId === "string" ? weaponById(weaponId) : weaponId;
  if (!isSellableWeapon(spec)) return null;
  const listed = AMMO_PRICES[spec.id];
  if (Number.isFinite(listed)) return listed;
  return ammoBasePrice(spec);
}

// Bir silahın maça taşınabilecek en fazla mermisi (taban mühimmat dâhil).
// Sınırsız cephane (Bazuka) ve bilinmeyen kayıtlar Infinity'de kalır; taban
// mühimmat asla tavanın üstünde kalmaz.
function weaponBattleMax(spec) {
  if (!isSellableWeapon(spec)) return Infinity;
  const base = Number.isFinite(spec.ammo) ? spec.ammo : 0;
  const cap = Number.isFinite(spec.battleMax) ? spec.battleMax : base;
  return Math.max(base, cap);
}

// Pazarda satılan silahlar (satın alma sırası WEAPONS sırasıdır).
function sellableWeapons() {
  return WEAPONS.filter((w) => isSellableWeapon(w));
}

// ── Ortak depo (envanter) ───────────────────────────────────────────────────

// Her türlü girdiden geçerli bir depo üretir: bilinmeyen/sınırsız silah
// kayıtları atılır, adetler [0, AMMO_DEPOT_CAP] aralığına çekilir, sıfırlar
// tutulmaz. Girdi mutasyona uğratılmaz.
function sanitizeAmmoDepot(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const key of Object.keys(src)) {
    const spec = weaponById(key);
    if (!isSellableWeapon(spec)) continue;
    const n = Math.min(AMMO_DEPOT_CAP, toSafeInt(src[key]));
    if (n > 0) out[key] = n;
  }
  return out;
}

// Profildeki ortak depo (okuma yolu; profili değiştirmez).
function getAmmoDepot(profile) {
  return sanitizeAmmoDepot(profile ? profile.ammo : null);
}

// Yazma yolu: ortak depoyu profile işler.
function setAmmoDepot(profile, depot) {
  if (!profile || typeof profile !== "object") return false;
  profile.ammo = sanitizeAmmoDepot(depot);
  return true;
}

// İki depoyu toplar; adetler üst sınıra kırpılır. Profil göçü (robot başına
// depodan ortak depoya) ve maç sonu birleştirmesi bu yardımcıyı kullanır.
function mergeDepots(a, b) {
  const out = sanitizeAmmoDepot(a);
  const src = sanitizeAmmoDepot(b);
  for (const id of Object.keys(src)) {
    out[id] = Math.min(AMMO_DEPOT_CAP, (out[id] || 0) + src[id]);
  }
  return out;
}

// Depodaki toplam mermi sayısı (envanter özeti için).
function ammoDepotTotal(depot) {
  let n = 0;
  const src = depot && typeof depot === "object" ? depot : {};
  for (const key of Object.keys(src)) n += toSafeInt(src[key]);
  return n;
}

// ── Satın alma ──────────────────────────────────────────────────────────────

/* Tek giriş noktası; arayüz doğrudan profile.scrap'i değiştirmez.
 * Başarıda { ok, profile, cost, bought, price, count, full, persisted },
 * hatada { ok:false, reason }.
 * reason: INVALID_WEAPON | NOT_SELLABLE | DEPOT_FULL | SCRAP_REQUIRED
 * İstenen adet depo boşluğu veya bakiyeyle sınırlanır (kısmi alım). */
function buyAmmo(profile, weaponId, qty, storage) {
  const spec = weaponById(weaponId);
  if (!spec) return { ok: false, reason: "INVALID_WEAPON" };
  if (!isSellableWeapon(spec)) return { ok: false, reason: "NOT_SELLABLE" };

  const want = Math.max(1, toSafeInt(qty, 1));
  const current = normalizeProfile(profile);
  const depot = getAmmoDepot(current);
  const have = depot[weaponId] || 0;
  const room = AMMO_DEPOT_CAP - have;
  if (room <= 0) return { ok: false, reason: "DEPOT_FULL", count: have };

  const price = ammoPriceFor(spec);
  const affordable = Math.floor(current.scrap / price);
  const bought = Math.min(want, room, affordable);
  if (bought <= 0) {
    return { ok: false, reason: "SCRAP_REQUIRED", scrap: current.scrap, cost: price };
  }

  const cost = bought * price;
  current.scrap -= cost;
  setAmmoDepot(current, mergeDepots(depot, { [weaponId]: bought }));
  // Derin kopya üzerinde uygula, sonucu yeniden doğrula.
  const after = getAmmoDepot(current);
  if (current.scrap < 0 || (after[weaponId] || 0) > AMMO_DEPOT_CAP || (after[weaponId] || 0) !== have + bought) {
    return { ok: false, reason: "VERIFY_FAILED" };
  }

  const persisted = saveProfile(current, storage);
  return {
    ok: true,
    profile: current,
    cost,
    bought,
    price,
    count: after[weaponId] || 0,
    full: (after[weaponId] || 0) >= AMMO_DEPOT_CAP,
    persisted,
  };
}

// ── Maç yükleme / iade ──────────────────────────────────────────────────────

/* Depoyu maç sayaçlarına çevirir: `battleMax` tavanını uygular ve GERÇEKTEN
 * yüklenen depo dilimini ayrı döndürür. Snapshot mutlaka "yüklenen" olmalıdır
 * (deponun tamamı değil): aksi hâlde maç sonu iadesi depoyu yanlış eksiltir.
 * Tavan depodaki fazlayı maça taşımaz; fazla depoda sonraki maçlara kalır. */
function battleLoad(baseAmmo, depot) {
  const merged = mergeAmmoWithDepot(baseAmmo, depot);
  const ammo = {};
  const loaded = {};
  for (const w of WEAPONS) {
    const raw = merged[w.id];
    const base = baseAmmo && baseAmmo[w.id] !== undefined ? baseAmmo[w.id] : w.ammo;
    if (raw === Infinity) { ammo[w.id] = Infinity; continue; }
    const value = Math.min(toSafeInt(raw), weaponBattleMax(w));
    ammo[w.id] = value;
    const fromDepot = Math.max(0, value - toSafeInt(base));
    if (fromDepot > 0) loaded[w.id] = fromDepot;   // yalnız depo kaynaklı kısım iadeye girer
  }
  return { ammo, loaded };
}

// Depoyu maçlık mühimmat sayacına katar (tavansız saf birleşim). Girdiler
// mutasyona uğratılmaz; yeni sayaç döner. Sonsuz mühimmat (Bazuka) korunur.
// Maça yükleme tavanı için bkz. battleLoad.
function mergeAmmoWithDepot(baseAmmo, depot) {
  const out = {};
  for (const w of WEAPONS) out[w.id] = baseAmmo ? baseAmmo[w.id] : w.ammo;
  const src = depot && typeof depot === "object" ? depot : {};
  for (const id of Object.keys(src)) {
    const spec = weaponById(id);
    if (!isSellableWeapon(spec)) continue;
    out[id] = (Number.isFinite(out[id]) ? out[id] : 0) + toSafeInt(src[id]);
  }
  return out;
}

// Tek silah için depoya iade edilecek mermi: yüklenen ek mermiden harcanmayan
// kısım. Taban mühimmat ÖNCE tüketilmiş sayıldığı için elde kalan mermi
// depodan gelmiş sayılır; iade üst sınırı yüklenen adettir.
//   consumed = base + loaded - remaining      (taban önce gider)
//   depot_left = loaded - max(0, consumed - base) = min(loaded, remaining)
function unspentDepot(loaded, remaining, weaponId) {
  const spec = weaponById(weaponId);
  if (!isSellableWeapon(spec)) return 0;
  const loadedN = toSafeInt((loaded || {})[weaponId]);
  if (!loadedN) return 0;
  const left = toSafeInt((remaining || {})[weaponId]);
  return Math.min(loadedN, left);
}

// Maç sonunda envantere dönecek depo (yüklenen ve kalan sayaçlardan).
function settleDepot(loaded, remaining) {
  const out = {};
  const src = loaded && typeof loaded === "object" ? loaded : {};
  for (const id of Object.keys(src)) {
    const n = unspentDepot(src, remaining, id);
    if (n > 0) out[id] = n;
  }
  return out;
}

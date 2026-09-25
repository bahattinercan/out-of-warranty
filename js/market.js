/* Cephane pazarı ve envanteri — saf ekonomi katmanı (DOM'a ve localStorage'a
 * dokunmaz, tıpkı progression.js gibi tarayıcısız test edilebilir).
 *
 * Kural: oyuncu Hurda karşılığında bir robotuna fazladan mühimmat alır. Alınan
 * mermi robotun DEPOSUNDA bekler (envanter); maç başında depo mermilere
 * yüklenir, maç bitince harcanmayan kısım depoya geri yazılır. Böylece satın
 * alma kalıcıdır — sayfa yenilense bile kaybolmaz — ama tüketim maçla sınırlıdır.
 *
 * Taban mühimmat ücretsizdir ve önce tüketilmiş sayılır: depodan gelen ek mermi
 * ancak taban adet bittiğinde harcanır. `settleDepot`, taban sayının üstünde
 * kalan mermiyi envantere döndürür.
 *
 * Fiyatlar açıkça tablolanır (denge tek yerden ayarlanır); tabloda olmayan bir
 * silah için gösterim puanlarından türetilmiş yedek fiyat kullanılır, böylece
 * ileride eklenen cephane pazarda kendiliğinden görünür.
 */

const AMMO_DEPOT_CAP = 9;   // robot + silah başına depoda tutulabilecek en fazla mermi
const AMMO_BULK_QTY = 5;    // "toplu al" (Shift + tık) adedi

// Satın alınabilir cephanenin Hurda fiyatı (mermi başına). Sınırsız mühimmatlı
// Bazuka bilinçli olarak yoktur: `isSellableWeapon` onu satış dışı bırakır.
const AMMO_PRICES = {
  grenade: 30, sniper: 65, shotgun: 50, cluster: 70, triple: 55, sticky: 55,
  rubber: 35, rubbertrio: 45, grenadetrio: 50, megacluster: 90, nuke: 120,
  barrage: 80, mirv: 75, airstrike: 85, drill: 45, mine: 50, napalm: 65,
};

function weaponById(weaponId) {
  if (typeof WEAPONS === "undefined" || !Array.isArray(WEAPONS)) return null;
  return WEAPONS.find((w) => w && w.id === weaponId) || null;
}

// Sınırsız mühimmatlı (∞) silahlar satılamaz; depoda da tutulmaz.
function isSellableWeapon(spec) {
  return !!spec && spec.ammo !== Infinity;
}

// Mermi başına fiyat; satılamayan/bilinmeyen silahta null.
function ammoPriceFor(weaponId) {
  const spec = typeof weaponId === "string" ? weaponById(weaponId) : weaponId;
  if (!isSellableWeapon(spec)) return null;
  const listed = AMMO_PRICES[spec.id];
  if (Number.isFinite(listed)) return listed;
  // Yedek formül: hasar ve yarıçap puanları ağırlıklı, hız yalnız küçük pay.
  const st = spec.stats || {};
  const dmg = clampNumber(toSafeInt(st.dmg, 3), 0, 5);
  const radius = clampNumber(toSafeInt(st.radius, 3), 0, 5);
  const speed = clampNumber(toSafeInt(st.speed, 3), 0, 5);
  return Math.max(20, Math.round(12 + dmg * 12 + radius * 6 + speed * 2));
}

// Pazarda satılan silahlar (satın alma sırası WEAPONS sırasıdır).
function sellableWeapons() {
  return WEAPONS.filter((w) => isSellableWeapon(w));
}

// ── Depo (envanter) ─────────────────────────────────────────────────────────

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

// Profildeki robotun doğrulanmış deposu (okuma yolu; profili değiştirmez).
function getRobotAmmo(profile, robotId) {
  const r = profile && profile.robots ? profile.robots[robotId] : null;
  return sanitizeAmmoDepot(r ? r.ammo : null);
}

// Yazma yolu: depoyu profile işler (kayıt yoksa ensureRobotProgress oluşturur).
function setRobotAmmo(profile, robotId, depot) {
  if (!profile || !knownRobotId(robotId)) return false;
  const robot = ensureRobotProgress(profile, robotId);
  robot.ammo = sanitizeAmmoDepot(depot);
  return true;
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
 * reason: INVALID_ROBOT | INVALID_WEAPON | NOT_SELLABLE | DEPOT_FULL | SCRAP_REQUIRED
 * İstenen adet depo boşluğu veya bakiyeyle sınırlanır (kısmi alım). */
function buyAmmo(profile, robotId, weaponId, qty, storage) {
  if (!knownRobotId(robotId)) return { ok: false, reason: "INVALID_ROBOT" };
  const spec = weaponById(weaponId);
  if (!spec) return { ok: false, reason: "INVALID_WEAPON" };
  if (!isSellableWeapon(spec)) return { ok: false, reason: "NOT_SELLABLE" };

  const want = Math.max(1, toSafeInt(qty, 1));
  const current = normalizeProfile(profile);
  const depot = getRobotAmmo(current, robotId);
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
  const robot = ensureRobotProgress(current, robotId);
  robot.ammo = sanitizeAmmoDepot(Object.assign({}, depot, { [weaponId]: have + bought }));
  // Derin kopya üzerinde uygula, sonucu yeniden doğrula.
  if (current.scrap < 0 || (robot.ammo[weaponId] || 0) > AMMO_DEPOT_CAP) {
    return { ok: false, reason: "VERIFY_FAILED" };
  }

  const persisted = saveProfile(current, storage);
  return {
    ok: true,
    profile: current,
    cost,
    bought,
    price,
    count: robot.ammo[weaponId] || 0,
    full: (robot.ammo[weaponId] || 0) >= AMMO_DEPOT_CAP,
    persisted,
  };
}

// ── Maç yükleme / iade ──────────────────────────────────────────────────────

// Depoyu maçlık mühimmat sayacına katar. Girdiler mutasyona uğratılmaz; yeni
// sayaç döner. Sonsuz mühimmat (Bazuka) korunur.
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
// kısım (taban mühimmat önce tüketilmiş sayılır).
function unspentDepot(loaded, remaining, weaponId) {
  const spec = weaponById(weaponId);
  if (!isSellableWeapon(spec)) return 0;
  const loadedN = toSafeInt((loaded || {})[weaponId]);
  if (!loadedN) return 0;
  const left = toSafeInt((remaining || {})[weaponId]);
  return clampNumber(left - toSafeInt(spec.ammo), 0, loadedN);
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

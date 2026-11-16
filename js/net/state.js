/* Çevrimiçi durum eşitleme (F3b) — anlık görüntü (snapshot) + arazi senkronu.
 *
 * Sorumluluk: hostun yetkili maç durumunu JSON'a çevirmek (capture), misafirin
 * bunu mevcut oyun nesnelerine güvenle uygulaması (apply) ve yıkılabilir arazinin
 * iki tarafta AYNI olmasını sağlamak. Protokol/oturum mantığı burada DEĞİL
 * (bkz. js/net/protocol.js, js/net/session.js).
 *
 * Tasarım kararları:
 *   - Arazi ilk durumu Math.random ile üretildiği için (terrain.js) her istemcide
 *     FARKLIDIR. Bu yüzden maç başında host maskeyi RLE ile gönderir; sonraki
 *     değişiklikler `terrain.destroy(x,y,r)` kayıtları olarak yayınlanır ve misafir
 *     aynı çağrıları oynatır (aynı parametre → aynı maske).
 *   - Snapshot yalnız DEĞİŞEN maç durumunu taşır; türetilmiş istatistikler (can
 *     üst sınırı, zırh, hız çarpanları) `build` bloğunda bir kez taşınır, böylece
 *     misafir profil/geliştirme verisine ihtiyaç duymaz (çevrimiçi maçta taban
 *     build kuralı).
 *   - Apply savunmacıdır: bilinmeyen alanlar yok sayılır, NaN/Infinity yazılmaz,
 *     eksik dizi boş kabul edilir. Bozuk paket oyunu kilitlemez.
 */

const NET_STATE_VERSION = 1;

// ── Karma (hash) ────────────────────────────────────────────────────────────
// FNV-1a: snapshot kimliği ve arazi özeti için. Kriptografik değil; amaç iki
// tarafın aynı veriyi gördüğünü hızlıca karşılaştırmak.
function netHashText(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("0000000" + h.toString(16)).slice(-8);
}

function netHashMask(solid, w, h) {
  let hh = 0x811c9dc5;
  const n = Math.min(solid.length, w * h);
  for (let i = 0; i < n; i++) {
    hh ^= solid[i] ? 1 : 0;
    hh = (hh + ((hh << 1) + (hh << 4) + (hh << 7) + (hh << 8) + (hh << 24))) >>> 0;
  }
  return ("0000000" + hh.toString(16)).slice(-8);
}

// ── Arazi maskesi: RLE ──────────────────────────────────────────────────────
/* Yükseklik alanı biçimindeki arazi satır başına 1-3 koşu üretir; bu yüzden
 * satır-major koşu kodlaması hem küçük hem hızlıdır. Oyma sonrası koşu sayısı
 * artsa da paket tek seferliktir (maç başı / kurtarma). */
function netEncodeMask(terrain) {
  if (!terrain || !terrain.solid) return null;
  const w = terrain.w, h = terrain.h;
  const runs = [];
  let cur = terrain.solid[0] ? 1 : 0, count = 0;
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const v = terrain.solid[i] ? 1 : 0;
    if (v === cur) { count++; continue; }
    runs.push(count, cur);
    cur = v; count = 1;
  }
  runs.push(count, cur);
  return {
    v: NET_STATE_VERSION, w, h,
    hash: netHashMask(terrain.solid, w, h),
    runs: runs.join(","),
  };
}

// RLE paketini çözer. Bozuk paket (yanlış uzunluk/negatif koşu) reddedilir.
function netDecodeMask(payload) {
  if (!payload || !Number.isInteger(payload.w) || !Number.isInteger(payload.h)) {
    return { ok: false, reason: "BAD_MASK" };
  }
  const w = payload.w, h = payload.h;
  if (w <= 0 || h <= 0 || w > 4096 || h > 4096) return { ok: false, reason: "BAD_MASK_SIZE" };
  const parts = String(payload.runs || "").split(",");
  const solid = new Uint8Array(w * h);
  let idx = 0;
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const count = Number(parts[i]), value = Number(parts[i + 1]);
    if (!Number.isInteger(count) || count < 0 || (value !== 0 && value !== 1)) return { ok: false, reason: "BAD_MASK_RUNS" };
    if (idx + count > solid.length) return { ok: false, reason: "BAD_MASK_RUNS" };
    if (value === 1) solid.fill(1, idx, idx + count);
    idx += count;
  }
  if (idx !== solid.length) return { ok: false, reason: "BAD_MASK_LENGTH" };
  return { ok: true, w, h, solid, hash: netHashMask(solid, w, h) };
}

/* Maskeden yükseklik profili çıkarır (her sütunun en üst katı pikseli).
 * `paintTerrain` görsel araziyi bu profilden boyar; başlangıç arazisi bir
 * yükseklik alanı olduğu için görsel birebir tutar. Oyma sonrası mağara/alt
 * oyuklar görselde görünmez (çarpışma yine maskeden gelir). */
function netHeightsFromMask(solid, w, h) {
  const heights = new Array(w);
  for (let x = 0; x < w; x++) {
    let top = -1;
    for (let y = 0; y < h; y++) {
      if (solid[y * w + x]) { top = y; break; }
    }
    heights[x] = top < 0 ? h : top;
  }
  return heights;
}

function netCaptureTerrain(game) {
  if (!game || !game.terrain) return null;
  const payload = netEncodeMask(game.terrain);
  if (!payload) return null;
  payload.version = game.terrain.version || 0;
  payload.mapId = game.selectedMap ? game.selectedMap.id : null;
  return payload;
}

/* Misafir: hostun maskesini uygular ve görsel araziyi aynı profilden yeniden
 * boyar. `terrain.version` hostun sürümüne eşitlenir ki sonraki değişiklik
 * kayıtları sıra denetiminden geçsin. */
function netApplyTerrain(game, payload) {
  if (!game || !game.terrain) return { ok: false, reason: "NO_TERRAIN" };
  const dec = netDecodeMask(payload);
  if (!dec.ok) return dec;
  const t = game.terrain;
  if (t.w !== dec.w || t.h !== dec.h) return { ok: false, reason: "SIZE_MISMATCH" };
  t.solid.set(dec.solid);
  t.version = Number.isInteger(payload.version) ? payload.version : 0;
  if (typeof t.paintTerrain === "function") t.paintTerrain(netHeightsFromMask(t.solid, t.w, t.h));
  // Görsel oyuk katmanı da host maskesinden kurulmalı: aksi hâlde misafirde
  // arazi profilinin altındaki koyu katman hostunkinden farklı olur (oyuk
  // katmanı maskeden türetilir, yerel generate() sonucundan değil).
  if (typeof t.buildVoidLayer === "function") t.buildVoidLayer();
  return { ok: true, hash: dec.hash };
}

// Tek arazi değişikliği kaydı (oyma). Yuvarlanır: iki tarafta aynı tam sayılar.
function netTerrainChange(x, y, radius) {
  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    r: Math.round(radius * 100) / 100,
  };
}

/* Değişiklik kayıtlarını oynatır. Aynı parametrelerle `destroy` çağrıldığı için
 * iki tarafta maske birebir aynı olur (deterministik). Geçersiz kayıt atlanır. */
function netApplyTerrainChanges(game, records) {
  if (!game || !game.terrain || !Array.isArray(records)) return { ok: false, reason: "BAD_RECORDS", applied: 0 };
  let applied = 0;
  for (const rec of records) {
    if (!rec) continue;
    const x = Number(rec.x), y = Number(rec.y), r = Number(rec.r);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r) || r <= 0) continue;
    game.terrain.destroy(x, y, r);
    applied++;
  }
  return { ok: true, applied };
}

// ── Oyuncu durumu ───────────────────────────────────────────────────────────

// Sayısal alanlar: yalnız sonlu değerler yazılır (NaN/Infinity pakete girmez).
const NET_PLAYER_NUM_FIELDS = [
  "x", "y", "vx", "vy", "hp", "stamina", "aim", "facing", "walkAnim", "walkBlend",
  "walkPhase", "rollPhase", "weapon", "skillCooldown", "glideTurns",
];
// Mantıksal alanlar
const NET_PLAYER_BOOL_FIELDS = ["alive", "onGround", "blockShield"];
// Türetilmiş build alanları (misafir profil verisi olmadan aynı davransın)
const NET_BUILD_FIELDS = [
  "maxHp", "armor", "dmgMult", "weaponDamageMult", "knockbackTakenMult",
  "maxStamina", "moveSpeedMult", "jumpPowerMult", "glideGravityMult",
  "shieldStaminaRefund", "apparatusGlow", "aiDamageMult",
];

/* Görsel yumuşatma (misafir): snapshot 10 paket/sn gelir; bu alanlar doğrudan
 * yazılırsa robot 100 ms'lik adımlarla ZIPLAR (kullanıcı bildirimi: "misafir host
 * playerin hareketlerini kesik kesik görüyor full fps değil") ve yürüyüş
 * animasyonu paket aralarında yerel sönümle (walkAnim *= 0.82) bozulur — bacaklar
 * 1 ↔ 0.55 arasında gidip gelir ("yürüyüş animasyonu oynamıyor"). Yetkili değer
 * `_net_<alan>`da tutulur, GÖRÜNEN alan her kare hedefe doğru enterpole edilir. */
const NET_PLAYER_VISUAL_FIELDS = ["x", "y", "facing", "walkAnim", "walkBlend", "walkPhase", "rollPhase", "aim"];
// Enterpolasyonu en kısa yay üzerinden yapılacak alanlar (2π'de dönerler).
const NET_VISUAL_ANGLE_FIELDS = ["aim", "walkPhase", "rollPhase"];
// Yumuşatma AÇIKKEN doğrudan uygulanan alanlar (görsel alanlar hariç).
const NET_PLAYER_DIRECT_FIELDS = NET_PLAYER_NUM_FIELDS.filter((f) => NET_PLAYER_VISUAL_FIELDS.indexOf(f) < 0);
function _netIsVisualField(f) { return NET_PLAYER_VISUAL_FIELDS.indexOf(f) >= 0; }

/* Sayı taşıma: sonlu değer 3 ondalığa yuvarlanır. Yuvarlama hem paketi küçültür
 * (15-20 paket/sn bütçesi) hem de hash'i kayan nokta gürültüsünden arındırır:
 * 0.001 px farkı iki tarafı "farklı durum" saymaya yetmemeli. */
function _netNum(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.round(v * 1000) / 1000;
}

// Süreli etkiler (modül/parça): {factor, turns} gibi küçük nesneler; yalnız
// sonlu sayısal alanlar taşınır.
function _netEffect(obj, fields) {
  if (!obj || typeof obj !== "object") return null;
  const out = {};
  let any = false;
  for (const f of fields) {
    const v = _netNum(obj[f]);
    if (v === null) continue;
    out[f] = v;
    any = true;
  }
  return any ? out : null;
}

function _netAmmo(ammo) {
  const out = {};
  if (!ammo) return out;
  for (const id of Object.keys(ammo)) {
    const v = ammo[id];
    // Infinity (sınırsız) -1 olarak taşınır: JSON'da Infinity olmaz.
    if (v === Infinity) out[id] = -1;
    else if (typeof v === "number" && Number.isFinite(v)) out[id] = v;
  }
  return out;
}

function _netCapturePlayer(e, includeBuild) {
  if (!e) return null;
  const p = { id: e.charDef ? e.charDef.id : null };
  for (const f of NET_PLAYER_NUM_FIELDS) {
    // Misafirde görsel alanlar enterpole edilir; capture YETKİLİ değeri taşır
    // ("host ne gönderdi ↔ misafir ne uyguladı" hash karşılaştırması bozulmasın).
    const src = _netIsVisualField(f) && e["_net_" + f] != null ? e["_net_" + f] : e[f];
    const v = _netNum(src);
    if (v !== null) p[f] = v;
  }
  for (const f of NET_PLAYER_BOOL_FIELDS) p[f] = !!e[f];
  p.ammo = _netAmmo(e.ammo);
  // Build (türetilmiş istatistikler) maç boyunca DEĞİŞMEZ: yalnız başlangıç
  // snapshot'ında gönderilir, periyodik paketlerde taşınmaz (paket bütçesi).
  if (includeBuild) {
    p.build = {};
    for (const f of NET_BUILD_FIELDS) { const v = _netNum(e[f]); if (v !== null) p.build[f] = v; }
    p.build.skillId = e.skillId || null;
    p.build.skillKind = e.skillKind || null;
    p.build.parts = e.partLoadout || null;
  }
  p.nextShotMod = _netEffect(e.nextShotMod, ["dmgMult", "radiusMult", "pellets", "spread", "knockbackMult"]);
  p.damageReduce = _netEffect(e.damageReduce, ["factor", "turns"]);
  p.poison = _netEffect(e.poison, ["dps", "turns"]);
  p.dashAttack = _netEffect(e.dashAttack, ["damage", "knockback", "turns"]);
  p.lastShot = _netEffect(e.lastShot, ["aim", "power"]);
  return p;
}

// ── Mermi / mayın / yangın / kanca ──────────────────────────────────────────

function _netCaptureProjectile(pr) {
  if (!pr || !pr.spec) return null;
  return {
    x: _netNum(pr.x), y: _netNum(pr.y), vx: _netNum(pr.vx), vy: _netNum(pr.vy),
    weaponId: pr.spec.id, fuse: _netNum(pr.fuse), stuck: !!pr.stuck,
    drillLeft: _netNum(pr.drillLeft), split: !!pr._split, dead: !!pr.dead,
  };
}

function _netCaptureMine(m) {
  if (!m || !m.spec) return null;
  return { x: _netNum(m.x), y: _netNum(m.y), weaponId: m.spec.id, arm: _netNum(m.arm), owner: _netNum(m.owner) };
}

function _netCaptureFire(f) {
  if (!f) return null;
  return { x: _netNum(f.x), y: _netNum(f.y), life: _netNum(f.life), max: _netNum(f.max), dps: _netNum(f.dps), tick: _netNum(f.tick) };
}

/* Yetenek (modül) cast efekti: saf görsel (js/skill-fx.js). Snapshot'la
 * taşınmasaydı misafir hostun modül animasyonlarını HİÇ görmezdi (kullanıcı
 * bildirimi: "bazı silahların efektleri gözükmüyor"). */
function _netCaptureSkillFx(fx) {
  if (!fx || typeof fx.shape !== "string" || !fx.shape) return null;
  return {
    shape: fx.shape, kind: typeof fx.kind === "string" ? fx.kind : null,
    x: _netNum(fx.x), y: _netNum(fx.y), r: _netNum(fx.r),
    facing: _netNum(fx.facing), aim: _netNum(fx.aim),
    t: _netNum(fx.t), life: _netNum(fx.life), seed: _netNum(fx.seed),
    tint: typeof fx.tint === "string" ? fx.tint : null,
    accent: typeof fx.accent === "string" ? fx.accent : null,
  };
}

function _netCaptureTether(t) {
  if (!t) return null;
  return { owner: _netNum(t.owner), ax: _netNum(t.ax), ay: _netNum(t.ay), speed: _netNum(t.speed), life: _netNum(t.life), blocked: _netNum(t.blocked) };
}

/* Yetkili maç durumunun anlık görüntüsü. `hash` yalnız karşılaştırma içindir;
 * hesaplanırken kendisi dışarıda bırakılır (netSnapshotHash). */
function netCaptureState(game, opts) {
  const o = opts || {};
  const snap = {
    v: NET_STATE_VERSION,
    tick: Number.isInteger(o.tick) ? o.tick : 0,
    mapId: game.selectedMap ? game.selectedMap.id : null,
    phase: game.state || null,
    turn: _netNum(game.turn),
    turnTimer: _netNum(game.turnTimer),
    wind: _netNum(game.wind),
    terrainVersion: game.terrain ? (game.terrain.version || 0) : 0,
    shooterIdx: game.shooterIdx == null ? null : _netNum(game.shooterIdx),
    players: [],
    projectiles: [],
    mines: [],
    fires: [],
    fx: [],
    tether: _netCaptureTether(game.tether),
  };
  const includeBuild = o.includeBuild !== false;   // başlangıç: true, periyodik: false
  for (const p of game.players || []) snap.players.push(_netCapturePlayer(p, includeBuild));
  for (const pr of game.projectiles || []) { const c = _netCaptureProjectile(pr); if (c) snap.projectiles.push(c); }
  for (const m of game.mines || []) { const c = _netCaptureMine(m); if (c) snap.mines.push(c); }
  for (const f of game.fires || []) { const c = _netCaptureFire(f); if (c) snap.fires.push(c); }
  for (const f of game.skillFx || []) { const c = _netCaptureSkillFx(f); if (c) snap.fx.push(c); }
  return snap;
}

// Snapshot kimliği: `hash` alanı hariç kanonik JSON üzerinden.
function netSnapshotHash(snap) {
  if (!snap) return null;
  const copy = Object.assign({}, snap);
  delete copy.hash;
  try { return netHashText(JSON.stringify(copy)); } catch (e) { return null; }
}

// ── Apply (misafir) ─────────────────────────────────────────────────────────

function _netApplyNumbers(target, src, fields) {
  let n = 0;
  for (const f of fields) {
    const v = _netNum(src[f]);
    if (v === null) continue;
    target[f] = v;
    n++;
  }
  return n;
}

/* Misafir tarafı: snapshot'ı mevcut nesnelere uygular. Nesne KURMAZ (constructor
 * çalıştırılmaz), yalnız alan yazar; bu yüzden render işlevleri yeniden kurulmaz
 * (docs/multiplayer-plan.md §6.1/8). Eksik oyuncu/mermi listesi kabul edilir:
 * host kaç oyuncu gönderdiyse o kadar eşlenir.
 *
 * `opts.visMs` verilirse (oyun yolu: paket aralığı) konum/animasyon alanları
 * GÖRSEL YUMUŞATMAYA alınır: yetkili değer `_net_<alan>`a yazılır ve görünen
 * alanı her kare `netAdvanceVisuals` ilerletir. Verilmezse (saf test/sade
 * yol) eski davranış: alanlar doğrudan yazılır. */
function netApplyState(game, snap, opts) {
  if (!game || !snap || typeof snap !== "object") return { ok: false, reason: "BAD_SNAPSHOT", applied: 0 };
  if (snap.v !== NET_STATE_VERSION) return { ok: false, reason: "STATE_VERSION", applied: 0 };
  const o = opts || {};
  const visMs = Number.isFinite(o.visMs) && o.visMs > 0 ? o.visMs : 0;
  let applied = 0;

  const meta = ["turn", "turnTimer", "wind"];
  applied += _netApplyNumbers(game, snap, meta);
  if (typeof snap.phase === "string") game.state = snap.phase;
  if (snap.shooterIdx === null) game.shooterIdx = null;
  else if (_netNum(snap.shooterIdx) !== null) game.shooterIdx = snap.shooterIdx;
  if (game.terrain && Number.isInteger(snap.terrainVersion)) {
    // Host daha ileri bir arazi sürümü bildiriyorsa sürüm ilerletilir (kayıtlar
    // ayrı TERRAIN mesajıyla gelir; burada yalnız sayaç hizalanır).
    if (snap.terrainVersion > (game.terrain.version || 0)) game.terrain.version = snap.terrainVersion;
  }

  const players = game.players || [];
  const list = Array.isArray(snap.players) ? snap.players : [];
  for (let i = 0; i < list.length && i < players.length; i++) {
    const e = players[i], s = list[i];
    if (!e || !s) continue;
    if (visMs > 0) {
      // Görsel alanlar: mevcut GÖRÜNEN değer başlangıç, yeni yetkili değer
      // hedef. Çok kare süren enterpolasyon bitmeden yeni paket gelirse
      // hareket geriye sıçramaz (başlangıç daima görünen değerdir).
      for (const f of NET_PLAYER_VISUAL_FIELDS) e["_visFrom_" + f] = e[f];
      e._visMs = visMs;
      e._visT = 0;
      applied += _netApplyNumbers(e, s, NET_PLAYER_DIRECT_FIELDS);
      for (const f of NET_PLAYER_VISUAL_FIELDS) {
        const v = _netNum(s[f]);
        if (v === null) continue;
        e["_net_" + f] = v;
        applied++;
      }
    } else {
      applied += _netApplyNumbers(e, s, NET_PLAYER_NUM_FIELDS);
    }
    for (const f of NET_PLAYER_BOOL_FIELDS) if (typeof s[f] === "boolean") e[f] = s[f];
    if (s.build && typeof s.build === "object") {
      applied += _netApplyNumbers(e, s.build, NET_BUILD_FIELDS);
      if (typeof s.build.skillId === "string" || s.build.skillId === null) e.skillId = s.build.skillId;
      if (typeof s.build.skillKind === "string" || s.build.skillKind === null) e.skillKind = s.build.skillKind;
      if (s.build.parts && typeof s.build.parts === "object") e.partLoadout = s.build.parts;
    }
    if (s.ammo && typeof s.ammo === "object") {
      const ammo = {};
      for (const id of Object.keys(s.ammo)) {
        const v = s.ammo[id];
        if (v === -1) ammo[id] = Infinity;
        else if (typeof v === "number" && Number.isFinite(v)) ammo[id] = v;
      }
      e.ammo = ammo;
      applied++;
    }
    // Süreli etkiler: host null gönderdiyse misafirde de temizlenir.
    for (const f of ["nextShotMod", "damageReduce", "poison", "dashAttack", "lastShot"]) {
      if (Object.prototype.hasOwnProperty.call(s, f)) e[f] = s[f] || null;
    }
    // Ölü oyuncu görünür canı da sıfıra yakın kalır; çizim için tutarlılık.
    if (typeof s.hp === "number" && e.displayHp > s.hp + 0.001) e.displayHp = s.hp;
  }

  // Mermiler: host listesi neyse o; misafir kendi mermi nesnelerini yeniden kurar
  // (görsel nesne, simülasyon değil — hostun konumu doğrudur).
  if (Array.isArray(snap.projectiles)) applied += netRebuildProjectiles(game, snap.projectiles);
  if (Array.isArray(snap.mines)) applied += netRebuildMines(game, snap.mines);
  if (Array.isArray(snap.fires)) {
    const fires = [];
    for (const f of snap.fires) {
      const c = _netCaptureFire(f);
      if (c) fires.push({ x: c.x || 0, y: c.y || 0, life: c.life || 0, max: c.max || c.life || 1, dps: c.dps || 0, tick: c.tick || 0 });
    }
    if (game.fires) game.fires = fires;
  }
  if (Object.prototype.hasOwnProperty.call(snap, "tether")) game.tether = _netCaptureTether(snap.tether);
  // Yetenek cast efektleri: hostun listesi oynatılır (misafirin kendi kopyası
  // da hostta uygulandığı için aynı listede gelir — çift efekt olmaz).
  if (Array.isArray(snap.fx) && Array.isArray(game.skillFx)) netRebuildSkillFx(game, snap.fx);
  return { ok: true, applied };
}

/* Misafirde mermileri yeniden kurar (görsel katman). Spec kimliğiyle çözülür
 * (`projectileSpecById`): ana cephane + misket/tepe parçacıkları + yetenek
 * mermileri. Bilinmeyen kimlikte mermi atlanır; liste hostun yetkisindedir. */
function netRebuildProjectiles(game, list) {
  if (!game || !Array.isArray(list)) return 0;
  const out = [];
  for (const p of list) {
    if (!p || p.dead) continue;
    const spec = netProjectileSpec(p.weaponId);
    if (!spec || typeof Projectile !== "function") continue;
    const pr = new Projectile(p.x || 0, p.y || 0, p.vx || 0, p.vy || 0, spec);
    if (typeof p.fuse === "number") pr.fuse = p.fuse;
    pr.stuck = !!p.stuck;
    if (typeof p.drillLeft === "number") pr.drillLeft = p.drillLeft;
    pr._split = !!p.split;
    out.push(pr);
  }
  game.projectiles = out;
  return out.length;
}

/* Spec çözücü: `projectileSpecById` (weapons.js) varsa onu kullan — parçacık ve
 * yetenek mermilerini de bilir. Yoksa (eski/sade sandbox) `weaponById`ye düş. */
function netProjectileSpec(id) {
  if (typeof projectileSpecById === "function") return projectileSpecById(id);
  return typeof weaponById === "function" ? weaponById(id) : null;
}

/* Misafir: yetkili hedefe doğru görsel alanları yumuşatır (her kare çağrılır).
 * `_visMs` kurulmamışsa (yumuşatma kapalı, host, saf test) hiçbir şey yapmaz. */
function netAdvanceVisuals(game, dtMs) {
  const players = game && game.players;
  if (!Array.isArray(players)) return 0;
  const dt = Number.isFinite(dtMs) ? Math.max(0, dtMs) : 0;
  let n = 0;
  for (const e of players) {
    if (!e || !Number.isFinite(e._visMs) || e._visMs <= 0) continue;
    e._visT = Math.min(e._visMs, (Number.isFinite(e._visT) ? e._visT : e._visMs) + dt);
    const t = e._visMs > 0 ? e._visT / e._visMs : 1;
    for (const f of NET_PLAYER_VISUAL_FIELDS) {
      const target = e["_net_" + f];
      if (target == null) continue;
      const from = Number.isFinite(e["_visFrom_" + f]) ? e["_visFrom_" + f] : target;
      e[f] = NET_VISUAL_ANGLE_FIELDS.indexOf(f) >= 0
        ? _netLerpAngle(from, target, t)
        : from + (target - from) * t;
    }
    n++;
  }
  return n;
}

/* Açı enterpolasyonu: EN KISA yay üzerinden. walkPhase/rollPhase 2π'de döner,
 * düz lerp 5.9 → 0.2 geçişini geriye doğru çevirir ve bacaklar ters yönde
 * savrulurdu. */
function _netLerpAngle(a, b, t) {
  const TAU = Math.PI * 2;
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  else if (d < -Math.PI) d += TAU;
  return a + d * t;
}

/* Yetenek cast efektlerini yeniden kurar. Şekil (`shape`) ve yaş (`t`) hosttan
 * gelir; çizim `SKILL_FX_SHAPES[shape]` üzerinden yapıldığı için misafir aynı
 * animasyonu oynatır. `params` (modüle özel ölçüler) taşınmaz: çiziciler
 * çoğunlukla `seed`/`t`/`aim`/`facing` ile çalışır. */
function netRebuildSkillFx(game, list) {
  if (!game || !Array.isArray(game.skillFx) || !Array.isArray(list)) return 0;
  if (typeof SKILL_FX_SHAPES !== "object" || !SKILL_FX_SHAPES) return 0;
  const out = [];
  for (const f of list) {
    if (!f || typeof f.shape !== "string") continue;
    const entry = SKILL_FX_SHAPES[f.shape];
    if (!entry) continue;
    out.push({
      shape: f.shape, family: entry.family, kind: f.kind || null,
      x: f.x || 0, y: f.y || 0, r: f.r || 12,
      facing: f.facing < 0 ? -1 : 1,
      aim: typeof f.aim === "number" && Number.isFinite(f.aim) ? f.aim : -Math.PI / 4,
      tint: f.tint || "#ffd166", accent: f.accent || "#ffffff",
      params: {}, t: f.t || 0, life: f.life || entry.life || 28,
      dead: false, seed: f.seed || 0,
    });
  }
  game.skillFx = out;
  return out.length;
}

// Mayınlar: `{x, y, weaponId, arm, owner}` → nesne yeniden kurulur.
function netRebuildMines(game, list) {
  if (!game || !Array.isArray(list)) return 0;
  const out = [];
  for (const m of list) {
    if (!m) continue;
    const spec = netProjectileSpec(m.weaponId);
    if (!spec) continue;
    out.push({ x: m.x || 0, y: m.y || 0, spec, arm: m.arm || 0, owner: m.owner == null ? 0 : m.owner });
  }
  game.mines = out;
  return out.length;
}

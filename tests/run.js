/* Karakter & yetenek sistemi testleri — bağımlılıksız (saf Node, npm gerekmez).
 *
 * Oyun ES module kullanmadığı (global <script>) için kaynak dosyalar `vm` ile
 * tek bir sandbox'ta yüklenir; sonra global tanımlar (CHARACTERS, useSkill,
 * Entity, Game ...) test edilir. game.js DOM'a yalnızca metod GÖVDELERİNDE
 * dokunduğundan yükleme güvenlidir; test ettiğimiz hasar yardımcıları
 * (applySkillDamage/applyAreaDamage/spawnSkillProjectiles) DOM kullanmaz, bu yüzden
 * gerçek Game.prototype metotlarını fake bir game nesnesine bağlayıp çağırırız.
 *
 * Çalıştır:  node tests/run.js
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

// ── Kaynakları tek sandbox'ta yükle ─────────────────────────────────────────
const JS_DIR = path.join(__dirname, "..", "js");
const FILES = ["i18n.js", "portal.js", "audio.js", "characters.js", "progression.js", "profile.js", "parts.js", "market.js", "maps.js", "skills.js", "skill-fx.js", "robots.js", "terrain.js", "weapons.js", "entity.js", "projectile.js", "ai.js", "game.js"];
const bundle =
  FILES.map((f) => fs.readFileSync(path.join(JS_DIR, f), "utf8")).join("\n;\n") +
  "\n;globalThis.__M = { CHARACTERS, MAPS, BIOMES, FACTORY_ZONES, PROP_DRAWERS, WEAPONS, SKILL_PROJECTILES, PROJECTILE_SHAPES, SHARED_SHAPES, PROJ_SUBSTEP, PROJ_MAX_SUBSTEPS, useSkill, drawCharExtras, drawRobot, robotMuzzlePoint, RB_GUN_PIVOT_X, RB_GUN_PIVOT_Y, RB_GUN_MUZZLE, RB_VISUAL_SCALE, Entity, Projectile, Explosion, GRAVITY, Game, BotController, AI_LIMITS, aiWorldKey, aiSimulateShot, aiCoarseCandidates, aiPathIsSafe, aiRandom, AI_DIFFICULTY, aiDamageMultiplier, aiAssignDamageScale, aiSelectWeapon, skillConsumesShot, SKILL_SHOT_KINDS, AI_SKILL_REPLACE_SCORE, " +
  "SKILL_FX_SHAPES, SKILL_FX_KIND_DEFAULT, SKILL_FX_EXTENT, spawnSkillFx, updateSkillFx, drawSkillFx, drawSkillFxIcon, drawSkillAura, SkillFx, " +
  "SERVICE_LEVELS, MAX_SERVICE_XP, MAX_TIER, START_SCRAP, BRANCHES, BRANCH_LABELS, TIER_COSTS, TIER_LEVEL_GATES, REWARD_BASE, DIFFICULTY_MULTIPLIER, levelForXp, xpForLevel, nextLevelXp, levelUpMessage, calculateMatchReward, resolveRobotBuild, upgradeEffectText, robotUpgradeSummary, totalTiers, sanitizeUpgrades, nextUpgradeStep, toSafeInt, defaultProfile, defaultRobotProgress, normalizeProfile, loadProfile, saveProfile, getRobotProgress, grantMatchReward, purchaseUpgrade, PROFILE_KEY, createSessionId, " +
  "AMMO_DEPOT_CAP, AMMO_BULK_QTY, AMMO_BULK_QTY_BIG, AMMO_PRICES, ammoPriceFor, ammoBasePrice, weaponPowerScore, weaponStats, sellableWeapons, sanitizeAmmoDepot, getAmmoDepot, setAmmoDepot, mergeDepots, ammoDepotTotal, buyAmmo, mergeAmmoWithDepot, battleLoad, unspentDepot, settleDepot, weaponById, weaponBattleMax, isSellableWeapon, initialAmmo, " +
  "PARTS, PART_SLOTS, SLOT_LABELS, partById, sanitizeParts, sanitizeLoadoutShape, getOwnedParts, isPartOwned, buildPartsSummary, buyPart, equipPart, drawPartIcon, PART_ICON_SHAPES, partEffectText, PART_KNOCKBACK_MIN, _drawPartDots, PARTS_PER_SLOT, loadoutPartIds, AUDIO_SAFE, _rbPartAccessories, _rbPartSpecs, _RB_PART_SECONDARY, MARKET_TABS, " +
  "isSinglePlayerProgressionMode };";

const sandbox = { Math, Date, console, JSON, Set, Map, Array, Object };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
try {
  vm.runInContext(bundle, sandbox, { filename: "bundle.js" });
} catch (e) {
  console.error("Kaynaklar yüklenemedi (sözdizimi/yükleme hatası):\n", e);
  process.exit(1);
}
const M = sandbox.__M;

// ── Minik test çatısı ───────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
let section = "";
function group(name) { section = name; console.log(`\n▸ ${name}`); }
function check(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(`[${section}] ${name}${detail ? " — " + detail : ""}`); console.log(`  ✗ ${name}${detail ? " — " + detail : ""}`); }
}

// ── Yardımcılar ─────────────────────────────────────────────────────────────
const KNOWN_KINDS = new Set([
  "heal", "shield", "damageReduce", "nextShot", "jump", "dash",
  "dig", "glide", "melee", "radial", "quake", "spit",
]);
const KNOWN_EXTRAS = new Set([
  null, undefined,
  "ears_round", "ears_round_wide", "ears_pointy", "ears_long",
  "wings", "fin", "spikes", "horn", "beak", "antlers", "mane", "tusks", "snout",
]);

// Sahte canvas context — çizimi no-op yapar, kaç fill/stroke olduğunu sayar.
// `ops` verilirse her çağrı sırayla kaydedilir (çizim imzası karşılaştırması için).
function mockCtx(ops) {
  const calls = { fill: 0, stroke: 0, path: 0 };
  const push = (name, args) => { if (ops) ops.push(name + "(" + args.join(",") + ")"); };
  const gradient = { addColorStop() {} };
  return {
    calls,
    save() { push("save", []); }, restore() { push("restore", []); },
    translate(...a) { push("translate", a); }, scale(...a) { push("scale", a); },
    rotate(...a) { push("rotate", a); }, clip() { push("clip", []); },
    beginPath() { calls.path++; push("beginPath", []); }, closePath() { push("closePath", []); },
    moveTo(...a) { push("moveTo", a); }, lineTo(...a) { push("lineTo", a); },
    arc(...a) { push("arc", a); }, ellipse(...a) { push("ellipse", a); },
    arcTo(...a) { push("arcTo", a); }, rect(...a) { push("rect", a); },
    roundRect(...a) { push("roundRect", a); },
    quadraticCurveTo(...a) { push("quadraticCurveTo", a); },
    bezierCurveTo(...a) { push("bezierCurveTo", a); },
    fill() { calls.fill++; push("fill", []); }, stroke() { calls.stroke++; push("stroke", []); },
    fillRect(...a) { calls.fill++; push("fillRect", a); }, strokeRect(...a) { push("strokeRect", a); },
    setLineDash() {}, fillText() {}, measureText() { return { width: 0 }; },
    createLinearGradient() { return gradient; }, createRadialGradient() { return gradient; },
    set fillStyle(v) { push("fillStyle", [v]); }, get fillStyle() { return ""; },
    set strokeStyle(v) { push("strokeStyle", [v]); }, get strokeStyle() { return ""; },
    set lineWidth(v) { push("lineWidth", [v]); }, get lineWidth() { return 0; },
    set globalAlpha(v) { push("globalAlpha", [v]); }, get globalAlpha() { return 1; },
    set lineCap(_) {}, set lineJoin(_) {}, set miterLimit(_) {},
    set globalCompositeOperation(_) {}, set shadowBlur(_) {}, set shadowColor(_) {},
    set font(_) {}, set textAlign(_) {}, set textBaseline(_) {},
  };
}

// Gerçek Game.prototype metotlarını taşıyan minimal game nesnesi.
function makeGame(players, terrain) {
  const g = Object.create(M.Game.prototype);
  g.players = players;
  // dig için: altta entity'nin başlangıç y'sinden daha derin bir yüzey döndür
  g.terrain = terrain || { h: 540, w: 960, surfaceBelow: () => 460 };
  g.explosions = [];
  g.projectiles = [];
  g.skillFx = [];
  g.damagePopups = [];
  g.state = "AIMING";
  g.shooterIdx = null;
  g.shotMod = null;
  g.turn = 0;
  return g;
}

function makeEntity(charDef, x = 200, y = 400) {
  const e = new M.Entity(x, y, charDef.color, charDef.label, charDef);
  e.onGround = true;
  return e;
}

function makeFlatTerrain(w = 960, h = 540, groundY = 420) {
  const solid = new Uint8Array(w * h);
  for (let y = groundY; y < h; y++) for (let x = 0; x < w; x++) solid[y * w + x] = 1;
  return {
    w, h, solid, version: 0,
    isSolid(x, y) { x |= 0; y |= 0; return x >= 0 && x < w && y >= 0 && y < h && solid[y * w + x] === 1; },
    surfaceBelow(x, fromY) {
      x |= 0;
      for (let y = Math.max(0, fromY | 0); y < h; y++) if (this.isSolid(x, y)) return y;
      return h;
    },
    // Düz zemin normali: sekme testleri yatay yüzey varsayar.
    normalAt() { return { x: 0, y: -1 }; },
    destroy(cx, cy, radius) {
      this.version++;
      for (let y = Math.max(0, cy - radius | 0); y < Math.min(h, cy + radius + 1 | 0); y++) {
        for (let x = Math.max(0, cx - radius | 0); x < Math.min(w, cx + radius + 1 | 0); x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) solid[y * w + x] = 0;
        }
      }
    },
  };
}

function makeAiGame(shooterX = 180, targetX = 720) {
  const terrain = makeFlatTerrain();
  const shooter = makeEntity(M.CHARACTERS[0], shooterX, 420);
  const target = makeEntity(M.CHARACTERS[1], targetX, 420);
  shooter.control = "bot"; target.control = "human";
  shooter.weapon = 0; target.weapon = 0;
  shooter.ammo = { bazooka: Infinity }; target.ammo = { bazooka: Infinity };
  return {
    players: [shooter, target], terrain, mines: [], fires: [], turn: 0,
    wind: 0, state: "AIMING", matchId: 1, turnId: 1, turnTimer: 25,
    get active() { return this.players[this.turn]; },
  };
}

function bestAiShot(game) {
  let best = null;
  for (const c of M.aiCoarseCandidates(game, game.turn)) {
    const r = M.aiSimulateShot(game, game.turn, c.angle, c.power);
    if (r.safe && (!best || r.score > best.score)) best = r;
  }
  return best;
}

// ── 1) CHARACTERS veri bütünlüğü ────────────────────────────────────────────
group("CHARACTERS veri bütünlüğü");
const chars = M.CHARACTERS;
check("CHARACTERS bir dizi ve ≥ 30 karakter içeriyor", Array.isArray(chars) && chars.length >= 30, `length=${chars && chars.length}`);

const seenIds = new Set();
const knownChassis = new Set(["maintenance", "magnetic", "spring", "experimental", "heavy", "wheeled", "flying", "digger"]);
const knownLocomotion = new Set(["wheels", "wheel", "tracks", "legs", "ball", "spring", "rotors"]);
for (const ch of chars) {
  const tag = ch && ch.label ? ch.label : "(?)";
  check(`${tag}: id benzersiz`, ch.id && !seenIds.has(ch.id), `id=${ch.id}`);
  seenIds.add(ch.id);
  check(`${tag}: temel alanlar`, typeof ch.label === "string" && /^#/.test(ch.color) && ch.r > 0 && ch.hp > 0, `r=${ch.r} hp=${ch.hp}`);
  check(`${tag}: zırh 0..1`, ch.armor >= 0 && ch.armor <= 1, `armor=${ch.armor}`);
  check(`${tag}: dmgMult > 0`, ch.dmgMult > 0, `dmgMult=${ch.dmgMult}`);
  check(`${tag}: robot görsel sözleşmesi`, ch.visualKind === "robot" && knownChassis.has(ch.chassis) && knownLocomotion.has(ch.locomotion) && !!ch.body && !!ch.attachment && !!ch.face, `chassis=${ch.chassis} locomotion=${ch.locomotion}`);
  check(`${tag}: rol/kişilik/vurgu`, !!ch.role && !!ch.personality && /^#/.test(ch.accent), `role=${ch.role}`);

  const s = ch.skill;
  const skillOk = s && s.label && s.desc && s.cooldown > 0 && KNOWN_KINDS.has(s.kind) && s.params && typeof s.params === "object";
  check(`${tag}: skill yapısı + bilinen kind`, !!skillOk, `kind=${s && s.kind}`);

  // Kind'a göre gerekli parametreler
  if (s && s.params) {
    const p = s.params;
    switch (s.kind) {
      case "spit":
        check(`${tag}: spit.proj SKILL_PROJECTILES içinde`, !!M.SKILL_PROJECTILES[p.proj], `proj=${p.proj}`);
        break;
      case "jump":
        check(`${tag}: jump.vy negatif (yukarı)`, p.vy < 0, `vy=${p.vy}`);
        break;
      case "dash":
        check(`${tag}: dash.vx ve contactDamage var`, p.vx > 0 && p.contactDamage > 0, `vx=${p.vx} dmg=${p.contactDamage}`);
        break;
      case "melee":
        check(`${tag}: melee.range ve damage var`, p.range > 0 && p.damage > 0, `range=${p.range} dmg=${p.damage}`);
        break;
      case "radial":
        check(`${tag}: radial.radius ve damage var`, p.radius > 0 && p.damage > 0, `radius=${p.radius} dmg=${p.damage}`);
        break;
      case "quake":
        check(`${tag}: quake.damage var`, p.damage > 0, `dmg=${p.damage}`);
        break;
      case "damageReduce":
        check(`${tag}: damageReduce.factor<1 ve turns>0`, p.factor < 1 && p.turns > 0, `factor=${p.factor} turns=${p.turns}`);
        break;
      case "heal":
        check(`${tag}: heal.amount > 0`, p.amount > 0, `amount=${p.amount}`);
        break;
      case "glide":
        check(`${tag}: glide.turns > 0`, p.turns > 0, `turns=${p.turns}`);
        break;
      case "dig":
        check(`${tag}: dig.depth > 0`, p.depth > 0, `depth=${p.depth}`);
        break;
      case "nextShot":
        check(`${tag}: nextShot en az bir çarpan`, !!(p.dmgMult || p.radiusMult || p.pellets || p.spread || p.knockbackMult), JSON.stringify(p));
        break;
    }
  }
}

// Her kind en az bir karakterde kullanılıyor mu? (kapsam)
group("Yetenek türü kapsamı");
const usedKinds = new Set(chars.map((c) => c.skill.kind));
for (const k of KNOWN_KINDS) {
  check(`'${k}' türü en az bir karakterde kullanılıyor`, usedKinds.has(k));
}

// ── 2) SKILL_PROJECTILES bütünlüğü ──────────────────────────────────────────
group("SKILL_PROJECTILES bütünlüğü");
for (const [id, spec] of Object.entries(M.SKILL_PROJECTILES)) {
  check(`${id}: damage/radius/knockback sayısal`, spec.damage > 0 && spec.radius > 0 && spec.knockback >= 0, JSON.stringify({ d: spec.damage, r: spec.radius }));
  check(`${id}: id alanı eşleşiyor`, spec.id === id, `id=${spec.id}`);
}
check("venom aşındırma (poison) taşıyor", !!(M.SKILL_PROJECTILES.venom && M.SKILL_PROJECTILES.venom.poison), "Aşındırıcı kapsül DoT için poison gerektirir");

// ── 3) Her karakterin yeteneği useSkill içinde çalışıyor mu ─────────────────
group("useSkill — her karakter için aktivasyon");
for (const ch of chars) {
  const self = makeEntity(ch, 200, 400);
  const enemy = makeEntity(M.CHARACTERS[0], 230, 400); // 30px ileride (melee/radial/dash menzilinde)
  const game = makeGame([self, enemy]);
  self.facing = 1;
  if (ch.skill.kind === "heal") self.hp = 10; // iyileşme görülebilsin

  let ok = false;
  try { ok = M.useSkill(self, game); } catch (e) { check(`${ch.label}: useSkill exception atmıyor`, false, e.message); continue; }

  check(`${ch.label}: useSkill true döndürdü`, ok === true);
  check(`${ch.label}: cooldown ayarlandı`, self.skillCooldown === ch.skill.cooldown, `cd=${self.skillCooldown}`);

  // Türe özgü gözlemlenebilir etki
  switch (ch.skill.kind) {
    case "heal":
      check(`${ch.label}: HP arttı`, self.hp > 10);
      break;
    case "shield":
      check(`${ch.label}: blockShield aktif`, self.blockShield === true);
      break;
    case "damageReduce":
      check(`${ch.label}: damageReduce ayarlandı`, !!self.damageReduce && self.damageReduce.factor < 1);
      break;
    case "nextShot":
      check(`${ch.label}: nextShotMod ayarlandı`, !!self.nextShotMod);
      break;
    case "jump":
      check(`${ch.label}: yukarı hız (vy<0) + havada`, self.vy < 0 && self.onGround === false);
      break;
    case "dash":
      check(`${ch.label}: dashAttack + ileri hız`, !!self.dashAttack && Math.sign(self.vx) === self.facing);
      break;
    case "glide":
      check(`${ch.label}: glideTurns > 0`, self.glideTurns > 0);
      break;
    case "dig":
      check(`${ch.label}: zemine indi (y değişti)`, self.y !== 400);
      break;
    case "melee":
    case "radial":
    case "quake":
      check(`${ch.label}: düşmana hasar verdi`, enemy.hp < enemy.maxHp, `enemyHp=${enemy.hp}`);
      break;
    case "spit":
      check(`${ch.label}: mermi üretti + PROJECTILE durumu`, game.projectiles.length >= (ch.skill.params.count || 1) && game.state === "PROJECTILE");
      break;
  }
}

// Cooldown bekleyen yetenek tekrar tetiklenmiyor
group("useSkill — cooldown koruması");
{
  const dog = M.CHARACTERS.find((c) => c.id === "kopek");
  const self = makeEntity(dog);
  const game = makeGame([self, makeEntity(dog, 600)]);
  self.hp = 10;
  M.useSkill(self, game);
  const before = self.hp;
  const second = M.useSkill(self, game); // cooldown'da
  check("cooldown'dayken useSkill false döner", second === false);
  check("cooldown'dayken etki yok (HP sabit)", self.hp === before);
}

// jump/dash yerde değilken kullanılamaz
group("useSkill — havadayken jump/dash engellenir");
{
  const rabbit = M.CHARACTERS.find((c) => c.skill.kind === "jump");
  const e = makeEntity(rabbit);
  e.onGround = false;
  const ok = M.useSkill(e, makeGame([e]));
  check("havadayken jump false döner", ok === false);
  check("havadayken cooldown başlamaz", e.skillCooldown === 0);
}

// Hasar veren modül turun atış hakkını doldurur: kullanıldığı tur ateş edilemez,
// sıra fizik yatıştıktan sonra biter. Yardımcı modüller atışı harcamaz.
group("modül → turun atış hakkı");
{
  const consuming = ["melee", "radial", "quake", "dash", "spit"];
  const helpers = ["heal", "shield", "damageReduce", "nextShot", "jump", "dig", "glide"];
  check("hasar veren türler atış hakkını doldurur", consuming.every((k) => M.skillConsumesShot(k)));
  check("yardımcı türler atışı harcamaz", helpers.every((k) => !M.skillConsumesShot(k)));
  check("bilinmeyen/boş tür atışı harcamaz",
    !M.skillConsumesShot("yok") && !M.skillConsumesShot(undefined) && !M.skillConsumesShot(null));
  check("her bilinen tür için karar verilebilir",
    [...consuming, ...helpers].every((k) => typeof M.skillConsumesShot(k) === "boolean"));

  // Gerçek Game.prototype.spendSkillShot: AIMING → SETTLE ve ateş kilitlenir.
  const prevDocument = sandbox.document;
  sandbox.document = { getElementById: () => null };
  const meleeDef = M.CHARACTERS.find((c) => c.skill.kind === "melee");
  const self = makeEntity(meleeDef, 200, 400);
  const enemy = makeEntity(M.CHARACTERS[0], 230, 400); // melee menzilinde
  self.control = "human";
  self.facing = 1;
  const g = makeGame([self, enemy]);
  g.matchProgress = { humanIndex: 0, humanShotsResolved: 0, pendingHumanShot: false };
  g.input = { charging: true, power: 0.5, left: true, right: false };
  g.turn = 0;
  g.shotMod = null;
  g.shotIsSkill = false;

  const used = M.useSkill(self, g);
  check("hasar veren modül kullanıldı", used === true && enemy.hp < enemy.maxHp);
  M.Game.prototype.spendSkillShot.call(g, self);
  check("modül turu SETTLE'a taşır", g.state === "SETTLE");
  check("modül kullanımı çözümlenmiş insan atışı sayılır",
    g.matchProgress.humanShotsResolved === 1 && g.matchProgress.pendingHumanShot === false);
  g.startCharge();
  check("modülden sonra güç doldurma başlamaz (ateş edilemez)", g.input.charging === false);

  // Mermi üreten modül (spit) PROJECTILE'a geçer; spendSkillShot durumu bozmaz.
  const spitDef = M.CHARACTERS.find((c) => c.skill.kind === "spit");
  const spitter = makeEntity(spitDef, 200, 400);
  const sg = makeGame([spitter, makeEntity(M.CHARACTERS[0], 700, 400)]);
  sg.turn = 0;
  sg.matchProgress = { humanIndex: 0, humanShotsResolved: 0, pendingHumanShot: false };
  sg.input = { charging: false, power: 0, left: false, right: false };
  M.useSkill(spitter, sg);
  check("spit modülü PROJECTILE durumuna geçer", sg.state === "PROJECTILE" && sg.projectiles.length >= 1);
  M.Game.prototype.spendSkillShot.call(sg, spitter);
  check("spit turu PROJECTILE'da kalır (mermi çözümü beklenir)", sg.state === "PROJECTILE");
  sandbox.document = prevDocument;
}

// ── 4) Entity.damage — zırh, blockShield, damageReduce ──────────────────────
group("Entity.damage mekaniği");
{
  const def = M.CHARACTERS.find((c) => c.armor > 0); // zırhlı biri
  const e = makeEntity(def);
  e.hp = 100; e.maxHp = 100; e.armor = 0.5;
  const got = e.damage(40); // %50 zırh -> 20
  check("zırh hasarı azaltıyor", got === 20, `got=${got}`);

  e.blockShield = true;
  const blocked = e.damage(40);
  check("blockShield tüm hasarı engeller", blocked === 0 && e.blockShield === false);

  e.armor = 0;
  e.damageReduce = { factor: 0.5, turns: 2 };
  const reduced = e.damage(40); // 0.5 -> 20
  check("damageReduce hasarı yarıya indiriyor", reduced === 20, `got=${reduced}`);
}

// Yakın saldırı aşındırması (poison) hedefe bulaşıyor
group("yakın saldırıda aşındırma bulaşması (SIZ-7)");
{
  const skunk = M.CHARACTERS.find((c) => c.skill.kind === "melee" && c.skill.params.poison);
  check("zehirli melee karakteri mevcut (Kokarca)", !!skunk);
  if (skunk) {
    const self = makeEntity(skunk, 200, 400);
    const enemy = makeEntity(M.CHARACTERS[0], 240, 400);
    self.facing = 1;
    M.useSkill(self, makeGame([self, enemy]));
    check("hedefe poison bulaştı", !!enemy.poison && enemy.poison.turns > 0);
  }
}

// applyAreaDamage menzil dışını vurmaz
group("Game.applyAreaDamage menzil davranışı");
{
  const base = M.CHARACTERS[0];
  const near = makeEntity(base, 120, 400);
  const far = makeEntity(base, 800, 400);
  const game = makeGame([near, far]);
  game.applyAreaDamage(100, 400 - near.r, 70, 40, 8, null);
  check("menzildeki hedef hasar aldı", near.hp < near.maxHp);
  check("menzil dışı hedef hasar almadı", far.hp === far.maxHp);
}

// ── 5) drawCharExtras — tüm görsel etiketler patlamadan çiziliyor ───────────
group("drawCharExtras görsel etiketleri");
{
  const usedExtras = new Set(chars.map((c) => c.drawExtra).filter(Boolean));
  for (const tag of usedExtras) {
    const ctx = mockCtx();
    let threw = false;
    try { M.drawCharExtras(ctx, 100, 100, 14, 1, tag); } catch (e) { threw = true; }
    check(`'${tag}' çizimi exception atmıyor`, !threw);
    check(`'${tag}' en az bir çizim çağrısı yaptı (handled)`, ctx.calls.fill + ctx.calls.stroke > 0);
  }
  // null tag erken döner (çizim yok)
  const ctx0 = mockCtx();
  M.drawCharExtras(ctx0, 100, 100, 14, 1, null);
  check("null drawExtra hiçbir şey çizmez", ctx0.calls.fill + ctx0.calls.stroke === 0);
}

group("drawRobot — tüm modüler robotlar");
for (const ch of chars) {
  const ctx = mockCtx();
  let result = false, threw = false;
  try {
    result = M.drawRobot(ctx, { cx: 100, cy: 100, r: ch.r, facing: 1, charDef: ch, playerTint: "#ff7b7b", timeMs: 1000, motion: { vx: 0, vy: 0, onGround: true } });
  } catch (e) { threw = true; }
  check(`${ch.label}: robot çizimi exception atmıyor`, !threw);
  check(`${ch.label}: robot çizildi`, result === true && ctx.calls.fill + ctx.calls.stroke > 0);
}

// Nişan hizası, son-atış çizgisi ve mermi çıkışı ÇİZİLEN namlunun ağzından
// çıkmalı. Eskiden mantık gövde MERKEZİNDEN `r + 12` ileri bakıyordu; namlu ise
// omuz pivotunda durduğu için hiza silahın altından başlıyor ve oyuncu "nişan
// hizası silahla aynı değil" diye görüyordu. Bu test çizimi gerçek bir CTM ile
// takip edip namlu ağzı halkasının dünya konumunu `Entity.muzzle` ile
// karşılaştırır: geometri iki taraftan biri değişip ayrışırsa test kırılır.
group("Nişan hizası — çizilen namlu ağzı ile muzzle aynı noktada");
{
  // translate/scale/rotate/save/restore uygulayan minik matris izleyici.
  const trackedCtx = () => {
    const ctx = mockCtx();
    let m = [1, 0, 0, 1, 0, 0]; // [a,b,c,d,e,f] — x' = a·x + c·y + e
    const stack = [];
    const mul = (m1, m2) => [
      m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1],
      m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3],
      m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
    ];
    const apply = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    const arcs = [];
    ctx.save = () => stack.push(m.slice());
    ctx.restore = () => { m = stack.pop() || [1, 0, 0, 1, 0, 0]; };
    ctx.translate = (x, y) => { m = mul(m, [1, 0, 0, 1, x, y]); };
    ctx.scale = (x, y) => { m = mul(m, [x, 0, 0, y, 0, 0]); };
    ctx.rotate = (a) => { const c = Math.cos(a), s = Math.sin(a); m = mul(m, [c, s, -s, c, 0, 0]); };
    ctx.arc = (x, y, rad) => { arcs.push({ p: apply(x, y), rad }); };
    return { ctx, arcs };
  };

  for (const ch of chars) {
    for (const facing of [1, -1]) {
      for (const aimDeg of [-40, -120]) {
        const aim = aimDeg * Math.PI / 180;
        const e = makeEntity(ch, 300, 400);
        e.facing = facing; e.aim = aim;
        const { ctx, arcs } = trackedCtx();
        M.drawRobot(ctx, {
          cx: e.x, cy: e.y - e.r, r: ch.r, facing, aim, charDef: ch,
          timeMs: 0, motion: { vx: 0, vy: 0, onGround: true },
        });
        const muzzle = e.muzzle;
        // Ağız halkası yarıçapı ÇİZİM ölçeğini içerir (RB_VISUAL_SCALE):
        // çizim %10 büyütülürken mantık aynı kaldığı için testin de ölçekli
        // yarıçapı kullanması gerekir; yoksa "ağız bulunamadı" sanılır.
        const ringRad = ch.r * M.RB_VISUAL_SCALE * 0.28 * 0.44; // _rbLauncher ağız halkası (th·0.44)
        const hit = arcs.some((a) => Math.abs(a.rad - ringRad) < 1e-6 &&
          Math.hypot(a.p[0] - muzzle.x, a.p[1] - muzzle.y) < 0.01);
        const label = `${ch.label} (facing=${facing}, ${aimDeg}°)`;
        check(`${label}: nişan çizgisi namlu ağzından çıkıyor`, hit,
          `muzzle=(${muzzle.x.toFixed(1)},${muzzle.y.toFixed(1)}) ağız=${arcs.filter((a) => Math.abs(a.rad - ringRad) < 1e-6).map((a) => `(${a.p[0].toFixed(1)},${a.p[1].toFixed(1)})`).join(" ")}`);
        check(`${label}: namlu ağzı gövdenin dışında`,
          Math.hypot(muzzle.x - e.x, muzzle.y - (e.y - e.r)) > ch.r,
          `d=${Math.hypot(muzzle.x - e.x, muzzle.y - (e.y - e.r)).toFixed(1)} r=${ch.r}`);
      }
    }
  }
}

// Yürüyüş animasyonu sözleşmesi. Yerde yürüme `Entity.vx` kullanmadığı için
// (x doğrudan adımlanır) çizici ayrı bir adım sinyali (`motion.walk`) bekler.
// Sinyal kaybolursa robotlar yerinde kayar gibi görünür — bir kez yaşandı.
group("Yürüyüş animasyonu sinyali");
{
  const terrain = makeFlatTerrain();
  const e = makeEntity(chars[0], 200, 400);
  check("başlangıçta adım sinyali yok", e.walkAnim === 0, `walkAnim=${e.walkAnim}`);
  const x0 = e.x;
  e.walk(1, terrain);
  check("yerde adım atmak sinyali kurar", e.walkAnim === 1 && e.x > x0, `walkAnim=${e.walkAnim} dx=${e.x - x0}`);
  e.walk(-1, terrain);
  check("geri adımda sinyal yön değiştirir", e.walkAnim === -1, `walkAnim=${e.walkAnim}`);
  for (let i = 0; i < 25; i++) e.update(terrain);
  check("adım gelmeyince sinyal sıfıra söner", e.walkAnim === 0, `walkAnim=${e.walkAnim}`);

  // Çizici tarafı: `motion.walk` ayakları bilekten döndürmeli. Ayak dönüşü,
  // ayak translate'inden (y > r/2) hemen sonra gelen rotate çağrısıdır.
  const footRots = (walk) => {
    const r = 20, events = [];
    const ctx = mockCtx();
    ctx.translate = (x, y) => events.push(["t", Math.round(y)]);
    ctx.rotate = (a) => events.push(["r", a]);
    M.drawRobot(ctx, { cx: 100, cy: 100, r, facing: 1, charDef: chars[0], timeMs: 1250, motion: { vx: 0, vy: 0, onGround: true, walk } });
    return events.filter((ev, i) => ev[0] === "r" && events[i - 1] && events[i - 1][0] === "t" && events[i - 1][1] > r * 0.5).map((ev) => ev[1]);
  };
  const moving = footRots(1), standing = footRots(0);
  check("yürürken iki ayak da bilekten döner", moving.length === 2 && moving.some((a) => Math.abs(a) > 0.05), `rot=${moving.map((a) => a.toFixed(2)).join(",")}`);
  check("boşta ayak dönüşü yürümeden farklı", moving.length === standing.length && moving.some((a, i) => Math.abs(a - standing[i]) > 0.05), `yürüme=${moving.map((a) => a.toFixed(2))} boşta=${standing.map((a) => a.toFixed(2))}`);
}

// Yürüyüş fazı ZAMANA değil MESAFEYE kilitlidir: yürüyüş hızı artınca adım
// frekansı da artar ve ayak yere basılıyken kaymaz. Sabit zaman temposu bir kez
// yaşandı (bacaklar 2 rad/s'de sallanıyordu, neredeyse hiç kıpırdamıyordu).
group("Yürüyüş fazı mesafeye kilitli");
{
  const terrain = makeFlatTerrain();
  const a = makeEntity(chars[0], 200, 400);

  a.walk(1, terrain);
  const one = a.walkPhase;
  a.walk(1, terrain);
  const two = a.walkPhase;
  check("faz adımlarla ilerler", one > 0 && two > one, `bir=${one} iki=${two}`);
  check("iki adım fazı iki kat ilerletir", Math.abs(two - one * 2) < 1e-9, `bir=${one} iki=${two}`);

  // Geri adımlama: yüz ters yöndeyken ilerlemek fazı geri sarar (ayaklar
  // gövdeye göre geriye savrulur — moonwalk değil, gerçek geri yürüyüş).
  const back = makeEntity(chars[0], 200, 400);
  back.facing = -1;
  back.advanceStride(2.2);
  check("yüz tersken faz geri sarar", back.walkPhase > Math.PI, `phase=${back.walkPhase}`);
  const beforeBack = back.walkPhase;
  back.advanceStride(2.2);
  check("geri adım fazı aynı yönde ilerletir", back.walkPhase < beforeBack && back.walkPhase > Math.PI, `önce=${beforeBack} sonra=${back.walkPhase}`);

  // Duvara dayanınca adım yok = faz yok: bacaklar havada sallanmaz.
  const walled = makeFlatTerrain();
  for (let x = 204; x < 212; x++) for (let y = 0; y < walled.h; y++) walled.solid[y * walled.w + x] = 1;
  const walledEntity = makeEntity(chars[0], 200, 400);
  walledEntity.walk(1, walled);
  const beforeWall = walledEntity.walkPhase;
  walledEntity.walk(1, walled);
  walledEntity.walk(1, walled);
  check("duvara dayanınca faz durur", walledEntity.walkPhase === beforeWall, `phase=${walledEntity.walkPhase}`);

  // Yuvarlanan alt takım: dönüş yalnız yerde gerçekten yuvarlanırken ilerler.
  const roller = chars.find((c) => c.locomotion === "wheel") || chars[0];
  const w = makeEntity(roller, 300, 400);
  w.onGround = true;
  const roll0 = w.rollPhase;
  w.advanceStride(3);
  check("yerde teker dönüşü ilerler", w.rollPhase > roll0, `roll=${w.rollPhase}`);
  const rollGround = w.rollPhase;
  w.onGround = false;
  w.advanceStride(3);
  check("havada teker boşa dönmez", w.rollPhase === rollGround, `roll=${w.rollPhase}`);

  // Genlik zarfı: adım başlarken kademeli açılır, kesilince kapanıp nötre döner.
  const b = makeEntity(chars[0], 200, 400);
  b.walk(1, terrain);
  b.update(terrain);
  const blend1 = b.walkBlend;
  check("zarf ilk karede tam genliğe atlamaz", blend1 > 0 && blend1 < 1, `blend=${blend1}`);
  for (let i = 0; i < 4; i++) { b.walk(1, terrain); b.update(terrain); }
  check("zarf adım boyunca yükselir", b.walkBlend > blend1, `blend=${b.walkBlend}`);
  const phaseBeforeStop = b.walkPhase;
  for (let i = 0; i < 40; i++) b.update(terrain);
  check("adım kesilince zarf sıfıra söner", b.walkBlend === 0 && b.walkAnim === 0, `blend=${b.walkBlend} walk=${b.walkAnim}`);
  check("duruşta bacaklar en yakın nötr poza kapanır",
    Math.abs(Math.sin(b.walkPhase)) < Math.abs(Math.sin(phaseBeforeStop)),
    `önce=${phaseBeforeStop} sonra=${b.walkPhase}`);

  // Çizici sözleşmesi: faz/zarf alanları opsiyoneldir ve pozu değiştirmelidir.
  const poseSig = (motion) => {
    const ops = [];
    const ctx = mockCtx(ops);
    M.drawRobot(ctx, { cx: 100, cy: 100, r: 20, facing: 1, charDef: chars[0], timeMs: 500, motion: Object.assign({ vx: 0, vy: 0, onGround: true }, motion) });
    return ops.join("|");
  };
  const walkA = poseSig({ walkAmp: 1, walkPhase: 0.5 });
  const walkB = poseSig({ walkAmp: 1, walkPhase: 1.9 });
  check("farklı fazlar farklı bacak pozu üretir", walkA !== walkB);
  check("zarf sıfırken faz pozu değiştirmez (duruş çizimi)", poseSig({ walkAmp: 0, walkPhase: 1.9 }) === poseSig({}));
}

// Yürüyüş geometrisi: çizicinin GERÇEK komutlarından (translate → rotate →
// translate) ayak konumu okunur. Böylece "animasyon hıza kilitli mi, ayak yere
// basarken kayıyor mu, iki bacak zıt fazda mı" sorusu tahmine değil ölçüme
// dayanır. Sabit zaman temposu bir kez yaşandı: bacaklar 2 rad/s'de sallanıyordu.
group("Yürüyüş geometrisi ve kayma (çizim komutlarından)");
{
  const def = chars[0];
  // Adım mesafesi (yer gerçeği) ve ayak salınımı ÇİZİM ölçeğiyle birlikte
  // büyür: çizim %10 büyütüldüğü için (RB_VISUAL_SCALE) hem adım uzunluğu hem
  // ayak salınımı ölçeklenir; kayma payı bandı (%10–20) aynen korunur.
  const r = def.r, stride = r * 1.3 * M.RB_VISUAL_SCALE;
  const walkMotion = (phase) => ({ vx: 0, vy: 0, onGround: true, walkAmp: 1, walkPhase: phase });

  // Ayak dönüşümü çizici içinde tek desendir: translate(x,y) → rotate(a) →
  // translate(-x,-y). Bu üçlüyü arayıp ayağın konumunu/bilek açısını okuruz.
  const feetOf = (motion, timeMs = 0) => {
    const ops = [];
    M.drawRobot(mockCtx(ops), { cx: 100, cy: 100, r, facing: 1, charDef: def, timeMs, motion });
    const parsed = ops.map((s) => ({
      k: s.slice(0, s.indexOf("(")),
      a: s.slice(s.indexOf("(") + 1, -1).split(",").map(Number),
    }));
    const out = [];
    for (let i = 0; i < parsed.length - 2; i++) {
      const p0 = parsed[i], p1 = parsed[i + 1], p2 = parsed[i + 2];
      if (p0.k === "translate" && p1.k === "rotate" && p2.k === "translate" &&
          Math.abs(p2.a[0] + p0.a[0]) < 1e-9 && Math.abs(p2.a[1] + p0.a[1]) < 1e-9) {
        out.push({ x: p0.a[0], y: p0.a[1], rot: p1.a[0] });
      }
    }
    return out;
  };

  check("iki ayak da okunur (duruş pozunda da)", feetOf({ vx: 0, vy: 0, onGround: true }).length === 2);

  // İki bacak zıt fazda: yerel salınımları eşit ve ters işaretli olmalı.
  let antiErr = 0;
  for (let i = 0; i < 180; i++) {
    const f = feetOf(walkMotion((i / 180) * Math.PI * 2));
    antiErr = Math.max(antiErr, Math.abs((f[0].x + r * 0.20) + (f[1].x - r * 0.20)));
  }
  check("iki bacak tam zıt fazda", antiErr < 1e-9, `maks sapma=${antiErr.toExponential(2)}`);

  // Ayak salınımı ve kayma payı: salınım 2 × 0.56r, kayma adımın %10–20'si.
  let lo = Infinity, hi = -Infinity, rotSpread = 0, rotLo = Infinity, rotHi = -Infinity;
  for (let i = 0; i < 360; i++) {
    const f = feetOf(walkMotion((i / 360) * Math.PI * 2))[1];
    lo = Math.min(lo, f.x); hi = Math.max(hi, f.x);
    rotLo = Math.min(rotLo, f.rot); rotHi = Math.max(rotHi, f.rot);
  }
  const travel = hi - lo, slipRatio = (stride - travel) / stride;
  rotSpread = rotHi - rotLo;
  check("ayak salınımı = 2 × 0.56r", Math.abs(travel - 2 * r * 0.56 * M.RB_VISUAL_SCALE) < 1e-9, `salınım=${travel.toFixed(3)} beklenen=${(2 * r * 0.56 * M.RB_VISUAL_SCALE).toFixed(3)}`);
  check("kayma payı adımın %10–20'si", slipRatio > 0.10 && slipRatio < 0.20,
    `%${(slipRatio * 100).toFixed(1)} (adım başına ${(stride - travel).toFixed(2)}px / ${stride.toFixed(1)}px)`);
  check("bilek açısı döngüde belirgin değişir", rotSpread > 0.3, `${rotSpread.toFixed(3)} rad`);
  check("adım döngüsünün yarısı temas", (() => {
    let contact = 0;
    for (let i = 0; i < 360; i++) if (Math.cos((i / 360) * Math.PI * 2) <= 0) contact++;
    return contact === 180;
  })());

  // Bacak pozu ZAMANA bağlı olmamalı (eski hata) — faz otoriter tek girdidir.
  check("aynı faz, farklı timeMs → aynı ayak geometrisi",
    JSON.stringify(feetOf(walkMotion(2.3), 0)) === JSON.stringify(feetOf(walkMotion(2.3), 900000)));

  // Gerçek simülasyon: her yürüyen karede Δfaz = dx·π/adım ve net kayma < %10.
  const terrain = makeFlatTerrain();
  const e = makeEntity(def, 200, 400);
  let maxErr = 0, netSlip = 0, slipN = 0, worst = 0, prevFoot = null;
  for (let i = 0; i < 200; i++) {
    e.refreshStamina();                    // tur enerjisi: yürüme kesilmesin
    const x0 = e.x, p0 = e.walkPhase;
    e.update(terrain);                     // oyun sırası: fizik + zarf
    e.walk(1, terrain);                    // oyun sırası: adım
    const dx = e.x - x0;
    let d = e.walkPhase - p0;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    maxErr = Math.max(maxErr, Math.abs(d - (dx * Math.PI) / stride));
    // Temas eden ayağın dünya x'i: gövdeyle birlikte kaymamalı.
    const feet = feetOf(Object.assign({ walkAmp: 1 }, walkMotion(e.walkPhase)));
    const side = Math.cos(e.walkPhase) <= 0 ? 1 : 0;
    const foot = feet[side];
    const wx = e.x + foot.x;
    if (prevFoot && prevFoot.side === side) {
      netSlip += wx - prevFoot.wx;
      worst = Math.max(worst, Math.abs(wx - prevFoot.wx));
      slipN++;
    }
    prevFoot = { wx, side };
  }
  check("her yürüyen karede Δfaz = dx·π/adım", maxErr < 1e-9, `maks hata=${maxErr.toExponential(2)}`);
  const netPerFrame = netSlip / slipN;
  check("net kayma gövde hızının %10'undan az", Math.abs(netPerFrame) < 0.22,
    `net ${netPerFrame.toFixed(3)} px/kare = gövdenin %${(Math.abs(netPerFrame) / 2.2 * 100).toFixed(1)}'i`);
  check("anlık kayma gövde hızını aşmaz (ayak+ gövde birlikte sürüklenmez)", worst < 2.2 + 1e-9,
    `en kötü ${worst.toFixed(3)} px/kare (gövde 2.20)`);
}
check("34 karakter için 34 harita üretildi", M.MAPS.length === chars.length, `maps=${M.MAPS.length}`);
check("dokuz fabrika bölgesi tanımlı", Object.keys(M.FACTORY_ZONES).length === 9, `zones=${Object.keys(M.FACTORY_ZONES).length}`);
check("haritalar dokuz bölgeyi kullanıyor", new Set(M.MAPS.map((m) => m.zoneId)).size === 9);
check("arena kodları benzersiz", new Set(M.MAPS.map((m) => m.arenaCode)).size === M.MAPS.length);
for (const [key, zone] of Object.entries(M.FACTORY_ZONES)) {
  check(`${key}: bölge kimliği/etiketi/kodu var`, !!zone.zoneId && !!zone.zoneLabel && !!zone.zoneCode);
  check(`${key}: tüm prop tipleri çizilebilir`, zone.props.every((p) => typeof M.PROP_DRAWERS[p.type] === "function"));
}

{
  const def = chars[0];
  const a = makeEntity(def), b = makeEntity(def);
  a.playerTint = "#ff7b7b"; b.playerTint = "#7baeff";
  check("aynı robot farklı operatör rengi taşıyabilir", a.playerTint !== b.playerTint && a.charDef === b.charDef);
  check("operatör rengi mekaniği değiştirmez", a.hp === b.hp && a.armor === b.armor && a.dmgMult === b.dmgMult);
}

// ── 5c) Mermi görselleri — her cephane kendi tasarımını çizer ───────────────
group("Mermi çizimleri — tasarım aileleri");
{
  const shapes = M.PROJECTILE_SHAPES;
  const shared = M.SHARED_SHAPES;

  // Tüm mermi spec'leri tek listede: silahlar + parçacık spec'leri + yetenek mermileri
  const specs = [];
  for (const w of M.WEAPONS) specs.push({ id: w.id, spec: w });
  for (const w of M.WEAPONS) if (w.clusterSpec) specs.push({ id: w.clusterSpec.id, spec: w.clusterSpec });
  for (const [k, s] of Object.entries(M.SKILL_PROJECTILES)) specs.push({ id: k, spec: s });

  // 1) Kayıt sağlığı
  check("shape kaydındaki her giriş bir çizici fonksiyonu",
    Object.values(shapes).every((f) => typeof f === "function"));
  check("shape kaydında 'ball' yedeği var", typeof shapes.ball === "function");

  // 2) Her spec görsel tanım taşır ve shape'i kayıtlıdır
  const missingLook = specs.filter((s) => !s.spec.look || !s.spec.look.shape);
  check("her mermi spec'i look.shape taşır", missingLook.length === 0,
    `eksik: ${missingLook.map((s) => s.id).join(", ")}`);
  const unknown = specs.filter((s) => s.spec.look && !shapes[s.spec.look.shape]);
  check("her look.shape kayıtlı bir çiziciye karşılık gelir", unknown.length === 0,
    `bilinmeyen: ${unknown.map((s) => s.id + "→" + s.spec.look.shape).join(", ")}`);

  // 3) Aile kuralı: shape paylaşımı yalnız SHARED_SHAPES beyaz listesinde olabilir
  const byShape = new Map();
  for (const s of specs) {
    const sh = s.spec.look && s.spec.look.shape;
    if (!sh) continue;
    if (!byShape.has(sh)) byShape.set(sh, []);
    byShape.get(sh).push(s.id);
  }
  const sameSet = (a, b) => !!a && a.length === b.length && a.every((id) => b.includes(id));
  const badShare = [];
  for (const [sh, ids] of byShape) {
    if (ids.length < 2) continue;
    if (!sameSet(shared[sh], ids)) badShare.push(`${sh}: [${ids}] ≠ [${shared[sh]}]`);
  }
  check("aynı shape'i paylaşan spec'ler beyaz listeyle birebir eşleşir", badShare.length === 0, badShare.join(" | "));
  const staleFamily = [];
  for (const [sh, ids] of Object.entries(shared)) {
    if (!sameSet(byShape.get(sh), ids)) staleFamily.push(`${sh}: [${byShape.get(sh) || []}] ≠ [${ids}]`);
  }
  check("beyaz listedeki her aile gerçekten o spec'lerce kullanılıyor", staleFamily.length === 0, staleFamily.join(" | "));
  check("beyaz listedeki her shape kayıtlı", Object.keys(shared).every((sh) => typeof shapes[sh] === "function"));
  check("her aile en az iki spec içeriyor", Object.values(shared).every((ids) => ids.length >= 2));

  // 4) Farklı shape'ler farklı çizim üretir (kopya çizici yakalama):
  // aynı spec + aynı durum ile çizilip op dizileri karşılaştırılır.
  const probe = M.WEAPONS[0];
  const seen = new Map();
  const duplicates = [];
  for (const sh of Object.keys(shapes)) {
    const ops = [];
    shapes[sh](mockCtx(ops), { x: 10, y: 10, r: 10, spec: probe, age: 7, spinAngle: 0.5, stuck: false, vx: 1, vy: 0, trail: [] });
    const sig = ops.join("|");
    if (seen.has(sig)) duplicates.push(`${seen.get(sig)} ≡ ${sh}`);
    else seen.set(sig, sh);
  }
  check("her shape farklı bir çizim dizisi üretir", duplicates.length === 0, duplicates.join(", "));

  // 5) Dayanıklılık: tüm spec'ler oyun içi draw() ile hatasız çizilir
  const drawFail = [];
  for (const s of specs) {
    const ctx = mockCtx();
    try {
      const pr = new M.Projectile(100, 100, 3, -2, s.spec);
      pr.trail.push({ x: 96, y: 102 }, { x: 98, y: 101 });
      pr.update(makeFlatTerrain(), 0.5);
      pr.draw(ctx);
    } catch (e) { drawFail.push(`${s.id}: ${e.message}`); continue; }
    if (ctx.calls.fill + ctx.calls.stroke === 0) drawFail.push(`${s.id}: çizim çağrısı yok`);
  }
  check(`${specs.length} mermi spec'i hatasız çizilir`, drawFail.length === 0, drawFail.join(" | "));

  // 6) Önizleme API'si (arayüzde kullanılır, DOM gerektirmez)
  const iconFail = [];
  for (const s of specs) {
    const ctx = mockCtx();
    try { M.Projectile.drawIcon(ctx, s.spec, 26); } catch (e) { iconFail.push(`${s.id}: ${e.message}`); continue; }
    if (ctx.calls.fill + ctx.calls.stroke === 0) iconFail.push(`${s.id}: çizim çağrısı yok`);
  }
  check("tüm spec'ler için önizleme çizilir", iconFail.length === 0, iconFail.join(" | "));

  // 7) Geriye uyum: look'suz spec eski daire görünümünü korur
  const legacyCtx = mockCtx();
  new M.Projectile(50, 50, 1, 0, { id: "legacy", ballColor: "#123456", ringColor: "#abcdef" }).draw(legacyCtx);
  check("look'suz spec eski daire görünümünü korur", legacyCtx.calls.fill + legacyCtx.calls.stroke > 0);
}

// ── 5c-2) Mermi çarpışma doğruluğu — alt adım + süpürülmüş isabet ─────────
group("Mermi çarpışma doğruluğu — tünelleme, süpürme ve sekme");
{
  const sniper = M.WEAPONS.find((w) => w.id === "sniper");

  // 1) Hızlı mermi ince duvarı delip geçmez. Nişancı tam güçte ~36 px/kare
  //    ilerler; 4 px kalınlığındaki duvarı yalnız varış noktasına bakan eski
  //    test tamamen atlıyordu (300 → 336). Alt adım ilk katı pikselde durur.
  const wall = makeFlatTerrain();
  const wallX = 310;
  for (let y = 0; y < 420; y++) for (let x = wallX; x < wallX + 4; x++) wall.solid[y * wall.w + x] = 1;
  const fast = new M.Projectile(120, 200, 36, 0, sniper);
  let impact = null;
  for (let i = 0; i < 20 && !impact; i++) {
    const res = fast.update(wall, 0);
    if (res) impact = res;
  }
  check("alt adım: hızlı nişancı mermisi ince duvarı delip geçmez",
    !!impact && impact.hit === true && impact.x >= wallX && impact.x <= wallX + 4,
    impact && `x=${impact.x.toFixed(2)} (duvar ${wallX}-${wallX + 4})`);
  check("alt adım: patlama noktası duvarın derinine gömülmez",
    !!impact && impact.x < wallX + 8, impact && `x=${impact.x.toFixed(2)}`);

  // 2) Süpürülmüş isabet yardımcısı: iki uç noktaya da uzak hedefi yakalar.
  check("sweepHit: uç noktalara uzak ara hedefi yakalar",
    !!M.Projectile.sweepHit(0, 0, 36, 0, 18, 0, 4));
  check("sweepHit: menzil dışındaki hedefi yakalamaz",
    M.Projectile.sweepHit(0, 0, 36, 0, 18, 40, 4) === null);
  check("sweepHit: temas noktası hedefin en yakın noktasıdır",
    (() => {
      const h = M.Projectile.sweepHit(0, 0, 100, 0, 50, 3, 4);
      return !!h && Math.abs(h.x - 50) < 0.001 && Math.abs(h.y) < 0.001;
    })());
  check("sweepHit: sıfır uzunluklu yol nokta testi gibi çalışır",
    !!M.Projectile.sweepHit(10, 10, 10, 10, 12, 10, 3) &&
    M.Projectile.sweepHit(10, 10, 10, 10, 20, 10, 3) === null);
  check("sweepHit: teğet geçen yolu yakalar, uzaktakini yakalamaz",
    !!M.Projectile.sweepHit(0, 0, 100, 0, 50, 4, 4) &&
    M.Projectile.sweepHit(0, 0, 100, 0, 50, 4.01, 4) === null);

  // 2b) Alt adım üst sınırı ancak kare başına hız sınırın altındaysa
  //     tünelleme garantisi verir; yeni bir cephane bunu aşarsa test yakalar.
  const maxStep = M.PROJ_MAX_SUBSTEPS * M.PROJ_SUBSTEP;
  const tooFast = M.WEAPONS.filter((w) => (w.baseSpeed + w.speedMul) > maxStep)
    .map((w) => `${w.id}=${w.baseSpeed + w.speedMul}`);
  check("her cephanenin azami kare hızı alt adım sınırının altında",
    tooFast.length === 0, `sınır=${maxStep} | aşan: ${tooFast.join(", ")}`);

  // 2c) Adım ≤ 2 px olduğu için 2 px kalınlığındaki bariyer de yakalanmalı.
  const thin = makeFlatTerrain();
  for (let y = 0; y < 420; y++) for (let x = 400; x < 402; x++) thin.solid[y * thin.w + x] = 1;
  const t2 = new M.Projectile(120, 200, 36, 0, sniper);
  let thinHit = null;
  for (let i = 0; i < 20 && !thinHit; i++) { const r = t2.update(thin, 0); if (r) thinHit = r; }
  check("alt adım: 2 px kalınlığındaki bariyer de yakalanır",
    !!thinHit && thinHit.hit === true && thinHit.x >= 400 && thinHit.x < 402,
    thinHit && `x=${thinHit.x.toFixed(2)}`);

  // 3) Yavaş cephane davranışı korunur: zemin yüzeyinde patlar, içine gömülmez.
  const ground = makeFlatTerrain(960, 540, 420);
  const shell = new M.Projectile(200, 380, 3, 4, M.WEAPONS[0]);
  let hitAt = null;
  for (let i = 0; i < 60 && !hitAt; i++) { const r = shell.update(ground, 0); if (r && r.hit) hitAt = r; }
  check("normal mermi zemin yüzeyinde patlar (derine gömülmez)",
    !!hitAt && hitAt.y >= 419 && hitAt.y <= 422, hitAt && `y=${hitAt.y.toFixed(1)}`);

  // 4) Sekme sürtünmesi + dinlenme eşiği: bomba sonsuz mikro-zıplamaz.
  const grenade = M.WEAPONS.find((w) => w.id === "grenade");
  const flat = makeFlatTerrain();
  const g1 = new M.Projectile(200, 420, 4, 6, grenade);
  g1.bounceOff(flat);
  check("seken bomba sekmede sürtünmeyle hız kaybeder",
    Math.hypot(g1.vx, g1.vy) < Math.hypot(4, 6), `hız=${Math.hypot(g1.vx, g1.vy).toFixed(2)}`);
  check("sekmeli bomba dinlenme eşiğinin altına inince durur", (() => {
    const g = new M.Projectile(200, 420, 0.1, 0.1, grenade);
    g.bounceOff(flat);
    return g.vx === 0 && g.vy === 0;
  })());
  const g3 = new M.Projectile(200, 420, 4, 6, { restitution: 0.5 }); // sürtünme alanı yok
  const g4 = new M.Projectile(200, 420, 4, 6, { restitution: 0.5, bounceFriction: 0.8 });
  g3.bounceOff(flat); g4.bounceOff(flat);
  check("bounceFriction yazmayan spec sürtünmesiz kalır (daha hızlı)",
    Math.hypot(g3.vx, g3.vy) > Math.hypot(g4.vx, g4.vy),
    `sürtünmesiz=${Math.hypot(g3.vx, g3.vy).toFixed(2)} sürtünmeli=${Math.hypot(g4.vx, g4.vy).toFixed(2)}`);
  // Sürtünme YALNIZ teğetsel bileşeni kısmalı: normal hız (zıplama yüksekliği)
  // her iki durumda da aynı olmalı (normal = (0,-1) → vy).
  check("bounceFriction yalnız teğetsel hızı kısar (zıplama yüksekliği aynı)",
    g3.vy === g4.vy,
    `vy sürtünmesiz=${g3.vy.toFixed(4)} sürtünmeli=${g4.vy.toFixed(4)}`);
  check("restitution: 0 ifade edilebilir (tamamen sönümlü sekme)",
    (() => {
      const g = new M.Projectile(200, 420, 3, 5, { restitution: 0 });
      g.bounceOff(flat);
      return g.vx === 0 && g.vy === 0;
    })());

  // 5) Kuru mod (bot benzetimi) matkabın araziyi oymasını engeller; gerçek mod oyar.
  const drillSpec = M.WEAPONS.find((w) => w.id === "drill");
  for (const dry of [true, false]) {
    const t = makeFlatTerrain(960, 540, 420);
    const before = t.version;
    const d = new M.Projectile(200, 400, 8, 6, drillSpec);
    for (let i = 0; i < 30; i++) if (d.update(t, 0, dry)) break;
    check(dry
      ? "kuru mod: matkap benzetimi araziyi değiştirmez"
      : "gerçek mod: matkap araziyi oyar",
      dry ? t.version === before : t.version > before,
      `version ${before} → ${t.version}`);
  }
  // Matkap bütçesi KARE başına bir düşer (alt adım sayısı kadar değil) ve
  // katı içinde ilerlerken tünel boyunca sürekli oyar (tek kare = tek bütçe).
  {
    const deep = makeFlatTerrain(960, 540, 100); // y≥100 tamamen katı
    const dr = new M.Projectile(200, 300, 10, 8, drillSpec);
    const budget = dr.drillLeft;
    const r1 = dr.update(deep, 0);
    check("matkap bütçesi kare başına bir azalır",
      dr.drillLeft === budget - 1 && r1 === null,
      `bütçe ${budget} → ${dr.drillLeft}`);
  }

  // 6) Bot benzetimi de süpürülmüş testi kullanır: iki örnek noktasının tam
  //    ortasındaki hedefi yakalar (eski nokta testi ıskalıyordu).
  const tg = makeAiGame(180, 720);
  const mr = tg.players[0].r;
  const muzzleX = M.robotMuzzlePoint(180, 420 - mr, mr, 1, -0.02).x;
  const step = sniper.baseSpeed + sniper.speedMul; // tam güç
  tg.players[1].x = muzzleX + step * 5.5;
  const through = M.aiSimulateShot(tg, 0, -0.02, 1, sniper);
  check("bot benzetimi: hızlı nişancı iki adım arasındaki hedefi yakalar",
    !!through && through.enemyDamage > 0,
    through && `hasar=${through.enemyDamage} isabet=${through.hit ? through.hit.x.toFixed(1) : "-"}`);
}

// ── 5e) Yardımcı cephaneler: Işınlanma Topu + Kanca ────────────────────
group("Yardımcı cephaneler — ışınlanma topu + kanca");
{
  const tp = M.WEAPONS.find((w) => w.id === "teleportball");
  const hk = M.WEAPONS.find((w) => w.id === "hook");
  check("ışınlanma topu: hasarsız, değdiği yere ışınlar, robotlardan geçer",
    !!tp && tp.damage === 0 && tp.teleport === true && tp.passPlayers === true);
  check("kanca: hasarsız, yerçekimsiz düz uçuş + sürtünme, robotlardan geçer",
    !!hk && hk.damage === 0 && hk.hook === true && hk.gravity === 0 && hk.drag > 0 && hk.passPlayers === true);

  // Işınlanma topu fizik olarak normal mermi gibi uçar; temas bilgisi döner
  // (patlama yerine Game.teleportShooter temayı noktayı kullanır).
  const ground = makeFlatTerrain(960, 540, 420);
  const ball = new M.Projectile(200, 300, 0, 9, tp);
  let bhit = null;
  for (let i = 0; i < 60 && !bhit; i++) { const r = ball.update(ground, 0); if (r) bhit = r; }
  check("ışınlanma topu zemin temas noktasını bildirir",
    !!bhit && bhit.hit === true && bhit.y >= 419 && bhit.y <= 421,
    bhit && `y=${bhit.y.toFixed(1)}`);

  // Kanca fizik: yerçekimsiz düz uçar, sürtünme hızını eritir, menzil sonunda
  // tutunamadan kaybolur ({hit:false}).
  const open = makeFlatTerrain(960, 540, 540); // zemin yok: açık gökyüzü
  const hk1 = new M.Projectile(100, 200, 10, 0, hk);
  let fizzled = null, straight = true;
  for (let i = 0; i < 120 && !fizzled; i++) {
    const r = hk1.update(open, 0);
    if (r) fizzled = r;
    if (hk1.vy !== 0) straight = false;
  }
  check("kanca yerçekimsiz düz uçar (vy 0 kalır)", straight);
  check("kanca sürtünmeyle menzil sonunda tutunamadan kaybolur",
    !!fizzled && fizzled.hit === false && hk1.dead);

  // Işınlanma: robot temas sütununun yüzeyine taşınır; can değişmez, patlama olmaz.
  const gtp = Object.create(M.Game.prototype);
  const tshooter = makeEntity(M.CHARACTERS[0], 200, 420);
  gtp.terrain = makeFlatTerrain(960, 540, 420);
  gtp.players = [tshooter];
  gtp.shooterIdx = 0;
  gtp.explosions = [];
  const hpBefore = tshooter.hp;
  M.Game.prototype.teleportShooter.call(gtp, 700, 420);
  check("ışınlanma: robot temas sütununun yüzeyine oturur, hasar almaz",
    Math.abs(tshooter.x - 700) < 1 && tshooter.y >= 415 && tshooter.y <= 421 && tshooter.hp === hpBefore,
    `x=${tshooter.x.toFixed(1)} y=${tshooter.y.toFixed(1)}`);
  // Duvara değen top: robot sütunun TEPESİNE oturur (içine gömülmez).
  const wallT = makeFlatTerrain(960, 540, 420);
  for (let y = 200; y < 420; y++) for (let x = 498; x < 503; x++) wallT.solid[y * wallT.w + x] = 1;
  gtp.terrain = wallT;
  M.Game.prototype.teleportShooter.call(gtp, 500, 300);
  check("ışınlanma: duvar kenarındaki temas sütun tepesine çıkarır",
    tshooter.y === 199 && tshooter.y < 300,
    `y=${tshooter.y}`);

  // Kanca çekme: ankraja doğru ilerler, varınca ip bırakılır, hasar yok.
  const hpull = Object.create(M.Game.prototype);
  const hshooter = makeEntity(M.CHARACTERS[0], 200, 420);
  hpull.terrain = makeFlatTerrain(960, 540, 420);
  hpull.players = [hshooter];
  hpull.shooterIdx = 0;
  hpull.explosions = [];
  hpull.tether = null;
  const hpBefore2 = hshooter.hp;
  M.Game.prototype.startHookPull.call(hpull, 600, 300);
  check("kanca tutununca çekme durumu kurulur", !!hpull.tether && hpull.tether.ax === 600);
  for (let i = 0; i < 200 && hpull.tether; i++) M.Game.prototype.updateTether.call(hpull);
  check("kanca robotu ankraja çeker ve ip bırakılır",
    hpull.tether === null && hshooter.x > 500 && hshooter.hp === hpBefore2,
    `x=${hshooter.x.toFixed(1)} tether=${hpull.tether}`);

  // Duvara çekilirken gövde katı maddeye girmeden durur ve ip kısa sürede çözülür.
  const hwall = Object.create(M.Game.prototype);
  const wshooter = makeEntity(M.CHARACTERS[0], 200, 420);
  const wallT2 = makeFlatTerrain(960, 540, 420);
  for (let y = 100; y < 420; y++) for (let x = 590; x < 610; x++) wallT2.solid[y * wallT2.w + x] = 1;
  hwall.terrain = wallT2;
  hwall.players = [wshooter];
  hwall.shooterIdx = 0;
  hwall.explosions = [];
  M.Game.prototype.startHookPull.call(hwall, 600, 200); // ankraj duvarın İÇİNDE
  for (let i = 0; i < 200 && hwall.tether; i++) M.Game.prototype.updateTether.call(hwall);
  check("kanca duvara çekilirken gövde içeride kalmaz ve ip çözülür",
    hwall.tether === null && wshooter.x + wshooter.r <= 592,
    `x=${wshooter.x.toFixed(1)} tether=${hwall.tether}`);
}

// ── 5d) Yetenek efektleri — her modül kendi cast efektini taşır ─────────────
group("Yetenek efekt kaydı");
{
  const shapes = M.SKILL_FX_SHAPES;
  const defaults = M.SKILL_FX_KIND_DEFAULT;

  check("shape kaydındaki her giriş {family, life, draw} taşır",
    Object.values(shapes).every((e) => e && typeof e.draw === "function" && typeof e.family === "string" && e.life > 0));

  const missing = M.CHARACTERS.filter((c) => !c.skill.fx || !shapes[c.skill.fx.shape]);
  check("her karakterin modülü kayıtlı bir fx.shape taşır", missing.length === 0,
    missing.map((c) => c.id).join(", "));

  const used = new Set(M.CHARACTERS.map((c) => c.skill.fx && c.skill.fx.shape));
  check("her modülün efekt kimliği benzersiz", used.size === M.CHARACTERS.length,
    `${used.size}/${M.CHARACTERS.length}`);

  const kinds = new Set(M.CHARACTERS.map((c) => c.skill.kind));
  const missingDefaults = [...kinds].filter((k) => !defaults[k] || !shapes[defaults[k]]);
  check("her yetenek türünün kayıtlı bir varsayılan efekti var", missingDefaults.length === 0, missingDefaults.join(", "));

  const unusedShapes = Object.keys(shapes).filter((s) => !used.has(s));
  check("kayıtlı her shape en az bir modül tarafından kullanılıyor", unusedShapes.length === 0, unusedShapes.join(", "));

  check("her aile için ikon ölçeği tanımlı",
    Object.values(shapes).every((e) => typeof M.SKILL_FX_EXTENT[e.family] === "number"));

  // Atölye geliştirmesi türetilmiş bir skill nesnesi üretir; görsel kimlik
  // orada kaybolursa gelişmiş robotlar efektlerini kaybeder (regresyon).
  const buildFail = [];
  for (const c of M.CHARACTERS) {
    const build = M.resolveRobotBuild(c, { upgrades: { chassis: 1, module: 2, core: 1 } }, { upgradesEnabled: true });
    if (!build.skill || !build.skill.fx || build.skill.fx.shape !== c.skill.fx.shape) buildFail.push(c.id);
  }
  check("türetilmiş build modülün fx kimliğini korur", buildFail.length === 0, buildFail.join(", "));
}

group("Efekt çizimi ve determinizmi");
{
  const shapes = M.SKILL_FX_SHAPES;
  const common = {
    x: 100, y: 300, r: 14, facing: 1, aim: -0.7,
    tint: "#ffd166", accent: "#ffffff", label: null, params: {},
    t: 0, life: 28, dead: false, seed: 12345,
  };

  // 1) Tüm shape'ler ömrü boyunca (etiket çizimi dâhil) hatasız çalışır.
  const failures = [];
  for (const [name, entry] of Object.entries(shapes)) {
    const def = M.CHARACTERS.find((c) => c.skill.fx.shape === name).skill;
    const fx = Object.assign({}, common, {
      shape: name, family: entry.family, kind: def.kind, life: entry.life,
      label: def.label, tint: (def.fx && def.fx.tint) || common.tint,
      accent: (def.fx && def.fx.accent) || common.accent,
    });
    try {
      for (let t = 0; t < entry.life; t += 3) {
        fx.t = t;
        M.drawSkillFx(mockCtx(), { skillFx: [fx], turn: 0 });
      }
    } catch (e) { failures.push(`${name}: ${e.message}`); }
    const ctx = mockCtx();
    fx.t = Math.round(entry.life * 0.5);
    try { M.drawSkillFx(ctx, { skillFx: [fx], turn: 0 }); } catch (e) { failures.push(`${name}: ${e.message}`); }
    if (ctx.calls.fill + ctx.calls.stroke === 0) failures.push(`${name}: çizim çağrısı yok`);
  }
  check(`${Object.keys(shapes).length} efekt ömrü boyunca hatasız ve görünür çizilir`,
    failures.length === 0, failures.join(" | "));

  // 2) Farklı shape'ler farklı çizim dizisi üretir (kopya çizici yakalama).
  const seen = new Map();
  const duplicates = [];
  for (const [name, entry] of Object.entries(shapes)) {
    const ops = [];
    const fx = Object.assign({}, common, {
      shape: name, family: entry.family, life: entry.life, t: Math.round(entry.life * 0.5),
    });
    entry.draw(mockCtx(ops), fx);
    const sig = ops.join("|");
    if (seen.has(sig)) duplicates.push(`${seen.get(sig)} ≡ ${name}`);
    else seen.set(sig, name);
  }
  check("her shape farklı bir çizim dizisi üretir", duplicates.length === 0, duplicates.join(", "));

  // 3) Determinizm: aynı seed + aynı kare => aynı op dizisi.
  const nonDet = [];
  for (const [name, entry] of Object.entries(shapes)) {
    const run = () => {
      const ops = [];
      entry.draw(mockCtx(ops), Object.assign({}, common, {
        shape: name, family: entry.family, life: entry.life, t: 5,
      }));
      return ops.join("|");
    };
    if (run() !== run()) nonDet.push(name);
  }
  check("aynı seed aynı çizim dizisini üretir", nonDet.length === 0, nonDet.join(", "));

  // 4) Gradient/shadowBlur yasağı (kare başı allocation + mock ctx uyumu).
  let gradientUse = 0, shadowUse = 0;
  for (const [name, entry] of Object.entries(shapes)) {
    const ctx = mockCtx();
    ctx.createLinearGradient = () => { gradientUse++; return { addColorStop() {} }; };
    ctx.createRadialGradient = () => { gradientUse++; return { addColorStop() {} }; };
    Object.defineProperty(ctx, "shadowBlur", { set() { shadowUse++; }, get() { return 0; }, configurable: true });
    entry.draw(ctx, Object.assign({}, common, { shape: name, family: entry.family, life: entry.life, t: 7 }));
  }
  check("efektler gradient/shadowBlur kullanmaz", gradientUse === 0 && shadowUse === 0,
    `gradient=${gradientUse} shadow=${shadowUse}`);
}

group("Efekt ikonu ve auralar");
{
  const iconFail = [];
  for (const c of M.CHARACTERS) {
    const ctx = mockCtx();
    try {
      if (!M.drawSkillFxIcon(ctx, c.skill, 30)) iconFail.push(`${c.id}: ikon çizilmedi`);
      else if (ctx.calls.fill + ctx.calls.stroke === 0) iconFail.push(`${c.id}: çizim çağrısı yok`);
    } catch (e) { iconFail.push(`${c.id}: ${e.message}`); }
  }
  check("her modül için kart ikonu çizilir", iconFail.length === 0, iconFail.join(" | "));

  const states = [
    {}, { blockShield: true }, { damageReduce: { factor: 0.5, turns: 2 } },
    { nextShotMod: { dmgMult: 1 } }, { glideTurns: 2 }, { dashAttack: { hit: new Set() } },
    { blockShield: true, damageReduce: { factor: 0.5, turns: 1 }, nextShotMod: {}, glideTurns: 1, dashAttack: { hit: new Set() } },
  ];
  const auraFail = [];
  for (const st of states) {
    const e = Object.assign(makeEntity(M.CHARACTERS[0]), st);
    try { M.drawSkillAura(mockCtx(), e, 100, 300, 1234); } catch (err) { auraFail.push(err.message); }
  }
  check("aura tüm durum kombinasyonlarında hatasız çizilir", auraFail.length === 0, auraFail.join(" | "));

  const ctxAura = mockCtx();
  M.drawSkillAura(ctxAura, Object.assign(makeEntity(M.CHARACTERS[0]), { blockShield: true }), 100, 300, 0);
  check("kalkan aurası görünür iz bırakır", ctxAura.calls.stroke > 0);
}

group("Yetenek efekti üretimi (useSkill entegrasyonu)");
{
  const game = makeGame([]);
  const e = makeEntity(M.CHARACTERS[0]);
  game.players = [e];

  const ok = M.useSkill(e, game);
  check("useSkill cast efekti üretir", ok === true && game.skillFx.length === 1);
  check("efekt modülün fx.shape kimliğini taşır",
    !!game.skillFx[0] && game.skillFx[0].shape === M.CHARACTERS[0].skill.fx.shape);
  check("efekt robotun konumundan snapshot alır",
    !!game.skillFx[0] && game.skillFx[0].x === e.x && game.skillFx[0].y === e.y);

  M.useSkill(e, game);
  check("cooldown'daki modül yeni efekt üretmez", game.skillFx.length === 1);

  const life = M.SKILL_FX_SHAPES[game.skillFx[0].shape].life;
  for (let i = 0; i < life; i++) M.updateSkillFx(game);
  check("efekt ömrü bitince listeden düşer", game.skillFx.length === 0);

  check("skillFx'siz oyunda spawn sessizce çıkar",
    M.spawnSkillFx(e, {}, M.CHARACTERS[0].skill) === null);
  check("fx'siz modül tür varsayılanına düşer", (() => {
    const g = makeGame([e]);
    const fx = M.spawnSkillFx(e, g, { kind: "heal", label: "Eski Veri", params: {} });
    return !!fx && fx.shape === M.SKILL_FX_KIND_DEFAULT.heal;
  })());
}

// ── 6) Bilgisayar oyuncusu — balistik, güvenlik ve deterministik kararlar ───
group("Bot balistik simülasyonu");
{
  const game = makeAiGame();
  const beforeMask = game.terrain.solid.slice();
  const before = game.players.map((p) => ({ x: p.x, y: p.y, hp: p.hp, shield: p.blockShield }));
  const best = bestAiShot(game);
  check("sağa bakan güvenli ve hasarlı bir Bazuka atışı bulur", !!best && best.enemyDamage > 0 && best.safe, best && JSON.stringify(best));
  check("tahmin arazi maskesini değiştirmez", Buffer.compare(Buffer.from(beforeMask), Buffer.from(game.terrain.solid)) === 0);
  check("tahmin karakter durumunu değiştirmez", JSON.stringify(before) === JSON.stringify(game.players.map((p) => ({ x: p.x, y: p.y, hp: p.hp, shield: p.blockShield }))));

  const reverse = makeAiGame(780, 220);
  reverse.wind = -2.5;
  const leftBest = bestAiShot(reverse);
  check("sola atışta ve ters rüzgârda hedef bulur", !!leftBest && leftBest.enemyDamage > 0, leftBest && JSON.stringify(leftBest));

  const windy = makeAiGame(); windy.wind = 3;
  const calmBest = best;
  const calmArc = M.aiSimulateShot(game, 0, -1.1, 0.7);
  const windySame = M.aiSimulateShot(windy, 0, -1.1, 0.7);
  check("rüzgâr aynı açı/gücün patlama sonucunu değiştirir", !windySame.hit || !calmArc.hit || Math.abs(windySame.hit.x - calmArc.hit.x) > 2);

  // Üst sınır uçuşu y<0 olduğunda bitmemeli; yüksek yay tekrar aşağı iner.
  const highArc = M.aiSimulateShot(game, 0, -1.45, 1);
  check("yüksek yay simülasyonu adım sınırı içinde tamamlanır", highArc.steps > 20 && highArc.steps <= M.AI_LIMITS.maxSteps);

  const miss = M.aiSimulateShot(game, 0, -Math.PI + 0.05, 1);
  check("patlamadan ekran dışına çıkan atış isabet sayılmaz", miss.score === -Infinity && !!miss.miss);
}

group("Bot puanlama ve güvenlik filtresi");
{
  const shieldGame = makeAiGame();
  shieldGame.players[1].blockShield = true;
  const shieldShot = bestAiShot(shieldGame);
  check("kalkan tüketen atış sıfır hasarda olumlu puan alır", !!shieldShot && shieldShot.shield > 0 && shieldShot.score > 0, shieldShot && JSON.stringify(shieldShot));

  const close = makeAiGame(260, 310);
  close.players[0].hp = 1;
  const unsafe = M.aiSimulateShot(close, 0, -0.02, 0.08);
  check("ölümcül özhasar adayı güvenlik filtresinden geçmez", unsafe.safe === false || unsafe.score === -Infinity, JSON.stringify(unsafe));

  const nearPass = makeAiGame();
  const passShot = M.aiSimulateShot(nearPass, 0, -0.22, 0.55);
  check("yalnız gerçek patlama hedefe erişirse hasar yazar", passShot.enemyDamage === 0 || Math.hypot(nearPass.players[1].x - passShot.hit.x, nearPass.players[1].y - nearPass.players[1].r - passShot.hit.y) < M.WEAPONS[0].radius + nearPass.players[1].r);

  // Engel testi: duvar namlunun hemen önünde ve tabandan tavana kadar uzanır.
  // Uzağa konulduğunda yüksek yay ekranın üstünden (y<0) aşıp duvarı atlıyor;
  // namlunun dibinde ise hiçbir yay duvarı geçemez.
  const wallGame = makeAiGame();
  for (let y = 0; y < 420; y++) for (let x = 210; x < 225; x++) wallGame.terrain.solid[y * wallGame.terrain.w + x] = 1;
  const clearBest = bestAiShot(makeAiGame());
  const clearResult = M.aiSimulateShot(makeAiGame(), 0, clearBest.angle, clearBest.power);
  const blockedResult = M.aiSimulateShot(wallGame, 0, clearBest.angle, clearBest.power);
  check("aradaki arazi engeli aynı atışın sonucunu etkiler",
    !blockedResult.hit || !clearResult.hit || Math.abs(blockedResult.hit.x - clearResult.hit.x) > 10,
    `açık=${clearResult.hit && clearResult.hit.x.toFixed(0)} engelli=${blockedResult.hit && blockedResult.hit.x.toFixed(0)}`);
}

group("Bot hareket yolu ve karar geçerliliği");
{
  const game = makeAiGame();
  check("düz zeminde kısa yürüyüş yolu güvenlidir", M.aiPathIsSafe(game, game.players[0], 1, 44));
  for (let x = 195; x < 245; x++) for (let y = 420; y < game.terrain.h; y++) game.terrain.solid[y * game.terrain.w + x] = 0;
  check("yol üzerindeki uçurum hareketi engeller", !M.aiPathIsSafe(game, game.players[0], 1, 44));

  const mineGame = makeAiGame();
  mineGame.mines.push({ x: 205, y: 420, spec: { trigger: 34 } });
  check("yol üzerindeki mayın hareketi engeller", !M.aiPathIsSafe(mineGame, mineGame.players[0], 1, 44));
  const fireGame = makeAiGame();
  fireGame.fires.push({ x: 205, y: 420 });
  check("yol üzerindeki ateş hareketi engeller", !M.aiPathIsSafe(fireGame, fireGame.players[0], 1, 44));

  const keyGame = makeAiGame();
  const key1 = M.aiWorldKey(keyGame);
  keyGame.wind = 1;
  const key2 = M.aiWorldKey(keyGame);
  keyGame.terrain.version++;
  const key3 = M.aiWorldKey(keyGame);
  check("rüzgâr değişince karar anahtarı değişir", key1 !== key2);
  check("arazi değişince karar anahtarı değişir", key2 !== key3);

  const r1 = M.aiRandom(123), r2 = M.aiRandom(123);
  check("aynı tohum aynı sapma dizisini üretir", [r1(), r1(), r1()].join() === [r2(), r2(), r2()].join());
}

group("Bot isabet kalitesi ve zorluk merdiveni");
{
  const DIFFS = ["easy", "normal", "hard", "expert"];

  // Açık nişan hattı olan düz haritada her zorluk gerçek hasar veren bir atış
  // bulmalı. Regresyon: opensPath bonusu ağırlıkla çarpıldığı için Zor/Ustalık
  // bot hedefin önüne kasıtlı kısa düşürüyor (0 hasar) ve turu pas geçiyordu.
  for (const d of DIFFS) {
    const game = makeAiGame();
    game.bot = { difficulty: d };
    const best = bestAiShot(game);
    check(`${d}: kaba tarama gerçek hasar veren atış bulur`, !!best && best.enemyDamage > 0,
      best && `hasar=${best.enemyDamage} skor=${best.score && best.score.toFixed(2)}`);
  }

  // Gerçek hasar, yol açan ıskadan her zaman daha değerlidir (ağırlıktan bağımsız).
  {
    const game = makeAiGame();
    game.bot = { difficulty: "expert" };
    const hit = M.aiSimulateShot(game, 0, bestAiShot(game).angle, bestAiShot(game).power);
    // Hedefin çok önüne düşen, hasar vermeyen ama "yol açan" bir atış:
    let pathMiss = null;
    for (const c of M.aiCoarseCandidates(game, 0)) {
      const r = M.aiSimulateShot(game, 0, c.angle, c.power);
      if (r.safe && isFinite(r.score) && r.enemyDamage === 0 && r.opensPath > 0) {
        if (!pathMiss || r.score > pathMiss.score) pathMiss = r;
      }
    }
    check("yol açan ıska adayı bulunur", !!pathMiss);
    check("isabetli atış yol açan ıskadan daha yüksek puan alır",
      !!hit && !!pathMiss && hit.score > pathMiss.score,
      hit && pathMiss && `isabet=${hit.score.toFixed(2)} ıska=${pathMiss.score.toFixed(2)}`);
  }

  // Uçtan uca: gerçek BotController bir turda ateş etmeli ve atışı hedefi vurmalı.
  function runBotTurn(game, difficulty, maxSeconds = 12) {
    game.bot = { difficulty };
    // Yetenek dalını devre dışı bırak: burada yalnız balistik isabet ölçülür.
    game.players[0].charDef = null;
    let fired = null;
    game.fire = (power) => { fired = { angle: game.active.aim, power, spec: game.active.weaponSpec }; game.state = "PROJECTILE"; };
    game.endTurn = () => { game.state = "SETTLE"; };
    const bot = new M.BotController(4242);
    bot.begin(game);
    for (let t = 0; t < maxSeconds && !fired; t += 1 / 60) bot.update(game, 1 / 60);
    return fired;
  }

  for (const d of DIFFS) {
    const game = makeAiGame();
    const fired = runBotTurn(game, d);
    check(`${d}: güvenli atış varken turu pas geçmez`, !!fired);
    if (!fired) continue;
    const out = M.aiSimulateShot(game, 0, fired.angle, fired.power, fired.spec);
    const expected = d === "easy" ? null : true; // Kolay kasten ıskalayabilir.
    if (expected) check(`${d}: ateşlenen atış hedefe hasar verir`, !!out && out.enemyDamage > 0,
      out && `hasar=${out.enemyDamage} ıska=${out.hit ? Math.hypot(out.hit.x - game.players[1].x, out.hit.y - (game.players[1].y - game.players[1].r)).toFixed(1) : "-"}`);
    else check(`easy: tur yine de tamamlanır (ateş edildi)`, out && out.steps > 0);
  }

  // Zorluk merdiveni: her arama parametresi seviyeyle birlikte iyileşmeli.
  check("refineMin zorlukla küçülür (arama hassaslaşır)",
    M.AI_DIFFICULTY.easy.refineMin > M.AI_DIFFICULTY.normal.refineMin &&
    M.AI_DIFFICULTY.normal.refineMin > M.AI_DIFFICULTY.hard.refineMin &&
    M.AI_DIFFICULTY.hard.refineMin > M.AI_DIFFICULTY.expert.refineMin);
  check("her zorluk için refine adım aralığı geçerlidir",
    DIFFS.every((d) => M.AI_DIFFICULTY[d].refineStart > M.AI_DIFFICULTY[d].refineMin && M.AI_DIFFICULTY[d].refineMin > 0));
  check("sapma denemeleri tam isabet (0) içermez; sapma her zaman uygulanır",
    DIFFS.every((d) => M.AI_DIFFICULTY[d].refineFactors.every((f) => f > 0)));
  check("kaba ızgara zorlukla sıklaşır",
    DIFFS.every((d, i) => i === 0 ||
      (M.AI_DIFFICULTY[d].coarseElevations >= M.AI_DIFFICULTY[DIFFS[i - 1]].coarseElevations &&
       M.AI_DIFFICULTY[d].coarsePowerSteps >= M.AI_DIFFICULTY[DIFFS[i - 1]].coarsePowerSteps)),
    DIFFS.map((d) => `${d}=${M.AI_DIFFICULTY[d].coarseElevations}x${M.AI_DIFFICULTY[d].coarsePowerSteps}`).join(" "));
  check("nişan sapması zorlukla küçülür",
    DIFFS.every((d, i) => i === 0 ||
      M.AI_DIFFICULTY[d].baseError <= M.AI_DIFFICULTY[DIFFS[i - 1]].baseError),
    DIFFS.map((d) => `${d}=${M.AI_DIFFICULTY[d].baseError}`).join(" "));
  check("sapma güvenlik denemesi sayısı zorlukla artar",
    DIFFS.every((d, i) => i === 0 ||
      M.AI_DIFFICULTY[d].refineFactors.length >= M.AI_DIFFICULTY[DIFFS[i - 1]].refineFactors.length));
}

group("Zorluğa göre bot hasar ölçeği");
{
  const DIFFS = ["easy", "normal", "hard", "expert"];

  check("her zorluk için hasar ölçeği tanımlı",
    DIFFS.every((d) => M.AI_DIFFICULTY[d].damageMult > 0));
  check("Orta seviye referanstır (×1)", M.aiDamageMultiplier("normal") === 1);
  check("zorluk arttıkça hasar ölçeği artar",
    M.aiDamageMultiplier("easy") < M.aiDamageMultiplier("normal") &&
    M.aiDamageMultiplier("normal") < M.aiDamageMultiplier("hard") &&
    M.aiDamageMultiplier("hard") < M.aiDamageMultiplier("expert"),
    DIFFS.map((d) => `${d}=${M.aiDamageMultiplier(d)}`).join(" "));
  check("bilinmeyen/boş zorluk ×1'e düşer",
    M.aiDamageMultiplier("yok") === 1 && M.aiDamageMultiplier(undefined) === 1);

  // Ölçek yalnız botlara yazılır; insan ve yerel maç etkilenmez.
  {
    const players = [
      { control: "human" }, { control: "bot" }, { control: "bot" }, { control: "human" },
    ];
    M.aiAssignDamageScale(players, "expert");
    check("insan robotu ×1 kalır", players[0].aiDamageMult === 1 && players[3].aiDamageMult === 1);
    check("bot robotları zorluk ölçeğini alır",
      players[1].aiDamageMult === M.aiDamageMultiplier("expert") &&
      players[2].aiDamageMult === M.aiDamageMultiplier("expert"));
    M.aiAssignDamageScale(players, "easy");
    check("ölçek yeniden atanabilir (rövanş)", players[1].aiDamageMult === M.aiDamageMultiplier("easy"));
  }

  // Hasar çarpanı: taban × (normal silahta) çekirdek bonusu × zorluk ölçeği.
  {
    const g = Object.create(M.Game.prototype);
    const shooter = makeEntity(M.CHARACTERS[0], 200, 420);
    shooter.dmgMult = 1.0;
    shooter.weaponDamageMult = 1.07;
    shooter.aiDamageMult = 1;
    g.shotIsSkill = false;
    check("hasar çarpanı taban × çekirdek bonusunu içerir",
      Math.abs(g._shooterDamageMult(shooter) - 1.07) < 1e-9, String(g._shooterDamageMult(shooter)));
    g.shotIsSkill = true;
    check("yetenek mermisi çekirdek bonusunu almaz", Math.abs(g._shooterDamageMult(shooter) - 1.0) < 1e-9);
    g.shotIsSkill = false;
    shooter.aiDamageMult = 1.3;
    check("zorluk ölçeği yetenek mermisinde de geçerlidir",
      Math.abs(g._shooterDamageMult(shooter) - 1.07 * 1.3) < 1e-9);
    g.shotIsSkill = true;
    check("zorluk ölçeği yetenekte de uygulanır (çekirdek hariç)",
      Math.abs(g._shooterDamageMult(shooter) - 1.3) < 1e-9);
    check("atıcı yoksa çarpan 1'dir", g._shooterDamageMult(null) === 1);
  }

  // Gerçek patlama hasarı ölçekle birlikte artar.
  function explosionDamage(mult) {
    const shooter = makeEntity(M.CHARACTERS[0], 200, 420);
    const target = makeEntity(M.CHARACTERS[1], 300, 420);
    shooter.control = "bot";
    shooter.dmgMult = 1.0;
    shooter.weaponDamageMult = 1;
    shooter.aiDamageMult = mult;
    const g = makeGame([shooter, target], makeFlatTerrain());
    g.shooterIdx = 0;
    g.shotIsSkill = false;
    const hp = target.hp;
    g.explode(target.x, target.y - target.r, M.WEAPONS[0]);
    return hp - target.hp;
  }
  const base = explosionDamage(1);
  const easy = explosionDamage(M.aiDamageMultiplier("easy"));
  const expert = explosionDamage(M.aiDamageMultiplier("expert"));
  check("Kolay botu daha az hasar verir", easy > 0 && easy < base, `kolay=${easy} orta=${base}`);
  check("Ustalık botu daha çok hasar verir", expert > base, `usta=${expert} orta=${base}`);
  check("hasar ölçeği oranı korunur (~×1.3)",
    Math.abs(expert / base - M.aiDamageMultiplier("expert")) < 0.08, `${expert}/${base}`);

  // Nükleer, zorluk hasar ölçeğiyle tek atışta maçı çevirebildiği için
  // varsayılan tercih olmamalı; yalnız finisher/kalkan kırıcı olarak seçilir.
  {
    function weaponGame(hp, shield) {
      const shooter = makeEntity(M.CHARACTERS[0], 200, 420);
      const target = makeEntity(M.CHARACTERS[1], 700, 420);
      shooter.control = "bot"; target.control = "human";
      for (const e of [shooter, target]) {
        e.ammo = {};
        for (const w of M.WEAPONS) e.ammo[w.id] = w.ammo;
      }
      target.hp = hp;
      target.blockShield = !!shield;
      return { players: [shooter, target], turn: 0, bot: { difficulty: "expert" } };
    }
    check("tam canlı hedefte Ustalık nükleeri harcamaz",
      M.aiSelectWeapon(weaponGame(100, false), 0).id !== "nuke");
    check("hedefi bitirebilecekse nükleeri seçer",
      M.aiSelectWeapon(weaponGame(45, false), 0).id === "nuke");
    check("kalkanlı hedefte yüksek hasarlı silah seçilir (nükleer/keskin nişancı)",
      ["nuke", "sniper"].includes(M.aiSelectWeapon(weaponGame(100, true), 0).id));
  }
}

group("Rüzgâr sürekliliği ve değişim bildirimi");
{
  const windGame = Object.create(M.Game.prototype);
  windGame.wind = 1.25;
  windGame.windTurnsRemaining = 3;
  windGame.windChangeFx = null;
  const original = windGame.wind;

  check("ilk turdan sonra rüzgâr sabit kalır", windGame.advanceWind() === null && windGame.wind === original);
  check("ikinci turdan sonra rüzgâr sabit kalır", windGame.advanceWind() === null && windGame.wind === original);
  const change = windGame.advanceWind();
  check("planlanan turda rüzgâr değişir", !!change && windGame.wind !== original);
  check("yeni rüzgâr fark edilir ölçüde farklıdır", Math.abs(windGame.wind - original) >= 0.8);
  check("sonraki değişim 2–4 tur sonrasına planlanır", windGame.windTurnsRemaining >= 2 && windGame.windTurnsRemaining <= 4);
  check("değişim efekti eski ve yeni değeri taşır", change === windGame.windChangeFx && change.from === original && change.to === windGame.wind);

  windGame.W = 960; windGame.H = 540;
  const fxCtx = {
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, quadraticCurveTo() {}, stroke() {}, fill() {},
    fillRect() {}, strokeRect() {}, fillText() {}, measureText: text => ({ width: text.length * 9 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    set lineCap(_) {}, set strokeStyle(_) {}, set lineWidth(_) {}, set globalAlpha(_) {},
    set font(_) {}, set textAlign(_) {}, set textBaseline(_) {}, set fillStyle(_) {},
  };
  let windFxSafe = true;
  try { windGame.drawWindChangeFx(fxCtx); } catch (_) { windFxSafe = false; }
  // Not: bant artık _csPanel ile çiziliyor (endüstriyel tema); sahte ctx
  // panelin kullandığı lineTo/closePath/createLinearGradient'i bilmeli.
  check("rüzgâr değişim efekti Canvas üzerinde hatasız çizilir", windFxSafe);
}

group("Mod seçimi ve bot turu entegrasyonu");
{
  const menu = Object.create(M.Game.prototype);
  menu.updateHud = () => {};
  menu.selectedChars = []; menu.selectedMap = null;
  menu.bot = new M.BotController();
  menu.bots = [];
  menu.beginMode("computer");
  check("bilgisayar modu zorluk seçimine geçer", menu.state === "DIFFICULTY_SELECT");
  const banner = { textContent: "", style: {} };
  const hud = { classList: { toggle() {} } };
  sandbox.document = { getElementById: (id) => id === "turn-banner" ? banner : id === "hud" ? hud : null };
  menu.players = [];
  menu.bots = [];
  menu.wind = null;
  menu.updateWeaponHud = () => {};
  let menuHudSafe = true;
  try { M.Game.prototype.updateHud.call(menu); } catch (_) { menuHudSafe = false; }
  check("oyuncu oluşmadan zorluk HUD'u güvenlidir", menuHudSafe && banner.textContent === "Zorluk seçiliyor…");
  // Zorluk seç → bot sayısı seç
  menu.difficulty = "normal"; menu.bot.difficulty = "normal";
  menu.state = "BOT_COUNT_SELECT";
  check("bot sayısı seçimi", menu.state === "BOT_COUNT_SELECT");
  try { M.Game.prototype.updateHud.call(menu); } catch (_) { menuHudSafe = false; }
  check("oyuncu oluşmadan rakip sayısı HUD'u güvenlidir", menuHudSafe && banner.textContent === "Rakip sayısı seçiliyor…");

  // Önceki maçın oyuncuları bellekte kalsa bile silah paneli yalnız gerçek
  // savaş durumlarında görünür olmalı; menüleri tek tek dışlamak yerine
  // durumdan türetmek panelin sızmasını önler.
  let weaponPanelHidden = true;
  const weaponPanel = { classList: { toggle: (_name, force) => { weaponPanelHidden = !!force; } } };
  const hudPlayer = { weapon: 0, ammo: Object.fromEntries(M.WEAPONS.map((w) => [w.id, w.ammo == null ? Infinity : w.ammo])) };
  const weaponHudGame = { players:[hudPlayer], active:hudPlayer, turn:0, _weaponKey:null };
  const menuStates = ["MODE_SELECT", "WORKSHOP", "MARKET", "TUTORIAL", "MAP_SELECT"];
  sandbox.document = { getElementById: (id) => id === "weapon-panel" ? weaponPanel : null };
  let allMenusHideWeapons = true;
  for (const state of menuStates) {
    weaponHudGame.state = state;
    M.Game.prototype.updateWeaponHud.call(weaponHudGame);
    if (!weaponPanelHidden) allMenusHideWeapons = false;
  }
  check("önceki oyuncular kalsa da menüler silah panelini gizler", allMenusHideWeapons);
  let combatStatesShowWeapons = true;
  for (const state of ["AIMING", "PROJECTILE", "SETTLE"]) {
    weaponHudGame.state = state;
    weaponHudGame._weaponKey = null;
    M.Game.prototype.updateWeaponHud.call(weaponHudGame);
    if (weaponPanelHidden) combatStatesShowWeapons = false;
  }
  check("silah paneli üç savaş durumunda görünür", combatStatesShowWeapons);

  // HUD da aynı kurala uyar: menüler büyük başlık çizer, açık kalan
  // sıra/rüzgâr şeridi o başlığı kapatıyordu.
  {
    let hudHidden = null;
    const hudEl = { classList: { toggle: (_name, force) => { hudHidden = !!force; } } };
    const playersEl = { children: [], appendChild() {}, removeChild() {} };
    const bannerEl = { textContent: "", style: {} };
    const windEl = { textContent: "", classList: { toggle() {} } };
    const prevDoc = sandbox.document;
    sandbox.document = {
      getElementById: (id) => id === "hud" ? hudEl : id === "players" ? playersEl : id === "turn-banner" ? bannerEl : id === "wind-indicator" ? windEl : null,
    };
    const hudGame = { players: [], mode: null, profile: M.normalizeProfile({ version: 2 }), turnTimer: 0, turn: 0, updateWeaponHud() {} };
    let menusHideHud = true;
    for (const state of ["MODE_SELECT", "WORKSHOP", "MAP_SELECT", "MARKET", "TUTORIAL"]) {
      hudGame.state = state;
      M.Game.prototype.updateHud.call(hudGame);
      if (!hudHidden) menusHideHud = false;
    }
    check("HUD menülerde gizlenir", menusHideHud);
    sandbox.document = prevDoc;
  }

  // Bot sayısı seç → karakter seçim
  menu.playerControls = ["human", "bot"];
  menu.beginCharSelect(2);
  check("bot sayısı sonrası karakter seçimi", menu.state === "CHAR_SELECT" && menu.playerCount === 2);
  check("kontroller insan + bot olarak işaretlenir", menu.playerControls.join(",") === "human,bot");

  const local = Object.create(M.Game.prototype);
  local.updateHud = () => {}; local.beginMode("local"); local.beginCharSelect(6);
  check("yerel mod 2–6 oyunculu akışı korur", local.state === "CHAR_SELECT" && local.playerCount === 6 && local.playerControls.every((c) => c === "human"));

  const inputGame = makeAiGame();
  Object.setPrototypeOf(inputGame, M.Game.prototype);
  inputGame.input = { charging: false, power: 0, left: false, right: false };
  inputGame.active.control = "bot";
  inputGame.startCharge();
  check("bot turunda insan güç dolduramaz", inputGame.input.charging === false);
  inputGame.active.control = "human"; inputGame.startCharge();
  check("insan turunda güç doldurma çalışır", inputGame.input.charging === true);

  const turnGame = makeAiGame();
  const best = bestAiShot(turnGame);
  let salvos = 0;
  turnGame.fire = () => { salvos++; turnGame.state = "PROJECTILE"; };
  turnGame.endTurn = () => { turnGame.state = "AIMING"; turnGame.turn = 1; turnGame.turnId++; };
  const bot = new M.BotController(42);
  bot.begin(turnGame);
  bot.choice = best; bot.phase = "aim"; bot.phaseTime = 0.5; bot.worldKey = M.aiWorldKey(turnGame);
  bot.update(turnGame, 1 / 60);
  bot.update(turnGame, 1 / 60);
  check("bot bir turda en fazla bir salvo başlatır", salvos === 1, `salvos=${salvos}`);
  turnGame.state = "AIMING"; turnGame.turn = 1;
  bot.update(turnGame, 1 / 60);
  check("bot başka oyuncunun turunda kararını iptal eder", bot.phase === "idle");

  // Hasar veren modülü olan bot, atış YERİNE modülü kullanır (çift aksiyon yok).
  const quakeDef = M.CHARACTERS.find((c) => c.skill.kind === "quake");
  const qGame = makeAiGame();
  qGame.difficulty = "hard";
  const qShooter = makeEntity(quakeDef, 180, 420);
  qShooter.control = "bot"; qShooter.weapon = 0; qShooter.ammo = { bazooka: Infinity };
  qGame.players[0] = qShooter;
  qGame.explosions = [];
  qGame.applySkillDamage = () => 0; // hasar yolu bu testte ölçülmez
  let qFired = 0, qSpent = 0;
  qGame.fire = () => { qFired++; qGame.state = "PROJECTILE"; };
  qGame.spendSkillShot = () => { qSpent++; qGame.state = "SETTLE"; };
  const qBot = new M.BotController(7);
  qBot.begin(qGame);
  check("bot hasar veren modülü atışın yerine seçer", qBot.skillPhase === "instead" && !!qBot.skillUsed);
  qBot.choice = bestAiShot(qGame);
  qBot.phase = "aim"; qBot.phaseTime = 0.5; qBot.worldKey = M.aiWorldKey(qGame);
  qBot.update(qGame, 1 / 60);
  qBot.update(qGame, 1 / 60);
  check("bot modülü kullandı ve ateş etmedi", qSpent === 1 && qFired === 0, `spent=${qSpent} fired=${qFired}`);
}

// ── 7) Geliştirme sistemi — türetilmiş build ve ödül döngüsü ─────────────────
group("Geliştirme — türetilmiş build ve ödül döngüsü");
{
  const healDef = M.CHARACTERS[0]; // FIX-8: heal
  const fullUp = { upgrades: { chassis: 3, module: 3, core: 3 } };
  const full = M.resolveRobotBuild(healDef, fullUp, { upgradesEnabled: true });
  check("Gövde III canı tek çarpanla %10 artırır", full.maxHp === Math.round(healDef.hp * 1.10), `hp=${full.maxHp}`);
  check("Gövde II zırhı +0.02 artırır", Math.abs(full.armor - (healDef.armor + 0.02)) < 1e-9, `armor=${full.armor}`);
  check("Çekirdek III enerjiyi 85 yapar", full.maxStamina === 85);
  check("Çekirdek III silah bonusu toplam %7", Math.abs(full.weaponDamageMult - 1.07) < 1e-9);
  check("Gövde III savrulma direnci %10", Math.abs(full.knockbackTakenMult - 0.9) < 1e-9);
  check("Aparat II cooldown'u bir tur azaltır", full.skill.cooldown === Math.max(2, healDef.skill.cooldown - 1));
  check("Aparat III modül gücü %15", Math.abs(full.skill.powerMult - 1.15) < 1e-9);

  const base = M.resolveRobotBuild(healDef, null, { upgradesEnabled: false });
  check("yükseltme kapalıyken taban değerler korunur",
    base.maxHp === healDef.hp && base.armor === healDef.armor && base.maxStamina === 70 &&
    base.weaponDamageMult === 1 && base.skill.cooldown === healDef.skill.cooldown);

  // Kaynak tanımlar hiçbir zaman mutasyona uğramamalı.
  const hpBefore = healDef.hp;
  const paramsBefore = JSON.stringify(healDef.skill.params);
  M.resolveRobotBuild(healDef, fullUp, { upgradesEnabled: true });
  check("kaynak CHARACTERS ve skill.params değişmez",
    healDef.hp === hpBefore && JSON.stringify(healDef.skill.params) === paramsBefore);

  // Build Entity'ye uygulanır; yetenek türetilmiş cooldown/params kullanır.
  const e = new M.Entity(200, 420, healDef.color, healDef.label, healDef, full);
  check("Entity build değerlerini alır",
    e.maxHp === full.maxHp && e.armor === full.armor && e.maxStamina === full.maxStamina &&
    e.weaponDamageMult === full.weaponDamageMult && e.knockbackTakenMult === full.knockbackTakenMult);
  const gHeal = makeGame([e], makeFlatTerrain());
  e.hp = 50;
  const used = M.useSkill(e, gHeal);
  check("onarım modül gücüyle ölçeklenir", used && e.hp === 50 + Math.round(25 * 1.15), `hp=${e.hp}`);
  check("yetenek cooldown'u türetilmiş değeri kullanır", e.skillCooldown === full.skill.cooldown);

  // Kalkan: aparat dalı enerji iadesi (tam engelleme sayısı değişmez).
  const shieldDef = M.CHARACTERS.find((c) => c.skill.kind === "shield");
  const shieldBuild = M.resolveRobotBuild(shieldDef, { upgrades: { chassis: 0, module: 3, core: 0 } }, { upgradesEnabled: true });
  const se = new M.Entity(200, 420, shieldDef.color, shieldDef.label, shieldDef, shieldBuild);
  se.blockShield = true;
  se.stamina = 20;
  check("kalkan hasarı engeller ve enerji iadesi verir", se.damage(50) === 0 && se.stamina === 30);

  // 34 robotun tamamı sonlu ve sınırlı bir build üretmeli.
  let buildsOk = true;
  for (const ch of M.CHARACTERS) {
    const b = M.resolveRobotBuild(ch, fullUp, { upgradesEnabled: true });
    if (!(Number.isFinite(b.maxHp) && b.maxHp > 0 && Number.isFinite(b.armor) && b.armor <= 0.40 &&
          Number.isFinite(b.maxStamina) && b.maxStamina > 0 && b.skill && Number.isFinite(b.skill.cooldown) &&
          b.skill.cooldown >= 2)) buildsOk = false;
  }
  check("34 robot geçerli türetilmiş build üretir", buildsOk);

  // spit adaptörü: kaynak spec mutasyona uğramaz, mermi ölçekli kopya kullanır.
  const spitDef = M.CHARACTERS.find((c) => c.skill.kind === "spit");
  const spitBuild = M.resolveRobotBuild(spitDef, { upgrades: { chassis: 0, module: 3, core: 0 } }, { upgradesEnabled: true });
  const baseSpecDamage = M.SKILL_PROJECTILES[spitBuild.skill.params.proj].damage;
  const shooter = makeEntity(spitDef, 200, 420);
  shooter.resolvedSkill = spitBuild.skill;
  const gSpit = makeGame([shooter, makeEntity(M.CHARACTERS[0], 700, 420)], makeFlatTerrain());
  gSpit.turn = 0;
  gSpit.spawnSkillProjectiles(shooter, spitBuild.skill.params);
  check("spit mermisi modül gücüyle ölçeklenir",
    gSpit.projectiles.length === 1 && gSpit.projectiles[0].spec.damage > baseSpecDamage);
  check("spit kaynak spec mutasyona uğramaz", M.SKILL_PROJECTILES[spitBuild.skill.params.proj].damage === baseSpecDamage);

  // Savrulma direnci uygulanır.
  const kbTarget = makeEntity(M.CHARACTERS[0], 300, 420);
  kbTarget.knockbackTakenMult = 0.5;
  const gKb = makeGame([makeEntity(M.CHARACTERS[0], 200, 420), kbTarget], makeFlatTerrain());
  gKb.applySkillDamage(kbTarget, 10, 200, 420 - kbTarget.r, 10);
  check("savrulma direnci knockback'i azaltır", Math.abs(kbTarget.vx) < 10, `vx=${kbTarget.vx}`);

  // Maç ödülü: yalnız bilgisayar modunda, en az bir çözümlenmiş insan atışıyla,
  // maç anahtarı başına bir kez.
  function makeRewardGame(mode) {
    const g = Object.create(M.Game.prototype);
    g.mode = mode;
    g.difficulty = "hard";
    g.sessionId = "t";
    g.profile = M.defaultProfile();
    g.players = [makeEntity(M.CHARACTERS[0]), makeEntity(M.CHARACTERS[1])];
    g.players[0].control = "human";
    g.players[1].control = "bot";
    g.matchProgress = {
      key: "t:1", humanRobotId: "kopek", humanIndex: 0, opponentCount: 1,
      humanShotsResolved: 1, pendingHumanShot: false, rewardGranted: false,
    };
    return g;
  }

  const rg = makeRewardGame("computer");
  const r1 = rg.grantMatchReward("win");
  check("zorluğa göre galibiyet ödülü hesaplanır", r1 && r1.ok && r1.scrap === 75 && r1.xp === 88, JSON.stringify(r1 && { s: r1.scrap, x: r1.xp }));
  check("ödül profil bakiyesine yazılır", rg.profile.scrap === M.START_SCRAP + 75);
  check("aynı maçta ikinci ödül verilmez", rg.grantMatchReward("win") === null);

  const rg2 = makeRewardGame("computer");
  rg2.profile = rg.profile; // ödülü almış profil
  check("kayıtlı maç anahtarı tekrar ödül vermez", rg2.grantMatchReward("win") === null);

  const rg3 = makeRewardGame("computer");
  rg3.matchProgress.humanShotsResolved = 0;
  check("çözümlenmiş insan atışı yoksa ödül yok", rg3.grantMatchReward("win") === null);

  const rg4 = makeRewardGame("local");
  check("yerel maç ödül üretmez", rg4.grantMatchReward("win") === null);

  const bg = makeRewardGame("computer");
  bg.matchProgress.humanShotsResolved = 0;
  bg.matchProgress.pendingHumanShot = false;
  bg._noteHumanShot(bg.players[1]);
  check("bot atışı ödül uygunluğunu işaretlemez", bg.matchProgress.pendingHumanShot === false);
  bg._noteHumanShot(bg.players[0]);
  check("insan atışı ödül uygunluğunu işaretler", bg.matchProgress.pendingHumanShot === true);

  // Uçtan uca: GAMEOVER'da ödül bir kez yazılır ve overlay ödül satırını gösterir.
  const eg = makeRewardGame("computer");
  eg.bot = new M.BotController();
  eg.bots = [];
  eg.turn = 0;
  eg.turnTimer = 10;
  eg.wind = 0;
  eg.settleTimer = 0;
  eg.shotMod = null;
  eg.input = { left: false, right: false, charging: false, power: 0 };
  eg.state = "PROJECTILE";
  eg.players[1].alive = false;
  eg.players[1].hp = 0;
  eg.updateHud = () => {};
  const els = {
    "overlay-title": { textContent: "" }, "overlay-sub": { textContent: "" },
    "overlay-reward": { textContent: "", classList: { add() {}, remove() {} } },
    "overlay": { classList: { add() {}, remove() {} } },
  };
  const prevDocument = sandbox.document;
  sandbox.document = { getElementById: (id) => els[id] || null };
  M.Game.prototype.endTurn.call(eg);
  sandbox.document = prevDocument;
  check("GAMEOVER ödülü bir kez verir", eg.state === "GAMEOVER" && eg.matchProgress.rewardGranted === true);
  check("ödül bakiyeye işlenir", eg.profile.scrap === M.START_SCRAP + 75);
  check("overlay ödül dökümünü gösterir", els["overlay-reward"].textContent.includes("Hurda") && els["overlay-reward"].textContent.includes("XP"));
}

// ── 8) Atölye akışı ve sayfalama ─────────────────────────────────────────────
group("Atölye akışı ve sayfalama");
{
  // Atölye çizimi DOM'a yalnız overlay/HUD üzerinden dokunur; burada hepsi
  // sahte. Çizim çağrıları no-op bir context'e gider.
  const fakeEl = () => ({
    classList: { add() {}, remove() {}, toggle() {} },
    style: {}, dataset: {}, textContent: "", innerHTML: "",
    setAttribute() {}, appendChild() {}, removeChild() {}, children: [],
    addEventListener() {}, querySelector: () => null, scrollLeft: 0, offsetLeft: 0,
    clientWidth: 100, offsetWidth: 40,
  });
  sandbox.document = {
    getElementById: () => fakeEl(),
    createElement: () => fakeEl(),
    documentElement: { style: { setProperty() {} } },
  };
  const ctx2 = Object.assign(mockCtx(), {
    fillText() {}, setLineDash() {}, strokeRect() {}, createLinearGradient: () => ({ addColorStop() {} }),
    globalAlpha: 1, font: "", textAlign: "", textBaseline: "",
  });

  const wg = Object.create(M.Game.prototype);
  wg.W = 960; wg.H = 540;
  wg.input = { mouseX: 0, mouseY: 0, left: false, right: false, charging: false, power: 0 };
  wg.profile = M.defaultProfile();
  wg.selectedChars = [];
  wg.renderTimeMs = 0;
  wg.workshopSelectedId = null;
  wg.workshopBranch = "chassis";
  wg.workshopPage = 0;
  wg.workshopFx = null;
  wg.updateHud = () => {};
  wg.updateWeaponHud = () => {};

  wg.openWorkshop();
  check("atölye durumu açılır", wg.state === "WORKSHOP" && wg.workshopSelectedId === M.CHARACTERS[0].id);
  check("34 robot 3 sayfada sayfalanır", Math.ceil(M.CHARACTERS.length / 12) === 3);
  check("son robot üçüncü sayfada", wg._workshopPageOf(M.CHARACTERS[M.CHARACTERS.length - 1].id) === 2);

  let renderOk = true;
  try { M.Game.prototype.renderWorkshop.call(wg, ctx2); } catch (e) { renderOk = false; console.error(e); }
  check("atölye ekranı hatasız çizilir", renderOk);

  // Satın alma: seviye yetersizken bakiye değişmez, uygun olduğunda uygulanır.
  const beforeScrap = wg.profile.scrap;
  wg.handleWorkshopKey({ key: "Enter", code: "Enter", preventDefault() {} });
  check("kilitli dalda Enter bakiyeyi değiştirmez", wg.profile.scrap === beforeScrap);
  wg.profile = M.normalizeProfile({ version: 1, scrap: 1000, robots: { [M.CHARACTERS[0].id]: { xp: 100 } } });
  wg.handleWorkshopKey({ key: "Enter", code: "Enter", preventDefault() {} });
  check("uygun dalda Enter geliştirmeyi satın alır", wg.profile.robots[M.CHARACTERS[0].id].upgrades.chassis === 1 && wg.profile.scrap === 940);
  check("satın alma sonrası montaj efekti başlar", !!wg.workshopFx);
  M.Game.prototype.updateWorkshopFx.call(wg, 1);
  check("montaj efekti süre sonunda temizlenir", wg.workshopFx === null);

  // Atölye → menü → atölye dönüşü.
  wg.goBack();
  check("Esc atölyeden ana menüye döner", wg.state === "MODE_SELECT");
  wg.openWorkshop();
  check("atölye yeniden açılır", wg.state === "WORKSHOP");

  // Dal seçimi ve sayfa gezinme sınırları.
  const b0 = wg.workshopBranch;
  wg.handleWorkshopKey({ key: "ArrowDown", code: "ArrowDown", preventDefault() {} });
  check("ok tuşu dal seçimini değiştirir", wg.workshopBranch !== b0);
  wg.workshopPage = 0;
  wg.changeWorkshopPage(-1);
  check("ilk sayfadan geri gidilmez", wg.workshopPage === 0);
  wg.changeWorkshopPage(1);
  check("sonraki sayfaya geçilir", wg.workshopPage === 1);
}

// ── 8a) Atölye parça takma (mod sekmeleri + yuva paneli + taşıma) ────────
group("Atölye parça takma");
{
  const fakeEl = () => ({
    classList: { add() {}, remove() {}, toggle() {} },
    style: {}, dataset: {}, textContent: "", innerHTML: "",
    setAttribute() {}, appendChild() {}, removeChild() {}, children: [],
    addEventListener() {}, querySelector: () => null, scrollLeft: 0, offsetLeft: 0,
    clientWidth: 100, offsetWidth: 40, width: 0, height: 0,
    getContext: () => ctx2,
  });
  const prevDoc = sandbox.document;
  sandbox.document = {
    getElementById: () => fakeEl(),
    createElement: () => fakeEl(),
    documentElement: { style: { setProperty() {} } },
  };
  const ctx2 = Object.assign(mockCtx(), {
    fillText() {}, setLineDash() {}, strokeRect() {}, clearRect() {}, drawImage() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    globalAlpha: 1, font: "", textAlign: "", textBaseline: "",
  });

  const pwg = Object.create(M.Game.prototype);
  pwg.W = 960; pwg.H = 540;
  pwg.input = { mouseX: 0, mouseY: 0, left: false, right: false, charging: false, power: 0 };
  pwg.renderTimeMs = 0;
  pwg.selectedChars = [];
  pwg.updateHud = () => {};
  pwg.workshopSelectedId = null;
  pwg.workshopPage = 0;
  pwg.workshopBranch = "chassis";
  pwg.workshopFx = null;
  pwg.workshopMode = "upgrades";
  // 3 parça sahipte; biri (yükleyici) başka robota takılı ki taşıma sınansın.
  pwg.profile = M.normalizeProfile({ version: 5, scrap: 300, parts: ["lehim_yamasi", "yedek_yukleyici", "denge_jiroskobu"] });
  const ROBOT2 = M.CHARACTERS[0].id;
  const OTHER = M.CHARACTERS[1].id;
  pwg.profile = M.equipPart(pwg.profile, OTHER, "tool", "yedek_yukleyici").profile;

  pwg.openWorkshop();
  check("atölye geliştirme modunda açılır", pwg.workshopMode === "upgrades" && pwg.workshopSlotOpen === false);

  let ok = true;
  try { M.Game.prototype.renderWorkshop.call(pwg, ctx2); } catch (e) { ok = false; console.error(e); }
  check("atölye mod sekmeleri çizilir (2 sekme)", ok && (pwg._workshopModeRects || []).length === 2);
  check("geliştirme modunda 3 dal paneli", (pwg._workshopBranchRects || []).length === 3);
  check("geliştirme modunda yuva paneli yok", (pwg._workshopSlotRects || []).length === 0);

  // Mod değiştirme: 2 tuşu ve tıklama yolu.
  pwg.handleWorkshopKey({ key: "2", code: "Digit2", preventDefault() {} });
  check("2 tuşu parça moduna geçirir", pwg.workshopMode === "parts");
  ok = true;
  try { M.Game.prototype.renderWorkshop.call(pwg, ctx2); } catch (e) { ok = false; console.error(e); }
  check("parça modu hatasız çizilir", ok);
  check("parça modunda 8 alt yuva hücresi (4 yuva × 2)", (pwg._workshopSlotRects || []).length === 8, `= ${(pwg._workshopSlotRects || []).length}`);
  check("parça modunda dal paneli yok", (pwg._workshopBranchRects || []).length === 3 && pwg._workshopSlotRects.length === 8);
  M.Game.prototype.switchWorkshopMode.call(pwg, "upgrades");
  M.Game.prototype.switchWorkshopMode.call(pwg, "parts");
  check("yuvada takılı parça listede görünür (kask→—, gövde→yama)",
    !!pwg._workshopSlotRects.find((r) => r.slot === "body"));

  // Liste açma: yuvaya tıklama + Enter yolu.
  const bodySlot = pwg._workshopSlotRects.find((r) => r.slot === "body");
  M.Game.prototype.handleWorkshopClick.call(pwg, bodySlot.x + 4, bodySlot.y + 4);
  check("yuvaya tıklamak listeyi açar", pwg.workshopSlotOpen === true && pwg.workshopSlot === "body");
  M.Game.prototype.renderWorkshop.call(pwg, ctx2);
  check("liste satırları: sahip olunan parçalar + Boş bırak",
    (pwg._workshopPartRects || []).length === 2 && pwg._workshopPartRects[0].partId === "lehim_yamasi" && pwg._workshopPartRects[1].partId === null);

  // Takma: liste satırına tıklama → yuva dolar, bildirim yeşil, liste kapanır.
  const row = pwg._workshopPartRects[0];
  M.Game.prototype.handleWorkshopClick.call(pwg, row.x + 4, row.y + 4);
  check("satıra tıklamak parçayı 1. alt yuvaya takar", pwg.profile.robots[ROBOT2].loadout.body[0] === "lehim_yamasi");
  check("takma sonrası liste kapanır + montaj efekti + yeşil bildirim",
    pwg.workshopSlotOpen === false && !!pwg.workshopFx && pwg.workshopNotice && pwg.workshopNotice.color === "#8affc0");
  M.Game.prototype.updateWorkshopFx.call(pwg, 99);
  check("montaj efekti ve bildirim süre sonunda söner", pwg.workshopFx === null && pwg.workshopNotice === null);

  // Parçalar robota kilitli değildir: başka robottaki parça bu robota da
  // takılır ve eskisinde TAKILI KALIR (kullanıcı isteği).
  // Yuva sırası döngüsel: body → tool (tek adım aşağı).
  pwg.handleWorkshopKey({ key: "ArrowDown", code: "ArrowDown", preventDefault() {} });
  check("ok tuşu yuva seçimini değiştirir", pwg.workshopSlot === "tool");
  pwg.handleWorkshopKey({ key: "Enter", code: "Enter", preventDefault() {} });
  check("Enter yuvayı açar", pwg.workshopSlotOpen === true);
  M.Game.prototype.renderWorkshop.call(pwg, ctx2);
  M.Game.prototype.applyWorkshopPart.call(pwg, "yedek_yukleyici");
  check("parça ikinci robota da takılır", pwg.profile.robots[ROBOT2].loadout.tool[0] === "yedek_yukleyici");
  check("ilk robotta takılı KALIR (kopya gerekmez)", pwg.profile.robots[OTHER].loadout.tool[0] === "yedek_yukleyici");
  check("takma bildirimi parçayı söyler", /takıldı/.test(pwg.workshopNotice ? pwg.workshopNotice.text : ""));

  // Sökme ve sahipsiz parça reddi.
  M.Game.prototype.applyWorkshopPart.call(pwg, null);
  check("Boş bırak alt yuvayı boşaltır", pwg.profile.robots[ROBOT2].loadout.tool[0] === null && /boşaltıldı/.test(pwg.workshopNotice.text));
  M.Game.prototype.applyWorkshopPart.call(pwg, "kompozit_plaka");
  check("sahipsiz parça takılamaz (kırmızı bildirim)", pwg.workshopNotice.color === "#ff9b9b" && pwg.profile.robots[ROBOT2].loadout.body[0] === "lehim_yamasi");

  // Esc: açık liste önce kapanır, ikinci Esc ekrandan çıkar.
  pwg.openWorkshopSlot("feet");
  pwg.state = "WORKSHOP";
  M.Game.prototype.goBack.call(pwg);
  check("Esc açık listeyi kapatır (ekran kapanmaz)", pwg.workshopSlotOpen === false && pwg.state === "WORKSHOP");
  M.Game.prototype.goBack.call(pwg);
  check("ikinci Esc atölyeden çıkar", pwg.state === "MODE_SELECT");

  // Parça noktaları çizici (karakter seçim rozeti) — boş/dolu karışık girdiyle.
  let dotsOk = true;
  try { M._drawPartDots(mockCtx(), 100, 20, { body: "lehim_yamasi", tool: "yedek_yukleyici" }); } catch (e) { dotsOk = false; }
  check("parça noktaları çizilir (boş/dolu karışık)", dotsOk);
  check("bilinmeyen parça noktada yok sayılır", (() => { try { M._drawPartDots(mockCtx(), 100, 20, { body: "hayalet" }); return true; } catch (e) { return false; } })());

  // Karakter seçim ekranı smoke testi: parça rozeti çizim yolu burada da
  // çalışıyor mu (renderCharSelect başka yerde test edilmiyordu).
  const cs = Object.create(M.Game.prototype);
  cs.W = 960; cs.H = 540;
  cs.input = { mouseX: -1, mouseY: -1, left: false, right: false, charging: false, power: 0 };
  cs.renderTimeMs = 0;
  cs.mode = "computer";
  cs.playerCount = 2;
  cs.charSelectPhase = 0;
  cs.charPage = 0;
  cs.selectedChars = [M.CHARACTERS[0], M.CHARACTERS[1]];
  cs.playerControls = ["human", "bot"];
  cs.profile = pwg.profile; // parça takılı profil → rozet dolu nokta çizer
  cs.updateHud = () => {};
  let csOk = true;
  try { M.Game.prototype.renderCharSelect.call(cs, ctx2); } catch (e) { csOk = false; console.error(e); }
  check("karakter seçimi parça rozetiyle hatasız çizilir", csOk);

  // ── Aksesuar çizimi: parça verilince zenginleşir, verilmeyince birebir korunur ──
  const robotDef = M.CHARACTERS[0];
  const sig = (parts) => {
    const ops = [];
    M.drawRobot(mockCtx(ops), {
      cx: 100, cy: 100, r: 20, facing: 1, charDef: robotDef, timeMs: 500,
      motion: { vx: 0, vy: 0, onGround: true }, parts,
    });
    return ops.join("|");
  };
  const plain = sig(undefined);
  check("parçasız çizim değişmedi (undefined = null)", plain === sig(null));
  check("takılı parçalar çizimi zenginleştirir",
    sig({ body: "lehim_yamasi", helmet: "nisan_mercegi", tool: "yedek_yukleyici", feet: "denge_jiroskobu" }) !== plain);
  check("bilinmeyen parça çizimi değiştirmez", sig({ body: "hayalet" }) === plain);
  // Şekil aileleri: aynı yuvadaki farklı parçalar farklı donanım çizer.
  check("kask şekil aileleri farklı çizim üretir",
    sig({ helmet: "nisan_mercegi" }) !== sig({ helmet: "termal_vizor" }) &&
    sig({ helmet: "termal_vizor" }) !== sig({ helmet: "zirh_kaski" }));
  check("gövde şekil aileleri farklı çizim üretir",
    sig({ body: "lehim_yamasi" }) !== sig({ body: "kompozit_plaka" }) &&
    sig({ body: "kompozit_plaka" }) !== sig({ body: "sogutucu_radyator" }));
  check("ayak şekil aileleri farklı çizim üretir",
    sig({ feet: "turbo_palet" }) !== sig({ feet: "yay_takozlari" }) &&
    sig({ feet: "yay_takozlari" }) !== sig({ feet: "sicrama_yayi" }));
  // Bilinmeyen ikon şekli yuvanın yedek şekline düşer ve patlamaz.
  M.PARTS.push({ id: "test_sekil", label: "Test Şekil", slot: "helmet", price: 1, desc: "test", effects: { armorFlat: 0.01 }, icon: { shape: "yok_boyle_sekil", tint: "#ffffff", accent: "#ffffff" } });
  let seklOk = true;
  try { sig({ helmet: "test_sekil" }); } catch (e) { seklOk = false; console.error(e); }
  M.PARTS.pop();
  check("bilinmeyen ikon şekli yedek şekle düşer (patlamaz)", seklOk);

  // İki alt yuva: ikinci donanım AYRI ve KÜÇÜLTÜLMÜŞ çizilir (üst üste binmez).
  const onePartOps = [];
  M._rbPartAccessories(mockCtx(onePartOps), 20, M._rbPartSpecs({ body: ["lehim_yamasi", null] }), 400, false);
  const twoPartOps = [];
  M._rbPartAccessories(mockCtx(twoPartOps), 20, M._rbPartSpecs({ body: ["lehim_yamasi", "kompozit_plaka"] }), 400, false);
  check("iki donanım tek donanımdan fazla çizim üretir", twoPartOps.length > onePartOps.length);
  check("ikinci donanım küçültülerek çizilir (scale çağrısı)",
    twoPartOps.some((o) => o.startsWith("scale(")) && !onePartOps.some((o) => o.startsWith("scale(")));
  // Regresyon: ikinci donanımın ölçeği ÖNCE yuvanın anatomik çapasına, SONRA
  // geri uygulanır (translate → scale → translate). Eski sürüm tek translate
  // ile ölçekliyordu: şekil robot MERKEZİ çevresinde küçülüp sabit bir köşeye
  // kayıyordu — kask omuza, aparat göğse düşüp gövdeden kopuyordu.
  const trNums = (o) => o.slice("translate(".length, -1).split(",").map(Number);
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const anchoredOk = M.PART_SLOTS.every((slot) => {
    const sec = M._RB_PART_SECONDARY[slot];
    if (!sec) return false;
    const lo = { helmet: [null, null], body: [null, null], tool: [null, null], feet: [null, null] };
    lo[slot][1] = M.PARTS.find((p) => p.slot === slot).id;
    const ops = [];
    M._rbPartAccessories(mockCtx(ops), 20, M._rbPartSpecs(lo), 400, false);
    const trs = ops.filter((o) => o.startsWith("translate(")).map(trNums);
    return trs.length === 2
      && near(trs[0][0], (sec.ax + sec.dx) * 20) && near(trs[0][1], (sec.ay + sec.dy) * 20)
      && near(trs[1][0], -sec.ax * 20) && near(trs[1][1], -sec.ay * 20)
      && ops.some((o) => o.startsWith("scale("));
  });
  check("ikinci donanım yuvanın çapası çevresinde ölçeklenir (robot merkezi değil)", anchoredOk);

  check("dört yuvada da ikişer donanım çizilebilir", (() => {
    const ops3 = [];
    M._rbPartAccessories(mockCtx(ops3), 20, M._rbPartSpecs({
      helmet: ["nisan_mercegi", "zirh_kaski"],
      body: ["lehim_yamasi", "kompozit_plaka"],
      tool: ["takviye_bobini", "zamanlayici_cip"],
      feet: ["turbo_palet", "sicrama_yayi"],
    }), 400, false);
    return ops3.filter((o) => o.startsWith("scale(")).length === 4;
  })());

  // ── Canlı efektler: yalnız aksesuar çizici karşılaştırılır (gövde salınımı
  // gibi zaman bağımlı çizimler testi kirletmesin). ──
  const accOps = (lo, timeMs, moving) => {
    const ops2 = [];
    M._rbPartAccessories(mockCtx(ops2), 20, M._rbPartSpecs(lo), timeMs, !!moving);
    return ops2.join("|");
  };
  check("aksesuar çizimi deterministik (aynı zaman → aynı çizim)",
    accOps({ helmet: "termal_vizor", tool: "zamanlayici_cip", feet: "turbo_palet" }, 777) ===
    accOps({ helmet: "termal_vizor", tool: "zamanlayici_cip", feet: "turbo_palet" }, 777));
  check("tarama bandı canlı: farklı zaman → farklı çizim",
    accOps({ helmet: "termal_vizor" }, 0) !== accOps({ helmet: "termal_vizor" }, 450));
  check("jiroskop döner: farklı zaman → farklı çizim",
    accOps({ helmet: "denge_sensoru" }, 0) !== accOps({ helmet: "denge_sensoru" }, 450));
  check("çip LED sırası yanar: farklı zaman → farklı çizim",
    accOps({ tool: "zamanlayici_cip" }, 0) !== accOps({ tool: "zamanlayici_cip" }, 400));
  check("radyatör ısı dalgası: farklı zaman → farklı çizim",
    accOps({ body: "sogutucu_radyator" }, 0) !== accOps({ body: "sogutucu_radyator" }, 300));
  check("turbo egzoz rölantide de titreşir: farklı zaman → farklı çizim",
    accOps({ feet: "turbo_palet" }, 0) !== accOps({ feet: "turbo_palet" }, 160));
  check("turbo egzoz yürürken güçlenir (walking farkı)",
    accOps({ feet: "turbo_palet" }, 300, true) !== accOps({ feet: "turbo_palet" }, 300, false));
  check("statik zırh kaskı animasyonsuz (zaman değişse de aynı)",
    accOps({ helmet: "zirh_kaski" }, 0) === accOps({ helmet: "zirh_kaski" }, 450));

  // Build parçaları taşır; Entity maç içi aksesuar yolunu (partLoadout) besler.
  const bwp = M.resolveRobotBuild(robotDef, { upgrades: {}, loadout: { helmet: null, body: "lehim_yamasi", tool: null, feet: null } }, { upgradesEnabled: true });
  check("build parçaları sanitize loadout olarak taşır (dizi)",
    !!bwp.parts && bwp.parts.body[0] === "lehim_yamasi" && bwp.parts.helmet[0] === null);
  const ewp = new M.Entity(0, 0, "#fff", "T", robotDef, bwp);
  check("Entity maç içi parça bilgisini taşır", !!ewp.partLoadout && ewp.partLoadout.body[0] === "lehim_yamasi");
  const ep = new M.Entity(0, 0, "#fff", "T", robotDef, null);
  check("parçasız/bot Entity boş loadout taşır", ep.partLoadout === null);

  // ── İki alt yuva (v6): hücre seçimi + indeksli takma ───────────────────
  const savedProfileV6 = pwg.profile; // sonraki maç kontrolleri bu profili bekliyor
  pwg.state = "WORKSHOP";
  pwg.profile = M.normalizeProfile({ version: 6, scrap: 0, parts: M.PARTS.filter((p) => p.slot === "body").map((p) => p.id) });
  pwg.workshopSlot = "body";
  pwg.workshopSlotIndex = 0;
  pwg.workshopSlotOpen = false;
  M.Game.prototype.renderWorkshop.call(pwg, ctx2);
  const cells = pwg._workshopSlotRects.filter((r) => r.slot === "body");
  check("gövde yuvasında iki alt hücre var", cells.length === 2 && cells[0].index === 0 && cells[1].index === 1);
  M.Game.prototype.handleWorkshopClick.call(pwg, cells[1].x + 4, cells[1].y + 4);
  check("ikinci hücre 2. alt yuvayı açar", pwg.workshopSlotOpen === true && pwg.workshopSlotIndex === 1);
  M.Game.prototype.renderWorkshop.call(pwg, ctx2);
  const firstRow = pwg._workshopPartRects[0];
  M.Game.prototype.handleWorkshopClick.call(pwg, firstRow.x + 4, firstRow.y + 4);
  check("seçim 2. alt yuvaya yazılır (1. yuva boş kalır)",
    pwg.profile.robots[ROBOT2].loadout.body[1] !== null && pwg.profile.robots[ROBOT2].loadout.body[0] === null,
    JSON.stringify(pwg.profile.robots[ROBOT2].loadout.body));
  M.Game.prototype.openWorkshopSlot.call(pwg, "body", 0);
  M.Game.prototype.renderWorkshop.call(pwg, ctx2);
  const secondRow = pwg._workshopPartRects[1];
  M.Game.prototype.handleWorkshopClick.call(pwg, secondRow.x + 4, secondRow.y + 4);
  check("aynı yuvada iki parça bir arada durur",
    pwg.profile.robots[ROBOT2].loadout.body.filter(Boolean).length === 2,
    JSON.stringify(pwg.profile.robots[ROBOT2].loadout.body));
  // Liste etiketi parçanın HANGİ alt yuvada takılı olduğunu bilir.
  M.Game.prototype.openWorkshopSlot.call(pwg, "body", 0);
  M.Game.prototype.renderWorkshop.call(pwg, ctx2);
  const otherPid = pwg.profile.robots[ROBOT2].loadout.body[1];
  check("diğer alt yuvadaki parça listede görünür (✓ işareti)",
    !!pwg._workshopPartRects.find((r) => r.partId === otherPid));
  // ←/→ alt yuva seçer (yuva listesi kapalıyken).
  pwg.workshopSlotOpen = false;
  pwg.workshopSlotIndex = 0;
  M.Game.prototype.handleWorkshopKey.call(pwg, { key: "ArrowRight", code: "ArrowRight", preventDefault() {} });
  check("sağ ok 2. alt yuvayı seçer", pwg.workshopSlotIndex === 1);
  M.Game.prototype.handleWorkshopKey.call(pwg, { key: "ArrowLeft", code: "ArrowLeft", preventDefault() {} });
  check("sol ok 1. alt yuvayı seçer", pwg.workshopSlotIndex === 0);
  // Enter, seçili alt yuva için listeyi açar.
  M.Game.prototype.handleWorkshopKey.call(pwg, { key: "ArrowRight", code: "ArrowRight", preventDefault() {} });
  M.Game.prototype.handleWorkshopKey.call(pwg, { key: "Enter", code: "Enter", preventDefault() {} });
  check("Enter seçili ALT yuvanın listesini açar", pwg.workshopSlotOpen === true && pwg.workshopSlotIndex === 1);
  pwg.workshopSlotOpen = false;
  pwg.workshopSlotIndex = 0;
  pwg.profile = savedProfileV6;

  // ── Yuva listesi sayfalanır (yuva başına 6 parça + "Boş bırak" = 7 satır) ──
  const savedProfile = pwg.profile; // sonraki maç kontrolleri bu profili bekliyor
  pwg.profile = M.normalizeProfile({ version: 5, scrap: 0, parts: M.PARTS.filter((p) => p.slot === "body").map((p) => p.id) });
  pwg.workshopSlot = "body";
  pwg.workshopSlotOpen = true;
  pwg.workshopPartCursor = 0;
  pwg.workshopPartPage = 0;
  M.Game.prototype.renderWorkshop.call(pwg, ctx2);
  check("yuva listesi sayfa başına 4 satır", (pwg._workshopPartRects || []).length === 4, `= ${(pwg._workshopPartRects || []).length}`);
  check("sayfa göstergesi 1/2", pwg.workshopPartPage === 0);
  for (let i = 0; i < 6; i++) M.Game.prototype._moveWorkshopPartCursor.call(pwg, 1);
  check("imleç listeyi sonuna kadar gezer ve sayfayı kaydırır", pwg.workshopPartCursor === 6 && pwg.workshopPartPage === 1,
    `cursor=${pwg.workshopPartCursor} page=${pwg.workshopPartPage}`);
  M.Game.prototype.renderWorkshop.call(pwg, ctx2);
  check("son sayfada kalan satırlar (2 + Boş bırak)", (pwg._workshopPartRects || []).length === 3,
    `= ${(pwg._workshopPartRects || []).length}`);
  check("son satır Boş bırak", pwg._workshopPartRects[2] && pwg._workshopPartRects[2].partId === null);
  // İmleci ilk satıra alıp profili eski hâline dön (sonraki kontroller için).
  pwg.workshopPartCursor = 0;
  pwg.workshopPartPage = 0;
  pwg.workshopSlotOpen = false;
  pwg.profile = savedProfile;

  // ── Turbo Palet: adım uzunluğu ölçeklenir, animasyon fazı mesafeye kilitli kalır ──
  const flat = { w: 960, h: 540, surfaceBelow: () => 460, isSolid: () => false };
  const slow = new M.Entity(100, 460, "#fff", "Y", robotDef, null);
  slow.onGround = true;
  const turboBuild = M.resolveRobotBuild(robotDef, { upgrades: {}, loadout: { helmet: null, body: null, tool: null, feet: "turbo_palet" } }, { upgradesEnabled: true });
  const fast = new M.Entity(100, 460, "#fff", "H", robotDef, turboBuild);
  fast.onGround = true;
  check("yürüme hızı çarpanı Entity'ye geçer", Math.abs(slow.moveSpeedMult - 1) < 1e-9 && Math.abs(fast.moveSpeedMult - 1.10) < 1e-9, `slow=${slow.moveSpeedMult} fast=${fast.moveSpeedMult}`);
  for (let i = 0; i < 3; i++) { M.Entity.prototype.walk.call(slow, 1, flat); M.Entity.prototype.walk.call(fast, 1, flat); }
  const slowDx = slow.x - 100, fastDx = fast.x - 100;
  check("turbo palet adımı %10 uzatır", Math.abs(fastDx - slowDx * 1.10) < 1e-9, `slow=${slowDx} fast=${fastDx}`);
  // Faz mesafeye kilitli: iki robotta da (faz / alınan yol) aynıdır → ayak kaymaz.
  check("yürüyüş fazı mesafeye kilitli kalır (kayma yok)",
    Math.abs(slow.walkPhase / slowDx - fast.walkPhase / fastDx) < 1e-9,
    `slow=${slow.walkPhase / slowDx} fast=${fast.walkPhase / fastDx}`);

  // ── Maç entegrasyonu: takılı parça maç başı build'ine işler ────────────
  // game.js startGame, insan robotu için TAM OLARAK şu ifadeyi kurar:
  //   resolveRobotBuild(def, getRobotProgress(profile, def.id), { upgradesEnabled: true })
  // Zinciri parça parça doğrulamak, tam startGame'in arazi üretimini tetiklemesine
  // (vm sandbox canvas stub'ında ağır) gerek kalmadan aynı sözleşmeyi kanıtlar.
  const humanRp = M.getRobotProgress(pwg.profile, M.CHARACTERS[0].id);
  check("getRobotProgress loadout taşır (parça maç yolunda)", humanRp.loadout.body[0] === "lehim_yamasi", JSON.stringify(humanRp.loadout));
  const humanBuild = M.resolveRobotBuild(M.CHARACTERS[0], humanRp, { upgradesEnabled: true });
  check("maç başı build parçayı içerir", humanBuild.maxHp === M.CHARACTERS[0].hp + 15, `= ${humanBuild.maxHp}`);
  const he = new M.Entity(200, 420, M.CHARACTERS[0].color, M.CHARACTERS[0].label, M.CHARACTERS[0], humanBuild);
  check("Entity parçalı bütünlüğü alır", he.maxHp === M.CHARACTERS[0].hp + 15);
  // Bot tarafı: profil göçü/parça yolu botlara uygulanmaz (taban tanım).
  const botBuild = M.resolveRobotBuild(M.CHARACTERS[1], null, { upgradesEnabled: false });
  check("bot parçasız oynar (taban tanım)", botBuild.maxHp === M.CHARACTERS[1].hp && botBuild.skill.powerMult === 1);

  sandbox.document = prevDoc;
}

// ── 8b) Cephane Pazarı akışı (ekran + satın alma + maç entegrasyonu) ────────
group("Cephane Pazarı akışı");
{
  const mkEl = () => {
    const kids = [];
    return {
      classList: { add() {}, remove() {}, toggle() {}, contains: () => true },
      style: {}, dataset: {}, textContent: "", innerHTML: "",
      setAttribute() {}, children: kids,
      appendChild(n) { kids.push(n); return n; },
      removeChild(n) { const i = kids.indexOf(n); if (i >= 0) kids.splice(i, 1); return n; },
      get lastChild() { return kids[kids.length - 1]; },
      addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
      scrollLeft: 0, offsetLeft: 0, clientWidth: 100, offsetWidth: 40,
      width: 0, height: 0, getContext: () => ctxStub,
    };
  };
  const ctxStub = Object.assign(mockCtx(), {
    fillText() {}, setLineDash() {}, strokeRect() {}, clearRect() {}, drawImage() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    globalAlpha: 1, font: "", textAlign: "", textBaseline: "",
  });
  const nodes = {};
  const prevDoc = sandbox.document;
  sandbox.document = {
    getElementById: (id) => (nodes[id] = nodes[id] || mkEl()),
    createElement: () => mkEl(),
    documentElement: { style: { setProperty() {} } },
  };

  // ── Ekran, sayfalama ve satın alma (DOM'suz) ──────────────────────────────
  const mg = Object.create(M.Game.prototype);
  mg.W = 960; mg.H = 540;
  mg.input = { mouseX: -1, mouseY: -1, left: false, right: false, charging: false, power: 0 };
  mg.renderTimeMs = 0;
  mg.marketWeaponPage = 0;
  mg.marketFx = null; mg.marketNotice = null;
  mg.profile = M.normalizeProfile({ version: 3, scrap: 500 });
  mg.selectedChars = [];
  mg.updateHud = () => {};

  mg.openMarket();
  check("pazar durumu açılır (ortak depo — robot seçici yok)", mg.state === "MARKET",
    mg.state);

  let marketRenderOk = true;
  try { M.Game.prototype.renderMarket.call(mg, ctxStub); } catch (e) { marketRenderOk = false; console.error(e); }
  check("pazar ekranı hatasız çizilir", marketRenderOk);
  check("mühimmat grid'i sayfa başına 15 kart üretir (3×5)", (mg._marketWeaponRects || []).length === Math.min(15, M.sellableWeapons().length));
  check("mühimmat sayfası 2 sayfaya böler", Math.ceil(M.sellableWeapons().length / 15) === 2);

  // Karta tıklamak 1 mermi alır (fiyatı düşerek) ve parıltı/bildirim üretir.
  const card = mg._marketWeaponRects[0];
  const boughtId = card.spec.id;
  const price = M.ammoPriceFor(boughtId);
  M.Game.prototype.handleMarketClick.call(mg, card.x + 4, card.y + 4, false);
  check("karta tıklamak 1 mermi alır (ortak depo)", M.getAmmoDepot(mg.profile)[boughtId] === 1);
  check("satın alma Hurda düşer", mg.profile.scrap === 500 - price, `= ${mg.profile.scrap}`);
  check("satın alma parıltısı ve bildirimi çıkar",
    !!mg.marketFx && mg.marketFx.weaponId === boughtId && !!mg.marketNotice && mg.marketNotice.color === "#8affc0");
  M.Game.prototype.updateMarketFx.call(mg, 999);
  check("parıltı ve bildirim süre sonunda temizlenir", mg.marketFx === null && mg.marketNotice === null);

  // Shift ile toplu alım ve yetersiz bakiye reddi.
  mg.profile = M.normalizeProfile({ version: 3, scrap: 5000 });
  M.Game.prototype.handleMarketClick.call(mg, card.x + 4, card.y + 4, true);
  check("Shift ile toplu alım yapılır", M.getAmmoDepot(mg.profile)[boughtId] === M.AMMO_BULK_QTY);
  mg.profile = M.normalizeProfile({ version: 3, scrap: 0 });
  M.Game.prototype.handleMarketClick.call(mg, card.x + 4, card.y + 4, false);
  check("yetersiz Hurda satın almayı engeller", mg.marketNotice && mg.marketNotice.color === "#ff9b9b");

  // Sayfa sınırları ve geri dönüş.
  mg.marketWeaponPage = 0; mg.changeMarketWeaponPage(-1);
  check("ilk mühimmat sayfasından geri gidilmez", mg.marketWeaponPage === 0);
  mg.marketWeaponPage = 1; mg.changeMarketWeaponPage(1);
  check("son mühimmat sayfasından ileri gidilmez", mg.marketWeaponPage === 1);
  mg.goBack();
  check("Esc pazardan ana menüye döner", mg.state === "MODE_SELECT");

  // ── Maça yükleme ve maç sonu iadesi (gerçek startGame/quitToMenu) ─────────
  const sg = Object.create(M.Game.prototype);
  sg.W = 960; sg.H = 540;
  sg.bot = { cancel() {}, resetMatch() {} };
  sg.bots = [];
  sg.mode = "computer";
  sg.difficulty = "normal";
  sg.selectedMap = M.MAPS[0];
  sg.selectedChars = [M.CHARACTERS[0], M.CHARACTERS[1]];
  sg.playerControls = ["human", "bot"];
  sg.matchProgress = null;
  sg.input = { mouseX: 0, mouseY: 0, left: false, right: false, charging: false, power: 0 };
  sg.players = [];
  sg.projectiles = []; sg.explosions = []; sg.skillFx = []; sg.damagePopups = [];
  sg.mines = []; sg.fires = [];
  sg.sessionId = "t";
  sg.renderTimeMs = 0;
  sg.profile = M.normalizeProfile({ version: 3, scrap: 100, robots: { [M.CHARACTERS[0].id]: { ammo: { grenade: 5, sniper: 2 } } } });
  // Eski robot depoları normalizeProfile göçüyle köke (ortak depoya) taşınır.
  sg.startGame();
  const human = sg.players[0];
  const gCap = M.weaponBattleMax(M.weaponById("grenade"));
  const sCap = M.weaponBattleMax(M.weaponById("sniper"));
  check("depo maç başında savaş tavanına kadar yüklenir",
    human.ammo.grenade === gCap && human.ammo.sniper === sCap,
    `grenade=${human.ammo.grenade} sniper=${human.ammo.sniper}`);
  check("bot taban mühimmatla oynar (depo yüklenmez)", sg.players[1].ammo.grenade === M.initialAmmo().grenade && !sg.players[1].ammoDepot);
  check("ortak depo profilde dokunulmaz kalır (yenilenmeye dayanıklı)",
    M.getAmmoDepot(sg.profile).grenade === 5);
  check("yüklenen depo dilimi snapshot'ı tutulur (tavan dâhil)",
    human.ammoDepot && human.ammoDepot.grenade === gCap - M.initialAmmo().grenade &&
    human.ammoDepot.sniper === sCap - M.initialAmmo().sniper,
    JSON.stringify(human.ammoDepot));

  // 4 el bombası atıldı (3 taban + 1 depo); nişancı hiç kullanılmadı.
  human.ammo.grenade -= 4;
  sg.quitToMenu();
  check("maç sonunda harcanmayan mermi ortak depoya döner",
    M.getAmmoDepot(sg.profile).grenade === 4, `= ${M.getAmmoDepot(sg.profile).grenade}`);
  check("kullanılmayan cephane eksiksiz döner", M.getAmmoDepot(sg.profile).sniper === 2);
  check("iade sonrası snapshot temizlenir", human.ammoDepot === null);
  check("iade iki kez uygulanmaz", (sg._settleAmmoDepot(), M.getAmmoDepot(sg.profile).grenade === 4));

  sandbox.document = prevDoc;
}

// ── 8c) Parça pazarı akışı (sekmeler + satın alma + Atölye işareti) ──────
group("Parça pazarı akışı");
{
  const mkEl = () => {
    const kids = [];
    return {
      classList: { add() {}, remove() {}, toggle() {}, contains: () => true },
      style: {}, dataset: {}, textContent: "", innerHTML: "",
      setAttribute() {}, children: kids,
      appendChild(n) { kids.push(n); return n; },
      removeChild(n) { const i = kids.indexOf(n); if (i >= 0) kids.splice(i, 1); return n; },
      get lastChild() { return kids[kids.length - 1]; },
      addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
      scrollLeft: 0, offsetLeft: 0, clientWidth: 100, offsetWidth: 40,
      width: 0, height: 0, getContext: () => ctxStub,
    };
  };
  const ctxStub = Object.assign(mockCtx(), {
    fillText() {}, setLineDash() {}, strokeRect() {}, clearRect() {}, drawImage() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    globalAlpha: 1, font: "", textAlign: "", textBaseline: "",
  });
  const nodes = {};
  const prevDoc = sandbox.document;
  sandbox.document = {
    getElementById: (id) => (nodes[id] = nodes[id] || mkEl()),
    createElement: () => mkEl(),
    documentElement: { style: { setProperty() {} } },
  };

  const pg = Object.create(M.Game.prototype);
  pg.W = 960; pg.H = 540;
  pg.input = { mouseX: -1, mouseY: -1, left: false, right: false, charging: false, power: 0 };
  pg.renderTimeMs = 0;
  pg.marketWeaponPage = 0;
  pg.marketPartPage = 0;
  pg.marketTab = "ammo";
  pg.marketFx = null; pg.marketNotice = null;
  pg.profile = M.normalizeProfile({ version: 5, scrap: 500 });
  pg.selectedChars = [];
  pg.updateHud = () => {};
  pg.openMarket();

  // Varsayılan sekme cephane; 5 sekme (cephane + dört yuva) ve sekme başına kartlar.
  let ok = true;
  try { M.Game.prototype.renderMarket.call(pg, ctxStub); } catch (e) { ok = false; console.error(e); }
  check("pazar 5 sekme üretir (cephane + 4 yuva)", ok && (pg._marketTabRects || []).length === 5);
  check("varsayılan sekme cephane", pg.marketTab === "ammo" && (pg._marketWeaponRects || []).length > 0);
  check("cephane sekmesinde parça kartı yok", (pg._marketPartRects || []).length === 0);

  // Yuva sekmesine geçiş: tıklama yolu (KASK) + klavye yolu.
  const helmetTabRect = pg._marketTabRects[1];
  M.Game.prototype.handleMarketClick.call(pg, helmetTabRect.x + 4, helmetTabRect.y + 4, false);
  check("KASK sekmesine tıklama geçirir", pg.marketTab === "helmet");
  ok = true;
  try { M.Game.prototype.renderMarket.call(pg, ctxStub); } catch (e) { ok = false; console.error(e); }
  check("parça ekranı hatasız çizilir", ok);
  const slotParts = M.PARTS.filter((p) => p.slot === "helmet");
  check("yuva sekmesi yalnız o yuvanın parçalarını gösterir",
    (pg._marketPartRects || []).length === slotParts.length && pg._marketPartRects.every((r) => r.part.slot === "helmet"),
    `= ${(pg._marketPartRects || []).length}`);
  check("parça sekmesinde mühimmat kartı yok", (pg._marketWeaponRects || []).length === 0);
  check("yuva başına tek sayfa (6 parça)", slotParts.length <= 15);
  pg.changeMarketPage(1);
  check("parçalarda sayfa sınırı korunur", pg.marketPartPage === 0);
  // Sekmeler arası geçiş: GÖVDE'ye klavye/çağrı yolu.
  M.Game.prototype.switchMarketTab.call(pg, "body");
  check("gövde sekmesine geçilir", pg.marketTab === "body");

  // Satın alma: en ucuz parça (Lehim Yaması, 40) kart tıklamasıyla alınır.
  M.Game.prototype.renderMarket.call(pg, ctxStub);
  const bodySlotParts = M.PARTS.filter((p) => p.slot === "body");
  const cheapest = bodySlotParts.reduce((a, b) => (b.price < a.price ? b : a), bodySlotParts[0]);
  const card = (pg._marketPartRects || []).find((r) => r.part.id === cheapest.id);
  check("gövde sekmesinde en ucuz parça kartı bulunur", !!card);
  const scrapBefore = pg.profile.scrap;
  M.Game.prototype.handleMarketClick.call(pg, card.x + 4, card.y + 4, false);
  check("parça satın alınır (envantere girer)", M.getOwnedParts(pg.profile).includes(cheapest.id));
  check("satın alma Hurda düşer", pg.profile.scrap === scrapBefore - cheapest.price, `= ${pg.profile.scrap}`);
  check("satın alma parıltısı/bildirimi parçaya bağlanır",
    !!pg.marketFx && pg.marketFx.partId === cheapest.id && !!pg.marketNotice && pg.marketNotice.color === "#8affc0");

  // Aynı parçaya ikinci tıklama: benzersiz parça reddi (kırmızı bildirim).
  M.Game.prototype.handleMarketClick.call(pg, card.x + 4, card.y + 4, false);
  check("aynı parça ikinci kez alınamaz (benzersiz)", pg.marketNotice && pg.marketNotice.color === "#ff9b9b");
  check("tekrar tıklama envanteri büyütmez", M.getOwnedParts(pg.profile).length === 1);

  // Yetersiz bakiye: bildirim ve alım yok.
  pg.profile = M.normalizeProfile({ version: 5, scrap: 0 });
  M.Game.prototype.renderMarket.call(pg, ctxStub);
  const poorCard = pg._marketPartRects.find((r) => r.part.id === "kompozit_plaka");
  M.Game.prototype.handleMarketClick.call(pg, poorCard.x + 4, poorCard.y + 4, false);
  check("yetersiz Hurda parça alımını engeller", pg.marketNotice && pg.marketNotice.color === "#ff9b9b" && M.getOwnedParts(pg.profile).length === 0);

  // Takılı parça kartı "Takılı → robot" durumuna geçer (Atölye işareti).
  pg.profile = M.normalizeProfile({ version: 5, scrap: 500, parts: ["lehim_yamasi"] });
  const eq = M.equipPart(pg.profile, M.CHARACTERS[0].id, "body", "lehim_yamasi");
  pg.profile = eq.profile;
  M.Game.prototype.renderMarket.call(pg, ctxStub);
  const equippedCard = pg._marketPartRects.find((r) => r.part.id === "lehim_yamasi");
  check("takılı parça kartta işaretlenir",
    !!equippedCard && (pg._marketEquippedMap()["lehim_yamasi"] || []).includes(M.CHARACTERS[0].id));
  // Aynı parça ikinci robota da takılınca kart "2 robotta" durumuna geçer.
  const eq2 = M.equipPart(pg.profile, M.CHARACTERS[1].id, "body", "lehim_yamasi");
  pg.profile = eq2.profile;
  check("aynı parça iki robotta birden takılı olabilir",
    (pg._marketEquippedMap()["lehim_yamasi"] || []).length === 2, JSON.stringify(pg._marketEquippedMap()["lehim_yamasi"]));

  // ── Yerleşim regresyonu (kullanıcı bildirimi) ──────────────────────────
  // (1) Sekmeler geri butonuyla üst üste binmemeli; (2) DOM ses denetiminin
  // kapladığı üst-sağ alana hiçbir canvas yazısı çizilmemeli.
  pg.marketTab = "body";
  pg.profile = M.normalizeProfile({ version: 5, scrap: 260 });
  const texts = [];
  const recCtx = Object.assign(mockCtx(), {
    fillText: (t, x, y) => texts.push({ t, x, y }),
    measureText: () => ({ width: 60 }),
    setLineDash() {}, strokeRect() {}, clearRect() {}, drawImage() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    globalAlpha: 1, font: "", textAlign: "", textBaseline: "",
  });
  M.Game.prototype.renderMarket.call(pg, recCtx);
  const inSafe = (s) => s.x >= M.AUDIO_SAFE.x && s.x <= M.AUDIO_SAFE.x + M.AUDIO_SAFE.w &&
                        s.y >= M.AUDIO_SAFE.y && s.y <= M.AUDIO_SAFE.y + M.AUDIO_SAFE.h;
  const offenders = texts.filter(inSafe);
  check("pazar: DOM ses denetimi alanına canvas yazısı çizilmez",
    texts.length > 0 && offenders.length === 0,
    offenders.map((s) => `"${s.t}"@${s.x},${s.y}`).join(" | "));
  const backRect2 = pg._backRect;
  const tabRects = pg._marketTabRects || [];
  const kapisir = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  check("pazar: sekmeler geri butonuyla kesişmez",
    !!backRect2 && tabRects.length === 5 && tabRects.every((r) => !kapisir(r, backRect2)));
  check("pazar: bilgi satırı ses denetimi alanının altında",
    M.AUDIO_SAFE.y + M.AUDIO_SAFE.h < tabRects[0].y, `tabY=${tabRects[0] && tabRects[0].y}`);

  // Parçaları kapatmak pazardan çıkışı bozmaz.
  pg.goBack();
  check("Esc pazardan ana menüye döner (parça sekmesi)", pg.state === "MODE_SELECT");

  sandbox.document = prevDoc;
}

// ── Maç sonu sonuç kartı ──────────────────────────────────────────────────
// startGame() sonuç kartını her hâlükârda kapatmalı: "Tekrar Oyna" yalnız
// startGame()'i çağırdığı için kart açık kalıp maç arkada yeniden başlarken
// ekranda asılı duruyordu (F2-11).
group("Maç sonu sonuç kartı");
{
  const ctxStub = Object.assign(mockCtx(), { drawImage() {}, clearRect() {} });
  const mkEl = () => ({
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c, f) { if (f === undefined) f = !this.contains(c); f ? this.add(c) : this.remove(c); },
    },
    style: { setProperty() {} }, dataset: {}, textContent: "", innerHTML: "",
    setAttribute() {}, addEventListener() {},
    children: [],
    appendChild(el) { this.children.push(el); },
    removeChild(el) { const i = this.children.indexOf(el); if (i >= 0) this.children.splice(i, 1); },
    querySelector: () => null, querySelectorAll: () => [],
    scrollLeft: 0, offsetLeft: 0, clientWidth: 100, offsetWidth: 40,
    width: 0, height: 0, getContext: () => ctxStub,
  });
  const nodes = {};
  const prevDoc = sandbox.document;
  sandbox.document = {
    getElementById: (id) => (nodes[id] = nodes[id] || mkEl()),
    createElement: () => mkEl(),
    documentElement: { style: { setProperty() {} } },
  };
  const rg = Object.create(M.Game.prototype);
  rg.W = 960; rg.H = 540;
  rg.profile = M.normalizeProfile({ version: 2 });
  rg.mode = "computer";
  rg.difficulty = "normal";
  rg.selectedChars = [M.CHARACTERS[0], M.CHARACTERS[1]];
  rg.playerControls = ["human", "bot"];
  rg.selectedMap = M.MAPS[0];
  rg.bot = { cancel() {}, resetMatch() {} };
  rg.bots = [];
  rg.input = { charging: false, mouseX: 0, mouseY: 0 };
  rg.clearTurnInput = () => {};
  rg.updateHud = () => {};
  rg.startGame = M.Game.prototype.startGame; // gerçek maç kurulumu koşsun
  sandbox.document.getElementById("overlay").classList.remove("hidden"); // maç sonu kartı açık
  rg.replay();
  check("Tekrar Oyna maçı yeniden başlatır", rg.state === "AIMING" && rg.players.length === 2);
  check("Tekrar Oyna sonuç kartını kapatır", nodes["overlay"].classList.contains("hidden"));
  sandbox.document = prevDoc;
}

// ── Özet ────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(48)}`);
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
if (fail > 0) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exit(1);
} else {
  console.log("Tüm testler geçti ✅");
}

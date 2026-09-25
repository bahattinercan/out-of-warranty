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
const FILES = ["audio.js", "characters.js", "progression.js", "profile.js", "maps.js", "story-data.js", "skills.js", "skill-fx.js", "robots.js", "terrain.js", "weapons.js", "entity.js", "projectile.js", "ai.js", "story.js", "game.js"];
const bundle =
  FILES.map((f) => fs.readFileSync(path.join(JS_DIR, f), "utf8")).join("\n;\n") +
  "\n;globalThis.__M = { CHARACTERS, MAPS, BIOMES, FACTORY_ZONES, PROP_DRAWERS, WEAPONS, SKILL_PROJECTILES, PROJECTILE_SHAPES, SHARED_SHAPES, useSkill, drawCharExtras, drawRobot, Entity, Projectile, Explosion, GRAVITY, Game, BotController, AI_LIMITS, aiWorldKey, aiSimulateShot, aiCoarseCandidates, aiPathIsSafe, aiRandom, AI_DIFFICULTY, aiDamageMultiplier, aiAssignDamageScale, aiSelectWeapon, skillConsumesShot, SKILL_SHOT_KINDS, AI_SKILL_REPLACE_SCORE, " +
  "SKILL_FX_SHAPES, SKILL_FX_KIND_DEFAULT, SKILL_FX_EXTENT, spawnSkillFx, updateSkillFx, drawSkillFx, drawSkillFxIcon, drawSkillAura, SkillFx, " +
  "SERVICE_LEVELS, MAX_SERVICE_XP, MAX_TIER, START_SCRAP, BRANCHES, BRANCH_LABELS, TIER_COSTS, TIER_LEVEL_GATES, REWARD_BASE, DIFFICULTY_MULTIPLIER, levelForXp, xpForLevel, nextLevelXp, levelUpMessage, calculateMatchReward, resolveRobotBuild, upgradeEffectText, robotUpgradeSummary, totalTiers, sanitizeUpgrades, nextUpgradeStep, toSafeInt, defaultProfile, defaultRobotProgress, normalizeProfile, loadProfile, saveProfile, getRobotProgress, grantMatchReward, purchaseUpgrade, PROFILE_KEY, createSessionId, " +
  "STORY_CAMPAIGN, STORY_ZONES, STORY_MISSIONS, STORY_SCENES, STORY_TUTORIALS, STORY_DIFFICULTIES, validateStoryData, getMissionById, missionsInOrder, firstMissionId, nextMissionId, missionPrerequisites, isMissionUnlocked, selectableRobotsForMission, defaultStoryProgress, normalizeStoryProgress, maintenancePoints, collectedEvidence, curtailedZones, resolveStoryDifficulty, missionsForZone, missionStatusOf, firstMissionRobotId, sceneById, sceneTotalLines, storySceneInfo, isSinglePlayerProgressionMode };";

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

  // Geri adım aynı mesafeyi ters yönde kat eder: faz başlangıca döner.
  a.walk(-1, terrain);
  check("ters adım fazı geri sarar", Math.abs(a.walkPhase - one) < 1e-9, `phase=${a.walkPhase}`);
  a.walk(-1, terrain);
  check("başlangıç mesafesine dönünce faz sıfırlanır", a.walkPhase < 1e-9 || Math.abs(a.walkPhase - Math.PI * 2) < 1e-9, `phase=${a.walkPhase}`);

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
  const g2 = new M.Projectile(200, 420, 0.1, 0.1, grenade);
  g2.bounceOff(flat);
  check("çok yavaşlayan bomba yüzeye oturur", g2.vx === 0 && g2.vy === 0);
  const g3 = new M.Projectile(200, 420, 0.1, 0.1, M.WEAPONS[0]); // sürtünmesiz spec
  g3.bounceOff(flat);
  check("bounceFriction yazmayan spec eski davranışı korur", g3.vx !== 0 || g3.vy !== 0);

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

  // 6) Bot benzetimi de süpürülmüş testi kullanır: iki örnek noktasının tam
  //    ortasındaki hedefi yakalar (eski nokta testi ıskalıyordu).
  const tg = makeAiGame(180, 720);
  const mr = tg.players[0].r;
  const muzzleX = 180 + Math.cos(-0.02) * (mr + 12);
  const step = sniper.baseSpeed + sniper.speedMul; // tam güç
  tg.players[1].x = muzzleX + step * 5.5;
  const through = M.aiSimulateShot(tg, 0, -0.02, 1, sniper);
  check("bot benzetimi: hızlı nişancı iki adım arasındaki hedefi yakalar",
    !!through && through.enemyDamage > 0,
    through && `hasar=${through.enemyDamage} isabet=${through.hit ? through.hit.x.toFixed(1) : "-"}`);
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

  // Çıkış çarpanı: taban × (normal silahta) çekirdek bonusu × zorluk ölçeği.
  {
    const g = Object.create(M.Game.prototype);
    const shooter = makeEntity(M.CHARACTERS[0], 200, 420);
    shooter.dmgMult = 1.0;
    shooter.weaponDamageMult = 1.07;
    shooter.aiDamageMult = 1;
    g.shotIsSkill = false;
    check("çıkış çarpanı taban × çekirdek bonusunu içerir",
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

  // Önceki hikâye maçının oyuncuları bellekte kalsa bile silah paneli yalnız
  // gerçek savaş durumlarında görünür olmalı. Menüleri tek tek dışlamak yeni
  // STORY_* ekranları eklendiğinde panelin sızmasına yol açıyordu.
  let weaponPanelHidden = true;
  const weaponPanel = { classList: { toggle: (_name, force) => { weaponPanelHidden = !!force; } } };
  const hudPlayer = { weapon: 0, ammo: Object.fromEntries(M.WEAPONS.map((w) => [w.id, w.ammo == null ? Infinity : w.ammo])) };
  const weaponHudGame = { players:[hudPlayer], active:hudPlayer, turn:0, _weaponKey:null };
  const menuStates = ["MODE_SELECT", "STORY_MAP", "STORY_SCENE", "STORY_ROBOT_SELECT", "STORY_BRIEFING", "STORY_ARCHIVE"];
  sandbox.document = { getElementById: (id) => id === "weapon-panel" ? weaponPanel : null };
  let allMenusHideWeapons = true;
  for (const state of menuStates) {
    weaponHudGame.state = state;
    M.Game.prototype.updateWeaponHud.call(weaponHudGame);
    if (!weaponPanelHidden) allMenusHideWeapons = false;
  }
  check("önceki oyuncular kalsa da hikâye ve ana menüler silah panelini gizler", allMenusHideWeapons);
  let combatStatesShowWeapons = true;
  for (const state of ["AIMING", "PROJECTILE", "SETTLE"]) {
    weaponHudGame.state = state;
    weaponHudGame._weaponKey = null;
    M.Game.prototype.updateWeaponHud.call(weaponHudGame);
    if (weaponPanelHidden) combatStatesShowWeapons = false;
  }
  check("silah paneli üç savaş durumunda görünür", combatStatesShowWeapons);

  // HUD da aynı kurala uyar: hikâye menüleri büyük başlık çizer, açık kalan
  // sıra/rüzgâr şeridi o başlığı kapatıyordu (STORY_ROBOT_SELECT ekran görüntüsü).
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
    let storyMenusHideHud = true;
    for (const state of ["MODE_SELECT", "STORY_MAP", "STORY_SCENE", "STORY_ROBOT_SELECT", "STORY_BRIEFING", "STORY_ARCHIVE", "WORKSHOP", "MAP_SELECT"]) {
      hudGame.state = state;
      M.Game.prototype.updateHud.call(hudGame);
      if (!hudHidden) storyMenusHideHud = false;
    }
    check("HUD ana menü, hikâye menüleri ve sahnede gizlenir", storyMenusHideHud);
    hudGame.state = "STORY_SCENE";
    M.Game.prototype.updateHud.call(hudGame);
    // Banner sahne başlığıyla çakışıyordu; ipucu artık canvasa çiziliyor.
    check("HUD sahne oynatıcısında da gizlenir (ipucu canvasa taşındı)", hudHidden === true);
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
  check("Gövde III bütünlüğü tek çarpanla %10 artırır", full.maxHp === Math.round(healDef.hp * 1.10), `hp=${full.maxHp}`);
  check("Gövde II kaplamayı +0.02 artırır", Math.abs(full.armor - (healDef.armor + 0.02)) < 1e-9, `armor=${full.armor}`);
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

// ── Hikâye modu durum makinesi ve maç entegrasyonu ────────────────────────
// Kupa haritası → sahne → robot seçimi → brifing → arena → ilerleme yazımı
// zincirinin tamamı gerçek Game.prototype metotlarıyla, DOM olmadan kurulur.
// DOM'a dokunan yardımcılar (clearTurnInput/updateHud/startGame) stub'lanır.
group("Hikâye modu durum makinesi");
{
  function makeStoryGame() {
    const g = Object.create(M.Game.prototype);
    g.profile = M.normalizeProfile({ version: 2, scrap: 500 });
    g.players = [];
    g.bots = [];
    g.bot = { cancel() {}, resetMatch() {} };
    g.selectedChars = [];
    g.playerControls = [];
    g.selectedMap = null;
    g.difficulty = "normal";
    g.mode = null;
    g.state = "MODE_SELECT";
    g.matchProgress = null;
    g.storyMission = null;
    g.storyMissionId = null;
    g.input = { charging: false, mouseX: 0, mouseY: 0 };
    g.clearTurnInput = () => {};
    g.updateHud = () => {};
    g.started = false;
    g._simMatchId = 0;
    // startGame stub: gerçek matchProgress davranışını (her maçta yeni anahtar)
    // taklit eder ki rövanş/ödül testleri gerçek yolayı doğrulasın.
    g.startGame = function () {
      g.started = true;
      g.state = "AIMING";
      g._simMatchId++;
      g.matchProgress = {
        key: `sim:${g._simMatchId}`,
        humanRobotId: g.selectedChars[0] ? g.selectedChars[0].id : null,
        humanIndex: 0,
        opponentCount: g.selectedChars.filter((c, i) => (g.playerControls[i] || "human") === "bot").length,
        humanShotsResolved: 0,
        pendingHumanShot: false,
        rewardGranted: false,
      };
    };
    return g;
  }

  const sg = makeStoryGame();
  const FIRST = M.firstMissionId();

  // Boş kayıt: menü kartı kupa haritasına yönlendirir.
  sg.openStoryResume();
  check("boş kayıtta Devam Et haritaya gider", sg.state === "STORY_MAP");

  // Görev açılışı: giriş sahnesi oynatılır ve Arşiv'e işaretlenir.
  sg.openStoryMission(FIRST);
  check("görev kartı giriş sahnesini açar", sg.state === "STORY_SCENE" && sg.storySceneId === `scene_${FIRST}_intro`);
  check("giriş sahnesi Arşive işaretlenir", sg.profile.story.seenScenes.includes(`scene_${FIRST}_intro`));
  check("sahne kutu sayısı veriyle uyuşur", M.sceneTotalLines(`scene_${FIRST}_intro`) === M.STORY_SCENES[`scene_${FIRST}_intro`].lines.length);

  // Kutu kutu ilerlet; yazı bitmemisse tek basışta tamamlanır.
  for (let i = 0; i < 20 && sg.state === "STORY_SCENE"; i++) sg.advanceStoryScene();
  check("sahne bitince robot seçimine geçilir", sg.state === "STORY_ROBOT_SELECT");

  // Rakip robot geçici kapalı; geçerli seçim profile yazılır.
  const opps = M.getMissionById(FIRST).opponents;
  sg.selectStoryRobot(opps[0]);
  check("rakip robot seçilemez", sg.profile.story.selectedRobotId === null);
  sg.selectStoryRobot("tavsan");
  check("geçerli robot seçimi profile yazılır", sg.profile.story.selectedRobotId === "tavsan");
  check("robot seçimi brifinge gider", sg.state === "STORY_BRIEFING");

  // Brifingden maç: kadro/harita/kontrol veriden gelir, startGame çağrılır.
  sg.startStoryMission(FIRST);
  check("hikâye maçı başlatılır", sg.started && sg.state === "AIMING");
  check("mod story olur", sg.mode === "story");
  check("kadro insan + rakip botlardır",
    sg.selectedChars[0].id === "tavsan" &&
    JSON.stringify(sg.selectedChars.slice(1).map((c) => c.id)) === JSON.stringify(opps));
  check("kontroller insan/bot dağılımı uygundur",
    sg.playerControls[0] === "human" && sg.playerControls.slice(1).every((c) => c === "bot"));
  check("rakip sayısı kadar bot kurulur", sg.bots.length === opps.length);
  check("arena görev haritasından gelir", sg.selectedMap.id === M.getMissionById(FIRST).mapId);

  // Ödül kapısı hikâyede de açık: isSinglePlayerProgressionMode true.
  check("hikâye modu ilerleme modu sayılır", M.isSinglePlayerProgressionMode("story") === true);
  check("local hâlâ ilerleme modu değildir", M.isSinglePlayerProgressionMode("local") === false);
  sg.mode = "story";
  sg.matchProgress = { key: "s:h1", humanRobotId: "tavsan", humanIndex: 0, opponentCount: 1, humanShotsResolved: 1, rewardGranted: false };
  const storyReward = M.Game.prototype.grantMatchReward.call(sg, "win");
  check("hikâye maçında Hurda/XP ödülü yazılır", storyReward !== null && storyReward.ok === true && sg.profile.scrap > 500);
  sg.matchProgress.rewardGranted = false;
  check("öğreticiler görevden gelir", JSON.stringify(M.getMissionById(FIRST).tutorials) === JSON.stringify(["movement_aim"]));

  // Zafer ilerlemesi: görev tamamlanır, sıradaki görev açılır, tekrar çoğaltmaz.
  sg.started = false; sg.state = "AIMING";
  sg.finishStoryMatch("win", null);
  check("zafer görevi tamamlanır", sg.profile.story.completedMissions.includes(FIRST));
  check("zaferden sonra kayıtlı görev sıradaki olur", sg.profile.story.currentMissionId === "assembly_magnet_objection");
  check("zafer sahnesi Arşive düşer", sg.profile.story.seenScenes.includes(`scene_${FIRST}_win`));
  sg.profile.story.completedMissions.push(FIRST); // yinelenen tamamlama
  sg.finishStoryMatch("win", null);
  check("tekrar tamamlama diziyi çoğaltmaz", sg.profile.story.completedMissions.filter((x) => x === FIRST).length === 1);
  check("kupa haritası görevi TAMAM gösterir",
    M.missionStatusOf(M.getMissionById(FIRST), sg.profile.story) === "done");
  check("ikinci görev haritada AÇIK", M.missionStatusOf(M.getMissionById("assembly_magnet_objection"), sg.profile.story) === "open");
  check("üçüncü görev hâlâ kilitli", M.missionStatusOf(M.getMissionById("cooling_frozen_shift"), sg.profile.story) === "locked");

  // Yenilgi ilerlemeyi geri almaz; loss sahnesi yoksa doğrudan overlay'e düşer.
  sg.state = "AIMING";
  sg.finishStoryMatch("loss", null);
  check("yenilgi tamamlanma listesini bozmaz", sg.profile.story.completedMissions.includes(FIRST));
  check("yenilgi görevi sıradaki yapmaz", sg.profile.story.currentMissionId === "assembly_magnet_objection");

  // Sonraki Etap: kayıtlı sıradaki görevin giriş sahnesine girer.
  sg.storyNextMission();
  check("Sonraki Etap ikinci görevi açar", sg.state === "STORY_SCENE" && sg.storySceneId === "scene_assembly_magnet_objection_intro");

  // Hikâye bağlamında çıkış kupa haritasına döner.
  sg.state = "AIMING";
  sg.quitToMenu();
  check("hikâye maçından çıkış kupa haritasına döner", sg.state === "STORY_MAP");

  // Yenilgi sahnesi eksikken (görev 3+) akış overlay'e düşer: sahne yoksa
  // finishStoryMatch çökmez (bu fazda görev 2'nin loss sahnesi var).
  const sg2 = makeStoryGame();
  sg2.storyMission = M.getMissionById("paint_right_to_color");
  sg2.state = "AIMING";
  M.Game.prototype.finishStoryMatch.call(sg2, "loss", null);
  check("eksik sahneli görevde yenilgi güvenli", sg2.profile.story.completedMissions.length === 0);

  // Kupa haritası satır sırası klavye gezinmesiyle aynıdır.
  const rows = sg.storyRows();
  const expected = M.STORY_CAMPAIGN.zoneOrder.flatMap((z) => M.missionsForZone(z).map((m) => m.id));
  check("görev satırları bölge sırasıyla dizilir", JSON.stringify(rows.map((r) => r.missionId)) === JSON.stringify(expected));

  // ── Tekrar oynama ve ilerleme imleci (F3-07) ──
  const sg3 = makeStoryGame();
  sg3.storyMission = M.getMissionById(FIRST);
  sg3.state = "AIMING";
  M.Game.prototype.finishStoryMatch.call(sg3, "win", null);
  sg3.profile.story.currentMissionId = "assembly_magnet_objection";
  // Oyuncu birinci görevin rövanşını oynayıp kazanır:
  sg3.storyMission = M.getMissionById(FIRST);
  sg3.finishStoryMatch("win", null);
  check("rövanş kayıt imlecini geriye sarmaz", sg3.profile.story.currentMissionId === "assembly_magnet_objection");
  check("rövanş tamamlanma listesini çoğaltmaz", sg3.profile.story.completedMissions.filter((x) => x === FIRST).length === 1);
  check("rövanş kanıtı çoğaltmaz", M.collectedEvidence(sg3.profile.story).length === 1);
  check("rövanş Bakım Puanını ikiye katlamaz", M.maintenancePoints(sg3.profile.story).total === 10);

  // Rövanş yeni maç anahtarı üretir (ödül tekrar talep edilebilir).
  const sg4 = makeStoryGame();
  sg4.startStoryMission(FIRST);
  const key1 = sg4.matchProgress.key;
  sg4.startStoryMission(FIRST);
  const key2 = sg4.matchProgress.key;
  check("rövanş yeni matchKey üretir", key1 !== key2);

  // Rövanş sonrası ödül kapısı hâlâ çalışır (her maç için ayrı anahtar).
  sg4.matchProgress.humanShotsResolved = 1;
  const replayReward = M.Game.prototype.grantMatchReward.call(sg4, "win");
  check("rövanş maçında ödül yazılır", replayReward !== null && replayReward.ok === true);
  check("ilk tamamlamada ek Hurda bonusu yok", sg4.profile.scrap === 500 + replayReward.scrap);

  // Kupa haritası bölge verisi: kanıt/şampiyon/BP rozetleri veriden türer.
  const doneStory = M.normalizeStoryProgress({
    campaignId: "nine_zones_cup_v1",
    completedMissions: ["scrapyard_open_service_slot"],
  });
  const zoneEv = M.collectedEvidence(doneStory).filter((e) => e.zoneId === "scrapyard");
  check("bölge kanıtı görevden türetilir", zoneEv.length === 1 && zoneEv[0].id === "scrapyard_recovery_capacity");
  check("bölge BP tamamlanmadan 0", (M.maintenancePoints(M.defaultStoryProgress()).zones.scrapyard || 0) === 0);

  // ── Klavye akışı (F5-04) ──
  const sgk = makeStoryGame();
  sgk.state = "STORY_MAP"; sgk.storyFocus = 0;
  sgk.handleStoryMenuKey({ key: "ArrowRight", preventDefault() {} });
  check("ok tuşu harita odağını ilerletir", sgk.storyFocus === 1);
  sgk.handleStoryMenuKey({ key: "a", preventDefault() {} });
  check("A tuşu odağı geri getirir", sgk.storyFocus === 0);
  sgk.handleStoryMenuKey({ key: "Enter", preventDefault() {} });
  check("Enter ilk açık görevin sahnesini açar",
    sgk.state === "STORY_SCENE" && sgk.storySceneId === `scene_${FIRST}_intro`);
  while (sgk.state === "STORY_SCENE") sgk.advanceStoryScene();
  check("sahne klavye onayıyla robot seçimine geçer", sgk.state === "STORY_ROBOT_SELECT");
  sgk.handleStoryMenuKey({ key: "Enter", preventDefault() {} });
  check("Enter robot seçimini onaylar", sgk.state === "STORY_BRIEFING");
  const diffBefore = sgk.profile.story.difficulty;
  sgk.handleStoryMenuKey({ key: "ArrowRight", preventDefault() {} });
  sgk.handleStoryMenuKey({ key: "ArrowLeft", preventDefault() {} });
  check("brifingde zorluk klavyeyle döner", sgk.profile.story.difficulty === diffBefore);
  sgk.handleStoryMenuKey({ key: "Enter", preventDefault() {} });
  check("Enter brifingden maçı başlatır", sgk.started && sgk.state === "AIMING");

  // Sahne atlama: yarım yazı önce tamamlanır, son basış sahneyi bitirir.
  const sgs = makeStoryGame();
  sgs.openStoryMission(FIRST);
  for (let i = 0; i < 64 && sgs.state === "STORY_SCENE"; i++) sgs.advanceStoryScene();
  check("sahne atlama robot seçimine ulaşır", sgs.state === "STORY_ROBOT_SELECT");

  // ── Maç sonu overlay'i ve DOM katman sızıntısı ──
  // Sahne bittiğinde overlay açılırken durum GAMEOVER'a çekilmezse, bir sonraki
  // render() sahneyi boş görüp haritaya atlıyor ve kart haritanın üstünde asılı
  // kalıyordu. Kupa haritasına dönüş de kartı her hâlükârda kapatmalıdır.
  {
    const mk = (id) => ({
      id,
      classList: {
        _s: new Set(id === "overlay" ? ["hidden"] : []),
        add(c) { this._s.add(c); },
        remove(c) { this._s.delete(c); },
        contains(c) { return this._s.has(c); },
        toggle(c, f) { if (f === undefined) f = !this.contains(c); f ? this.add(c) : this.remove(c); },
      },
      textContent: "", dataset: {}, style: {},
    });
    const nodes = {};
    const prevDoc = sandbox.document;
    sandbox.document = { getElementById: (id) => (nodes[id] = nodes[id] || mk(id)) };
    const ov = makeStoryGame();
    ov.storyMission = M.getMissionById(FIRST);
    ov.storyMissionId = FIRST;
    ov.state = "STORY_SCENE";
    M.Game.prototype.showStoryOverlay.call(ov, "win", null);
    check("maç sonu overlay'i durumu GAMEOVER'a çeker", ov.state === "GAMEOVER");
    check("maç sonu overlay'i görünür olur", !nodes["overlay"].classList.contains("hidden"));
    ov.openStoryMap();
    check("kupa haritasına dönüş overlay'i kapatır", nodes["overlay"].classList.contains("hidden"));
    check("kupa haritasına dönüş STORY_MAP kurar", ov.state === "STORY_MAP");
    sandbox.document = prevDoc;
  }

  // ── "Tekrar Oyna" sonuç kartını kapatır (kart asılı kalma hatası) ──
  // Hikâye yenilgisinde "Tekrar Oyna" yalnız startGame()'i çağırıyordu; kart
  // kapanmadığı için maç arkada yeniden başlarken ekranda aynı menü duruyor,
  // oyuncu düğmeye bastıkça aynı kartı görüyordu (F2-11).
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
    const rg = makeStoryGame();
    rg.startGame = M.Game.prototype.startGame; // gerçek maç kurulumu koşsun
    rg.W = 960; rg.H = 540;
    rg.mode = "story";
    rg.selectedChars = [M.CHARACTERS[0], M.CHARACTERS[1]];
    rg.playerControls = ["human", "bot"];
    rg.selectedMap = M.MAPS[0];
    rg.bots = [];
    sandbox.document.getElementById("overlay").classList.remove("hidden"); // maç sonu kartı açık
    rg.replay();
    check("Tekrar Oyna maçı yeniden başlatır", rg.state === "AIMING" && rg.players.length === 2);
    check("Tekrar Oyna sonuç kartını kapatır", nodes["overlay"].classList.contains("hidden"));
    sandbox.document = prevDoc;
  }

  // ── Kupa Festivali (Faz A: epilog sonrası oynanış) ──
  check("festival ilerleme modu sayılır", M.isSinglePlayerProgressionMode("festival") === true);
  const sgf = makeStoryGame();
  sgf.profile.story.endingSeen = true;
  const festRow = sgf.storyRows().at(-1);
  check("epilog sonrası haritaya festival satırı düşer", festRow && festRow.missionId === "__festival__");
  const beforeStory = JSON.stringify(sgf.profile.story);
  sgf.state = "STORY_MAP"; // klavye rota testiyle aynı ön koşul
  sgf.storyFocus = sgf.storyRows().length - 1;
  sgf.confirmStoryFocus();
  check("festival satırı maçı kurar", sgf.mode === "festival" && sgf.started && sgf.state === "AIMING");
  check("festival kadrosu insan + botlardır",
    sgf.playerControls[0] === "human" && sgf.playerControls.slice(1).every((c) => c === "bot") && sgf.bots.length === sgf.selectedChars.length - 1);
  check("festival rakipleri seçilen robotta olamaz",
    sgf.selectedChars.slice(1).every((d) => d.id !== sgf.selectedChars[0].id));
  check("festival ilerlemeye dokunmaz", JSON.stringify(sgf.profile.story) === beforeStory);
  const festKey = sgf.matchProgress.key;
  sgf.matchProgress.humanShotsResolved = 1;
  const festReward = M.Game.prototype.grantMatchReward.call(sgf, "win");
  check("festival maçında ödül yazılır", festReward !== null && festReward.ok === true);
  const festKey2 = sgf.matchProgress.key;
  check("festival ödülü tek kapıdan geçer (matchKey aynı)", festKey === festKey2);
  sgf.quitToMenu();
  check("festivalden çıkış kupa haritasına döner", sgf.state === "STORY_MAP");
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

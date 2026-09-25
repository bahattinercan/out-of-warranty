/* Geliştirme sisteminin saf hesaplama katmanı.
 *
 * Bu dosya DOM'a ve localStorage'a dokunmaz. Seviye eşikleri, ödül formülü,
 * satın alma önkoşulları ve türetilmiş robot istatistikleri burada toplanır;
 * böylece ekonomi kuralları tarayıcı olmadan (tests/progression.js) test
 * edilebilir. Kalıcılık ve doğrulama js/profile.js sorumluluğundadır.
 *
 * Temel kural: CHARACTERS içindeki taban veri hiçbir zaman mutasyona uğratılmaz.
 * Maç başında resolveRobotBuild() ile tek bir türetilmiş build üretilir.
 */

// ── Sabitler ────────────────────────────────────────────────────────────────

const PROFILE_SCHEMA_VERSION = 3; // profile.js ile ortak kayıt şeması sürümü (v2: +story, v3: +ammo deposu)

// Servis seviyeleri: xp alanı KÜMÜLATİF eşiktir (levelForXp ile eşleşir).
const SERVICE_LEVELS = [
  { level: 1,  xp: 0,    unlock: "Taban robot" },
  { level: 2,  xp: 100,  unlock: "Kademe I geliştirmeler" },
  { level: 3,  xp: 250,  unlock: "Profil rozeti" },
  { level: 4,  xp: 450,  unlock: "Ayrıntılı maç sayıları" },
  { level: 5,  xp: 700,  unlock: "Kademe II geliştirmeler" },
  { level: 6,  xp: 1000, unlock: "Aparat vurgu efekti" },
  { level: 7,  xp: 1350, unlock: "Profil rozeti II" },
  { level: 8,  xp: 1750, unlock: "Kademe III geliştirmeler" },
  { level: 9,  xp: 2200, unlock: "Gövde aşınma kozmetiği (gelecek)" },
  { level: 10, xp: 2700, unlock: "Usta Servis unvanı" },
];
const MAX_SERVICE_LEVEL = SERVICE_LEVELS.length;
const MAX_SERVICE_XP = SERVICE_LEVELS[MAX_SERVICE_LEVEL - 1].xp; // 2700

const START_SCRAP = 200;            // yeni profilin başlangıç Hurda bakiyesi
const CLAIMED_MATCH_LIMIT = 20;     // tekrar ödülü engelleyen maç anahtarı sayısı

// Geliştirme dalları ve kademe sözleşmesi. Kademeler sıra ile alınır; Kademe
// II için aynı dalın Kademe I'i zaten alınmış olur.
const BRANCHES = ["chassis", "module", "core"];
const BRANCH_LABELS = { chassis: "Gövde", module: "Aparat", core: "Çekirdek" };
const TIER_COSTS = [60, 120, 220];       // Kademe I / II / III Hurda maliyeti
const TIER_LEVEL_GATES = [2, 5, 8];      // Kademe I / II / III Servis Seviyesi kapısı
const MAX_TIER = 3;

// Maç ödülü tabanları ve çarpanları (yalnız bilgisayara karşı mod).
const REWARD_BASE = {
  win:  { scrap: 60, xp: 70 },
  loss: { scrap: 30, xp: 40 },
  draw: { scrap: 40, xp: 50 },
};
const DIFFICULTY_MULTIPLIER = { easy: 0.75, normal: 1, hard: 1.25, expert: 1.5 };
const OPPONENT_STEP = 0.20;         // her ek rakip için +%20
const REWARD_CAP = { scrap: 150, xp: 180 };

// Gövde dalı
const ARMOR_CAP = 0.40;                     // kaplama mutlak üst sınırı
const CHASSIS_HP_BONUS = { tier1: 0.05, tier3: 0.10 };
const CHASSIS_ARMOR_BONUS = 0.02;
const CHASSIS_KNOCKBACK_REDUCTION = 0.10;   // savrulma hızı %10 azalır

// Aparat dalı
const MODULE_POWER_BONUS = { tier1: 0.06, tier3: 0.15 };
const MODULE_COOLDOWN_REDUCTION = 1;        // yalnız bir tur
const MODULE_MIN_COOLDOWN = 2;              // cooldown alt sınırı
const SHIELD_STAMINA_REFUND = { base: 0, tier1: 5, tier3: 10 };
const GLIDE_GRAVITY_BASE = 0.35;            // süzülme sırasında yerçekimi katsayısı
const GLIDE_GRAVITY_MIN = 0.22;             // güç artsa bile serbest uçuşa dönmez

// Çekirdek dalı
const CORE_STAMINA = { base: 70, tier1: 78, tier3: 85 };
const CORE_WEAPON_BONUS = { tier2: 0.04, tier3: 0.07 };

// ── Küçük yardımcılar ───────────────────────────────────────────────────────

function clampNumber(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// Negatif olmayan güvenli tam sayı. NaN/sonsuz/negatif/çok büyük değerler
// güvenli aralığa çekilir; kayıt bozulsa bile ekonomi matematiği bozulmaz.
function toSafeInt(value, fallback) {
  const fb = fallback === undefined ? 0 : fallback;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fb;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, n));
}

function romanTier(tier) {
  const t = toSafeInt(tier);
  if (t <= 0) return "0";
  if (t === 1) return "I";
  if (t === 2) return "II";
  if (t === 3) return "III";
  return String(t);
}

// ── Servis seviyesi ─────────────────────────────────────────────────────────

// Eşik DEĞERİ xp'den küçük veya eşit olan en yüksek seviye. Tam 100 XP seviye 2
// sayılır (karşılaştırma >=); off-by-one sınır testleri tests/progression.js'te.
function levelForXp(xp) {
  const n = toSafeInt(xp);
  let level = 1;
  for (const s of SERVICE_LEVELS) if (n >= s.xp) level = s.level;
  return level;
}

// Seviyeye giren kümülatif XP eşiği.
function xpForLevel(level) {
  const l = clampNumber(toSafeInt(level, 1), 1, MAX_SERVICE_LEVEL);
  return SERVICE_LEVELS[l - 1].xp;
}

// Bir sonraki seviyenin eşiği; son seviyede null (sabitlenmiş XP).
function nextLevelXp(level) {
  const l = clampNumber(toSafeInt(level, 1), 1, MAX_SERVICE_LEVEL);
  return l >= MAX_SERVICE_LEVEL ? null : SERVICE_LEVELS[l].xp;
}

// (before, after] aralığında açılan içerikleri tek satırda döndürür. Maç sonu
// overlay'inde "Kademe II geliştirmeler açıldı" satırını üretmek için kullanılır.
function levelUpMessage(levelBefore, levelAfter) {
  const before = toSafeInt(levelBefore, 1);
  const after = toSafeInt(levelAfter, 1);
  const opened = [];
  for (const s of SERVICE_LEVELS) {
    if (s.level > before && s.level <= after && s.unlock) opened.push(`${s.unlock} açıldı`);
  }
  return opened.join(" • ");
}

// ── Ödül formülü ────────────────────────────────────────────────────────────

// Yalnız doğal GAMEOVER sonucu çağrılır. Taban ödül × zorluk × rakip çarpanı,
// üst sınırlarla kırpılır. Performans bonusu bilinçli olarak yoktur.
function calculateMatchReward(options) {
  const o = options || {};
  const base = REWARD_BASE[o.result] || REWARD_BASE.draw;
  const diff = DIFFICULTY_MULTIPLIER[o.difficulty] || 1;
  const opponents = Math.max(1, toSafeInt(o.opponentCount, 1));
  const opponentMult = 1 + OPPONENT_STEP * (opponents - 1);
  return {
    scrap: Math.min(REWARD_CAP.scrap, Math.round(base.scrap * diff * opponentMult)),
    xp: Math.min(REWARD_CAP.xp, Math.round(base.xp * diff * opponentMult)),
  };
}

// ── Kademe sorgusu ──────────────────────────────────────────────────────────

function sanitizeUpgrades(progress) {
  const up = progress && progress.upgrades && typeof progress.upgrades === "object"
    ? progress.upgrades : {};
  return {
    chassis: clampNumber(toSafeInt(up.chassis), 0, MAX_TIER),
    module: clampNumber(toSafeInt(up.module), 0, MAX_TIER),
    core: clampNumber(toSafeInt(up.core), 0, MAX_TIER),
  };
}

function totalTiers(progress) {
  const up = sanitizeUpgrades(progress);
  return up.chassis + up.module + up.core;
}

// "Gövde II • Aparat I • Çekirdek 0" biçiminde kısa özet.
function robotUpgradeSummary(progress) {
  const up = sanitizeUpgrades(progress);
  return BRANCHES.map((b) => `${BRANCH_LABELS[b]} ${romanTier(up[b])}`).join(" • ");
}

// Sonraki kademenin önkoşulları. `ok:false` ise reason: MAX_TIER/INVALID_BRANCH.
function nextUpgradeStep(progress, branch) {
  if (!BRANCHES.includes(branch)) return { ok: false, reason: "INVALID_BRANCH" };
  const up = sanitizeUpgrades(progress);
  const currentTier = up[branch];
  if (currentTier >= MAX_TIER) return { ok: false, reason: "MAX_TIER", currentTier };
  const nextTier = currentTier + 1;
  return {
    ok: true,
    currentTier,
    nextTier,
    cost: TIER_COSTS[nextTier - 1],
    requiredLevel: TIER_LEVEL_GATES[nextTier - 1],
  };
}

// ── Türetilmiş build ────────────────────────────────────────────────────────

// Aparat gücü her yetenek türüne körlemesine uygulanmaz; her kind'ın hangi
// alanlarının güçlendiği bu adaptörde açıkça yazılır. Kademe sınırı dışındaki
// alanlar (mermi sayısı, durum süresi, tam kalkan sayısı) değiştirilmez.
function scaleSkillParams(baseSkill, powerMult) {
  const p = Object.assign({}, (baseSkill && baseSkill.params) || {});
  if (!baseSkill || powerMult === 1) return p;
  switch (baseSkill.kind) {
    case "heal":
      if (p.amount != null) p.amount = p.amount * powerMult;
      break;
    case "damageReduce":
      // Hasar faktörünü 1'e olan mesafesi üzerinden iyileştir (küçük = daha iyi).
      if (p.factor != null) p.factor = clampNumber(1 - (1 - p.factor) * powerMult, 0, 1);
      break;
    case "nextShot":
      if (p.dmgMult != null) p.dmgMult = p.dmgMult * powerMult;
      if (p.radiusMult != null) p.radiusMult = p.radiusMult * powerMult;
      if (p.knockbackMult != null) p.knockbackMult = p.knockbackMult * powerMult;
      // pellets/spread kapsam dışı: mermi sayısı bonusla artmaz.
      break;
    case "jump":
      if (p.vy != null) p.vy = -Math.abs(p.vy) * powerMult;
      if (p.vx != null) p.vx = Math.abs(p.vx) * powerMult;
      break;
    case "dash":
      if (p.vx != null) p.vx = Math.abs(p.vx) * powerMult;
      if (p.contactDamage != null) p.contactDamage = p.contactDamage * powerMult;
      if (p.knockback != null) p.knockback = p.knockback * powerMult;
      break;
    case "dig":
      if (p.depth != null) p.depth = p.depth * powerMult;
      break;
    case "glide":
      // Katsayı build üzerindeki glideGravityMult alanında taşınır; params sabit.
      break;
    case "melee":
    case "radial":
    case "quake":
      for (const key of ["damage", "range", "radius", "knockback"]) {
        if (p[key] != null) p[key] = p[key] * powerMult;
      }
      break;
    case "spit":
      // Fırlatılan merminin hızı params'tan; hasar/yarıçap SKILL_PROJECTILES
      // spec'inden gelir, bu yüzden ölçek spawn anına specScale ile taşınır.
      if (p.speed != null) p.speed = p.speed * powerMult;
      p.specScale = powerMult;
      break;
    default:
      break; // shield: iade build.skill.shieldStaminaRefund üzerinde
  }
  return p;
}

/* Taban karakter tanımından maçlık build üretir. Saf fonksiyondur: girişleri
 * mutasyona uğratmaz ve eksik/bozuk ilerleme verisini "sıfır kademe" sayar. */
function resolveRobotBuild(charDef, robotProgress, options) {
  const opts = options || {};
  const enabled = !!opts.upgradesEnabled && !!robotProgress;
  const tiers = enabled ? sanitizeUpgrades(robotProgress) : { chassis: 0, module: 0, core: 0 };

  const baseHp = Number(charDef && charDef.hp);
  const hp = Number.isFinite(baseHp) ? baseHp : 100;
  const baseArmor = Number(charDef && charDef.armor);
  const armor0 = Number.isFinite(baseArmor) ? baseArmor : 0;

  // Gövde: kademe bonusları üst üste çarpılmaz; tek türetilmiş çarpan kullanılır
  // ki yükleme sırası sonucu değiştirmesin.
  const hpMult = tiers.chassis >= 3 ? 1 + CHASSIS_HP_BONUS.tier3
               : tiers.chassis >= 1 ? 1 + CHASSIS_HP_BONUS.tier1 : 1;
  const maxHp = Math.round(hp * hpMult);
  const armor = clampNumber(armor0 + (tiers.chassis >= 2 ? CHASSIS_ARMOR_BONUS : 0), 0, ARMOR_CAP);
  const knockbackTakenMult = tiers.chassis >= 3 ? 1 - CHASSIS_KNOCKBACK_REDUCTION : 1;

  // Çekirdek: enerji ve silah hasarı toplam bonusu.
  const maxStamina = tiers.core >= 3 ? CORE_STAMINA.tier3
                   : tiers.core >= 1 ? CORE_STAMINA.tier1 : CORE_STAMINA.base;
  const weaponBonus = tiers.core >= 3 ? CORE_WEAPON_BONUS.tier3
                    : tiers.core >= 2 ? CORE_WEAPON_BONUS.tier2 : 0;

  // Aparat: güç çarpanı, cooldown ve adaptör çıktıları.
  const powerMult = tiers.module >= 3 ? 1 + MODULE_POWER_BONUS.tier3
                  : tiers.module >= 1 ? 1 + MODULE_POWER_BONUS.tier1 : 1;
  const baseSkill = charDef && charDef.skill ? charDef.skill : null;
  const baseCooldown = baseSkill ? Number(baseSkill.cooldown) : 0;
  const cd = Number.isFinite(baseCooldown) ? baseCooldown : 0;
  const cooldown = Math.min(cd, Math.max(MODULE_MIN_COOLDOWN, cd - (tiers.module >= 2 ? MODULE_COOLDOWN_REDUCTION : 0)));
  const shieldStaminaRefund = baseSkill && baseSkill.kind === "shield"
    ? (tiers.module >= 3 ? SHIELD_STAMINA_REFUND.tier3
      : tiers.module >= 1 ? SHIELD_STAMINA_REFUND.tier1 : SHIELD_STAMINA_REFUND.base)
    : 0;
  // Güç arttıkça süzülme yerçekimi katsayısı düşer (daha uzun süzülme); alt
  // sınır serbest uçuşu engeller.
  const glideGravityMult = clampNumber(GLIDE_GRAVITY_BASE / powerMult, GLIDE_GRAVITY_MIN, GLIDE_GRAVITY_BASE);

  const skill = baseSkill ? {
    id: baseSkill.id,
    kind: baseSkill.kind,
    label: baseSkill.label,
    desc: baseSkill.desc,
    // Görsel kimlik (fx) türetilmiş tanımda da taşınır; aksi halde geliştirme
    // yapılmış robotlarda cast efekti tür varsayılanına düşerdi.
    fx: baseSkill.fx,
    cooldown,
    params: scaleSkillParams(baseSkill, powerMult),
    shieldStaminaRefund,
    glideGravityMult,
    powerMult,
  } : null;

  return {
    maxHp,
    armor,
    weaponDamageMult: 1 + weaponBonus,
    maxStamina,
    knockbackTakenMult,
    skill,
    tiers: Object.assign({}, tiers),
  };
}

/* Atölye panelinde "mevcut → yeni" satırını üretir. Sayısal alanlar gerçek
 * build farkından okunur; kaynak tanımlar yalnız okunur. */
function upgradeEffectText(charDef, progress, branch) {
  const step = nextUpgradeStep(progress, branch);
  if (!step.ok) return step.reason === "MAX_TIER" ? "Tam Kalibrasyon" : "";
  const before = resolveRobotBuild(charDef, progress, { upgradesEnabled: true });
  const up = sanitizeUpgrades(progress);
  const afterProgress = { upgrades: Object.assign({}, up, { [branch]: step.nextTier }) };
  const after = resolveRobotBuild(charDef, afterProgress, { upgradesEnabled: true });
  const pct = (v) => Math.round(v * 100);
  switch (branch) {
    case "chassis":
      if (step.nextTier === 1) return `Bütünlük ${before.maxHp} → ${after.maxHp}`;
      if (step.nextTier === 2) return `Kaplama %${pct(before.armor)} → %${pct(after.armor)}`;
      return `Bütünlük ${before.maxHp} → ${after.maxHp} • Savrulma −%10`;
    case "module":
      if (step.nextTier === 1) return "Modül gücü +%6";
      if (step.nextTier === 2) return `Modül cooldown ${before.skill.cooldown} → ${after.skill.cooldown} tur`;
      return "Modül gücü toplam +%15 • Aparat vurgu ışığı";
    case "core":
      if (step.nextTier === 1) return `Enerji ${before.maxStamina} → ${after.maxStamina}`;
      if (step.nextTier === 2) return "Silah hasarı +%4";
      return `Enerji ${before.maxStamina} → ${after.maxStamina} • Silah hasarı toplam +%7`;
    default:
      return "";
  }
}

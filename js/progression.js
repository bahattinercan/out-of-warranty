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

const PROFILE_SCHEMA_VERSION = 8; // profile.js ile ortak kayıt şeması sürümü (+v8 arena bölüm ilerlemesi)
const MAX_ARENA_STAGE = Math.max(1, (typeof CHARACTERS === "undefined" ? 34 : CHARACTERS.length) - 1);

const DEFAULT_UNLOCKED_ROBOTS = ["kopek", "tavsan"]; // Başlangıçta ücretsiz açık 2 robot (FIX-8 ve ZIP)

// ── Hesap Seviyeleri (Account Level: 1-20) ──────────────────────────────────
const ACCOUNT_LEVELS = [
  { level: 1,  xp: 0,     bonusScrap: 0,   title: "Çırak Hurdacısı" },
  { level: 2,  xp: 120,   bonusScrap: 150, title: "Çırak Hurdacısı II" },
  { level: 3,  xp: 280,   bonusScrap: 150, title: "Dökümhane Çırağı" },
  { level: 4,  xp: 500,   bonusScrap: 200, title: "Kıdemli Çırak" },
  { level: 5,  xp: 800,   bonusScrap: 200, title: "Atölye Teknisyeni" },
  { level: 6,  xp: 1200,  bonusScrap: 250, title: "Atölye Teknisyeni II" },
  { level: 7,  xp: 1700,  bonusScrap: 250, title: "Kıdemli Teknisyen" },
  { level: 8,  xp: 2300,  bonusScrap: 300, title: "Sanayi Operatörü" },
  { level: 9,  xp: 3000,  bonusScrap: 300, title: "Ağır Sanayi Ustası" },
  { level: 10, xp: 3800,  bonusScrap: 400, title: "Dökümhane Şefi" },
  { level: 11, xp: 4700,  bonusScrap: 400, title: "Dökümhane Şefi II" },
  { level: 12, xp: 5700,  bonusScrap: 450, title: "Baş Mühendis" },
  { level: 13, xp: 6800,  bonusScrap: 450, title: "Protokol Uzmanı" },
  { level: 14, xp: 8000,  bonusScrap: 500, title: "Hurda Barikatçısı" },
  { level: 15, xp: 9300,  bonusScrap: 500, title: "Yıkım Mimarı" },
  { level: 16, xp: 10700, bonusScrap: 550, title: "Efsanevi Operatör" },
  { level: 17, xp: 12200, bonusScrap: 550, title: "Döküm Muhafızı" },
  { level: 18, xp: 13800, bonusScrap: 600, title: "Kıdemli Muhafız" },
  { level: 19, xp: 15500, bonusScrap: 600, title: "Alaşım Efendisi" },
  { level: 20, xp: 17500, bonusScrap: 750, title: "Dökümhane Efsanesi" },
];
const MAX_ACCOUNT_LEVEL = ACCOUNT_LEVELS.length;
const MAX_ACCOUNT_XP = ACCOUNT_LEVELS[MAX_ACCOUNT_LEVEL - 1].xp;

// ── Robot Satın Alma & Seviye Kapıları Kataloğu ─────────────────────────────
const ROBOT_PRICES = {
  // Başlangıç (Ücretsiz)
  kopek: { price: 0, level: 1, tier: 0 },
  tavsan: { price: 0, level: 1, tier: 0 },
  // Kademe 1: Çırak (450 Hurda)
  kedi: { price: 450, level: 1, tier: 1 },
  tilki: { price: 450, level: 2, tier: 1 },
  ordek: { price: 450, level: 2, tier: 1 },
  sincap: { price: 450, level: 3, tier: 1 },
  kirpi: { price: 450, level: 3, tier: 1 },
  // Kademe 2: Kıdemli (1.500 Hurda)
  panda: { price: 1500, level: 4, tier: 2 },
  kaplan: { price: 1500, level: 4, tier: 2 },
  timsah: { price: 1500, level: 5, tier: 2 },
  koala: { price: 1500, level: 5, tier: 2 },
  kunduz: { price: 1500, level: 6, tier: 2 },
  kokarca: { price: 1500, level: 6, tier: 2 },
  maymun: { price: 1500, level: 7, tier: 2 },
  armadillo: { price: 1500, level: 7, tier: 2 },
  oklukirpi: { price: 1500, level: 7, tier: 2 },
  // Kademe 3: Ağır Sanayi (3.200 Hurda)
  ayi: { price: 3200, level: 8, tier: 3 },
  suaygiri: { price: 3200, level: 8, tier: 3 },
  sirtlan: { price: 3200, level: 9, tier: 3 },
  ornitorenk: { price: 3200, level: 9, tier: 3 },
  yeti: { price: 3200, level: 10, tier: 3 },
  gergedan: { price: 3200, level: 10, tier: 3 },
  kanguru: { price: 3200, level: 11, tier: 3 },
  hamster: { price: 3200, level: 11, tier: 3 },
  penguen: { price: 3200, level: 12, tier: 3 },
  // Kademe 4: Dökümhane Efsaneleri (5.500 Hurda)
  aslan: { price: 5500, level: 13, tier: 4 },
  kurtadam: { price: 5500, level: 14, tier: 4 },
  rakun: { price: 5500, level: 14, tier: 4 },
  dino: { price: 5500, level: 15, tier: 4 },
  yarasa: { price: 5500, level: 16, tier: 4 },
  bukalemun: { price: 5500, level: 17, tier: 4 },
  ejderha: { price: 5500, level: 18, tier: 4 },
  kus: { price: 5500, level: 19, tier: 4 },
  zurafa: { price: 5500, level: 20, tier: 4 },
};

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
const COMBAT_REWARD_CAP = { scrap: 450, xp: 500 };

// Gövde dalı
const ARMOR_CAP = 0.40;                     // zırh mutlak üst sınırı
const CHASSIS_HP_BONUS = { tier1: 0.05, tier3: 0.10 };
const CHASSIS_ARMOR_BONUS = 0.02;
const CHASSIS_KNOCKBACK_REDUCTION = 0.10;   // savrulma hızı %10 azalır

// Aparat dalı
const MODULE_POWER_BONUS = { tier1: 0.06, tier3: 0.15 };
const MODULE_COOLDOWN_REDUCTION = 1;        // yalnız bir tur
const MODULE_MIN_COOLDOWN = 2;              // cooldown alt sınırı
const SHIELD_STAMINA_REFUND = { base: 0, tier1: 5, tier3: 10 };

// Parçalar (v5): savrulma indirimlerinin toplandığı çarpımsal alt sınır —
// atölye kademesi + parçalar birlikte savrulmayı asla yarısının altına indiremez.
const PART_KNOCKBACK_MIN = 0.5;
// Hareket hızı ekseni: parçalar adım uzunluğunu yüzdelik artırır; üst sınır
// aşırı yığılmayı (ve bot dengelemesini) korumak için kırpılır.
const PART_MOVE_SPEED_MAX = 0.20;
// Can çarpanı ve sıçrama gücü eksenleri: parçalar üst sınırla kırpılır.
const PART_HP_PCT_MAX = 0.15;
const PART_JUMP_MAX = 0.20;
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

// ── Hesap seviyesi (Oyuncu Seviyesi: 1-20) ─────────────────────────────────

function levelForAccountXp(xp) {
  const n = toSafeInt(xp);
  let level = 1;
  for (const s of ACCOUNT_LEVELS) if (n >= s.xp) level = s.level;
  return level;
}

function xpForAccountLevel(level) {
  const l = clampNumber(toSafeInt(level, 1), 1, MAX_ACCOUNT_LEVEL);
  return ACCOUNT_LEVELS[l - 1].xp;
}

function nextAccountLevelXp(level) {
  const l = clampNumber(toSafeInt(level, 1), 1, MAX_ACCOUNT_LEVEL);
  return l >= MAX_ACCOUNT_LEVEL ? null : ACCOUNT_LEVELS[l].xp;
}

function accountLevelUpBonus(levelBefore, levelAfter) {
  const b = toSafeInt(levelBefore, 1);
  const a = toSafeInt(levelAfter, 1);
  let totalBonus = 0;
  for (const s of ACCOUNT_LEVELS) {
    if (s.level > b && s.level <= a && s.bonusScrap) {
      totalBonus += s.bonusScrap;
    }
  }
  return totalBonus;
}

function accountLevelTitle(level) {
  const l = clampNumber(toSafeInt(level, 1), 1, MAX_ACCOUNT_LEVEL);
  return ACCOUNT_LEVELS[l - 1].title;
}

// ── Robot kilit ve satın alma sorgusu ───────────────────────────────────────

function robotPriceSpec(robotId) {
  if (robotId && ROBOT_PRICES[robotId]) return ROBOT_PRICES[robotId];
  return { price: 1500, level: 5, tier: 2 };
}

function isRobotUnlocked(profile, robotId) {
  if (!robotId) return false;
  if (DEFAULT_UNLOCKED_ROBOTS.includes(robotId)) return true;
  if (!profile) return false;
  const list = Array.isArray(profile.unlockedRobots) ? profile.unlockedRobots : [];
  return list.includes(robotId);
}

function canUnlockRobot(profile, robotId) {
  if (!robotId) return { ok: false, reason: "INVALID_ROBOT" };
  if (isRobotUnlocked(profile, robotId)) return { ok: false, reason: "ALREADY_UNLOCKED" };
  const spec = robotPriceSpec(robotId);
  const p = profile || {};
  const currentScrap = toSafeInt(p.scrap);
  const curAccLvl = levelForAccountXp(p.accountXp);
  if (curAccLvl < spec.level) {
    return { ok: false, reason: "LEVEL_REQUIRED", requiredLevel: spec.level, level: curAccLvl, cost: spec.price };
  }
  if (currentScrap < spec.price) {
    return { ok: false, reason: "SCRAP_REQUIRED", cost: spec.price, scrap: currentScrap, requiredLevel: spec.level };
  }
  return { ok: true, cost: spec.price, requiredLevel: spec.level, tier: spec.tier };
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
    if (s.level > before && s.level <= after && s.unlock) {
      opened.push(t("progression.unlockOpened", "{unlock} açıldı", { unlock: s.unlock }));
    }
  }
  return opened.join(" • ");
}

// ── Ödül formülü ────────────────────────────────────────────────────────────

// Maç sonu ödülü: Taban ödül × zorluk × rakip çarpanı + Maç içi performans primleri
// (kills, damageDealt, directHits, firstBlood, clutch).
function calculateMatchReward(options) {
  const o = options || {};
  const base = REWARD_BASE[o.result] || REWARD_BASE.draw;
  const diff = DIFFICULTY_MULTIPLIER[o.difficulty] || 1;
  const opponents = Math.max(1, toSafeInt(o.opponentCount, 1));
  const opponentMult = 1 + OPPONENT_STEP * (opponents - 1);

  const baseScrap = Math.round(base.scrap * diff * opponentMult);
  const baseXp = Math.round(base.xp * diff * opponentMult);

  // Maç içi performans primleri (combat stats)
  const c = o.combat || null;
  if (!c) {
    return {
      scrap: Math.min(REWARD_CAP.scrap, baseScrap),
      xp: Math.min(REWARD_CAP.xp, baseXp),
      baseScrap,
      baseXp,
      combatScrap: 0,
      combatXp: 0,
      details: { kills: 0, damageDealt: 0, directHits: 0, firstBlood: false, clutch: false },
    };
  }

  const kills = toSafeInt(c.kills);
  const damageDealt = toSafeInt(c.damageDealt);
  const directHits = toSafeInt(c.directHits);
  const firstBlood = !!c.firstBlood;
  const clutch = !!c.clutch;

  const combatScrap = (kills * 25) +
                      (Math.floor(damageDealt / 100) * 15) +
                      (directHits * 5) +
                      (firstBlood ? 20 : 0) +
                      (clutch ? 35 : 0);

  const combatXp = (kills * 30) +
                   (Math.floor(damageDealt / 100) * 20) +
                   (directHits * 5) +
                   (firstBlood ? 25 : 0) +
                   (clutch ? 40 : 0);

  const totalScrap = Math.min(COMBAT_REWARD_CAP.scrap, baseScrap + combatScrap);
  const totalXp = Math.min(COMBAT_REWARD_CAP.xp, baseXp + combatXp);

  return {
    scrap: totalScrap,
    xp: totalXp,
    baseScrap,
    baseXp,
    combatScrap,
    combatXp,
    details: { kills, damageDealt, directHits, firstBlood, clutch },
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
  // Dal adı Atölye ile aynı anahtardan gelir (workshop.branch.*).
  return BRANCHES.map((b) => `${t("workshop.branch." + b, BRANCH_LABELS[b])} ${romanTier(up[b])}`).join(" • ");
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
 * mutasyona uğratmaz ve eksik/bozuk ilerleme verisini "sıfır kademe" sayar.
 *
 * Parçalar (v5): robotProgress.loadout'taki yuva→parça eşleşmesinden gelir.
 * Etkiler yalnız enabled (upgradesEnabled) geçidinde işler — parçalar
 * geliştirmelerle aynı maç kapsamına bağlıdır (tek geçit). Katalogda olmayan
 * bir parça id'si sessizce yok sayılır (kaldırılmış parçaya dayanıklılık).
 * Sahiplik denetimi profil köküyle normalizeProfile'da yapılır; burada etki
 * id → spec bakışıyla uygulanır, böylece fonksiyon profilsiz de test
 * edilebilir kalır. */

// Parça etkilerinin toplanabilir alanları: düz toplamlar (adet/tur) ve
// yüzdelik kesirler. Tek yerde tablolanır; katalogda yeni etki alanı
// eklenirse buraya da yazılır (plan §6).
const PART_EFFECT_KEYS = ["maxHpFlat", "maxHpPct", "armorFlat", "staminaFlat", "weaponDamagePct", "powerPct", "knockbackRedPct", "cooldownFlat", "moveSpeedMult", "jumpPowerMult"];

function _partEffectTotals(loadout) {
  const totals = { maxHpFlat: 0, maxHpPct: 0, armorFlat: 0, staminaFlat: 0, weaponDamagePct: 0, powerPct: 0, knockbackRedPct: 0, cooldownFlat: 0, moveSpeedMult: 0, jumpPowerMult: 0 };
  if (!loadout) return totals;
  // Yuva başına PARTS_PER_SLOT parça toplanır (v6); bilinmeyen id yok sayılır.
  for (const slot of PART_SLOTS) {
    const slotList = Array.isArray(loadout[slot]) ? loadout[slot] : [loadout[slot]];
    for (const id of slotList) {
      const part = partById(id);
      const fx = part && part.effects ? part.effects : null;
      if (!fx) continue;
      for (const key of PART_EFFECT_KEYS) {
        const v = Number(fx[key]);
        if (Number.isFinite(v)) totals[key] += v;
      }
    }
  }
  return totals;
}

function resolveRobotBuild(charDef, robotProgress, options) {
  const opts = options || {};
  const enabled = !!opts.upgradesEnabled && !!robotProgress;
  const tiers = enabled ? sanitizeUpgrades(robotProgress) : { chassis: 0, module: 0, core: 0 };
  // Parçalar tek geçişte çözülür: hem etki toplamı hem de build'e taşınan
  // loadout (Entity maç içi aksesuar çizimi için `build.parts` okur).
  const loadout = enabled ? sanitizeLoadoutShape(robotProgress.loadout) : null;
  const partTotals = _partEffectTotals(loadout);

  const baseHp = Number(charDef && charDef.hp);
  const hp = Number.isFinite(baseHp) ? baseHp : 100;
  const baseArmor = Number(charDef && charDef.armor);
  const armor0 = Number.isFinite(baseArmor) ? baseArmor : 0;

  // Gövde: kademe bonusları üst üste çarpılmaz; tek türetilmiş çarpan kullanılır
  // ki yükleme sırası sonucu değiştirmesin. Parçalar bu çarpanların üzerine
  // DÜZ TOPLANIR (can) veya eklenecek yüzdelikle birleşir (aşağıda).
  const hpMult = tiers.chassis >= 3 ? 1 + CHASSIS_HP_BONUS.tier3
               : tiers.chassis >= 1 ? 1 + CHASSIS_HP_BONUS.tier1 : 1;
  const maxHp = Math.round(hp * hpMult * (1 + clampNumber(partTotals.maxHpPct, 0, PART_HP_PCT_MAX))) + partTotals.maxHpFlat;
  const armor = clampNumber(armor0 + (tiers.chassis >= 2 ? CHASSIS_ARMOR_BONUS : 0) + partTotals.armorFlat, 0, ARMOR_CAP);
  // Savrulma: kademe ve parçalar çarpımsal (kademe −%10 × parçalar) — üstteki
  // tek-çarpan kuralı; PART_KNOCKBACK_MIN alt sınırı aşırı yığılmayı kırpar.
  const knockbackTakenMult = Math.max(PART_KNOCKBACK_MIN,
    (tiers.chassis >= 3 ? 1 - CHASSIS_KNOCKBACK_REDUCTION : 1) * (1 - partTotals.knockbackRedPct));

  // Çekirdek: enerji ve silah hasarı toplam bonusu.
  const maxStamina = (tiers.core >= 3 ? CORE_STAMINA.tier3
                   : tiers.core >= 1 ? CORE_STAMINA.tier1 : CORE_STAMINA.base)
                   + partTotals.staminaFlat;
  const weaponBonus = tiers.core >= 3 ? CORE_WEAPON_BONUS.tier3
                    : tiers.core >= 2 ? CORE_WEAPON_BONUS.tier2 : 0;

  // Aparat: güç çarpanı, cooldown ve adaptör çıktıları. Parça gücü
  // ÇARPIMSAL ekler: kademe +%6 ve parça +%8 → 1.06 × 1.08 (yükleme sırası
  // sonucu değiştirmesin diye iki çarpan da türetmeden önce çözülür).
  const powerMult = (tiers.module >= 3 ? 1 + MODULE_POWER_BONUS.tier3
                  : tiers.module >= 1 ? 1 + MODULE_POWER_BONUS.tier1 : 1) * (1 + partTotals.powerPct);
  const baseSkill = charDef && charDef.skill ? charDef.skill : null;
  const baseCooldown = baseSkill ? Number(baseSkill.cooldown) : 0;
  const cd = Number.isFinite(baseCooldown) ? baseCooldown : 0;
  const cooldown = Math.min(cd, Math.max(MODULE_MIN_COOLDOWN, cd - (tiers.module >= 2 ? MODULE_COOLDOWN_REDUCTION : 0) - partTotals.cooldownFlat));
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
    weaponDamageMult: 1 + weaponBonus + partTotals.weaponDamagePct,
    maxStamina,
    knockbackTakenMult,
    skill,
    tiers: Object.assign({}, tiers),
    // Takılı parçaların SANITIZE edilmiş yuva→id eşlemesi. Etki hesabından
    // ayrı taşınır: Entity maç içi aksesuar çiziminde build.parts okur.
    parts: loadout,
    // Yürüme hızı çarpanı (Entity.walk adımını ölçekler).
    moveSpeedMult: 1 + clampNumber(partTotals.moveSpeedMult, 0, PART_MOVE_SPEED_MAX),
    // Sıçrama gücü çarpanı (Entity.jump impulsunu ölçekler).
    jumpPowerMult: 1 + clampNumber(partTotals.jumpPowerMult, 0, PART_JUMP_MAX),
  };
}

/* Atölye panelinde "mevcut → yeni" satırını üretir. Sayısal alanlar gerçek
 * build farkından okunur; kaynak tanımlar yalnız okunur. */
function upgradeEffectText(charDef, progress, branch) {
  const step = nextUpgradeStep(progress, branch);
  if (!step.ok) return step.reason === "MAX_TIER" ? t("progression.maxTier", "Tam Kalibrasyon") : "";
  const before = resolveRobotBuild(charDef, progress, { upgradesEnabled: true });
  const up = sanitizeUpgrades(progress);
  // `progress` kopyalanır: loadout (takılı parçalar) korunmalı, yoksa "sonra"
  // build'i parçaları kaybeder ve yükseltme zırhı DÜŞÜRÜYOR gibi görünür
  // (ör. "Zırh %21 → %17"; gerçek bir kullanıcı hatası olarak bulundu).
  const afterProgress = Object.assign({}, progress, { upgrades: Object.assign({}, up, { [branch]: step.nextTier }) });
  const after = resolveRobotBuild(charDef, afterProgress, { upgradesEnabled: true });
  const pct = (v) => Math.round(v * 100);
  switch (branch) {
    case "chassis":
      if (step.nextTier === 1) return t("progression.hp", "Can {from} → {to}", { from: before.maxHp, to: after.maxHp });
      if (step.nextTier === 2) return t("progression.armor", "Zırh %{from} → %{to}", { from: pct(before.armor), to: pct(after.armor) });
      return t("progression.hpKnockback", "Can {from} → {to} • Savrulma −%10", { from: before.maxHp, to: after.maxHp });
    case "module":
      if (step.nextTier === 1) return t("progression.modulePower", "Modül gücü +%{pct}", { pct: 6 });
      if (step.nextTier === 2) return t("progression.cooldown", "Modül cooldown {from} → {to} tur", { from: before.skill.cooldown, to: after.skill.cooldown });
      return t("progression.modulePowerTotal", "Modül gücü toplam +%{pct} • Aparat vurgu ışığı", { pct: 15 });
    case "core":
      if (step.nextTier === 1) return t("progression.energy", "Enerji {from} → {to}", { from: before.maxStamina, to: after.maxStamina });
      if (step.nextTier === 2) return t("progression.weaponDamage", "Silah hasarı +%{pct}", { pct: 4 });
      return t("progression.energyWeaponDamage", "Enerji {from} → {to} • Silah hasarı toplam +%{pct}", { from: before.maxStamina, to: after.maxStamina, pct: 7 });
    default:
      return "";
  }
}

/* Atölye parça listesinde "mevcut → takılırsa" satırını üretir
 * (upgradeEffectText deseni). Fark, gerçek build üzerinden okunur; kaynak
 * tanımlar yalnız okunur. candidatePartId null → metin yok (sökme satırı etki
 * göstermez). `index` hedef ALT yuvadır (0|1); önizleme o alt yuvaya parçayı
 * koyar (aynı parça diğer alt yuvada varsa oradan çekilir). Çok eksenli
 * parçalarda segmentler " • " ile birleştirilir. */
function partEffectText(charDef, progress, candidatePartId, index) {
  const part = partById(candidatePartId);
  const fx = part && part.effects ? part.effects : null;
  if (!fx) return "";

  const currentLoadout = sanitizeLoadoutShape(progress && progress.loadout);
  const idx = index == null ? 0 : clampNumber(toSafeInt(index), 0, PARTS_PER_SLOT - 1);
  const afterLoadout = {};
  for (const slot of PART_SLOTS) afterLoadout[slot] = currentLoadout[slot].slice();
  for (let i = 0; i < PARTS_PER_SLOT; i++) {
    if (i !== idx && afterLoadout[part.slot][i] === part.id) afterLoadout[part.slot][i] = null;
  }
  afterLoadout[part.slot][idx] = part.id;

  const upgrades = sanitizeUpgrades(progress);
  const before = resolveRobotBuild(charDef, { upgrades, loadout: currentLoadout }, { upgradesEnabled: true });
  const after = resolveRobotBuild(charDef, { upgrades, loadout: afterLoadout }, { upgradesEnabled: true });
  const pct = (v) => Math.round(v * 100);
  const seg = [];
  if (fx.maxHpPct != null || fx.maxHpFlat != null) seg.push(t("progression.hp", "Can {from} → {to}", { from: before.maxHp, to: after.maxHp }));
  if (fx.armorFlat != null) seg.push(t("progression.armor", "Zırh %{from} → %{to}", { from: pct(before.armor), to: pct(after.armor) }));
  if (fx.staminaFlat != null) seg.push(t("progression.energy", "Enerji {from} → {to}", { from: before.maxStamina, to: after.maxStamina }));
  if (fx.weaponDamagePct != null) seg.push(t("progression.weaponDamageRange", "Silah hasarı +%{from} → +%{to}", { from: pct(before.weaponDamageMult - 1), to: pct(after.weaponDamageMult - 1) }));
  if (fx.powerPct != null) seg.push(t("progression.modulePowerRange", "Modül gücü +%{from} → +%{to}", {
    from: pct(before.skill ? before.skill.powerMult - 1 : 0), to: pct(after.skill ? after.skill.powerMult - 1 : 0),
  }));
  if (fx.knockbackRedPct != null) seg.push(t("progression.knockback", "Savrulma %{from} → %{to}", { from: pct(before.knockbackTakenMult), to: pct(after.knockbackTakenMult) }));
  if (fx.cooldownFlat != null) seg.push(t("progression.cooldown", "Modül cooldown {from} → {to} tur", { from: before.skill.cooldown, to: after.skill.cooldown }));
  if (fx.jumpPowerMult != null) seg.push(t("progression.jump", "Sıçrama +%{from} → +%{to}", { from: pct(before.jumpPowerMult - 1), to: pct(after.jumpPowerMult - 1) }));
  if (fx.moveSpeedMult != null) seg.push(t("progression.moveSpeed", "Hareket hızı +%{from} → +%{to}", { from: pct(before.moveSpeedMult - 1), to: pct(after.moveSpeedMult - 1) }));
  return seg.join(" • ");
}

// Çeviri katmanı: katalog yüklendiği anda seçili dili uygula (bkz. i18n.js).
if (typeof applyDataTranslations === "function") applyDataTranslations();

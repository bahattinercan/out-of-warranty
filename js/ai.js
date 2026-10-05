/* Bilgisayar oyuncusunun yan etkisiz balistik araması ve süreli tur akışı.
 * Klasik script olarak yüklenir; gerçek dünyayı değiştirmeden Bazuka adaylarını
 * küçük dilimler hâlinde simüle eder.
 *
 * Arama iki aşamalıdır: (1) zorluğa göre seyrekleşen kaba ızgara taraması,
 * (2) en iyi adayın çevresini daralan adımlarla tarayan desen araması
 * (refineStart → refineMin). İkinci aşama sayesinde isabet, ızgara
 * çözünürlüğüne bağlı kalmaz; zorluk merdiveni bu hassasiyetten gelir.
 * Zorluk seviyeleri: Kolay / Orta / Zor / Ustalık.
 */

// Zorluk bazlı parametreler — her seviye bot davranışını belirler.
const AI_DIFFICULTY = {
  easy: {
    searchSeconds: 3,
    actionSeconds: 6,
    baseError: 0.03,
    refineFactors: [1, 0.6],
    settleTime: 0.5,
    damageMult: 0.8,
    passScore: 3,
    selfDamageWeight: 3.0,
    shieldValue: 10,
    opensPathValue: 4,
    coarseElevations: 13,
    coarsePowerSteps: 9,
    refineStart: 0.12,
    refineMin: 0.05,
    predictTarget: false,
    multipleTargets: false,
    lethalSelf: 1.0,
    useSkills: false,
  },
  normal: {
    searchSeconds: 3,
    actionSeconds: 8,
    baseError: 0.025,
    refineFactors: [1, 0.6, 0.3],
    settleTime: 0.25,
    damageMult: 1,
    passScore: 3,
    selfDamageWeight: 2.4,
    shieldValue: 14,
    opensPathValue: 6,
    coarseElevations: 15,
    coarsePowerSteps: 10,
    refineStart: 0.12,
    refineMin: 0.04,
    predictTarget: false,
    multipleTargets: false,
    lethalSelf: 1.0,
    useSkills: false,
  },
  hard: {
    searchSeconds: 5,
    actionSeconds: 12,
    baseError: 0.015,
    refineFactors: [1, 0.7, 0.4, 0.2],
    settleTime: 0.15,
    damageMult: 1.1,
    passScore: 5,
    selfDamageWeight: 1.8,
    shieldValue: 18,
    opensPathValue: 10,
    coarseElevations: 20,
    coarsePowerSteps: 11,
    refineStart: 0.14,
    refineMin: 0.025,
    predictTarget: true,
    multipleTargets: true,
    lethalSelf: 0.8,
    useSkills: true,
  },
  expert: {
    searchSeconds: 8,
    actionSeconds: 15,
    baseError: 0.008,
    refineFactors: [1, 0.8, 0.6, 0.4, 0.2],
    settleTime: 0.1,
    damageMult: 1.2,
    passScore: 10,
    selfDamageWeight: 1.2,
    shieldValue: 22,
    opensPathValue: 14,
    coarseElevations: 25,
    coarsePowerSteps: 12,
    refineStart: 0.16,
    refineMin: 0.01,
    predictTarget: true,
    multipleTargets: true,
    lethalSelf: 0.7,
    useSkills: true,
  },
};

// Geriye uyumluluk: eski kod AI_LIMITS okur.
const AI_LIMITS = {
  maxSteps: 240,
  stepsPerFrame: 2000,
  msPerFrame: 2,
  moveSeconds: 1,
};

// Hasar veren bir modülün bot tarafından atışın YERİNE kullanılması için
// gereken en düşük aiSelectSkill skoru. Düşük skor, modülün anlamsız olduğunu
// gösterir (hedef menzil dışında); o zaman bot normal atışını yapar ve modülü
// harcamaz. Hasar veren modüller turun atış hakkını doldurduğu için ikisi
// aynı turda kullanılamaz.
const AI_SKILL_REPLACE_SCORE = 8;

// Zorluk seviyesinin bot hasar ölçeği. İnsan robotları etkilenmez; değer
// oyun başında `Entity.aiDamageMult` alanına yazılır (bkz. game.js startGame).
function aiDamageMultiplier(difficulty) {
  const p = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.normal;
  return p.damageMult != null ? p.damageMult : 1;
}

// Maç başında oyunculara zorluk hasar ölçeğini yazar. Bot robotları seviyeye
// göre ölçeklenir, insan robotları her zaman 1 kalır (yerel maç etkilenmez).
function aiAssignDamageScale(players, difficulty) {
  const botMult = aiDamageMultiplier(difficulty);
  for (const p of players) {
    if (p) p.aiDamageMult = p.control === "bot" ? botMult : 1;
  }
}

// Mevcut botun zorluğunu döndür (geriye uyumluluk).
function aiGetDifficulty(game) {
  return game && game.bot && game.bot.difficulty ? game.bot.difficulty : "normal";
}

// Zorluk parametrelerini al.
function aiParams(game) {
  const diff = aiGetDifficulty(game);
  return AI_DIFFICULTY[diff] || AI_DIFFICULTY.normal;
}

function aiNow() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

function aiClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Testlerde aynı tohumun aynı kararı vermesi için küçük ve bağımsız PRNG.
function aiRandom(seed) {
  let s = (seed >>> 0) || 0x6d2b79f5;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function aiWorldKey(game) {
  const pos = game.players.map((p) =>
    `${p.alive ? 1 : 0}:${p.x.toFixed(1)}:${p.y.toFixed(1)}:${p.hp}:${p.blockShield ? 1 : 0}`
  ).join("|");
  return `${game.matchId || 0}/${game.turnId || 0}/${game.turn}/${game.wind.toFixed(3)}/${game.terrain.version || 0}/${pos}`;
}

function aiExpectedDamage(player, raw) {
  if (raw <= 0 || !player.alive) return { damage: 0, shield: false };
  if (player.blockShield) return { damage: 0, shield: true };
  let amount = raw * (1 - player.armor);
  if (player.damageReduce) amount *= player.damageReduce.factor;
  return { damage: Math.max(0, Math.round(amount)), shield: false };
}

function aiSupportAfterBlast(terrain, player, hit, radius) {
  let support = 0;
  for (let dx = -player.r; dx <= player.r; dx += 4) {
    const x = player.x + dx;
    const y = player.y + 2;
    if (!terrain.isSolid(x, y)) continue;
    if (Math.hypot(x - hit.x, y - hit.y) > radius) support++;
  }
  return support;
}

// Skorlama ağırlıkları zorluğa göre değişir.
function aiScoreParams(game) {
  const p = aiParams(game);
  return {
    selfDamageWeight: p.selfDamageWeight,
    shieldValue: p.shieldValue,
    opensPathValue: p.opensPathValue,
    lethalSelf: p.lethalSelf,
  };
}

function aiEvaluateExplosion(game, shooterIdx, hit, spec, steps) {
  const shooter = game.players[shooterIdx];
  const { selfDamageWeight, shieldValue, opensPathValue, lethalSelf } = aiScoreParams(game);
  let enemyDamage = 0, selfDamage = 0, shield = 0;
  let closest = Infinity; // hedefe en yakın geçen mesafe (ıskalayan atışları yönlendirir)
  for (let i = 0; i < game.players.length; i++) {
    const p = game.players[i];
    if (!p.alive) continue;
    const dist = Math.hypot(p.x - hit.x, (p.y - p.r) - hit.y);
    if (i !== shooterIdx && dist < closest) closest = dist;
    if (dist >= spec.radius + p.r) continue;
    const fall = 1 - dist / (spec.radius + p.r);
    // Doğrudan gövdeye çarpan mermi spec'teki ek hasarı da verir (Keskin Nişancı).
    const direct = (i === hit.player && spec.directHitDamage) ? spec.directHitDamage : 0;
    const raw = Math.round((spec.damage * fall + direct) * shooter.dmgMult * (shooter.aiDamageMult || 1));
    const expected = aiExpectedDamage(p, raw);
    if (i === shooterIdx) selfDamage += expected.damage;
    else {
      enemyDamage += expected.damage;
      if (expected.shield) shield++;
    }
  }

  const support = aiSupportAfterBlast(game.terrain, shooter, hit, spec.radius);
  const lethal = selfDamage >= shooter.hp * lethalSelf;
  const groundRisk = support < 2 && Math.abs(hit.x - shooter.x) < spec.radius + shooter.r + 12;
  if (lethal || groundRisk) return { safe: false, score: -Infinity, hit, steps, enemyDamage, selfDamage };

  // Hasar yoksa yalnız hedef yönünde gerçekten yol açan krater küçük bir ilerlemedir.
  const target = game.players.find((p, i) => i !== shooterIdx && p.alive);
  let opensPath = 0;
  if (target && enemyDamage === 0 && hit.terrain) {
    const between = (hit.x - shooter.x) * (target.x - shooter.x) > 0 &&
      Math.abs(hit.x - shooter.x) < Math.abs(target.x - shooter.x);
    if (between && Math.abs(hit.x - target.x) < Math.abs(shooter.x - target.x) * 0.72) opensPath = 6;
  }

  // Isabete yakınlık ve yol açma yalnızca ÇOK KÜÇÜK tercih nedenleridir
  // (toplamı her zaman 1 hasar biriminden az). Eskiden opensPath ağırlıkla
  // çarpıldığı için Zor/Ustalık'ta isabetli atışları bastırıyor, bot hedefin
  // önüne kasıtlı kısa düşürüyordu. Bu küçük terimler yerel aramaya hedefe
  // doğru yön verir ama gerçek hasar her zaman öncelikli kalır.
  const proximity = isFinite(closest) ? Math.max(0, 1 - closest / 420) * 0.45 : 0;
  const pathBonus = opensPath ? Math.min(opensPathValue * 0.1, 0.45) : 0;

  const score = enemyDamage + shield * shieldValue + proximity + pathBonus
              - selfDamage * selfDamageWeight - steps * 0.002;
  return { safe: true, score, hit, steps, enemyDamage, selfDamage, shield, opensPath, closest, proximity };
}

function aiCreateCandidate(game, shooterIdx, angle, power, spec) {
  const shooter = game.players[shooterIdx];
  angle = aiClamp(angle, -Math.PI + 0.02, -0.02);
  power = aiClamp(power, 0.08, 1);
  const cx = shooter.x, cy = shooter.y - shooter.r;
  // Namlu ağzı çizimle aynı geometriden gelmeli; yoksa bot "kendi" namlusunun
  // olmadığı bir noktadan ateş etmiş gibi hesaplar ve insan atışıyla sapar.
  const muzzle = typeof robotMuzzlePoint === "function"
    ? robotMuzzlePoint(cx, cy, shooter.r, Math.cos(angle) >= 0 ? 1 : -1, angle)
    : { x: cx + Math.cos(angle) * (shooter.r + 12), y: cy + Math.sin(angle) * (shooter.r + 12) };
  const speed = spec.baseSpeed + power * spec.speedMul;
  return {
    angle, power, complete: false, steps: 0,
    projectile: new Projectile(muzzle.x, muzzle.y, Math.cos(angle) * speed, Math.sin(angle) * speed, spec),
  };
}

function aiStepCandidate(game, shooterIdx, candidate) {
  const pr = candidate.projectile;
  // Süpürülmüş çarpışma için kare başındaki konum (gerçek oyunla aynı test).
  const x0 = pr.x, y0 = pr.y;
  // Kuru mod: benzetim sırasında matkap haritayı oymaz (arazi kilidi bozulmasın).
  const res = pr.update(game.terrain, game.wind, true);
  const offScreen = !!res && !res.hit;
  candidate.steps++;

  // Yalnız varış noktasına bakmak hızlı cephane için yanlıştı (mermi robotun
  // içinden geçiyordu); katedilen doğru parçası gerçek oyundaki gibi sınanır.
  if (!offScreen) {
    for (let i = 0; i < game.players.length; i++) {
      const p = game.players[i];
      if (!p.alive) continue;
      const hit = Projectile.sweepHit(x0, y0, pr.x, pr.y, p.x, p.y - p.r, p.r + pr.r);
      if (hit) {
        pr.dead = true;
        candidate.complete = true;
        candidate.result = aiEvaluateExplosion(game, shooterIdx,
          { x: hit.x, y: hit.y, player: i, terrain: false }, pr.spec || candidate.spec, candidate.steps);
        return true;
      }
    }
  }
  if (res) {
    candidate.complete = true;
    candidate.result = res.hit
      ? aiEvaluateExplosion(game, shooterIdx,
          { x: res.x, y: res.y, player: null, terrain: true }, pr.spec || candidate.spec, candidate.steps)
      : { safe: true, score: -Infinity, miss: true, steps: candidate.steps };
    return true;
  }
  if (candidate.steps >= AI_LIMITS.maxSteps) {
    candidate.complete = true;
    candidate.result = { safe: true, score: -Infinity, incomplete: true, steps: candidate.steps };
    return true;
  }
  return false;
}

function aiSimulateShot(game, shooterIdx, angle, power, spec) {
  const c = aiCreateCandidate(game, shooterIdx, angle, power, spec || WEAPONS[0]);
  while (!c.complete) aiStepCandidate(game, shooterIdx, c);
  return Object.assign({ angle: c.angle, power: c.power }, c.result);
}

// Hedef tahmin — Zor ve Ustalık seviyelerinde kullanılır.
function aiPredictTarget(game, shooter, target) {
  const pos = target.lastPositions;
  if (!pos || pos.length < 3) return { x: target.x, y: target.y };
  const vx = (pos[2].x - pos[0].x) / 2;
  const vy = (pos[2].y - pos[0].y) / 2;
  const dist = Math.hypot(target.x - shooter.x, target.y - shooter.y);
  const spec = WEAPONS[0];
  const speed = spec.baseSpeed + 0.5 * spec.speedMul;
  const flightTime = dist / speed;
  return {
    x: target.x + vx * flightTime,
    y: target.y + vy * flightTime,
  };
}

// Çoklu hedef skorlaması — Zor ve Ustalık seviyelerinde kullanılır.
function aiTargetScore(target, enemyDamage, dist) {
  return (enemyDamage / target.hp) * 3 +
         (target.blockShield ? 2 : 0) +
         (1 - target.armor) * 2 +
         (1 / (1 + dist / 500));
}

function aiCoarseCandidates(game, shooterIdx, spec) {
  const p = aiParams(game);
  const shooter = game.players[shooterIdx];
  const target = game.players.find((pl, i) => i !== shooterIdx && pl.alive);
  const right = !target || target.x >= shooter.x;
  const result = [];
  // İki yönü de tara: geri esen rüzgâr ve yüksek yaylar bazen ters atışı değerli kılar.
  for (let dirPass = 0; dirPass < 2; dirPass++) {
    const dirRight = dirPass === 0 ? right : !right;
    const elevations = p.coarseElevations;
    const powerSteps = p.coarsePowerSteps;
    for (let i = 0; i < elevations; i++) {
      const elevation = 0.10 + i * (1.38 / (elevations - 1));
      const angle = dirRight ? -elevation : -Math.PI + elevation;
      for (let j = 0; j < powerSteps; j++) {
        const power = 0.16 + j * (0.84 / (powerSteps - 1));
        result.push({ angle, power: Math.min(1, power) });
      }
    }
  }
  return result;
}

// Zorluğa göre hangi silahları kullanacağını belirle.
function aiWeaponLevels(game) {
  const diff = aiGetDifficulty(game);
  // Kolay: sadece Bazuka
  // Orta: Bazuka + El Bombası + Pompalı
  // Zor: Bazuka + El Bombası + Pompalı + Keskin Nişancı + Misket + 3'lü Roket
  // Ustalık: tüm silahlar
  const levels = {
    easy: ["bazooka"],
    normal: ["bazooka", "grenade", "shotgun"],
    hard: ["bazooka", "grenade", "shotgun", "sniper", "cluster", "triple"],
    expert: ["bazooka", "grenade", "shotgun", "sniper", "cluster", "triple", "sticky", "rubber", "rubbertrio", "grenadetrio", "megacluster", "nuke", "barrage", "mirv", "airstrike", "drill", "mine", "napalm"],
  };
  return levels[diff] || levels.normal;
}

// Silah seçimi — mevcut duruma en uygun silahı döndür.
function aiSelectWeapon(game, shooterIdx) {
  const shooter = game.players[shooterIdx];
  const target = game.players.find((p, i) => i !== shooterIdx && p.alive);
  const available = aiWeaponLevels(game);
  const ammo = shooter.ammo;
  const dist = target ? Math.abs(target.x - shooter.x) : 0;
  let best = "bazooka"; // varsayılan
  let bestScore = -Infinity;
  for (const id of available) {
    if (ammo[id] === Infinity || (ammo[id] > 0 && ammo[id] !== undefined)) {
      const spec = WEAPONS.find((w) => w.id === id);
      if (!spec) continue;
      let score = 0;
      // Mesafe bazlı tercih
      if (spec.id === "sniper" && dist < 300) score += 5;
      if (spec.id === "shotgun" && dist > 150) score -= 5;
      if (spec.id === "bazooka" && dist > 400) score -= 3;
      // Nükleer tek mermilik ve zorluk hasar ölçeğiyle tek atışta maçı
      // çevirebilir; bu yüzden varsayılan tercih değil, yalnız hedefi
      // bitirebilecek kadar zayıfsa (veya kalkanlıysa) öne geçer.
      if (spec.id === "nuke") {
        const outMult = (shooter.dmgMult || 1) * (shooter.aiDamageMult || 1);
        const lethal = target && !target.blockShield &&
          target.hp <= spec.damage * outMult * 0.75;
        score += lethal ? 6 : -2;
      }
      // Hedef kalkanlıysa yüksek hasarlı silahları tercih et
      if (target && target.blockShield) {
        if (spec.id === "sniper" || spec.id === "nuke") score += 8;
        if (spec.id === "shotgun") score -= 2;
      }
      // Mühimmat azalıyorsa düşük mermili silahları tercih et
      if (ammo[id] !== Infinity && ammo[id] <= 1) score -= 1;
      // Skor
      if (score > bestScore) { bestScore = score; best = id; }
    }
  }
  return WEAPONS.find((w) => w.id === best) || WEAPONS[0];
}

// ── Yetenek seçimi ──────────────────────────────────────────────────────────
// Zor ve Ustalık seviyelerinde bot yetenek kullanır.
function aiShouldUseSkill(game, shooterIdx) {
  const shooter = game.players[shooterIdx];
  const p = aiParams(game);
  if (!p.useSkills) return false;
  if (!shooter.charDef || !shooter.charDef.skill) return false;
  if (shooter.skillCooldown > 0) return false;
  // Hasar veren modüller atışın yerine geçer, diğerleri ateş sonrası kullanılır;
  // ikisi de aynı turda değerlendirilebilir.
  return true;
}

// Yetenek skorlaması — duruma göre en iyi yeteneği seç.
function aiSelectSkill(game, shooterIdx) {
  const shooter = game.players[shooterIdx];
  const target = game.players.find((p, i) => i !== shooterIdx && p.alive);
  const def = shooter.charDef && shooter.charDef.skill;
  if (!def) return null;
  const kind = def.kind;
  let score = 0;
  const dist = target ? Math.abs(target.x - shooter.x) : 0;

  switch (kind) {
    case "heal":
      // Can < 50% ise kullan
      if (shooter.hp < shooter.maxHp * 0.5) score += 10;
      else if (shooter.hp < shooter.maxHp * 0.7) score += 5;
      else score += 1; // her zaman kullan ama düşük öncelik
      break;

    case "shield":
      // Rakip yüksek hasarlı silah kullanıyorsa veya yakın mesafedeyse
      if (target && dist < 200) score += 8;
      if (shooter.hp < shooter.maxHp * 0.4) score += 6;
      else score += 2;
      break;

    case "damageReduce":
      if (shooter.hp < shooter.maxHp * 0.6) score += 7;
      else score += 2;
      break;

    case "nextShot":
      // Her zaman kullan, ateş öncesi
      score += 10;
      break;

    case "jump":
      // Yakın mesafede rakibe yaklaşmak için
      if (dist < 150) score += 8;
      else score += 2;
      break;

    case "dash":
      // Yakın mesafede yüksek hasar
      if (dist < 100) score += 12;
      else if (dist < 200) score += 6;
      else score += 1;
      break;

    case "melee": {
      const range = def.params.range || 42;
      if (target && dist < range) score += 15;
      else score += 1;
      break;
    }

    case "radial": {
      const radius = def.params.radius || 72;
      // Yakındaki rakiplere hasar
      if (target && dist < radius) score += 12;
      else score += 3;
      break;
    }

    case "quake":
      // Tüm rakiplere hasar
      score += 10;
      break;

    case "spit":
      // Mermi üreten yetenek — atışın yerine geçer
      score += 10;
      break;

    case "dig":
      // Savunma — can düşükse
      if (shooter.hp < shooter.maxHp * 0.4) score += 8;
      else score += 2;
      break;

    case "glide":
      // Mobilit — yüksekten atlamak için
      score += 4;
      break;

    default:
      score += 1;
  }
  return { kind, score, def };
}

function aiPathIsSafe(game, shooter, dir, distance) {
  let x = shooter.x, y = shooter.y;
  for (let d = 2.2; d <= distance; d += 2.2) {
    x += dir * 2.2;
    if (x < shooter.r + 4 || x > game.terrain.w - shooter.r - 4) return false;
    const top = Math.floor(y - 16);
    if (game.terrain.isSolid(x, top)) return false;
    const nextY = game.terrain.surfaceBelow(x, Math.max(0, top));
    if (nextY >= game.terrain.h || nextY < y - 16 || nextY > y + 22) return false;
    y = nextY;
    for (const mine of game.mines || []) if (Math.hypot(mine.x - x, mine.y - y) < (mine.spec.trigger || 34) + 12) return false;
    for (const fire of game.fires || []) if (Math.abs(fire.x - x) < 22 && Math.abs(fire.y - y) < 26) return false;
  }
  return true;
}

function aiLineObstacles(terrain, x1, y1, x2, y2) {
  let blocked = 0;
  const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (terrain.isSolid(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) blocked++;
  }
  return blocked;
}

// ── Gelişmiş zıplama ve yol bulma ──────────────────────────────────────────
// Engel önünde zıplayıp zıplayamayacağını kontrol et.
function aiCanJumpOver(terrain, x, y, dir, jumpHeight, jumpDistance) {
  // Zıplama yolu: yukarı çık, ilerle, aşağı in
  const steps = Math.max(1, Math.ceil(jumpDistance / 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const nx = x + dir * jumpDistance * t;
    // Parabolik yol: başta ve sonda alçak, ortada yüksek
    const arcHeight = Math.sin(t * Math.PI) * jumpHeight;
    const ny = y - arcHeight;
    const xi = Math.round(nx);
    const surf = terrain.surfaceBelow(xi, Math.max(0, Math.floor(ny)));
    if (surf >= terrain.h) return false;
    // Engel kontrolü: zıplama yolundaki katı bloklar
    const top = Math.floor(ny - 16);
    if (terrain.isSolid(xi, top)) return false;
  }
  return true;
}

// İyi bir zıplama noktası bul — engel yakınsa onu aşacak noktayı döndür.
function aiFindJumpPoint(game, shooter, dir, maxSearchDist) {
  const terrain = game.terrain;
  const stepTop = Math.floor(shooter.y - 16);
  for (let d = 2; d <= maxSearchDist; d += 2) {
    const nx = shooter.x + dir * d;
    const xi = Math.round(nx);
    if (xi < shooter.r + 4 || xi > terrain.w - shooter.r - 4) return null;
    const surf = terrain.surfaceBelow(xi, Math.max(0, stepTop));
    if (surf >= terrain.h) return null;
    // Engel var mı?
    if (terrain.isSolid(xi, stepTop)) {
      // Zıplayarak aşabilir mi?
      if (aiCanJumpOver(terrain, shooter.x, shooter.y, dir, 20, d)) {
        return { x: nx, y: surf, jump: true };
      }
      return null; // zıplayamıyor, engel
    }
  }
  return null;
}

// Bir pozisyonun stratejik değerini değerlendir.
function aiEvaluatePosition(game, pos, target) {
  const terrain = game.terrain;
  let score = 0;
  const dist = Math.abs(target.x - pos.x);
  const targetY = target.y - target.r;
  const lineBlocked = aiLineObstacles(terrain, pos.x, pos.y - pos.r, target.x, targetY);
  // Mesafe: çok yakın veya çok uzak kötü
  if (dist > 100 && dist < 500) score += (300 - Math.abs(dist - 300)) / 100;
  // Engel engelleme: hedefe giden yolda az engel iyi
  score += (5 - lineBlocked) * 2;
  // Güvenlik: uçurumdan uzak
  const leftClear = pos.x > pos.r + 20;
  const rightClear = pos.x < terrain.w - pos.r - 20;
  if (!leftClear || !rightClear) score -= 10;
  // Yükseklik: hedefle aynı seviye yakın iyidir
  const heightDiff = Math.abs(pos.y - target.y);
  score -= heightDiff / 50;
  return score;
}

// En iyi pozisyonu bul — hareket eden hedefe göre tahmin.
function aiFindBestPosition(game, shooter, target, maxDist) {
  const terrain = game.terrain;
  const dir = target.x >= shooter.x ? 1 : -1;
  let bestPos = null;
  let bestScore = -Infinity;
  // Adım adım ilerle ve her noktayı değerlendir
  for (let d = 0; d <= maxDist; d += 4) {
    const nx = shooter.x + dir * d;
    const xi = Math.round(nx);
    if (xi < shooter.r + 4 || xi > terrain.w - shooter.r - 4) continue;
    const surf = terrain.surfaceBelow(xi, Math.max(0, shooter.y - 16));
    if (surf >= terrain.h) continue;
    // Engel kontrolü
    const stepTop = Math.floor(shooter.y - 16);
    if (terrain.isSolid(xi, stepTop) && d > 0) {
      // Zıplayarak aş
      if (!aiCanJumpOver(terrain, shooter.x, shooter.y, dir, 20, d)) continue;
    }
    const pos = { x: nx, y: surf };
    const score = aiEvaluatePosition(game, pos, target);
    if (score > bestScore) {
      bestScore = score;
      bestPos = pos;
    }
  }
  return bestPos;
}

function aiMoveBenefit(game, shooter, target, dir, distance) {
  const nextX = shooter.x + dir * distance;
  const nextY = game.terrain.surfaceBelow(nextX, Math.max(0, shooter.y - 18));
  if (nextY >= game.terrain.h) return -Infinity;
  const targetY = target.y - target.r;
  const currentBlocks = aiLineObstacles(game.terrain, shooter.x, shooter.y - shooter.r, target.x, targetY);
  const nextBlocks = aiLineObstacles(game.terrain, nextX, nextY - shooter.r, target.x, targetY);
  const currentDistance = Math.abs(target.x - shooter.x);
  const nextDistance = Math.abs(target.x - nextX);
  return (currentBlocks - nextBlocks) * 3 + (currentDistance - nextDistance) / 100;
}

class BotController {
  constructor(seed) {
    this.seed = seed == null ? 0x51f15e : seed;
    this.random = aiRandom(this.seed);
    this.history = [];
    this.difficulty = "normal"; // zorluk seviyesi
    this.cancel();
  }

  resetMatch() {
    this.history = [];
    this.cancel();
  }

  cancel() {
    this.phase = "idle";
    this.worldKey = null;
    this.queue = [];
    this.current = null;
    this.best = null;
    this.elapsed = 0;
    this.phaseTime = 0;
    this.searchSpent = 0;
    this.moved = false;
    this.fired = false;
    this.stableFor = 0;
    this.lastX = null;
    this.stuckFor = 0;
    this.status = "";
    this.refineStep = 0;
    this.refineAnchor = null;
    this.moveDir = null;
    this.choice = null;
    this.skillUsed = null;  // kullanılan yetenek
    this.skillPhase = "none"; // "none", "instead", "after"
  }

  begin(game) {
    this.cancel();
    this.difficulty = aiGetDifficulty(game);
    this.phase = "settle";
    this.status = "Bilgisayar hazırlanıyor…";
    this.worldKey = aiWorldKey(game);
    this.turnId = game.turnId;
    this.matchId = game.matchId;
    this.shooterIdx = game.turn;
    // Silah seç ve aktar
    const spec = aiSelectWeapon(game, this.shooterIdx);
    const wIdx = WEAPONS.findIndex((w) => w.id === spec.id);
    if (wIdx >= 0) game.active.weapon = wIdx;
    // Yetenek seç. Hasar veren modüller turun atış hakkını doldurduğundan bot
    // da bunları ateş ETMEK YERİNE kullanır ("instead"); yardımcı modüller
    // (onarım, kalkan, sıçrama…) atışı harcamaz, ateş sonrası ("after") girer.
    this.skillUsed = aiSelectSkill(game, this.shooterIdx);
    if (this.skillUsed) {
      const shooter = game.players[this.shooterIdx];
      const def = shooter.charDef && shooter.charDef.skill;
      if (def && skillConsumesShot(def.kind)) {
        // Modül yalnız anlamlıysa (hedef menzilde vb.) atışın yerine geçer.
        if (this.skillUsed.score >= AI_SKILL_REPLACE_SCORE) this.skillPhase = "instead";
        else { this.skillUsed = null; this.skillPhase = "none"; }
      } else {
        // Diğer yetenekler ateş sonrası kullanılır
        this.skillPhase = "after";
      }
    } else {
      this.skillPhase = "none";
    }
  }

  valid(game) {
    return game.state === "AIMING" && game.turn === this.shooterIdx &&
      game.active && game.active.alive && game.active.control === "bot" &&
      game.turnId === this.turnId && game.matchId === this.matchId;
  }

  startSearch(game) {
    this.phase = "search";
    this.phaseTime = 0;
    const shooter = game.players[this.shooterIdx];
    const spec = shooter.weaponSpec || WEAPONS[0];
    this.currentSpec = spec;
    this.queue = aiCoarseCandidates(game, this.shooterIdx, spec);
    this.current = null;
    this.best = null;
    // Yerel arama: kaba ızgaranın kaçırdığı isabetleri yakalamak için en iyi
    // adayın çevresi azalan adımlarla taranır.
    this.refineStep = aiParams(game).refineStart;
    this.refineAnchor = null;
    this.worldKey = aiWorldKey(game);
    this.status = "Bilgisayar nişan alıyor…";
  }

  // En iyi adayın çevresindeki 8 komşuyu verilen adımla üret.
  refineNeighbors(best, step) {
    const out = [];
    for (let da = -1; da <= 1; da++) {
      for (let dp = -1; dp <= 1; dp++) {
        if (da === 0 && dp === 0) continue;
        out.push({ angle: best.angle + da * step, power: best.power + dp * step });
      }
    }
    return out;
  }

  // `final` true ise arama bütçesi dolmuştur: ince taramayı atlayıp karar ver.
  finishSearch(game, final) {
    const p = aiParams(game);

    // Desen araması: her turda mevcut en iyi adayın çevresi taranır; ilerleme
    // yoksa adım yarıya iner. Izgara çözünürlüğünden bağımsız isabet sağlar.
    if (!final && this.best && this.refineStep > 0) {
      if (this.refineAnchor && this.best.score <= this.refineAnchor.score) this.refineStep *= 0.5;
      if (this.refineStep >= p.refineMin) {
        this.refineAnchor = { score: this.best.score };
        const step = this.refineStep;
        for (const n of this.refineNeighbors(this.best, step)) this.queue.push(n);
        return;
      }
      this.refineStep = 0;
    }

    const safeBest = this.best && isFinite(this.best.score) ? this.best : null;

    // Güvenli atış yoksa ya da skor zayıfsa turda BİR kez daha iyi konum ara.
    if ((!safeBest || safeBest.score < p.passScore) && !this.moved) {
      const shooter = game.active;
      const target = game.players.find((pl, i) => i !== game.turn && pl.alive);
      if (target) {
        // Gelişmiş yol bulma: en iyi pozisyonu ara
        const bestPos = aiFindBestPosition(game, shooter, target, 80);
        if (bestPos && bestPos.jump) {
          // Zıplayarak ilerle
          this.phase = "jump";
          this.jumpTarget = bestPos;
          this.jumpDir = bestPos.x >= shooter.x ? 1 : -1;
          this.phaseTime = 0;
          this.lastX = shooter.x;
          this.stuckFor = 0;
          this.status = "Bilgisayar zıplıyor…";
          return;
        }

        // Basit hareket — mevcut mantık
        const toward = target.x >= shooter.x ? 1 : -1;
        const dirs = [toward, -toward];
        const dir = dirs
          .filter((d) => aiPathIsSafe(game, shooter, d, 44))
          .map((d) => ({ dir: d, benefit: aiMoveBenefit(game, shooter, target, d, 44) }))
          .filter((m) => m.benefit > 0.1)
          .sort((a, b) => b.benefit - a.benefit)[0]?.dir;
        if (dir) {
          this.phase = "move";
          this.moveDir = dir;
          this.phaseTime = 0;
          this.lastX = shooter.x;
          this.stuckFor = 0;
          this.status = "Bilgisayar konum değiştiriyor…";
          return;
        }
      }
    }

    // Hiçbir güvenli atış yoksa turu bitir. Güvenli ama zayıf bir atış varsa
    // yine de ateş et: pas geçmek turu boşa harcar, mermi zaten sınırsız.
    if (!safeBest) { this.pass(game); return; }
    this.prepareAim(game);
  }

  prepareAim(game) {
    const p = aiParams(game);
    // Seçilen tek atışa zorluk bazlı sapma uygula, tamamını yeniden doğrula.
    // Sapma her denemede AYNI temel açıya eklenir (önceki kod sapmayı üst üste
    // biriktiriyordu); güvenli olmayan deneme kabul edilmez ve daha küçük
    // sapma denenir; hepsi güvensizse sapmasız en iyi atışa düşülür.
    const base = this.best;
    let chosen = base;
    const baseError = (this.random() * 2 - 1) * p.baseError;
    for (const factor of p.refineFactors) {
      const trial = aiSimulateShot(game, this.shooterIdx, base.angle + baseError * factor, base.power);
      if (trial.safe && isFinite(trial.score)) { chosen = trial; break; }
    }
    this.choice = chosen;
    game.active.aim = chosen.angle;
    game.active.facing = Math.cos(chosen.angle) >= 0 ? 1 : -1;
    this.phase = "aim";
    this.phaseTime = 0;
    this.worldKey = aiWorldKey(game);
    this.status = "Bilgisayar atışı hazırlıyor…";
  }

  pass(game) {
    if (!this.valid(game)) return;
    this.phase = "done";
    this.status = "Bilgisayar güvenli atış bulamadı";
    game.endTurn();
  }

  update(game, dt) {
    if (!this.valid(game)) { this.cancel(); return; }
    this.elapsed += dt;
    this.phaseTime += dt;
    const p = aiParams(game);
    if (this.elapsed >= p.actionSeconds || game.turnTimer <= 0.15) { this.pass(game); return; }

    const shooter = game.active;
    if (this.phase === "settle") {
      const stable = shooter.onGround && Math.abs(shooter.vx) < 0.3 && Math.abs(shooter.vy) < 0.3;
      this.stableFor = stable ? this.stableFor + dt : 0;
      if (this.stableFor >= p.settleTime) { this.startSearch(game); }
      else if (this.phaseTime >= 1) this.pass(game);
      return;
    }

    if (this.phase === "search") {
      if (aiWorldKey(game) !== this.worldKey) {
        if (this.searchSpent >= p.searchSeconds) { this.pass(game); return; }
        this.startSearch(game);
      }
      const frameStart = aiNow();
      let steps = 0;
      while (steps < AI_LIMITS.stepsPerFrame && aiNow() - frameStart < AI_LIMITS.msPerFrame) {
        if (!this.current) {
          const next = this.queue.shift();
          if (!next) { this.finishSearch(game); break; }
          this.current = aiCreateCandidate(game, this.shooterIdx, next.angle, next.power, this.currentSpec);
        }
        aiStepCandidate(game, this.shooterIdx, this.current);
        steps++;
        if (this.current.complete) {
          const r = Object.assign({ angle: this.current.angle, power: this.current.power }, this.current.result);
          const repeated = this.history.some((h) =>
            Math.abs(h.angle - r.angle) < 0.025 && Math.abs(h.power - r.power) < 0.035);
          if (repeated && r.enemyDamage === 0 && !r.shield) r.score -= 8;
          if (r.safe && (!this.best || r.score > this.best.score)) this.best = r;
          this.current = null;
        }
      }
      this.searchSpent += dt;
      if (this.searchSpent >= p.searchSeconds) {
        this.queue = [];
        this.current = null; // yarım aday hiçbir zaman seçilmez
        this.finishSearch(game, true); // bütçe doldu: ince tarama yapmadan karar ver
      }
      return;
    }

    if (this.phase === "move") {
      if (!aiPathIsSafe(game, shooter, this.moveDir, 8)) {
        this.moved = true; this.phase = "settleAfterMove"; this.phaseTime = 0; this.stableFor = 0; return;
      }
      shooter.walk(this.moveDir, game.terrain);
      const progressed = Math.abs(shooter.x - this.lastX) > 0.35;
      this.stuckFor = progressed ? 0 : this.stuckFor + dt;
      this.lastX = shooter.x;
      if (this.phaseTime >= AI_LIMITS.moveSeconds || this.stuckFor >= 0.25) {
        this.moved = true; this.phase = "settleAfterMove"; this.phaseTime = 0; this.stableFor = 0;
      }
      return;
    }

    if (this.phase === "jump") {
      // Zıplama: hedef noktaya doğru zıplayarak ilerle
      if (shooter.onGround) {
        // Zıpla
        if (shooter.jump()) {
          this.jumpStarted = true;
          this.jumpDir = this.jumpTarget.x >= shooter.x ? 1 : -1;
        }
      }
      if (!shooter.onGround) {
        // Havadır — hedefe doğru yatay kontrol
        shooter.walk(this.jumpDir, game.terrain);
      }
      if (shooter.onGround && this.jumpStarted) {
        const reached = Math.abs(shooter.x - this.jumpTarget.x) < 8;
        if (reached) {
          this.moved = true;
          this.phase = "settleAfterMove";
          this.phaseTime = 0;
          this.stableFor = 0;
          return;
        }
      }
      // Zıplama başarısız — geri dön
      if (this.phaseTime >= AI_LIMITS.moveSeconds + 1) {
        this.moved = true;
        this.phase = "settleAfterMove";
        this.phaseTime = 0;
        this.stableFor = 0;
      }
      return;
    }

    if (this.phase === "settleAfterMove") {
      const stable = shooter.onGround && Math.abs(shooter.vx) < 0.3 && Math.abs(shooter.vy) < 0.3;
      this.stableFor = stable ? this.stableFor + dt : 0;
      if (this.stableFor >= p.settleTime) { this.startSearch(game); }
      else if (this.phaseTime >= 1) this.pass(game);
      return;
    }

    if (this.phase === "aim" && this.phaseTime >= 0.45) {
      if (aiWorldKey(game) !== this.worldKey) {
        if (this.searchSpent < p.searchSeconds) { this.startSearch(game); }
        else this.pass(game);
        return;
      }
      const final = aiSimulateShot(game, this.shooterIdx, this.choice.angle, this.choice.power, this.currentSpec);
      if (!final.safe || !isFinite(final.score)) { this.pass(game); return; }
      if (!this.fired && this.valid(game)) {
        this.fired = true;
        this.phase = "done";
        this.history.push({ angle: this.choice.angle, power: this.choice.power });
        if (this.history.length > 6) this.history.shift();
        shooter.aim = this.choice.angle;

        // Yetenek aktivasyonu: hasar veren modüller atışın yerine kullanılır,
        // yardımcı modüller ateş sonrası devreye girer.
        if (this.skillPhase === "instead" && this.skillUsed) {
          const shooterEnt = game.players[this.shooterIdx];
          // Modül koşulu tutmuyorsa (örn. havadayken hücum) normal atış yapılır.
          if (useSkill(shooterEnt, game)) {
            this.status = "Bilgisayar yetenek kullanıyor…";
            game.spendSkillShot(shooterEnt);
          } else {
            game.fire(this.choice.power);
          }
          return;
        }

        game.fire(this.choice.power);

        // Ateş sonrası yetenekler
        if (this.skillPhase === "after" && this.skillUsed) {
          const shooterEnt = game.players[this.shooterIdx];
          useSkill(shooterEnt, game);
          this.status = "Bilgisayar yetenek kullanıyor…";
        }
      }
    }
  }
}

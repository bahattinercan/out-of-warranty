/* Geliştirme sistemi saf hesaplama ve profil testleri — bağımlılıksız.
 *
 * progression.js ve profile.js DOM'a dokunmadığı için karakter verisiyle
 * birlikte tek bir vm sandbox'ına yüklenir; localStorage yerine sahte depolama
 * kullanılır. Böylece ekonomi kuralları tarayıcı olmadan doğrulanır.
 *
 * Çalıştır:  node tests/progression.js
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "js");
const FILES = ["i18n.js", "characters.js", "progression.js", "profile.js", "parts.js", "market.js", "maps.js"];
const bundle =
  FILES.map((f) => fs.readFileSync(path.join(JS_DIR, f), "utf8")).join("\n;\n") +
  "\n;globalThis.__P = { CHARACTERS, SERVICE_LEVELS, MAX_SERVICE_XP, MAX_TIER, START_SCRAP, BRANCHES, BRANCH_LABELS, TIER_COSTS, TIER_LEVEL_GATES, REWARD_BASE, DIFFICULTY_MULTIPLIER, levelForXp, xpForLevel, nextLevelXp, levelUpMessage, calculateMatchReward, resolveRobotBuild, upgradeEffectText, robotUpgradeSummary, totalTiers, sanitizeUpgrades, nextUpgradeStep, toSafeInt, defaultProfile, defaultRobotProgress, normalizeProfile, loadProfile, saveProfile, getRobotProgress, grantMatchReward, purchaseUpgrade, PROFILE_KEY, CLAIMED_MATCH_LIMIT, createSessionId, " +
  "PROFILE_SCHEMA_VERSION, DEFAULT_UNLOCKED_ROBOTS, ACCOUNT_LEVELS, ROBOT_PRICES, levelForAccountXp, xpForAccountLevel, nextAccountLevelXp, accountLevelUpBonus, accountLevelTitle, robotPriceSpec, isRobotUnlocked, canUnlockRobot, unlockRobot };";

const sandbox = { Math, Date, console, JSON, Set, Map, Array, Object, Number, String, isFinite, parseInt };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
try {
  vm.runInContext(bundle, sandbox, { filename: "progression-bundle.js" });
} catch (e) {
  console.error("Kaynaklar yüklenemedi:\n", e);
  process.exit(1);
}
const P = sandbox.__P;

// ── Minik test çatısı ───────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
let section = "";
function group(name) { section = name; console.log(`\n▸ ${name}`); }
function check(name, cond, detail) {
  if (cond) pass++;
  else { fail++; failures.push(`[${section}] ${name}${detail ? " — " + detail : ""}`); console.log(`  ✗ ${name}${detail ? " — " + detail : ""}`); }
}

// ── Sahte depolama ──────────────────────────────────────────────────────────
function makeStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    _map: map,
  };
}
function brokenStorage() {
  return {
    getItem() { throw new Error("depolama kapalı"); },
    setItem() { throw new Error("depolama kapalı"); },
    removeItem() {},
  };
}
function robotProfile(robotId, xp, scrap) {
  return P.normalizeProfile({ version: 1, scrap: scrap == null ? 1000 : scrap, robots: { [robotId]: { xp } } });
}

// Tüm yetenek türlerini kapsayan sentetik tanım üreticisi.
function syntheticDef(kind, params, cooldown = 4) {
  return { id: "test_" + kind, hp: 100, armor: 0, dmgMult: 1, skill: { id: kind, label: kind, desc: "", cooldown, kind, params } };
}

// ── 1) Servis seviyesi eşikleri ─────────────────────────────────────────────
group("Servis seviyesi eşikleri");
{
  for (const s of P.SERVICE_LEVELS) {
    if (s.level > 1) {
      check(`Sv. ${s.level} alt sınırı: ${s.xp - 1} XP → Sv. ${s.level - 1}`, P.levelForXp(s.xp - 1) === s.level - 1, `= ${P.levelForXp(s.xp - 1)}`);
    }
    check(`Sv. ${s.level} tam eşik: ${s.xp} XP → Sv. ${s.level}`, P.levelForXp(s.xp) === s.level, `= ${P.levelForXp(s.xp)}`);
    check(`Sv. ${s.level} üst sınır: ${s.xp + 1} XP en az Sv. ${s.level}`, P.levelForXp(s.xp + 1) >= s.level);
  }
  check("0 XP → Sv. 1", P.levelForXp(0) === 1);
  check("negatif XP → Sv. 1", P.levelForXp(-500) === 1);
  check("çok yüksek XP son seviyede sabitlenir", P.levelForXp(1e12) === P.SERVICE_LEVELS.length);
  check("xpForLevel ters çevrilebilir", P.xpForLevel(2) === 100 && P.xpForLevel(5) === 700 && P.xpForLevel(8) === 1750);
  check("son seviyede nextLevelXp null", P.nextLevelXp(P.SERVICE_LEVELS.length) === null);
  check("seviye atlama mesajı yalnız geçilen seviyeyi yazar", P.levelUpMessage(1, 2).includes("Kademe I") && !P.levelUpMessage(1, 2).includes("Kademe II"));
  check("seviye atlamada birden çok içerik açılabilir", P.levelUpMessage(1, 3).includes("Kademe I") && P.levelUpMessage(1, 3).includes("Profil rozeti"));
}

// ── 2) Ödül formülü ─────────────────────────────────────────────────────────
group("Ödül formülü");
{
  const results = ["win", "loss", "draw"];
  const diffs = ["easy", "normal", "hard", "expert"];
  let maxScrap = 0, maxXp = 0, matrixOk = true, formulaOk = true;
  for (const result of results) {
    for (const difficulty of diffs) {
      for (let opponents = 1; opponents <= 3; opponents++) {
        const r = P.calculateMatchReward({ result, difficulty, opponentCount: opponents });
        maxScrap = Math.max(maxScrap, r.scrap);
        maxXp = Math.max(maxXp, r.xp);
        const base = P.REWARD_BASE[result];
        const diff = P.DIFFICULTY_MULTIPLIER[difficulty];
        const opponentMult = 1 + 0.20 * (opponents - 1);
        // Çarpma sırası uygulamayla aynı olmalı (kayan nokta yuvarlaması).
        if (r.scrap !== Math.round(base.scrap * diff * opponentMult) || r.xp !== Math.round(base.xp * diff * opponentMult)) formulaOk = false;
        if (r.scrap < 0 || r.xp < 0) matrixOk = false;
      }
    }
  }
  check("4 zorluk × 3 rakip × 3 sonuç formülü tutarlı", formulaOk);
  check("ödül değerleri negatif olmaz", matrixOk);
  check("ödül üst sınırları aşılmaz", maxScrap <= 150 && maxXp <= 180, `scrap=${maxScrap} xp=${maxXp}`);
  check("örnek: Zor + 2 rakip + galibiyet = 90 Hurda / 105 XP",
    P.calculateMatchReward({ result: "win", difficulty: "hard", opponentCount: 2 }).scrap === 90 &&
    P.calculateMatchReward({ result: "win", difficulty: "hard", opponentCount: 2 }).xp === 105);
  check("yerel/eksik girdi güvenli varsayılana düşer", P.calculateMatchReward({}).scrap === 40);
}

// ── 3) Kademe sözleşmesi ve önkoşullar ──────────────────────────────────────
group("Kademe sözleşmesi ve önkoşullar");
{
  check("dal etiketleri Türkçe", P.BRANCH_LABELS.chassis === "Gövde" && P.BRANCH_LABELS.module === "Aparat" && P.BRANCH_LABELS.core === "Çekirdek");
  check("kademe maliyetleri sırasıyla 60/120/220", P.TIER_COSTS.join(",") === "60,120,220");
  check("kademe seviye kapıları 2/5/8", P.TIER_LEVEL_GATES.join(",") === "2,5,8");
  const fresh = P.defaultRobotProgress();
  const s1 = P.nextUpgradeStep(fresh, "chassis");
  check("Kademe I önkoşulu doğru", s1.ok && s1.nextTier === 1 && s1.cost === 60 && s1.requiredLevel === 2);
  const t2 = { upgrades: { chassis: 1, module: 0, core: 0 } };
  const s2 = P.nextUpgradeStep(t2, "chassis");
  check("Kademe II önkoşulu doğru", s2.ok && s2.nextTier === 2 && s2.cost === 120 && s2.requiredLevel === 5);
  const t3 = { upgrades: { chassis: 2, module: 0, core: 0 } };
  const s3 = P.nextUpgradeStep(t3, "chassis");
  check("Kademe III önkoşulu doğru", s3.ok && s3.nextTier === 3 && s3.cost === 220 && s3.requiredLevel === 8);
  const maxed = { upgrades: { chassis: 3, module: 0, core: 0 } };
  check("maksimum kademede MAX_TIER", P.nextUpgradeStep(maxed, "chassis").reason === "MAX_TIER");
  check("geçersiz dal reddedilir", P.nextUpgradeStep(fresh, "kanat").reason === "INVALID_BRANCH");
  check("bozuk kademe 0..3 aralığına çekilir", JSON.stringify(P.sanitizeUpgrades({ upgrades: { chassis: 9, module: -2, core: 2 } })) === JSON.stringify({ chassis: 3, module: 0, core: 2 }));
  check("toplam kademe 0..9", P.totalTiers(maxed) === 3 && P.totalTiers(P.defaultRobotProgress()) === 0);
  check("dal özeti okunur", P.robotUpgradeSummary({ upgrades: { chassis: 2, module: 1, core: 0 } }) === "Gövde II • Aparat I • Çekirdek 0");
}

// ── 4) Türetilmiş build ve yetenek adaptörleri ──────────────────────────────
group("Türetilmiş build ve yetenek adaptörleri");
{
  const heal = P.CHARACTERS[0];
  const full = { upgrades: { chassis: 3, module: 3, core: 3 } };

  // Sınırlar
  const capped = P.resolveRobotBuild({ id: "x", hp: 100, armor: 0.39, dmgMult: 1, skill: syntheticDef("heal", { amount: 10 }).skill }, { upgrades: { chassis: 2, module: 0, core: 0 } }, { upgradesEnabled: true });
  check("zırh mutlak %40 ile sınırlanır", capped.armor === 0.40);
  check("Kademe III can %5+%5 üst üste eklenmez", P.resolveRobotBuild(heal, full, { upgradesEnabled: true }).maxHp === Math.round(heal.hp * 1.10));
  const cd3 = P.resolveRobotBuild(syntheticDef("heal", { amount: 10 }, 3), { upgrades: { chassis: 0, module: 3, core: 0 } }, { upgradesEnabled: true });
  check("cooldown alt sınırın (2) altına inmez", cd3.skill.cooldown === 2);
  const cd2 = P.resolveRobotBuild(syntheticDef("heal", { amount: 10 }, 2), { upgrades: { chassis: 0, module: 3, core: 0 } }, { upgradesEnabled: true });
  check("taban cooldown 2 ise daha da azalmaz", cd2.skill.cooldown === 2);
  check("eksik ilerleme sıfır kademe sayılır", P.resolveRobotBuild(heal, null, { upgradesEnabled: true }).maxHp === heal.hp);
  check("yükseltmeler kapalıyken build taban değer verir", P.resolveRobotBuild(heal, full, { upgradesEnabled: false }).weaponDamageMult === 1);
  check("yetenek sonuçları sonlu", Number.isFinite(P.resolveRobotBuild(heal, full, { upgradesEnabled: true }).skill.params.amount));
  check("kaynak skill.params referansı kopyalanır", P.resolveRobotBuild(heal, full, { upgradesEnabled: true }).skill.params !== heal.skill.params);

  // Aynı giriş her çağrıda aynı build'i üretir
  const a = JSON.stringify(P.resolveRobotBuild(heal, full, { upgradesEnabled: true }));
  const b = JSON.stringify(P.resolveRobotBuild(heal, full, { upgradesEnabled: true }));
  check("build deterministiktir", a === b);

  // 12 yetenek türünün adaptörü
  const kinds = ["heal", "shield", "damageReduce", "nextShot", "jump", "dash", "dig", "glide", "melee", "radial", "quake", "spit"];
  for (const kind of kinds) {
    const def = P.CHARACTERS.find((c) => c.skill.kind === kind);
    check(`${kind}: en az bir robotta kullanılıyor`, !!def);
    if (!def) continue;
    const baseParams = JSON.stringify(def.skill.params);
    const built = P.resolveRobotBuild(def, { upgrades: { chassis: 0, module: 3, core: 0 } }, { upgradesEnabled: true });
    const params = built.skill.params;
    check(`${kind}: kaynak params değişmez`, JSON.stringify(def.skill.params) === baseParams);
    const bp = def.skill.params;
    switch (kind) {
      case "heal": check("heal: amount güçle artar", params.amount > bp.amount); break;
      case "shield":
        check("shield: enerji iadesi 10 olur", built.skill.shieldStaminaRefund === 10);
        check("shield: params değişmez", JSON.stringify(params) === baseParams);
        break;
      case "damageReduce":
        check("damageReduce: faktör 1'e yaklaşır", params.factor < bp.factor && params.factor > 0);
        check("damageReduce: turns değişmez", params.turns === bp.turns);
        break;
      case "nextShot":
        // Bazı robotlarda yalnız yarıçap, bazılarında yalnız mermi sayısı vardır;
        // var olan çarpan alanları ölçeklenir, pellets/spread dokunulmaz.
        if (bp.dmgMult != null) check("nextShot: dmgMult ölçeklenir", params.dmgMult > bp.dmgMult);
        if (bp.radiusMult != null) check("nextShot: radiusMult ölçeklenir", params.radiusMult > bp.radiusMult);
        if (bp.knockbackMult != null) check("nextShot: knockbackMult ölçeklenir", params.knockbackMult > bp.knockbackMult);
        check("nextShot: pellets değişmez", params.pellets === bp.pellets);
        check("nextShot: spread değişmez", params.spread === bp.spread);
        break;
      case "jump":
        check("jump: dikey itiş büyür (daha negatif)", params.vy < bp.vy);
        check("jump: yatay itiş büyür", Math.abs(params.vx) > Math.abs(bp.vx));
        break;
      case "dash":
        check("dash: temas hasarı artar", params.contactDamage > bp.contactDamage);
        check("dash: knockback artar", params.knockback > bp.knockback);
        break;
      case "dig": check("dig: derinlik artar", params.depth > bp.depth); break;
      case "glide":
        check("glide: params değişmez", JSON.stringify(params) === baseParams);
        check("glide: yerçekimi katsayısı düşer", built.skill.glideGravityMult < 0.35 && built.skill.glideGravityMult >= 0.22);
        break;
      case "melee":
        check("melee: hasar artar", params.damage > bp.damage);
        check("melee: zehir turu değişmez", !bp.poison || params.poison.turns === bp.poison.turns);
        break;
      case "radial":
        check("radial: hasar ve yarıçap artar", params.damage > bp.damage && params.radius > bp.radius);
        break;
      case "quake": check("quake: hasar artar", params.damage > bp.damage); break;
      case "spit":
        check("spit: hız ölçeklenir", params.speed > bp.speed);
        check("spit: specScale taşınır", Math.abs(params.specScale - 1.15) < 1e-9);
        check("spit: mermi sayısı değişmez", params.count === bp.count);
        break;
      default: break;
    }
  }

  // 34 robot için denge tavanları
  let capsOk = true, finiteOk = true;
  for (const ch of P.CHARACTERS) {
    const b = P.resolveRobotBuild(ch, full, { upgradesEnabled: true });
    if (b.weaponDamageMult > 1.07 + 1e-9) capsOk = false;
    if (b.skill && b.skill.powerMult > 1.15 + 1e-9) capsOk = false;
    if (!(Number.isFinite(b.maxHp) && Number.isFinite(b.armor) && Number.isFinite(b.maxStamina) && Number.isFinite(b.weaponDamageMult))) finiteOk = false;
  }
  check("silah hasarı toplamda en fazla %7", capsOk);
  check("tüm robotlarda build değerleri sonlu", finiteOk);
  check("34 robotun 12 yetenek türü kapsanır", kinds.every((k) => P.CHARACTERS.some((c) => c.skill.kind === k)));

  // Atölye etki metni ve maksimum durum
  check("maksimum kademede 'Tam Kalibrasyon'", P.upgradeEffectText(heal, { upgrades: { chassis: 3, module: 0, core: 0 } }, "chassis") === "Tam Kalibrasyon");
  check("Gövde I etkisi sayısal fark gösterir", P.upgradeEffectText(heal, { upgrades: { chassis: 0, module: 0, core: 0 } }, "chassis").includes("→"));
  // Kademe önizlemesi takılı parçaları KORUMALI: yoksa yükseltme zırhı
  // düşürüyor gibi görünür ("Zırh %21 → %17" hatası — EN çevirisi
  // doğrulanırken bulundu). Aynı loadout iki tarafta da kullanılır.
  const parcaliProgress = { upgrades: { chassis: 1, module: 0, core: 0 }, loadout: { helmet: null, body: ["kompozit_plaka", null], tool: null, feet: null } };
  const tierII = P.upgradeEffectText(heal, parcaliProgress, "chassis");
  const sayilar = (tierII.match(/\d+/g) || []).map(Number);
  check("kademe önizlemesi takılı parçayı korur (zırh düşmez)", sayilar.length >= 2 && sayilar[1] > sayilar[0], tierII);
  const beforeBuild = P.resolveRobotBuild(heal, parcaliProgress, { upgradesEnabled: true });
  const afterBuild = P.resolveRobotBuild(heal, Object.assign({}, parcaliProgress, { upgrades: { chassis: 2, module: 0, core: 0 } }), { upgradesEnabled: true });
  check("parçalı build'de Kademe II zırhı artırır", afterBuild.armor > beforeBuild.armor, `${beforeBuild.armor} → ${afterBuild.armor}`);
}

// ── 5) Kaynak veri dokunulmazlığı ───────────────────────────────────────────
group("Kaynak veri dokunulmazlığı");
{
  const snapshot = JSON.stringify(P.CHARACTERS);
  for (const ch of P.CHARACTERS) {
    P.resolveRobotBuild(ch, { upgrades: { chassis: 3, module: 3, core: 3 } }, { upgradesEnabled: true });
  }
  check("CHARACTERS dizisi türetme sonrası bit bit aynı", JSON.stringify(P.CHARACTERS) === snapshot);
}

// ── 6) Profil şeması ve doğrulama ───────────────────────────────────────────
group("Profil şeması ve doğrulama");
{
  const fresh = P.defaultProfile();
  check("yeni profil 200 Hurda ile başlar", fresh.scrap === 200);
  check("yeni profil şema sürümü taşır", fresh.version === P.PROFILE_SCHEMA_VERSION && P.PROFILE_SCHEMA_VERSION === 7);
  check("yeni profil varsayılan 2 robotla başlar", fresh.unlockedRobots.length === 2 && fresh.unlockedRobots.includes("kopek") && fresh.unlockedRobots.includes("tavsan"));
  check("varsayılan profil round-trip", JSON.stringify(P.normalizeProfile(fresh)) === JSON.stringify(fresh));

  check("boş girdi varsayılana düşer", P.normalizeProfile(undefined).scrap === 200);
  const missing = P.normalizeProfile({ version: 1 });
  check("eksik alanlar tamamlanır", missing.scrap === 200 && Array.isArray(missing.claimedMatches) && typeof missing.robots === "object");

  const bad = P.normalizeProfile({
    version: 1, scrap: -50,
    robots: { kopek: { xp: NaN, upgrades: { chassis: 99, module: -3, core: "x" }, stats: { matches: -1, wins: 1e20 } } },
    claimedMatches: ["ok", "", 42, null],
  });
  check("negatif Hurda 0'a çekilir", bad.scrap === 0);
  check("NaN XP 0'a çekilir", bad.robots.kopek.xp === 0);
  check("kademeler 0..3 aralığına sınırlanır", JSON.stringify(bad.robots.kopek.upgrades) === JSON.stringify({ chassis: 3, module: 0, core: 0 }));
  check("negatif maç sayısı 0'a çekilir", bad.robots.kopek.stats.matches === 0);
  check("çok büyük sayı güvenli tam sayıya sınırlanır", bad.robots.kopek.stats.wins <= Number.MAX_SAFE_INTEGER);
  check("geçersiz maç anahtarları ayıklanır", bad.claimedMatches.length === 1 && bad.claimedMatches[0] === "ok");

  check("bilinmeyen robot kaydı yok sayılır", Object.keys(P.normalizeProfile({ version: 1, robots: { hayalet: { xp: 10 }, kopek: { xp: 10 } } }).robots).length === 1);
  check("bilinmeyen sürüm güvenli varsayılana düşer", P.normalizeProfile({ version: 99, scrap: 5000 }).scrap === 200);
  check("XP son eşikte sabitlenir", P.normalizeProfile({ version: 1, robots: { kopek: { xp: 999999 } } }).robots.kopek.xp === P.MAX_SERVICE_XP);

  const store = makeStorage();
  const saved = P.saveProfile(fresh, store);
  const loaded = P.loadProfile(store);
  check("kayıt yazılıp geri okunabilir", saved && loaded.profile.scrap === 200 && loaded.storageOk === true);
  check("kayıt güncelleme zamanı yazılır", loaded.profile.updatedAt > 0);

  const corrupt = P.loadProfile(makeStorage({ [P.PROFILE_KEY]: "{bozuk json" }));
  check("bozuk JSON oyunu durdurmaz", corrupt.profile.scrap === 200 && corrupt.corrupt === true);
  check("kayıt yoksa varsayılan üretilir", P.loadProfile(makeStorage()).profile.scrap === 200);

  const broken = P.loadProfile(brokenStorage());
  check("depolama kapalıyken yükleme güvenli", broken.storageOk === false && broken.profile.scrap === 200);
  check("depolama kapalıyken yazma false döner", P.saveProfile(fresh, brokenStorage()) === false);
  check("profil anahtarı sabittir", P.PROFILE_KEY === "dokumhane9_profile");
  check("oturum kimliği üretilir", typeof P.createSessionId() === "string" && P.createSessionId().length > 3);
}

// ── 7) Ödül yazımı ve tekilleştirme ─────────────────────────────────────────
group("Ödül yazımı ve tekilleştirme");
{
  const base = P.defaultProfile();
  const r1 = P.grantMatchReward(base, { matchKey: "s:1", robotId: "kopek", result: "win", difficulty: "normal", opponentCount: 1, storage: makeStorage() });
  check("ödül başarılı ve bakiyeyi artırır", r1.ok && r1.profile.scrap === 260 && r1.scrap === 60 && r1.xp === 70);
  check("ödül robot XP'sini yazar", r1.profile.robots.kopek.xp === 70);
  check("galibiyet maç ve galibiyet sayacını artırır", r1.profile.robots.kopek.stats.matches === 1 && r1.profile.robots.kopek.stats.wins === 1);
  check("seviye öncesi/sonrası raporlanır", r1.levelBefore === 1 && r1.levelAfter === 1);
  check("kaynak profil mutasyona uğramaz", base.scrap === 200 && !base.robots.kopek);

  const dup = P.grantMatchReward(r1.profile, { matchKey: "s:1", robotId: "kopek", result: "win", difficulty: "normal", opponentCount: 1 });
  check("aynı maç anahtarı ikinci kez ödül vermez", !dup.ok && dup.reason === "ALREADY_CLAIMED");
  check("mükerrer ödül bakiyeyi değiştirmez", r1.profile.scrap === 260);

  const levelJump = P.grantMatchReward(P.normalizeProfile({ version: 1, robots: { kopek: { xp: 90 } } }), { matchKey: "s:2", robotId: "kopek", result: "win", difficulty: "normal", opponentCount: 1 });
  check("seviye atlaması ve mesajı üretilir", levelJump.levelAfter === 2 && levelJump.message.includes("Kademe I"));

  // Son 20 maç anahtarı tutulur; en eskiler düşer.
  let prof = P.defaultProfile();
  for (let i = 0; i < 25; i++) {
    const r = P.grantMatchReward(prof, { matchKey: `s:${i}`, robotId: "kopek", result: "loss", difficulty: "easy", opponentCount: 1 });
    if (r.ok) prof = r.profile;
  }
  check("claimedMatches en fazla 20 anahtar tutar", prof.claimedMatches.length === 20);
  check("en eski maç anahtarı düşer", !prof.claimedMatches.includes("s:0") && prof.claimedMatches.includes("s:24"));
  check("yerel ödül için mod kontrolü profile.js'te değil çağıranda", P.grantMatchReward(prof, { matchKey: "s:0", robotId: "kopek", result: "win" }).ok === true);
  check("geçersiz sonuç reddedilir", P.grantMatchReward(P.defaultProfile(), { matchKey: "s:9", robotId: "kopek", result: "berabere" }).reason === "INVALID_RESULT");
  check("bilinmeyen robot reddedilir", P.grantMatchReward(P.defaultProfile(), { matchKey: "s:9", robotId: "hayalet", result: "win" }).reason === "INVALID_ROBOT");
}

// ── 8) Satın alma ───────────────────────────────────────────────────────────
group("Satın alma");
{
  check("geçersiz dal reddedilir", P.purchaseUpgrade(P.defaultProfile(), "kopek", "kanat").reason === "INVALID_BRANCH");
  check("bilinmeyen robot reddedilir", P.purchaseUpgrade(P.defaultProfile(), "hayalet", "chassis").reason === "INVALID_ROBOT");

  const lowLevel = robotProfile("kopek", 0, 1000);
  const lv = P.purchaseUpgrade(lowLevel, "kopek", "chassis");
  check("seviye yetersizse LEVEL_REQUIRED", !lv.ok && lv.reason === "LEVEL_REQUIRED" && lv.requiredLevel === 2);
  check("seviye yetersizse bakiye değişmez", lowLevel.scrap === 1000 && lowLevel.robots.kopek.upgrades.chassis === 0);

  const poor = robotProfile("kopek", 100, 10);
  const pr = P.purchaseUpgrade(poor, "kopek", "chassis");
  check("Hurda yetersizse SCRAP_REQUIRED", !pr.ok && pr.reason === "SCRAP_REQUIRED");
  check("Hurda yetersizse bakiye değişmez", poor.scrap === 10);

  const rich = robotProfile("kopek", 100, 1000);
  const ok1 = P.purchaseUpgrade(rich, "kopek", "chassis", makeStorage());
  check("Kademe I satın alınır", ok1.ok && ok1.newTier === 1 && ok1.cost === 60);
  check("maliyet bakiyeden düşer", ok1.profile.scrap === 940);
  check("kademe profile işlenir", ok1.profile.robots.kopek.upgrades.chassis === 1);
  check("kaynak profil mutasyona uğramaz", rich.scrap === 1000 && rich.robots.kopek.upgrades.chassis === 0);

  const gate2 = P.purchaseUpgrade(ok1.profile, "kopek", "chassis");
  check("Kademe II için Sv. 5 gerekir", !gate2.ok && gate2.reason === "LEVEL_REQUIRED" && gate2.requiredLevel === 5);

  const lvl5 = P.normalizeProfile({ version: 1, scrap: 1000, robots: { kopek: { xp: 700, upgrades: { chassis: 1 } } } });
  const ok2 = P.purchaseUpgrade(lvl5, "kopek", "chassis");
  check("Kademe II satın alınır", ok2.ok && ok2.newTier === 2 && ok2.cost === 120 && ok2.profile.scrap === 880);

  const lvl8 = P.normalizeProfile({ version: 1, scrap: 1000, robots: { kopek: { xp: 1750, upgrades: { chassis: 2 } } } });
  const ok3 = P.purchaseUpgrade(lvl8, "kopek", "chassis");
  check("Kademe III satın alınır", ok3.ok && ok3.newTier === 3 && ok3.cost === 220 && ok3.profile.scrap === 780);
  check("maksimum kademeden sonra MAX_TIER", P.purchaseUpgrade(ok3.profile, "kopek", "chassis").reason === "MAX_TIER");

  // Üç dal bağımsız ilerler; toplam maliyet 1200.
  let all = P.normalizeProfile({ version: 1, scrap: 1200, robots: { kopek: { xp: P.MAX_SERVICE_XP } } });
  for (const branch of P.BRANCHES) for (let t = 0; t < 3; t++) { const r = P.purchaseUpgrade(all, "kopek", branch); all = r.profile; }
  check("üç dalın tamamı 1200 Hurda tutar", all.scrap === 0 && P.totalTiers(all.robots.kopek) === 9);

  const brokenPurchase = P.purchaseUpgrade(robotProfile("kopek", 100, 1000), "kopek", "chassis", brokenStorage());
  check("depolama kapalıysa satın alma oturumda geçerli kalır", brokenPurchase.ok && brokenPurchase.persisted === false && brokenPurchase.profile.robots.kopek.upgrades.chassis === 1);
}

// ── 9) Hesap Seviyesi & Robot Satın Alma ────────────────────────────────────
group("Hesap Seviyesi & Robot Satın Alma");
{
  check("başlangıç açık robotları 2 adet", P.DEFAULT_UNLOCKED_ROBOTS.length === 2 && P.DEFAULT_UNLOCKED_ROBOTS.includes("kopek") && P.DEFAULT_UNLOCKED_ROBOTS.includes("tavsan"));
  check("kopek ve tavsan varsayılan açık", P.isRobotUnlocked(P.defaultProfile(), "kopek") && P.isRobotUnlocked(P.defaultProfile(), "tavsan"));
  check("diğer robotlar kilitli başlar", !P.isRobotUnlocked(P.defaultProfile(), "kedi") && !P.isRobotUnlocked(P.defaultProfile(), "ayi"));

  check("0 XP → Hesap Sv. 1", P.levelForAccountXp(0) === 1);
  check("120 XP → Hesap Sv. 2", P.levelForAccountXp(120) === 2);
  check("seviye atlama ikramiyesi hesaplanır", P.accountLevelUpBonus(1, 2) === 150);

  const p = P.defaultProfile();
  p.scrap = 1000;
  // kedi: Sv. 1, 450 Hurda
  check("kedi satın alınabilir", P.canUnlockRobot(p, "kedi").ok === true && P.canUnlockRobot(p, "kedi").cost === 450);

  // ayi: Sv. 8, 3200 Hurda
  check("ayi için seviye yetersiz", !P.canUnlockRobot(p, "ayi").ok && P.canUnlockRobot(p, "ayi").reason === "LEVEL_REQUIRED" && P.canUnlockRobot(p, "ayi").requiredLevel === 8);

  // Yetersiz hurda kontrolü
  const poorProf = P.defaultProfile();
  poorProf.scrap = 50;
  check("hurda yetersizken SCRAP_REQUIRED", !P.canUnlockRobot(poorProf, "kedi").ok && P.canUnlockRobot(poorProf, "kedi").reason === "SCRAP_REQUIRED");

  // Satın alma akışı
  const buyRes = P.unlockRobot(p, "kedi", makeStorage());
  check("kedi başarıyla satın alınır", buyRes.ok && buyRes.profile.unlockedRobots.includes("kedi") && buyRes.profile.scrap === 550);
  check("tekrar satın alınamaz", !P.canUnlockRobot(buyRes.profile, "kedi").ok && P.canUnlockRobot(buyRes.profile, "kedi").reason === "ALREADY_UNLOCKED");

  // Maç içi combat ödülü testi
  const combatReward = P.calculateMatchReward({
    result: "win",
    difficulty: "normal",
    opponentCount: 1,
    combat: { kills: 2, damageDealt: 250, directHits: 3, firstBlood: true, clutch: false },
  });
  check("combat ödülleri hesaplanır", combatReward.combatScrap > 0 && combatReward.scrap > combatReward.baseScrap);
  check("kill primi doğru", combatReward.details.kills === 2);
}

// ── Özet ────────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(48)}`);
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
if (fail > 0) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exit(1);
} else {
  console.log("Tüm geliştirme testleri geçti ✅");
}

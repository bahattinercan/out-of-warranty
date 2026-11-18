/* Kalıcı ilerleme kaydı: şema doğrulama, migrasyon, satın alma ve ödül cephesi.
 *
 * Kayıt tek bir localStorage anahtarında tutulur; ses tercihleri (nwo_muted /
 * nwo_volume) ayrı anahtarlarda kalır, profil silinince etkilenmez. Bozuk veya
 * okunamayan kayıt oyunu açılmaz hâle getirmez: varsayılan profille devam edilir
 * ve depolama kullanılamıyorsa kullanıcıya TEK SEFERLİK uyarı gösterilir.
 */

const PROFILE_KEY = "dokumhane9_profile";

// localStorage yoksa (veya erişilemiyorsa) oturumluk bellek yedeği. Oyun bu
// durumda da oynanır; yalnız kayıt kalıcı olmaz.
let _storageCache;
let _storageWarningShown = false;

function _storage() {
  if (_storageCache !== undefined) return _storageCache;
  try {
    if (typeof localStorage === "undefined" || !localStorage) { _storageCache = null; return _storageCache; }
    const probe = "__nwo_profile_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    _storageCache = localStorage;
  } catch (_) {
    _storageCache = null;
  }
  return _storageCache;
}

// Depolama hatasını ekrana bir kez yaz. DOM yoksa (testler) sessizce geçer.
function notifyStorageFailure() {
  if (_storageWarningShown) return;
  _storageWarningShown = true;
  // Tanılama (F6): kapalı test raporunda "depolama yok" bilgisi görünsün.
  if (typeof DIAG !== "undefined") DIAG.record("storage", "storage_unavailable");
  if (typeof document === "undefined" || !document || typeof document.getElementById !== "function") return;
  const el = document.getElementById("storage-warning");
  if (!el) return;
  el.textContent = t("storage.warning", "İlerleme bu oturumda saklanamadı.");
  el.classList.remove("hidden");
}

// ── Varsayılanlar ve doğrulama ──────────────────────────────────────────────

function defaultRobotProgress() {
  // loadout: yuva → parça id eşleşmesi (v5). Takma Atölye'den equipPart ile
  // yapılır; burada yalnız boş şekil üretilir.
  return { xp: 0, upgrades: { chassis: 0, module: 0, core: 0 }, stats: { matches: 0, wins: 0 }, loadout: sanitizeLoadoutShape(null) };
}

function defaultProfile() {
  return {
    version: PROFILE_SCHEMA_VERSION,
    scrap: START_SCRAP,
    // Genel oyuncu/hesap seviyesi için XP (v7)
    accountXp: 0,
    // Sahip olunan (kilidi açılmış) robot id'leri (v7)
    unlockedRobots: DEFAULT_UNLOCKED_ROBOTS.slice(),
    // Arena'da ulaşılan en ileri bölüm (v8)
    arenaUnlockedStage: 1,
    // Ortak cephane deposu (id -> adet): Cephane Pazarı'ndan alınır ve tüm
    // robotlar tarafından paylaşılır. Şema v4 ile robot kayıtlarından köke taşındı.
    ammo: {},
    // Parça envanteri (v5): sahip olunan parça id'leri — js/parts.js'teki
    // sanitizeParts doğrular; satın alma buyPart ile, takma Atölye'den
    // equipPart ile yapılır. Parçalar benzersizdir (dizi, tekrarsız).
    parts: [],
    robots: {},
    claimedMatches: [],
    updatedAt: 0,
  };
}

// Dahili robot anahtarı charDef.id'dir; bilinmeyen kayıtlar korunmaz (yok sayılır).
function knownRobotId(robotId) {
  if (typeof robotId !== "string" || !robotId) return false;
  if (typeof CHARACTERS === "undefined" || !Array.isArray(CHARACTERS)) return true;
  return CHARACTERS.some((c) => c && c.id === robotId);
}

function sanitizeRobotProgress(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const up = src.upgrades && typeof src.upgrades === "object" ? src.upgrades : {};
  const st = src.stats && typeof src.stats === "object" ? src.stats : {};
  const clampTier = (v) => clampNumber(toSafeInt(v), 0, MAX_TIER);
  return {
    xp: Math.min(MAX_SERVICE_XP, toSafeInt(src.xp)),
    upgrades: { chassis: clampTier(up.chassis), module: clampTier(up.module), core: clampTier(up.core) },
    stats: { matches: toSafeInt(st.matches), wins: toSafeInt(st.wins) },
    // Loadout ŞEKİL doğrulaması burada; sahiplik/çakışma çapraz denetimi
    // normalizeProfile'da (profil kökünü görür).
    loadout: sanitizeLoadoutShape(src.loadout),
  };
}

// Loadout'ları profil köküne göre doğrular: SAHİP OLUNMAYAN parça null'a düşer
// (KONUM KORUNUR — 2. alt yuvadaki parça 1. yuvaya kaymaz). Parçalar robota
// kilitli DEĞİLDİR — aynı parça birden çok robotta durabilir. Aynı yuvada aynı
// parçanın iki kez durması zaten sanitizeLoadoutShape'ta tekilleştirilir.
function _crossValidateLoadouts(robots, parts) {
  const owned = new Set(parts);
  for (const id of Object.keys(robots)) {
    const lo = robots[id].loadout;
    for (const slot of PART_SLOTS) {
      const slotList = lo[slot];
      for (let i = 0; i < slotList.length; i++) {
        const pid = slotList[i];
        if (pid && !owned.has(pid)) slotList[i] = null;
      }
    }
  }
}

// Sürümü bilinmeyen (gelecekteki) kayıt güvenli varsayılana düşer; alt sürümler
// sırayla yükseltilir. Yeni bir migrasyon eklenirse while döngüsüne girer.
function migrateProfile(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  let version = toSafeInt(src.version);
  if (version > PROFILE_SCHEMA_VERSION) return null; // güvenli fallback
  let data = Object.assign({}, src);
  if (version < 1) {
    // v0 → v1: alan adları korunur, eksikler normalizeProfile'da tamamlanır.
    data.version = 1;
    version = 1;
  }
  if (version < 2) {
    // v1 → v2: yalnız şema sürümü yükseltilir. Eksik alanlar
    // normalizeProfile içinde tamamlanır — ekonomiye dokunulmaz.
    data.version = 2;
    version = 2;
  }
  if (version < 4) {
    // v3 → v4: cephane deposu robot başına tutuluyordu, artık profilde ORTAK.
    // Eski robot depoları (ve varsa kök `ammo`) toplanıp köke taşınır; adetler
    // silah başına üst sınıra kırpılır. Sanitizasyon normalizeProfile'da yapılır.
    let merged = data.ammo && typeof data.ammo === "object" ? data.ammo : {};
    const oldRobots = data.robots && typeof data.robots === "object" ? data.robots : {};
    for (const rid of Object.keys(oldRobots)) {
      const r = oldRobots[rid];
      if (r && typeof r === "object" && r.ammo) merged = mergeDepots(merged, r.ammo);
    }
    data.ammo = merged;
    data.version = 4;
    version = 4;
  }
  if (version < 5) {
    // v4 → v5: parça envanteri (parts) ve robot loadout'ları eklenir. Mevcut
    // veri (scrap/ammo/robots) HİÇ taşınmaz ve değişmez; boş alanlar
    // normalizeProfile'da üretilir (ekonomiye dokunmayan göç).
    data.version = 5;
    version = 5;
  }
  if (version < 6) {
    // v5 → v6: loadout'ta yuva başına TEK parça vardı (string|null); artık
    // yuva başına İKİ parça tutulur (dizi). Eski değerler [id, null]'a sarılır —
    // dönüşümü sanitizeLoadoutShape yapar, göç yalnız sürümü yükseltir.
    data.version = 6;
    version = 6;
  }
  if (version < 7) {
    // v6 → v7: hesap seviyesi (accountXp) ve açılmış robotlar (unlockedRobots) eklenir.
    // Başlangıç robotları ("kopek", "tavsan") garanti eklenir; geçmişte oynanmış
    // robotlar da korunarak açık sayılır.
    const unlocked = new Set(DEFAULT_UNLOCKED_ROBOTS);
    if (Array.isArray(data.unlockedRobots)) {
      for (const id of data.unlockedRobots) if (id) unlocked.add(id);
    }
    const oldRobots = data.robots && typeof data.robots === "object" ? data.robots : {};
    let totalRobotXp = 0;
    for (const rid of Object.keys(oldRobots)) {
      const r = oldRobots[rid];
      if (r && typeof r === "object") {
        const matches = r.stats && r.stats.matches ? Number(r.stats.matches) : 0;
        const rxp = Number(r.xp) || 0;
        totalRobotXp += rxp;
        if (matches > 0 || rxp > 0) {
          unlocked.add(rid);
        }
      }
    }
    data.unlockedRobots = Array.from(unlocked);
    data.accountXp = toSafeInt(data.accountXp, totalRobotXp);
    data.version = 7;
    version = 7;
  }
  if (version < 8) {
    // v7 → v8: arena bölümleri eklenir; eski profiller ilk bölümden başlar.
    data.arenaUnlockedStage = toSafeInt(data.arenaUnlockedStage, 1);
    data.version = 8;
    version = 8;
  }
  return data;
}

// Her türlü girdi (bozuk/eksik/fazla) için geçerli, negatif olmayan bir profil
// üretir. Girdi mutasyona uğratılmaz; her zaman yeni nesne döner.
function normalizeProfile(raw) {
  const migrated = migrateProfile(raw);
  if (!migrated) return defaultProfile();

  const srcRobots = migrated.robots && typeof migrated.robots === "object" ? migrated.robots : {};
  const robots = {};
  for (const id of Object.keys(srcRobots)) {
    if (!knownRobotId(id)) continue;
    robots[id] = sanitizeRobotProgress(srcRobots[id]);
  }

  const claimed = Array.isArray(migrated.claimedMatches)
    ? migrated.claimedMatches.filter((k) => typeof k === "string" && k).slice(-CLAIMED_MATCH_LIMIT)
    : [];

  // Parça alanı (v5): önce sahip listesi doğrulanır, sonra tüm robotların
  // loadout'ları bu listeye göre çapraz denetlenir.
  const parts = sanitizeParts(migrated.parts);
  _crossValidateLoadouts(robots, parts);

  // Açık robotlar (v7): varsayılanlar + sahip olunan bilinen robotlar
  const rawUnlocked = Array.isArray(migrated.unlockedRobots) ? migrated.unlockedRobots : [];
  const unlockedSet = new Set(DEFAULT_UNLOCKED_ROBOTS);
  for (const id of rawUnlocked) {
    if (knownRobotId(id)) unlockedSet.add(id);
  }
  const unlockedRobots = Array.from(unlockedSet);

  return {
    version: PROFILE_SCHEMA_VERSION,
    scrap: migrated.scrap == null ? START_SCRAP : toSafeInt(migrated.scrap),
    accountXp: Math.min(MAX_ACCOUNT_XP, toSafeInt(migrated.accountXp)),
    unlockedRobots,
    arenaUnlockedStage: clampNumber(toSafeInt(migrated.arenaUnlockedStage, 1), 1, MAX_ARENA_STAGE),
    // Ortak depo market.js'te doğrulanır: bilinmeyen/sınırsız silah kayıtları
    // atılır, adetler üst sınıra çekilir.
    ammo: sanitizeAmmoDepot(migrated.ammo),
    // Parçalar parts.js'te doğrulanır: bilinmeyen id/tekrar atılır, satın
    // alma sırası korunur.
    parts,
    robots,
    claimedMatches: claimed,
    updatedAt: toSafeInt(migrated.updatedAt),
  };
}

function cloneProfile(profile) {
  return normalizeProfile(profile);
}

// ── Okuma / yazma ───────────────────────────────────────────────────────────

// { profile, storageOk } döner. JSON ayrıştırılamazsa bozuk kayıt yok sayılır.
function loadProfile(storage) {
  const store = storage || _storage();
  if (!store) return { profile: defaultProfile(), storageOk: false };
  let raw = null;
  try {
    raw = store.getItem(PROFILE_KEY);
  } catch (_) {
    return { profile: defaultProfile(), storageOk: false };
  }
  if (!raw) return { profile: defaultProfile(), storageOk: true };
  try {
    return { profile: normalizeProfile(JSON.parse(raw)), storageOk: true };
  } catch (_) {
    // Bozuk JSON: bellekte yok say, varsayılanla devam et.
    return { profile: defaultProfile(), storageOk: true, corrupt: true };
  }
}

// Kayıt her karede değil, yalnız ödül/satın alma sonrasında çağrılır.
function saveProfile(profile, storage) {
  const store = storage || _storage();
  if (!store) { notifyStorageFailure(); return false; }
  try {
    const snapshot = normalizeProfile(profile);
    snapshot.updatedAt = Date.now();
    store.setItem(PROFILE_KEY, JSON.stringify(snapshot));
    return true;
  } catch (_) {
    notifyStorageFailure();
    return false;
  }
}

// ── Profil erişimi ──────────────────────────────────────────────────────────

// Var olan kaydı doğrulanmış olarak döndürür; yoksa türetilmiş varsayılan verir
// (profil mutasyona uğratılmaz — okuma yolu).
function getRobotProgress(profile, robotId) {
  const r = profile && profile.robots ? profile.robots[robotId] : null;
  return r ? sanitizeRobotProgress(r) : defaultRobotProgress();
}

// Yazma yolu: kayıt yoksa tembelce oluşturup profile bağlar.
function ensureRobotProgress(profile, robotId) {
  if (!profile.robots) profile.robots = {};
  if (!profile.robots[robotId]) profile.robots[robotId] = defaultRobotProgress();
  profile.robots[robotId] = sanitizeRobotProgress(profile.robots[robotId]);
  return profile.robots[robotId];
}

// ── Ödül ────────────────────────────────────────────────────────────────────

// Uygun bir maç için ödülü profilin derin kopyasına yazar. matchKey daha önce
// talep edildiyse tekrar ödül verilmez. Dönen `profile` yeni aktif profildir.
function grantMatchReward(profile, options) {
  const o = options || {};
  const key = typeof o.matchKey === "string" ? o.matchKey : "";
  if (!key) return { ok: false, reason: "INVALID_MATCH" };
  if (!knownRobotId(o.robotId)) return { ok: false, reason: "INVALID_ROBOT" };
  if (!REWARD_BASE[o.result]) return { ok: false, reason: "INVALID_RESULT" };

  const current = normalizeProfile(profile);
  if (current.claimedMatches.includes(key)) return { ok: false, reason: "ALREADY_CLAIMED" };

  const reward = calculateMatchReward({
    result: o.result,
    difficulty: o.difficulty,
    opponentCount: o.opponentCount,
    combat: o.combat,
  });

  const robot = ensureRobotProgress(current, o.robotId);
  const levelBefore = levelForXp(robot.xp);
  const accLevelBefore = levelForAccountXp(current.accountXp);

  // Hurda ve XP aktarımı
  current.scrap += reward.scrap;
  robot.xp = Math.min(MAX_SERVICE_XP, robot.xp + reward.xp); // son eşikte sabitlenir
  current.accountXp = Math.min(MAX_ACCOUNT_XP, current.accountXp + reward.xp);
  robot.stats.matches += 1;
  if (o.result === "win") robot.stats.wins += 1;

  // Hesap seviyesi atlama ikramiyesi
  const accLevelAfter = levelForAccountXp(current.accountXp);
  const levelUpBonus = accountLevelUpBonus(accLevelBefore, accLevelAfter);
  if (levelUpBonus > 0) {
    current.scrap += levelUpBonus;
  }

  current.claimedMatches.push(key);
  while (current.claimedMatches.length > CLAIMED_MATCH_LIMIT) current.claimedMatches.shift();

  const levelAfter = levelForXp(robot.xp);
  const persisted = saveProfile(current, o.storage);
  return {
    ok: true,
    profile: current,
    scrap: reward.scrap,
    xp: reward.xp,
    levelUpBonus,
    levelBefore,
    levelAfter,
    accLevelBefore,
    accLevelAfter,
    accLevelUp: accLevelAfter > accLevelBefore,
    rewardDetails: reward,
    message: levelAfter > levelBefore ? levelUpMessage(levelBefore, levelAfter) : "",
    persisted,
  };
}

// ── Satın alma ──────────────────────────────────────────────────────────────

// Robot kilit açma (satın alma). Arayüz doğrudan profile.unlockedRobots'a yazmaz.
function unlockRobot(profile, robotId, storage) {
  if (!knownRobotId(robotId)) return { ok: false, reason: "INVALID_ROBOT" };
  const current = normalizeProfile(profile);
  const check = canUnlockRobot(current, robotId);
  if (!check.ok) return check;

  current.scrap -= check.cost;
  if (!current.unlockedRobots.includes(robotId)) {
    current.unlockedRobots.push(robotId);
  }
  const persisted = saveProfile(current, storage);
  return {
    ok: true,
    profile: current,
    cost: check.cost,
    robotId,
    persisted,
  };
}

// Tek giriş noktası. Arayüz doğrudan profile.scrap'i değiştirmez. Başarıda
// { ok, profile, cost, newTier, persisted }; hatada { ok:false, reason }.
// Seviye yetersizse bakiyeye HİÇ dokunulmaz.
function purchaseUpgrade(profile, robotId, branch, storage) {
  if (!knownRobotId(robotId)) return { ok: false, reason: "INVALID_ROBOT" };
  if (!BRANCHES.includes(branch)) return { ok: false, reason: "INVALID_BRANCH" };

  const current = normalizeProfile(profile);
  const robot = ensureRobotProgress(current, robotId);
  const step = nextUpgradeStep(robot, branch);
  if (!step.ok) return { ok: false, reason: step.reason };

  const level = levelForXp(robot.xp);
  if (level < step.requiredLevel) {
    return { ok: false, reason: "LEVEL_REQUIRED", level, requiredLevel: step.requiredLevel };
  }
  if (current.scrap < step.cost) {
    return { ok: false, reason: "SCRAP_REQUIRED", scrap: current.scrap, cost: step.cost };
  }

  // Derin kopya üzerinde uygula, sonucu yeniden doğrula.
  current.scrap -= step.cost;
  robot.upgrades[branch] = step.nextTier;
  if (current.scrap < 0 || robot.upgrades[branch] > MAX_TIER) return { ok: false, reason: "VERIFY_FAILED" };

  const persisted = saveProfile(current, storage);
  return { ok: true, profile: current, cost: step.cost, newTier: step.nextTier, persisted };
}

// Sayfa açılışında bir kez üretilir; maç anahtarını oturumlar arası çakışmadan
// ayırır (tarayıcı yenilenince matchId yeniden başlayabilir).
function createSessionId() {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 0xffffff).toString(36);
  return `${t}-${r}`;
}

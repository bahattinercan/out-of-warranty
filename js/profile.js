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
  if (typeof document === "undefined" || !document || typeof document.getElementById !== "function") return;
  const el = document.getElementById("storage-warning");
  if (!el) return;
  el.textContent = "İlerleme bu oturumda saklanamadı.";
  el.classList.remove("hidden");
}

// ── Varsayılanlar ve doğrulama ──────────────────────────────────────────────

function defaultRobotProgress() {
  // `ammo`: Cephane Pazarı'ndan alınan ve maç başında mermilere yüklenen
  // robot deposu (id -> adet). Şema v3 ile eklendi; eski kayıtlarda yoktur.
  return { xp: 0, upgrades: { chassis: 0, module: 0, core: 0 }, ammo: {}, stats: { matches: 0, wins: 0 } };
}

function defaultProfile() {
  return {
    version: PROFILE_SCHEMA_VERSION,
    scrap: START_SCRAP,
    robots: {},
    claimedMatches: [],
    // Hikâye durumu ayrı alanda tutulur (profil v2). defaultStoryProgress
    // js/story.js'te tanımlıdır; buradan çalışma zamanında çağrıldığı için
    // klasik script yükleme sırası bunu güvenli kılar.
    story: defaultStoryProgress(),
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
    // Cephane deposu market.js'te doğrulanır: bilinmeyen/sınırsız silah
    // kayıtları atılır, adetler üst sınıra çekilir.
    ammo: sanitizeAmmoDepot(src.ammo),
    stats: { matches: toSafeInt(st.matches), wins: toSafeInt(st.wins) },
  };
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
    // v1 → v2: yalnız şema sürümü yükseltilir. Hikâye alanı burada üretilmez;
    // normalizeProfile içindeki normalizeStoryProgress() hem eksik alanları
    // tamamlar hem bozuk veriyi sıfırlar — ekonomiye dokunulmaz.
    data.version = 2;
    version = 2;
  }
  if (version < 3) {
    // v2 → v3: Cephane deposu eklenir. Eksik `ammo` alanı
    // sanitizeRobotProgress içinde boş depoya tamamlanır — ekonomi ve
    // geliştirmeler korunur.
    data.version = 3;
    version = 3;
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

  return {
    version: PROFILE_SCHEMA_VERSION,
    scrap: migrated.scrap == null ? START_SCRAP : toSafeInt(migrated.scrap),
    robots,
    claimedMatches: claimed,
    // Hikâye durumu ayrı alanda tutulur: bozuk/eksik story ekonomiyi ASLA
    // sıfırlamaz, yalnız hikâyeyi ilk göreve döndürür (kilit §10).
    story: normalizeStoryProgress(migrated.story),
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
  });

  const robot = ensureRobotProgress(current, o.robotId);
  const levelBefore = levelForXp(robot.xp);
  current.scrap += reward.scrap;
  robot.xp = Math.min(MAX_SERVICE_XP, robot.xp + reward.xp); // son eşikte sabitlenir
  robot.stats.matches += 1;
  if (o.result === "win") robot.stats.wins += 1;

  current.claimedMatches.push(key);
  while (current.claimedMatches.length > CLAIMED_MATCH_LIMIT) current.claimedMatches.shift();

  const levelAfter = levelForXp(robot.xp);
  const persisted = saveProfile(current, o.storage);
  return {
    ok: true,
    profile: current,
    scrap: reward.scrap,
    xp: reward.xp,
    levelBefore,
    levelAfter,
    message: levelAfter > levelBefore ? levelUpMessage(levelBefore, levelAfter) : "",
    persisted,
  };
}

// ── Satın alma ──────────────────────────────────────────────────────────────

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

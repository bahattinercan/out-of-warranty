/* Silah tanımları — veri-güdümlü.
 * Her silah bir "spec": kimlik + fizik + patlama + mühimmat + özel davranış + gösterim puanları.
 * Projectile ve Game bu spec'i okuyarak davranır; tek silaha özel sabit kalmaz.
 *
 * Özel davranış bayrakları:
 *   bounce / restitution / fuse  -> sekme + fitilli patlama (El Bombası)
 *   bounceFriction               -> sekmede teğetsel hız sönümü; bomba er geç yüzeye oturur
 *   directHitDamage              -> doğrudan oyuncuya çarpınca ek hasar (Keskin Nişancı)
 *   pellets / spread / speedJitter-> tek tetikte birden çok mermi (Pompalı, 3'lü Roket)
 *   cluster / clusterCount / clusterSpec -> patlayınca parçacıklara bölünme (Misket)
 *   sticky / stickFuse           -> değdiği yere yapışıp gecikmeli patlama (Yapışkan Bomba)
 *   splitAtApex                  -> yayın tepesinde bölünme (Tepe Bombası; cluster ile)
 *   airdrop / airdropCount / airdropSpread -> fare hedefine gökten bomba (Bomba Yağmuru)
 *   drill / drillFrames          -> araziyi delip ilerleyip sonra patlama (Matkap)
 *   mine / armFrames / trigger   -> yere bırakılıp yaklaşanı vuran mayın (turlar arası kalıcı)
 *   napalm / fireCount / fireLife / fireDamage -> patlayınca yanan alan bırakma (Napalm)
 *   teleport / passPlayers       -> değdiği noktanın üstüne atıcıyı ışınlar; hasarsız (Işınlanma Topu)
 *   hook / drag / passPlayers    -> yerçekimsiz düz uçar, tutununca atıcıyı ankraja çeker (Kanca);
 *                                   `drag` kare başına hız kaybıdır, güç => fırlatma menzili
 *
 * Gösterim: stats {dmg,speed,radius} 1–5 arası puan (açıklama panelindeki ● göstergeleri).
 *
 * Görsel: `look` bloğu merminin nasıl çizileceğini belirler (bkz. projectile.js).
 *   shape  -> tasarım AİLESİ kimliği (PROJECTILE_SHAPES anahtarı). Aynı cephanenin
 *             farklı adedi/ölçeği aynı shape'i paylaşır (SHARED_SHAPES beyaz listesi);
 *             farklı cephane farklı shape alır. Önizleme de bu çiziciyi kullanır.
 *   orient -> "vel" (burun hıza döner) | "spin" (kendi ekseninde) | "none"
 *   spin   -> "spin" için kare başına radyan
 *   tail   -> iz stili: flame | smoke | spark | drip | mist | air | none
 *   size   -> görsel ölçek (çarpışma yarıçapını DEĞİŞTİRMEZ)
 *   accent -> ikincil renk (kanat/pim/LED/çekirdek); glow -> dış parlaklık rengi
 *   fuseFx -> fitilli mermilerde kıvılcım + son saniye uyarı halkası
 */
const WEAPONS = [
  {
    id: "bazooka", name: "Bazuka", icon: "🚀",
    desc: "Dengeli roket. Çarptığı yerde patlar.",
    baseSpeed: 6, speedMul: 16, gravity: 0.9, windFactor: 0.02,
    radius: 38, damage: 46, knockback: 9, ammo: Infinity,
    special: "Dengeli",
    trailColor: "rgba(255,180,60,", ballColor: "#2b2b2b", ringColor: "#ffb347",
    look: { shape: "rocket", orient: "vel", tail: "flame", accent: "#fff2c4", glow: "#ffb347" },
  },
  {
    id: "grenade", name: "El Bombası", icon: "💣",
    desc: "Sekerek ilerler, fitili dolunca patlar.",
    baseSpeed: 5, speedMul: 14, gravity: 1.0, windFactor: 0.015,
    radius: 46, damage: 40, knockback: 11, ammo: 3,
    bounce: true, restitution: 0.55, bounceFriction: 0.86, fuse: 110, // ~1.8 sn @60fps
    battleMax: 5, special: "Sekiyor • fitil",
    trailColor: "rgba(120,200,120,", ballColor: "#2e4d2e", ringColor: "#6fdc6f",
    look: { shape: "grenade", orient: "spin", spin: 0.06, tail: "smoke", accent: "#c8ccd4", fuseFx: true },
  },
  {
    id: "sniper", name: "Keskin Nişancı", icon: "🎯",
    desc: "Çok hızlı ve düz uçar; isabet edene ağır hasar.",
    baseSpeed: 14, speedMul: 22, gravity: 0.25, windFactor: 0.005,
    radius: 16, damage: 30, knockback: 6, directHitDamage: 40, ammo: 2,
    battleMax: 3, special: "Hızlı • delici",
    trailColor: "rgba(255,90,90,", ballColor: "#5a1414", ringColor: "#ff6b6b",
    look: { shape: "needle", orient: "vel", tail: "spark", accent: "#ffe6e6", glow: "#ff6b6b" },
  },
  {
    id: "shotgun", name: "Pompalı", icon: "🔫",
    desc: "Tek tetikte 5 saçma; yelpaze açar, kısa menzil.",
    baseSpeed: 9, speedMul: 16, gravity: 0.7, windFactor: 0.015,
    radius: 18, damage: 16, knockback: 4, ammo: 2,
    pellets: 5, spread: 0.5, speedJitter: 0.12,
    battleMax: 4, special: "5 saçma",
    trailColor: "rgba(255,210,120,", ballColor: "#4a3a1a", ringColor: "#ffd27a",
    look: { shape: "pellet", orient: "spin", spin: 0.45, tail: "none", accent: "#ffe9b0" },
  },
  {
    id: "cluster", name: "Misket", icon: "☄️",
    desc: "Patlayınca parçacıklara bölünür, çoklu patlama yapar.",
    baseSpeed: 6, speedMul: 15, gravity: 0.9, windFactor: 0.02,
    radius: 30, damage: 28, knockback: 7, ammo: 1,
    cluster: true, clusterCount: 5,
    clusterSpec: {
      id: "bomblet", gravity: 1.0, windFactor: 0.02,
      radius: 22, damage: 18, knockback: 5,
      trailColor: "rgba(200,150,255,", ballColor: "#3a2a4d", ringColor: "#c89bff",
      look: { shape: "bomblet", orient: "spin", spin: 0.25, tail: "smoke", accent: "#e0c8ff" },
    },
    battleMax: 3, special: "Havada bölünür",
    trailColor: "rgba(200,150,255,", ballColor: "#3a2a4d", ringColor: "#c89bff",
    look: { shape: "canister", orient: "spin", spin: 0.12, tail: "smoke", accent: "#e0c8ff" },
  },
  {
    id: "triple", name: "3'lü Roket", icon: "🎆",
    desc: "Aynı anda 3 roket atar; yelpaze açar.",
    baseSpeed: 7, speedMul: 16, gravity: 0.85, windFactor: 0.02,
    radius: 30, damage: 28, knockback: 7, ammo: 2,
    pellets: 3, spread: 0.32, speedJitter: 0.05,
    battleMax: 4, special: "3 roket • yelpaze",
    trailColor: "rgba(255,160,80,", ballColor: "#3a2410", ringColor: "#ff9a4d",
    look: { shape: "rocket", orient: "vel", tail: "flame", accent: "#fff2c4", glow: "#ff9a4d" },
  },
  {
    id: "sticky", name: "Yapışkan Bomba", icon: "🟢",
    desc: "Değdiği yere yapışır, kısa fitille patlar.",
    baseSpeed: 6, speedMul: 15, gravity: 0.85, windFactor: 0.018,
    radius: 44, damage: 44, knockback: 10, ammo: 2,
    sticky: true, stickFuse: 55, // yapıştıktan ~0.9 sn sonra patlar
    battleMax: 4, special: "Yapışır • fitil",
    trailColor: "rgba(120,230,120,", ballColor: "#1f5c1f", ringColor: "#7CFF6B",
    look: { shape: "blob", orient: "spin", spin: 0.05, tail: "drip", accent: "#d6ffcf", fuseFx: true },
  },

  // ── Geniş arena cephaneliği ────────────────────────────────────────────
  {
    id: "rubber", name: "Lastik Bomba", icon: "🟣",
    desc: "Duvarlardan çok seker; fitili dolunca patlar.",
    baseSpeed: 6, speedMul: 15, gravity: 0.9, windFactor: 0.02,
    radius: 40, damage: 34, knockback: 10, ammo: 3,
    bounce: true, restitution: 0.85, bounceFriction: 0.94, fuse: 150,
    battleMax: 6, special: "Çok seker • fitil",
    trailColor: "rgba(190,120,255,", ballColor: "#3a1f5c", ringColor: "#b97cff",
    look: { shape: "rubber_ball", orient: "spin", spin: 0.3, tail: "none", accent: "#e6d4ff" },
  },
  {
    id: "rubbertrio", name: "Lastik Üçlü", icon: "🟪",
    desc: "Üç sekzıp bomba; yelpaze açar.",
    baseSpeed: 6, speedMul: 14, gravity: 0.95, windFactor: 0.02,
    radius: 32, damage: 24, knockback: 8, ammo: 2,
    pellets: 3, spread: 0.5, speedJitter: 0.08,
    bounce: true, restitution: 0.8, bounceFriction: 0.92, fuse: 130,
    battleMax: 4, special: "3 sekzıp",
    trailColor: "rgba(170,120,235,", ballColor: "#33205a", ringColor: "#a98cf0",
    look: { shape: "rubber_ball", orient: "spin", spin: 0.3, tail: "none", accent: "#d9c6ff" },
  },
  {
    id: "grenadetrio", name: "El Bombası Üçlüsü", icon: "🧨",
    desc: "Üç el bombası; yelpaze açar, fitille patlar.",
    baseSpeed: 5, speedMul: 13, gravity: 1.0, windFactor: 0.015,
    radius: 36, damage: 28, knockback: 9, ammo: 2,
    pellets: 3, spread: 0.42,
    bounce: true, restitution: 0.5, bounceFriction: 0.86, fuse: 100,
    battleMax: 4, special: "3 bomba • fitil",
    trailColor: "rgba(120,200,120,", ballColor: "#2e4d2e", ringColor: "#6fdc6f",
    look: { shape: "grenade", orient: "spin", spin: 0.06, tail: "smoke", accent: "#c8ccd4", fuseFx: true },
  },
  {
    id: "megacluster", name: "Mega Misket", icon: "💫",
    desc: "Patlayınca 8 parçacığa bölünür.",
    baseSpeed: 6, speedMul: 14, gravity: 0.9, windFactor: 0.02,
    radius: 34, damage: 30, knockback: 8, ammo: 1,
    cluster: true, clusterCount: 8,
    clusterSpec: {
      id: "megabomblet", gravity: 1.0, windFactor: 0.02,
      radius: 24, damage: 20, knockback: 6,
      trailColor: "rgba(255,170,90,", ballColor: "#4d2f0a", ringColor: "#ffb347",
      look: { shape: "bomblet", orient: "spin", spin: 0.25, tail: "smoke", accent: "#ffd9a0", size: 1.1 },
    },
    battleMax: 2, special: "8 parçacık",
    trailColor: "rgba(255,170,90,", ballColor: "#4d2f0a", ringColor: "#ffb347",
    look: { shape: "canister", orient: "spin", spin: 0.12, tail: "smoke", accent: "#ffd9a0", size: 1.15 },
  },
  {
    id: "nuke", name: "Nükleer", icon: "☢️",
    desc: "Devasa patlama. Yavaş ama yıkıcı.",
    baseSpeed: 5, speedMul: 13, gravity: 0.95, windFactor: 0.018,
    radius: 84, damage: 80, knockback: 18, ammo: 1,
    battleMax: 2, special: "Devasa patlama",
    trailColor: "rgba(180,255,140,", ballColor: "#1f3a0f", ringColor: "#9bff5c",
    look: { shape: "nuke", orient: "spin", spin: 0.03, tail: "smoke", accent: "#e8ffb0", glow: "#9bff5c" },
  },
  {
    id: "barrage", name: "Roket Demeti", icon: "🎇",
    desc: "Tek tetikte 5 roket; geniş yelpaze.",
    baseSpeed: 8, speedMul: 16, gravity: 0.85, windFactor: 0.02,
    radius: 26, damage: 22, knockback: 6, ammo: 1,
    pellets: 5, spread: 0.7, speedJitter: 0.06,
    battleMax: 3, special: "5 roket",
    trailColor: "rgba(255,140,60,", ballColor: "#3a2410", ringColor: "#ff8c1a",
    look: { shape: "rocket", orient: "vel", tail: "flame", accent: "#fff2c4", glow: "#ff8c1a" },
  },
  {
    id: "mirv", name: "Tepe Bombası", icon: "🌠",
    desc: "Yayın tepesinde parçacıklara bölünür.",
    baseSpeed: 7, speedMul: 17, gravity: 0.8, windFactor: 0.02,
    radius: 24, damage: 18, knockback: 6, ammo: 2,
    splitAtApex: true, cluster: true, clusterCount: 5,
    clusterSpec: {
      id: "mirvlet", gravity: 1.0, windFactor: 0.02,
      radius: 24, damage: 22, knockback: 6,
      trailColor: "rgba(120,200,255,", ballColor: "#1f3a5c", ringColor: "#7cc0ff",
      look: { shape: "bomblet", orient: "spin", spin: 0.25, tail: "smoke", accent: "#dff0ff" },
    },
    battleMax: 3, special: "Tepede bölünür",
    trailColor: "rgba(120,200,255,", ballColor: "#1f3a5c", ringColor: "#7cc0ff",
    look: { shape: "mirv", orient: "vel", tail: "smoke", accent: "#dff0ff" },
  },
  {
    id: "airstrike", name: "Bomba Yağmuru", icon: "✈️",
    desc: "Fare hedefine gökten 6 bomba yağar.",
    baseSpeed: 6, speedMul: 14, gravity: 1.0, windFactor: 0.01,
    radius: 30, damage: 24, knockback: 7, ammo: 1,
    airdrop: true, airdropCount: 6, airdropSpread: 90,
    battleMax: 2, special: "Gökten saldırı",
    trailColor: "rgba(255,120,120,", ballColor: "#3a1010", ringColor: "#ff6b6b",
    look: { shape: "bomb", orient: "vel", tail: "smoke", accent: "#d8dde6" },
  },
  {
    id: "drill", name: "Matkap", icon: "⛏️",
    desc: "Araziyi delip ilerler, sonra patlar.",
    baseSpeed: 11, speedMul: 18, gravity: 0.6, windFactor: 0.008,
    radius: 30, damage: 34, knockback: 8, ammo: 2,
    drill: true, drillFrames: 14,
    battleMax: 4, special: "Delici",
    trailColor: "rgba(200,200,210,", ballColor: "#3a3a40", ringColor: "#cfcfd6",
    look: { shape: "drill", orient: "vel", tail: "spark", accent: "#f0f0f5" },
  },
  {
    id: "mine", name: "Mayın", icon: "🔴",
    desc: "Yere bırakılır; kurulunca yaklaşanı vurur.",
    baseSpeed: 5, speedMul: 13, gravity: 1.0, windFactor: 0.015,
    radius: 40, damage: 42, knockback: 11, ammo: 2,
    mine: true, armFrames: 40, trigger: 34,
    battleMax: 5, special: "Yaklaşınca patlar",
    trailColor: "rgba(255,90,90,", ballColor: "#3a0f0f", ringColor: "#ff5e5e",
    look: { shape: "mine", orient: "none", tail: "smoke", accent: "#ffb3b3" },
  },
  {
    id: "napalm", name: "Napalm", icon: "🔥",
    desc: "Patlar ve yanan bir alan bırakır.",
    baseSpeed: 6, speedMul: 15, gravity: 0.9, windFactor: 0.02,
    radius: 30, damage: 26, knockback: 7, ammo: 1,
    napalm: true, fireCount: 10, fireLife: 150, fireDamage: 4, fireSpread: 44,
    battleMax: 3, special: "Yanan alan",
    trailColor: "rgba(255,140,40,", ballColor: "#4d1f08", ringColor: "#ff8c1a",
    look: { shape: "napalm", orient: "vel", tail: "flame", accent: "#ffd27a" },
  },
  // ── Yardımcı cephaneler: hasar vermez, konum değiştirir ──────────────────
  {
    id: "teleportball", name: "Işınlanma Topu", icon: "🔮",
    desc: "Topun değdiği yerin üstüne ışınlanırsın; hasar vermez.",
    baseSpeed: 6, speedMul: 15, gravity: 0.95, windFactor: 0.02,
    radius: 12, damage: 0, knockback: 0, ammo: 2,
    teleport: true, passPlayers: true,
    projRadius: 5,
    battleMax: 5, special: "Işınlanır",
    trailColor: "rgba(150,120,255,", ballColor: "#2a1f4d", ringColor: "#a97cff",
    look: { shape: "teleport_ball", orient: "spin", spin: 0.35, tail: "mist", accent: "#e6d4ff", glow: "#b97cff" },
  },
  {
    id: "hook", name: "Kanca", icon: "🪝",
    desc: "Düz uçar, tutunduğu noktaya seni çeker; hasar vermez.",
    baseSpeed: 12, speedMul: 22, gravity: 0, windFactor: 0,
    radius: 12, damage: 0, knockback: 0, ammo: 2,
    hook: true, passPlayers: true, drag: 0.05, // sürtünme: güç -> menzil
    projRadius: 5,
    battleMax: 5, special: "Çekiş",
    trailColor: "rgba(200,205,225,", ballColor: "#3a3a44", ringColor: "#cfcfd6",
    look: { shape: "hook", orient: "vel", tail: "spark", accent: "#f0f0f5" },
  },
];

/* ── Gösterim puanları (elle yazılmaz) ─────────────────────────────────────
 * Puanlar silahın GERÇEK sayılarından türetilir; böylece pazar/açıklama
 * noktaları ile denge tablosu asla çelişmez. Tavan alanı `battleMax` ise
 * maçta kullanılabilecek en fazla atıştır (taban mühimmat dâhil); depo ne
 * kadar dolu olursa olsun bu sınırı aşamaz (bkz. market.js > battleLoad).
 */
const WEAPON_RATING_DMG = [17, 34, 51, 76];   // puan üst sınırları
const WEAPON_RATING_RADIUS = [18, 29, 39, 55];
const WEAPON_RATING_SPEED = [4, 6, 9, 13];

function _ratingFor(value, thresholds) {
  const v = Number.isFinite(value) ? value : 0;
  for (let i = 0; i < thresholds.length; i++) if (v <= thresholds[i]) return i + 1;
  return 5;
}

/* Tek atışta tek hedefe "gerçekçi" hasar. Çoklu mermilerin hepsi isabet etmez:
 * saçma/yelpaze mermilerinde ilk mermi tam, kalanı yarım; parçacıklarda
 * (cluster) her parçacık yarım; gökten yağmada ilk bomba tam, kalanı yarım.
 * Mayın tetiklenmeye bağlı olduğu için alan cezası alır. */
function weaponPowerScore(spec) {
  if (!spec) return 0;
  const dmg = toSafeInt(spec.damage, 0);
  if (dmg <= 0) return 0;                       // hasarsız yardımcı cephane
  let extra = 0;
  if (Number.isFinite(spec.pellets) && spec.pellets > 1) {
    extra = (spec.pellets - 1) * dmg * 0.5;
  } else if (spec.cluster && spec.clusterSpec && Number.isFinite(spec.clusterCount)) {
    // Parçacık hasarı ana gövdeden farklıdır (clusterSpec.damage).
    extra = spec.clusterCount * toSafeInt(spec.clusterSpec.damage, 0) * 0.5;
  } else if (spec.airdrop && Number.isFinite(spec.airdropCount)) {
    extra = (spec.airdropCount - 1) * dmg * 0.5;
  }
  let p = dmg + extra;
  if (Number.isFinite(spec.directHitDamage)) p += spec.directHitDamage * 0.5;
  if (spec.napalm && Number.isFinite(spec.fireDamage) && Number.isFinite(spec.fireCount)) {
    p += spec.fireDamage * spec.fireCount * 0.5;
  }
  if (spec.mine) p *= 0.8;
  return Math.round(p);
}

// Açıklama panelindeki ● göstergeleri: { dmg, speed, radius } 0–5.
function weaponStats(spec) {
  const p = weaponPowerScore(spec);
  return {
    dmg: p <= 0 ? 0 : _ratingFor(p, WEAPON_RATING_DMG),
    speed: _ratingFor(spec && spec.baseSpeed, WEAPON_RATING_SPEED),
    radius: _ratingFor(spec && spec.radius, WEAPON_RATING_RADIUS),
  };
}

// Yeni bir oyun için mühimmat sayacı (id -> kalan adet).
function initialAmmo() {
  const a = {};
  for (const w of WEAPONS) a[w.id] = w.ammo;
  return a;
}

/* Dahili fırlatıcı modüllerinin ürettiği mermi spec'leri. Eski anahtar adları
 * davranış ve test uyumluluğu için korunur. Projectile + explode aynı veri-güdümlü alanları
 * okur (silahlarla aynı sözleşme). `poison` alanı isabet eden hedefe DoT bulaştırır.
 */
const SKILL_PROJECTILES = {
  fireball: { // FIRIN-3 — cüruf küresi
    id: "fireball", gravity: 0.5, windFactor: 0.01, projRadius: 5,
    radius: 36, damage: 32, knockback: 8,
    trailColor: "rgba(255,120,40,", ballColor: "#5a1e0a", ringColor: "#ff7a2a",
    look: { shape: "fireball", orient: "spin", spin: 0.22, tail: "flame", accent: "#fff3d0", glow: "#ff7a2a" },
  },
  fish: { // SOĞUT-2 — soğutucu kapsül
    id: "fish", gravity: 0.85, windFactor: 0.015, projRadius: 4,
    radius: 26, damage: 20, knockback: 6,
    trailColor: "rgba(120,200,255,", ballColor: "#1d3a5a", ringColor: "#7ac8ff",
    look: { shape: "capsule", orient: "vel", tail: "mist", accent: "#dff2ff" },
  },
  acorn: { // CİV-1 — patlayan cıvata
    id: "acorn", gravity: 0.95, windFactor: 0.02, projRadius: 4,
    radius: 32, damage: 28, knockback: 7,
    trailColor: "rgba(180,130,70,", ballColor: "#4a3115", ringColor: "#c79355",
    look: { shape: "bolt", orient: "spin", spin: 0.2, tail: "none", accent: "#f2e2c4" },
  },
  quill: { // PERÇİN-3 — perçin (hızlı, düz)
    id: "quill", gravity: 0.3, windFactor: 0.006, projRadius: 3,
    radius: 16, damage: 18, knockback: 4,
    trailColor: "rgba(220,220,220,", ballColor: "#33312c", ringColor: "#d8d8d8",
    look: { shape: "rivet", orient: "vel", tail: "spark", accent: "#ffffff" },
  },
  tornado: { // FAN-5 — basınç girdabı
    id: "tornado", gravity: 0.2, windFactor: 0.03, projRadius: 6,
    radius: 30, damage: 16, knockback: 11,
    trailColor: "rgba(200,230,255,", ballColor: "#3a4a5a", ringColor: "#bfe0ff",
    look: { shape: "vortex", orient: "spin", spin: 0.25, tail: "air", accent: "#ffffff" },
  },
  venom: { // ASİT-6 — aşındırıcı sıvı
    id: "venom", gravity: 0.7, windFactor: 0.015, projRadius: 4,
    radius: 24, damage: 14, knockback: 4,
    poison: { dps: 8, turns: 3 },
    trailColor: "rgba(140,220,90,", ballColor: "#2c4a1c", ringColor: "#8cdc5a",
    look: { shape: "acid", orient: "spin", spin: 0.08, tail: "drip", accent: "#d6ff9e" },
  },
};

/* Mermi spec'ini KİMLİKTEN çözer: ana cephane (`WEAPONS`), misket/tepe
 * PARÇACIKLARI (`clusterSpec`) ve yetenek mermileri (`SKILL_PROJECTILES`).
 * Çevrimiçi misafir yalnız kimlik taşır (`js/net/state.js >
 * netRebuildProjectiles` / `netRebuildMines`); yalnız `WEAPONS`'a bakan
 * `weaponById` parçacıkları ve yetenek mermilerini BULAMIYORDU, bu yüzden
 * misafirde hiç kurulmuyorlardı (kullanıcı bildirimi: "misket silahının
 * parçaları görünmüyor"). */
function projectileSpecById(id) {
  if (typeof id !== "string" || !id) return null;
  if (Array.isArray(WEAPONS)) {
    for (const w of WEAPONS) {
      if (!w) continue;
      if (w.id === id) return w;
      if (w.clusterSpec && w.clusterSpec.id === id) return w.clusterSpec;
    }
  }
  const skill = SKILL_PROJECTILES ? SKILL_PROJECTILES[id] : null;
  return skill || null;
}

// Çeviri katmanı: katalog yüklendiği anda seçili dili uygula. i18n.js bu
// dosyadan önce yüklenir; katalog çevirisi (DATA_CATALOGS) dil değişiminde
// setLocale içinde, ilk yüklemede ise burada uygulanır — böylece sondalar gibi
// betik yükleme anında çizen sayfalar da doğru dilde çizer.
if (typeof applyDataTranslations === "function") applyDataTranslations();

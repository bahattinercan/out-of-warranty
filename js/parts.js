/* Parça pazarı ve robot takma katmanı (eklenti ekonomisi) — saf katman
 * (DOM'a ve localStorage'a dokunmaz, tıpkı market.js/progression.js gibi
 * tarayıcısız test edilir).
 *
 * Kural: parçalar BENZERSİZDİR — her parçadan en fazla 1 adet satın alınır
 * (buyPart). Sahip olunan parça profile.parts'ta bekler (envanter); Atölye
 * her parçayı bir robotun YUVASINA takar (equipPart) veya söker. Takılı
 * parça kalıcıdır: maç başında resolveRobotBuild() (progression.js) parça
 * etkilerini geliştirme kademeleriyle AYNI tek-çarpan disiplininde
 * birleştirir. Cephanenin tersine parça tüketilmez; maç sonu iade akışı
 * gerekmez — satın alma bir kere yapılır, etkisi kayıttan maça taşınır.
 *
 * Yuvalar robot anatomisiyle birebir uyuşur: kask (face/vizör), gövde
 * (kasa), aparat (attachment), ayak (locomotion). Her yuvada tam 3 parça:
 * yeni parça eklemek kod değil veri eklemektir (bkz. CLAUDE.md).
 *
 * Etki eksenleri (v1) bilinçli olarak mevcut build çıktılarıyla sınırlıdır:
 * maxHp/armor/stamina düz toplam; silah hasarı/modül gücü/savrulma
 * yüzdelik; modül cooldown düz indirim (tur). Yeni fizik alanı eklenmez —
 * böylece AI, mermi ve puanlama kodu dokunulmaz kalır
 * (bkz. docs/market-parts-plan.md §6).
 *
 * Takma kuralı: parçalar robota KİLİTLİ DEĞİLDİR — bir parça satın alındıktan
 * sonra istenen her robota takılıp sökülebilir ve aynı anda birden çok robotta
 * durabilir (kopya gerekmez). Sökme ücretsizdir; geri satış v1'de yoktur.
 * Loadout yalnız "hangi robotta hangi yuva ne taşıyor" bilgisini tutar; aynı
 * parçanın birden çok robotta görünmesi geçerlidir.
 */

// ── Yuvalar ──────────────────────────────────────────────────────────────────

const PART_SLOTS = ["helmet", "body", "tool", "feet"];
const SLOT_LABELS = { helmet: "Kask", body: "Gövde", tool: "Aparat", feet: "Ayak" };
// Yuva başına takılabilecek parça sayısı (şema v6): robot başına 4 yuva × 2 =
// 8 parça. loadout[yuva] her zaman bu uzunlukta bir dizidir ([id|null, id|null]).
const PARTS_PER_SLOT = 2;

// ── Katalog (v2: yuva başına 6 parça = 24 parça; fiyat bandı 40–130 Hurda) ──
//
// effects birimleri: maxHpFlat/staminaFlat adet (tam sayı);
// armorFlat/knockbackRedPct/weaponDamagePct/powerPct/maxHpPct/jumpPowerMult/
// moveSpeedMult kesir (0.05 = +%5); cooldownFlat tur (tam sayı). Birden çok
// eksen taşıyan parçalar (ör. Zırh Kaskı) toplanır — kombinasyon kimliği verir.
// icon, 40 px pazar kartı ikonunu tanımlar: shape PART_ICON_SHAPES'te çizilir.
const PARTS = [
  // ── Kask: nişan, algı ve baş zırhı ────────────────────────────────────────
  { id: "nisan_mercegi", label: "Nişan Merceği", slot: "helmet", price: 60,
    desc: "Silah mermileri +%5 daha ağır vurur",
    effects: { weaponDamagePct: 0.05 },
    icon: { shape: "lens", tint: "#62d9ff", accent: "#cdefff" } },
  { id: "termal_vizor", label: "Termal Vizör", slot: "helmet", price: 70,
    desc: "Modül gücü +%6",
    effects: { powerPct: 0.06 },
    icon: { shape: "visor", tint: "#ff9b6b", accent: "#ffe0d0" } },
  { id: "denge_sensoru", label: "Denge Sensörü", slot: "helmet", price: 50,
    desc: "Savrulmayı %10 azaltır",
    effects: { knockbackRedPct: 0.10 },
    icon: { shape: "gyro", tint: "#b9f1ff", accent: "#eafaff" } },
  { id: "hedef_takip", label: "Hedef Takip Ünitesi", slot: "helmet", price: 95,
    desc: "Silah mermileri +%8 daha ağır vurur",
    effects: { weaponDamagePct: 0.08 },
    icon: { shape: "lens", tint: "#ffd166", accent: "#fff3c4" } },
  { id: "radar_anteni", label: "Radar Anteni", slot: "helmet", price: 90,
    desc: "Modül gücü +%9",
    effects: { powerPct: 0.09 },
    icon: { shape: "visor", tint: "#d99aff", accent: "#f4e0ff" } },
  { id: "zirh_kaski", label: "Zırh Kaskı", slot: "helmet", price: 80,
    desc: "Zırh +%4 • savrulma −%5",
    effects: { armorFlat: 0.04, knockbackRedPct: 0.05 },
    icon: { shape: "armorHelm", tint: "#9fb6c9", accent: "#eef5ff" } },

  // ── Gövde: dayanım ve enerji ──────────────────────────────────────────────
  { id: "lehim_yamasi", label: "Lehim Yaması", slot: "body", price: 40,
    desc: "Can üst sınırı +15",
    effects: { maxHpFlat: 15 },
    icon: { shape: "weldPatch", tint: "#63e6be", accent: "#d7ffef" } },
  { id: "kompozit_plaka", label: "Kompozit Plaka", slot: "body", price: 75,
    desc: "Zırh +%6",
    effects: { armorFlat: 0.06 },
    icon: { shape: "plate", tint: "#9fb6c9", accent: "#eef5ff" } },
  { id: "sogutucu_radyator", label: "Soğutucu Radyatör", slot: "body", price: 55,
    desc: "Enerji üst sınırı +10",
    effects: { staminaFlat: 10 },
    icon: { shape: "radiator", tint: "#7ac8ff", accent: "#e8f8ff" } },
  { id: "takviyeli_govde", label: "Takviyeli Gövde", slot: "body", price: 100,
    desc: "Can +%10",
    effects: { maxHpPct: 0.10 },
    icon: { shape: "plate", tint: "#63e6be", accent: "#d7ffef" } },
  { id: "cift_kat_plaka", label: "Çift Kat Plaka", slot: "body", price: 110,
    desc: "Zırh +%9",
    effects: { armorFlat: 0.09 },
    icon: { shape: "plate", tint: "#ffce7a", accent: "#fff0d0" } },
  { id: "basinc_hucre", label: "Basınç Hücresi", slot: "body", price: 85,
    desc: "Enerji +14 • can +8",
    effects: { staminaFlat: 14, maxHpFlat: 8 },
    icon: { shape: "radiator", tint: "#ff9b6b", accent: "#ffe0d0" } },

  // ── Aparat: modül verimi ─────────────────────────────────────────────────
  { id: "yedek_yukleyici", label: "Yedek Yükleyici", slot: "tool", price: 95,
    desc: "Modül cooldown 1 tur kısalır (alt sınır 2)",
    effects: { cooldownFlat: 1 },
    icon: { shape: "loader", tint: "#ffce7a", accent: "#fff0d0" } },
  { id: "takviye_bobini", label: "Takviye Bobini", slot: "tool", price: 70,
    desc: "Modül gücü +%8",
    effects: { powerPct: 0.08 },
    icon: { shape: "coil", tint: "#d99aff", accent: "#f4e0ff" } },
  { id: "hassas_ayar_civtasi", label: "Hassas Ayar Cıvatası", slot: "tool", price: 45,
    desc: "Silah hasarı +%4",
    effects: { weaponDamagePct: 0.04 },
    icon: { shape: "bolt", tint: "#d8d8d8", accent: "#ffffff" } },
  { id: "asiri_yuk_bobini", label: "Aşırı Yük Bobini", slot: "tool", price: 110,
    desc: "Modül gücü +%12",
    effects: { powerPct: 0.12 },
    icon: { shape: "coil", tint: "#ff6b9b", accent: "#ffd0e0" } },
  { id: "namlu_aparati", label: "Namlu Aparatı", slot: "tool", price: 85,
    desc: "Silah hasarı +%7",
    effects: { weaponDamagePct: 0.07 },
    icon: { shape: "bolt", tint: "#8fd9c4", accent: "#d8fff1" } },
  { id: "zamanlayici_cip", label: "Zamanlayıcı Çip", slot: "tool", price: 125,
    desc: "Modül cooldown −1 tur • modül gücü +%4",
    effects: { cooldownFlat: 1, powerPct: 0.04 },
    icon: { shape: "chip", tint: "#6ff7ff", accent: "#d8ffff" } },

  // ── Ayak: hareket ve denge ───────────────────────────────────────────────
  { id: "denge_jiroskobu", label: "Denge Jiroskobu", slot: "feet", price: 55,
    desc: "Savrulmayı %12 azaltır",
    effects: { knockbackRedPct: 0.12 },
    icon: { shape: "damping", tint: "#91e36a", accent: "#d8ffc0" } },
  { id: "yay_takozlari", label: "Yay Takozları", slot: "feet", price: 50,
    desc: "Enerji üst sınırı +8",
    effects: { staminaFlat: 8 },
    icon: { shape: "springPad", tint: "#8ee7ff", accent: "#e8f8ff" } },
  { id: "turbo_palet", label: "Turbo Palet", slot: "feet", price: 90,
    desc: "Hareket hızı +%10",
    effects: { moveSpeedMult: 0.10 },
    icon: { shape: "turboPad", tint: "#ffcc66", accent: "#fff0c0" } },
  { id: "sicrama_yayi", label: "Sıçrama Yayı", slot: "feet", price: 75,
    desc: "Sıçrama gücü +%10",
    effects: { jumpPowerMult: 0.10 },
    icon: { shape: "jumpPad", tint: "#8ee7ff", accent: "#e8f8ff" } },
  { id: "kilitli_taban", label: "Kilitli Taban", slot: "feet", price: 95,
    desc: "Savrulmayı %15 azaltır",
    effects: { knockbackRedPct: 0.15 },
    icon: { shape: "damping", tint: "#ffce7a", accent: "#fff0d0" } },
  { id: "cift_turbo", label: "Çift Turbo Palet", slot: "feet", price: 130,
    desc: "Hareket hızı +%16",
    effects: { moveSpeedMult: 0.16 },
    icon: { shape: "turboPad", tint: "#ff7b7b", accent: "#ffd0d0" } },
];

function partById(partId) {
  if (typeof partId !== "string") return null;
  return PARTS.find((p) => p && p.id === partId) || null;
}

// ── Doğrulama ────────────────────────────────────────────────────────────────

// Diziden geçerli sahip listesi üretir: bilinmeyen id'ler atılır, tekrarlar
// ayıklanır, satın alma sırası korunur. Girdi mutasyona uğratılmaz.
function sanitizeParts(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (typeof item !== "string" || !partById(item)) continue;
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

// Loadout'un ŞEKİL doğrulaması: her yuva PARTS_PER_SLOT elemanlı bir diziye
// dönüşür. Eski kayıtlar (v5: tek id ya da null) otomatik olarak [id, null]'a
// sarılır. Kurallar: yuvasıyla uyuşmayan/bilinmeyen parça null'a düşer, AYNI
// parça bir yuvada iki kez bulunamaz (etki ikiye katlanmasın), dizi hep tam
// uzunlukta olur. KONUMLAR KORUNUR — boşluklar sola toplanmaz, aksi hâlde
// oyuncunun 2. alt yuvaya koyduğu parça 1. yuvaya kayardı.
// SAHİPLİK buraya bakmaz — profil köküyle çapraz denetim profile.js'in işidir.
function sanitizeLoadoutShape(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const slot of PART_SLOTS) {
    const value = src[slot];
    const list = Array.isArray(value) ? value.slice(0, PARTS_PER_SLOT) : value == null ? [] : [value];
    const picked = [];
    for (let i = 0; i < PARTS_PER_SLOT; i++) {
      const item = list[i];
      const part = partById(item);
      const ok = !!part && part.slot === slot && !picked.includes(item);
      picked.push(ok ? item : null);
    }
    out[slot] = picked;
  }
  return out;
}

// Loadout'taki tüm takılı parça id'leri (yuva sırası, boşlar atlanır).
function loadoutPartIds(loadout) {
  const lo = sanitizeLoadoutShape(loadout);
  const ids = [];
  for (const slot of PART_SLOTS) {
    for (const id of lo[slot]) if (id) ids.push(id);
  }
  return ids;
}

// ── Okuma yolları ────────────────────────────────────────────────────────────

// Profildeki sahip olunan parçalar (okuma; profili değiştirmez).
function getOwnedParts(profile) {
  return sanitizeParts(profile ? profile.parts : null);
}

function isPartOwned(profile, partId) {
  return getOwnedParts(profile).includes(partId);
}

// Takılı parçaların kısa özeti: "Kask: Nişan Merceği, Termal Vizör • Gövde: —
// • Aparat: … • Ayak: …". Boş yuva "—" ile gösterilir.
function buildPartsSummary(loadout) {
  const lo = sanitizeLoadoutShape(loadout);
  return PART_SLOTS.map((slot) => {
    const labels = lo[slot].map((id) => { const p = partById(id); return p ? p.label : null; }).filter(Boolean);
    return `${SLOT_LABELS[slot]}: ${labels.length ? labels.join(", ") : "—"}`;
  }).join(" • ");
}

// ── Satın alma ───────────────────────────────────────────────────────────────

/* Tek giriş noktası (buyAmmo deseni); arayüz profile.parts/scrap'e doğrudan
 * dokunmaz. Başarıda { ok, profile, cost, ownedCount, persisted };
 * hatada { ok:false, reason }: INVALID_PART | ALREADY_OWNED |
 * SCRAP_REQUIRED | VERIFY_FAILED. Parça benzersiz olduğu için adet/kısmi
 * alım yoktur: alım ya bütünüyle olur ya olmaz. */
function buyPart(profile, partId, storage) {
  const part = partById(partId);
  if (!part) return { ok: false, reason: "INVALID_PART" };

  const current = normalizeProfile(profile);
  if (current.parts.includes(partId)) {
    return { ok: false, reason: "ALREADY_OWNED", scrap: current.scrap, cost: part.price };
  }
  if (current.scrap < part.price) {
    return { ok: false, reason: "SCRAP_REQUIRED", scrap: current.scrap, cost: part.price };
  }

  current.scrap -= part.price;
  current.parts.push(partId);
  // Derin kopya üzerinde uygula, sonucu yeniden doğrula.
  const after = normalizeProfile(current);
  if (current.scrap < 0 || !after.parts.includes(partId) || after.scrap !== current.scrap) {
    return { ok: false, reason: "VERIFY_FAILED" };
  }

  const persisted = saveProfile(after, storage);
  return { ok: true, profile: after, cost: part.price, ownedCount: after.parts.length, persisted };
}

// ── Takma / sökme ────────────────────────────────────────────────────────────

/* Tek giriş noktası (Atölye çağırır). partId === null → o ALT YUVAYI boşaltır
 * (sökme). Parçalar robota kilitli değildir: aynı parça başka robotlarda TAKILI
 * KALIR (kopya gerekmez).
 *
 * 5. parametre iki biçimde kabul edilir (geriye uyum): eski çağrılar doğrudan
 * bir storage nesnesi geçer; yeni çağrılar { index, storage } kullanır.
 * `index` hedef ALT yuvadır (0|1); verilmezse ilk boş alt yuva, ikisi de doluysa
 * 0 kullanılır (eski tek-yuva davranışı). Aynı parça aynı robotta başka alt
 * yuvada duruyorsa oradan çekilir — etki ikiye katlanmaz.
 * Başarıda { ok, profile, changed, persisted, index }; hatada
 * { ok:false, reason }: INVALID_ROBOT | INVALID_SLOT | INVALID_INDEX |
 * INVALID_PART | SLOT_MISMATCH | NOT_OWNED | VERIFY_FAILED. */
function equipPart(profile, robotId, slot, partId, opts) {
  if (!knownRobotId(robotId)) return { ok: false, reason: "INVALID_ROBOT" };
  if (!PART_SLOTS.includes(slot)) return { ok: false, reason: "INVALID_SLOT" };
  const o = _equipOpts(opts);
  if (o.index != null && (o.index < 0 || o.index >= PARTS_PER_SLOT)) {
    return { ok: false, reason: "INVALID_INDEX" };
  }

  let part = null;
  if (partId != null) {
    part = partById(partId);
    if (!part) return { ok: false, reason: "INVALID_PART" };
    if (part.slot !== slot) return { ok: false, reason: "SLOT_MISMATCH" };
    if (!isPartOwned(profile, partId)) return { ok: false, reason: "NOT_OWNED" };
  }

  const current = normalizeProfile(profile);
  const robot = ensureRobotProgress(current, robotId);
  const slotList = robot.loadout[slot];

  // Hedef alt yuva: verilmişse o. Verilmemişse (eski çağrılar) parça zaten bu
  // yuvada ise yerinde kalır (no-op); değilse ilk boş alta, ikisi de doluysa 0'a
  // yazılır. Sökmede (partId null) ilk dolu alt yuva temizlenir.
  let index = o.index;
  if (index == null) {
    if (partId != null) {
      const existing = slotList.indexOf(partId);
      index = existing >= 0 ? existing : slotList[0] === null ? 0 : slotList[1] === null ? 1 : 0;
    } else {
      index = slotList[0] !== null ? 0 : slotList[1] !== null ? 1 : 0;
    }
  }

  // Aynı alt yuvaya aynı parça: işlem yok — disk de yazılmaz.
  if (slotList[index] === (partId || null)) {
    return { ok: true, profile: current, changed: false, persisted: false, index };
  }

  // Aynı parça aynı robotun diğer alt yuvasında duruyorsa oradan çekilir
  // (yuva içinde taşıma): aynı donanım iki kez çizilmez/etki etmez.
  if (partId != null) {
    for (let i = 0; i < PARTS_PER_SLOT; i++) {
      if (i !== index && slotList[i] === partId) slotList[i] = null;
    }
  }
  slotList[index] = partId || null;

  // Sonucu yeniden doğrula: parça hâlâ sahipte ve loadout şekil-geçerli.
  const after = normalizeProfile(current);
  const afterList = sanitizeLoadoutShape(after.robots[robotId] && after.robots[robotId].loadout)[slot];
  if (afterList[index] !== (partId || null) ||
      (partId != null && !after.parts.includes(partId))) {
    return { ok: false, reason: "VERIFY_FAILED" };
  }

  const persisted = saveProfile(after, o.storage);
  return { ok: true, profile: after, changed: true, persisted, index };
}

// 5. parametreyi { index, storage } biçimine çözer (storage nesnesi de kabul).
function _equipOpts(fifth) {
  if (!fifth) return { index: null, storage: undefined };
  if (typeof fifth.getItem === "function" || typeof fifth.setItem === "function") {
    return { index: null, storage: fifth };
  }
  return {
    index: fifth.index == null ? null : toSafeInt(fifth.index),
    storage: fifth.storage,
  };
}

// ── Parça ikonları ───────────────────────────────────────────────────────────
//
// Pazar kartı ve Atölye listesi için 40 px kutuda çizilen saf ikonlar.
// Kurallar (robots.js/_rb ailesiyle aynı dil): düz katmanlı dolgu, koyu
// kontur, gradyan/shadowBlur YOK; Date.now/Math.random yok — ikon tamamen
// spec.icon (shape/tint/accent) + boyuttan türem, deterministiktir.
// fillText kullanılmaz: ikonlar şekil ailesiyle konuşur.

function _piShade(hex, amount) {
  const raw = String(hex || "#777777").replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return "#777777";
  const target = amount < 0 ? 0 : 255;
  const p = Math.min(1, Math.abs(amount));
  const ch = (v) => Math.round(v + (target - v) * p).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

function _piDot(ctx, x, y, rad, color, outline) {
  ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, rad), 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = outline || _piShade(color, -0.5);
  ctx.lineWidth = Math.max(1, rad * 0.34); ctx.stroke();
}


// İkon şekilleri: her biri s×s kutunun içine, ~%70 merkez bantta çizer.
const PART_ICON_SHAPES = {
  // Nişan merceği: halka + artı nişangâh
  lens(ctx, s, tint, accent) {
    const cx = s * 0.5, cy = s * 0.5, r = s * 0.30;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = tint; ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.lineWidth = s * 0.055; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
    ctx.strokeStyle = accent; ctx.lineWidth = s * 0.035; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.28, cy); ctx.lineTo(cx - r * 0.62, cy);
    ctx.moveTo(cx + r * 0.62, cy); ctx.lineTo(cx + r * 1.28, cy);
    ctx.moveTo(cx, cy - r * 1.28); ctx.lineTo(cx, cy - r * 0.62);
    ctx.moveTo(cx, cy + r * 0.62); ctx.lineTo(cx, cy + r * 1.28);
    ctx.strokeStyle = accent; ctx.lineWidth = s * 0.045; ctx.stroke();
    _piDot(ctx, cx, cy, s * 0.045, accent);
  },

  // Termal vizör: yatay bant + iki LED
  visor(ctx, s, tint, accent) {
    const x = s * 0.16, y = s * 0.38, w = s * 0.68, h = s * 0.22;
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.09); ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.lineWidth = s * 0.045; ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.roundRect(x + w * 0.12, y + h * 0.32, w * 0.5, h * 0.36, s * 0.04); ctx.fill();
    _piDot(ctx, x + w * 0.85, y + h * 0.5, s * 0.055, accent);
    // bant kulakları
    ctx.fillStyle = _piShade(tint, -0.25);
    ctx.beginPath(); ctx.roundRect(x - s * 0.05, y + h * 0.18, s * 0.06, h * 0.64, s * 0.02); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x + w - s * 0.01, y + h * 0.18, s * 0.06, h * 0.64, s * 0.02); ctx.fill();
  },

  // Denge sensörü: üç kollu girdap
  gyro(ctx, s, tint, accent) {
    const cx = s * 0.5, cy = s * 0.5, r = s * 0.30;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = tint; ctx.lineWidth = s * 0.06; ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
      ctx.moveTo(cx + Math.cos(a) * r * 0.28, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r * 1.1);
    }
    ctx.strokeStyle = accent; ctx.lineWidth = s * 0.05; ctx.stroke();
    _piDot(ctx, cx, cy, s * 0.075, accent);
  },

  // Lehim yaması: lehim dikişi + köşe perçinleri
  weldPatch(ctx, s, tint, accent) {
    const x = s * 0.14, y = s * 0.30, w = s * 0.72, h = s * 0.42;
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.10); ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.lineWidth = s * 0.05; ctx.stroke();
    // lehim dikişi: hafif dalgalı yatay çizgi
    ctx.beginPath();
    ctx.moveTo(x + w * 0.10, y + h * 0.5);
    ctx.quadraticCurveTo(x + w * 0.30, y + h * 0.30, x + w * 0.5, y + h * 0.5);
    ctx.quadraticCurveTo(x + w * 0.70, y + h * 0.70, x + w * 0.90, y + h * 0.5);
    ctx.strokeStyle = tint; ctx.lineWidth = s * 0.06; ctx.stroke();
    _piDot(ctx, x + s * 0.09, y + s * 0.09, s * 0.045, tint);
    _piDot(ctx, x + w - s * 0.09, y + s * 0.09, s * 0.045, tint);
    _piDot(ctx, x + s * 0.09, y + h - s * 0.09, s * 0.045, tint);
    _piDot(ctx, x + w - s * 0.09, y + h - s * 0.09, s * 0.045, tint);
  },

  // Kompozit plaka: çift sıra perçinli levha
  plate(ctx, s, tint, accent) {
    const x = s * 0.16, y = s * 0.26, w = s * 0.68, h = s * 0.48;
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.06); ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.lineWidth = s * 0.05; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(x + s * 0.08, y + s * 0.08, w - s * 0.16, h - s * 0.16, s * 0.04);
    ctx.strokeStyle = accent; ctx.lineWidth = s * 0.035; ctx.stroke();
    for (let i = 0; i < 3; i++) {
      _piDot(ctx, x + w * (0.16 + i * 0.34), y - s * 0.02, s * 0.04, accent, _piShade(tint, -0.5));
      _piDot(ctx, x + w * (0.16 + i * 0.34), y + h + s * 0.02, s * 0.04, accent, _piShade(tint, -0.5));
    }
  },

  // Soğutucu radyatör: gövde + üç kanatçık
  radiator(ctx, s, tint, accent) {
    const x = s * 0.22, y = s * 0.34, w = s * 0.56, h = s * 0.36;
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, s * 0.05); ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.lineWidth = s * 0.05; ctx.stroke();
    ctx.fillStyle = accent;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.roundRect(x + w * (0.16 + i * 0.27), y + h * 0.20, w * 0.12, h * 0.60, s * 0.03); ctx.fill();
    }
    ctx.fillStyle = _piShade(tint, -0.25);
    ctx.beginPath(); ctx.roundRect(x + w * 0.28, y - s * 0.14, w * 0.44, s * 0.14, s * 0.03); ctx.fill();
  },

  // Yedek yükleyici: şarjör + yay
  loader(ctx, s, tint, accent) {
    const cx = s * 0.5, top = s * 0.22, wTop = s * 0.30, wBot = s * 0.44, bot = s * 0.82;
    ctx.beginPath();
    ctx.moveTo(cx - wTop / 2, top); ctx.lineTo(cx + wTop / 2, top);
    ctx.lineTo(cx + wBot / 2, bot); ctx.lineTo(cx - wBot / 2, bot);
    ctx.closePath();
    ctx.fillStyle = tint; ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.lineWidth = s * 0.05; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - wTop * 0.30, top + s * 0.16);
    ctx.lineTo(cx + wTop * 0.20, top + s * 0.26);
    ctx.lineTo(cx - wTop * 0.24, top + s * 0.36);
    ctx.lineTo(cx + wTop * 0.16, top + s * 0.46);
    ctx.strokeStyle = accent; ctx.lineWidth = s * 0.045; ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.roundRect(cx - s * 0.05, s * 0.10, s * 0.10, s * 0.12, s * 0.02); ctx.fill();
  },

  // Takviye bobini: çubuk + sarmal
  coil(ctx, s, tint, accent) {
    const cx = s * 0.5, top = s * 0.16, bot = s * 0.84, w = s * 0.14;
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.roundRect(cx - w / 2, top, w, bot - top, s * 0.03); ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.lineWidth = s * 0.04; ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const y = top + (bot - top) * (i / 5);
      const x = cx + (i % 2 ? 1 : -1) * w * 1.6;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = accent; ctx.lineWidth = s * 0.05; ctx.stroke();
    _piDot(ctx, cx, top - s * 0.04, s * 0.05, accent);
    _piDot(ctx, cx, bot + s * 0.04, s * 0.05, accent);
  },

  // Hassas ayar cıvatası: altıgen + yuva
  bolt(ctx, s, tint, accent) {
    const cx = s * 0.5, cy = s * 0.52, r = s * 0.30;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * (Math.PI / 3);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = tint; ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.55); ctx.lineWidth = s * 0.05; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2);
    ctx.strokeStyle = accent; ctx.lineWidth = s * 0.04; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.38, cy); ctx.lineTo(cx + r * 0.38, cy);
    ctx.strokeStyle = _piShade(tint, -0.55); ctx.lineWidth = s * 0.05; ctx.stroke();
  },

  // Denge jiroskobu: üst/alt bar + silindir damper
  damping(ctx, s, tint, accent) {
    const cx = s * 0.5, w = s * 0.62;
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.roundRect(cx - w / 2, s * 0.22, w, s * 0.10, s * 0.03); ctx.fill();
    ctx.beginPath(); ctx.roundRect(cx - w / 2, s * 0.68, w, s * 0.10, s * 0.03); ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.lineWidth = s * 0.04;
    ctx.stroke(); ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.roundRect(cx - s * 0.12, s * 0.32, s * 0.24, s * 0.36, s * 0.05); ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.stroke();
    _piDot(ctx, cx, s * 0.50, s * 0.05, tint);
  },

  // Yay takozları: taban barı + üstünde yay
  springPad(ctx, s, tint, accent) {
    const cx = s * 0.5;
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.roundRect(cx - s * 0.32, s * 0.62, s * 0.64, s * 0.14, s * 0.03); ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.lineWidth = s * 0.045; ctx.stroke();
    ctx.beginPath();
    const x0 = cx - s * 0.22, w = s * 0.44, n = 5;
    for (let i = 0; i <= n; i++) {
      const x = x0 + (w * i) / n;
      ctx[i ? "lineTo" : "moveTo"](x, s * 0.58 - (i % 2 ? s * 0.18 : 0));
    }
    ctx.strokeStyle = accent; ctx.lineWidth = s * 0.05; ctx.stroke();
    _piDot(ctx, cx - s * 0.26, s * 0.69, s * 0.04, accent, _piShade(tint, -0.5));
    _piDot(ctx, cx + s * 0.26, s * 0.69, s * 0.04, accent, _piShade(tint, -0.5));
  },

  // Turbo palet: taban barı + hız okları (ileri itiş)
  turboPad(ctx, s, tint, accent) {
    const cx = s * 0.5;
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.roundRect(cx - s * 0.32, s * 0.62, s * 0.64, s * 0.16, s * 0.04); ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.lineWidth = s * 0.045; ctx.stroke();
    ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1.4, s * 0.07); ctx.lineCap = "round";
    for (let i = 0; i < 2; i++) {
      const x = cx - s * 0.12 + i * s * 0.24;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.09, s * 0.46);
      ctx.lineTo(x + s * 0.05, s * 0.31);
      ctx.lineTo(x - s * 0.09, s * 0.16);
      ctx.stroke();
    }
    _piDot(ctx, cx - s * 0.25, s * 0.70, s * 0.04, accent, _piShade(tint, -0.5));
    _piDot(ctx, cx + s * 0.25, s * 0.70, s * 0.04, accent, _piShade(tint, -0.5));
  },

  // Zırh kaskı: kask silueti + yan plakalar
  armorHelm(ctx, s, tint, accent) {
    const cx = s * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.26, s * 0.62);
    ctx.quadraticCurveTo(cx - s * 0.30, s * 0.26, cx, s * 0.22);
    ctx.quadraticCurveTo(cx + s * 0.30, s * 0.26, cx + s * 0.26, s * 0.62);
    ctx.closePath();
    ctx.fillStyle = tint; ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.lineWidth = s * 0.05; ctx.stroke();
    // vizör bandı
    ctx.beginPath(); ctx.roundRect(cx - s * 0.18, s * 0.40, s * 0.36, s * 0.11, s * 0.03);
    ctx.fillStyle = _piShade(tint, -0.6); ctx.fill();
    // yan plakalar (zırh)
    ctx.fillStyle = accent;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.roundRect(cx + side * s * 0.24 - s * 0.05, s * 0.44, s * 0.10, s * 0.22, s * 0.03); ctx.fill();
    }
    _piDot(ctx, cx, s * 0.26, s * 0.04, accent);
  },

  // Zamanlayıcı çip: yonga gövdesi + bacaklar + saat işareti
  chip(ctx, s, tint, accent) {
    const cx = s * 0.5;
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.roundRect(cx - s * 0.22, s * 0.30, s * 0.44, s * 0.40, s * 0.05); ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.lineWidth = s * 0.045; ctx.stroke();
    // bacaklar
    ctx.strokeStyle = _piShade(tint, -0.35); ctx.lineWidth = Math.max(1.2, s * 0.045);
    for (let i = 0; i < 3; i++) {
      const y = s * 0.38 + i * s * 0.11;
      ctx.beginPath(); ctx.moveTo(cx - s * 0.22, y); ctx.lineTo(cx - s * 0.32, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + s * 0.22, y); ctx.lineTo(cx + s * 0.32, y); ctx.stroke();
    }
    // saat: kadran + ibre
    ctx.beginPath(); ctx.arc(cx, s * 0.50, s * 0.13, 0, Math.PI * 2);
    ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1.3, s * 0.045); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, s * 0.50); ctx.lineTo(cx, s * 0.42);
    ctx.moveTo(cx, s * 0.50); ctx.lineTo(cx + s * 0.07, s * 0.54);
    ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1.3, s * 0.04); ctx.stroke();
  },

  // Sıçrama yayı: taban + yukarı ok + sarmal
  jumpPad(ctx, s, tint, accent) {
    const cx = s * 0.5;
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.roundRect(cx - s * 0.30, s * 0.68, s * 0.60, s * 0.14, s * 0.04); ctx.fill();
    ctx.strokeStyle = _piShade(tint, -0.5); ctx.lineWidth = s * 0.045; ctx.stroke();
    // sarmal
    ctx.beginPath();
    const y0 = s * 0.64, n = 4;
    for (let i = 0; i <= n; i++) {
      const y = y0 - (i * s * 0.11);
      const x = cx + (i % 2 ? 1 : -1) * s * 0.13;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1.4, s * 0.05); ctx.stroke();
    // yukarı ok
    ctx.beginPath();
    ctx.moveTo(cx, s * 0.12); ctx.lineTo(cx, s * 0.30);
    ctx.strokeStyle = _piShade(tint, -0.4); ctx.lineWidth = Math.max(1.6, s * 0.06); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.08, s * 0.20); ctx.lineTo(cx, s * 0.11); ctx.lineTo(cx + s * 0.08, s * 0.20);
    ctx.strokeStyle = _piShade(tint, -0.4); ctx.lineWidth = Math.max(1.6, s * 0.06); ctx.stroke();
    _piDot(ctx, cx - s * 0.24, s * 0.75, s * 0.04, accent, _piShade(tint, -0.5));
    _piDot(ctx, cx + s * 0.24, s * 0.75, s * 0.04, accent, _piShade(tint, -0.5));
  },
};

/* Parça ikonunu s×s kutunun içine çizer (kutunun sol üstü (0,0) — çağıran
 * translate eder; Projectile.drawIcon sözleşmesiyle aynı düzen). Bilinmeyen
 * shape, cıvata ikonuna düşer: hiçbir parça ikonsuz kalmaz. */
function drawPartIcon(ctx, part, size) {
  const icon = part && part.icon ? part.icon : null;
  const shape = icon && PART_ICON_SHAPES[icon.shape] ? icon.shape : "bolt";
  const tint = icon ? icon.tint : "#9fb6c9";
  const accent = icon ? icon.accent : "#eef5ff";
  ctx.save();
  PART_ICON_SHAPES[shape](ctx, size, tint, accent);
  ctx.restore();
}

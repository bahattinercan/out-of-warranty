/* Modüler robot çizicisi — İNSANSI (humanoid) rig.
 *
 * Tasarım kararı: her robot, Wild Ones'taki gibi insan biçimli bir gövdeye
 * oturur — büyük kask/vizör, gövde, iki kol ve ELLER, iki bacak/ayak. Karakter
 * kimliği yine tamamen veriden gelir:
 *   locomotion → ayak/bacak biçimi (bot, palet, teker, bilye, yay) + pervane
 *   body       → gövde silueti (genişlik, yükseklik, açık U kasa, tank…)
 *   face       → vizördeki göz/ışık düzeni
 *   attachment → elde taşınan alet, sırttaki top ya da hale/modül
 *
 * Oran şeması (r = gövde yarıçapı, taban çizgisi +1.0r):
 *   kask tepesi -1.32r | vizör -1.18r…-0.78r | omuz -0.38r
 *   bel/leğen +0.06r | diz +0.46r | ayak bileği +0.82r | taban +1.0r
 * Böylece bacak ≈ %36, kask ≈ %30, gövde ≈ %24 — çizgi film insanı oranı.
 *
 * Fizik veya Entity durumunu değiştirmez; seçim kartı, portre ve maç içi çizim
 * aynı saf fonksiyonu kullanır. Date.now()/Math.random() çağrılmaz: hareket ve
 * zaman bilgisi çağırandan (options.timeMs, options.motion) gelir, sabit
 * detaylar ise yalnız `charDef.id`'den türeyen tohumla serpilir.
 */

// ── Ortak yardımcılar ──────────────────────────────────────────────────────

function _rbRoundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function _rbShade(hex, amount) {
  const raw = String(hex || "#777777").replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return "#777777";
  const target = amount < 0 ? 0 : 255;
  const p = Math.min(1, Math.abs(amount));
  const ch = (v) => Math.round(v + (target - v) * p).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

function _rbLine(ctx, x1, y1, x2, y2, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

// Uzuv: koyu konturlu kalın çizgi. İnce bağlantı iki ekran pikselinin altına
// düşmesin diye genişlik her zaman minik bir tabanla başlar.
function _rbLimb(ctx, x1, y1, x2, y2, w, color) {
  _rbLine(ctx, x1, y1, x2, y2, _rbShade(color, -0.45), w + Math.max(1.4, w * 0.30));
  _rbLine(ctx, x1, y1, x2, y2, color, w);
}

function _rbDot(ctx, x, y, rad, color, outline) {
  ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, rad), 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = outline || _rbShade(color, -0.5);
  ctx.lineWidth = Math.max(1, rad * 0.34); ctx.stroke();
}

// Yay/sarmal (yaylı bacaklar, bobinler): iki nokta arasında zikzak.
function _rbCoil(ctx, x1, y1, x2, y2, w, color, turns) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
  const nx = -dy / len, ny = dx / len;
  const total = Math.max(2, turns || 4);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.6, w * 0.55);
  ctx.beginPath(); ctx.moveTo(x1, y1);
  for (let i = 1; i <= total; i++) {
    const t = i / (total + 1);
    const o = (i % 2 ? 1 : -1) * w * 0.55;
    ctx.lineTo(x1 + dx * t + nx * o, y1 + dy * t + ny * o);
  }
  ctx.lineTo(x2, y2); ctx.stroke();
}

// Math.random yerine: id → 0..1 deterministik tohum (panel/akü/vida yerleşimi).
// `salt` farklı ikinci bir bağımsız dizi verir; böylece aynı robotun gövde ve
// ayak detayları birbirini tekrar etmez.
function _rbSeed(id, salt) {
  const s = (salt ? salt + "|" : "") + String(id || "?");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return (h % 997) / 997;
}

// Palet bandı deseninin kaydırma miktarını [0, adım) aralığına indirger:
// açı sonsuza büyüse de desen yerinde döner.
function wrapTreadOffset(offset, spacing) {
  return ((offset % spacing) + spacing) % spacing;
}

// Üstten ışık: gradyan yerine katmanlı düz dolgu (test mock'unda
// createLinearGradient yok). Çağrılmadan önce hedef yol geçerli olmalıdır;
// parlama o yolun İÇİNE kırpılır.
function _rbFillGloss(ctx, x, y, w, h, rad, alpha) {
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = alpha === undefined ? 0.2 : alpha;
  ctx.fillStyle = "#ffffff";
  _rbRoundRect(ctx, x, y, w, h, rad);
  ctx.fill();
  ctx.restore();
}

// ── Eller ve kollar ────────────────────────────────────────────────────────

// El: avuç + üç parmak + başparmak. `ang` yerel yön (radyan), `grip` true ise
// parmaklar kapanır (namlu/tutamak kavrayışı).
function _rbHand(ctx, x, y, ang, s, color, grip) {
  const outline = _rbShade(color, -0.5);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  // avuç (bilek → parmak kökü)
  _rbRoundRect(ctx, -s * 0.34, -s * 0.36, s * 0.70, s * 0.72, s * 0.26);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1, s * 0.16); ctx.stroke();
  // parmaklar: tutuşta kıvrılır, gevşekken uzar
  for (let i = -1; i <= 1; i++) {
    const py = i * s * (grip ? 0.19 : 0.25);
    if (grip) _rbLimb(ctx, s * 0.26, py, s * 0.30, py * 1.95, s * 0.16, color);
    else _rbLimb(ctx, s * 0.26, py, s * 0.62, py * 1.10, s * 0.16, color);
  }
  // başparmak
  _rbLimb(ctx, s * 0.06, -s * 0.30, s * 0.28, grip ? -s * 0.46 : -s * 0.54, s * 0.16, _rbShade(color, 0.12));
  ctx.restore();
}

// İki eklemli kol: omuzdan ele (omuz bilyesi + dirsek). `bend` omuz-el eksenine
// dik sapma; işareti pozu belirler.
function _rbArm(ctx, sx, sy, hx, hy, bend, w, color) {
  const dx = hx - sx, dy = hy - sy;
  const len = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
  const ex = (sx + hx) / 2 - (dy / len) * bend;
  const ey = (sy + hy) / 2 + (dx / len) * bend;
  _rbJoint(ctx, sx, sy, w * 0.82, _rbShade(color, -0.08));
  _rbLimb(ctx, sx, sy, ex, ey, w, color);
  _rbLimb(ctx, ex, ey, hx, hy, w * 0.9, color);
  _rbJoint(ctx, ex, ey, w * 0.52, _rbShade(color, -0.14));
  return { ex, ey };
}

function _rbJoint(ctx, x, y, rad, color) {
  ctx.beginPath(); ctx.arc(x, y, Math.max(0.8, rad), 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = _rbShade(color, -0.5); ctx.lineWidth = Math.max(1, rad * 0.34); ctx.stroke();
}

// ── Bacaklar ve ayaklar ────────────────────────────────────────────────────

// Ayak `y` = bilek çizgisi (+0.82r); her tür kendi tabanını ~+1.0r'ye oturtur.
// `seed` aynı hareket sistemini kullanan robotlarda detay çeşitliliği verir.
function _rbFoot(ctx, locomotion, x, y, r, color, accent, seed, gait) {
  const outline = _rbShade(color, -0.5);
  const roll = (gait && gait.roll) || 0;
  if (locomotion === "tracks") {
    // Palet: alçak bant, üç makara ve arka çamurluk
    _rbRoundRect(ctx, x - r * 0.24, y - r * 0.11, r * 0.74, r * 0.29, r * 0.10);
    ctx.fillStyle = "#242a2f"; ctx.fill();
    ctx.strokeStyle = "#0a0d0f"; ctx.lineWidth = Math.max(1.3, r * 0.07); ctx.stroke();
    // Bant deseni mesafeye kilitli `roll` ile kayar: palet kaymaz, yürür.
    const bandX = x - r * 0.20, bandW = r * 0.66, bandY = y + r * 0.045;
    const spacing = r * 0.17;
    const off = wrapTreadOffset(roll * r * 0.30, spacing);
    for (let tx = bandX + off; tx < bandX + bandW; tx += spacing) {
      _rbLine(ctx, tx, bandY - r * 0.055, tx, bandY + r * 0.055, "#141a1d", Math.max(1, r * 0.05));
    }
    for (let i = 0; i < 3; i++) {
      const mx = x - r * 0.05 + i * r * 0.24;
      _rbDot(ctx, mx, y + r * 0.035, r * 0.085, i === 1 ? accent : "#3a4247", "#0a0d0f");
    }
    // çamurluk / siper
    _rbRoundRect(ctx, x - r * 0.34, y - r * 0.20, r * 0.18, r * 0.36, r * 0.05);
    ctx.fillStyle = _rbShade(color, -0.28); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1.1, r * 0.06); ctx.stroke();
    return;
  }
  if (locomotion === "wheel") return; // mono teker: _rbLegs çizer
  if (locomotion === "wheels") {
    // Paten: ayak altında iki küçük teker (göbek çizgileri dönerek yuvarlandığını gösterir)
    _rbRoundRect(ctx, x - r * 0.18, y - r * 0.10, r * 0.62, r * 0.16, r * 0.06);
    ctx.fillStyle = _rbShade(color, -0.30); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1.1, r * 0.06); ctx.stroke();
    for (const wx of [x + r * 0.02, x + r * 0.36]) {
      _rbDot(ctx, wx, y + r * 0.13, r * 0.13, "#20262b", "#07090b");
      _rbLine(ctx, wx - Math.cos(-roll) * r * 0.10, y + r * 0.13 - Math.sin(-roll) * r * 0.10,
        wx + Math.cos(-roll) * r * 0.10, y + r * 0.13 + Math.sin(-roll) * r * 0.10, "#3a4247", Math.max(1.2, r * 0.055));
      _rbDot(ctx, wx, y + r * 0.13, r * 0.045, accent, "#07090b");
    }
    return;
  }
  if (locomotion === "ball") {
    _rbDot(ctx, x + r * 0.04, y - r * 0.10, r * 0.28, "#20262b", "#07090b");
    // Yay çizgisi küreyle birlikte döner (yuvarlanma hissi)
    ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1.3, r * 0.08);
    ctx.beginPath(); ctx.arc(x + r * 0.04, y - r * 0.10, r * 0.16, 0.6 - roll, 2.4 - roll); ctx.stroke();
    _rbDot(ctx, x + r * 0.04, y - r * 0.10, r * 0.05, "#3a4247", "#07090b");
    return;
  }
  if (locomotion === "spring") {
    // Yay ayağı: helezon + yanında piston amortisör + taban plakası
    _rbCoil(ctx, x + r * 0.06, y - r * 0.22, x + r * 0.06, y + r * 0.02, r * 0.15, _rbShade(accent, -0.25), 3);
    _rbLimb(ctx, x - r * 0.16, y - r * 0.20, x - r * 0.12, y + r * 0.02, r * 0.07, "#7d868d");
    _rbRoundRect(ctx, x - r * 0.22, y - r * 0.02, r * 0.62, r * 0.18, r * 0.07);
    ctx.fillStyle = _rbShade(color, -0.28); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1.2, r * 0.07); ctx.stroke();
    return;
  }
  if (locomotion === "rotors") {
    // Süzülen robot: bot + topukta geriye bakan itici lülesi (yalnız görsel).
    // Lüle taban çizgisini aşmaz, yoksa zemine giriyormuş gibi görünür.
    _rbBoot(ctx, x, y, r, color, accent, outline, seed);
    const nx = x - r * 0.34, ny = y - r * 0.02;
    ctx.beginPath();
    ctx.moveTo(nx + r * 0.18, ny - r * 0.14);
    ctx.lineTo(nx - r * 0.14, ny + r * 0.10);
    ctx.lineTo(nx + r * 0.18, ny + r * 0.16);
    ctx.closePath();
    ctx.fillStyle = "#2a3136"; ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
    ctx.globalAlpha = 0.7;
    _rbDot(ctx, nx - r * 0.06, ny + r * 0.06, r * 0.10, accent, outline);
    ctx.globalAlpha = 1;
    return;
  }
  _rbBoot(ctx, x, y, r, color, accent, outline, seed);
}

// Zırhlı bot: kalın burun, aksan burun kapağı, taban çizgisi ve bilek halkası.
function _rbBoot(ctx, x, y, r, color, accent, outline, seed) {
  _rbRoundRect(ctx, x - r * 0.20, y - r * 0.10, r * 0.70, r * 0.30, r * 0.13);
  ctx.fillStyle = _rbShade(color, -0.30); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1.2, r * 0.09); ctx.stroke();
  // burun kapağı
  _rbRoundRect(ctx, x + r * 0.30, y - r * 0.04, r * 0.22, r * 0.17, r * 0.06);
  ctx.fillStyle = accent; ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
  // taban
  _rbLine(ctx, x - r * 0.16, y + r * 0.20, x + r * 0.48, y + r * 0.20, outline, Math.max(1.2, r * 0.08));
  // bilek halkası
  _rbDot(ctx, x - r * 0.06, y - r * 0.07, r * 0.09 * (0.85 + seed * 0.3), _rbShade(color, -0.08), outline);
}

// Bacak çifti. `gait` = { walking, air, phase, roll, vy, timeMs }.
// Yürüyüşte bacaklar zıt fazda sallanır ve ayak bilekten yuvarlanır
// (topuk → taban → burun), boşta ağırlık kayması, havada ayak uzaması olur.
function _rbLegs(ctx, locomotion, r, color, accent, gait, seed) {
  const g = gait || {};
  const air = g.air === true;
  const roll = g.roll || 0;

  if (locomotion === "wheel") {
    // Tek geniş teker (mono kasa): iki çatal bacak merkeze iner, teker DÖNER.
    const wy = air ? r * 0.50 : r * 0.62;
    for (const side of [-1, 1]) {
      const legColor = side > 0 ? color : _rbShade(color, -0.24);
      _rbRoundRect(ctx, side * r * 0.20 - r * 0.11, r * 0.00, r * 0.22, r * 0.26, r * 0.08);
      ctx.fillStyle = _rbShade(legColor, 0.14); ctx.fill();
      ctx.strokeStyle = _rbShade(legColor, -0.45); ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
      _rbLimb(ctx, side * r * 0.20, r * 0.04, side * r * 0.13, wy - r * 0.16, r * 0.21, legColor);
    }
    _rbDot(ctx, 0, wy, r * 0.36, "#20262b", "#07090b");
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + roll + seed * 0.4;
      _rbLine(ctx, Math.cos(a) * r * 0.22, wy + Math.sin(a) * r * 0.22,
        Math.cos(a) * r * 0.34, wy + Math.sin(a) * r * 0.34, "#3a4247", Math.max(1.4, r * 0.07));
    }
    // jant kolları: dönüşü okutur
    for (let i = 0; i < 3; i++) {
      const a = roll * 0.9 + (i / 3) * Math.PI * 2;
      _rbLine(ctx, Math.cos(a) * r * 0.07, wy + Math.sin(a) * r * 0.07,
        Math.cos(a) * r * 0.21, wy + Math.sin(a) * r * 0.21, accent, Math.max(1.3, r * 0.06));
    }
    _rbDot(ctx, 0, wy, r * 0.13, "#2a3136", "#07090b");
    _rbDot(ctx, 0, wy, r * 0.05, accent, "#07090b");
    return;
  }

  for (const side of [-1, 1]) {
    const legColor = side > 0 ? color : _rbShade(color, -0.24);
    const lp = (g.phase || 0) + (side > 0 ? 0 : Math.PI);
    let stride = 0, lift = 0, rot = 0;
    if (air) {
      // Havada: yükselirken bacaklar toplanır, düşerken aşağı uzanır ve ayak
      // burun ucu aşağı bakar.
      const descent = Math.max(-1, Math.min(1, (g.vy || 0) / 6));
      lift = 0.5 - descent * 0.4;
      stride = 0.18 - descent * 0.26;
      rot = 0.30 + descent * 0.10 + 0.10 * Math.sin((g.timeMs || 0) / 200 + side);
    } else if (g.walking) {
      // Genlik adım sinyaliyle ölçeklenir: tuş bırakılınca bacak nötre döner.
      const amp = g.amp === undefined ? 1 : g.amp;
      stride = Math.sin(lp) * amp;
      lift = Math.max(0, Math.cos(lp)) * amp;
      // Topuk-taban-burun yuvarlanması: önde burun kalkar, arkada itiş verir.
      rot = 0.26 * Math.max(0, -stride) - 0.16 * Math.max(0, stride) + 0.14 * lift;
    } else {
      // Boşta: ağırlık kayması + hafif ayak tıklatması (deterministik).
      const bos = locomotion === "spring" ? 1 : 0;
      const tap = Math.max(0, Math.sin((g.timeMs || 0) / 900 + (side > 0 ? 0 : 1.1)));
      lift = tap * (0.14 + bos * 0.22);
      stride = -tap * 0.10;
      rot = tap * (0.10 + bos * 0.12) - 0.02;
    }
    const hipX = side * r * 0.20, hipY = r * 0.04;
    // Ayak salınımı (2 × 0.56r = 15.7px) adım uzunluğundan (1.3r = 18.2px at
    // r=14) biraz kısadır: ayak yere basılıyken geriye kayması gövdenin
    // ilerlemesini büyük ölçüde karşılar, adım başına ~2.5px (%14) kayma payı
    // kalır. Temas kenarlarında ayak gövdeye göre durakladığı için anlık kayma
    // kare başına en fazla ~1.6px'e çıkar (gövde hızı 2.2px/karenin altında —
    // hiçbir zaman ayakla gövde birlikte aynı yöne kaymaz).
    const kneeX = hipX + stride * r * 0.36 + r * 0.05;
    const kneeY = r * 0.46 - lift * r * 0.17;
    const footX = hipX + stride * r * 0.56;
    const footY = r * 0.82 - lift * r * 0.24;
    // uyluk
    _rbLimb(ctx, hipX, hipY, kneeX, kneeY, r * 0.25, legColor);
    // uyluk plakası (açık ton): düz uzuv yerine hacim verir
    _rbRoundRect(ctx, hipX - r * 0.15, hipY + r * 0.02, r * 0.30, r * 0.26, r * 0.09);
    ctx.fillStyle = _rbShade(legColor, 0.16); ctx.fill();
    ctx.strokeStyle = _rbShade(legColor, -0.45); ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
    // baldır (yaylı ailede helezon)
    if (locomotion === "spring") {
      _rbCoil(ctx, kneeX, kneeY, footX, footY - r * 0.06, r * 0.20, _rbShade(accent, -0.30), 4);
    } else {
      _rbLimb(ctx, kneeX, kneeY, footX, footY, r * 0.21, legColor);
    }
    // dizlik: aksan merkezli mafsal
    _rbDot(ctx, kneeX, kneeY, r * 0.14, _rbShade(legColor, -0.06), _rbShade(legColor, -0.5));
    _rbDot(ctx, kneeX, kneeY, r * 0.055, accent, _rbShade(legColor, -0.5));
    // İtiş anında topuk arkasında kısa toz izi (yalnız yürürken, çok soluk)
    if (g.walking && !air && stride < -0.55) {
      const a = Math.min(1, (Math.abs(stride) - 0.55) / 0.45);
      ctx.globalAlpha = 0.20 * a;
      _rbDot(ctx, footX - r * 0.36, r * 0.92, r * (0.09 + a * 0.10), "#b9c4cc", "#b9c4cc");
      ctx.globalAlpha = 1;
    }
    // Ayak bilekten yuvarlanır: tüm ayak biçimleri aynı animasyonu paylaşır.
    ctx.save();
    ctx.translate(footX, footY);
    ctx.rotate(rot);
    ctx.translate(-footX, -footY);
    _rbFoot(ctx, locomotion, footX, footY, r, legColor, accent, seed, g);
    ctx.restore();
  }
}

// ── Gövde ──────────────────────────────────────────────────────────────────

// Gövde: -0.48r (omuz) … +0.06r (bel). Her `body` değeri KENDİ siluetini
// çizer; ortak bitiş katmanı (parlama, göğüs paneli, vidalar, kemer, leğen)
// hepsinin üstüne eklenir. Böylece robotlar renk varyantı gibi görünmez.
function _rbTorso(ctx, def, r, color, accent, seed) {
  const body = def.body;
  const outline = _rbShade(color, -0.48);
  const lw = Math.max(1.5, r * 0.11);
  const dark = _rbShade(color, -0.26);
  ctx.fillStyle = color; ctx.strokeStyle = outline; ctx.lineWidth = lw;
  // Gövde içine üstten ışık / alttan gölge (gradyan yerine katman).
  const gloss = (a) => _rbFillGloss(ctx, -r * 0.62, -r * 0.78, r * 1.24, r * 0.52, r * 0.20, a);

  if (body === "round") {
    ctx.beginPath(); ctx.ellipse(0, -r * 0.20, r * 0.44, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke(); gloss(0.22);
    _rbLine(ctx, -r * 0.42, -r * 0.06, r * 0.42, -r * 0.06, _rbShade(color, -0.34), Math.max(1.4, r * 0.08));
  } else if (body === "coil") {
    // Bobin gövde: yuvarlak kasa + iki yanda helezon amortisör
    ctx.beginPath(); ctx.ellipse(0, -r * 0.18, r * 0.36, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke(); gloss(0.22);
    for (const s of [-1, 1]) {
      _rbRoundRect(ctx, s * r * 0.34 - r * 0.09, -r * 0.46, r * 0.18, r * 0.16, r * 0.05);
      ctx.fillStyle = dark; ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
      _rbCoil(ctx, s * r * 0.38, -r * 0.32, s * r * 0.38, r * 0.02, r * 0.11, accent, 4);
    }
  } else if (body === "tank") {
    _rbRoundRect(ctx, -r * 0.32, -r * 0.46, r * 0.68, r * 0.58, r * 0.26);
    ctx.fill(); ctx.stroke(); gloss(0.18);
    for (const y of [-r * 0.30, -r * 0.06]) _rbLine(ctx, -r * 0.32, y, r * 0.36, y, _rbShade(color, -0.32), Math.max(1.4, r * 0.07));
    // yan kadran
    _rbDot(ctx, -r * 0.02, -r * 0.36, r * 0.11, "#0e1316", outline);
    _rbDot(ctx, -r * 0.02, -r * 0.36, r * 0.045, accent, outline);
  } else if (body === "u_frame") {
    // Açık U kasa: iki kutup kızağı, ortada enerji çekirdeği
    ctx.lineWidth = r * 0.22; ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(-r * 0.30, -r * 0.46);
    ctx.lineTo(-r * 0.30, -r * 0.04);
    ctx.quadraticCurveTo(0, r * 0.18, r * 0.30, -r * 0.04);
    ctx.lineTo(r * 0.30, -r * 0.46);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.4, r * 0.09); ctx.strokeStyle = outline; ctx.stroke();
    ctx.globalAlpha = 0.45;
    _rbDot(ctx, 0, -r * 0.12, r * 0.26, accent, outline);
    ctx.globalAlpha = 1;
    _rbDot(ctx, 0, -r * 0.12, r * 0.15, accent, outline);
  } else if (body === "angular") {
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, r * 0.04);
    ctx.lineTo(-r * 0.34, -r * 0.46);
    ctx.lineTo(r * 0.30, -r * 0.52);
    ctx.lineTo(r * 0.46, -r * 0.12);
    ctx.lineTo(r * 0.34, r * 0.06);
    ctx.closePath(); ctx.fill(); ctx.stroke(); gloss(0.18);
    _rbLine(ctx, -r * 0.30, -r * 0.30, r * 0.28, -r * 0.36, _rbShade(color, -0.34), Math.max(1.3, r * 0.07));
  } else if (body === "forward") {
    // Öne yatık kama: sırt eğimi + burun kaputu
    ctx.beginPath();
    ctx.moveTo(-r * 0.44, -r * 0.40);
    ctx.lineTo(r * 0.20, -r * 0.52);
    ctx.lineTo(r * 0.52, -r * 0.18);
    ctx.lineTo(r * 0.40, r * 0.06);
    ctx.lineTo(-r * 0.34, r * 0.06);
    ctx.closePath(); ctx.fill(); ctx.stroke(); gloss(0.18);
    _rbLine(ctx, r * 0.20, -r * 0.46, r * 0.44, -r * 0.20, accent, Math.max(1.6, r * 0.08));
  } else if (body === "furnace") {
    _rbRoundRect(ctx, -r * 0.36, -r * 0.54, r * 0.72, r * 0.66, r * 0.14);
    ctx.fill(); ctx.stroke(); gloss(0.16);
    for (let i = 0; i < 3; i++) {
      _rbLine(ctx, -r * 0.26, -r * 0.44 + i * r * 0.12, r * 0.30, -r * 0.44 + i * r * 0.12, _rbShade(color, 0.24), Math.max(1.3, r * 0.07));
    }
    _rbRoundRect(ctx, -r * 0.06, -r * 0.06, r * 0.32, r * 0.14, r * 0.05);
    ctx.fillStyle = accent; ctx.fill();
    // baca: aileye duman/ısı kimliği
    _rbRoundRect(ctx, -r * 0.36, -r * 0.80, r * 0.17, r * 0.30, r * 0.06);
    ctx.fillStyle = _rbShade(color, -0.30); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
  } else if (body === "tall") {
    ctx.beginPath();
    ctx.moveTo(-r * 0.36, r * 0.06);
    ctx.lineTo(-r * 0.28, -r * 0.54);
    ctx.lineTo(r * 0.28, -r * 0.54);
    ctx.lineTo(r * 0.36, r * 0.06);
    ctx.closePath(); ctx.fill(); ctx.stroke(); gloss(0.20);
    for (const s of [-1, 0, 1]) _rbLine(ctx, s * r * 0.16, -r * 0.46, s * r * 0.20, -r * 0.06, _rbShade(color, -0.30), Math.max(1.2, r * 0.05));
  } else if (body === "flat") {
    // Yassı kama: tabanda geniş, tepede öne kırılan hat
    ctx.beginPath();
    ctx.moveTo(-r * 0.50, r * 0.08);
    ctx.lineTo(-r * 0.22, -r * 0.40);
    ctx.lineTo(r * 0.34, -r * 0.34);
    ctx.lineTo(r * 0.50, r * 0.08);
    ctx.closePath(); ctx.fill(); ctx.stroke(); gloss(0.16);
  } else if (body === "low") {
    // Kambur: alçak kubbe + omuz boyunduruğu
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.02, r * 0.48, r * 0.32, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(r * 0.48, r * 0.06);
    ctx.lineTo(-r * 0.48, r * 0.06);
    ctx.closePath(); ctx.fill(); ctx.stroke(); gloss(0.18);
    _rbRoundRect(ctx, -r * 0.46, -r * 0.30, r * 0.92, r * 0.14, r * 0.06);
    ctx.fillStyle = dark; ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
  } else if (body === "small") {
    _rbRoundRect(ctx, -r * 0.30, -r * 0.42, r * 0.60, r * 0.46, r * 0.18);
    ctx.fill(); ctx.stroke(); gloss(0.22);
    _rbLine(ctx, -r * 0.24, -r * 0.06, r * 0.26, -r * 0.06, _rbShade(color, -0.34), Math.max(1.2, r * 0.06));
  } else if (body === "compact") {
    _rbRoundRect(ctx, -r * 0.33, -r * 0.42, r * 0.66, r * 0.48, r * 0.14);
    ctx.fill(); ctx.stroke(); gloss(0.20);
    _rbLine(ctx, 0, -r * 0.40, 0, r * 0.02, _rbShade(color, -0.30), Math.max(1.2, r * 0.06));
  } else if (body === "long") {
    ctx.beginPath();
    ctx.moveTo(-r * 0.46, r * 0.10);
    ctx.lineTo(-r * 0.52, -r * 0.34);
    ctx.lineTo(-r * 0.32, -r * 0.50);
    ctx.lineTo(r * 0.32, -r * 0.50);
    ctx.lineTo(r * 0.52, -r * 0.34);
    ctx.lineTo(r * 0.46, r * 0.10);
    ctx.closePath(); ctx.fill(); ctx.stroke(); gloss(0.18);
    // X payanda: uzun gövdenin taşıma iskeleti
    _rbLine(ctx, -r * 0.34, -r * 0.10, r * 0.34, r * 0.06, _rbShade(color, -0.32), Math.max(1.4, r * 0.07));
    _rbLine(ctx, -r * 0.34, r * 0.06, r * 0.34, -r * 0.10, _rbShade(color, -0.32), Math.max(1.4, r * 0.07));
  } else {
    // "wide" ve bilinmeyen değerler: geniş trapez + göğüs payandaları
    ctx.beginPath();
    ctx.moveTo(-r * 0.44, r * 0.08);
    ctx.lineTo(-r * 0.52, -r * 0.28);
    ctx.lineTo(-r * 0.34, -r * 0.50);
    ctx.lineTo(r * 0.34, -r * 0.50);
    ctx.lineTo(r * 0.52, -r * 0.28);
    ctx.lineTo(r * 0.44, r * 0.08);
    ctx.closePath(); ctx.fill(); ctx.stroke(); gloss(0.18);
    for (const s of [-1, 1]) {
      _rbLine(ctx, s * r * 0.16, -r * 0.42, s * r * 0.24, -r * 0.14, _rbShade(color, -0.30), Math.max(1.4, r * 0.07));
    }
  }

  // ── Ortak bitiş katmanı ─────────────────────────────────────────────────
  // Boyun yuvası (yaka): kask ile gövdeyi ayırır.
  _rbRoundRect(ctx, -r * 0.20, -r * 0.56, r * 0.40, r * 0.15, r * 0.06);
  ctx.fillStyle = _rbShade(color, -0.40); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
  // Göğüs paneli: koyu yuva + aksan akü çubuğu (kimlik detayı değil).
  _rbRoundRect(ctx, -r * 0.20, -r * 0.36, r * 0.44, r * 0.15, r * 0.06);
  ctx.fillStyle = "#0e1316"; ctx.fill();
  ctx.strokeStyle = _rbShade(color, -0.55); ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
  ctx.fillStyle = accent;
  ctx.fillRect(-r * 0.16, -r * 0.33, r * (0.12 + 0.14 * seed), r * 0.09);
  // Gövde vidaları: tohumla yerleşir, deterministik kalır.
  for (let i = 0; i < 3; i++) {
    const a = seed * 6.28 + i * 2.09;
    _rbDot(ctx, Math.cos(a) * r * 0.28, -r * 0.18 + Math.sin(a) * r * 0.20, r * 0.035, _rbShade(color, -0.42), _rbShade(color, -0.55));
  }
  // Bel kemeri + leğen plakası: gövdeyi bacaklara bağlar.
  _rbRoundRect(ctx, -r * 0.28, -r * 0.02, r * 0.56, r * 0.18, r * 0.08);
  ctx.fillStyle = dark; ctx.fill();
  ctx.strokeStyle = outline; ctx.stroke();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = accent;
  ctx.fillRect(-r * 0.25, -r * 0.05, r * 0.50, r * 0.05);
  ctx.globalAlpha = 1;
}

// Omuz pedleri: aileye göre biçim değiştirir ve kol-gövde birleşimini kapatır.
function _rbShoulders(ctx, chassis, r, color, accent) {
  const dark = _rbShade(color, -0.30);
  const outline = _rbShade(color, -0.55);
  for (const s of [-1, 1]) {
    const sx = s * r * 0.40, sy = -r * 0.46;
    if (chassis === "heavy") {
      _rbRoundRect(ctx, sx - r * 0.17, sy - r * 0.15, r * 0.34, r * 0.28, r * 0.09);
      ctx.fillStyle = dark; ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1.2, r * 0.07); ctx.stroke();
      ctx.fillStyle = accent; ctx.fillRect(sx - r * 0.14, sy - r * 0.11, r * 0.28, r * 0.05);
    } else if (chassis === "flying" || chassis === "wheeled") {
      ctx.beginPath();
      ctx.moveTo(sx - s * r * 0.16, sy - r * 0.13);
      ctx.lineTo(sx + s * r * 0.17, sy - r * 0.02);
      ctx.lineTo(sx - s * r * 0.10, sy + r * 0.11);
      ctx.closePath();
      ctx.fillStyle = dark; ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1.1, r * 0.06); ctx.stroke();
    } else {
      _rbDot(ctx, sx, sy, r * 0.16, dark, outline);
      _rbDot(ctx, sx, sy, r * 0.065, accent, outline);
    }
  }
}

// ── Baş, yüz ve baş üstü donanımı ──────────────────────────────────────────

// Vizör: kaskın ön yüzündeki koyu panel + yüz tipine göre göz/ışık.
function _rbFace(ctx, face, r, accent, hy) {
  const vx = r * 0.24, vy = hy - r * 0.02;
  ctx.strokeStyle = accent; ctx.fillStyle = accent;
  ctx.lineWidth = Math.max(1.4, r * 0.08);
  if (face === "single_lens") {
    _rbDot(ctx, vx, vy, r * 0.14, accent, _rbShade(accent, -0.5));
  } else if (face === "warning_led") {
    _rbDot(ctx, vx + r * 0.06, vy, r * 0.11, accent, "#0a0d0f");
    _rbLine(ctx, vx - r * 0.14, vy, vx - r * 0.04, vy, accent, Math.max(1.6, r * 0.08));
  } else if (face === "gauge" || face === "speedometer") {
    ctx.beginPath(); ctx.arc(vx, vy + r * 0.08, r * 0.16, Math.PI, 0); ctx.stroke();
    const a = face === "gauge" ? -Math.PI * 0.72 : -Math.PI * 0.28;
    _rbLine(ctx, vx, vy + r * 0.08, vx + Math.cos(a) * r * 0.15, vy + r * 0.08 + Math.sin(a) * r * 0.15, accent, Math.max(1.6, r * 0.07));
    for (let i = 0; i <= 4; i++) _rbDot(ctx, vx - r * 0.16 + i * r * 0.08, vy + r * 0.11, r * 0.022, accent, accent);
  } else if (face === "visor") {
    _rbLine(ctx, vx - r * 0.16, vy, vx + r * 0.16, vy, accent, Math.max(2, r * 0.14));
  } else if (face === "waveform") {
    ctx.beginPath();
    ctx.moveTo(vx - r * 0.17, vy);
    ctx.lineTo(vx - r * 0.07, vy - r * 0.12);
    ctx.lineTo(vx + r * 0.02, vy + r * 0.11);
    ctx.lineTo(vx + r * 0.16, vy - r * 0.05);
    ctx.stroke();
  } else {
    _rbDot(ctx, vx - r * 0.09, vy, r * 0.085, accent, _rbShade(accent, -0.5));
    _rbDot(ctx, vx + r * 0.12, vy, r * 0.085, accent, _rbShade(accent, -0.5));
  }
}

// Kask tepesi donanımı: aileye göre anten/kanat/lamba. Hepsi alçak tutulur ki
// HP çubuğuyla (`cy - r - 12`) çakışmasın.
function _rbHeadAntenna(ctx, chassis, r, color, accent, hy) {
  const dark = _rbShade(color, -0.35);
  if (chassis === "flying") {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.30, hy - r * 0.12);
      ctx.lineTo(s * r * 0.60, hy - r * 0.30);
      ctx.lineTo(s * r * 0.34, hy + r * 0.06);
      ctx.closePath();
      ctx.fillStyle = accent; ctx.fill();
      ctx.strokeStyle = "#0a0d0f"; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
    }
  } else if (chassis === "wheeled") {
    // egzoz borusu: geriye kıvrık
    _rbLimb(ctx, -r * 0.28, hy - r * 0.18, -r * 0.58, hy - r * 0.42, r * 0.07, dark);
    _rbDot(ctx, -r * 0.58, hy - r * 0.42, r * 0.07, accent, "#0a0d0f");
  } else if (chassis === "spring") {
    _rbCoil(ctx, -r * 0.20, hy - r * 0.26, -r * 0.42, hy - r * 0.44, r * 0.10, accent, 3);
  } else if (chassis === "magnetic" || chassis === "experimental") {
    for (const s of [-1, 1]) {
      _rbLimb(ctx, s * r * 0.12, hy - r * 0.28, s * r * 0.28, hy - r * 0.46, r * 0.05, dark);
      _rbDot(ctx, s * r * 0.28, hy - r * 0.46, r * 0.055, accent, "#0a0d0f");
    }
  } else if (chassis === "digger") {
    _rbDot(ctx, r * 0.10, hy - r * 0.30, r * 0.10, "#fff3c4", "#0a0d0f");
    _rbLimb(ctx, -r * 0.20, hy - r * 0.26, -r * 0.44, hy - r * 0.38, r * 0.05, dark);
  } else {
    // heavy / maintenance: kısa çubuk + durum ışığı
    _rbLimb(ctx, -r * 0.20, hy - r * 0.28, -r * 0.44, hy - r * 0.40, r * 0.05, dark);
    _rbDot(ctx, -r * 0.44, hy - r * 0.40, r * 0.065, accent, "#0a0d0f");
  }
}

// Kask: -1.32r (tepe) … -0.60r (çene). İnsansı okunurluk için yüz öne taşar.
// Kask KABUĞU: aileye göre beş ayrı silüet. Tek bir yuvarlak kask 34 robotta
// aynı olduğu için yüksekliğin ~%30'u kimlik taşımıyordu (bkz. `_rbProportions`
// başlığındaki ölçüm). Yüz paneli, kaş, çene ve anten altta ORTAK çizilir;
// buradaki fark yalnız dış kabuk yoludur.
function _rbHeadShellPath(ctx, chassis, r, hy) {
  if (chassis === "heavy" || chassis === "digger") {
    // Düz tepeli, geniş çeneli kutu kask (ağır iş)
    ctx.beginPath();
    ctx.moveTo(-r * 0.46, hy - r * 0.18);
    ctx.lineTo(-r * 0.38, hy - r * 0.36);
    ctx.lineTo(r * 0.32, hy - r * 0.36);
    ctx.lineTo(r * 0.48, hy - r * 0.16);
    ctx.lineTo(r * 0.46, hy + r * 0.24);
    ctx.lineTo(r * 0.28, hy + r * 0.38);
    ctx.lineTo(-r * 0.30, hy + r * 0.38);
    ctx.lineTo(-r * 0.46, hy + r * 0.20);
    ctx.closePath();
    return;
  }
  if (chassis === "magnetic" || chassis === "flying") {
    // Kubbe: tam yuvarlak, yanında kulak halkası
    ctx.beginPath();
    ctx.ellipse(0, hy - r * 0.02, r * 0.42, r * 0.37, 0, 0, Math.PI * 2);
    return;
  }
  if (chassis === "spring") {
    // Kapsül: dar, uzun, arkaya doğru sivrilen
    ctx.beginPath();
    ctx.moveTo(-r * 0.32, hy - r * 0.04);
    ctx.quadraticCurveTo(-r * 0.28, hy - r * 0.36, r * 0.08, hy - r * 0.38);
    ctx.quadraticCurveTo(r * 0.40, hy - r * 0.36, r * 0.42, hy - r * 0.02);
    ctx.quadraticCurveTo(r * 0.44, hy + r * 0.30, r * 0.16, hy + r * 0.36);
    ctx.quadraticCurveTo(-r * 0.20, hy + r * 0.38, -r * 0.28, hy + r * 0.18);
    ctx.quadraticCurveTo(-r * 0.38, hy + 0, -r * 0.32, hy - r * 0.04);
    ctx.closePath();
    return;
  }
  if (chassis === "wheeled") {
    // Kama: öne eğik tepe, arkada alçak omuz (hız hissi)
    ctx.beginPath();
    ctx.moveTo(-r * 0.30, hy - r * 0.14);
    ctx.quadraticCurveTo(-r * 0.10, hy - r * 0.36, r * 0.24, hy - r * 0.30);
    ctx.quadraticCurveTo(r * 0.50, hy - r * 0.24, r * 0.50, hy + r * 0.02);
    ctx.lineTo(r * 0.40, hy + r * 0.34);
    ctx.lineTo(-r * 0.26, hy + r * 0.34);
    ctx.quadraticCurveTo(-r * 0.40, hy + r * 0.22, -r * 0.30, hy - r * 0.14);
    ctx.closePath();
    return;
  }
  if (chassis === "experimental") {
    // Kesik köşeli (fasetli) kask: asimetrik/deneysel aile
    ctx.beginPath();
    ctx.moveTo(-r * 0.40, hy - r * 0.06);
    ctx.lineTo(-r * 0.22, hy - r * 0.34);
    ctx.lineTo(r * 0.16, hy - r * 0.36);
    ctx.lineTo(r * 0.46, hy - r * 0.12);
    ctx.lineTo(r * 0.40, hy + r * 0.24);
    ctx.lineTo(r * 0.12, hy + r * 0.38);
    ctx.lineTo(-r * 0.28, hy + r * 0.30);
    ctx.closePath();
    return;
  }
  // Bakım ailesi (ve yedek): yuvarlatılmış takım kutusu
  ctx.beginPath();
  ctx.moveTo(-r * 0.40, hy - r * 0.18);
  ctx.quadraticCurveTo(-r * 0.46, hy + r * 0.16, -r * 0.22, hy + r * 0.36);
  ctx.lineTo(r * 0.20, hy + r * 0.36);
  ctx.quadraticCurveTo(r * 0.50, hy + r * 0.16, r * 0.50, hy - r * 0.04);
  ctx.quadraticCurveTo(r * 0.48, hy - r * 0.34, r * 0.10, hy - r * 0.36);
  ctx.quadraticCurveTo(-r * 0.26, hy - r * 0.36, -r * 0.40, hy - r * 0.18);
  ctx.closePath();
}

function _rbHead(ctx, def, r, color, accent) {
  const hy = -r * 0.96;
  const shell = _rbShade(color, 0.12);
  const outline = _rbShade(color, -0.52);
  // boyun (kask ile gövde arasında görünür boşluk bırakır)
  _rbLimb(ctx, 0, hy + r * 0.26, 0, hy + r * 0.46, r * 0.15, _rbShade(color, -0.34));
  // kask kabuğu (aileye göre silüet)
  _rbHeadShellPath(ctx, def.chassis, r, hy);
  ctx.fillStyle = shell; ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1.5, r * 0.11); ctx.stroke();
  // kubbe ailesinde yan kulak halkası (kabuk yolundan sonra, içinde kalır)
  if (def.chassis === "magnetic" || def.chassis === "flying") {
    _rbDot(ctx, -r * 0.36, hy + r * 0.06, r * 0.09, _rbShade(color, -0.20), outline);
  }
  // kask üstüne ışık
  _rbFillGloss(ctx, -r * 0.52, hy - r * 0.52, r * 1.04, r * 0.34, r * 0.16, 0.24);
  // kaş hattı: ağır/kazıcı ailelerde kalınlaşır (kızgın bakış)
  const brow = def.chassis === "heavy" || def.chassis === "digger" ? 1 : 0.6;
  _rbLine(ctx, -r * 0.28, hy - r * 0.26, r * 0.44, hy - r * 0.22, _rbShade(color, -0.34), Math.max(1.6, r * 0.10 * brow));
  // yan vida / kulak
  _rbDot(ctx, -r * 0.28, hy + r * 0.04, r * 0.09, _rbShade(color, -0.20), outline);
  // vizör paneli
  _rbRoundRect(ctx, 0, hy - r * 0.22, r * 0.46, r * 0.38, r * 0.12);
  ctx.fillStyle = "#0d1215"; ctx.fill();
  ctx.strokeStyle = _rbShade(color, -0.58); ctx.lineWidth = Math.max(1.2, r * 0.07); ctx.stroke();
  _rbFace(ctx, def.face, r, accent, hy);
  // yanak havalandırması
  for (let i = 0; i < 2; i++) {
    _rbLine(ctx, -r * 0.18 + i * r * 0.13, hy + r * 0.16, -r * 0.11 + i * r * 0.13, hy + r * 0.30, _rbShade(color, -0.34), Math.max(1.1, r * 0.05));
  }
  // çene plakası
  _rbRoundRect(ctx, r * 0.04, hy + r * 0.18, r * 0.30, r * 0.12, r * 0.05);
  ctx.fillStyle = _rbShade(color, -0.22); ctx.fill();
  ctx.strokeStyle = outline; ctx.stroke();
  _rbHeadAntenna(ctx, def.chassis, r, color, accent, hy);
  return hy;
}

// Siren aparatı: kask tepesinde dönen lamba.
function _rbHeadGear(ctx, tag, r, accent, hy) {
  if (tag !== "siren") return;
  // Lamba kask tepesine oturur; HP çubuğuna değmemesi için alçak tutulur.
  _rbDot(ctx, 0, hy - r * 0.40, r * 0.15, accent, "#0a0d0f");
  _rbRoundRect(ctx, -r * 0.20, hy - r * 0.32, r * 0.40, r * 0.14, r * 0.06);
  ctx.fillStyle = "#2a3136"; ctx.fill();
  ctx.strokeStyle = "#0a0d0f"; ctx.lineWidth = Math.max(1.2, r * 0.07); ctx.stroke();
}

// ── Namlu (maç içi nişan duruşunda ellerin tuttuğu bazuka) ─────────────────
//
// Geometri TEK KAYNAKTIR: hem çizim (_rbLauncher) hem de oyun mantığı (nişan çizgisi,
// mermi çıkış noktası, bot benzetimi) buradan türetilir. Değerler `r` oranıdır.
// Daha önce mantık gövde MERKEZİNDEN `r + 12` ileri bir nokta kullanıyordu;
// oysa namlu omuz pivotunda durur, bu yüzden nişan çizgisi silahın ağzından
// kayıyordu (namlunun altından başlıyordu). Artık ikisi de aynı noktada.
const RB_GUN_PIVOT_X = 0.10;  // omuz pivotu, gövde merkezine göre yatay
const RB_GUN_PIVOT_Y = -0.34; // omuz pivotu, gövde merkezine göre dikey (− = yukarı)
// Pivot → namlu ağzı. Ağzı okutan aksan halkasının merkeziyle BİREBİR aynı
// olmalı (`_rbLauncher` içindeki `len - r * 0.06` = 1.36r).
const RB_GUN_MUZZLE = 1.36;

// Okunabilirlik ölçeği (R2, 2026-10-12): robot ÇİZİMİ %10 büyütülür. Fizik
// yarıçapı (`Entity.r`, çarpışma/vuruş kutusu) DEĞİŞMEZ — yalnız görsel boyut
// artar, böylece 960×540'ta siluet ve modül/parça detayları okunur.
// KURAL: ölçek hem `drawRobot` hem `robotMuzzlePoint` içinde uygulanır. İkisi
// ayrışırsa nişan çizgisi/mermi çıkışı çizilen namludan kayar; tests/run.js'teki
// "Nişan hizası" grubu bu sabiti referans alarak bunu yakalar.
// ── Oran grameri (silüet kimliği) ──────────────────────────────────────────
// Ölçüm (2026-11-10, `_robot_silhouette_probe.html`): 34 robotun 561 çiftinin
// 426'sı IoU ≥ 0.60, ortalama 0.694 ve bir çift birebir aynıydı. Yani kadro
// "aynı iskeletin renk varyantı" gibi okunuyordu. Sebep renk değil ORAN: gövde,
// kask ve bacak hep aynı `r` oranlarıyla çiziliyordu.
//
// Bu tablo her robota aile verisinden türeyen dört eksen verir (1.0 = nötr):
//   head   : kask ölçeği — boyun pivotuna (`-0.48r`) göre
//   torsoX : gövde + omuz genişliği — x ekseni
//   legs   : bacak uzunluğu — YER TEMASINA (`+1.0r`) göre, ayak yere basılı kalır
//   stance : ayak açıklığı — yine yer temasına göre
//
// Değerler `chassis + body + locomotion` ofsetlerinin toplamı + `def.id`
// tohumundan gelen küçük sapma. Tamamen deterministik: Math.random/Date.now yok.
// Bacak uzunluğu üst gövdeyi kaydırdığı için namlu pivotu da kayar; `drawRobot`
// ile `robotMuzzlePoint` AYNI fonksiyonu okur (aksi hâlde nişan hizası kayar).
const _RB_PROP_CHASSIS = {
  //            head  torsoX  legs  stance
  maintenance: [0.10, -0.02, 0.00, -0.02],
  magnetic:    [0.16, -0.08, 0.06, -0.06],
  heavy:       [-0.14, 0.12, -0.14, 0.12],
  spring:      [0.00, -0.10, 0.18, -0.10],
  experimental: [0.06, 0.00, 0.12, 0.00],
  wheeled:     [-0.06, -0.04, -0.08, 0.04],
  flying:      [0.12, -0.10, 0.08, -0.08],
  digger:      [-0.10, 0.10, -0.16, 0.14],
};
const _RB_PROP_BODY = {
  round:   [0.10, 0.02, -0.04, 0.00],
  coil:    [0.02, -0.04, 0.08, -0.02],
  wide:    [-0.06, 0.10, -0.06, 0.10],
  tank:    [-0.08, 0.08, -0.08, 0.08],
  angular: [0.00, -0.06, 0.08, -0.02],
  compact: [0.08, 0.00, -0.04, 0.00],
  small:   [0.12, -0.08, -0.08, -0.06],
  tall:    [-0.04, -0.06, 0.16, -0.08],
  long:    [0.00, 0.06, -0.06, 0.06],
  forward: [0.00, 0.06, -0.08, 0.04],
  flat:    [0.06, 0.12, -0.12, 0.08],
  low:     [-0.04, 0.10, -0.14, 0.10],
  u_frame: [-0.02, -0.04, 0.06, 0.00],
  furnace: [-0.06, 0.08, -0.06, 0.08],
};
const _RB_PROP_LOCO = {
  legs:   [0.00, 0.00, 0.10, -0.02],
  tracks: [-0.04, 0.06, -0.10, 0.12],
  wheel:  [0.00, -0.04, 0.00, 0.00],
  wheels: [0.00, 0.00, 0.04, 0.00],
  ball:   [0.00, -0.06, -0.08, 0.00],
  spring: [0.04, -0.02, 0.16, -0.06],
  rotors: [0.06, -0.06, 0.04, -0.06],
};
const _RB_PROP_ZERO = [0, 0, 0, 0];
// Sınırlar: dış takım (bot/tank) ile iç takım (uçan/ince) arasındaki fark
// korunur ama uçlarda kask HP çubuğuna değmesin / parçalar gövdeden kopmasın.
const _RB_PROP_LIMIT = [
  [0.84, 1.24], // head
  [0.84, 1.16], // torsoX
  [0.88, 1.22], // legs
  [0.88, 1.16], // stance
];

const _rbPropCache = new Map();
function _rbProportions(def) {
  if (!def || def.visualKind !== "robot") return { head: 1, torsoX: 1, legs: 1, stance: 1, upperDy: 0 };
  const key = def.id || "?";
  const hit = _rbPropCache.get(key);
  if (hit) return hit;
  const c = _RB_PROP_CHASSIS[def.chassis] || _RB_PROP_ZERO;
  const b = _RB_PROP_BODY[def.body] || _RB_PROP_ZERO;
  const l = _RB_PROP_LOCO[def.locomotion] || _RB_PROP_ZERO;
  // Tohum sapması: aynı aileyi paylaşan robotlar (ör. 9 `heavy`) birbirinin
  // kopyası olmasın diye her eksende ±0.05 kaydırma.
  const s = _rbSeed(key, "prop");
  const jit = [
    (s - 0.5) * 0.10,
    (((s * 7.13) % 1) - 0.5) * 0.10,
    (((s * 13.7) % 1) - 0.5) * 0.10,
    (((s * 23.3) % 1) - 0.5) * 0.10,
  ];
  const out = { head: 1, torsoX: 1, legs: 1, stance: 1, upperDy: 0 };
  const names = ["head", "torsoX", "legs", "stance"];
  for (let i = 0; i < 4; i++) {
    const lim = _RB_PROP_LIMIT[i];
    const v = 1 + c[i] + b[i] + l[i] + jit[i];
    out[names[i]] = Math.max(lim[0], Math.min(lim[1], v));
  }
  // Üst gövdenin dikey kayması (r oranı): kalça `0.04r`den `1 - 0.96·legs`e
  // gider; torso/kask/kol/namlu bu kadar kaydırılır ki ayaklar yerde kalsın.
  out.upperDy = 0.96 * (1 - out.legs) - (def.id === "kopek" ? 0.55 : 0);
  _rbPropCache.set(key, out);
  return out;
}

const RB_VISUAL_SCALE = 1.10;

// Verilen gövde merkezi, yarıçap, bakış yönü ve nişan açısı için namlu ağzının
// dünya konumu. Bakış yönü yalnız pivotun aynalanmasını etkiler; namlu HER
// ZAMAN nişan yönüne bakar (çizimde de `ctx.scale(facing,1)` bunu yapar).
// `r` fizik yarıçapıdır; çizimle aynı kalmak için görsel ölçek burada uygulanır.
// `charDef` verilirse oran grameri de uygulanır (`_rbProportions`): geniş gövde
// namlu pivotunu yana, uzun bacak ise omzu yukarı taşır. Çizim aynı iki değeri
// kullandığı için hiza kaymaz; `tests/run.js` "Nişan hizası" grubu bunu tutar.
function robotMuzzlePoint(cx, cy, r, facing, aim, charDef) {
  r *= RB_VISUAL_SCALE;
  const p = _rbProportions(charDef);
  const px = cx + (facing < 0 ? -1 : 1) * r * RB_GUN_PIVOT_X * p.torsoX;
  const py = cy + r * (RB_GUN_PIVOT_Y + p.upperDy);
  return {
    x: px + Math.cos(aim) * r * RB_GUN_MUZZLE,
    y: py + Math.sin(aim) * r * RB_GUN_MUZZLE,
  };
}

// Robotun ÇİZİLEN en üst noktası (gövde merkezine göre, `r` oranı; negatif =
// yukarı). `Entity.draw` HP çubuğunu bu noktanın üstüne koyar — sabit `-r`
// varsayımı yüksek kasklı/antenli robotlarda çubuğu kafanın içine sokuyordu.
// Pay 0.45r: anten, siren lambası ve sırt modülü kask kabuğunun üstüne taşar.
function robotTopOffset(charDef) {
  const p = _rbProportions(charDef);
  return p.upperDy - 0.48 - 0.84 * p.head - 0.45;
}

function _rbLauncher(ctx, ang, r, accent, px, py) {
  const len = r * 1.42, th = r * 0.28;
  const outline = "#0a0d0f";
  ctx.save();
  ctx.translate(px === undefined ? r * RB_GUN_PIVOT_X : px, py === undefined ? r * RB_GUN_PIVOT_Y : py);
  ctx.rotate(ang);
  // dipçik
  _rbRoundRect(ctx, -r * 0.46, -th * 0.55, r * 0.40, th * 1.10, th * 0.40);
  ctx.fillStyle = "#2b3238"; ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1.2, r * 0.07); ctx.stroke();
  // ana boru
  _rbRoundRect(ctx, -r * 0.16, -th * 0.5, len, th, th * 0.34);
  ctx.fillStyle = "#39424a"; ctx.fill();
  ctx.strokeStyle = outline; ctx.stroke();
  // vurgu şeridi
  ctx.fillStyle = accent;
  ctx.fillRect(r * 0.10, -th * 0.30, r * 0.32, th * 0.16);
  // namlu ağzı + aksan halkası (atış yönünü okutur)
  _rbRoundRect(ctx, len - r * 0.20, -th * 0.62, r * 0.30, th * 1.24, th * 0.30);
  ctx.fillStyle = "#232a30"; ctx.fill();
  ctx.strokeStyle = outline; ctx.stroke();
  ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1.2, r * 0.06);
  ctx.beginPath(); ctx.arc(len - r * 0.06, 0, th * 0.44, 0, Math.PI * 2); ctx.stroke();
  // arpacık
  _rbLimb(ctx, r * 0.30, -th * 0.50, r * 0.34, -th * 1.05, r * 0.04, accent);
  // kabza
  _rbRoundRect(ctx, r * 0.04, th * 0.30, r * 0.15, r * 0.32, r * 0.06);
  ctx.fillStyle = "#20262b"; ctx.fill();
  ctx.strokeStyle = outline; ctx.stroke();
  ctx.restore();
}

// ── Aparatlar ──────────────────────────────────────────────────────────────
// Aparat üç yere takılabilir: elde taşınan alet (WRIST), sırttaki omuz topu
// (CANNON) ve sırt modülü/hale (RIG). Böylece karakter kimliği hem menüde hem
// maçta aynı yerde ve aynı biçimde okunur.

const _RB_WRIST_TOOLS = new Set(["welder", "press", "cutter", "rotary_arm", "clamp", "mallet", "hammer", "punch", "ground_ram", "drill"]);
const _RB_CANNONS = new Set(["twin_loader", "gas_nozzle", "coolant_wave", "slag_cannon", "coolant_cannon", "rivet_rack", "bolt_launcher", "acid_nozzle"]);

const _RB_METAL = "#9aa4ad";
const _RB_DARK = "#2a3136";
const _RB_OUTLINE = "#0a0d0f";

// Elde taşınan alet: el/kol ekseninde (`ang`) ileri uzanan bir uç.
function _rbWristTool(ctx, tag, x, y, ang, r, accent, color) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  const lw = Math.max(1.2, r * 0.07);
  const box = (bx, by, bw, bh, fill) => {
    _rbRoundRect(ctx, bx, by, bw, bh, r * 0.06);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = _RB_OUTLINE; ctx.lineWidth = lw; ctx.stroke();
  };
  if (tag === "welder") {
    box(r * 0.10, -r * 0.08, r * 0.42, r * 0.16, _RB_METAL);
    _rbLimb(ctx, r * 0.52, 0, r * 0.80, 0, r * 0.11, "#c9d3da");
    ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1.6, r * 0.08);
    ctx.beginPath(); ctx.arc(r * 0.84, 0, r * 0.17, -1.0, 1.0); ctx.stroke();
  } else if (tag === "press") {
    box(r * 0.34, -r * 0.30, r * 0.24, r * 0.60, _RB_METAL);
    box(r * 0.02, -r * 0.10, r * 0.34, r * 0.20, _RB_DARK);
  } else if (tag === "cutter") {
    _rbLimb(ctx, r * 0.10, 0, r * 0.42, 0, r * 0.13, _RB_DARK);
    _rbDot(ctx, r * 0.60, 0, r * 0.26, _RB_METAL, _RB_OUTLINE);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      _rbLine(ctx, r * 0.60 + Math.cos(a) * r * 0.24, Math.sin(a) * r * 0.24,
        r * 0.60 + Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34, _RB_METAL, lw);
    }
    _rbDot(ctx, r * 0.60, 0, r * 0.07, accent, _RB_OUTLINE);
  } else if (tag === "rotary_arm") {
    _rbLimb(ctx, r * 0.06, 0, r * 0.42, -r * 0.14, r * 0.13, _RB_METAL);
    _rbLimb(ctx, r * 0.42, -r * 0.14, r * 0.72, r * 0.10, r * 0.12, _RB_METAL);
    _rbLimb(ctx, r * 0.72, r * 0.10, r * 0.98, -r * 0.06, r * 0.10, accent);
    _rbJoint(ctx, r * 0.42, -r * 0.14, r * 0.07, accent);
  } else if (tag === "clamp") {
    _rbLimb(ctx, r * 0.10, 0, r * 0.48, 0, r * 0.15, _RB_METAL);
    _rbLimb(ctx, r * 0.48, 0, r * 0.86, -r * 0.20, r * 0.12, _RB_METAL);
    _rbLimb(ctx, r * 0.48, 0, r * 0.86, r * 0.20, r * 0.12, _RB_METAL);
    _rbJoint(ctx, r * 0.48, 0, r * 0.08, accent);
  } else if (tag === "mallet") {
    _rbLimb(ctx, r * 0.04, 0, r * 0.66, 0, r * 0.11, "#8a5a2b");
    box(r * 0.60, -r * 0.22, r * 0.40, r * 0.44, _RB_METAL);
  } else if (tag === "hammer") {
    _rbLimb(ctx, r * 0.04, 0, r * 0.60, 0, r * 0.10, "#8a5a2b");
    box(r * 0.54, -r * 0.20, r * 0.34, r * 0.40, _RB_DARK);
    ctx.fillStyle = accent; ctx.fillRect(r * 0.80, -r * 0.20, r * 0.08, r * 0.40);
  } else if (tag === "punch") {
    _rbLimb(ctx, r * 0.06, 0, r * 0.42, 0, r * 0.14, _RB_METAL);
    ctx.beginPath();
    ctx.moveTo(r * 0.42, -r * 0.14); ctx.lineTo(r * 0.86, 0); ctx.lineTo(r * 0.42, r * 0.14);
    ctx.closePath();
    ctx.fillStyle = "#dfe7ee"; ctx.fill();
    ctx.strokeStyle = _RB_OUTLINE; ctx.lineWidth = lw; ctx.stroke();
  } else if (tag === "ground_ram") {
    box(r * 0.12, -r * 0.16, r * 0.40, r * 0.32, _RB_METAL);
    box(r * 0.52, -r * 0.40, r * 0.16, r * 0.80, _RB_DARK);
  } else if (tag === "drill") {
    _rbLimb(ctx, r * 0.06, 0, r * 0.36, 0, r * 0.15, _RB_DARK);
    ctx.beginPath();
    ctx.moveTo(r * 0.36, -r * 0.18); ctx.lineTo(r * 0.98, 0); ctx.lineTo(r * 0.36, r * 0.18);
    ctx.closePath();
    ctx.fillStyle = _RB_METAL; ctx.fill();
    ctx.strokeStyle = _RB_OUTLINE; ctx.lineWidth = lw; ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const t = 0.42 + i * 0.18;
      _rbLine(ctx, r * t, -r * 0.12 * (1 - i * 0.3), r * (t + 0.06), r * 0.12 * (1 - i * 0.3), _RB_OUTLINE, lw);
    }
  }
  ctx.restore();
}

// Sırttaki omuz topu: gövdenin arkasından öne uzanan namlu/pod.
function _rbCannon(ctx, tag, r, accent, color) {
  const bx = -r * 0.08, by = -r * 0.40;
  const lw = Math.max(1.2, r * 0.07);
  const outline = _RB_OUTLINE;
  // taşıyıcı gövde
  _rbRoundRect(ctx, bx - r * 0.28, by - r * 0.17, r * 0.42, r * 0.34, r * 0.10);
  ctx.fillStyle = _RB_DARK; ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();

  const barrel = (len, th, fill, y) => {
    _rbRoundRect(ctx, bx, (y === undefined ? by : y) - th / 2, len, th, th * 0.35);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();
  };

  if (tag === "twin_loader") {
    barrel(r * 0.72, r * 0.14, _RB_METAL, by - r * 0.09);
    barrel(r * 0.72, r * 0.14, _RB_METAL, by + r * 0.09);
  } else if (tag === "rivet_rack") {
    _rbRoundRect(ctx, bx - r * 0.04, by - r * 0.21, r * 0.44, r * 0.42, r * 0.08);
    ctx.fillStyle = _RB_METAL; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();
    for (const dy of [-r * 0.11, 0, r * 0.11]) _rbDot(ctx, bx + r * 0.25, by + dy, r * 0.05, accent, outline);
  } else if (tag === "bolt_launcher") {
    barrel(r * 0.56, r * 0.22, "#5b6167", by);
    _rbDot(ctx, bx + r * 0.56, by, r * 0.10, accent, outline);
  } else if (tag === "coolant_cannon") {
    _rbRoundRect(ctx, bx - r * 0.32, by - r * 0.32, r * 0.28, r * 0.28, r * 0.11);
    ctx.fillStyle = accent; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();
    barrel(r * 0.68, r * 0.17, _RB_METAL, by);
  } else if (tag === "coolant_wave") {
    barrel(r * 0.40, r * 0.26, _RB_METAL, by);
    _rbRoundRect(ctx, bx + r * 0.40, by - r * 0.24, r * 0.14, r * 0.48, r * 0.06);
    ctx.fillStyle = accent; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();
  } else if (tag === "gas_nozzle" || tag === "acid_nozzle") {
    barrel(r * 0.48, r * 0.13, _RB_METAL, by);
    ctx.beginPath();
    ctx.moveTo(bx + r * 0.48, by - r * 0.09);
    ctx.lineTo(bx + r * 0.74, by - r * 0.19);
    ctx.lineTo(bx + r * 0.74, by + r * 0.19);
    ctx.lineTo(bx + r * 0.48, by + r * 0.09);
    ctx.closePath();
    ctx.fillStyle = tag === "acid_nozzle" ? "#8cdc5a" : "#a8b0b8"; ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();
  } else if (tag === "slag_cannon") {
    barrel(r * 0.48, r * 0.28, "#4a4038", by);
    _rbDot(ctx, bx + r * 0.48, by, r * 0.12, "#ff7a2a", outline);
    ctx.globalAlpha = 0.5;
    _rbDot(ctx, bx + r * 0.52, by, r * 0.19, "#ffb347", outline);
    ctx.globalAlpha = 1;
  }
}

// Sırt modülü / hale / kanca. Hale takılan aileler kaskın arkasında halka olur.
function _rbRig(ctx, tag, r, accent, color, timeMs) {
  const lw = Math.max(1.2, r * 0.07);
  const outline = _RB_OUTLINE;
  // Sırt plakası: aparatın gövdeye bağlandığı ortak parça
  _rbRoundRect(ctx, -r * 0.34, -r * 0.44, r * 0.30, r * 0.56, r * 0.10);
  ctx.fillStyle = _RB_DARK; ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();
  _rbFillGloss(ctx, -r * 0.36, -r * 0.46, r * 0.34, r * 0.26, r * 0.10, 0.12);
  for (const dy of [-r * 0.32, r * 0.04]) _rbDot(ctx, -r * 0.19, dy, r * 0.035, _RB_METAL, outline);

  const halo = () => {
    ctx.strokeStyle = _RB_METAL;
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath(); ctx.arc(0, -r * 0.82, r * 0.72, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath(); ctx.arc(0, -r * 0.82, r * 0.72, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  };

  if (tag === "magnet") {
    halo();
    ctx.fillStyle = "#ff5d5d"; ctx.fillRect(-r * 0.78, -r * 0.82, r * 0.20, r * 0.24);
    ctx.fillStyle = "#5dbbff"; ctx.fillRect(r * 0.58, -r * 0.82, r * 0.20, r * 0.24);
  } else if (tag === "emp_coil") {
    halo();
    for (const t of [0.18, 0.34, 0.50]) {
      const a = Math.PI * (1.05 + t * 0.9);
      _rbDot(ctx, Math.cos(a) * r * 0.72, -r * 0.82 + Math.sin(a) * r * 0.72, r * 0.07, accent, outline);
    }
  } else if (tag === "resonator") {
    halo();
    _rbLimb(ctx, -r * 0.30, -r * 1.24, -r * 0.52, -r * 1.58, r * 0.07, _RB_METAL);
    _rbLimb(ctx, r * 0.30, -r * 1.24, r * 0.52, -r * 1.58, r * 0.07, _RB_METAL);
  } else if (tag === "cryo_ring") {
    halo();
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (1.12 + i * 0.19);
      const cx = Math.cos(a) * r * 0.72, cy = -r * 0.82 + Math.sin(a) * r * 0.72;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.14); ctx.lineTo(cx + r * 0.08, cy + r * 0.04); ctx.lineTo(cx - r * 0.08, cy + r * 0.04);
      ctx.closePath();
      ctx.fillStyle = accent; ctx.fill();
    }
  } else if (tag === "armor_lock") {
    halo();
    for (const a of [Math.PI * 1.10, Math.PI * 1.50, Math.PI * 1.90]) {
      _rbDot(ctx, Math.cos(a) * r * 0.72, -r * 0.82 + Math.sin(a) * r * 0.72, r * 0.09, _RB_METAL, outline);
    }
  } else if (tag === "optical") {
    halo();
    _rbDot(ctx, 0, -r * 1.52, r * 0.13, accent, outline);
  } else if (tag === "bearing") {
    halo();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (1.05 + i * 0.15);
      _rbDot(ctx, Math.cos(a) * r * 0.72, -r * 0.82 + Math.sin(a) * r * 0.72, r * 0.05, "#d8d8d8", outline);
    }
  } else if (tag === "spinner") {
    halo();
    const spin = (timeMs || 0) / 240;
    for (let i = 0; i < 3; i++) {
      const a = spin + (i / 3) * Math.PI * 2;
      _rbLine(ctx, 0, -r * 0.82, Math.cos(a) * r * 0.56, -r * 0.82 + Math.sin(a) * r * 0.56, _RB_METAL, Math.max(2, r * 0.10));
    }
  } else if (tag === "turbo") {
    _rbRoundRect(ctx, -r * 0.72, -r * 0.38, r * 0.40, r * 0.44, r * 0.14);
    ctx.fillStyle = _RB_METAL; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.32, -r * 0.32); ctx.lineTo(-r * 0.02, -r * 0.16); ctx.lineTo(-r * 0.32, 0);
    ctx.closePath();
    ctx.fillStyle = accent; ctx.fill();
  } else if (tag === "fan" || tag === "vortex_fan") {
    _rbDot(ctx, -r * 0.30, -r * 0.62, r * 0.32, "#1d2226", outline);
    for (let i = 0; i < 4; i++) {
      const a = (timeMs || 0) / 200 + (i / 4) * Math.PI * 2;
      _rbLine(ctx, -r * 0.30, -r * 0.62, -r * 0.30 + Math.cos(a) * r * 0.28, -r * 0.62 + Math.sin(a) * r * 0.28, accent, Math.max(1.6, r * 0.09));
    }
  } else if (tag === "pressure_tank") {
    _rbRoundRect(ctx, -r * 0.40, -r * 0.38, r * 0.30, r * 0.70, r * 0.14);
    ctx.fillStyle = _RB_METAL; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();
    ctx.fillStyle = accent; ctx.fillRect(-r * 0.40, -r * 0.10, r * 0.30, r * 0.10);
  } else if (tag === "coil" || tag === "overcoil") {
    _rbRoundRect(ctx, -r * 0.44, -r * 0.28, r * 0.30, r * 0.58, r * 0.10);
    ctx.fillStyle = _RB_DARK; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();
    _rbCoil(ctx, -r * 0.29, -r * 0.24, -r * 0.29, r * 0.26, r * 0.16, accent, tag === "overcoil" ? 6 : 4);
  } else if (tag === "hook") {
    _rbLimb(ctx, -r * 0.20, -r * 0.38, -r * 0.20, -r * 0.84, r * 0.06, _RB_METAL);
    ctx.strokeStyle = _RB_METAL; ctx.lineWidth = Math.max(2, r * 0.10);
    ctx.beginPath(); ctx.arc(-r * 0.10, -r * 0.84, r * 0.20, Math.PI * 0.95, Math.PI * 0.15); ctx.stroke();
  }
}

// Aparat III hazırken (yalnız görsel) aparatın çevresine hafif vurgu ışığı.
// Deterministik kalır; zaman kaynağı kullanılmaz.
function _rbAttachmentGlow(ctx, tag, r, accent, gear) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  const g = gear || {};
  if (_RB_WRIST_TOOLS.has(tag)) {
    ctx.beginPath(); ctx.arc(g.handFx || 0, g.handFy || 0, r * 0.44, 0, Math.PI * 2); ctx.stroke();
  } else if (_RB_CANNONS.has(tag)) {
    ctx.beginPath(); ctx.arc(r * 0.10, -r * 0.40, r * 0.44, 0, Math.PI * 2); ctx.stroke();
  } else if (tag === "siren") {
    ctx.beginPath(); ctx.arc(0, -r * 1.36, r * 0.34, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(-r * 0.10, -r * 0.58, r * 0.50, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// ── Ana çizici ─────────────────────────────────────────────────────────────

function drawRobot(ctx, options) {
  const o = options || {};
  const def = o.charDef;
  if (!def || def.visualKind !== "robot") return false;

  // Roster illüstrasyonları hazır olduğunda karakteri doğrudan üretilmiş
  // şeffaf sprite ile çiz. Hareket verisi yalnız hafif gövde salınımı verir;
  // fizik yarıçapı, çarpışma ve namlu koordinatları değişmez.
  const sprite = typeof assetImage === "function" ? assetImage("robots/" + def.id) : null;
  if (sprite) {
    const r = Math.max(4, (o.r || def.r || 14) * RB_VISUAL_SCALE);
    const facing = o.facing < 0 ? -1 : 1;
    const motion = o.motion || {};
    const walk = Math.max(Math.min(1, Math.abs(motion.walkAmp != null ? motion.walkAmp : motion.walk || 0)), Math.min(1, Math.abs(motion.vx || 0) / 2.2));
    const phase = Number.isFinite(motion.walkPhase) ? motion.walkPhase : (o.timeMs || 0) / 1000 * 4;
    const bob = motion.onGround === false ? 0 : -Math.abs(Math.cos(phase)) * r * 0.035 * walk + Math.sin((o.timeMs || 0) / 900) * r * 0.01;
    const sway = Math.sin(phase) * r * 0.018 * walk;
    ctx.save();
    ctx.translate((o.cx || 0) + sway, (o.cy || 0) + bob);
    ctx.scale(facing, 1);
    ctx.drawImage(sprite, -r * 1.16, -r * 1.52, r * 2.32, r * 3.04);
    const weapon = Number.isFinite(o.aim) && typeof assetImage === "function" ? assetImage("weapons/launcher") : null;
    if (weapon) {
      const localAim = Math.atan2(Math.sin(o.aim), Math.cos(o.aim) * facing);
      ctx.save();
      ctx.translate(r * 0.28, -r * 0.42);
      ctx.rotate(localAim);
      ctx.drawImage(weapon, -r * 0.40, -r * 0.31, r * 1.35, r * 0.76);
      ctx.restore();
    }
    ctx.restore();
    return true;
  }

  // Görsel ölçek: fizik yarıçapı olduğu gibi kalır, yalnız çizim büyür
  // (RB_VISUAL_SCALE; aynı sabit `robotMuzzlePoint` içinde de uygulanır).
  const r = Math.max(4, (o.r || def.r || 14) * RB_VISUAL_SCALE);
  const facing = o.facing < 0 ? -1 : 1;
  const accent = def.accent || "#63e6be";
  const color = def.color || "#777777";
  const seed = _rbSeed(def.id);
  const motion = o.motion || {};
  const timeMs = o.timeMs || 0;
  const air = motion.onGround === false;

  // ── Yürüyüş döngüsü ───────────────────────────────────────────────────
  // Animasyon `Entity` durumundan gelir: `motion.walk` adım sinyali (±1),
  // `motion.walkAmp` yumuşatılmış zarf, `motion.walkPhase`/`rollPhase` ise
  // MESAFEYE kilitli faz açılarıdır. Yerde yürüme `vx` kullanmadığı için bu
  // alanlar olmadan animasyon tetiklenmez/tempo tutmaz. `vx` yine de okunur:
  // hücum/kayma gibi itmelerde de bacaklar çalışsın.
  const vx = Math.abs(motion.vx || 0);
  const wt = motion.walk || 0;
  // Genlik zarfı: `Entity` yumuşatılmış `walkAmp` verirse onu kullan (adım
  // başlarken/biterken bacaklar kademeli açılır). Menü/kart çizimleri ve eski
  // çağrılar `walkAmp` vermez; onlarda ham adım sinyali yedektir.
  const ampRaw = motion.walkAmp != null ? Math.abs(motion.walkAmp) : Math.abs(wt);
  const amp = Math.max(Math.min(1, ampRaw), Math.min(1, vx / 2.2));
  const walking = !air && amp > 0.06;
  // Geri giderken faz ters döner ki ayaklar gövdeye göre doğru yönde savrulsun
  // (yalnız yedek yol kullanır; `walkPhase` zaten gövde-yereldir).
  const dir = ((wt || motion.vx || 0) * facing) >= 0 ? 1 : -1;
  // Adım fazı MESAFEYE kilitlidir (`motion.walkPhase`): yürüyüş hızı artınca
  // animasyon da hızlanır, yavaşlayınca yavaşlar ve ayak yere basarken
  // gövdeye göre geriye akar (adım başına ~%14 kayma payı). Yedek yol
  // zaman tabanlıdır (hareketsiz menü/kart çizimlerinde fark etmez).
  const phase = motion.walkPhase != null
    ? motion.walkPhase
    : (timeMs / 1000) * (2.0 + vx * 1.2) * dir;
  // Yuvarlanan alt takım (teker/bilye/palet) açısı: o da mesafeyle döner.
  const roll = air ? 0
    : motion.rollPhase != null ? motion.rollPhase
    : (walking ? dir * (timeMs / 1000) * (2.2 + vx * 2.0) : 0);
  const gait = { walking, air, phase, roll, amp, vy: motion.vy || 0, timeMs };
  // Kollar bacaklara ters salınır (denge); genlik adım sinyaliyle söner.
  const armSwing = walking ? -Math.sin(phase) * 0.6 * amp : 0;
  // Yürüyüş salınımı: gövde her adımda hafifçe kalkar (bacaklar yan yana
  // geçerken) ve iki adımda bir yana kayar. Ayaklar yere basılıyken faz
  // mesafeye kilitli olduğu için salınım adımlarla senkron kalır.
  const bobY = walking
    ? (-Math.abs(Math.cos(phase)) * 0.045 + Math.abs(Math.sin(phase)) * 0.018) * r * amp
    : (!air ? Math.sin(timeMs / 900) * 0.012 * r : 0); // boşta hafif nefes
  const swayX = walking ? Math.sin(phase) * r * 0.022 * amp : 0;
  // Ayak/bacak detayları gövde vidalarından bağımsız serpilsin diye ayrı tohum.
  const seedFoot = _rbSeed(def.id, "foot");

  // Nişan: verilmişse eller namluyu kavrar (maç içi); verilmemişse eller gevşek
  // durur (menü, kart, portre). Yerel açı ctx.scale(facing,1) aynalamasını
  // telafi eder.
  const aim = Number.isFinite(o.aim) ? o.aim : null;
  const localAim = aim === null ? 0 : Math.atan2(Math.sin(aim), Math.cos(aim) * facing);
  const holding = aim !== null;

  const shFX = r * 0.36, shFY = -r * 0.38;
  const shBX = -r * 0.34, shBY = -r * 0.38;
  // Oran grameri: kask ölçeği, gövde genişliği, bacak uzunluğu ve ayak
  // açıklığı aile verisinden gelir. Bacak uzunluğu üst gövdeyi kaydırır
  // (`upperDy`), bu yüzden namlu pivotu da kayar — `robotMuzzlePoint` aynı
  // değerleri okur (nişan hizası bekçisi tests/run.js'te).
  const props = _rbProportions(def);
  const torsoX = props.torsoX;
  const upperDy = props.upperDy * r;
  const neckY = -r * 0.48;
  // Namlu omuz hizasında taşınır: gövdeyi ortadan kesmesin. Pivot geometrisi
  // `robotMuzzlePoint` ile ortaktır (nişan çizgisi/mermi de aynı noktadan çıkar).
  const gunX = r * RB_GUN_PIVOT_X * torsoX, gunY = r * RB_GUN_PIVOT_Y;
  let handF, handB;
  if (holding) {
    const ax = Math.cos(localAim), ay = Math.sin(localAim);
    handF = { x: gunX + ax * r * 0.66 - ay * r * 0.15, y: gunY + ay * r * 0.66 + ax * r * 0.15 };
    handB = { x: gunX + ax * r * 0.16 - ay * r * 0.12, y: gunY + ay * r * 0.16 + ax * r * 0.12 };
  } else if (air) {
    handF = { x: r * 0.62, y: -r * 0.08 };
    handB = { x: -r * 0.54, y: -r * 0.04 };
  } else {
    handF = { x: r * 0.58 + armSwing * r * 0.18, y: r * 0.16 - Math.abs(armSwing) * r * 0.10 };
    handB = { x: -r * 0.52 - armSwing * r * 0.18, y: r * 0.20 };
  }
  const handAngleF = holding ? localAim : Math.PI * 0.42;
  const handAngleB = holding ? localAim : Math.PI * 0.50;
  const handSize = r * 0.52;

  ctx.save();
  ctx.translate(o.cx || 0, o.cy || 0);
  ctx.scale(facing, 1);
  // Salınım gövde-yerel uygulanır (aynalamadan etkilenmesin).
  ctx.translate(swayX, bobY);

  // Üst gövde (sırt modülü, omuz topu, arka kol) bacak uzunluğuyla kayar.
  ctx.save();
  ctx.translate(0, upperDy);
  // 1) Sırttaki modül/hale (gövdenin arkasında kalır)
  _rbRig(ctx, def.attachment, r, accent, color, timeMs);
  // 2) Yerden süzülen robotlarda omuz arkası pervane
  if (def.locomotion === "rotors") {
    _rbDot(ctx, -r * 0.52, -r * 0.56, r * 0.30, "#1d2226", _RB_OUTLINE);
    for (let i = 0; i < 3; i++) {
      const a = timeMs / 200 + (i / 3) * Math.PI * 2;
      _rbLine(ctx, -r * 0.52, -r * 0.56, -r * 0.52 + Math.cos(a) * r * 0.28, -r * 0.56 + Math.sin(a) * r * 0.28, accent, Math.max(1.6, r * 0.09));
    }
  }
  // 3) Sırttaki omuz topu
  if (_RB_CANNONS.has(def.attachment)) _rbCannon(ctx, def.attachment, r, accent, color);
  // 4) Arka kol (derinlik için koyu; namluyu alttan destekler)
  // Omuz noktaları gövde genişliğiyle ölçeklenir; eller namluya bağlı kalır.
  _rbArm(ctx, shBX * torsoX, shBY, handB.x, handB.y, -r * 0.16, r * 0.19, _rbShade(color, -0.16));
  _rbHand(ctx, handB.x, handB.y, handAngleB, handSize, _rbShade(color, -0.16), holding);
  ctx.restore();
  // 5) Bacaklar: YER TEMASINA göre ölçeklenir (ayak yere basılı kalır, kalça
  //    yukarı/aşağı kayar). Üst gövde aynı kaymayı `upperDy` ile alır.
  ctx.save();
  ctx.translate(0, r);
  ctx.scale(props.stance, props.legs);
  ctx.translate(0, -r);
  _rbLegs(ctx, def.locomotion, r, color, accent, gait, seedFoot);
  ctx.restore();
  // Gövde + kask + namlu + ön kol: bacak kaymasını izler.
  ctx.save();
  ctx.translate(0, upperDy);
  // Genişlik yalnız x ekseninde: gövde/omuz genişler, yükseklik ve namlu
  // kalınlığı değişmez (namlu bu yüzden ayrı çizilir).
  ctx.save();
  ctx.scale(torsoX, 1);
  _rbTorso(ctx, def, r, color, accent, seed);
  if (o.playerTint) {
    // Operatör rengi silueti değiştirmez: yalnız ince bir göğüs şeridi.
    ctx.fillStyle = o.playerTint;
    ctx.fillRect(-r * 0.32, -r * 0.20, r * 0.64, r * 0.11);
  }
  _rbShoulders(ctx, def.chassis, r, color, accent);
  ctx.restore();
  // Namlu kafa katmanının arkasında kalır; yüksek açıyla yüzü kapatmaz.
  if (holding) _rbLauncher(ctx, localAim, r, accent, gunX, gunY);
  // Kask: boyun pivotuna göre ölçeklenir (küçük kafa ↔ büyük kafa).
  ctx.save();
  ctx.translate(0, neckY);
  ctx.scale(props.head, props.head);
  ctx.translate(0, -neckY);
  const hy = _rbHead(ctx, def, r, color, accent);
  _rbHeadGear(ctx, def.attachment, r, accent, hy);
  ctx.restore();
  // Ön kol + el (namluyu kavrar) ve elde taşınan alet
  _rbArm(ctx, shFX * torsoX, shFY, handF.x, handF.y, r * 0.20, r * 0.21, color);
  _rbHand(ctx, handF.x, handF.y, handAngleF, handSize, color, holding);
  if (_RB_WRIST_TOOLS.has(def.attachment)) {
    _rbWristTool(ctx, def.attachment, handF.x, handF.y, handAngleF, r, accent, color);
  }
  if (o.upgradeVisuals && o.upgradeVisuals.attachmentGlow) {
    _rbAttachmentGlow(ctx, def.attachment, r, accent, { handFx: handF.x, handFy: handF.y });
  }
  ctx.restore(); // üst gövde kayması
  // 8) Takılı parça aksesuarları (v5): yuva→parça eşlemesi (id veya spec)
  // verilmezse hiçbir şey çizilmez — parçasız robot görünümü birebir korunur.
  // timeMs/walking canlı efektlerin (tarama çizgisi, egzoz alevi, LED sırası…)
  // fazını belirler; deterministiktir. Oranlar yuva bazında uygulanır: kask
  // parçaları kafa ölçeğini, kasa/sırt parçaları gövde genişliğini, ayak
  // parçaları yer temasını izler (yoksa parça gövdeden kopuyor).
  _rbPartAccessories(ctx, r, _rbPartSpecs(o.parts), timeMs, walking, props, upperDy);
  ctx.restore();
  return true;
}

/* Takılı parçaların robot siluetine eklediği donanımlar. Yuva→parça eşlemesi
 * id (profil loadout'u) veya doğrudan spec olabilir; bilinmeyen id/yuva yok
 * sayılır. Konumlar r oranlıdır ve rastgele/zaman kaynağı kullanılmaz — aynı
 * girdi aynı zamanda aynı çizimi verir (parçasız robotlarda çağrı hiç
 * yapılmaz, çizim imzası değişmez).
 *
 * Çözümleme WeakMap'te önbelleklenir: maç içinde loadout nesnesi sabit
 * olduğundan kare başına yeni nesne ÜRETİLMEZ (performans kuralı). */
const _rbPartSpecCache = new WeakMap();
function _rbPartSpecs(loadout) {
  if (!loadout || typeof loadout !== "object") return null;
  if (typeof partById !== "function") return null;
  const cached = _rbPartSpecCache.get(loadout);
  if (cached !== undefined) return cached;
  const slots = typeof PART_SLOTS !== "undefined" ? PART_SLOTS : ["helmet", "body", "tool", "feet"];
  const per = typeof PARTS_PER_SLOT === "number" ? PARTS_PER_SLOT : 2;
  const out = {};
  let any = false;
  for (const slot of slots) {
    const value = loadout[slot];
    const list = Array.isArray(value) ? value : [value];
    const specs = [];
    for (let i = 0; i < per; i++) {
      const p = partById(list[i]);
      specs.push(p || null);
      if (p) any = true;
    }
    out[slot] = specs;
  }
  const result = any ? out : null;
  _rbPartSpecCache.set(loadout, result);
  return result;
}

/* ── Parça donanımları (robot üzerinde) ─────────────────────────────────────
 * Takılı parçalar robotun siluetine yuva başına FARKLI donanımlar olarak
 * işlenir: her parçanın ikon şekli (spec.icon.shape) kendi çizim ailesini
 * seçer — ör. kaskta "lens" tek mercekli optik, "visor" tarama bandı + anten,
 * "armorHelm" tac plakası + yanak zırhı. Ortak dil: koyu kontur + düz gövde
 * dolgusu + üst parlaklık bandı + vurgu ışıkları (gradyan/shadowBlur yok,
 * Date.now/Math.random yok). Parça yoksa HİÇBİR şey çizilmez: parçasız robot
 * görünümü birebir korunur.
 */

// Donanım plakası: koyu kontur + dolgu + üst parlaklık (ortak zemin).
function _rbModPlate(ctx, x, y, w, h, rad, tint, lwScale) {
  _rbRoundRect(ctx, x, y, w, h, rad);
  ctx.fillStyle = tint; ctx.fill();
  ctx.strokeStyle = _rbShade(tint, -0.55);
  ctx.lineWidth = Math.max(1, Math.min(w, h) * (lwScale || 0.18));
  ctx.stroke();
  _rbFillGloss(ctx, x + w * 0.08, y + h * 0.10, w * 0.84, h * 0.36, rad * 0.8, 0.20);
}

// ── KASK: görüş hattına takılan optik/algı donanımları ─────────────────────
//
// Canlı efektler deterministiktir: yalnız `timeMs` fazına bağlı sinüs
// salınımlarıdır — Date.now/Math.random yok, kare başına allocation yok.
// `timeMs` verilmezse (eski çağrılar) efektler statik kalır.

// Tek mercekli nişan optiği: yatak halkası + mercek + nefes alan iris + gezen parıltı.
function _rbPartHelmLens(ctx, r, t, a, timeMs) {
  const cx = r * 0.18, cy = -r * 0.96;
  const ph = (timeMs || 0) / 1000;
  const pulse = 0.5 + 0.5 * Math.sin(ph * 2.2);
  _rbDot(ctx, cx, cy, r * 0.155, _rbShade(t, -0.45), _rbShade(t, -0.72));
  _rbDot(ctx, cx, cy, r * 0.110, t, _rbShade(t, -0.78));
  _rbDot(ctx, cx, cy, r * (0.048 + 0.008 * pulse), a, _rbShade(t, -0.6));
  // Mercek üzerinde yavaşça dönen tarama parıltısı.
  const ang = ph * 1.1;
  ctx.save();
  ctx.globalAlpha = 0.45 + 0.55 * pulse;
  _rbDot(ctx, cx + Math.cos(ang) * r * 0.072, cy + Math.sin(ang) * r * 0.072, r * 0.026, "#ffffff", _rbShade(t, -0.5));
  ctx.restore();
  // optik bağlantı kolu (vizör hattına iner)
  _rbLine(ctx, -r * 0.30, cy + r * 0.10, cx - r * 0.14, cy + r * 0.03, _rbShade(t, -0.30), Math.max(1.2, r * 0.055));
}

// Tarama bandı: gövde + vurgu tikleri + soldan sağa kayan tarama çizgisi +
// yanıp sönen anten ucu.
function _rbPartHelmVisor(ctx, r, t, a, timeMs) {
  const w = r * 0.62, h = r * 0.17, x = -w / 2, y = -r * 1.06;
  const ph = (timeMs || 0) / 1000;
  _rbModPlate(ctx, x, y, w, h, h * 0.38, t, 0.22);
  for (let i = 0; i < 3; i++) {
    const px = x + w * (0.22 + i * 0.28);
    _rbLine(ctx, px, y + h * 0.26, px, y + h * 0.74, a, Math.max(1, r * 0.038));
  }
  // Tarama çizgisi bandın içinde döngüyle kayar; kenarlarda sönerek girer/çıkar.
  const sweep = (ph * 0.85) % 1;
  ctx.save();
  ctx.globalAlpha = 0.30 + 0.60 * Math.sin(sweep * Math.PI);
  _rbLine(ctx, x + w * (0.10 + 0.80 * sweep), y + h * 0.14, x + w * (0.10 + 0.80 * sweep), y + h * 0.86, "#ffffff", Math.max(1.3, r * 0.055));
  ctx.restore();
  _rbLine(ctx, r * 0.30, y + h * 0.5, r * 0.42, y - r * 0.16, _rbShade(t, -0.40), Math.max(1.3, r * 0.055));
  ctx.save();
  ctx.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(ph * 5));
  _rbDot(ctx, r * 0.42, y - r * 0.21, r * 0.055, a, _rbShade(t, -0.6));
  ctx.restore();
}

// Yan jiroskop diski: yavaşça DÖNEN üç kol + göbek.
function _rbPartHelmGyro(ctx, r, t, a, timeMs) {
  const cx = -r * 0.26, cy = -r * 0.90, rad = r * 0.17;
  const rot = ((timeMs || 0) / 1000) * 0.9;
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fillStyle = _rbShade(t, -0.52); ctx.fill();
  ctx.strokeStyle = _rbShade(t, -0.75); ctx.lineWidth = Math.max(1, r * 0.04); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, rad * 0.92, 0, Math.PI * 2);
  ctx.strokeStyle = t; ctx.lineWidth = Math.max(1.2, r * 0.06); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const ang = -Math.PI / 2 + i * (Math.PI * 2 / 3) + rot;
    _rbLine(ctx, cx + Math.cos(ang) * rad * 0.22, cy + Math.sin(ang) * rad * 0.22,
      cx + Math.cos(ang) * rad * 0.90, cy + Math.sin(ang) * rad * 0.90, a, Math.max(1.1, r * 0.05));
  }
  _rbDot(ctx, cx, cy, r * 0.05, a);
}

// Zırh kaskı: tac plakası + iki yanak plakası (perçinli) — statik zırh.
function _rbPartHelmArmor(ctx, r, t, a) {
  _rbModPlate(ctx, -r * 0.30, -r * 1.34, r * 0.60, r * 0.17, r * 0.06, t, 0.24);
  _rbDot(ctx, -r * 0.19, -r * 1.26, r * 0.035, a, _rbShade(t, -0.6));
  _rbDot(ctx, r * 0.19, -r * 1.26, r * 0.035, a, _rbShade(t, -0.6));
  for (const side of [-1, 1]) {
    _rbModPlate(ctx, side * r * 0.30 - r * 0.09, -r * 1.06, r * 0.18, r * 0.26, r * 0.05, _rbShade(t, -0.12), 0.22);
    _rbDot(ctx, side * r * 0.30, -r * 0.88, r * 0.035, a, _rbShade(t, -0.6));
  }
}

// ── GÖVDE: dayanım plakaları ────────────────────────────────────────────────

// Lehim yaması: açık yama + dalgalı dikiş + 4 perçin + dikişte gezinen sıcaklık.
function _rbPartBodyWeld(ctx, r, t, a, timeMs) {
  const x = -r * 0.30, y = -r * 0.16, w = r * 0.60, h = r * 0.32;
  const ph = (timeMs || 0) / 1000;
  _rbModPlate(ctx, x, y, w, h, r * 0.06, a, 0.20);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.10, y + h * 0.54);
  ctx.quadraticCurveTo(x + w * 0.32, y + h * 0.24, x + w * 0.52, y + h * 0.54);
  ctx.quadraticCurveTo(x + w * 0.72, y + h * 0.84, x + w * 0.90, y + h * 0.54);
  ctx.strokeStyle = t; ctx.lineWidth = Math.max(1.2, r * 0.055); ctx.stroke();
  for (const [fx, fy] of [[0.16, 0.22], [0.84, 0.22], [0.16, 0.80], [0.84, 0.80]]) {
    _rbDot(ctx, x + w * fx, y + h * fy, r * 0.045, t, _rbShade(a, -0.5));
  }
  // Dikiş boyunca ileri-geri giden parıltı (soğuyan kaynak izi).
  const gp = 0.5 + 0.5 * Math.sin(ph * 1.6);
  ctx.save();
  ctx.globalAlpha = 0.30 + 0.55 * gp;
  _rbDot(ctx, x + w * (0.14 + 0.72 * gp), y + h * (0.54 + 0.22 * Math.sin(ph * 1.6)), r * 0.035, "#ffffff", _rbShade(t, -0.4));
  ctx.restore();
}

// Katmanlı zırh plakası: taban + koyu kuşak + 2×3 perçin + orta çizgi (statik).
function _rbPartBodyPlate(ctx, r, t, a) {
  const x = -r * 0.32, y = -r * 0.16, w = r * 0.64, h = r * 0.32;
  _rbModPlate(ctx, x, y, w, h, r * 0.07, t, 0.20);
  _rbRoundRect(ctx, x + w * 0.06, y + h * 0.10, w * 0.88, h * 0.26, r * 0.04);
  ctx.fillStyle = _rbShade(t, -0.28); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const px = x + w * (0.16 + i * 0.34);
    _rbDot(ctx, px, y + h * 0.22, r * 0.042, a, _rbShade(t, -0.6));
    _rbDot(ctx, px, y + h * 0.78, r * 0.042, a, _rbShade(t, -0.6));
  }
  _rbLine(ctx, x + w * 0.10, y + h * 0.50, x + w * 0.90, y + h * 0.50, _rbShade(t, -0.42), Math.max(1.1, r * 0.04));
}

// Kanatçıklı radyatör: koyu taban + sırayla parlayan 4 kanat + raylar.
function _rbPartBodyRadiator(ctx, r, t, a, timeMs) {
  const x = -r * 0.30, y = -r * 0.16, w = r * 0.60, h = r * 0.32;
  const ph = (timeMs || 0) / 1000;
  _rbModPlate(ctx, x, y, w, h, r * 0.05, _rbShade(t, -0.22), 0.18);
  for (let i = 0; i < 4; i++) {
    ctx.save();
    // Isı dalgası kanatlarda soldan sağa dolaşır.
    ctx.globalAlpha = 0.60 + 0.40 * (0.5 + 0.5 * Math.sin(ph * 2.4 - i * 0.7));
    _rbRoundRect(ctx, x + w * (0.14 + i * 0.24), y + h * 0.20, w * 0.10, h * 0.60, r * 0.025);
    ctx.fillStyle = a; ctx.fill();
    ctx.strokeStyle = _rbShade(t, -0.55); ctx.lineWidth = Math.max(0.9, r * 0.03); ctx.stroke();
    ctx.restore();
  }
  _rbLine(ctx, x + w * 0.06, y + h * 0.10, x + w * 0.94, y + h * 0.10, _rbShade(t, -0.5), Math.max(1, r * 0.045));
  _rbLine(ctx, x + w * 0.06, y + h * 0.90, x + w * 0.94, y + h * 0.90, _rbShade(t, -0.5), Math.max(1, r * 0.045));
}

// ── APARAT: sırt modülü (omuz üstü) ────────────────────────────────────────

// Bobin modülü: 4 sarımda aşağıdan yukarı akan enerji + 2 terminal.
function _rbPartToolCoil(ctx, r, t, a, timeMs) {
  const x = -r * 0.68, y = -r * 0.76, w = r * 0.30, h = r * 0.32;
  const ph = (timeMs || 0) / 1000;
  _rbModPlate(ctx, x, y, w, h, r * 0.06, _rbShade(t, -0.22), 0.18);
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.globalAlpha = 0.50 + 0.50 * (0.5 + 0.5 * Math.sin(ph * 4 - i * 0.9));
    _rbLine(ctx, x + w * 0.16, y + h * (0.22 + i * 0.19), x + w * 0.84, y + h * (0.22 + i * 0.19), a, Math.max(1.1, r * 0.05));
    ctx.restore();
  }
  _rbDot(ctx, x + w * 0.5, y - r * 0.03, r * 0.045, a, _rbShade(t, -0.6));
  _rbDot(ctx, x + w * 0.5, y + h + r * 0.03, r * 0.045, a, _rbShade(t, -0.6));
}

// Şarjör: gövde + koyu pencere + 3 yay çizgisi + kapak rayı (statik).
function _rbPartToolLoader(ctx, r, t, a) {
  const x = -r * 0.68, y = -r * 0.76, w = r * 0.30, h = r * 0.34;
  _rbModPlate(ctx, x, y, w, h, r * 0.05, t, 0.18);
  _rbRoundRect(ctx, x + w * 0.20, y + h * 0.24, w * 0.60, h * 0.52, r * 0.03);
  ctx.fillStyle = _rbShade(t, -0.55); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const yy = y + h * (0.34 + i * 0.16);
    _rbLine(ctx, x + w * 0.26, yy, x + w * 0.74, yy, a, Math.max(1, r * 0.035));
  }
  _rbLine(ctx, x + w * 0.30, y - r * 0.02, x + w * 0.70, y - r * 0.02, _rbShade(t, -0.45), Math.max(1.2, r * 0.06));
}

// Basınç tankı: silindir + TİTREŞEN kadran ibresi + 2 cıvata.
function _rbPartToolTank(ctx, r, t, a, timeMs) {
  const x = -r * 0.66, y = -r * 0.74, w = r * 0.26, h = r * 0.30;
  const ph = (timeMs || 0) / 1000;
  _rbModPlate(ctx, x, y, w, h, w * 0.5, t, 0.18);
  const cx = x + w * 0.5, cy = y + h * 0.44, rad = w * 0.22;
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.strokeStyle = a; ctx.lineWidth = Math.max(1.1, r * 0.045); ctx.stroke();
  // İbre basınçla hafifçe titrer (kadran canlı okunur).
  const ang = -Math.PI * 0.5 + 0.55 + 0.16 * Math.sin(ph * 3.1);
  _rbLine(ctx, cx, cy, cx + Math.cos(ang) * rad * 0.82, cy + Math.sin(ang) * rad * 0.82, a, Math.max(1, r * 0.035));
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(ph * 2.2));
  _rbDot(ctx, cx, cy, r * 0.022, a);
  ctx.restore();
  _rbDot(ctx, x + w * 0.26, y + h * 0.86, r * 0.035, a, _rbShade(t, -0.6));
  _rbDot(ctx, x + w * 0.74, y + h * 0.86, r * 0.035, a, _rbShade(t, -0.6));
}

// Çip modülü: PCB + 3 pin + SIRAYLA yanan 3 LED.
function _rbPartToolChip(ctx, r, t, a, timeMs) {
  const x = -r * 0.68, y = -r * 0.74, w = r * 0.30, h = r * 0.26;
  const ph = (timeMs || 0) / 1000;
  const step = Math.floor(ph * 3) % 3;
  _rbModPlate(ctx, x, y, w, h, r * 0.03, _rbShade(t, -0.28), 0.18);
  for (let i = 0; i < 3; i++) {
    const px = x + w * (0.22 + i * 0.28);
    _rbLine(ctx, px, y + h, px, y + h + r * 0.08, _rbShade(t, -0.5), Math.max(1, r * 0.035));
    ctx.save();
    ctx.globalAlpha = i === step ? 1 : 0.30;
    _rbDot(ctx, px, y + h * 0.42, r * (i === step ? 0.040 : 0.032), a);
    ctx.restore();
  }
}

// ── AYAK: alt takım donanımları ────────────────────────────────────────────

// Damper: plaka + orta silindir + 2 cıvata (statik).
function _rbPartFeetDamper(ctx, r, t, a) {
  for (const side of [-1, 1]) {
    const x = side * r * 0.22 - r * 0.20, y = r * 0.84, w = r * 0.40, h = r * 0.15;
    _rbModPlate(ctx, x, y, w, h, r * 0.05, t, 0.20);
    _rbRoundRect(ctx, x + w * 0.36, y + h * 0.14, w * 0.28, h * 0.54, r * 0.03);
    ctx.fillStyle = a; ctx.fill();
    ctx.strokeStyle = _rbShade(t, -0.5); ctx.lineWidth = Math.max(0.9, r * 0.03); ctx.stroke();
    _rbDot(ctx, x + w * 0.12, y + h * 0.5, r * 0.035, a, _rbShade(t, -0.6));
    _rbDot(ctx, x + w * 0.88, y + h * 0.5, r * 0.035, a, _rbShade(t, -0.6));
  }
}

// Yay takozu: plaka + görünen sarmal; YÜRÜRKEN sarmal hafifçe sıkışır.
function _rbPartFeetSpring(ctx, r, t, a, timeMs, walking) {
  const ph = (timeMs || 0) / 1000;
  const squash = walking ? r * 0.02 * (0.5 + 0.5 * Math.sin(ph * 8)) : 0;
  for (const side of [-1, 1]) {
    const x = side * r * 0.22 - r * 0.18, y = r * 0.87, w = r * 0.36, h = r * 0.13;
    _rbModPlate(ctx, x, y, w, h, r * 0.05, t, 0.20);
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const xx = x + w * (0.20 + i * 0.15);
      const yy = y - r * 0.02 - (i % 2 ? 0 : r * 0.07) + squash * (i / 4);
      ctx[i ? "lineTo" : "moveTo"](xx, yy);
    }
    ctx.strokeStyle = a; ctx.lineWidth = Math.max(1.2, r * 0.05); ctx.stroke();
  }
}

// Turbo palet: plaka + itici lüle + hız okları + ARKADA TİTREŞEN egzoz alevi
// (yürürken daha güçlü; dururken rölanti parıltısı).
function _rbPartFeetTurbo(ctx, r, t, a, timeMs, walking) {
  const ph = (timeMs || 0) / 1000;
  const hot = walking ? 1 : 0.42;
  for (const side of [-1, 1]) {
    const x = side * r * 0.22 - r * 0.20, y = r * 0.84, w = r * 0.40, h = r * 0.15;
    _rbModPlate(ctx, x, y, w, h, r * 0.05, t, 0.20);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.60, y + h * 0.08);
    ctx.lineTo(x + w * 0.99, y + h * 0.26);
    ctx.lineTo(x + w * 0.99, y + h * 0.82);
    ctx.lineTo(x + w * 0.60, y + h * 0.94);
    ctx.closePath();
    ctx.fillStyle = _rbShade(t, -0.42); ctx.fill();
    ctx.strokeStyle = _rbShade(t, -0.7); ctx.lineWidth = Math.max(1, r * 0.04); ctx.stroke();
    for (let i = 0; i < 2; i++) {
      const ax = x + w * (0.13 + i * 0.19);
      _rbLine(ctx, ax, y + h * 0.76, ax + w * 0.09, y + h * 0.50, a, Math.max(1.1, r * 0.045));
      _rbLine(ctx, ax + w * 0.09, y + h * 0.50, ax, y + h * 0.24, a, Math.max(1.1, r * 0.045));
    }
    // Egzoz alevi: lülenin önünde üç kısa alev tiki, sinüsle titrer.
    for (let i = 0; i < 3; i++) {
      const flick = 0.5 + 0.5 * Math.sin(ph * 9 + i * 1.7 + (side > 0 ? 0.8 : 0));
      ctx.save();
      ctx.globalAlpha = hot * (0.55 - i * 0.13) * flick;
      _rbRoundRect(ctx, x + w * (1.02 + i * 0.11), y + h * (0.34 + i * 0.10), r * 0.06, h * (0.30 - i * 0.06), r * 0.02);
      ctx.fillStyle = i === 0 ? "#fff2c4" : a;
      ctx.fill();
      ctx.restore();
    }
  }
}

// Sıçrama yayı: plaka + sarmal + YUKARI OK (ok nabız gibi parlar).
function _rbPartFeetJump(ctx, r, t, a, timeMs) {
  const ph = (timeMs || 0) / 1000;
  for (const side of [-1, 1]) {
    const x = side * r * 0.22 - r * 0.18, y = r * 0.88, w = r * 0.36, h = r * 0.12;
    _rbModPlate(ctx, x, y, w, h, r * 0.05, t, 0.20);
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const yy = y - r * 0.02 - i * r * 0.05;
      const xx = x + w * 0.5 + (i % 2 ? 1 : -1) * w * 0.24;
      ctx[i ? "lineTo" : "moveTo"](xx, yy);
    }
    ctx.strokeStyle = a; ctx.lineWidth = Math.max(1.2, r * 0.05); ctx.stroke();
    const ox = x + w * 0.5, oy = y - r * 0.26;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(ph * 2.6));
    _rbLine(ctx, ox, oy + r * 0.13, ox, oy - r * 0.02, _rbShade(t, -0.4), Math.max(1.2, r * 0.05));
    _rbLine(ctx, ox - r * 0.06, oy + r * 0.04, ox, oy - r * 0.03, _rbShade(t, -0.4), Math.max(1.2, r * 0.05));
    _rbLine(ctx, ox + r * 0.06, oy + r * 0.04, ox, oy - r * 0.03, _rbShade(t, -0.4), Math.max(1.2, r * 0.05));
    ctx.restore();
  }
}

// Yuva → şekil ailesi; bilinmeyen şekil yuvanın varsayılanına düşer.
// Aileler (ctx, r, tint, accent, timeMs, walking) ile çağrılır; kullanmadıkları
// faz parametrelerini yok sayar (statik donanımlar böyle kalır).
const _RB_PART_DRAW = {
  helmet: { lens: _rbPartHelmLens, visor: _rbPartHelmVisor, gyro: _rbPartHelmGyro, armorHelm: _rbPartHelmArmor },
  body: { weldPatch: _rbPartBodyWeld, plate: _rbPartBodyPlate, radiator: _rbPartBodyRadiator },
  tool: { coil: _rbPartToolCoil, loader: _rbPartToolLoader, bolt: _rbPartToolTank, chip: _rbPartToolChip },
  feet: { damping: _rbPartFeetDamper, springPad: _rbPartFeetSpring, turboPad: _rbPartFeetTurbo, jumpPad: _rbPartFeetJump },
};
const _RB_PART_FALLBACK = { helmet: "visor", body: "plate", tool: "coil", feet: "turboPad" };
// Çizim sırası arkadan öne: ayak → sırt modülü → gövde plakası → kask donanımı.
const _RB_PART_ORDER = ["feet", "tool", "body", "helmet"];

// İkinci alt yuvadaki donanım, birincinin üstüne binmesin diye YUVANIN KENDİ
// anatomik çapası çevresinde küçültülür ve boş kalan bölgeye kaydırılır: iki
// parça üst üste binmez, robot "çift donanımlı" okunur.
//
// Kritik: dönüşüm mutlaka çapa çevresinde yapılır (eski sürüm şekli robotun
// MERKEZİ çevresinde ölçekleyip sabit bir köşeye kaydırıyordu; kask omuza,
// aparat göğse düşüyor — parçalar gövdeden kopup havada duruyordu). Çapa,
// şeklin çizildiği bölgenin merkezidir:
//   helmet → kafa, body → kasa, tool → sırt/omuz modülü, feet → alt takım.
//
// Dönüşüm zinciri: çapayı (ax+dx, ay+dy)'ye taşı → çapa çevresinde ölçekle/
// aynala → çapaya geri dön. Böylece çapa noktası tam olarak çapa+delta'ya
// oturur; şekil gövdeden kopmadan ikinci bir kopya olur.
//
// ax/ay : yuvanın anatomik çapası (r oranı, robot merkezi = 0)
// mirror: -1 ise çapa çevresinde yatay ayna (asimetrik şekiller — mercek,
//         jiroskop, sırt modülü — karşı yana bakan ikinci kopya olur)
// dx/dy : çapaya göre kayma (r oranı) — ikinci donanımın boş bölgesi
// scale : ikinci donanımın küçültme katsayısı
const _RB_PART_SECONDARY = {
  // Kafa: ikinci donanım kafanın öbür yanına, biraz küçük oturur.
  helmet: { ax: 0, ay: -1.02, mirror: -1, dx: -0.30, dy: 0.04, scale: 0.58 },
  // Kasa: ikinci plaka göğsün diğer yarısına kayar (gövde siluetinde kalır).
  body: { ax: 0, ay: -0.18, mirror: -1, dx: 0.34, dy: 0.04, scale: 0.52 },
  // Sırt/omuz modülü: soldan sağ omuza aynalanır (çift modül okunur).
  tool: { ax: -0.53, ay: -0.60, mirror: -1, dx: 1.06, dy: 0, scale: 0.78 },
  // Alt takım: ikinci donanım ayak pedlerinin üstüne (bilek hattına) oturur.
  feet: { ax: 0, ay: 0.93, mirror: 1, dx: 0, dy: -0.30, scale: 0.50 },
};

function _rbPartAccessories(ctx, r, parts, timeMs, walking, props, upperDy) {
  if (!parts) return;
  // Yuva bazında oran dönüşümü: kask parçaları kafa ölçeğini, kasa/sırt
  // parçaları gövde genişliğini, ayak parçaları yer temasını izler. `props`
  // yoksa (eski çağrı) hiç dönüşüm uygulanmaz.
  const neckY = -r * 0.48;
  const warp = props
    ? (slot) => {
        ctx.save();
        if (slot === "feet") {
          ctx.translate(0, r);
          ctx.scale(props.stance, props.legs);
          ctx.translate(0, -r);
        } else if (slot === "helmet") {
          ctx.translate(0, (upperDy || 0) + neckY);
          ctx.scale(props.head, props.head);
          ctx.translate(0, -neckY);
        } else {
          ctx.translate(0, upperDy || 0);
          ctx.scale(props.torsoX, 1);
        }
      }
    : null;
  for (const slot of _RB_PART_ORDER) {
    const specs = parts[slot];
    if (!specs) continue;
    const family = _RB_PART_DRAW[slot];
    if (!family) continue;
    if (warp) warp(slot);
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      if (!spec || !spec.icon) continue;
      const shape = family[spec.icon.shape] ? spec.icon.shape : _RB_PART_FALLBACK[slot];
      if (i === 0) {
        family[shape](ctx, r, spec.icon.tint, spec.icon.accent, timeMs, walking);
      } else {
        const sec = _RB_PART_SECONDARY[slot];
        if (!sec) continue;
        ctx.save();
        ctx.translate((sec.ax + sec.dx) * r, (sec.ay + sec.dy) * r);
        ctx.scale(sec.scale * sec.mirror, sec.scale);
        ctx.translate(-sec.ax * r, -sec.ay * r);
        family[shape](ctx, r, spec.icon.tint, spec.icon.accent, timeMs, walking);
        ctx.restore();
      }
    }
    if (warp) ctx.restore();
  }
}

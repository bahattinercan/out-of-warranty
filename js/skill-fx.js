/* Yetenek (dahili modül) cast efektleri — veri-güdümlü, prosedürel Canvas.
 *
 * Her robotun modülü `characters.js` içindeki `skill.fx` bloğuyla kendi görsel
 * kimliğini taşır: `fx.shape` bu dosyadaki `SKILL_FX_SHAPES` anahtarıdır.
 * `fx` yoksa `kind` varsayılanına düşülür (eski/eksik veri güvenliği).
 *
 * Kısıtlar (projectile-visual-plan.md ile aynı):
 *   • Gradient / shadowBlur YOK — parlaklık iç içe saydam dolgularla.
 *   • Kare başına allocation yok — yardımcılar düz sayı argümanı alır,
 *     çizim sırasında dizi/nesne üretilmez (sabit tablolar modül düzeyinde).
 *   • Determinizm — animasyon efektin `t` sayacından ve `seed`'inden türer;
 *     çizimde `Date.now()` / `Math.random()` çağrılmaz.
 *   • Koordinat: efekt yereldir; (0,0) gövde merkezi, +x ileri (ctx önce
 *     `translate(fx.x, fx.y - fx.r)` + `scale(facing,1)` uygular).
 *   • R = fx.r (robot yarıçapı) — tüm ölçüler R'nin katıdır.
 */

// Efekt aileleri için "en uzak nokta" (R birimi) — kart ikonu ölçeklenirken
// çizimin kutuyu taşmaması için kullanılır.
const SKILL_FX_EXTENT = {
  heal: 3.2, shield: 3.4, nextShot: 3.2, damageReduce: 2.8, jump: 5.0,
  dash: 4.4, dig: 3.0, glide: 3.2, melee: 4.2, radial: 4.2, quake: 6.5, spit: 4.6,
};

// `fx` bloğu olmayan modüller için tür varsayılanı. Yeni bir kind eklenirse
// `skills.js > useSkill` ile birlikte buraya da bir varsayılan yazılmalı,
// aksi halde cast efektsiz kalır (davranış yine çalışır).
const SKILL_FX_KIND_DEFAULT = {
  heal: "patchWeld",
  shield: "magField",
  damageReduce: "plateLock",
  nextShot: "pressureCharge",
  jump: "springJump",
  dash: "turboCharge",
  dig: "drillSink",
  glide: "rotorSpin",
  melee: "rotaryWhip",
  radial: "centrifuge",
  quake: "groundRam",
  spit: "slagCannon",
};

// ── Deterministik sözde-rastgele ────────────────────────────────────────────
// Aynı seed + indeks her karede aynı değeri verir; animasyon titremesiz ve
// tekrar üretilebilir (test op dizisi karşılaştırması da bunu gerektirir).
function sfxHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function sfxRand(fx, i) {
  let x = (fx.seed + Math.imul(i | 0, 374761393)) >>> 0;
  x ^= x << 13; x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5; x >>>= 0;
  return x / 4294967296;
}

// ── Zaman eğrileri ─────────────────────────────────────────────────────────
function sfxP(fx) { return fx.t / fx.life; }              // ilerleme 0..1
function sfxA(fx) { const p = fx.t / fx.life; return p >= 1 ? 0 : 1 - p; }
function sfxOut(p) { const q = 1 - p; return 1 - q * q; } // yavaşlayan
function sfxIn(p) { return p * p; }                       // hızlanan
function sfxClamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

// ── Çizim ilkelleri (hepsi düz sayı argümanı — allocation yok) ──────────────
function sfxDisc(ctx, x, y, r, color, alpha) {
  if (!(r > 0) || !(alpha > 0)) return;
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
}
function sfxRing(ctx, x, y, r, color, lw, alpha) {
  if (!(r > 0) || !(lw > 0) || !(alpha > 0)) return;
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
}
function sfxArc(ctx, x, y, r, a0, a1, color, lw, alpha) {
  if (!(r > 0) || !(lw > 0) || !(alpha > 0)) return;
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.arc(x, y, r, a0, a1);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.stroke();
}
function sfxWedge(ctx, x, y, r, a0, a1, color, alpha) {
  if (!(r > 0) || !(alpha > 0)) return;
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, a0, a1); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
}
function sfxSeg(ctx, x1, y1, x2, y2, color, lw, alpha) {
  if (!(lw > 0) || !(alpha > 0)) return;
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.stroke();
}
function sfxTri(ctx, x1, y1, x2, y2, x3, y3, color, alpha) {
  if (!(alpha > 0)) return;
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
}
function sfxQuad(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color, alpha) {
  if (!(alpha > 0)) return;
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
}
function sfxBox(ctx, x, y, w, h, color, alpha) {
  if (!(alpha > 0) || w <= 0 || h <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.fillRect(x - w / 2, y - h / 2, w, h);
}
function sfxPolyStroke(ctx, pts, color, lw, alpha) {
  if (!(alpha > 0) || !(lw > 0)) return;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
}
function sfxHex(ctx, x, y, r, color, lw, alpha) {
  if (!(r > 0) || !(alpha > 0)) return;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 3;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
}
// Işıltılı yıldız: iç içe iki üçgen (bonk/çarpma vurgusu).
function sfxStar(ctx, x, y, r, color, alpha, rot) {
  if (!(r > 0) || !(alpha > 0)) return;
  ctx.globalAlpha = alpha;
  for (let k = 0; k < 2; k++) {
    const rr = k === 0 ? r : r * 0.55;
    const off = k === 0 ? 0 : rot;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = off + i * Math.PI / 2;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      const b = a + Math.PI / 4;
      ctx.lineTo(x + Math.cos(b) * rr * 0.38, y + Math.sin(b) * rr * 0.38);
    }
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
  }
}
// Onarım artısı (kalın "+").
function sfxCross(ctx, x, y, s, lw, color, alpha) {
  sfxSeg(ctx, x - s, y, x + s, y, color, lw, alpha);
  sfxSeg(ctx, x, y - s, x, y + s, color, lw, alpha);
}

// Kıvılcımlar: konik yayılan kısa çizgiler. `angle` yönü, `spread` toplam açı.
function sfxSparks(ctx, fx, n, ox, oy, angle, spread, dist, color, lw) {
  const p = sfxP(fx), a = sfxA(fx), R = fx.r;
  const d = dist * sfxOut(p);
  for (let i = 0; i < n; i++) {
    const ang = angle + (sfxRand(fx, i * 3 + 11) - 0.5) * spread;
    const j = 0.55 + sfxRand(fx, i * 3 + 12) * 0.7;
    const x = ox + Math.cos(ang) * d * j;
    const y = oy + Math.sin(ang) * d * j;
    const l = Math.max(2, R * 0.22 * (1 - p * 0.3));
    sfxSeg(ctx, x, y, x - Math.cos(ang) * l, y - Math.sin(ang) * l, color, lw, a * (0.5 + j * 0.4));
  }
}

// Moloz/toprak parçaları: yukarı savrulup yerçekimiyle düşen dönen dörtgenler.
function sfxChunks(ctx, fx, n, ox, oy, angle, spread, dist, size, color, alpha) {
  const p = sfxP(fx), R = fx.r;
  for (let i = 0; i < n; i++) {
    const ang = angle + (sfxRand(fx, i * 5 + 3) - 0.5) * spread;
    const j = 0.6 + sfxRand(fx, i * 5 + 4) * 0.8;
    const x = ox + Math.cos(ang) * dist * j * p;
    const y = oy + Math.sin(ang) * dist * j * p + 2.2 * R * p * p;
    const s = size * (0.65 + sfxRand(fx, i * 5 + 5) * 0.7);
    const rot = p * 7 + sfxRand(fx, i * 5 + 6) * 6.28;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    sfxBox(ctx, 0, 0, s, s * 0.8, color, alpha * (1 - p * 0.85));
    ctx.restore();
  }
}

// Sis/buhar bulutları: yavaşça dağılan yumuşak daireler.
function sfxMist(ctx, fx, n, ox, oy, spread, dist, size, color, alpha) {
  const p = sfxP(fx);
  for (let i = 0; i < n; i++) {
    const ang = (sfxRand(fx, i * 7 + 2) - 0.5) * spread;
    const j = 0.4 + sfxRand(fx, i * 7 + 8) * 0.8;
    const x = ox + Math.cos(ang) * dist * j * sfxOut(p) - dist * 0.25 * sfxRand(fx, i * 7 + 9);
    const y = oy + Math.sin(ang) * dist * j * sfxOut(p) - dist * 0.18;
    const s = size * (0.7 + sfxRand(fx, i * 7 + 10) * 0.8) * (0.6 + p * 1.4);
    sfxDisc(ctx, x, y, s, color, alpha * (1 - p));
  }
}

// Ağız flaşı: iki katmanlı koni + çekirdek (spit/saldırı).
function sfxCone(ctx, fx, ox, oy, len, spread, color, accent) {
  const p = sfxP(fx), a = sfxA(fx);
  sfxWedge(ctx, ox, oy, len, -spread, spread, color, a * 0.32);
  sfxWedge(ctx, ox, oy, len * 0.62, -spread * 0.6, spread * 0.6, accent, a * 0.5);
  sfxDisc(ctx, ox, oy, Math.max(2, len * 0.16), accent, a * 0.9);
}

// Yayılan şok halkası (kalınlığı büyür, alfa söner).
function sfxShock(ctx, x, y, r0, r1, color, lw, alpha, p) {
  const r = r0 + (r1 - r0) * sfxOut(p);
  sfxRing(ctx, x, y, r, color, lw * (1 - p) + 0.6, alpha * (1 - p));
}

// Ortak sistem: 0,0 gövde merkezi; yer = +R*0.95; kafa = -R*0.9.
const SFX_GROUND = 0.95;

// ── Aile: heal ─────────────────────────────────────────────────────────────
// Kaynak kıvılcımları + gövdeye dönen onarım artısı.
function sfxPatchWeld(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const ox = R * 0.85, oy = -R * 0.35;
  sfxCone(ctx, fx, ox, oy, R * (1.1 + 0.9 * sfxOut(p)), 0.5, fx.tint, fx.accent);
  sfxSparks(ctx, fx, 16, ox, oy, 0.25, 1.5, R * 3.0, fx.accent, 1.3);
  // Onarım artısı gövdenin üstünde yükselip söner.
  const rise = sfxOut(p) * R * 2.4;
  sfxCross(ctx, 0, -R * 0.5 - rise, R * 0.55, 3, fx.tint, a * 0.85);
  sfxRing(ctx, 0, 0, R * (0.9 + 0.5 * sfxOut(p)), fx.tint, 2, a * 0.5);
  sfxMist(ctx, fx, 5, 0, -R * 0.3, 2.4, R * 1.2, R * 0.28, fx.tint, 0.22);
}

// ── Aile: shield ───────────────────────────────────────────────────────────
// Manyetik alan: altıgen kabuk + içe çekilen hurda parçaları.
function sfxMagField(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const s = R * (1.05 + 0.85 * sfxOut(sfxClamp01(p * 2.2)));
  sfxHex(ctx, 0, 0, s, fx.tint, 2.2, a * 0.9);
  sfxHex(ctx, 0, 0, s * 0.78, fx.accent, 1.2, a * 0.5);
  for (let i = 0; i < 6; i++) {
    const ang = sfxRand(fx, i) * 6.283 + p * 3.4 * (i % 2 ? 1 : -1);
    const rr = R * (3.0 - 1.9 * sfxOut(p));
    sfxQuad(ctx,
      Math.cos(ang) * rr - R * 0.16, Math.sin(ang) * rr * 0.8 - R * 0.1,
      Math.cos(ang) * rr + R * 0.16, Math.sin(ang) * rr * 0.8 - R * 0.1,
      Math.cos(ang) * rr + R * 0.12, Math.sin(ang) * rr * 0.8 + R * 0.16,
      Math.cos(ang) * rr - R * 0.12, Math.sin(ang) * rr * 0.8 + R * 0.12,
      i % 2 ? fx.accent : fx.tint, a * 0.9);
  }
}
// Optik saptırıcı: hayalet art-görüntü + tarama çizgileri.
function sfxCloakShift(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  for (let i = 0; i < 3; i++) {
    const off = (i + 1) * R * 0.95 * (1 - p * 0.6);
    sfxRing(ctx, -off, -R * 0.1, R * (0.9 + i * 0.08), fx.tint, 2, a * 0.42 / (i + 1));
  }
  for (let i = 0; i < 7; i++) {
    const yy = -R * 1.15 + ((p * R * 3.4 + i * R * 0.5) % (R * 2.3));
    sfxSeg(ctx, -R * 1.5, yy, R * 1.5, yy, fx.accent, 1, a * 0.5);
  }
  sfxRing(ctx, 0, 0, R * (1.25 + 0.35 * p), fx.accent, 1.5, a * 0.35);
}

// ── Aile: nextShot ─────────────────────────────────────────────────────────
// Basınç yüklemesi: ibre kırmızıya süpürülür, valflar buhar salar.
function sfxPressureCharge(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const cx = -R * 0.1, cy = -R * 1.6, gr = R * 0.72;
  sfxArc(ctx, cx, cy, gr, Math.PI * 0.75, Math.PI * 2.25, "#31313a", 3, a * 0.85);
  sfxArc(ctx, cx, cy, gr * 0.72, Math.PI * 1.35, Math.PI * 2.25, "#c8402f", 2, a * 0.5);
  const na = Math.PI * 0.75 + Math.PI * 1.5 * sfxOut(sfxClamp01(p * 1.4));
  sfxSeg(ctx, cx, cy, cx + Math.cos(na) * gr * 0.85, cy + Math.sin(na) * gr * 0.85,
    p > 0.55 ? "#ff5b3a" : fx.tint, 2.4, a);
  sfxDisc(ctx, cx, cy, 2.4, fx.accent, a);
  sfxSparks(ctx, fx, 10, -R * 0.7, -R * 1.0, -1.25, 0.7, R * 2.4, fx.accent, 1.1);
  // Namlu ağzında basınç halkaları ileri doğru yığılır.
  for (let i = 0; i < 3; i++) {
    const rr = R * (0.45 + i * 0.28) * (0.7 + 0.6 * p);
    sfxRing(ctx, R * (1.15 + i * 0.42), 0, rr, fx.tint, 2 - i * 0.4, a * 0.6);
  }
}
// Çift namlu: iki ağız yanar, çift şevron ileri akar.
function sfxDualLoad(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  for (let i = 0; i < 2; i++) {
    const oy = (i === 0 ? -1 : 1) * R * 0.38;
    sfxDisc(ctx, R * 0.95, oy, R * (0.24 + 0.14 * sfxOut(p)), i ? fx.accent : fx.tint, a * 0.9);
    sfxRing(ctx, R * 0.95, oy, R * (0.5 + 0.7 * sfxOut(p)), fx.tint, 2, a * 0.55);
  }
  for (let i = 0; i < 3; i++) {
    const x = R * (1.2 + i * 0.75) + sfxOut(p) * R * 1.2;
    sfxTri(ctx, x, -R * 0.42, x + R * 0.42, 0, x, R * 0.42, i === 1 ? fx.accent : fx.tint, a * (0.85 - i * 0.2));
  }
  sfxSparks(ctx, fx, 8, R * 0.9, 0, 0.1, 0.8, R * 2.4, fx.accent, 1.1);
}

// ── Aile: damageReduce ─────────────────────────────────────────────────────
// Zırh kilidi: dört zırh plakası köşelerden kapanır.
function sfxPlateLock(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const k = sfxOut(sfxClamp01(p * 2));
  for (let i = 0; i < 4; i++) {
    const sx = (i % 2) ? 1 : -1, sy = (i < 2) ? -1 : 1;
    const ox = sx * R * (1.85 - 0.85 * k);
    const oy = sy * R * (1.5 - 0.72 * k);
    sfxQuad(ctx,
      ox - sx * R * 0.62, oy, ox, oy - sy * R * 0.5,
      ox + sx * R * 0.62, oy, ox, oy + sy * R * 0.5,
      i % 2 ? fx.tint : fx.accent, a * 0.9);
  }
  if (p > 0.42) {
    const q = (p - 0.42) / 0.58;
    sfxRing(ctx, 0, 0, R * (1.0 + 0.8 * sfxOut(q)), "#c9b6ff", 2, (1 - q) * 0.7);
    sfxStar(ctx, 0, -R * 0.4, R * 0.5 * (1 - q * 0.5), "#ffffff", (1 - q) * 0.6, q * 2);
  }
}

// ── Aile: jump ─────────────────────────────────────────────────────────────
// Ortak yay çizimi: sıkışır → hızla açılır. `coils` sarım, `heat` renk vurgusu.
function sfxSpring(ctx, fx, coils, lift, heat) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const wind = sfxClamp01(p / 0.28);
  const snap = sfxClamp01((p - 0.28) / 0.72);
  const baseY = R * SFX_GROUND;
  const len = R * (0.75 + 0.35 * wind) + sfxOut(snap) * R * lift;
  ctx.globalAlpha = a * 0.9;
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  for (let i = 1; i <= coils; i++) {
    const y = baseY - len * (i / coils);
    const x = (i % 2 ? 1 : -1) * R * 1.15;
    ctx.lineTo(x, y);
  }
  // Koyu kontur + renkli sarım: açık renkli robotlarda (ZIP, KRİYO) yay
  // gövdeye karışıp kaybolmasın — her zeminde okunur kalsın.
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.strokeStyle = "#0b1118"; ctx.lineWidth = 5.4; ctx.stroke();
  ctx.strokeStyle = heat ? heat : fx.accent;
  ctx.lineWidth = 3; ctx.stroke();
  sfxBox(ctx, 0, baseY, R * 1.1, R * 0.2, fx.tint, a * 0.85);
  sfxDisc(ctx, 0, baseY - len, R * 0.26, fx.accent, a);
  // Yukarı süzülen şevronlar: yayın açılma yönü okunur (fırlatma hissi).
  for (let i = 0; i < 3; i++) {
    const cy2 = -R * 0.1 - sfxOut(snap) * R * 2.4 - i * R * 0.6;
    sfxSeg(ctx, -R * 0.42, cy2 + R * 0.32, 0, cy2, fx.accent, 2.4, a * 0.8);
    sfxSeg(ctx, 0, cy2, R * 0.42, cy2 + R * 0.32, fx.accent, 2.4, a * 0.8);
  }
  sfxRing(ctx, 0, baseY, R * (0.9 + 1.2 * sfxOut(snap)), fx.tint, 2, a * 0.6);
  sfxSparks(ctx, fx, 8, 0, baseY, Math.PI / 2, 2.4, R * 1.8, fx.accent, 1);
}
function sfxSpringJump(ctx, fx) { sfxSpring(ctx, fx, 4, 2.4, null); }function sfxOverCoil(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  sfxSpring(ctx, fx, 6, 3.4, "#9fe8ff");
  sfxRing(ctx, 0, R * SFX_GROUND, R * (1.6 + 1.4 * sfxOut(p)), "#cfeeff", 1.6, a * 0.5);
}
// Servis kancası: kanca + halat ileri savrulur, uçta çapa flaşı.
function sfxHookSwing(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const fly = sfxOut(p);
  const hx = R * 1.2 + fly * R * 3.6;
  const hy = -R * 0.7 - Math.sin(fly * Math.PI) * R * 1.3 + fly * R * 1.5;
  sfxSeg(ctx, R * 0.5, -R * 0.2, hx, hy, fx.accent, 1.4, a * 0.9);
  sfxArc(ctx, hx, hy, R * 0.42, Math.PI * 0.15, Math.PI * 0.95, fx.tint, 2.6, a);
  sfxSeg(ctx, hx, hy - R * 0.42, hx, hy - R * 0.75, fx.tint, 2.2, a);
  if (fly > 0.75) {
    const q = (fly - 0.75) / 0.25;
    sfxStar(ctx, hx, hy, R * 0.6 * (1 - q * 0.4), fx.accent, (1 - q) * 0.9, q * 3);
  }
  sfxSparks(ctx, fx, 6, R * 0.6, -R * 0.2, -0.4, 1.2, R * 2.0, fx.accent, 1);
}

// ── Aile: dash ─────────────────────────────────────────────────────────────
// Turbo teker: egzoz alevi + hız çizgileri + lastik dumanı.
function sfxTurboCharge(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  for (let i = 0; i < 3; i++) {
    const oy = (i - 1) * R * 0.42;
    const len = R * (1.5 + 0.9 * Math.sin(p * Math.PI)) * (0.7 + 0.3 * sfxRand(fx, i));
    sfxTri(ctx, -R * 0.85, oy - R * 0.2, -R * 0.85, oy + R * 0.2, -R * 0.85 - len, oy,
      i === 1 ? fx.accent : fx.tint, a * (0.9 - 0.2 * i));
  }
  sfxDisc(ctx, -R * 1.05, 0, R * 0.45, fx.accent, a * 0.85);
  sfxDisc(ctx, -R * 1.05, 0, R * 0.24, "#ffffff", a * 0.9);
  for (let i = 0; i < 6; i++) {
    const yy = (sfxRand(fx, i) - 0.5) * R * 2.4;
    const xx = R * 1.1 + sfxRand(fx, i + 20) * R * 3.0;
    sfxSeg(ctx, xx, yy, xx + R * 1.2, yy, fx.accent, 1.6, a * 0.7);
  }
  sfxMist(ctx, fx, 4, -R * 1.2, R * 0.75, 2.2, R * 1.4, R * 0.3, "#c9c9c9", 0.3);
}
// Rulman hücumu: dönen bilye + yörüngedeki rulmanlar + kıvılcım izi.
function sfxBallRoll(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const spin = p * 11;
  sfxRing(ctx, 0, 0, R * 1.3, fx.tint, 2.6, a * 0.95);
  for (let i = 0; i < 6; i++) {
    const aa = spin + i * 1.047;
    sfxDisc(ctx, Math.cos(aa) * R * 0.82, Math.sin(aa) * R * 0.82, R * 0.16, fx.accent, a);
  }
  for (let i = 0; i < 3; i++) {
    const aa = spin * 0.7 + i * 2.094;
    sfxDisc(ctx, Math.cos(aa) * R * 1.9, Math.sin(aa) * R * 0.95, R * 0.2, fx.tint, a * 0.8);
  }
  sfxSparks(ctx, fx, 12, -R * 0.9, R * 0.6, Math.PI, 1.1, R * 3.2, "#fff3c4", 1.2);
}

// ── Aile: dig ──────────────────────────────────────────────────────────────
// Derinlik burgusu: spiral burgu zemine gömülür, toprak fışkırır.
function sfxDrillSink(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const depth = sfxOut(p) * R * 1.9;
  ctx.globalAlpha = a * 0.95;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const ang = t * Math.PI * 4 + p * 7;
    const rr = R * 0.72 * (1 - t * 0.5);
    const x = Math.cos(ang) * rr;
    const y = -R * 0.2 + t * (R * 0.9 + depth);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = fx.tint; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.stroke();
  sfxChunks(ctx, fx, 12, 0, R * 0.6, -Math.PI / 2, 2.2, R * 3.2, R * 0.24, "#8a6a44", a);
  sfxRing(ctx, 0, R * SFX_GROUND, R * (0.9 + 1.2 * sfxOut(p)), "#6a5030", 3, a * 0.7);
  sfxSparks(ctx, fx, 8, 0, R * 0.7, Math.PI / 2, 1.6, R * 2.0, fx.accent, 1.1);
}

// ── Aile: glide ────────────────────────────────────────────────────────────
// Acil pervane: rotor bulanıklığı + aşağı hava akımı halkaları.
function sfxRotorSpin(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const ry = -R * 1.25;
  for (let i = 0; i < 3; i++) {
    const ang = p * 16 + i * 2.094;
    sfxWedge(ctx, 0, ry, R * 1.15, ang, ang + 0.5, i === 0 ? fx.accent : fx.tint, a * 0.55);
  }
  sfxDisc(ctx, 0, ry, R * 0.22, fx.accent, a);
  for (let i = 0; i < 3; i++) {
    const yy = ry + R * (0.5 + i * 0.75) + sfxOut(p) * R * 1.2;
    sfxRing(ctx, 0, yy, R * (0.7 + i * 0.35), fx.tint, 1.6, a * (0.45 - i * 0.1));
  }
  sfxMist(ctx, fx, 5, 0, R * 0.8, 2.6, R * 1.6, R * 0.3, "#cfd8e0", 0.25);
}

// ── Aile: melee ────────────────────────────────────────────────────────────
// Hidrolik pres: plaka yukarıdan iner, yatay şok dalgası.
function sfxPressSlam(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const k = sfxIn(sfxClamp01(p * 1.35));
  const px = R * 1.5, py = -R * 2.6 + k * R * 3.4;
  sfxSeg(ctx, px - R * 0.6, py - R * 2.6, px - R * 0.6, py, "#8d949c", 3, a * 0.7);
  sfxSeg(ctx, px + R * 0.6, py - R * 2.6, px + R * 0.6, py, "#8d949c", 3, a * 0.7);
  sfxQuad(ctx, px - R * 1.15, py, px + R * 1.15, py, px + R * 1.15, py + R * 0.55, px - R * 1.15, py + R * 0.55, fx.tint, a * 0.95);
  sfxSeg(ctx, px - R * 1.15, py + R * 0.55, px + R * 1.15, py + R * 0.55, fx.accent, 2, a);
  if (p > 0.45) {
    const q = sfxClamp01((p - 0.45) / 0.55);
    sfxRing(ctx, px, R * SFX_GROUND, R * (0.8 + 2.2 * sfxOut(q)), fx.accent, 3, (1 - q) * 0.85);
    sfxSparks(ctx, fx, 12, px, R * 0.75, 0, 3.0, R * 3.0, fx.accent, 1.4);
  }
}
// Çifte kesici: çapraz iki kesik yayı + kıvılcım.
function sfxTwinSlash(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const reach = R * (1.1 + 2.3 * sfxOut(p));
  sfxArc(ctx, R * 0.35, -R * 0.15, reach, -1.05, 0.35, fx.accent, Math.max(1.5, 5 * (1 - p)), a);
  sfxArc(ctx, R * 0.35, -R * 0.15, reach * 0.82, 0.55, -1.35, fx.tint, Math.max(1.5, 5 * (1 - p)), a);
  sfxSparks(ctx, fx, 14, R * 1.4, -R * 0.2, -0.6, 2.4, R * 2.8, "#fff0c0", 1.3);
  sfxStar(ctx, R * 1.5, -R * 0.15, R * 0.5 * (1 - p * 0.6), "#ffffff", a * 0.7, p * 4);
}
// Döner mafsal: gövdeden savrulan kol yayı + hareket bulanıklığı.
function sfxRotaryWhip(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  for (let i = 0; i < 3; i++) {
    sfxArc(ctx, R * 0.2, -R * 0.2, R * (1.5 + i * 0.55),
      -2.4 + p * 3.0 - i * 0.12, -0.2 + p * 0.8 - i * 0.12,
      i === 0 ? fx.accent : fx.tint, 3 - i * 0.7, a * (0.6 - i * 0.15));
  }
  const ang = -2.1 + sfxOut(p) * 3.3;
  sfxSeg(ctx, R * 0.2, -R * 0.2, R * 0.2 + Math.cos(ang) * R * 2.7, -R * 0.2 + Math.sin(ang) * R * 2.7, fx.accent, 3, a);
  sfxDisc(ctx, R * 0.2 + Math.cos(ang) * R * 2.7, -R * 0.2 + Math.sin(ang) * R * 2.7, R * 0.26, fx.tint, a);
  sfxSparks(ctx, fx, 8, R * 1.6, -R * 0.2, -0.3, 2.6, R * 2.4, fx.accent, 1);
}
// Hidrolik kıskaç: iki çene menzilde kapanır.
function sfxClampBite(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const gap = (1 - sfxIn(sfxClamp01(p * 1.7))) * R * 1.5 + R * 0.12;
  const cx = R * 2.1;
  sfxQuad(ctx, cx - R * 0.45, -gap, cx + R * 1.0, -gap * 0.92, cx + R * 1.0, -gap * 0.42, cx - R * 0.45, -gap * 0.2, fx.tint, a * 0.95);
  sfxQuad(ctx, cx - R * 0.45, gap, cx + R * 1.0, gap * 0.92, cx + R * 1.0, gap * 0.42, cx - R * 0.45, gap * 0.2, fx.tint, a * 0.95);
  sfxSeg(ctx, cx - R * 0.6, -gap * 0.6, R * 0.5, -R * 0.35, "#8d949c", 3, a * 0.75);
  sfxSeg(ctx, cx - R * 0.6, gap * 0.6, R * 0.5, R * 0.35, "#8d949c", 3, a * 0.75);
  if (p > 0.55) {
    const q = sfxClamp01((p - 0.55) / 0.45);
    sfxStar(ctx, cx + R * 0.5, 0, R * 0.55 * (1 - q * 0.4), fx.accent, (1 - q) * 0.9, q * 5);
    sfxSparks(ctx, fx, 10, cx + R * 0.4, 0, -0.5, 2.6, R * 2.4, fx.accent, 1.2);
  }
}
// Ayar tokmağı: tokmak yay çizip "bonk" yıldızı bırakır.
function sfxMalletBonk(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const ang = -1.9 + sfxOut(sfxClamp01(p * 1.5)) * 2.7;
  const hx = R * 0.2 + Math.cos(ang) * R * 2.1;
  const hy = -R * 0.2 + Math.sin(ang) * R * 2.1;
  sfxArc(ctx, R * 0.2, -R * 0.2, R * 2.1, -1.9, ang, fx.accent, 1.4, a * 0.35);
  sfxSeg(ctx, R * 0.1, -R * 0.15, hx, hy, "#4a341c", 5.2, a * 0.8);
  sfxSeg(ctx, R * 0.1, -R * 0.15, hx, hy, "#c49a5e", 3.2, a);
  sfxBox(ctx, hx, hy, R * 0.95, R * 0.85, fx.tint, a);
  sfxRing(ctx, hx, hy, R * 0.55, fx.accent, 2, a * 0.85);
  if (p > 0.5) {
    const q = sfxClamp01((p - 0.5) / 0.5);
    sfxStar(ctx, R * 2.5, R * 0.1, R * 0.75 * (1 - q * 0.5), fx.accent, (1 - q) * 0.9, q * 6);
  }
}
// Denge çekici: ağır yay + talaş ve kıvılcım.
function sfxHammerSwing(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const ang = -2.0 + sfxOut(sfxClamp01(p * 1.4)) * 2.9;
  const hx = R * 0.15 + Math.cos(ang) * R * 2.6;
  const hy = -R * 0.25 + Math.sin(ang) * R * 2.6;
  sfxArc(ctx, R * 0.1, -R * 0.2, R * 2.4, -2.0, ang, fx.accent, 1.4, a * 0.35);
  sfxSeg(ctx, R * 0.1, -R * 0.2, hx, hy, "#3f2f1c", 6, a * 0.8);
  sfxSeg(ctx, R * 0.1, -R * 0.2, hx, hy, "#a8825a", 4, a);
  sfxQuad(ctx, hx - R * 0.6, hy - R * 0.45, hx + R * 0.6, hy - R * 0.45, hx + R * 0.6, hy + R * 0.45, hx - R * 0.6, hy + R * 0.45, fx.tint, a);
  sfxSeg(ctx, hx - R * 0.6, hy - R * 0.45, hx - R * 0.6, hy + R * 0.45, fx.accent, 2, a);
  if (p > 0.5) {
    const q = sfxClamp01((p - 0.5) / 0.5);
    sfxChunks(ctx, fx, 8, R * 2.4, R * 0.4, -0.4 - q, 2.2, R * 2.6, R * 0.2, "#c8a06a", (1 - q) * 0.95);
    sfxSparks(ctx, fx, 10, R * 2.4, R * 0.3, -0.5, 2.0, R * 2.6, "#ffe08a", 1.2);
  }
}
// Punta darbesi: hızlı piston + kesikli hız çizgileri.
function sfxPunchPoke(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const k = sfxOut(sfxClamp01(p * 2.2));
  const ex = R * 0.7 + k * R * 2.7;
  sfxSeg(ctx, R * 0.3, -R * 0.34, ex, -R * 0.34, fx.tint, 4, a);
  sfxSeg(ctx, R * 0.3, R * 0.34, ex, R * 0.34, fx.tint, 4, a);
  sfxTri(ctx, ex, -R * 0.5, ex + R * 0.5, 0, ex, R * 0.5, fx.accent, a);
  for (let i = 0; i < 4; i++) {
    const yy = (i - 1.5) * R * 0.5;
    const xx = ex + R * 0.35 + i * R * 0.42;
    sfxSeg(ctx, xx, yy, xx + R * 0.6, yy, fx.accent, 2, a * 0.6);
  }
  sfxMist(ctx, fx, 3, ex + R * 0.3, 0, 2.0, R * 0.9, R * 0.22, "#d8d0c0", 0.25);
}
// Atık gaz: öne yeşil koni + aşındırıcı baloncuklar.
function sfxGasSpray(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const len = R * (2.2 + 2.2 * sfxOut(p));
  sfxCone(ctx, fx, R * 0.75, -R * 0.1, len, 0.52, fx.tint, fx.accent);
  for (let i = 0; i < 9; i++) {
    const ang = (sfxRand(fx, i * 9 + 1) - 0.5) * 0.9 * (1 - p * 0.4);
    const d = R * 0.8 + len * (0.3 + 0.7 * sfxOut(p)) * sfxRand(fx, i * 9 + 2);
    sfxDisc(ctx, Math.cos(ang) * d, -R * 0.1 + Math.sin(ang) * d,
      R * (0.12 + 0.11 * sfxRand(fx, i * 9 + 3)), fx.accent, a * 0.7);
  }
  sfxMist(ctx, fx, 4, R * 1.2, -R * 0.1, 1.2, len * 0.8, R * 0.3, fx.tint, 0.25);
  sfxRing(ctx, R * 0.8, -R * 0.1, len * 0.35, fx.accent, 2, a * 0.5);
}

// ── Aile: radial ───────────────────────────────────────────────────────────
// EMP: elektrik halkası + şimşek kolları.
function sfxEmpPulse(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const r = R * (0.9 + 3.0 * sfxOut(p));
  sfxRing(ctx, 0, 0, r, fx.tint, 3.6, a * 0.9);
  sfxRing(ctx, 0, 0, r * 0.68, fx.accent, 2, a * 0.6);
  for (let i = 0; i < 6; i++) {
    const aa = i * 1.047 + sfxRand(fx, i) * 0.35;
    ctx.globalAlpha = a * 0.85;
    ctx.beginPath(); ctx.moveTo(0, 0);
    for (let s = 1; s <= 4; s++) {
      const d = r * (s / 4);
      const j = (sfxRand(fx, i * 7 + s) - 0.5) * R * 0.8;
      ctx.lineTo(Math.cos(aa) * d - Math.sin(aa) * j, Math.sin(aa) * d + Math.cos(aa) * j);
    }
    ctx.strokeStyle = i % 2 ? fx.accent : "#ffffff";
    ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.stroke();
  }
}
// Alarm rezonansı: iç içe ses halkaları + dönen kırmızı huzmeler.
function sfxSirenWave(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  for (let i = 0; i < 4; i++) {
    const d = sfxOut(p) * R * 3.7 - i * R * 0.72;
    if (d <= 0) continue;
    sfxRing(ctx, 0, 0, d, i % 2 ? fx.tint : fx.accent, 2.4 - i * 0.3, a * (0.8 - i * 0.16));
  }
  for (let i = 0; i < 3; i++) {
    const aa = p * 2.4 + i * 2.094;
    sfxWedge(ctx, 0, -R * 0.15, R * 4.0, aa - 0.09, aa + 0.09, "#ff5b5b", a * 0.28);
  }
  sfxDisc(ctx, 0, -R * 0.15, R * 0.32, "#ff8a8a", a * 0.9);
}
// Frekans taşması: sinüs modülasyonlu dalga halkası.
function sfxResonanceWave(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const base = sfxOut(p) * R * 3.2;
  for (let layer = 0; layer < 2; layer++) {
    const rr0 = base * (1 - layer * 0.22);
    if (rr0 <= 1) continue;
    ctx.globalAlpha = a * (0.85 - layer * 0.3);
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const aa = (i / 48) * Math.PI * 2;
      const rr = rr0 * (1 + 0.13 * Math.sin(aa * 8 - p * 14 + layer));
      const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = layer ? fx.accent : fx.tint;
    ctx.lineWidth = 2.2 - layer * 0.8; ctx.stroke();
  }
  sfxSeg(ctx, -R * 0.8, -R * 0.9, R * 0.8, -R * 0.9, fx.accent, 2, a * 0.7);
  sfxSeg(ctx, -R * 0.55, -R * 1.15, R * 0.55, -R * 1.15, fx.tint, 1.6, a * 0.5);
}
// Merkezkaç: yörüngede dönen moloz + kanat izi.
function sfxCentrifuge(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const spin = p * 12;
  for (let i = 0; i < 3; i++) {
    const ang = spin + i * 2.094;
    sfxWedge(ctx, 0, 0, R * (1.4 + 1.4 * sfxOut(p)), ang, ang + 0.5, i === 0 ? fx.accent : fx.tint, a * 0.4);
  }
  for (let i = 0; i < 7; i++) {
    const ang = spin * 0.8 + sfxRand(fx, i) * 6.28;
    const rr = R * (1.4 + 1.8 * sfxOut(p)) * (0.6 + sfxRand(fx, i + 30) * 0.6);
    const s = R * (0.18 + sfxRand(fx, i + 60) * 0.16);
    sfxQuad(ctx,
      Math.cos(ang) * rr - s, Math.sin(ang) * rr * 0.55 - s * 0.5,
      Math.cos(ang) * rr + s, Math.sin(ang) * rr * 0.55 - s * 0.5,
      Math.cos(ang) * rr + s * 0.8, Math.sin(ang) * rr * 0.55 + s,
      Math.cos(ang) * rr - s * 0.8, Math.sin(ang) * rr * 0.55 + s,
      fx.tint, a * 0.85);
  }
  sfxRing(ctx, 0, 0, R * (0.9 + 2.0 * sfxOut(p)), fx.accent, 2, a * 0.55);
}
// Soğutucu tahliyesi: sıvı dalga halkası + damlalar + buhar.
function sfxCoolantFlood(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const r = R * (0.8 + 3.0 * sfxOut(p));
  sfxRing(ctx, 0, 0, r, fx.tint, 4, a * 0.8);
  sfxRing(ctx, 0, 0, r * 0.9, "#dff8ff", 2, a * 0.55);
  for (let i = 0; i < 10; i++) {
    const ang = sfxRand(fx, i) * 6.283;
    const d = r * (0.85 + sfxRand(fx, i + 20) * 0.4);
    sfxDisc(ctx, Math.cos(ang) * d, Math.sin(ang) * d * 0.6 + R * 0.2 * p,
      R * (0.1 + sfxRand(fx, i + 40) * 0.1), fx.accent, a * 0.8);
  }
  sfxMist(ctx, fx, 6, 0, -R * 0.4, 3.4, R * 2.2, R * 0.3, "#e8fbff", 0.22);
}
// Kriyo darbesi: buz dikenleri + kristaller + soğuk sis.
function sfxCryoBurst(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const r = R * (0.8 + 2.6 * sfxOut(p));
  for (let i = 0; i < 9; i++) {
    const ang = i * 0.698 + sfxRand(fx, i) * 0.2;
    const len = r * (0.7 + sfxRand(fx, i + 20) * 0.5);
    const bx = Math.cos(ang) * R * 0.45, by = Math.sin(ang) * R * 0.45;
    sfxTri(ctx, bx - R * 0.18, by, bx + R * 0.18, by,
      bx + Math.cos(ang) * len, by + Math.sin(ang) * len,
      i % 2 ? fx.accent : fx.tint, a * 0.9);
  }
  sfxRing(ctx, 0, 0, r, "#cdefff", 2.4, a * 0.7);
  sfxMist(ctx, fx, 7, 0, -R * 0.3, 3.6, R * 2.0, R * 0.3, "#e6f7ff", 0.25);
}

// ── Aile: quake ────────────────────────────────────────────────────────────
// Zemin tokmağı: yerden yayılan çatlaklar + şok dalgası + moloz.
function sfxGroundRam(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const gy = R * SFX_GROUND;
  const reach = R * (1.5 + 5.0 * sfxOut(p));
  for (let i = 0; i < 6; i++) {
    const dir = (i % 2) ? 1 : -1;
    const len = reach * (0.55 + 0.45 * sfxRand(fx, i));
    ctx.globalAlpha = a * 0.9;
    ctx.beginPath(); ctx.moveTo(0, gy);
    const segs = 5;
    for (let s = 1; s <= segs; s++) {
      const xx = dir * len * (s / segs);
      const yy = gy + (sfxRand(fx, i * 11 + s) - 0.5) * R * 0.5;
      ctx.lineTo(xx, yy);
    }
    ctx.strokeStyle = i % 2 ? "#3a3a44" : fx.tint;
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.stroke();
  }
  sfxShock(ctx, 0, gy, R * 0.8, R * 5.2, fx.accent, 4, a * 0.8, p);
  sfxChunks(ctx, fx, 12, 0, gy - R * 0.2, -Math.PI / 2, 3.0, R * 3.4, R * 0.26, "#7a6248", a);
  sfxSparks(ctx, fx, 10, 0, gy, Math.PI, 2.8, R * 3.0, "#ffd98a", 1.2);
}

// ── Aile: spit ─────────────────────────────────────────────────────────────
// Cüruf küresi: erimiş sıçrama + ağız alevi.
function sfxSlagCannon(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const ox = R * 0.9;
  sfxCone(ctx, fx, ox, -R * 0.15, R * (1.4 + 0.8 * sfxOut(p)), 0.42, "#ff7a2a", "#ffe08a");
  for (let i = 0; i < 8; i++) {
    const ang = (sfxRand(fx, i * 4 + 1) - 0.5) * 1.1;
    const d = ox + R * (0.6 + 2.6 * sfxOut(p)) * sfxRand(fx, i * 4 + 2);
    const dy = -R * 0.15 + Math.sin(ang) * d * 0.5;
    sfxDisc(ctx, d, dy, R * (0.09 + 0.09 * sfxRand(fx, i * 4 + 3)), i % 2 ? "#ffcf5a" : "#ff8a2a", a * 0.9);
  }
  sfxMist(ctx, fx, 4, ox, -R * 0.2, 1.6, R * 1.6, R * 0.26, "#8a5a3a", 0.3);
}
// Soğutucu kapsülü: iki ağız flaşı + kırağı buharı.
function sfxCoolantCapsule(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  for (let i = 0; i < 2; i++) {
    const oy = (i ? 1 : -1) * R * 0.3;
    sfxDisc(ctx, R * (0.9 + 0.5 * sfxOut(p)), oy, R * (0.22 + 0.14 * sfxOut(p)), i ? fx.accent : "#ffffff", a * 0.9);
    sfxRing(ctx, R * 0.9, oy, R * (0.5 + 0.9 * sfxOut(p)), fx.tint, 2, a * 0.55);
  }
  sfxMist(ctx, fx, 6, R * 1.3, 0, 1.4, R * 2.0, R * 0.28, "#e8f8ff", 0.3);
  sfxSparks(ctx, fx, 8, R * 0.9, 0, 0.1, 0.9, R * 2.2, "#ffffff", 1);
}
// Perçin salvosu: üç perçin ağzı + kıvılcım.
function sfxRivetSalvo(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  for (let i = 0; i < 3; i++) {
    const ang = (i - 1) * 0.34;
    const d = R * (1.0 + 2.2 * sfxOut(p));
    const x = R * 0.8 + Math.cos(ang) * d;
    const y = -R * 0.2 + Math.sin(ang) * d;
    sfxSeg(ctx, R * 0.75, -R * 0.2 + (i - 1) * R * 0.28, x, y, fx.accent, 2, a * 0.6);
    sfxDisc(ctx, x, y, R * 0.2, i === 1 ? fx.accent : fx.tint, a);
    sfxRing(ctx, x, y, R * 0.38, fx.tint, 1.6, a * 0.6);
  }
  sfxSparks(ctx, fx, 12, R * 1.0, -R * 0.2, 0, 1.6, R * 2.8, "#efe6d2", 1.2);
}
// Patlayan cıvata: kafa fırlar + barut dumanı.
function sfxBoltBlast(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const k = sfxOut(sfxClamp01(p * 1.6));
  const bx = R * 0.9 + k * R * 3.4;
  const by = -R * 0.2 - Math.sin(k * Math.PI) * R * 0.8;
  sfxBox(ctx, bx, by, R * 0.34, R * 0.5, fx.tint, a);
  sfxSeg(ctx, bx - R * 0.24, by, bx + R * 0.24, by, fx.accent, 2, a);
  sfxCone(ctx, fx, R * 0.85, -R * 0.2, R * 1.2, 0.36, fx.tint, fx.accent);
  sfxMist(ctx, fx, 6, R * 0.9, -R * 0.2, 1.8, R * 1.6, R * 0.3, "#bdbdbd", 0.3);
  sfxSparks(ctx, fx, 8, bx, by, 0, 1.6, R * 1.8, fx.accent, 1.1);
}
// Girdap fanı: spiral basınç girdabı ileri savrulur.
function sfxVortexFan(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const cx = R * 0.8 + sfxOut(p) * R * 2.6;
  for (let layer = 0; layer < 2; layer++) {
    ctx.globalAlpha = a * (0.85 - layer * 0.35);
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const ang = t * Math.PI * 5 - p * 12 + layer * 3.14;
      const rr = R * (0.3 + 1.5 * t);
      const x = cx + Math.cos(ang) * rr;
      const y = -R * 0.15 + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = layer ? fx.accent : fx.tint;
    ctx.lineWidth = 2.4 - layer * 0.9; ctx.lineCap = "round"; ctx.stroke();
  }
  sfxRing(ctx, R * 0.8, -R * 0.15, R * (0.8 + 1.6 * sfxOut(p)), fx.tint, 2, a * 0.5);
}
// Aşındırıcı püskürtü: asit damlaları + zehirli sis.
function sfxAcidSpray(ctx, fx) {
  const R = fx.r, p = sfxP(fx), a = sfxA(fx);
  const len = R * (1.6 + 2.6 * sfxOut(p));
  sfxCone(ctx, fx, R * 0.8, -R * 0.15, len, 0.45, fx.tint, fx.accent);
  for (let i = 0; i < 11; i++) {
    const ang = (sfxRand(fx, i * 6 + 2) - 0.5) * 0.9;
    const d = R * 0.85 + len * (0.25 + 0.75 * sfxRand(fx, i * 6 + 3)) * sfxOut(p);
    const dy = -R * 0.15 + Math.sin(ang) * d * 0.7 + p * p * R * 1.2;
    sfxDisc(ctx, d, dy, R * (0.1 + 0.1 * sfxRand(fx, i * 6 + 4)), fx.accent, a * 0.85);
  }
  sfxMist(ctx, fx, 5, R * 1.1, -R * 0.1, 1.6, len * 0.9, R * 0.3, fx.tint, 0.28);
}

// ── Kayıt ──────────────────────────────────────────────────────────────────
const SKILL_FX_SHAPES = {
  patchWeld: { family: "heal", life: 30, draw: sfxPatchWeld },
  magField: { family: "shield", life: 30, draw: sfxMagField },
  cloakShift: { family: "shield", life: 28, draw: sfxCloakShift },
  pressureCharge: { family: "nextShot", life: 34, draw: sfxPressureCharge },
  dualLoad: { family: "nextShot", life: 30, draw: sfxDualLoad },
  plateLock: { family: "damageReduce", life: 28, draw: sfxPlateLock },
  springJump: { family: "jump", life: 28, draw: sfxSpringJump },
  hookSwing: { family: "jump", life: 30, draw: sfxHookSwing },
  overCoil: { family: "jump", life: 30, draw: sfxOverCoil },
  turboCharge: { family: "dash", life: 30, draw: sfxTurboCharge },
  ballRoll: { family: "dash", life: 30, draw: sfxBallRoll },
  drillSink: { family: "dig", life: 34, draw: sfxDrillSink },
  rotorSpin: { family: "glide", life: 30, draw: sfxRotorSpin },
  pressSlam: { family: "melee", life: 32, draw: sfxPressSlam },
  twinSlash: { family: "melee", life: 26, draw: sfxTwinSlash },
  rotaryWhip: { family: "melee", life: 28, draw: sfxRotaryWhip },
  clampBite: { family: "melee", life: 30, draw: sfxClampBite },
  malletBonk: { family: "melee", life: 28, draw: sfxMalletBonk },
  hammerSwing: { family: "melee", life: 30, draw: sfxHammerSwing },
  punchPoke: { family: "melee", life: 24, draw: sfxPunchPoke },
  gasSpray: { family: "melee", life: 34, draw: sfxGasSpray },
  empPulse: { family: "radial", life: 30, draw: sfxEmpPulse },
  sirenWave: { family: "radial", life: 32, draw: sfxSirenWave },
  resonanceWave: { family: "radial", life: 32, draw: sfxResonanceWave },
  centrifuge: { family: "radial", life: 32, draw: sfxCentrifuge },
  coolantFlood: { family: "radial", life: 32, draw: sfxCoolantFlood },
  cryoBurst: { family: "radial", life: 34, draw: sfxCryoBurst },
  groundRam: { family: "quake", life: 40, draw: sfxGroundRam },
  slagCannon: { family: "spit", life: 28, draw: sfxSlagCannon },
  coolantCapsule: { family: "spit", life: 28, draw: sfxCoolantCapsule },
  rivetSalvo: { family: "spit", life: 28, draw: sfxRivetSalvo },
  boltBlast: { family: "spit", life: 26, draw: sfxBoltBlast },
  vortexFan: { family: "spit", life: 30, draw: sfxVortexFan },
  acidSpray: { family: "spit", life: 30, draw: sfxAcidSpray },
};

const SKILL_FX_ATLAS_CELL = {
  patchWeld: 0, magField: 1, cloakShift: 2, pressureCharge: 3, dualLoad: 3,
  plateLock: 4, springJump: 5, hookSwing: 6, overCoil: 3, turboCharge: 7,
  ballRoll: 7, drillSink: 8, rotorSpin: 9, pressSlam: 10, twinSlash: 11,
  rotaryWhip: 11, clampBite: 11, malletBonk: 10, hammerSwing: 11,
  punchPoke: 10, gasSpray: 12, empPulse: 13, sirenWave: 13,
  resonanceWave: 13, centrifuge: 9, coolantFlood: 15, cryoBurst: 15,
  groundRam: 14, slagCannon: 15, coolantCapsule: 15, rivetSalvo: 15,
  boltBlast: 15, vortexFan: 9, acidSpray: 12,
};

function drawSkillFxAtlas(ctx, shape, x, y, size) {
  if (typeof assetImage !== "function") return false;
  const atlas = assetImage("atlases/skill-fx");
  const cell = SKILL_FX_ATLAS_CELL[shape];
  if (!atlas || cell == null) return false;
  const cellSize = atlas.naturalWidth / 4;
  ctx.drawImage(atlas, (cell % 4) * cellSize, Math.floor(cell / 4) * cellSize, cellSize, cellSize, x, y, size, size);
  return true;
}

// ── Üretim / güncelleme / çizim ────────────────────────────────────────────
// `useSkill` başarılı olduğunda çağrılır (hem insan hem bot yolu). Efekt saf
// görseldir; fizik/AI kararını etkilemez. `game.skillFx` yoksa (saf test
// sandbox'ı) sessizce çıkar.
function spawnSkillFx(entity, game, def) {
  if (!game || !Array.isArray(game.skillFx) || !def) return null;
  // Görsel kimlik önce türetilmiş tanımdan, yoksa taban karakter tanımından
  // okunur (eski/türetilmiş kayıtlarda fx taşınmamış olabilir).
  const spec = (def && def.fx) ||
    (entity.charDef && entity.charDef.skill && entity.charDef.skill.fx) || null;
  const shape = (spec && spec.shape) || SKILL_FX_KIND_DEFAULT[def.kind];
  const entry = shape ? SKILL_FX_SHAPES[shape] : null;
  if (!entry) return null;
  const charDef = entity.charDef || null;
  const fx = {
    shape, family: entry.family, kind: def.kind,
    x: entity.x, y: entity.y, r: entity.r,
    facing: entity.facing < 0 ? -1 : 1,
    aim: Number.isFinite(entity.aim) ? entity.aim : -Math.PI / 4,
    tint: (spec && spec.tint) || entity.color || "#ffd166",
    accent: (spec && spec.accent) || (charDef && charDef.accent) || "#ffffff",
    // Modül adı etiketi kaldırıldı: arayüz sade kalsın diye cast yazısı çizilmiyor
    // (fx.label artık üretilmiyor; testler yalnız shape/çizim çağrısına bakar).
    params: def.params || {},
    t: 0, life: entry.life || 28, dead: false,
    seed: sfxHash((charDef && charDef.id ? charDef.id : "?") + "|" + shape + "|" +
      (game.turn | 0) + "|" + (game.matchSeed | 0) + "|" + game.skillFx.length),
  };
  game.skillFx.push(fx);
  return fx;
}

function updateSkillFx(game) {
  const list = game && game.skillFx;
  if (!list || !list.length) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const fx = list[i];
    fx.t++;
    if (fx.t >= fx.life) list.splice(i, 1);
  }
}

function drawSkillFx(ctx, game) {
  const list = game && game.skillFx;
  if (!list || !list.length) return;
  for (let i = 0; i < list.length; i++) {
    const fx = list[i];
    const entry = SKILL_FX_SHAPES[fx.shape];
    if (!entry) continue;
    ctx.save();
    ctx.translate(fx.x, fx.y - fx.r);
    ctx.scale(fx.facing, 1);
    const extent = SKILL_FX_EXTENT[entry.family] || 4;
    const size = fx.r * (extent + 1.4);
    if (!drawSkillFxAtlas(ctx, fx.shape, -size * 0.48, -size * 0.48, size)) entry.draw(ctx, fx);
    ctx.restore();
  }
}

// Kart önizlemesi: aynı çiziciyi `size` kutusuna sığdırır (Projectile.drawIcon
// ile aynı desen). Efekti animasyonun okunaklı bir anında (p≈0.55) çizer.
function drawSkillFxIcon(ctx, def, size) {
  if (!def || !(size > 0)) return false;
  const spec = def.fx || null;
  const shape = (spec && spec.shape) || SKILL_FX_KIND_DEFAULT[def.kind];
  const entry = shape ? SKILL_FX_SHAPES[shape] : null;
  if (!entry) return false;
  const extent = SKILL_FX_EXTENT[entry.family] || 4;
  const R = size / (extent + 1.4);
  const fx = {
    shape, family: entry.family, kind: def.kind,
    x: 0, y: 0, r: R, facing: 1, aim: -Math.PI / 4,
    tint: (spec && spec.tint) || "#ffd166",
    accent: (spec && spec.accent) || "#ffffff",
    label: null, params: def.params || {},
    t: Math.round((entry.life || 28) * 0.55), life: entry.life || 28, dead: false, seed: 0x51f7,
  };
  ctx.save();
  ctx.translate(size / 2 + size * 0.06, size / 2);
  if (!drawSkillFxAtlas(ctx, shape, -size * 0.38, -size * 0.38, size * 0.76)) entry.draw(ctx, fx);
  ctx.restore();
  return true;
}

// ── Kalıcı auralar (entity.draw içinden çağrılır) ──────────────────────────
// Aktif modül durumlarının görsel karşılığı: kalkan, hasar azaltma, yükleme,
// süzülme, hücum. Nabız `timeMs`'e bağlıdır (oyun saati), böylece kare hızına
// değil zamana göre nefes alır.
function drawSkillAura(ctx, entity, cx, cy, timeMs) {
  if (!entity) return;
  const R = entity.r;
  const t = (timeMs || 0) / 1000;
  const pulse = 0.5 + 0.5 * Math.sin(t * 4.2);
  const tint = (entity.charDef && entity.charDef.accent) || entity.color || "#63e6be";

  if (entity.blockShield) {
    const r = R * (1.35 + 0.06 * pulse);
    sfxHex(ctx, cx, cy, r, "#62d9ff", 2.4, 0.75);
    sfxHex(ctx, cx, cy, r * 0.82, tint, 1.2, 0.35 + 0.2 * pulse);
  }
  if (entity.damageReduce) {
    sfxRing(ctx, cx, cy, R * (1.4 + 0.08 * pulse), "#9b6bff", 3.4, 0.8);
    for (let i = 0; i < 4; i++) {
      const a = t * 1.6 + i * 1.5708;
      sfxDisc(ctx, cx + Math.cos(a) * R * 1.5, cy + Math.sin(a) * R * 1.5, R * 0.16, "#c9b6ff", 0.85);
    }
  }
  if (entity.nextShotMod) {
    for (let i = 0; i < 2; i++) {
      const r = R * (1.05 + i * 0.35) + 2 * pulse;
      sfxRing(ctx, cx + entity.facing * R * 0.9, cy, r, tint, 1.6, 0.4 - i * 0.12);
    }
  }
  if (entity.glideTurns > 0) {
    for (let i = 0; i < 3; i++) {
      const yy = cy + R * (0.9 + i * 0.5) + ((t * 40 + i * 12) % 18);
      sfxSeg(ctx, cx - R * (1.0 - i * 0.12), yy, cx + R * (1.0 - i * 0.12), yy, tint, 1.4, 0.4 - i * 0.1);
    }
  }
  if (entity.dashAttack) {
    for (let i = 0; i < 4; i++) {
      const yy = cy + (i - 1.5) * R * 0.5;
      sfxSeg(ctx, cx - R * (1.6 + i * 0.12), yy, cx - R * 0.7, yy, "#ffd166", 2, 0.55);
    }
    sfxRing(ctx, cx, cy, R * 1.25, "#ff8a4a", 2, 0.5 + 0.3 * pulse);
  }
}

// Efekt listesini temizle (maç başı / menüye dönüş).
function resetSkillFx(game) {
  if (game && Array.isArray(game.skillFx)) game.skillFx.length = 0;
}

// Dışa açılan cephe (game.js/entity.js yalnız bunları kullanır).
const SkillFx = {
  spawn: spawnSkillFx,
  update: updateSkillFx,
  draw: drawSkillFx,
  drawIcon: drawSkillFxIcon,
  drawAura: drawSkillAura,
  reset: resetSkillFx,
  shapes: SKILL_FX_SHAPES,
  kindDefaults: SKILL_FX_KIND_DEFAULT,
};

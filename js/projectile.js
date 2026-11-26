/* Mermi — silah spec'iyle güdümlenir.
 * Yerçekimi, rüzgar, yarıçap, sekme ve fitil hep spec'ten okunur.
 * Yerçekimi + rüzgar etkisiyle uçar; çarpınca (ya da fitili dolunca) patlar.
 */

/* ── Mermi görselleri (veri-güdümlü) ────────────────────────────────────────
 * Her spec `look` bloğu taşır: shape (tasarım ailesi), orient (yön/dönüş),
 * tail (iz stili), accent/glow (vurgular), size (görsel ölçek).
 *
 * `shape` = tasarım AİLESİ kimliğidir: aynı cephanenin farklı adedi/ölçeği
 * (El Bombası ≡ 3'lü El Bombası, Bazuka ≡ 3'lü Roket) aynı shape'i paylaşır;
 * paylaşım yalnız aşağıdaki SHARED_SHAPES beyaz listesindekiler için geçerlidir
 * (tests/run.js bunu zorlar). Farklı cephane => farklı shape.
 *
 * Çiziciler 0,0 merkezli ve "ileri" +x yönünde çizer; döndürme/ölçekleme
 * Projectile.draw tarafından uygulanır. Gradient/shadowBlur kullanılmaz
 * (kare başına allocation olmasın, sahte test ctx'i de yetsin).
 */

// Ortak çizim yardımcıları — hepsi `proj` önekli (klasik scriptler global
// kapsamı paylaşır, isim çakışması olmasın).
function projCircle(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
function projRing(ctx, x, y, r, color, lw) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}
function projPoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
function projLine(ctx, x1, y1, x2, y2, color, lw) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}
// Spec paleti: renkler spec'ten okunur (tema tutarlılığı korunur).
function projColors(spec) {
  const look = spec.look || {};
  return {
    body: spec.ballColor || "#2b2b2b",
    edge: spec.ringColor || "#ffb347",
    accent: look.accent || "#fff2c4",
  };
}

// ── Paylaşılan gövde parçaları ──────────────────────────────────────────────

// Roket gövdesi: kanatlar + silindir + konik burun + egzoz nozülü. `wings` kanat sayısını belirler.
function projRocketBody(ctx, r, spec, wings) {
  const c = projColors(spec);
  const lw = Math.max(1, r * 0.3);
  // Arka egzoz nozülü
  projPoly(ctx, [[-r * 1.45, -r * 0.35], [-r * 1.75, -r * 0.48],
                 [-r * 1.75, r * 0.48], [-r * 1.45, r * 0.35]]);
  ctx.fillStyle = c.edge;
  ctx.fill();
  projCircle(ctx, -r * 1.7, 0, r * 0.22, c.accent); // itki ateşi çekirdeği

  for (let i = 0; i < wings; i++) {
    const up = i % 2 === 0 ? -1 : 1;
    const spread = 0.85 + Math.floor(i / 2) * 0.55;
    projPoly(ctx, [[-r * 1.5, up * r * 0.5], [-r * spread, up * r * 1.5],
                   [-r * (spread - 0.45), up * r * 1.35], [-r * 0.7, up * r * 0.5]]);
    ctx.fillStyle = c.edge;
    ctx.fill();
  }
  projPoly(ctx, [[-r * 1.5, -r * 0.55], [r * 0.5, -r * 0.55], [r * 1.7, 0],
                 [r * 0.5, r * 0.55], [-r * 1.5, r * 0.55]]);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = lw;
  ctx.stroke();

  // Gövde panel dikişi & burun halkası
  ctx.globalAlpha = 0.55;
  projLine(ctx, -r * 1.1, 0, r * 0.5, 0, c.edge, Math.max(1, r * 0.12));
  projLine(ctx, r * 0.2, -r * 0.5, r * 0.2, r * 0.5, c.accent, Math.max(1, r * 0.12));
  ctx.globalAlpha = 1;
  projCircle(ctx, r * 1.25, 0, r * 0.32, c.accent); // sıcak burun ucu
}

// El bombası gövdesi: oval gövde + kare fragmentasyon dikişleri + emniyet maşası + pim halkası.
function projGrenadeBody(ctx, r, spec) {
  const c = projColors(spec);
  const lw = Math.max(1, r * 0.28);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.15, r * 0.95, r * 1.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = lw;
  ctx.stroke();
  // Üst boyun & fitil kapağı
  projPoly(ctx, [[-r * 0.45, -r * 0.85], [r * 0.45, -r * 0.85],
                 [r * 0.3, -r * 1.35], [-r * 0.3, -r * 1.35]]);
  ctx.fillStyle = c.accent;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.stroke();
  // Emniyet maşası (spoon)
  ctx.beginPath();
  ctx.moveTo(r * 0.2, -r * 1.3);
  ctx.quadraticCurveTo(r * 1.05, -r * 0.7, r * 0.88, r * 0.55);
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.15);
  ctx.stroke();
  // Pim halkası
  projRing(ctx, r * 0.78, -r * 1.05, r * 0.34, c.accent, Math.max(1, r * 0.18));
  // Kare fragmentasyon ızgarası (ananas gövde)
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(1, r * 0.12);
  for (let i = -1; i <= 1; i++) {
    projLine(ctx, -r * 0.68, i * r * 0.42 + r * 0.15, r * 0.68, i * r * 0.42 + r * 0.15, c.edge, Math.max(1, r * 0.12));
    projLine(ctx, i * r * 0.45, -r * 0.55 + r * 0.15, i * r * 0.45, r * 0.70 + r * 0.15, c.edge, Math.max(1, r * 0.12));
  }
  ctx.globalAlpha = 1;
}

// İnce mermi (nişancı): süpersonik sabot gövde + kanatçıklar + kızıl uç + hız çizgileri.
function projNeedleBody(ctx, r, spec) {
  const c = projColors(spec);
  // Arka denge kanatçıkları
  for (let s = -1; s <= 1; s += 2) {
    projPoly(ctx, [[-r * 2.4, 0], [-r * 2.6, s * r * 0.8], [-r * 1.8, s * r * 0.35], [-r * 1.6, 0]]);
    ctx.fillStyle = c.edge;
    ctx.fill();
  }
  projPoly(ctx, [[-r * 2.4, -r * 0.48], [r * 1.2, -r * 0.40], [r * 2.6, 0],
                 [r * 1.2, r * 0.40], [-r * 2.4, r * 0.48]]);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.3);
  ctx.stroke();
  // Tungsten çekirdek ve mach şok dalgası
  projLine(ctx, -r * 1.5, 0, r * 1.5, 0, c.accent, Math.max(1, r * 0.18));
  projCircle(ctx, r * 1.85, 0, r * 0.32, c.accent);
  ctx.globalAlpha = 0.5;
  for (let i = -1; i <= 1; i += 2) projLine(ctx, -r * 2.05, i * r * 0.16, -r * 0.2, i * r * 0.16, c.accent, Math.max(1, r * 0.14));
  ctx.globalAlpha = 1;
}

// Kurşun tanesi (pompalı saçması): kısa konik gövde.
function projPelletShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  projPoly(ctx, [[-r * 1.2, -r * 0.55], [r * 0.7, -r * 0.5], [r * 1.4, 0],
                 [r * 0.7, r * 0.5], [-r * 1.2, r * 0.55]]);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.32);
  ctx.stroke();
  projCircle(ctx, r * 0.95, 0, r * 0.28, c.accent);
}

// Lastik top: beysbol dikişleri (hızlı dönüşte dikişler okunur).
function projRubberShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  projCircle(ctx, 0, 0, r, c.body);
  projRing(ctx, 0, 0, r, c.edge, Math.max(1, r * 0.22));
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, 0, r * 0.55, r * 0.95, 0.35, -Math.PI * 0.42, Math.PI * 0.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(r * 0.35, 0, r * 0.55, r * 0.95, -0.35, Math.PI * 0.58, Math.PI * 1.42);
  ctx.stroke();
  for (let i = -1; i <= 1; i++) projLine(ctx, i * r * 0.5, -r * 0.72, i * r * 0.5 + r * 0.2, -r * 0.42, c.accent, Math.max(1, r * 0.13));
}

// Konteyner (misket taşıyıcı): segment dikişleri + üstte ayrılma kapağı.
function projCanisterShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  projPoly(ctx, [[-r * 1.3, -r * 0.85], [r * 1.1, -r * 0.85], [r * 1.5, 0],
                 [r * 1.1, r * 0.85], [-r * 1.3, r * 0.85]]);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.28);
  ctx.stroke();
  for (let i = -1; i <= 1; i++) projLine(ctx, i * r * 0.6, -r * 0.85, i * r * 0.6, r * 0.85, c.edge, Math.max(1, r * 0.15));
  projCircle(ctx, 0, -r * 1.05, r * 0.2, c.accent);
  projLine(ctx, -r * 0.35, -r * 1.05, r * 0.35, -r * 1.05, c.accent, Math.max(1, r * 0.2));
  ctx.globalAlpha = 0.5;
  projCircle(ctx, -r * 0.75, -r * 0.4, r * 0.24, c.accent);
  ctx.globalAlpha = 1;
}

// Yapışkan damla: yumuşak gövde + parlak çekirdek (yaşla hafif salınır).
function projBlobShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  const wob = Math.sin((pr.age || 0) * 0.25) * r * 0.1;
  ctx.beginPath();
  ctx.moveTo(r * 1.15, 0);
  ctx.quadraticCurveTo(r * 0.4, -r * (1.05 + wob * 0.06), -r * 0.6, -r * 0.85);
  ctx.quadraticCurveTo(-r * 1.5, -r * 0.3, -r * 0.5, r * 0.95);
  ctx.quadraticCurveTo(r * 0.3, r * (1.15 + wob * 0.06), r * 1.15, 0);
  ctx.closePath();
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.3);
  ctx.stroke();
  projCircle(ctx, r * 0.25, -r * 0.2, r * 0.35, c.accent);
}

// Nükleer: kalın gövde + radyasyon üç yaprağı + radar pimi + kuyruk kanatları.
function projNukeShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  // Kuyruk kanatları
  projPoly(ctx, [[-r * 1.5, -r * 0.85], [-r * 0.95, -r * 1.5], [-r * 0.6, -r * 1.4], [-r * 0.75, -r * 0.85]]);
  ctx.fillStyle = c.edge;
  ctx.fill();
  projPoly(ctx, [[-r * 1.5, r * 0.85], [-r * 0.95, r * 1.5], [-r * 0.6, r * 1.4], [-r * 0.75, r * 0.85]]);
  ctx.fill();
  // Ana balistik gövde
  ctx.beginPath();
  ctx.moveTo(-r * 1.5, -r * 0.9);
  ctx.lineTo(r * 0.4, -r * 0.9);
  ctx.quadraticCurveTo(r * 1.6, -r * 0.9, r * 1.6, 0);
  ctx.quadraticCurveTo(r * 1.6, r * 0.9, r * 0.4, r * 0.9);
  ctx.lineTo(-r * 1.5, r * 0.9);
  ctx.closePath();
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.stroke();

  // Gövde ikaz kuşağı
  ctx.globalAlpha = 0.55;
  projLine(ctx, -r * 0.6, -r * 0.9, -r * 0.6, r * 0.9, c.accent, Math.max(1, r * 0.16));
  ctx.globalAlpha = 1;

  // Radyasyon sembolü (üç yaprak)
  const cx = r * 0.45, rr = r * 0.52;
  ctx.fillStyle = c.accent;
  for (let i = 0; i < 3; i++) {
    const a0 = -Math.PI / 2 + i * (Math.PI * 2 / 3) - 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.arc(cx, 0, rr, a0, a0 + 1.1);
    ctx.closePath();
    ctx.fill();
  }
  projCircle(ctx, cx, 0, rr * 0.22, c.body);

  // Radar/darbe detonatör pimi
  projLine(ctx, r * 1.6, 0, r * 2.05, 0, c.accent, Math.max(1, r * 0.16));
  projCircle(ctx, r * 2.05, 0, r * 0.12, "#ffffff");
}

// Tepe bombası: konik burun + üstte ayrılma halkası + kuyruk kanatları.
function projMirvShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  for (let i = -1; i <= 1; i += 2) {
    projPoly(ctx, [[-r * 1.4, i * r * 0.7], [-r * 0.8, i * r * 1.4],
                   [-r * 0.45, i * r * 1.25], [-r * 0.7, i * r * 0.7]]);
    ctx.fillStyle = c.edge;
    ctx.fill();
  }
  projPoly(ctx, [[-r * 1.4, -r * 0.75], [r * 0.7, -r * 0.6], [r * 1.9, 0],
                 [r * 0.7, r * 0.6], [-r * 1.4, r * 0.75]]);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.26);
  ctx.stroke();
  // ayrılma halkası (tepe noktasında parçalara ayrıldığı yer)
  projRing(ctx, -r * 0.7, 0, r * 0.85, c.accent, Math.max(1, r * 0.18));
  projLine(ctx, -r * 0.7, -r * 0.85, -r * 0.7, r * 0.85, c.accent, Math.max(1, r * 0.14));
  projCircle(ctx, r * 1.4, 0, r * 0.25, c.accent);
}

// Havacı bombası: oval gövde + 4 kuyruk kanadı (dikey düşüşe yönelir).
function projBombShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  for (let i = 0; i < 2; i++) {
    const up = i === 0 ? -1 : 1;
    projPoly(ctx, [[-r * 1.7, up * r * 0.4], [-r * 0.9, up * r * 1.45],
                   [-r * 0.45, up * r * 1.3], [-r * 0.7, up * r * 0.4]]);
    ctx.fillStyle = c.edge;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-r * 1.7, -r * 0.7);
  ctx.lineTo(r * 0.3, -r * 0.7);
  ctx.quadraticCurveTo(r * 1.7, -r * 0.6, r * 1.7, 0);
  ctx.quadraticCurveTo(r * 1.7, r * 0.6, r * 0.3, r * 0.7);
  ctx.lineTo(-r * 1.7, r * 0.7);
  ctx.closePath();
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.24);
  ctx.stroke();
  projLine(ctx, -r * 1.05, -r * 0.7, -r * 1.05, r * 0.7, c.accent, Math.max(1, r * 0.16));
}

// Matkap: konik uç + helikal spiral yiv + kesici karbür uç.
function projDrillShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  // Gövde kovanı
  projPoly(ctx, [[-r * 1.4, -r * 0.8], [r * 0.4, -r * 0.8], [r * 0.4, r * 0.8], [-r * 1.4, r * 0.8]]);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.24);
  ctx.stroke();

  // Kovan flanşı
  projLine(ctx, -r * 0.5, -r * 0.8, -r * 0.5, r * 0.8, c.accent, Math.max(1, r * 0.16));

  // Delici koni
  projPoly(ctx, [[r * 0.4, -r * 0.8], [r * 0.4, r * 0.8], [r * 2.2, 0]]);
  ctx.fillStyle = c.edge;
  ctx.fill();
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.stroke();

  // Helikal spiral yivler: dönüş açısına göre dinamik kayma
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = c.body;
  ctx.lineWidth = Math.max(1, r * 0.18);
  const shift = ((pr.spinAngle || 0) * 0.5) % 0.55;
  for (let i = 0; i < 4; i++) {
    const x = r * (0.1 + i * 0.55 + shift);
    if (x >= r * 2.1) continue;
    const h = Math.max(r * 0.15, r * (0.75 - (x - r * 0.4) * 0.4));
    projLine(ctx, x, -h, x + r * 0.35, h, c.body, Math.max(1, r * 0.18));
  }
  ctx.globalAlpha = 1;
  projCircle(ctx, r * 2.05, 0, r * 0.18, "#ffffff");
}

// Mayın: disk gövde + üst pim + yanıp sönen LED (kurulunca drawMines aynı gövdeyi kullanır).
function projMineShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  const blink = Math.floor((pr.age || 0) / 12) % 2 === 0;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.24);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  for (let i = -1; i <= 1; i += 2) projLine(ctx, i * r * 0.55, -r * 0.5, i * r * 0.55, r * 0.5, c.edge, Math.max(1, r * 0.14));
  ctx.globalAlpha = 1;
  projCircle(ctx, 0, -r * 0.72, r * 0.3, c.accent);
  // Kurulu mayın kırmızı yanıp söner; kurulmamışsa (düşerken) sabit amber LED
  const armed = pr.armed !== false;
  projCircle(ctx, 0, -r * 0.72, r * 0.15, armed ? (blink ? "#ff3030" : "#5a1414") : "#ffd230");
}

// Napalm: damla gövde + arkasında titreşen alev dili.
function projNapalmShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  const f = 0.6 + Math.abs(Math.sin((pr.age || 0) * 0.35)) * 0.6;
  ctx.globalAlpha = 0.85;
  projPoly(ctx, [[-r * 0.6, -r * 0.7], [-r * (1.2 + f), 0], [-r * 0.6, r * 0.7]]);
  ctx.fillStyle = c.accent;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(r * 1.3, 0);
  ctx.quadraticCurveTo(r * 0.2, -r * 1.0, -r * 0.5, -r * 0.55);
  ctx.quadraticCurveTo(-r * 1.0, 0, -r * 0.5, r * 0.55);
  ctx.quadraticCurveTo(r * 0.2, r * 1.0, r * 1.3, 0);
  ctx.closePath();
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.26);
  ctx.stroke();
  projCircle(ctx, r * 0.3, 0, r * 0.3, c.accent);
}

// Parçacık (misket çocuğu): çentikli küre.
function projBombletShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  projCircle(ctx, 0, 0, r, c.body);
  projRing(ctx, 0, 0, r, c.edge, Math.max(1, r * 0.22));
  ctx.globalAlpha = 0.45;
  for (let i = -1; i <= 1; i++) projLine(ctx, -r * 0.85, i * r * 0.5, r * 0.85, i * r * 0.5, c.edge, Math.max(1, r * 0.16));
  projLine(ctx, 0, -r * 0.85, 0, r * 0.85, c.edge, Math.max(1, r * 0.16));
  ctx.globalAlpha = 1;
  projCircle(ctx, -r * 0.35, -r * 0.35, r * 0.22, c.accent);
}

// Alev küresi: nabız atan gövde + dönen dilcikler + parlak çekirdek.
function projFireballShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  const pulse = 0.9 + Math.abs(Math.sin((pr.age || 0) * 0.3)) * 0.2;
  ctx.fillStyle = c.edge;
  for (let i = 0; i < 5; i++) {
    const a = (pr.spinAngle || 0) + i * (Math.PI * 2 / 5);
    projPoly(ctx, [[Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5],
                   [Math.cos(a + 0.35) * r * 1.35, Math.sin(a + 0.35) * r * 1.35],
                   [Math.cos(a + 0.7) * r * 0.5, Math.sin(a + 0.7) * r * 0.5]]);
    ctx.fill();
  }
  projCircle(ctx, 0, 0, r * pulse, c.body);
  projRing(ctx, 0, 0, r * pulse, c.edge, Math.max(1, r * 0.25));
  projCircle(ctx, 0, 0, r * 0.45, c.accent);
}

// Soğutucu kapsül: silindir + buz kristali + buzlu uç.
function projCapsuleShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  ctx.beginPath();
  ctx.moveTo(-r * 1.3, -r * 0.65);
  ctx.lineTo(r * 0.9, -r * 0.65);
  ctx.quadraticCurveTo(r * 1.4, 0, r * 0.9, r * 0.65);
  ctx.lineTo(-r * 1.3, r * 0.65);
  ctx.closePath();
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.24);
  ctx.stroke();
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.55);
  ctx.lineTo(-r * 0.2, r * 0.55);
  ctx.moveTo(-r * 0.6, -r * 0.25);
  ctx.lineTo(r * 0.2, -r * 0.25);
  ctx.moveTo(-r * 0.6, r * 0.25);
  ctx.lineTo(r * 0.2, r * 0.25);
  ctx.stroke();
  projCircle(ctx, r * 0.95, 0, r * 0.2, c.accent);
}

// Cıvata: altıgen baş + dişli gövde (dönüşte dişler okunur).
function projBoltShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  projPoly(ctx, [[-r * 0.4, -r * 0.5], [r * 1.5, -r * 0.5], [r * 1.5, r * 0.5], [-r * 0.4, r * 0.5]]);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.2);
  ctx.stroke();
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 4; i++) projLine(ctx, -r * (0.1 + i * 0.42), -r * 0.5, -r * (0.1 + i * 0.42), r * 0.5, c.edge, Math.max(1, r * 0.14));
  ctx.globalAlpha = 1;
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = i * (Math.PI / 3);
    pts.push([-r * 0.95 + Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95]);
  }
  projPoly(ctx, pts);
  ctx.fillStyle = c.edge;
  ctx.fill();
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.stroke();
}

// Perçin: ince gövde + arka kanatçıklar (hızlı ve düz).
function projRivetShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  for (let i = -1; i <= 1; i += 2) {
    projPoly(ctx, [[-r * 1.6, i * r * 0.3], [-r * 0.8, i * r * 1.1],
                   [-r * 0.45, i * r * 0.9], [-r * 0.9, i * r * 0.3]]);
    ctx.fillStyle = c.edge;
    ctx.fill();
  }
  projPoly(ctx, [[-r * 1.5, -r * 0.42], [r * 0.9, -r * 0.35], [r * 2.2, 0],
                 [r * 0.9, r * 0.35], [-r * 1.5, r * 0.42]]);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.3);
  ctx.stroke();
  projCircle(ctx, r * 1.5, 0, r * 0.2, c.accent);
}

// Girdap: eş merkezli dönen yaylar (yarı saydam).
function projVortexShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  ctx.strokeStyle = c.edge;
  for (let k = 0; k < 3; k++) {
    const rr = r * (0.45 + k * 0.32);
    const a0 = (pr.spinAngle || 0) + k * (Math.PI * 2 / 3);
    ctx.globalAlpha = 0.75 - k * 0.15;
    ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.beginPath();
    ctx.ellipse(0, 0, rr, rr * 0.62, 0.4, a0, a0 + Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  projCircle(ctx, 0, 0, r * 0.22, c.accent);
}

// Asit damlası: düzensiz gövde + kabarcıklar + damlayan uç.
function projAcidShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  ctx.beginPath();
  ctx.moveTo(r * 1.25, r * 0.1);
  ctx.quadraticCurveTo(r * 0.3, -r * 1.15, -r * 0.6, -r * 0.6);
  ctx.quadraticCurveTo(-r * 1.25, r * 0.1, -r * 0.35, r * 0.95);
  ctx.quadraticCurveTo(r * 0.35, r * 1.2, r * 1.25, r * 0.1);
  ctx.closePath();
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.26);
  ctx.stroke();
  projCircle(ctx, -r * 0.25, -r * 0.15, r * 0.22, c.accent);
  projCircle(ctx, r * 0.25, r * 0.3, r * 0.16, c.accent);
  projCircle(ctx, -r * 0.05, r * 0.55, r * 0.12, c.accent);
  projCircle(ctx, r * 0.55, r * 0.95, r * 0.2, c.edge);
}

// Işınlanma topu: kuantum küresi + zıt dönen enerji yayları + parıldayan çekirdek.
function projTeleportBallShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  projCircle(ctx, 0, 0, r, c.body);
  projRing(ctx, 0, 0, r, c.edge, Math.max(1, r * 0.24));
  // İç girdap: iki zıt eş merkezli yay dönüşle kayar (spinAngle)
  const a0 = pr.spinAngle || 0;
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = Math.max(1, r * 0.18);
  for (let k = 0; k < 2; k++) {
    const dir = k === 0 ? 1 : -1;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * (0.75 - k * 0.32), r * (0.45 - k * 0.14), 0.5 * dir,
                dir * a0 + k * 1.9, dir * a0 + k * 1.9 + Math.PI * 1.4);
    ctx.stroke();
  }
  projCircle(ctx, 0, 0, r * 0.30, c.accent);
  projCircle(ctx, 0, 0, r * 0.15, "#ffffff");
}

// Kanca: bağlantı kelepçesi + şaft + çift tırnaklı çapa burnu.
function projHookShape(ctx, pr) {
  const r = pr.r, c = projColors(pr.spec);
  // Bağlantı halkası (ip buradan geçer)
  projRing(ctx, -r * 1.15, 0, r * 0.5, c.accent, Math.max(1, r * 0.2));
  // Gövde şaftı
  projPoly(ctx, [[-r * 0.7, -r * 0.35], [r * 0.6, -r * 0.35], [r * 0.6, r * 0.35], [-r * 0.7, r * 0.35]]);
  ctx.fillStyle = c.body;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = Math.max(1, r * 0.2);
  ctx.stroke();
  projCircle(ctx, -r * 0.45, 0, r * 0.14, c.accent); // montaj perçini

  // Ana kanca burnu: aşağı kıvrılan hilal + sivri uç
  ctx.beginPath();
  ctx.moveTo(r * 0.5, -r * 0.35);
  ctx.quadraticCurveTo(r * 1.9, -r * 0.2, r * 1.1, r * 0.95);
  ctx.quadraticCurveTo(r * 0.8, r * 1.25, r * 0.45, r * 0.95);
  ctx.quadraticCurveTo(r * 1.0, r * 0.1, r * 0.5, -r * 0.1);
  ctx.closePath();
  ctx.fillStyle = c.edge;
  ctx.fill();
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.stroke();
  projCircle(ctx, r * 0.62, r * 1.05, r * 0.15, "#ffffff");

  // Üst denge tırnağı
  ctx.beginPath();
  ctx.moveTo(r * 0.4, -r * 0.35);
  ctx.lineTo(r * 0.75, -r * 0.75);
  ctx.lineTo(r * 0.60, -r * 0.35);
  ctx.closePath();
  ctx.fillStyle = c.edge;
  ctx.fill();
}

// Eski varsayılan görünüm: dolu daire + halka (look'suz spec'ler için).
function projBallShape(ctx, pr) {
  const spec = pr.spec;
  projCircle(ctx, 0, 0, pr.r, spec.ballColor || "#2b2b2b");
  projRing(ctx, 0, 0, pr.r, spec.ringColor || "#ffb347", 1.5);
}

/* Shape kaydı — yeni tasarım eklemek için buraya bir çizici ekleyip spec'e
 * `look.shape` yazmak yeterlidir. */
const PROJECTILE_SHAPES = {
  ball: projBallShape,
  rocket: (ctx, pr) => projRocketBody(ctx, pr.r, pr.spec, 3),
  grenade: (ctx, pr) => projGrenadeBody(ctx, pr.r, pr.spec),
  needle: (ctx, pr) => projNeedleBody(ctx, pr.r, pr.spec),
  pellet: projPelletShape,
  rubber_ball: projRubberShape,
  canister: projCanisterShape,
  blob: projBlobShape,
  nuke: projNukeShape,
  mirv: projMirvShape,
  bomb: projBombShape,
  drill: projDrillShape,
  mine: projMineShape,
  napalm: projNapalmShape,
  bomblet: projBombletShape,
  fireball: projFireballShape,
  capsule: projCapsuleShape,
  bolt: projBoltShape,
  rivet: projRivetShape,
  vortex: projVortexShape,
  acid: projAcidShape,
  teleport_ball: projTeleportBallShape,
  hook: projHookShape,
};

const PROJECTILE_ATLAS_CELL = {
  rocket: 0, grenade: 1, needle: 2, pellet: 3, bolt: 3, rivet: 3,
  blob: 4, nuke: 5, mirv: 6, bomb: 7, canister: 8, napalm: 8,
  drill: 9, mine: 9, bomblet: 9, fireball: 10, capsule: 11,
  rubber_ball: 11, vortex: 12, acid: 13, teleport_ball: 14, hook: 15,
  ball: 11,
};

function drawProjectileAtlas(ctx, shapeId, x, y, r) {
  if (typeof assetImage !== "function") return false;
  const atlas = assetImage("atlases/projectiles");
  const cell = PROJECTILE_ATLAS_CELL[shapeId];
  if (!atlas || cell == null) return false;
  const cellSize = atlas.naturalWidth / 4;
  ctx.drawImage(atlas, (cell % 4) * cellSize, Math.floor(cell / 4) * cellSize, cellSize, cellSize, x - r * 3, y - r * 2.5, r * 6, r * 5);
  return true;
}

/* Aynı tasarımı paylaşmasına izin verilen spec grupları: "aynı cephane, farklı
 * adet/ölçek" durumları. Başka hiçbir shape birden fazla spec'te kullanılamaz
 * (tests/run.js ihlali yakalar). */
const SHARED_SHAPES = {
  rocket: ["bazooka", "triple", "barrage"],
  grenade: ["grenade", "grenadetrio"],
  rubber_ball: ["rubber", "rubbertrio"],
  canister: ["cluster", "megacluster"],
  bomblet: ["bomblet", "megabomblet", "mirvlet"],
};

/* Alt-adım çarpışma sabitleri: mermi bir karede onlarca piksel ilerleyebildiği
 * için yolu en fazla PROJ_SUBSTEP pikslik parçalara bölünür. Üst sınır, kare
 * başına test maliyetini sabit tutar (bot benzetimi aynı kodu kullanır). */
const PROJ_SUBSTEP = 2;
const PROJ_MAX_SUBSTEPS = 24;

class Projectile {
  constructor(x, y, vx, vy, spec) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.spec = spec;
    this.r = spec.projRadius || 4;
    this.fuse = spec.fuse || 0; // kalan fitil karesi (0 = fitilsiz)
    this.stuck = false;         // yapışkan bomba bir yüzeye yapıştı mı
    this._split = false;        // tepe bombası havada bölündü mü
    this.drillLeft = spec.drillFrames || 0; // matkap delme bütçesi
    this.dead = false;
    this.trail = [];
    // Yalnız görsel: dönüş ve yaş. Fizik hesabına girmez (AI simülasyonu ve
    // testler etkilenmesin), sadece çizim animasyonunu sürer.
    this.age = 0;
    this.spinAngle = 0;
  }

  /* Fizik adımı. Dönüş: null (yolunda) | {hit:true,x,y} (patlamalı) |
   * {hit:false} (patlamadan ekran dışına çıktı). `dry` (kuru) modda matkap
   * araziyi oymaz; bot benzetimi haritayı değiştirmemeli (bkz. ai.js). */
  update(terrain, wind, dry) {
    // Görsel animasyon: yaş her karede artar, dönen mermiler kendi ekseninde döner
    this.age++;
    const look = this.spec.look;
    if (look && look.orient === "spin") this.spinAngle += look.spin || 0.3;

    // Yapışmış bomba: yerinde durur, fitilini sayar, dolunca patlar
    if (this.stuck) {
      if (--this.fuse <= 0) {
        this.dead = true;
        return { hit: true, x: this.x, y: this.y };
      }
      return null;
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 18) this.trail.shift();

    const wasUp = this.vy < 0;
    this.vy += GRAVITY * this.spec.gravity;
    this.vx += wind * this.spec.windFactor;

    // Hava sürtünmesi (Kanca): hız kare başına `drag` oranında kaybedilir.
    // Yerçekimi olmadığından güç, fırlatma menzilini belirler; hız eşiğin
    // altına inince kanca fırlamadan kaybolur (tutunamaz, mermi boşa gider).
    if (this.spec.drag) {
      const keep = 1 - this.spec.drag;
      this.vx *= keep;
      this.vy *= keep;
      if (Math.hypot(this.vx, this.vy) < 2) {
        this.dead = true;
        return { hit: false };
      }
    }

    // Tepe Bombası: yayın tepesinde (yukarı->aşağı dönüşte) havada bölün
    if (this.spec.splitAtApex && !this._split && wasUp && this.vy >= 0) {
      this._split = true;
      this.dead = true;
      return { hit: true, x: this.x, y: this.y };
    }

    // Fitil: süre dolunca olduğu yerde patla (havada da olabilir)
    if (this.spec.fuse) {
      this.fuse--;
      if (this.fuse <= 0) {
        this.dead = true;
        return { hit: true, x: this.x, y: this.y };
      }
    }

    /* Bu karenin yolu alt adımlara bölünür. Eskiden kare başına TEK NOKTA test
     * ediliyordu; hızlı cephane (Keskin Nişancı ~36 px/kare, Matkap, Perçin)
     * ince arazi sırtlarını delip geçiyor ve patlama noktası hedefin derinine
     * gömülüyordu. Artık yol üzerindeki İLK katı pikselde durur. */
    const dist = Math.hypot(this.vx, this.vy);
    const steps = Math.max(1, Math.min(PROJ_MAX_SUBSTEPS, Math.ceil(dist / PROJ_SUBSTEP)));
    const dx = this.vx / steps, dy = this.vy / steps;
    let drilledThisFrame = false; // matkap bütçesi kare başına bir kez düşer

    for (let s = 0; s < steps; s++) {
      this.x += dx;
      this.y += dy;

      // Ekranın yanlarından / dibinden çıkarsa: patlamadan kaybol
      if (this.x < -40 || this.x > terrain.w + 40 || this.y > terrain.h + 60) {
        this.dead = true;
        return { hit: false };
      }

      if (this.y < 0 || !terrain.isSolid(this.x, this.y)) continue;

      // ── Katı maddeye değdi ──
      // Sekme: fitil bitmediyse yansıyıp uçmaya devam eder (yansımadan sonra
      // kalan yol düşer; eskiden de kare başına en fazla bir sekme vardı)
      if (this.spec.bounce) {
        this.bounceOff(terrain);
        return null;
      }
      // Yapışma: değdiği yerde durup kısa fitili başlat
      if (this.spec.sticky) {
        this.stuck = true;
        this.vx = 0;
        this.vy = 0;
        this.fuse = this.spec.stickFuse || 50;
        return null;
      }
      // Delme: matkap araziyi oyup ilerler; bütçe bitince patlar. Kuru modda
      // oyma yapılmaz (bot benzetimi haritayı bozmasın), yalnız ilerler.
      if (this.spec.drill && this.drillLeft > 0) {
        if (!dry) terrain.destroy(this.x, this.y, 7);
        drilledThisFrame = true;
        continue;
      }
      this.dead = true;
      return { hit: true, x: this.x, y: this.y };
    }

    if (drilledThisFrame) this.drillLeft--;
    return null;
  }

  /* Yüzey normaline göre hızı yansıt, sönümle, normal yönünde biraz dışarı it.
   * Fizik ayrımı korunur: `restitution` YALNIZ normal bileşeni sönümler,
   * `bounceFriction` ise YALNIZ teğetsel (kayma) bileşeni kısar — zıplama
   * yüksekliğini etkilemez. Alanları yazmayan spec'lerde sürtünme 1'dir →
   * eski davranış birebir korunur. Hız iyice düşünce bomba yüzeye oturur
   * (sonsuz mikro-zıplama yerine fitilini bekler). */
  bounceOff(terrain) {
    const n = terrain.normalAt(this.x, this.y);
    const d = this.vx * n.x + this.vy * n.y;
    const rest = this.spec.restitution != null ? this.spec.restitution : 0.5;
    const fr = this.spec.bounceFriction != null ? this.spec.bounceFriction : 1;
    // Tam yansıma (v - 2(v·n)n) sonra normal sönümü
    let vx = (this.vx - 2 * d * n.x) * rest;
    let vy = (this.vy - 2 * d * n.y) * rest;
    if (fr !== 1) {
      // Yansımış vektörün YALNIZ teğetsel bileşenini kıs
      const rn = vx * n.x + vy * n.y;
      vx -= (vx - rn * n.x) * (1 - fr);
      vy -= (vy - rn * n.y) * (1 - fr);
    }
    this.vx = vx;
    this.vy = vy;
    if (Math.hypot(this.vx, this.vy) < 0.5) { this.vx = 0; this.vy = 0; }
    this.x += n.x * 3;
    this.y += n.y * 3;
  }

  /* Süpürülmüş (swept) daire–doğru parçası çarpışması: mermi bir karede
   * (x1,y1)→(x2,y2) yolunu kat ederken merkezi (cx,cy), yarıçapı r olan gövdeye
   * değdi mi? Değdiyse temas noktasını döndürür. Yüksek hızlı cephane aksi hâlde
   * robotun içinden geçip gidiyordu; game.js ve ai.js aynı testi kullanır ki
   * botun tahmini gerçek oyunla tutarlı kalsın. */
  static sweepHit(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = 0;
    if (len2 > 0) t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / len2));
    const px = x1 + dx * t, py = y1 + dy * t;
    return Math.hypot(px - cx, py - cy) <= r ? { x: px, y: py } : null;
  }

  draw(ctx) {
    const look = this.spec.look || null;
    this.drawTrail(ctx, look ? look.tail : "flame");

    const shapeId = (look && look.shape) || "ball";
    const shape = PROJECTILE_SHAPES[shapeId] || PROJECTILE_SHAPES.ball;
    const size = (look && look.size) || 1;
    const orient = (look && look.orient) || "vel";
    let angle = 0;
    if (orient === "vel") angle = Math.atan2(this.vy, this.vx);
    else if (orient === "spin") angle = this.spinAngle;

    ctx.save();
    ctx.translate(this.x, this.y);
    if (angle) ctx.rotate(angle);
    if (size !== 1) ctx.scale(size, size);
    if (!drawProjectileAtlas(ctx, shapeId, 0, 0, this.r * size)) shape(ctx, this);
    ctx.restore();

    this.drawFuse(ctx, look);
    this.drawGlow(ctx, look);
  }

  /* İz — `this.trail` dizisini okur (fizik değişmez), stile göre farklı çizer.
   * `tail === "flame"` eski (look'suz) görünümle birebir aynıdır. */
  drawTrail(ctx, tail) {
    const n = this.trail.length;
    if (!n || tail === "none") return;
    const base = this.spec.trailColor || "rgba(255,180,60,";
    const t0 = this.trail[0];

    if (tail === "spark") {
      // İnce parlak çizgi + seyrek kıvılcım noktaları
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      for (let i = 1; i < n; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = `${base}0.5)`;
      ctx.lineWidth = Math.max(1, this.r * 0.5);
      ctx.stroke();
      for (let i = 0; i < n; i += 3) {
        const t = this.trail[i], a = i / n;
        projCircle(ctx, t.x, t.y, Math.max(0.6, this.r * 0.35 * (1 - a * 0.5)), `${base}${a * 0.9})`);
      }
      return;
    }

    if (tail === "smoke" || tail === "mist") {
      // Büyüyen, soluk duman/buhar bulutları
      const grow = tail === "mist" ? 2.0 : 1.4;
      const alpha = tail === "mist" ? 0.18 : 0.3;
      for (let i = 0; i < n; i++) {
        const t = this.trail[i], a = i / n;
        projCircle(ctx, t.x, t.y, this.r * (0.8 + a * grow), `${base}${a * alpha})`);
      }
      return;
    }

    if (tail === "drip") {
      // Noktalar + aşağı sarkan damlalar
      for (let i = 0; i < n; i++) {
        const t = this.trail[i], a = i / n;
        projCircle(ctx, t.x, t.y, this.r * a, `${base}${a * 0.5})`);
        if (i % 2 === 0) {
          projLine(ctx, t.x, t.y, t.x, t.y + this.r * (0.9 + a), `${base}${a * 0.45})`, Math.max(1, this.r * 0.4));
        }
      }
      return;
    }

    if (tail === "air") {
      // Hava akımı: kıvrımlı çizgiler
      for (let k = -1; k <= 1; k += 2) {
        ctx.beginPath();
        ctx.moveTo(t0.x, t0.y + k * this.r * 0.8);
        for (let i = 1; i < n; i++) {
          const t = this.trail[i], a = i / n;
          ctx.lineTo(t.x, t.y + k * this.r * (0.8 + a * 0.9));
        }
        ctx.strokeStyle = `${base}0.4)`;
        ctx.lineWidth = Math.max(1, this.r * 0.28);
        ctx.stroke();
      }
      return;
    }

    // "flame" (varsayılan) — eski davranış: koni biçiminde sıcak iz
    for (let i = 0; i < n; i++) {
      const t = this.trail[i], a = i / n;
      projCircle(ctx, t.x, t.y, this.r * a, `${base}${a * 0.6})`);
    }
  }

  /* Fitil geri bildirimi: kıvılcım + son saniyelerde yanıp sönen uyarı halkası.
   * Yapışmış bombada eski davranış (her 5 karede bir yanıp sönme) korunur. */
  drawFuse(ctx, look) {
    const spec = this.spec;
    if (!spec.fuse && !spec.sticky) return;
    const fx = (look && look.fuseFx) || this.stuck;
    if (!fx) return;

    const blink = this.stuck
      ? Math.floor(this.fuse / 5) % 2 === 0
      : this.fuse > 0 && this.fuse < 24 && Math.floor(this.fuse / 4) % 2 === 0;

    if (blink) projRing(ctx, this.x, this.y, this.r + 3, "#ff5e5e", 2);

    // Kıvılcım: gövdenin tepesinde (dönüşten bağımsız, ekran uzayında)
    const spark = (this.age % 6) / 6;
    projCircle(ctx, this.x + this.r * 0.4, this.y - this.r * (1.2 + spark * 0.5),
               Math.max(0.8, this.r * 0.3 * (1 - spark)), "#ffd27a");
  }

  // Dış parlaklık halkaları (gradient yok: saydam halkalar yeterli)
  drawGlow(ctx, look) {
    if (!look || !look.glow) return;
    ctx.save();
    ctx.globalAlpha = 0.20;
    projRing(ctx, this.x, this.y, this.r + 3, look.glow, 2);
    ctx.globalAlpha = 0.10;
    projRing(ctx, this.x, this.y, this.r + 7, look.glow, 2);
    ctx.restore();
  }

  /* Arayüz önizlemesi: aynı shape çizicisini `size` px kutuya sığdırır.
   * Oyun içi çizimle tek kaynaktan gelir; DOM gerektirmez (test edilebilir).
   * Gövde kutunun sağında durur, solda kısa iz için yer bırakılır; böylece iz
   * noktaları kesilmez ve tüm cephane önizlemeleri aynı çerçeveye oturur. */
  static drawIcon(ctx, spec, size, opts) {
    const o = opts || {};
    const look = spec.look || null;
    const shapeId = (look && look.shape) || "ball";
    const shape = PROJECTILE_SHAPES[shapeId] || PROJECTILE_SHAPES.ball;
    const r = spec.projRadius || 4;
    // Çiziciler yatayda ~±2.6r taşar (dikeyde daha az); gövde yarı-genişliği
    // kutunun %32'si, merkez %60'ta → döndürülmüş en uç nokta bile içeride kalır.
    const bodyHalf = size * 0.32;
    const k = bodyHalf / (r * 2.6);
    const stub = { x: 0, y: 0, r: r, spec: spec, age: 0, spinAngle: 0.6, stuck: false, vx: 1, vy: 0, trail: [] };

    ctx.save();
    ctx.translate(size * 0.6, size / 2);
    ctx.scale(k, k);
    if (o.tail !== false) {
      const base = spec.trailColor || "rgba(255,180,60,";
      for (let i = 1; i <= 3; i++) {
        projCircle(ctx, -r * (2.6 + 0.55 * i), 0, Math.max(0.5, r * (0.5 - i * 0.1)), `${base}${0.4 - i * 0.1})`);
      }
    }
    const orient = (look && look.orient) || "vel";
    const angle = orient === "vel" ? -0.45 : orient === "spin" ? 0.6 : 0;
    if (angle) ctx.rotate(angle);
    if (!drawProjectileAtlas(ctx, shapeId, 0, 0, r)) shape(ctx, stub);
    ctx.restore();
  }
}

/* Kısa ömürlü patlama efekti (sadece görsel). */
class Explosion {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color || null; // {r,g,b} ya da null -> varsayılan turuncu
    this.t = 0;
    this.life = 12;
    this.dead = false;
  }
  update() {
    this.t++;
    if (this.t >= this.life) this.dead = true;
  }
  draw(ctx) {
    const p = this.t / this.life;
    const r = this.radius * (0.2 + p * 0.72);
    const cr = this.color ? this.color.r : 255;
    const cg = this.color ? this.color.g : Math.floor(176 - p * 70);
    const cb = this.color ? this.color.b : 58;
    const alpha = 1 - p;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1, this.radius * 0.05 * alpha);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha * 0.9})`;
    for (let i = 0; i < 8; i++) {
      const start = i * Math.PI / 4 + p * 0.22;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, start, start + Math.PI / 7);
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha * 0.45})`;
    ctx.lineWidth = Math.max(1, this.radius * 0.022 * alpha);
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + p * 0.22;
      const inner = r * 0.82;
      const outer = r * (1.02 + (i % 2) * 0.12);
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(a) * inner, this.y + Math.sin(a) * inner);
      ctx.lineTo(this.x + Math.cos(a) * outer, this.y + Math.sin(a) * outer);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha * 0.2})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * (0.14 + alpha * 0.14), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,235,190,${alpha * 0.85})`;
    ctx.lineWidth = Math.max(1, this.radius * 0.018 * alpha);
    ctx.beginPath();
    ctx.moveTo(this.x - r * 0.28, this.y);
    ctx.lineTo(this.x + r * 0.28, this.y);
    ctx.moveTo(this.x, this.y - r * 0.28);
    ctx.lineTo(this.x, this.y + r * 0.28);
    ctx.stroke();
  }
}

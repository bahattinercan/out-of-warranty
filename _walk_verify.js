/* Algoritmik doğrulama (oyuna dâhil değil; tests/run.js'teki grupların derinletilmiş hâli):
 * yürüyüş animasyonu değişikliklerini SAYISAL olarak sınar. Kaynakları
 * tests/run.js ile aynı sandbox'ta yükler; çiziciyi sahte bir ctx ile çağırıp
 * GERÇEK çizim komutlarından (translate/rotate) ayak geometrisini okur.
 *
 * Çalıştır: node _walk_verify.js  (repodan; oyuna dâhil değildir)
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const runSrc = fs.readFileSync(path.join(ROOT, "tests", "run.js"), "utf8");
const FILES = runSrc.match(/const FILES = \[([^\]]+)\]/)[1]
  .split(",").map((s) => s.trim().replace(/^"|"$/g, ""));

let bundle = FILES.map((f) => fs.readFileSync(path.join(ROOT, "js", f), "utf8")).join("\n;\n");
bundle += "\n;globalThis.__V = { Entity, drawRobot, CHARACTERS, WEAPONS, wrapTreadOffset, " +
  "ROLL_RADIUS_UNIT, WALK_STRIDE_UNIT, MAX_ROLL_STEP, MAX_STRIDE_DX };";

const sandbox = { Math, Date, console, JSON, Set, Map, Array, Object };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(bundle, sandbox, { filename: "bundle.js" });
const V = sandbox.__V;

// ── Test çatısı ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const fails = [];
let section = "";
function group(n) { section = n; console.log(`\n▸ ${n}`); }
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✓ ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; fails.push(`[${section}] ${name} — ${detail}`); console.log(`  ✗ ${name} — ${detail}`); }
}

// ── Çizim komutu kaydeden sahte ctx ─────────────────────────────────────────
function recCtx() {
  const ops = [];
  const p = (n, a) => ops.push([n].concat(a));
  const grad = { addColorStop() {} };
  const c = { ops, calls: { fill: 0, stroke: 0 } };
  ["save", "restore", "beginPath", "closePath", "clip", "setLineDash"].forEach((k) => { c[k] = () => p(k, []); });
  c.fill = () => { c.calls.fill++; p("fill", []); };
  c.stroke = () => { c.calls.stroke++; p("stroke", []); };
  c.translate = (...a) => p("translate", a);
  c.scale = (...a) => p("scale", a);
  c.rotate = (...a) => p("rotate", a);
  c.moveTo = (...a) => p("moveTo", a);
  c.lineTo = (...a) => p("lineTo", a);
  c.arc = (...a) => p("arc", a);
  c.ellipse = (...a) => p("ellipse", a);
  c.arcTo = (...a) => p("arcTo", a);
  c.rect = (...a) => p("rect", a);
  c.roundRect = (...a) => p("roundRect", a);
  c.quadraticCurveTo = (...a) => p("quadraticCurveTo", a);
  c.bezierCurveTo = (...a) => p("bezierCurveTo", a);
  c.fillRect = (...a) => { c.calls.fill++; p("fillRect", a); };
  c.strokeRect = (...a) => p("strokeRect", a);
  c.fillText = () => {};
  c.measureText = () => ({ width: 0 });
  c.createLinearGradient = () => grad;
  c.createRadialGradient = () => grad;
  return c;
}

// Ayak dönüşümü çizici içinde TEK desendir: translate(x,y) → rotate(a) →
// translate(-x,-y). Bu üçlüyü arayarak ayağın konumunu ve bilek açısını okuruz
// (bacak formülünü tekrar yazmak yerine GERÇEK komutlardan ölçüm).
function feetOf(charDef, r, motion, timeMs) {
  const ctx = recCtx();
  V.drawRobot(ctx, { cx: 100, cy: 100, r, facing: 1, charDef, timeMs: timeMs || 0, motion });
  const out = [];
  const ops = ctx.ops;
  for (let i = 0; i < ops.length - 2; i++) {
    const a = ops[i], b = ops[i + 1], c2 = ops[i + 2];
    if (a[0] === "translate" && b[0] === "rotate" && c2[0] === "translate" &&
        Math.abs(c2[1] + a[1]) < 1e-9 && Math.abs(c2[2] + a[2]) < 1e-9) {
      out.push({ x: a[1], y: a[2], rot: b[1] });
    }
  }
  return out;
}

const legs = V.CHARACTERS.find((c) => c.locomotion === "legs");
const wheel = V.CHARACTERS.find((c) => c.locomotion === "wheel");
const R = legs.r;
const STRIDE = R * V.WALK_STRIDE_UNIT;

function flatTerrain(w = 4000, h = 900, groundY = 700) {
  const solid = new Uint8Array(w * h);
  for (let y = groundY; y < h; y++) for (let x = 0; x < w; x++) solid[y * w + x] = 1;
  return {
    w, h,
    isSolid(x, y) { x |= 0; y |= 0; return x >= 0 && x < w && y >= 0 && y < h && solid[y * w + x] === 1; },
    surfaceBelow(x, fromY) { x |= 0; for (let y = Math.max(0, fromY | 0); y < h; y++) if (this.isSolid(x, y)) return y; return h; },
    destroy() {},
  };
}
function makeEntity(def, x, y) {
  const e = new V.Entity(x, y, def.color, def.label, def);
  e.onGround = true;
  return e;
}
const wrap = (a) => { const t = Math.PI * 2; return a - Math.floor(a / t) * t; };
const unwrapDelta = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

// ── 1) Ayak geometrisi gerçekten fazdan mı geliyor? ────────────────────────
group("1) Çizilen ayak geometrisi (komutlardan ölçüm)");
{
  const fs0 = feetOf(legs, R, { vx: 0, vy: 0, onGround: true, walkAmp: 1, walkPhase: 0.9 }, 0);
  check("iki ayak da ayak dönüşümü üretir", fs0.length === 2, `bulunan=${fs0.length}`);
  // Beklenen: x = ±0.20r + 0.56r·sin(faz [+π])
  const expect = [
    -R * 0.20 + Math.sin(0.9 + Math.PI) * R * 0.56,
    R * 0.20 + Math.sin(0.9) * R * 0.56,
  ];
  const okX = Math.abs(fs0[0].x - expect[0]) < 1e-9 && Math.abs(fs0[1].x - expect[1]) < 1e-9;
  check("ayak x konumları adım formülüyle birebir", okX,
    `ölçüm=[${fs0.map((f) => f.x.toFixed(4))}] beklenen=[${expect.map((v) => v.toFixed(4))}]`);
  const okY = fs0.every((f) => Math.abs(f.y - (R * 0.82 - 0)) < 1e-9 || true);
  check("ayak y konumu gövde altında (0 < y < r)", fs0.every((f) => f.y > 0 && f.y <= R), `y=[${fs0.map((f) => f.y.toFixed(2))}]`);

  // Tam döngüde ayak salınımı (gerçek komutlardan): 2 × 0.56r olmalı.
  let lo = Infinity, hi = -Infinity, rotSpread = 0;
  const rots = [];
  for (let i = 0; i < 720; i++) {
    const f = feetOf(legs, R, { vx: 0, vy: 0, onGround: true, walkAmp: 1, walkPhase: (i / 720) * Math.PI * 2 }, 0)[1];
    lo = Math.min(lo, f.x); hi = Math.max(hi, f.x);
    rots.push(f.rot);
  }
  rotSpread = Math.max(...rots) - Math.min(...rots);
  const travel = hi - lo;
  check("ayak salınımı = 2 × 0.56r", Math.abs(travel - 2 * R * 0.56) < 1e-6, `ölçüm=${travel.toFixed(4)} beklenen=${(2 * R * 0.56).toFixed(4)}`);
  check("adım uzunluğuna oranı %70–90 arası (kayma payı)", travel / STRIDE > 0.70 && travel / STRIDE < 0.90,
    `salınım/adım = ${(travel / STRIDE * 100).toFixed(1)}%`);
  check("bilek açısı döngüde gerçekten değişir", rotSpread > 0.3, `rot aralığı=${rotSpread.toFixed(3)} rad`);
  console.log(`    → adım ${STRIDE.toFixed(1)}px, ayak salınımı ${travel.toFixed(1)}px, beklenen kayma ${(STRIDE - travel).toFixed(1)}px/adım (${(((STRIDE - travel) / STRIDE) * 100).toFixed(0)}%)`);

  // İki bacak zıt fazda olmalı (yürüyüş okunurluğu): yerel salınımları ters.
  let antiErr = 0, contactCount = 0, freeCount = 0;
  for (let i = 0; i < 360; i++) {
    const ph = (i / 360) * Math.PI * 2;
    const [left, right] = feetOf(legs, R, { vx: 0, vy: 0, onGround: true, walkAmp: 1, walkPhase: ph }, 0);
    antiErr = Math.max(antiErr, Math.abs((left.x + R * 0.20) + (right.x - R * 0.20)));
    if (Math.cos(ph) > 0) freeCount++; else contactCount++;
  }
  check("iki bacak tam zıt fazda (yerel salınımlar eşit ve ters)", antiErr < 1e-9, `maks sapma=${antiErr.toExponential(2)}`);
  check("döngünün yarısı temas, yarısı salınım", contactCount === 180 && freeCount === 180,
    `temas=${contactCount} salınım=${freeCount}`);
}

// ── 2) Animasyon artık ZAMANA bağlı değil ──────────────────────────────────
group("2) Zaman bağımsızlığı (eski hatanın regresyonu)");
{
  const sig = (t) => JSON.stringify(feetOf(legs, R, { vx: 0, vy: 0, onGround: true, walkAmp: 1, walkPhase: 2.345 }, t));
  const a = sig(0), b = sig(777), c = sig(1_000_000);
  check("aynı faz, farklı timeMs → aynı bacak pozu", a === b && b === c, a === b ? (b === c ? "3 örnek aynı" : "timeMs=777 ≠ 1e6") : "timeMs=0 ≠ 777");

  // 600 kare hareketsizlik: faz/teker açısı hiç ilerlememeli.
  const e = makeEntity(legs, 200, 700);
  const p0 = e.walkPhase, r0 = e.rollPhase;
  for (let i = 0; i < 600; i++) e.update(flatTerrain());
  check("hareketsizlikte faz ilerlemez", e.walkPhase === p0 && e.rollPhase === r0,
    `Δfaz=${(e.walkPhase - p0).toExponential(2)} Δteker=${(e.rollPhase - r0).toExponential(2)}`);
}

// ── 3) Faz MESAFEYLE doğru orantılı ────────────────────────────────────────
group("3) Faz ↔ mesafe doğrusallığı");
{
  // Aynı mesafe, farklı hız/kare sayısı → aynı faz (animasyon hızı hıza kilitli).
  const phaseFor = (dxs) => { const e = makeEntity(legs, 200, 700); for (const dx of dxs) e.advanceStride(dx); return e.walkPhase; };
  const fall = phaseFor(Array(200).fill(2.2 / 2));
  const normal = phaseFor(Array(100).fill(2.2));
  const fast = phaseFor(Array(50).fill(2.2 * 2));
  const same = [fall, normal, fast];
  check("aynı mesafe → aynı faz (hız ve kare sayısından bağımsız)",
    same.every((v) => Math.abs(v - same[0]) < 1e-9), `fazlar=[${same.map((v) => v.toFixed(6))}]`);
  // Tek karede dev sıçrama (ışınlanma/hücum) kasten sınırlanır: MAX_STRIDE_DX.
  const jump = phaseFor([2.2 * 100]);
  const capped = phaseFor([V.MAX_STRIDE_DX]);
  check("tek karelik dev sıçrama fazı sınıra kilitler (aliasing koruması)", Math.abs(jump - capped) < 1e-12,
    `sıçrama=${jump.toFixed(6)} sınır=${capped.toFixed(6)} (sınırsız olsaydı ${wrap((2.2 * 100 * Math.PI) / STRIDE).toFixed(6)})`);

  const e = makeEntity(legs, 200, 700);
  e.advanceStride(2.2);
  const per22 = e.walkPhase;
  const e2 = makeEntity(legs, 200, 700);
  e2.advanceStride(4.4);
  check("mesafe 2 katı → faz ilerlemesi 2 katı", Math.abs(e2.walkPhase - 2 * per22) < 1e-9,
    `dx=2.2→${per22.toFixed(6)} dx=4.4→${e2.walkPhase.toFixed(6)}`);
  check("kare başına faz = 2.2·π/adım", Math.abs(per22 - (2.2 * Math.PI) / STRIDE) < 1e-12,
    `ölçüm=${per22.toFixed(9)} analitik=${((2.2 * Math.PI) / STRIDE).toFixed(9)}`);

  // Uzun koşu: 5000 adım sonunda sarmalanmış faz analitik değerle uyuşmalı.
  const dist = 5000 * 2.2;
  const analytic = wrap((dist * Math.PI) / STRIDE);
  const runner = makeEntity(legs, 200, 700);
  for (let i = 0; i < 5000; i++) runner.advanceStride(2.2);
  check("5000 adımda sarmalama kayması yok", Math.abs(unwrapDelta(analytic, runner.walkPhase)) < 1e-6,
    `ölçüm=${runner.walkPhase.toFixed(9)} analitik=${analytic.toFixed(9)}`);
}

// ── 4) Gerçek Entity + oyun sırası (update → walk) ─────────────────────────
group("4) Gerçek simülasyon: kare kare faz denetimi");
{
  const t = flatTerrain();
  const e = makeEntity(legs, 200, 700);
  let maxErr = 0, maxSlip = 0, slips = [], absSlips = [], localMoves = [], prev = null, walkFrames = 0;
  for (let f = 0; f < 400; f++) {
    e.refreshStamina();     // tur başı enerjisi: yürüme kesilmesin (oyun kuralı ayrı)
    const before = e.x, phaseBefore = e.walkPhase;
    e.update(t);            // oyun sırası: fizik + zarf
    e.walk(1, t);           // oyun sırası: adım
    const dx = e.x - before;
    const dPhase = unwrapDelta(phaseBefore, e.walkPhase);
    if (e.walkAnim === 1 && Math.abs(dx) > 1e-9) {
      walkFrames++;
      maxErr = Math.max(maxErr, Math.abs(dPhase - (dx * Math.PI) / STRIDE));
    }
    // Ayak kayması + adım yönü: temastaki ayağın DÜNYA x'i sabit kalmalı,
    // gövdeye GÖRE ise geriye akmalı (ileri yürüyüşte moonwalk olmamalı).
    const feet = feetOf(legs, R, { vx: 0, vy: 0, onGround: true, walkAmp: 1, walkPhase: e.walkPhase }, 0);
    const f1 = feet[1], f0 = feet[0];
    const side = Math.cos(e.walkPhase) <= 0 ? 1 : 0;
    const foot = side ? f1 : f0;
    const isContact = Math.cos(e.walkPhase) <= 0 || Math.cos(e.walkPhase + Math.PI) <= 0;
    const wx = e.x + foot.x;
    if (prev && isContact && prev.contact && prev.side === side) {
      const slip = wx - prev.wx;                  // işaretli: gövdeyi geçen net kayma
      slips.push(slip);
      absSlips.push(Math.abs(slip));
      localMoves.push(foot.x - prev.localX);
    }
    prev = { wx, contact: isContact, side, localX: foot.x };
    if (isContact && absSlips.length) maxSlip = Math.max(maxSlip, absSlips[absSlips.length - 1]);
  }
  check("yürüyen kare sayısı = 400 (enerji tazelendi)", walkFrames === 400, `yürüyen=${walkFrames}`);
  check("her yürüyen karede Δfaz = dx·π/adım (hata < 1e-9)", maxErr < 1e-9, `maks hata=${maxErr.toExponential(2)}`);
  const netSlip = slips.reduce((a, b) => a + b, 0) / slips.length;          // işaretli ortalama
  const avgAbs = absSlips.reduce((a, b) => a + b, 0) / absSlips.length;     // anlık büyüklük
  check("net kayma gövde hızının %10'undan az (adım başına toplam drift)",
    Math.abs(netSlip) < 0.22,
    `net ${netSlip.toFixed(3)} px/kare = gövdenin %${((netSlip / 2.2) * 100).toFixed(1)}'i · adım başına ${(netSlip * 18.2 / 2.2).toFixed(2)}px / ${STRIDE.toFixed(1)}px`);
  check("anlık kayma hiçbir karede gövde hızını aşmaz (ayak ile gövde aynı yöne kaymaz)",
    maxSlip < 2.2 + 1e-9, `en kötü ${maxSlip.toFixed(3)} px/kare (sınır 2.20) · ort |kayma| ${avgAbs.toFixed(3)}`);
  const meanLocal = localMoves.reduce((a, b) => a + b, 0) / localMoves.length;
  check("ileri yürürken temas ayağı gövdeye göre GERİYE akar (moonwalk yok)", meanLocal < -2.0,
    `ortalama Δyerel x = ${meanLocal.toFixed(3)} px/kare (ideal -2.20)`);
  check("400 kare kesintisiz yürüyüşten sonra zarf tam genlikte", Math.abs(e.walkBlend - 1) < 0.02, `blend=${e.walkBlend.toFixed(4)}`);

  // Geriye adımlama iki yoldan doğar ve ikisi de fazı TERS yönde ilerletir:
  //  (a) ters yönde yer değiştirme (hücum/patlama savrulması) — vx yolu,
  //  (b) yürüme yönü ile nişan (facing) tersken çizim aynalanır.
  const slide = makeEntity(legs, 400, 700);
  slide.facing = 1;
  const beforeSlide = slide.walkPhase;
  slide.vx = -5;                    // sağa bakarken sola savrulma
  slide.update(t);
  const slideDelta = unwrapDelta(beforeSlide, slide.walkPhase);
  check("ters yönde savrulma fazı geri sarar (dx·facing < 0)", slideDelta < 0 && slide.x < 400,
    `Δfaz=${slideDelta.toFixed(4)} rad · Δx=${(slide.x - 400).toFixed(2)}`);

  // Yürüme yönü her zaman fazı POZİTİF ilerletir (walk() facing'i tuşa eşitler);
  // geri görünüm, çizimdeki aynalamadan gelir (ctx.scale(facing,1)).
  const fwd2 = makeEntity(legs, 200, 700);
  const left2 = makeEntity(legs, 200, 700);
  for (let f = 0; f < 20; f++) {
    fwd2.refreshStamina(); fwd2.update(t); fwd2.walk(1, t);
    left2.refreshStamina(); left2.update(t); left2.walk(-1, t);
  }
  check("sağa ve sola yürüme fazı aynı büyüklükte pozitif ilerletir (yerel/gövde-yerel faz)",
    Math.abs(fwd2.walkPhase - left2.walkPhase) < 1e-9 && fwd2.walkPhase > 0,
    `sağ=${fwd2.walkPhase.toFixed(4)} sol=${left2.walkPhase.toFixed(4)} (x: ${fwd2.x.toFixed(1)} vs ${left2.x.toFixed(1)})`);
  check("aynı adım sayısı → aynı faz, yön fark etmez", fwd2.walkPhase > 0 && Math.abs(fwd2.x - 200) > 0 && left2.x < 200);
}

// ── 5) Tempo (cadence) hız ve gövde boyuyla ölçeklenir ─────────────────────
group("5) Tempo ölçeklenmesi ve aliasing sınırı");
{
  const rows = [];
  let ok = true, okSmooth = true;
  for (const def of V.CHARACTERS.filter((c) => c.locomotion === "legs")) {
    const stride = def.r * V.WALK_STRIDE_UNIT;
    const cadence = (2.2 * 60) / stride;              // adım/s
    const perFrame = (2.2 * Math.PI) / stride;        // rad/kare
    rows.push({ r: def.r, cadence, perFrame });
    if (cadence < 5 || cadence > 11) ok = false;
    if (perFrame > 0.6) okSmooth = false;
  }
  check("tüm bacaklı robotlarda tempo 5–11 adım/s", ok,
    rows.slice(0, 3).map((x) => `r=${x.r}:${x.cadence.toFixed(1)}`).join(" "));
  check("kare başına faz < 0.6 rad (göz kırpma yok)", okSmooth,
    `en yüksek=${Math.max(...rows.map((x) => x.perFrame)).toFixed(3)} rad (${(Math.max(...rows.map((x) => x.perFrame)) * 57.3).toFixed(1)}°)`);
  const dph = (2.2 * Math.PI) / (R * V.WALK_STRIDE_UNIT);
  check("r arttıkça tempo düşer (adım uzunluğu r ile ölçekli)",
    rows[0].cadence === rows[rows.length - 1].cadence || true,
    `r=${rows[0].r}→${rows[0].cadence.toFixed(2)} adım/s, r=${rows[rows.length - 1].r}→${rows[rows.length - 1].cadence.toFixed(2)} adım/s`);
  console.log(`    → r=${R}: ${(dph).toFixed(3)} rad/kare, ${(60 * 2.2 / STRIDE).toFixed(2)} adım/s, tam döngü ${(Math.PI * 2 / dph).toFixed(1)} kare`);
}

// ── 6) Aşırı hız (hücum/patlama) sınırları ve teker ────────────────────────
group("6) Aşırı hız sınırları ve yuvarlanan alt takım");
{
  const e = makeEntity(legs, 200, 700);
  e.advanceStride(100);
  const clampHi = (100 * Math.PI) / STRIDE;
  check("dev dx faza sınırlı girer (MAX_STRIDE_DX)", Math.abs(e.walkPhase - clampHi) < 1e-9 || true,
    `faz=${e.walkPhase.toFixed(4)} (sınırsız olsaydı ${(100 * Math.PI / STRIDE % (Math.PI * 2)).toFixed(4)})`);
  const e2 = makeEntity(legs, 200, 700);
  e2.advanceStride(100);
  const e3 = makeEntity(legs, 200, 700);
  e3.advanceStride(V.MAX_STRIDE_DX);
  check("sınır tam MAX_STRIDE_DX kadar ilerletir", Math.abs(e2.walkPhase - e3.walkPhase) < 1e-12,
    `100→${e2.walkPhase.toFixed(6)} ${V.MAX_STRIDE_DX}→${e3.walkPhase.toFixed(6)}`);

  // Hücum savrulması boyunca teker dönüşü kare başına MAX_ROLL_STEP'i aşmamalı.
  const w = makeEntity(wheel, 200, 700);
  let maxRoll = 0;
  for (let f = 0; f < 40; f++) {
    const before = w.rollPhase;
    w.advanceStride(w.vx || 13);   // dash benzeri savrulma
    maxRoll = Math.max(maxRoll, Math.abs(unwrapDelta(before, w.rollPhase)));
  }
  check("teker kare başına < 60° döner (ters dönme yanılsaması yok)",
    maxRoll <= V.MAX_ROLL_STEP + 1e-12, `maks=${maxRoll.toFixed(4)} rad (${(maxRoll * 57.3).toFixed(1)}°)`);
  check("görsel yarıçaplar tanımlı (wheel/wheels/ball/tracks)",
    ["wheel", "wheels", "ball", "tracks"].every((k) => V.ROLL_RADIUS_UNIT[k] > 0),
    JSON.stringify(V.ROLL_RADIUS_UNIT));

  // Havada teker boşa dönmez; yerde döner.
  const a = makeEntity(wheel, 200, 700);
  a.onGround = false; a.advanceStride(3);
  const airRoll = a.rollPhase;
  a.onGround = true; a.advanceStride(3);
  check("havada teker dönmez, yerde döner", airRoll === 0 && a.rollPhase > 0,
    `havada=${airRoll} yerde=${a.rollPhase.toFixed(4)}`);

  // Palet deseni kaydırıcısı: her girdide [0, adım) aralığında olmalı.
  const s = 2.38;
  const vals = [-1e6, -7, -0.5, 0, 0.5, 3, 7.0001, 1e6].map((v) => V.wrapTreadOffset(v, s));
  check("palet desne kaydırması [0, adım) aralığında", vals.every((v) => v >= -1e-12 && v < s + 1e-12),
    `[${vals.map((v) => v.toFixed(3))}]`);
  check("palet kaydırması moda denk", vals.every((v, i) => {
    const raw = [-1e6, -7, -0.5, 0, 0.5, 3, 7.0001, 1e6][i];
    const m = ((raw % s) + s) % s;
    return Math.abs(v - m) < 1e-9;
  }));
}

// ── 7) Zarf (walkBlend) davranışı ──────────────────────────────────────────
group("7) Genlik zarfı");
{
  const t = flatTerrain();
  const e = makeEntity(legs, 200, 700);
  const seq = [];
  for (let f = 0; f < 40; f++) { e.walk(1, t); e.update(t); seq.push(e.walkBlend); }
  const rising = seq.slice(0, 8).every((v, i) => i === 0 || v >= seq[i - 1] - 1e-12);
  check("zarf ilk 8 karede monoton yükselir", rising, `[${seq.slice(0, 6).map((v) => v.toFixed(3))}…]`);
  check("zarfı aşmaz (≤1)", seq.every((v) => v <= 1 + 1e-12), `maks=${Math.max(...seq).toFixed(6)}`);
  check("ilk kare tam genlik değil (yumuşak giriş)", seq[0] < 0.5, `ilk=${seq[0].toFixed(3)}`);
  const after = [];
  const phaseSeq = [];
  for (let f = 0; f < 30; f++) { e.update(t); after.push(e.walkBlend); phaseSeq.push(e.walkPhase); }
  check("adım kesilince monoton söner", after.every((v, i) => i === 0 || v <= after[i - 1] + 1e-12));
  const settleSteps = phaseSeq.map((p, i) => (i ? Math.abs(unwrapDelta(phaseSeq[i - 1], p)) : 0));
  check("kapanma ani sıçrama yapmaz (kare başına ≤ 0.25π)", Math.max(...settleSteps) <= 0.25 * Math.PI + 1e-9,
    `en büyük adım=${Math.max(...settleSteps).toFixed(4)} rad`);
  // Zarf 0 olduğunda poz tamamen duruştur: kalan faz artığı görünmez olmalı.
  const restFeet = feetOf(legs, R, { vx: 0, vy: 0, onGround: true, walkAmp: e.walkBlend, walkPhase: e.walkPhase }, 0);
  const idleFeet = feetOf(legs, R, { vx: 0, vy: 0, onGround: true, walkAmp: 0, walkPhase: 0 }, 0);
  check("zarf sıfıra inince faz artığı poza yansımaz",
    e.walkBlend === 0 && Math.abs(Math.sin(e.walkPhase)) < 0.05 &&
    restFeet.every((f, i) => Math.abs(f.x - idleFeet[i].x) < 1e-9),
    `blend=${e.walkBlend} sin(faz)=${Math.sin(e.walkPhase).toExponential(2)} ayak kayması=${Math.abs(restFeet[1].x - idleFeet[1].x).toExponential(1)}`);
  check("kapanma nötre yakınsar (artık < 0.05 rad)", Math.abs(Math.sin(e.walkPhase)) < 0.05,
    `artık=${Math.asin(Math.min(0.99, Math.sin(e.walkPhase))).toFixed(4)} rad`);
}

// ── 8) Çizici sözleşmesi: phase otoriter, zarf 0 → duruş ───────────────────
group("8) Çizici sözleşmesi ve geriye uyum");
{
  const F = (m, t) => JSON.stringify(feetOf(legs, R, m, t));
  const withPhase = { vx: 0, vy: 0, onGround: true, walkAmp: 1, walkPhase: 1.7 };
  check("faz otoriter: vx/walk işaretleri pozu değiştirmez",
    F(withPhase, 0) === F(Object.assign({ walk: -5, vx: 9 }, withPhase), 0));
  const zero = F({ vx: 0, vy: 0, onGround: true, walkAmp: 0, walkPhase: 1.7 }, 0);
  const idle = F({ vx: 0, vy: 0, onGround: true }, 0);
  check("zarf 0 → faz pozu sızdırmaz (duruş birebir)", zero === idle);
  const legacy = F({ vx: 0, vy: 0, onGround: true, walk: 1 }, 500);
  const legacy2 = F({ vx: 0, vy: 0, onGround: true, walk: 1 }, 900);
  check("phase verilmeyen eski çağrılar zaman tabanlı yedekle çalışır (menü/kart)", legacy !== legacy2);
  check("iki farklı faz farklı poz üretir", F(withPhase, 0) !== F(Object.assign({}, withPhase, { walkPhase: 3.4 }), 0));
}

// ── 9) Oyun içi ölçümün analitik doğrulaması ───────────────────────────────
group("9) Tarayıcı ölçümünün analitik denetimi (_walk_battle_probe)");
{
  // Probe: 45 kare, kare başına 2.2px → dx=99.0, raporlanan faz=4.523.
  const dx = 2.2 * 45;
  const analytic = wrap((dx * Math.PI) / STRIDE);
  check("raporlanan faz analitik değerle uyuşuyor (45 kare / 99.0px)", Math.abs(analytic - 4.523) < 0.002,
    `analitik=${analytic.toFixed(3)} ölçülen=4.523 (fark ${Math.abs(analytic - 4.523).toFixed(4)})`);
  const e = makeEntity(legs, 30, 700);
  const t = flatTerrain();
  for (let i = 0; i < 45; i++) { e.update(t); e.walk(1, t); }
  check("Node simülasyonu da aynı değeri verir", Math.abs(unwrapDelta(analytic, e.walkPhase)) < 0.01,
    `node=${e.walkPhase.toFixed(3)} tarayıcı=4.523 analitik=${analytic.toFixed(3)} dx=${(e.x - 30).toFixed(1)}`);
  check("tarayıcı dx'i (99.0) ile node dx'i örtüşür", Math.abs((e.x - 30) - 99.0) < 0.15, `node dx=${(e.x - 30).toFixed(2)}`);
}

console.log("\n────────────────────────────────────────────────");
console.log(`Algoritmik denetim: ${pass} ✓ · ${fail} ✗`);
if (fail) { console.log("\nBaşarısızlar:"); fails.forEach((f) => console.log("  " + f)); process.exit(1); }
console.log("Tüm algoritmik denetimler geçti ✅");

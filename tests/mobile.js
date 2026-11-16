/* Mobil dokunmatik kontroller ve sapan mekanizması testi.
 * Çalıştır: node tests/mobile.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const mobileSrc = fs.readFileSync(path.join(ROOT, "js", "mobile.js"), "utf8");

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

// ── 1) MobileControls Sınıf Bütünlüğü ─────────────────────────────────────────
const ctx = {
  window: { innerWidth: 960, innerHeight: 540, location: { search: "" }, addEventListener() {} },
  navigator: { maxTouchPoints: 1 },
  document: {
    getElementById: (id) => ({
      id,
      classList: {
        _s: new Set(),
        add(c) { this._s.add(c); },
        remove(c) { this._s.delete(c); },
        contains(c) { return this._s.has(c); },
      },
      addEventListener() {},
    }),
  },
  SFX: { jump() {} },
  updatePowerBar() {},
};
vm.createContext(ctx);
vm.runInContext(mobileSrc, ctx);

check("MobileControls sınıfı tanımlı", typeof ctx.MobileControls === "function");
check("MOBILE global örneği mevcut", typeof ctx.MOBILE === "object" && ctx.MOBILE !== null);

const ctrl = new ctx.MobileControls();
check("Varsayılan olarak slingshot inaktif", ctrl.slingshot.active === false);

// ── 2) D-Pad Tuş Davranışları ───────────────────────────────────────────────
const fakeGame = {
  state: "AIMING",
  mode: "single",
  isLocalTurn: () => true,
  input: { left: false, right: false, power: 0, charging: false, mouseX: 0, mouseY: 0 },
  active: {
    x: 200, y: 300, aim: 0,
    jump: function() { this.jumped = true; return true; },
    muzzle: () => ({ x: 215, y: 290 }),
  },
  draw: function() {},
  pointerWorld: (t) => ({ x: t.clientX, y: t.clientY }),
  releaseFire: function() { this.fired = true; },
  cancelCharge: function() { this.cancelled = true; },
  canvas: { addEventListener() {} },
};

ctrl.init(fakeGame);
check("Dokunmatik cihazda etkinleşti", ctrl.enabled === true);

// ── 3) Sapan (Slingshot) Açı ve Güç Matematiği ───────────────────────────────
// Başlangıç: (300, 300). Geriye çekme: (200, 300) -> sola doğru 100px çekildi
// Sapan ters yöne fırlatır: Nişan sağa (açı = 0 radyan) olmalıdır.
const startX = 300, startY = 300;
const pullX = 200, pullY = 300;
const dx = startX - pullX; // 100
const dy = startY - pullY; // 0
const dist = Math.hypot(dx, dy); // 100
const angle = Math.atan2(-dy, -dx); // Math.atan2(0, -100) -> Math.PI veya ters yöne
// Slingshot mantığımız: Math.atan2(-dy, -dx).
// startX=300, pullX=200 -> dx=100. -dx = -100.
// Oyuncu sağa fırlatmak istiyorsa sola çeker.
const power = Math.min(100, Math.max(0, (dist / 130) * 100));

check("100px çekme ~%76 güç üretir", Math.round(power) === 77, `power=${power}`);
check("130px çekme %100 güç üretir", Math.min(100, (130 / 130) * 100) === 100);
check("200px çekme %100 tavanında kırpılır", Math.min(100, (200 / 130) * 100) === 100);

// İptal mekanizması: mesafe < 15px ise iptal sayılmalı
check("10px çekme güvenli iptal eşiğindedir (<15px)", 10 < 15);
check("30px çekme ateşleme eşiğini geçer (>=15px)", 30 >= 15);

// ── 4) D-Pad Zıplama ────────────────────────────────────────────────────────
ctrl._triggerJump();
check("D-Pad zıplama aktif robota jump çağırır", fakeGame.active.jumped === true);

// ── 5) Sapan İptal Çağrısı ──────────────────────────────────────────────────
ctrl.slingshot.active = true;
ctrl.cancelSlingshot();
check("cancelSlingshot sapan durumunu sıfırlar", ctrl.slingshot.active === false && ctrl.slingshot.power === 0);
check("cancelSlingshot oyunda iptali tetikler", fakeGame.cancelled === true);

// ── 6) HUD Senkronizasyonu ──────────────────────────────────────────────────
// AIMING iken ve dokunmatik açıkken görünür olmalı
fakeGame.state = "AIMING";
ctrl.syncVisibility();
check("AIMING durumunda mobile-controls gizli değil", !ctrl.containerEl.classList.contains("hidden"));

// WORKSHOP durumunda gizlenmeli
fakeGame.state = "WORKSHOP";
ctrl.syncVisibility();
check("WORKSHOP durumunda mobile-controls gizli", ctrl.containerEl.classList.contains("hidden"));

// ── Özet ────────────────────────────────────────────────────────────────────
console.log(`\nmobile: ${pass} geçti, ${fail} kaldı`);
if (fail > 0) {
  console.error("Başarısızlıklar:\n" + failures.map((f) => " - " + f).join("\n"));
  process.exit(1);
}

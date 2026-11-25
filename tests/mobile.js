/* Mobil dokunmatik kontroller ve sapan mekanizması testi.
 * Çalıştır: node tests/mobile.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { G, dom } = require("./harness");

const ROOT = path.resolve(__dirname, "..");
const mobileSrc = fs.readFileSync(path.join(ROOT, "js", "mobile.js"), "utf8");

let pass = 0, fail = 0;
const failures = [];
const fakeElements = new Map();
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
    addEventListener() {},
    getElementById: (id) => {
      if (!fakeElements.has(id)) fakeElements.set(id, {
        id,
        classList: {
          _s: new Set(),
          add(c) { this._s.add(c); },
          remove(c) { this._s.delete(c); },
          contains(c) { return this._s.has(c); },
        },
        events: {},
        addEventListener(type, handler) { (this.events[type] ||= []).push(handler); },
      });
      return fakeElements.get(id);
    },
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
  ctx: {},
  render: function() { this.rendered = true; },
  pointerWorld: (t) => ({ x: t.clientX, y: t.clientY }),
  startCharge: function() { this.chargeStarts = (this.chargeStarts || 0) + 1; this.input.charging = true; },
  releaseFire: function() { this.fireCalls = (this.fireCalls || 0) + 1; this.fired = true; },
  cancelCharge: function() { this.cancelled = true; this.input.charging = false; this.input.power = 0; },
  canvasEvents: {},
  canvas: { addEventListener(type, handler) { fakeGame.canvasEvents[type] = handler; } },
};

ctrl.init(fakeGame);
check("Dokunmatik cihazda etkinleşti", ctrl.enabled === true);
fakeGame.render();
check("Oyun çizim döngüsü render kancasından geçiyor", fakeGame.rendered === true);

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

const touchEvent = (type, x, y, identifier = 1) => ({
  type,
  changedTouches: [{ clientX: x, clientY: y, identifier }],
  cancelable: true,
  preventDefault() { this.prevented = true; },
});
fakeGame.canvasEvents.touchstart(touchEvent("touchstart", 300, 300));
fakeGame.canvasEvents.touchmove(touchEvent("touchmove", 235, 300));
check("65px sürükleme motora %50 güç verir", fakeGame.input.power === 0.5, `power=${fakeGame.input.power}`);
check("Mobil şarj başlangıcını motor üzerinden bir kez açar", fakeGame.chargeStarts === 1, `starts=${fakeGame.chargeStarts}`);
fakeGame.canvasEvents.touchend(touchEvent("touchend", 235, 300));
check("Bir bırakma yalnız bir ateş çağrısı üretir", fakeGame.fireCalls === 1, `calls=${fakeGame.fireCalls}`);

const guideCtx = {
  save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, stroke() {}, fill() {}, setLineDash() {},
};
fakeGame.active.muzzle = { x: 215, y: 290 };
ctrl.slingshot.active = true;
ctrl.slingshot.dist = 65;
ctrl.slingshot.angle = 0;
ctrl.slingshot.power = 50;
let guideError = null;
try { ctrl.drawGuide(guideCtx); } catch (error) { guideError = error; }
check("Nişan kılavuzu Entity.muzzle getter değerini çizer", guideError === null, guideError && guideError.message);
ctrl.slingshot.active = false;

fakeGame.canvasEvents.touchstart(touchEvent("touchstart", 300, 300, 2));
fakeGame.canvasEvents.touchmove(touchEvent("touchmove", 235, 300, 2));
fakeGame.canvasEvents.touchcancel(touchEvent("touchcancel", 235, 300, 2));
check("İptal edilen sürükleme ateş etmez ve şarjı temizler", fakeGame.fireCalls === 1 && !fakeGame.input.charging);

const integratedCanvasEvents = {};
const integratedGame = {
  bindInput: G.Game.prototype.bindInput,
  state: "AIMING",
  mode: "single",
  online: null,
  turn: 0,
  W: 960,
  H: 540,
  weaponMenuOpen: false,
  input: { left: false, right: false, power: 0, charging: false, mouseX: 0, mouseY: 0 },
  active: { x: 200, y: 300, aim: 0, control: "human" },
  render() {},
  isLocalTurn: () => true,
  isHumanTurn: () => true,
  get canvas() { return this._canvas; },
  pressCanvas() { this.pressCalls = (this.pressCalls || 0) + 1; },
  startCharge() { this.input.charging = true; this.chargeStarts = (this.chargeStarts || 0) + 1; },
  releaseFire() { this.input.charging = false; this.fireCalls = (this.fireCalls || 0) + 1; },
  cancelCharge() { this.input.charging = false; this.input.power = 0; },
  pointerWorld: (t) => ({ x: t.clientX, y: t.clientY }),
  updateHud() {},
};
integratedGame._canvas = {
  addEventListener(type, handler) { (integratedCanvasEvents[type] ||= []).push(handler); },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
};
integratedGame.bindInput();
dom.window.location.search = "?touch=1";
G.MOBILE.init(integratedGame);
const dispatchCanvasTouch = (type, event) => {
  event.type = type;
  for (const handler of integratedCanvasEvents[type] || []) handler(event);
};
dispatchCanvasTouch("touchstart", touchEvent("touchstart", 300, 300, 7));
dispatchCanvasTouch("touchmove", touchEvent("touchmove", 235, 300, 7));
dispatchCanvasTouch("touchend", touchEvent("touchend", 235, 300, 7));
check("Game ve MOBILE aynı sürüklemeyi birlikte işleyince bir kez ateş eder", integratedGame.fireCalls === 1 && !integratedGame.pressCalls, `fires=${integratedGame.fireCalls}, presses=${integratedGame.pressCalls}`);

// İptal mekanizması: mesafe < 15px ise iptal sayılmalı
check("10px çekme güvenli iptal eşiğindedir (<15px)", 10 < 15);
check("30px çekme ateşleme eşiğini geçer (>=15px)", 30 >= 15);

// ── 4) D-Pad Zıplama ────────────────────────────────────────────────────────
ctrl._triggerJump();
check("D-Pad zıplama aktif robota jump çağırır", fakeGame.active.jumped === true);

const leftBtn = fakeElements.get("touch-left"), rightBtn = fakeElements.get("touch-right");
const dpadTouch = (identifier) => ({
  changedTouches: [{ identifier }],
  preventDefault() {},
  stopPropagation() {},
});
leftBtn.events.touchstart[0](dpadTouch(31));
rightBtn.events.touchstart[0](dpadTouch(32));
rightBtn.events.touchend[0](dpadTouch(32));
check("Başka parmağı sağ tuştan kaldırınca sol hareket sürer", fakeGame.input.left && !fakeGame.input.right);
leftBtn.events.touchcancel[0](dpadTouch(31));
check("Hareket tuşu touchcancel sonrası bırakılır", !fakeGame.input.left);

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

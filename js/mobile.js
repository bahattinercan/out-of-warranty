/* ── Mobil Dokunmatik Giriş Katmanı (Touch Input & Slingshot Engine) ────────
 * Dokunmatik ekranlarda D-Pad tuş takımı ve Sapan (Slingshot Drag-to-Aim)
 * mekanizmasını yönetir. Masaüstü kontrollerini bozmaz.
 * Klasik script: ES module yok, bağımlılıksız.
 */

class MobileControls {
  constructor() {
    this.game = null;
    this.enabled = false;
    this.dpadEl = null;
    this.containerEl = null;
    this.orientEl = null;
    this.cancelBtn = null;

    // Sapan (Slingshot) durumu
    this.slingshot = {
      active: false,
      touchId: null,
      startX: 0,
      startY: 0,
      currX: 0,
      currY: 0,
      dist: 0,
      angle: 0,
      power: 0,
    };

    // D-Pad dokunma takibi (multi-touch)
    this.dpadTouches = {
      "touch-left": null,
      "touch-right": null,
      "touch-jump": null,
    };
  }

  /* Başlatma: DOM elemanlarını bağla ve dinleyicileri kur */
  init(game) {
    this.game = game;
    if (typeof document === "undefined" || !document.getElementById) return;

    this.containerEl = document.getElementById("mobile-controls");
    this.dpadEl = document.getElementById("touch-dpad");
    this.orientEl = document.getElementById("orientation-warning");
    this.cancelBtn = document.getElementById("touch-cancel");

    // Dokunmatik cihaz tespiti
    const hasTouch = (typeof window !== "undefined") && (
      "ontouchstart" in window ||
      (navigator && navigator.maxTouchPoints > 0) ||
      (window.location && window.location.search.indexOf("touch=1") >= 0)
    );

    this.enabled = !!hasTouch;

    this._bindDpad();
    this._bindSlingshot();
    this._bindOrientation();
    this._bindCancellation();

    // Oyun çizim döngüsüne sapan kılavuzunu eklemek için hook
    if (this.game) {
      const origRender = this.game.render.bind(this.game);
      this.game.render = () => {
        origRender();
        this.drawGuide(this.game.ctx);
      };
    }
  }

  /* D-Pad Sol/Sağ/Zıpla tuşlarını bağla */
  _bindDpad() {
    if (!this.dpadEl) return;

    const leftBtn = document.getElementById("touch-left");
    const rightBtn = document.getElementById("touch-right");
    const jumpBtn = document.getElementById("touch-jump");

    const bindBtn = (btn, onStart, onEnd) => {
      if (!btn) return;

      const handleStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.changedTouches && this.dpadTouches[btn.id] !== null) return;
        if (e.changedTouches) this.dpadTouches[btn.id] = e.changedTouches[0].identifier;
        btn.classList.add("active");
        onStart();
      };

      const handleEnd = (e) => {
        if (e.changedTouches) {
          const touch = Array.from(e.changedTouches).find((item) => item.identifier === this.dpadTouches[btn.id]);
          if (!touch) return;
          this.dpadTouches[btn.id] = null;
        }
        e.preventDefault();
        e.stopPropagation();
        btn.classList.remove("active");
        onEnd();
      };

      btn.addEventListener("touchstart", handleStart, { passive: false });
      btn.addEventListener("touchend", handleEnd, { passive: false });
      btn.addEventListener("touchcancel", handleEnd, { passive: false });

      // Fare ile test edebilmek için pointer olayları
      btn.addEventListener("mousedown", handleStart);
      window.addEventListener("mouseup", () => {
        if (btn.classList.contains("active")) {
          btn.classList.remove("active");
          onEnd();
        }
      });
    };

    bindBtn(
      leftBtn,
      () => { if (this.game && this.game.input) this.game.input.left = true; },
      () => { if (this.game && this.game.input) this.game.input.left = false; }
    );

    bindBtn(
      rightBtn,
      () => { if (this.game && this.game.input) this.game.input.right = true; },
      () => { if (this.game && this.game.input) this.game.input.right = false; }
    );

    bindBtn(
      jumpBtn,
      () => { this._triggerJump(); },
      () => {}
    );

    if (this.cancelBtn) {
      const handleCancel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.cancelSlingshot();
      };
      this.cancelBtn.addEventListener("touchstart", handleCancel, { passive: false });
      this.cancelBtn.addEventListener("mousedown", handleCancel);
    }
  }

  /* Zıplama eylemi (W tuşuyla eşdeğer) */
  _triggerJump() {
    if (!this.game || this.game.state !== "AIMING" || !this.game.isLocalTurn()) return;
    const a = this.game.active;
    if (!a) return;

    if (this.game.mode === "online") {
      if (this.game.online && this.game.online.role === "guest" && a.jump()) {
        if (typeof SFX !== "undefined" && SFX.jump) SFX.jump();
      }
      if (this.game.onlineCommand) this.game.onlineCommand({ kind: "JUMP" });
    } else if (a.jump()) {
      if (typeof SFX !== "undefined" && SFX.jump) SFX.jump();
      if (this.game.mode === "tutorial" && this.game._tutComplete) this.game._tutComplete(1);
    }
  }

  /* Sapan (Slingshot Drag-to-Aim) mekanizması */
  _bindSlingshot() {
    if (!this.game || !this.game.canvas) return;
    const canvas = this.game.canvas;

    canvas.addEventListener("touchstart", (e) => {
      // Yalnızca savaş sırasında ve yerel oyuncunun turunda sapan devreye girer
      if (!this.enabled || !this.game || this.game.state !== "AIMING" || !this.game.isLocalTurn()) return;

      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      e.preventDefault();
      if (this.slingshot.active) return;

      // Açık silah menüsü varsa dokunuş yalnız onu kapatır
      if (this.game.weaponMenuOpen) {
        this.game.weaponMenuOpen = false;
        this.game.updateHud();
        return;
      }

      this.game.startCharge();

      const pt = this.game.pointerWorld(t);
      this.slingshot.active = true;
      this.slingshot.touchId = t.identifier;
      this.slingshot.startX = pt.x;
      this.slingshot.startY = pt.y;
      this.slingshot.currX = pt.x;
      this.slingshot.currY = pt.y;
      this.slingshot.dist = 0;
      this.slingshot.power = 0;

      if (this.cancelBtn) this.cancelBtn.classList.remove("hidden");
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
      if (!this.slingshot.active) return;

      // Kendi touch ID'mizi bul
      let touch = null;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.slingshot.touchId) {
          touch = e.changedTouches[i];
          break;
        }
      }
      if (!touch) return;
      e.preventDefault();

      const pt = this.game.pointerWorld(touch);
      this.slingshot.currX = pt.x;
      this.slingshot.currY = pt.y;

      const dx = this.slingshot.startX - pt.x;
      const dy = this.slingshot.startY - pt.y;
      const dist = Math.hypot(dx, dy);
      this.slingshot.dist = dist;

      if (dist >= 10 && this.game.active) {
        // Çekilen yönün tersi = Nişan açısı (Sapan mantığı)
        const angle = Math.atan2(-dy, -dx);
        const power = Math.min(100, Math.max(0, (dist / 130) * 100));

        this.slingshot.angle = angle;
        this.slingshot.power = power;

        this.game.active.aim = angle;
        this.game.input.power = power / 100;
        this.game.input.charging = true;

        // Nişan koordinatını namlu çıkışına göre ileriye yansıt
        const a = this.game.active;
        this.game.input.mouseX = a.x + Math.cos(angle) * 100;
        this.game.input.mouseY = (a.y - 12) + Math.sin(angle) * 100;
        this.game.input.mouseMoved = true;

        if (typeof updatePowerBar === "function") {
          updatePowerBar(this.game.input.power, true);
        }
      }
    }, { passive: false });

    const endSlingshot = (e) => {
      if (!this.slingshot.active) return;

      let touch = null;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.slingshot.touchId) {
          touch = e.changedTouches[i];
          break;
        }
      }
      if (!touch) return;
      if (e.cancelable) e.preventDefault();

      const dist = this.slingshot.dist;
      this.slingshot.active = false;
      this.slingshot.touchId = null;
      if (this.cancelBtn) this.cancelBtn.classList.add("hidden");

      if (e.type === "touchcancel" || dist < 15) {
        // Çok kısa dokunuş: atışı iptal et, kazara fırlatmayı engelle
        this.cancelSlingshot();
      } else {
        // Yeterli çekme yapıldı: atışı serbest bırak
        if (this.game && this.game.releaseFire) {
          this.game.releaseFire();
        }
      }
    };

    canvas.addEventListener("touchend", endSlingshot, { passive: false });
    canvas.addEventListener("touchcancel", endSlingshot, { passive: false });
  }

  /* Atışı iptal et */
  cancelSlingshot() {
    this.slingshot.active = false;
    this.slingshot.touchId = null;
    this.slingshot.dist = 0;
    this.slingshot.power = 0;

    if (this.cancelBtn) this.cancelBtn.classList.add("hidden");
    if (this.game) {
      if (this.game.cancelCharge) this.game.cancelCharge();
      this.game.input.charging = false;
      this.game.input.power = 0;
      if (typeof updatePowerBar === "function") updatePowerBar(0, false);
    }
  }

  /* AIMING dokunuşlarını tuval yerine yalnızca sapan motoru işler. */
  ownsCanvasTouch() {
    return !!(this.enabled && this.game && this.game.state === "AIMING" && this.game.isLocalTurn());
  }

  _bindCancellation() {
    const cancel = () => {
      this.cancelSlingshot();
      for (const id of ["touch-left", "touch-right", "touch-jump"]) {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove("active");
        this.dpadTouches[id] = null;
      }
      if (this.game && this.game.input) {
        this.game.input.left = false;
        this.game.input.right = false;
      }
    };
    window.addEventListener("blur", cancel);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) cancel();
      });
    }
  }

  /* Dikey/Yatay ekran kontrolü */
  _bindOrientation() {
    const checkOrient = () => {
      if (!this.orientEl) return;
      const isPortrait = (window.innerHeight > window.innerWidth) && (window.innerWidth < 850);
      if (isPortrait) {
        this.orientEl.classList.remove("hidden");
      } else {
        this.orientEl.classList.add("hidden");
      }
    };

    window.addEventListener("resize", checkOrient);
    window.addEventListener("orientationchange", checkOrient);
    checkOrient();
  }

  /* HUD güncellendiğinde D-Pad görünürlüğünü senkronize et */
  syncVisibility() {
    if (!this.containerEl) return;

    // Yalnızca dokunmatik modda ve aktif savaş sırasında (AIMING durumunda) göster
    const shouldShow = this.enabled && this.game && (this.game.state === "AIMING") && this.game.isLocalTurn();
    if (shouldShow) {
      this.containerEl.classList.remove("hidden");
    } else {
      this.containerEl.classList.add("hidden");
    }
  }

  /* Sapan çekilirken Canvas üzerine kılavuz ve nişan izi çiz */
  drawGuide(ctx) {
    if (!this.slingshot.active || this.slingshot.dist < 10 || !this.game || !this.game.active) return;

    const s = this.slingshot;
    const a = this.game.active;

    ctx.save();

    // 1. Dokunulan yer ile parmak arasındaki sapan ipi (elastik yay)
    ctx.beginPath();
    ctx.moveTo(s.startX, s.startY);
    ctx.lineTo(s.currX, s.currY);
    ctx.strokeStyle = "rgba(113, 211, 189, 0.75)";
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Başlangıç çemberi
    ctx.beginPath();
    ctx.arc(s.startX, s.startY, 12, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(113, 211, 189, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Çekilen nokta (parmak altı göstergesi)
    ctx.beginPath();
    ctx.arc(s.currX, s.currY, 8, 0, Math.PI * 2);
    ctx.fillStyle = s.power > 75 ? "#ff5a5a" : "#f4bd62";
    ctx.fill();

    // 2. Robot namlusundan hedefe doğru lazer izi (güce göre uzar)
    const muzzle = a.muzzle || { x: a.x, y: a.y - 10 };
    const laserLength = 40 + (s.power * 1.4);
    const targetX = muzzle.x + Math.cos(s.angle) * laserLength;
    const targetY = muzzle.y + Math.sin(s.angle) * laserLength;

    ctx.beginPath();
    ctx.moveTo(muzzle.x, muzzle.y);
    ctx.lineTo(targetX, targetY);
    ctx.strokeStyle = "rgba(244, 189, 98, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Lazer ucunda hedef noktası
    ctx.beginPath();
    ctx.arc(targetX, targetY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ff5a5a";
    ctx.fill();

    ctx.restore();
  }
}

// Global örnek
const MOBILE = new MobileControls();
if (typeof globalThis !== "undefined") {
  globalThis.MobileControls = MobileControls;
  globalThis.MOBILE = MOBILE;
}

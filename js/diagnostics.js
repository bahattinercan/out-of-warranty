/* Tanılama ve geri bildirim (F6) — sunucusuz kapalı test için.
 *
 * Kapalı testte oyuncudan "ekran görüntüsü + konsol" istemek işe yaramaz.
 * Bunun yerine çalışma zamanı kendi küçük raporunu toplar: sürüm, tarayıcı,
 * FPS, oyun durumu, çevrimiçi koltuğu, portal sağlayıcısı, depolama hatası ve
 * son yakalanan hatalar. Oyuncu tek düğmeyle panoya kopyalar.
 *
 * Tasarım sınırları:
 *   · Hiçbir veri AĞA GİTMEZ (gizlilik: sunucu yok, hesap yok).
 *   · Portal yokken/DOM'suz ortamda (Node testleri) sessizce çalışır.
 *   · Hata yakalama mevcut davranışı DEĞİŞTİRMEZ: hata yutulmaz, konsola da
 *     yazılmaya devam eder.
 */

const DIAG_VERSION = 1;
// Raporda tutulacak en fazla hata; eski kayıtlar düşer (bellek sınırı).
const DIAG_MAX_ERRORS = 20;
// FPS örnekleme penceresi (ms). Saniyelik kare sayısı bundan türetilir.
const DIAG_FPS_WINDOW_MS = 1000;

const DIAG = {
  installed: false,
  errors: [],
  fps: 0,
  frames: 0,
  windowStart: 0,
  game: null,
  bootAt: 0,
  _button: null,

  /* Kurulum: pencere hatalarını ve (varsa) `?rapor=1` istemini bağlar.
   * `game` verilirse rapor oyun durumunu da taşır. */
  install(opts) {
    if (this.installed) return false;
    const o = opts || {};
    this.installed = true;
    this.game = o.game || null;
    this.bootAt = Date.now();
    const win = typeof window !== "undefined" ? window : null;
    if (win && win.addEventListener) {
      win.addEventListener("error", (e) => {
        this.record("error", (e && e.message) || "unknown", {
          source: e && e.filename ? String(e.filename).split("/").pop() : "",
          line: e && e.lineno,
        });
      });
      win.addEventListener("unhandledrejection", (e) => {
        const r = e && e.reason;
        this.record("promise", r && r.message ? r.message : String(r));
      });
    }
    // Kapalı test bağlantısı: ?rapor=1 ile düğme her zaman görünür.
    if (typeof location !== "undefined" && /[?&]rapor=1/.test(String(location.search || ""))) {
      this.reveal();
    }
    return true;
  },

  /* Her karede çağrılır (oyun döngüsü). Yalnız sayar: ek maliyet ~0. */
  frame(nowMs) {
    const t = Number.isFinite(nowMs) ? nowMs : Date.now();
    if (!this.windowStart) { this.windowStart = t; this.frames = 0; return; }
    this.frames++;
    const dt = t - this.windowStart;
    if (dt >= DIAG_FPS_WINDOW_MS) {
      this.fps = Math.round((this.frames * 1000) / dt);
      this.frames = 0;
      this.windowStart = t;
    }
  },

  /* Önemli olay kaydı. Hata olmayan olaylar da rapora girer (depolama hatası,
   * çevrimiçi iptal nedeni) — "neden oldu" sorusunun cevabı burada durur. */
  record(kind, message, extra) {
    const entry = {
      at: Date.now(),
      kind: String(kind || "note"),
      message: String(message == null ? "" : message).slice(0, 400),
    };
    if (extra && typeof extra === "object") {
      entry.extra = {};
      for (const k of Object.keys(extra).slice(0, 6)) {
        const v = extra[k];
        if (v == null) continue;
        entry.extra[k] = String(v).slice(0, 120);
      }
    }
    this.errors.push(entry);
    while (this.errors.length > DIAG_MAX_ERRORS) this.errors.shift();
    // Konsol davranışı korunur: kayıt tutmak hatayı yutmaz.
    if (kind === "error" || kind === "promise") {
      if (typeof console !== "undefined" && console.warn) console.warn("[DIAG]", entry.message);
    }
    if (kind === "error" || kind === "promise") this.reveal();
    return entry;
  },

  // Rapor denetimini göster: hata olduysa kendiliğinden, ya da ?rapor=1 ile.
  // Kabuk (wrapper) gizlenir: `display:none` iken yerleşimde yer KAPLAMAZ, bu
  // yüzden hudTopInset ölçümü değişmez.
  reveal() {
    const wrap = this._findWrap();
    if (!wrap) return false;
    wrap.classList.remove("hidden");
    return true;
  },

  _findWrap() {
    if (this._button && this._button.classList) return this._button;
    if (typeof document === "undefined" || !document.getElementById) return null;
    this._button = document.getElementById("report-control") || null;
    return this._button;
  },

  // Raporun makine-okunur hâli (destek/telemetri yapıştırması için).
  snapshot() {
    const g = this.game;
    const s = {
      diag: DIAG_VERSION,
      version: typeof GAME_VERSION === "undefined" ? "?" : GAME_VERSION,
      channel: typeof GAME_CHANNEL === "undefined" ? "?" : GAME_CHANNEL,
      at: new Date().toISOString(),
      uptimeSec: Math.round((Date.now() - this.bootAt) / 1000),
      fps: this.fps,
      locale: typeof getLocale === "function" ? getLocale() : "",
      state: g && g.state ? g.state : "",
      mode: g && g.mode ? g.mode : "",
      players: g && g.players ? g.players.length : 0,
      turn: g && g.turnId != null ? g.turnId : null,
      online: g && g.online
        ? {
            role: g.online.role,
            seat: g.online.session ? g.online.session.mySeat : null,
            phase: g.online.session ? g.online.session.phase : "",
            seats: g.online.session && g.online.session.seats ? g.online.session.seats.length : 0,
          }
        : null,
      portal: typeof PORTAL === "undefined"
        ? null
        : { provider: PORTAL.providerName(), active: PORTAL.isActive(), environment: PORTAL.environment },
      storageOk: g ? g.storageOk !== false : null,
      profile: g && g.profile ? { scrap: g.profile.scrap, robots: (g.profile.robots ? Object.keys(g.profile.robots).length : 0) } : null,
      viewport: typeof window !== "undefined" && window.innerWidth
        ? { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 }
        : null,
      ua: typeof navigator !== "undefined" ? String(navigator.userAgent || "").slice(0, 200) : "",
      errors: this.errors.slice(-10),
    };
    return s;
  },

  /* Oyuncunun panoya kopyalayacağı metin. Satır başına bir alan: yapıştırınca
   * okunur kalır, JSON'daki tırnak/kaçış gürültüsü olmaz. */
  /* Oyuncunun panoya kopyalayacağı metin. Etiketler İNGİLİZCE/teknik: rapor
   * geliştiriciye gider, dile bağlı olmamalı (i18n bekçisi çevrilmemiş Türkçe
   * metni UI sayar; oyuncuya görünen metin değildir). */
  reportText() {
    const s = this.snapshot();
    const lines = [
      "# Garanti Disi (Out of Warranty) — error report",
      "version: " + s.version + " (" + s.channel + ")",
      "time: " + s.at + " · uptime: " + s.uptimeSec + "s",
      "state: " + (s.state || "-") + " · mode: " + (s.mode || "-") + " · turn: " + (s.turn == null ? "-" : s.turn),
      "fps: " + s.fps + " · players: " + s.players + " · locale: " + (s.locale || "-"),
    ];
    if (s.online) {
      lines.push("online: role=" + s.online.role + " seat=" + (s.online.seat == null ? "-" : s.online.seat) +
        " phase=" + (s.online.phase || "-") + " seats=" + s.online.seats);
    }
    if (s.portal) lines.push("portal: " + s.portal.provider + " active=" + s.portal.active + " env=" + (s.portal.environment || "-"));
    if (s.profile) lines.push("profile: scrap=" + s.profile.scrap + " robots=" + s.profile.robots + " storage=" + (s.storageOk ? "ok" : "unavailable"));
    if (s.viewport) lines.push("viewport: " + s.viewport.w + "x" + s.viewport.h + " dpr=" + s.viewport.dpr);
    if (s.ua) lines.push("userAgent: " + s.ua);
    if (s.errors.length) {
      lines.push("log:");
      for (const e of s.errors) {
        const ex = e.extra ? " " + Object.keys(e.extra).map((k) => k + "=" + e.extra[k]).join(" ") : "";
        lines.push("  " + new Date(e.at).toISOString().slice(11, 19) + " [" + e.kind + "] " + e.message + ex);
      }
    }
    return lines.join("\n");
  },

  /* Panoya kopyala (en iyi çaba): clipboard API yoksa gizli metin alanı +
   * execCommand yedeği. Dönüş: rapor kopyalandı mı? */
  copyReport() {
    const text = this.reportText();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* yedeğe düş */ }
    try {
      if (typeof document === "undefined" || !document.createElement) return false;
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand ? document.execCommand("copy") : false;
      document.body.removeChild(ta);
      return !!ok;
    } catch (e) { return false; }
  },
};

/* Portal köprüsü (F5) — CrazyGames / Poki SDK'sını oyundan SOYUTLAR.
 *
 * Neden ayrı katman: oyun `file://` üzerinden de çalışmalı ve portallar dışında
 * hiçbir SDK yüklenmemeli. Bu yüzden:
 *   · Sağlayıcı yalnız `?portal=crazygames|poki` (ya da portal sayfasının
 *     `window.__PORTAL_PROVIDER__` değişkeni) ile AÇIKÇA seçilir; `file://` ve
 *     normal http açılışında portal "none" kalır.
 *   · SDK betiği TEMBEL yüklenir (PeerJS ile aynı desen): internet yoksa/engelli
 *     ise oyun sessizce çevrimdışı davranır.
 *   · Her metot güvenli: portal yokken `{ ok:false }` döner, ASLA istisna atmaz.
 *     Oyun kodunda `if (PORTAL.isActive())` yeterli, try/catch gerekmez.
 *
 * SDK sözleşmeleri (docs.crazygames.com/sdk, developers.poki.com):
 *   CrazyGames v3 → CrazyGames.SDK.init(), .ad.requestAd("rewarded"|"midgame",
 *     {adStarted, adFinished, adError}), .game.gameplayStart/Stop(),
 *     .game.loadingStart/Stop(), .game.happytime(), .game.settings,
 *     .game.updateRoom/leftRoom/inviteLink/getInviteParam/addJoinRoomListener
 *   Poki          → PokiSDK.init(), gameLoadingFinished(), gameplayStart/Stop(),
 *     commercialBreak(), rewardedBreak()
 *
 * Ölçüm disiplini: portal olayları (loading/gameplay/happytime) SDK'ya AYNEN
 * iletilir; oyun kendi analitiğini tutmaz (panel verisi tek kaynak).
 */

const PORTAL_PROVIDER = { NONE: "none", CRAZYGAMES: "crazygames", POKI: "poki" };

// SDK kaynakları: yalnız ilgili sağlayıcı seçildiğinde yüklenir.
const PORTAL_SDK = {
  crazygames: { src: "https://sdk.crazygames.com/crazygames-sdk-v3.js", global: "CrazyGames" },
  poki: { src: "https://game-cdn.poki.com/scripts/v2/poki-sdk.js", global: "PokiSDK" },
};

// Midgame reklam aralığı: CrazyGames kuralı ~3 dakika (SDK ayrıca kendi tarafında
// adCooldown uygular; biz yine de istemekten kaçınırız — boş istek kotayı yer).
const PORTAL_MIDGAME_COOLDOWN_MS = 180000;
// SDK yükleme zaman aşımı: portal açılmazsa oyun beklemede KALMAZ.
const PORTAL_SDK_TIMEOUT_MS = 12000;

class Portal {
  constructor(opts) {
    const o = opts || {};
    this.provider = PORTAL_PROVIDER.NONE;
    this.active = false;          // SDK hazır ve kullanılabilir
    this.adsEnabled = false;      // reklam isteği kabul edilir mi (Basic Launch/kids modu hariç)
    this.environment = null;      // CrazyGames: "local" | "crazygames" | "disabled"
    this.settings = { muteAudio: false, disableChat: false };
    this.lastError = null;
    this.initPromise = null;
    this._adBusy = false;
    this._lastMidgameAt = -Infinity;
    // Test enjeksiyonu: belge/pencere/saat/komut satırı dışarıdan verilebilir.
    this.doc = o.document || (typeof document !== "undefined" ? document : null);
    this.win = o.window || (typeof window !== "undefined" ? window : null);
    this.now = o.now || (() => Date.now());
    this.search = o.search != null ? o.search
      : (this.win && this.win.location ? String(this.win.location.search || "") : "");
    this._settingsHandlers = [];
    this._joinHandlers = [];
    this.calls = [];              // SDK'ya giden çağrıların izi (test/teşhis)
  }

  // ── Sağlayıcı seçimi ────────────────────────────────────────────────────

  /* Sağlayıcı SIRASI: `?portal=` → portal sayfasının global değişkeni →
   * sayfada hazır SDK globali. Hiçbiri yoksa oyun normal (file://) çalışır. */
  detectProvider() {
    const m = /[?&]portal=([\w-]+)/i.exec(this.search || "");
    if (m) {
      const v = m[1].toLowerCase();
      if (v === "crazygames" || v === "cg") return PORTAL_PROVIDER.CRAZYGAMES;
      if (v === "poki") return PORTAL_PROVIDER.POKI;
      if (v === "off" || v === "none") return PORTAL_PROVIDER.NONE;
    }
    const declared = this.win && this.win.__PORTAL_PROVIDER__;
    if (declared === "crazygames" || declared === "poki") return declared;
    if (this.win && this.win.CrazyGames && this.win.CrazyGames.SDK) return PORTAL_PROVIDER.CRAZYGAMES;
    if (this.win && this.win.PokiSDK && this.win.PokiSDK.init) return PORTAL_PROVIDER.POKI;
    return PORTAL_PROVIDER.NONE;
  }

  // ── Kurulum ─────────────────────────────────────────────────────────────

  /* SDK'yı yükler ve başlatır. Tek kez çalışır (memoized); başarısızlıkta
   * oyun çevrimdışı davranır. Dönen söz: { ok, provider, reason? }. */
  init(opts) {
    if (this.initPromise) return this.initPromise;
    this.provider = this.detectProvider();
    this.lastError = null;
    if (this.provider === PORTAL_PROVIDER.NONE) {
      this.initPromise = Promise.resolve({ ok: false, provider: PORTAL_PROVIDER.NONE, reason: "NO_PROVIDER" });
      return this.initPromise;
    }
    this.initPromise = this._bootstrap().catch((e) => {
      this.lastError = String(e && e.message ? e.message : e);
      this.active = false;
      this.adsEnabled = false;
      return { ok: false, provider: this.provider, reason: "SDK_INIT" };
    });
    return this.initPromise;
  }

  async _bootstrap() {
    const conf = PORTAL_SDK[this.provider];
    if (!conf) return { ok: false, provider: this.provider, reason: "NO_SDK" };
    const loaded = await this._ensureSdk(conf);
    if (!loaded) {
      this.lastError = "SDK_LOAD";
      return { ok: false, provider: this.provider, reason: "SDK_LOAD" };
    }
    if (this.provider === PORTAL_PROVIDER.CRAZYGAMES) return this._initCrazyGames();
    return this._initPoki();
  }

  // SDK betiğini tembel yükler (globalsiz ortamda sessizce başarısız olur).
  _ensureSdk(conf) {
    const w = this.win;
    if (!w) return Promise.resolve(false);
    if (w[conf.global]) return Promise.resolve(true);
    const d = this.doc;
    if (!d || !d.createElement || !d.head) return Promise.resolve(false);
    return new Promise((resolve) => {
      let settled = false;
      const done = (ok) => { if (settled) return; settled = true; resolve(ok); };
      const s = d.createElement("script");
      s.src = conf.src;
      s.async = true;
      s.onload = () => done(!!w[conf.global]);
      s.onerror = () => done(false);
      d.head.appendChild(s);
      // Zaman aşımı: betik ne yüklenir ne hata verirse oyun kilitlenmesin.
      if (typeof setTimeout === "function") {
        setTimeout(() => done(!!w[conf.global]), PORTAL_SDK_TIMEOUT_MS);
      }
    });
  }

  async _initCrazyGames() {
    const sdk = this.win.CrazyGames.SDK;
    this._record("crazygames.init");
    await sdk.init();
    this.environment = sdk.environment || "unknown";
    // "disabled": reklamlar bu oturumda kapalı (Basic Launch, kids modu, çevrimdışı).
    this.adsEnabled = this.environment !== "disabled";
    this._readCrazySettings(sdk);
    if (sdk.game && sdk.game.addSettingsChangeListener) {
      try {
        sdk.game.addSettingsChangeListener((next) => this._readCrazySettings(sdk, next));
      } catch (e) { /* yoksay */ }
    }
    if (sdk.game && sdk.game.addJoinRoomListener) {
      try {
        sdk.game.addJoinRoomListener((params) => this._emitJoin(params));
      } catch (e) { /* yoksay */ }
    }
    this.active = true;
    return { ok: true, provider: this.provider, environment: this.environment };
  }

  _readCrazySettings(sdk, next) {
    const src = next || (sdk && sdk.game ? sdk.game.settings : null) || {};
    this.settings = {
      muteAudio: !!src.muteAudio,
      disableChat: !!src.disableChat,
    };
    for (const fn of this._settingsHandlers) {
      try { fn(this.settings); } catch (e) { /* yoksay */ }
    }
  }

  async _initPoki() {
    this._record("poki.init");
    await this.win.PokiSDK.init();
    // Poki SDK v2 mute veya ayar değişikliği sunmaz; ses durumu varsaymayız.
    // Poki'de reklam kararı SDK'ya aittir; istek her zaman yapılabilir.
    this.adsEnabled = true;
    this.active = true;
    return { ok: true, provider: this.provider };
  }

  _record(name, detail) {
    this.calls.push({ name, detail: detail === undefined ? null : detail, at: this.now() });
    return name;
  }

  // ── Durum sorguları ─────────────────────────────────────────────────────

  isActive() { return !!this.active; }
  providerName() { return this.provider; }
  adsAvailable() { return !!(this.active && this.adsEnabled && !this._adBusy); }
  canReward() { return this.adsAvailable(); }
  /* Portal içinde tarayıcı tam ekranı istenmez (portal kendi tam ekranını
   * yönetir; ayrıca iframe'de tam ekran izni verilmeyebilir). */
  hideFullscreen() { return this.active || this.provider !== PORTAL_PROVIDER.NONE || this.inIframe(); }
  inIframe() {
    try { return !!(this.win && this.win.self && this.win.top && this.win.self !== this.win.top); }
    catch (e) { return true; }   // çapraz köken: iframe olduğu kesin
  }
  muted() { return !!this.settings.muteAudio; }

  onSettingsChange(fn) { if (typeof fn === "function") this._settingsHandlers.push(fn); return this; }
  onJoinRoom(fn) { if (typeof fn === "function") this._joinHandlers.push(fn); return this; }
  _emitJoin(params) {
    for (const fn of this._joinHandlers) {
      try { fn(params || {}); } catch (e) { /* yoksay */ }
    }
  }

  // ── Ölçüm olayları ──────────────────────────────────────────────────────

  loadingStart() {
    if (!this.active) return { ok: false, reason: "NO_PORTAL" };
    this._record("loadingStart");
    try {
      const g = this.win.CrazyGames.SDK.game;
      if (this.provider === PORTAL_PROVIDER.CRAZYGAMES && g && g.loadingStart) g.loadingStart();
    } catch (e) { return { ok: false, reason: "SDK_ERROR" }; }
    return { ok: true };
  }

  /* İlk oynanabilir kare: CrazyGames `loadingStop`, Poki `gameLoadingFinished`.
   * İkisi de yalnız bir kez anlamlı; oyun yineleme yapsa da SDK idempotenttir. */
  loadingStop() {
    if (!this.active) return { ok: false, reason: "NO_PORTAL" };
    this._record("loadingStop");
    try {
      if (this.provider === PORTAL_PROVIDER.CRAZYGAMES) {
        const g = this.win.CrazyGames.SDK.game;
        if (g && g.loadingStop) g.loadingStop();
      } else if (this.provider === PORTAL_PROVIDER.POKI) {
        this.win.PokiSDK.gameLoadingFinished();
      }
    } catch (e) { return { ok: false, reason: "SDK_ERROR" }; }
    return { ok: true };
  }

  gameplayStart() {
    if (!this.active) return { ok: false, reason: "NO_PORTAL" };
    this._record("gameplayStart");
    try {
      if (this.provider === PORTAL_PROVIDER.CRAZYGAMES) this.win.CrazyGames.SDK.game.gameplayStart();
      else this.win.PokiSDK.gameplayStart();
    } catch (e) { return { ok: false, reason: "SDK_ERROR" }; }
    return { ok: true };
  }

  gameplayStop() {
    if (!this.active) return { ok: false, reason: "NO_PORTAL" };
    this._record("gameplayStop");
    try {
      if (this.provider === PORTAL_PROVIDER.CRAZYGAMES) this.win.CrazyGames.SDK.game.gameplayStop();
      else this.win.PokiSDK.gameplayStop();
    } catch (e) { return { ok: false, reason: "SDK_ERROR" }; }
    return { ok: true };
  }

  // Kutlama (yalnız CrazyGames). Seyrek kullanılmalı: maç kazanımı.
  happytime() {
    if (!this.active || this.provider !== PORTAL_PROVIDER.CRAZYGAMES) return { ok: false, reason: "NO_PORTAL" };
    this._record("happytime");
    try {
      const g = this.win.CrazyGames.SDK.game;
      if (g && g.happytime) g.happytime();
    } catch (e) { return { ok: false, reason: "SDK_ERROR" }; }
    return { ok: true };
  }

  // ── Reklamlar ───────────────────────────────────────────────────────────

  /* Ödüllü reklam: oyuncunun AÇIK isteğiyle çağrılır (2× Hurda gibi). `cb`
   * tek kez ve { ok, reason? } ile çağrılır; `ok:true` yalnız reklam TAM
   * izlendiğinde gelir (ödül kararını çağıran taraf verir). */
  requestRewarded(cb) {
    const done = typeof cb === "function" ? cb : () => {};
    if (!this.isActive()) { done({ ok: false, reason: "NO_PORTAL" }); return { ok: false, reason: "NO_PORTAL" }; }
    if (!this.adsEnabled) { done({ ok: false, reason: "ADS_DISABLED" }); return { ok: false, reason: "ADS_DISABLED" }; }
    if (this._adBusy) { done({ ok: false, reason: "BUSY" }); return { ok: false, reason: "BUSY" }; }
    this._adBusy = true;
    this._record("rewarded.start");
    let settled = false;
    const settle = (res) => {
      if (settled) return;
      settled = true;
      this._adBusy = false;
      this._record("rewarded.end", res.ok ? "ok" : res.reason);
      done(res);
    };
    try {
      if (this.provider === PORTAL_PROVIDER.CRAZYGAMES) {
        this.win.CrazyGames.SDK.ad.requestAd("rewarded", {
          adStarted: () => this._record("rewarded.playing"),
          adFinished: () => settle({ ok: true }),
          adError: (err) => settle({ ok: false, reason: (err && err.code) || "AD_ERROR" }),
        });
      } else {
        this.win.PokiSDK.rewardedBreak().then(
          (rewarded) => settle(rewarded === false ? { ok: false, reason: "NOT_REWARDED" } : { ok: true }),
          (err) => settle({ ok: false, reason: "AD_ERROR", error: String(err) })
        );
      }
    } catch (e) {
      settle({ ok: false, reason: "SDK_ERROR" });
    }
    return { ok: true, pending: true };
  }

  /* Maç arası reklam: yalnız doğal molalarda (maç sonu → menü/tekrar). Son
   * istekten 3 dakika geçmediyse hiç istenmez. Poki'de kararı SDK verir. */
  requestMidgame(cb) {
    const done = typeof cb === "function" ? cb : () => {};
    if (!this.isActive()) return { ok: false, reason: "NO_PORTAL" };
    const wait = this.now() - this._lastMidgameAt;
    if (wait < PORTAL_MIDGAME_COOLDOWN_MS) {
      done({ ok: false, reason: "COOLDOWN", waitMs: PORTAL_MIDGAME_COOLDOWN_MS - wait });
      return { ok: false, reason: "COOLDOWN" };
    }
    this._lastMidgameAt = this.now();
    this._record("midgame.start");
    try {
      if (this.provider === PORTAL_PROVIDER.CRAZYGAMES) {
        this.win.CrazyGames.SDK.ad.requestAd("midgame", {
          adFinished: () => { this._record("midgame.end"); done({ ok: true }); },
          adError: (err) => done({ ok: false, reason: (err && err.code) || "AD_ERROR" }),
        });
      } else {
        this.win.PokiSDK.commercialBreak().then(
          () => { this._record("midgame.end"); done({ ok: true }); },
          () => done({ ok: false, reason: "AD_ERROR" })
        );
      }
    } catch (e) {
      return { ok: false, reason: "SDK_ERROR" };
    }
    return { ok: true, pending: true };
  }

  // ── Çok oyunculu (CrazyGames gereksinimi) ───────────────────────────────

  /* Oda bilgisini platforma bildirir: davet düğmesi/katılma akışı buna dayanır.
   * `inviteParams` katılan oyuncuya iletilir (bizde: oda kodu). */
  updateRoom(opts) {
    if (!this.active || this.provider !== PORTAL_PROVIDER.CRAZYGAMES) return { ok: false, reason: "NO_PORTAL" };
    const o = opts || {};
    const payload = {};
    if (o.roomId != null) payload.roomId = String(o.roomId);
    if (o.isJoinable != null) payload.isJoinable = !!o.isJoinable;
    if (o.inviteParams) payload.inviteParams = o.inviteParams;
    this._record("updateRoom", payload);
    try { this.win.CrazyGames.SDK.game.updateRoom(payload); }
    catch (e) { return { ok: false, reason: "SDK_ERROR" }; }
    return { ok: true, room: payload };
  }

  leftRoom() {
    if (!this.active || this.provider !== PORTAL_PROVIDER.CRAZYGAMES) return { ok: false, reason: "NO_PORTAL" };
    this._record("leftRoom");
    try {
      const g = this.win.CrazyGames.SDK.game;
      if (g && g.leftRoom) g.leftRoom();
    } catch (e) { return { ok: false, reason: "SDK_ERROR" }; }
    return { ok: true };
  }

  inviteLink(params) {
    if (!this.active || this.provider !== PORTAL_PROVIDER.CRAZYGAMES) return null;
    try {
      const link = this.win.CrazyGames.SDK.game.inviteLink(params || {});
      return typeof link === "string" && link ? link : null;
    } catch (e) { return null; }
  }

  // Oyuncu davet bağlantısıyla açtıysa parametreler buradadır (yoksa null).
  inviteParams() {
    if (!this.active || this.provider !== PORTAL_PROVIDER.CRAZYGAMES) return null;
    try { return this.win.CrazyGames.SDK.game.inviteParams || null; }
    catch (e) { return null; }
  }

  inviteParam(name) {
    if (!this.active || this.provider !== PORTAL_PROVIDER.CRAZYGAMES) return null;
    try {
      const v = this.win.CrazyGames.SDK.game.getInviteParam(name);
      return typeof v === "string" && v ? v : null;
    } catch (e) { return null; }
  }
}

// Oyun genelinde TEK örnek (klasik script: global).
const PORTAL = new Portal();

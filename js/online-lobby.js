/* Çevrimiçi lobi ekranı (F3c-2) — oda kodu, davet bağlantısı, hazır akışı.
 *
 * Sorumluluk: ağ kurulumunun KULLANICIYA bakan yüzü. Taşıma (PeerJS/WebRTC) ve
 * oturum çekirdeği ayrı dosyalarda (js/net/transport.js, js/net/session.js);
 * bu ekran yalnız onları sürer ve maç başlayınca `Game.beginOnlineMatch`'e
 * devreder. Böylece ağ mantığı çizim kodundan bağımsız kalır.
 *
 * Akış:
 *   rol seç (Oda Kur / Koda Katıl) → bağlan → oda (koltuklar + hazır) → maç
 *   · Oda sahibi: kod üretir, davet bağlantısını kopyalar; karşı taraf hazır
 *     olunca "MAÇI BAŞLAT" açılır.
 *   · Misafir: kodu yazar (ya da davet bağlantısını açar: ?oda=KOD), HELLO
 *     gönderir, WELCOME ile koltuğuna oturur, "HAZIRIM" der.
 *
 * Neden tuval (DOM değil): oyunun tüm ekranları tuvalde çizilir ve klavye
 * girdisi tek yerden (Game.bindInput) yönetilir; ayrı bir DOM formu hem iki
 * girdi kaynağı yaratır hem de tam ekranda ölçeklenmez.
 */

// PeerJS CDN'i TEMBEL yüklenir: çevrimdışı ya da file:// açılışında oyun
// etkilenmez, yalnız çevrimiçi ekrana ilk girişte indirilir. Yüklenemezse
// taşıma "unavailable" olur ve ekran anlaşılır hata gösterir.
const ONLINE_PEERJS_URL = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";

/* STUN sunucuları: NAT arkasındaki iki tarayıcının ortak adresini bulması için
 * (PeerJS bulut sunucusu yalnız SİNYALLEŞME yapar, oyun trafiği P2P akar). */
const ONLINE_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/* Ücretsiz TURN yedeği (Metered Open Relay): simetrik NAT ya da kurumsal
 * güvenlik duvarı arkasında doğrudan bağlantı kurulamazsa trafiği aktarır.
 * Anahtar gerektirdiği için kod yayına hazır ama boş bırakıldı; doldurulduğunda
 * yalnız bu satır değişir (docs/web-lansman-plani.md §4). Boşken yalnız STUN
 * denenir — bağlanamayan oyuncuya "oda bulunamadı" değil zaman aşımı denir. */
const ONLINE_TURN_SERVERS = [];   // ör. { urls: "turn:relay.metered.ca:80", username: "...", credential: "..." }

// Bağlanma zaman aşımı: bu süre içinde OPEN olmazsa anlaşılır hata gösterilir.
const ONLINE_CONNECT_TIMEOUT_MS = 20000;
// Oda kodu uzunluğu (PeerJS peer kimliği olarak kullanılır).
const ONLINE_CODE_LENGTH = 5;

class OnlineLobby {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.role = null;          // "host" | "guest"
    this.step = "role";        // role | code | room
    this.transport = null;
    this.session = null;
    this.peerSeats = new Map();   // bağlantı kimliği → koltuk (host)
    this.code = "";               // oda kodu (host: üretilen, misafir: yazılan)
    this.typed = "";              // misafirin yazdığı kod
    this.robotId = null;          // bu oyuncunun robotu
    this.robotIndex = 0;
    this.ready = false;
    this.error = null;            // { key, vars } — çevrilmiş metin çizimde
    this.notice = null;           // { key, vars, age }
    this.statusText = null;       // taşıma durumundan türetilen anahtar
    this.elapsedMs = 0;
    this.connectStartedAt = 0;
    this._rects = [];             // tıklama alanları (çizim sırasında dolar)
    this._peerJsLoading = false;
    this._peerJsQueue = [];
    this._boundPaste = null;
    const p = this.game.profile;
    // Varsayılan robot: profilde ilerlemesi en yüksek robot (yoksa ilk karakter).
    let best = null;
    for (let i = 0; i < CHARACTERS.length; i++) {
      const ch = CHARACTERS[i];
      const xp = p && p.robots && p.robots[ch.id] ? p.robots[ch.id].xp || 0 : 0;
      if (!best || xp > best.xp) best = { id: ch.id, xp, i };
    }
    this.robotIndex = best ? best.i : 0;
    this.robotId = best ? best.id : (CHARACTERS[0] && CHARACTERS[0].id) || null;
  }

  get robot() { return CHARACTERS[this.robotIndex] || CHARACTERS[0] || null; }

  // ── Aç / kapat ───────────────────────────────────────────────────────────

  open() {
    this.active = true;
    this.role = null;
    this.step = "role";
    this.error = null;
    this.notice = null;
    this.typed = "";
    this.ready = false;
    this.elapsedMs = 0;
    this.peerSeats.clear();
    // Davet bağlantısı: ?oda=KOD ile açıldıysa kodu hazır getir ve katılma
    // ekranına geç (arkadaş tek tıkla katılır).
    const inv = this._codeFromUrl();
    if (inv) { this.typed = inv; this.step = "code"; }
    this._bindPaste();
    return true;
  }

  close() {
    this.active = false;
    this._unbindPaste();
    if (this.transport) { try { this.transport.close(); } catch (e) { /* yoksay */ } }
    this.transport = null;
    this.session = null;
    this.peerSeats.clear();
    return true;
  }

  // URL'den oda kodu (?oda=ABC-DE ya da #oda=ABCDE).
  _codeFromUrl() {
    try {
      if (typeof location === "undefined" || !location) return null;
      const q = String(location.search || "").replace(/^\?/, "");
      const h = String(location.hash || "").replace(/^#/, "");
      const pick = (s) => {
        const m = /(?:^|&)oda=([A-Za-z0-9-]+)/.exec(s);
        return m ? netFormatRoomCode(m[1]).replace(/-/g, "").slice(0, ONLINE_CODE_LENGTH) : null;
      };
      return pick(q) || pick(h);
    } catch (e) { return null; }
  }

  _inviteUrl() {
    try {
      if (typeof location === "undefined" || !location) return null;
      const base = String(location.href || "").split("?")[0].split("#")[0];
      return base + "?oda=" + this.code;
    } catch (e) { return null; }
  }

  /* Panodan yapıştırma: davet bağlantısının tamamı ya da kodu yapıştırılabilir.
   * Klavye olayı yerine paste olayı dinlenir (Ctrl+V tuvalde görünmez). */
  _bindPaste() {
    if (this._boundPaste || typeof window === "undefined" || !window.addEventListener) return;
    this._boundPaste = (e) => {
      if (!this.active) return;
      const text = (e.clipboardData && e.clipboardData.getData("text")) || "";
      const m = /([A-Za-z0-9]{5})/.exec(String(text).replace(/[^A-Za-z0-9]/g, " ").replace(/\s+/g, " ")) ||
        /oda=([A-Za-z0-9-]+)/.exec(String(text));
      if (!m) return;
      const code = netFormatRoomCode(m[1]).replace(/-/g, "").slice(0, ONLINE_CODE_LENGTH);
      if (code.length < ONLINE_CODE_LENGTH) return;
      if (this.step === "code" || this.step === "role") {
        e.preventDefault?.();
        this.typed = code;
        this._joinRoom();
      }
    };
    window.addEventListener("paste", this._boundPaste);
  }

  _unbindPaste() {
    if (!this._boundPaste || typeof window === "undefined" || !window.removeEventListener) return;
    window.removeEventListener("paste", this._boundPaste);
    this._boundPaste = null;
  }

  // ── PeerJS tembel yükleme ────────────────────────────────────────────────

  _ensurePeerJs(cb) {
    if (typeof Peer !== "undefined") { cb(true); return; }
    this._peerJsQueue.push(cb);
    if (this._peerJsLoading) return;
    this._peerJsLoading = true;
    if (typeof document === "undefined" || !document.createElement) {
      this._peerJsLoading = false;
      const q = this._peerJsQueue; this._peerJsQueue = [];
      for (const fn of q) fn(false);
      return;
    }
    const s = document.createElement("script");
    s.src = ONLINE_PEERJS_URL;
    s.async = true;
    const done = (ok) => {
      this._peerJsLoading = false;
      const q = this._peerJsQueue; this._peerJsQueue = [];
      for (const fn of q) fn(ok && typeof Peer !== "undefined");
    };
    s.onload = () => done(true);
    s.onerror = () => done(false);
    document.head.appendChild(s);
  }

  // ── Oda kurma / katılma ─────────────────────────────────────────────────

  hostRoom() {
    this.role = "host";
    this.code = netRoomCode();
    this.error = null;
    this.step = "room";
    this._openTransport({ role: "host", roomCode: this.code });
  }

  joinRoom() {
    const code = this.typed.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (code.length < ONLINE_CODE_LENGTH) {
      this._fail("BAD_CODE");
      return;
    }
    this.role = "guest";
    this.code = code;
    this.error = null;
    this.step = "room";
    this._openTransport({ role: "guest", hostId: code });
  }

  _openTransport(opts) {
    this.connectStartedAt = this.elapsedMs;
    this._ensurePeerJs((ok) => {
      if (!this.active || this.role !== opts.role) return;
      if (!ok) { this._fail("NO_PEERJS"); return; }
      const ice = ONLINE_ICE_SERVERS.concat(ONLINE_TURN_SERVERS);
      this.transport = new PeerJsTransport({
        role: opts.role, roomCode: opts.roomCode, hostId: opts.hostId,
        iceServers: ice,
        onLog: () => {},
      });
      this.transport.onStatus((status, detail) => this._onStatus(status, detail));
      this.transport.onMessage((from, msg) => this._onMessage(from, msg));
      const res = this.transport.open();
      if (!res.ok) this._fail(res.reason);
      else this._openSession();
    });
  }

  /* Test/prova kancası: hazır bir taşımayı (ör. döngü taşıması) odaya bağlar.
   * PeerJS/CDN yüklemeden ağ akışını sınamak için vardır; oyun akışı değişmez
   * (aynı durum/hata/mesaj yolları kullanılır). */
  adoptTransport(transport, opts) {
    const o = opts || {};
    this.role = o.role === "guest" ? "guest" : "host";
    this.code = o.code || this.code || netRoomCode();
    this.step = "room";
    this.error = null;
    this.ready = false;
    this.elapsedMs = 0;
    this.connectStartedAt = 0;
    this.transport = transport;
    transport.onStatus((status, detail) => this._onStatus(status, detail));
    transport.onMessage((from, msg) => this._onMessage(from, msg));
    this.statusText = transport.status;
    this._openSession();
    // Döngü taşıması zaten AÇIK başlar: OPEN olayı gelmeyeceği için el sıkışma
    // burada başlatılır (gerçek taşımada _onStatus("open") yapar).
    if (this.role === "guest") this._sendHello();
    else if (this.session) this.session.broadcastLobby();
    return true;
  }

  _openSession() {
    const now = () => Date.now();
    if (this.role === "host") {
      this.session = new NetSession({ role: "host", transport: this.transport, rules: {}, now });
      const map = this._mapFor(this.robotId);
      this.session.openLobby([{ playerIdx: 0, robotId: this.robotId }, { playerIdx: 1 }], {
        matchId: this.code,
        authoritySessionId: "auth-" + this.code,
        mapId: map ? map.id : null,
        roster: [this.robotId, null],
      });
    } else {
      this.session = new NetSession({ role: "guest", transport: this.transport, rules: {}, now });
    }
  }

  // Karakterin kendi haritası (harita seçimindeki "kendi haritası" mantığı).
  _mapFor(robotId) {
    return MAPS.find((m) => m.forChar === robotId) || MAPS[0] || null;
  }

  // Misafir bağlantı açılınca odaya katılır.
  _sendHello() {
    if (!this.session || this.role !== "guest") return;
    const token = this._storedSeatToken();
    this.session.sendHello({ robotId: this.robotId, seatToken: token });
  }

  _storedSeatToken() {
    // Yeniden bağlanma: aynı oda koduna ait koltuk kimliği oturumluk saklanır
    // (sayfa yenilenirse host aynı koltuğa oturtur). Kalıcı değil: sekme
    // kapanınca temizlenir.
    try {
      if (typeof sessionStorage === "undefined" || !sessionStorage) return null;
      return sessionStorage.getItem("nwo_seat_" + this.code) || null;
    } catch (e) { return null; }
  }

  _storeSeatToken(token) {
    try {
      if (typeof sessionStorage === "undefined" || !sessionStorage || !token) return;
      sessionStorage.setItem("nwo_seat_" + this.code, token);
    } catch (e) { /* yoksay */ }
  }

  _onStatus(status, detail) {
    this.statusText = status;
    if (status === NET_TRANSPORT_STATUS.OPEN) {
      if (this.role === "guest") this._sendHello();
      else this.session?.broadcastLobby();
    }
    if (status === NET_TRANSPORT_STATUS.UNAVAILABLE) this._fail("NO_PEERJS");
    if (status === NET_TRANSPORT_STATUS.ERROR) {
      const reason = (detail && detail.reason) || "CONNECT";
      this._fail(this._errorKeyFor(reason));
    }
    if (status === NET_TRANSPORT_STATUS.CLOSED && this.step === "room") this._fail("CLOSED");
  }

  // Taşıma hata kodları → kullanıcıya gösterilecek anahtar.
  _errorKeyFor(reason) {
    const r = String(reason || "");
    if (r.indexOf("peer-unavailable") >= 0) return "ROOM_NOT_FOUND";
    if (r.indexOf("browser-incompatible") >= 0) return "BROWSER";
    if (r.indexOf("network") >= 0 || r.indexOf("socket") >= 0) return "NETWORK";
    if (r.indexOf("PEER_CLOSED") >= 0) return "CLOSED";
    return "CONNECT";
  }

  /* Hata metni. Anahtarlar burada AÇIK yazılır: hem çeviri kaynağı tek yerde
   * görünür hem de i18n kapsam testi anahtarları kodda bulur (haritadan üretilen
   * anahtarı test göremez). */
  _errorText(code) {
    if (code === "online.err.NO_PEERJS" || code === "NO_PEERJS") return t("online.err.NO_PEERJS", "Çevrimiçi kitaplığı yüklenemedi (internet gerekir)");
    if (code === "online.err.PROTOCOL_MISMATCH" || code === "PROTOCOL_MISMATCH") return t("online.err.PROTOCOL_MISMATCH", "Sürüm uyuşmuyor — iki taraf da güncel sürümü açmalı");
    if (code === "online.err.ROOM_FULL" || code === "ROOM_FULL") return t("online.err.ROOM_FULL", "Oda dolu");
    if (code === "online.err.ROOM_NOT_FOUND" || code === "ROOM_NOT_FOUND") return t("online.err.ROOM_NOT_FOUND", "Oda bulunamadı — kodu kontrol et");
    if (code === "online.err.BAD_CODE" || code === "BAD_CODE") return t("online.err.BAD_CODE", "Kod 5 karakter olmalı");
    if (code === "online.err.TIMEOUT" || code === "TIMEOUT") return t("online.err.TIMEOUT", "Bağlantı zaman aşımına uğradı");
    if (code === "online.err.CLOSED" || code === "CLOSED") return t("online.err.CLOSED", "Karşı taraf ayrıldı");
    if (code === "online.err.NETWORK" || code === "NETWORK") return t("online.err.NETWORK", "Ağ hatası — bağlantını kontrol et");
    if (code === "online.err.BROWSER" || code === "BROWSER") return t("online.err.BROWSER", "Bu tarayıcı WebRTC desteklemiyor");
    if (code === "online.err.PEER_INIT" || code === "PEER_INIT") return t("online.err.PEER_INIT", "Bağlantı başlatılamadı");
    if (code === "online.err.NOT_HOST" || code === "NOT_HOST") return t("online.err.NOT_HOST", "Bu oda burada kurulu değil");
    if (code === "online.err.NOT_GUEST" || code === "NOT_GUEST") return t("online.err.NOT_GUEST", "Bu taraf o mesajı gönderemez");
    if (code === "online.err.WRONG_PHASE" || code === "WRONG_PHASE") return t("online.err.WRONG_PHASE", "Maç doğru aşamada değil");
    if (code === "online.err.NO_MATCH_ID" || code === "NO_MATCH_ID") return t("online.err.NO_MATCH_ID", "Oda kimliği eksik");
    return t("online.err.CONNECT", "Bağlanılamadı — tekrar dene");
  }

  // Bildirim metni (anahtarlar açık yazılır; bkz. _errorText).
  _noticeText(key) {
    if (key === "online.invite.copied") return t("online.invite.copied", "Bağlantı kopyalandı");
    if (key === "online.invite.failed") return t("online.invite.failed", "Kopyalanamadı — kodu elle paylaş");
    if (key === "online.notice.joined") return t("online.notice.joined", "Rakip odaya katıldı");
    return "";
  }

  // Taşıma durumu metni.
  _statusText() {
    if (this.statusText === "connecting") return t("online.status.connecting", "Bağlanıyor…");
    if (this.statusText === "open") return t("online.status.open", "Bağlantı kuruldu");
    if (this.statusText === "closed") return t("online.status.closed", "Bağlantı kapandı");
    if (this.statusText === "idle") return t("online.status.idle", "Hazır");
    return "";
  }

  _onMessage(from, msg) {
    if (!this.session) return;
    if (this.role === "host") {
      const known = this.peerSeats.has(from) ? this.peerSeats.get(from) : null;
      const res = this.session.handleHostMessage(known, msg);
      if (msg && msg.t === NET_MSG.HELLO && res && res.ok) {
        this.peerSeats.set(from, res.seat);
        this._notice("online.notice.joined");
      }
      if (res && res.ok === false && res.reason) this._noteReason(res.reason);
      return;
    }
    const res = this.session.handleGuestMessage(msg);
    if (res && res.ok === false && res.reason) this._noteReason(res.reason);
    if (msg && msg.t === NET_MSG.WELCOME && this.session.mySeat != null) {
      this._storeSeatToken(msg.seatToken);
    }
    // Maç başladı: lobi görevi bitti, oyun devralır.
    if (msg && msg.t === NET_MSG.START) {
      this.game.beginOnlineMatch({ role: "guest", session: this.session, transport: this.transport, lobby: this });
    }
  }

  _noteReason(reason) {
    if (reason === "PROTOCOL_MISMATCH") this._fail("PROTOCOL_MISMATCH");
    else if (reason === "ROOM_FULL") this._fail("ROOM_FULL");
  }

  // `code`: _errorText'in çözdüğü hata kodu (ör. "TIMEOUT", "online.err.BAD_CODE").
  _fail(code, vars) {
    this.error = { code, text: this._errorText(code), vars };
    this.step = this.step === "role" ? "role" : "room";
  }

  _notice(key, vars) {
    this.notice = { key, vars, text: this._noticeText(key), age: 0 };
  }

  // Oda sahibi maçı başlatır (karşı taraf hazır olduğunda).
  startMatch() {
    if (!this.session || this.role !== "host" || !this.session.canStart()) return false;
    const guestSeat = this.session.seats.filter((s) => s.playerIdx !== 0)[0];
    const guestRobot = guestSeat && guestSeat.robotId ? guestSeat.robotId : (CHARACTERS[1] && CHARACTERS[1].id);
    const roster = [this.robotId, guestRobot];
    const map = this._mapFor(this.robotId);
    const res = this.session.startMatch(this.code, "auth-" + this.code, {
      turnId: 1, mapId: map ? map.id : null, roster,
    });
    if (!res.ok) { this._fail(res.reason); return false; }
    this.game.beginOnlineMatch({ role: "host", session: this.session, transport: this.transport, lobby: this });
    return true;
  }

  // Misafir hazır durumunu bildirir.
  toggleReady() {
    if (!this.session || this.role !== "guest") return false;
    this.ready = !this.ready;
    this.session.sendReady(this.ready);
    return true;
  }

  // Davet bağlantısını panoya kopyala (en iyi çaba; file:// kısıtında uyarı).
  copyInvite() {
    const url = this._inviteUrl();
    if (!url) { this._notice("online.invite.failed"); return false; }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url);
        this._notice("online.invite.copied");
        return true;
      }
    } catch (e) { /* yoksay */ }
    this._notice("online.invite.failed");
    return false;
  }

  // ── Girdi ───────────────────────────────────────────────────────────────

  // Klavye: Game.bindInput buraya devreder. true → olay tüketildi.
  handleKey(e) {
    if (!this.active) return false;
    if (e.key === "Escape") {
      if (this.step === "room") { this.close(); this.step = "role"; this.game.state = "MODE_SELECT"; this.game.updateHud(); return true; }
      if (this.step === "code") { this.step = "role"; this.error = null; return true; }
      return true;
    }
    if (this.step === "code") {
      if (e.key === "Enter") { this.joinRoom(); return true; }
      if (e.key === "Backspace") { this.typed = this.typed.slice(0, -1); return true; }
      if (/^[A-Za-z0-9]$/.test(e.key)) {
        if (this.typed.length < ONLINE_CODE_LENGTH) this.typed += e.key.toUpperCase();
        if (this.typed.length === ONLINE_CODE_LENGTH) this.joinRoom();
        return true;
      }
      return true;   // kod ekranında başka tuş oyuna geçmesin
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      // Robot seçimi (lobide, maç başlamadan): ◀ ▶ ile karakterler arasında gezin.
      if (!this.session || this.session.phase === NET_PHASE.LOBBY) {
        this._cycleRobot(e.key === "ArrowRight" ? 1 : -1);
        return true;
      }
    }
    if (this.step === "room" && (e.key === "Enter" || e.code === "Space")) {
      if (this.role === "host") this.startMatch();
      else this.toggleReady();
      return true;
    }
    return true;   // lobi açıkken oyun girdisi kapalı
  }

  handleClick(mx, my) {
    if (!this.active) return false;
    for (const r of this._rects) {
      if (mx < r.x || mx > r.x + r.w || my < r.y || my > r.y + r.h) continue;
      if (r.disabled) return true;
      if (typeof SFX !== "undefined" && SFX.uiClick) SFX.uiClick();
      if (r.action === "host") this.hostRoom();
      else if (r.action === "join") this.step = "code";
      else if (r.action === "back") {
        this.close();
        this.step = "role";
        this.game.state = "MODE_SELECT";
        this.game.updateHud();
      } else if (r.action === "leave") { this.close(); this.step = "role"; }
      else if (r.action === "copy") this.copyInvite();
      else if (r.action === "start") this.startMatch();
      else if (r.action === "ready") this.toggleReady();
      else if (r.action === "robotPrev") this._cycleRobot(-1);
      else if (r.action === "robotNext") this._cycleRobot(1);
      return true;
    }
    return true;   // lobi açıkken tuvale tıklama oyuna geçmez
  }

  _cycleRobot(dir) {
    if (!this.session || this.session.phase !== NET_PHASE.LOBBY) return;
    this.robotIndex = (this.robotIndex + dir + CHARACTERS.length) % CHARACTERS.length;
    this.robotId = this.robot.id;
    if (this.role === "host") {
      // Oda sahibi: kadro + arena haritası kendi robotuna bağlıdır; kendi
      // koltuğundaki robot da güncellenir (misafir oda listesinde görür).
      if (this.session.seats[0]) this.session.seats[0].robotId = this.robotId;
      this.session.lobbyRoster = [this.robotId, null];
      const map = this._mapFor(this.robotId);
      this.session.lobbyMapId = map ? map.id : null;
      this.session.revision++;
      this.session.broadcastLobby();
      return;
    }
    // Misafir: HELLO yeniden gönderilir; host koltuğundaki robotu günceller.
    this.session.sendHello({ robotId: this.robotId, seatToken: this._storedSeatToken() });
  }

  // ── Kare güncellemesi ───────────────────────────────────────────────────

  update(dtMs) {
    if (!this.active) return;
    this.elapsedMs += dtMs;
    if (this.notice) {
      this.notice.age += dtMs;
      if (this.notice.age > 2600) this.notice = null;
    }
    // Bağlanma zaman aşımı: OPEN olmadan geçen süre kullanıcıya bildirilir.
    if (!this.error && this.transport && !this.transport.isOpen() &&
        this.step === "room" && this.elapsedMs - this.connectStartedAt > ONLINE_CONNECT_TIMEOUT_MS) {
      this._fail("online.err.TIMEOUT");
    }
  }

  // ── Çizim ───────────────────────────────────────────────────────────────

  render(ctx) {
    const W = this.game.W, H = this.game.H;
    this._rects = [];
    if (typeof drawClouds === "function") drawClouds(ctx, W, "rgba(190,215,240,0.14)");
    _msBackdrop(ctx, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#000000aa"; ctx.font = uiTitleFont(28);
    ctx.fillText(t("online.title", "ÇEVRİMİÇİ"), W / 2 + 2, 34);
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(28);
    ctx.fillText(t("online.title", "ÇEVRİMİÇİ"), W / 2, 32);
    ctx.fillStyle = "#cfe0ee"; ctx.font = uiTextFont(13);
    ctx.fillText(t("online.subtitle", "Aynı oda kodundaki iki operatör — internet üzerinden"), W / 2, 70);
    if (typeof _csHazardStrip === "function") _csHazardStrip(ctx, W / 2 - 110, 92, 220, 4);

    if (this.step === "role") this._renderRole(ctx, W, H);
    else if (this.step === "code") this._renderCode(ctx, W, H);
    else this._renderRoom(ctx, W, H);

    this._renderStatus(ctx, W, H);
  }

  _renderRole(ctx, W, H) {
    const bw = 300, bh = 168, gap = 28;
    const y = 168;
    const x1 = W / 2 - bw - gap / 2, x2 = W / 2 + gap / 2;
    this._button(ctx, { x: x1, y, w: bw, h: bh, action: "host" }, {
      title: t("online.role.host", "ODA KUR"),
      sub: t("online.role.host.sub", "Kod üret, arkadaşını davet et"),
      accent: "#4fc3f7",
    });
    this._button(ctx, { x: x2, y, w: bw, h: bh, action: "join" }, {
      title: t("online.role.join", "KODA KATIL"),
      sub: t("online.role.join.sub", "Arkadaşının kodunu yaz"),
      accent: "#7bdc8e",
    });
    // Robot seçici kartların ALTINDA ortada durur (cx = W/2). Eskiden `W`
    // geçilmişti → seçici ekranın sağ kenarına taşıyordu (sonda yakaladı).
    this._renderRobotPicker(ctx, W / 2, y + bh + 30);
    this.drawBack(ctx, t("common.mainMenu", "‹ Ana Menü"));
  }

  _renderCode(ctx, W, H) {
    ctx.fillStyle = "#eef5ff"; ctx.font = uiTitleFont(18);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(t("online.code.title", "ODA KODU"), W / 2, 140);
    const n = ONLINE_CODE_LENGTH, bw = 46, gap = 12;
    const total = n * bw + (n - 1) * gap;
    const x0 = (W - total) / 2, y = 176;
    for (let i = 0; i < n; i++) {
      const ch = this.typed[i] || "";
      const active = i === this.typed.length;
      _csPanel(ctx, x0 + i * (bw + gap), y, bw, 60, {
        accent: active ? "#ffe45e" : ch ? "#4fc3f7" : "#3b526b",
        glow: active, selected: !!ch,
      });
      ctx.fillStyle = ch ? "#eef5ff" : "#5e7488";
      ctx.font = uiTitleFont(26);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(ch || "·", x0 + i * (bw + gap) + bw / 2, y + 31);
    }
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(12);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(t("online.code.hint", "Kodu yaz — son harfte kendiliğinden katılır (Enter ile de olur)"), W / 2, y + 76);
    ctx.fillStyle = "#5e7488"; ctx.font = uiTextFont(11);
    ctx.fillText(t("online.code.paste", "Davet bağlantısını yapıştırabilirsin (Ctrl+V)"), W / 2, y + 98);
    this.drawBack(ctx, t("online.back", "‹ Geri"));
  }

  _renderRoom(ctx, W, H) {
    const left = { x: 96, y: 132, w: 400, h: 300 };
    _csPanel(ctx, left.x, left.y, left.w, left.h, { accent: "#2a3848" });
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(11, 700);
    ctx.fillText(t("online.seats.title", "KOLTUKLAR"), left.x + 16, left.y + 14);
    const seats = this._seatRows();
    for (let i = 0; i < seats.length; i++) {
      const row = seats[i];
      const ry = left.y + 40 + i * 62;
      _csPanel(ctx, left.x + 12, ry, left.w - 24, 54, {
        accent: row.you ? "#ffe45e" : row.claimed ? "#4fc3f7" : "#2a3848",
        fillTop: row.you ? "#233046" : "#161f2a",
      });
      const ch = row.robotId ? CHARACTERS.find((c) => c.id === row.robotId) : null;
      // Küçük robot önizlemesi (kadro kimliği biliniyorsa)
      if (ch) {
        drawRobot(ctx, {
          cx: left.x + 44, cy: ry + 30, r: 12, facing: 1, charDef: ch,
          timeMs: this.game.renderTimeMs || 0,
          motion: { vx: 0, vy: 0, onGround: true },
        });
      }
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = ch ? "#eef5ff" : "#7f93a6";
      ctx.font = uiTitleFont(14);
      ctx.fillText(ch ? ch.label : t("online.seat.empty", "Bekleniyor…"), left.x + 74, ry + 20);
      ctx.fillStyle = "#8fa6bd"; ctx.font = uiTextFont(11);
      const who = row.host ? t("online.seat.host", "ODA SAHİBİ") : t("online.seat.guest", "MİSAFİR");
      ctx.fillText(who, left.x + 74, ry + 38);
      // Durum rozeti: bağlantı + hazır
      const badge = !row.claimed ? t("online.seat.waiting", "BAĞLANMADI")
        : row.ready ? t("online.seat.ready", "HAZIR")
        : t("online.seat.notReady", "HAZIR DEĞİL");
      const badgeColor = !row.claimed ? "#7f93a6" : row.ready ? "#7bdc8e" : "#ffd24a";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillStyle = badgeColor; ctx.font = uiTextFont(11, 700);
      ctx.fillText(badge, left.x + left.w - 24, ry + 27);
      if (row.you) {
        ctx.fillStyle = "#ffe45e"; ctx.font = uiTextFont(10, 700);
        ctx.fillText(t("online.seat.you", "SEN"), left.x + left.w - 24, ry + 43);
      }
    }
    // Oda kodu: büyük ve okunur (davetin asıl taşıyıcısı)
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(11, 700);
    ctx.fillText(t("online.roomCode", "ODA KODU"), W - 250, 138);
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(34);
    ctx.fillText(netFormatRoomCode(this.code), W - 250, 156);
    ctx.fillStyle = "#8fa6bd"; ctx.font = uiTextFont(11);
    ctx.fillText(t("online.roomCode.hint", "Arkadaşın bu kodu KODA KATIL ekranına yazsın"), W - 250, 200);

    const by = 226;
    if (this.role === "host") {
      this._button(ctx, { x: W - 400, y: by, w: 300, h: 40, action: "copy" }, {
        title: t("online.invite.copy", "BAĞLANTIYI KOPYALA"), accent: "#3fae8c", small: true,
      });
      const can = !!(this.session && this.session.canStart());
      this._button(ctx, { x: W - 400, y: by + 52, w: 300, h: 48, action: "start", disabled: !can }, {
        title: can ? t("online.start", "MAÇI BAŞLAT") : t("online.startWait", "Karşı taraf bekleniyor…"),
        accent: can ? "#ffe45e" : "#3b526b", small: true, disabled: !can,
      });
    } else {
      this._button(ctx, { x: W - 400, y: by, w: 300, h: 48, action: "ready" }, {
        title: this.ready ? t("online.readyCancel", "HAZIR DEĞİLİM") : t("online.ready", "HAZIRIM"),
        accent: this.ready ? "#ffd24a" : "#7bdc8e", small: true,
      });
      ctx.fillStyle = "#8fa6bd"; ctx.font = uiTextFont(11);
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(t("online.readyWait", "Oda sahibi başlatınca maç başlar"), W - 250, by + 58);
    }
    // Kendi robotun: lobide her iki taraf da değiştirebilir (misafir HELLO'yu
    // yeniden gönderir → host kadrosunu günceller). Seçici, düğmelerin (…326)
    // ALTINDA başlar ki "MAÇI BAŞLAT" ile çakışmasın.
    this._renderRobotPicker(ctx, W - 250, 348);
    this._button(ctx, { x: 96, y: 448, w: 150, h: 32, action: "leave" }, {
      title: t("online.leave", "‹ AYRIL"), accent: "#ff7b7b", small: true,
    });
  }

  /* Robot seçici. `interactive` verilmezse lobide (maç başlamadan) serbesttir;
   * maç sırasında kapanır (kadro START ile sabitlenir). */
  _renderRobotPicker(ctx, cx, y, interactive) {
    const ch = this.robot;
    if (!ch) return;
    if (interactive === undefined) {
      interactive = !this.session || this.session.phase === NET_PHASE.LOBBY;
    }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(11, 700);
    ctx.fillText(t("online.robot.title", "ROBOTUN"), cx, y - 12);
    if (interactive) {
      this._button(ctx, { x: cx - 150, y, w: 34, h: 34, action: "robotPrev" }, { title: "‹", small: true, accent: "#4fc3f7" });
      this._button(ctx, { x: cx + 116, y, w: 34, h: 34, action: "robotNext" }, { title: "›", small: true, accent: "#4fc3f7" });
    }
    drawRobot(ctx, {
      cx, cy: y + 22, r: 13, facing: 1, charDef: ch,
      timeMs: this.game.renderTimeMs || 0,
      motion: { vx: 0, vy: 0, onGround: true },
      parts: this.game.profile ? getRobotProgress(this.game.profile, ch.id).loadout : null,
    });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#eef5ff"; ctx.font = uiTitleFont(13);
    ctx.fillText(ch.label, cx, y + 44);
    if (interactive) {
      ctx.fillStyle = "#5e7488"; ctx.font = uiTextFont(10);
      ctx.fillText(t("online.robot.hint", "◀ ▶ ile değiştir"), cx, y + 62);
    }
  }

  _renderStatus(ctx, W, H) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (this.error) {
      ctx.fillStyle = "#ff9f5a"; ctx.font = uiTextFont(12, 700);
      ctx.fillText(this.error.text || this._errorText(this.error.code), W / 2, H - 40);
      return;
    }
    if (this.notice) {
      ctx.fillStyle = "#7bdc8e"; ctx.font = uiTextFont(12, 700);
      ctx.fillText(this.notice.text || this._noticeText(this.notice.key), W / 2, H - 40);
      return;
    }
    if (this.step === "room") {
      const text = this._statusText();
      if (text) {
        ctx.fillStyle = this.statusText === "open" ? "#7bdc8e" : "#9fb6c9";
        ctx.font = uiTextFont(12);
        ctx.fillText(text, W / 2, H - 40);
      }
    }
  }

  // Koltuk satırları: host için oturum verisi, misafir için LOBBY paketi.
  _seatRows() {
    const host = this.role === "host";
    if (host) {
      const snap = this.session ? this.session.lobbySnapshot() : { seats: [] };
      return snap.seats.map((s) => ({
        playerIdx: s.playerIdx, claimed: s.claimed, ready: s.ready,
        robotId: s.playerIdx === 0 ? this.robotId : s.robotId,
        you: s.playerIdx === 0, host: s.playerIdx === 0,
      }));
    }
    const st = this.session && this.session.lobbyState;
    const mySeat = this.session ? this.session.mySeat : null;
    const seats = st && st.seats ? st.seats : [{ playerIdx: 0, claimed: true, ready: true, robotId: null }, { playerIdx: 1, claimed: true, ready: this.ready, robotId: this.robotId }];
    return seats.map((s) => ({
      playerIdx: s.playerIdx, claimed: s.claimed, ready: s.ready,
      robotId: s.playerIdx === (mySeat == null ? 1 : mySeat) ? this.robotId : s.robotId,
      you: s.playerIdx === (mySeat == null ? 1 : mySeat), host: s.playerIdx === 0,
    }));
  }

  // Ortak düğme çizici: tıklama alanı listesine kaydeder.
  _button(ctx, rect, opts) {
    const o = opts || {};
    const mx = this.game.input.mouseX, my = this.game.input.mouseY;
    const hovered = !o.disabled && mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h;
    _csPanel(ctx, rect.x, rect.y, rect.w, rect.h, {
      accent: hovered ? (o.accent || "#ffe45e") : _hexA(o.accent || "#3b526b", 0.6),
      hover: hovered, glow: hovered, disabled: o.disabled,
    });
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (o.sub) {
      ctx.fillStyle = o.disabled ? "#7f93a6" : "#eef5ff";
      ctx.font = uiTitleFont(20);
      ctx.fillText(o.title, rect.x + rect.w / 2, rect.y + rect.h / 2 - 16);
      ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(12);
      ctx.fillText(o.sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 20);
      // Rol kartı ikonu: iki düğüm arasında bağlantı (çevrimiçi imzası)
      _msIcon(ctx, "ağ", rect.x + rect.w / 2, rect.y + 34, o.accent || "#4fc3f7", hovered);
    } else {
      ctx.fillStyle = o.disabled ? "#7f93a6" : "#eef5ff";
      ctx.font = uiTitleFont(o.small ? 13 : 16);
      ctx.fillText(o.title, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    }
    this._rects.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, action: rect.action, disabled: !!o.disabled });
  }

  drawBack(ctx, label) {
    const W = this.game.W, H = this.game.H;
    const rect = { x: 20, y: H - 52, w: 170, h: 34, action: "back" };
    this._button(ctx, rect, { title: label, accent: "#4fc3f7", small: true });
  }
}

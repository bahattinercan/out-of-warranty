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
    this._teardownTransport();
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

  /* Panodan oda kodu çıkarır. Sıra: (1) davet bağlantısındaki `oda=` parametresi,
   * (2) tireli gösterim (ABC-DE), (3) tek başına 5 karakterlik simge. Aday KOD
   * ALFABESİNE uymalıdır (0/O, 1/I üretilmez) ve simge sınırlarına saygı
   * duyulur: yoksa `.../new-wild-ones/index.html` gibi bir yoldaki "projel"
   * sözcüğü oda kodu sanılırdı (eski ayrıştırıcının hatası). */
  _parseCode(text) {
    const raw = String(text || "");
    const clean = (v) => {
      const c = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (c.length !== ONLINE_CODE_LENGTH) return null;
      for (let i = 0; i < c.length; i++) if (NET_ROOM_ALPHABET.indexOf(c[i]) < 0) return null;
      return c;
    };
    let m = /(?:[?&#]|^)oda=([A-Za-z0-9-]{4,10})/i.exec(raw);
    if (m) { const c = clean(m[1]); if (c) return c; }
    m = /(?:^|[^A-Za-z0-9])([A-Za-z0-9]{3})-([A-Za-z0-9]{2})(?:[^A-Za-z0-9]|$)/.exec(raw);
    if (m) { const c = clean(m[1] + m[2]); if (c) return c; }
    const re = /(?:^|[^A-Za-z0-9])([A-Za-z0-9]{5})(?![A-Za-z0-9])/g;
    let hit;
    while ((hit = re.exec(raw))) { const c = clean(hit[1]); if (c) return c; }
    return null;
  }

  /* Panodan yapıştırma: davet bağlantısının tamamı ya da kod. Klavye olayı
   * yerine `paste` olayı dinlenir (Ctrl+V tuvalde görünmez). Not: bu olayın
   * doğabilmesi için klavye işleyicisinin Ctrl/Cmd+V'yi TÜKETMEMESİ gerekir
   * (js/game.js > handleLobbyKey). */
  _bindPaste() {
    if (this._boundPaste || typeof window === "undefined" || !window.addEventListener) return;
    this._boundPaste = (e) => {
      if (!this.active) return;
      if (this.step !== "role" && this.step !== "code") return;
      const text = (e.clipboardData && e.clipboardData.getData("text")) || "";
      const code = this._parseCode(text);
      if (!code) return;
      e.preventDefault?.();
      this.step = "code";
      this.typed = code;
      this._notice("online.notice.codePasted");
      this.joinRoom();
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

  /* Yeniden giriş koruması: çift tıklama (ya da iki hızlı dokunuş) ikinci bir
   * taşıma açmasın. Aksi hâlde ilk taşıma sahipsiz kalır, ekranda yeni bir kod
   * görünür ama o oda ayakta olmaz → "butonlar çalışmıyor" gibi görünür. */
  _busy() {
    if (this._connecting) return true;
    return !!(this.transport && this.transport.isOpen());
  }

  // Eski taşımayı kapatır (lobi açık kalır).
  _teardownTransport() {
    if (this.transport) { try { this.transport.close(); } catch (e) { /* yoksay */ } }
    this.transport = null;
    this.session = null;
    this._connecting = false;
    this.statusText = null;
  }

  hostRoom() {
    if (this._busy()) return false;
    this._teardownTransport();
    this.role = "host";
    this.code = netRoomCode();
    this.error = null;
    this.ready = false;
    this.step = "room";
    this._openTransport({ role: "host", roomCode: this.code });
    return true;
  }

  joinRoom() {
    if (this._busy()) return false;
    const code = this.typed.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (code.length < ONLINE_CODE_LENGTH) {
      this._fail("BAD_CODE");
      return false;
    }
    this._teardownTransport();
    this.role = "guest";
    this.code = code;
    this.error = null;
    this.step = "room";
    this._openTransport({ role: "guest", hostId: code });
    return true;
  }

  _openTransport(opts) {
    this._connecting = true;
    this.connectStartedAt = this.elapsedMs;
    this._ensurePeerJs((ok) => {
      if (!this.active || this.role !== opts.role) return;
      this._connecting = false;
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
    if (key === "online.notice.codePasted") return t("online.notice.codePasted", "Oda kodu yapıştırıldı");
    if (key === "online.notice.roomNotReady") return t("online.notice.roomNotReady", "Oda henüz hazır değil — bir saniye sonra tekrar dene");
    if (key === "online.notice.startNeedsReady") return t("online.notice.startNeedsReady", "Karşı taraf hazır olunca başlar");
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
    this._connecting = false;
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
    // Ctrl/Cmd/Alt + tuş: tarayıcı kısayolu (yapıştır/kopyala/kes). Tüketilmez;
    // aksi hâlde `preventDefault` yapıştırmayı iptal eder.
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
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
      // Devre dışı düğme sessiz kalmaz: nedenini söyle (yoksa "çalışmıyor"
      // sanılır — ör. karşı taraf hazır değilken MAÇI BAŞLAT).
      if (r.disabled) {
        if (r.action === "start") this._notice("online.notice.startNeedsReady");
        else if (r.action === "copy") this._notice("online.notice.roomNotReady");
        return true;
      }
      // Eylem ÖNCE, ses SONRA: ses kurulumu bir kez hata verse bile düğme
      // işlevini kaybetmesin.
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
      // Tıklama alanları TÜKETİLİR: ekran değiştiyse bir sonraki kare çizilene
      // kadar eski ekranın düğmeleriyle ikinci bir eylem tetiklenmesin
      // (bayat kare → yanlış eylem).
      this._rects = [];
      if (typeof SFX !== "undefined" && SFX.uiClick) { try { SFX.uiClick(); } catch (e) { /* yoksay */ } }
      return true;
    }
    return true;   // lobi açıkken tuvale tıklama oyuna geçmez
  }

  _cycleRobot(dir) {
    // Maç kurulduktan sonra kadro sabitlenir; seçici yalnız lobide serbest.
    if (this.session && this.session.phase !== NET_PHASE.LOBBY) return;
    this.robotIndex = (this.robotIndex + dir + CHARACTERS.length) % CHARACTERS.length;
    this.robotId = this.robot.id;
    // Oda HENÜZ yok (rol ekranı: ODA KUR / KODA KATIL): seçim yalnız yerelde
    // tutulur, oda kurulurken/katılırken kullanılır. Eski sürüm burada erken
    // dönüyordu; rol ekranındaki robot seçicisi çizildiği hâlde okları ve
    // ← → tuşları hiçbir şey yapmıyordu (kullanıcı bildirimi).
    if (!this.session) return;
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

  // ── Yerleşim ────────────────────────────────────────────────────────────
  /* Dünya genişliği pencere en-boy oranına göre DEĞİŞİR (Game.resize: dar
   * pencerede ~648'e iner, geniş ekranda ~1620'ye çıkar) ve sağ üstteki DOM
   * denetimleri (ses + dil) sabit CSS px kalır. Bu yüzden burada HİÇBİR x sabit
   * yazılmaz: her ölçü W, H ve sağ üst güvenli alandan türetilir. Aksi hâlde dar
   * dünyada sütunlar üst üste biner ve başlık denetimlerin altında kalır
   * (kullanıcı bildirimi: "küçük ekranda çevrimiçi sayfasının tasarımı
   * bozuluyor"). */
  _layout() {
    const W = this.game.W, H = this.game.H;
    const top = Math.max(0, this.game.hudTopInset || 0);
    const right = Math.max(0, this.game.hudRightInset || 0);
    // Başlık ve içerik, sağ üstteki denetimlerin SOLUNDA/ALTINDA kalır.
    const safeW = Math.max(300, W - right);
    const margin = Math.max(14, Math.round(W * 0.035));
    const contentW = Math.max(260, safeW - margin * 2);
    return {
      W, H, top, right, safeW, margin, contentW,
      cx: Math.round(safeW / 2),
      // İki sütun ancak bu genişlikte yan yana sığar (koltuk 300 + bilgi 300 + ara).
      wide: contentW >= 620,
    };
  }

  // ── Çizim ───────────────────────────────────────────────────────────────

  render(ctx) {
    const L = this._layout();
    this._rects = [];
    if (typeof drawClouds === "function") drawClouds(ctx, L.W, "rgba(190,215,240,0.14)");
    _msBackdrop(ctx, L.W, L.H);
    this._renderHeader(ctx, L);

    if (this.step === "role") this._renderRole(ctx, L);
    else if (this.step === "code") this._renderCode(ctx, L);
    else this._renderRoom(ctx, L);

    this._renderStatus(ctx, L);
  }

  // Başlık bloğu: sağ üst denetimlerinin dışında kalan alanda ortalanır.
  _renderHeader(ctx, L) {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const size = L.safeW < 560 ? 22 : 28;
    ctx.fillStyle = "#000000aa"; ctx.font = uiTitleFont(size);
    ctx.fillText(t("online.title", "ÇEVRİMİÇİ"), L.cx + 2, 34);
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(size);
    ctx.fillText(t("online.title", "ÇEVRİMİÇİ"), L.cx, 32);
    ctx.fillStyle = "#cfe0ee"; ctx.font = uiTextFont(12);
    const sub = _fitTextLines(ctx, t("online.subtitle", "Aynı oda kodundaki iki operatör — internet üzerinden"),
      L.contentW, 12, (p) => uiTextFont(p), 1, 9);
    ctx.fillText(sub.lines[0], L.cx, 32 + size + 8);
    if (typeof _csHazardStrip === "function") {
      const hw = Math.min(220, Math.round(L.safeW * 0.5));
      _csHazardStrip(ctx, L.cx - hw / 2, 32 + size + 24, hw, 4);
    }
  }

  _renderRole(ctx, L) {
    const gap = 16;
    const bw = Math.max(160, Math.min(300, Math.floor((L.contentW - gap) / 2)));
    const bh = Math.max(118, Math.min(168, Math.round(L.H * 0.31)));
    const y = Math.max(L.top + 40, Math.round(L.H * 0.30));
    const x1 = L.cx - bw - gap / 2, x2 = L.cx + gap / 2;
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
    // Robot seçici kartların altında, alt şeride (geri düğmesi) değmeyecek yerde.
    const pickerY = Math.min(y + bh + 22, L.H - 148);
    this._renderRobotPicker(ctx, L.cx, pickerY);
    this.drawBack(ctx, L, t("common.mainMenu", "‹ Ana Menü"));
  }

  _renderCode(ctx, L) {
    ctx.fillStyle = "#eef5ff"; ctx.font = uiTitleFont(18);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(t("online.code.title", "ODA KODU"), L.cx, Math.max(L.top + 34, 118));
    const n = ONLINE_CODE_LENGTH, gap = 10;
    const bw = Math.max(30, Math.min(46, Math.floor((L.contentW - gap * (n - 1)) / n)));
    const bh = Math.round(bw * 1.3);
    const total = n * bw + (n - 1) * gap;
    const x0 = L.cx - total / 2;
    const y = Math.max(L.top + 58, 146);
    for (let i = 0; i < n; i++) {
      const ch = this.typed[i] || "";
      const active = i === this.typed.length;
      _csPanel(ctx, x0 + i * (bw + gap), y, bw, bh, {
        accent: active ? "#ffe45e" : ch ? "#4fc3f7" : "#3b526b",
        glow: active, selected: !!ch,
      });
      ctx.fillStyle = ch ? "#eef5ff" : "#5e7488";
      ctx.font = uiTitleFont(Math.max(18, Math.round(bw * 0.56)));
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(ch || "·", x0 + i * (bw + gap) + bw / 2, y + bh / 2);
    }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#9fb6c9";
    const hint = _fitTextLines(ctx, t("online.code.hint", "Kodu yaz — son harfte kendiliğinden katılır (Enter ile de olur)"),
      L.contentW, 12, (p) => uiTextFont(p), 2, 9);
    for (let i = 0; i < hint.lines.length; i++) ctx.fillText(hint.lines[i], L.cx, y + bh + 14 + i * (hint.px + 2));
    ctx.fillStyle = "#5e7488"; ctx.font = uiTextFont(11);
    const paste = _fitTextLines(ctx, t("online.code.paste", "Davet bağlantısını yapıştırabilirsin (Ctrl+V)"),
      L.contentW, 11, (p) => uiTextFont(p), 1, 9);
    ctx.fillText(paste.lines[0], L.cx, y + bh + 20 + hint.lines.length * (hint.px + 2));
    this.drawBack(ctx, L, t("online.back", "‹ Geri"));
  }

  _renderRoom(ctx, L) {
    const rows = this._seatRows();
    const seatsH = 38 + rows.length * 54;
    if (L.wide) {
      // İki sütunlu blok ORTALANIR: çok geniş dünyada (ultra geniş ekran) sol
      // kenara yapışıp sağda büyük boşluk bırakmasın.
      const colW = Math.min(400, Math.round((L.contentW - 24) * 0.55));
      const rw = Math.min(320, L.contentW - colW - 24);
      const blockW = colW + 24 + rw;
      const x0 = Math.round(L.cx - blockW / 2);
      // Dikey ortalama: bilgi sütunu (kod + düğmeler + seçici) koltuk panelinden
      // uzun olduğu için ona göre ortalanır.
      const top = Math.max(L.top + 16, Math.round((L.H - 250) / 2));
      this._renderSeats(ctx, { x: x0, y: top, w: colW, h: seatsH }, rows);
      this._renderRoomInfo(ctx, L, x0 + colW + 24 + rw / 2, top, rw, false);
    } else {
      // Dar dünya: tek sütun — koltuklar üstte, kod/düğmeler altta (kompakt).
      const top = Math.max(L.top + 8, 96);
      this._renderSeats(ctx, { x: L.margin, y: top, w: L.contentW, h: seatsH }, rows);
      this._renderRoomInfo(ctx, L, L.cx, top + seatsH + 10, L.contentW, true);
    }
    // Sol alt: durum metni bu düğmenin SAĞINDAKİ şeritte çizilir, böylece
    // dar yerleşimde üst üste binmezler (sonda yakaladı).
    this._button(ctx, { x: L.margin, y: L.H - 48, w: 140, h: 32, action: "leave" }, {
      title: t("online.leave", "‹ AYRIL"), accent: "#ff7b7b", small: true,
    });
  }

  // Koltuk listesi paneli (satır çizimi geniş ve dar yerleşimde ortaktır).
  _renderSeats(ctx, rect, rows) {
    _csPanel(ctx, rect.x, rect.y, rect.w, rect.h, { accent: "#2a3848" });
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(11, 700);
    ctx.fillText(t("online.seats.title", "KOLTUKLAR"), rect.x + 16, rect.y + 12);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const ry = rect.y + 32 + i * 54;
      _csPanel(ctx, rect.x + 12, ry, rect.w - 24, 50, {
        accent: row.you ? "#ffe45e" : row.claimed ? "#4fc3f7" : "#2a3848",
        fillTop: row.you ? "#233046" : "#161f2a",
      });
      const ch = row.robotId ? CHARACTERS.find((c) => c.id === row.robotId) : null;
      if (ch) {
        drawRobot(ctx, {
          cx: rect.x + 42, cy: ry + 27, r: 11, facing: 1, charDef: ch,
          timeMs: this.game.renderTimeMs || 0,
          motion: { vx: 0, vy: 0, onGround: true },
        });
      }
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = ch ? "#eef5ff" : "#7f93a6";
      ctx.font = uiTitleFont(13);
      ctx.fillText(ch ? ch.label : t("online.seat.empty", "Bekleniyor…"), rect.x + 70, ry + 18);
      ctx.fillStyle = "#8fa6bd"; ctx.font = uiTextFont(11);
      ctx.fillText(row.host ? t("online.seat.host", "ODA SAHİBİ") : t("online.seat.guest", "MİSAFİR"), rect.x + 70, ry + 35);
      const badge = !row.claimed ? t("online.seat.waiting", "BAĞLANMADI")
        : row.ready ? t("online.seat.ready", "HAZIR")
        : t("online.seat.notReady", "HAZIR DEĞİL");
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillStyle = !row.claimed ? "#7f93a6" : row.ready ? "#7bdc8e" : "#ffd24a";
      ctx.font = uiTextFont(11, 700);
      ctx.fillText(badge, rect.x + rect.w - 22, ry + 25);
      if (row.you) {
        ctx.fillStyle = "#ffe45e"; ctx.font = uiTextFont(10, 700);
        ctx.fillText(t("online.seat.you", "SEN"), rect.x + rect.w - 22, ry + 39);
      }
    }
  }

  /* Oda kodu + davet/hazır/başlat düğmeleri + robot seçici. `compact` (dar
   * yerleşim) kısa aralıklar ve tek satırlık robot seçici kullanır. */
  _renderRoomInfo(ctx, L, cx, y, w, compact) {
    const bw = Math.min(300, w);
    const x = cx - bw / 2;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(11, 700);
    ctx.fillText(t("online.roomCode", "ODA KODU"), cx, y);
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(compact ? 26 : 34);
    ctx.fillText(netFormatRoomCode(this.code), cx, y + (compact ? 14 : 18));
    ctx.fillStyle = "#8fa6bd"; ctx.font = uiTextFont(11);
    const hintY = y + (compact ? 44 : 62);
    const hint = _fitTextLines(ctx, t("online.roomCode.hint", "Arkadaşın bu kodu KODA KATIL ekranına yazsın"),
      w, 11, (p) => uiTextFont(p), 1, 9);
    ctx.fillText(hint.lines[0], cx, hintY);

    const by = hintY + (compact ? 15 : 22);
    const bh = compact ? 34 : 40;
    if (this.role === "host") {
      // Oda (PeerJS kimliği) HAZIR OLMADAN davet kopyalanamaz: kod kopyalanıp
      // paylaşılırsa karşı taraf "oda bulunamadı" alır.
      const live = !!(this.transport && this.transport.isOpen());
      this._button(ctx, { x, y: by, w: bw, h: bh, action: "copy", disabled: !live }, {
        title: live ? t("online.invite.copy", "BAĞLANTIYI KOPYALA") : t("online.status.preparing", "Oda hazırlanıyor…"),
        accent: live ? "#3fae8c" : "#3b526b", small: true, disabled: !live,
      });
      const can = !!(this.session && this.session.canStart());
      this._button(ctx, { x, y: by + bh + 6, w: bw, h: bh + 4, action: "start", disabled: !can }, {
        title: can ? t("online.start", "MAÇI BAŞLAT") : t("online.startWait", "Karşı taraf bekleniyor…"),
        accent: can ? "#ffe45e" : "#3b526b", small: true, disabled: !can,
      });
      this._renderRobotPicker(ctx, cx, by + bh * 2 + 26, undefined, compact);
      return;
    }
    this._button(ctx, { x, y: by, w: bw, h: bh + 4, action: "ready" }, {
      title: this.ready ? t("online.readyCancel", "HAZIR DEĞİLİM") : t("online.ready", "HAZIRIM"),
      accent: this.ready ? "#ffd24a" : "#7bdc8e", small: true,
    });
    ctx.fillStyle = "#8fa6bd"; ctx.font = uiTextFont(11);
    const wait = _fitTextLines(ctx, t("online.readyWait", "Oda sahibi başlatınca maç başlar"),
      w, 11, (p) => uiTextFont(p), 1, 9);
    ctx.fillText(wait.lines[0], cx, by + bh + 10);
    this._renderRobotPicker(ctx, cx, by + bh + (compact ? 24 : 28), undefined, compact);
  }

  /* Robot seçici. `compact` tek satır: ◀ [robot] FIX-8 ▶ (dar yerleşimde dikey
   * yer kazandırır). `interactive` verilmezse lobide (maç başlamadan) serbesttir;
   * maç sırasında kapanır (kadro START ile sabitlenir). */
  _renderRobotPicker(ctx, cx, y, interactive, compact) {
    const ch = this.robot;
    if (!ch) return;
    if (interactive === undefined) {
      interactive = !this.session || this.session.phase === NET_PHASE.LOBBY;
    }
    if (compact) {
      if (interactive) {
        this._button(ctx, { x: cx - 96, y, w: 32, h: 32, action: "robotPrev" }, { title: "‹", small: true, accent: "#4fc3f7" });
        this._button(ctx, { x: cx + 64, y, w: 32, h: 32, action: "robotNext" }, { title: "›", small: true, accent: "#4fc3f7" });
      }
      drawRobot(ctx, {
        cx, cy: y + 16, r: 11, facing: 1, charDef: ch,
        timeMs: this.game.renderTimeMs || 0,
        motion: { vx: 0, vy: 0, onGround: true },
        parts: this.game.profile ? getRobotProgress(this.game.profile, ch.id).loadout : null,
      });
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillStyle = "#eef5ff"; ctx.font = uiTitleFont(12);
      ctx.fillText(ch.label, cx, y + 32);
      return;
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

  /* Durum/bildirim şeridi: sol alttaki gezinme düğmesinin SAĞINDA kalan alanda
   * ortalanır (dar yerleşimde düğmeyle çakışmaması için). */
  _renderStatus(ctx, L) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const x0 = L.margin + 158;
    const stripW = Math.max(120, L.contentW - 158);
    const cx = Math.round(x0 + stripW / 2);
    const oneLine = (text, color) => {
      ctx.fillStyle = color; ctx.font = uiTextFont(12, 700);
      const fit = _fitTextLines(ctx, text, stripW, 12, (p) => uiTextFont(p, 700), 1, 9);
      ctx.fillText(fit.lines[0], cx, L.H - 32);
    };
    if (this.error) { oneLine(this.error.text || this._errorText(this.error.code), "#ff9f5a"); return; }
    if (this.notice) { oneLine(this.notice.text || this._noticeText(this.notice.key), "#7bdc8e"); return; }
    if (this.step === "room") {
      const text = this._statusText();
      if (text) oneLine(text, this.statusText === "open" ? "#7bdc8e" : "#9fb6c9");
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
    const seats = st && st.seats ? st.seats : [
      { playerIdx: 0, claimed: true, ready: true, robotId: null },
      { playerIdx: 1, claimed: true, ready: this.ready, robotId: this.robotId },
    ];
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
      // Rol kartı: ikon + başlık + alt yazı (yükseklikle ölçeklenir).
      const iconY = rect.y + Math.min(34, Math.round(rect.h * 0.22));
      _msIcon(ctx, "ağ", rect.x + rect.w / 2, iconY, o.accent || "#4fc3f7", hovered);
      ctx.fillStyle = o.disabled ? "#7f93a6" : "#eef5ff";
      ctx.font = uiTitleFont(rect.w < 220 ? 17 : 20);
      ctx.fillText(o.title, rect.x + rect.w / 2, rect.y + rect.h / 2 - 12);
      ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(11);
      const sub = _fitTextLines(ctx, o.sub, rect.w - 16, 11, (p) => uiTextFont(p), 2, 9);
      for (let i = 0; i < sub.lines.length; i++) ctx.fillText(sub.lines[i], rect.x + rect.w / 2, rect.y + rect.h / 2 + 14 + i * 12);
    } else {
      ctx.fillStyle = o.disabled ? "#7f93a6" : "#eef5ff";
      const size = o.small ? 13 : 16;
      const fit = _fitTextLines(ctx, o.title, rect.w - 14, size, uiTitleFont, 1, 9);
      ctx.font = uiTitleFont(size);
      ctx.fillText(fit.lines[0], rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    }
    this._rects.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, action: rect.action, disabled: !!o.disabled });
  }

  // Geri düğmesi sol altta; durum/bildirim metni onun sağındaki şeritte.
  drawBack(ctx, L, label) {
    const rect = { x: L.margin, y: L.H - 48, w: 150, h: 32, action: "back" };
    this._button(ctx, rect, { title: label, accent: "#4fc3f7", small: true });
  }
}

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
 * yalnız bu satır değişir (docs/web-launch-plan.md §4). Boşken yalnız STUN
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
    this.mapId = MAPS[0] ? MAPS[0].id : null;
    this.seatCount = NET_MIN_SEATS; // host odasının kapasitesi (2–6, F4)
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
    this.seatCount = NET_MIN_SEATS;
    this.elapsedMs = 0;
    this.peerSeats.clear();
    // Davet bağlantısı: ?oda=KOD ile açıldıysa kodu hazır getir ve katılma
    // ekranına geç (arkadaş tek tıkla katılır). Portal davet bağlantısı da aynı
    // sonucu verir (CrazyGames SDK parametreleri).
    const inv = this._codeFromUrl() || this._portalInviteCode();
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

  /* Platform davet bağlantısıyla gelen oyuncu: portal parametrelerinde oda
   * kodu varsa hazır doldurulur (gerçek kullanıcı akışında en sık yol). */
  _portalInviteCode() {
    if (typeof PORTAL === "undefined" || !PORTAL.isActive()) return null;
    const raw = PORTAL.inviteParam("oda") || (PORTAL.inviteParams() && PORTAL.inviteParams().oda) || null;
    if (!raw) return null;
    const code = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ONLINE_CODE_LENGTH);
    return code.length === ONLINE_CODE_LENGTH ? code : null;
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
    if (typeof PORTAL !== "undefined" && PORTAL.isActive()) PORTAL.leftRoom();
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
    this._syncPortalRoom(true);
    return true;
  }

  /* Portal (F5): oda bilgisini platforma bildirir — davet düğmesi ve "arkadaşına
   * katıl" akışı bu bilgiye dayanır (docs.crazygames.com/requirements/multiplayer).
   * Oda dolu ya da maç başladıysa `isJoinable:false` gider. Portal yoksa geçer. */
  _syncPortalRoom(wantJoinable) {
    if (typeof PORTAL === "undefined" || !PORTAL.isActive()) return false;
    if (this.role !== "host" || !this.code) return false;
    const full = !!(this.session && this.session.seats.length &&
      this.session.seats.every((s) => s.claimed));
    const inLobby = !this.session || this.session.phase === NET_PHASE.LOBBY;
    const can = wantJoinable !== false && !full && inLobby;
    PORTAL.updateRoom({ roomId: this.code, isJoinable: can, inviteParams: { oda: this.code } });
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
      // Koltuk bazında kopma: altı oyunculu odada bir misafirin düşmesi
      // diğerlerini etkilemez (maçta bot devralır, lobide koltuk boşalır).
      this.transport.onPeerClose((peerId) => this._onPeerClose(peerId));
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
    transport.onPeerClose((peerId) => this._onPeerClose(peerId));
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
      const map = this._mapFor();
      // Oda seçilen kapasiteyle açılır: host koltuğu + (n−1) boş koltuk.
      const seats = [{ playerIdx: 0, robotId: this.robotId }];
      for (let i = 1; i < this.seatCount; i++) seats.push({ playerIdx: i });
      this.session.openLobby(seats, {
        matchId: this.code,
        authoritySessionId: "auth-" + this.code,
        mapId: map ? map.id : null,
        roster: this._rosterFromSeats(seats),
      });
    } else {
      this.session = new NetSession({ role: "guest", transport: this.transport, rules: {}, now });
    }
  }

  /* Kadro KOLTUK SIRASINA göre kurulur (oyun `players[i]` = koltuk i).
   * Robotu henüz seçilmemiş koltuk için sıradaki karakter yedek olarak yazılır:
   * START ancak tüm koltuklar doluyken çağrıldığı için bu değer normalde
   * kullanılmaz, yalnız protokol hatasında maçın kilitlenmesini önler. */
  _rosterFromSeats(seats) {
    const list = seats || (this.session ? this.session.seats : []);
    return list.map((s, i) => {
      if (s.robotId) return s.robotId;
      const fallback = CHARACTERS[i % CHARACTERS.length];
      return fallback ? fallback.id : null;
    });
  }

  /* Koltuk sayısını değiştir (host, lobide). Bağlı koltukların altına inilemez:
   * oturum bunu SEATS_OCCUPIED ile reddeder. */
  setSeatCount(n) {
    if (this.role !== "host" || !this.session) return false;
    const res = this.session.setSeatCount(n);
    if (!res || !res.ok) {
      if (res && res.reason === "SEATS_OCCUPIED") this._notice("online.notice.seatsOccupied");
      return false;
    }
    this.seatCount = res.seats;
    this._syncPortalRoom(true);
    return true;
  }

  _mapFor() {
    return MAPS.find((m) => m.id === this.mapId) || MAPS[0] || null;
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
    if (status === NET_TRANSPORT_STATUS.CLOSED && this.step === "room" && this.role !== "host") this._fail("CLOSED");
  }

  /* Bir bağlantı koptu. HOST: o koltuğu işler — lobide koltuk boşalır, maçta
   * oyuncu grace boyunca robotuyla kalır ve süre dolunca bot devralır. Misafir:
   * tek bağlantısıdır; lobide hata, maçta iptal bildirimi gösterir. */
  _onPeerClose(peerId) {
    if (!this.session) return;
    this.peerSeats.delete(peerId);
    if (this.role !== "host") {
      if (this.game.state === "ONLINE_LOBBY") this._fail("CLOSED");
      else if (typeof this.game.onlineAbort === "function") this.game.onlineAbort("LEFT");
      return;
    }
    const res = this.session.disconnectPeer(peerId);
    if (res && res.ok && res.phase === "lobby") {
      this._notice("online.notice.left");
      this._syncPortalRoom(true);   // boşalan koltuğa yeni oyuncu katılabilir
    }
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
    if (key === "online.notice.startNeedsReady") return t("online.notice.startNeedsReady", "Tüm oyuncular hazır olunca başlar");
    if (key === "online.notice.left") return t("online.notice.left", "Bir oyuncu odadan ayrıldı");
    if (key === "online.notice.resumed") return t("online.notice.resumed", "Oyuncu maça geri döndü");
    if (key === "online.invite.failed") return t("online.invite.failed", "Kopyalanamadı — kodu elle paylaş");
    if (key === "online.notice.joined") return t("online.notice.joined", "Rakip odaya katıldı");
    if (key === "online.notice.seatsOccupied") return t("online.notice.seatsOccupied", "Bağlı oyuncu varken koltuk azaltılamaz");
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
      // `peerId`: WELCOME/ACK gibi hedefli paketler doğru bağlantıya gitsin
      // (altı koltukta yayın yapılırsa koltuk kimliği herkese sızardı).
      const res = this.session.handleHostMessage(known, msg, { peerId: from });
      if (msg && msg.t === NET_MSG.HELLO && res && res.ok) {
        this.peerSeats.set(from, res.seat);
        // Maç sırasında dönen oyuncu: dünyası (START + maske + tam durum)
        // yeniden gönderilir; oyun katmanı yoksa (henüz maç yok) sadece koltuk.
        if (res.resumed) {
          this._notice("online.notice.resumed");
          if (typeof this.game.onlineResumeSeat === "function") this.game.onlineResumeSeat(res.seat);
        } else {
          this._notice("online.notice.joined");
          this._syncPortalRoom(true);   // dolduysa isJoinable kapanır
        }
      }
      if (res && res.ok === false && res.reason) this._noteReason(res.reason);
      return;
    }
    const res = this.session.handleGuestMessage(msg);
    if (res && res.ok === false && res.reason) this._noteReason(res.reason);
    // Koltuk verilmedi (dolu oda): neden kodu gösterilir, oyuncu boş ekranda beklemez.
    if (msg && msg.t === NET_MSG.REJECT) {
      this._noteReason(msg.reason);
      if (!this.error) this._fail(String(msg.reason || "CONNECT"));
    }
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

  // Oda sahibi maçı başlatır (tüm misafir koltukları hazır olduğunda).
  startMatch() {
    if (!this.session || this.role !== "host" || !this.session.canStart()) return false;
    const roster = this._rosterFromSeats(this.session.seats);
    const map = this._mapFor();
    const res = this.session.startMatch(this.code, "auth-" + this.code, {
      turnId: 1, mapId: map ? map.id : null, roster,
    });
    if (!res.ok) { this._fail(res.reason); return false; }
    // Maç başladı: yeni oyuncu artık katılamaz.
    this._syncPortalRoom(false);
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
  /* Portaldaysa platformun DAVET bağlantısı kullanılır (CrazyGames arkadaş
   * daveti ve "arkadaşına katıl" akışı bunu bekler); yoksa kendi ?oda= linki. */
  copyInvite() {
    const portalLink = (typeof PORTAL !== "undefined" && PORTAL.isActive())
      ? PORTAL.inviteLink({ oda: this.code, roomName: this.code })
      : null;
    const url = portalLink || this._inviteUrl();
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
    if ((e.key === "r" || e.key === "R" || e.key === "c" || e.key === "C") && (!this.session || this.session.phase === NET_PHASE.LOBBY)) {
      if (this.game && typeof this.game.openOnlineRobotSelect === "function") {
        this.game.openOnlineRobotSelect();
        return true;
      }
    }
    if ((e.key === "ArrowUp" || e.key === "ArrowDown") && this.role === "host" && this.step === "room") {
      this._cycleMap(e.key === "ArrowDown" ? 1 : -1);
      return true;
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
        else if (r.action === "seat") this._notice("online.notice.seatsOccupied");
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
      else if (r.action === "robotSelect") {
        if (this.game && typeof this.game.openOnlineRobotSelect === "function") {
          this.game.openOnlineRobotSelect();
        }
      }
      else if (r.action === "mapPrev") this._cycleMap(-1);
      else if (r.action === "mapNext") this._cycleMap(1);
      else if (r.action === "seat" && Number.isInteger(r.seat)) this.setSeatCount(r.seat);
      // Tıklama alanları TÜKETİLİR: ekran değiştiyse bir sonraki kare çizilene
      // kadar eski ekranın düğmeleriyle ikinci bir eylem tetiklenmesin
      // (bayat kare → yanlış eylem).
      this._rects = [];
      if (typeof SFX !== "undefined" && SFX.uiClick) { try { SFX.uiClick(); } catch (e) { /* yoksay */ } }
      return true;
    }
    return true;   // lobi açıkken tuvale tıklama oyuna geçmez
  }

  // Karakteri doğrudan seç (robot galerisinden veya seçimden)
  selectRobot(robotIdOrChar) {
    if (!robotIdOrChar) return false;
    if (this.session && this.session.phase !== NET_PHASE.LOBBY) return false;
    const id = typeof robotIdOrChar === "string" ? robotIdOrChar : robotIdOrChar.id;
    const idx = CHARACTERS.findIndex((c) => c.id === id);
    if (idx < 0) return false;
    this.robotIndex = idx;
    this.robotId = CHARACTERS[idx].id;
    if (!this.session) return true;
    if (this.role === "host") {
      if (this.session.seats[0]) this.session.seats[0].robotId = this.robotId;
      this.session.lobbyRoster = this._rosterFromSeats(this.session.seats);
      this.session.revision++;
      this.session.broadcastLobby();
      return true;
    }
    this.session.sendHello({ robotId: this.robotId, seatToken: this._storedSeatToken() });
    return true;
  }

  _cycleRobot(dir) {
    // Maç kurulduktan sonra kadro sabitlenir; seçici yalnız lobide serbest.
    if (this.session && this.session.phase !== NET_PHASE.LOBBY) return;
    const nextIdx = (this.robotIndex + dir + CHARACTERS.length) % CHARACTERS.length;
    this.selectRobot(CHARACTERS[nextIdx]);
  }

  _cycleMap(dir) {
    if (this.role !== "host" || !this.session || this.session.phase !== NET_PHASE.LOBBY) return;
    const index = Math.max(0, MAPS.findIndex((map) => map.id === this.mapId));
    this.mapId = MAPS[(index + dir + MAPS.length) % MAPS.length].id;
    this.session.lobbyMapId = this.mapId;
    this.session.revision++;
    this.session.broadcastLobby();
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
    const backdrop = this.step === "role" ? "menu/key-art-menu-online-role"
      : this.step === "code" ? "menu/key-art-menu-online-code"
        : "menu/key-art-loading-yard";
    _msKeyArtBackdrop(ctx, L.W, L.H, backdrop, this.game.renderTimeMs || 0);
    this._renderCyberBackdrop(ctx, L);
    this._renderHeader(ctx, L);

    if (this.step === "role") this._renderRole(ctx, L);
    else if (this.step === "code") this._renderCode(ctx, L);
    else this._renderRoom(ctx, L);

    this._renderStatus(ctx, L);
  }

  // Atmosferik siber radar/ağ arkaplanı
  _renderCyberBackdrop(ctx, L) {
    ctx.save();
    const cx = L.cx, cy = Math.round(L.H * 0.44);
    const time = (this.game.renderTimeMs || 0) * 0.001;

    // Hafif konsantrik radar halkaları
    ctx.lineWidth = 1;
    for (let r = 80; r <= 280; r += 70) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(79, 195, 247, 0.035)";
      ctx.stroke();
    }

    // Çapraz hafif hedef/eksen çizgileri
    ctx.strokeStyle = "rgba(79, 195, 247, 0.03)";
    ctx.beginPath();
    ctx.moveTo(cx - 300, cy); ctx.lineTo(cx + 300, cy);
    ctx.moveTo(cx, cy - 180); ctx.lineTo(cx, cy + 180);
    ctx.stroke();

    // Dönen mini açı göstergesi (radar sweep)
    ctx.beginPath();
    const a1 = time * 0.3;
    ctx.arc(cx, cy, 210, a1, a1 + Math.PI * 0.25);
    ctx.strokeStyle = "rgba(123, 220, 142, 0.06)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  // Başlık bloğu: sağ üst denetimlerinin dışında kalan alanda ortalanır.
  _renderHeader(ctx, L) {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Üst ağ durumu göstergesi
    ctx.fillStyle = "#7bdc8e";
    ctx.font = uiTextFont(10, 700);
    ctx.fillText(t("online.modeBadge", "● P2P ÇEVRİMİÇİ AĞI"), L.cx, 16);

    const size = L.safeW < 560 ? 22 : 28;
    ctx.fillStyle = "#000000aa"; ctx.font = uiTitleFont(size);
    ctx.fillText(t("online.title", "ÇEVRİMİÇİ"), L.cx + 2, 34);
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(size);
    ctx.fillText(t("online.title", "ÇEVRİMİÇİ"), L.cx, 32);
    ctx.fillStyle = "#cfe0ee"; ctx.font = uiTextFont(12);
    const sub = _fitTextLines(ctx, t("online.subtitle", "Aynı oda kodundaki operatörler — internet üzerinden (2–6)"),
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
    const bh = Math.max(118, Math.min(160, Math.round(L.H * 0.29)));
    const y = Math.max(L.top + 36, Math.round(L.H * 0.28));
    const x1 = L.cx - bw - gap / 2, x2 = L.cx + gap / 2;
    this._button(ctx, { x: x1, y, w: bw, h: bh, action: "host" }, {
      title: t("online.role.host", "ODA KUR"),
      sub: t("online.role.host.sub", "Kod üret, arkadaşını davet et"),
      accent: "#4fc3f7",
      badge: t("online.role.hostBadge", "YENİ ODA"),
      iconKind: "ağ",
    });
    this._button(ctx, { x: x2, y, w: bw, h: bh, action: "join" }, {
      title: t("online.role.join", "KODA KATIL"),
      sub: t("online.role.join.sub", "Arkadaşının kodunu yaz"),
      accent: "#7bdc8e",
      badge: t("online.role.joinBadge", "KODLA GİR"),
      iconKind: "ağ",
    });
    // Robot seçici kartların altında, alt şeride (geri düğmesi) değmeyecek yerde.
    const pickerY = Math.min(y + bh + 16, L.H - 146);
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
    /* 2–6 koltuk (F4): sabit 54 px satır altı koltuğa sığmaz ve panel alttaki
     * AYRIL düğmesini/ipucu şeridini örtüyordu. Satır yüksekliği kalan
     * yükseklikten türetilir (alt sınır 26 px: robot + iki satır metin).
     * DAR dünyada (telefon, dikey pencere) 4+ koltuk İKİ SÜTUNA bölünür;
     * aksi hâlde altı satır kod/düğme bloğunu aşağı itip ekrandan taşıyordu. */
    const cols = !L.wide && rows.length >= 4 ? 2 : 1;
    const rowsPerCol = Math.ceil(rows.length / cols);
    const topMin = L.wide ? L.top + 12 : Math.max(L.top + 8, 92);
    const reserve = L.wide ? 130 : 200;
    const avail = Math.max(150, L.H - topMin - reserve);
    const rowH = Math.max(26, Math.min(54, Math.floor((avail - 38) / Math.max(2, rowsPerCol))));
    const seatsH = 38 + rowsPerCol * rowH;
    if (L.wide) {
      // İki sütunlu blok ORTALANIR: çok geniş dünyada (ultra geniş ekran) sol
      // kenara yapışıp sağda büyük boşluk bırakmasın.
      const colW = Math.min(400, Math.round((L.contentW - 24) * 0.55));
      const rw = Math.min(320, L.contentW - colW - 24);
      const blockW = colW + 24 + rw;
      const x0 = Math.round(L.cx - blockW / 2);
      // Dikey ortalama: koltuk panelinin GERÇEK yüksekliğine göre.
      // Başlık ile oda içeriği arasındaki boşluğu azaltıp alt durum satırını aç.
      const top = Math.max(L.top + 12, Math.round((L.H - seatsH) / 2) - 60);
      this._renderSeats(ctx, { x: x0, y: top, w: colW, h: seatsH, rowH, cols }, rows);
      const infoX = x0 + colW + 24;
      // Kod, robot ve harita metinleri key art üzerinde kaybolmasın; aynı
      // panel zemini bu sütunu tek bir okunur oda konsolu olarak toplar.
      _csPanel(ctx, infoX, top, rw, Math.min(560, L.H - top - 58), {
        accent: "#2a3848", fillTop: "#111b27",
      });
      this._renderRoomInfo(ctx, L, infoX + rw / 2, top + 12, rw, L.H < 700);
    } else {
      // Dar dünya: koltuklar üstte, kod/düğmeler altta (kompakt).
      const top = Math.max(L.top + 8, 92);
      this._renderSeats(ctx, { x: L.margin, y: top, w: L.contentW, h: seatsH, rowH, cols }, rows);
      this._renderRoomInfo(ctx, L, L.cx, top + seatsH + 8, L.contentW, true);
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
    /* Kapasite (F4): host 2–6 arasında seçer; misafir yalnız toplamı görür.
     * Bağlı koltuk sayısının altındaki değerler DEVRE DIŞI — koltukları
     * düşürmek oturumda reddedilir, düğme bunu önceden gösterir. */
    const seatTotal = this.session && this.session.seats ? this.session.seats.length : NET_MIN_SEATS;
    if (this.role === "host") {
      const claimed = this.session ? this.session.seats.filter((s) => s.claimed).length : 1;
      const bw = 22, gap = 4;
      const right = rect.x + rect.w - 12;
      for (let n = NET_MIN_SEATS; n <= NET_MAX_SEATS; n++) {
        const x = right - (NET_MAX_SEATS - n + 1) * (bw + gap) + gap;
        const on = n === seatTotal;
        const disabled = n < claimed;
        _csPanel(ctx, x, rect.y + 8, bw, 18, {
          variant: "control",
          accent: disabled ? "#2a3848" : on ? "#ffe45e" : "#3b526b", selected: on, disabled,
        });
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        // Seçili düğme AÇIK sarı zemin değil yalnız vurgu çerçevesi çizer;
        // koyu metin okunmuyordu (seçili "6" boş kutu gibi görünüyordu).
        ctx.fillStyle = disabled ? "#5e7488" : on ? "#ffe45e" : "#cfe0ee";
        ctx.font = uiTextFont(11, 700);
        ctx.fillText(String(n), x + bw / 2, rect.y + 17);
        this._rects.push({ x, y: rect.y + 8, w: bw, h: 18, action: "seat", seat: n, disabled });
      }
    } else {
      ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.fillStyle = "#5e7488"; ctx.font = uiTextFont(10, 700);
      ctx.fillText(t("online.seats.capacity", "KOLTUK {n}", { n: seatTotal }), rect.x + rect.w - 14, rect.y + 13);
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowH = rect.rowH || 54;
      const cols = rect.cols || 1;
      const rowsPerCol = Math.ceil(rows.length / cols);
      const col = Math.floor(i / rowsPerCol);
      const rowIdx = i % rowsPerCol;
      const cardW = Math.floor((rect.w - 24 - (cols - 1) * 8) / cols);
      const cardX = rect.x + 12 + col * (cardW + 8);
      const ry = rect.y + 32 + rowIdx * rowH;
      const cy = ry + (rowH - 4) / 2;
      _csPanel(ctx, cardX, ry, cardW, rowH - 4, {
        accent: row.you ? "#ffe45e" : row.claimed ? "#4fc3f7" : "#2a3848",
        fillTop: row.you ? "#233046" : "#161f2a",
      });
      const ch = row.robotId ? CHARACTERS.find((c) => c.id === row.robotId) : null;
      if (ch) {
        drawRobot(ctx, {
          cx: cardX + 30, cy, r: Math.max(7, Math.min(11, (rowH - 12) / 2)), facing: 1, charDef: ch,
          timeMs: this.game.renderTimeMs || 0,
          motion: { vx: 0, vy: 0, onGround: true },
        });
      }
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = ch ? "#eef5ff" : "#7f93a6";
      ctx.font = uiTitleFont(rowH < 40 ? 11 : 13);
      ctx.fillText(ch ? ch.label : t("online.seat.empty", "Bekleniyor…"), cardX + 56, ry + rowH * 0.33);
      ctx.fillStyle = "#8fa6bd"; ctx.font = uiTextFont(rowH < 40 ? 9 : 11);
      // Kalabalık odada "MİSAFİR" tekrarı yerine koltuk numarası okunur.
      const roleLabel = row.host
        ? t("online.seat.host", "ODA SAHİBİ")
        : rows.length > 2
          ? t("online.seat.number", "KOLTUK {n}", { n: row.playerIdx + 1 })
          : t("online.seat.guest", "MİSAFİR");
      ctx.fillText(roleLabel, cardX + 56, ry + rowH * 0.7);
      const badge = !row.claimed ? t("online.seat.waiting", "BAĞLANMADI")
        : row.bot ? t("online.seat.bot", "BOT")
        : row.ready ? t("online.seat.ready", "HAZIR")
        : t("online.seat.notReady", "HAZIR DEĞİL");
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillStyle = !row.claimed ? "#7f93a6" : row.bot ? "#c89bff" : row.ready ? "#7bdc8e" : "#ffd24a";
      ctx.font = uiTextFont(rowH < 40 ? 9 : 11, 700);
      ctx.fillText(badge, cardX + cardW - 12, row.you ? cy - 4 : cy);
      if (row.you) {
        ctx.fillStyle = "#ffe45e"; ctx.font = uiTextFont(9, 700);
        ctx.fillText(t("online.seat.you", "SEN"), cardX + cardW - 12, ry + rowH - 12);
      }
    }
  }

  /* Oda kodu + davet/hazır/başlat düğmeleri + robot seçici. `compact` (dar
   * yerleşim) kısa aralıklar ve tek satırlık robot seçici kullanır. */
  _renderRoomInfo(ctx, L, cx, y, w, compact) {
    const bw = Math.min(400, w);
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
        title: can ? t("online.start", "MAÇI BAŞLAT") : t("online.startWait", "Tüm oyuncular hazır olunca başlar"),
        accent: can ? "#ffe45e" : "#3b526b", small: true, disabled: !can,
      });
      const pickerY = by + bh * 2 + 26;
      this._renderRobotPicker(ctx, cx, pickerY, undefined, compact, bw);
      const map = this._mapFor();
      const mapY = pickerY + (compact ? 88 : 140);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(10, 700);
      this._button(ctx, { x: cx - 142, y: mapY, w: 28, h: 28, action: "mapPrev" }, { title: "‹", small: true, accent: "#4fc3f7" });
      this._button(ctx, { x: cx + 114, y: mapY, w: 28, h: 28, action: "mapNext" }, { title: "›", small: true, accent: "#4fc3f7" });
      ctx.fillStyle = map ? map.accent : "#eef5ff"; ctx.font = uiTitleFont(11);
      ctx.fillText(map ? map.label : "—", cx, mapY + 14);
      if (map) this._renderMapPreview(ctx, cx, mapY + (compact ? 32 : 34), w, map, compact ? 56 : 96);
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
    const pickerY = by + bh + (compact ? 24 : 28);
    this._renderRobotPicker(ctx, cx, pickerY, undefined, compact, bw);
    const state = this.session && this.session.lobbyState;
    const map = MAPS.find((entry) => entry.id === (state && state.mapId)) || MAPS[0];
    const mapY = pickerY + (compact ? 88 : 140);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#8fa6bd"; ctx.font = uiTextFont(10);
    const mapTitle = t("online.map.title", "HARİTA");
    ctx.fillText(mapTitle + ": " + (map ? map.label : "—"), cx, mapY);
    if (map) this._renderMapPreview(ctx, cx, mapY + (compact ? 32 : 22), w, map, compact ? 56 : 96);
  }

  _renderMapPreview(ctx, cx, y, maxW, map, height) {
    const previewW = Math.min(400, maxW);
    const previewH = height || 96;
    const x = cx - previewW / 2;
    _csPanel(ctx, x - 3, y - 3, previewW + 6, previewH + 6, { accent: map.accent });
    const mapArt = map.keyArt && typeof assetImage === "function" ? assetImage(map.keyArt) : null;
    if (mapArt) {
      const scale = Math.max(previewW / mapArt.naturalWidth, previewH / mapArt.naturalHeight);
      const sw = previewW / scale, sh = previewH / scale;
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, previewW, previewH); ctx.clip();
      ctx.drawImage(mapArt, (mapArt.naturalWidth - sw) / 2, (mapArt.naturalHeight - sh) / 2,
        sw, sh, x, y, previewW, previewH);
      ctx.restore();
    } else {
      drawMapPreview(ctx, x, y, previewW, previewH, map);
    }
  }

  /* Robot seçici ve Hangar Podu.
   * `compact` (dar yerleşim): yatay kompakt konsol.
   * Normal mod: Tam Hangar İstasyonu; robot önizlemesi, modül bilgisi,
   * hızlı gezinme okları ve tam robotlar sayfasını açan "ROBOT DEĞİŞTİR" butonu. */
  _renderRobotPicker(ctx, cx, y, interactive, compact, maxW) {
    const ch = this.robot;
    if (!ch) return;
    if (interactive === undefined) {
      interactive = !this.session || this.session.phase === NET_PHASE.LOBBY;
    }
    const L = this._layout();
    const maxAllowed = maxW ? Math.min(maxW, L.contentW) : L.contentW;

    if (compact) {
      const pw = Math.min(290, maxAllowed);
      const ph = 70;
      const px = Math.round(cx - pw / 2);
      const mx = this.game.input.mouseX, my = this.game.input.mouseY;
      const podHov = interactive && mx >= px && mx <= px + pw && my >= y && my <= y + ph;

      _csPanel(ctx, px, y, pw, ph, {
        accent: podHov ? "#ffe45e" : "#2a3848",
        hover: podHov, glow: podHov,
      });

      if (interactive) {
        this._button(ctx, { x: px + 6, y: y + 19, w: 24, h: 32, action: "robotPrev" }, { title: "‹", small: true, accent: "#4fc3f7" });
        this._button(ctx, { x: px + 64, y: y + 19, w: 24, h: 32, action: "robotNext" }, { title: "›", small: true, accent: "#4fc3f7" });
      }

      // Seçili robotun splash art'ı; görsel yüklenene kadar çizimli robot yedeği.
      const rx = px + 47, ry = y + 35;
      if (!this._drawRobotSplash(ctx, ch, px + 30, y + 9, 52, 4)) {
        ctx.save();
        ctx.fillStyle = _hexA(ch.color || "#4fc3f7", 0.18);
        ctx.beginPath();
        ctx.ellipse(rx, ry + 12, 16, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawRobot(ctx, {
          cx: rx, cy: ry, r: 18, facing: 1, charDef: ch,
          timeMs: this.game.renderTimeMs || 0,
          motion: { vx: 0, vy: 0, onGround: true },
          parts: this.game.profile ? getRobotProgress(this.game.profile, ch.id).loadout : null,
        });
      }

      // İsim + rol
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillStyle = "#eef5ff"; ctx.font = uiTitleFont(12);
      ctx.fillText(ch.label, px + 94, y + 17);
      ctx.fillStyle = ch.color || "#8fa6bd"; ctx.font = uiTextFont(10, 700);
      ctx.fillText(`[ ${ch.role} ]`, px + 94, y + 39);

      if (interactive) {
        const btnW = Math.min(76, Math.floor(pw * 0.28));
        const btnX = px + pw - btnW - 6, btnY = y + 21;
        this._button(ctx, { x: btnX, y: btnY, w: btnW, h: 28, action: "robotSelect" }, {
          title: t("online.robot.select", "ROBOT SEÇ"),
          accent: "#ffe45e",
          small: true,
        });
      }
      return;
    }

    // Normal mod: Hangar Robot İstasyonu Podu
    const podW = Math.min(460, maxAllowed);
    const podH = 126;
    const podX = Math.round(cx - podW / 2);
    const podY = y;
    const mx = this.game.input.mouseX, my = this.game.input.mouseY;
    const podHovered = interactive && mx >= podX && mx <= podX + podW && my >= podY && my <= podY + podH;

    _csPanel(ctx, podX, podY, podW, podH, {
      accent: podHovered ? "#ffe45e" : (ch.color || "#4fc3f7"),
      hover: podHovered, glow: podHovered,
    });

    const isNarrow = podW < 370;
    const pedX = podX + (isNarrow ? 48 : 66);
    const pedY = podY + 58;
    const pedPulse = Math.sin((this.game.renderTimeMs || 0) * 0.004) * 0.15 + 0.85;
    const splashArt = typeof assetImage === "function" ? assetImage("splashes/" + ch.id) : null;

    if (!splashArt) {
      // Holografik podyum yalnızca çizimli robot yedeğinde görünür.
      ctx.save();
      ctx.fillStyle = _hexA(ch.color || "#4fc3f7", 0.18 * pedPulse);
      ctx.beginPath();
      ctx.ellipse(pedX, pedY + 12, isNarrow ? 24 : 32, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = _hexA(ch.color || "#4fc3f7", 0.5 * pedPulse);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // Hızlı gezinme butonları (robotPrev / robotNext)
    if (interactive) {
      if (isNarrow) {
        this._button(ctx, { x: podX + 6, y: podY + 34, w: 22, h: 30, action: "robotPrev" }, { title: "‹", small: true, accent: "#4fc3f7" });
        this._button(ctx, { x: podX + 82, y: podY + 34, w: 22, h: 30, action: "robotNext" }, { title: "›", small: true, accent: "#4fc3f7" });
      } else {
        this._button(ctx, { x: podX + 8, y: podY + 32, w: 26, h: 32, action: "robotPrev" }, { title: "‹", small: true, accent: "#4fc3f7" });
        this._button(ctx, { x: podX + 116, y: podY + 32, w: 26, h: 32, action: "robotNext" }, { title: "›", small: true, accent: "#4fc3f7" });
      }
    }

    // Karakter splash art'ı; görsel yüklenene kadar çizimli robot yedeği.
    const bob = Math.sin((this.game.renderTimeMs || 0) * 0.003) * 2;
    const splashSize = isNarrow ? 58 : 108;
    const splashX = podX + (isNarrow ? 30 : 34);
    const splashY = podY + (isNarrow ? 30 : 8);
    if (!this._drawRobotSplash(ctx, ch, splashX, splashY, splashSize, 5, splashArt)) {
      drawRobot(ctx, {
        cx: pedX, cy: pedY - 6 + bob, r: isNarrow ? 13 : 15, facing: 1, charDef: ch,
        timeMs: this.game.renderTimeMs || 0,
        motion: { vx: 0, vy: 0, onGround: true },
        parts: this.game.profile ? getRobotProgress(this.game.profile, ch.id).loadout : null,
      });
    }

    // Robot Detayları (orta blok)
    const infoX = podX + (isNarrow ? 110 : 150);
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillStyle = "#8fa6bd"; ctx.font = uiTextFont(10, 700);
    ctx.fillText(t("online.robot.title", "ROBOTUN"), infoX, podY + 12);

    ctx.fillStyle = ch.color || "#ffe45e"; ctx.font = uiTextFont(10, 700);
    ctx.fillText(`[ ${ch.role} ]`, infoX + 64, podY + 12);

    ctx.fillStyle = "#ffffff"; ctx.font = uiTitleFont(isNarrow ? 14 : 16);
    ctx.fillText(ch.label, infoX, podY + 28);

    ctx.fillStyle = "#ffe45e"; ctx.font = uiTextFont(10, 700);
    ctx.fillText(`[Q] ${ch.skill ? ch.skill.label : ""}`, infoX, podY + 48);

    ctx.fillStyle = "#8fa6bd"; ctx.font = uiTextFont(9);
    ctx.fillText(t("online.robot.hint", "◀ ▶ ile değiştir"), infoX, podY + 66);

    // Sağ blok: "ROBOT DEĞİŞTİR" butonu
    if (interactive) {
      const btnW = isNarrow ? Math.min(96, Math.floor(podW * 0.28)) : Math.min(134, Math.floor(podW * 0.32));
      const btnH = 34;
      const btnX = podX + podW - btnW - (isNarrow ? 8 : 12);
      const btnY = podY + 28;
      this._button(ctx, { x: btnX, y: btnY, w: btnW, h: btnH, action: "robotSelect" }, {
        title: isNarrow ? t("online.robot.select", "ROBOT SEÇ") : t("online.robot.change", "ROBOT DEĞİŞTİR"),
        accent: "#ffe45e",
        small: true,
      });

      if (!isNarrow) {
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillStyle = "#6d8294"; ctx.font = uiTextFont(9);
        ctx.fillText(t("online.robot.viewAll", "Tüm robotları gör ve seç"), btnX + btnW / 2, btnY + btnH + 6);
      }
    }
  }

  _drawRobotSplash(ctx, ch, x, y, size, radius, splash) {
    splash = splash || (typeof assetImage === "function" ? assetImage("splashes/" + ch.id) : null);
    if (!splash) return false;
    ctx.save();
    _csRoundRect(ctx, x, y, size, size, radius);
    ctx.clip();
    ctx.drawImage(splash, x, y, size, size);
    ctx.restore();
    _csRoundRect(ctx, x, y, size, size, radius);
    ctx.strokeStyle = _hexA(ch.color || "#4fc3f7", 0.85);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return true;
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
        playerIdx: s.playerIdx, claimed: s.claimed, ready: s.ready, bot: s.bot,
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
      playerIdx: s.playerIdx, claimed: s.claimed, ready: s.ready, bot: s.bot,
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
      variant: "control",
      accent: hovered ? (o.accent || "#ffe45e") : _hexA(o.accent || "#3b526b", 0.6),
      hover: hovered, glow: hovered, disabled: o.disabled,
    });
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (o.sub) {
      // Köşe tırnakları (sci-fi panel çerçevesi)
      const bLen = 8;
      ctx.save();
      ctx.strokeStyle = _hexA(hovered ? (o.accent || "#ffe45e") : "#3b526b", hovered ? 0.9 : 0.45);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rect.x + 4, rect.y + 4 + bLen); ctx.lineTo(rect.x + 4, rect.y + 4); ctx.lineTo(rect.x + 4 + bLen, rect.y + 4);
      ctx.moveTo(rect.x + rect.w - 4 - bLen, rect.y + 4); ctx.lineTo(rect.x + rect.w - 4, rect.y + 4); ctx.lineTo(rect.x + rect.w - 4, rect.y + 4 + bLen);
      ctx.moveTo(rect.x + 4, rect.y + rect.h - 4 - bLen); ctx.lineTo(rect.x + 4, rect.y + rect.h - 4); ctx.lineTo(rect.x + 4 + bLen, rect.y + rect.h - 4);
      ctx.moveTo(rect.x + rect.w - 4 - bLen, rect.y + rect.h - 4); ctx.lineTo(rect.x + rect.w - 4, rect.y + rect.h - 4); ctx.lineTo(rect.x + rect.w - 4, rect.y + rect.h - 4 - bLen);
      ctx.stroke();

      if (o.badge) {
        ctx.font = uiTextFont(9, 700);
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillStyle = o.accent || "#4fc3f7";
        ctx.fillText(`[ ${o.badge} ]`, rect.x + rect.w - 12, rect.y + 8);
      }
      ctx.restore();

      // Rol kartı: ikon + başlık + alt yazı (yükseklikle ölçeklenir).
      const iconY = rect.y + Math.min(34, Math.round(rect.h * 0.22));
      _msIcon(ctx, o.iconKind || "ağ", rect.x + rect.w / 2, iconY, o.accent || "#4fc3f7", hovered);
      ctx.fillStyle = o.disabled ? "#7f93a6" : "#eef5ff";
      ctx.font = uiTextFont(rect.w < 220 ? 16 : 19, 700);
      ctx.fillText(o.title, rect.x + rect.w / 2, rect.y + rect.h / 2 - 12);
      ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(11);
      const sub = _fitTextLines(ctx, o.sub, rect.w - 16, 11, (p) => uiTextFont(p), 2, 9);
      for (let i = 0; i < sub.lines.length; i++) ctx.fillText(sub.lines[i], rect.x + rect.w / 2, rect.y + rect.h / 2 + 14 + i * 12);
    } else {
      ctx.fillStyle = o.disabled ? "#7f93a6" : "#eef5ff";
      const size = o.small ? 13 : 16;
      const fit = _fitTextLines(ctx, o.title, rect.w - 14, size, (px) => uiTextFont(px, 700), 1, 9);
      ctx.font = uiTextFont(fit.px, 700);
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

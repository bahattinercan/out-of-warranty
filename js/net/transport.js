/* Çevrimiçi taşıma katmanı (F3c) — protokol/oturum çekirdeğinden bağımsız.
 *
 * Arayüz çok küçüktür ve bilinçli olarak dar tutulur (docs/web-launch-plan.md
 * §4: "oyun kodu taşımadan bağımsız kalsın"): bir uç mesaj gönderir, karşı uç
 * mesaj alır. Protokol, tekilleştirme ve sıra denetimi bu katmanın işi DEĞİL
 * (bkz. js/net/protocol.js, js/net/session.js).
 *
 * Üç uygulama:
 *   - LoopbackTransport: iki uç aynı süreçte (testler + aynı makinede iki sekme
 *     provası). Gecikme ve kayıp simüle edilebilir; deterministik RNG enjekte
 *     edilir.
 *   - PeerJsTransport: PeerJS bulut sinyalleşmesi + WebRTC veri kanalı. PeerJS
 *     CDN'den gelmezse (çevrimdışı, file:// kısıtı) uç kurulmaz ve durum
 *     "unavailable" olur — oyun çevrimdışı modlarla devam eder.
 *   - (Yedek) manuel kod: F3c'nin sonraki adımı; arayüz aynı kaldığı için
 *     taşıma değişse bile oyun kodu değişmez.
 *
 * Not: PeerJS v1 tek (güvenilir) veri kanalı verir; "güvenilmez" mesajlar ağ
 * düzeyinde değil UYGULAMA düzeyinde elenir (protokoldeki `seq` sayesinde eski
 * paket uygulanmaz). Bu yüzden `reliable` bayrağı taşımada saklanır ama kanal
 * seçimi yapmaz; ileride çift kanal desteklenirse burada kullanılır.
 *
 * Çok koltuk (F4): host birden çok misafir bağlantısı tutar. `send()` YAYIN
 * yapar (herkese), `sendTo(peerId, ...)` TEK hedefe gönderir. Hedefli gönderim
 * olmadan WELCOME gibi koltuk kimliği taşıyan paketler bütün misafirlere gider
 * ve yeni katılan oyuncunun kimliği başkalarına sızardı. Bağlantı kapanınca
 * `onPeerClose(peerId)` yayınlanır; oturum bunu kopan KOLTUĞA çevirir.
 */

const NET_TRANSPORT_STATUS = {
  IDLE: "idle",
  CONNECTING: "connecting",
  OPEN: "open",
  CLOSED: "closed",
  ERROR: "error",
  UNAVAILABLE: "unavailable",   // taşıma kullanılamıyor (ör. PeerJS yok)
};

// ── Ortak taban ─────────────────────────────────────────────────────────────

class NetTransport {
  constructor(opts) {
    const o = opts || {};
    this.status = NET_TRANSPORT_STATUS.IDLE;
    this.lastError = null;
    this._handlers = { message: [], status: [], peerClose: [] };
    this.onLog = o.onLog || (() => {});
  }
  onMessage(fn) { this._handlers.message.push(fn); return this; }
  onStatus(fn) { this._handlers.status.push(fn); return this; }
  onPeerClose(fn) { this._handlers.peerClose.push(fn); return this; }
  _emitMessage(from, msg) {
    for (const fn of this._handlers.message) fn(from, msg);
  }
  _setStatus(status, detail) {
    this.status = status;
    for (const fn of this._handlers.status) fn(status, detail);
  }
  // Tek bağlantı koptu (host: bir misafir ayrıldı; oturum yine açık kalır).
  _emitPeerClose(peerId) {
    for (const fn of this._handlers.peerClose) fn(peerId);
  }
  // Alt sınıflar uygular.
  send() { return { ok: false, reason: "NOT_IMPLEMENTED" }; }
  sendTo() { return { ok: false, reason: "NOT_IMPLEMENTED" }; }
  peers() { return []; }
  close() {}
  isOpen() { return this.status === NET_TRANSPORT_STATUS.OPEN; }
}

// ── Döngü taşıması (aynı süreç, iki uç) ─────────────────────────────────────

/* `pair()` iki uç üretir: A'dan gönderilen mesaj B'ye düşer. Gecikme ve kayıp
 * simülasyonu sayesinde sırasız/eksik paket davranışı testlerde ölçülebilir.
 * `schedule(fn, ms)` enjekte edilir: testler sanal zamanı ilerletir (gerçek
 * setTimeout kullanılmaz). */
class LoopbackTransport extends NetTransport {
  constructor(opts) {
    super(opts);
    const o = opts || {};
    this.latencyMs = o.latencyMs || 0;
    this.lossRate = o.lossRate || 0;          // yalnız güvenilmez mesajlarda
    this.rng = o.rng || Math.random;
    this.schedule = o.schedule || ((fn) => fn());
    this.name = o.name || "loopback";
    this.other = null;
    // Host tarafı çok koltuk: `others` doluysa gönderim YAYINA dönüşür.
    this.others = null;
    this.pending = 0;
  }
  static pair(optsA, optsB) {
    const a = new LoopbackTransport(Object.assign({ name: "a" }, optsA || {}));
    const b = new LoopbackTransport(Object.assign({ name: "b" }, optsB || {}));
    a.other = b;
    b.other = a;
    a._setStatus(NET_TRANSPORT_STATUS.OPEN);
    b._setStatus(NET_TRANSPORT_STATUS.OPEN);
    return [a, b];
  }
  _targets() {
    if (this.others && this.others.length) return this.others;
    return this.other ? [this.other] : [];
  }
  peers() {
    return this._targets().map((t) => t.name);
  }
  _deliverTo(target, msg) {
    const deliver = () => {
      this.pending--;
      if (target.status !== NET_TRANSPORT_STATUS.OPEN) return;
      target._emitMessage(this.name, msg);
    };
    if (this.latencyMs > 0) this.schedule(deliver, this.latencyMs);
    else deliver();
  }
  _sendToTargets(targets, payload, reliable) {
    if (!targets.length || this.status !== NET_TRANSPORT_STATUS.OPEN) {
      return { ok: false, reason: "NOT_OPEN" };
    }
    if (!reliable && this.lossRate > 0 && this.rng() < this.lossRate) {
      return { ok: true, dropped: true };
    }
    for (const target of targets) {
      this.pending++;
      this._deliverTo(target, payload);
    }
    return { ok: true, delivered: targets.length };
  }
  send(type, payload, reliable) {
    return this._sendToTargets(this._targets(), payload, reliable);
  }
  sendTo(peerId, type, payload, reliable) {
    const target = this._targets().filter((t) => t.name === peerId)[0] || null;
    if (!target) return { ok: false, reason: "NO_SUCH_PEER" };
    return this._sendToTargets([target], payload, reliable);
  }
  // Test yardımcısı: bekleyen teslimat var mı (gecikmeli taşımada).
  hasPending() { return this.pending > 0; }
  close() {
    const wasOpen = this.status === NET_TRANSPORT_STATUS.OPEN;
    this._setStatus(NET_TRANSPORT_STATUS.CLOSED);
    if (!wasOpen) return;
    if (this.other) this.other._dropLink(this.name);
    for (const t of this.others || []) t._dropLink(this.name);
  }
  /* Karşı uç bu bağlantıyı kaybetti. Host havuzunda (`others`) yalnız İLGİLİ
   * bağlantı düşer; taşıma AÇIK kalır çünkü gerçek PeerJS'te host peer'i
   * yaşamaya devam eder ve boşalan koltuğa yeni oyuncu bağlanabilir (F4).
   * Havuzsuz ikili eşleşmede ise karşı uç da kapanır. */
  _dropLink(name) {
    this._emitPeerClose(name);
    if (this.others) {
      const i = this.others.findIndex((t) => t.name === name);
      if (i >= 0) this.others.splice(i, 1);
      return;
    }
    this._setStatus(NET_TRANSPORT_STATUS.CLOSED, { reason: "PEER_CLOSED" });
  }
}

/* Host + N misafir döngü taşıması (F4): altı oyunculu akışı ve kopma
 * senaryolarını tarayıcısız sınamak için. Host `send()` yayın yapar,
 * `sendTo(name, ...)` tek misafire gider; bir misafiri `close()` etmek diğer
 * koltukları ETKİLEMEZ (gerçek WebRTC davranışı). */
class LoopbackHub {
  constructor(opts) {
    const o = opts || {};
    this.host = new LoopbackTransport({
      name: "host", latencyMs: o.latencyMs, lossRate: o.lossRate,
      rng: o.rng, schedule: o.schedule,
    });
    this.host.others = [];
    this.host._setStatus(NET_TRANSPORT_STATUS.OPEN);
  }
  addGuest(name, opts) {
    const g = new LoopbackTransport(Object.assign({ name: name }, opts || {}));
    g.other = this.host;
    g._setStatus(NET_TRANSPORT_STATUS.OPEN);
    this.host.others.push(g);
    return g;
  }
  close() {
    this.host.close();
  }
}

// ── PeerJS taşıması ────────────────────────────────────────────────────────

/* `peerFactory(id)` enjekte edilebilir: gerçek kullanımda `(id) => new Peer(id)`,
 * testlerde sahte Peer nesnesi. Böylece PeerJS çevrimiçi olmadan da mesaj akışı
 * ve yeniden bağlanma davranışı sınanabilir. */
class PeerJsTransport extends NetTransport {
  constructor(opts) {
    super(opts);
    const o = opts || {};
    this.roomCode = o.roomCode || null;
    this.role = o.role === "guest" ? "guest" : "host";
    // ICE sunucuları: STUN her zaman, TURN (ücretsiz yedek) yapılandırıldıysa
    // eklenir. Verilmezse PeerJS kendi varsayılanını kullanır.
    this.iceServers = o.iceServers || null;
    this.peerFactory = o.peerFactory || (typeof Peer !== "undefined"
      ? (id) => (this.iceServers ? new Peer(id, { config: { iceServers: this.iceServers } }) : new Peer(id))
      : null);
    this.hostId = o.hostId || null;           // misafir: hostun peer kimliği
    this.connection = null;                   // misafir: tek bağlantı (uyum)
    this.conns = new Map();                   // host: peer kimliği → bağlantı
    this.peer = null;
    this.remoteId = null;
  }
  peers() { return [...this.conns.keys()]; }
  // Taşıma kullanılabilir mi? (PeerJS CDN yüklendi mi)
  static available() {
    return typeof Peer !== "undefined";
  }
  open() {
    if (!this.peerFactory) {
      this._setStatus(NET_TRANSPORT_STATUS.UNAVAILABLE, { reason: "NO_PEERJS" });
      return { ok: false, reason: "NO_PEERJS" };
    }
    this._setStatus(NET_TRANSPORT_STATUS.CONNECTING);
    try {
      // Oda kodu doğrudan peer kimliği olarak kullanılır (host) — kod hem kısa
      // hem de tahmin edilemez olmalı; üretimi arayüz katmanının işidir.
      this.peer = this.peerFactory(this.role === "host" ? this.roomCode : undefined);
    } catch (e) {
      this.lastError = String(e && e.message ? e.message : e);
      this._setStatus(NET_TRANSPORT_STATUS.ERROR, { reason: "PEER_INIT" });
      return { ok: false, reason: "PEER_INIT" };
    }
    this.peer.on("open", (id) => {
      this.remoteId = id;
      this.onLog("peer açıldı: " + id);
      if (this.role === "host") this._setStatus(NET_TRANSPORT_STATUS.OPEN, { id });
      else this._connectToHost();
    });
    this.peer.on("connection", (conn) => this._bindConnection(conn));
    this.peer.on("error", (err) => {
      this.lastError = String(err && err.type ? err.type : err);
      // "peer-unavailable": oda kodu yok/yanlış — kullanıcıya anlaşılır hata.
      this._setStatus(NET_TRANSPORT_STATUS.ERROR, { reason: this.lastError });
    });
    this.peer.on("disconnected", () => this._setStatus(NET_TRANSPORT_STATUS.CONNECTING, { reason: "RECONNECTING" }));
    this.peer.on("close", () => this._setStatus(NET_TRANSPORT_STATUS.CLOSED));
    return { ok: true };
  }
  _connectToHost() {
    if (!this.hostId) {
      this._setStatus(NET_TRANSPORT_STATUS.ERROR, { reason: "NO_HOST_ID" });
      return;
    }
    const conn = this.peer.connect(this.hostId, { reliable: true });
    this._bindConnection(conn);
  }
  _bindConnection(conn) {
    if (!conn) return;
    const pid = conn.peer;
    this.conns.set(pid, conn);
    if (this.role === "guest") this.connection = conn;
    conn.on("open", () => {
      this.remotePeer = pid;
      this._setStatus(NET_TRANSPORT_STATUS.OPEN, { id: pid });
    });
    conn.on("data", (data) => {
      let msg = data;
      if (typeof data === "string") { try { msg = JSON.parse(data); } catch (e) { return; } }
      this._emitMessage(pid, msg);
    });
    /* Host: bir misafir koptuğunda taşıma KAPANMAZ (diğer koltuklar oynamaya
     * devam eder); yalnız o bağlantı havuzdan düşer ve `onPeerClose` yayınlanır.
     * Hiç bağlantı kalmazsa durum CLOSED olur. */
    conn.on("close", () => {
      this.conns.delete(pid);
      if (this.connection === conn) this.connection = null;
      this._emitPeerClose(pid);
      if (!this.conns.size && this.status === NET_TRANSPORT_STATUS.OPEN) {
        this._setStatus(NET_TRANSPORT_STATUS.CLOSED, { reason: "PEER_CLOSED" });
      }
    });
    conn.on("error", (err) => {
      this.lastError = String(err && err.type ? err.type : err);
      this._setStatus(NET_TRANSPORT_STATUS.ERROR, { reason: this.lastError, peer: pid });
    });
  }
  _sendOne(conn, payload) {
    try {
      conn.send(payload);
      return true;
    } catch (e) {
      this.lastError = String(e && e.message ? e.message : e);
      return false;
    }
  }
  // Yayın: host tüm açık bağlantılara, misafir tek bağlantısına gönderir.
  send(type, payload, reliable) {
    if (this.status !== NET_TRANSPORT_STATUS.OPEN) return { ok: false, reason: "NOT_OPEN" };
    const conns = [...this.conns.values()];
    if (!conns.length) return { ok: false, reason: "NOT_OPEN" };
    let sent = 0;
    for (const c of conns) if (this._sendOne(c, payload)) sent++;
    if (!sent) return { ok: false, reason: "SEND_FAILED" };
    return { ok: true, delivered: sent, reliable: reliable !== false };
  }
  // Tek hedefe: WELCOME/ACK gibi koltuk kimliği taşıyan paketler için.
  sendTo(peerId, type, payload, reliable) {
    if (this.status !== NET_TRANSPORT_STATUS.OPEN) return { ok: false, reason: "NOT_OPEN" };
    const conn = this.conns.get(peerId);
    if (!conn) return { ok: false, reason: "NO_SUCH_PEER" };
    if (!this._sendOne(conn, payload)) return { ok: false, reason: "SEND_FAILED" };
    return { ok: true, delivered: 1, reliable: reliable !== false };
  }
  close() {
    for (const c of [...this.conns.values()]) { try { c.close(); } catch (e) { /* yoksay */ } }
    this.conns.clear();
    this.connection = null;
    try { if (this.peer) this.peer.destroy(); } catch (e) { /* yoksay */ }
    this._setStatus(NET_TRANSPORT_STATUS.CLOSED);
  }
}

/* Oda kodu üretimi: karışabilecek karakterler (0/O, 1/I) çıkarılmış 5 karakter.
 * PeerJS peer kimliği olarak kullanılır; çakışma olasılığı düşüktür ve
 * "peer-unavailable" hatası kullanıcıya "oda bulunamadı" olarak gösterilir. */
const NET_ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function netRoomCode(rng, length) {
  const r = rng || Math.random;
  const n = length || 5;
  let out = "";
  for (let i = 0; i < n; i++) out += NET_ROOM_ALPHABET[Math.floor(r() * NET_ROOM_ALPHABET.length) % NET_ROOM_ALPHABET.length];
  return out;
}

// Kullanıcıya gösterilecek kod: "ABCDE" → "ABC-DE" (okunurluk).
function netFormatRoomCode(code) {
  const s = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.length <= 3) return s;
  return s.slice(0, 3) + "-" + s.slice(3);
}

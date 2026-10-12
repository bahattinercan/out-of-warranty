/* Çevrimiçi protokol çekirdeği (F3a) — saf, taşımadan bağımsız.
 *
 * Amaç: iki oyuncunun (host yetkili + misafir) hangi mesajları hangi sırayla
 * gönderebileceğini ve hostun komutları nasıl doğrulayıp tekilleştirdiğini
 * TEK yerde tanımlamak. Taşıma (WebRTC/PeerJS) bu dosyayı bilmez; taşıma
 * F3c'de `js/net/transport.js` altında ince bir katman olarak eklenir
 * (bkz. docs/web-lansman-plani.md §4 ve docs/multiplayer-plan.md §6).
 *
 * Neden ayrı: ağ hatası, sırasız paket, yinelenen komut ve kopma senaryoları
 * tarayıcı olmadan Node'da sınanabilmelidir (tests/net.js). Bu yüzden burada
 * DOM, WebRTC, zamanlayıcı ve Math.random YOKTUR; zaman ve kimlikler dışarıdan
 * enjekte edilir.
 */

// Protokol sürümü: uyuşmayan istemci maç başlamadan reddedilir. Sürüm artışı
// mesaj şekli değiştiğinde yapılır (yeni alan eklemek sürüm artışı gerektirir).
const NET_PROTOCOL_VERSION = 1;

// Mesaj türleri. Güvenilir (tek seferlik eylem/onay) ve güvenilmez (güncel
// hareket/nişan, periyodik durum) ayrımı `NET_RELIABLE` kümesiyle yapılır.
const NET_MSG = {
  HELLO: "hello",     // misafir → host: sürüm + içerik özeti
  WELCOME: "welcome", // host → misafir: koltuk + maç kimliği + ayarlar
  LOBBY: "lobby",     // host → misafir: oda durumu (seçim/hazır)
  READY: "ready",     // misafir → host: hazır (lobbyRevision taşır)
  START: "start",     // host → misafir: maç başlangıcı (seed, harita, kadro)
  INPUT: "input",     // misafir → host: hareket/nişan (güvenilmez, seq'li)
  CMD: "cmd",         // misafir → host: tek seferlik eylem (güvenilir, id'li)
  ACK: "ack",         // host → misafir: komut sonucu
  STATE: "state",     // host → misafir: periyodik snapshot
  TERRAIN: "terrain", // host → misafir: arazi değişiklik kayıtları
  TURN: "turn",       // host → misafir: tur geçişi
  RESULT: "result",   // host → misafir: maç sonucu
  ABORT: "abort",     // host → misafir: maç iptal (kod ile)
  PING: "ping",       // iki yön: heartbeat
  PONG: "pong",
};
const NET_RELIABLE = [NET_MSG.HELLO, NET_MSG.WELCOME, NET_MSG.LOBBY, NET_MSG.READY,
  NET_MSG.START, NET_MSG.CMD, NET_MSG.ACK, NET_MSG.TERRAIN, NET_MSG.TURN,
  NET_MSG.RESULT, NET_MSG.ABORT];

// Komut türleri: host bu türleri doğrular, `rules` (oyun kuralları) uygular.
const NET_CMD = {
  CHARGE: "charge",   // güç doldurmayı başlat (chargeId üretir)
  CANCEL: "cancel",   // doldurmayı iptal et (chargeId)
  RELEASE: "release", // ateş et: weaponId + açı + güç + hedefX
  MODULE: "module",   // dahili modülü kullan
  JUMP: "jump",       // sıçra
  MOVE: "move",       // yürüme yönü (-1|0|1)
};

// Kopma toleransı: bu süre boyunca robot maçta kalır (ölü sayılmaz, hasar almaya
// devam eder) ve bot devralmaz. Süre sonunda bot devralır (F4'te oda akışı).
const NET_GRACE_MS = 12000;
// Girdi tazeliği: 500 ms yenilenmeyen hareket sıfırlanır, açık güç doldurma iptal
// edilir (docs/multiplayer-plan.md §6).
const NET_INPUT_STALE_MS = 500;
// Simülasyon borcu sınırı: aşılırsa host maçı iptal eder (sessizce atlamaz).
const NET_MAX_SIM_DEBT_MS = 250;
// Mesaj boyutu sınırı (bayt): aşırı gönderim/bozuk paket reddedilir.
const NET_MAX_MSG_BYTES = 64 * 1024;
// Komut sonuç önbelleği: kapanmış tur için tutulan tombstone sayısı.
const NET_CMD_CACHE = 256;

// ── Yardımcılar ─────────────────────────────────────────────────────────────

function netFinite(v) {
  return typeof v === "number" && Number.isFinite(v);
}

// Komut alanlarının tür/sınır denetimi. Bilinmeyen tür, NaN/Infinity ve aralık
// dışı değerler reddedilir (docs/multiplayer-plan.md §6: "NaN/Infinity,
// bilinmeyen kimlik/silah, geçmiş tura ait komutlar reddedilir").
function netValidateCommand(cmd) {
  if (!cmd || typeof cmd !== "object") return { ok: false, reason: "BAD_COMMAND" };
  const kind = cmd.kind;
  if (kind === NET_CMD.CHARGE) {
    if (typeof cmd.chargeId !== "string" || !cmd.chargeId) return { ok: false, reason: "BAD_CHARGE_ID" };
    return { ok: true };
  }
  if (kind === NET_CMD.CANCEL) {
    if (typeof cmd.chargeId !== "string" || !cmd.chargeId) return { ok: false, reason: "BAD_CHARGE_ID" };
    return { ok: true };
  }
  if (kind === NET_CMD.RELEASE) {
    if (typeof cmd.chargeId !== "string" || !cmd.chargeId) return { ok: false, reason: "BAD_CHARGE_ID" };
    if (typeof cmd.weaponId !== "string" || !cmd.weaponId) return { ok: false, reason: "BAD_WEAPON" };
    // Açı ve güç: RELEASE atomik taşır (son güvenilmez nişan paketi beklenmez).
    if (!netFinite(cmd.angle) || cmd.angle < -Math.PI * 2 || cmd.angle > Math.PI * 2) return { ok: false, reason: "BAD_ANGLE" };
    if (!netFinite(cmd.power) || cmd.power < 0 || cmd.power > 1.0001) return { ok: false, reason: "BAD_POWER" };
    // Hava destekli silahlar fare hedefini kullanır → hedefX zorunlu.
    if (cmd.airdrop === true && !netFinite(cmd.targetX)) return { ok: false, reason: "BAD_TARGET" };
    return { ok: true };
  }
  if (kind === NET_CMD.MODULE) {
    if (!netFinite(cmd.angle)) return { ok: false, reason: "BAD_ANGLE" };
    return { ok: true };
  }
  if (kind === NET_CMD.JUMP) return { ok: true };
  if (kind === NET_CMD.MOVE) {
    if (!netFinite(cmd.dir) || Math.abs(cmd.dir) > 1) return { ok: false, reason: "BAD_DIR" };
    return { ok: true };
  }
  return { ok: false, reason: "UNKNOWN_COMMAND" };
}

// Zarf (envelope) doğrulaması. Her mesaj sürüm + tür taşır; maç içi mesajlar
// matchId (ve tur içi mesajlar turnId) taşır. Gönderen kimliği PAKETTEN okunmaz
// (taşıma katmanı bilir) — bu yüzden zarf kimlik alanı içermez.
function netValidateEnvelope(msg, ctx) {
  const c = ctx || {};
  if (!msg || typeof msg !== "object") return { ok: false, reason: "BAD_MESSAGE" };
  if (msg.v !== NET_PROTOCOL_VERSION) return { ok: false, reason: "PROTOCOL_MISMATCH" };
  if (typeof msg.t !== "string" || !Object.prototype.hasOwnProperty.call(NET_MSG, Object.keys(NET_MSG).find((k) => NET_MSG[k] === msg.t) || "")) {
    return { ok: false, reason: "UNKNOWN_TYPE" };
  }
  const needsMatch = [NET_MSG.START, NET_MSG.INPUT, NET_MSG.CMD, NET_MSG.ACK, NET_MSG.STATE,
    NET_MSG.TERRAIN, NET_MSG.TURN, NET_MSG.RESULT, NET_MSG.ABORT].indexOf(msg.t) >= 0;
  if (needsMatch && c.matchId && msg.matchId !== c.matchId) return { ok: false, reason: "WRONG_MATCH" };
  // Yetki kimliği: bağlantı yenilendiğinde artan authoritySessionId; eski
  // bağlantının kuyrukta kalan paketleri böylece reddedilir.
  if (c.authoritySessionId && msg.authoritySessionId && msg.authoritySessionId !== c.authoritySessionId) {
    return { ok: false, reason: "STALE_AUTHORITY" };
  }
  if (msg.t === NET_MSG.CMD || msg.t === NET_MSG.INPUT) {
    if (!Number.isInteger(msg.seq) || msg.seq < 0) return { ok: false, reason: "BAD_SEQ" };
  }
  if (msg.t === NET_MSG.CMD && (typeof msg.id !== "string" || !msg.id)) return { ok: false, reason: "BAD_COMMAND_ID" };
  return { ok: true };
}

// JSON boyutu sınırı: taşımaya verilmeden önce ölçülür (aşırı paket reddi).
function netEncodedSize(msg) {
  try { return JSON.stringify(msg).length; } catch (e) { return Infinity; }
}

function netIsReliable(type) {
  return NET_RELIABLE.indexOf(type) >= 0;
}

// ── Sıra/tekilleştirme ──────────────────────────────────────────────────────

/* Güvenilmez akış (hareket/nişan, periyodik durum): yalnız artan sequence kabul
 * edilir; eski paket biriktirilmez, sessizce düşer. */
class NetSequence {
  constructor() { this.last = -1; }
  accept(seq) {
    if (!Number.isInteger(seq) || seq < 0) return false;
    if (seq <= this.last) return false;
    this.last = seq;
    return true;
  }
}

/* Güvenilir komut tekilleştirme. Sözleşme (docs/multiplayer-plan.md §6):
 *   - aynı commandId ikinci kez gelirse ÖNCEKİ SONUÇ döner (yeniden uygulanmaz),
 *   - kapanmış tur için tombstone tutulur → çok eski/yinelenen komut uygulanmaz,
 *   - aynı id farklı payload ile gelirse protokol hatasıdır.
 * Önbellek sınırlıdır: sınır aşılırsa en eski kayıt düşer ama kayıt düşen eski
 * komut, tombstone yüksek sınırından eski olduğu için yine uygulanmaz. */
class NetCommandCache {
  constructor(limit) {
    this.limit = limit || NET_CMD_CACHE;
    this.results = new Map();   // commandId → { result, fingerprint }
    this.closedTurnHigh = -1;   // kapanmış en yüksek turnId
  }
  fingerprint(cmd) {
    try { return JSON.stringify(cmd); } catch (e) { return "?"; }
  }
  /* Dönen değer: { state: "new" } → uygulanmalı;
   *              { state: "duplicate", result } → önceki sonuç yeniden gönderilir;
   *              { state: "stale" } → eski tur/önbellek dışı, uygulanmaz;
   *              { state: "conflict" } → aynı id farklı payload (protokol hatası). */
  lookup(id, cmd, turnId) {
    const fp = this.fingerprint(cmd);
    const hit = this.results.get(id);
    if (hit) {
      if (hit.fingerprint !== fp) return { state: "conflict" };
      return { state: "duplicate", result: hit.result };
    }
    if (Number.isInteger(turnId) && turnId <= this.closedTurnHigh) return { state: "stale" };
    return { state: "new" };
  }
  remember(id, cmd, result) {
    this.results.set(id, { result, fingerprint: this.fingerprint(cmd) });
    if (this.results.size > this.limit) {
      const first = this.results.keys().next();
      if (!first.done) this.results.delete(first.value);
    }
  }
  // Tur kapandığında çağrılır: bu turdan eski komutlar artık uygulanmaz.
  closeTurn(turnId) {
    if (Number.isInteger(turnId) && turnId > this.closedTurnHigh) this.closedTurnHigh = turnId;
  }
}

// ── Girdi tazeliği ──────────────────────────────────────────────────────────

/* Oyuncu başına son girdi zamanı. 500 ms yenilenmezse hareket sıfırlanır ve açık
 * güç doldurma iptal edilir; genel bağlantı heartbeat'i bunun yerine GEÇMEZ
 * (yani PING/PONG almak girdiyi tazelemez). */
class NetInputTracker {
  constructor(staleMs) { this.staleMs = staleMs || NET_INPUT_STALE_MS; this.last = new Map(); }
  touch(playerIdx, now) { this.last.set(playerIdx, now); }
  clear(playerIdx) { this.last.delete(playerIdx); }
  isStale(playerIdx, now) {
    const t0 = this.last.get(playerIdx);
    if (t0 === undefined) return true;
    return now - t0 > this.staleMs;
  }
}

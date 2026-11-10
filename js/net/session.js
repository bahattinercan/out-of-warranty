/* Çevrimiçi oturum çekirdeği (F3a) — host yetkili sıra/yaşam döngüsü.
 *
 * Sorumluluk ayrımı:
 *   - Bu dosya: mesaj kabul sırası, komut tekilleştirme, tur sınırı, kopma
 *     toleransı, maç iptali ve aşama makinesi. Oyun kurallarını BİLMEZ.
 *   - `rules` adaptörü (F3c'de Game'e bağlanır): "bu komut geçerli mi, uygula,
 *     simülasyonu adımla" sorularının cevabı. Testlerde sahte kurallarla
 *     sınanır; böylece ağ mantığı oyundan bağımsız doğrulanabilir.
 *   - `transport` (F3c'de WebRTC/PeerJS): yalnız `send(type, payload, reliable)`.
 *
 * Korunan değişmezler (docs/multiplayer-plan.md §6.1):
 *   1. Her maçta tek yetkili host ve tek aktif tur.
 *   2. Atış tüketen eylem AIMING'i atomik kapatır; aynı turda ikinci atış reddedilir.
 *   3. Paket almak fiziği İLERLETMEZ; adımlama yalnız `update` içinde olur.
 *   4. CHARGE/RELEASE/CANCEL bir chargeId'yi bir kez kapatır.
 *   5. Tur bitişi turId başına bir kez işler (cooldown/zehir/rüzgâr çift uygulanmaz).
 *   6. Kopma ölüm değildir: robot grace boyunca maçta kalır.
 *   7. terrainVersion yalnız uygulanan arazi değişimiyle artar.
 */

const NET_PHASE = {
  DISCONNECTED: "disconnected",
  LOBBY: "lobby",
  LOADING: "loading",
  PLAYING: "playing",
  RESULTS: "results",
};

/* Host tarafı oturum. `role: "host"` yetkili simülasyonu yürütür; `guest` yalnız
 * komut gönderir ve hostun durumunu uygular. */
class NetSession {
  constructor(opts) {
    const o = opts || {};
    this.role = o.role === "guest" ? "guest" : "host";
    this.transport = o.transport || { send() {} };
    this.rules = o.rules || {};
    this.now = o.now || (() => 0);
    this.log = o.log || (() => {});
    this.graceMs = o.graceMs == null ? NET_GRACE_MS : o.graceMs;
    this.maxSimDebtMs = o.maxSimDebtMs == null ? NET_MAX_SIM_DEBT_MS : o.maxSimDebtMs;
    this.protocolVersion = NET_PROTOCOL_VERSION;

    this.phase = NET_PHASE.DISCONNECTED;
    this.authoritySessionId = o.authoritySessionId || null;
    this.matchId = null;
    this.turnId = 0;
    this.turnClosed = false;        // tur bitişi bu turnId için işlendi mi
    this.shotConsumed = false;      // bu turda atış hakkı tükendi mi (atomiklik)
    this.terrainVersion = 0;
    this.simDebtMs = 0;
    this.ended = false;             // GAMEOVER/ABORT terminal

    this.cache = new NetCommandCache();
    this.inputs = new NetInputTracker();
    this.inputSeq = new NetSequence();   // MİSAFİR: kendi hareket/nişan akışı
    // HOST: koltuk başına giriş akışı (F4). Ortak tek sayaç kullanılırsa altı
    // misafirin INPUT paketleri birbirini "eski" diye düşürür ve yalnız biri
    // oynayabilir; her koltuk kendi `seq` uzayını yürütür.
    this.inputSeqs = new Map();          // playerIdx → NetSequence
    // Koltuk ↔ bağlantı eşlemesi: hedefli paket (WELCOME/ACK) buradan gider.
    this.seatPeers = new Map();          // playerIdx → peerId
    this.peerSeats = new Map();          // peerId → playerIdx
    this.stateSeq = new NetSequence();   // host → misafir durum akışı
    this.cmdSeq = 0;                     // misafirin gönderdiği komut sayacı
    this.charges = new Map();            // playerIdx → açık chargeId
    this.seats = [];                     // { playerIdx, connected, disconnectedAt, seatToken, bot, claimed, ready, robotId }
    this.revision = 0;                   // lobi sürümü: her değişimde artar
    this.lobbyMapId = null;              // lobide seçilen harita (host)
    this.lobbyRoster = null;             // lobideki kadro: robot kimlikleri
    this.lobbyState = null;              // misafir: son LOBBY paketi (arayüz okur)
    this.lastResult = null;              // misafir: son RESULT paketi (sonuç kartı)
    this.lastAbort = null;               // misafir: son ABORT nedeni
    this.lastReject = null;              // misafir: koltuk verilmedi (REJECT nedeni)
  }

  // ── Yaşam döngüsü ─────────────────────────────────────────────────────────

  // Oda kuruldu: aşama LOBBY, koltuklar tanımlı (host kendi koltuğunu da ekler).
  openLobby(seats, opts) {
    const o = opts || {};
    this.phase = NET_PHASE.LOBBY;
    this.ended = false;
    this.revision = 0;
    this.seats = (seats || []).map((s, i) => ({
      playerIdx: s.playerIdx == null ? i : s.playerIdx,
      connected: s.connected !== false,
      disconnectedAt: null,
      seatToken: s.seatToken || "seat-" + i,
      bot: false,
      // Lobi alanları: `claimed` = bir bağlantı bu koltuğa oturdu, `ready` = o
      // oyuncu hazır. Maç başlayınca yalnız `connected`/`bot` anlam taşır.
      claimed: s.playerIdx === 0 || s.claimed === true,
      ready: s.playerIdx === 0 || s.ready === true,
      robotId: s.robotId || null,
    }));
    // Oda kimliği lobide belirlenir: WELCOME ve START aynı kimliği taşır.
    this.matchId = o.matchId || this.matchId;
    this.authoritySessionId = o.authoritySessionId || this.authoritySessionId;
    this.lobbyMapId = o.mapId || null;
    this.lobbyRoster = o.roster || null;
    return this.seats.length;
  }

  // ── Lobi (maç öncesi) ───────────────────────────────────────────────────
  /* Misafir HELLO ile bağlanır. Aynı koltuk kimliğiyle (seatToken) dönen oyuncu
   * kendi koltuğuna oturur — sayfa yenilense bile koltuğu kaybolmaz; kimlik
   * taşımayan yeni bağlantı sıradaki boş koltuğu alır (koltuk yoksa ROOM_FULL).
   * Gönderen kimliği taşımadan gelir; paketten okunmaz. */
  handleHello(fromPlayer, msg, opts) {
    if (this.role !== "host") return { ok: false, reason: "NOT_HOST" };
    // Maç sürerken gelen HELLO = kopan oyuncunun geri dönüşü (F4).
    if (this.phase === NET_PHASE.PLAYING) return this._resumeHello(fromPlayer, msg, opts);
    if (this.phase !== NET_PHASE.LOBBY) return { ok: false, reason: "WRONG_PHASE" };
    const hello = msg || {};
    if (hello.protocolVersion !== NET_PROTOCOL_VERSION) return { ok: false, reason: "PROTOCOL_MISMATCH" };
    let seat = null;
    if (typeof hello.seatToken === "string" && hello.seatToken) {
      seat = this.seats.filter((s) => s.seatToken === hello.seatToken)[0] || null;
    }
    if (!seat) seat = this.seats.filter((s) => s.playerIdx !== 0 && !s.claimed)[0] || null;
    if (!seat) return { ok: false, reason: "ROOM_FULL" };
    seat.claimed = true;
    seat.connected = true;
    seat.disconnectedAt = null;
    if (typeof hello.robotId === "string" && hello.robotId) seat.robotId = hello.robotId;
    // Koltuğu gönderen BAĞLANTIYA bağla: WELCOME ve ACK yalnız oyuncuya gider.
    if (opts && opts.peerId) this.bindPeer(seat.playerIdx, opts.peerId);
    if (seat.bot) {
      seat.bot = false;
      if (typeof this.rules.setBot === "function") this.rules.setBot(seat.playerIdx, false);
    }
    this.revision++;
    this._sendSeat(seat.playerIdx, NET_MSG.WELCOME, {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.WELCOME,
      matchId: this.matchId, authoritySessionId: this.authoritySessionId,
      seat: seat.playerIdx, seatToken: seat.seatToken,
    }, true);
    this.broadcastLobby();
    return { ok: true, seat: seat.playerIdx, seatToken: seat.seatToken };
  }

  // Koltuk durumu değişti özeti (maç sırasında yeniden bağlanan oyuncu).
  _resumeHello(fromPlayer, msg, opts) {
    const hello = msg || {};
    if (hello.protocolVersion !== NET_PROTOCOL_VERSION) return { ok: false, reason: "PROTOCOL_MISMATCH" };
    const peerId = opts && opts.peerId;
    if (!peerId) return { ok: false, reason: "NO_PEER" };
    // Yalnız AYNI koltuk kimliği kendi koltuğuna döner; kimliksiz bağlantı
    // maç ortasında koltuk ALAMAZ (kadro sabittir).
    const seat = this.seats.filter((s) => s.seatToken && s.seatToken === hello.seatToken)[0] || null;
    if (!seat) return { ok: false, reason: "NO_SEAT" };
    this.bindPeer(seat.playerIdx, peerId);
    seat.connected = true;
    seat.disconnectedAt = null;
    if (seat.bot) {
      seat.bot = false;
      if (typeof this.rules.setBot === "function") this.rules.setBot(seat.playerIdx, false);
    }
    this._sendSeat(seat.playerIdx, NET_MSG.WELCOME, {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.WELCOME,
      matchId: this.matchId, authoritySessionId: this.authoritySessionId,
      seat: seat.playerIdx, seatToken: seat.seatToken,
    }, true);
    return { ok: true, seat: seat.playerIdx, resumed: true };
  }

  // Hazır bildirimi. Host, tüm misafir koltukları hazır olana kadar başlatamaz.
  handleReady(fromPlayer, msg) {
    if (this.role !== "host") return { ok: false, reason: "NOT_HOST" };
    if (this.phase !== NET_PHASE.LOBBY) return { ok: false, reason: "WRONG_PHASE" };
    const seat = this._seat(fromPlayer);
    if (!seat || !seat.claimed) return { ok: false, reason: "UNKNOWN_PLAYER" };
    seat.ready = !!(msg && msg.ready);
    this.revision++;
    this.broadcastLobby();
    return { ok: true, ready: seat.ready, canStart: this.canStart() };
  }

  // Oda durumu: misafir arayüzü koltukları/hazır durumunu buradan çizer.
  lobbySnapshot() {    return {
      revision: this.revision,
      matchId: this.matchId,
      hostIdx: 0,
      mapId: this.lobbyMapId,
      roster: this.lobbyRoster,
      seats: this.seats.map((s) => ({
        playerIdx: s.playerIdx, claimed: !!s.claimed, ready: !!s.ready,
        connected: !!s.connected, bot: !!s.bot, robotId: s.robotId || null,
      })),
    };
  }

  broadcastLobby() {
    const snap = this.lobbySnapshot();
    this.transport.send(NET_MSG.LOBBY, Object.assign({
      v: NET_PROTOCOL_VERSION, t: NET_MSG.LOBBY, matchId: this.matchId,
      authoritySessionId: this.authoritySessionId,
    }, snap), true);
    return snap;
  }

  // Başlatma koşulu: en az bir misafir koltuk VAR ve hepsi hazır.
  canStart() {
    if (this.phase !== NET_PHASE.LOBBY) return false;
    const guests = this.seats.filter((s) => s.playerIdx !== 0);
    if (!guests.length) return false;
    return guests.every((s) => s.claimed && s.ready);
  }

  /* Koltuk sayısı (F4): host odası 2–6 koltukla açılır ve lobide değiştirilebilir.
   * Yalnız BOŞ koltuk eklenir/çıkarılır — bağlanmış oyuncunun koltuğu düşürülmez
   * (düşürülseydi o robot maçtan sessizce silinir, oyuncu da boşta kalırdı). */
  setSeatCount(n) {
    if (this.role !== "host") return { ok: false, reason: "NOT_HOST" };
    if (this.phase !== NET_PHASE.LOBBY) return { ok: false, reason: "WRONG_PHASE" };
    const want = Math.max(NET_MIN_SEATS, Math.min(NET_MAX_SEATS, n | 0));
    const claimed = this.seats.filter((s) => s.claimed).length;
    if (want < claimed) return { ok: false, reason: "SEATS_OCCUPIED", claimed };
    while (this.seats.length < want) {
      const i = this.seats.length;
      this.seats.push({
        playerIdx: i, connected: false, disconnectedAt: null,
        seatToken: "seat-" + i, bot: false, claimed: false, ready: false, robotId: null,
      });
    }
    while (this.seats.length > want) {
      const last = this.seats[this.seats.length - 1];
      if (last.claimed) break;
      this.seats.pop();
    }
    this.revision++;
    this.broadcastLobby();
    return { ok: true, seats: this.seats.length };
  }

  // Host maçı başlatır. Yükleme onayları `loaded()` ile toplanır; hepsi
  // tamamlanmadan simülasyon ilerlemez (aşama LOADING kalır).
  startMatch(matchId, authoritySessionId, opts) {
    if (this.role !== "host") return { ok: false, reason: "NOT_HOST" };
    if (this.phase !== NET_PHASE.LOBBY) return { ok: false, reason: "WRONG_PHASE" };
    if (!matchId) return { ok: false, reason: "NO_MATCH_ID" };
    const o = opts || {};
    this.matchId = matchId;
    this.authoritySessionId = authoritySessionId || "auth-" + matchId;
    // Tur sayacı oyunun turnId'siyle aynı olmalı (oyun 1'den başlar); misafir
    // START'tan okur, böylece iki taraf aynı tur kimliğinde konuşur.
    this.turnId = Number.isInteger(o.turnId) ? o.turnId : 0;
    this.turnClosed = false;
    this.shotConsumed = false;
    this.terrainVersion = 0;
    this.simDebtMs = 0;
    this.ended = false;
    this.cache = new NetCommandCache();
    this.inputs = new NetInputTracker();
    this.inputSeq = new NetSequence();
    this.inputSeqs = new Map();
    this.charges.clear();
    this.pendingLoads = this.seats.filter((s) => s.connected).map((s) => s.playerIdx);
    this.phase = NET_PHASE.LOADING;
    this.transport.send(NET_MSG.START, {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.START, matchId: this.matchId,
      authoritySessionId: this.authoritySessionId, turnId: this.turnId,
      // Kadro ve harita: misafir kendi dünyasını bunlardan kurar (arazi hostun
      // maskesiyle, rüzgâr/konumlar ilk snapshot'la gelir).
      mapId: o.mapId !== undefined ? o.mapId : this.lobbyMapId,
      roster: o.roster !== undefined ? o.roster : this.lobbyRoster,
      hostIdx: 0,
    }, true);
    this._maybeBeginPlay();
    return { ok: true, matchId: this.matchId };
  }

  // Yükleme onayı (misafir tarafı: LOADED; host kendi koltuğu için de çağırır).
  loaded(playerIdx) {
    // Misafir yükleme onayı göndermez (yükleme listesi yalnız hostta tutulur).
    if (!this.pendingLoads || this.phase !== NET_PHASE.LOADING) return false;
    const i = this.pendingLoads.indexOf(playerIdx);
    if (i < 0) return false;
    this.pendingLoads.splice(i, 1);
    this._maybeBeginPlay();
    return true;
  }

  _maybeBeginPlay() {
    if (this.phase !== NET_PHASE.LOADING || this.pendingLoads.length > 0) return;
    this.phase = NET_PHASE.PLAYING;
    this.log("match başladı: " + this.matchId);
  }

  // ── Host: gelen mesaj ────────────────────────────────────────────────────

  /* Host, misafirden gelen mesajı işler. `fromPlayer` taşıma katmanından gelir
   * (paketin içinden OKUNMAZ — sahte gönderen engellenir). */
  handleHostMessage(fromPlayer, msg, opts) {
    const env = netValidateEnvelope(msg, { matchId: this.matchId, authoritySessionId: this.authoritySessionId });
    if (!env.ok) return env;
    if (this.ended) return { ok: false, reason: "MATCH_ENDED" };
    // Lobi mesajları (HELLO/READY) maç başlamadan LOBBY aşamasında gelir; yükleme
    // onayı LOADING aşamasında. Diğer mesajlar PLAYING ister.
    if (msg.t === NET_MSG.HELLO) {
      const res = this.handleHello(fromPlayer, msg, opts);
      // Ret sessiz KALMAZ: dolu odada kalan oyuncu nedenini öğrenir (REJECT).
      if (res && res.ok === false && opts && opts.peerId) {
        this.transport.sendTo(opts.peerId, NET_MSG.REJECT, {
          v: NET_PROTOCOL_VERSION, t: NET_MSG.REJECT, reason: res.reason,
        }, true);
      }
      return res;
    }
    if (msg.t === NET_MSG.READY) return this.handleReady(fromPlayer, msg);
    if (msg.t === NET_MSG.LOADED) return this.loaded(fromPlayer) ? { ok: true } : { ok: false, reason: "NOT_LOADING" };
    if (this.phase !== NET_PHASE.PLAYING) return { ok: false, reason: "WRONG_PHASE" };
    const seat = this._seat(fromPlayer);
    if (!seat || !seat.connected) return { ok: false, reason: "UNKNOWN_PLAYER" };

    if (msg.t === NET_MSG.INPUT) return this._hostInput(fromPlayer, msg);
    if (msg.t === NET_MSG.CMD) return this._hostCommand(fromPlayer, msg);
    if (msg.t === NET_MSG.PING) {
      this.transport.send(NET_MSG.PONG, { v: NET_PROTOCOL_VERSION, t: NET_MSG.PONG }, false);
      return { ok: true };
    }
    return { ok: false, reason: "UNEXPECTED_TYPE" };
  }

  // Hareket/nişan: güvenilmez akış, koltuk başına artan sequence; eski paket düşer.
  _hostInput(fromPlayer, msg) {
    let seq = this.inputSeqs.get(fromPlayer);
    if (!seq) { seq = new NetSequence(); this.inputSeqs.set(fromPlayer, seq); }
    if (!seq.accept(msg.seq)) return { ok: false, reason: "STALE_INPUT" };
    this.inputs.touch(fromPlayer, this.now());
    if (typeof this.rules.setInput === "function") {
      this.rules.setInput(fromPlayer, { move: msg.move, aim: msg.aim });
    }
    return { ok: true };
  }

  /* Tek seferlik eylem. Sıra: zarf/kimlik → önceki sonucu arama → kural kontrolü
   * → atomik uygulama → sonucu kaydetme → ACK. Yinelenen komut, başarılı atıştan
   * sonra PROJECTILE'a geçilmiş olsa bile ÖNCEKİ sonucu alır. */
  _hostCommand(fromPlayer, msg) {
    const v = netValidateCommand(msg.cmd);
    if (!v.ok) return { ok: false, reason: v.reason };
    const look = this.cache.lookup(msg.id, msg.cmd, this.turnId);
    if (look.state === "duplicate") {
      this._ack(fromPlayer, msg.id, look.result);
      return { ok: true, duplicate: true, result: look.result };
    }
    if (look.state === "conflict") return { ok: false, reason: "COMMAND_CONFLICT" };
    if (look.state === "stale") return { ok: false, reason: "STALE_TURN" };

    if (typeof this.rules.isActiveTurn === "function" && !this.rules.isActiveTurn(fromPlayer)) {
      const res = { ok: false, reason: "NOT_YOUR_TURN" };
      this.cache.remember(msg.id, msg.cmd, res);
      this._ack(fromPlayer, msg.id, res);
      return res;
    }
    // Atış tüketen eylem bu turda bir kez: AIMING atomik kapanır (değişmez 2).
    if (this.shotConsumed && this._consumesShot(msg.cmd)) {
      const res = { ok: false, reason: "SHOT_ALREADY_USED" };
      this.cache.remember(msg.id, msg.cmd, res);
      this._ack(fromPlayer, msg.id, res);
      return res;
    }
    // chargeId yaşam döngüsü: açık doldurma yoksa RELEASE/CANCEL reddedilir;
    // kapanmış chargeId ikinci kez kullanılamaz (değişmez 4).
    const chargeCheck = this._checkCharge(fromPlayer, msg.cmd);
    if (!chargeCheck.ok) {
      this.cache.remember(msg.id, msg.cmd, chargeCheck);
      this._ack(fromPlayer, msg.id, chargeCheck);
      return chargeCheck;
    }

    const applied = typeof this.rules.applyCommand === "function"
      ? this.rules.applyCommand(fromPlayer, msg.cmd, { turnId: this.turnId })
      : { ok: true };
    const res = applied && applied.ok === false
      ? { ok: false, reason: applied.reason || "REJECTED" }
      : { ok: true, consumesShot: !!applied.consumesShot };
    if (res.ok) {
      this._commitCharge(fromPlayer, msg.cmd);
      if (res.consumesShot) this.shotConsumed = true;
      if (applied && applied.terrainChanges && applied.terrainChanges.length) {
        this.sendTerrainChanges(applied.terrainChanges);
      }
    }
    this.cache.remember(msg.id, msg.cmd, res);
    this._ack(fromPlayer, msg.id, res);
    return res;
  }

  _consumesShot(cmd) {
    if (cmd.kind === NET_CMD.RELEASE) return true;
    // Hasar veren modüller atış hakkını doldurur; modülün türünü kurallar bilir.
    if (cmd.kind === NET_CMD.MODULE) {
      return typeof this.rules.moduleConsumesShot === "function"
        ? !!this.rules.moduleConsumesShot(this.turnOwner())
        : false;
    }
    return false;
  }

  _checkCharge(playerIdx, cmd) {
    const open = this.charges.get(playerIdx) || null;
    if (cmd.kind === NET_CMD.CHARGE) {
      // Tekrar BEGIN gücü sıfırlamaz: yeni chargeId açılmaz, mevcut kabul edilir.
      if (open) return { ok: true, reason: "ALREADY_CHARGING" };
      return { ok: true };
    }
    if (cmd.kind === NET_CMD.CANCEL || cmd.kind === NET_CMD.RELEASE) {
      if (!open) return { ok: false, reason: "NO_OPEN_CHARGE" };
      if (open !== cmd.chargeId) return { ok: false, reason: "CHARGE_MISMATCH" };
      return { ok: true };
    }
    return { ok: true };
  }

  _commitCharge(playerIdx, cmd) {
    if (cmd.kind === NET_CMD.CHARGE) {
      if (!this.charges.get(playerIdx)) this.charges.set(playerIdx, cmd.chargeId);
      return;
    }
    if (cmd.kind === NET_CMD.CANCEL || cmd.kind === NET_CMD.RELEASE) this.charges.delete(playerIdx);
  }

  _ack(playerIdx, id, result) {
    // Host kendi komutunu ağdan onaylamaz: ACK yayına düşerse bütün misafirler
    // hostun komut sonuçlarını boşuna alır (F4: koltuk 0'ın bağlantısı yoktur).
    if (playerIdx === 0 && !this.peerForSeat(0)) {
      if (typeof this.rules.onAck === "function") this.rules.onAck(id, result);
      return;
    }
    this._sendSeat(playerIdx, NET_MSG.ACK, {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.ACK, matchId: this.matchId,
      authoritySessionId: this.authoritySessionId, turnId: this.turnId,
      id, result,
    }, true);
  }

  turnOwner() {
    return typeof this.rules.activePlayer === "function" ? this.rules.activePlayer() : -1;
  }

  // ── Tur sınırı ───────────────────────────────────────────────────────────

  /* Tur bitişi turId başına BİR KEZ işler (değişmez 5). Girdi ve açık doldurma
   * temizlenir; kapanan turun komutları artık uygulanmaz (tombstone). */
  endTurn(nextTurnId) {
    if (this.phase !== NET_PHASE.PLAYING || this.ended) return { ok: false, reason: "NOT_PLAYING" };
    // Tur bitişi turId başına BİR KEZ: ileri gitmeyen çağrı ve argümansız
    // ikinci kapatma reddedilir (cooldown/zehir/rüzgâr çift uygulanmasın).
    if (nextTurnId != null && nextTurnId <= this.turnId) {
      return { ok: false, reason: "TURN_ALREADY_CLOSED" };
    }
    if (nextTurnId == null && this.turnClosed) {
      return { ok: false, reason: "TURN_ALREADY_CLOSED" };
    }
    const closed = this.turnId;
    this.cache.closeTurn(closed);
    for (const seat of this.seats) {
      this.inputs.clear(seat.playerIdx);
      if (typeof this.rules.clearInput === "function") this.rules.clearInput(seat.playerIdx);
    }
    this.charges.clear();
    this.shotConsumed = false;
    this.turnClosed = true;
    if (typeof this.rules.onTurnEnd === "function") this.rules.onTurnEnd(closed);
    if (nextTurnId != null) {
      this.turnId = nextTurnId;
      this.turnClosed = false;
      this.transport.send(NET_MSG.TURN, {
        v: NET_PROTOCOL_VERSION, t: NET_MSG.TURN, matchId: this.matchId,
        authoritySessionId: this.authoritySessionId, turnId: this.turnId,
      }, true);
    }
    return { ok: true, closedTurn: closed, turnId: this.turnId };
  }

  // ── Simülasyon saati ve borç ─────────────────────────────────────────────

  /* Host sabit adımlı saati yürütür. `dtMs` dışarıdan verilir (rAF'a bağlı
   * değil). Bir uyanışta en fazla 8 adım işlenir; kalan borç sonraki uyanışa
   * taşınır. Borç 250 ms'yi aşarsa maç sessizce kaymaz, iptal edilir. */
  update(dtMs) {
    if (this.phase !== NET_PHASE.PLAYING || this.ended) return { ok: true, steps: 0 };
    const stepMs = 1000 / 60;
    let steps = 0;
    this.simDebtMs += Math.max(0, dtMs || 0);
    while (this.simDebtMs >= stepMs && steps < 8) {
      if (typeof this.rules.step === "function") this.rules.step(stepMs);
      this.simDebtMs -= stepMs;
      steps++;
    }
    if (this.simDebtMs > this.maxSimDebtMs) {
      this.abort("SIM_DEBT");
      return { ok: false, reason: "SIM_DEBT", steps };
    }
    // Girdi tazeliği: 500 ms yenilenmeyen hareket sıfırlanır, doldurma iptal edilir.
    const now = this.now();
    for (const seat of this.seats) {
      if (this.inputs.isStale(seat.playerIdx, now)) {
        if (typeof this.rules.clearInput === "function") this.rules.clearInput(seat.playerIdx);
        if (this.charges.has(seat.playerIdx)) this.charges.delete(seat.playerIdx);
      }
    }
    return { ok: true, steps };
  }

  /* YEREL koltuğun girdisini tazele. Host kendi girdisini ağdan almaz (INPUT
   * paketi göndermez), bu yüzden tazelik denetimine takılıp HER KAREDE
   * temizleniyordu: host ne yürüyebiliyor ne güç doldurabiliyordu (bu yüzden
   * atış yapamıyordu — kullanıcı bildirimi). Oyun katmanı her karede çağırır. */
  touchLocalInput(playerIdx) {
    this.inputs.touch(playerIdx, this.now());
  }

  /* Arazi değişikliklerini yayınlar ve sürümü ilerletir. Oyma simülasyon
   * adımında (patlama) oluştuğu için oyun katmanı her adımdan sonra kuyruğu
   * buraya boşaltır; komut sırasında oluşan oymalar da aynı yoldan gider. */
  sendTerrainChanges(records) {
    if (this.role !== "host" || !this.matchId || !Array.isArray(records) || !records.length) {
      return { ok: false, reason: "NOTHING_TO_SEND" };
    }
    this.terrainVersion++;
    this.transport.send(NET_MSG.TERRAIN, {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.TERRAIN, matchId: this.matchId,
      authoritySessionId: this.authoritySessionId, turnId: this.turnId,
      terrainVersion: this.terrainVersion, changes: records,
    }, true);
    return { ok: true, terrainVersion: this.terrainVersion, count: records.length };
  }

  /* Maç başında host arazi maskesini gönderir: arazi Math.random ile üretildiği
   * için misafirin kendi arazisi hostunkinden farklıdır (F3b). */
  sendTerrainSnapshot(mask, toSeat) {
    if (this.role !== "host" || !this.matchId) return { ok: false, reason: "NOT_HOST" };
    if (mask && Number.isInteger(mask.version)) this.terrainVersion = mask.version;
    const payload = {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.TERRAIN, matchId: this.matchId,
      authoritySessionId: this.authoritySessionId, turnId: this.turnId,
      terrainVersion: this.terrainVersion, mask, changes: [],
    };
    // `toSeat` verilirse yalnız o koltuğa (maç sırasında geri dönen oyuncu).
    if (toSeat != null) this._sendSeat(toSeat, NET_MSG.TERRAIN, payload, true);
    else this.transport.send(NET_MSG.TERRAIN, payload, true);
    return { ok: true, terrainVersion: this.terrainVersion };
  }

  /* Hatırlatma paketi (maç sırasında geri dönen oyuncuya dünyayı yeniden kur):
   * START'ın aynısı, ama aşama/maç kimliği DEĞİŞMEZ ve yalnız o bağlantıya gider. */
  resendStart(seat, opts) {
    if (this.role !== "host") return { ok: false, reason: "NOT_HOST" };
    const o = opts || {};
    this._sendSeat(seat, NET_MSG.START, {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.START, matchId: this.matchId,
      authoritySessionId: this.authoritySessionId, turnId: o.turnId == null ? this.turnId : o.turnId,
      mapId: o.mapId, roster: o.roster, hostIdx: 0,
    }, true);
    return { ok: true };
  }

  /* Periyodik durum yayını: fizik adımını DEĞİŞTİRMEZ (değişmez 3); yalnız
   * hostun o anki durumunu gönderir. */
  broadcastState(state, toSeat) {
    // LOADING'de de gönderilir: maç başlangıç durumu (includeBuild) onay
    // beklerken yollanır; PLAYING'de periyodik paketler.
    if (this.role !== "host" || this.ended) return false;
    if (this.phase !== NET_PHASE.PLAYING && this.phase !== NET_PHASE.LOADING) return false;
    this.stateSeq.accept(this.stateSeq.last + 1);
    const payload = {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.STATE, matchId: this.matchId,
      authoritySessionId: this.authoritySessionId, turnId: this.turnId,
      seq: this.stateSeq.last, state,
    };
    // `toSeat`: yalnız geri dönen oyuncuya tam durum (diğerleri periyodik akışta).
    if (toSeat != null) this._sendSeat(toSeat, NET_MSG.STATE, payload, false);
    else this.transport.send(NET_MSG.STATE, payload, false);
    return true;
  }

  // ── Kopma / yeniden bağlanma / iptal ─────────────────────────────────────

  /* Kopma ölüm değildir (değişmez 6): koltuk bağlantısı kesilir, robot maçta
   * kalır ve grace boyunca fizik/hasardan etkilenmeye devam eder. */
  playerDisconnected(playerIdx) {
    const seat = this._seat(playerIdx);
    if (!seat || !seat.connected) return { ok: false, reason: "ALREADY_DISCONNECTED" };
    seat.connected = false;
    seat.disconnectedAt = this.now();
    if (typeof this.rules.clearInput === "function") this.rules.clearInput(playerIdx);
    this.inputs.clear(playerIdx);
    this.charges.delete(playerIdx);
    return { ok: true, graceMs: this.graceMs };
  }

  /* Grace doldu: bot devralır (oyuncu maçta kalır; ölü sayılmaz). Yeniden
   * bağlanan oyuncu AYNI koltuğa döner ve bot kapanır. */
  graceExpired(playerIdx) {
    const seat = this._seat(playerIdx);
    if (!seat || seat.connected || seat.bot) return { ok: false, reason: "NO_GRACE" };
    const waited = this.now() - (seat.disconnectedAt || 0);
    if (waited < this.graceMs) return { ok: false, reason: "GRACE_ACTIVE" };
    seat.bot = true;
    if (typeof this.rules.setBot === "function") this.rules.setBot(playerIdx, true);
    return { ok: true, bot: true };
  }

  // Yeniden bağlanma: koltuk kimliği (seatToken) eşleşmezse kabul edilmez.
  reconnect(playerIdx, seatToken) {
    const seat = this._seat(playerIdx);
    if (!seat) return { ok: false, reason: "UNKNOWN_SEAT" };
    if (seatToken !== seat.seatToken) return { ok: false, reason: "BAD_SEAT_TOKEN" };
    seat.connected = true;
    seat.disconnectedAt = null;
    if (seat.bot) {
      seat.bot = false;
      if (typeof this.rules.setBot === "function") this.rules.setBot(playerIdx, false);
    }
    return { ok: true, seat: playerIdx, resumedBot: !seat.bot };
  }

  /* Maç sonucu: terminal (GAMEOVER). Sonradan gelen komut maçı canlandıramaz. */
  finish(result) {
    if (this.ended) return { ok: false, reason: "ALREADY_ENDED" };
    this.ended = true;
    this.phase = NET_PHASE.RESULTS;
    this.transport.send(NET_MSG.RESULT, {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.RESULT, matchId: this.matchId,
      authoritySessionId: this.authoritySessionId, turnId: this.turnId, result,
    }, true);
    return { ok: true };
  }

  /* İptal: LOADING/PLAYING'den LOBBY'ye dönüş (neden kodla bildirilir; metin
   * arayüzde t() ile çevrilir — oturum çekirdeği metin üretmez). */
  abort(reason) {
    if (this.ended && this.phase === NET_PHASE.RESULTS) return { ok: false, reason: "MATCH_ENDED" };
    this.ended = true;
    this.phase = NET_PHASE.LOBBY;
    this.transport.send(NET_MSG.ABORT, {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.ABORT, matchId: this.matchId,
      authoritySessionId: this.authoritySessionId, reason: reason || "ABORTED",
    }, true);
    return { ok: true, reason: reason || "ABORTED" };
  }

  _seat(playerIdx) {
    for (const s of this.seats) if (s.playerIdx === playerIdx) return s;
    return null;
  }

  // ── Koltuk ↔ bağlantı ───────────────────────────────────────────────────
  /* Host birden çok misafir taşıdığı için paketin kime gideceği bilinmeli:
   * `send()` yayın yapar, hedefli paketler `seatPeers` üzerinden gider.
   * Eşleme yoksa (tek koltuklu testler, döngü eşleşmesi) yayına düşülür. */
  bindPeer(playerIdx, peerId) {
    if (!peerId) return false;
    const old = this.seatPeers.get(playerIdx);
    if (old && old !== peerId) this.peerSeats.delete(old);
    this.seatPeers.set(playerIdx, peerId);
    this.peerSeats.set(peerId, playerIdx);
    return true;
  }

  seatForPeer(peerId) {
    const s = this.peerSeats.get(peerId);
    return s === undefined ? null : s;
  }

  peerForSeat(playerIdx) {
    return this.seatPeers.get(playerIdx) || null;
  }

  _sendSeat(playerIdx, type, payload, reliable) {
    const peerId = this.peerForSeat(playerIdx);
    if (peerId && typeof this.transport.sendTo === "function") {
      const res = this.transport.sendTo(peerId, type, payload, reliable);
      if (res && res.ok !== false) return res;
    }
    return this.transport.send(type, payload, reliable);
  }

  /* Bir bağlantı koptu (host): o bağlantının koltuğu varsa kopma işlenir.
   * Koltuk yoksa (henüz HELLO gelmemiş) yalnız eşleme temizlenir. */
  disconnectPeer(peerId) {
    const idx = this.seatForPeer(peerId);
    this.peerSeats.delete(peerId);
    if (idx == null) return { ok: false, reason: "NO_SEAT" };
    if (this.seatPeers.get(idx) === peerId) this.seatPeers.delete(idx);
    if (this.phase === NET_PHASE.LOBBY) {
      const seat = this._seat(idx);
      if (seat) { seat.connected = false; seat.claimed = false; seat.ready = false; }
      this.revision++;
      this.broadcastLobby();
      return { ok: true, seat: idx, phase: "lobby" };
    }
    const res = this.playerDisconnected(idx);
    return Object.assign({ seat: idx, phase: this.phase }, res);
  }

  // ── Misafir tarafı ───────────────────────────────────────────────────────

  /* Misafir: yalnız handshake'te doğrulanan host kimliğinden maç durumu kabul
   * eder; başka kaynaktan gelen STATE/TERRAIN uygulanmaz. */
  handleGuestMessage(msg) {
    const env = netValidateEnvelope(msg, { matchId: this.matchId, authoritySessionId: this.authoritySessionId });
    if (!env.ok) return env;
    if (msg.t === NET_MSG.WELCOME) {
      // WELCOME koltuğu verir; maç HENÜZ başlamadı → aşama LOBBY kalır (lobi
      // ekranı hazır/başlat akışını sürdürür). LOADING'e geçiş START iledir.
      this.matchId = msg.matchId;
      this.authoritySessionId = msg.authoritySessionId;
      this.mySeat = msg.seat;
      this.phase = NET_PHASE.LOBBY;
      this.ended = false;
      this.lastReject = null;
      return { ok: true };
    }
    // Koltuk verilmedi: neden kodla gelir (arayüz t() ile çevirir).
    if (msg.t === NET_MSG.REJECT) {
      this.lastReject = msg.reason || "REJECTED";
      return { ok: true, reject: this.lastReject };
    }
    // Maç başlangıcı: misafir aşamayı LOADING yapar; başlangıç durumu uygulanıp
    // LOADED gönderilene kadar simülasyon ilerlemez (host onayları bekler).
    if (msg.t === NET_MSG.START) {
      this.matchId = msg.matchId;
      this.authoritySessionId = msg.authoritySessionId;
      this.turnId = Number.isInteger(msg.turnId) ? msg.turnId : 0;
      this.ended = false;
      this.phase = NET_PHASE.LOADING;
      // Misafir dünyayı bu iki alandan kurar (harita + kadro).
      this.startSetup = { mapId: msg.mapId, roster: msg.roster, hostIdx: msg.hostIdx };
      return { ok: true };
    }
    if (msg.t === NET_MSG.LOBBY) {
      // Oda durumu (koltuklar/hazır/harita/kadro): arayüz buradan çizer.
      this.lobbyState = {
        revision: msg.revision, matchId: msg.matchId, hostIdx: msg.hostIdx,
        mapId: msg.mapId, roster: msg.roster, seats: msg.seats,
      };
      if (Number.isInteger(msg.revision)) this.revision = msg.revision;
      return { ok: true };
    }
    if (msg.t === NET_MSG.STATE) {
      if (!this.stateSeq.accept(msg.seq)) return { ok: false, reason: "STALE_STATE" };
      if (typeof this.rules.applyState === "function") this.rules.applyState(msg.state);
      return { ok: true };
    }
    if (msg.t === NET_MSG.TERRAIN) {
      /* Sürüm denetimi: oyma KAYITLARI (changes) sıraya bağlıdır ve yalnız
       * daha yeni sürümde uygulanır. TAM MASKE (maç başı / kurtarma) ise durumun
       * kendisidir: eşit sürümde de kabul edilir. Aksi hâlde taze arazi
       * (sürüm 0) misafirin başlangıç sürümüne (0) eşit olduğu için maske
       * STALE_TERRAIN ile reddediliyor ve misafir hostunkinden FARKLI arazide
       * oynuyordu (arazi rastgele üretildiğinde robotun zıplamasına yol açar).
       * ESKİ sürümlü maske yine reddedilir (oymaları geri almamak için). */
      const v = msg.terrainVersion;
      const hasMask = !!msg.mask;
      const fresh = Number.isInteger(v) && v > this.terrainVersion;
      if (!hasMask && !fresh) return { ok: false, reason: "STALE_TERRAIN" };
      if (hasMask && Number.isInteger(v) && v < this.terrainVersion) {
        return { ok: false, reason: "STALE_TERRAIN" };
      }
      if (Number.isInteger(v)) this.terrainVersion = v;
      // İlk paket maskeyi (tam arazi), sonrakiler oyma kayıtlarını taşır.
      if (hasMask && typeof this.rules.applyTerrainMask === "function") this.rules.applyTerrainMask(msg.mask);
      if (typeof this.rules.applyTerrain === "function") this.rules.applyTerrain(msg.changes);
      return { ok: true };
    }
    if (msg.t === NET_MSG.TURN) {
      this.turnId = msg.turnId;
      return { ok: true };
    }
    if (msg.t === NET_MSG.ACK) {
      if (typeof this.rules.onAck === "function") this.rules.onAck(msg.id, msg.result);
      return { ok: true };
    }
    if (msg.t === NET_MSG.ABORT) {
      this.ended = true;
      this.phase = NET_PHASE.LOBBY;
      this.lastAbort = msg.reason || "ABORTED";
      return { ok: true, reason: msg.reason };
    }
    if (msg.t === NET_MSG.RESULT) {
      this.ended = true;
      this.phase = NET_PHASE.RESULTS;
      this.lastResult = msg.result || null;
      return { ok: true, result: msg.result };
    }
    return { ok: false, reason: "UNEXPECTED_TYPE" };
  }

  /* Misafir odaya katılır. `seatToken` varsa (sayfa yenilendi / yeniden
   * bağlanma) host aynı koltuğa oturtur; `robotId` lobide gösterilir ve kadroya
   * girer. HELLO maç kimliği taşımaz (henüz maç yok). */
  sendHello(opts) {
    if (this.role !== "guest") return { ok: false, reason: "NOT_GUEST" };
    const o = opts || {};
    this.transport.send(NET_MSG.HELLO, {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.HELLO,
      protocolVersion: NET_PROTOCOL_VERSION,
      seatToken: o.seatToken || null,
      robotId: o.robotId || null,
    }, true);
    return { ok: true };
  }

  // Misafir hazır bildirimi (host LOBBY paketiyle yanıtlar).
  sendReady(ready) {
    if (this.role !== "guest") return { ok: false, reason: "NOT_GUEST" };
    this.transport.send(NET_MSG.READY, {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.READY, matchId: this.matchId,
      authoritySessionId: this.authoritySessionId,
      revision: this.revision, ready: ready !== false,
    }, true);
    return { ok: true };
  }

  // Misafir yükleme onayı: başlangıç durumu uygulandıktan sonra çağrılır.
  sendLoaded() {
    if (this.role !== "guest") return { ok: false, reason: "NOT_GUEST" };
    this.phase = NET_PHASE.PLAYING;
    this.transport.send(NET_MSG.LOADED, {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.LOADED, matchId: this.matchId,
      authoritySessionId: this.authoritySessionId, turnId: this.turnId,
    }, true);
    return { ok: true };
  }

  // Misafir komut gönderir: kimlik sıralı üretilir (tekrar denemede aynı id
  // gönderilerek host tarafında tekilleştirme devreye girer).
  sendCommand(cmd, id) {
    if (this.role !== "guest") return { ok: false, reason: "NOT_GUEST" };
    const v = netValidateCommand(cmd);
    if (!v.ok) return v;
    this.cmdSeq++;
    // Kimlik KOLTUK BAŞINA ad alanında üretilir ("s1-7"): iki taraf kendi
    // sayaçlarını bağımsız yürüttüğü için "c1" gibi ortak ad, hostun kendi
    // komutuyla çakışır ve host onu YİNELENEN komut sanıp uygulamazdı
    // (tests/net-game.js yakaladı).
    const seat = this.mySeat == null ? "g" : this.mySeat;
    const commandId = id || "s" + seat + "-" + this.cmdSeq;
    this.transport.send(NET_MSG.CMD, {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.CMD, matchId: this.matchId,
      turnId: this.turnId, seq: this.cmdSeq, id: commandId, cmd,
    }, true);
    return { ok: true, id: commandId };
  }

  // Misafir güncel hareket/nişan gönderir (güvenilmez akış).
  sendInput(move, aim) {
    if (this.role !== "guest") return { ok: false, reason: "NOT_GUEST" };
    this.inputSeq.accept(this.inputSeq.last + 1);
    this.transport.send(NET_MSG.INPUT, {
      v: NET_PROTOCOL_VERSION, t: NET_MSG.INPUT, matchId: this.matchId,
      turnId: this.turnId, seq: this.inputSeq.last, move, aim,
    }, false);
    return { ok: true, seq: this.inputSeq.last };
  }

  // Mesaj boyutu denetimi: taşımaya vermeden önce çağrılır.
  checkSize(msg) {
    const size = netEncodedSize(msg);
    if (size > NET_MAX_MSG_BYTES) return { ok: false, reason: "MESSAGE_TOO_LARGE", size };
    return { ok: true, size };
  }
}

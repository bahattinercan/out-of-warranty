/* Uçtan uca çevrimiçi entegrasyon testleri (F3c) — saf Node, tarayıcısız.
 * Çalıştır: node tests/net-integration.js
 *
 * Ne sınanır: protokol + oturum + durum eşitleme + taşıma katmanının BİRLİKTE
 * çalışması. Host ve misafir aynı süreçte döngü taşımasıyla bağlanır; maç
 * adımları gerçek Terrain/Entity/Projectile sınıflarıyla yürütülür. Bu, "aynı
 * makinede iki sekme" provasının headless karşılığıdır (iki farklı ağ denemesi
 * F3c sonunda elle yapılır: docs/web-lansman-plani.md §4).
 *
 * Kapsam: kurulum el sıkışması (START → maske + durum → LOADED), komut akışı,
 * tekilleştirme, 5 turluk senkron turu (her turda host/misafir durum hash'i
 * AYNI olmalı), oyma senkronu, kopma/bot/yeniden bağlanma, gecikme+kayıplı
 * girdi akışı, PeerJS taşımasının sahte Peer ile mesaj akışı ve PeerJS yoksa
 * zarif bozulma.
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "js");
const FILES = ["i18n.js", "version.js", "portal.js", "diagnostics.js", "audio.js", "characters.js", "progression.js", "profile.js", "parts.js",
  "market.js", "maps.js", "skills.js", "skill-fx.js", "robots.js", "terrain.js", "weapons.js",
  "entity.js", "projectile.js", "ai.js", "game.js", "net/protocol.js", "net/session.js",
  "net/state.js", "net/transport.js"];
const EXPORT = "\n;globalThis.__I = { Game, Entity, Projectile, Terrain, CHARACTERS, MAPS, weaponById, " +
  "resolveRobotBuild, defaultRobotProgress, NET_MSG, NET_CMD, NET_PHASE, NET_PROTOCOL_VERSION, " +
  "NET_TRANSPORT_STATUS, NetSession, LoopbackTransport, LoopbackHub, PeerJsTransport, netRoomCode, netFormatRoomCode, " +
  "netCaptureState, netApplyState, netSnapshotHash, netCaptureTerrain, netApplyTerrain, " +
  "netTerrainChange, netApplyTerrainChanges, netValidateEnvelope };";

function stubCtx() {
  const base = {
    canvas: null,
    measureText: () => ({ width: 10 }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
  return new Proxy(base, {
    get(t, k) { return k in t ? t[k] : () => undefined; },
    set(t, k, v) { t[k] = v; return true; },
  });
}
const stubCanvas = () => ({ width: 0, height: 0, style: {}, getContext: () => stubCtx() });

const sandbox = { Math, Date, console, JSON, Set, Map, Array, Object, Number, Uint8Array, Uint8ClampedArray,
  Infinity, isFinite, Proxy, document: { createElement: () => stubCanvas() }, window: { devicePixelRatio: 1 } };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(FILES.map((f) => fs.readFileSync(path.join(JS_DIR, f), "utf8")).join("\n;\n") + EXPORT,
  sandbox, { filename: "integration-bundle.js" });
const I = sandbox.__I;

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

const V = I.NET_PROTOCOL_VERSION;
const msg = (type, extra) => Object.assign({ v: V, t: type, matchId: "m1", authoritySessionId: "a1" }, extra || {});

// ── Mini maç dünyası (host yetkili) ────────────────────────────────────────
/* Gerçek Terrain/Entity/Projectile sınıfları kullanılır; simülasyon kasıtlı
 * olarak küçüktür (mermi uçuşu + arazi oyması + hasar). Amaç ağ yığınını
 * sınamak; oyunun tam fiziği ayrı testlerde (tests/run.js) sınanır. */
function makeWorld(seedTurn) {
  const map = I.MAPS[0];
  const terrain = new I.Terrain(960, 540, map);
  terrain.generate();
  const w = {
    terrain,
    turn: seedTurn || 0,
    state: "AIMING",
    turnTimer: 25,
    wind: 0,
    shooterIdx: null,
    projectiles: [],
    mines: [],
    fires: [],
    tether: null,
    players: [],
    pendingTerrain: [],
    inputs: {},
    bots: {},
    selectedMap: map,
  };
  for (let i = 0; i < 2; i++) {
    const def = I.CHARACTERS[i];
    const build = I.resolveRobotBuild(def, I.defaultRobotProgress(), { upgradesEnabled: false });
    const e = new I.Entity(160 + i * 500, 380, def.color, def.label, def, build);
    e.onGround = true;
    e.ammo = { bazooka: Infinity, grenade: 3 };
    w.players.push(e);
  }
  return w;
}

// Host kuralları: komutları uygular, simülasyonu adımlar, oymaları kuyruğa yazar.
function hostRules(world) {
  return {
    activePlayer() { return world.turn; },
    isActiveTurn(idx) { return idx === world.turn; },
    moduleConsumesShot() { return true; },
    setInput(idx, input) { world.inputs[idx] = input; world.inputCount = (world.inputCount || 0) + 1; },
    clearInput(idx) { world.inputs[idx] = null; },
    setBot(idx, on) { world.bots[idx] = on; },
    onTurnEnd() { world.turn = 1 - world.turn; },
    applyCommand(idx, cmd) {
      const e = world.players[idx];
      if (cmd.kind === I.NET_CMD.RELEASE) {
        const spec = I.weaponById(cmd.weaponId) || I.weaponById("bazooka");
        const pr = new I.Projectile(e.x + (idx === 0 ? 20 : -20), e.y - 20,
          Math.cos(cmd.angle) * (6 + 10 * cmd.power), Math.sin(cmd.angle) * (6 + 10 * cmd.power), spec);
        world.projectiles.push(pr);
        world.state = "PROJECTILE";
        world.shooterIdx = idx;
        return { ok: true, consumesShot: true };
      }
      if (cmd.kind === I.NET_CMD.JUMP) { e.vy = -7; return { ok: true, consumesShot: false }; }
      return { ok: true, consumesShot: false };
    },
    step() {
      const live = [];
      for (const pr of world.projectiles) {
        pr.x += pr.vx; pr.y += pr.vy; pr.vy += 0.35;
        let hit = pr.y >= world.terrain.h - 1;
        if (!hit && world.terrain.isSolid(pr.x, pr.y)) hit = true;
        if (hit) {
          const radius = 34;
          world.terrain.destroy(pr.x, pr.y, radius);
          world.pendingTerrain.push(I.netTerrainChange(pr.x, pr.y, radius));
          // En yakın oyuncuya mesafe tabanlı hasar
          for (const p of world.players) {
            const d = Math.hypot(p.x - pr.x, p.y - pr.y);
            if (d < radius * 2.2) p.hp = Math.max(0, p.hp - Math.round(30 * (1 - d / (radius * 2.2))));
          }
          continue;
        }
        if (pr.x > 0 && pr.x < 960 && pr.y < 540) live.push(pr);
      }
      world.projectiles = live;
      if (!live.length && world.state === "PROJECTILE") { world.state = "AIMING"; world.shooterIdx = null; }
    },
  };
}

// Misafir kuralları: yalnız hostun gönderdiğini uygular (kendi simülasyonu yok).
function guestRules(world, log) {
  return {
    applyState(snap) { return I.netApplyState(world, snap); },
    applyTerrainMask(mask) { return I.netApplyTerrain(world, mask); },
    applyTerrain(changes) { return I.netApplyTerrainChanges(world, changes); },
    onAck(id, res) { log.acks.push({ id, res }); },
  };
}

// ── Kurulum: host + misafir, döngü taşımasıyla ────────────────────────────
function setup(opts) {
  const o = opts || {};
  const clock = { now: 0 };
  const hostWorld = makeWorld(o.turn == null ? 1 : o.turn);   // 1 → misafir ilk atar
  const guestWorld = makeWorld(0);                             // misafirin arazisi FARKLI (rastgele)
  const log = { acks: [], hostSent: [], guestSent: [] };
  const [ta, tb] = I.LoopbackTransport.pair(
    Object.assign({ latencyMs: o.latencyMs || 0, lossRate: o.lossRate || 0, rng: o.rng, schedule: o.schedule, name: "a" }, o.transportA),
    Object.assign({ latencyMs: o.latencyMs || 0, lossRate: o.lossRate || 0, rng: o.rng, schedule: o.schedule, name: "b" }, o.transportB)
  );
  const host = new I.NetSession({ role: "host", transport: ta, rules: hostRules(hostWorld), now: () => clock.now });
  const guest = new I.NetSession({ role: "guest", transport: tb, rules: guestRules(guestWorld, log), now: () => clock.now });
  ta.onMessage((from, m) => { log.hostSent.push(m.t); host.handleHostMessage(from === "b" ? 1 : 0, m); });
  tb.onMessage((from, m) => { log.guestSent.push(m.t); guest.handleGuestMessage(m); });
  host.openLobby([{ playerIdx: 0 }, { playerIdx: 1 }]);
  // Gecikmeli taşımada bekleyen teslimatlar; `flush` ile sanal zaman ilerletilir.
  const flush = () => {
    const due = (o.pending && o.pending.slice()) || [];
    if (o.pending) o.pending.length = 0;
    for (const p of due) p.fn();
    return due.length;
  };
  return { host, guest, hostWorld, guestWorld, ta, tb, clock, log, flush };
}

// Kurulum el sıkışması: START → maske + tam durum → LOADED → PLAYING
function handshake(s) {
  s.host.startMatch("m1", "a1");
  s.host.sendTerrainSnapshot(I.netCaptureTerrain(s.hostWorld));
  s.host.broadcastState(I.netCaptureState(s.hostWorld, { tick: 0 }));
  s.flush();                       // misafir START'ı ve başlangıç durumunu işlesin
  s.guest.sendLoaded();            // LOADED ancak başlangıç uygulandıktan SONRA
  s.flush();
  s.host.loaded(0);
  return s;
}

// Bir atışı yürütür ve arazi/дurum yayınını yapar (her iki taraf senkron kalır).
function playShot(s, shooterIdx, angle, power, id) {
  s.host.handleHostMessage(shooterIdx, msg(I.NET_MSG.CMD, { seq: 1, id: id + "-charge", cmd: { kind: I.NET_CMD.CHARGE, chargeId: id } }));
  s.host.handleHostMessage(shooterIdx, msg(I.NET_MSG.CMD, {
    seq: 2, id, cmd: { kind: I.NET_CMD.RELEASE, chargeId: id, weaponId: "bazooka", angle, power },
  }));
  let guard = 0;
  while (s.hostWorld.state === "PROJECTILE" && guard++ < 600) {
    s.host.update(1000 / 60);
    s.clock.now += 1000 / 60;
  }
  if (s.hostWorld.pendingTerrain.length) {
    s.host.sendTerrainChanges(s.hostWorld.pendingTerrain.splice(0));
  }
  s.host.broadcastState(I.netCaptureState(s.hostWorld, { tick: guard, includeBuild: false }));
  return { steps: guard };
}

// ── 1) Kurulum el sıkışması ───────────────────────────────────────────────
let s = setup();
check("oda kuruldu", s.host.seats.length === 2 && s.host.phase === I.NET_PHASE.LOBBY);
s.host.startMatch("m1", "a1");
check("maç LOADING aşamasında bekler", s.host.phase === I.NET_PHASE.LOADING);
check("misafir START aldı ve LOADING", s.guest.phase === I.NET_PHASE.LOADING && s.guest.matchId === "m1");
s.host.sendTerrainSnapshot(I.netCaptureTerrain(s.hostWorld));
s.host.broadcastState(I.netCaptureState(s.hostWorld, { tick: 0 }));
check("misafir hostun arazisini aldı", I.netSnapshotHash({ p: s.guestWorld.terrain.solid.length }) && s.guestWorld.terrain.solid.length === s.hostWorld.terrain.solid.length);
let maskEqual = true;
for (let i = 0; i < s.hostWorld.terrain.solid.length; i++) {
  if ((s.hostWorld.terrain.solid[i] ? 1 : 0) !== (s.guestWorld.terrain.solid[i] ? 1 : 0)) { maskEqual = false; break; }
}
check("misafir arazi maskesi hostla birebir", maskEqual);
check("misafir başlangıç durumunu aldı", s.guestWorld.players[0].maxHp === s.hostWorld.players[0].maxHp);
s.guest.sendLoaded();
s.host.loaded(0);
check("yükleme onaylarından sonra iki taraf PLAYING", s.host.phase === I.NET_PHASE.PLAYING && s.guest.phase === I.NET_PHASE.PLAYING);

// ── 2) Tur: misafir atar, host uygular ────────────────────────────────────
s = handshake(setup());
check("sıra misafirde", s.hostWorld.turn === 1);
const shot = playShot(s, 1, -Math.PI / 3, 0.8, "at1");
check("atış simüle edildi ve arazi oyuldu", s.hostWorld.pendingTerrain.length === 0 && s.host.terrainVersion > 0, "adım " + shot.steps);
check("host arazi değişikliğini yayınladı", s.host.transport.status === I.NET_TRANSPORT_STATUS.OPEN);
let maskEqual2 = true;
for (let i = 0; i < s.hostWorld.terrain.solid.length; i++) {
  if ((s.hostWorld.terrain.solid[i] ? 1 : 0) !== (s.guestWorld.terrain.solid[i] ? 1 : 0)) { maskEqual2 = false; break; }
}
check("oyma sonrası iki maske birebir", maskEqual2);
check("tur sonu durum hash'i aynı", I.netSnapshotHash(I.netCaptureState(s.hostWorld, { includeBuild: false })) ===
  I.netSnapshotHash(I.netCaptureState(s.guestWorld, { includeBuild: false })));

// ── 3) Tekilleştirme uçtan uca ────────────────────────────────────────────
const beforeCount = s.hostWorld.projectiles.length;
// Aynı komut KİMLİĞİ ve AYNI payload (fingerprint eşleşmeli; farklı payload
// protokol hatası sayılır ve reddedilir — bu da ayrı sınanır).
const dupCmd = { kind: I.NET_CMD.RELEASE, chargeId: "at1", weaponId: "bazooka", angle: -Math.PI / 3, power: 0.8 };
const dupRes = s.host.handleHostMessage(1, msg(I.NET_MSG.CMD, { seq: 3, id: "at1", cmd: dupCmd }));
const conflictRes = s.host.handleHostMessage(1, msg(I.NET_MSG.CMD, {
  seq: 4, id: "at1", cmd: { kind: I.NET_CMD.RELEASE, chargeId: "at1", weaponId: "bazooka", angle: -1, power: 0.9 },
}));
check("aynı id farklı payload protokol hatası", conflictRes.reason === "COMMAND_CONFLICT");
check("yinelenen komut uygulanmadı", dupRes.duplicate === true && s.hostWorld.projectiles.length === beforeCount);
check("yinelenen komutun ACK'i misafire ulaştı", s.log.acks.some((a) => a.id === "at1" && a.res && a.res.ok === true));

// ── 4) Beş turluk senkron turu ────────────────────────────────────────────
s = handshake(setup());
let hashOk = true, terrainOk = true;
for (let turn = 0; turn < 5; turn++) {
  const shooter = s.hostWorld.turn;
  playShot(s, shooter, shooter === 0 ? -Math.PI / 3 : (-Math.PI * 2) / 3, 0.7 + 0.05 * turn, "t" + turn);
  s.host.endTurn(s.hostWorld.turn);            // kurallar sırayı çevirir
  s.host.broadcastState(I.netCaptureState(s.hostWorld, { tick: turn + 1, includeBuild: false }));
  const h = I.netSnapshotHash(I.netCaptureState(s.hostWorld, { includeBuild: false }));
  const g = I.netSnapshotHash(I.netCaptureState(s.guestWorld, { includeBuild: false }));
  if (h !== g) hashOk = false;
  for (let i = 0; i < s.hostWorld.terrain.solid.length; i++) {
    if ((s.hostWorld.terrain.solid[i] ? 1 : 0) !== (s.guestWorld.terrain.solid[i] ? 1 : 0)) { terrainOk = false; break; }
  }
  if (s.guest.turnId !== s.host.turnId) hashOk = false;
}
check("5 tur boyunca durum hash'i her turda aynı", hashOk);
check("5 tur boyunca arazi birebir aynı", terrainOk);
check("canlar düştü (maç ilerledi)", s.hostWorld.players[0].hp < s.hostWorld.players[0].maxHp || s.hostWorld.players[1].hp < s.hostWorld.players[1].maxHp);

// ── 5) Kopma → bot → aynı koltuğa dönüş ───────────────────────────────────
s = handshake(setup());
s.tb.close();
s.host.playerDisconnected(1);
check("kopma sonrası robot maçta kalır (ölü değil)", s.hostWorld.players[1].alive === true);
check("kopan oyuncunun komutu reddedilir", s.host.handleHostMessage(1, msg(I.NET_MSG.CMD, { seq: 1, id: "x", cmd: { kind: I.NET_CMD.JUMP } })).reason === "UNKNOWN_PLAYER");
s.clock.now += 13000;
check("grace dolunca bot devralır", s.host.graceExpired(1).ok === true && s.hostWorld.bots[1] === true);
const seat = s.host.seats[1].seatToken;
check("aynı koltuk kimliğiyle dönüş kabul edilir", s.host.reconnect(1, seat).ok === true && s.hostWorld.bots[1] === false);
check("yanlış kimlikle dönüş reddedilir", s.host.reconnect(1, "yanlış").reason === "BAD_SEAT_TOKEN");

// ── 6) Gecikmeli + kayıplı girdi akışı ────────────────────────────────────
const pending = [];
const sched = (fn, ms) => { pending.push({ fn, at: ms }); };
s = handshake(setup({ latencyMs: 25, lossRate: 0.5, schedule: sched, pending,
  rng: (() => { let i = 0; return () => (i++ % 2 === 0 ? 0.1 : 0.9); })() }));
check("gecikmeli el sıkışma tamamlandı (iki taraf PLAYING)", s.host.phase === I.NET_PHASE.PLAYING && s.guest.phase === I.NET_PHASE.PLAYING);
const beforeInputs = s.hostWorld.inputCount || 0;
let sent = 0;
for (let i = 0; i < 10; i++) { if (s.guest.sendInput(i % 2 ? 1 : -1, 0.1 * i).ok) sent++; }
const delivered = s.flush();
check("kayıplı akışta paketler teslim edildi (kayıp uygulamada elenir)", delivered > 0 && delivered < 10, String(delivered));
check("kayıp olsa da girdi uygulandı", (s.hostWorld.inputCount || 0) > beforeInputs && (s.hostWorld.inputCount || 0) - beforeInputs <= delivered,
  `uygulanan ${(s.hostWorld.inputCount || 0) - beforeInputs} / teslim ${delivered}`);
// Koltuk başına sequence (F4): ortak tek sayaç altı misafirde birbirini düşürür.
const guestSeq = s.host.inputSeqs.get(1);
check("eski girdi paketi birikmedi (koltuk başına monoton sequence)",
  !!guestSeq && guestSeq.last > 0 && guestSeq.last <= s.guest.inputSeq.last,
  `host ${guestSeq ? guestSeq.last : "yok"} / misafir ${s.guest.inputSeq.last}`);

// ── 7) PeerJS taşıması: sahte Peer ile mesaj akışı ────────────────────────
/* Sahte PeerJS ağı: gerçek PeerJS'te olduğu gibi İKİ ayrı bağlantı ucu olur
 * (misafirin `conn`'u ve hostun `connection` olayıyla aldığı `conn`'u). İkisi
 * birbirine bağlanır: birinin `send`'i diğerinde "data" olayı doğurur. */
function fakeConn(peerId) {
  const listeners = {};
  const conn = {
    peer: peerId, sent: [], closed: false, other: null,
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return conn; },
    emit(ev, arg) { for (const fn of listeners[ev] || []) fn(arg); },
    send(data) {
      conn.sent.push(data);
      if (conn.other && !conn.other.closed) conn.other.emit("data", data);
    },
    close() { conn.closed = true; conn.emit("close"); if (conn.other) conn.other.closed = true; },
  };
  return conn;
}
function fakePeer(opts) {
  const o = opts || {};
  const listeners = {};
  const peer = {
    id: null, destroyed: false, connections: [],
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return peer; },
    emit(ev, arg) { for (const fn of listeners[ev] || []) fn(arg); },
    connect(id) {
      const mine = fakeConn(id);
      const theirs = fakeConn(o.selfId || "host");
      mine.other = theirs;
      theirs.other = mine;
      peer.connections.push(mine);
      // Karşı uçta "connection" olayı: host kendi ucunu böyle alır.
      if (o.onOutgoing) o.onOutgoing(theirs);
      return mine;
    },
    destroy() { peer.destroyed = true; peer.emit("close"); },
  };
  return peer;
}

let hostPeer = null, guestPeer = null;
const hostTransport = new I.PeerJsTransport({
  role: "host", roomCode: "ABCDE",
  peerFactory: (id) => { hostPeer = fakePeer({ selfId: "ABCDE" }); hostPeer.id = id || "ABCDE"; return hostPeer; },
});
check("host taşıması açılır", hostTransport.open().ok === true);
hostPeer.emit("open", "ABCDE");
check("host OPEN durumuna geçer", hostTransport.isOpen() === true && hostTransport.remoteId === "ABCDE");
const guestTransport = new I.PeerJsTransport({
  role: "guest", hostId: "ABCDE",
  peerFactory: () => {
    guestPeer = fakePeer({ selfId: "peer-2", onOutgoing: (hostConn) => hostPeer.emit("connection", hostConn) });
    return guestPeer;
  },
});
guestTransport.open();
guestPeer.emit("open", "peer-2");
check("misafir hosta bağlanır", guestPeer.connections.length === 1 && guestPeer.connections[0].peer === "ABCDE");
const gConn = guestPeer.connections[0];
gConn.emit("open");
check("misafir bağlantı OPEN", guestTransport.isOpen() === true);
check("host bağlantıyı aldı ve OPEN", hostTransport.isOpen() === true);
const received = [];
hostTransport.onMessage((from, m) => received.push({ from, m }));
gConn.send(JSON.stringify({ v: V, t: I.NET_MSG.CMD, matchId: "m1", id: "k1", seq: 1 }));
// Bağlantının 'peer' alanı UZAK kimliği taşır (gerçek PeerJS semantiği): host
// tarafında bu misafirin kimliğidir. Gönderen kimliği paketten değil taşımadan gelir.
check("misafirden gönderilen mesaj hosta ulaşır (JSON çözülür)", received.length === 1 && received[0].m.id === "k1" && received[0].from === "peer-2");
check("host mesaj gönderebilir", hostTransport.send(I.NET_MSG.ACK, { v: V, t: I.NET_MSG.ACK }, true).ok === true);
check("bozuk JSON sessizce yok sayılır", (() => { gConn.send("bu json değil"); return received.length === 1; })());
gConn.emit("close");
check("bağlantı kapanınca durum CLOSED", guestTransport.status === I.NET_TRANSPORT_STATUS.CLOSED);
check("kapalı taşımada gönderim reddedilir", guestTransport.send(I.NET_MSG.CMD, {}).reason === "NOT_OPEN");

// PeerJS yoksa (CDN gelmedi / çevrimdışı): zarif bozulma
const noPeer = new I.PeerJsTransport({ role: "host", roomCode: "ABCDE", peerFactory: null });
check("PeerJS yoksa taşıma UNAVAILABLE", noPeer.open().reason === "NO_PEERJS" && noPeer.status === I.NET_TRANSPORT_STATUS.UNAVAILABLE);
check("kapalı taşımada oyun çevrimdışı kalır (durum bildirilir)", noPeer.isOpen() === false);

// ── 7b) Çok koltuklu taşıma (F4) ────────────────────────────────────────────
/* Host N bağlantı tutar: `send()` yayın, `sendTo()` TEK hedef (WELCOME/ACK),
 * bir misafirin kopması diğer koltukları kapatmaz. */
const hub = new I.LoopbackHub({});
const g1 = hub.addGuest("peer-1");
const g2 = hub.addGuest("peer-2");
const heard1 = [], heard2 = [];
g1.onMessage((from, m) => heard1.push(m.t));
g2.onMessage((from, m) => heard2.push(m.t));
check("hub iki misafir bağlar", hub.host.peers().length === 2 && hub.host.isOpen() === true);
hub.host.send(I.NET_MSG.LOBBY, { v: V, t: I.NET_MSG.LOBBY }, true);
check("host yayını iki misafire de gider", heard1.length === 1 && heard2.length === 1);
check("hedefli gönderim yalnız hedefe gider",
  hub.host.sendTo("peer-2", I.NET_MSG.WELCOME, { v: V, t: I.NET_MSG.WELCOME, seat: 2 }, true).ok === true &&
  heard1.length === 1 && heard2.length === 2);
check("bilinmeyen hedef reddedilir", hub.host.sendTo("yok", I.NET_MSG.ACK, {}).reason === "NO_SUCH_PEER");
const hostPeerCloses = [];
hub.host.onPeerClose((pid) => hostPeerCloses.push(pid));
g1.close();
check("bir misafir kopunca host açık kalır", hub.host.isOpen() === true && hub.host.peers().length === 1);
check("kopan bağlantı kimliği bildirilir", hostPeerCloses.length === 1 && hostPeerCloses[0] === "peer-1");
check("kalan koltuk yayını almaya devam eder", (() => {
  const n = heard2.length;
  hub.host.send(I.NET_MSG.STATE, { v: V, t: I.NET_MSG.STATE }, false);
  return heard2.length === n + 1;
})());
g2.close();
check("son misafir kopsa da host AÇIK kalır (yeni oyuncu bekler)",
  hub.host.isOpen() === true && hub.host.peers().length === 0);

// ── 8) Oda kodu ──────────────────────────────────────────────────────────
const codes = new Set();
for (let i = 0; i < 200; i++) codes.add(I.netRoomCode());
check("oda kodları 5 karakter ve karışan harf yok", [...codes].every((c) => c.length === 5 && !/[01IO]/.test(c)));
check("oda kodları benzersiz (200 üretim)", codes.size === 200);
check("kod okunur biçimde gösterilir", I.netFormatRoomCode("abcde") === "ABC-DE");
check("kısa kod biçimlenirken bozulmaz", I.netFormatRoomCode("ab") === "AB");

// ── Özet ──────────────────────────────────────────────────────────────────
console.log("────────────────────────────────────────────────");
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exit(1);
}

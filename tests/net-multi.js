/* Çevrimiçi ÇOK KOLTUK testi (F4) — gerçek `Game` ile, tarayıcısız.
 * Çalıştır: node tests/net-multi.js
 *
 * Ne sınanır: 2–6 koltuklu oda (host + 5 misafir), hedefli WELCOME (koltuk
 * kimliği yalnız sahibine gider), 7. bağlantıda ROOM_FULL, koltuk sayısı
 * değişimi (bağlı koltuk düşürülemez), START ile ALTI tarafın aynı dünyayı
 * kurması, sıranın 1→6→1 dönmesi ve her turda altı istemcinin durum hash'inin
 * hostla AYNI olması, eşzamanlı INPUT paketlerinin birbirini düşürmemesi.
 *
 * Taşıma: `LoopbackHub` (host + N misafir, aynı süreç, gerçek WebRTC yok).
 * Kopma/bot/yeniden bağlanma senaryoları `tests/net-reconnect.js` içinde.
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "js");
const FILES = ["i18n.js", "audio.js", "characters.js", "progression.js", "profile.js", "parts.js",
  "market.js", "maps.js", "skills.js", "skill-fx.js", "robots.js", "terrain.js", "weapons.js",
  "entity.js", "projectile.js", "ai.js", "net/protocol.js", "net/transport.js", "net/state.js",
  "net/session.js", "net/adapter.js", "online-lobby.js", "game.js"];
const EXPORT = "\n;globalThis.__M = { Game, OnlineLobby, CHARACTERS, MAPS, NET_MSG, NET_CMD, NET_PHASE, " +
  "NET_MAX_SEATS, NET_PROTOCOL_VERSION, LoopbackHub, netCaptureState, netSnapshotHash, " +
  "netCaptureTerrain };";

// ── Sahte DOM (tests/net-game.js ile aynı sınır: hiçbir piksel üretmez) ─────
function stubCtx() {
  const base = {
    canvas: null,
    measureText: () => ({ width: 24 }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
  return new Proxy(base, {
    get(t, k) { return k in t ? t[k] : () => undefined; },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function fakeElement(id) {
  return {
    id: id || "", textContent: "", title: "", value: "100", scrollLeft: 0, _html: "",
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); this.children.length = 0; },
    dataset: {}, style: { setProperty() {}, bottom: "", removeProperty() {} },
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, on) {
        if (on === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); }
        else if (on) this._s.add(c); else this._s.delete(c);
      },
      contains(c) { return this._s.has(c); },
    },
    offsetHeight: 108, offsetLeft: 0, offsetWidth: 90, clientWidth: 960, clientHeight: 540,
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {}, blur() {}, focus() {},
    children: [],
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    insertBefore(c) { this.children.unshift(c); return c; },
    replaceChildren() { this.children.length = 0; },
    get firstChild() { return this.children[0] || null; },
    get lastChild() { return this.children[this.children.length - 1] || null; },
    querySelector() { return null; }, querySelectorAll() { return this.children.slice(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 540, right: 960, bottom: 540 }; },
    closest() { return null; }, requestFullscreen() {}, contains() { return false; },
  };
}
function makeDom() {
  const elements = new Map();
  const storage = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, fakeElement(id));
      return elements.get(id);
    },
    createElement(tag) {
      const el = fakeElement(tag);
      el.getContext = () => stubCtx();
      if (tag === "canvas") { el.width = 960; el.height = 540; }
      return el;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    dispatchEvent() { return true; },
    head: fakeElement("head"), body: fakeElement("body"),
    fonts: { load() {}, ready: Promise.resolve() },
    fullscreenElement: null,
    exitFullscreen() {},
  };
  const storageApi = () => ({
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => { storage.set(k, String(v)); },
    removeItem: (k) => { storage.delete(k); },
    clear: () => storage.clear(),
    key: (i) => [...storage.keys()][i],
    get length() { return storage.size; },
  });
  const win = {
    devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {},
    requestAnimationFrame() { return 0; },
    cancelAnimationFrame() {},
    location: { href: "file:///game/index.html", search: "", hash: "" },
    navigator: { language: "tr-TR", userAgent: "node" },
    localStorage: storageApi(), sessionStorage: storageApi(),
    CustomEvent: function CustomEvent(type, opts) { this.type = type; this.detail = opts && opts.detail; },
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  return { document, window: win };
}

const dom = makeDom();
const sandbox = {
  Math, Date, console, JSON, Set, Map, Array, Object, Number, String, Boolean, Error,
  Uint8Array, Uint8ClampedArray, Int32Array, Infinity, NaN, isFinite, isNaN, parseInt, parseFloat,
  Proxy, Symbol, Promise, RegExp, Function, setTimeout, clearTimeout, setInterval, clearInterval,
  document: dom.document, window: dom.window, navigator: dom.window.navigator,
  localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage,
  requestAnimationFrame: () => 0, location: dom.window.location,
  CustomEvent: dom.window.CustomEvent, performance: { now: () => 0 },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(FILES.map((f) => fs.readFileSync(path.join(JS_DIR, f), "utf8")).join("\n;\n") + EXPORT,
  sandbox, { filename: "game-multi-bundle.js" });
const M = sandbox.__M;

// ── Minik test çatısı ──────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

const PHASE = M.NET_PHASE;
const newGame = () => new M.Game(dom.document.createElement("canvas"));

/* Oda kur: host + `guestRobots.length` misafir. Her oyuncu GERÇEK bir Game
 * örneğidir (ayrı sekme karşılığı), aynı süreçte döngü taşımasıyla bağlı. */
function makeRoom(seatCount, guestRobots) {
  const hub = new M.LoopbackHub({});
  // Hostun yayınladığı SON durum paketi yakalanır: "host ne gönderdi ↔ misafir
  // ne uyguladı" sorusu böyle sorulur (anlık karşılaştırma, 10 Hz yayında
  // misafirin bir paket geride olması yüzünden yanlış alarm verir).
  const tap = { lastState: null };
  const origSend = hub.host.send.bind(hub.host);
  hub.host.send = (type, payload, reliable) => {
    if (type === M.NET_MSG.STATE) tap.lastState = payload;
    return origSend(type, payload, reliable);
  };
  const host = newGame();
  host.openOnline();
  host.lobby.robotId = M.CHARACTERS[0].id;
  host.lobby.adoptTransport(hub.host, { role: "host", code: "ABCDE" });
  // Kapasite oda açıldıktan sonra seçilir (lobideki 2–6 düğmelerinin yolu).
  if (seatCount !== 2) host.lobby.setSeatCount(seatCount);
  const guests = [];  for (let i = 0; i < guestRobots.length; i++) {
    const g = newGame();
    g.openOnline();
    g.lobby.robotId = guestRobots[i];
    /* Testte tek sahte `sessionStorage` var; gerçekte her misafir AYRI
     * tarayıcıdır. Paylaşılan depo yüzünden ikinci misafir birincinin koltuk
     * kimliğini okuyup aynı koltuğa otururdu — depo burada ayrıştırılır. */
    g.lobby._storedSeatToken = () => null;
    g.lobby._storeSeatToken = () => {};
    g.lobby.adoptTransport(hub.addGuest("peer-" + (i + 1)), { role: "guest", code: "ABCDE" });
    guests.push(g);
  }
  return { hub, host, guests, tap };
}

const stateHash = (game) => M.netSnapshotHash(M.netCaptureState(game, { includeBuild: false }));
const maskHash = (game) => M.netCaptureTerrain(game).hash;
// Misafirlerin kopyası hostun SON gönderdiği paketle birebir mi?
/* Misafirler bir kare bile ilerletilmeden karşılaştırılır: misafirin yerel
 * görsel fiziği (vx gibi) kendi kopyasını çok az kaydırır, o yüzden "host ne
 * gönderdi ↔ misafir ne uyguladı" sorusu ANCAK paket tazeyken anlamlıdır. */
function syncToLatestState(room, maxFrames) {
  const before = room.tap.lastState;
  for (let i = 0; i < (maxFrames || 60); i++) {
    room.host.update(1 / 60);
    if (room.tap.lastState !== before) return true;
  }
  return false;
}
function guestsMatchLastSent(room) {
  const sent = room.tap.lastState;
  if (!sent) return false;
  const want = M.netSnapshotHash(Object.assign({}, sent.state, { tick: 0 }));
  return room.guests.every((g) =>
    M.netSnapshotHash(Object.assign(M.netCaptureState(g, { includeBuild: false }), { tick: 0 })) === want);
}

// Tüm tarafları bir kare ilerlet (host simülasyonu yürütür, misafirler çizer).
function frame(room) {
  room.host.update(1 / 60);
  for (const g of room.guests) g.update(1 / 60);
}
function frames(room, n) { for (let i = 0; i < n; i++) frame(room); }

// Sıradaki oyuncunun atışını yap (sıra kimdeyse o Game üzerinden — yetki hostta).
function shoot(room) {
  const turn = room.host.turn;
  const shooter = turn === 0 ? room.host : room.guests[turn - 1];
  shooter.startCharge();
  shooter.input.power = 0.7;
  shooter.releaseFire();
  return { turn, shotFired: room.host.state === "PROJECTILE" || room.host.projectiles.length > 0 };
}

// ── 1) Oda kapasitesi ve hedefli el sıkışma ────────────────────────────────
const robots = [1, 2, 3, 4, 5].map((i) => M.CHARACTERS[i].id);
const room = makeRoom(M.NET_MAX_SEATS, robots);
const s = room.host.lobby.session;

check("6 koltuklu oda açıldı", s.seats.length === 6 && M.NET_MAX_SEATS === 6);
check("host + 5 misafir oturdu", s.seats.filter((x) => x.claimed).length === 6);
check("koltuklar sırayla dağıtıldı (1..5)", room.guests.map((g) => g.lobby.session.mySeat).join() === "1,2,3,4,5",
  room.guests.map((g) => g.lobby.session.mySeat).join());
check("her misafirin robotu kendi koltuğunda", s.seats.slice(1).map((x) => x.robotId).join() === robots.join(),
  s.seats.slice(1).map((x) => x.robotId).join());
check("host oda durumunu 6 koltukla yayınladı",
  !!room.guests[0].lobby.session.lobbyState && room.guests[0].lobby.session.lobbyState.seats.length === 6);

/* WELCOME hedefli: koltuk kimliği taşıyan paket YALNIZ yeni katılana gider.
 * Yayın yapılsaydı sonradan gelen misafirin kimliği diğerlerine sızardı. */
const welcomeSeen = { c: 0 };
const g0 = room.guests[0].lobby.session;
const origGuestMessage = g0.handleGuestMessage.bind(g0);
g0.handleGuestMessage = (msg) => { if (msg && msg.t === M.NET_MSG.WELCOME) welcomeSeen.c++; return origGuestMessage(msg); };
room.hub.addGuest("peer-9");   // 7. bağlantı: HELLO gönderir ama WELCOME almamalı
const late = newGame();
late.openOnline();
late.lobby.robotId = M.CHARACTERS[6].id;
late.lobby._storedSeatToken = () => null;
late.lobby._storeSeatToken = () => {};
late.lobby.adoptTransport(room.hub.addGuest("peer-7"), { role: "guest", code: "ABCDE" });
check("7. oyuncu ROOM_FULL alır", late.lobby.error && late.lobby.error.code === "ROOM_FULL",
  late.lobby.error ? late.lobby.error.code : "hata yok");
check("7. oyuncu koltuğa oturmadı", late.lobby.session.mySeat == null);
check("dolu odaya gelen HELLO mevcut misafirlere WELCOME sızdırmadı", welcomeSeen.c === 0, String(welcomeSeen.c));
check("koltuk sayısı düşürülemez (bağlı koltuklar var)",
  room.host.lobby.session.setSeatCount(3).reason === "SEATS_OCCUPIED" &&
  room.host.lobby.session.seats.length === 6);

// Koltuk sayısı boş koltuklarda değişebilir (2 → 4 → 2), bağlı koltuğa dokunmadan.
const small = makeRoom(2, [M.CHARACTERS[1].id]);
check("boş koltuk eklenebilir (2 → 4)", small.host.lobby.setSeatCount(4) === true &&
  small.host.lobby.session.seats.length === 4);
check("boş koltuk çıkarılabilir (4 → 2)", small.host.lobby.setSeatCount(2) === true &&
  small.host.lobby.session.seats.length === 2);
check("bağlı koltuk varken altına inilemez", small.host.lobby.setSeatCount(1) === true &&
  small.host.lobby.session.seats.length === 2, String(small.host.lobby.session.seats.length));

// ── 2) START: altı taraf AYNI dünyayı kurar ───────────────────────────────
check("hazır olmadan başlatılamaz", room.host.lobby.session.canStart() === false);
for (const g of room.guests) g.lobby.toggleReady();
check("beşi hazır olunca başlatılabilir", room.host.lobby.session.canStart() === true);
check("host maçı başlattı", room.host.lobby.startMatch() === true);
check("host altı robotla kurdu", room.host.players.length === 6 && room.host.mode === "online",
  `${room.host.players.length} / ${room.host.mode}`);
check("her misafir altı robotla kurdu", room.guests.every((g) => g.players.length === 6),
  room.guests.map((g) => g.players.length).join());
const rosterIds = room.host.selectedChars.map((c) => c.id).join();
check("altı taraf aynı kadroda", room.guests.every((g) => g.selectedChars.map((c) => c.id).join() === rosterIds),
  room.guests.map((g) => g.selectedChars.map((c) => c.id).join()).join(" | "));
check("koltuk sırası ile robots eşleşiyor (players[i] = koltuk i)",
  rosterIds === [M.CHARACTERS[0].id].concat(robots).join(), rosterIds);
check("arazi maskesi beş misafire de BİREBİR geçti",
  room.guests.every((g) => maskHash(g) === maskHash(room.host)));
check("başlangıçta altı tarafın durum hash'i aynı",
  room.guests.every((g) => stateHash(g) === stateHash(room.host)));
check("yükleme onayları toplandı (PLAYING)", room.host.lobby.session.phase === PHASE.PLAYING &&
  room.guests.every((g) => g.lobby.session.phase === PHASE.PLAYING));

// ── 3) Eşzamanlı INPUT: koltuk başına sequence ────────────────────────────
/* Ortak sayaç kullanılsaydı beş misafirin paketleri birbirini "eski" diye
 * düşürür ve yalnız biri yürüyebilirdi. */
for (let i = 0; i < 3; i++) for (const g of room.guests) g.lobby.session.sendInput(i % 2 ? 1 : -1, { x: 100, y: 200 });
check("her koltuğun girdi akışı ilerledi (biri diğerini düşürmedi)",
  room.guests.every((g, i) => {
    const seq = room.host.lobby.session.inputSeqs.get(i + 1);
    return !!seq && seq.last === g.lobby.session.inputSeq.last;
  }), room.guests.map((g, i) => {
    const seq = room.host.lobby.session.inputSeqs.get(i + 1);
    return `${i + 1}:${seq ? seq.last : "-"}/${g.lobby.session.inputSeq.last}`;
  }).join(" "));

// ── 4) Sıra 1→6→1 döner, her turda altı taraf senkron ─────────────────────
/* `shoot()` sıradaki oyuncunun Game'i üzerinden atış yapar: host ise doğrudan,
 * misafirse RELEASE komutuyla (yetki hostta). Altı turun her birinde tüm
 * istemcilerin hash'i hostla aynı olmalı. */
const turnOrder = [];
let guard = 0;
for (let t = 0; t < 6 && room.host.state !== "GAMEOVER"; t++) {
  const startTurnId = room.host.turnId;
  turnOrder.push(room.host.turn);
  const res = shoot(room);
  check(`tur ${t + 1}: koltuk ${res.turn} atışı hosta ulaştı`, res.shotFired);
  guard = 0;
  while (room.host.turnId === startTurnId && room.host.state !== "GAMEOVER" && guard++ < 1200) frame(room);
  if (room.host.state === "GAMEOVER") break;
  frames(room, 8);   // TURN paketi + son durum yayını yerleşsin
  check(`tur ${t + 1}: sıra ${(res.turn + 1) % 6 + 1}. koltuğa geçti`,
    room.host.turn === (res.turn + 1) % 6, `host sırası ${room.host.turn}`);
  check(`tur ${t + 1}: beş misafir de aynı sırada ve sayaçta`,
    room.guests.every((g) => g.turn === room.host.turn && g.turnId === room.host.turnId),
    room.guests.map((g) => `${g.turn}/${g.turnId}`).join(" "));
  check(`tur ${t + 1}: oyma sonrası arazi altı tarafta birebir`,
    room.guests.every((g) => maskHash(g) === maskHash(room.host)));
  syncToLatestState(room);
  check(`tur ${t + 1}: gönderilen durum beş misafirde birebir`, guestsMatchLastSent(room));
}
check("sıra 1→2→3→4→5→6 döndü", turnOrder.join() === "0,1,2,3,4,5", turnOrder.join());

// ── 5) Turu olmayan misafirin komutu reddedilir ───────────────────────────
const activeSeat = room.host.turn;
const other = room.guests.find((g, i) => i + 1 !== activeSeat);
if (other) {
  const otherIdx = other.lobby.session.mySeat;
  const res = room.host.lobby.session.handleHostMessage(otherIdx, {
    v: M.NET_PROTOCOL_VERSION, t: M.NET_MSG.CMD,
    matchId: room.host.lobby.session.matchId,
    authoritySessionId: room.host.lobby.session.authoritySessionId,
    turnId: room.host.lobby.session.turnId, seq: 99, id: "s" + otherIdx + "-tur",
    cmd: { kind: M.NET_CMD.JUMP },
  });
  check("sırası olmayan koltuk NOT_YOUR_TURN alır", res && res.reason === "NOT_YOUR_TURN",
    res ? res.reason : "yanıt yok");
}

// ── Özet ──────────────────────────────────────────────────────────────────
console.log("────────────────────────────────────────────────");
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exitCode = 1;
}

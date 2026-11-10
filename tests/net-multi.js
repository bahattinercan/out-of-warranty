/* Çevrimiçi ÇOK KOLTUK testi (F4) — gerçek `Game` ile, tarayıcısız.
 * Çalıştır: node tests/net-multi.js
 *
 * Ne sınanır: 2–6 koltuklu oda (host + 5 misafir), hedefli WELCOME (koltuk
 * kimliği yalnız sahibine gider), 7. bağlantıda ROOM_FULL, koltuk sayısı
 * değişimi (bağlı koltuk düşürülemez), START ile ALTI tarafın aynı dünyayı
 * kurması, sıranın 1→6→1 dönmesi ve her turda altı istemcinin hostun son
 * paketiyle AYNI olması, eşzamanlı INPUT paketlerinin birbirini düşürmemesi.
 *
 * Ortam: tests/harness.js (sahte DOM + oyun paketi). Taşıma: `LoopbackHub`.
 * Kopma/bot/yeniden bağlanma: tests/net-reconnect.js.
 */
const { G: M, dom } = require("./harness.js");
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

/* Çevrimiçi KOPMA testi (F4) — kopma → bot devralma → yeniden bağlanma.
 * Çalıştır: node tests/net-reconnect.js
 *
 * Ne sınanır:
 *  1. Lobide ayrılan oyuncunun koltuğu boşalır ve oda yeni oyuncu alır.
 *  2. Maçta kopan oyuncunun robotu grace boyunca insan kalır (ölmez), süre
 *     dolunca BOT devralır ve bot sırası gelince oynar.
 *  3. Aynı anda iki koltuk koparsa ikisi BAĞIMSIZ ele alınır.
 *  4. Sayfası yenilenen oyuncu aynı KOLTUK KİMLİĞİYLE döner: dünya (START +
 *     arazi maskesi + tam durum) yeniden kurulur, bot kapanır, oyuncu yine
 *     oynayabilir. Geri dönüş paketleri YALNIZ o koltuğa gider.
 *
 * Ortam: tests/harness.js. Taşıma: `LoopbackHub` (host + N misafir).
 */
const { G: M, dom } = require("./harness.js");

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

const PHASE = M.NET_PHASE;
const newGame = () => new M.Game(dom.document.createElement("canvas"));

/* Oda kur. Misafirlerin depolaması AYRIŞTIRILIR: testte tek sahte
 * `sessionStorage` var, gerçekte her misafir ayrı tarayıcıdır. */
function makeRoom(seatCount, guestRobots) {
  const hub = new M.LoopbackHub({});
  const host = newGame();
  host.openOnline();
  host.lobby.robotId = M.CHARACTERS[0].id;
  host.lobby.adoptTransport(hub.host, { role: "host", code: "ABCDE" });
  if (seatCount !== 2) host.lobby.setSeatCount(seatCount);
  const guests = [];
  for (let i = 0; i < guestRobots.length; i++) {
    const g = newGame();
    g.openOnline();
    g.lobby.robotId = guestRobots[i];
    g.lobby._storedSeatToken = () => null;
    g.lobby._storeSeatToken = () => {};
    g.lobby.adoptTransport(hub.addGuest("peer-" + (i + 1)), { role: "guest", code: "ABCDE" });
    guests.push(g);
  }
  return { hub, host, guests };
}

// Sahte saat: grace süresi gerçek zaman beklenmeden sınanır.
let clock = 0;
function useFakeClock(room) {
  clock = 0;
  room.host.lobby.session.now = () => clock;
}

const stateHash = (game) => M.netSnapshotHash(M.netCaptureState(game, { includeBuild: false }));
const maskHash = (game) => M.netCaptureTerrain(game).hash;

function frames(room, n) {
  for (let i = 0; i < (n || 1); i++) {
    room.host.update(1 / 60);
    for (const g of room.guests) g.update(1 / 60);
  }
}

// Sıradaki oyuncu atışını yapar: host kendi koltuğu, misafir komutla.
function shotForCurrent(room) {
  const turn = room.host.turn;
  const shooter = turn === 0 ? room.host : room.guests[turn - 1];
  if (!shooter || shooter.lobby.session.phase !== PHASE.PLAYING) return false;
  shooter.startCharge();
  shooter.input.power = 0.7;
  shooter.releaseFire();
  return true;
}

/* Turu `seat` koltuğuna kadar ilerlet. Arada kalan bot koltuklarını bot
 * kendisi oynar (onlara dokunulmaz); insan koltukları atış yapar. */
function advanceToSeat(room, seat, maxFrames) {
  let guard = 0;
  while (room.host.turn !== seat && room.host.state !== "GAMEOVER" && guard++ < (maxFrames || 3000)) {
    if (room.host.state === "AIMING" && !room.host.lobby.session.shotConsumed) {
      const t = room.host.turn;
      const isBot = room.host.players[t] && room.host.players[t].control === "bot";
      if (!isBot) shotForCurrent(room);
    }
    frames(room, 1);
  }
  return room.host.turn === seat;
}

const robots = [1, 2].map((i) => M.CHARACTERS[i].id);

// ── 1) Lobide kopma: koltuk boşalır, oda yeni oyuncu alır ─────────────────
const lobbyRoom = makeRoom(2, [robots[0]]);
const ls = lobbyRoom.host.lobby.session;
check("lobide misafir koltuğa oturdu", ls.seats[1].claimed === true);
lobbyRoom.guests[0].lobby.transport.close();
check("ayrılan misafirin koltuğu boşaldı", ls.seats[1].claimed === false && ls.seats[1].connected === false);
check("koltuk boşalınca maç başlatılamaz", ls.canStart() === false);
const newbie = newGame();
newbie.openOnline();
newbie.lobby.robotId = M.CHARACTERS[3].id;
newbie.lobby._storedSeatToken = () => null;
newbie.lobby._storeSeatToken = () => {};
newbie.lobby.adoptTransport(lobbyRoom.hub.addGuest("peer-yeni"), { role: "guest", code: "ABCDE" });
check("boşalan koltuğa yeni oyuncu girebilir",
  ls.seats[1].claimed === true && newbie.lobby.session.mySeat === 1);

// ── 2) Maçta kopma: grace → bot devralır, bot sırası gelince oynar ────────
const room = makeRoom(3, robots);
useFakeClock(room);
for (const g of room.guests) g.lobby.toggleReady();
check("3 koltuklu maç başladı", room.host.lobby.startMatch() === true && room.host.players.length === 3,
  String(room.host.players.length));
const hs = room.host.lobby.session;
const seatToken2 = hs.seats[2].seatToken;
// İlk turu kapat: kopma senaryosu maç AKARKEN sınanmalı.
advanceToSeat(room, 1);
check("maç akıyor (tur 1 kapandı)", room.host.turnId >= 2, String(room.host.turnId));

// Seat 2 kopar. Diğer koltuklar etkilenmemeli; robot HEMEN bot olmamalı.
const guest2 = room.guests[1];
guest2.lobby.transport.close();
check("kopan koltuk disconnected işaretlendi",
  hs.seats[2].connected === false && hs.seats[2].bot === false);
check("grace sırasında robot hâlâ insan", room.host.players[2].control === "human");
check("diğer misafir bağlı kaldı", hs.seats[1].connected === true);
const otherGuestSees = room.guests[0].lobby.session.phase;
check("kalan misafirin oturumu PLAYING", otherGuestSees === PHASE.PLAYING, otherGuestSees);

// Grace dolmadan bot devralmaz.
frames(room, 30);
check("grace dolmadan bot yok", hs.seats[2].bot === false && room.host.players[2].control === "human");
// Grace dolsun: saat ilerlet + host karelerini sür (denetim 500 ms'de bir).
clock += M.NET_GRACE_MS + 500;
frames(room, 40);
check("grace dolunca bot devraldı", hs.seats[2].bot === true && room.host.players[2].control === "bot",
  `bot ${hs.seats[2].bot} / kontrol ${room.host.players[2].control}`);

// Bot sırası gelince KENDİSİ oynar: insan girdisi olmadan tur kapanmalı.
check("bot koltuğunun sırasına gelindi", advanceToSeat(room, 2), String(room.host.turn));
const botTurnId = room.host.turnId;
let botGuard = 0;
while (room.host.turnId === botTurnId && room.host.state !== "GAMEOVER" && botGuard++ < 1800) frames(room, 1);
check("bot kendi turunu oynadı (tur kapandı)", room.host.turnId > botTurnId,
  `turnId ${botTurnId} → ${room.host.turnId}, ${botGuard} kare`);
check("bot oynarken sıra ilerledi", room.host.turn !== 2 || room.host.state === "GAMEOVER");

// ── 3) Sayfası yenilenen oyuncu AYNI koltuğa döner ────────────────────────
/* Diğer misafirin gördüğü START sayısı: geri dönüş paketleri ONA gitmemeli. */
const otherGuest = room.guests[0];
const startSeen = { c: 0 };
const origGuestMessage = otherGuest.lobby.session.handleGuestMessage.bind(otherGuest.lobby.session);
otherGuest.lobby.session.handleGuestMessage = (msg) => {
  if (msg && msg.t === M.NET_MSG.START) startSeen.c++;
  return origGuestMessage(msg);
};

const fresh = newGame();
fresh.openOnline();
fresh.lobby.robotId = robots[1];
fresh.lobby._storedSeatToken = () => seatToken2;
fresh.lobby._storeSeatToken = () => {};
fresh.lobby.adoptTransport(room.hub.addGuest("peer-2b"), { role: "guest", code: "ABCDE" });

check("dönen oyuncu aynı koltuğa oturdu", fresh.lobby.session.mySeat === 2,
  String(fresh.lobby.session.mySeat));
check("host koltukta bağlantıyı yeniden kurdu", hs.seats[2].connected === true && hs.seats[2].bot === false);
check("robot yeniden insan kontrolünde", room.host.players[2].control === "human",
  room.host.players[2].control);
check("dönen oyuncunun dünyası YENİDEN kuruldu (3 robot)",
  fresh.players.length === 3 && fresh.mode === "online", `${fresh.players.length}`);
check("kadro iki tarafta aynı",
  fresh.selectedChars.map((c) => c.id).join() === room.host.selectedChars.map((c) => c.id).join());
check("arazi maskesi dönen oyuncuda birebir", maskHash(fresh) === maskHash(room.host));
check("tam durum dönen oyuncuya uygulandı", stateHash(fresh) === stateHash(room.host),
  `${stateHash(fresh)} / ${stateHash(room.host)}`);
check("tur sayacı iki tarafta aynı", fresh.turnId === room.host.turnId, `${fresh.turnId} / ${room.host.turnId}`);
check("geri dönüş paketleri DİĞER misafire gitmedi", startSeen.c === 0, String(startSeen.c));
check("dönen oyuncu yine oynayabilir (yerel tur mantığı)",
  (room.host.turn !== 2) || (fresh.isLocalTurn() === true && room.host.isLocalTurn() === false));
// Bu koltuk artık `fresh` tarafından oynanır: oda kaydındaki eski (kapalı)
// taşımayı değiştir, yoksa sonraki atışlar ölü bağlantıya gider.
room.guests[1] = fresh;
// Periyodik paketler gelsin: geri dönüş paketi anlık bir fotoğraftır (host o an
// SETTLE'da olabilir); aşama/sıra ancak sonraki snapshot'larla oturur.
frames(room, 12);

// Dönen oyuncu emir verebiliyor mu? (yetki hostta)
if (room.host.turn !== 2) advanceToSeat(room, 2);
/* Misafir AŞAMAYI snapshot'tan öğrenir (≤100 ms gecikme): host AIMING'e geçtiği
 * anda misafir hâlâ SETTLE'da olabilir. Atıştan önce aşamanın oturması beklenir. */
for (let i = 0; i < 40 && room.host.state === "AIMING" && fresh.state !== "AIMING"; i++) frames(room, 1);
if (room.host.turn === 2 && room.host.state === "AIMING" && fresh.state === "AIMING") {
  const seqBefore = hs.inputSeqs.get(2) ? hs.inputSeqs.get(2).last : -1;
  fresh.lobby.session.sendInput(1, { x: 200, y: 300 });
  const seqAfter = hs.inputSeqs.get(2) ? hs.inputSeqs.get(2).last : -1;
  check("dönen oyuncunun girdisi kabul edildi", seqAfter > seqBefore, `${seqBefore} → ${seqAfter}`);
  const beforeTurn = room.host.turnId;
  shotForCurrent(room);
  let guard = 0;
  while (room.host.turnId === beforeTurn && room.host.state !== "GAMEOVER" && guard++ < 1200) frames(room, 1);
  check("dönen oyuncu atış yapıp turu kapattı", room.host.turnId > beforeTurn,
    `turnId ${beforeTurn} → ${room.host.turnId}`);
}

// ── 4) İki koltuk birden koparsa ikisi BAĞIMSIZ ele alınır ────────────────
const room2 = makeRoom(3, robots);
useFakeClock(room2);
for (const g of room2.guests) g.lobby.toggleReady();
room2.host.lobby.startMatch();
const hs2 = room2.host.lobby.session;
room2.guests[0].lobby.transport.close();
room2.guests[1].lobby.transport.close();
check("iki koltuk da disconnected", hs2.seats[1].connected === false && hs2.seats[2].connected === false);
clock += M.NET_GRACE_MS + 500;
frames(room2, 40);
check("iki koltuk bağımsız olarak bota geçti",
  hs2.seats[1].bot === true && hs2.seats[2].bot === true &&
  room2.host.players[1].control === "bot" && room2.host.players[2].control === "bot");
check("host kendi robotu insan kaldı", room2.host.players[0].control === "human");

// ── Özet ──────────────────────────────────────────────────────────────────
console.log("────────────────────────────────────────────────");
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exitCode = 1;
}

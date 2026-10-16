/* Çevrimiçi protokol + oturum testleri (F3a) — saf Node, bağımlılıksız.
 * Çalıştır: node tests/net.js
 *
 * Sözleşme (docs/multiplayer-plan.md §6/§6.1 ve docs/web-lansman-plani.md §4):
 *   - Zarf doğrulaması: sürüm, tür, maç kimliği, yetki oturumu, sıra.
 *   - Komut doğrulaması: bilinmeyen tür, NaN/Infinity, aralık dışı değer reddi.
 *   - Tekilleştirme: aynı commandId ikinci kez UYGULANMAZ, önceki sonuç döner;
 *     aynı id farklı payload → protokol hatası; kapanan tur → stale.
 *   - Değişmezler: tek aktif tur, atış hakkı atomik, paket fiziği ilerletmez,
 *     chargeId bir kez kapanır, tur bitişi bir kez, kopma ölüm değildir.
 *   - Saat: sabit adım, uyanış başına en fazla 8 adım, borç taşınır, 250 ms
 *     aşımı ABORT üretir.
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "js");
const FILES = ["net/protocol.js", "net/session.js"];
const EXPORT = "\n;globalThis.__NET = { NET_PROTOCOL_VERSION, NET_MSG, NET_CMD, NET_PHASE, " +
  "NET_GRACE_MS, NET_INPUT_STALE_MS, NET_MAX_SIM_DEBT_MS, netValidateEnvelope, netValidateCommand, " +
  "netEncodedSize, netIsReliable, NetSequence, NetCommandCache, NetInputTracker, NetSession };";

const sandbox = { console, Math, Object, Array, Set, Map, String, Number, JSON, Infinity, isFinite };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(FILES.map((f) => fs.readFileSync(path.join(JS_DIR, f), "utf8")).join("\n;\n") + EXPORT,
  sandbox, { filename: "net-bundle.js" });
const N = sandbox.__NET;

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

// ── Sahte taşıma: gönderilen mesajları kaydeder ─────────────────────────────
function fakeTransport() {
  const sent = [];
  return {
    sent,
    send(type, payload, reliable) { sent.push({ type, payload, reliable }); },
    last(type) { for (let i = sent.length - 1; i >= 0; i--) if (sent[i].type === type) return sent[i]; return null; },
    count(type) { return sent.filter((m) => m.type === type).length; },
  };
}

// ── Sahte oyun kuralları: çağrıları sayar, kararı test belirler ─────────────
function fakeRules(opts) {
  const o = opts || {};
  const calls = { step: 0, apply: [], clearInput: [], setBot: [], onTurnEnd: [], applyState: [], applyTerrain: [], mask: [] };
  return {
    calls,
    active: o.active == null ? 0 : o.active,
    activePlayer() { return this.active; },
    isActiveTurn(idx) { return idx === this.active; },
    moduleConsumesShot() { return o.moduleConsumesShot !== false; },
    setInput(idx, input) { calls.lastInput = { idx, input }; },
    clearInput(idx) { calls.clearInput.push(idx); },
    step() { calls.step++; },
    applyCommand(idx, cmd) { calls.apply.push({ idx, cmd }); return o.applyResult || { ok: true, consumesShot: cmd.kind === N.NET_CMD.RELEASE }; },
    onTurnEnd(turnId) { calls.onTurnEnd.push(turnId); },
    setBot(idx, on) { calls.setBot.push({ idx, on }); },
    applyState(s) { calls.applyState.push(s); },
    applyTerrain(ch) { calls.applyTerrain.push(ch); },
    applyTerrainMask(m) { calls.mask.push(m); },
    onAck(id, res) { calls.lastAck = { id, res }; },
  };
}

const V = N.NET_PROTOCOL_VERSION;
const env = (type, extra) => Object.assign({ v: V, t: type, matchId: "m1", authoritySessionId: "a1" }, extra || {});

// ── 1) Zarf ve komut doğrulaması ────────────────────────────────────────────
check("sürüm uyuşmazlığı reddedilir", N.netValidateEnvelope({ v: 99, t: N.NET_MSG.PING }, {}).reason === "PROTOCOL_MISMATCH");
check("bilinmeyen tür reddedilir", N.netValidateEnvelope({ v: V, t: "yok" }, {}).reason === "UNKNOWN_TYPE");
check("bozuk mesaj reddedilir", N.netValidateEnvelope(null, {}).reason === "BAD_MESSAGE");
check("yanlış maç kimliği reddedilir", N.netValidateEnvelope(env(N.NET_MSG.STATE), { matchId: "m2" }).reason === "WRONG_MATCH");
check("eski yetki oturumu reddedilir", N.netValidateEnvelope(env(N.NET_MSG.STATE), { authoritySessionId: "a2" }).reason === "STALE_AUTHORITY");
check("negatif sıra reddedilir", N.netValidateEnvelope(env(N.NET_MSG.INPUT, { seq: -1 }), {}).reason === "BAD_SEQ");
check("komut kimliği zorunlu", N.netValidateEnvelope(env(N.NET_MSG.CMD, { seq: 1 }), {}).reason === "BAD_COMMAND_ID");
check("PING maç kimliği istemez", N.netValidateEnvelope({ v: V, t: N.NET_MSG.PING }, { matchId: "m1" }).ok === true);

check("bilinmeyen komut reddedilir", N.netValidateCommand({ kind: "ışınlan" }).reason === "UNKNOWN_COMMAND");
check("NaN açı reddedilir", N.netValidateCommand({ kind: N.NET_CMD.RELEASE, chargeId: "x", weaponId: "bazooka", angle: NaN, power: 0.5 }).reason === "BAD_ANGLE");
check("aralık dışı güç reddedilir", N.netValidateCommand({ kind: N.NET_CMD.RELEASE, chargeId: "x", weaponId: "bazooka", angle: 0.5, power: 3 }).reason === "BAD_POWER");
check("bilinmeyen silah reddedilir", N.netValidateCommand({ kind: N.NET_CMD.RELEASE, chargeId: "x", weaponId: "", angle: 0.5, power: 0.5 }).reason === "BAD_WEAPON");
check("hava desteğinde hedef zorunlu", N.netValidateCommand({ kind: N.NET_CMD.RELEASE, chargeId: "x", weaponId: "airstrike", angle: 0.5, power: 0.5, airdrop: true }).reason === "BAD_TARGET");
check("hava desteği hedefle geçerli", N.netValidateCommand({ kind: N.NET_CMD.RELEASE, chargeId: "x", weaponId: "airstrike", angle: 0.5, power: 0.5, airdrop: true, targetX: 400 }).ok === true);
check("geçersiz hareket yönü reddedilir", N.netValidateCommand({ kind: N.NET_CMD.MOVE, dir: 2 }).reason === "BAD_DIR");
check("silah seçimi kimlikle geçerli", N.netValidateCommand({ kind: N.NET_CMD.WEAPON, weaponId: "bazooka" }).ok === true);
check("silah seçimi kimliksiz reddedilir", N.netValidateCommand({ kind: N.NET_CMD.WEAPON, weaponId: "" }).reason === "BAD_WEAPON");
check("geçerli komut kabul edilir", N.netValidateCommand({ kind: N.NET_CMD.CHARGE, chargeId: "c1" }).ok === true);
check("güvenilirlik sınıflandırması", N.netIsReliable(N.NET_MSG.CMD) && !N.netIsReliable(N.NET_MSG.INPUT) && N.netIsReliable(N.NET_MSG.TERRAIN));
check("mesaj boyutu ölçülür", N.netEncodedSize({ a: 1 }) > 0);

// ── 2) Sequence / tekilleştirme / girdi tazeliği ────────────────────────────
const seq = new N.NetSequence();
check("artan sıra kabul edilir", seq.accept(0) && seq.accept(1) && seq.accept(5));
check("eski sıra düşer", !seq.accept(4) && !seq.accept(0));

const cache = new N.NetCommandCache(4);
const c1 = { kind: N.NET_CMD.CHARGE, chargeId: "c1" };
check("ilk komut yeni", cache.lookup("k1", c1, 0).state === "new");
cache.remember("k1", c1, { ok: true, tag: "ilk" });
const dup = cache.lookup("k1", c1, 0);
check("yinelenen komut önceki sonucu döner", dup.state === "duplicate" && dup.result.tag === "ilk");
check("aynı id farklı payload çakışma", cache.lookup("k1", { kind: N.NET_CMD.CANCEL, chargeId: "c1" }, 0).state === "conflict");
cache.closeTurn(3);
check("kapanan turun komutu stale", cache.lookup("k9", c1, 3).state === "stale");
check("yeni turun komutu yeni", cache.lookup("k10", c1, 4).state === "new");

const inputs = new N.NetInputTracker(500);
check("girdi kaydı yoksa bayat", inputs.isStale(0, 1000));
inputs.touch(0, 1000);
check("taze girdi bayat değil", !inputs.isStale(0, 1400));
check("500 ms sonra bayat", inputs.isStale(0, 1601));

// ── 3) Host oturumu: tur, komut, atomiklik ─────────────────────────────────
function hostSession(opts) {
  const t = fakeTransport();
  const r = fakeRules(opts);
  const clock = { now: 0 };
  const s = new N.NetSession({ role: "host", transport: t, rules: r, now: () => clock.now });
  s.openLobby([{ playerIdx: 0 }, { playerIdx: 1 }]);
  s.startMatch("m1", "a1");
  s.loaded(0); s.loaded(1);
  return { s, t, r, clock };
}

let h = hostSession({ active: 0 });
check("yükleme tamamlanınca PLAYING", h.s.phase === N.NET_PHASE.PLAYING);
check("START güvenilir gönderilir", h.t.last(N.NET_MSG.START) && h.t.last(N.NET_MSG.START).reliable === true);

// Sırası olmayan oyuncu reddedilir.
let res = h.s.handleHostMessage(1, env(N.NET_MSG.CMD, { seq: 1, id: "k1", cmd: { kind: N.NET_CMD.CHARGE, chargeId: "c1" } }));
check("aktif olmayan oyuncunun komutu reddedilir", res.ok === false && res.reason === "NOT_YOUR_TURN");
check("reddedilen komut kurallara uygulanmaz", h.r.calls.apply.length === 0);
check("reddin ACK'i gönderilir", h.t.last(N.NET_MSG.ACK).payload.result.reason === "NOT_YOUR_TURN");

// Aktif oyuncu: charge → release; chargeId bir kez kapanır.
res = h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 1, id: "k2", cmd: { kind: N.NET_CMD.CHARGE, chargeId: "c1" } }));
check("charge kabul edilir", res.ok === true);
res = h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 2, id: "k3", cmd: { kind: N.NET_CMD.RELEASE, chargeId: "c1", weaponId: "bazooka", angle: 0.5, power: 0.8 } }));
check("release kabul edilir", res.ok === true && res.consumesShot === true);
check("atış hakkı tükendi", h.s.shotConsumed === true);
res = h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 3, id: "k4", cmd: { kind: N.NET_CMD.RELEASE, chargeId: "c1", weaponId: "bazooka", angle: 0.5, power: 0.8 } }));
check("aynı turda ikinci atış reddedilir", res.reason === "SHOT_ALREADY_USED");
const applyAfterRelease = h.r.calls.apply.length;
res = h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 4, id: "k5", cmd: { kind: N.NET_CMD.RELEASE, chargeId: "c1", weaponId: "bazooka", angle: 0.5, power: 0.8 } }));
check("atış tükendikten sonra tekrar release reddedilir", res.reason === "SHOT_ALREADY_USED");
// chargeId yaşam döngüsü ayrı sınanır (atış tüketmeden): charge → cancel → cancel.
h.s.endTurn(1);
h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 6, id: "k6", cmd: { kind: N.NET_CMD.CHARGE, chargeId: "c2" } }));
res = h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 7, id: "k7", cmd: { kind: N.NET_CMD.CANCEL, chargeId: "c2" } }));
check("cancel açık doldurmayı kapatır", res.ok === true);
res = h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 8, id: "k8", cmd: { kind: N.NET_CMD.CANCEL, chargeId: "c2" } }));
check("kapanmış chargeId yeniden kullanılamaz", res.reason === "NO_OPEN_CHARGE");
h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 9, id: "k9", cmd: { kind: N.NET_CMD.CHARGE, chargeId: "c3" } }));
res = h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 10, id: "k10", cmd: { kind: N.NET_CMD.CANCEL, chargeId: "c4" } }));
check("başka chargeId ile iptal reddedilir", res.reason === "CHARGE_MISMATCH");
// (charge + release) yalnız iki kez uygulandı; sonraki reddedilenler kurallara gitmez.
check("kurallar yalnız bir kez uygulandı (charge + release)", applyAfterRelease === 2, String(applyAfterRelease));

// Yinelenen komut: kurallara ikinci kez gitmez, önceki sonuç ACK'lenir.
const applyBefore = h.r.calls.apply.length;
res = h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 5, id: "k3", cmd: { kind: N.NET_CMD.RELEASE, chargeId: "c1", weaponId: "bazooka", angle: 0.5, power: 0.8 } }));
check("yinelenen komut duplicate döner", res.duplicate === true && res.result.consumesShot === true);
check("yinelenen komut kurallara uygulanmaz", h.r.calls.apply.length === applyBefore);
check("yinelenen komutun ACK'i önceki sonucu taşır", h.t.last(N.NET_MSG.ACK).payload.result.consumesShot === true);

// Paket almak fiziği ilerletmez.
check("paket almak adım ilerletmez", h.r.calls.step === 0);

// Tur bitişi turId başına bir kez.
check("tur bitişi işler", h.r.calls.onTurnEnd.length >= 1 && h.s.turnId === 1);
check("aynı tur için ikinci bitiş reddedilir", h.s.endTurn(1).reason === "TURN_ALREADY_CLOSED");
check("ileri gitmeyen tur bitişi reddedilir", h.s.endTurn(1).reason === "TURN_ALREADY_CLOSED");
check("argümansız kapatma işler", h.s.endTurn().ok === true);
check("argümansız ikinci kapatma reddedilir", h.s.endTurn().reason === "TURN_ALREADY_CLOSED");
check("kapanan turun komutu stale", h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 9, id: "k20", cmd: { kind: N.NET_CMD.CHARGE, chargeId: "c9" } })).reason === "STALE_TURN");
check("yeni turda atış hakkı yenilenir", h.s.shotConsumed === false);
check("tur geçişi güvenilir yayınlanır", h.t.last(N.NET_MSG.TURN).payload.turnId === 1);

// Arazi değişikliği yalnız gerçekten uygulandığında yayınlanır.
h = hostSession({ active: 0, applyResult: { ok: true, consumesShot: true, terrainChanges: [{ x: 10, y: 20, r: 30 }] } });
h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 1, id: "t1", cmd: { kind: N.NET_CMD.CHARGE, chargeId: "c1" } }));
h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 2, id: "t2", cmd: { kind: N.NET_CMD.RELEASE, chargeId: "c1", weaponId: "bazooka", angle: 0.5, power: 0.5 } }));
check("arazi sürümü ilerler", h.s.terrainVersion === 1);
check("arazi kaydı yayınlanır", h.t.count(N.NET_MSG.TERRAIN) === 1 && h.t.last(N.NET_MSG.TERRAIN).payload.changes.length === 1);
h = hostSession({ active: 0 });
h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 1, id: "t3", cmd: { kind: N.NET_CMD.JUMP } }));
check("değişiklik yoksa arazi yayını yok", h.t.count(N.NET_MSG.TERRAIN) === 0 && h.s.terrainVersion === 0);

// Girdi: eski paket düşer, taze paket uygulanır.
h = hostSession({ active: 0 });
h.s.handleHostMessage(0, env(N.NET_MSG.INPUT, { seq: 4, move: 1, aim: 0.2 }));
check("girdi kurallara iletilir", h.r.calls.lastInput && h.r.calls.lastInput.input.move === 1);
check("eski girdi paketi düşer", h.s.handleHostMessage(0, env(N.NET_MSG.INPUT, { seq: 3, move: -1, aim: 0.9 })).reason === "STALE_INPUT");
check("eski paket girdiyi değiştirmez", h.r.calls.lastInput.input.move === 1);

// ── 4) Saat, borç ve iptal ─────────────────────────────────────────────────
h = hostSession({ active: 0 });
let up = h.s.update(1000 / 60);
check("bir adım işlenir", up.steps === 1 && h.r.calls.step === 1);
up = h.s.update(500);
check("uyanış başına en fazla 8 adım", up.steps === 8 && h.r.calls.step === 9);
check("artan borç sonraki uyanışa taşınır", h.s.simDebtMs > 0 && h.s.simDebtMs < 500);
h.s.update(200);
check("borç 250 ms'yi aşınca ABORT", h.t.last(N.NET_MSG.ABORT) && h.t.last(N.NET_MSG.ABORT).payload.reason === "SIM_DEBT");
check("iptal sonrası aşama LOBBY", h.s.phase === N.NET_PHASE.LOBBY);
check("iptalden sonra adım işlenmez", h.s.update(100).steps === 0);

// Girdi bayatlayınca hareket sıfırlanır ve açık doldurma iptal edilir.
h = hostSession({ active: 0 });
h.s.handleHostMessage(0, env(N.NET_MSG.INPUT, { seq: 1, move: 1, aim: 0 }));
h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 2, id: "s1", cmd: { kind: N.NET_CMD.CHARGE, chargeId: "c1" } }));
check("açık doldurma kaydedildi", h.s.charges.get(0) === "c1");
h.clock.now = 400;
h.s.update(16);
check("taze girdi temizlenmez", h.s.charges.get(0) === "c1");
h.clock.now = 2000;
h.s.update(16);
check("bayat girdi temizlenir", h.r.calls.clearInput.indexOf(0) >= 0);
check("bayat girdi açık doldurmayı iptal eder", !h.s.charges.has(0));

// ── 5) Kopma, bot devralma, yeniden bağlanma ───────────────────────────────
h = hostSession({ active: 0 });
check("kopma grace bildirir", h.s.playerDisconnected(1).graceMs === N.NET_GRACE_MS);
check("kopan oyuncu hemen bota dönmez", h.r.calls.setBot.length === 0);
h.clock.now = 1000;
check("grace dolmadan bot devralmaz", h.s.graceExpired(1).reason === "GRACE_ACTIVE");
h.clock.now = N.NET_GRACE_MS + 1;
check("grace dolunca bot devralır", h.s.graceExpired(1).ok === true && h.r.calls.setBot[0].on === true);
check("kopan oyuncunun komutu reddedilir", h.s.handleHostMessage(1, env(N.NET_MSG.CMD, { seq: 1, id: "d1", cmd: { kind: N.NET_CMD.JUMP } })).reason === "UNKNOWN_PLAYER");
check("yanlış koltuk kimliğiyle dönüş reddedilir", h.s.reconnect(1, "yanlış").reason === "BAD_SEAT_TOKEN");
check("doğru kimlikle aynı koltuğa dönülür", h.s.reconnect(1, "seat-1").ok === true);
check("dönüş botu kapatır", h.r.calls.setBot[1].on === false);
check("dönen oyuncu yeniden komut verebilir", h.s.handleHostMessage(1, env(N.NET_MSG.CMD, { seq: 2, id: "d2", cmd: { kind: N.NET_CMD.JUMP } })).ok === false
  ? h.s.handleHostMessage(1, env(N.NET_MSG.CMD, { seq: 3, id: "d3", cmd: { kind: N.NET_CMD.JUMP } })).reason === "NOT_YOUR_TURN"
  : true);

// ── 6) Maç sonu ve terminal durum ──────────────────────────────────────────
h = hostSession({ active: 0 });
check("sonuç yayınlanır", h.s.finish({ winner: 0 }).ok === true && h.t.last(N.NET_MSG.RESULT).payload.result.winner === 0);
check("sonuç sonrası komut reddedilir", h.s.handleHostMessage(0, env(N.NET_MSG.CMD, { seq: 1, id: "f1", cmd: { kind: N.NET_CMD.JUMP } })).reason === "MATCH_ENDED");
check("sonuç sonrası ikinci sonuç reddedilir", h.s.finish({}).reason === "ALREADY_ENDED");
check("sonuç sonrası iptal maçı canlandırmaz", h.s.abort("X").reason === "MATCH_ENDED");

// ── 7) Misafir tarafı ─────────────────────────────────────────────────────
function guestSession() {
  const t = fakeTransport();
  const r = fakeRules();
  const g = new N.NetSession({ role: "guest", transport: t, rules: r, now: () => 0 });
  g.handleGuestMessage({ v: V, t: N.NET_MSG.WELCOME, matchId: "m1", authoritySessionId: "a1", seat: 1 });
  g.phase = N.NET_PHASE.PLAYING;   // host START sonrası PLAYING yayınıyla geçer
  return { g, t, r };
}

let g = guestSession();
check("misafir koltuğunu alır", g.g.mySeat === 1 && g.g.matchId === "m1");
check("durum uygulanır", g.g.handleGuestMessage(env(N.NET_MSG.STATE, { seq: 0, state: { hp: 100 } })).ok === true && g.r.calls.applyState.length === 1);
check("eski durum paketi düşer", g.g.handleGuestMessage(env(N.NET_MSG.STATE, { seq: 0, state: { hp: 1 } })).reason === "STALE_STATE");
check("yanlış maçtan durum reddedilir", g.g.handleGuestMessage({ v: V, t: N.NET_MSG.STATE, matchId: "m9", authoritySessionId: "a1", seq: 5 }).reason === "WRONG_MATCH");
check("eski arazi sürümü reddedilir", g.g.handleGuestMessage(env(N.NET_MSG.TERRAIN, { terrainVersion: 0, changes: [] })).reason === "STALE_TERRAIN");
// Maç başındaki TAM MASKE taze araziyle AYNI sürümü (0) taşır; `>` denetimi
// maskeyi "eski" sayıp reddediyordu → misafir hostunkinden farklı arazide
// oynuyordu (arazi rastgele üretildiğinde robot sürekli zıplar).
check("eşit sürümlü TAM MASKE kabul edilir",
  g.g.handleGuestMessage(env(N.NET_MSG.TERRAIN, { terrainVersion: 0, mask: { w: 4, h: 4 }, changes: [] })).ok === true &&
  g.r.calls.mask.length === 1, `mask=${g.r.calls.mask.length}`);
check("yeni arazi sürümü uygulanır", g.g.handleGuestMessage(env(N.NET_MSG.TERRAIN, { terrainVersion: 2, changes: [{ x: 1 }] })).ok === true && g.r.calls.applyTerrain.length === 2);
check("maskeyi takip eden eski sürümlü oyma reddedilir",
  g.g.handleGuestMessage(env(N.NET_MSG.TERRAIN, { terrainVersion: 2, changes: [{ x: 2 }] })).reason === "STALE_TERRAIN");
check("maskeyle birlikte gelen oyma kayıtları da uygulanır",
  g.g.handleGuestMessage(env(N.NET_MSG.TERRAIN, { terrainVersion: 3, mask: { w: 4, h: 4 }, changes: [{ x: 3 }] })).ok === true &&
  g.r.calls.applyTerrain.length === 3 && g.r.calls.mask.length === 2,
  `applyTerrain=${g.r.calls.applyTerrain.length} mask=${g.r.calls.mask.length}`);
check("ESKİ sürümlü maske yine reddedilir (oymalar geri alınmaz)",
  g.g.handleGuestMessage(env(N.NET_MSG.TERRAIN, { terrainVersion: 1, mask: { w: 4, h: 4 }, changes: [] })).reason === "STALE_TERRAIN");
check("ACK arayüze iletilir", g.g.handleGuestMessage(env(N.NET_MSG.ACK, { id: "c1", result: { ok: true } })).ok === true && g.r.calls.lastAck.id === "c1");
check("misafir komut gönderir", g.g.sendCommand({ kind: N.NET_CMD.JUMP }).ok === true && g.t.count(N.NET_MSG.CMD) === 1);
check("misafir girdi gönderir", g.g.sendInput(1, 0.5).ok === true && g.t.last(N.NET_MSG.INPUT).payload.move === 1);
check("iptal aşamayı LOBBY yapar", g.g.handleGuestMessage(env(N.NET_MSG.ABORT, { reason: "SIM_DEBT" })).ok === true && g.g.phase === N.NET_PHASE.LOBBY);

// ── 8) Boyut denetimi ─────────────────────────────────────────────────────
h = hostSession({ active: 0 });
check("küçük mesaj sınır içinde", h.s.checkSize({ a: 1 }).ok === true);
check("büyük mesaj reddedilir", h.s.checkSize({ a: "x".repeat(70000) }).reason === "MESSAGE_TOO_LARGE");

// ── Özet ──────────────────────────────────────────────────────────────────
console.log("────────────────────────────────────────────────");
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exit(1);
}

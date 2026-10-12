/* Durum eşitleme testleri (F3b) — saf Node, bağımlılıksız.
 * Çalıştır: node tests/net-state.js
 *
 * Sözleşme (docs/multiplayer-plan.md §7 ve docs/web-lansman-plani.md §4):
 *   - Snapshot gidiş-dönüşü kayıpsız: capture → JSON → apply → capture aynı
 *     hash'i vermeli (misafir hostun durumunu birebir taşır).
 *   - Arazi: ilk maske RLE ile kayıpsız taşınır; sonraki değişiklikler
 *     `destroy(x,y,r)` kayıtları olarak oynatılır ve iki taraf birebir aynı
 *     maskeye sahip olur.
 *   - Apply savunmacı: bozuk/eksik paket oyunu kilitlemez, NaN yazmaz.
 *   - Boyut bütçesi: snapshot küçük (15-20 paket/sn hedefi), maske tek seferlik.
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "js");
const FILES = ["i18n.js", "audio.js", "characters.js", "progression.js", "profile.js", "parts.js",
  "market.js", "maps.js", "skills.js", "skill-fx.js", "robots.js", "terrain.js", "weapons.js",
  "entity.js", "projectile.js", "ai.js", "game.js", "net/protocol.js", "net/state.js"];
const EXPORT = "\n;globalThis.__S = { Game, Entity, Projectile, Terrain, CHARACTERS, MAPS, BIOMES, " +
  "getMapById, weaponById, resolveRobotBuild, defaultRobotProgress, NET_STATE_VERSION, " +
  "netHashText, netHashMask, netEncodeMask, netDecodeMask, netHeightsFromMask, netCaptureTerrain, " +
  "netApplyTerrain, netTerrainChange, netApplyTerrainChanges, netCaptureState, netSnapshotHash, " +
  "netApplyState, netRebuildProjectiles, netRebuildMines };";

/* Terrain gerçek sınıfını kullanabilmek için minik canvas taklidi: çizim
 * çağrıları hiçbir şey yapmaz, ölçüm sabit döner. Böylece MASK ve oyma mantığı
 * gerçek koddan gelir (test kendi uygulamasını sınamaz). */
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

const sandbox = { Math, Date, console, JSON, Set, Map, Array, Object, Number, Uint8Array, Uint8ClampedArray, Infinity, isFinite,
  document: { createElement: () => stubCanvas() }, window: { devicePixelRatio: 1 } };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(FILES.map((f) => fs.readFileSync(path.join(JS_DIR, f), "utf8")).join("\n;\n") + EXPORT,
  sandbox, { filename: "state-bundle.js" });
const S = sandbox.__S;

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

// ── Yardımcılar ─────────────────────────────────────────────────────────────
function makeTerrain() {
  const map = S.MAPS[0];
  const t = new S.Terrain(960, 540, map);
  t.generate();
  return t;
}

function makeGame(terrain, count) {
  const g = Object.create(S.Game.prototype);
  g.W = 960; g.H = 540;
  g.selectedMap = S.MAPS[0];
  g.terrain = terrain || makeTerrain();
  g.state = "AIMING";
  g.turn = 0;
  g.turnTimer = 25;
  g.wind = 0.4;
  g.shooterIdx = null;
  g.projectiles = [];
  g.mines = [];
  g.fires = [];
  g.tether = null;
  g.players = [];
  const n = count == null ? 3 : count;
  for (let i = 0; i < n; i++) {
    const def = S.CHARACTERS[i];
    const build = S.resolveRobotBuild(def, S.defaultRobotProgress(), { upgradesEnabled: false });
    const e = new S.Entity(120 + i * 200, 400, def.color, def.label, def, build);
    e.onGround = true;
    e.ammo = { bazooka: Infinity, grenade: 3, sniper: 1 };
    g.players.push(e);
  }
  return g;
}

// ── 1) Arazi maskesi: RLE gidiş-dönüş ──────────────────────────────────────
let host = makeGame();
const packed = S.netCaptureTerrain(host);
check("maske paketi üretildi", !!packed && packed.w === 960 && packed.h === 540);
const decoded = S.netDecodeMask(packed);
check("maske çözüldü", decoded.ok === true && decoded.hash === packed.hash, decoded.reason || "");
let same = true;
for (let i = 0; i < host.terrain.solid.length; i++) {
  if ((host.terrain.solid[i] ? 1 : 0) !== decoded.solid[i]) { same = false; break; }
}
check("maske piksel piksel aynı", same);
check("bozuk koşu reddedilir", S.netDecodeMask({ w: 10, h: 10, runs: "5,2" }).reason === "BAD_MASK_RUNS");
check("eksik uzunluk reddedilir", S.netDecodeMask({ w: 10, h: 10, runs: "5,1" }).reason === "BAD_MASK_LENGTH");
check("bozuk boyut reddedilir", S.netDecodeMask({ w: 0, h: 10, runs: "1,1" }).reason === "BAD_MASK_SIZE");
check("bozuk paket reddedilir", S.netDecodeMask(null).reason === "BAD_MASK");

// Misafir aynı maskeyi uygular; görsel arazi yeniden boyanır.
const guest = makeGame();
const applied = S.netApplyTerrain(guest, packed);
check("misafir maskeyi uygular", applied.ok === true && applied.hash === packed.hash, applied.reason || "");
check("misafir arazi sürümü eşitlenir", guest.terrain.version === host.terrain.version);
check("boyut uyuşmazlığı reddedilir", S.netApplyTerrain(makeGame(new S.Terrain(320, 200, S.MAPS[0])), packed).reason === "SIZE_MISMATCH");

// Yükseklik profili: arazi yüzeyi ile tutarlı.
const heights = S.netHeightsFromMask(host.terrain.solid, 960, 540);
check("yükseklik profili dolu", heights.length === 960 && heights.every((v) => v >= 0 && v <= 540));
check("ilk katı piksel profille aynı", (() => {
  for (let x = 0; x < 960; x += 37) {
    const y = heights[x];
    if (y < 540 && !host.terrain.solid[y * 960 + x]) return false;
  }
  return true;
})());

// ── 2) Arazi değişiklikleri: deterministik oynatma ─────────────────────────
const rec = S.netTerrainChange(300.456, 380.789, 42.123);
check("kayıt yuvarlanır", rec.x === 300.46 && rec.y === 380.79 && rec.r === 42.12);
host.terrain.destroy(rec.x, rec.y, rec.r);
const changes = [rec, S.netTerrainChange(500, 400, 30)];
host.terrain.destroy(500, 400, 30);
const playRes = S.netApplyTerrainChanges(guest, changes);
check("değişiklikler oynatıldı", playRes.ok === true && playRes.applied === 2);
let equal = true;
for (let i = 0; i < host.terrain.solid.length; i++) {
  if ((host.terrain.solid[i] ? 1 : 0) !== (guest.terrain.solid[i] ? 1 : 0)) { equal = false; break; }
}
check("oyma sonrası iki maske birebir aynı", equal);
check("bozuk kayıtlar atlanır", S.netApplyTerrainChanges(guest, [null, { x: NaN, y: 1, r: 2 }, { x: 1, y: 1, r: 0 }]).applied === 0);
check("kayıt listesi dizi değilse reddedilir", S.netApplyTerrainChanges(guest, "yok").ok === false);

// ── 3) Snapshot gidiş-dönüşü ───────────────────────────────────────────────
host = makeGame();
host.turn = 2;
host.turnTimer = 13.5;
host.wind = -0.75;
host.state = "PROJECTILE";
host.shooterIdx = 1;
host.players[0].x = 333.25;
host.players[0].hp = 71;
host.players[0].stamina = 42.5;
host.players[0].aim = -0.9;
host.players[0].facing = -1;
host.players[0].skillCooldown = 3;
host.players[0].damageReduce = { factor: 0.5, turns: 2 };
host.players[0].poison = { dps: 3, turns: 1 };
host.players[0].nextShotMod = { dmgMult: 1.5, radiusMult: 1.2, pellets: 5, spread: 0.3, knockbackMult: 1 };
host.players[0].lastShot = { aim: -0.8, power: 0.62 };
host.players[1].alive = false;
host.players[1].hp = 0;
host.players[2].weapon = 3;
host.players[2].glideTurns = 2;
host.projectiles.push(new S.Projectile(400, 200, 3, -2, S.weaponById("grenade")));
host.projectiles[0].fuse = 40;
host.mines.push({ x: 500, y: 420, spec: S.weaponById("mine"), arm: 12, owner: 0 });
host.fires.push({ x: 620, y: 430, life: 90, max: 120, dps: 4, tick: 7 });
host.tether = { owner: 1, ax: 700, ay: 300, speed: 7.5, life: 120, blocked: 0 };

const snap1 = S.netCaptureState(host, { tick: 42 });
const wire = JSON.parse(JSON.stringify(snap1));
check("snapshot JSON'a çevrilebilir", wire && wire.v === S.NET_STATE_VERSION);
check("sınırsız mühimmat -1 olarak taşınır", wire.players[0].ammo.bazooka === -1 && wire.players[0].ammo.grenade === 3);

const replica = makeGame(host.terrain, 3);
const applyRes = S.netApplyState(replica, wire);
check("snapshot uygulandı", applyRes.ok === true, applyRes.reason || "");
check("tur/rüzgâr/zaman taşındı", replica.turn === 2 && replica.wind === -0.75 && replica.turnTimer === 13.5);
check("aşama taşındı", replica.state === "PROJECTILE");
check("konum/can/enerji taşındı", replica.players[0].x === 333.25 && replica.players[0].hp === 71 && replica.players[0].stamina === 42.5);
check("ölüm durumu taşındı", replica.players[1].alive === false && replica.players[1].hp === 0);
check("mühimmat geri kuruldu (Infinity)", replica.players[0].ammo.bazooka === Infinity && replica.players[0].ammo.sniper === 1);
check("süreli etkiler taşındı", replica.players[0].damageReduce.factor === 0.5 && replica.players[0].poison.dps === 3);
check("build alanları taşındı", replica.players[0].maxHp === host.players[0].maxHp && replica.players[0].moveSpeedMult === host.players[0].moveSpeedMult);
check("mermi yeniden kuruldu", replica.projectiles.length === 1 && replica.projectiles[0].spec.id === "grenade" && replica.projectiles[0].fuse === 40);
check("mayın yeniden kuruldu", replica.mines.length === 1 && replica.mines[0].spec.id === "mine" && replica.mines[0].arm === 12);
check("yangın alanı taşındı", replica.fires.length === 1 && replica.fires[0].life === 90);
check("kanca taşındı", replica.tether && replica.tether.ax === 700 && replica.tether.owner === 1);

const snap2 = S.netCaptureState(replica, { tick: 42 });
check("gidiş-dönüş hash'i aynı", S.netSnapshotHash(snap1) === S.netSnapshotHash(snap2),
  `${S.netSnapshotHash(snap1)} ≠ ${S.netSnapshotHash(snap2)}`);
// Periyodik paket (build hariç) de aynı hash'i vermeli: iki taraf aynı alanları taşır.
check("periyodik paket gidiş-dönüşü de aynı",
  S.netSnapshotHash(S.netCaptureState(host, { tick: 42, includeBuild: false })) ===
  S.netSnapshotHash(S.netCaptureState(replica, { tick: 42, includeBuild: false })));

// Etkiler temizlenince misafirde de temizlenir (host null gönderir).
wire.players[0].poison = null;
S.netApplyState(replica, wire);
check("host etkiyi kaldırınca misafirde de kalkar", replica.players[0].poison === null);

// ── 4) Savunmacı apply ─────────────────────────────────────────────────────
const before = JSON.stringify(S.netCaptureState(replica));
check("boş snapshot reddedilir", S.netApplyState(replica, null).ok === false);
check("sürüm uyuşmazlığı reddedilir", S.netApplyState(replica, { v: 99 }).reason === "STATE_VERSION");
const badRes = S.netApplyState(replica, { v: S.NET_STATE_VERSION, turn: NaN, wind: "abc", players: [null, { x: Infinity, hp: "x" }], projectiles: [{ weaponId: "yok" }], mines: "yok", fires: [null] });
check("bozuk paket kabul edilir ama bozuk alan yazılmaz", badRes.ok === true && replica.turn === 2 && replica.wind === -0.75);
check("bilinmeyen silah mermisi atlanır", replica.projectiles.length === 0);
check("bozuk paketten sonra geçerli paket durumu geri kurar", (() => {
  S.netApplyState(replica, wire);
  return JSON.stringify(S.netCaptureState(replica)) === before;
})());
check("dizi olmayan mermi listesi sorun çıkarmaz", S.netRebuildProjectiles(replica, "yok") === 0);

// ── 5) Boyut bütçesi ──────────────────────────────────────────────────────
const big = makeGame(null, 6);
big.projectiles.push(new S.Projectile(1, 2, 3, 4, S.weaponById("nuke")));
const fullBytes = JSON.stringify(S.netCaptureState(big, { tick: 0 })).length;
const snapBig = S.netCaptureState(big, { tick: 100, includeBuild: false });
const snapBytes = JSON.stringify(snapBig).length;
check("başlangıç snapshot'ı (build dahil) < 6 KB", fullBytes < 6144, fullBytes + " bayt");
check("periyodik snapshot (build hariç) < 4 KB", snapBytes < 4096, snapBytes + " bayt");
check("periyodik snapshot build taşımaz", snapBig.players[0].build === undefined);
// Build'siz snapshot mevcut build'i SİLMEZ (misafir istatistikleri korur).
const keep = makeGame(null, 2);
const keepBefore = keep.players[0].maxHp;
S.netApplyState(keep, S.netCaptureState(keep, { includeBuild: false }));
check("build'siz paket istatistikleri bozmaz", keep.players[0].maxHp === keepBefore);
const maskBytes = JSON.stringify(S.netCaptureTerrain(big)).length;
check("maske paketi < 40 KB (tek seferlik)", maskBytes < 40960, maskBytes + " bayt");
console.log(`  · başlangıç ${fullBytes} bayt · periyodik ${snapBytes} bayt · maske ${maskBytes} bayt`);

// ── Özet ──────────────────────────────────────────────────────────────────
console.log("────────────────────────────────────────────────");
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exit(1);
}

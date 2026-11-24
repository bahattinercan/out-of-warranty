/* Çevrimiçi OYUN entegrasyon testi (F3c-2) — gerçek `Game` ile, tarayıcısız.
 * Çalıştır: node tests/net-game.js
 *
 * Ne sınanır: lobi el sıkışması → maç kurulumu (iki taraf AYNI dünyayı kurar) →
 * komut akışı → tur/tur sayacı senkronu → arazi oyması → maç sonu. Host ve
 * misafir AYNI süreçte döngü taşımasıyla bağlanır: "aynı makinede iki sekme"
 * provasının headless karşılığı (iki farklı ağ denemesi elle yapılır).
 *
 * DOM: `Game` yalnız metot GÖVDELERİNDE DOM'a dokunur; bu yüzden sahte bir
 * document/window verilir (tests/run.js'in "DOM'a dokunma" kuralının geniş
 * hâli: burada Game GERÇEKTEN kurulur — çevrimiçi akış updateHud/render
 * çağırır). Sahte DOM hiçbir piksel üretmez; görsel doğrulama headless Chrome
 * sondalarıyla yapılır (proje becerisi: verify-canvas-visuals-headless).
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "js");
const FILES = ["i18n.js", "version.js", "portal.js", "diagnostics.js", "audio.js", "characters.js", "progression.js", "profile.js", "parts.js",
  "market.js", "maps.js", "skills.js", "skill-fx.js", "robot-animation-manifest.js", "robots.js", "terrain.js", "weapons.js",
  "entity.js", "projectile.js", "ai.js", "net/protocol.js", "net/transport.js", "net/state.js",
  "net/session.js", "net/adapter.js", "online-lobby.js", "game.js"];
const EXPORT = "\n;globalThis.__G = { Game, OnlineLobby, CHARACTERS, MAPS, getMapById, NET_MSG, NET_CMD, NET_PHASE, " +
  "NET_PROTOCOL_VERSION, NET_TRANSPORT_STATUS, NetSession, LoopbackTransport, netRoomCode, " +
  "netFormatRoomCode, netCaptureState, netSnapshotHash, netCaptureTerrain, netApplyState, WEAPONS };";

// ── Sahte DOM ──────────────────────────────────────────────────────────────
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
  const el = {
    id: id || "", textContent: "", title: "", value: "100", scrollLeft: 0,
    _html: "",
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); this.children.length = 0; },
    dataset: {}, style: { setProperty() {}, bottom: "", removeProperty() {} },
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, on) { if (on === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (on) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    offsetHeight: 108, offsetLeft: 0, offsetWidth: 90, clientWidth: 960, clientHeight: 540,
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {}, blur() {}, focus() {},
    // `updateHud` DOM listesini children üzerinden yönetir (append/remove):
    // sahte düğüm gerçek bir çocuk dizisi taşımalı.
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
  return el;
}
function makeDom() {
  const elements = new Map();
  const storage = new Map();
  const document = {
    _elements: elements,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, fakeElement(id));
      return elements.get(id);
    },
    createElement(tag) {
      const el = fakeElement(tag);
      el.getContext = () => stubCtx();
      // Tuvalin MANTIKSAL boyutu (Game.W/H buradan okunur): 0 bırakılırsa tüm
      // dünya koordinatları NaN olur ve testler anlamsızca geçer.
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
  sandbox, { filename: "game-online-bundle.js" });
const G = sandbox.__G;

// ── Minik test çatısı ──────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

const PHASE = G.NET_PHASE;
const newGame = () => new G.Game(dom.document.createElement("canvas"));

/* Host + misafir çifti: iki GERÇEK Game, döngü taşımasıyla bağlı. */
function makePair(opts) {
  const o = opts || {};
  const [ta, tb] = G.LoopbackTransport.pair({ name: "host" }, { name: "guest" });
  // Hostun yayınladığı SON durum paketi yakalanır: karşılaştırma "host ne
  // gönderdi ↔ misafir ne uyguladı" sorusunu sorar. Anlık yakalama yerine bu
  // kullanılır çünkü misafir her zaman bir yayın aralığı (≤100 ms) geridedir —
  // anlık karşılaştırma yanlış alarm verir.
  const tap = { lastState: null };
  const origSend = ta.send.bind(ta);
  ta.send = (type, payload, reliable) => {
    if (type === G.NET_MSG.STATE) tap.lastState = payload;
    return origSend(type, payload, reliable);
  };
  const host = newGame();
  host.openOnline();
  host.lobby.adoptTransport(ta, { role: "host", code: "ABCDE" });
  host.lobby.robotId = o.hostRobot || G.CHARACTERS[0].id;
  host.lobby.session.lobbyRoster = [host.lobby.robotId, null];
  host.lobby.session.lobbyMapId = (host.lobby._mapFor(host.lobby.robotId) || {}).id || null;
  const guest = newGame();
  guest.openOnline();
  guest.lobby.robotId = o.guestRobot || G.CHARACTERS[1].id;
  guest.lobby.adoptTransport(tb, { role: "guest", code: "ABCDE" });
  return { host, guest, ta, tb, tap };
}

// Hostun son yayınladığı paket ile misafirin kopyası aynı mı? (Arazi sürümü
// ve tur sayacı da karşılaştırmaya girer: paket bütünüyle uygulanmış olmalı.)
function syncedWithLastState(pair) {
  const sent = pair.tap.lastState;
  if (!sent) return { ok: false, reason: "NO_STATE_SENT" };
  // `tick` yalnız teşhis alanıdır (sıra numarası): host kendi tur sayacını
  // yazar, misafirin yeniden yakalaması 0 kullanır — karşılaştırmada nötrlenir.
  const sentState = Object.assign({}, sent.state, { tick: 0 });
  const hostHash = G.netSnapshotHash(sentState);
  const guestHash = stateHash(pair.guest);
  return { ok: hostHash === guestHash, hostHash, guestHash };
}

// Turu ilerlet: `frames` kare boyunca iki tarafı da sürer (host simülasyon,
// misafir görsel). Tur bitince (host turnId ilerleyince) durur.
function stepFrames(pair, frames) {
  let n = 0;
  for (; n < frames; n++) {
    pair.host.update(1 / 60);
    pair.guest.update(1 / 60);
    if (pair.host.state === "GAMEOVER") break;
  }
  return n;
}

// Kareleri sür ama aksiyon alma: tur sonrası durum paketinin misafire
// ulaşmasını bekler (host 100 ms'de bir yayınlar → 12 kare ≈ 200 ms).
function syncFrames(pair, frames) {
  for (let i = 0; i < (frames || 12); i++) {
    pair.host.update(1 / 60);
    pair.guest.update(1 / 60);
  }
}

/* Host'u yeni bir durum paketi yayınlayana kadar sürer ve DURUR: misafir
 * paketi eşzamanlı uygular (döngü taşıması), ardından misafir bir kare bile
 * ilerlemez. Böylece "host ne gönderdi ↔ misafir ne uyguladı" karşılaştırması
 * anlamlı olur; misafir kendi görsel yumuşatmasını çalıştırırsa (konum/animasyon)
 * doğal olarak ayrışır. */
function syncToLatestState(pair, maxFrames) {
  const before = pair.tap.lastState;
  for (let i = 0; i < (maxFrames || 40); i++) {
    pair.host.update(1 / 60);
    if (pair.tap.lastState !== before) return true;
  }
  return false;
}

function stateHash(game) {
  return G.netSnapshotHash(G.netCaptureState(game, { includeBuild: false }));
}

function maskEqual(a, b) {
  if (!a || !b || !a.solid || !b.solid || a.solid.length !== b.solid.length) return false;
  for (let i = 0; i < a.solid.length; i++) if ((a.solid[i] ? 1 : 0) !== (b.solid[i] ? 1 : 0)) return false;
  return true;
}

// ── 1) Lobi: oda kurma, katılma, hazır akışı ──────────────────────────────
let p = makePair();
check("lobi ekranı açıldı", p.host.state === "ONLINE_LOBBY" && p.host.lobby.active === true);
check("host oturumu LOBBY aşamasında", p.host.lobby.session.phase === PHASE.LOBBY);
check("misafir WELCOME ile koltuğuna oturdu", p.guest.lobby.session.mySeat === 1, String(p.guest.lobby.session.mySeat));
check("host oda durumunu yayınladı (koltuk 1 dolu)", p.host.lobby.session.seats[1].claimed === true);
check("misafirin robotu hosta bildirildi", p.host.lobby.session.seats[1].robotId === G.CHARACTERS[1].id);
check("misafir oda durumunu aldı (LOBBY paketi)", !!p.guest.lobby.session.lobbyState);
 p.host.lobby._cycleMap(3);
check("host harita seçimini robot seçiminden bağımsız değiştirebilir", p.host.lobby.session.lobbyMapId === G.MAPS[3].id);
check("misafir hostun seçtiği haritayı lobide görür", p.guest.lobby.session.lobbyState.mapId === G.MAPS[3].id);
check("hazır olmadan maç başlatılamaz", p.host.lobby.session.canStart() === false);
check("host BAŞLAT'a basınca maç kurulmaz", p.host.lobby.startMatch() === false);
p.guest.lobby.toggleReady();
check("misafir hazır → host başlatabilir", p.host.lobby.session.canStart() === true && p.guest.lobby.ready === true);
check("koltuk kimliği yeniden bağlanma için saklandı", !!p.guest.lobby._storedSeatToken());

// ── 2) Maç kurulumu: iki taraf AYNI dünyayı kurar ─────────────────────────
check("host maçı başlattı", p.host.lobby.startMatch() === true);
check("host PLAYING'e geçti", p.host.lobby.session.phase === PHASE.PLAYING, p.host.lobby.session.phase);
check("misafir de PLAYING", p.guest.lobby.session.phase === PHASE.PLAYING, p.guest.lobby.session.phase);
check("host dünyası kuruldu (2 robot)", p.host.players.length === 2 && p.host.mode === "online");
check("misafir dünyası kuruldu (2 robot)", p.guest.players.length === 2 && p.guest.mode === "online");
check("iki taraf aynı haritada", p.host.selectedMap.id === p.guest.selectedMap.id, `${p.host.selectedMap.id} / ${p.guest.selectedMap.id}`);
check("iki taraf aynı kadroda", p.host.selectedChars.map((c) => c.id).join() === p.guest.selectedChars.map((c) => c.id).join(),
  `${p.host.selectedChars.map((c) => c.id).join()} / ${p.guest.selectedChars.map((c) => c.id).join()}`);
check("arazi maskesi misafire geçti ve BİREBİR", maskEqual(p.host.terrain, p.guest.terrain));
check("başlangıç durumu uygulandı (can/konum)", p.guest.players[0].x === p.host.players[0].x && p.guest.players[0].maxHp === p.host.players[0].maxHp);
check("tur sayacı iki tarafta aynı", p.host.turnId === p.guest.turnId && p.host.turnId === 1, String(p.host.turnId));
check("başlangıçta durum hash'i aynı", stateHash(p.host) === stateHash(p.guest));
check("misafir yetkili simülasyon yürütmüyor", p.guest.onlineGuest === true && p.host.onlineGuest === false);
check("arazi kaydı yalnız hostta açık", p.host.terrain.recordChanges === true && p.guest.terrain.recordChanges === false);

// ── 2b) Farklı pencere oranı: misafir dünyayı hosttan alır ─────────────────
/* Dünya GENİŞLİĞİ pencere en-boy oranına göre türetilir (`Game.resize`, 648–1620)
 * ve arazi/doğuş konumları bu boyuta göre doğar. İki oyuncunun penceresi farklı
 * olduğunda hostun arazi maskesi misafirin arazisinden farklı boyutta geliyordu
 * ve `netApplyTerrain > SIZE_MISMATCH` ile REDDEDİLİYORDU; misafir kendi
 * (hostunkinden farklı) arazisinde tahmin yürütüp her snapshot'ta düzeltildiği
 * için robotu sürekli yukarı-aşağı zıplıyordu (kullanıcı bildirimi: "misafir
 * karakter sürekli yukarı aşağı zıplıyor"). Onarım: maske boyutu yetkilidir,
 * misafir dünyasını + arazisini o boyuta çeker (`Game.adoptTerrainSize`). */
const p2 = makePair();
p2.guest.W = 1260;                 // misafirin penceresi daha geniş (misal)
p2.guest.lobby.toggleReady();
check("geniş pencereli misafirle maç kuruldu", p2.host.lobby.startMatch() === true);
syncFrames(p2, 12);
check("misafir dünyasını hostun genişliğine çekti",
  p2.guest.W === p2.host.W && p2.guest.terrain.w === p2.host.terrain.w,
  `host ${p2.host.W}/${p2.host.terrain.w} · misafir ${p2.guest.W}/${p2.guest.terrain.w}`);
check("arazi maskesi boyut farkına rağmen birebir uygulandı",
  maskEqual(p2.host.terrain, p2.guest.terrain) &&
  G.netCaptureTerrain(p2.guest).hash === G.netCaptureTerrain(p2.host).hash);
const bounceYs = [];
for (let i = 0; i < 150; i++) {
  p2.host.update(1 / 60);
  p2.guest.update(1 / 60);
  bounceYs.push(p2.guest.players[1].y);
}
const bounceAmp = Math.max(...bounceYs) - Math.min(...bounceYs);
check("misafirin robotu snapshot sonrası zıplamıyor (dikey genlik < 1px)",
  bounceAmp < 1, `genlik=${bounceAmp.toFixed(2)}px`);
check("zıplama yokken durum hash'i de eşit", syncedWithLastState(p2).ok);

// ── 2c) Misafir hostun hareketini HER KAREDE ve animasyonlu görür ──────────
/* Snapshot 10 paket/sn gelir; misafir konumu doğrudan yazınca robot 100 ms'lik
 * 13 px'lik adımlarla ZIPLIYORDU ve yürüyüş animasyonu paket aralarında yerel
 * sönümle bozulduğu için bacaklar 1 ↔ 0.55 arasında gidip geliyordu (kullanıcı
 * bildirimi: "hareketleri kesik kesik görüyor full fps değil", "yürüyüş
 * animasyonu oynamıyor"). Bekçi: misafirin gördüğü x her karede küçük adımlarla
 * ilerlemeli ve yürüyüş zarfı sönmemeli. */
p2.host.input.right = true;
const walkRows = [];
for (let i = 0; i < 90; i++) {
  p2.host.update(1 / 60);
  p2.guest.update(1 / 60);
  const g = p2.guest.players[0];
  walkRows.push([g.x, g.walkPhase, g.walkAnim, g.walkBlend]);
}
p2.host.input.right = false;
const movedFrames = walkRows.filter((r, i) => i > 0 && Math.abs(r[0] - walkRows[i - 1][0]) > 0.05).length;
let maxStep = 0;
for (let i = 1; i < walkRows.length; i++) maxStep = Math.max(maxStep, Math.abs(walkRows[i][0] - walkRows[i - 1][0]));
const phaseFrames = walkRows.filter((r, i) => i > 0 && Math.abs(r[1] - walkRows[i - 1][1]) > 0.01).length;
// İlk ~10 kare enterpolasyon rampasıdır (0 → hedef); zarf ölçümü rampADAN SONRA.
const tail = walkRows.slice(12);
const minAnim = Math.min(...tail.map((r) => r[2]));
const minBlend = Math.min(...tail.map((r) => r[3]));
check("misafir hostun hareketini HER KAREDE görür (kesik kesik değil)",
  movedFrames >= 80, `${movedFrames}/90 kare`);
check("konum adımları paket boyunda değil (yumuşak)", maxStep < 6, `en büyük adım ${maxStep.toFixed(2)}px`);
check("yürüyüş fazı her karede ilerler", phaseFrames >= 80, `${phaseFrames}/90 kare`);
check("yürüyüş zarfı paket aralarında sönmez (bacaklar oynar)",
  minAnim > 0.8 && minBlend > 0.8, `anim=${minAnim.toFixed(2)} blend=${minBlend.toFixed(2)}`);
syncFrames(p2, 14);
syncToLatestState(p2);
check("yumuşatma yetkili durumu bozmaz (gönderilen paket = misafirin hedefi)",
  syncedWithLastState(p2).ok);

// ── 2d) Misket PARÇACIKLARI ve yetenek mermileri misafirde görünür ────────
/* Mermi listesi misafire KİMLİKLE taşınır; `weaponById` yalnız ana cephaneyi
 * bilir, misket parçacıkları (`clusterSpec`) orada değildir → misafirde hiç
 * kurulmuyorlardı (kullanıcı bildirimi: "misket silahının parçaları"). */
const clusterSpec = G.WEAPONS.filter((w) => w.id === "cluster")[0];
check("misket spec'i ve parçacık sayısı tanımlı",
  !!clusterSpec && clusterSpec.cluster === true && clusterSpec.clusterCount > 0 &&
  !!clusterSpec.clusterSpec && clusterSpec.clusterSpec.id === "bomblet");
p2.host.explode(400, 120, clusterSpec);
check("host misket parçacıklarını üretti",
  p2.host.projectiles.length === clusterSpec.clusterCount, String(p2.host.projectiles.length));
syncToLatestState(p2);
const guestPellets = p2.guest.projectiles.filter((pr) => pr.spec && pr.spec.id === "bomblet");
check("misafir misket parçacıklarını GÖRÜR",
  guestPellets.length === clusterSpec.clusterCount && p2.guest.projectiles.length === p2.host.projectiles.length,
  `misafir ${guestPellets.length} parçacık / host ${p2.host.projectiles.length} mermi`);

// ── 2e) Modül (yetenek) cast efektleri misafirde de oynar ─────────────────
/* `game.skillFx` saf görsel bir listedir; snapshot'la taşınmazsa misafir hostun
 * modül animasyonlarını HİÇ görmez (kullanıcı bildirimi: "efektler/
 * animasyonlar gözükmüyor"). */
p2.host.usePlayerSkill();
check("host modülü cast etti (efekt üretildi)", p2.host.skillFx.length >= 1, String(p2.host.skillFx.length));
const hostFxShape = p2.host.skillFx[0].shape;
syncFrames(p2, 4);
syncToLatestState(p2);
const guestFx = (p2.guest.skillFx || []).filter((f) => f && f.shape === hostFxShape);
check("misafir hostun modül efektini görür",
  guestFx.length >= 1 && p2.guest.skillFx.length === p2.host.skillFx.length,
  `misafir ${(p2.guest.skillFx || []).map((f) => f.shape).join(",") || "yok"} / host ${p2.host.skillFx.map((f) => f.shape).join(",")}`);

// ── 3) Host kendi komutunu da aynı doğrulamadan geçirir ───────────────────
// Nişan: sahte DOM'da fare (0,0) kalır ve atış dik yukarı giderdi; gerçek
// oyuncu gibi bir hedef noktası verilir (aim her karede hedefe döner).
p.host.input.mouseX = 800; p.host.input.mouseY = 300;
syncFrames(p, 2);
check("nişan hedefe döndü (yatay)", Math.abs(p.host.players[0].aim) < 1, String(p.host.players[0].aim));
p.host.startCharge();
check("host CHARGE komutu kabul edildi (güç doldurma açık)", p.host.input.charging === true);
// Regresyon (kullanıcı bildirimi: "HOST atış yapamıyor"): host kendi girdisini
// AĞDAN almaz, bu yüzden girdi tazelik denetimine takılıp güç doldurma ve
// yürüme her karede siliniyordu → atış hiç başlamıyordu.
syncFrames(p, 5);
check("host güç doldurma kareler boyunca korunuyor", p.host.input.charging === true,
  "charging=" + p.host.input.charging);
check("host yürüme girdisi de korunuyor", (() => {
  p.host.input.left = true;
  syncFrames(p, 3);
  const held = p.host.input.left === true;
  p.host.input.left = false;
  return held;
})());

// Hostun silah seçimi misafire snapshot ile gider (host yetkilidir; misafir
// tarafı komut göndermez). Bölüm 5a'daki misafir yoluyla bakışık davranış.
const hostWeapon0 = p.host.players[0].weapon;
let hostWeapon1 = hostWeapon0;
for (let k = 1; k <= G.WEAPONS.length; k++) {
  const cand = (hostWeapon0 + k) % G.WEAPONS.length;
  if (p.host.players[0].hasAmmo(cand)) { hostWeapon1 = cand; break; }
}
p.host.selectWeapon(hostWeapon1);
syncToLatestState(p);
check("hostun silah seçimi misafire snapshot ile gider",
  p.host.players[0].weapon === hostWeapon1 && p.guest.players[0].weapon === hostWeapon1,
  `host ${p.host.players[0].weapon} / misafir ${p.guest.players[0].weapon}`);
p.host.selectWeapon(hostWeapon0);   // atış sınaması ilk silahla sürsün
syncToLatestState(p);

p.host.input.power = 0.75;
p.host.releaseFire();
check("host atışı PROJECTILE'a geçti", p.host.state === "PROJECTILE", p.host.state);
check("host mermisi oluştu", p.host.projectiles.length >= 1);
const hostAmmoAfter = p.host.players[0].ammo[G.CHARACTERS[0] ? p.host.active.weaponSpec.id : "bazooka"];
check("atış hakkı tükendi (aynı turda ikinci atış reddedilir)",
  p.host.lobby.session.shotConsumed === true);

// Aynı turda ikinci atış: reddedilmeli (atış hakkı atomik kapandı).
p.host.input.charging = true;
p.host.input.power = 0.5;
p.host.releaseFire();
check("ikinci atış reddedildi", p.host.lobby.session.shotConsumed === true && p.host.projectiles.length <= 1);

// Mermi uçarken misafir görsel kopyayı yumuşatır; hash yerine konum yakınlığı
// karşılaştırılır (fitil/yaş gibi yerel alanlar birebir olmayabilir).
const flightFrames = stepFrames(p, 40);
check("misafir mermiyi gördü (görsel kopya)", p.guest.projectiles.length > 0 || p.host.projectiles.length === 0,
  `host ${p.host.projectiles.length} / misafir ${p.guest.projectiles.length}`);
check("simülasyon ilerledi", flightFrames > 0, String(flightFrames));

// ── 4) Tur bitişi ve oyma senkronu ────────────────────────────────────────
let guard = 0;
while (p.host.turnId === 1 && p.host.state !== "GAMEOVER" && guard++ < 900) {
  p.host.update(1 / 60);
  p.guest.update(1 / 60);
}
check("tur kapandı ve sayaç ilerledi", p.host.turnId === 2, String(p.host.turnId));
syncFrames(p, 14);
check("misafir TURN paketiyle aynı sayaca geçti", p.guest.turnId === 2, String(p.guest.turnId));
check("sıra misafire geçti (iki tarafta aynı)", p.host.turn === p.guest.turn && p.host.turn === 1,
  `host ${p.host.turn} / misafir ${p.guest.turn}`);
check("oyma sonrası arazi BİREBİR", maskEqual(p.host.terrain, p.guest.terrain));
check("oyma kaydı gönderildi (sürüm ilerledi)", p.host.lobby.session.terrainVersion >= 1,
  String(p.host.lobby.session.terrainVersion));
syncToLatestState(p);
const sync1 = syncedWithLastState(p);
check("tur sonu: hostun gönderdiği durum misafirde birebir", sync1.ok,
  `${sync1.hostHash} / ${sync1.guestHash}`);

// ── 5) Misafir atışı (yetki hostta) ───────────────────────────────────────
check("misafirin sırası (yerel tur)", p.guest.isLocalTurn() === true && p.host.isLocalTurn() === false);

// ── 5a) Misafir SİLAH DEĞİŞTİRİR (yetki hostta) ───────────────────────────
/* Regresyon (kullanıcı bildirimi: "misafir oyuncu silah değiştiremiyor"):
 * misafirin yerel seçimi hosta HİÇ bildirilmiyordu ve hostun snapshot'ı
 * `weapon` alanını her pakette geri yazdığı için seçim ~100 ms sonra
 * siliniyordu. Artık seçim NET_CMD.WEAPON ile hosta gider; host uygular ve
 * snapshot AYNI silahı geri getirir. */
const guestP = p.guest.players[1];
const weapon0 = guestP.weapon;
// Mühimmatı olan başka bir silah seç (yerel koruma mühimmatsızı zaten atlar).
let weapon1 = weapon0;
for (let k = 1; k <= G.WEAPONS.length; k++) {
  const cand = (weapon0 + k) % G.WEAPONS.length;
  if (guestP.hasAmmo(cand)) { weapon1 = cand; break; }
}
check("sınamak için ikinci bir silah bulundu", weapon1 !== weapon0, `${weapon0} → ${weapon1}`);
p.guest.selectWeapon(weapon1);
check("misafirin seçimi yerelde ANINDA görünür", guestP.weapon === weapon1, String(guestP.weapon));
syncFrames(p, 4);
check("host misafirin silah seçimini uyguladı", p.host.players[1].weapon === weapon1,
  `host ${p.host.players[1].weapon} / misafir ${weapon1}`);
syncToLatestState(p);
check("snapshot sonrası misafirin silahı KORUNUR", p.guest.players[1].weapon === weapon1,
  String(p.guest.players[1].weapon));
const syncWeapon = syncedWithLastState(p);
check("silah değişimi sonrası gönderilen durum misafirde birebir", syncWeapon.ok,
  `${syncWeapon.hostHash} / ${syncWeapon.guestHash}`);

// Fare tekerleği (cycleWeapon) aynı yoldan gider.
const wheelFrom = p.guest.players[1].weapon;
p.guest.cycleWeapon(1);
const wheelTo = p.guest.players[1].weapon;
syncFrames(p, 4);
check("tekerlek silah değişimi de hosta gider",
  wheelTo !== wheelFrom && p.host.players[1].weapon === wheelTo,
  `host ${p.host.players[1].weapon} / misafir ${wheelTo}`);

// Mühimmatı biten silah seçilirse host reddeder: seçim uygulanmaz, misafir
// ACK bildirimiyle uyarılır (yetenek/snapshot düzeltmesi).
p.host.players[1].ammo[G.WEAPONS[weapon1].id] = 0;
p.guest.players[1].ammo[G.WEAPONS[weapon1].id] = 0;
p.guest.online.notice = null;
p.guest.lobby.session.sendCommand({ kind: G.NET_CMD.WEAPON, weaponId: G.WEAPONS[weapon1].id });
syncFrames(p, 4);
check("mühimmatı biten silah hostta reddedilir", p.host.players[1].weapon !== weapon1,
  String(p.host.players[1].weapon));
const noAmmoAck = (p.guest.online.acks || []).filter((a) => a.result && a.result.reason === "NO_AMMO");
check("reddedilen komut ACK ile reason taşır", noAmmoAck.length === 1, String(noAmmoAck.length));
check("reddedilen komut misafire bildirilir", !!p.guest.online.notice,
  p.guest.online.notice ? p.guest.online.notice.text : "bildirim yok");

// Bölüm 5 atışı ilk silahla yapıyor: seçimi geri al (komut yolu yine sınanır).
p.guest.selectWeapon(weapon0);
syncFrames(p, 4);
check("misafir ilk silahına geri dönebildi",
  p.guest.players[1].weapon === weapon0 && p.host.players[1].weapon === weapon0,
  `host ${p.host.players[1].weapon} / misafir ${p.guest.players[1].weapon}`);
p.guest.input.mouseX = 160; p.guest.input.mouseY = 300;
syncFrames(p, 2);
p.guest.startCharge();
check("misafir güç doldurmayı yerel gösteriyor", p.guest.input.charging === true);
  "hostInputCharging:", p.host.input.charging, "phase:", p.host.lobby.session.phase,
check("CHARGE hosta ulaştı", p.host.lobby.session.charges.get(1) != null, String(p.host.lobby.session.charges.get(1)));
p.guest.input.power = 0.6;
const guestAim = p.guest.active.aim;
p.guest.releaseFire();
check("host misafirin atışını uyguladı", p.host.state === "PROJECTILE" && p.host.projectiles.length >= 1);
check("atış açısı komutla atomik geldi", Math.abs(p.host.players[1].aim - guestAim) < 0.0001,
  `${p.host.players[1].aim} / ${guestAim}`);
guard = 0;
while (p.host.turnId === 2 && p.host.state !== "GAMEOVER" && guard++ < 900) {
  p.host.update(1 / 60);
  p.guest.update(1 / 60);
}
syncFrames(p, 14);
check("ikinci tur da kapandı", p.host.turnId === 3, String(p.host.turnId));
check("misafirin sayacı da ilerledi", p.guest.turnId === 3, String(p.guest.turnId));
check("oyma sonrası arazi yine BİREBİR", maskEqual(p.host.terrain, p.guest.terrain));
syncToLatestState(p);
const sync2 = syncedWithLastState(p);
check("ikinci tur sonu: gönderilen durum misafirde birebir", sync2.ok, `${sync2.hostHash} / ${sync2.guestHash}`);

// ── 6) Beş turluk senkron turu ────────────────────────────────────────────
let hashOk = true, terrainOk = true, turnOk = true;
for (let turn = 0; turn < 5; turn++) {
  const shooter = p.host.turn;
  const g = shooter === 0 ? p.host : p.guest;
  if (g.isLocalTurn()) {
    g.startCharge();
    g.input.power = 0.5 + 0.05 * turn;
    g.releaseFire();
  }
  let f = 0;
  const startTurnId = p.host.turnId;
  while (p.host.turnId === startTurnId && p.host.state !== "GAMEOVER" && f++ < 1200) {
    p.host.update(1 / 60);
    p.guest.update(1 / 60);
  }
  syncToLatestState(p);
  if (!syncedWithLastState(p).ok) hashOk = false;
  if (!maskEqual(p.host.terrain, p.guest.terrain)) terrainOk = false;
  if (p.host.turnId !== p.guest.turnId) turnOk = false;
  if (p.host.state === "GAMEOVER") break;
}
check("5 tur boyunca gönderilen durum her turda misafirde birebir", hashOk);
check("5 tur boyunca arazi birebir", terrainOk);
check("5 tur boyunca tur sayacı senkron", turnOk);
// Maçın ilerlediğinin kanıtı: turlar kapandı ve arazi oyuldu (atışlar bu testte
// kaba nişanla ortaya düşer; hasar ayrı sınanır).
check("maç ilerledi (turlar kapandı, arazi oyuldu)",
  p.host.turnId > 6 && p.host.terrain.version > 0,
  `turnId ${p.host.turnId} • arazi sürümü ${p.host.terrain.version}`);

// ── 7) Maç sonu: sonuç paketi misafire ulaşır ─────────────────────────────
p.host.players[1].hp = 0;
p.host.players[1].alive = false;
guard = 0;
while (p.host.state !== "GAMEOVER" && guard++ < 900) {
  p.host.update(1 / 60);
  p.guest.update(1 / 60);
}
check("host maçı bitirdi (GAMEOVER)", p.host.state === "GAMEOVER");
check("host sonuç paketini yayınladı", p.host.lobby.session.ended === true);
check("misafir RESULT paketini aldı", p.guest.lobby.session.phase === PHASE.RESULTS && !!p.guest.lobby.session.lastResult);
check("misafir sonuç kartını gösterdi", p.guest.online.finished === true);
check("sonuç kazananı bildiriyor", (p.guest.lobby.session.lastResult || {}).winner === 0,
  JSON.stringify(p.guest.lobby.session.lastResult));

// ── 8) Kopma → bot devralma (oyun tarafı) ────────────────────────────────
p = makePair();
p.guest.lobby.toggleReady();
p.host.lobby.startMatch();
p.tb.close();
p.host.lobby.session.playerDisconnected(1);
check("kopan robot maçta kalır", p.host.players[1].alive === true);
p.host.lobby.session.now = () => Date.now() + 20000;   // grace süresi doldu
const grace = p.host.lobby.session.graceExpired(1);
check("grace dolunca bot devralır", grace.ok === true && p.host.players[1].control === "bot", JSON.stringify(grace));
check("aynı koltuk kimliğiyle dönüş kabul edilir",
  p.host.lobby.session.reconnect(1, p.host.lobby.session.seats[1].seatToken).ok === true);
check("bot kapanınca robot yeniden insan", p.host.players[1].control === "human");

// ── 9) Çizim yolları çökmüyor (lobi + savaş + yükleme perdesi) ───────────
let renderOk = true, renderErr = "";
try {
  const g = newGame();
  g.openOnline();
  g.render();
  g.lobby.step = "code"; g.lobby.typed = "ABC"; g.render();
  g.lobby.step = "room"; g.render();
  g.lobby.error = { code: "TIMEOUT", text: g.lobby._errorText("TIMEOUT") }; g.render();
  g.lobby.error = null; g.lobby._notice("online.invite.copied"); g.render();
  g.state = "ONLINE_LOADING"; g.online = { session: { matchId: "ABCDE" }, role: "guest", notice: null }; g.render();
} catch (e) { renderOk = false; renderErr = String(e && e.message ? e.message : e); }
check("lobi/yükleme çizimi çöküyor mu", renderOk, renderErr);

let battleRenderOk = true, battleErr = "";
try {
  p.host.render();
  p.guest.render();
  p.host.onlineNotice("NOT_YOUR_TURN");
  p.host.render();
  p.guest.onlineNotice("NO_AMMO");
  p.guest.render();
} catch (e) { battleRenderOk = false; battleErr = String(e && e.message ? e.message : e); }
check("savaş çizimi (çevrimiçi) çöküyor mu", battleRenderOk, battleErr);
check("komut reddi bildirimi metne çevrildi", typeof p.guest.online.notice.text === "string" && p.guest.online.notice.text.length > 0,
  p.guest.online.notice ? p.guest.online.notice.text : "yok");

// ── 10) Menüye dönüş oturumu kapatır ─────────────────────────────────────
p.host.quitToMenu();
check("menüye dönüş ağ bağlamını kapatır", p.host.online === null && p.host.mode === null);
check("menüye dönüş taşımayı kapatır", p.ta.status === G.NET_TRANSPORT_STATUS.CLOSED, p.ta.status);

// ── 11) Oda kodu yapıştırma (kullanıcı bildirimi: "kod yapıştırılmıyor")
/* İki ayrı hata vardı: (a) lobi klavye işleyicisi Ctrl+V'yi tüketip
 * `preventDefault` çağırıyordu → tarayıcı yapıştırma eylemi iptal oluyor ve
 * `paste` olayı hiç doğmuyordu; (b) ayrıştırıcı, panodaki URL'nin içindeki ilk
 * 5 harfli sözcüğü ("projel") oda kodu sanıyordu ve `_joinRoom` adlı olmayan bir
 * yöntemi çağırıyordu. */
const pasteLobby = (() => {
  const g = Object.create(G.Game.prototype);
  g.W = 960; g.H = 540; g.terrain = null;
  g.input = { mouseX: -100, mouseY: -100 };
  g.profile = null; g.renderTimeMs = 0; g.state = "ONLINE_LOBBY";
  g.hudTopInset = 0; g.hudRightInset = 0;
  g.updateHud = function () {};
  g.lobby = new G.OnlineLobby(g);
  g.lobby.open();
  return g;
})();
const pl = pasteLobby.lobby;
const parsed = (text) => pl._parseCode(text);
const inviteUrl = "file:///D:/code/projeler/new-wild-ones/index.html?oda=QWERT";
check("davet bağlantısından kod çıkarılır", parsed(inviteUrl) === "QWERT", String(parsed(inviteUrl)));
check("URL'deki rastgele sözcük kod sanılmaz (eski hata)", parsed("file:///D:/code/projeler/new-wild-ones/index.html") === null,
  String(parsed("file:///D:/code/projeler/new-wild-ones/index.html")));
check("tireli gösterim kabul edilir", parsed("ABC-DE") === "ABCDE", String(parsed("ABC-DE")));
check("tek başına kod kabul edilir", parsed("  qwert ") === "QWERT", String(parsed("  qwert ")));
check("kısa kod reddedilir", parsed("ABC") === null);
check("alfabe dışı harf reddedilir (O/0/I/1 üretilmez)", parsed("ABODE") === null, String(parsed("ABODE")));
check("davet bağlantısında kod parametresi öncelikli", parsed("https://x/y?oda=QWERT#ABC-DE") === "QWERT",
  String(parsed("https://x/y?oda=QWERT#ABC-DE")));

// Ctrl/Cmd/Alt + tuş lobi tarafından TÜKETİLMEZ (yapıştırma engellenmesin).
check("Ctrl+V tüketilmez (preventDefault yapılmaz)",
  pasteLobby.handleLobbyKey({ key: "v", ctrlKey: true, code: "KeyV" }) === false);
check("Cmd+V tüketilmez", pasteLobby.handleLobbyKey({ key: "v", metaKey: true, code: "KeyV" }) === false);
check("düz harf tüketilir (oda kodu yazımı)", pasteLobby.handleLobbyKey({ key: "a", code: "KeyA" }) === true);

// Gerçek `paste` olayı: ayrıştırma + ekran geçişi + ağa ÇIKMADAN katılma çağrısı.
let joined = 0;
pl.joinRoom = function () { joined++; };
pl.step = "role";
pl._bindPaste();
pl._boundPaste({ clipboardData: { getData: () => inviteUrl }, preventDefault() {} });
check("yapıştırınca kod yazılır ve katılma çağrılır", pl.typed === "QWERT" && joined === 1 && pl.step === "code",
  `typed=${pl.typed} joined=${joined} step=${pl.step}`);
check("yapıştırma geri bildirimi verilir", !!(pl.notice && pl.notice.text));
const before = joined;
pl._boundPaste({ clipboardData: { getData: () => "ilgisiz metin" }, preventDefault() {} });
check("ilgisiz metin katılmayı tetiklemez", joined === before);
pl.step = "room";
pl._boundPaste({ clipboardData: { getData: () => inviteUrl }, preventDefault() {} });
check("oda ekranında yapıştırma yok sayılır", joined === before);
pl._unbindPaste();

// ── 12) Tıklama güvenilirliği (kullanıcı bildirimi: "bazen butonlar çalışmıyor")
/* Nedenler ve karşılığı: (a) koordinat önbellekten (`input.mouseX/Y`) okunuyordu
 * → dokunmatik/çizim kaleminde `mousemove` hiç gelmediği için düğmeler (0,0) ile
 * sınanıyordu; artık koordinat OLAYIN kendisinden gelir (`Game.pointerWorld` +
 * `pressCanvas`). (b) Tıklama alanları ekran değişiminden sonra bir kare boyunca
 * bayat kalıyordu → ikinci tıklama yanlış ekranın düğmesini çalıştırabiliyordu;
 * artık her tıklamadan sonra tüketilir. (c) Çift tıklama ikinci bir taşıma
 * açabiliyordu; `_busy()` koruması var. (d) Devre dışı düğme sessiz kalmıyor. */
const clickGame = (() => {
  const g = Object.create(G.Game.prototype);
  g.canvas = dom.document.createElement("canvas");   // pointerWorld tuvali okur
  g.W = 960; g.H = 540; g.terrain = null;
  g.input = { mouseX: -100, mouseY: -100 };
  g.profile = null; g.renderTimeMs = 0; g.state = "ONLINE_LOBBY";
  g.hudTopInset = 0; g.hudRightInset = 0;
  g.updateHud = function () {};
  g.lobby = new G.OnlineLobby(g);
  g.lobby.open();
  return g;
})();
const cg = clickGame;
const cl = cg.lobby;
const clickCtx = dom.document.createElement("canvas").getContext("2d");
const rectOf = (action) => (cl._rects.filter((r) => r.action === action)[0] || null);
const clickAt = (r, button) => cg.pressCanvas({
  clientX: (r.x + r.w / 2) * 960 / cg.W, clientY: (r.y + r.h / 2) * 540 / cg.H,
  shiftKey: false, ctrlKey: false,
}, button == null ? 0 : button);

// (a) Koordinat olaydan: önbellek (0,0)/eski değer olsa bile düğme tutar.
cl.render(clickCtx);
const joinRect = rectOf("join");
check("rol ekranında KODA KATIL düğmesi çizildi", !!joinRect);
cg.input.mouseX = -100; cg.input.mouseY = -100;   // mousemove hiç gelmemiş gibi
clickAt(joinRect, 0);
check("tıklama koordinatı OLAYDAN alınır (önbellek bayat olsa bile)",
  cl.step === "code", `step=${cl.step}`);
check("olay koordinatı input'a da yazıldı", cg.input.mouseX > 0 && cg.input.mouseY > 0,
  `${Math.round(cg.input.mouseX)},${Math.round(cg.input.mouseY)}`);

// (b) Tıklama alanları tüketilir: bayat kareyle ikinci eylem olmaz.
check("tıklamadan sonra alanlar tüketilir (bayat kare yok)", cl._rects.length === 0);

// (c) Sağ tık lobide eylem başlatmaz.
cl.step = "role";
cl.render(clickCtx);
clickAt(rectOf("join"), 2);
check("sağ tık lobide eylem başlatmaz", cl.step === "role", `step=${cl.step}`);

// (d) ROL EKRANINDA robot seçici çalışır: oda HENÜZ kurulmamışken (session
// yok) oklar ve ← → robotu değiştirmeli. Eski `_cycleRobot` oturum yokken
// erken dönüyordu; seçici çizildiği hâlde hiçbir şey yapmıyordu (kullanıcı
// bildirimi: "bu sayfada karakter değiştiremiyorum").
check("rol ekranı testi oturumsuz başlar (oda kurulmadı)", !cl.session, String(!!cl.session));
const robot0 = cl.robotId;
cl.render(clickCtx);
check("rol ekranında robot okları çizildi", !!rectOf("robotPrev") && !!rectOf("robotNext"));
clickAt(rectOf("robotNext"), 0);
check("rol ekranında › robotu değiştirir", cl.robotId !== robot0, `${robot0} → ${cl.robotId}`);
check("robot seçimi robotIndex ile tutarlı",
  cl.robotId === G.CHARACTERS[cl.robotIndex].id, String(cl.robotId));
const robot1 = cl.robotId;
cl.render(clickCtx);
clickAt(rectOf("robotPrev"), 0);
check("rol ekranında ‹ geri döndürür", cl.robotId === robot0, `${robot1} → ${cl.robotId}`);
const idxBeforeKey = cl.robotIndex;
const keyHandled = cl.handleKey({ key: "ArrowRight" });
const expectIdx = (idxBeforeKey + 1) % G.CHARACTERS.length;
check("← → tuşları rol ekranında robotu değiştirir",
  keyHandled === true && cl.robotIndex === expectIdx, `tuş sonrası ${cl.robotId}`);
check("tuş seçimi robotId'ye yansır", cl.robotId === G.CHARACTERS[expectIdx].id, String(cl.robotId));

// (e) Çift tıklama tek oda açar.
cl.hostRoom();
const firstCode = cl.code;
const second = cl.hostRoom();
check("çift ODA KUR ikinci taşıma açmaz", second === false && cl.code === firstCode && cl._connecting === true,
  `second=${second} code=${cl.code}`);

// (f) Oda ayakta değilken davet kopyalanamaz; tıklama nedenini söyler.
cl.render(clickCtx);
const copyRect = rectOf("copy");
check("oda hazır değilken kopyala düğmesi devre dışı", !!copyRect && copyRect.disabled === true);
cl.notice = null;
clickAt(copyRect, 0);
check("devre dışı düğme nedenini bildirir",
  !!(cl.notice && cl.notice.key === "online.notice.roomNotReady"),
  cl.notice ? cl.notice.key : "yok");
// Başlat da aynı şekilde: karşı taraf hazır değil.
cl.notice = null;
clickAt(rectOf("start"), 0);
check("hazır olmayan başlat düğmesi nedenini bildirir",
  !!(cl.notice && cl.notice.key === "online.notice.startNeedsReady"),
  cl.notice ? cl.notice.key : "yok");
cl.close();

// ── 13) Yerleşim: dar/geniş dünyada çakışma yok, denetimlerin altında kalınmaz
/* Kullanıcı bildirimi: "küçük ekranlarda çevrimiçi sayfasının tasarımı
 * bozuluyor". Dünya genişliği pencere oranına göre 648–1620 arasında değişir ve
 * sağ üstteki DOM denetimleri sabit CSS px kalır; lobi bu ikisine uyarlı
 * olmalı. Ölçüt: (a) tüm tıklama alanları dünya içinde, (b) hiçbiri diğeriyle
 * çakışmıyor, (c) hepsi sağ üst denetim bölgesinin DIŞINDA. */
function layoutProbe(worldW, hudTop, hudRight) {
  const g = Object.create(G.Game.prototype);
  g.W = worldW; g.H = 540;
  g.terrain = null;
  g.input = { mouseX: -100, mouseY: -100 };
  g.profile = null;
  g.renderTimeMs = 0;
  g.state = "ONLINE_LOBBY";
  g.hudTopInset = hudTop;
  g.hudRightInset = hudRight;
  g.updateHud = function () {};
  g.lobby = new G.OnlineLobby(g);
  g.lobby.open();
  return g;
}
function rectsOverlap(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}
function layoutReport(g, label) {
  const out = [];
  for (const r of g.lobby._rects) {
    if (r.x < 0 || r.y < 0 || r.x + r.w > g.W + 0.5 || r.y + r.h > g.H + 0.5) {
      out.push(`${label}: ekran dışı ${r.action} (${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.w)}x${Math.round(r.h)})`);
    }
    // Sağ üst denetim bölgesi: ya SOLUNDA ya ALTINDA olmalı.
    const clear = (r.x + r.w <= g.W - g.hudRightInset + 0.5) || (r.y >= g.hudTopInset - 0.5);
    if (!clear) out.push(`${label}: denetim bölgesinde ${r.action}`);
  }
  for (let i = 0; i < g.lobby._rects.length; i++) {
    for (let j = i + 1; j < g.lobby._rects.length; j++) {
      const a = g.lobby._rects[i], b = g.lobby._rects[j];
      if (rectsOverlap(a, b)) out.push(`${label}: çakışma ${a.action} ↔ ${b.action}`);
    }
  }
  return out;
}
const layoutProblems = [];
for (const worldW of [648, 760, 855, 979, 1280, 1620]) {
  for (const [top, right] of [[0, 0], [147, 291], [90, 220]]) {
    const g = layoutProbe(worldW, top, right);
    const ctx = dom.document.createElement("canvas").getContext("2d");
    g.lobby.step = "role"; g.lobby.render(ctx);
    layoutProblems.push(...layoutReport(g, `rol/${worldW}/${right}`));
    g.lobby.step = "code"; g.lobby.typed = "ABC"; g.lobby.render(ctx);
    layoutProblems.push(...layoutReport(g, `kod/${worldW}/${right}`));
    g.lobby.step = "room"; g.lobby.role = "host"; g.lobby.render(ctx);
    layoutProblems.push(...layoutReport(g, `oda-host/${worldW}/${right}`));
    g.lobby.role = "guest"; g.lobby.ready = true; g.lobby.render(ctx);
    layoutProblems.push(...layoutReport(g, `oda-misafir/${worldW}/${right}`));
  }
}
check("lobi yerleşimi dar ve geniş dünyada bozulmuyor (çakışma/taşma yok)",
  layoutProblems.length === 0, layoutProblems.slice(0, 4).join(" | "));

// ── Özet ─────────────────────────────────────────────────────────────────
console.log("────────────────────────────────────────────────");
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exit(1);
}

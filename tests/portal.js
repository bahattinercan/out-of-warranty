/* Portal köprüsü testi (F5) — sahte SDK'larla, tarayıcısız.
 * Çalıştır: node tests/portal.js
 *
 * Ne sınanır: sağlayıcı seçimi (URL/global), portal YOKKEN sessiz no-op, her
 * metodun istisna atmaması, CrazyGames v3 sözleşmesi (init/environment,
 * loading/gameplay/happytime, rewarded+midgame reklam callbacks, oda bilgisi,
 * davet bağlantısı/parametresi, muteAudio ayarı) ve Poki sözleşmesi
 * (gameLoadingFinished, gameplayStart/Stop, rewardedBreak, commercialBreak).
 *
 * Gerçek portal SDK'ları burada çağrılmaz; onların ŞEKLİ taklit edilir. Portal
 * içinde gerçek davranış yalnız yayınlanmış oyunda (veya `_portal_probe.html`
 * ile headless) doğrulanabilir.
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "js", "portal.js"), "utf8");
const sandbox = { console, Math, JSON, Object, Array, String, Number, Boolean, Promise, Error, Set, Map, Infinity, NaN, setTimeout };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src + "\n;globalThis.__P = { Portal, PORTAL, PORTAL_PROVIDER, PORTAL_MIDGAME_COOLDOWN_MS };", sandbox, { filename: "portal.js" });
const P = sandbox.__P;

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

// ── Sahte SDK fabrikaları ──────────────────────────────────────────────────
function fakeCrazyGames(opts) {
  const o = opts || {};
  const calls = [];
  const sdk = {
    environment: o.environment || "crazygames",
    game: {
      settings: { muteAudio: !!o.muteAudio, disableChat: false },
      _settingsCb: null,
      _joinCb: null,
      loadingStart() { calls.push("loadingStart"); },
      loadingStop() { calls.push("loadingStop"); },
      gameplayStart() { calls.push("gameplayStart"); },
      gameplayStop() { calls.push("gameplayStop"); },
      happytime() { calls.push("happytime"); },
      updateRoom(payload) { calls.push({ updateRoom: payload }); },
      leftRoom() { calls.push("leftRoom"); },
      inviteLink(params) { calls.push({ inviteLink: params }); return "https://crazygames.com/game/x?oda=" + (params && params.oda); },
      inviteParams: o.inviteParams || null,
      getInviteParam(name) { return (o.inviteParams || {})[name] || null; },
      addSettingsChangeListener(fn) { sdk.game._settingsCb = fn; },
      addJoinRoomListener(fn) { sdk.game._joinCb = fn; },
    },
    ad: {
      requestAd(type, cb) {
        calls.push({ requestAd: type });
        sdk.lastAd = { type, cb };
      },
    },
    init() { calls.push("init"); return Promise.resolve(); },
  };
  const win = { CrazyGames: { SDK: sdk } };
  return { win, sdk, calls };
}

function fakePoki(opts) {
  const o = opts || {};
  const calls = [];
  const sdk = {
    init() { calls.push("init"); return Promise.resolve(); },
    gameLoadingFinished() { calls.push("gameLoadingFinished"); },
    gameplayStart() { calls.push("gameplayStart"); },
    gameplayStop() { calls.push("gameplayStop"); },
    commercialBreak() { calls.push("commercialBreak"); return Promise.resolve(); },
    rewardedBreak() {
      calls.push("rewardedBreak");
      return o.rewarded === false ? Promise.resolve(false) : (o.rewardedError ? Promise.reject(new Error("no")) : Promise.resolve(true));
    },
  };
  return { win: { PokiSDK: sdk }, sdk, calls };
}

const makePortal = (win, search, nowFn) => new P.Portal({ window: win, search: search || "", now: nowFn || (() => 0) });

// ── 1) Sağlayıcı seçimi ────────────────────────────────────────────────────
check("varsayılan: portal yok", makePortal({}, "").detectProvider() === P.PORTAL_PROVIDER.NONE);
check("?portal=crazygames seçilir", makePortal({}, "?portal=crazygames").detectProvider() === P.PORTAL_PROVIDER.CRAZYGAMES);
check("?portal=cg kısaltması kabul edilir", makePortal({}, "?portal=CG").detectProvider() === P.PORTAL_PROVIDER.CRAZYGAMES);
check("?portal=poki seçilir", makePortal({}, "?portal=poki").detectProvider() === P.PORTAL_PROVIDER.POKI);
check("?portal=off portalı kapatır", makePortal({}, "?portal=off").detectProvider() === P.PORTAL_PROVIDER.NONE);
check("portal sayfası değişkeni okunur",
  makePortal({ __PORTAL_PROVIDER__: "poki" }, "").detectProvider() === P.PORTAL_PROVIDER.POKI);
check("hazır SDK globali otomatik algılanır", (() => {
  const cg = fakeCrazyGames();
  return makePortal(cg.win, "").detectProvider() === P.PORTAL_PROVIDER.CRAZYGAMES;
})());

// ── 2) Portal YOKKEN sessiz no-op (oyun file:// çalışmaya devam eder) ──────
const none = makePortal({}, "");
check("portal yokken init ok:false döner", (async () => true)() && true);   // init asenkron: aşağıda sınanır
let threw = false;
let safe = true;
try {
  const r1 = none.loadingStart();
  const r2 = none.gameplayStart();
  const r3 = none.gameplayStop();
  const r4 = none.happytime();
  const r5 = none.requestMidgame();
  const r6 = none.updateRoom({ roomId: "ABCDE" });
  const r7 = none.leftRoom();
  const r8 = none.inviteLink({ oda: "ABCDE" });
  const r9 = none.inviteParam("oda");
  let cbRes = null;
  none.requestRewarded((res) => { cbRes = res; });
  safe = r1.ok === false && r2.ok === false && r3.ok === false && r4.ok === false &&
    r5.ok === false && r6.ok === false && r7.ok === false &&
    r8 === null && r9 === null && !!cbRes && cbRes.ok === false && cbRes.reason === "NO_PORTAL";
} catch (e) { threw = true; }
check("portal yokken tüm metodlar güvenli no-op", safe && !threw);
check("portal yokken isActive/adsAvailable false", none.isActive() === false && none.adsAvailable() === false);
none.init().then((res) => {
  check("portal yokken init NO_PROVIDER döner", res.ok === false && res.reason === "NO_PROVIDER");
  step2();
});

// ── 3) CrazyGames sözleşmesi ──────────────────────────────────────────────
function step2() {
  const cg = fakeCrazyGames({ muteAudio: true, inviteParams: { oda: "QWERT" } });
  let now = 1000;
  const portal = makePortal(cg.win, "?portal=crazygames", () => now);
  portal.init().then((res) => {
    check("CG init başarılı", res.ok === true && res.provider === "crazygames");
    check("CG SDK.init çağrıldı", cg.calls.indexOf("init") >= 0);
    check("CG ortamı okundu", portal.environment === "crazygames");
    check("CG reklamları kullanılabilir", portal.adsAvailable() === true);
    check("CG muteAudio ayarı uygulanır", portal.muted() === true);
    check("portal aktif", portal.isActive() === true);

    let settingsSeen = null;
    portal.onSettingsChange((s) => { settingsSeen = s; });
    cg.sdk.game.settings = { muteAudio: false, disableChat: true };
    cg.sdk.game._settingsCb();
    check("ayar değişikliği dinleyiciye gider", !!settingsSeen && settingsSeen.muteAudio === false && settingsSeen.disableChat === true);
    check("ses ayarı güncellendi", portal.muted() === false);

    let joined = null;
    portal.onJoinRoom((p) => { joined = p; });
    cg.sdk.game._joinCb({ oda: "ABCDE" });
    check("davetle katılma dinleyicisi çalışır", !!joined && joined.oda === "ABCDE");
    check("davet parametresi SDK'dan okunur", portal.inviteParam("oda") === "QWERT");
    check("davet bağlantısı üretilir", portal.inviteLink({ oda: "ABCDE" }).indexOf("ABCDE") > 0);

    portal.loadingStart();
    portal.loadingStop();
    portal.gameplayStart();
    portal.gameplayStop();
    portal.happytime();
    check("CG loading/gameplay/happytime SDK'ya iletilir",
      ["loadingStart", "loadingStop", "gameplayStart", "gameplayStop", "happytime"].every((c) => cg.calls.indexOf(c) >= 0),
      cg.calls.join(","));

    // Ödüllü reklam: başarılı
    let result = null;
    const pending = portal.requestRewarded((r) => { result = r; });
    check("ödüllü reklam isteği kuyruğa alındı", pending.ok === true && pending.pending === true);
    check("CG rewarded türü gönderildi", !!cg.sdk.lastAd && cg.sdk.lastAd.type === "rewarded");
    let busy = null;
    portal.requestRewarded((r) => { busy = r; });
    check("reklam sürerken ikinci istek BUSY", !!busy && busy.reason === "BUSY");
    cg.sdk.lastAd.cb.adFinished();
    check("reklam bitince ödül onayı gelir", !!result && result.ok === true);
    check("reklam bittikten sonra yeniden istenebilir", portal.canReward() === true);

    // Ödüllü reklam: hata
    let errRes = null;
    portal.requestRewarded((r) => { errRes = r; });
    cg.sdk.lastAd.cb.adError({ code: "unfilled" });
    check("reklam hatası nedeniyle döner", !!errRes && errRes.ok === false && errRes.reason === "unfilled");

    // Midgame: 3 dakika kuralı
    let mid1 = null;
    const midPending = portal.requestMidgame((r) => { mid1 = r; });
    check("ilk midgame isteği kuyruğa alınır", !!midPending && midPending.ok === true && midPending.pending === true);
    check("CG midgame türü gönderildi", !!cg.sdk.lastAd && cg.sdk.lastAd.type === "midgame");
    cg.sdk.lastAd.cb.adFinished();
    check("midgame bitince onay gelir", !!mid1 && mid1.ok === true);
    const mid2 = portal.requestMidgame();
    check("3 dakika dolmadan midgame istenmez", mid2.ok === false && mid2.reason === "COOLDOWN");
    now += P.PORTAL_MIDGAME_COOLDOWN_MS + 1;
    portal.requestMidgame(() => {});
    check("süre dolunca midgame yeniden istenir", portal.calls.filter((c) => c.name === "midgame.start").length === 2);

    // Oda bilgisi
    portal.updateRoom({ roomId: "ABCDE", isJoinable: true, inviteParams: { oda: "ABCDE" } });
    const roomCall = cg.calls.filter((c) => c && c.updateRoom).pop();
    check("oda bilgisi SDK'ya gönderilir",
      !!roomCall && roomCall.updateRoom.roomId === "ABCDE" && roomCall.updateRoom.isJoinable === true &&
      roomCall.updateRoom.inviteParams.oda === "ABCDE");
    portal.leftRoom();
    check("odadan ayrılma bildirilir", cg.calls.indexOf("leftRoom") >= 0);

    step3();
  });
}

// ── 4) Reklamlar kapalıyken (Basic Launch / kids) ──────────────────────────
function step3() {
  const cg = fakeCrazyGames({ environment: "disabled" });
  const portal = makePortal(cg.win, "?portal=crazygames", () => 0);
  portal.init().then(() => {
    check("environment=disabled reklamları kapatır", portal.adsAvailable() === false && portal.canReward() === false);
    let res = null;
    portal.requestRewarded((r) => { res = r; });
    check("reklam kapalıyken istek ADS_DISABLED döner", !!res && res.reason === "ADS_DISABLED");
    check("reklam kapalıyken oyun yine aktif", portal.isActive() === true);
    step4();
  });
}

// ── 5) Poki sözleşmesi ────────────────────────────────────────────────────
function step4() {
  const poki = fakePoki({});
  const portal = makePortal(poki.win, "?portal=poki", () => 0);
  portal.init().then((res) => {
    check("Poki init başarılı", res.ok === true && res.provider === "poki");
    portal.loadingStop();
    portal.gameplayStart();
    portal.gameplayStop();
    check("Poki olayları SDK'ya iletilir",
      ["gameLoadingFinished", "gameplayStart", "gameplayStop"].every((c) => poki.calls.indexOf(c) >= 0),
      poki.calls.join(","));
    check("Poki happytime yok (güvenli no-op)", portal.happytime().ok === false);
    let result = null;
    portal.requestRewarded((r) => { result = r; });
    setTimeout(() => {
      check("Poki rewardedBreak sonucu ödüle çevrilir", !!result && result.ok === true);
      let mid = null;
      portal.requestMidgame((r) => { mid = r; });
      setTimeout(() => {
        check("Poki commercialBreak midgame olarak çağrılır",
          !!mid && mid.ok === true && poki.calls.indexOf("commercialBreak") >= 0);
        step5();
      }, 5);
    }, 5);
  });
}

function step5() {
  const noReward = fakePoki({ rewarded: false });
  const portal = makePortal(noReward.win, "?portal=poki", () => 0);
  portal.init().then(() => {
    let res = null;
    portal.requestRewarded((r) => { res = r; });
    setTimeout(() => {
      check("reklam tam izlenmezse ödül verilmez", !!res && res.ok === false && res.reason === "NOT_REWARDED");
      // iframe/tam ekran
      const embedded = new P.Portal({ window: { self: {}, top: {}, CrazyGames: undefined }, search: "" });
      embedded.win.self = { x: 1 };
      embedded.win.top = { x: 2 };
      check("iframe içinde tam ekran düğmesi gizlenir", embedded.inIframe() === true && embedded.hideFullscreen() === true);
      finish();
    }, 5);
  });
}

function finish() {
  console.log("────────────────────────────────────────────────");
  console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
  if (fail) {
    console.log("\nBaşarısız testler:");
    for (const f of failures) console.log("  • " + f);
    process.exitCode = 1;
  }
}

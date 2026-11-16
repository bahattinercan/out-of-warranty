/* Çevrimiçi testlerin ortak ortamı (F4) — oyunu Node `vm` içinde bütün olarak
 * yükler ve DOM'u sahte bir nesneyle karşılar.
 *
 * Neden ortak dosya: `Game` yalnız metot GÖVDELERİNDE DOM'a dokunur, bu yüzden
 * gerçek `Game` örnekleri (host + N misafir) tarayıcısız çalıştırılabilir.
 * Sahte DOM hiçbir piksel üretmez; görsel doğrulama headless Chrome sondalarıyla
 * yapılır (`_online_probe.html`, `_robot_picker_probe.html`).
 *
 * Kullananlar: `tests/net-multi.js` (6 koltuk), `tests/net-reconnect.js`
 * (kopma / bot devralma / yeniden bağlanma).
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "js");
const FILES = ["i18n.js", "version.js", "portal.js", "diagnostics.js", "audio.js", "settings.js", "characters.js", "progression.js", "profile.js", "parts.js",
  "market.js", "assets-manifest.js", "assets.js", "maps.js", "skills.js", "skill-fx.js", "robots.js", "terrain.js", "weapons.js",
  "entity.js", "projectile.js", "ai.js", "net/protocol.js", "net/transport.js", "net/state.js",
  "net/session.js", "net/adapter.js", "online-lobby.js", "game.js", "mobile.js"];
const EXPORT = "\n;globalThis.__M = { Game, OnlineLobby, CHARACTERS, MAPS, getMapById, NET_MSG, NET_CMD, " +
  "NET_PHASE, NET_MAX_SEATS, NET_MIN_SEATS, NET_GRACE_MS, NET_PROTOCOL_VERSION, NetSession, " +
  "LoopbackTransport, LoopbackHub, netCaptureState, netApplyState, netSnapshotHash, " +
  "netCaptureTerrain, WEAPONS, PORTAL, Portal, showOverlay, hideOverlay, renderOverlayReward };";

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
    // `updateHud` listeyi children üzerinden yönetir: sahte düğüm gerçek bir
    // çocuk dizisi taşımalı.
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

module.exports = { G: sandbox.__M, dom, jsDir: JS_DIR };

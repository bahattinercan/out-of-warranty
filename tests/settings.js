/* Ayarlar menüsü regresyon testleri — saf Node, bağımlılıksız.
 * Çalıştır: node tests/settings.js
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "js");

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ` — ${detail}` : ""));
}

function bootSettings() {
  const sandbox = {
    console,
    Math,
    Object,
    Array,
    JSON,
    setTimeout,
    clearTimeout,
    localStorage: {
      _data: {},
      getItem(k) { return this._data[k] || null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    },
    document: {
      fullscreenElement: null,
      _elements: {},
      getElementById(id) {
        if (!this._elements[id]) {
          const classes = new Set(["hidden"]);
          this._elements[id] = {
            id,
            classList: {
              contains(c) { return classes.has(c); },
              add(c) { classes.add(c); },
              remove(c) { classes.delete(c); },
              toggle(c, force) {
                if (force === undefined) {
                  if (this.contains(c)) this.remove(c); else this.add(c);
                } else if (force) this.add(c); else this.remove(c);
              },
            },
            querySelectorAll() { return []; },
            addEventListener() {},
          };
        }
        return this._elements[id];
      },
      querySelectorAll() { return []; },
      addEventListener() {},
    },
    t(k, fb) { return fb || k; },
    SFX: {
      getVolume() { return 1; },
      setVolume() {},
      isMuted() { return false; },
      toggleMute() {},
      getMusicVolume() { return 0; },
      setMusicVolume() {},
      isMusicMuted() { return true; },
      toggleMusicMute() {},
      shoot() {},
      uiClick() {},
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;

  const src = fs.readFileSync(path.join(JS_DIR, "settings.js"), "utf8");
  vm.createContext(sandbox);
  vm.runInContext(src + "\n;globalThis.GameSettings = GameSettings;", sandbox);
  return sandbox;
}

// ── 1) Varsayılan ayarlar ve get/set ───────────────────────────────────────
const ctx1 = bootSettings();
const S = ctx1.GameSettings;

check("GameSettings nesnesi tanımlı", typeof S === "object" && S !== null);
check("varsayılan damagePopups true", S.get("damagePopups") === true);
check("varsayılan aimGuide true", S.get("aimGuide") === true);
check("varsayılan showFps false", S.get("showFps") === false);

S.set("damagePopups", false);
check("set ile damagePopups güncellendi", S.get("damagePopups") === false);

S.set("showFps", true);
check("set ile showFps güncellendi", S.get("showFps") === true);

// ── 2) Kalıcılık (localStorage) ───────────────────────────────────────────
const raw = ctx1.localStorage.getItem("nwo_settings");
check("ayarlar localStorage'a yazıldı", !!raw);
const parsed = JSON.parse(raw || "{}");
check("localStorage'daki değer doğru", parsed.damagePopups === false && parsed.showFps === true);

// ── 3) Modal durumları ────────────────────────────────────────────────────
check("başlangıçta modal kapalı", !S.isOpen());
S.open();
check("open() sonrası modal açık", S.isOpen());
S.close();
check("close() sonrası modal kapalı", !S.isOpen());
S.toggle();
check("toggle() sonrası modal açık", S.isOpen());
S.toggle();
check("ikinci toggle() sonrası modal kapalı", !S.isOpen());

// ── Özet ──────────────────────────────────────────────────────────────────
console.log(`\nsettings: ${pass} geçti, ${fail} kaldı`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exitCode = 1;
}

/* Ses regresyonları: Web Audio sınırı taklit edilir, oyun/SFX kodu gerçektir.
 * Çalıştır: node tests/audio.js — fiziksel ses çıkışını doğrulamaz.
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const source = ["i18n", "portal", "audio", "characters", "weapons", "entity", "projectile", "skills", "ai", "game"]
  .map(name => fs.readFileSync(path.join(__dirname, "..", "js", name + ".js"), "utf8")).join("\n;\n") +
  "\n;globalThis.api = { SFX, Entity, Game, WEAPONS };";

function setup(options = {}) {
  const sources = [], contexts = [], warnings = [];
  const storage = { nwo_muted: options.muted ? "1" : "0" };
  if (options.volume !== undefined) storage.nwo_volume = options.volume;
  let resolveResume, rejectResume;
  const param = () => ({ value: 0,
    setValueAtTime(v, t) { assert(Number.isFinite(v) && Number.isFinite(t)); this.value = v; },
    exponentialRampToValueAtTime(v, t) { assert(v > 0 && Number.isFinite(v) && Number.isFinite(t)); },
  });
  const node = () => ({ gain: param(), frequency: param(), Q: param(),
    connect() { return this; }, disconnect() { this.disconnected = true; },
  });
  function sound() {
    if (options.failNode) throw new Error("Ses düğümü oluşturulamadı");
    const s = Object.assign(node(), {
      stops: [], start(t) { this.startTime = t; }, stop(t = 0) { this.stops.push(t); },
    });
    sources.push(s);
    return s;
  }
  class AudioContext {
    constructor() {
      if (options.failConstructor) throw new Error("Ses aygıtı kullanılamıyor");
      this.state = options.suspended ? "suspended" : "running";
      this.currentTime = 10; this.sampleRate = 48000; this.destination = {};
      this.resumeCalls = 0; contexts.push(this);
    }
    createGain() {
      if (options.failGain) throw new Error("Ana kazanç kurulamadı");
      const n = node(); if (!this.master) this.master = n; return n;
    }
    createOscillator() { return sound(); }
    createBufferSource() { return sound(); }
    createBiquadFilter() { return node(); }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
    suspend() { this.state = "suspended"; return Promise.resolve(); }
    resume() {
      this.resumeCalls++;
      if (options.throwResume) throw new Error("Devam ettirme başarısız");
      return new Promise((resolve, reject) => {
        resolveResume = () => { this.state = "running"; resolve(); };
        rejectResume = reject;
      });
    }
    close() { this.state = "closed"; return Promise.resolve(); }
  }
  const sandbox = {
    console: { warn: (...args) => warnings.push(args) },
    localStorage: {
      getItem(k) { if (options.blockStorage) throw Error("Engelli"); return storage[k]; },
      setItem(k, v) { if (options.blockStorage) throw Error("Engelli"); storage[k] = v; },
    },
  };
  // Müzik scheduler'ı vm içinden setInterval kullanır; Node zamanlayıcıları
  // sandbox'a açıkça verilir (vm bağlamı global'ları miras almaz). Müzik
  // zamanlayıcısı unref edilir: bir test hata verip GAMEOVER ile temizlik
  // yapamazsa bile süreç asılı kalmasın.
  sandbox.setInterval = (fn, ms) => {
    const id = setInterval(fn, ms);
    if (id && typeof id.unref === "function") id.unref();
    return id;
  };
  sandbox.clearInterval = clearInterval;
  sandbox.setTimeout = setTimeout;
  sandbox.clearTimeout = clearTimeout;
  if (!options.noWindow) sandbox.window = options.noAudio ? {} : { AudioContext };
  vm.runInNewContext(source, sandbox);
  return { ...sandbox.api, sources, contexts, storage, warnings, sandbox,
    resolveResume: () => resolveResume(), rejectResume: () => rejectResume(Error("İzin yok")),
  };
}

const tests = [];
function test(name, run) { tests.push({ name, run }); }
const flush = () => new Promise(resolve => setImmediate(resolve));

test("tüm efektler geçerli parametrelerle planlanır ve kaynaklar tamamlanınca ayrılır", () => {
  const t = setup();
  for (const w of t.WEAPONS) { t.SFX.shoot(w); t.SFX.explosion(w.radius); }
  for (const k of ["heal", "shield", "damageReduce", "nextShot", "jump", "glide", "dash", "dig", "melee", "radial", "quake", "spit"]) t.SFX.skill(k);
  for (const f of ["jump", "hit", "eliminate", "weaponSwitch", "partMount", "uiClick", "turn", "win"]) t.SFX[f]();
  t.SFX.windChange(-2, 3.5);
  t.SFX.windChange(3, -1.5);
  assert.equal(t.contexts.length, 1);
  assert(t.sources.length > 100);
  for (const s of t.sources) {
    assert(s.stops[0] > s.startTime);
    s.onended?.();
    assert(s.disconnected, "Biten ses kaynağı ayrılmalı");
  }
});

test("sessize almak çalan ve ileriye planlanan efektleri iptal eder", () => {
  const t = setup(); t.SFX.win();
  const old = t.sources.slice(), now = t.contexts[0].currentTime;
  assert(old.some(s => s.startTime > now));
  t.SFX.toggleMute();
  assert(old.every(s => s.disconnected && s.stops.at(-1) <= now), "Eski sesler yeniden duyulmamalı");
  t.SFX.explosion(80); assert.equal(t.sources.length, old.length);
  assert.equal(t.storage.nwo_muted, "1");
  t.SFX.toggleMute(); t.SFX.jump();
  assert.equal(t.sources.length, old.length + 1);
  assert.equal(t.storage.nwo_muted, "0");
  assert.equal(t.contexts[0].master.gain.value, 0.42);
});

for (const failure of ["failConstructor", "failGain", "failNode"]) {
  test(`${failure}: ses hatası oyuna taşınmaz ve her çağrıda tekrar denenmez`, () => {
    const t = setup({ [failure]: true });
    assert.doesNotThrow(() => { t.SFX.shoot(t.WEAPONS[0]); t.SFX.win(); t.SFX.toggleMute(); });
    assert.equal(t.warnings.length, 1);
    assert(t.contexts.every(c => c.state === "closed"));
  });
}

test("bekleyen resume tekilleştirilir; sessize alınan eski çağrılar sonradan çalmaz", async () => {
  const t = setup({ suspended: true }); t.SFX.win();
  assert.equal(t.contexts[0].resumeCalls, 1);
  assert.equal(t.sources.length, 0);
  t.SFX.toggleMute(); t.resolveResume(); await flush();
  assert.equal(t.sources.length, 0);
  t.SFX.toggleMute(); t.SFX.uiClick(); assert.equal(t.sources.length, 1);
});

test("resume reddi yakalanır; sonraki etkileşimde yeniden denenebilir", async () => {
  const t = setup({ suspended: true }); t.SFX.uiClick();
  t.rejectResume(); await flush();
  t.SFX.uiClick(); assert.equal(t.contexts[0].resumeCalls, 2);
  t.resolveResume(); await flush();
  t.SFX.uiClick(); assert.equal(t.sources.length, 1);
});

test("senkron resume hatası oyunu kesmez", () => {
  const t = setup({ suspended: true, throwResume: true });
  assert.doesNotThrow(() => t.SFX.uiClick());
  assert.equal(t.sources.length, 0);
});

test("kayıtlı sessizlik, engelli depolama ve ses API'siz ortam güvenlidir", () => {
  for (const options of [{ muted: true }, { noAudio: true }, { noWindow: true }, { blockStorage: true }]) {
    const t = setup(options); t.SFX.win();
    if (!options.blockStorage) assert.equal(t.sources.length, 0);
    t.SFX.toggleMute(); t.SFX.uiClick();
  }
});

function gameFixture(t) {
  const g = Object.create(t.Game.prototype);
  g.players = [100, 300, 500].map(x => new t.Entity(x, 400, "#fff", "Test"));
  g.turn = 0; g.turnId = 1; g.damagePopups = []; g.updateHud = () => {};
  g.bot = { cancel() {} }; g.bots = []; g.input = { left: false, right: false, charging: false, power: 0 };
  g.clearTurnInput = () => {};
  let hits = 0, kills = 0;
  t.SFX.hit = () => hits++; t.SFX.eliminate = () => kills++;
  return { g, counts: () => ({ hits, kills }) };
}

test("ses seviyesi çalan efektlerin ana kazancını değiştirir ve kaydedilir", () => {
  const t = setup(); t.SFX.jump();
  t.SFX.setVolume(0.35);
  assert.equal(t.SFX.getVolume(), 0.35);
  assert.equal(t.contexts[0].master.gain.value, 0.42 * 0.35);
  assert.equal(t.storage.nwo_volume, "0.35");
  t.SFX.toggleMute(); assert.equal(t.contexts[0].master.gain.value, 0);
  t.SFX.toggleMute(); assert.equal(t.contexts[0].master.gain.value, 0.42 * 0.35);
  const reload = setup({ volume: t.storage.nwo_volume }); reload.SFX.jump();
  assert.equal(reload.contexts[0].master.gain.value, 0.42 * 0.35);
});

test("sıfır seviye eski efektleri iptal eder; aç düğmesi önceki seviyeyi geri getirir", () => {
  const t = setup(); t.SFX.setVolume(0.6); t.SFX.win();
  const old = t.sources.slice(); t.SFX.setVolume(0);
  assert(t.SFX.isMuted()); assert.equal(t.contexts[0].master.gain.value, 0);
  assert(old.every(s => s.disconnected));
  t.SFX.jump(); assert.equal(t.sources.length, old.length);
  t.SFX.toggleMute(); assert.equal(t.SFX.getVolume(), 0.6); assert(!t.SFX.isMuted());
  t.SFX.toggleMute(); t.SFX.setVolume(0.2);
  assert(!t.SFX.isMuted()); assert.equal(t.contexts[0].master.gain.value, 0.42 * 0.2);
});

test("kaydedilmiş sıfır/sessizlik, geçersiz değerler ve seviye sınırları", () => {
  const zero = setup({ volume: "0" }); zero.SFX.win(); assert.equal(zero.contexts.length, 0);
  zero.SFX.toggleMute(); assert(zero.SFX.getVolume() > 0); assert(!zero.SFX.isMuted());
  const muted = setup({ volume: "0.7", muted: true }); muted.SFX.win();
  assert.equal(muted.contexts.length, 0); assert.equal(muted.SFX.getVolume(), 0.7);
  for (const value of ["", "NaN", "junk", "-1", "2", null]) {
    assert.equal(setup({ volume: value }).SFX.getVolume(), 1);
  }
  const t = setup({ blockStorage: true });
  t.SFX.setVolume(0.4);
  for (const value of [NaN, Infinity, undefined, null, "0.5"]) t.SFX.setVolume(value);
  assert.equal(t.SFX.getVolume(), 0.4);
  t.SFX.setVolume(8); assert.equal(t.SFX.getVolume(), 1);
  t.SFX.setVolume(-8); assert.equal(t.SFX.getVolume(), 0);
});

test("ses kaydırıcısının tuşları yürüme/atış başlatmaz; M kısayolu çalışır", () => {
  const t = setup(); const handlers = {};
  t.sandbox.window.addEventListener = (name, fn) => { handlers[name] = fn; };
  t.sandbox.document = { getElementById: () => null };
  const g = Object.create(t.Game.prototype);
  g.canvas = { addEventListener() {} }; g.input = { left: false, right: false };
  g.state = "AIMING"; g.turn = 0; g.players = [{ control: "human" }]; g.updateMuteButton = () => {};
  let shots = 0; g.startCharge = g.releaseFire = () => shots++;
  g.bindInput();
  const event = key => ({ key, code: key === " " ? "Space" : key, target: { closest: () => true }, preventDefault() {} });
  for (const key of ["ArrowLeft", "ArrowRight", " ", "1", "q", "w"]) {
    handlers.keydown(event(key)); handlers.keyup(event(key));
  }
  assert.equal(shots, 0); assert(!g.input.left && !g.input.right);
  handlers.keydown(event("m")); assert(t.SFX.isMuted());
  const human = event("ArrowRight"); human.target.closest = () => null;
  handlers.keydown(human); assert(g.input.right);
});

test("HUD ses yüzdesi ve erişilebilir sessiz durumu birlikte güncellenir", () => {
  const t = setup(); const elements = {};
  for (const id of ["mute-btn", "mute-label", "audio-control", "volume-slider", "volume-value"]) {
    elements[id] = { dataset: {}, attrs: {}, style: { setProperty() {} }, setAttribute(k, v) { this.attrs[k] = v; } };
  }
  t.sandbox.document = { getElementById: id => elements[id] };
  const g = Object.create(t.Game.prototype);
  t.SFX.setVolume(0.42); g.updateMuteButton();
  assert.equal(elements["volume-slider"].value, 42);
  assert.equal(elements["volume-value"].textContent, "42%");
  g.toggleMute(); assert.equal(elements["mute-btn"].attrs["aria-pressed"], "true");
  assert.equal(elements["mute-label"].textContent, "Sessiz");
  assert.equal(elements["volume-slider"].value, 42);
  assert.equal(elements["mute-btn"].textContent, undefined, "SVG ikon yazıyla değiştirilmemeli");
});

for (const kind of ["yetenek", "zehir", "ateş"]) {
  test(`${kind}: gerçek hasar ve yeni ölüm ses verir; kalkan/ölü hedef vermez`, () => {
    const t = setup({ noWindow: true }); const { g, counts } = gameFixture(t);
    const target = g.players[1]; target.hp = 10; target.blockShield = true;
    const apply = () => {
      if (kind === "yetenek") g.applySkillDamage(target, 20, 0, 0, 1);
      if (kind === "zehir") { target.poison = { dps: 20, turns: 2 }; g.endTurn(); }
      if (kind === "ateş") {
        g.fires = [{ x: target.x, y: target.y, life: 30, tick: 14, dps: 20 }]; g.updateFires(1 / 60);
      }
    };
    apply(); assert.deepEqual(counts(), { hits: 0, kills: 0 });
    apply(); assert.equal(target.alive, false); assert.deepEqual(counts(), { hits: 1, kills: 1 });
    apply(); assert.deepEqual(counts(), { hits: 1, kills: 1 });
  });
}

test("müzik: durum eşlemesi tema değiştirir ve eskisini durdurur", () => {
  const t = setup();
  t.SFX.musicSync("MODE_SELECT");
  assert.equal(t.SFX.musicInfo().theme, "menu");
  assert.ok(t.SFX.musicInfo().running, "scheduler açık");
  const firstCount = t.sources.length;
  assert.ok(firstCount > 0, "menu teması nota zamanladı");
  t.SFX.musicSync("AIMING");
  assert.equal(t.SFX.musicInfo().theme, "battle");
  // Eski temanın notaları durdurulmuş olmalı.
  const stoppedOld = t.sources.slice(0, firstCount).filter((s) => s.stops.length > 1);
  assert.ok(stoppedOld.length > 0, "tema değişimi bekleyen notaları iptal eder");
  t.SFX.musicSync("GAMEOVER");
  assert.equal(t.SFX.musicInfo().theme, null);
  assert.equal(t.SFX.musicInfo().running, false, "müzik tamamen durdu");
  t.SFX.musicSync("GAMEOVER"); // idempotent: hata atmamalı
});

test("müzik: sessizde notaları keser, ses açılınca devam eder", async () => {
  const t = setup();
  t.SFX.musicSync("MODE_SELECT");
  assert.equal(t.SFX.musicInfo().theme, "menu");
  await new Promise((resolve) => setTimeout(resolve, 260)); // birkaç tick
  const before = t.sources.length;
  assert.ok(before > 0, "menu notası zamanlandı");
  t.SFX.setVolume(0);
  const afterMute = t.sources.length;
  await new Promise((resolve) => setTimeout(resolve, 260));
  assert.equal(t.sources.length, afterMute, "sessizken yeni nota zamanlanmaz");
  assert.equal(t.SFX.musicInfo().theme, "menu", "tema korunur, döngü canlı kalır");
  t.SFX.toggleMute(); // sesi geri aç
  await new Promise((resolve) => setTimeout(resolve, 260));
  assert.ok(t.sources.length > afterMute, "ses açılınca müzik kaldığı yerden devam eder");
  t.SFX.musicSync("GAMEOVER"); // test sonunda temizle
});
(async () => {
  let failed = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log("✓ " + name); }
    catch (err) { failed++; console.error("✗ " + name + "\n  " + err.message); }
  }
  console.log(`Ses testleri: ${tests.length - failed}/${tests.length} geçti`);
  if (failed) process.exitCode = 1;
})();

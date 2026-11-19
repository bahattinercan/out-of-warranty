/* Ses regresyonları: Web Audio sınırı taklit edilir, oyun/SFX kodu gerçektir.
 * Çalıştır: node tests/audio.js — fiziksel ses çıkışını doğrulamaz.
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const source = ["i18n", "version", "portal", "diagnostics", "audio", "characters", "robot-rig-profiles", "weapons", "entity", "projectile", "skills", "ai", "game"]
  .map(name => fs.readFileSync(path.join(__dirname, "..", "js", name + ".js"), "utf8")).join("\n;\n") +
  "\n;globalThis.api = { SFX, Entity, Game, WEAPONS };";

function setup(options = {}) {
  const sources = [], contexts = [], warnings = [], automation = [], audioElements = [], waveShapers = [];
  const storage = { nwo_muted: options.muted ? "1" : "0" };
  if (options.volume !== undefined) storage.nwo_volume = options.volume;
  if (options.musicMuted !== undefined) storage.nwo_music_muted = options.musicMuted ? "1" : "0";
  if (options.musicVolume !== undefined) storage.nwo_music_volume = String(options.musicVolume);
  let resolveResume, rejectResume;
  const panners = [];
  const param = () => ({ value: 0,
    setValueAtTime(v, t) { assert(Number.isFinite(v) && Number.isFinite(t)); this.value = v; automation.push(["set", v, t]); },
    exponentialRampToValueAtTime(v, t) { assert(v > 0 && Number.isFinite(v) && Number.isFinite(t)); automation.push(["ramp", v, t]); },
  });
  const node = () => ({ gain: param(), frequency: param(), Q: param(), pan: param(),
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
      this.currentTime = 10; this.sampleRate = 48000; this.destination = {
        channelCount: options.monoOutput ? 1 : 2,
        maxChannelCount: options.monoOutput ? 1 : 2,
      };
      this.resumeCalls = 0; contexts.push(this);
    }
    createGain() {
      if (options.failGain) throw new Error("Ana kazanç kurulamadı");
      const n = node(); if (!this.master) this.master = n; return n;
    }
    createOscillator() { return sound(); }
    createBufferSource() { return sound(); }
    createBiquadFilter() { return node(); }
    createWaveShaper() { const n = node(); waveShapers.push(n); return n; }
    createStereoPanner() { const n = node(); panners.push(n); return n; }
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
  // Mono hoparlör/tek kanal simülasyonu ve panner desteklemeyen tarayıcı:
  if (options.noPanner) delete AudioContext.prototype.createStereoPanner;
  const sandbox = {
    console: { warn: (...args) => warnings.push(args) },
    localStorage: {
      getItem(k) { if (options.blockStorage) throw Error("Engelli"); return storage[k]; },
      setItem(k, v) { if (options.blockStorage) throw Error("Engelli"); storage[k] = v; },
    },
  };
  if (options.fileAudio) {
    sandbox.Audio = class MockAudio {
      constructor(src) {
        this.src = src; this.paused = true; this.ended = false; this.currentTime = 0;
        this.volume = 1; this.loop = false; this.preload = ""; audioElements.push(this);
      }
      play() { this.paused = false; return Promise.resolve(); }
      pause() { this.paused = true; }
    };
  }
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
  if (!options.noWindow) sandbox.window = options.noAudio ? {} : {
    AudioContext,
    matchMedia: (query) => ({ matches: !!options.coarsePointer && query === "(pointer: coarse)" }),
  };
  vm.runInNewContext(source, sandbox);
  return { ...sandbox.api, sources, contexts, storage, warnings, automation, sandbox, panners, audioElements, waveShapers,
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
  for (const f of ["jump", "hit", "eliminate", "weaponSwitch", "partMount", "uiClick", "turn", "win", "lose", "draw"]) t.SFX[f]();
  t.SFX.windChange(-2, 3.5);
  t.SFX.windChange(3, -1.5);
  assert.equal(t.contexts.length, 1);
  const active = t.sources.filter(source => !source.disconnected);
  assert(active.length <= 40, "eşzamanlı efekt bütçesi aşılmamalı");
  assert(active.length >= 36, "kritik rezerv korunurken ses akışı dolu kalmalı");
  for (const s of t.sources) assert(s.stops.length > 0, "her kaynak ya biter ya bütçe için bırakılır");
  for (const s of active) {
    assert(s.stops[0] > s.startTime, "aktif ses planlanan bitişinden önce durdurulmamalı");
    s.onended?.();
    assert(s.disconnected, "Biten ses kaynağı ayrılmalı");
  }
  assert(t.sources.some(s => s.disconnected && s.stops.at(-1) === 0), "bütçe aşımında kaynak hemen bırakılmalı");
});

test("silah sesleri spec davranışlarına göre ayrışır ve gürültü tıklamasız başlar", () => {
  const t = setup();
  t.SFX.shoot({ id: "custom-borer", radius: 30, drill: true });
  assert(t.sources.some(source => source.type === "sawtooth"), "matkap spec'i mekanik osilatörü seçmeli");
  assert(t.automation.some(event => event[0] === "set" && event[1] === 0.0001), "gürültü sıfıra yakın seviyeden başlamalı");
  assert(t.automation.some(event => event[0] === "ramp" && event[1] === 0.15), "gürültü kısa atakla hedef seviyeye çıkmalı");
  const utility = setup();
  utility.SFX.shoot({ id: "custom-tool", hook: true });
  assert(utility.sources.some(source => source.type === "sine"), "kanca spec'i hafif elektronik tını kullanmalı");
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
  t.contexts[0].currentTime += 0.05;
  t.SFX.uiClick(); assert.equal(t.contexts[0].resumeCalls, 2);
  t.resolveResume(); await flush();
  t.contexts[0].currentTime += 0.05;
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
  t.sandbox.window.addEventListener = (name, fn) => { (handlers[name] ||= []).push(fn); };
  t.sandbox.document = { getElementById: () => null };
  const g = Object.create(t.Game.prototype);
  g.canvas = { addEventListener() {} }; g.input = { left: false, right: false };
  g.state = "AIMING"; g.turn = 0; g.players = [{ control: "human" }]; g.updateMuteButton = () => {};
  let shots = 0; g.startCharge = g.releaseFire = () => shots++;
  g.bindInput();
  const dispatch = (name, e) => (handlers[name] || []).forEach(fn => fn(e));
  const event = key => ({ key, code: key === " " ? "Space" : key, target: { closest: () => true }, preventDefault() {} });
  for (const key of ["ArrowLeft", "ArrowRight", " ", "1", "q", "w"]) {
    dispatch("keydown", event(key)); dispatch("keyup", event(key));
  }
  assert.equal(shots, 0); assert(!g.input.left && !g.input.right);
  dispatch("keydown", event("m")); assert(t.SFX.isMuted());
  const human = event("ArrowRight"); human.target.closest = () => null;
  dispatch("keydown", human); assert(g.input.right);
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

test("yeni profilde müzik dengeli seviyede açık başlar ve gameplay sesinden ayrıdır", () => {
  const t = setup();
  assert.equal(t.SFX.isMusicMuted(), false, "yeni profilde müzik açık olmalı");
  assert.equal(t.SFX.getMusicVolume(), 0.58);
  assert.equal(t.SFX.isMuted(), false, "gameplay sesi açık olmalı");
  t.SFX.musicSync("MODE_SELECT");
  assert.equal(t.SFX.musicInfo().theme, "menu");
  assert.equal(t.SFX.musicInfo().running, true, "menü müziği otomatik başlamalı");
  t.SFX.jump();
  assert.ok(t.sources.length > 0, "oyun efektleri müzikle birlikte çalar");
});

test("kayıtlı müzik sessizliği ve ses seviyesi yeni varsayılanı geçersiz kılar", () => {
  const t = setup({ musicMuted: true, musicVolume: 0.37 });
  assert.equal(t.SFX.isMusicMuted(), true);
  assert.equal(t.SFX.getMusicVolume(), 0.37);
  t.SFX.musicSync("MODE_SELECT");
  assert.equal(t.SFX.musicInfo().running, false, "tercih edilen sessizlik korunmalı");
});

test("oyun sesi ve müzik sesi birbirinden bağımsız ayarlanır ve kaydedilir", () => {
  const t = setup();
  t.SFX.setMusicMuted(true);
  t.SFX.toggleMusicMute(); // müziği aç
  assert.equal(t.SFX.isMusicMuted(), false);
  assert.equal(t.storage.nwo_music_muted, "0");
  t.SFX.setMusicVolume(0.5);
  assert.equal(t.SFX.getMusicVolume(), 0.5);
  assert.equal(t.storage.nwo_music_volume, "0.5");
  // SFX'i sessize al: müzik etkilenmemeli
  t.SFX.toggleMute();
  assert.equal(t.SFX.isMuted(), true);
  assert.equal(t.SFX.isMusicMuted(), false, "SFX sessizken müzik açık kalır");
  t.SFX.musicSync("GAMEOVER");
});

test("müzik: durum eşlemesi tema değiştirir ve eskisini durdurur", () => {
  const t = setup({ musicMuted: false });
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
  const t = setup({ musicMuted: false });
  t.SFX.musicSync("MODE_SELECT");
  assert.equal(t.SFX.musicInfo().theme, "menu");
  await new Promise((resolve) => setTimeout(resolve, 260)); // birkaç tick
  const before = t.sources.length;
  assert.ok(before > 0, "menu notası zamanlandı");
  t.SFX.setMusicVolume(0);
  const afterMute = t.sources.length;
  await new Promise((resolve) => setTimeout(resolve, 260));
  assert.equal(t.sources.length, afterMute, "sessizken yeni nota zamanlanmaz");
  assert.equal(t.SFX.musicInfo().theme, "menu", "tema korunur, döngü canlı kalır");
  t.SFX.toggleMusicMute(); // müziği geri aç
  await new Promise((resolve) => setTimeout(resolve, 260));
  assert.ok(t.sources.length > afterMute, "müzik açılınca kaldığı yerden devam eder");
  t.SFX.musicSync("GAMEOVER"); // test sonunda temizle
});

test("müzik notaları tamamlanınca node bağlantıları temizlenir", () => {
  const t = setup({ musicMuted: false });
  t.SFX.musicSync("MODE_SELECT");
  const musicVoices = t.sources.slice();
  assert(musicVoices.length > 0);
  for (const source of musicVoices) source.onended?.();
  assert(musicVoices.every(source => source.disconnected), "nota node'ları onended sonrasında ayrılmalı");
  t.SFX.musicSync("GAMEOVER");
});

test("yoğun SFX akışı eşzamanlı kaynak sayısını sınırlar", () => {
  const t = setup();
  for (let i = 0; i < 100; i++) t.SFX.uiClick();
  const active = t.sources.filter(source => !source.disconnected);
  assert(active.length <= 40, "aktif efekt sayısı sınır içinde kalmalı");
});
test("konumsal ses: sol/orta/sağ pan, ölü bant ve konumsuz merkez", () => {
  const t = setup();
  const spec = t.WEAPONS[0];
  // Her atış iki panner üretir (ton + gürültü); sıra: atış başına 2.
  t.SFX.shoot(spec, { x: 0, width: 960 });
  t.SFX.shoot(spec, { x: 480, width: 960 }); // tam merkez → panner bile kurulmaz
  t.SFX.shoot(spec, { x: 960, width: 960 });
  assert.equal(t.panners.length, 4, "yalnız yanlardaki atışlar pan düğümü kurmalı");
  assert(t.panners[0].pan.value < -0.99, "sol kenar tam sola panlanmalı");
  assert(t.panners[2].pan.value > 0.99, "sağ kenar tam sağa panlanmalı");
  const dead = setup();
  dead.SFX.shoot(spec, { x: 470, width: 960 }); // merkeze çok yakın → ölü bant
  assert.equal(dead.panners.length, 0, "merkez çevresinde pan titrememeli");
  const none = setup();
  none.SFX.shoot(spec);
  assert.equal(none.panners.length, 0, "konum yoksa panner kurulmaz");
  const bad = setup();
  bad.SFX.shoot(spec, { x: 500, width: 0 }); // geçersiz genişlik → merkez
  assert.equal(bad.panners.length, 0, "eksik ölçü merkez miks demektir");
});

test("mono çıkış ve mobilde merkez/sığ miks güvenli", () => {
  const mono = setup({ monoOutput: true });
  assert.equal(mono.SFX.spatialInfo().depth, 0, "mono çıkışta pan derinliği sıfır");
  assert.equal(mono.SFX.spatialInfo().mono, true);
  mono.SFX.shoot(mono.WEAPONS[0], { x: 0, width: 960 });
  assert(mono.sources.length > 0, "mono çıkışta ses çalmayı sürdürmeli");
  assert(mono.panners.every(panner => panner.pan.value === 0), "mono çıkışta pan uygulanmaz");

  const mobile = setup({ coarsePointer: true });
  assert.equal(mobile.SFX.spatialInfo().mobile, true);
  assert(Math.abs(mobile.SFX.spatialInfo().depth - 0.55) < 1e-9, "mobilde sığ panorama");
  mobile.SFX.shoot(mobile.WEAPONS[0], { x: 960, width: 960 });
  assert(Math.abs(mobile.panners[0].pan.value - 0.55) < 1e-6, "mobilde kenar bile tam tek kulağa kaçmaz");

  const plain = setup({ noPanner: true });
  assert.equal(plain.SFX.spatialInfo().panner, false, "panner yoksa bunu bildirmeli");
  plain.SFX.shoot(plain.WEAPONS[0], { x: 0, width: 960 });
  assert.equal(plain.panners.length, 0);
  assert(plain.sources.length > 0, "panner desteklenmese de merkez miks çalar");

  const fixed = setup();
  assert.equal(fixed.SFX.setSpatialDepth(0.5), 0.5, "sonda derinliği sabitleyebilmeli");
  assert.equal(fixed.SFX.setSpatialDepth(null), 1, "null otomatik karar geri getirir");
});

test("patlama ve oyun olayları konum bağlamını sese taşır", () => {
  const t = setup();
  t.SFX.explosion(90, { damage: 40 }, { x: 0, width: 960 });
  assert(t.panners[0].pan.value < -0.99, "patlama sahnenin solundan duyulmalı");

  // Oyun tarafı: misafir patlaması ve Bomba Yağmuru koordinat geçirir.
  const g = Object.create(t.Game.prototype);
  g.W = 960; g.explosions = []; g.triggerScreenShake = () => {}; g.onlineGuest = true;
  const explosions = [];
  t.SFX.explosion = (radius, spec, spatial) => explosions.push({ radius, spatial });
  g.explode(480, 120, { radius: 40, damage: 10 });
  assert.equal(explosions.length, 1);
  assert.equal(explosions[0].spatial.x, 480);
  assert.equal(explosions[0].spatial.width, 960);

  const airdrop = Object.create(t.Game.prototype);
  airdrop.W = 960; airdrop.projectiles = []; airdrop.input = { mouseX: 300 };
  const shots = [];
  t.SFX.shoot = (spec, spatial) => shots.push(spatial);
  airdrop.fireAirdrop({}, { airdropCount: 2, airdropSpread: 10 }, 0.5);
  assert.equal(shots.length, 1);
  assert.equal(shots[0].x, 300, "ateş sesi hedef sütunundan gelmeli");
  assert.equal(shots[0].width, 960);
});

test("deterministik tını varyasyonu: aynı tohum aynı sonucu verir", () => {
  const a = setup(); a.SFX.shoot(a.WEAPONS[0], { seed: 4242 });
  const b = setup(); b.SFX.shoot(b.WEAPONS[0], { seed: 4242 });
  assert.deepEqual(a.automation, b.automation, "aynı tohum aynı zamanlama ve tınıyı üretmeli");

  const c = setup(); c.SFX.shoot(c.WEAPONS[0], { seed: 777 });
  assert.notDeepEqual(c.automation, a.automation, "farklı tohum duyulur biçimde farklı olmalı");

  // Seviye değişmez: yalnız frekans/süre/filtre gezinir. Kazanç çarpanları ≤1,
  // frekanslar >1 olduğundan ramp listesini bu eşikle ayırıyoruz.
  const peaks = (t) => t.automation
    .filter(event => event[0] === "ramp" && event[1] <= 1)
    .map(event => event[1]);
  assert.deepEqual(peaks(c), peaks(a), "varyasyon kazanç/tepe seviyesini değiştirmemeli");

  // Ardışık olaylar sayaçla ilerler: birebir kopya değil.
  const d = setup(); d.SFX.shoot(d.WEAPONS[0]); d.SFX.shoot(d.WEAPONS[0]);
  const half = Math.floor(d.automation.length / 2);
  assert.notDeepEqual(d.automation.slice(0, half), d.automation.slice(half), "ardışık atışlar aynı tınıyı tekrarlamamalı");

  const probe = setup();
  for (let seed = 0; seed < 200; seed++) {
    const shape = probe.SFX.variantInfo(seed);
    for (const key of ["freq", "dur", "cutoff"]) {
      assert(shape[key] >= 0.96 - 1e-9 && shape[key] <= 1.04 + 1e-9, `${key} ±%4 aralığında kalmalı`);
    }
  }
  assert.deepEqual(probe.SFX.variantInfo(11), probe.SFX.variantInfo(11));
  assert.notDeepEqual(probe.SFX.variantInfo(11), probe.SFX.variantInfo(12));
});

test("ses bütçesi: kritik ses korunur, düşük öncelikli akış elenir", () => {
  const t = setup();
  const active = () => t.sources.filter(source => !source.disconnected).length;
  for (let i = 0; i < 36; i++) t.SFX.weaponSwitch(); // tek katman, ikincil geri bildirim
  assert.equal(active(), 36);
  t.SFX.uiClick();
  assert.equal(active(), 36, "rezerv doluyken arayüz sesi eklenmez");
  t.SFX.hit();
  assert.equal(active(), 38, "isabet sesi kritik rezervden yer bulmalı");

  for (let i = 0; i < 3; i++) { t.contexts[0].currentTime += 0.05; t.SFX.hit(); }
  assert.equal(active(), 40, "bütçe sabit kalmalı");
  assert(t.sources.some(source => source.disconnected), "bütçe dolunca düşük öncelikli ses bırakılmalı");
  const info = t.SFX.graph();
  assert.equal(info.priorities.feedback, 32, "kurbanlar ikincil geri bildirimden seçilmeli");
  assert.equal(info.priorities.critical, 8, "kritik sesler korunmalı");
  assert.equal(info.active, 40);
});

test("düşük öncelikli ses daha önemli sesi düşürmez; kritik selde en eski gider", () => {
  const t = setup();
  for (let i = 0; i < 36; i++) t.SFX.weaponSwitch();
  for (let i = 0; i < 2; i++) { t.contexts[0].currentTime += 0.05; t.SFX.hit(); }
  assert.equal(t.SFX.graph().active, 40);
  const dropped = () => t.sources.filter(source => source.disconnected).length;
  const before = dropped();
  t.SFX.weaponSwitch();
  assert.equal(dropped(), before, "özel rezerv doluyken ikincil ses yeni kurban yaratmamalı");
  assert.equal(t.SFX.graph().priorities.critical, 4, "kritik sesler dokunulmadan kalmalı");

  // Yalnızca kritik sesler varken bütçe dolarsa en eski kritik bırakılır.
  const flood = setup();
  for (let i = 0; i < 20; i++) flood.SFX.turn(); // 2 katman × 20 = 40
  assert.equal(flood.SFX.graph().priorities.critical, 40);
  flood.SFX.eliminate();
  assert.equal(flood.SFX.graph().active, 40, "sınır yine 40'ta kalır");
  assert.equal(flood.SFX.graph().priorities.critical, 40, "yeni kritik bilgi duyulur");
});

test("her ses efekti ailesi dÃ¶rt karÄ±ÅŸÄ±k varyantÄ± tekrar etmeden Ã§alar", () => {
  const families = [
    ["shoot:standard", s => s.SFX.shoot({ id: "basic" })],
    ["shoot:teleport", s => s.SFX.shoot({ id: "teleportball" })],
    ["shoot:drill", s => s.SFX.shoot({ id: "drill" })],
    ["shoot:sniper", s => s.SFX.shoot({ id: "sniper", directHitDamage: true })],
    ["shoot:pellet", s => s.SFX.shoot({ id: "shotgun", pellets: 5 })],
    ["shoot:bounce", s => s.SFX.shoot({ id: "grenade", bounce: true })],
    ["explosion:standard", s => s.SFX.explosion(40, {})],
    ["explosion:fire", s => s.SFX.explosion(40, { id: "fireball" })],
    ["explosion:metal", s => s.SFX.explosion(40, { id: "sniper", directHitDamage: true })],
    ["explosion:cluster", s => s.SFX.explosion(40, { cluster: true })],
    ...["jump", "teleport", "hook", "hit", "eliminate", "weaponSwitch", "uiClick", "partMount", "turn", "pickup", "alarm", "win", "lose", "draw"]
      .map(name => [name, s => s.SFX[name]()]),
    ["timer", s => s.SFX.timerTick(false)], ["timer-urgent", s => s.SFX.timerTick(true)],
    ["wind", s => s.SFX.windChange(-1, 2)],
    ...["heal", "shield", "damageReduce", "nextShot", "jump", "glide", "dash", "dig", "melee", "radial", "quake", "spit"]
      .map(kind => ["skill:" + kind, s => s.SFX.skill(kind)]),
  ];
  for (const [name, play] of families) {
    const t = setup();
    const seen = [];
    for (let i = 0; i < 4; i++) {
      if (t.contexts[0]) t.contexts[0].currentTime += 0.2;
      const before = t.sources.length;
      play(t);
      const variation = t.sources.slice(before).find(source => source.effectVariation != null)?.effectVariation;
      assert(Number.isInteger(variation), `${name}: kaynakta varyant kimliği bulunmalı`);
      seen.push(variation);
    }
    assert.equal(new Set(seen).size, 4, `${name}: ilk turda dört farklı varyant çalmalı`);
    const before = t.sources.length;
    play(t);
    const next = t.sources.slice(before).find(source => source.effectVariation != null)?.effectVariation;
    assert.notEqual(next, seen[3], `${name}: yeni tur aynı varyantla başlamamalı`);
  }
});

test("arena-rock themes and result stings are generated in Web Audio", () => {
  const t = setup({ fileAudio: true });
  t.SFX.musicSync("MODE_SELECT");
  assert.equal(t.audioElements.length, 0, "music must not open external audio files");
  const menuSources = t.sources.slice();
  assert(menuSources.some(source => source.type === "triangle"), "menu uses a clean lead voice");
  assert.equal(t.SFX.musicInfo().bpm, 88, "menu is slower than combat");
  assert.equal(t.waveShapers.length, 0, "menu guitars stay clean");
  assert(menuSources.some(source => source.type === "sine"), "menu has synthesized kick drum");
  assert(menuSources.length >= 5, "menu schedules melody, bass, chords and drums");
  t.SFX.musicSync("AIMING");
  const battleSources = t.sources.slice(menuSources.length);
  assert(t.waveShapers.some(node => node.curve?.length === 256 && node.oversample === "2x"), "battle guitar uses a soft drive curve");
  assert.equal(t.SFX.musicInfo().bpm, 126, "battle has a separate faster tempo");
  assert(menuSources.some(source => source.stops.length > 1), "theme change stops old notes");
  assert(battleSources.length > menuSources.length, "battle arrangement has denser layers");
  t.SFX.setMusicVolume(0);
  assert(battleSources.some(source => source.stops.length > 1), "mute stops scheduled music notes");
  const mutedCount = t.sources.length;
  t.SFX.setMusicVolume(0.5);
  assert.equal(t.SFX.musicInfo().theme, "battle", "unmute preserves the current theme");
  assert(t.sources.length > mutedCount, "unmute resumes the coded theme");
  t.SFX.playResult("win");
  const resultSources = t.sources.slice(mutedCount);
  assert(resultSources.some(source => source.type === "sawtooth"), "victory plays a guitar-like sting");
  assert.equal(t.SFX.musicInfo().theme, null, "result cue stops the background scheduler");
  assert.equal(t.audioElements.length, 0, "result cue uses no external file");
  t.SFX.musicSync("GAMEOVER");
  assert(resultSources.some(source => source.stops.length > 1), "GAMEOVER cleans up result notes");
  t.SFX.musicSync("MODE_SELECT");
  assert.equal(t.SFX.musicInfo().theme, "menu");
});

test("menu and battle each shuffle four variations without adjacent repeats", () => {
  for (const [theme, other] of [["MODE_SELECT", "AIMING"], ["AIMING", "MODE_SELECT"]]) {
    const t = setup();
    const choices = [];
    t.SFX.musicSync(theme);
    assert.equal(t.SFX.musicInfo().variationCount, 4);
    choices.push(t.SFX.musicInfo().variation);
    for (let i = 1; i < 4; i++) {
      t.SFX.musicSync(other);
      t.SFX.musicSync(theme);
      choices.push(t.SFX.musicInfo().variation);
    }
    assert.equal(new Set(choices).size, 4, `${theme}: all four arrangements play before the bag repeats`);
    const last = choices[choices.length - 1];
    t.SFX.musicSync(other);
    t.SFX.musicSync(theme);
    assert.notEqual(t.SFX.musicInfo().variation, last, `${theme}: reshuffle avoids an immediate repeat`);
    t.SFX.musicSync("GAMEOVER");
  }
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

/* Ses efektleri — Web Audio API ile prosedürel sentez.
 *
 * Music and sound effects are synthesized on demand with AudioContext, preserving
 * direct `file://` launch without audio files, runtime dependencies, or network requests.
 *
 * Tarayıcılar otomatik ses çalmayı engeller: AudioContext ancak bir kullanıcı
 * jesti (tık/tuş) sonrası "running" olur. ensure() bekleyen tek bir resume()
 * isteği tutar; bağlam hazır değilken eski efektleri kuyruğa biriktirmez.
 *
 * Genel API (global `SFX`):
 *   SFX.shoot(spec, pos) — silah ateşi (spec'e göre tını)
 *   SFX.explosion(radius, spec, pos) — patlama (yarıçapa göre boyut/derinlik)
 *
 * `pos` isteğe bağlı konum/ölçüm bağlamıdır: `{ x, width, pan?, seed? }`.
 * `x` dünya pikseli, `width` dünya genişliğidir; yatay stereo pan bu orandan
 * türetilir (mono çıkışta ve mobilde merkez/sığ miks — bkz. spatialInfo()).
 * `seed` verilirse tını varyasyonu deterministik olur (aynı tohum → aynı ses).
 *   SFX.jump()           — zıplama
 *   SFX.teleport()       — ışınlanma (Işınlanma Topu varış)
 *   SFX.hook()           — kanca tutunma/atma (Kanca)
 *   SFX.skill(kind, id)   — karakter yeteneği (türüne ve modülüne göre)
 *   SFX.hit()            — isabet/hasar
 *   SFX.eliminate()      — bir oyuncu elendi
 *   SFX.weaponSwitch()   — silah değiştir
 *   SFX.partMount()      — parça tak/sök (metal klik)
 *   SFX.uiClick()        — menü tıklaması
 *   SFX.turn()           — sıra yeni oyuncuya geçti
 *   SFX.windChange(a, b) — rüzgâr yönü/şiddeti değişti
 *   SFX.playResult(result) — match-result music sting synthesized in Web Audio
 *   SFX.win()/lose()/draw() — prosedürel maç sonucu jingle'ları
 *   SFX.musicSync(state) — duruma göre arka plan müziğini aç/kapat/tema değiştir
 *   SFX.musicInfo()      — aktif müzik teması ve çalan nota sayısı (tanı/test)
 *   SFX.toggleMute()     — oyun sesini aç/kapat (durumu döndürür)
 *   SFX.setVolume(0..1)  — oyun ses seviyesini ayarla ve kaydet
 *   SFX.getVolume()      — seçili oyun ses seviyesi (sessizde de korunur)
 *   SFX.toggleMusicMute()— müziği aç/kapat (yeni profilde müzik açık gelir)
 *   SFX.setMusicVolume(0..1)— müzik seviyesini ayarla ve kaydet
 *   SFX.getMusicVolume() — seçili müzik seviyesi
 *   SFX.isMusicMuted()   — müzik kapalı mı
 *   SFX.spatialInfo()    — pan derinliği/çıkış kanalı kararı (tanı)
 *   SFX.setSpatialDepth(d) — pan derinliğini geçici olarak sabitle (null → otomatik)
 *   SFX.variantInfo(seed)— tohumun ürettiği tını çarpanları (tanı/test)
 *   SFX.graph()          — ses grafiği + ses sayacı (sonda ölçümü)
 */
const SFX = (() => {
  let ctx = null;
  let master = null;    // Oyun sesleri (SFX) kazancı
  let gameplayBus = null;
  let uiBus = null;
  let musicGain = null; // Arka plan müziği kazancı
  let noiseBuf = null;
  let muted = false;
  let volume = 1; // %100 eski ana kazanç olan 0.42'ye karşılık gelir
  let lastAudibleVolume = 1;

  // Yeni profilde müzik, ses efektlerinden daha düşük seviyede başlar.
  let musicMuted = false;
  let musicVolume = 0.58;
  let lastAudibleMusicVolume = 0.58;

  let disabled = false;
  let resuming = null;
  const sources = new Map(); // kaynak → bağlantıları temizleyen işlev
  const voiceMeta = new Map();
  const musicVoiceGains = new Map();

  // ── Olay öncelikleri ve kaynak bütçesi ───────────────────────────────────
  // 4 kritik tekil bilgi (isabet, ölüm, ani ölüm alarmı, sıra, maç sonucu)
  // 3 oyuncu eylemi (ateş, patlama, yetenek, hareket)
  // 2 ikincil geri bildirim (zıplama, rüzgâr, silah/parça değişimi, tık)
  // 1 arayüz ayrıntısı (menü tıklaması)
  const PRIORITY = { CRITICAL: 4, ACTION: 3, FEEDBACK: 2, UI: 1 };
  const SFX_BUDGET = 40;      // eşzamanlı efekt kaynağı üst sınırı (müzik hariç)
  const CRITICAL_RESERVE = 4; // kritik olaylara her zaman ayrılan yuva (36 + 4)
  const MUSIC_MASTER_GAIN = 0.32; // kritik savaş geri bildirimine daha fazla tepe payı bırakır
  const SFX_TEXTURES = {
    standard: { attackHz: 3900, bodyHz: 94, tailHz: 2500 },
    teleport: { attackHz: 5200, bodyHz: 250, tailHz: 3400 },
    drill: { attackHz: 2100, bodyHz: 72, tailHz: 1500 },
    sniper: { attackHz: 6100, bodyHz: 118, tailHz: 4200 },
    pellet: { attackHz: 4700, bodyHz: 130, tailHz: 3000 },
    bounce: { attackHz: 2800, bodyHz: 82, tailHz: 1900 },
    fire: { attackHz: 3300, bodyHz: 96, tailHz: 1600 },
    metal: { attackHz: 5600, bodyHz: 128, tailHz: 3700 },
    cluster: { attackHz: 4400, bodyHz: 68, tailHz: 2200 },
  };

  // Pan derinliği: 1 tam stereo, mobilde sığ (tek kulaklıkta/speaker'da ses
  // kaybolmasın), mono çıkışta 0 (merkez). Sonda/test `setSpatialDepth` ile
  // bunu geçici olarak geçersiz kılabilir.
  const PAN_DEAD_ZONE = 0.08;
  let spatialDepthOverride = null;

  function countSfx() {
    let count = 0;
    for (const source of sources.keys()) if (!musicSources.has(source)) count++;
    return count;
  }

  function isMonoOutput() {
    const dest = ctx && ctx.destination;
    if (!dest) return false;
    if (Number.isFinite(dest.maxChannelCount) && dest.maxChannelCount <= 1) return true;
    return Number.isFinite(dest.channelCount) && dest.channelCount <= 1 && !Number.isFinite(dest.maxChannelCount);
  }

  function isCoarsePointer() {
    try {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
      return !!window.matchMedia("(pointer: coarse)").matches;
    } catch (error) { return false; }
  }

  function spatialInfo() {
    // Çıkış kanalı sayısı bağlamdan okunur; henüz kurulmadıysa tembel kurulumu tetikle.
    if (!ctx && !disabled && !muted) ensure();
    const panner = !!(ctx && typeof ctx.createStereoPanner === "function");
    if (spatialDepthOverride != null) {
      return { depth: spatialDepthOverride, mono: spatialDepthOverride === 0, mobile: isCoarsePointer(), auto: false, panner };
    }
    const mobile = isCoarsePointer();
    if (isMonoOutput()) return { depth: 0, mono: true, mobile, auto: true, panner };
    return { depth: mobile ? 0.55 : 1, mono: false, mobile, auto: true, panner };
  }

  function clampPan(value) { return Math.max(-1, Math.min(1, value)); }

  // Dünya x konumundan yatay pan: merkezde ölü bant, kenara doğru yumuşak
  // açılım. Koordinat yoksa/eksikse merkez güvenli varsayılandır.
  function panFor(spatial) {
    if (!spatial) return 0;
    const depth = spatialInfo().depth;
    if (depth === 0) return 0;
    if (Number.isFinite(spatial.pan)) return clampPan(spatial.pan * depth);
    let pos = null;
    if (Number.isFinite(spatial.pos)) pos = spatial.pos;
    else if (Number.isFinite(spatial.x) && Number.isFinite(spatial.width) && spatial.width > 0) pos = spatial.x / spatial.width;
    if (pos == null) return 0;
    const value = clampPan(pos * 2 - 1);
    const magnitude = Math.abs(value);
    if (magnitude <= PAN_DEAD_ZONE) return 0;
    const shaped = (magnitude - PAN_DEAD_ZONE) / (1 - PAN_DEAD_ZONE);
    return clampPan(Math.sign(value) * shaped * depth);
  }

  // ── Deterministik tını varyasyonu ────────────────────────────────────────
  // Aynı tohum her zaman aynı çarpanları üretir (test edilebilir); ardışık
  // olaylar sayaçla farklı tohum alır ki tekrar eden atışlar birebir kopya
  // olmasın. Varyasyon yalnız frekans/süre/filtre ekseninde ±%4 gezinir;
  // kazanç sabittir, böylece ses seviyesi ve kritik olayın tanınırlığı değişmez.
  const VARIATION = 0.04;
  const FX_VARIATIONS = [
    { freq: 0.94, dur: 0.94, cutoff: 0.88, attack: 0.76, q: 0.82 },
    { freq: 0.98, dur: 1.08, cutoff: 1.06, attack: 1.2, q: 1.12 },
    { freq: 1.04, dur: 0.9, cutoff: 1.14, attack: 0.86, q: 0.92 },
    { freq: 1, dur: 1.02, cutoff: 0.96, attack: 1, q: 1.24 },
  ];
  const effectVariationBags = new Map();
  let seedSequence = 0;

  function hashString(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function mixSeed(seed) {
    let x = (seed >>> 0) || 1;
    x ^= x >>> 16; x = Math.imul(x, 2246822507);
    x ^= x >>> 13; x = Math.imul(x, 3266489909);
    x ^= x >>> 16;
    return x >>> 0;
  }

  function variantOf(seed) {
    const unit = (salt) => mixSeed((seed >>> 0) ^ hashString(salt)) / 4294967296;
    const spread = (value) => 1 + (value * 2 - 1) * VARIATION;
    return { freq: spread(unit("freq")), dur: spread(unit("dur")), cutoff: spread(unit("cutoff")) };
  }

  function nextEffectVariation(key, seed) {
    if (seed != null) return mixSeed(seed ^ hashString(key)) % FX_VARIATIONS.length;
    let bag = effectVariationBags.get(key);
    if (!bag) { bag = { order: [], cursor: 0, last: -1 }; effectVariationBags.set(key, bag); }
    if (bag.cursor >= bag.order.length) {
      bag.order = FX_VARIATIONS.map((_, index) => index);
      for (let i = bag.order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag.order[i], bag.order[j]] = [bag.order[j], bag.order[i]];
      }
      if (bag.order[0] === bag.last) [bag.order[0], bag.order[1]] = [bag.order[1], bag.order[0]];
      bag.cursor = 0;
    }
    const selected = bag.order[bag.cursor++];
    bag.last = selected;
    return selected;
  }

  // Olay bağlamı: öncelik, pan ve tohum. tone/noise katmanları bunu opts ile alır.
  function voice(key, priority, spatial) {
    const explicit = spatial && Number.isFinite(spatial.seed) ? (spatial.seed >>> 0) : null;
    const seed = explicit != null
      ? mixSeed(explicit ^ hashString(key))
      : mixSeed(hashString(key) ^ Math.imul(++seedSequence, 2654435761));
    const variationIndex = nextEffectVariation(key, explicit);
    const micro = variantOf(seed);
    const variation = FX_VARIATIONS[variationIndex];
    return {
      priority,
      pan: panFor(spatial),
      variationIndex,
      variant: {
        freq: micro.freq * variation.freq,
        dur: micro.dur * variation.dur,
        cutoff: micro.cutoff * variation.cutoff,
        attack: variation.attack,
        q: variation.q,
      },
    };
  }

  function stopVoice(source) {
    const cleanup = sources.get(source);
    try { source.stop(); } catch (e) { /* kaynak bitmiş olabilir */ }
    if (cleanup) cleanup();
  }

  // Bütçe aşımı: en düşük öncelikli ses bırakılır (aynı öncelikte en eski gider)
  // ki yeni bilgi duyulsun. Hiçbir zaman yeni olaydan DAHA önemli bir ses
  // düşürülmez; düşük öncelikli akış kritik sesi susturamaz.
  function trimBudget(priority) {
    let active = countSfx();
    while (active > SFX_BUDGET) {
      let victim = null, victimPriority = Infinity;
      for (const source of sources.keys()) {
        if (musicSources.has(source)) continue;
        const value = (voiceMeta.get(source) || {}).priority || PRIORITY.UI;
        if (value < victimPriority) { victimPriority = value; victim = source; }
      }
      if (!victim || victimPriority > priority) break;
      stopVoice(victim);
      active--;
    }
  }

  // Tercihleri yükle — file:// üzerinde localStorage çoğu tarayıcıda çalışır
  try { muted = localStorage.getItem("nwo_muted") === "1"; } catch (e) { /* yoksay */ }
  try {
    const saved = localStorage.getItem("nwo_volume");
    const value = Number(saved);
    if (saved != null && saved !== "" && Number.isFinite(value) && value >= 0 && value <= 1) volume = value;
  } catch (e) { /* depolama engellense de ses ayarlanabilir */ }
  if (volume > 0) lastAudibleVolume = volume;

  try {
    const savedMusicMuted = localStorage.getItem("nwo_music_muted");
    if (savedMusicMuted === "0") musicMuted = false;
    else if (savedMusicMuted === "1") musicMuted = true;
    // Kayıtlı tercih yoksa müzik açık başlar; kaydedilmiş sessizlik korunur.
  } catch (e) { /* yoksay */ }

  try {
    const savedMusicVol = localStorage.getItem("nwo_music_volume");
    const mVal = Number(savedMusicVol);
    if (savedMusicVol != null && savedMusicVol !== "" && Number.isFinite(mVal) && mVal >= 0 && mVal <= 1) {
      musicVolume = mVal;
    }
  } catch (e) { /* yoksay */ }
  if (musicVolume > 0) lastAudibleMusicVolume = musicVolume;

  function savePreferences() {
    try {
      localStorage.setItem("nwo_muted", muted ? "1" : "0");
      localStorage.setItem("nwo_volume", String(volume));
      localStorage.setItem("nwo_music_muted", musicMuted ? "1" : "0");
      localStorage.setItem("nwo_music_volume", String(musicVolume));
    } catch (e) { /* yoksay */ }
  }

  function applyVolume() {
    if (master && !disabled) {
      try { master.gain.value = (muted || volume === 0) ? 0 : 0.42 * volume; } catch (error) { disable(error); }
    }
    if (musicGain && !disabled) {
      try { musicGain.gain.value = (musicMuted || musicVolume === 0) ? 0 : MUSIC_MASTER_GAIN * musicVolume; } catch (error) { disable(error); }
    }
    if (muted || volume === 0) {
      stopSfx();
    }
    if (musicMuted || musicVolume === 0) {
      stopMusic(false);
    } else {
      musicNextTime = 0;
      ensure();
      if (musicTheme && !musicTimer) startMusic(musicTheme);
    }
  }

  function stopSfx() {
    for (const [source, cleanup] of sources) {
      if (!musicSources.has(source)) {
        try { source.stop(); } catch (e) { /* zaten bitmiş olabilir */ }
        cleanup();
      }
    }
  }

  function stopAll() {
    stopMusic();
    for (const [source, cleanup] of sources) {
      try { source.stop(); } catch (e) { /* zaten bitmiş olabilir */ }
      cleanup();
    }
  }

  // Ses aygıtı/kurulum hatası oyunun olay akışını kesmemeli. Hatalı bağlamı
  // kapat, yalnız sesi devre dışı bırak ve tanı için bir kez konsola yaz.
  function disable(error) {
    if (disabled) return;
    disabled = true;
    stopAll();
    if (ctx) {
      try { Promise.resolve(ctx.close()).catch(() => {}); } catch (e) { /* aygıt kapanmış olabilir */ }
    }
    console.warn("Ses devre dışı bırakıldı; oyun sessiz devam ediyor.", error);
  }

  function track(source, nodes) {
    const cleanup = () => {
      sources.delete(source);
      voiceMeta.delete(source);
      musicVoiceGains.delete(source);
      source.onended = null;
      for (const node of nodes) {
        try { node.disconnect(); } catch (e) { /* bağlantı zaten ayrılmış olabilir */ }
      }
    };
    sources.set(source, cleanup);
    source.onended = cleanup;
  }

  // Tarayıcı autoplay kilidi: AudioContext ilk kullanıcı jestinden önce kurulursa
  // Chrome'da resume() isteği hiç sonuçlanmaz — ne çözülür ne reddedilir. Yalnızca
  // "bekleyen istek var" korumasına güvenmek, jest sonrası yeniden denemeyi
  // engellediği için oyunu baştan sona sessiz bırakır (üstelik hata da vermez).
  // Bu yüzden her kullanıcı etkileşiminde resume() yeniden denenir; bağlam
  // "running" olduğunda dinleyici ucuz bir no-op'a döner.
  let unlockBound = false;
  function bindUnlock() {
    if (unlockBound || typeof window === "undefined" || !window.addEventListener) return;
    unlockBound = true;
    const events = ["pointerdown", "mousedown", "touchstart", "keydown"];
    const onGesture = () => {
      if (!ctx || disabled || ctx.state === "running") return;
      resuming = null; // askıda kalan istek yeni denemeyi engellemesin
      try {
        Promise.resolve(ctx.resume()).then(
          () => { resuming = null; if (ctx.state === "running" && !musicMuted) musicTick(); },
          () => { resuming = null; } // izin gelmediyse sonraki etkileşimde yeniden denenir
        );
      } catch (error) { disable(error); }
    };
    for (const event of events) window.addEventListener(event, onGesture, true);
  }

  // AudioContext'i tembel kur. Tarayıcı devam ettirmeyi reddederse istek
  // yakalanır; sonraki kullanıcı etkileşiminde yeniden denemek mümkündür.
  function ensure() {
    const allMuted = (muted || volume === 0) && (musicMuted || musicVolume === 0);
    if (allMuted || disabled) return null;
    // Tarayıcı dışı (ör. Node test vm) ortamda sessizce devre dışı kal
    if (typeof window === "undefined") return null;
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        // Master gain: SFX/oyun sesleri için ana kazanç
        master = ctx.createGain();
        master.gain.value = (muted || volume === 0) ? 0 : 0.42 * volume;
        master.connect(ctx.destination);
        gameplayBus = ctx.createGain(); gameplayBus.connect(master);
        uiBus = ctx.createGain(); uiBus.connect(master);

        // Music gain: müzik kanalı için bağımsız kazanç
        musicGain = ctx.createGain();
        musicGain.gain.value = (musicMuted || musicVolume === 0) ? 0 : MUSIC_MASTER_GAIN * musicVolume;
        musicGain.connect(ctx.destination);

        bindUnlock(); // jest sonrası devam ettirmeyi garantiye al
      }
      if ((ctx.state === "suspended" || ctx.state === "interrupted") && !resuming) {
        resuming = Promise.resolve(ctx.resume()).then(
          () => { resuming = null; },
          () => { resuming = null; } // autoplay izni sonraki etkileşimde gelebilir
        );
      }
      return ctx.state === "running" ? ctx : null;
    } catch (error) {
      disable(error);
      return null;
    }
  }

  // Procedural music avoids external files and remains compatible with file://.
  const musicSources = new Set();
  let musicTheme = null;
  let musicTimer = null;
  let musicStep = 0;
  let musicNextTime = 0;
  let guitarCurve = null;
  // Each theme has four eight-bar variations. Menu uses a clean G-major
  // arrangement; battle uses faster E-minor riffs, driven guitars and louder drums.
  const MUSIC_THEMES = {
    menu: {
      bpm: 88, leadType: "triangle", drive: false, leadGain: 0.075,
      bassGain: 0.085, chordGain: 0.022, drumGain: 0.25, hatEvery: 4,
      variations: [
        { riff: [392, null, 493.88, 587.33, null, 659.25, 587.33, null, 440, null, 493.88, 587.33, null, 493.88, 440, null], bass: [98, 73.42, 82.41, 65.41], chords: [[196, 293.66, 392], [146.83, 220, 293.66], [164.81, 246.94, 329.63], [130.81, 196, 261.63]] },
        { riff: [493.88, null, 587.33, 659.25, 587.33, null, 493.88, null, 392, null, 440, 493.88, null, 587.33, 493.88, null], bass: [98, 65.41, 73.42, 98], chords: [[196, 293.66, 392], [130.81, 196, 261.63], [146.83, 220, 293.66], [196, 293.66, 392]] },
        { riff: [329.63, null, 392, 493.88, null, 587.33, 493.88, null, 392, null, 493.88, 587.33, 659.25, null, 587.33, null], bass: [82.41, 65.41, 98, 73.42], chords: [[164.81, 246.94, 329.63], [130.81, 196, 261.63], [196, 293.66, 392], [146.83, 220, 293.66]] },
        { riff: [523.25, null, 587.33, 659.25, null, 587.33, 493.88, null, 440, null, 493.88, 587.33, null, 659.25, 587.33, null], bass: [65.41, 98, 73.42, 82.41], chords: [[130.81, 196, 261.63], [196, 293.66, 392], [146.83, 220, 293.66], [164.81, 246.94, 329.63]] },
      ],
    },
    battle: {
      bpm: 126, leadType: "sawtooth", drive: true, leadGain: 0.105,
      bassGain: 0.12, chordGain: 0.038, drumGain: 1, hatEvery: 2,
      variations: [
        { riff: [329.63, null, 392, 440, null, 493.88, 440, 392, 329.63, null, 392, 493.88, 587.33, null, 493.88, 440], bass: [82.41, 65.41, 98, 73.42], chords: [[164.81, 246.94, 329.63], [130.81, 196, 261.63], [196, 293.66, 392], [146.83, 220, 293.66]] },
        { riff: [493.88, null, 440, 392, 329.63, null, 392, 493.88, 440, null, 392, 329.63, 293.66, null, 329.63, 392], bass: [82.41, 73.42, 65.41, 73.42], chords: [[164.81, 246.94, 329.63], [146.83, 220, 293.66], [130.81, 196, 261.63], [146.83, 220, 293.66]] },
        { riff: [392, 440, 493.88, null, 587.33, 493.88, 440, null, 392, null, 329.63, 392, 440, null, 493.88, null], bass: [98, 73.42, 82.41, 65.41], chords: [[196, 293.66, 392], [146.83, 220, 293.66], [164.81, 246.94, 329.63], [130.81, 196, 261.63]] },
        { riff: [329.63, 392, null, 493.88, 587.33, null, 493.88, 392, 440, null, 493.88, 587.33, 659.25, 587.33, 493.88, null], bass: [65.41, 73.42, 82.41, 61.74], chords: [[130.81, 196, 261.63], [146.83, 220, 293.66], [164.81, 246.94, 329.63], [123.47, 185, 246.94]] },
      ],
    },
  };
  const variationBags = {
    menu: { order: [], cursor: 0, last: -1 },
    battle: { order: [], cursor: 0, last: -1 },
  };
  let musicVariation = -1;
  let musicArrangement = null;

  function nextMusicArrangement(theme) {
    const bag = variationBags[theme];
    if (bag.cursor >= bag.order.length) {
      bag.order = [0, 1, 2, 3];
      for (let i = bag.order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag.order[i], bag.order[j]] = [bag.order[j], bag.order[i]];
      }
      if (bag.order[0] === bag.last) [bag.order[0], bag.order[1]] = [bag.order[1], bag.order[0]];
      bag.cursor = 0;
    }
    musicVariation = bag.order[bag.cursor++];
    bag.last = musicVariation;
    return MUSIC_THEMES[theme].variations[musicVariation];
  }

  function playMusic(build) {
    if (musicMuted || musicVolume === 0 || !ensure()) return;
    try { build(); } catch (error) { disable(error); }
  }

  function guitarDrive() {
    if (typeof ctx.createWaveShaper !== "function") return null;
    const shaper = ctx.createWaveShaper();
    if (!guitarCurve) {
      guitarCurve = new Float32Array(256);
      const norm = Math.tanh(3.2);
      for (let i = 0; i < guitarCurve.length; i++) {
        const x = i * 2 / (guitarCurve.length - 1) - 1;
        guitarCurve[i] = Math.tanh(x * 3.2) / norm;
      }
    }
    shaper.curve = guitarCurve;
    shaper.oversample = "2x";
    return shaper;
  }

  // Müzik notası: tek seferlik zarflı ton; kaynak kaydı ortaktır.
  function musicNote(freq, time, opts) {
    if (freq == null) return;
    playMusic(() => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      const drive = opts.guitar ? guitarDrive() : null;
      const t0 = time;
      const dur = opts.dur;
      osc.type = opts.type || "sawtooth";
      osc.frequency.setValueAtTime(freq, t0);
      if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + dur * 0.72);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(opts.cutoff || 2600, t0);
      filter.Q.value = opts.Q || 0.7;
      g.gain.setValueAtTime(0.0001, t0);
      const attack = Math.max(0.003, Math.min(opts.attack || 0.01, dur * 0.25));
      g.gain.exponentialRampToValueAtTime(opts.gain, t0 + attack);
      if (opts.sustain) g.gain.exponentialRampToValueAtTime(opts.gain * opts.sustain, t0 + dur * 0.62);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      if (opts.guitar) {
        // A short filtered pick transient gives the driven saw wave a plucked
        // string attack without adding a second oscillator to every note.
        musicPick(t0, Math.min(0.018, dur * 0.12), opts.gain * 0.12);
        filter.frequency.setValueAtTime(Math.min(5200, (opts.cutoff || 2600) * 1.35), t0);
        filter.frequency.exponentialRampToValueAtTime(opts.cutoff || 2600, t0 + Math.min(0.045, dur * 0.28));
      }
      if (drive) osc.connect(drive).connect(filter);
      else osc.connect(filter);
      filter.connect(g).connect(musicGain || master);
      track(osc, drive ? [osc, drive, filter, g] : [osc, filter, g]);
      musicVoiceGains.set(osc, g);
      musicSources.add(osc);
      const cleanup = sources.get(osc);
      osc.onended = () => {
        musicSources.delete(osc);
        if (cleanup) cleanup();
      };
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    });
  }

  function musicPick(time, dur, gain) {
    playMusic(() => {
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      src.buffer = noiseBuffer();
      src.audioRole = "guitar-pick";
      filter.type = "highpass";
      filter.frequency.setValueAtTime(2800, time);
      filter.Q.value = 0.65;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(gain, time + Math.min(0.003, dur * 0.25));
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      src.connect(filter).connect(g).connect(musicGain || master);
      track(src, [src, filter, g]);
      musicVoiceGains.set(src, g);
      musicSources.add(src);
      const cleanup = sources.get(src);
      src.onended = () => {
        musicSources.delete(src);
        if (cleanup) cleanup();
      };
      src.start(time);
      src.stop(time + dur + 0.01);
    });
  }

  // Filtrelenmiş hava/metal dokusu: ölçü başında kısa, düşük seviyeli bir katman.
  function musicNoise(time, opts) {
    playMusic(() => {
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      const dur = opts.dur;
      src.buffer = noiseBuffer();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(opts.freq, time);
      filter.Q.value = opts.Q || 0.55;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(opts.gain, time + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      src.connect(filter).connect(g).connect(musicGain || master);
      track(src, [src, filter, g]);
      musicVoiceGains.set(src, g);
      musicSources.add(src);
      const cleanup = sources.get(src);
      src.onended = () => {
        musicSources.delete(src);
        if (cleanup) cleanup();
      };
      src.start(time);
      src.stop(time + dur + 0.03);
    });
  }

  function musicKick(time, gain) {
    musicNote(118, time, { type: "sine", freqEnd: 43, gain, dur: 0.17, attack: 0.004, cutoff: 180 });
  }

  // Lookahead scheduler: each phrase combines melody, bass, power chords and drums.
  function musicTick() {
    if (musicMuted || musicVolume === 0 || disabled || !ensure()) return;
    const spec = MUSIC_THEMES[musicTheme];
    if (!spec) return;
    const now = ctx.currentTime;
    if (!(musicNextTime > now - 0.001)) musicNextTime = now + 0.06; // bayat kayıt → güncelle
    const stepDur = 60 / spec.bpm / 2;
    while (musicNextTime < now + 0.5) {
      const t = musicNextTime;
      const phraseStep = musicStep % 64;
      if (!musicArrangement || phraseStep === 0) musicArrangement = nextMusicArrangement(musicTheme);
      const step = phraseStep % 32;
      const variation = phraseStep >= 32;
      const beat = step % 8;
      const bar = Math.floor(step / 8);
      const melody = musicArrangement.riff[step % 16];
      if (melody != null) {
        const guitar = spec.drive;
        musicNote(melody, t, { guitar, type: spec.leadType, gain: spec.leadGain, dur: stepDur * 0.9, attack: 0.006, sustain: 0.28, cutoff: guitar ? 3000 : 1900 });
        if (variation && (beat === 2 || beat === 6)) musicNote(melody * 1.5, t, { guitar, type: spec.leadType, gain: spec.leadGain * 0.34, dur: stepDur * 0.75, attack: 0.006, sustain: 0.22, cutoff: guitar ? 3600 : 2200 });
        if (spec.drive && beat === 0) musicNote(melody * 1.003, t, { guitar: true, gain: 0.035, dur: stepDur * 0.85, attack: 0.006, sustain: 0.25, cutoff: 3200 });
      }
      const root = musicArrangement.bass[bar];
      if (beat === 0 || (spec.drive && beat === 4)) {
        musicNote(beat === 4 ? root * 1.5 : root, t, { type: "triangle", gain: spec.bassGain, dur: stepDur * 2.8, sustain: 0.72, cutoff: 520 });
      }
      if (beat === 0 || (spec.drive && beat === 4)) {
        for (const note of musicArrangement.chords[bar]) {
          musicNote(note, t, { guitar: spec.drive, type: spec.drive ? "sawtooth" : "triangle", gain: spec.chordGain, dur: stepDur * (beat === 0 ? 1.8 : 1.1), attack: 0.004, sustain: 0.35, cutoff: spec.drive ? 2400 : 1450 });
        }
      }
      if (beat === 0 || (spec.drive && beat === 4)) musicKick(t, 0.16 * spec.drumGain);
      if (beat === 2 || beat === 6) musicNoise(t, { freq: 1850, gain: 0.075 * spec.drumGain, dur: 0.12, Q: 0.7 });
      if (step % spec.hatEvery === 0) musicNoise(t, { freq: spec.drive ? 6200 : 4800, gain: 0.023 * spec.drumGain, dur: 0.035, Q: 0.35 });
      if (variation && bar === 3 && beat === 7) musicNoise(t, { freq: 2400, gain: 0.1 * spec.drumGain, dur: 0.16, Q: 0.8 });
      if (step % 2 === 0) musicNoise(t, { freq: 6200, gain: 0.023 * spec.drumGain, dur: 0.035, Q: 0.35 });
      musicStep++;
      musicNextTime += stepDur;
    }
  }

  function stopMusic(clearTheme = true) {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    const now = ctx ? ctx.currentTime : 0;
    for (const osc of musicSources) {
      const voiceGain = musicVoiceGains.get(osc);
      try {
        if (voiceGain && ctx) {
          voiceGain.gain.setValueAtTime(Math.max(0.0001, voiceGain.gain.value || 0.0001), now);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
          osc.stop(now + 0.04);
        } else osc.stop();
      } catch (e) { /* zaten bitmiş olabilir */ }
    }
    musicSources.clear();
    if (clearTheme) { musicTheme = null; musicVariation = -1; musicArrangement = null; }
    musicNextTime = 0;
  }

  function startMusic(theme) {
    stopMusic(true);
    musicTheme = theme;
    startProceduralMusic(theme);
  }

  function startProceduralMusic(theme) {
    musicTheme = theme;
    musicStep = 0;
    musicNextTime = 0; // ilk tick'te güncel zamana oturur
    musicTimer = setInterval(musicTick, 120);
    musicTick();
  }

  function play(build, opts = {}) {
    if (muted || volume === 0 || disabled) return;
    if (!ensure()) return;
    const priority = opts.priority || PRIORITY.FEEDBACK;
    const activeSfx = countSfx();
    // Rezerv: kritik olaylar son 4 yuvayı da kullanabilir; düşük öncelikli
    // akış 36'da durur ki kalabalık anda isabet/ölüm sesi yeri bulsun.
    if (priority < PRIORITY.CRITICAL && activeSfx >= SFX_BUDGET - CRITICAL_RESERVE) return;
    try { build(priority); } catch (error) { disable(error); }
    trimBudget(priority);
  }

  const eventTimes = new Map();
  function eventAllowed(key, interval) {
    const now = ctx ? ctx.currentTime : 0;
    const previous = eventTimes.get(key);
    if (previous != null && now - previous < interval) return false;
    eventTimes.set(key, now);
    return true;
  }

  function outputFor(opts) {
    if (opts && opts.bus === "ui" && uiBus) return uiBus;
    if (gameplayBus) return gameplayBus;
    return master;
  }

  // Tek seferlik gürültü (noise) tamponu — patlama/whoosh için
  function noiseBuffer() {
    if (!noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 1.2);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  // ── Düşük seviyeli yapı taşları ────────────────────────────────────────────

  // Zarflanmış osilatör tonu (gerekirse frekans kayması ile).
  function tone(opts) {
    play((priority) => {
      const now = ctx.currentTime;
      const t0 = now + (opts.delay || 0);
      const shape = opts.variant || null;
      const dur = (opts.dur != null ? opts.dur : 0.18) * (shape ? shape.dur : 1);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = opts.type || "sine";
      osc.frequency.setValueAtTime(opts.freq * (shape ? shape.freq : 1), t0);
      if (opts.freqEnd != null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd * (shape ? shape.freq : 1)), t0 + dur);
      }
      const peak = opts.gain != null ? opts.gain : 0.3;
      const atk = (opts.attack != null ? opts.attack : 0.006) * (shape ? shape.attack : 1);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      // Merkez (pan 0) panner kurmaz: mono/merkez varsayılanı ek düğüm istemez.
      const panner = opts.pan != null && opts.pan !== 0 && ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (panner) { panner.pan.value = Math.max(-1, Math.min(1, opts.pan)); g.connect(panner).connect(outputFor(opts)); }
      else g.connect(outputFor(opts));
      osc.connect(g);
      osc.effectVariation = opts.variationIndex;
      osc.audioRole = opts.audioRole;
      track(osc, panner ? [osc, g, panner] : [osc, g]); voiceMeta.set(osc, { priority });
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }, opts);
  }

  // Zarflanmış + filtrelenmiş gürültü patlaması.
  function noise(opts) {
    play((priority) => {
      const now = ctx.currentTime;
      const t0 = now + (opts.delay || 0);
      const shape = opts.variant || null;
      const cutoff = shape ? shape.cutoff : 1;
      const dur = (opts.dur != null ? opts.dur : 0.25) * (shape ? shape.dur : 1);
      const attack = Math.min((opts.attack != null ? opts.attack : 0.004) * (shape ? shape.attack : 1), dur * 0.35);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer();
      const filt = ctx.createBiquadFilter();
      filt.type = opts.filter || "lowpass";
      filt.frequency.setValueAtTime((opts.freq != null ? opts.freq : 1000) * cutoff, t0);
      if (opts.freqEnd != null) {
        filt.frequency.exponentialRampToValueAtTime(Math.max(40, opts.freqEnd * cutoff), t0 + dur);
      }
      if (opts.Q != null) filt.Q.value = opts.Q * (shape ? shape.q : 1);
      const g = ctx.createGain();
      const peak = opts.gain != null ? opts.gain : 0.3;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      const panner = opts.pan != null && opts.pan !== 0 && ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (panner) { panner.pan.value = Math.max(-1, Math.min(1, opts.pan)); g.connect(panner).connect(outputFor(opts)); }
      else g.connect(outputFor(opts));
      src.connect(filt).connect(g);
      src.effectVariation = opts.variationIndex;
      src.audioRole = opts.audioRole;
      track(src, panner ? [src, filt, g, panner] : [src, filt, g]); voiceMeta.set(src, { priority });
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    }, opts);
  }

  function addShotTexture(v, family, heavy) {
    const profile = SFX_TEXTURES[family] || SFX_TEXTURES.standard;
    noise({ ...v, audioRole: "shot-attack", filter: "highpass", freq: profile.attackHz,
      freqEnd: profile.attackHz * 0.62, dur: 0.024, gain: 0.035, attack: 0.001 });
    tone({ ...v, audioRole: "shot-body", type: "sine", freq: profile.bodyHz - heavy * 22,
      freqEnd: Math.max(38, profile.bodyHz * 0.62), dur: 0.095 + heavy * 0.035,
      gain: 0.045, attack: 0.003 });
    noise({ ...v, audioRole: "shot-tail", filter: "bandpass", freq: profile.tailHz,
      freqEnd: profile.tailHz * 0.55, delay: 0.022, dur: 0.075, gain: 0.025, Q: 0.65 });
  }

  function addExplosionTexture(v, family, big, dur) {
    const profile = SFX_TEXTURES[family] || SFX_TEXTURES.standard;
    noise({ ...v, audioRole: "explosion-attack", filter: "highpass", freq: profile.attackHz,
      freqEnd: profile.attackHz * 0.48, dur: 0.035, gain: 0.045, attack: 0.002 });
    tone({ ...v, audioRole: "explosion-body", type: "sine", freq: profile.bodyHz - big * 24,
      freqEnd: 36, dur: dur * 0.58, gain: 0.055, attack: 0.006 });
    noise({ ...v, audioRole: "explosion-tail", filter: family === "fire" ? "bandpass" : "lowpass",
      freq: family === "fire" ? profile.tailHz : 210 + big * 90,
      freqEnd: family === "fire" ? profile.tailHz * 1.5 : 52, delay: 0.045,
      dur: dur * 0.42, gain: 0.035, Q: 0.7 });
  }

  // ── Yüksek seviyeli efektler ───────────────────────────────────────────────

  return {
    // Silah ateşi: kısa namlu "pat"ı + hava itişi. Ağır silahlar (büyük yarıçap)
    // daha pesten/uzun çalar; hızlı silahlar daha tiz/keskin. `spatial` verilirse
    // (ateş eden robotun namlu x'i) ses sahnenin o tarafından duyulur.
    shoot(spec, spatial) {
      const data = spec && typeof spec === "object" ? spec : {};
      const radius = data.radius || 40;
      const heavy = Math.max(0, Math.min(1, (radius - 30) / 70)); // 0 hafif → 1 ağır
      const id = data.id || (typeof spec === "string" ? spec : "");
      const family = data.teleport || data.hook || id === "teleportball" || id === "hook" ? "teleport"
        : data.drill || id === "drill" ? "drill"
        : data.directHitDamage || id === "sniper" ? "sniper"
        : data.pellets && !(data.look && data.look.tail === "flame") ? "pellet"
        : data.bounce || data.sticky || data.mine || data.cluster || data.fuse || ["grenade", "grenadetrio", "sticky", "rubber", "rubbertrio", "mine"].includes(id) ? "bounce"
        : "standard";
      const v = voice("shoot:" + family, PRIORITY.ACTION, spatial);
      if (data.teleport || data.hook || id === "teleportball" || id === "hook") {
        tone({ ...v, type: "sine", freq: 340, freqEnd: 900, dur: 0.12, gain: 0.14, attack: 0.002 });
        noise({ ...v, filter: "highpass", freq: 2600, freqEnd: 1400, dur: 0.08, gain: 0.07 });
      } else if (data.drill || id === "drill") {
        noise({ ...v, filter: "bandpass", freq: 850, freqEnd: 2100, dur: 0.16, gain: 0.15, Q: 1.8 });
        tone({ ...v, type: "sawtooth", freq: 130, freqEnd: 260, dur: 0.13, gain: 0.1 });
      } else if (data.directHitDamage || id === "sniper") {
        noise({ ...v, filter: "highpass", freq: 3200, freqEnd: 1200, dur: 0.075, gain: 0.21 });
        tone({ ...v, type: "sine", freq: 780, freqEnd: 170, dur: 0.11, gain: 0.12, attack: 0.001 });
      } else if (data.pellets && !(data.look && data.look.tail === "flame")) {
        noise({ ...v, filter: "highpass", freq: 2500, freqEnd: 700, dur: 0.12, gain: 0.2 });
        tone({ ...v, type: "square", freq: 190, freqEnd: 65, dur: 0.13, gain: 0.2, attack: 0.001 });
      } else if (data.bounce || data.sticky || data.mine || data.cluster || data.fuse || ["grenade", "grenadetrio", "sticky", "rubber", "rubbertrio", "mine"].includes(id)) {
        tone({ ...v, type: "triangle", freq: 165, freqEnd: 82, dur: 0.17, gain: 0.22, attack: 0.002 });
        noise({ ...v, filter: "lowpass", freq: 520, freqEnd: 180, dur: 0.09, gain: 0.12 });
      } else {
        tone({ ...v, type: "sawtooth", freq: 250 - heavy * 100, freqEnd: 68 - heavy * 24,
               dur: 0.13 + heavy * 0.08, gain: 0.19, attack: 0.003 });
        noise({ ...v, filter: "highpass", freq: 1500 - heavy * 700, freqEnd: 400, dur: 0.1 + heavy * 0.05, gain: 0.12 });
      }
      addShotTexture(v, family, heavy);
    },

    // Patlama: pes "boom" (gürültü + alçalan ton). Yarıçap büyüdükçe daha derin/uzun.
    explosion(radius, spec, spatial) {
      const r = radius || 40;
      const big = Math.max(0, Math.min(1, (r - 30) / 90));
      const dur = 0.3 + big * 0.45;
      const id = spec && spec.id;
      const isFire = !!(spec && (spec.napalm || spec.look && spec.look.tail === "flame") || id === "napalm" || id === "fireball");
      const isMetal = !!(spec && (spec.drill || spec.directHitDamage) || id === "drill" || id === "sniper");
      const isCluster = !!(spec && spec.cluster);
      const family = isFire ? "fire" : isMetal ? "metal" : isCluster ? "cluster" : "standard";
      const v = voice("explosion:" + family, PRIORITY.ACTION, spatial);
      noise({ ...v, filter: isFire ? "bandpass" : isMetal ? "highpass" : "lowpass",
        freq: isFire ? 1000 : isMetal ? 2400 : 620 + big * 420,
        freqEnd: isFire ? 2300 : isMetal ? 700 : 60, dur: isFire ? dur * 0.72 : dur,
        gain: isFire ? 0.16 : isMetal ? 0.14 : 0.25, Q: isFire ? 0.8 : 1 });
      tone({ ...v, type: isMetal ? "triangle" : "sine", freq: (isMetal ? 210 : 138) - big * (isMetal ? 70 : 72), freqEnd: isMetal ? 68 : 34,
        dur: dur * (isFire ? 0.7 : 0.9), gain: isFire ? 0.13 : 0.19, attack: 0.004 });
      if (big > 0.35 || isCluster) noise({ ...v, filter: "lowpass", freq: isCluster ? 300 : 180, freqEnd: 48,
        delay: 0.035, dur: dur * (isCluster ? 0.55 : 0.8), gain: isCluster ? 0.08 : 0.1 });
      addExplosionTexture(v, family, big, dur);
    },

    // Zıplama: kısa yukarı kayan "boing".
    jump() {
      tone({ ...voice("jump", PRIORITY.FEEDBACK), type: "sine", freq: 260, freqEnd: 540, dur: 0.16, gain: 0.22, attack: 0.004 });
    },

    // Işınlanma: hızla yükselen iki tonlu "zap" + hışırtı
    teleport() {
      const v = voice("teleport", PRIORITY.ACTION);
      tone({ ...v, type: "sine", freq: 220, freqEnd: 880, dur: 0.18, gain: 0.2, attack: 0.003 });
      tone({ ...v, type: "triangle", freq: 660, freqEnd: 1320, dur: 0.14, gain: 0.12, delay: 0.06 });
      noise({ ...v, filter: "highpass", freq: 2200, dur: 0.12, gain: 0.1 });
    },

    // Kanca: fırlatma "tık"ı + metalik tutunma çınlaması
    hook() {
      const v = voice("hook", PRIORITY.ACTION);
      tone({ ...v, type: "square", freq: 520, freqEnd: 180, dur: 0.1, gain: 0.16 });
      noise({ ...v, filter: "highpass", freq: 1500, dur: 0.08, gain: 0.12 });
      tone({ ...v, type: "triangle", freq: 1180, freqEnd: 900, dur: 0.14, gain: 0.14, delay: 0.06 });
    },

    // Karakter yeteneği — türüne göre ayrı karakter.
    skill(kind, id) {
      const v = voice("skill:" + kind, PRIORITY.ACTION);
      const identity = String(id || kind);
      let signature = 0;
      for (let i = 0; i < identity.length; i++) signature = (signature * 31 + identity.charCodeAt(i)) % 13;
      const shift = (signature - 6) * 9;
      const skillTone = (opts) => tone({ ...v, ...opts, freq: opts.freq + shift,
        ...(opts.freqEnd == null ? {} : { freqEnd: opts.freqEnd + shift }) });
      switch (kind) {
        case "heal":
          skillTone({ type: "sine", freq: 523, dur: 0.16, gain: 0.14 });
          skillTone({ type: "triangle", freq: 659, dur: 0.16, gain: 0.13, delay: 0.08 });
          skillTone({ type: "sine", freq: 784, dur: 0.22, gain: 0.14, delay: 0.16 });
          break;
        case "shield":
        case "damageReduce":
          skillTone({ type: "triangle", freq: 220, freqEnd: 880, dur: 0.32, gain: 0.16 });
          skillTone({ type: "sine", freq: 1320, dur: 0.18, gain: 0.07, delay: 0.06 });
          break;
        case "nextShot":
          skillTone({ type: "sawtooth", freq: 110, freqEnd: 440, dur: 0.25, gain: 0.14 });
          noise({ ...v, filter: "bandpass", freq: 450, freqEnd: 1300, dur: 0.16, gain: 0.08, delay: 0.08, Q: 2 });
          break;
        case "jump":
        case "glide":
          skillTone({ type: "sine", freq: 180, freqEnd: 620, dur: 0.22, gain: 0.16 });
          noise({ ...v, filter: "highpass", freq: 1800, freqEnd: 600, dur: 0.13, gain: 0.08 });
          break;
        case "dash":
          noise({ ...v, filter: "bandpass", freq: 350, freqEnd: 2400, dur: 0.2, gain: 0.18, Q: 1.5 });
          break;
        case "dig":
          noise({ ...v, filter: "lowpass", freq: 900, freqEnd: 100, dur: 0.32, gain: 0.21 });
          skillTone({ type: "sawtooth", freq: 72, freqEnd: 48, dur: 0.28, gain: 0.12 });
          break;
        case "melee":
          noise({ ...v, filter: "highpass", freq: 1900, freqEnd: 800, dur: 0.07, gain: 0.16 });
          skillTone({ type: "square", freq: 135, freqEnd: 48, dur: 0.16, gain: 0.19 });
          break;
        case "radial":
        case "quake":
          skillTone({ type: "sine", freq: 92, freqEnd: 36, dur: 0.42, gain: 0.2 });
          noise({ ...v, filter: "lowpass", freq: 520, freqEnd: 72, dur: 0.35, gain: 0.16 });
          break;
        default: // spit vb. ateş sesiyle zaten çalıyor; yine de hafif bir vurgu
          skillTone({ type: "triangle", freq: 390, freqEnd: 650, dur: 0.14, gain: 0.12 });
      }
    },

    // İsabet/hasar — kısa "thwack". Kritik bilgi: her zaman merkezde çalar.
    hit() {
      if (!eventAllowed("hit", 0.045)) return;
      const v = voice("hit", PRIORITY.CRITICAL);
      tone({ ...v, type: "square", freq: 180, freqEnd: 60, dur: 0.09, gain: 0.18, attack: 0.002 });
      noise({ ...v, filter: "bandpass", freq: 1400, dur: 0.05, gain: 0.14, Q: 1 });
    },

    // Vuruş teyidi (Hitmarker / tactile hit chime)
    hitConfirm(isCrit) {
      if (!eventAllowed("hitConfirm", 0.035)) return;
      const v = voice("hit", PRIORITY.CRITICAL);
      if (isCrit) {
        tone({ ...v, type: "triangle", freq: 1760, freqEnd: 2200, dur: 0.08, gain: 0.18, attack: 0.001 });
        tone({ ...v, type: "sine", freq: 880, dur: 0.1, gain: 0.14, delay: 0.02 });
      } else {
        tone({ ...v, type: "triangle", freq: 1100, freqEnd: 1320, dur: 0.06, gain: 0.15, attack: 0.001 });
      }
    },

    // Zırh / kalkan engelleme sesi — metalik sekme "ping" sesi
    armorDeflect() {
      if (!eventAllowed("armorDeflect", 0.05)) return;
      const v = voice("deflect", PRIORITY.ACTION);
      tone({ ...v, type: "sine", freq: 1480, freqEnd: 880, dur: 0.11, gain: 0.16, attack: 0.002 });
      noise({ ...v, filter: "highpass", freq: 2800, dur: 0.04, gain: 0.11, Q: 2 });
    },

    // Bir oyuncu elendi — alçalan üzgün motif.
    eliminate() {
      const v = voice("eliminate", PRIORITY.CRITICAL);
      tone({ ...v, type: "sawtooth", freq: 440, freqEnd: 110, dur: 0.5, gain: 0.22 });
      tone({ ...v, type: "sine", freq: 220, freqEnd: 70, dur: 0.5, gain: 0.16, delay: 0.05 });
    },

    // Silah değiştir — minik tık.
    weaponSwitch() {
      tone({ ...voice("weapon-switch", PRIORITY.FEEDBACK), type: "square", freq: 660, dur: 0.05, gain: 0.1, attack: 0.002 });
    },

    // Menü tıklaması.
    uiClick() {
      if (!eventAllowed("ui-click", 0.035)) return;
      tone({ ...voice("ui-click", PRIORITY.UI), type: "triangle", freq: 880, freqEnd: 1100, dur: 0.06, gain: 0.13, attack: 0.002, bus: "ui" });
    },

    // Parça montajı — metal klik + kısa yay "tık-klik"i. Silah değiştirme
    // tıkından ayrıdır: takma/sökme eyleminin duyulur imzası olsun.
    partMount() {
      const v = voice("part-mount", PRIORITY.FEEDBACK);
      tone({ ...v, type: "square", freq: 520, dur: 0.04, gain: 0.11, attack: 0.002 });
      tone({ ...v, type: "square", freq: 300, freqEnd: 240, dur: 0.07, gain: 0.12, attack: 0.002, delay: 0.045 });
      tone({ ...v, type: "triangle", freq: 1200, freqEnd: 1500, dur: 0.05, gain: 0.06, attack: 0.003, delay: 0.055 });
    },

    // Durum → müzik teması eşlemesi. Her kare render'dan çağrılır; tema
    // değişmemişse ucuz no-op. GAMEOVER arka plan temasını keser.
    musicSync(state, mode) {
      let target = "menu"; // menüler, zorluk/oyuncu seçimi, atölye
      if (state === "AIMING" || state === "PROJECTILE" || state === "SETTLE") target = "battle";
      else if (state === "GAMEOVER") target = null;
      if (target !== musicTheme) {
        if (target) {
          if (!musicMuted && musicVolume > 0) startMusic(target);
          else {
            musicTheme = target;
            stopMusic(false);
          }
        } else {
          stopMusic(true);
        }
      } else if (target && !musicMuted && musicVolume > 0 && !musicTimer) {
        startMusic(target);
      }
    },

    // Test/teşhis: aktif tema + scheduler durumunu bildirir.
    musicInfo() {
      const spec = MUSIC_THEMES[musicTheme];
      return {
        theme: musicTheme,
        running: musicTimer != null,
        scheduled: musicSources.size,
        variation: musicVariation,
        variationCount: spec ? spec.variations.length : 0,
        bpm: spec ? spec.bpm : null,
      };
    },

    // Sıra yeni oyuncuya geçti — iki nota yükselen kısa jingle.
    turn() {
      const v = voice("turn", PRIORITY.CRITICAL);
      tone({ ...v, type: "triangle", freq: 523, dur: 0.1, gain: 0.14 });
      tone({ ...v, type: "triangle", freq: 784, dur: 0.14, gain: 0.16, delay: 0.09 });
    },

    // Geri sayım son 5 saniye tıkı. urgent ise daha tiz ve keskin.
    timerTick(urgent) {
      const v = voice(urgent ? "timer-urgent" : "timer", urgent ? PRIORITY.CRITICAL : PRIORITY.FEEDBACK);
      if (urgent) {
        tone({ ...v, type: "square", freq: 880, dur: 0.04, gain: 0.12, attack: 0.002 });
      } else {
        tone({ ...v, type: "sine", freq: 580, dur: 0.035, gain: 0.08, attack: 0.002 });
      }
    },

    // İkmal sandığı alma sesi — yükselen parlak arpej.
    pickup() {
      const v = voice("pickup", PRIORITY.ACTION);
      tone({ ...v, type: "sine", freq: 587, dur: 0.09, gain: 0.14 });
      tone({ ...v, type: "sine", freq: 880, dur: 0.12, gain: 0.16, delay: 0.06 });
      tone({ ...v, type: "triangle", freq: 1174, dur: 0.16, gain: 0.14, delay: 0.12 });
    },

    // Ani ölüm alarm sireni.
    alarm() {
      const v = voice("alarm", PRIORITY.CRITICAL);
      tone({ ...v, type: "sawtooth", freq: 360, freqEnd: 220, dur: 0.32, gain: 0.22 });
      tone({ ...v, type: "sawtooth", freq: 360, freqEnd: 220, dur: 0.32, gain: 0.22, delay: 0.36 });
    },

    // Rüzgâr değişimi: filtrelenmiş hava uğultusu yeni şiddetle büyür. Sağa dönüş
    // yükselen, sola dönüş alçalan tonla kodlanır; ekran görülmeden de yön anlaşılır.
    windChange(previous, next) {
      const value = Number.isFinite(next) ? next : 0;
      const strength = Math.min(1, Math.abs(value) / 4);
      const right = value >= 0;
      const base = 380 + strength * 320;
      const v = voice("wind", PRIORITY.FEEDBACK);
      noise({ ...v, filter: "bandpass", freq: 520 + strength * 900,
              freqEnd: 1500 + strength * 1800, dur: 0.34 + strength * 0.24,
              gain: 0.13 + strength * 0.13, Q: 0.7 });
      tone({ ...v, type: "sine", freq: right ? base : base * 1.55,
             freqEnd: right ? base * 1.55 : base, dur: 0.28 + strength * 0.12,
             gain: 0.1 + strength * 0.06, attack: 0.015 });

      // Yön tersine döndüyse ikinci kısa uyarı notası değişimi özellikle vurgular.
      if (Number.isFinite(previous) && previous * value < 0) {
        tone({ ...v, type: "triangle", freq: right ? 620 : 930,
               freqEnd: right ? 930 : 620, dur: 0.2, gain: 0.12, delay: 0.16 });
      }
    },

    // Compact arena-rock result stings are scheduled on the independent music bus.
    playResult(result) {
      stopMusic(true);
      if (musicMuted || musicVolume === 0 || !ensure()) return;
      const time = ctx.currentTime + 0.04;
      if (result === "win") {
        [329.63, 392, 493.88, 659.25].forEach((freq, i) =>
          musicNote(freq, time + i * 0.1, { guitar: true, gain: 0.11, dur: 0.28, attack: 0.004, sustain: 0.5, cutoff: 3400 }));
        [196, 246.94, 293.66, 392].forEach(freq =>
          musicNote(freq, time + 0.48, { guitar: true, gain: 0.055, dur: 0.75, attack: 0.008, sustain: 0.7, cutoff: 2400 }));
      } else if (result === "loss") {
        [493.88, 392, 329.63, 246.94].forEach((freq, i) =>
          musicNote(freq, time + i * 0.12, { guitar: true, gain: 0.09, dur: 0.3, attack: 0.006, sustain: 0.35, cutoff: 2500 }));
        [82.41, 123.47, 164.81].forEach(freq =>
          musicNote(freq, time + 0.42, { type: "triangle", gain: 0.05, dur: 0.62, sustain: 0.7, cutoff: 700 }));
      } else {
        [164.81, 220, 246.94].forEach(freq =>
          musicNote(freq, time, { type: "triangle", gain: 0.055, dur: 0.65, sustain: 0.7, cutoff: 1100 }));
      }
    },

    // Zafer — neşeli arpej.
    win() {
      const v = voice("win", PRIORITY.CRITICAL);
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) =>
        tone({ ...v, type: "square", freq: f, dur: 0.22, gain: 0.18, delay: i * 0.12 }));
      tone({ ...v, type: "triangle", freq: 1568, dur: 0.4, gain: 0.16, delay: 0.48 });
    },

    // Yenilgi — kısa, alçalan mekanik kapanış.
    lose() {
      const v = voice("lose", PRIORITY.CRITICAL);
      tone({ ...v, type: "triangle", freq: 330, freqEnd: 196, dur: 0.32, gain: 0.14 });
      tone({ ...v, type: "sine", freq: 82, freqEnd: 42, dur: 0.48, gain: 0.18, delay: 0.08 });
      noise({ ...v, filter: "lowpass", freq: 420, freqEnd: 90, dur: 0.35, gain: 0.09, delay: 0.1 });
    },

    // Beraberlik — iki kısa, çözümsüz metalik nota.
    draw() {
      const v = voice("draw", PRIORITY.CRITICAL);
      tone({ ...v, type: "triangle", freq: 294, dur: 0.2, gain: 0.12 });
      tone({ ...v, type: "triangle", freq: 311, dur: 0.28, gain: 0.1, delay: 0.22 });
      tone({ ...v, type: "sine", freq: 78, dur: 0.3, gain: 0.1, delay: 0.22 });
    },

    // ── Teşhis/sonda ─────────────────────────────────────────────────────
    // Pan derinliği kararı: mono çıkış 0 (merkez), mobil 0.55, stereo 1.
    spatialInfo,

    // Sıfır/`null` → otomatik karar; sayı → pan derinliğini sabitle (0 = mono).
    setSpatialDepth(depth) {
      if (depth == null) spatialDepthOverride = null;
      else if (Number.isFinite(depth)) spatialDepthOverride = Math.max(0, Math.min(1, depth));
      return spatialInfo().depth;
    },

    // Tohumun ürettiği tını çarpanları (test/sonda: aynı tohum → aynı sonuç).
    variantInfo(seed) {
      return variantOf(Number.isFinite(seed) ? seed : 0);
    },

    // Ses grafiği ve canlı ses sayacı (sonda ölçümü; oyun kodu kullanmaz).
    graph() {
      const priorities = { critical: 0, action: 0, feedback: 0, ui: 0 };
      for (const source of sources.keys()) {
        if (musicSources.has(source)) continue;
        const value = (voiceMeta.get(source) || {}).priority || PRIORITY.UI;
        if (value >= PRIORITY.CRITICAL) priorities.critical++;
        else if (value === PRIORITY.ACTION) priorities.action++;
        else if (value === PRIORITY.FEEDBACK) priorities.feedback++;
        else priorities.ui++;
      }
      return { context: ctx, master, gameplayBus, uiBus, musicGain,
        active: countSfx(), music: musicSources.size, priorities, spatial: spatialInfo() };
    },

    isMuted() { return muted || volume === 0; },
    getVolume() { return volume; },

    setVolume(value) {
      if (typeof value !== "number" || !Number.isFinite(value)) return volume;
      volume = Math.max(0, Math.min(1, value));
      muted = volume === 0;
      if (volume > 0) lastAudibleVolume = volume;
      savePreferences();
      applyVolume();
      return volume;
    },

    // Oyun sesini aç/kapat — yeni durumu (muted) döndürür.
    toggleMute() {
      if (volume === 0) {
        volume = lastAudibleVolume;
        muted = false;
      } else muted = !muted;
      savePreferences();
      applyVolume();
      return muted;
    },

    // ── Müzik ayarları ──────────────────────────────────────────────────
    isMusicMuted() { return musicMuted || musicVolume === 0; },
    getMusicVolume() { return musicVolume; },

    setMusicVolume(value) {
      if (typeof value !== "number" || !Number.isFinite(value)) return musicVolume;
      musicVolume = Math.max(0, Math.min(1, value));
      musicMuted = musicVolume === 0;
      if (musicVolume > 0) lastAudibleMusicVolume = musicVolume;
      savePreferences();
      applyVolume();
      return musicVolume;
    },

    toggleMusicMute() {
      if (musicVolume === 0) {
        musicVolume = lastAudibleMusicVolume || 0.58;
        musicMuted = false;
      } else {
        musicMuted = !musicMuted;
      }
      savePreferences();
      applyVolume();
      return musicMuted;
    },

    setMusicMuted(val) {
      musicMuted = !!val;
      savePreferences();
      applyVolume();
      return musicMuted;
    },

    getSfxVolume() { return volume; },
    setSfxVolume(v) { return this.setVolume(v); },
    isSfxMuted() { return this.isMuted(); },
    toggleSfxMute() { return this.toggleMute(); },
  };
})();

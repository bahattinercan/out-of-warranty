/* Ses efektleri — Web Audio API ile prosedürel sentez.
 *
 * Neden dosyasız? Oyun `file://` üzerinden çift tıklayınca çalışıyor; harici ses
 * dosyalarını fetch/decode etmek tarayıcıların file:// CORS kısıtları yüzünden
 * çoğu zaman patlar. Onun yerine her efekti AudioContext ile anlık sentezliyoruz —
 * sıfır bağımlılık, sıfır indirme, anında çalar.
 *
 * Tarayıcılar otomatik ses çalmayı engeller: AudioContext ancak bir kullanıcı
 * jesti (tık/tuş) sonrası "running" olur. ensure() bekleyen tek bir resume()
 * isteği tutar; bağlam hazır değilken eski efektleri kuyruğa biriktirmez.
 *
 * Genel API (global `SFX`):
 *   SFX.shoot(spec)      — silah ateşi (spec'e göre tını)
 *   SFX.explosion(radius)— patlama (yarıçapa göre boyut/derinlik)
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
 *   SFX.win()/lose()/draw() — maç sonucu jingle'ı
 *   SFX.musicSync(state) — duruma göre arka plan müziğini aç/kapat/tema değiştir
 *   SFX.musicInfo()      — aktif müzik teması ve çalan nota sayısı (tanı/test)
 *   SFX.toggleMute()     — oyun sesini aç/kapat (durumu döndürür)
 *   SFX.setVolume(0..1)  — oyun ses seviyesini ayarla ve kaydet
 *   SFX.getVolume()      — seçili oyun ses seviyesi (sessizde de korunur)
 *   SFX.toggleMusicMute()— müziği aç/kapat (yeni profilde müzik açık gelir)
 *   SFX.setMusicVolume(0..1)— müzik seviyesini ayarla ve kaydet
 *   SFX.getMusicVolume() — seçili müzik seviyesi
 *   SFX.isMusicMuted()   — müzik kapalı mı
 */
const SFX = (() => {
  let ctx = null;
  let master = null;    // Oyun sesleri (SFX) kazancı
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
  const musicVoiceGains = new Map();

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
      try { musicGain.gain.value = (musicMuted || musicVolume === 0) ? 0 : 0.42 * musicVolume; } catch (error) { disable(error); }
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

        // Music gain: müzik kanalı için bağımsız kazanç
        musicGain = ctx.createGain();
        musicGain.gain.value = (musicMuted || musicVolume === 0) ? 0 : 0.42 * musicVolume;
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

  // ── Arka plan müziği (B · prosedürel katman) ──
  // Dosyasız döngü: her temanın nota deseni deterministik olarak ileriye
  // zamanlanır (lookahead scheduler). Notlar musicSources setine kaydedilir;
  // stopMusic'te iptal edilir, sessize alınca scheduling atlanır ve ses açılınca
  // aynı döngü kendiliğinden devam eder (plan §21: atlanınca ses kalmaz).
  const musicSources = new Set();
  let musicTheme = null;
  let musicTimer = null;
  let musicStep = 0;
  let musicNextTime = 0;

  // On altı sekizlik adımlı, sabit ve seyrek desenler. Müzik SFX'in arkasında kalır;
  // frekanslar megafabrika atmosferi için düşük, kirli tınılardan seçilmiştir.
  const MUSIC_THEMES = {
    battle: {
      bpm: 92,
      melody: [null, 196, null, 233.08, null, 174.61, null, 261.63, null, 196, null, 155.56, null, 174.61, 233.08, null],
      bass: [55, null, null, 55, null, null, 73.42, null, 55, null, 55, null, null, 49, null, null],
      pad: [110, null, null, null, null, null, null, null, 130.81, null, null, null, null, null, null, null],
      beat: true,
    },
    menu: {
      bpm: 68,
      melody: [null, 261.63, null, null, 311.13, null, 233.08, null, null, 196, null, 233.08, null, null, 174.61, null],
      bass: [65.41, null, null, null, null, null, null, null, 58.27, null, null, null, null, null, null, null],
      pad: [130.81, null, null, null, null, null, null, null, 116.54, null, null, null, null, null, null, null],
    },
  };

  function playMusic(build) {
    if (musicMuted || musicVolume === 0 || !ensure()) return;
    try { build(); } catch (error) { disable(error); }
  }

  // Müzik notası: tek seferlik zarflı ton; kaynak kaydı ortaktır.
  function musicNote(freq, time, opts) {
    if (freq == null) return;
    playMusic(() => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      const t0 = time;
      const dur = opts.dur;
      osc.type = opts.type || "triangle";
      osc.frequency.setValueAtTime(freq, t0);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(opts.cutoff || 1900, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(opts.gain, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(filter).connect(g).connect(musicGain || master);
      track(osc, [osc, filter, g]);
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
      filter.Q.value = 0.55;
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

  // Lookahead scheduler: her 120 ms'de bir 0.5 s ilerisini zamanlar.
  function musicTick() {
    if (musicMuted || musicVolume === 0 || disabled || !ensure()) return;
    const spec = MUSIC_THEMES[musicTheme];
    if (!spec) return;
    const now = ctx.currentTime;
    if (!(musicNextTime > now - 0.001)) musicNextTime = now + 0.06; // bayat kayıt → güncelle
    const stepDur = 60 / spec.bpm / 2;
    while (musicNextTime < now + 0.5) {
      const t = musicNextTime;
      const step = musicStep % 16;
      const melody = spec.melody[step];
      if (melody != null) musicNote(melody, t, { type: "triangle", gain: 0.12, dur: stepDur * 1.5 });
      const bass = spec.bass[step];
      if (bass != null) musicNote(bass, t, { type: "sine", gain: 0.16, dur: stepDur * 3.6 });
      const pad = spec.pad[step];
      if (pad != null) {
        musicNote(pad, t, { type: "sawtooth", gain: 0.028, dur: stepDur * 7.5 });
        musicNote(pad * 1.5, t, { type: "triangle", gain: 0.016, dur: stepDur * 7.5 });
      }
      if (spec.beat && (step === 0 || step === 8)) musicNote(41.2, t, { type: "sine", gain: 0.075, dur: 0.12 });
      if (step === 0 || step === 8) musicNoise(t, { freq: spec.beat ? 1050 : 520, gain: 0.018, dur: stepDur * 2.5 });
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
    if (clearTheme) musicTheme = null;
    musicNextTime = 0;
  }

  function startMusic(theme) {
    stopMusic(true);
    musicTheme = theme;
    musicStep = 0;
    musicNextTime = 0; // ilk tick'te güncel zamana oturur
    musicTimer = setInterval(musicTick, 120);
    musicTick();
  }

  function play(build) {
    if (muted || volume === 0 || disabled) return;
    if (!ensure()) return;
    let activeSfx = 0;
    for (const source of sources.keys()) if (!musicSources.has(source)) activeSfx++;
    if (activeSfx >= 40) {
      for (const [source, cleanup] of sources) {
        if (musicSources.has(source)) continue;
        try { source.stop(); } catch (e) { /* zaten bitmiş olabilir */ }
        cleanup();
        break;
      }
    }
    try { build(); } catch (error) { disable(error); }
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
    play(() => {
      const now = ctx.currentTime;
      const t0 = now + (opts.delay || 0);
      const dur = opts.dur != null ? opts.dur : 0.18;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = opts.type || "sine";
      osc.frequency.setValueAtTime(opts.freq, t0);
      if (opts.freqEnd != null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), t0 + dur);
      }
      const peak = opts.gain != null ? opts.gain : 0.3;
      const atk = opts.attack != null ? opts.attack : 0.006;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(master);
      track(osc, [osc, g]);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    });
  }

  // Zarflanmış + filtrelenmiş gürültü patlaması.
  function noise(opts) {
    play(() => {
      const now = ctx.currentTime;
      const t0 = now + (opts.delay || 0);
      const dur = opts.dur != null ? opts.dur : 0.25;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer();
      const filt = ctx.createBiquadFilter();
      filt.type = opts.filter || "lowpass";
      filt.frequency.setValueAtTime(opts.freq != null ? opts.freq : 1000, t0);
      if (opts.freqEnd != null) {
        filt.frequency.exponentialRampToValueAtTime(Math.max(40, opts.freqEnd), t0 + dur);
      }
      if (opts.Q != null) filt.Q.value = opts.Q;
      const g = ctx.createGain();
      const peak = opts.gain != null ? opts.gain : 0.3;
      g.gain.setValueAtTime(peak, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filt).connect(g).connect(master);
      track(src, [src, filt, g]);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    });
  }

  // ── Yüksek seviyeli efektler ───────────────────────────────────────────────

  return {
    // Silah ateşi: kısa namlu "pat"ı + hava itişi. Ağır silahlar (büyük yarıçap)
    // daha pesten/uzun çalar; hızlı silahlar daha tiz/keskin.
    shoot(spec) {
      const radius = spec && spec.radius ? spec.radius : 40;
      const heavy = Math.max(0, Math.min(1, (radius - 30) / 70)); // 0 hafif → 1 ağır
      const id = spec && typeof spec === "object" ? spec.id : "";
      if (id === "sniper") {
        noise({ filter: "highpass", freq: 3200, freqEnd: 1200, dur: 0.075, gain: 0.21 });
        tone({ type: "sine", freq: 780, freqEnd: 170, dur: 0.11, gain: 0.12, attack: 0.001 });
      } else if (id === "shotgun") {
        noise({ filter: "highpass", freq: 2500, freqEnd: 700, dur: 0.12, gain: 0.2 });
        tone({ type: "square", freq: 190, freqEnd: 65, dur: 0.13, gain: 0.2, attack: 0.001 });
      } else if (id === "drill") {
        noise({ filter: "bandpass", freq: 950, freqEnd: 2400, dur: 0.2, gain: 0.18, Q: 1.6 });
        tone({ type: "sawtooth", freq: 145, freqEnd: 310, dur: 0.14, gain: 0.12 });
      } else if (["grenade", "grenadetrio", "sticky", "rubber", "rubbertrio", "mine"].includes(id)) {
        tone({ type: "triangle", freq: 165, freqEnd: 82, dur: 0.17, gain: 0.22, attack: 0.002 });
        noise({ filter: "lowpass", freq: 520, freqEnd: 180, dur: 0.09, gain: 0.12 });
      } else {
        tone({ type: "sawtooth", freq: 250 - heavy * 100, freqEnd: 68 - heavy * 24,
               dur: 0.13 + heavy * 0.08, gain: 0.19, attack: 0.003 });
        noise({ filter: "highpass", freq: 1500 - heavy * 700, freqEnd: 400, dur: 0.1 + heavy * 0.05, gain: 0.12 });
      }
    },

    // Patlama: pes "boom" (gürültü + alçalan ton). Yarıçap büyüdükçe daha derin/uzun.
    explosion(radius, spec) {
      const r = radius || 40;
      const big = Math.max(0, Math.min(1, (r - 30) / 90));
      const dur = 0.3 + big * 0.45;
      const id = spec && spec.id;
      const isFire = id === "napalm" || id === "fireball";
      const isMetal = id === "drill" || id === "sniper";
      noise({ filter: isFire ? "bandpass" : "lowpass", freq: isFire ? 1100 : 720 + big * 500,
        freqEnd: isFire ? 2600 : 55, dur: isFire ? dur * 0.7 : dur,
        gain: isFire ? 0.18 : 0.29, Q: isFire ? 0.8 : 1 });
      tone({ type: isMetal ? "triangle" : "sine", freq: 138 - big * 72, freqEnd: 34,
        dur: dur * 0.9, gain: 0.22, attack: 0.004 });
      if (big > 0.35) noise({ filter: "lowpass", freq: 180, freqEnd: 48, delay: 0.035, dur: dur * 0.8, gain: 0.12 });
    },

    // Zıplama: kısa yukarı kayan "boing".
    jump() {
      tone({ type: "sine", freq: 260, freqEnd: 540, dur: 0.16, gain: 0.22, attack: 0.004 });
    },

    // Işınlanma: hızla yükselen iki tonlu "zap" + hışırtı
    teleport() {
      tone({ type: "sine", freq: 220, freqEnd: 880, dur: 0.18, gain: 0.2, attack: 0.003 });
      tone({ type: "triangle", freq: 660, freqEnd: 1320, dur: 0.14, gain: 0.12, delay: 0.06 });
      noise({ filter: "highpass", freq: 2200, dur: 0.12, gain: 0.1 });
    },

    // Kanca: fırlatma "tık"ı + metalik tutunma çınlaması
    hook() {
      tone({ type: "square", freq: 520, freqEnd: 180, dur: 0.1, gain: 0.16 });
      noise({ filter: "highpass", freq: 1500, dur: 0.08, gain: 0.12 });
      tone({ type: "triangle", freq: 1180, freqEnd: 900, dur: 0.14, gain: 0.14, delay: 0.06 });
    },

    // Karakter yeteneği — türüne göre ayrı karakter.
    skill(kind, id) {
      const identity = String(id || kind);
      let signature = 0;
      for (let i = 0; i < identity.length; i++) signature = (signature * 31 + identity.charCodeAt(i)) % 13;
      const shift = (signature - 6) * 9;
      const skillTone = (opts) => tone({ ...opts, freq: opts.freq + shift,
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
          noise({ filter: "bandpass", freq: 450, freqEnd: 1300, dur: 0.16, gain: 0.08, delay: 0.08, Q: 2 });
          break;
        case "jump":
        case "glide":
          skillTone({ type: "sine", freq: 180, freqEnd: 620, dur: 0.22, gain: 0.16 });
          noise({ filter: "highpass", freq: 1800, freqEnd: 600, dur: 0.13, gain: 0.08 });
          break;
        case "dash":
          noise({ filter: "bandpass", freq: 350, freqEnd: 2400, dur: 0.2, gain: 0.18, Q: 1.5 });
          break;
        case "dig":
          noise({ filter: "lowpass", freq: 900, freqEnd: 100, dur: 0.32, gain: 0.21 });
          skillTone({ type: "sawtooth", freq: 72, freqEnd: 48, dur: 0.28, gain: 0.12 });
          break;
        case "melee":
          noise({ filter: "highpass", freq: 1900, freqEnd: 800, dur: 0.07, gain: 0.16 });
          skillTone({ type: "square", freq: 135, freqEnd: 48, dur: 0.16, gain: 0.19 });
          break;
        case "radial":
        case "quake":
          skillTone({ type: "sine", freq: 92, freqEnd: 36, dur: 0.42, gain: 0.2 });
          noise({ filter: "lowpass", freq: 520, freqEnd: 72, dur: 0.35, gain: 0.16 });
          break;
        default: // spit vb. ateş sesiyle zaten çalıyor; yine de hafif bir vurgu
          skillTone({ type: "triangle", freq: 390, freqEnd: 650, dur: 0.14, gain: 0.12 });
      }
    },

    // İsabet/hasar — kısa "thwack".
    hit() {
      tone({ type: "square", freq: 180, freqEnd: 60, dur: 0.09, gain: 0.18, attack: 0.002 });
      noise({ filter: "bandpass", freq: 1400, dur: 0.05, gain: 0.14, Q: 1 });
    },

    // Bir oyuncu elendi — alçalan üzgün motif.
    eliminate() {
      tone({ type: "sawtooth", freq: 440, freqEnd: 110, dur: 0.5, gain: 0.22 });
      tone({ type: "sine", freq: 220, freqEnd: 70, dur: 0.5, gain: 0.16, delay: 0.05 });
    },

    // Silah değiştir — minik tık.
    weaponSwitch() {
      tone({ type: "square", freq: 660, dur: 0.05, gain: 0.1, attack: 0.002 });
    },

    // Menü tıklaması.
    uiClick() {
      tone({ type: "triangle", freq: 880, freqEnd: 1100, dur: 0.06, gain: 0.13, attack: 0.002 });
    },

    // Parça montajı — metal klik + kısa yay "tık-klik"i. Silah değiştirme
    // tıkından ayrıdır: takma/sökme eyleminin duyulur imzası olsun.
    partMount() {
      tone({ type: "square", freq: 520, dur: 0.04, gain: 0.11, attack: 0.002 });
      tone({ type: "square", freq: 300, freqEnd: 240, dur: 0.07, gain: 0.12, attack: 0.002, delay: 0.045 });
      tone({ type: "triangle", freq: 1200, freqEnd: 1500, dur: 0.05, gain: 0.06, attack: 0.003, delay: 0.055 });
    },

    // Durum → müzik teması eşlemesi. Her kare render'dan çağrılır; tema
    // değişmemişse ucuz no-op. GAMEOVER müziği keser (zafer jingle'ı yeter).
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
      return {
        theme: musicTheme,
        running: musicTimer != null,
        scheduled: musicSources.size,
      };
    },

    // Sıra yeni oyuncuya geçti — iki nota yükselen kısa jingle.
    turn() {
      tone({ type: "triangle", freq: 523, dur: 0.1, gain: 0.14 });
      tone({ type: "triangle", freq: 784, dur: 0.14, gain: 0.16, delay: 0.09 });
    },

    // Geri sayım son 5 saniye tıkı. urgent ise daha tiz ve keskin.
    timerTick(urgent) {
      if (urgent) {
        tone({ type: "square", freq: 880, dur: 0.04, gain: 0.12, attack: 0.002 });
      } else {
        tone({ type: "sine", freq: 580, dur: 0.035, gain: 0.08, attack: 0.002 });
      }
    },

    // İkmal sandığı alma sesi — yükselen parlak arpej.
    pickup() {
      tone({ type: "sine", freq: 587, dur: 0.09, gain: 0.14 });
      tone({ type: "sine", freq: 880, dur: 0.12, gain: 0.16, delay: 0.06 });
      tone({ type: "triangle", freq: 1174, dur: 0.16, gain: 0.14, delay: 0.12 });
    },

    // Ani ölüm alarm sireni.
    alarm() {
      tone({ type: "sawtooth", freq: 360, freqEnd: 220, dur: 0.32, gain: 0.22 });
      tone({ type: "sawtooth", freq: 360, freqEnd: 220, dur: 0.32, gain: 0.22, delay: 0.36 });
    },

    // Rüzgâr değişimi: filtrelenmiş hava uğultusu yeni şiddetle büyür. Sağa dönüş
    // yükselen, sola dönüş alçalan tonla kodlanır; ekran görülmeden de yön anlaşılır.
    windChange(previous, next) {
      const value = Number.isFinite(next) ? next : 0;
      const strength = Math.min(1, Math.abs(value) / 4);
      const right = value >= 0;
      const base = 380 + strength * 320;
      noise({ filter: "bandpass", freq: 520 + strength * 900,
              freqEnd: 1500 + strength * 1800, dur: 0.34 + strength * 0.24,
              gain: 0.13 + strength * 0.13, Q: 0.7 });
      tone({ type: "sine", freq: right ? base : base * 1.55,
             freqEnd: right ? base * 1.55 : base, dur: 0.28 + strength * 0.12,
             gain: 0.1 + strength * 0.06, attack: 0.015 });

      // Yön tersine döndüyse ikinci kısa uyarı notası değişimi özellikle vurgular.
      if (Number.isFinite(previous) && previous * value < 0) {
        tone({ type: "triangle", freq: right ? 620 : 930,
               freqEnd: right ? 930 : 620, dur: 0.2, gain: 0.12, delay: 0.16 });
      }
    },

    // Zafer — neşeli arpej.
    win() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) =>
        tone({ type: "square", freq: f, dur: 0.22, gain: 0.18, delay: i * 0.12 }));
      tone({ type: "triangle", freq: 1568, dur: 0.4, gain: 0.16, delay: 0.48 });
    },

    // Yenilgi — kısa, alçalan mekanik kapanış.
    lose() {
      tone({ type: "triangle", freq: 330, freqEnd: 196, dur: 0.32, gain: 0.14 });
      tone({ type: "sine", freq: 82, freqEnd: 42, dur: 0.48, gain: 0.18, delay: 0.08 });
      noise({ filter: "lowpass", freq: 420, freqEnd: 90, dur: 0.35, gain: 0.09, delay: 0.1 });
    },

    // Beraberlik — iki kısa, çözümsüz metalik nota.
    draw() {
      tone({ type: "triangle", freq: 294, dur: 0.2, gain: 0.12 });
      tone({ type: "triangle", freq: 311, dur: 0.28, gain: 0.1, delay: 0.22 });
      tone({ type: "sine", freq: 78, dur: 0.3, gain: 0.1, delay: 0.22 });
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

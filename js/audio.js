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
 *   SFX.skill(kind)      — karakter yeteneği (türüne göre)
 *   SFX.hit()            — isabet/hasar
 *   SFX.eliminate()      — bir oyuncu elendi
 *   SFX.weaponSwitch()   — silah değiştir
 *   SFX.partMount()      — parça tak/sök (metal klik)
 *   SFX.uiClick()        — menü tıklaması
 *   SFX.turn()           — sıra yeni oyuncuya geçti
 *   SFX.windChange(a, b) — rüzgâr yönü/şiddeti değişti
 *   SFX.win()            — oyun bitti / kazanan
 *   SFX.musicSync(state) — duruma göre arka plan müziğini aç/kapat/tema değiştir
 *   SFX.musicInfo()      — aktif müzik teması ve çalan nota sayısı (tanı/test)
 *   SFX.toggleMute()     — oyun sesini aç/kapat (durumu döndürür)
 *   SFX.setVolume(0..1)  — oyun ses seviyesini ayarla ve kaydet
 *   SFX.getVolume()      — seçili oyun ses seviyesi (sessizde de korunur)
 *   SFX.toggleMusicMute()— müziği aç/kapat (müzik başlangıçta kapalı gelir)
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

  // Arka plan müziği: başlangıçta varsayılan olarak kapalıdır.
  let musicMuted = true;
  let musicVolume = 0.8;
  let lastAudibleMusicVolume = 0.8;

  let disabled = false;
  let resuming = null;
  const sources = new Map(); // kaynak → bağlantıları temizleyen işlev

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
    // Kayıtlı tercih yoksa varsayılan: true (oyun başlangıcında müzik kapalı)
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

  // İki tını: battle (sessiz nabız), menu (sakin pad).
  // Frekanslar pentatonik C dizisinden; tüm desenler sabit, rastgele yok.
  const MUSIC_THEMES = {
    battle: {
      bpm: 132,
      melody: [null, null, null, null], // melodi yok: yalnız nabız
      bass: { 0: 65.41, 2: 65.41, 4: 98.0, 6: 65.41 }, // düşük kalp atışı
      pulse: true, // her adımda çok kısık tik
    },
    menu: {
      bpm: 76,
      melody: [261.63, 329.63, 392.0, 493.88],
      bass: { 0: 130.81, 4: 98.0 },
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
      const g = ctx.createGain();
      const t0 = time;
      const dur = opts.dur;
      osc.type = opts.type || "triangle";
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(opts.gain, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(musicGain || master);
      track(osc, [osc, g]);
      musicSources.add(osc);
      osc.onended = () => musicSources.delete(osc);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    });
  }

  // Lookahead scheduler: her 120 ms'de bir 0.5 s ilerisini zamanlar.
  function musicTick() {
    if (musicMuted || musicVolume === 0 || disabled || !ensure()) return;
    const spec = MUSIC_THEMES[musicTheme];
    if (!spec) return;
    const now = ctx.currentTime;
    if (!(musicNextTime > now - 0.001)) musicNextTime = now + 0.06; // bayat kayıt → güncelle
    const stepDur = 60 / spec.bpm / 2; // sekizlik nota adımları
    while (musicNextTime < now + 0.5) {
      const t = musicNextTime;
      const barStep = musicStep % 8;
      const melody = spec.melody[musicStep % spec.melody.length];
      if (melody != null) musicNote(melody, t, { gain: 0.09, dur: stepDur * 1.2 });
      const bass = spec.bass[barStep % 8];
      if (bass != null) musicNote(bass, t, { gain: 0.12, dur: stepDur * 3.2 });
      if (spec.pulse) musicNote(160, t, { gain: 0.028, dur: 0.05 });
      musicStep++;
      musicNextTime += stepDur;
    }
  }

  function stopMusic(clearTheme = true) {
    if (musicTimer && clearTheme) { clearInterval(musicTimer); musicTimer = null; }
    for (const osc of musicSources) {
      try { osc.stop(); } catch (e) { /* zaten bitmiş olabilir */ }
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
    if (!ensure()) return;
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
      tone({ type: "square", freq: 320 - heavy * 140, freqEnd: 80 - heavy * 30,
             dur: 0.1 + heavy * 0.06, gain: 0.22, attack: 0.003 });
      noise({ filter: "highpass", freq: 900 - heavy * 400, dur: 0.07 + heavy * 0.05, gain: 0.16 });
    },

    // Patlama: pes "boom" (gürültü + alçalan ton). Yarıçap büyüdükçe daha derin/uzun.
    explosion(radius) {
      const r = radius || 40;
      const big = Math.max(0, Math.min(1, (r - 30) / 90));
      const dur = 0.3 + big * 0.45;
      noise({ filter: "lowpass", freq: 900 + big * 600, freqEnd: 60, dur, gain: 0.4, Q: 1 });
      tone({ type: "sine", freq: 150 - big * 60, freqEnd: 38, dur: dur * 0.9, gain: 0.34, attack: 0.004 });
      tone({ type: "triangle", freq: 90 - big * 30, freqEnd: 30, dur: dur, gain: 0.22, attack: 0.004 });
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
    skill(kind) {
      switch (kind) {
        case "heal":
          tone({ type: "sine", freq: 523, dur: 0.16, gain: 0.18 });
          tone({ type: "sine", freq: 659, dur: 0.16, gain: 0.18, delay: 0.08 });
          tone({ type: "sine", freq: 784, dur: 0.22, gain: 0.2,  delay: 0.16 });
          break;
        case "shield":
        case "damageReduce":
          tone({ type: "triangle", freq: 880, freqEnd: 1320, dur: 0.22, gain: 0.2 });
          tone({ type: "sine", freq: 1760, dur: 0.18, gain: 0.1, delay: 0.04 });
          break;
        case "nextShot":
          tone({ type: "square", freq: 440, freqEnd: 880, dur: 0.16, gain: 0.16 });
          break;
        case "jump":
        case "glide":
          tone({ type: "sine", freq: 300, freqEnd: 720, dur: 0.24, gain: 0.2 });
          break;
        case "dash":
          noise({ filter: "bandpass", freq: 600, freqEnd: 2600, dur: 0.26, gain: 0.3, Q: 2 });
          break;
        case "dig":
          noise({ filter: "lowpass", freq: 500, freqEnd: 120, dur: 0.3, gain: 0.32 });
          break;
        case "melee":
          noise({ filter: "highpass", freq: 1200, dur: 0.09, gain: 0.3 });
          tone({ type: "square", freq: 200, freqEnd: 70, dur: 0.14, gain: 0.26 });
          break;
        case "radial":
        case "quake":
          tone({ type: "sine", freq: 130, freqEnd: 45, dur: 0.4, gain: 0.34 });
          noise({ filter: "lowpass", freq: 600, freqEnd: 80, dur: 0.4, gain: 0.26 });
          break;
        default: // spit vb. ateş sesiyle zaten çalıyor; yine de hafif bir vurgu
          tone({ type: "triangle", freq: 500, freqEnd: 760, dur: 0.14, gain: 0.16 });
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
        musicVolume = lastAudibleMusicVolume || 0.8;
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

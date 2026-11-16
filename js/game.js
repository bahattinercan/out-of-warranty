/* Oyun durum makinesi, sıra sistemi, girdi ve render döngüsü.
 * Durumlar: AIMING -> PROJECTILE -> SETTLE -> (sıra değiş) ... -> GAMEOVER
 */
const TURN_DURATION = 25;        // saniye: bir oyuncunun nişan/hamle süresi
const TUTORIAL_TURN_DURATION = 45; // öğretici maçında acele yok: yarı süresiz nişan

// Öğretici maçının rehber adımları: sırayla tamamlanan görevler. 4 zorunlu
// adım bitince "serbest" adıma geçilir ve maç normal kurallarla sürer.
const TUTORIAL_COACH_STEPS = [
  "A / D veya ← → ile yürü (enerji harcar)",
  "W veya ↑ ile sıçra (enerji harcar)",
  "Fareyle nişan al — çizgiyi çevir",
  "Sol tık basılı tut → güç dolsun → bırak ve ateş et",
  "Serbest! Rakibi devir — Q modülü, 1–9 silahları da dene",
];
const FPS = 60;
const FRAME_TIME = 1000 / FPS;    // ms: bir karenin süresi (60 FPS sabit)
const WIND_MIN_TURNS = 2;          // rüzgâr en az bu kadar tamamlanmış tur sabit kalır
const WIND_MAX_TURNS = 4;
const WIND_FX_DURATION = 1.8;      // değişim bildirimi + yönlü hava çizgileri (saniye)

// Oyuncu sayısı sınırları (2–6) + seçim ekranındaki oyuncu vurgu renkleri
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;
const PLAYER_TINTS = ["#ff7b7b", "#7baeff", "#7bdc8e", "#ffd24a", "#c89bff", "#ff9f5a"];

// Karakter seçim ekranı grid düzeni: 6 sütun × 2 satır = sayfa başına 12 kart
const CS_COLS = 6;
const CS_ROWS = 2;

// Harita seçim ekranı grid düzeni: 5 sütun × 2 satır = sayfa başına 10 kart
const MS_COLS = 3;
const MS_ROWS = 2;

// Atölye grid düzeni: 4 sütun × 4 satır = sayfa başına 16 robot (dar ekranda 3 sütun × 4 satır = 12 robot).
// WS_PANEL_H, sağdaki detay panelinin sabit yüksekliğidir; üç dal paneli ve
// eylem düğmesi bu kutunun içinde kalır.
const WS_COLS = 4;
const WS_ROWS = 4;
const WS_PANEL_H = 440;
const WS_FX_DURATION = 0.6; // satın alma sonrası montaj parıltısı (saniye)
const WS_NOTICE_DURATION = 2.2; // takma/sökme geri bildirim yazısı (saniye)
const WS_LOCK_GLYPH_W = 12; // eylem düğmesindeki asma kilit glifi genişliği (px)

// Oyuncuya görünen marka adı (Türkçe arayüz). İngilizce yayın adı
// "Out of Warranty"; F2 (i18n) adımında bu sabit dil tablosuna bağlanır
// (`brand.title`). O zamana kadar ekran başlıklarının TEK kaynağı burasıdır —
// başlığı elle yazma, bu sabiti kullan.
const GAME_TITLE = "GARANTİ DIŞI";

// Cephane Pazarı: ortak depo için tek ızgara — 3 sütun × 5 satır (sayfa
// başına 15 kart). Kart genişliği pencere genişliğine göre hesaplanır.
const MK_COLS = 3;
const MK_ROWS = 5;
const MK_CARD_H = 62;
const MK_MAX_GRID_W = 912;    // kartlar çok geniş ekranda aşırı yayılmasın
const MK_FX_DURATION = 0.6;   // satın alma sonrası kart parıltısı (saniye)
const MK_NOTICE_DURATION = 2.2; // geri bildirim yazısının ekranda kalma süresi
const MK_TAB_W = 104;         // sekme düğmesi genişliği (5 sekme: cephane + 4 yuva)
const MK_TAB_H = 26;
const MK_TAB_GAP = 6;
// Sekme bandı, başlığın ALTINDA kendi satırında: geri butonu y 16..48'de
// biter, bant 4px boşlukla y=52'den başlar ve DOM ses denetimi alanının
// (AUDIO_SAFE y 8..36) altında kalır.
const MK_TAB_Y = 52;
// Bilgi satırı (Hurda + sekme özeti) sekme bandının altında; soldan başlar.
const MK_INFO_Y = 88;
// Izgara başlangıcı: başlık (14) + sekme (52..78) + bilgi (88) altında.
// Alt bant (navY = 104+5*62+4*12+6 = 468): düğmeler 468..498 → bitişten 8 px
// nefes payıyla kapsam notu (506..518), altında bildirim (522..535) → 540'a sığar.
const MK_GRID_Y = 104;
const MK_FOOT_NOTE_DY = 38;   // kapsam notu: navY + bu (düğme bitişi navY+30 → 8 px boşluk)
const MK_FOOT_NOTICE_DY = 54; // geri bildirim: navY + bu

// Üst-sağ köşe DOM ses denetimine aittir (CSS #audio-control: top 8px, yükseklik
// 36px, sağda ~224px — CSS tarafındaki `--audio-reserve` ile aynı kural).
// Canvas ekranları bu kutuya YAZI ÇİZMEZ; pazar başlık satırı bu yüzden bu
// alanın dışına taşındı (kullanıcı bildirimi).
const AUDIO_SAFE = { x: 726, y: 8, w: 224, h: 36 };

// Pazar sekmeleri: cephane + dört parça yuvası. "PARÇALAR" diye tek sekme
// yoktur — yuva adları doğrudan sekmedir (kullanıcı isteği: kasklar, gövdeler
// sayfa sayfa ayrılsın).
const MARKET_TABS = [
  { id: "ammo", label: "CEPHANE" },
  { id: "helmet", label: "KASK" },
  { id: "body", label: "GÖVDE" },
  { id: "tool", label: "APARAT" },
  { id: "feet", label: "AYAK" },
];

// Skill arketipinin kartta görünen kısa etiketi (arazinin neyi öne çıkardığı)
const ARCH_LABELS = {
  arena: "Yakın arena", vertical: "Platformlar", open: "Açık alan",
  thick: "Kalın zemin", lane: "Hücum koridoru", bastion: "Kale",
};
// Karttaki arketip etiketi: anahtar arketip kimliğinden üretilir (arena.*).
function archLabel(archetype) {
  return t("arena." + archetype, ARCH_LABELS[archetype] || "");
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    // Mantıksal dünya boyutu sabittir; tüm fizik/koordinatlar buna göre çalışır.
    // Geri tampon (backing store) ekran boyutuna göre resize() ile büyütülür,
    // böylece oyun büyüse de görüntü keskin kalır.
    this.W = canvas.width;
    this.H = canvas.height;
    this._scaleX = 1;
    this._scaleY = 1;
    // Alt savaş panelinin mantıksal yüksekliği (CSS px -> dünya px). Ekran
    // ölçeği resize'da değiştiği için sabit sayı yerine syncBottomHud ölçer;
    // 124 eski davranışın değeridir. Modül kartı çizicisi (skills.js >
    // drawSkillHud) hâlâ bu inset'i beşinci argüman olarak okuyabilir.
    this.hudBottomInset = 124;
    // Sağ üst DOM denetimlerinin dünya-piksel kaplaması (measureHudInsets).
    this.hudTopInset = 0;
    this.hudRightInset = 0;
    // Açılır silah listesinin mantıksal sınırları; syncBottomHud liste açıkken
    // doldurur (yerleşim/telemetri), kapalıyken null olur.
    this.hudPanelRect = null;
    // Alt paneldeki silah listesi açılır panel mi açık? (SİLAH DEĞİŞTİR)
    this.weaponMenuOpen = false;

    this.input = { left: false, right: false, mouseX: 0, mouseY: 0, charging: false, power: 0, mouseMoved: false };

    this.crates = [];
    this.crateDropCounter = 0;
    this.barrels = [];
    this.screenShake = { trauma: 0, time: 0, x: 0, y: 0 };
    this.suddenDeath = false;
    this.suddenDeathLevel = 0;
    this.suddenDeathTurns = 12;
    this._lastTickSec = null;

    this.lastTime = 0;
    this.playerCount = 2;   // seçilen oyuncu sayısı (2–6); COUNT_SELECT'te belirlenir
    this.matchId = 0;
    this.turnId = 0;
    this.bot = new BotController();
    this.bots = [];              // birden fazla bot kontrolcüsü
    // Portal (F5): oynanış sayacının son durumu ve maç sonu ödülü (2× reklamı).
    this._portalGameplay = false;
    this.lastMatchReward = null;
    this.difficulty = "normal";  // bilgisayar modu zorluk seviyesi
    // Profil sayfa açılışında bir kez yüklenir; kayıt yoksa varsayılan gelir.
    // storageOk false ise ekonomi çalışır ama kalıcı olmaz (tek seferlik uyarı).
    const loaded = loadProfile();
    this.profile = loaded.profile;
    this.storageOk = loaded.storageOk;
    this.sessionId = createSessionId(); // matchKey'i oturumlar arası ayırır
    // Çevrimiçi lobi ekranı (js/online-lobby.js): oda kodu, davet ve hazır
    // akışı. Profil yüklendikten SONRA kurulur (varsayılan robot profilden).
    this.lobby = new OnlineLobby(this);
    this.online = null;        // maç sırasında ağ bağlamı (js/net/adapter.js)
    this.onlineGuest = false;  // misafir: yetkili simülasyon yürütülmez
    this.workshopPage = 0;
    this.workshopSelectedId = null;
    this.workshopBranch = BRANCHES[0];
    this.workshopFx = null;      // satın alma sonrası kısa montaj parıltısı
    this.marketWeaponPage = 0;   // Cephane Pazarı: mühimmat sayfası
    this.marketPartPage = 0;     // Parçalar sekmesi: parça sayfası
    this.marketTab = "ammo";     // açık sekme: "ammo" | yuva id'si (helmet/body/tool/feet)
    this.marketFx = null;        // satın alma sonrası kart parıltısı
    this.marketNotice = null;    // kısa geri bildirim (eksik Hurda / dolu depo)
    this.bindInput();
    this.reset();
    requestAnimationFrame(this.loop.bind(this));
  }

  reset() {
    // Çevrimiçi oturum varsa kapatılır: taşıma kapanır, ağ bağlamı temizlenir.
    // (Menüye dönüş/çıkış yollarının hepsi buradan geçer.)
    if (this.online) this.closeOnline();
    this.bot.cancel();
    this.bots.forEach((b) => b.cancel());
    this.bots = [];
    this.mode = null;       // "computer" veya "local"
    this.difficulty = "normal";  // bilgisayar modu zorluk seviyesi
    this.playerControls = [];
    this.selectedChars = [];  // beginCharSelect() oyuncu sayısına göre doldurur
    this.selectedMap = null;  // MAP_SELECT'te seçilen harita teması
    this.charSelectPhase = 0; // o an karakterini seçen oyuncunun indeksi
    this.players = [];
    this.projectiles = [];
    this.explosions = [];
    this.skillFx = [];        // modül cast efektleri (saf görsel, js/skill-fx.js)
    this.damagePopups = [];
    this.mines = [];          // kalıcı mayınlar (turlar arası yaşar)
    this.fires = [];          // napalm yanan alanları
    this.crates = [];
    this.crateDropCounter = 0;
    this.barrels = [];
    this.screenShake = { trauma: 0, time: 0, x: 0, y: 0 };
    this.suddenDeath = false;
    this.suddenDeathLevel = 0;
    this.suddenDeathTurns = 12;
    this._lastTickSec = null;
    this.tether = null;       // kanca çekme durumu (Kanca tutununca kurulur)
    this.shooterIdx = null;
    this.shotMod = null;      // aktif salvonun nextShot modifikatörü (nextShot yeteneği)
    this.charPage = 0;        // karakter seçim ekranı sayfası
    this.mapPage = 0;         // harita seçim ekranı sayfası
    this.matchProgress = null; // maç başına ödül sayaçları (startGame kurar)
    this.wind = null;
    this.windTurnsRemaining = 0;
    this.windChangeFx = null;
    this.state = "MODE_SELECT"; // önce oyun modu seçilir
    this._weaponKey = null;
    this.weaponMenuOpen = false;
    hideOverlay();
    updatePowerBar(0, false);
    this.updateHud();
  }

  startGame() {
    // Maç kurulurken sonuç kartı her hâlükârda kapanır: "Tekrar Oyna" yalnız
    // startGame()'i çağırdığı için kart açık kalıp maç arkada yeniden başlarken
    // ekranda asılı duruyordu (F2-11).
    hideOverlay();
    // Önceki maçtan kalan yüklenmiş cephane varsa envantere geri yaz (normalde
    // maç sonunda yapılır; bu çağrı yarıda kesilen akışlara karşı güvenlik ağı).
    this._settleAmmoDepot();
    this.matchId++;
    this.turnId = 1;
    this.bot.resetMatch();
    this.bot.difficulty = this.difficulty;  // zorluğu bot'a aktar
    // Diğer botları da başlat
    for (const b of this.bots) {
      b.resetMatch();
      b.difficulty = this.difficulty;
    }
    this.terrain = new Terrain(this.W, this.H, this.selectedMap);
    // Oyuncuları haritanın doğrulanabilir başlangıç adaylarına yerleştir.
    // Köprü/raf gibi katmanlı alanlarda fromY doğru katmanı seçer.
    const n = this.selectedChars.length;
    const spawnPads = getMapSpawnPads(this.selectedMap, n);
    // Geliştirmeler yalnız bilgisayara karşı modunda ve yalnız insan robotunda
    // etkindir; botlar ve yerel maçlar taban tanımı kullanır (aynı kurucu).
    const upgradesOn = isSinglePlayerProgressionMode(this.mode);
    this.players = this.selectedChars.map((def, i) => {
      const pad = spawnPads[i] || { x: n === 1 ? 0.5 : (0.12 + 0.76 * i / Math.max(1, n - 1)), fromY:0 };
      const x = this.W * pad.x;
      const fromY = this.H * (pad.fromY || 0);
      const ctrl = this.playerControls[i] || "human";
      const build = upgradesOn && ctrl !== "bot"
        ? resolveRobotBuild(def, getRobotProgress(this.profile, def.id), { upgradesEnabled: true })
        : null;
      const ent = new Entity(x, this.terrain.surfaceBelow(x, fromY), def.color, def.label, def, build);
      ent.playerTint = PLAYER_TINTS[i % PLAYER_TINTS.length];
      ent.aim = x < this.W / 2 ? -Math.PI / 4 : -Math.PI + Math.PI / 4;
      ent.weapon = 0;            // başlangıç silahı: Bazuka
      ent.ammo = initialAmmo();  // mühimmat sayacı
      // Ortak depo: tüm robotlar aynı profildelik depodan beslenir (profile.ammo).
      // Depo profilde olduğu gibi kalır (maç sonunda harcanmayan kısım geri
      // yazılır); bu yüzden maç ortasında sayfa yenilenirse satın alınan mermi
      // kaybolmaz. Yalnız tek oyunculu ilerleme modlarında ve insan robotunda
      // geçerlidir; botlar ve yerel maçlar taban mühimmatla oynar.
      if (upgradesOn && ctrl !== "bot") {
        const depot = getAmmoDepot(this.profile);
        if (ammoDepotTotal(depot) > 0) {
          // Savaş tavanı uygulanır; iade snapshot'ı deponun tamamı değil,
          // GERÇEKTEN yüklenen dilimdir (depo 999 olsa da maça tavan kadar girer).
          const load = battleLoad(ent.ammo, depot);
          ent.ammo = load.ammo;
          ent.ammoDepot = load.loaded;
        }
      }
      ent.control = ctrl;
      return ent;
    });
    // Zorluk seviyesi botun hasar gücünü de ölçekler (Kolay zayıf, Ustalık
    // sert); insan robotu ve yerel maçlar etkilenmez.
    aiAssignDamageScale(this.players, this.difficulty);

    // Maç uygunluk sayaçları: ödül yalnız bu maçta ve yalnız bir kez yazılır.
    const humanIdx = this.players.findIndex((p) => p.control !== "bot");
    this.combatStats = {
      kills: 0,
      damageDealt: 0,
      directHits: 0,
      firstBlood: false,
      clutch: false,
      firstKillClaimed: false,
      crateScrap: 0,
    };
    this.matchProgress = {
      key: `${this.sessionId}:${this.matchId}`,
      humanRobotId: humanIdx >= 0 && this.selectedChars[humanIdx] ? this.selectedChars[humanIdx].id : null,
      humanIndex: humanIdx,
      opponentCount: this.players.filter((p) => p.control === "bot").length,
      humanShotsResolved: 0,
      pendingHumanShot: false,
      rewardGranted: false,
    };

    this.turn = 0;
    this.state = "AIMING";
    this.projectiles = [];
    this.explosions = [];
    this.skillFx = [];
    this.damagePopups = [];
    this.mines = [];
    this.fires = [];
    this.crates = [];
    this.crateDropCounter = 0;
    this.barrels = [];
    this.screenShake = { trauma: 0, time: 0, x: 0, y: 0 };
    this.suddenDeath = false;
    this.suddenDeathLevel = 0;
    this.suddenDeathTurns = 12;
    this._lastTickSec = null;
    if (typeof this.spawnInitialBarrels === "function") this.spawnInitialBarrels();
    this.tether = null; // yeni salvo: kanca çekme durumunu temizle
    this.weaponMenuOpen = false; // yeni maç: açılır silah listesi kapalı başlar
    this.wind = randWind();
    this.windTurnsRemaining = randWindDuration();
    this.windChangeFx = null;
    this.settleTimer = 0;
    this.turnTimer = this.mode === "tutorial" ? TUTORIAL_TURN_DURATION : TURN_DURATION;
    this.lastShot = null;
    this.shooterIdx = null;
    this.input.charging = false;
    this.input.power = 0;
    this.players.forEach((p) => p.refreshStamina());
    this.clearTurnInput();

    // Portal (F5): maç başladı — ilk maçta yükleme biter, oynanış sayacı açılır.
    // Reklam ödülü maç başına bir kezdir; yeni maçta sıfırlanır.
    this.lastMatchReward = null;
    this.portalGameplay(true);

    updatePowerBar(0, false);
    this.updateHud();
  }

  // ── Portal (F5) ─────────────────────────────────────────────────────────
  /* Oynanış sayacını SDK'ya bildirir; AYNI durumu tekrar göndermez (portal
   * panelleri ardışık gameplayStart/Stop çiftlerini hata sayar). Portal yoksa
   * hiçbir şey yapmaz. */
  portalGameplay(on) {
    if (typeof PORTAL === "undefined") return false;
    const want = !!on;
    if (this._portalGameplay === want) return false;
    this._portalGameplay = want;
    if (!PORTAL.isActive()) return false;
    if (want) { PORTAL.loadingStop(); PORTAL.gameplayStart(); }
    else PORTAL.gameplayStop();
    return true;
  }

  /* Portalın `muteAudio` ayarı oyun içi ses tercihini EZER (CrazyGames
   * gereksinimi). Ayar değiştiğinde main.js çağırır. */
  setMuted(on) {
    if (typeof SFX === "undefined") return false;
    if (SFX.isMuted() === !!on) { this.updateMuteButton(); return false; }
    SFX.toggleMute();
    this.updateMuteButton();
    return true;
  }

  /* Ödüllü reklam: maç sonu Hurda'yı 2× yapar. XP çarpılmaz — reklam ilerlemeyi
   * hızlandırır, güç vermez (docs/web-lansman-plani.md §8). Maç başına bir kez. */
  doubleMatchScrap() {
    const r = this.lastMatchReward;
    if (!r || !r.ok || r.doubled) return false;
    // Yalnız portal reklamıyla erişilen bir yol: reklam yoksa (file:///SDK'sız)
    // ödül katlanmaz — aksi hâlde konsoldan tek çağrıyla bedava Hurda üretilirdi.
    if (typeof PORTAL === "undefined" || !PORTAL.isActive()) return false;
    if (typeof normalizeProfile !== "function" || typeof saveProfile !== "function") return false;
    const current = normalizeProfile(this.profile);
    current.scrap += r.scrap;
    const persisted = saveProfile(current);
    this.profile = current;
    r.scrap *= 2;
    r.doubled = true;
    if (!persisted && typeof notifyStorageFailure === "function") notifyStorageFailure();
    renderOverlayReward(r);
    return true;
  }

  /* Overlay'deki "2×" düğmesi: reklamı ister, TAM izlenirse ödülü ikiye katlar.
   * Reklam açılamazsa düğme yeniden denenebilir kalır (oyuncu kaybetmez). */
  watchRewardAd() {
    if (typeof PORTAL === "undefined" || !PORTAL.canReward()) return false;
    const r = this.lastMatchReward;
    if (!r || !r.ok || r.doubled) return false;
    const btn = document.getElementById("reward-ad-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = t("overlay.ad.loading", "Reklam yükleniyor…");
    }
    const reset = (label) => {
      const el = document.getElementById("reward-ad-btn");
      if (!el) return;
      el.disabled = false;
      el.textContent = label;
    };
    PORTAL.requestRewarded((res) => {
      if (res && res.ok) {
        this.doubleMatchScrap();
        const el = document.getElementById("reward-ad-btn");
        if (el) el.classList.add("hidden");
      } else {
        reset(t("overlay.ad.failed", "Reklam açılamadı — tekrar dene"));
      }
    });
    return true;
  }

  // ── Çevrimiçi (F3c) ──────────────────────────────────────────────────────
  // Çevrimiçi lobi ekranını açar (oda kur / koda katıl).
  openOnline() {
    hideOverlay();
    this.clearTurnInput();
    this.portalGameplay(false);
    this.mode = null;
    this.onlineRobotSelectReturn = false;
    this.state = "ONLINE_LOBBY";
    this.lobby.open();
    this.updateHud();
  }

  // Çevrimiçi lobiden tam robot galerisini açar.
  openOnlineRobotSelect() {
    this.onlineRobotSelectReturn = true;
    this.state = "CHAR_SELECT";
    this.selectedChars = [this.lobby ? this.lobby.robot : CHARACTERS[0]];
    this.charSelectPhase = 0;
    this.charPage = this._charPageOf(this.lobby ? this.lobby.robotId : null);
    this.updateHud();
  }

  _charPageOf(id) {
    const idx = CHARACTERS.findIndex((c) => c.id === id);
    if (idx < 0) return 0;
    const layout = this.charSelectLayout();
    const perPage = layout.perPage || (CS_COLS * CS_ROWS);
    return Math.floor(idx / perPage);
  }

  // Ağ bağlamını kapatır (menüye dönüş, maç iptali). Taşıma da kapanır.
  closeOnline() {
    if (this.lobby) { try { this.lobby.close(); } catch (e) { /* yoksay */ } }
    this.online = null;
    this.onlineGuest = false;
  }

  /* Lobi maç başlatınca çağrılır: dünyayı kurar, oturumu oyuna bağlar.
   * Host başlangıç paketini (arazi maskesi + tam durum) gönderir; misafir bu
   * paketleri uygulayıp LOADED ile onaylar (aşama LOADING → PLAYING). */
  beginOnlineMatch(opts) {
    const o = opts || {};
    const session = o.session || (this.lobby && this.lobby.session);
    if (!session) return false;
    const role = session.role === "guest" ? "guest" : "host";
    const setup = role === "guest"
      ? (session.startSetup || { mapId: null, roster: null })
      : { mapId: session.lobbyMapId, roster: this.onlineRoster(session) };
    this.state = "ONLINE_LOADING";
    this.startOnlineMatch(setup);
    netAttachOnline(this, session, { lobby: o.lobby || this.lobby });
    if (role === "host") {
      // Başlangıç paketi: arazi maskesi (arazi rastgele doğduğu için şart) +
      // tam durum (build dahil: misafir profil verisi taşımaz).
      session.sendTerrainSnapshot(netCaptureTerrain(this));
      session.broadcastState(netCaptureState(this, { tick: this.turnId }));
      // Host kendi koltuğunun yükleme onayını hemen verir (dünya hazır);
      // misafirin onayı LOADED paketiyle gelir. İkisi tamamlanınca PLAYING.
      session.loaded(0);
      this.state = "AIMING";
    } else {
      // Misafir: maskeyi ve ilk durumu bekler; `rules.applyState` onayı gönderir.
      this.state = "ONLINE_LOADING";
    }
    this.updateHud();
    return true;
  }

  /* Çevrimiçi arazi maskesi boyut uyuşmazlığında misafir kendini onarır:
   * dünya GENİŞLİĞİ pencere en-boy oranına göre türetildiği için (resize(),
   * 648–1620) iki taraf farklı genişlikte olabilir ve hostun maskesi eski
   * boyutta reddedilirdi (netApplyTerrain > SIZE_MISMATCH). Yetkili boyut
   * hostunkidir: dünya bu boyuta çekilir, arazi yeniden kurulur (misafir hostun
   * oyma kayıtlarını OYNATIR, kendi kuyruğunu tutmaz) ve tuval ölçeği yenilenir.
   * Onarım olmadan maske reddedilir; misafirin yerel tahmini her snapshot'ta
   * düzeltildiği için robot sürekli yukarı-aşağı ZIPLAR (yaşandı: "misafir
   * karakter sürekli yukarı aşağı zıplıyor"). */
  adoptTerrainSize(w, h) {
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 2 || h < 2 || w > 4096 || h > 4096) return false;
    this.W = Math.round(w);
    this.H = Math.round(h);
    // Tuval geri tamponu aynı kalır; yalnız hangi dünya boyutunun çizildiği
    // değişir (resize() ile aynı türetme: geri tampon / dünya).
    const c = this.canvas;
    const pxW = c && c.width ? c.width : this.W;
    const pxH = c && c.height ? c.height : this.H;
    this._scaleX = pxW / this.W;
    this._scaleY = pxH / this.H;
    this.terrain = new Terrain(this.W, this.H, this.selectedMap);
    this.terrain.recordChanges = !!(this.online && this.online.role === "host");
    return true;
  }

  // Host kadrosu: KOLTUK SIRASINA göre (players[i] = koltuk i, F4). Misafir
  // robotu HELLO ile gelir; seçilmemiş koltuk için sıradaki karakter yedek.
  onlineRoster(session) {
    const seats = (session && session.seats) || [];
    const out = [];
    for (const s of seats) {
      if (s.robotId) { out.push(s.robotId); continue; }
      const fallback = CHARACTERS[s.playerIdx % CHARACTERS.length];
      out.push(fallback ? fallback.id : null);
    }
    if (!out.length) out.push((this.lobby && this.lobby.robotId) || (CHARACTERS[0] && CHARACTERS[0].id));
    return out;
  }

  /* Çevrimiçi maç kurulumu: kadro ve harita hostun START paketinden gelir
   * (misafir kendi seçimini yapmaz). Kurulumun geri kalanı yerel maçla AYNI
   * yoldur (startGame): arazi, spawn padleri, sayaçlar. Çevrimiçi maçta
   * geliştirmeler ve depo KAPALIDIR (taban build kuralı): iki taraf aynı
   * istatistiklerle oynar, misafirin profili gerekmez. */
  startOnlineMatch(setup) {
    const st = setup || {};
    const ids = Array.isArray(st.roster) ? st.roster : [];
    // Koltuk sırası KORUNUR: tanınmayan/eksik robot kimliği sıradaki karaktere
    // düşer, dizi kısaltılmaz — aksi hâlde players[i] ile koltuk i kayar ve
    // komutlar yanlış robota gider (F4: 2–6 koltuk).
    const chars = [];
    for (let i = 0; i < ids.length; i++) {
      const def = CHARACTERS.find((c) => c.id === ids[i]) || CHARACTERS[i % CHARACTERS.length];
      if (def) chars.push(def);
    }
    if (chars.length < 2) {
      // Kadro eksikse ilk iki karakterle devam edilir (protokol hatası oyunu
      // kilitlesin diye maç yine kurulur; iki taraf aynı listeyi kullanır).
      for (let i = 0; i < 2; i++) if (CHARACTERS[i] && chars.indexOf(CHARACTERS[i]) < 0) chars.push(CHARACTERS[i]);
    }
    this.mode = "online";
    // Koltuk sayısı kadroyu belirler (2–6). Üst sınır oyunun kendi MAX_PLAYERS'ı.
    const max = typeof MAX_PLAYERS === "number" ? MAX_PLAYERS : 6;
    this.selectedChars = chars.slice(0, max);
    this.selectedMap = getMapById(st.mapId) || MAPS[0];
    this.playerControls = this.selectedChars.map(() => "human");
    this.startGame();
    return true;
  }

  /* Çevrimiçi komut: host KENDİ komutunu da misafirinkiyle aynı doğrulamadan
   * geçirir (charge yaşam döngüsü, atış hakkı, tur denetimi tek yerde —
   * docs/multiplayer-plan.md §6.1). */
  onlineCommand(cmd) {
    const o = this.online;
    if (!o) return { ok: false, reason: "NO_ONLINE" };
    if (o.role === "host") {
      return o.session.handleHostMessage(0, {
        v: NET_PROTOCOL_VERSION, t: NET_MSG.CMD, matchId: o.session.matchId,
        authoritySessionId: o.session.authoritySessionId, turnId: o.session.turnId,
        seq: o.nextSeq(), id: o.nextCommandId(), cmd,
      });
    }
    // Misafir: kimliği oturum üretir ("s1-n" — koltuk ad alanı). Adapter'in
    // sayacı hostun ad alanına ait olduğu için burada KULLANILMAZ (çakışırdı).
    return o.session.sendCommand(cmd);
  }

  // Reddedilen komutun kısa bildirimi (ör. "sıra sende değil").
  onlineNotice(reason) {
    const o = this.online;
    if (!o) return;
    // Metin ÇAĞRI ANINDA çevrilir (anahtarlar burada açık yazılır: hem TR
    // kaynağı görünür kalır hem i18n kapsam testi anahtarları kodda bulur).
    let text;
    if (reason === "NOT_YOUR_TURN") text = t("online.notice.notYourTurn", "Sıra sende değil");
    else if (reason === "SHOT_ALREADY_USED") text = t("online.notice.shotUsed", "Bu turda atış hakkın doldu");
    else if (reason === "NO_OPEN_CHARGE") text = t("online.notice.noCharge", "Güç doldurma kapandı");
    else if (reason === "NO_AMMO") text = t("online.notice.noAmmo", "Bu silahın mühimmatı bitti");
    else if (reason === "STALE_TURN") text = t("online.notice.staleTurn", "Tur kapandı — komut geçersiz");
    else if (reason === "COMMAND_CONFLICT") text = t("online.notice.conflict", "Komut çakışması — tekrar dene");
    else text = t("online.notice.rejected", "Komut uygulanmadı: {reason}", { reason });
    o.notice = { text, age: 0 };
  }

  // Maç iptali (simülasyon borcu, kopma vb.): sonuç kartı yerine menüye dönülür.
  onlineAbort(reason) {
    const o = this.online;
    if (!o || o.aborted) return;
    o.aborted = true;
    // Tanılama (F6): kapalı testte kopma nedenleri rapora düşer.
    if (typeof DIAG !== "undefined") DIAG.record("online", String(reason || "ABORTED"));
    try { o.session.abort(reason); } catch (e) { /* yoksay */ }
    // İptal nedeni metni (anahtarlar açık: i18n kapsamı kodda görünür).
    let why;
    if (reason === "LEFT") why = t("online.abort.LEFT", "Maçtan ayrıldın.");
    else if (reason === "SIM_DEBT") why = t("online.abort.SIM_DEBT", "Simülasyon yetişemedi — maç iptal edildi.");
    else if (reason === "REMATCH") why = t("online.abort.REMATCH", "Oda sahibi maçı yeniden başlattı.");
    else why = t("online.abort.ABORTED", "Maç iptal edildi.");
    showOverlay(t("online.abort.title", "Çevrimiçi maç bitti"), why, null);
    this._applyOverlayMode(true);
    this.updateHud();
  }

  // Host: maç sonucu paketi (kim kazandı).
  onlineResult() {
    const alive = this.players.filter((p) => p.alive);
    const winner = alive.length === 1 ? this.players.indexOf(alive[0]) : null;
    return { winner, turnId: this.turnId };
  }

  // Misafir: hostun RESULT paketini gösterir (kendi koltuğuna göre kazanç/kayıp).
  onlineShowResult(result) {
    const mine = this.online ? this.online.session.mySeat : null;
    const r = result || {};
    if (r.winner == null) {
      showOverlay(t("overlay.match.drawTitle", "Tahsis berabere kaldı!"), t("overlay.match.drawSub", "İkisi de elendi."), null);
    } else {
      const winner = this.players[r.winner];
      showOverlay(t("overlay.match.winTitle", "{name} parça hakkını kazandı! 🏆", { name: winner ? winner.name : "" }), "", null);
    }
    if (r.winner != null && r.winner !== mine) {
      // Kaybeden tarafta alt yazı yeniden dene çağrısıdır.
      const sub = document.getElementById("overlay-sub");
      if (sub) sub.textContent = t("online.loss.sub", "Karşı taraf kazandı — yeni bir oda kurup tekrar dene.");
    }
    this._applyOverlayMode(true);
  }

  // Maç sonu kartı çevrimiçi modda sadeleşir: Atölye ve Tekrar Oyna yoktur
  // (ödül/atölye tek oyunculu ilerlemeye ait; yeni maç için odaya dönülür).
  // Reklam düğmesi de gizlenir: çevrimiçi maçta ödül verilmez.
  _applyOverlayMode(online) {
    const ws = document.getElementById("workshop-btn");
    if (ws) ws.classList.toggle("hidden", !!online);
    const rs = document.getElementById("restart-btn");
    if (rs) rs.classList.toggle("hidden", !!online);
    const ad = document.getElementById("reward-ad-btn");
    if (ad && online) ad.classList.add("hidden");
  }

  /* Bu CİHAZIN sırası mı? Yerel modlarda sıradaki her insan robot; çevrimiçide
   * yalnız kendi koltuğumuz (aksi hâlde misafirin turunda hostun tuşları
   * karşı tarafın robotunu sürerdi). */
  isLocalTurn() {
    if (!this.isHumanTurn()) return false;
    if (this.mode !== "online" || !this.online) return true;
    const seat = this.online.role === "host" ? 0 : this.online.session.mySeat;
    return this.turn === seat;
  }

  /* Misafir koparsa maç sürer: robot grace boyunca oyunda kalır ve süre dolunca
   * BOT devralır (F4). Kontrol her yarım saniyede bir koltuklara bakılarak yapılır
   * — ayrı bir zamanlayıcı yok, simülasyon saati zaten hostta yürüyor. */
  onlineCheckBots(o, dt) {
    o.botTimerMs = (o.botTimerMs || 0) + dt * 1000;
    if (o.botTimerMs < 500) return;
    o.botTimerMs = 0;
    for (const s of o.session.seats) {
      if (s.playerIdx === 0 || s.connected || s.bot) continue;
      o.session.graceExpired(s.playerIdx);
    }
  }

  /* Maç sırasında geri dönen oyuncuya dünyayı yeniden gönderir (F4): START
   * (kadro + harita + tur sayacı) → arazi maskesi → TAM durum (build dahil).
   * Misafirin sayfası yenilenmiş olabileceği için üçü birlikte gider. */
  onlineResumeSeat(seat) {
    const o = this.online;
    if (!o || o.role !== "host" || !o.session || o.session.phase !== NET_PHASE.PLAYING) return false;
    o.session.resendStart(seat, {
      turnId: this.turnId,
      mapId: this.selectedMap ? this.selectedMap.id : null,
      roster: this.selectedChars.map((c) => c.id),
    });
    o.session.sendTerrainSnapshot(netCaptureTerrain(this), seat);
    o.session.broadcastState(netCaptureState(this, { tick: this.turnId, includeBuild: true }), seat);
    return true;
  }

  /* Host sürücüsü: simülasyon oturumun SABİT ADIMLI saatinden yürür (ağ
   * gecikmesi borç olarak taşınır, sessizce atlanmaz). Tur kapandığında oturuma
   * bildirilir (TURN paketi), arazi oymaları ve periyodik durum yayınlanır. */
  updateOnlineHost(dt) {
    const o = this.online;
    if (!o || o.role !== "host") { this.updateCore(dt); return; }
    // Kendi girdimiz YEREL ve her zaman taze: tazelik denetimi hosta
    // uygulanırsa (hiç INPUT paketi gelmediği için) yürüme ve güç doldurma her
    // karede silinir ve host atış yapamaz.
    o.session.touchLocalInput(0);
    const res = o.session.update(dt * 1000);
    if (res && res.ok === false && res.reason === "SIM_DEBT") { this.onlineAbort("SIM_DEBT"); return; }
    // Oyun turu kapattıysa (turnId ilerledi) oturum da aynı kimliğe geçer.
    if (this.turnId !== o.lastTurnId) {
      o.lastTurnId = this.turnId;
      o.session.endTurn(this.turnId);
    }
    netFlushTerrain(this, o.session);
    this.onlineCheckBots(o, dt);
    o.stateTimerMs += dt * 1000;
    if (o.stateTimerMs >= NET_STATE_INTERVAL_MS) {
      o.stateTimerMs = 0;
      o.session.broadcastState(netCaptureState(this, { tick: this.turnId, includeBuild: false }));
    }
    if (o.notice) { o.notice.age += dt * 1000; if (o.notice.age > 2400) o.notice = null; }
    if (this.state === "GAMEOVER" && !o.finished) {
      o.finished = true;
      o.session.finish(this.onlineResult());
      this._applyOverlayMode(true);
    }
    this.updateHud();
  }

  /* Misafir sürücüsü: YETKİLİ simülasyon YOK. Yalnız görsel yumuşatma —
   * yerçekimi/animasyon, mermi uçuşu, patlama ve hasar yazıları. Tur sayacı,
   * sıra geçişi, bot ve maç sonu kararı STATE/TURN/RESULT paketleriyle gelir. */
  updateGuest(dt) {
    const o = this.online;
    if (!o) { this.updateCore(dt); return; }
    // Hostun terminal paketleri: sonuç kartı / iptal bildirimi (bir kez).
    if (!o.finished && o.session.phase === NET_PHASE.RESULTS) {
      o.finished = true;
      this.onlineShowResult(o.session.lastResult);
    }
    if (!o.finished && o.session.lastAbort) {
      o.finished = true;
      this.onlineAbort(o.session.lastAbort);
    }
    if (this.state === "GAMEOVER" || this.state === "ONLINE_LOADING") {
      // Başlangıç paketi (maske + durum) gelene kadar yerel fizik ilerletilmez:
      // arazi ve konumlar hostun paketiyle belirlenir.
      if (o.notice) { o.notice.age += dt * 1000; if (o.notice.age > 2400) o.notice = null; }
      this.updateHud();
      return;
    }
    for (const p of this.players) if (p.alive) p.update(this.terrain);

    /* Snapshot'lar arası GÖRSEL YUMUŞATMA: konum ve animasyon alanları yetkili
     * hedefe doğru enterpole edilir. Aksi hâlde robot 10 paket/sn'lik (100 ms)
     * adımlarla zıplar ve yürüyüş animasyonu paket aralarında yerel sönümle
     * bozulur — kullanıcı bildirimi: "hareketleri kesik kesik görüyor full fps
     * değil", "yürüyüş animasyonu oynamıyor". */
    if (typeof netAdvanceVisuals === "function") netAdvanceVisuals(this, dt * 1000);

    // Nişan ve güç doldurma YEREL gösterilir (anında geri bildirim); yetkili
    // sonuç RELEASE komutuyla atomik gider, host uygular.
    if (this.state === "AIMING" && this.active && this.isLocalTurn()) {
      this.active.aimTowards(this.input.mouseX, this.input.mouseY);
      if (this.input.charging) {
        this.input.power = Math.min(1, this.input.power + 0.012);
        const marker = this.active.lastShot ? this.active.lastShot.power * 100 : null;
        updatePowerBar(this.input.power, true, marker);
      }
    }

    // Girdi paketi: yalnız sıra bizdeyken, 20 paket/sn (güvenilmez akış).
    o.inputTimerMs += dt * 1000;
    if (o.inputTimerMs >= NET_INPUT_INTERVAL_MS) {
      o.inputTimerMs = 0;
      if (o.session.phase === NET_PHASE.PLAYING && this.isLocalTurn()) {
        const move = (this.input.left ? -1 : 0) + (this.input.right ? 1 : 0);
        o.session.sendInput(move, { x: this.input.mouseX, y: this.input.mouseY });
      }
    }

    // Mermi uçuşu: yerel adım yalnız yumuşatma içindir; konum/ölüm kararı
    // 10 Hz snapshot ile düzeltilir. Patlama GÖRSELDİR (explode içinde dallanır).
    if (this.state === "PROJECTILE") {
      const current = this.projectiles;
      this.projectiles = [];
      for (const pr of current) {
        if (pr.dead) continue;
        const res = pr.update(this.terrain, this.wind);
        if (res && res.hit) { this.explode(res.x, res.y, pr.spec); continue; }
        if (res) continue;   // ekrandan çıktı
        this.projectiles.push(pr);
      }
    }

    for (const ex of this.explosions) ex.update();
    this.explosions = this.explosions.filter((e) => !e.dead);
    if (typeof updateSkillFx === "function") updateSkillFx(this);
    for (const d of this.damagePopups) { d.age += dt; d.y -= 34 * dt; }
    this.damagePopups = this.damagePopups.filter((d) => d.age < 1.1);
    if (o.notice) { o.notice.age += dt * 1000; if (o.notice.age > 2400) o.notice = null; }
    this.updateHud();
  }

  beginMode(mode) {
    this.mode = mode === "computer" ? "computer" : "local";
    if (this.mode === "computer") {
      this.state = "DIFFICULTY_SELECT";
      this.updateHud();
    } else {
      this.playerControls = [];
      this.state = "COUNT_SELECT";
      this.updateHud();
    }
  }

  renderModeSelect(ctx) {
    const W = this.W, H = this.H;
    const timeMs = this.renderTimeMs || 0;

    // Fabrika dokusu arka planda kalır; siber-ızgara ve parçacıklar derinlik katar.
    drawClouds(ctx, W, "rgba(190,215,240,0.14)");
    _msBackdrop(ctx, W, H, timeMs);

    // ── Sol Üst: Ayarlar Butonu & Operatör Kaynak Rozeti ─────────────────
    const topY = 16, btnH = 28;

    // Ayarlar düğmesi (Sol üst — Hurda'nın solunda)
    const setBtnX = 18, setBtnY = topY, setBtnW = 112;
    const setHovered = this.input.mouseX >= setBtnX && this.input.mouseX <= setBtnX + setBtnW && this.input.mouseY >= setBtnY && this.input.mouseY <= setBtnY + btnH;
    this._settingsBtnRect = { x: setBtnX, y: setBtnY, w: setBtnW, h: btnH };
    _csPanel(ctx, setBtnX, setBtnY + (setHovered ? -1 : 0), setBtnW, btnH, {
      accent: setHovered ? "#71d3bd" : "rgba(113,211,189,0.45)",
      hover: setHovered, glow: setHovered, rivets: false,
      fillTop: setHovered ? "rgba(113,211,189,0.22)" : "rgba(113,211,189,0.06)",
    });
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = setHovered ? "#ffffff" : "#cfe0ee";
    ctx.font = uiTitleFont(11, 700);
    ctx.fillText("⚙ " + t("menu.settings", "AYARLAR"), setBtnX + setBtnW / 2, setBtnY + btnH / 2 + (setHovered ? -1 : 0));

    // Hurda Rozeti (Ayarlar'ın sağında)
    const scrap = this.profile ? this.profile.scrap : START_SCRAP;
    const badgeW = 154, badgeH = btnH;
    const badgeX = setBtnX + setBtnW + 8, badgeY = topY;
    const badgeHovered = this.input.mouseX >= badgeX && this.input.mouseX <= badgeX + badgeW && this.input.mouseY >= badgeY && this.input.mouseY <= badgeY + badgeH;
    this._scrapBadgeRect = { x: badgeX, y: badgeY, w: badgeW, h: badgeH };
    _csPanel(ctx, badgeX, badgeY + (badgeHovered ? -1 : 0), badgeW, badgeH, {
      accent: badgeHovered ? "#ffd27a" : "rgba(244,189,98,0.45)",
      hover: badgeHovered, glow: badgeHovered, rivets: false,
      fillTop: badgeHovered ? "rgba(244,189,98,0.22)" : "rgba(244,189,98,0.08)",
    });
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = uiTitleFont(12, 700);
    ctx.fillStyle = badgeHovered ? "#ffffff" : "#ffd27a";
    ctx.fillText("🪙 " + t("menu.badge.scrap", "{scrap} Hurda", { scrap }), badgeX + 10, badgeY + badgeH / 2 + (badgeHovered ? -1 : 0));
    ctx.textAlign = "right";
    ctx.font = uiTextFont(10, 600);
    ctx.fillStyle = badgeHovered ? "#71d3bd" : "#8fa6bd";
    ctx.fillText(t("menu.badge.workshop", "ATÖLYE ›"), badgeX + badgeW - 8, badgeY + badgeH / 2 + (badgeHovered ? -1 : 0));

    // ── Başlık Alanı (Logo & Endüstriyel Damga) ───────────────────────────
    const titleY = H * 0.052;
    const titleText = t("brand.title", GAME_TITLE);

    // Başlık aurası (yumuşak radyal ışık)
    const tglow = ctx.createRadialGradient(W / 2, titleY + 22, 6, W / 2, titleY + 22, 220);
    tglow.addColorStop(0, "rgba(244, 189, 98, 0.16)");
    tglow.addColorStop(0.55, "rgba(113, 211, 189, 0.035)");
    tglow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tglow;
    ctx.fillRect(W / 2 - 240, titleY - 14, 480, 72);

    // Üst mikro damga
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(113, 211, 189, 0.65)";
    ctx.font = uiTitleFont(10, 700);
    ctx.fillText("PROT-9 // OUT OF WARRANTY", W / 2, titleY);

    // Ana Başlık (Gölge + Parıldayan Neon)
    ctx.font = uiTitleFont(Math.min(38, W * 0.044), 700);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillText(titleText, W / 2 + 2, titleY + 16);
    ctx.fillStyle = "#ffe45e";
    ctx.shadowColor = "rgba(255, 228, 94, 0.42)";
    ctx.shadowBlur = 10;
    ctx.fillText(titleText, W / 2, titleY + 14);
    ctx.shadowBlur = 0;

    // Başlık altı dekoratif tehlike şeridi
    const stripW = Math.min(280, W * 0.32);
    _csHazardStrip(ctx, W / 2 - stripW / 2, titleY + 52, stripW, 3);

    // Tagline / Slogan
    ctx.fillStyle = "#a2b8c2";
    ctx.font = uiTextFont(12, 600);
    ctx.fillText(
      "// " + t("menu.tagline", "Arena tahsis protokolünü başlat") + " //",
      W / 2, titleY + 60
    );

    // Ortak depo sayacı (Pazar kartı için)
    const depotTotal = ammoDepotTotal(getAmmoDepot(this.profile));

    const items = [
      { action: "computer", icon: "robot", accent: "#ff7b7b", badge: t("menu.mode.badge.ai", "VS BİRİMLER"), title: t("menu.mode.computer.title", "Otomatik Birimlere Karşı"), sub: t("menu.mode.computer.sub", "1 operatör ve 1–3 fabrika robotu") },
      { action: "local", icon: "ikili", accent: "#7baeff", badge: t("menu.mode.badge.local", "2–6 OYUNCU"), title: t("menu.mode.local.title", "Yerel Operatörler"), sub: t("menu.mode.local.sub", "Aynı cihazda 2–6 oyuncu") },
      { action: "online", icon: "ağ", accent: "#63e6be", badge: t("menu.mode.badge.online", "CANLI P2P"), title: t("menu.mode.online.title", "Çevrimiçi"), sub: t("menu.mode.online.sub", "Oda koduyla 2–6 oyuncu — internet üzerinden") },
      { action: "workshop", icon: "dişli", accent: "#d8a72f", title: t("menu.mode.workshop.title", "ATÖLYE"), sub: t("menu.mode.workshop.sub", "Robotlarını kalibre et • {scrap} Hurda", { scrap }) },
      { action: "market", icon: "mermi", accent: "#3fae8c", title: t("menu.mode.market.title", "CEPHANE PAZARI"), sub: depotTotal > 0 ? t("menu.mode.market.sub", "Depoda {n} mermi • {scrap} Hurda", { n: depotTotal, scrap }) : t("menu.mode.market.subEmpty", "Ortak mühimmat deposu • {scrap} Hurda", { scrap }) },
      { action: "tutorial", icon: "soru", accent: "#4fc3f7", title: t("menu.mode.tutorial.title", "NASIL OYNANIR"), sub: t("menu.mode.tutorial.sub", "Kontroller ve tur kuralları") },
    ];

    // Kart yerleşimi: üstte 3 büyük mod kartı, altta 3 kompakt servis kartı
    const gap = 16;
    const primaryW = Math.min(276, (W - 48 - gap * 2) / 3);
    const primaryH = Math.min(182, H * 0.35);
    const utilityH = Math.min(92, H * 0.185);
    const primaryY = H * 0.30;
    const utilityY = H - utilityH - 44;
    const primaryStartX = (W - (primaryW * 3 + gap * 2)) / 2;
    const utilityW = (W - 48 - gap * 2) / 3;
    const utilityStartX = (W - (utilityW * 3 + gap * 2)) / 2;

    this._modeRects = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i], primary = i < 3;
      const x = primary ? primaryStartX + i * (primaryW + gap) : utilityStartX + (i - 3) * (utilityW + gap);
      const y = primary ? primaryY : utilityY;
      const w = primary ? primaryW : utilityW;
      const h = primary ? primaryH : utilityH;
      const hovered = this.input.mouseX >= x && this.input.mouseX <= x + w && this.input.mouseY >= y && this.input.mouseY <= y + h;
      this._modeRects.push({ x, y, w, h, action: it.action });
      const hy = y + (hovered ? -4 : 0);

      // Kart Paneli
      _csPanel(ctx, x, hy, w, h, {
        accent: hovered ? it.accent : _hexA(it.accent, 0.58),
        hover: hovered, glow: true, rivets: false,
        fillTop: hovered ? _hexA(it.accent, 0.22) : _hexA(it.accent, 0.08),
      });

      // Kart üstü renkli accent şeridi (3px)
      ctx.fillStyle = hovered ? it.accent : _hexA(it.accent, 0.75);
      ctx.fillRect(x + 10, hy + 1, w - 20, 2.5);

      if (primary) {
        // Sağ üst köşe rozeti (Badge)
        if (it.badge) {
          const badgePillW = 76, badgePillH = 17;
          const badgePillX = x + w - badgePillW - 8;
          const badgePillY = hy + 8;
          ctx.fillStyle = hovered ? _hexA(it.accent, 0.25) : "rgba(0,0,0,0.45)";
          ctx.strokeStyle = _hexA(it.accent, hovered ? 0.9 : 0.4);
          ctx.lineWidth = 1;
          _panelPath(ctx, badgePillX, badgePillY, badgePillW, badgePillH, 3);
          ctx.fill(); ctx.stroke();
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.font = uiTitleFont(9.5, 700);
          ctx.fillStyle = hovered ? "#ffffff" : it.accent;
          ctx.fillText(it.badge, badgePillX + badgePillW / 2, badgePillY + badgePillH / 2);
        }

        // İkon
        _msIcon(ctx, it.icon, x + w / 2, hy + 44, it.accent, hovered);

        // Başlık
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const title = _fitTextLines(ctx, it.title, w - 24, 18, uiTitleFont, 2, 13);
        const sub = _fitTextLines(ctx, it.sub, w - 26, 11.5, (p) => uiTextFont(p), 2, 10);
        ctx.fillStyle = hovered ? "#ffffff" : "#eef5ff";
        const titleY = hy + 92;
        title.lines.forEach((line, row) => ctx.fillText(line, x + w / 2, titleY + row * (title.px + 2)));

        // Alt Açıklama
        ctx.fillStyle = hovered ? "#cfe0ee" : "#8fa6bd";
        sub.lines.forEach((line, row) => ctx.fillText(line, x + w / 2, hy + h - 28 + row * 12));

        // Hover durumunda alt buton rozeti
        if (hovered) {
          ctx.font = uiTitleFont(9, 700);
          ctx.fillStyle = it.accent;
          ctx.fillText(t("menu.card.enter", "BAŞLAT ➔"), x + w / 2, hy + h - 8);
        }
      } else {
        // Kompakt alt kartlar (Atölye, Pazar, Nasıl Oynanır)
        _msIcon(ctx, it.icon, x + 34, hy + h / 2, it.accent, hovered);
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        const title = _fitTextLines(ctx, it.title, w - 90, 15, uiTitleFont, 1, 11);
        const sub = _fitTextLines(ctx, it.sub, w - 90, 10.5, (p) => uiTextFont(p), 2, 9);

        // Başlık
        ctx.fillStyle = hovered ? "#ffffff" : "#eef5ff";
        ctx.fillText(title.lines[0], x + 64, hy + h / 2 - 12);

        // Alt metin
        ctx.fillStyle = hovered ? "#cfe0ee" : "#8fa6bd";
        sub.lines.forEach((line, row) => ctx.fillText(line, x + 64, hy + h / 2 + 11 + row * 12));

        // Sağ ok glifi
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.font = uiTitleFont(13, 700);
        ctx.fillStyle = hovered ? it.accent : "rgba(143, 166, 189, 0.4)";
        ctx.fillText("›", x + w - 12, hy + h / 2);
      }
    }

    // ── Alt Bar: Konsol İpucu ve Sistem Durumu ────────────────────────────
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#718994"; ctx.font = uiTitleFont(10, 600);
    ctx.fillText("‹ " + t("menu.hint", "Fare ile bir bölme seç") + " ›", W / 2, H - 18);

    // Sağ alt: Sistem Hazır Rozeti & Sürüm
    if (typeof GAME_VERSION !== "undefined") {
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      const footY = H - 18;
      // Yeşil canlı durum ledi
      ctx.fillStyle = "#63e6be";
      ctx.font = uiTitleFont(9, 700);
      ctx.fillText("● " + t("menu.status.ready", "SİSTEM HAZIR") + "  |  v" + GAME_VERSION + (typeof GAME_CHANNEL === "undefined" ? "" : " · " + GAME_CHANNEL), W - 18, footY);
    }
  }

  // ── Zorluk seçimi (DIFFICULTY_SELECT) ────────────────────────────────────
  // Bilgisayara karşı modunda zorluk seviyesi seçilir.
  renderDifficultySelect(ctx) {
    const W = this.W, H = this.H;
    const timeMs = this.renderTimeMs || 0;
    drawClouds(ctx, W, "rgba(190,215,240,0.14)");
    _msBackdrop(ctx, W, H, timeMs);

    // Başlık Bölgesi
    const titleY = Math.max(26, Math.round(H * 0.12));
    const titleText = t("mode.difficulty.title", "Zorluk seç");

    // Başlık aurası
    const tglow = ctx.createRadialGradient(W / 2, titleY + 20, 6, W / 2, titleY + 20, 220);
    tglow.addColorStop(0, "rgba(244, 189, 98, 0.16)");
    tglow.addColorStop(0.55, "rgba(113, 211, 189, 0.035)");
    tglow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tglow;
    ctx.fillRect(W / 2 - 240, titleY - 14, 480, 72);

    // Üst mikro damga
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(113, 211, 189, 0.65)";
    ctx.font = uiTitleFont(10, 700);
    ctx.fillText("PROT-9 // AI SIMULATION CALIBRATION", W / 2, titleY);

    // Ana Başlık
    ctx.font = uiTitleFont(Math.min(34, Math.round(W * 0.04)), 700);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillText(titleText, W / 2 + 2, titleY + 16);
    ctx.fillStyle = "#ffe45e";
    ctx.shadowColor = "rgba(255, 228, 94, 0.42)";
    ctx.shadowBlur = 10;
    ctx.fillText(titleText, W / 2, titleY + 14);
    ctx.shadowBlur = 0;

    // Başlık altı dekoratif tehlike şeridi
    _csHazardStrip(ctx, W / 2 - 120, titleY + 52, 240, 3);

    // Slogan
    ctx.fillStyle = "#a2b8c2";
    ctx.font = uiTextFont(12, 600);
    ctx.fillText("// " + t("mode.difficulty.sub", "Yapay zeka muharebe kalibrasyonunu seç") + " //", W / 2, titleY + 60);

    const diffs = [
      { id: "easy", label: t("difficulty.easy", "Kolay"), accent: "#63e6be", badge: "LVL 1", sub: t("difficulty.desc.easy", "Düşük isabet, acemi pilotlar için ideal") },
      { id: "normal", label: t("difficulty.normal", "Orta"), accent: "#4aa3ff", badge: "LVL 2", sub: t("difficulty.desc.normal", "Dengeli atışlar ve makul refleks") },
      { id: "hard", label: t("difficulty.hard", "Zor"), accent: "#f4bd62", badge: "LVL 3", sub: t("difficulty.desc.hard", "Yüksek isabet ve agresif manevra") },
      { id: "expert", label: t("difficulty.expert", "Ustalık"), accent: "#ff5a5a", badge: "LVL 4", sub: t("difficulty.desc.expert", "Mükemmel balistik hesaplama") },
    ];

    const bw = Math.min(182, Math.floor((W - 80) / 4)), bh = 142, gap = 16;
    const totalW = diffs.length * bw + (diffs.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const y = Math.round(H / 2 - 36);

    this._diffRects = [];
    const mx = this.input.mouseX, my = this.input.mouseY;

    for (let i = 0; i < diffs.length; i++) {
      const it = diffs[i];
      const x = startX + i * (bw + gap);
      const sel = this.difficulty === it.id;
      const hovered = mx >= x && mx <= x + bw && my >= y && my <= y + bh;
      const hy = hovered ? y - 3 : y;
      this._diffRects.push({ x, y, w: bw, h: bh, diff: it.id });

      _csPanel(ctx, x, hy, bw, bh, {
        accent: sel ? it.accent : hovered ? "#ffe45e" : "#2a3848",
        hover: hovered, glow: sel || hovered,
        selected: sel,
        fillTop: sel ? _hexA(it.accent, 0.16) : hovered ? "rgba(255,228,94,0.06)" : null,
      });

      // Kart üstü renkli şerit
      ctx.fillStyle = sel ? it.accent : hovered ? "#ffe45e" : _hexA(it.accent, 0.65);
      ctx.fillRect(x + 10, hy + 1, bw - 20, 2.5);

      // Sağ üst köşe rozeti
      const badgeW = 46, badgeH = 17;
      const badgeX = x + bw - badgeW - 8, badgeY = hy + 8;
      ctx.fillStyle = sel ? _hexA(it.accent, 0.25) : "rgba(0,0,0,0.45)";
      ctx.strokeStyle = _hexA(it.accent, sel ? 0.9 : 0.4);
      ctx.lineWidth = 1;
      _panelPath(ctx, badgeX, badgeY, badgeW, badgeH, 3);
      ctx.fill(); ctx.stroke();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = uiTitleFont(9.5, 700);
      ctx.fillStyle = sel ? "#ffffff" : it.accent;
      ctx.fillText(it.badge, badgeX + badgeW / 2, badgeY + badgeH / 2);

      // Başlık
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.font = uiTitleFont(18, 700);
      ctx.fillStyle = sel ? "#ffffff" : hovered ? "#ffffff" : "#eef5ff";
      ctx.fillText(it.label, x + 14, hy + 38);

      // Açıklama
      ctx.fillStyle = sel ? "#cfe0ee" : "#8fa6bd";
      ctx.font = uiTextFont(11, 500);
      const subLines = _wrapCanvasText(ctx, it.sub, bw - 26);
      subLines.forEach((line, row) => ctx.fillText(line, x + 14, hy + 66 + row * 15));

      // Durum alt etiketi
      if (sel) {
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = uiTitleFont(10, 700);
        ctx.fillStyle = it.accent;
        ctx.fillText("✓ " + t("common.selected", "SEÇİLİ"), x + bw / 2, hy + bh - 14);
      } else if (hovered) {
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = uiTitleFont(9.5, 700);
        ctx.fillStyle = "#ffe45e";
        ctx.fillText(t("menu.card.enter", "BAŞLAT ➔"), x + bw / 2, hy + bh - 14);
      }
    }

    // Geri butonu
    this.drawBackButton(ctx, t("common.back", "‹ Geri"));
  }

  handleDifficultySelectClick(mx, my) {
    // Zorluk butonları
    for (const r of this._diffRects || []) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        SFX.uiClick();
        this.difficulty = r.diff;
        this.bot.difficulty = r.diff;
        this.state = "BOT_COUNT_SELECT";
        this.updateHud();
        return;
      }
    }
    // Geri → mod seçimine dön
    if (this.hitBackButton(mx, my)) {
      SFX.uiClick();
      this.state = "MODE_SELECT";
      this.updateHud();
      return;
    }
  }

  // ── Bot sayısı seçimi (BOT_COUNT_SELECT) ─────────────────────────────────
  // Bilgisayar modunda kaç rakip bot olacağını seç.
  renderBotCountSelect(ctx) {
    const W = this.W, H = this.H;
    const timeMs = this.renderTimeMs || 0;
    drawClouds(ctx, W, "rgba(190,215,240,0.14)");
    _msBackdrop(ctx, W, H, timeMs);

    // Başlık Bölgesi
    const titleY = Math.max(26, Math.round(H * 0.12));
    const titleText = t("mode.botCount.title", "Rakip sayısı seç");

    // Başlık aurası
    const tglow = ctx.createRadialGradient(W / 2, titleY + 20, 6, W / 2, titleY + 20, 220);
    tglow.addColorStop(0, "rgba(244, 189, 98, 0.16)");
    tglow.addColorStop(0.55, "rgba(113, 211, 189, 0.035)");
    tglow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tglow;
    ctx.fillRect(W / 2 - 240, titleY - 14, 480, 72);

    // Üst mikro damga
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(113, 211, 189, 0.65)";
    ctx.font = uiTitleFont(10, 700);
    ctx.fillText("PROT-9 // UNIT ASSIGNMENT PROTOCOL", W / 2, titleY);

    // Ana Başlık
    ctx.font = uiTitleFont(Math.min(34, Math.round(W * 0.04)), 700);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillText(titleText, W / 2 + 2, titleY + 16);
    ctx.fillStyle = "#ffe45e";
    ctx.shadowColor = "rgba(255, 228, 94, 0.42)";
    ctx.shadowBlur = 10;
    ctx.fillText(titleText, W / 2, titleY + 14);
    ctx.shadowBlur = 0;

    // Başlık altı dekoratif tehlike şeridi
    _csHazardStrip(ctx, W / 2 - 120, titleY + 52, 240, 3);

    // Slogan
    ctx.fillStyle = "#a2b8c2";
    ctx.font = uiTextFont(12, 600);
    ctx.fillText("// " + t("mode.botCount.sub", "Simülasyona dahil edilecek rakip robot sayısı") + " //", W / 2, titleY + 60);

    const counts = [
      { count: 1, title: t("opponents.1", "1 Rakip"), tag: "1v1 DÜELLO", accent: "#4aa3ff", sub: t("opponents.1.desc", "Birebir taktiksel düello"), bots: 1 },
      { count: 2, title: t("opponents.2", "2 Rakip"), tag: "3'LÜ KARIŞIK", accent: "#f4bd62", sub: t("opponents.2.desc", "Üçlü çapraz ateş mücadelesi"), bots: 2 },
      { count: 3, title: t("opponents.3", "3 Rakip"), tag: "4'LÜ KAOS", accent: "#ff5a5a", sub: t("opponents.3.desc", "Dörtlü tam saha serbest arbede"), bots: 3 },
    ];

    const bw = Math.min(210, Math.floor((W - 80) / 3)), bh = 146, gap = 20;
    const totalW = counts.length * bw + (counts.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const y = Math.round(H / 2 - 36);

    this._botCountRects = [];
    const mx = this.input.mouseX, my = this.input.mouseY;

    for (let i = 0; i < counts.length; i++) {
      const it = counts[i];
      const x = startX + i * (bw + gap);
      const hovered = mx >= x && mx <= x + bw && my >= y && my <= y + bh;
      const hy = hovered ? y - 3 : y;
      this._botCountRects.push({ x, y, w: bw, h: bh, count: it.count });

      _csPanel(ctx, x, hy, bw, bh, {
        accent: hovered ? "#ffe45e" : it.accent,
        hover: hovered, glow: hovered,
        fillTop: hovered ? "rgba(255,228,94,0.06)" : _hexA(it.accent, 0.05),
      });

      // Kart üstü renkli şerit
      ctx.fillStyle = hovered ? "#ffe45e" : _hexA(it.accent, 0.75);
      ctx.fillRect(x + 10, hy + 1, bw - 20, 2.5);

      // Sağ üst köşe rozeti (Badge)
      const badgeW = 76, badgeH = 17;
      const badgeX = x + bw - badgeW - 8, badgeY = hy + 8;
      ctx.fillStyle = hovered ? _hexA(it.accent, 0.25) : "rgba(0,0,0,0.45)";
      ctx.strokeStyle = _hexA(it.accent, hovered ? 0.9 : 0.4);
      ctx.lineWidth = 1;
      _panelPath(ctx, badgeX, badgeY, badgeW, badgeH, 3);
      ctx.fill(); ctx.stroke();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = uiTitleFont(9, 700);
      ctx.fillStyle = hovered ? "#ffffff" : it.accent;
      ctx.fillText(it.tag, badgeX + badgeW / 2, badgeY + badgeH / 2);

      // Başlık
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.font = uiTitleFont(20, 700);
      ctx.fillStyle = hovered ? "#ffffff" : "#eef5ff";
      ctx.fillText(it.title, x + 14, hy + 40);

      // Açıklama
      ctx.fillStyle = hovered ? "#cfe0ee" : "#8fa6bd";
      ctx.font = uiTextFont(11, 500);
      const subLines = _wrapCanvasText(ctx, it.sub, bw - 26);
      subLines.forEach((line, row) => ctx.fillText(line, x + 14, hy + 70 + row * 15));

      // Hover alt etiketi
      if (hovered) {
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = uiTitleFont(9.5, 700);
        ctx.fillStyle = "#ffe45e";
        ctx.fillText(t("menu.card.enter", "BAŞLAT ➔"), x + bw / 2, hy + bh - 14);
      }
    }

    // Geri butonu
    this.drawBackButton(ctx, t("common.back", "‹ Geri"));
  }

  handleBotCountSelectClick(mx, my) {
    // Bot sayısı butonları
    for (const r of this._botCountRects || []) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        SFX.uiClick();
        const totalPlayers = 1 + r.count; // 1 insan + r.count bot
        this.beginCharSelect(totalPlayers);
        // İlk oyuncu insan, kalanlar bot
        this.playerControls = ["human", ...new Array(r.count).fill("bot")];
        // Bot kontrolcülerini kur
        this.bots = [];
        for (let i = 0; i < r.count; i++) {
          const bot = new BotController();
          bot.difficulty = this.difficulty;
          this.bots.push(bot);
        }
        return;
      }
    }
    // Geri → zorluk seçimine dön
    if (this.hitBackButton(mx, my)) {
      SFX.uiClick();
      this.state = "DIFFICULTY_SELECT";
      this.updateHud();
      return;
    }
  }

  openSettings(tab) {
    if (typeof GameSettings !== "undefined") GameSettings.open(tab);
  }

  // ── Atölye (WORKSHOP) ────────────────────────────────────────────────
  // Kalıcı profil üzerinde geliştirme satın alınan ayrı durum. Ana menüden
  // açılır; maç sonu overlay'inden de buraya geçilebilir.
  openWorkshop() {
    this.portalGameplay(false);
    if (!this.workshopSelectedId || !CHARACTERS.some((c) => c.id === this.workshopSelectedId)) {
      const humanId = this.selectedChars && this.selectedChars[0] ? this.selectedChars[0].id : null;
      this.workshopSelectedId = humanId || CHARACTERS[0].id;
    }
    this.workshopPage = this._workshopPageOf(this.workshopSelectedId);
    this.workshopBranch = BRANCHES[0];
    this.workshopFx = null;
    this.workshopNotice = null;
    // Mod hatırlanır (GELİŞTİRME/Parçalar); yuva paneli her açılışta kapalı
    // başlar ki oyuncu önce yuvaları görsün.
    this.workshopMode = this.workshopMode === "parts" ? "parts" : "upgrades";
    this.workshopSlot = PART_SLOTS.includes(this.workshopSlot) ? this.workshopSlot : PART_SLOTS[0];
    this.workshopSlotIndex = this.workshopSlotIndex === 1 ? 1 : 0; // alt yuva (0|1)
    this.workshopSlotOpen = false;
    this.workshopPartCursor = 0;
    this.workshopPartPage = 0;
    // Maç sonu overlay'inden gelinmiş olabilir: overlay ve bekleyen girdi kapanır.
    hideOverlay();
    this.clearTurnInput();
    this.state = "WORKSHOP";
    this.updateHud();
  }

  closeWorkshop() {
    this.workshopFx = null;
    this.workshopNotice = null;
    this.workshopSlotOpen = false;
    this.state = "MODE_SELECT";
    this.updateHud();
  }

  // Atölye ekranının o anki dünya genişliğine (W) göre duyarlı (responsive)
  // yerleşimi. Sol ızgara (robot kartları ve sayfalama) ile sağ detay paneli
  // (seviye/geliştirme/parçalar) arasındaki dengeyi sağlar.
  //
  // Standart genişlikte (W=960) 4 sütun x 4 satır = 16 robot/sayfa korunur.
  // Dar ekranda (W < 760, örn. 4:3 veya tablet) kart okunabilirliği için 3 sütun
  // x 4 satır = 12 robot/sayfa seçilir ve sağ panel sıkışmaz.
  // Çok geniş ekranlarda (örn. 21:9 ultrawide) aşırı yayılmayı önlemek için içerik
  // ortalanır.
  workshopLayout() {
    const W = this.W || 960;
    const H = this.H || 540;
    const gy = 66;

    const margin = Math.max(14, Math.min(24, Math.round(W * 0.025)));
    const colGap = Math.max(10, Math.min(18, Math.round(W * 0.016)));

    const maxTotalW = 1040;
    const totalW = Math.min(W - margin * 2, maxTotalW);
    const startX = Math.round((W - totalW) / 2);

    let cols = 4;
    if (totalW < 500) cols = 2;
    else if (totalW < 760) cols = 3;

    const rows = WS_ROWS;
    const perPage = cols * rows;

    const minRw = Math.min(300, Math.floor(totalW * 0.46));
    const splitRatio = cols === 4 ? 0.51 : cols === 3 ? 0.49 : 0.46;
    let targetGridW = Math.round((totalW - colGap) * splitRatio);
    if (totalW - colGap - targetGridW < minRw) {
      targetGridW = totalW - colGap - minRw;
    }

    const cardGap = Math.max(6, Math.min(8, Math.round(targetGridW * 0.018)));
    const cardW = Math.floor((targetGridW - (cols - 1) * cardGap) / cols);
    const gridW = cols * cardW + (cols - 1) * cardGap;
    const gx = startX;

    const rx = gx + gridW + colGap;
    const rw = totalW - gridW - colGap;
    const panelH = Math.min(WS_PANEL_H, H - gy - 20);

    return {
      gx, gy, gridW, cols, rows, perPage,
      cardW, cardH: 92, cardGap,
      rx, rw, panelH, colGap,
      startX, totalW
    };
  }

  _workshopPageOf(id) {
    const idx = CHARACTERS.findIndex((c) => c.id === id);
    const perPage = this.workshopLayout ? this.workshopLayout().perPage : (WS_COLS * WS_ROWS);
    return idx >= 0 ? Math.floor(idx / perPage) : 0;
  }

  // Satın alma/takma sonrası kısa "metal montaj" parıltısı ve geri bildirim
  // yazısı her karede söner.
  updateWorkshopFx(dt) {
    if (this.workshopFx) {
      this.workshopFx.t += dt;
      if (this.workshopFx.t > WS_FX_DURATION) this.workshopFx = null;
    }
    if (this.workshopNotice) {
      this.workshopNotice.t += dt;
      if (this.workshopNotice.t > WS_NOTICE_DURATION) this.workshopNotice = null;
    }
  }

  // Seçili dal için geliştirmeyi satın al. Önkoşullar profile.js'te doğrulanır;
  // arayüz doğrudan bakiye düşmez.
  purchaseWorkshopUpgrade() {
    const id = this.workshopSelectedId;
    if (!id) return;
    // Model kilitliyse önce kilit açma (satın alma) denenir
    if (!isRobotUnlocked(this.profile, id)) {
      const buy = unlockRobot(this.profile, id);
      if (!buy.ok) {
        if (typeof SFX !== "undefined" && SFX.buzzer) SFX.buzzer();
        return;
      }
      this.profile = buy.profile;
      if (typeof SFX !== "undefined" && SFX.upgradeTier) SFX.upgradeTier();
      if (!buy.persisted) notifyStorageFailure();
      this.updateHud();
      return;
    }
    const res = purchaseUpgrade(this.profile, id, this.workshopBranch);
    if (!res.ok) {
      if (res.reason === "LEVEL_REQUIRED" || res.reason === "SCRAP_REQUIRED") SFX.uiClick();
      return;
    }
    this.profile = res.profile;
    this.workshopFx = { branch: this.workshopBranch, t: 0 };
    SFX.weaponSwitch(); // kısa metal montaj klik'i
    if (!res.persisted) notifyStorageFailure();
    this.updateHud();
  }

  // Mod değiştir (GELİŞTİRME ↔ PARÇALAR). Açık yuva listesi kapanır; montaj
  // efekti modlar arasında taşınmaz (yanlış panele bağlanmasın).
  switchWorkshopMode(mode) {
    const next = mode === "parts" ? "parts" : "upgrades";
    if (next === (this.workshopMode === "parts" ? "parts" : "upgrades")) return;
    SFX.uiClick();
    this.workshopMode = next;
    this.workshopSlotOpen = false;
    this.workshopSlotIndex = 0;
    this.workshopPartCursor = 0;
    this.workshopFx = null;
  }

  // Alt yuva seçimi (sol/sağ tuşları): yuva başına PARTS_PER_SLOT hücre.
  selectWorkshopSlotIndex(dir) {
    const next = dir < 0 ? 0 : PARTS_PER_SLOT - 1;
    if (next === (this.workshopSlotIndex || 0)) return;
    SFX.uiClick();
    this.workshopSlotIndex = next;
    this.workshopPartCursor = 0;
  }

  // Parça modunda yuva seçimi (\u2191/\u2193 tuşları ve tıklama).
  selectWorkshopSlot(dir) {
    const i = PART_SLOTS.indexOf(this.workshopSlot);
    const next = PART_SLOTS[(i + dir + PART_SLOTS.length) % PART_SLOTS.length];
    if (next === this.workshopSlot) return;
    SFX.uiClick();
    this.workshopSlot = next;
    this.workshopPartCursor = 0;
  }

  // Seçili robotun bir yuvasındaki SAHİP OLUNAN parçalar (katalog sırası).
  workshopSlotParts(slot) {
    const owned = getOwnedParts(this.profile);
    return PARTS.filter((p) => p.slot === slot && owned.includes(p.id));
  }

  // Yuva listesi satırları: sahip olunan parçalar + her zaman son t("workshop.clearSlot", "Boş bırak").
  _workshopSlotRows(slot) {
    const rows = this.workshopSlotParts(slot).map((p) => ({ partId: p.id, part: p }));
    rows.push({ partId: null, part: null });
    return rows;
  }

  openWorkshopSlot(slot, index) {
    if (!PART_SLOTS.includes(slot)) return;
    SFX.uiClick();
    this.workshopSlot = slot;
    this.workshopSlotIndex = index === 1 ? 1 : 0;
    this.workshopSlotOpen = true;
    this.workshopPartCursor = 0;
    this.workshopPartPage = 0;
  }

  closeWorkshopSlot() {
    SFX.uiClick();
    this.workshopSlotOpen = false;
    this.workshopPartCursor = 0;
    this.workshopPartPage = 0;
  }

  // Liste sayfa boyu: yuva başına 6 parça + t("workshop.clearSlot", "Boş bırak") = 7 satır; panel
  // alanına 4 satır sığdığı için liste sayfalanır (imleç sayfayı da kaydırır).
  _workshopPartPageSize() { return 4; }

  _moveWorkshopPartCursor(dir) {
    const rows = this._workshopSlotRows(this.workshopSlot);
    const next = Math.max(0, Math.min((this.workshopPartCursor || 0) + dir, rows.length - 1));
    if (next === this.workshopPartCursor) return;
    SFX.uiClick();
    this.workshopPartCursor = next;
    this.workshopPartPage = Math.floor(next / this._workshopPartPageSize());
  }

  _workshopNotice(text, color) {
    this.workshopNotice = { text, color, t: 0 };
  }

  // Parçayı seçili robotun seçili yuvasına tak / sök (partId null → sökme).
  // Kurallar parts.js'te (equipPart) doğrulanır; parça başka robottaysa tek
  // adımda taşınır ve bildirim bunu söyler.
  applyWorkshopPart(partId) {
    const id = this.workshopSelectedId;
    const slot = this.workshopSlot;
    const slotIndex = this.workshopSlotIndex || 0;
    if (!id || !PART_SLOTS.includes(slot)) return;
    const res = equipPart(this.profile, id, slot, partId, { index: slotIndex });
    if (!res.ok) {
      let msg = t("workshop.failEquip", "Takma başarısız");
      if (res.reason === "NOT_OWNED") msg = t("workshop.notOwned", "Bu parça envanterde yok");
      else if (res.reason === "SLOT_MISMATCH") msg = t("workshop.slotMismatch", "Parça bu yuvaya uymuyor");
      else if (res.reason === "INVALID_INDEX") msg = t("workshop.invalidIndex", "Geçersiz alt yuva");
      this._workshopNotice(msg, "#ff9b9b");
      SFX.uiClick();
      return;
    }
    if (res.changed) {
      this.profile = res.profile;
      this.workshopFx = { slot, t: 0 };
      SFX.partMount(); // parça montaj imzası (metal klik + yay)
      if (!res.persisted) notifyStorageFailure();
      // Parçalar robota kilitli değildir: başka robotlarda takılı kalır.
      const where = t("workshop.slotWhere", "{slot} {index}", { slot: slotLabel(slot), index: slotIndex + 1 });
      const msg = partId
        ? t("workshop.equipped", "{part} takıldı ({where})", { part: partById(partId).label, where })
        : t("workshop.cleared", "{where} yuvası boşaltıldı", { where });
      this._workshopNotice(msg, "#8affc0");
      this.updateHud();
    }
    this.workshopSlotOpen = false;
    this.workshopPartCursor = 0;
  }

  handleWorkshopKey(e) {
    if (this.state !== "WORKSHOP") return false;
    const mode = this.workshopMode === "parts" ? "parts" : "upgrades";
    // Mod değiştirme: 1/2 (pazar sekmeleriyle aynı dil) veya Tab.
    if (e.key === "1") { this.switchWorkshopMode("upgrades"); return true; }
    if (e.key === "2") { this.switchWorkshopMode("parts"); return true; }
    if (e.key === "Tab") { e.preventDefault(); this.switchWorkshopMode(mode === "parts" ? "upgrades" : "parts"); return true; }
    if (mode === "parts") {
      // Açık listede \u2191/\u2193 imleci gezer, kapalıyken yuva seçer.
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        if (this.workshopSlotOpen) this._moveWorkshopPartCursor(-1); else this.selectWorkshopSlot(-1);
        return true;
      }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        if (this.workshopSlotOpen) this._moveWorkshopPartCursor(1); else this.selectWorkshopSlot(1);
        return true;
      }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        if (!this.workshopSlotOpen) this.selectWorkshopSlotIndex(-1);
        return true;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        if (!this.workshopSlotOpen) this.selectWorkshopSlotIndex(1);
        return true;
      }
      if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        if (this.workshopSlotOpen) {
          const rows = this._workshopSlotRows(this.workshopSlot);
          const row = rows[Math.max(0, Math.min(this.workshopPartCursor || 0, rows.length - 1))];
          this.applyWorkshopPart(row ? row.partId : null);
        } else {
          this.openWorkshopSlot(this.workshopSlot, this.workshopSlotIndex || 0);
        }
        return true;
      }
      return false;
    }
    // Geliştirme modu: mevcut harita aynen.
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { this.changeWorkshopPage(-1); return true; }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { this.changeWorkshopPage(1); return true; }
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { this.selectWorkshopBranch(-1); return true; }
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { this.selectWorkshopBranch(1); return true; }
    if (e.key === "Enter" || e.code === "Space") { e.preventDefault(); this.purchaseWorkshopUpgrade(); return true; }
    return false;
  }

  changeWorkshopPage(dir) {
    const perPage = this.workshopLayout ? this.workshopLayout().perPage : (WS_COLS * WS_ROWS);
    const totalPages = Math.max(1, Math.ceil(CHARACTERS.length / perPage));
    const next = this.workshopPage + dir;
    if (next < 0 || next > totalPages - 1) return;
    SFX.uiClick();
    this.workshopPage = next;
  }

  selectWorkshopBranch(dir) {
    const i = BRANCHES.indexOf(this.workshopBranch);
    const next = BRANCHES[(i + dir + BRANCHES.length) % BRANCHES.length];
    if (next === this.workshopBranch) return;
    SFX.uiClick();
    this.workshopBranch = next;
  }

  renderWorkshop(ctx) {
    const W = this.W, H = this.H;
    const timeMs = this.renderTimeMs || 0;
    drawClouds(ctx, W, "rgba(190,215,240,0.14)");
    _msBackdrop(ctx, W, H, timeMs);

    const safeTopPad = Math.max(120, this.hudRightInset || 0);

    // Başlık aurası
    const tglow = ctx.createRadialGradient(W / 2, 22, 6, W / 2, 22, 200);
    tglow.addColorStop(0, "rgba(244, 189, 98, 0.16)");
    tglow.addColorStop(0.55, "rgba(113, 211, 189, 0.035)");
    tglow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tglow;
    ctx.fillRect(W / 2 - 220, 2, 440, 56);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(113, 211, 189, 0.65)";
    ctx.font = uiTitleFont(9.5, 700);
    ctx.fillText("PROT-9 // ENGINEERING BAY", W / 2, 8);

    ctx.fillStyle = "#ffe45e";
    ctx.font = uiTitleFont(Math.min(26, Math.max(20, Math.round(W * 0.028))), 700);
    ctx.shadowColor = "rgba(255, 228, 94, 0.42)";
    ctx.shadowBlur = 8;
    ctx.fillText(t("workshop.title", "ATÖLYE"), W / 2, 19);
    ctx.shadowBlur = 0;

    _csHazardStrip(ctx, W / 2 - 100, 43, 200, 2.5);

    ctx.fillStyle = "#9fb6c9";
    ctx.font = uiTextFont(Math.min(12, Math.max(10, Math.round(W * 0.013))));
    const maxSubW = Math.max(240, W - safeTopPad * 2);
    ctx.fillText(this.workshopMode === "parts"
      ? t("workshop.subtitleParts", "Parça tak — parçalar geliştirmelerle aynı maç kapsamında etkindir")
      : t("workshop.subtitleUpgrades", "Robotlarını kalibre et — geliştirmeler yalnız bilgisayara karşı maçta etkindir"), W / 2, 49, maxSubW);

    const scrap = this.profile ? this.profile.scrap : START_SCRAP;
    const L = this.workshopLayout();
    const perPage = L.perPage;
    const totalPages = Math.max(1, Math.ceil(CHARACTERS.length / perPage));
    this.workshopPage = Math.max(0, Math.min(this.workshopPage, totalPages - 1));
    const pageStart = this.workshopPage * perPage;
    const pageChars = CHARACTERS.slice(pageStart, pageStart + perPage);

    // ── Sol: sayfalı robot grid'i ──────────────────────────────────────
    const gx = L.gx, gy = L.gy, gridW = L.gridW, cols = L.cols, rows = L.rows;
    const cardW = L.cardW, cardH = L.cardH, gap = L.cardGap;
    const mx = this.input.mouseX, my = this.input.mouseY;
    this._workshopCardRects = [];

    for (let i = 0; i < pageChars.length; i++) {
      const ch = pageChars[i];
      const col = i % cols, row = (i / cols) | 0;
      const cx = gx + col * (cardW + gap);
      const cy = gy + row * (cardH + gap);
      this._workshopCardRects.push({ x: cx, y: cy, w: cardW, h: cardH, ch });
      const up = getRobotProgress(this.profile, ch.id);
      const selected = ch.id === this.workshopSelectedId;
      const hovered = mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH;

      // Endüstriyel panel kart; hover'da 2px yukarı (hit alanı sabit).
      // Seçili robot yeşil kenar + hafif yeşil tint ile vurgulanır.
      const cyv = cy + (hovered ? -2 : 0);
      _csPanel(ctx, cx, cyv, cardW, cardH, {
        accent: selected ? "#63e6be" : hovered ? "#ffe45e" : "#2a3848",
        hover: hovered, glow: hovered, selected,
        fillTop: selected ? "#1b2b1f" : null, fillBottom: selected ? "#122015" : null,
      });

      // Kart üstü robot rengi şerit
      ctx.fillStyle = hovered ? ch.color : _hexA(ch.color, 0.75);
      ctx.fillRect(cx + 6, cyv + 1, cardW - 12, 2);

      drawRobot(ctx, {
        cx: cx + cardW / 2, cy: cyv + 31, r: 15, facing: 1, charDef: ch,
        timeMs: this.renderTimeMs || 0, motion: { vx: 0, vy: 0, onGround: true },
        upgradeVisuals: { attachmentGlow: sanitizeUpgrades(up).module >= 3 },
        parts: up.loadout,
      });

      ctx.fillStyle = ch.color;
      ctx.font = uiTextFont(Math.min(12, Math.max(10.5, Math.round(cardW * 0.11))), 700);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(ch.label, cx + cardW / 2, cyv + 59, cardW - 8);
      ctx.fillStyle = "#9fb6c9";
      ctx.font = uiTextFont(Math.min(9, Math.max(8.5, Math.round(cardW * 0.085))));
      ctx.fillText(t("workshop.robotCardMeta", "Sv. {level} • {tiers}/9", { level: levelForXp(up.xp), tiers: totalTiers(up) }), cx + cardW / 2, cyv + 74, cardW - 8);

      // Kilitli kart simgesi
      if (!isRobotUnlocked(this.profile, ch.id)) {
        ctx.fillStyle = "rgba(10, 16, 24, 0.60)";
        _csRoundRect(ctx, cx, cyv, cardW, cardH, 4);
        ctx.fill();
        ctx.font = uiTitleFont(13);
        ctx.fillStyle = "#ff6b6b";
        ctx.fillText("🔒", cx + cardW - 10, cyv + 10);
      }
    }

    // Sayfa gezinme (klavye ve fare ile aynı işlevi görür)
    // Sol sayfalama çubuğunun alt hizası, sağ panelin alt kenarı (gy + panelH) ile eşitlenir.
    this._workshopPageRects = [];
    const navH = 30;
    const navY = Math.max(gy + rows * cardH + (rows - 1) * gap + 8, gy + L.panelH - navH);
    const navW = Math.min(96, Math.max(70, Math.floor(gridW * 0.24)));
    const prev = { x: gx, y: navY, w: navW, h: navH, dir: -1 };
    const next = { x: gx + gridW - navW, y: navY, w: navW, h: navH, dir: 1 };
    this._workshopPageRects = [prev, next];
    for (const b of this._workshopPageRects) {
      const canUse = (b.dir < 0 && this.workshopPage > 0) || (b.dir > 0 && this.workshopPage < totalPages - 1);
      const hov = canUse && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
      ctx.globalAlpha = canUse ? 1 : 0.35;
      _csPanel(ctx, b.x, b.y, b.w, b.h, { accent: hov ? "#ffe45e" : "#2a3848", hover: hov, glow: hov, rivets: false });
      ctx.fillStyle = "#cfe0ee";
      ctx.font = uiTextFont(Math.min(13, Math.max(11, Math.round(navW * 0.13))), 700);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.dir < 0 ? t("common.back", "‹ Geri") : t("common.forward", "İleri ›"), b.x + b.w / 2, b.y + b.h / 2);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#9fb6c9";
    ctx.font = uiTextFont(Math.min(13, Math.max(11, Math.round(gridW * 0.035))), 700);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(t("common.page", "Sayfa {n} / {total}", { n: this.workshopPage + 1, total: totalPages }), gx + gridW / 2, navY + navH / 2);

    // ── Sağ: seçili robot detayı + üç dal paneli ──────────────────────
    const rx = L.rx, rw = L.rw, panelH = L.panelH;
    const def = CHARACTERS.find((c) => c.id === this.workshopSelectedId) || CHARACTERS[0];
    const up = getRobotProgress(this.profile, def.id);
    const level = levelForXp(up.xp);
    const nextXp = nextLevelXp(level);
    const curXp = up.xp - xpForLevel(level);
    const spanXp = nextXp != null ? nextXp - xpForLevel(level) : 1;
    const xpFrac = nextXp != null ? clampNumber(curXp / spanXp, 0, 1) : 1;

    // Sağ büyük panel: servis bölmesi — üst kenarında tehlike şeridi.
    _csPanel(ctx, rx, gy, rw, panelH, { accent: "#2a3848", hazardTop: true });

    drawRobot(ctx, {
      cx: rx + rw / 2, cy: gy + 62, r: def.r * 1.5, facing: 1, charDef: def,
      timeMs: this.renderTimeMs || 0, motion: { vx: 0, vy: 0, onGround: true },
      upgradeVisuals: { attachmentGlow: sanitizeUpgrades(up).module >= 3 },
      parts: up.loadout,
    });
    ctx.fillStyle = "#eef5ff";
    ctx.font = uiTitleFont(Math.min(18, Math.max(15, Math.round(rw * 0.045))));
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(t("workshop.robotMeta", "{label} · {role}", { label: def.label, role: def.role }), rx + rw / 2, gy + 100);

    ctx.fillStyle = "#ffd166";
    ctx.font = uiTextFont(Math.min(13, Math.max(11, Math.round(rw * 0.032))), 700);
    ctx.fillText(t("workshop.serviceLevel", "Servis Seviyesi {level}{suffix}", {
      level,
      suffix: nextXp != null ? ` — ${up.xp} / ${nextXp} XP` : t("workshop.masterService", " — Usta Servis"),
    }), rx + rw / 2, gy + 124);

    const barPad = Math.max(14, Math.round(rw * 0.05));
    const barX = rx + barPad, barW = rw - barPad * 2, barY = gy + 144;
    ctx.fillStyle = "#1e2a38";
    ctx.fillRect(barX, barY, barW, 7);
    ctx.fillStyle = "#63e6be";
    ctx.fillRect(barX, barY, barW * xpFrac, 7);

    // Hurda bakiyesi: satın alma sonrası kısa süre vurgulanır.
    const fxT = this.workshopFx ? this.workshopFx.t : WS_FX_DURATION;
    const pulse = Math.max(0, 1 - fxT / WS_FX_DURATION);
    ctx.fillStyle = `rgba(255,228,94,${0.75 + 0.25 * pulse})`;
    ctx.font = uiTitleFont(Math.round(Math.min(15, Math.max(12, rw * 0.033)) + 3 * pulse));
    ctx.fillText(t("common.scrap", "Hurda: {scrap}", { scrap }), rx + rw / 2, barY + 14);
    if (level >= 4) {
      ctx.fillStyle = "#8fa8ba";
      ctx.font = uiTextFont(Math.min(10, Math.max(9, Math.round(rw * 0.024))));
      ctx.fillText(t("workshop.stats", "Maç {matches} • Galibiyet {wins}", { matches: up.stats.matches, wins: up.stats.wins }), rx + rw / 2, barY + 36);
    }

    // Mod sekmeleri (sağ panelin tepesi): GELİŞTİRME ↔ PARÇALAR. İki modda da
    // görünür; pazar sekmeleriyle aynı dil (1/2 ve Tab tuşları da çalışır).
    this._renderWorkshopModeTabs(ctx, rx, gy, rw, mx, my);

    const isDefUnlocked = isRobotUnlocked(this.profile, def.id);
    if (!isDefUnlocked) {
      const spec = robotPriceSpec(def.id);
      const accXp = this.profile ? this.profile.accountXp : 0;
      const curAccLvl = levelForAccountXp(accXp);
      const canBuy = canUnlockRobot(this.profile, def.id);

      const panelBoxY = barY + 45;
      const panelBoxH = Math.max(140, gy + panelH - panelBoxY - 55);
      _csPanel(ctx, rx, panelBoxY, rw, panelBoxH, { accent: "#ff6b6b", fillTop: "#1c1418", fillBottom: "#120e10" });

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = uiTitleFont(30);
      ctx.fillStyle = "#ff6b6b";
      ctx.fillText("🔒", rx + rw / 2, panelBoxY + 35);

      ctx.font = uiTitleFont(14, 700);
      ctx.fillStyle = "#ff8888";
      ctx.fillText(t("workshop.modelLocked", "BU MODEL KİLİTLİ"), rx + rw / 2, panelBoxY + 70);

      ctx.font = uiTextFont(11.5);
      ctx.fillStyle = curAccLvl < spec.level ? "#ff8888" : "#8fd9c4";
      ctx.fillText(t("workshop.reqLevel", "Gereken Hesap Seviyesi: Sv. {req} (Mevcut: Sv. {cur})", { req: spec.level, cur: curAccLvl }), rx + rw / 2, panelBoxY + 98);

      ctx.font = uiTitleFont(13, 700);
      ctx.fillStyle = "#ffd166";
      ctx.fillText(t("workshop.reqPrice", "Fiyat: {price} 🔩 Hurda", { price: spec.price }), rx + rw / 2, panelBoxY + 120);

      // Buton
      const btn = { x: rx, y: panelBoxY + panelBoxH + 6, w: rw, h: Math.max(40, gy + panelH - (panelBoxY + panelBoxH + 6)), isUnlockBtn: true };
      this._workshopActionRect = btn;
      const ready = canBuy.ok;
      const hovBtn = ready && mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;
      _csPanel(ctx, btn.x, btn.y, btn.w, btn.h, {
        accent: ready ? "#63e6be" : "#3b4650",
        hover: hovBtn, glow: hovBtn,
        fillTop: ready ? (hovBtn ? "#1f513c" : "#173a2a") : "#161b20",
        fillBottom: ready ? (hovBtn ? "#142f24" : "#0f241c") : "#0e1216",
      });
      ctx.font = uiTitleFont(12, 700);
      ctx.fillStyle = ready ? "#d8fff1" : "#8b9aa5";
      const unlockBtnLabel = ready
        ? t("workshop.action.unlock", "{cost} 🔩 İLE ETKİNLEŞTİR", { cost: spec.price })
        : (curAccLvl < spec.level
          ? t("workshop.action.levelReq", "SEVİYE YETERSİZ (Sv. {level})", { level: spec.level })
          : t("workshop.action.scrapReq", "HURDA YETERSİZ ({cost} 🔩)", { cost: spec.price }));
      ctx.fillText(unlockBtnLabel, rx + rw / 2, btn.y + btn.h / 2);
    } else if (this.workshopMode === "parts") {
      this._renderWorkshopParts(ctx, rx, rw, gy, barY, level, def, up, mx, my);
    } else {
      this._workshopBranchRects = [];
      const panelHBranch = 58, panelGap = 6;
      let py = barY + (level >= 4 ? 54 : 36);
      for (const branch of BRANCHES) {
        const rect = { x: rx, y: py, w: rw, h: panelHBranch, branch };
        this._workshopBranchRects.push(rect);
        this._drawWorkshopBranch(ctx, rect, def, up, level, branch, mx, my);
        py += panelHBranch + panelGap;
      }

      // ── Eylem düğmesi: seçili dalın sonraki kademesini satın alır ─────
      const step = nextUpgradeStep(up, this.workshopBranch);
      const btn = { x: rx, y: py + 4, w: rw, h: Math.max(42, gy + panelH - (py + 4)) };
      this._workshopActionRect = btn;

      let label, reason = "", state;
      if (!step.ok) {
        state = "done";
        label = t("workshop.maxCalibration", "Tam Kalibrasyon");
        reason = t("workshop.branchDone", "Bu dal tamamlandı");
      } else if (level < step.requiredLevel) {
        state = "locked";
        label = t("workshop.action.locked", "{branch} — Kademe {tier} kilitli", { branch: branchLabel(this.workshopBranch), tier: romanTier(step.nextTier) });
        reason = t("workshop.reason.serviceLevel", "Servis Seviyesi {level} gerekli", { level: step.requiredLevel });
      } else if (scrap < step.cost) {
        state = "short";
        label = t("workshop.action.short", "{branch} — Kademe {tier} — {cost} Hurda", { branch: branchLabel(this.workshopBranch), tier: romanTier(step.nextTier), cost: step.cost });
        reason = t("workshop.reason.shortScrap", "{cost} Hurda eksik", { cost: step.cost - scrap });
      } else {
        state = "ready";
        label = t("workshop.action.upgrade", "{branch} — Kademe {tier} geliştir — {cost} Hurda", { branch: branchLabel(this.workshopBranch), tier: romanTier(step.nextTier), cost: step.cost });
      }
      const ready = state === "ready";
      const hovBtn = ready && mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;
      _csPanel(ctx, btn.x, btn.y, btn.w, btn.h, {
        accent: ready ? "#63e6be" : state === "done" ? "#3f7f68" : "#3b4650",
        hover: hovBtn, glow: hovBtn,
        fillTop: ready ? (hovBtn ? "#1f513c" : "#173a2a") : state === "done" ? "#131d1a" : "#161b20",
        fillBottom: ready ? (hovBtn ? "#142f24" : "#0f241c") : state === "done" ? "#0c1310" : "#0e1216",
      });

      const labelY = btn.y + Math.round(reason ? btn.h / 2 - 6.5 : btn.h / 2);
      let btnFontSize = Math.min(14, Math.max(11, Math.round(rw * 0.033)));
      ctx.font = uiTitleFont(btnFontSize);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const lockW = WS_LOCK_GLYPH_W + 7;
      let lw = ctx.measureText(label).width;
      const maxBtnTextW = btn.w - (state === "locked" ? lockW : 0) - 16;
      if (lw > maxBtnTextW) {
        btnFontSize = Math.max(10, Math.floor(btnFontSize * (maxBtnTextW / lw)));
        ctx.font = uiTitleFont(btnFontSize);
        lw = ctx.measureText(label).width;
      }
      const groupX = btn.x + (btn.w - (lw + (state === "locked" ? lockW : 0))) / 2;
      if (state === "locked") _csLockGlyph(ctx, groupX + WS_LOCK_GLYPH_W / 2, labelY, WS_LOCK_GLYPH_W, "#a9b8c3");
      ctx.fillStyle = ready ? "#d8fff1" : state === "done" ? "#a9d8c8" : "#8b9aa5";
      ctx.textAlign = "left";
      ctx.fillText(label, groupX + (state === "locked" ? lockW : 0), labelY);
      ctx.textAlign = "center";
      if (reason) {
        ctx.fillStyle = state === "done" ? "#7f9c92" : "#8fa8ba";
        ctx.font = uiTextFont(Math.min(10, Math.max(9, Math.round(rw * 0.024))));
        ctx.fillText(reason, btn.x + btn.w / 2, labelY + 15);
      }
    }

    // Geri bildirim (takma / sökme / taşıma sonucu) panel tabanına yakın söner.
    if (this.workshopNotice) {
      const n = this.workshopNotice;
      const a = Math.min(1, (WS_NOTICE_DURATION - n.t) / 0.35);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = n.color;
      ctx.font = uiTextFont(11, 700);
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText(n.text, rx + rw / 2, gy + panelH - 8);
      ctx.globalAlpha = 1;
    }

    // Geri butonu (Esc ile aynı işlev)
    this.drawBackButton(ctx, t("common.mainMenu", "‹ Ana Menü"));
  }

  // Tek bir dal paneli: kademe, etki, maliyet ve devre dışı olma nedeni aynı
  // anda görünür; durumlar yalnız renkle değil metinle de anlatılır.
  _drawWorkshopBranch(ctx, rect, def, up, level, branch, mx, my) {
    const step = nextUpgradeStep(up, branch);
    const selected = branch === this.workshopBranch;
    const hovered = mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h;
    const currentTier = sanitizeUpgrades(up)[branch];

    // Dal paneli: seçili yeşil tint + yeşil kenar; iç metinler köşelere
    // yaslı olduğu için perçin kapalı (çakışmasın).
    _csPanel(ctx, rect.x, rect.y, rect.w, rect.h, {
      accent: selected ? "#63e6be" : hovered ? "#ffe45e" : "#242f3b",
      hover: hovered, glow: hovered, selected, rivets: false,
      fillTop: selected ? "#18251d" : null, fillBottom: selected ? "#101a14" : null,
    });

    // Montaj parıltısı: yalnız bu dal satın alındıysa kısa süre görünür.
    if (selected && this.workshopFx && this.workshopFx.branch === branch) {
      const a = Math.max(0, 1 - this.workshopFx.t / WS_FX_DURATION);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = "#d8fff1";
      ctx.lineWidth = 3;
      _csRoundRect(ctx, rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 7);
      ctx.stroke();
      ctx.restore();
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#eef5ff";
    ctx.font = uiTextFont(Math.min(12, Math.max(10.5, Math.round(rect.w * 0.033))), 700);
    const tierText = step.ok ? t("workshop.tier", "Kademe {tier}", { tier: romanTier(step.nextTier) }) : t("workshop.maxCalibration", "Tam Kalibrasyon");
    ctx.fillText(t("workshop.branchPanel", "{branch} — {tier}", { branch: branchLabel(branch), tier: tierText }), rect.x + 10, rect.y + 7, rect.w - 20);

    ctx.fillStyle = "#8fd9c4";
    ctx.font = uiTextFont(Math.min(10, Math.max(9, Math.round(rect.w * 0.027))));
    const effect = upgradeEffectText(def, up, branch);
    ctx.fillText(effect, rect.x + 10, rect.y + 23, rect.w - 20);

    ctx.fillStyle = "#8fa8ba";
    ctx.font = uiTextFont(Math.min(9, Math.max(8.5, Math.round(rect.w * 0.025))));
    let status;
    if (!step.ok) {
      status = t("workshop.current.irreversible", "Mevcut: {tier} • geri alınamaz", { tier: romanTier(currentTier) });
    } else {
      status = t("workshop.current.needsLevel", "Mevcut: {tier} • Sv. {level} gerekli • {cost} Hurda",
        { tier: romanTier(currentTier), level: step.requiredLevel, cost: step.cost });
    }
    ctx.fillText(status, rect.x + 10, rect.y + 39, rect.w - 20);
  }

  // Mod sekmeleri (sağ panel tepesi). İki modda da çizilir; aktif sekme sarı,
  // pasif gri. Tıklama alanları _workshopModeRects'te toplanır.
  _renderWorkshopModeTabs(ctx, rx, gy, rw, mx, my) {
    const mode = this.workshopMode === "parts" ? "parts" : "upgrades";
    const tabs = [{ id: "upgrades", label: t("workshop.tab.upgrades", "GELİŞTİRME") }, { id: "parts", label: t("workshop.tab.parts", "PARÇALAR") }];
    const gap = 8;
    const w = Math.min(130, Math.max(90, Math.floor((rw - 28 - gap) / 2)));
    const h = 22;
    const y = gy + 7;
    const x0 = rx + (rw - (w * 2 + gap)) / 2;
    this._workshopModeRects = [];
    tabs.forEach((t, i) => {
      const x = x0 + i * (w + gap);
      this._workshopModeRects.push({ x, y, w, h, mode: t.id });
      const active = mode === t.id;
      const hov = mx >= x && mx <= x + w && my >= y && my <= y + h;
      _csPanel(ctx, x, y, w, h, {
        accent: active ? "#ffe45e" : hov ? "#7f93a5" : "#2a3848",
        hover: !active && hov, glow: active, rivets: false,
        fillTop: active ? "#2b2717" : null, fillBottom: active ? "#1a170d" : null,
      });
      ctx.fillStyle = active ? "#ffe45e" : "#9fb6c9";
      ctx.font = uiTextFont(Math.min(11, Math.max(9.5, Math.round(w * 0.09))), 700);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(t.label, x + w / 2, y + h / 2, w - 8);
    });
  }

  // ── Parçalar modu: 4 yuva paneli + açık listede seçim ──────────────────
  // Yuva paneli takılı parçayı ve envanterdeki seçenek sayısını gösterir.
  // Yuvaya tıklanınca (veya Enter) liste açılır: sahip olunan parçalar (etki
  // önizlemesiyle) + t("workshop.clearSlot", "Boş bırak"). Seçim anında uygulanır ve liste kapanır.
  // ── Parçalar modu: 4 yuva × PARTS_PER_SLOT alt yuva ─────────────────────
  // Her yuvanın İKİ alt yuvası vardır (şema v6): robot başına 8 parça. Yuva
  // satırında alt yuvalar yan yana hücrelerdir; hücreye tıklanınca (veya Enter)
  // O ALT YUVANIN listesi açılır. Liste, yuvanın sahip olunan parçalarını +
  // t("workshop.clearSlot", "Boş bırak") satırını gösterir ve bir parçanın hangi alt yuvada takılı
  // olduğunu yazar (aynı parça iki alt yuvada birden duramaz).
  _renderWorkshopParts(ctx, rx, rw, gy, barY, level, def, up, mx, my) {
    const panelH = 46, panelGap = 6;
    let py = barY + (level >= 4 ? 54 : 36);
    const loadout = sanitizeLoadoutShape(up.loadout);
    const inside = (r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
    this._workshopSlotRects = [];
    this._workshopPartRects = [];
    this._workshopSlotBackRect = null;

    if (this.workshopSlotOpen) {
      // ── Açık liste (sayfalı: 4 satır) ──────────────────────────────────
      const slot = this.workshopSlot;
      const slotIndex = this.workshopSlotIndex || 0;
      const rowsAll = this._workshopSlotRows(slot);
      const perPage = this._workshopPartPageSize();
      const totalPages = Math.max(1, Math.ceil(rowsAll.length / perPage));
      this.workshopPartPage = Math.max(0, Math.min(Math.floor((this.workshopPartCursor || 0) / perPage), totalPages - 1));
      const pageStart = this.workshopPartPage * perPage;
      const rows = rowsAll.slice(pageStart, pageStart + perPage);
      const equippedHere = loadout[slot][slotIndex] || null;

      // Başlık: yuva + ALT YUVA numarası + sayfa göstergesi + t("common.back", "‹ Geri")
      _csPanel(ctx, rx, py, rw, panelH, { accent: "#63e6be", rivets: false, fillTop: "#18251d", fillBottom: "#101a14" });
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#8affc0"; ctx.font = uiTextFont(12, 700);
      ctx.fillText(t("workshop.pickPart", "{slot} {index} — parça seç", { slot: slotLabel(slot), index: slotIndex + 1 }), rx + 10, py + panelH / 2);
      const backW = Math.min(74, Math.max(58, Math.floor(rw * 0.2)));
      const backH = 26;
      const back = { x: rx + rw - backW - 8, y: py + (panelH - backH) / 2, w: backW, h: backH };
      this._workshopSlotBackRect = back;
      if (totalPages > 1) {
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#8fa8ba"; ctx.font = uiTextFont(10);
        ctx.fillText(t("common.pageShort", "{n}/{total}", { n: this.workshopPartPage + 1, total: totalPages }), back.x - 10, py + panelH / 2);
      }
      const hovBack = inside(back);
      _csPanel(ctx, back.x, back.y, back.w, back.h, { accent: hovBack ? "#ffe45e" : "#2a3848", hover: hovBack, glow: hovBack, rivets: false });
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#cfe0ee"; ctx.font = uiTextFont(Math.min(12, Math.max(10.5, Math.round(backW * 0.16))), 700);
      ctx.fillText(t("common.back", "‹ Geri"), back.x + back.w / 2, back.y + back.h / 2);
      py += panelH + panelGap;

      // Bu yuvada hiç parça yoksa yönlendirme (Boş bırak satırı yine çizilir).
      if (rowsAll.length === 1) {
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#8fa8ba"; ctx.font = uiTextFont(10);
        ctx.fillText(t("workshop.noPartInInventory", "{slot} parçası envanterde yok — Pazar'dan al", { slot: slotLabel(slot) }), rx + 10, py + panelH / 2 - 8);
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const globalIndex = pageStart + i;
        const rect = { x: rx, y: py, w: rw, h: panelH, partId: row.partId, index: globalIndex };
        this._workshopPartRects.push(rect);
        const isCursor = globalIndex === (this.workshopPartCursor || 0);
        // Parça bu yuvanın hangi alt yuvasında? (-1 = hiçbirinde)
        const inSlotIdx = row.partId ? loadout[slot].indexOf(row.partId) : -1;
        const isEquippedHere = row.partId ? inSlotIdx === slotIndex : !equippedHere;
        const isElsewhere = row.partId ? inSlotIdx >= 0 && inSlotIdx !== slotIndex : false;
        const hov = inside(rect);
        _csPanel(ctx, rx, py, rw, panelH, {
          accent: isEquippedHere ? "#63e6be" : isCursor || hov ? "#ffe45e" : isElsewhere ? "#3f6e57" : "#242f3b",
          hover: hov, glow: hov, selected: isEquippedHere, rivets: false,
          fillTop: isEquippedHere ? "#18251d" : null, fillBottom: isEquippedHere ? "#101a14" : null,
        });

        if (row.part) {
          ctx.save();
          ctx.translate(rx + 8, py + 4);
          drawPartIcon(ctx, row.part, 38);
          ctx.restore();
        }
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillStyle = row.part ? "#eef5ff" : "#9fb6c9";
        ctx.font = uiTextFont(12, 700);
        const badgeW = isEquippedHere || isElsewhere ? 75 : 0;
        const textMaxW = rw - 58 - badgeW - 10;
        ctx.fillText(row.part ? row.part.label : t("workshop.clearSlot", "Boş bırak"), rx + 52, py + 6, textMaxW);
        ctx.fillStyle = "#8fd9c4"; ctx.font = uiTextFont(10);
        const detail = row.part
          ? (isEquippedHere ? row.part.desc : (partEffectText(def, up, row.partId, slotIndex) || row.part.desc))
          : t("workshop.clearSubSlot", "Bu alt yuvayı boşalt");
        ctx.fillText(detail, rx + 52, py + 23, textMaxW);

        let badge = "", badgeColor = "#63e6be";
        if (isEquippedHere) badge = t("workshop.partHere", "✓ burada");
        else if (isElsewhere) { badge = t("workshop.partInSlot", "✓ {index}. yuvada", { index: inSlotIdx + 1 }); badgeColor = "#8fd9c4"; }
        if (badge) {
          ctx.textAlign = "right"; ctx.textBaseline = "middle";
          ctx.fillStyle = badgeColor; ctx.font = uiTextFont(11, 700);
          ctx.fillText(badge, rx + rw - 10, py + panelH / 2);
        }
        py += panelH + panelGap;
      }
      return;
    }

    // ── Yuva satırları: solda yuva adı, sağda alt yuva hücreleri ─────────
    const labelW = Math.min(74, Math.max(54, Math.floor(rw * 0.2)));
    const cellGap = 6;
    const cellW = Math.floor((rw - labelW - 14 - cellGap * (PARTS_PER_SLOT - 1)) / PARTS_PER_SLOT);
    const cursorIndex = this.workshopSlotIndex || 0;
    for (const slot of PART_SLOTS) {
      const rowY = py;
      _csPanel(ctx, rx, rowY, rw, panelH, { accent: "#242f3b", rivets: false });
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(Math.min(10, Math.max(9, Math.round(labelW * 0.14))), 700);
      ctx.fillText(slotLabel(slot).toUpperCase(), rx + 8, rowY + panelH / 2, labelW - 10);

      for (let i = 0; i < PARTS_PER_SLOT; i++) {
        const cx = rx + labelW + 6 + i * (cellW + cellGap);
        const rect = { x: cx, y: rowY + 5, w: cellW, h: panelH - 10, slot, index: i };
        this._workshopSlotRects.push(rect);
        const part = partById(loadout[slot][i]);
        const isCursor = slot === this.workshopSlot && i === cursorIndex;
        const hov = inside(rect);
        _csPanel(ctx, rect.x, rect.y, rect.w, rect.h, {
          accent: part ? "#63e6be" : isCursor ? "#ffe45e" : hov ? "#ffe45e" : "#1c2530",
          hover: hov, glow: hov, rivets: false,
        });
        const iconSize = Math.min(26, Math.max(18, Math.round(cellW * 0.22)));
        if (part) {
          ctx.save();
          ctx.translate(rect.x + 5, rect.y + (rect.h - iconSize) / 2);
          drawPartIcon(ctx, part, iconSize);
          ctx.restore();
        }
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillStyle = part ? "#eef5ff" : "#5f6d78";
        ctx.font = uiTextFont(Math.min(11, Math.max(9.5, Math.round(cellW * 0.095))), 700);
        const textX = rect.x + (part ? iconSize + 9 : 8);
        ctx.fillText(part ? part.label : t("workshop.empty", "Boş"), textX, rect.y + rect.h / 2, rect.w - (part ? iconSize + 13 : 14));
      }
      py += panelH + panelGap;
    }

    // İpucu satırı: ne yapılacağını yazıyla söyler.
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#6d7f8d"; ctx.font = uiTextFont(Math.min(10, Math.max(8.5, Math.round(rw * 0.026))));
    ctx.fillText(t("workshop.partsHint", "Hücreye tıkla → parça seç • yuva başına {perSlot} parça • sökme ücretsiz", { perSlot: PARTS_PER_SLOT }), rx + rw / 2, py + 6, rw - 20);
  }

  handleWorkshopClick(mx, my) {
    if (this.hitBackButton(mx, my)) { SFX.uiClick(); this.closeWorkshop(); return; }
    for (const b of this._workshopPageRects || []) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        this.changeWorkshopPage(b.dir);
        return;
      }
    }
    for (const r of this._workshopCardRects || []) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        SFX.uiClick();
        this.workshopSelectedId = r.ch.id;
        this.workshopFx = null;
        return;
      }
    }
    // Mod sekmeleri (GELİŞTİRME ↔ PARÇALAR) — ızgaradan sonra, panel içeriğinden
    // önce: aynı y bileti paylaşmazlar ama sıra okunurluğu netleştirir.
    for (const m of this._workshopModeRects || []) {
      if (mx >= m.x && mx <= m.x + m.w && my >= m.y && my <= m.y + m.h) {
        this.switchWorkshopMode(m.mode);
        return;
      }
    }
    if (this.workshopMode === "parts") {
      // Liste açıkken satırlar ve t("common.back", "‹ Geri") tıklanır.
      if (this.workshopSlotOpen) {
        for (const r of this._workshopPartRects || []) {
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
            this.workshopPartCursor = r.index;
            this.applyWorkshopPart(r.partId);
            return;
          }
        }
        const back = this._workshopSlotBackRect;
        if (back && mx >= back.x && mx <= back.x + back.w && my >= back.y && my <= back.y + back.h) {
          this.closeWorkshopSlot();
        }
        return;
      }
      for (const r of this._workshopSlotRects || []) {
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
          this.openWorkshopSlot(r.slot, r.index || 0);
          return;
        }
      }
      return;
    }
    for (const r of this._workshopBranchRects || []) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        if (this.workshopBranch !== r.branch) SFX.uiClick();
        this.workshopBranch = r.branch;
        return;
      }
    }
    const btn = this._workshopActionRect;
    if (btn && mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      this.purchaseWorkshopUpgrade();
    }
  }

  handleModeSelectClick(mx, my) {
    if (this._scrapBadgeRect && this.hitRect(this._scrapBadgeRect, mx, my)) {
      SFX.uiClick();
      this.openWorkshop();
      return;
    }
    if (this._settingsBtnRect && this.hitRect(this._settingsBtnRect, mx, my)) {
      SFX.uiClick();
      this.openSettings();
      return;
    }
    for (const r of this._modeRects || []) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        SFX.uiClick();
        if (r.action === "workshop") this.openWorkshop();
        else if (r.action === "market") this.openMarket();
        else if (r.action === "tutorial") this.openTutorial();
        else if (r.action === "online") this.openOnline();
        else this.beginMode(r.action);
        return;
      }
    }
  }

  /* Başlangıç paketi beklenirken çizilen perde: iki taraf da aynı ekranı görür
   * (misafir hostun arazi maskesini ve durumunu bekler). */
  renderOnlineLoading(ctx) {
    const W = this.W, H = this.H;
    if (typeof drawClouds === "function") drawClouds(ctx, W, "rgba(190,215,240,0.14)");
    _msBackdrop(ctx, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffe45e";
    ctx.font = uiTitleFont(22);
    ctx.fillText(t("online.loading.title", "Dünya senkronize ediliyor"), W / 2, H / 2 - 34);
    ctx.fillStyle = "#cfe0ee";
    ctx.font = uiTextFont(13);
    ctx.fillText(t("online.loading.sub", "Arazi ve başlangıç durumu hosttan alınıyor…"), W / 2, H / 2 + 2);
    const code = this.online && this.online.session ? this.online.session.matchId : null;
    if (code) {
      ctx.fillStyle = "#8fa6bd";
      ctx.font = uiTextFont(11, 700);
      ctx.fillText(t("online.loading.code", "Oda: {code}", { code: netFormatRoomCode(code) }), W / 2, H / 2 + 34);
    }
  }

  /* Çevrimiçi bildirim şeridi: reddedilen komut/tur uyarısı (ör. "sıra sende
   * değil"). Kısa ömürlüdür; oyun akışını kesmez. */
  drawOnlineNotice(ctx) {
    const o = this.online;
    if (!o || !o.notice) return;
    const a = Math.min(1, (2400 - o.notice.age) / 500);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = o.notice.text || "";
    ctx.font = uiTextFont(13, 700);
    const w = Math.max(180, ctx.measureText(text).width + 28);
    const x = this.W / 2 - w / 2, y = 64;
    if (typeof _csPanel === "function") _csPanel(ctx, x, y, w, 30, { accent: "#ffd24a", fillTop: "#221f14" });
    ctx.fillStyle = "#ffe45e";
    ctx.fillText(text, this.W / 2, y + 16);
    ctx.restore();
  }

  // ── Nasıl Oynanır (TUTORIAL) ─────────────────────────────────────────
  // Ana menüden açılan eğitim ekranı: kontroller, tur akışı ve kurallar
  // burada öğretilir; maç içi alt şerit yerine tek başvuru kaynağıdır.
  openTutorial() {
    hideOverlay();
    this.clearTurnInput();
    this.state = "TUTORIAL";
    this.updateHud();
  }

  // Eğitim ekranı: 2×2 bilgi paneli + tur akışı şeridi. Paneller _csPanel ile
  // çizilir; her satır [tuş, açıklama] ikilisidir, açıklama kutuya sarılır.
  renderTutorial(ctx) {
    const W = this.W, H = this.H;
    const timeMs = this.renderTimeMs || 0;
    drawClouds(ctx, W, "rgba(190,215,240,0.14)");
    _msBackdrop(ctx, W, H, timeMs);

    // Başlık Bölgesi
    const titleY = 10;
    const titleText = t("tutorial.title", "NASIL OYNANIR");

    // Başlık aurası
    const tglow = ctx.createRadialGradient(W / 2, titleY + 22, 6, W / 2, titleY + 22, 220);
    tglow.addColorStop(0, "rgba(244, 189, 98, 0.16)");
    tglow.addColorStop(0.55, "rgba(113, 211, 189, 0.035)");
    tglow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tglow;
    ctx.fillRect(W / 2 - 240, titleY - 6, 480, 68);

    // Üst mikro damga
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(113, 211, 189, 0.65)";
    ctx.font = uiTitleFont(9.5, 700);
    ctx.fillText("PROT-9 // COMBAT INITIATION MANUAL", W / 2, titleY);

    // Ana Başlık
    ctx.font = uiTitleFont(22, 700);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillText(titleText, W / 2 + 1.5, titleY + 15);
    ctx.fillStyle = "#ffe45e";
    ctx.shadowColor = "rgba(255, 228, 94, 0.42)";
    ctx.shadowBlur = 8;
    ctx.fillText(titleText, W / 2, titleY + 14);
    ctx.shadowBlur = 0;

    // Başlık altı dekoratif tehlike şeridi
    _csHazardStrip(ctx, W / 2 - 110, titleY + 40, 220, 2.5);

    // Slogan / Alt açıklama
    ctx.fillStyle = "#a2b8c2";
    ctx.font = uiTextFont(11.5, 600);
    ctx.fillText("// " + t("tutorial.sub", "Saha kontrolleri ve temel muharebe kuralları") + " //", W / 2, titleY + 47);

    const KEY_COL = 126;          // tuş sütunu genişliği
    const ROW_GAP = 14;
    // Tuş/ad metinleri veri: her satır [tus, aciklama] ve ikisi de çevrilir.
    const panels = [
      {
        title: t("tutorial.panel.aim.title", "SIRA SENDE — ATIŞ"), accent: "#ffe45e", keyColor: "#ffe45e",
        rows: [
          [t("tutorial.aim.mouse.key", "Fare"), t("tutorial.aim.mouse.desc", "Nişan al — nişan çizgisi fareyi izler")],
          [t("tutorial.aim.click.key", "Sol tık"), t("tutorial.aim.click.desc", "Basılı tut → güç çubuğu dolar, bırak → ateş et")],
          [t("tutorial.aim.cancel.key", "Sağ tık / Esc"), t("tutorial.aim.cancel.desc", "Atışı iptal et")],
        ],
      },
      {
        title: t("tutorial.panel.move.title", "HAREKET"), accent: "#8ee7ff", keyColor: "#8ee7ff",
        rows: [
          [t("tutorial.move.walk.key", "A / D  ← →"), t("tutorial.move.walk.desc", "Yürü (enerji harcar)")],
          [t("tutorial.move.jump.key", "W / ↑"), t("tutorial.move.jump.desc", "Sıçra (enerji harcar)")],
          [t("tutorial.move.energy.key", "⚡ Enerji"), t("tutorial.move.energy.desc", "Her turda yenilenir — kısa sürede biter")],
        ],
      },
      {
        title: t("tutorial.panel.weapons.title", "SİLAHLAR VE MODÜLLER"), accent: "#ff8f5e", keyColor: "#ff8f5e",
        rows: [
          [t("tutorial.weapons.select.key", "1–9 / Tekerlek"), t("tutorial.weapons.select.desc", "Silah seç (mühimmat sınırlıdır)")],
          [t("tutorial.weapons.module.key", "Q"), t("tutorial.weapons.module.desc", "Dahili modülü kullan — hasar verenler o turun atış hakkını doldurur")],
          [t("tutorial.weapons.panel.key", "Alt panel"), t("tutorial.weapons.panel.desc", "Seçili silahın açıklaması ekranın altında görünür")],
        ],
      },
      {
        title: t("tutorial.panel.rules.title", "KURALLAR VE İPUÇLARI"), accent: "#63e6be", keyColor: "#63e6be",
        rows: [
          [t("tutorial.rules.timer.key", "⏱ 25 sn"), t("tutorial.rules.timer.desc", "Süre dolunca sıra rakibe geçer")],
          [t("tutorial.rules.wind.key", "🌀 Rüzgâr"), t("tutorial.rules.wind.desc", "Mermiyi saptırır — üstteki göstergeyi izle")],
          [t("tutorial.rules.audio.key", "M • Esc / ⏏"), t("tutorial.rules.audio.desc", "Sesi aç/kapat • maçtan çık, menüye dön")],
        ],
      },
    ];

    const gap = 14;
    const pw = Math.min(440, Math.floor((W - 3 * gap) / 2));
    const ph = 118;
    const startX = Math.max(8, (W - (2 * pw + gap)) / 2);
    const startY = 78;

    for (let i = 0; i < panels.length; i++) {
      const col = i % 2, row = (i / 2) | 0;
      const x = startX + col * (pw + gap);
      const y = startY + row * (ph + gap);
      _csPanel(ctx, x, y, pw, ph, { accent: panels[i].accent, fillTop: _hexA(panels[i].accent, 0.05) });

      // Kart üstü renkli şerit
      ctx.fillStyle = _hexA(panels[i].accent, 0.85);
      ctx.fillRect(x + 10, y + 1, pw - 20, 2.5);

      // Panel başlığı
      _csHazardStrip(ctx, x + 12, y + 11, 14, 3);
      ctx.fillStyle = panels[i].accent;
      ctx.font = uiTitleFont(12, 700);
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(panels[i].title, x + 34, y + 13);

      let ry = y + 29;
      for (const [key, desc] of panels[i].rows) {
        // Keycap kutucuğu
        ctx.font = uiTextFont(11, 700);
        const kw = Math.max(26, Math.min(KEY_COL - 16, Math.round(ctx.measureText(key).width + 12)));
        const kh = 20;
        const kx = x + 12;
        const ky = ry;

        ctx.fillStyle = "rgba(7, 18, 24, 0.75)";
        ctx.strokeStyle = _hexA(panels[i].accent, 0.45);
        ctx.lineWidth = 1;
        _csRoundRect(ctx, kx, ky, kw, kh, 4);
        ctx.fill(); ctx.stroke();

        // Keycap üst parlama çizgisi (3D derinlik hissi)
        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
        ctx.fillRect(kx + 2, ky + 1, kw - 4, 1);

        // Keycap metni
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = panels[i].keyColor;
        ctx.font = uiTextFont(11, 700);
        ctx.fillText(key, kx + kw / 2, ky + kh / 2);

        // Açıklama metni
        ctx.textAlign = "left";
        ctx.fillStyle = "#cfe0ee";
        ctx.font = uiTextFont(11.5);
        const lines = _wrapCanvasText(ctx, desc, pw - 20 - KEY_COL);
        const descX = x + KEY_COL + 6;
        if (lines.length === 1) {
          ctx.textBaseline = "middle";
          ctx.fillText(lines[0], descX, ky + kh / 2);
        } else {
          ctx.textBaseline = "top";
          for (let j = 0; j < lines.length; j++) {
            ctx.fillText(lines[j], descX, ky + j * ROW_GAP);
          }
        }
        ry += Math.max(22, lines.length * ROW_GAP + 6);
      }
    }

    // Tur akışı şeridi: iki panel sütunu kadar geniş, altta özet
    const stripW = 2 * pw + gap, stripX = startX, stripY = startY + 2 * ph + gap + 4, stripH = 46;
    _csPanel(ctx, stripX, stripY, stripW, stripH, { accent: "rgba(113,211,189,0.4)", fillTop: "rgba(113,211,189,0.06)" });
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#eef5ff"; ctx.font = uiTextFont(12.5, 700);
    ctx.fillText(t("tutorial.strip.flow", "Bir tur: hareket et → nişan al → gücü doldur → ateş et"), stripX + stripW / 2, stripY + 16);
    ctx.fillStyle = "#8fa6bd"; ctx.font = uiTextFont(11.5);
    ctx.fillText(t("tutorial.strip.turn", "Atış çözümlenince veya süre dolunca sıra sıradaki robota geçer — son ayakta kalan kazanır"), stripX + stripW / 2, stripY + 33);

    // Öğreticiyi oyna butonu: basit rehberli bölümü başlatır
    const bw = Math.min(320, stripW), bx = stripX + (stripW - bw) / 2, by = stripY + stripH + 16, bh = 42;
    const playHover = this.hitRect({ x: bx, y: by, w: bw, h: bh }, this.input.mouseX, this.input.mouseY);
    this._tutPlayRect = { x: bx, y: by, w: bw, h: bh };
    const bhy = playHover ? by - 2 : by;
    _csPanel(ctx, bx, bhy, bw, bh, {
      accent: playHover ? "#ffe45e" : "#4aff4a",
      hover: playHover, glow: playHover,
      fillTop: playHover ? "rgba(74,255,74,0.22)" : "#1e3a26",
      fillBottom: "#12251a",
    });

    ctx.fillStyle = playHover ? "#ffe45e" : "#63e6be";
    ctx.fillRect(bx + 12, bhy + 1, bw - 24, 2);

    ctx.fillStyle = playHover ? "#ffffff" : "#8aff8a";
    ctx.font = uiTitleFont(14.5, 700);
    ctx.fillText(t("tutorial.play", "▶ ÖĞRETİCİYİ OYNA"), bx + bw / 2, bhy + bh / 2);
    ctx.fillStyle = "#8fa6bd"; ctx.font = uiTextFont(11);
    ctx.fillText(t("tutorial.play.desc", "Basit bölüm: 1v1, rüzgârsız, adım adım rehberli"), bx + bw / 2, bhy + bh + 13);

    // Geri: ana menüye dönüş (Esc ile aynı rota)
    this.drawBackButton(ctx, t("common.mainMenu", "‹ Ana Menü"));
  }

  handleTutorialClick(mx, my) {
    // Öğreticiyi oyna: basit rehberli bölümü başlat
    if (this.hitRect(this._tutPlayRect, mx, my)) { SFX.uiClick(); this.beginTutorial(); return; }
    if (this.hitBackButton(mx, my)) { SFX.uiClick(); this.state = "MODE_SELECT"; this.updateHud(); return; }
  }

  // ── Öğretici maçı (mode: "tutorial") ──────────────────────────────────
  // Nasıl Oynanır ekranındaki "Öğreticiyi Oyna" ile başlar: basit düz harita,
  // 1v1 kolay bot, rüzgârsız ve uzun tur süresi. İnsan oyuncu adım adım
  // görevlerle temel hareketi öğrenir; adımlar bitince maç normal sürer.
  beginTutorial() {
    this.mode = "tutorial";                 // ödül/geliştirme kapalı (ilerleme modu değil)
    this.difficulty = "easy";
    this.playerControls = ["human", "bot"];
    this.selectedChars = [
      CHARACTERS.find((c) => c.id === "kopek"), // FIX-8: onarım modüllü, affedici başlangıç robotu
      CHARACTERS.find((c) => c.id === "tavsan"),
    ];
    this.selectedMap = getMapById("gergedan"); // uzun düz saha: yürüme/atış pratiği için
    this.bots = [new BotController()];
    this.tutorial = { step: 0, done: [false, false, false, false], flash: 0, baseX: 0, baseAim: 0 };
    hideOverlay();
    this.clearTurnInput();
    this.startGame();
    // Eğitim ayarları: sabit sakın rüzgâr + uzun nişan süresi (startGame
    // rastgele rüzgâr ve kısa süre atadığı için burada ezilir).
    this.wind = 0;
    this.windTurnsRemaining = 9999;
    this.windChangeFx = null;
    this.turnTimer = TUTORIAL_TURN_DURATION;
    this._tutTurnStart();
    this.updateHud();
  }

  // Rehber adımları: n işaretle, adımı ilk eksik göreve ilerlet.
  _tutComplete(n) {
    const t = this.tutorial;
    if (!t || t.done[n]) return;
    t.done[n] = true;
    t.step = t.done.findIndex((d) => !d);
    if (t.step < 0) t.step = TUTORIAL_COACH_STEPS.length - 1;
    t.flash = 1.0;
    SFX.uiClick();
  }

  // Her insan turunun başında yürüme/nişan taban çizgisi güncellenir.
  _tutTurnStart() {
    const t = this.tutorial;
    if (!t || !this.active) return;
    t.baseX = this.active.x;
    t.baseAim = this.active.aim;
  }

  // Kare başı rehber denetimi: flash geri sayımı + yürüme/nişan adımlarının
  // tamamlanma testi (sıçrama ve ateş kendi giriş noktalarından işaretlenir).
  _tutUpdate(dt) {
    const t = this.tutorial;
    if (!t) return;
    if (t.flash > 0) t.flash = Math.max(0, t.flash - dt);
    if (this.state === "AIMING" && this.isHumanTurn()) {
      const a = this.active;
      if (!t.done[0] && Math.abs(a.x - t.baseX) > 40) this._tutComplete(0);
      if (!t.done[2] && Math.abs(a.aim - t.baseAim) > 0.18) this._tutComplete(2);
    }
  }

  // Eğitim maçının koç paneli: turun tepesinde adım metni + ilerleme noktaları.
  drawTutorialCoach(ctx) {
    const tut = this.tutorial;
    if (!t || this.state === "GAMEOVER") return;
    const W = this.W;
    const pw = Math.min(430, W - 140), px = (W - pw) / 2, py = 58, ph = 48;
    const humanTurn = this.isHumanTurn();
    const stepIdx = Math.min(tut.step, TUTORIAL_COACH_STEPS.length - 1);
    let text, color = "#eef5ff";
    if (this.state !== "AIMING") {
      text = t("tutorial.status.resolving", "Atış çözümleniyor…");
    } else if (!humanTurn) {
      text = t("tutorial.status.opponent", "Sıra rakipte — izle ve öğren");
      color = "#9fb6c9";
    } else if (tut.flash > 0) {
      text = t("tutorial.status.done", "✓ Tamam! Sıradaki adım…");
      color = "#8aff8a";
    } else {
      text = t("tutorial.coach." + stepIdx, TUTORIAL_COACH_STEPS[stepIdx]);
    }
    _csPanel(ctx, px, py, pw, ph, { accent: "#ffe45e" });
    ctx.textBaseline = "middle";
    // Başlık satırı: ÖĞRETİCİ + ilerleme noktaları (tamamlanan yeşil)
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(10);
    ctx.fillText(t("tutorial.badge", "ÖĞRETİCİ"), px + 12, py + 12);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = tut.done[i] ? "#5fdc6b" : "#2c3a4c";
      ctx.beginPath(); ctx.arc(px + pw - 16 - (3 - i) * 14, py + 12, 3.5, 0, 6.28); ctx.fill();
    }
    // Adım metni
    ctx.textAlign = "center";
    ctx.font = uiTextFont(14, 700);
    ctx.fillStyle = color;
    ctx.fillText(text, px + pw / 2, py + 33);
  }

  // ── Pazar (MARKET): Cephane + Parçalar sekmeleri ────────────────────
  // İki sekme tek ekranda: CEPHANE (ortak mühimmat deposu; alınan mermi maç
  // başında insan robotuna yüklenir, artanı maç sonunda depoya döner — bkz.
  // js/market.js) ve PARÇALAR (robotlara takılan kalıcı donanım; satın alma
  // burada, TAKMA Atölye'de — bkz. js/parts.js). Depo tüm robotların ortak
  // malıdır; parçalar tek adettir ve tek bir robotun yuvasında durur.
  // Bazuka sınırsız olduğu için pazarda hiç görünmez.
  openMarket() {
    this.portalGameplay(false);
    this.marketWeaponPage = 0;
    this.marketPartPage = 0;
    this.marketFx = null;
    this.marketNotice = null;
    // marketTab bilinçli olarak SIFIRLANMAZ: oyuncu son baktığı sekmeye döner
    // (ilk açılışta kurucu "ammo" atar).
    hideOverlay();
    this.clearTurnInput();
    this.state = "MARKET";
    this.updateHud();
  }

  closeMarket() {
    this.marketFx = null;
    this.marketNotice = null;
    this.state = "MODE_SELECT";
    this.updateHud();
  }

  // Satın alma parıltısı ve geri bildirim yazısı her karede söner.
  updateMarketFx(dt) {
    if (this.marketFx) {
      this.marketFx.t += dt;
      if (this.marketFx.t > MK_FX_DURATION) this.marketFx = null;
    }
    if (this.marketNotice) {
      this.marketNotice.t += dt;
      if (this.marketNotice.t > MK_NOTICE_DURATION) this.marketNotice = null;
    }
  }

  // Ortak depoya mühimmat al. Önkoşullar market.js'te doğrulanır; arayüz
  // doğrudan bakiyeye/depoya dokunmaz. Başarısızlık sessiz kalmaz: nedeni kısa
  // bir yazıyla gösterilir.
  purchaseMarketAmmo(weaponId, qty) {
    const spec = weaponById(weaponId);
    const label = spec ? spec.name : t("market.ammoFallback", "Cephane");
    const res = buyAmmo(this.profile, weaponId, qty || 1);
    if (!res.ok) {
      let msg = t("market.fail", "Satın alma başarısız");
      if (res.reason === "DEPOT_FULL") msg = t("market.ammoDepotFull", "{label} deposu dolu (üst sınır {cap})", { label, cap: AMMO_DEPOT_CAP });
      else if (res.reason === "SCRAP_REQUIRED") msg = t("market.scrapRequired", "{label} için {cost} Hurda gerekli", { label, cost: res.cost });
      else if (res.reason === "NOT_SELLABLE") msg = t("market.notSellable", "{label} satılmıyor", { label });
      this._marketNotice(msg, "#ff9b9b");
      SFX.uiClick();
      return;
    }
    this.profile = res.profile;
    this.marketFx = { weaponId, t: 0 };
    this._marketNotice(t("market.ammoBought", "{qty}× {label} alındı  (−{cost} Hurda)", { qty: res.bought, label, cost: res.cost }), "#8affc0");
    SFX.weaponSwitch(); // kısa metal klik'i
    if (!res.persisted) notifyStorageFailure();
    this.updateHud();
  }

  _marketNotice(text, color) {
    this.marketNotice = { text, color, t: 0 };
  }

  changeMarketWeaponPage(dir) {
    const totalPages = Math.max(1, Math.ceil(sellableWeapons().length / (MK_COLS * MK_ROWS)));
    const next = this.marketWeaponPage + dir;
    if (next < 0 || next > totalPages - 1) return;
    SFX.uiClick();
    this.marketWeaponPage = next;
  }

  // Sekme değiştir (Cephane + dört yuva). Son sekme alanda hatırlanır; parıltı
  // ve bildirim sekmeler arasında taşınmaz (yanlış karta bağlanmasın).
  switchMarketTab(tab) {
    const next = MARKET_TABS.some((t) => t.id === tab) ? tab : "ammo";
    if (next === (this.marketTab || "ammo")) return;
    SFX.uiClick();
    this.marketTab = next;
    this.marketFx = null;
    this.marketNotice = null;
    this.marketPartPage = 0;
  }

  changeMarketPartPage(dir) {
    const totalPages = Math.max(1, Math.ceil(this._marketSlotParts().length / (MK_COLS * MK_ROWS)));
    const next = (this.marketPartPage || 0) + dir;
    if (next < 0 || next > totalPages - 1) return;
    SFX.uiClick();
    this.marketPartPage = next;
  }

  // Aktif sekmenin parçaları (cephane sekmesinde boş dizi).
  _marketSlotParts() {
    const slot = this.marketTab;
    if (!PART_SLOTS.includes(slot)) return [];
    return PARTS.filter((p) => p.slot === slot);
  }

  // Tekerlek ve sayfa düğmeleri sekmeye göre yönlenir (tek giriş noktası).
  changeMarketPage(dir) {
    if (PART_SLOTS.includes(this.marketTab)) this.changeMarketPartPage(dir);
    else this.changeMarketWeaponPage(dir);
  }

  // ── Pazar kabuğu: başlık + sekme çubuğu + paylaşılan ızgara yerleşimi ──
  // Sekmeler tek durum (MARKET) altında çalışır: yeni bir state eklemek
  // girdi/Esc/updateHud kablolarını üç yerde daha büyütürdü (marketTab alanı
  // bu listelere hiç dokunmaz). Izgara geometrisi iki sekmede de aynıdır ve
  // eski alt yazı satırı sekme bandına dönüştüğü için gridY=84 KAYMAZ.
  renderMarket(ctx) {
    const W = this.W, H = this.H;
    const timeMs = this.renderTimeMs || 0;
    drawClouds(ctx, W, "rgba(190,215,240,0.14)");
    _msBackdrop(ctx, W, H, timeMs);

    // Başlık aurası
    const tglow = ctx.createRadialGradient(W / 2, 18, 6, W / 2, 18, 200);
    tglow.addColorStop(0, "rgba(244, 189, 98, 0.16)");
    tglow.addColorStop(0.55, "rgba(113, 211, 189, 0.035)");
    tglow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tglow;
    ctx.fillRect(W / 2 - 220, 0, 440, 52);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(113, 211, 189, 0.65)";
    ctx.font = uiTitleFont(9, 700);
    ctx.fillText("PROT-9 // BLACK MARKET ACQUISITIONS", W / 2, 6);

    ctx.fillStyle = "#ffe45e";
    ctx.font = uiTitleFont(22, 700);
    ctx.shadowColor = "rgba(255, 228, 94, 0.42)";
    ctx.shadowBlur = 8;
    ctx.fillText(t("market.title", "PAZAR"), W / 2, 17);
    ctx.shadowBlur = 0;

    _csHazardStrip(ctx, W / 2 - 100, 39, 200, 2);

    const scrap = this.profile ? this.profile.scrap : START_SCRAP;
    this._renderMarketTabs(ctx, scrap);

    const gap = 12;
    const gridW = Math.min(W - 48, MK_MAX_GRID_W);
    const L = {
      gridX: (W - gridW) / 2,
      gridY: MK_GRID_Y,
      gridW,
      gap,
      cardW: Math.floor((gridW - (MK_COLS - 1) * gap) / MK_COLS),
      scrap,
    };
    if (PART_SLOTS.includes(this.marketTab)) this._renderMarketParts(ctx, L);
    else this._renderMarketAmmo(ctx, L);

    this.drawBackButton(ctx, t("common.mainMenu", "‹ Ana Menü"));
  }

  // Sekme çubuğu + Hurda + sekme başına özet satırı. Tıklama alanları
  // _marketTabRects'te toplanır; handleMarketClick ilk olarak bunlara bakar.
  _renderMarketTabs(ctx, scrap) {
    const W = this.W;
    const mx = this.input.mouseX, my = this.input.mouseY;
    const activeTab = MARKET_TABS.some((t) => t.id === this.marketTab) ? this.marketTab : "ammo";

    const totalW = MARKET_TABS.length * MK_TAB_W + (MARKET_TABS.length - 1) * MK_TAB_GAP;
    const x0 = (W - totalW) / 2;
    this._marketTabRects = [];
    MARKET_TABS.forEach((t, i) => {
      const x = x0 + i * (MK_TAB_W + MK_TAB_GAP);
      this._marketTabRects.push({ x, y: MK_TAB_Y, w: MK_TAB_W, h: MK_TAB_H, tab: t.id });
      const active = activeTab === t.id;
      const hov = mx >= x && mx <= x + MK_TAB_W && my >= MK_TAB_Y && my <= MK_TAB_Y + MK_TAB_H;
      _csPanel(ctx, x, MK_TAB_Y, MK_TAB_W, MK_TAB_H, {
        accent: active ? "#ffe45e" : hov ? "#7f93a5" : "#2a3848",
        hover: !active && hov, glow: active, rivets: false,
        fillTop: active ? "#2b2717" : null, fillBottom: active ? "#1a170d" : null,
      });
      ctx.fillStyle = active ? "#ffe45e" : "#9fb6c9";
      ctx.font = uiTextFont(12, 700);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(marketTabLabel(t.id), x + MK_TAB_W / 2, MK_TAB_Y + MK_TAB_H / 2);
    });

    // Bilgi satırı: soldan başlar — Hurda (sarı) + sekme özeti (gri). Sağ uç
    // bilinçli olarak BOŞtur: üst-sağ köşe DOM ses denetimine ayrılmıştır
    // (AUDIO_SAFE) — eskiden Hurda (W-24, 18)'e çiziliyordu (kullanıcı bildirimi).
    const pulse = this.marketFx ? Math.max(0, 1 - this.marketFx.t / MK_FX_DURATION) : 0;
    let summary;
    if (activeTab === "ammo") {
      const depot = getAmmoDepot(this.profile);
      summary = t("market.depotSummary", "Ortak depo: {total} mermi • {weapons} silah", {
        total: ammoDepotTotal(depot), weapons: Object.keys(depot).length,
      });
    } else {
      const slotParts = PARTS.filter((p) => p.slot === activeTab);
      const owned = this.profile ? getOwnedParts(this.profile) : [];
      const have = slotParts.filter((p) => owned.includes(p.id)).length;
      summary = t("market.partsSummary", "{slot} yuvası: {have}/{total} parça • takma Atölye'de", {
        slot: slotLabel(activeTab), have, total: slotParts.length,
      });
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(255,228,94,${0.8 + 0.2 * pulse})`;
    ctx.font = uiTitleFont(Math.round(13 + 3 * pulse));
    const scrapText = t("common.scrap", "Hurda: {scrap}", { scrap });
    ctx.fillText(scrapText, 24, MK_INFO_Y);
    const scrapW = ctx.measureText(scrapText).width;
    ctx.fillStyle = "#9fb6c9";
    ctx.font = uiTextFont(11);
    ctx.fillText(summary, 24 + scrapW + 22, MK_INFO_Y, W - 24 - scrapW - 46);
  }

  // ── Cephane sekmesi: mevcut mühimmat ızgarası (davranış değişmedi) ──────
  _renderMarketAmmo(ctx, L) {
    const gap = L.gap, gridX = L.gridX, gridY = L.gridY, cardW = L.cardW, scrap = L.scrap;
    const mx = this.input.mouseX, my = this.input.mouseY;
    const depot = getAmmoDepot(this.profile);
    const weapons = sellableWeapons();

    const perPage = MK_COLS * MK_ROWS;
    const totalPages = Math.max(1, Math.ceil(weapons.length / perPage));
    this.marketWeaponPage = Math.max(0, Math.min(this.marketWeaponPage || 0, totalPages - 1));
    const pageStart = this.marketWeaponPage * perPage;
    const pageWeapons = weapons.slice(pageStart, pageStart + perPage);

    this._marketWeaponRects = [];
    this._marketPartRects = []; // sekme değişince bayat parça alanı kalmaz
    for (let i = 0; i < pageWeapons.length; i++) {
      const spec = pageWeapons[i];
      const col = i % MK_COLS, row = (i / MK_COLS) | 0;
      const cx = gridX + col * (cardW + gap);
      const cy = gridY + row * (MK_CARD_H + gap);
      this._marketWeaponRects.push({ x: cx, y: cy, w: cardW, h: MK_CARD_H, spec });

      const price = ammoPriceFor(spec);
      const have = depot[spec.id] || 0;
      const battleMax = weaponBattleMax(spec);
      const full = have >= AMMO_DEPOT_CAP;
      const affordable = scrap >= price;
      const hovered = mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + MK_CARD_H;
      const flashing = !!(this.marketFx && this.marketFx.weaponId === spec.id);
      const cyv = cy + (hovered ? -2 : 0);

      _csPanel(ctx, cx, cyv, cardW, MK_CARD_H, {
        accent: flashing ? "#8affc0" : hovered ? "#ffe45e" : full ? "#3b4650" : "#2a3848",
        hover: hovered, glow: hovered,
        rivets: false,
        fillTop: full ? "#161b20" : null, fillBottom: full ? "#0e1216" : null,
      });
      if (flashing) {
        const a = Math.max(0, 1 - this.marketFx.t / MK_FX_DURATION);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = "#d8fff1";
        ctx.lineWidth = 3;
        _csRoundRect(ctx, cx + 2, cyv + 2, cardW - 4, MK_CARD_H - 4, 7);
        ctx.stroke();
        ctx.restore();
      }

      // Mermi tasarımı: HUD ile aynı çizici (Projectile.drawIcon)
      ctx.save();
      ctx.translate(cx + 6, cyv + 11);
      Projectile.drawIcon(ctx, spec, 40, { tail: false });
      ctx.restore();

      const tx = cx + 52;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = full ? "#8b9aa5" : "#eef5ff";
      ctx.font = uiTextFont(13, 700);
      ctx.fillText(spec.name, tx, cyv + 7, cardW - 124);
      // Fiyat sağda: depo dolduysa yerine "Dolu", bakiye yetmiyorsa kırmızı.
      ctx.textAlign = "right";
      ctx.fillStyle = full ? "#8b9aa5" : affordable ? "#ffd166" : "#ff9b9b";
      ctx.font = uiTextFont(12, 700);
      ctx.fillText(full ? t("market.full", "Dolu") : t("market.price", "{price} Hurda", { price }), cx + cardW - 10, cyv + 8);

      ctx.textAlign = "left";
      ctx.fillStyle = "#8fd9c4";
      ctx.font = uiTextFont(10);
      ctx.fillText(spec.special, tx, cyv + 26, cardW - 70);

      ctx.fillStyle = full ? "#ffb347" : "#8fa8ba";
      ctx.fillText(t("market.ammoMeta", "Taban {base} • Savaş ≤{max} • Depo {have}/{cap}", {
          base: spec.ammo, max: battleMax, have, cap: AMMO_DEPOT_CAP,
        }), tx, cyv + 43, cardW - 112);
      if (!full) {
        ctx.textAlign = "right";
        ctx.fillStyle = "#6d7f8d";
        ctx.font = uiTextFont(9);
        ctx.fillText(t("market.bulkShift", "Shift ×{qty}", { qty: AMMO_BULK_QTY }), cx + cardW - 10, cyv + 45);
      }
    }

    // Alt bant sayfadaki SATIR sayısına göre konumlanır: 6 parçalık bir yuva
    // sayfasında ızgaranın altında kocaman boşluk kalmaz (cephane sayfası
    // 5 satır olduğu için konum değişmez).
    const rowsUsed = Math.max(1, Math.ceil(pageWeapons.length / MK_COLS));
    const navY = gridY + rowsUsed * MK_CARD_H + (rowsUsed - 1) * gap + 6;
    this._renderMarketNav(ctx, navY, weapons.length, this.marketWeaponPage, perPage);
    // Kapsam notu: depo, geliştirmelerle aynı maç türlerinde geçerlidir.
    ctx.fillStyle = "#6d7f8d";
    ctx.font = uiTextFont(10);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      t("market.ammoNote",
        "Depo {cap}'a kadar birikir; maça yalnız savaş tavanı kadar yüklenir, artanı maç sonunda geri döner • Shift ×{qty} / Ctrl ×{big}",
        { cap: AMMO_DEPOT_CAP, qty: AMMO_BULK_QTY, big: AMMO_BULK_QTY_BIG }),
      this.W / 2, navY + MK_FOOT_NOTE_DY);
    this._renderMarketNotice(ctx, navY + MK_FOOT_NOTICE_DY);
  }

  // ── Parça sekmeleri (KASK/GÖVDE/APARAT/AYAK): o yuvanın parçaları ─────
  // Her yuva ayrı bir sekmedir; kart durumları: sahipsiz (fiyat) →
  // sahipli-takılı değil (Alındı) → sahipli-takılı ("Takılı → FIX-8" /
  // "Takılı → 3 robotta"). Satın alma tek tıklama; TAKMA Atölye'nin işidir.
  _renderMarketParts(ctx, L) {
    const gap = L.gap, gridX = L.gridX, gridY = L.gridY, cardW = L.cardW, scrap = L.scrap;
    const slot = this.marketTab;
    const mx = this.input.mouseX, my = this.input.mouseY;
    const owned = getOwnedParts(this.profile);
    const equipMap = this._marketEquippedMap(); // partId → [robotId, ...]
    const slotParts = this._marketSlotParts();

    const perPage = MK_COLS * MK_ROWS;
    const totalPages = Math.max(1, Math.ceil(slotParts.length / perPage));
    this.marketPartPage = Math.max(0, Math.min(this.marketPartPage || 0, totalPages - 1));
    const pageStart = this.marketPartPage * perPage;
    const pageParts = slotParts.slice(pageStart, pageStart + perPage);

    this._marketPartRects = [];
    this._marketWeaponRects = []; // sekme değişince bayat mühimmat alanı kalmaz
    for (let i = 0; i < pageParts.length; i++) {
      const part = pageParts[i];
      const col = i % MK_COLS, row = (i / MK_COLS) | 0;
      const cx = gridX + col * (cardW + gap);
      const cy = gridY + row * (MK_CARD_H + gap);
      this._marketPartRects.push({ x: cx, y: cy, w: cardW, h: MK_CARD_H, part });

      const isOwned = owned.includes(part.id);
      const wearers = equipMap[part.id] || [];
      const affordable = scrap >= part.price;
      const hovered = mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + MK_CARD_H;
      const flashing = !!(this.marketFx && this.marketFx.partId === part.id);
      const cyv = cy + (hovered ? -2 : 0);

      _csPanel(ctx, cx, cyv, cardW, MK_CARD_H, {
        accent: flashing ? "#8affc0" : isOwned ? "#3b4650" : hovered ? "#ffe45e" : "#2a3848",
        hover: hovered, glow: hovered, rivets: false,
        fillTop: isOwned ? "#161b20" : null, fillBottom: isOwned ? "#0e1216" : null,
      });
      if (flashing) {
        const a = Math.max(0, 1 - this.marketFx.t / MK_FX_DURATION);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = "#d8fff1";
        ctx.lineWidth = 3;
        _csRoundRect(ctx, cx + 2, cyv + 2, cardW - 4, MK_CARD_H - 4, 7);
        ctx.stroke();
        ctx.restore();
      }

      // Parça ikonu: parts.js'teki saf çizici (spec.icon → drawPartIcon).
      ctx.save();
      ctx.translate(cx + 6, cyv + 11);
      drawPartIcon(ctx, part, 40);
      ctx.restore();

      const tx = cx + 52;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = isOwned ? "#8b9aa5" : "#eef5ff";
      ctx.font = uiTextFont(13, 700);
      ctx.fillText(part.label, tx, cyv + 7, cardW - 132);

      // Sağ üst: fiyat ya da "Alındı"; sahipsizken bakiye yetmiyorsa kırmızı.
      ctx.textAlign = "right";
      ctx.fillStyle = isOwned ? "#8b9aa5" : affordable ? "#ffd166" : "#ff9b9b";
      ctx.font = uiTextFont(12, 700);
      ctx.fillText(isOwned ? t("market.owned", "Alındı") : t("market.price", "{price} Hurda", { price: part.price }), cx + cardW - 10, cyv + 8);

      // Sağ alt: yuva rozeti — parçanın nereye takıldığını söyler.
      ctx.fillStyle = isOwned ? "#5f6d78" : "#8fa8ba";
      ctx.font = uiTextFont(9, 700);
      ctx.fillText(slotLabel(part.slot).toUpperCase(), cx + cardW - 10, cyv + 45);

      // Etki satırı (ad + kısa açıklama + durum).
      ctx.textAlign = "left";
      ctx.fillStyle = isOwned ? "#6f8a80" : "#8fd9c4";
      ctx.font = uiTextFont(10);
      ctx.fillText(part.desc, tx, cyv + 26, cardW - 132);

      let status, statusColor;
      if (isOwned && wearers.length === 1) {
        const owner = CHARACTERS.find((c) => c.id === wearers[0]);
        status = t("market.equippedOne", "Takılı → {robot}", { robot: owner ? owner.label : wearers[0] });
        statusColor = "#8affc0";
      } else if (isOwned && wearers.length > 1) {
        status = t("market.equippedMany", "Takılı → {count} robotta", { count: wearers.length });
        statusColor = "#8affc0";
      } else if (isOwned) {
        status = t("market.inInventory", "Envanterde • Atölye'den tak");
        statusColor = "#ffd166";
      } else {
        status = t("market.partUsable", "{slot} yuvası • her robota takılır", { slot: slotLabel(part.slot) });
        statusColor = "#8fa8ba";
      }
      ctx.fillStyle = isOwned ? statusColor : "#6d7f8d";
      ctx.font = uiTextFont(10);
      ctx.fillText(status, tx, cyv + 43, cardW - 120);
    }

    const rowsUsed = Math.max(1, Math.ceil(pageParts.length / MK_COLS));
    const navY = gridY + rowsUsed * MK_CARD_H + (rowsUsed - 1) * gap + 6;
    this._renderMarketNav(ctx, navY, slotParts.length, this.marketPartPage, perPage);
    ctx.fillStyle = "#6d7f8d";
    ctx.font = uiTextFont(10);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      t("market.partsNote",
        "{slot} parçaları tek seferlik alınır • aynı parça her robota takılabilir (kopya gerekmez) • takma Atölye'de",
        { slot: slotLabel(slot) }),
      this.W / 2, navY + MK_FOOT_NOTE_DY);
    this._renderMarketNotice(ctx, navY + MK_FOOT_NOTICE_DY);
  }

  // Sayfa gezinme düğmeleri + sayaç (iki sekme paylaşır). Düğme alanları
  // _marketPageRects'e yazılır; handleMarketClick sekmeden bağımsız okur.
  _renderMarketNav(ctx, navY, totalItems, page, perPage) {
    const mid = this.W / 2;
    const mx = this.input.mouseX, my = this.input.mouseY;
    const navW = 104, navH = 30;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    this._marketPageRects = [
      { x: mid - 170 - navW, y: navY, w: navW, h: navH, dir: -1 },
      { x: mid + 170, y: navY, w: navW, h: navH, dir: 1 },
    ];
    for (const b of this._marketPageRects) {
      const canUse = (b.dir < 0 && page > 0) || (b.dir > 0 && page < totalPages - 1);
      const hov = canUse && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
      ctx.globalAlpha = canUse ? 1 : 0.35;
      _csPanel(ctx, b.x, b.y, b.w, b.h, { accent: hov ? "#ffe45e" : "#2a3848", hover: hov, glow: hov, rivets: false });
      ctx.fillStyle = "#cfe0ee";
      ctx.font = uiTextFont(13, 700);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.dir < 0 ? t("market.prev", "‹ Önceki") : t("market.next", "Sonraki ›"), b.x + b.w / 2, b.y + b.h / 2);
      ctx.globalAlpha = 1;
    }
    const pageStart = page * perPage;
    ctx.fillStyle = "#9fb6c9";
    ctx.font = uiTextFont(13, 700);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`${pageStart + 1}–${Math.min(totalItems, pageStart + perPage)} / ${totalItems}`, mid, navY + navH / 2);
  }

  // Geri bildirim satırı (eksik Hurda / dolu depo / başarılı satın alma).
  // Süre sonunda söner; iki sekmede de aynı yerde çizilir.
  _renderMarketNotice(ctx, y) {
    if (!this.marketNotice) return;
    const n = this.marketNotice;
    const a = Math.min(1, (MK_NOTICE_DURATION - n.t) / 0.35);
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = n.color;
    ctx.font = uiTextFont(12, 700);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(n.text, this.W / 2, y);
    ctx.globalAlpha = 1;
  }

  // Parça → takılı olduğu robot id'LERİ (kart "Takılı → FIX-8" / "N robotta"
  // yazar). Parçalar robota kilitli olmadığı için liste birden çok robot
  // içerebilir.
  _marketEquippedMap() {
    const map = {};
    const robots = this.profile && this.profile.robots ? this.profile.robots : {};
    for (const rid of Object.keys(robots)) {
      const raw = robots[rid] && robots[rid].loadout ? robots[rid].loadout : null;
      if (!raw) continue;
      const lo = sanitizeLoadoutShape(raw);
      for (const slot of PART_SLOTS) {
        for (const pid of lo[slot]) {
          if (!pid) continue;
          if (!map[pid]) map[pid] = [];
          if (!map[pid].includes(rid)) map[pid].push(rid);
        }
      }
    }
    return map;
  }

  // Parça satın al: önkoşullar parts.js'te doğrulanır (benzersiz parça); arayüz
  // bakiye/envantere doğrudan dokunmaz. Başarısızlık sessiz kalmaz.
  purchaseMarketPart(partId) {
    const part = partById(partId);
    const label = part ? part.label : t("market.partFallback", "Parça");
    const res = buyPart(this.profile, partId);
    if (!res.ok) {
      let msg = t("market.fail", "Satın alma başarısız");
      if (res.reason === "ALREADY_OWNED") msg = t("market.alreadyOwned", "{label} zaten envanterinde — Atölye'den tak", { label });
      else if (res.reason === "SCRAP_REQUIRED") msg = t("market.scrapRequired", "{label} için {cost} Hurda gerekli", { label, cost: res.cost });
      else if (res.reason === "INVALID_PART") msg = t("market.unknownPart", "Bilinmeyen parça");
      this._marketNotice(msg, "#ff9b9b");
      SFX.uiClick();
      return;
    }
    this.profile = res.profile;
    this.marketFx = { partId, t: 0 };
    this._marketNotice(t("market.partBought", "{label} alındı (−{cost} Hurda) — Atölye'den bir robota tak", { label, cost: res.cost }), "#8affc0");
    SFX.partMount(); // parça alımı: montaj klik'i
    if (!res.persisted) notifyStorageFailure();
    this.updateHud();
  }

  handleMarketClick(mx, my, shift, big) {
    if (this.hitBackButton(mx, my)) { SFX.uiClick(); this.closeMarket(); return; }
    // 1) Sekmeler — ızgaradan ve sayfa düğmelerinden önce (üst bant).
    for (const t of this._marketTabRects || []) {
      if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h) {
        this.switchMarketTab(t.tab);
        return;
      }
    }
    // 2) Sayfa gezinme (aktif sekmeye yönlenir).
    for (const b of this._marketPageRects || []) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        this.changeMarketPage(b.dir);
        return;
      }
    }
    // 3) Kartlar: sekmeye göre satın alma yolu.
    if (PART_SLOTS.includes(this.marketTab)) {
      for (const r of this._marketPartRects || []) {
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
          this.purchaseMarketPart(r.part.id);
          return;
        }
      }
      return;
    }
    for (const r of this._marketWeaponRects || []) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        // Shift → toplu, Ctrl/Alt → büyük toplu (depo 999 olabildiği için).
        const qty = big ? AMMO_BULK_QTY_BIG : shift ? AMMO_BULK_QTY : 1;
        this.purchaseMarketAmmo(r.spec.id, qty);
        return;
      }
    }
  }

  // ── Oyuncu sayısı seçimi (COUNT_SELECT) ──────────────────────────────────
  // Sayıya tıklanınca: oyuncu sayısını sabitle ve karakter seçimine geç.
  beginCharSelect(n) {
    this.playerCount = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n | 0));
    this.selectedChars = new Array(this.playerCount).fill(null);
    if (this.mode === "local") this.playerControls = new Array(this.playerCount).fill("human");
    this.selectedMap = null;
    this.charSelectPhase = 0;
    this.charPage = 0;
    this.state = "CHAR_SELECT";
    this.updateHud();
  }

  // Oyun bitince aynı kadro + haritayla hızlı rövanş; kadro yoksa menüye düşer.
  /* Portaldan maç arası reklam fırsatı (en fazla 3 dakikada bir; `file://` ve
   * SDK'sız açılışta hiçbir şey olmaz). Yalnız maç sonu kartından ayrılırken
   * çağrılır — banner/interstitial yok, oyuncuyu oynanış ortasında kesmeyiz. */
  portalMidgame() {
    if (typeof PORTAL === "undefined" || !PORTAL.isActive()) return false;
    const res = PORTAL.requestMidgame();
    return !!(res && res.ok);
  }

  /* Reklam varsa önce onu bitirip sonra devam eder: reklam sürerken oyun
   * simülasyonu/olay sayaçları başlamasın (portal gereksinimleri). Reklam
   * kuyruğa alınamazsa (cooldown/kapalı) akış beklemeden sürer. */
  _afterMidgame(fn) {
    const fromResult = this.state === "GAMEOVER";
    if (!fromResult || typeof PORTAL === "undefined" || !PORTAL.isActive()) { fn(); return false; }
    let done = false;
    const go = () => { if (done) return; done = true; fn(); };
    const res = PORTAL.requestMidgame(() => go());
    if (!res || res.ok !== true) { go(); return false; }
    // SDK geri çağrı vermezse oyun kilitlenmesin (yalnız tarayıcıda).
    if (typeof window !== "undefined" && window.setTimeout) window.setTimeout(go, 20000);
    return true;
  }

  replay() {
    // Çevrimiçi maç: yeni maç odaya dönüşle kurulur (aynı odada yeniden eşleşme
    // akışı F4'e bırakıldı); "Tekrar Oyna" bu modda gizlidir.
    if (this.mode === "online") { this.quitToMenu(); return; }
    // Öğretici maçı: koç adımları sıfırlansın diye aynı kurulumla yeniden başlar
    if (this.mode === "tutorial") { this.beginTutorial(); return; }
    this._afterMidgame(() => {
      if (this.selectedChars.length && this.selectedChars.every(Boolean) && this.selectedMap) {
        this.cancelCharge();
        this.startGame();
      } else {
        this.reset();
      }
    });
  }

  renderCountSelect(ctx) {
    const W = this.W, H = this.H;
    const timeMs = this.renderTimeMs || 0;
    drawClouds(ctx, W, "rgba(190,215,240,0.14)");
    _msBackdrop(ctx, W, H, timeMs);

    // Başlık Bölgesi
    const titleY = Math.max(24, Math.round(H * 0.11));
    const titleText = t("mode.playerCount.title", "Kaç oyuncu?");

    // Başlık aurası
    const tglow = ctx.createRadialGradient(W / 2, titleY + 20, 6, W / 2, titleY + 20, 220);
    tglow.addColorStop(0, "rgba(244, 189, 98, 0.16)");
    tglow.addColorStop(0.55, "rgba(113, 211, 189, 0.035)");
    tglow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tglow;
    ctx.fillRect(W / 2 - 240, titleY - 14, 480, 72);

    // Üst mikro damga
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(113, 211, 189, 0.65)";
    ctx.font = uiTitleFont(10, 700);
    ctx.fillText("PROT-9 // LOCAL MULTIPLAYER SETUP", W / 2, titleY);

    // Ana Başlık
    ctx.font = uiTitleFont(Math.min(34, Math.round(W * 0.04)), 700);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillText(titleText, W / 2 + 2, titleY + 16);
    ctx.fillStyle = "#ffe45e";
    ctx.shadowColor = "rgba(255, 228, 94, 0.42)";
    ctx.shadowBlur = 10;
    ctx.fillText(titleText, W / 2, titleY + 14);
    ctx.shadowBlur = 0;

    // Başlık altı dekoratif tehlike şeridi
    _csHazardStrip(ctx, W / 2 - 120, titleY + 52, 240, 3);

    // Slogan
    ctx.fillStyle = "#a2b8c2";
    ctx.font = uiTextFont(12, 600);
    ctx.fillText("// " + t("mode.playerCount.sub", "Aynı ekranda sırayla oynayacak oyuncu adedi") + " //", W / 2, titleY + 60);

    const BTN_W = Math.min(106, Math.floor((W - 80) / 5 - 12)), BTN_H = 128, GAP = 14;
    const count = MAX_PLAYERS - MIN_PLAYERS + 1;
    const totalW = count * BTN_W + (count - 1) * GAP;
    const startX = (W - totalW) / 2;
    const y = Math.round(H / 2 - 38);
    this._countRects = [];
    const mx = this.input.mouseX, my = this.input.mouseY;

    for (let i = 0; i < count; i++) {
      const nPlayers = MIN_PLAYERS + i;
      const x = startX + i * (BTN_W + GAP);
      this._countRects.push({ x, y, w: BTN_W, h: BTN_H, n: nPlayers });

      const hovered = mx >= x && mx <= x + BTN_W && my >= y && my <= y + BTN_H;
      const isDefault = nPlayers === this.playerCount;
      const hy = hovered ? y - 3 : y;
      const pColor = PLAYER_TINTS[i % PLAYER_TINTS.length];

      _csPanel(ctx, x, hy, BTN_W, BTN_H, {
        accent: hovered ? "#ffe45e" : isDefault ? "#4aa3ff" : "#2a3848",
        hover: hovered, glow: hovered || isDefault,
        selected: isDefault,
        fillTop: isDefault ? "rgba(74,163,255,0.12)" : hovered ? "rgba(255,228,94,0.06)" : null,
      });

      // Kart üstü renk çizgisi
      ctx.fillStyle = hovered ? "#ffe45e" : isDefault ? "#4aa3ff" : _hexA(pColor, 0.7);
      ctx.fillRect(x + 8, hy + 1, BTN_W - 16, 2.5);

      // Sayı
      ctx.fillStyle = hovered ? "#ffffff" : isDefault ? "#4aa3ff" : "#eef5ff";
      ctx.font = uiTitleFont(30, 700);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(nPlayers), x + BTN_W / 2, hy + 38);

      // Oyuncu renk paleti noktaları
      const dotR = 3.5, dotGap = 3;
      const totalDotsW = nPlayers * (dotR * 2) + (nPlayers - 1) * dotGap;
      const dotsStartX = x + (BTN_W - totalDotsW) / 2 + dotR;
      for (let d = 0; d < nPlayers; d++) {
        ctx.beginPath();
        ctx.arc(dotsStartX + d * (dotR * 2 + dotGap), hy + 68, dotR, 0, Math.PI * 2);
        ctx.fillStyle = PLAYER_TINTS[d % PLAYER_TINTS.length];
        ctx.fill();
      }

      // Oyuncu etiketi
      ctx.fillStyle = hovered ? "#cfe0ee" : "#8fa6bd";
      ctx.font = uiTitleFont(10, 700);
      ctx.fillText(t("mode.playerCount.players", "{n} OYUNCU", { n: nPlayers }), x + BTN_W / 2, hy + 88);

      // Alt durum
      if (isDefault) {
        ctx.font = uiTitleFont(9, 700);
        ctx.fillStyle = "#4aa3ff";
        ctx.fillText("✓ " + t("common.selected", "SEÇİLİ"), x + BTN_W / 2, hy + BTN_H - 12);
      } else if (hovered) {
        ctx.font = uiTitleFont(9, 700);
        ctx.fillStyle = "#ffe45e";
        ctx.fillText(t("menu.card.enter", "BAŞLAT ➔"), x + BTN_W / 2, hy + BTN_H - 12);
      }
    }

    // Alt bilgilendirme çubuğu
    const infoW = Math.min(520, W - 60);
    const infoX = (W - infoW) / 2;
    const infoY = y + BTN_H + 20;
    _csPanel(ctx, infoX, infoY, infoW, 46, { accent: "rgba(113,211,189,0.3)", rivets: false, fillTop: "rgba(113,211,189,0.04)" });
    ctx.fillStyle = "#eef5ff";
    ctx.font = uiTextFont(12, 600);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t("mode.playerCount.hint", "Bir sayıya tıkla — sonra her oyuncu sırayla robotunu seçer"), W / 2, infoY + 14);
    ctx.fillStyle = "#8fa6bd";
    ctx.font = uiTextFont(11);
    ctx.fillText(t("mode.playerCount.hintFast", "Test için 2 oyuncu en hızlısıdır"), W / 2, infoY + 32);

    // Geri: oyuncu sayısı ekranından ana menüye dönüş (Esc ile aynı rota).
    this.drawBackButton(ctx, t("common.mainMenu", "‹ Ana Menü"));
  }

  handleCountSelectClick(mx, my) {
    if (this.hitBackButton(mx, my)) { SFX.uiClick(); this.state = "MODE_SELECT"; this.updateHud(); return; }
    if (!this._countRects) return;
    for (const r of this._countRects) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        SFX.uiClick();
        this.beginCharSelect(r.n);
        return;
      }
    }
  }

  get active() { return this.players[this.turn]; }

  isHumanTurn() { return !!this.active && this.active.control !== "bot"; }

  clearTurnInput() {
    this.input.left = false;
    this.input.right = false;
    this.input.charging = false;
    this.input.power = 0;
    updatePowerBar(0, false);
  }

  bindInput() {
    window.addEventListener("keydown", (e) => {
      // Çevrimiçi lobi açıkken klavye oraya gider (oda kodu yazımı, hazır,
      // başlat). Tarayıcı kısayolları (Ctrl/Cmd/Alt + tuş) TÜKETİLMEZ:
      // preventDefault çağrılırsa tarayıcının YAPIŞTIRMA eylemi iptal olur ve
      // `paste` olayı hiç doğmaz — oda kodu yapıştırma bu yüzden çalışmıyordu
      // (kullanıcı bildirimi).
      if (this.handleLobbyKey(e)) {
        if (e.key !== "m" && e.key !== "M") e.preventDefault?.();
        return;
      }
      // Kaydırıcının ok tuşları ve butonun Space/Enter girdileri oyuna geçmez.
      if (e.target.closest?.("#audio-control") && !["m", "M", "Escape"].includes(e.key)) return;
      // Alt panel butonları odaktayken Space/Enter tarayıcının tıklamasına
      // bırakılır (ateş/güç doldurma tetiklenmesin).
      if (e.target.closest?.("#battle-actions") && (e.code === "Space" || e.key === "Enter")) return;
      // Esc: bağlama göre geri/iptal — atışı iptal et, seçim ekranında geri git,
      // oyun içindeyse menüye dön.
      if (e.key === "Escape") {
        e.preventDefault();
        if (typeof GameSettings !== "undefined" && GameSettings.isOpen()) {
          GameSettings.close();
          return;
        }
        // Açık silah listesi varsa önce onu kapat (menüye dönmeden).
        if (this.weaponMenuOpen && this.state === "AIMING") { this.weaponMenuOpen = false; this.updateHud(); return; }
        this.goBack(); return;
      }
      // Atölye: ok tuşları sayfa/dal gezinir, Enter/Space satın alır.
      if (this.state === "WORKSHOP" && this.handleWorkshopKey(e)) return;
      // Pazar: 1..5 sekmeler (cephane + dört yuva).
      if (this.state === "MARKET") {
        const idx = Number(e.key) - 1;
        if (Number.isInteger(idx) && idx >= 0 && idx < MARKET_TABS.length) {
          this.switchMarketTab(MARKET_TABS[idx].id);
          return;
        }
      }
      if (this.state === "CHAR_SELECT") {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.changeCharPage(-1);
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.changeCharPage(1);
      }
      if (this.state === "MAP_SELECT") {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.changeMapPage(-1);
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.changeMapPage(1);
      }
      if (this.state === "AIMING" && this.isLocalTurn() && (e.key === "a" || e.key === "A" || e.key === "ArrowLeft")) this.input.left = true;
      if (this.state === "AIMING" && this.isLocalTurn() && (e.key === "d" || e.key === "D" || e.key === "ArrowRight")) this.input.right = true;
      if (this.state === "AIMING" && this.isLocalTurn()) {
        const a = this.active;
        // İnce açı ayarı: R/F tuşları veya Shift+Yukarı / Aşağı Ok
        if (e.key === "r" || e.key === "R" || (e.key === "ArrowUp" && (e.shiftKey || this.input.charging))) {
          e.preventDefault();
          const dir = a.facing >= 0 ? -1 : 1;
          a.aim += dir * 0.028;
          this.input.mouseX = a.x + Math.cos(a.aim) * 120;
          this.input.mouseY = (a.y - a.r) + Math.sin(a.aim) * 120;
          this.input.mouseMoved = false;
          return;
        }
        if (e.key === "f" || e.key === "F" || e.key === "ArrowDown") {
          e.preventDefault();
          const dir = a.facing >= 0 ? 1 : -1;
          a.aim += dir * 0.028;
          this.input.mouseX = a.x + Math.cos(a.aim) * 120;
          this.input.mouseY = (a.y - a.r) + Math.sin(a.aim) * 120;
          this.input.mouseMoved = false;
          return;
        }
      }
      if (e.code === "Space") { e.preventDefault(); this.startCharge(); }
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
        e.preventDefault();
        if (this.state === "AIMING" && this.isLocalTurn()) {
          if (this.mode === "online") {
            // Sıçrama yetkili tarafta uygulanır; misafir anında geri bildirim
            // için kendi kopyasında da zıplatır (snapshot düzeltir).
            if (this.online.role === "guest" && this.active.jump()) SFX.jump();
            this.onlineCommand({ kind: NET_CMD.JUMP });
          } else if (this.active.jump()) {
            SFX.jump();
            if (this.mode === "tutorial") this._tutComplete(1); // rehber adımı: sıçrama
          }
        }
      }
      if ((e.key === "q" || e.key === "Q") && this.state === "AIMING" && this.isLocalTurn()) {
        this.usePlayerSkill();
      }
      if ((e.key === "m" || e.key === "M") && !e.repeat) this.toggleMute();
      // Silah seçimi: 1-5 sayı tuşları
      if (this.state === "AIMING" && e.key >= "1" && e.key <= "9") {
        this.selectWeapon(parseInt(e.key, 10) - 1);
      }
    });
    window.addEventListener("keyup", (e) => {
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") this.input.left = false;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") this.input.right = false;
      if (e.code === "Space" && !e.target.closest?.("#audio-control")) this.releaseFire();
    });

    /* Tuval basımı: koordinat OLAYIN kendisinden hesaplanır. Önbellekteki
     * `input.mouseX/mouseY` yalnız `mousemove` ile güncellenir; dokunmatik
     * ekranda/çizim kaleminde hiç `mousemove` gelmez, değer (0,0) kalır ve
     * menü düğmelerinin HİÇBİRİ tutmaz — "bazen butonlar çalışmıyor"un bir
     * nedeni buydu. */
    const rect = () => this.canvas.getBoundingClientRect();
    this.canvas.addEventListener("mousemove", (e) => {
      // Çevrimiçi host: sıra karşı taraftayken kendi faremiz nişanı ELE GEÇİRMEZ
      // (karşı tarafın nişanı INPUT paketiyle `setInput` üzerinden yazılır).
      if (this.mode === "online" && this.online && this.online.role === "host" && this.turn !== 0) return;
      const r = rect();
      this.input.mouseX = (e.clientX - r.left) * (this.W / r.width);
      this.input.mouseY = (e.clientY - r.top) * (this.H / r.height);
      this.input.mouseMoved = true;
    });
    this.canvas.addEventListener("mousedown", (e) => this.pressCanvas(e, e.button));

    /* Dokunmatik: `touchstart` ayrıca dinlenir ve sentetik `mousedown`
     * bastırılır (preventDefault) ki tek dokunuş iki kez işlenmesin. Sürükleme
     * nişanı günceller, parmağı kaldırmak atışı bırakır (battle); menülerde
     * tek dokunuş düğmeyi çalıştırır. */
    this.canvas.addEventListener("touchstart", (e) => {
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      e.preventDefault();
      this.pressCanvas(t, 0);
    }, { passive: false });
    this.canvas.addEventListener("touchmove", (e) => {
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      e.preventDefault();
      const pt = this.pointerWorld(t);
      this.input.mouseX = pt.x;
      this.input.mouseY = pt.y;
      this.input.mouseMoved = true;
    }, { passive: false });
    const endTouch = (e) => {
      if (e.cancelable) e.preventDefault();
      if (this.state === "AIMING") this.releaseFire();
    };
    this.canvas.addEventListener("touchend", endTouch, { passive: false });
    this.canvas.addEventListener("touchcancel", endTouch, { passive: false });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.releaseFire();
    });

    // Sağ tık menüsünü engelle (canvas üzerinde sağ tık = atış iptali)
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Fare tekerleği: silahlar arasında gez
    this.canvas.addEventListener("wheel", (e) => {
      if (this.state === "WORKSHOP") {
        e.preventDefault();
        this.changeWorkshopPage(Math.sign(e.deltaY) || 1);
        return;
      }
      if (this.state === "MARKET") {
        e.preventDefault();
        // Tek liste değil iki sekme: tekerlek AKTİF sekmeyi sayfalar.
        this.changeMarketPage(Math.sign(e.deltaY) || 1);
        return;
      }
      if (this.state === "CHAR_SELECT") {
        e.preventDefault();
        this.changeCharPage(Math.sign(e.deltaY) || 1);
        return;
      }
      if (this.state === "MAP_SELECT") {
        e.preventDefault();
        this.changeMapPage(Math.sign(e.deltaY) || 1);
        return;
      }
      if (this.state !== "AIMING" || !this.isHumanTurn()) return;
      e.preventDefault();
      this.cycleWeapon(Math.sign(e.deltaY) || 1);
    }, { passive: false });

    // Pencere boyutu değişince alt HUD çapaları yeniden hesaplanır (modül kartı
    // inset'i tuval ölçeğine bağlı; panel yüksekliği sabit kalsa da inset değişir).
    window.addEventListener("resize", () => this.syncBottomHud());

    // Silah çubuğu: çipe tıklayınca seç (delegasyon — innerHTML yenilense de kopmaz)
    const wbar = document.getElementById("weapon-bar");
    if (wbar) {
      wbar.addEventListener("click", (e) => {
        const chip = e.target.closest(".weapon-chip");
        if (!chip || chip.classList.contains("disabled")) return;
        this.selectWeapon(parseInt(chip.dataset.weapon, 10));
      });
      // Çubuğun üzerinde tekerlek: silahları yatay kaydır (dikey tekerleği yana çevir)
      wbar.addEventListener("wheel", (e) => {
        if (!e.deltaY) return;
        e.preventDefault();
        wbar.scrollLeft += e.deltaY;
      }, { passive: false });
    }

    // Alt panel (Wild Ones düzeni): SİLAH DEĞİŞTİR açılır listeyi açar/kapatır;
    // hızlı yuvalar modül kullanır, Işınlanma Topu / Kanca'yı doğrudan seçer.
    const toggleBtn = document.getElementById("weapon-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        if (this.state !== "AIMING" || !this.isHumanTurn()) return;
        this.weaponMenuOpen = !this.weaponMenuOpen;
        toggleBtn.blur(); // Space/Q/1–9 kısayolları odakta takılmasın
        SFX.uiClick();
        this.updateHud();
      });
    }
    const actions = document.getElementById("battle-actions");
    if (actions) {
      actions.addEventListener("click", (e) => {
        const slot = e.target.closest && e.target.closest(".act-slot");
        if (!slot || this.state !== "AIMING" || !this.isHumanTurn()) return;
        slot.blur(); // klavye kısayolları (Space/Q/1–9) odağı çalmasın
        const kind = slot.dataset.slot;
        if (kind === "weapon") {
          this.weaponMenuOpen = !this.weaponMenuOpen;
          SFX.uiClick();
          this.updateHud();
          return;
        }
        if (kind === "skill") { this.usePlayerSkill(); return; }
        const id = kind === "teleport" ? "teleportball" : kind === "hook" ? "hook" : null;
        if (!id) return;
        const idx = WEAPONS.findIndex((w) => w.id === id);
        if (idx >= 0) this.selectWeapon(idx);
      });
    }
  }

  /* Çevrimiçi lobi açıkken klavyeyi lobiye devreder. Dönüş: olay TÜKETİLDİ mi?
   * Değiştirici tuş (Ctrl/Cmd/Alt) basılıysa tüketilmez — yapıştırma/kopyalama
   * gibi tarayıcı eylemleri engellenmemeli (aksi hâlde Ctrl+V hiç `paste`
   * olayı üretmez ve oda kodu yapıştırılamaz). */
  handleLobbyKey(e) {
    if (this.state !== "ONLINE_LOBBY" || !this.lobby) return false;
    return this.lobby.handleKey(e) !== false;
  }

  // Olay koordinatını dünya koordinatına çevirir (tuval CSS kutusuna göre).
  pointerWorld(e) {
    const c = this.canvas;
    // Sondalar/sahte oyun nesneleri tuval taşımayabilir (Object.create(Game.prototype)).
    if (!c || !c.getBoundingClientRect) return { x: this.input.mouseX, y: this.input.mouseY };
    const r = c.getBoundingClientRect();
    if (!r || !r.width || !r.height) return { x: this.input.mouseX, y: this.input.mouseY };
    return {
      x: (e.clientX - r.left) * (this.W / r.width),
      y: (e.clientY - r.top) * (this.H / r.height),
    };
  }

  /* Tuval basımı (fare sol/sağ, dokunma, kalem). Tek giriş noktası: koordinat
   * olaydan alınır, `input` güncellenir ve ekranın kendi işleyicisi çağrılır. */
  pressCanvas(e, button) {
    const pt = this.pointerWorld(e);
    this.input.mouseX = pt.x;
    this.input.mouseY = pt.y;
    if (this.state === "ONLINE_LOBBY") {
      // Lobi: yalnız sol tuş/dokunuş (sağ tık menü açmasın).
      if (button === 0) this.lobby.handleClick(pt.x, pt.y);
      return;
    }
    if (this.state === "WORKSHOP") { this.handleWorkshopClick(pt.x, pt.y); return; }
    if (this.state === "MARKET") { this.handleMarketClick(pt.x, pt.y, !!e.shiftKey, !!(e.ctrlKey || e.altKey || e.metaKey)); return; }
    if (this.state === "TUTORIAL") { this.handleTutorialClick(pt.x, pt.y); return; }
    if (this.state === "COUNT_SELECT") { this.handleCountSelectClick(pt.x, pt.y); return; }
    if (this.state === "MODE_SELECT") { this.handleModeSelectClick(pt.x, pt.y); return; }
    if (this.state === "DIFFICULTY_SELECT") { this.handleDifficultySelectClick(pt.x, pt.y); return; }
    if (this.state === "BOT_COUNT_SELECT") { this.handleBotCountSelectClick(pt.x, pt.y); return; }
    if (this.state === "CHAR_SELECT") { this.handleCharSelectClick(pt.x, pt.y); return; }
    if (this.state === "MAP_SELECT") { this.handleMapSelectClick(pt.x, pt.y); return; }
    if (button === 2) { this.cancelCharge(); return; } // sağ tık: atışı iptal
    if (button === 0) this.startCharge();
  }

  /* Silah değişimini yetkili tarafa bildirir. Host zaten yetkilidir (yerel
   * değişikliği durum paketiyle misafire gider); MİSAFİRİN seçimi ise hosttan
   * gelen snapshot'ta `weapon` alanı her pakette geri yazıldığı için komutla
   * bildirilmezse ~100 ms sonra siliniyordu — misafir silah değiştiremiyordu
   * (kullanıcı bildirimi). Yerel seçim anında gösterilir (iyimser); host
   * reddederse (ör. mühimmat yok) snapshot ve ACK bildirimi düzeltir. */
  _syncWeaponOnline() {
    const o = this.online;
    if (this.mode !== "online" || !o || o.role === "host") return;
    const a = this.active;
    if (!a || !a.weaponSpec) return;
    this.onlineCommand({ kind: NET_CMD.WEAPON, weaponId: a.weaponSpec.id });
  }

  // Silah seçimi (yalnız AIMING). Mühimmatı olmayan silah atlanır.
  selectWeapon(i) {
    if (this.state !== "AIMING" || !this.isLocalTurn()) return;
    const a = this.active;
    if (!a || i < 0 || i >= WEAPONS.length || !a.hasAmmo(i)) return;
    const changed = a.weapon !== i;
    if (changed) SFX.weaponSwitch();
    a.weapon = i;
    if (changed) this._syncWeaponOnline();
    this.weaponMenuOpen = false; // seçim yapıldı: açılır liste kapanır
    this.updateHud();
  }

  // Dahili modülü kullan (Q tuşu ve alt paneldeki modül yuvası aynı yolu kullanır).
  usePlayerSkill() {
    if (this.state !== "AIMING" || !this.isLocalTurn()) return;
    if (this.mode === "online") {
      // Modül hostta yetkili olarak uygulanır. Misafir ANINDA görsel geri
      // bildirim için kendi kopyasında da çalıştırır; gerçek sonuç (hasar,
      // cooldown, mühimmat) snapshot ile düzelir.
      if (this.online && this.online.role === "guest") this._applyModule();
      this.onlineCommand({ kind: NET_CMD.MODULE, angle: this.active.aim });
      return;
    }
    this._applyModule();
  }

  /* Modül gövdesi: yerel yol ve çevrimiçi yetkili yol (js/net/adapter.js)
   * AYNI bu gövdeyi çağırır — çevrimiçi dalına yeniden girip döngü kurmaz. */
  _applyModule() {
    const kind = this.active.skillKind;
    if (useSkill(this.active, this)) {
      SFX.skill(kind);
      // Hasar veren modül turun atış hakkını doldurur: bu tur artık ateş
      // edilemez, sıra fizik yatıştıktan sonra biter.
      if (skillConsumesShot(kind)) this.spendSkillShot(this.active);
    }
    this.updateHud();
  }

  // Önceki/sonraki kullanılabilir silaha geç (fare tekerleği)
  cycleWeapon(dir) {
    if (this.state !== "AIMING" || !this.isLocalTurn()) return;
    const a = this.active;
    if (!a) return;
    const n = WEAPONS.length;
    const before = a.weapon;
    let i = a.weapon;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (a.hasAmmo(i)) { if (a.weapon !== i) SFX.weaponSwitch(); a.weapon = i; break; }
    }
    if (a.weapon !== before) this._syncWeaponOnline();
    this.weaponMenuOpen = false;
    this.updateHud();
  }

  startCharge() {
    if (this.state !== "AIMING" || !this.isLocalTurn()) return;
    // Açık silah listesi varsa ilk tıklama yalnız listeyi kapatır: oyuncu
    // listeyi gezerken yanlışlıkla ateş başlamasın.
    if (this.weaponMenuOpen) { this.weaponMenuOpen = false; this.updateHud(); return; }
    if (this.mode === "online") {
      // Güç doldurma CHARGE komutuyla açılır (host kendi komutunu da aynı
      // doğrulamadan geçirir); misafir anında güç barı için yerel bayrağı da
      // kaldırır — yetkili sonuç RELEASE ile gider.
      const o = this.online;
      if (!o) return;
      if (!o.chargeId) o.chargeId = "ch" + (++o.chargeSeq);
      const res = this.onlineCommand({ kind: NET_CMD.CHARGE, chargeId: o.chargeId });
      if (o.role === "guest" && (!res || res.ok !== false)) this.input.charging = true;
      return;
    }
    this.input.charging = true;
  }

  releaseFire() {
    if (this.state !== "AIMING" || !this.input.charging) return;
    if (this.mode === "online") {
      const o = this.online;
      if (!o) return;
      const power = this.input.power;
      const a = this.active;
      const cmd = {
        kind: NET_CMD.RELEASE, chargeId: o.chargeId || "ch" + (++o.chargeSeq),
        weaponId: a.weaponSpec.id, angle: a.aim, power,
      };
      this.input.charging = false;
      this.input.power = 0;
      updatePowerBar(0, false);
      const res = this.onlineCommand(cmd);
      o.chargeId = null;   // doldurma kapandı (yeni atış yeni chargeId açar)
      if (res && res.ok === false && res.reason) this.onlineNotice(res.reason);
      return;
    }
    this.input.charging = false;
    const power = this.input.power;
    this.input.power = 0;
    updatePowerBar(0, false);
    this.fire(power);
  }

  // Güç dolduruluyorsa atışı ateş etmeden iptal et. İptal edildiyse true döner.
  cancelCharge() {
    if (!this.input.charging) return false;
    if (this.mode === "online" && this.online && this.online.chargeId) {
      this.onlineCommand({ kind: NET_CMD.CANCEL, chargeId: this.online.chargeId });
      this.online.chargeId = null;
    }
    this.input.charging = false;
    this.input.power = 0;
    updatePowerBar(0, false);
    return true;
  }

  // Sesi aç/kapat ve HUD butonunun etiketini güncelle (M tuşu + buton).
  toggleMute() {
    SFX.toggleMute();
    this.updateMuteButton();
  }

  // Müziği aç/kapat (Müzik butonu).
  toggleMusicMute() {
    SFX.toggleMusicMute();
    this.updateMuteButton();
  }

  updateMuteButton() {
    // SFX / Oyun sesi
    const btn = document.getElementById("mute-btn");
    const muted = SFX.isMuted();
    const percent = Math.round(SFX.getVolume() * 100);
    if (btn) {
      btn.setAttribute("aria-pressed", String(muted));
      btn.setAttribute("aria-label", muted ? t("hud.mute.on", "Sesi aç") : t("hud.mute.off", "Sesi kapat"));
      btn.title = `${muted ? t("hud.mute.on", "Sesi aç") : t("hud.mute.off", "Sesi kapat")} (M)`;
    }
    const label = document.getElementById("mute-label");
    if (label) label.textContent = muted ? t("hud.mute.labelOn", "Sessiz") : t("hud.mute.labelOff", "Ses");
    const control = document.getElementById("audio-control");
    if (control) {
      control.dataset.muted = String(muted);
      control.style.setProperty("--volume-fill", `${percent}%`);
    }
    const slider = document.getElementById("volume-slider");
    if (slider) {
      slider.value = percent;
      slider.setAttribute("aria-valuetext", `%${percent}${muted ? ", sessiz" : ""}`);
    }
    const value = document.getElementById("volume-value");
    if (value) value.textContent = `${percent}%`;

    // Arka plan müziği
    const musicBtn = document.getElementById("music-mute-btn");
    const musicMuted = typeof SFX.isMusicMuted === "function" ? SFX.isMusicMuted() : false;
    const musicPercent = typeof SFX.getMusicVolume === "function" ? Math.round(SFX.getMusicVolume() * 100) : 0;
    if (musicBtn) {
      musicBtn.setAttribute("aria-pressed", String(musicMuted));
      musicBtn.setAttribute("aria-label", musicMuted ? t("hud.music.on", "Müziği aç") : t("hud.music.off", "Müziği kapat"));
      musicBtn.title = musicMuted ? t("hud.music.on", "Müziği aç") : t("hud.music.off", "Müziği kapat");
    }
    const musicLabel = document.getElementById("music-mute-label");
    if (musicLabel) musicLabel.textContent = musicMuted ? t("hud.music.labelOn", "Müzik") : t("hud.music.labelOff", "Müzik");
    if (control) {
      control.dataset.musicMuted = String(musicMuted);
      control.style.setProperty("--music-fill", `${musicMuted ? 0 : musicPercent}%`);
    }
    const musicSlider = document.getElementById("music-volume-slider");
    if (musicSlider) {
      musicSlider.value = musicMuted ? 0 : musicPercent;
      musicSlider.setAttribute("aria-valuetext", `%${musicPercent}${musicMuted ? ", kapalı" : ""}`);
    }
    const musicValue = document.getElementById("music-volume-value");
    if (musicValue) musicValue.textContent = musicMuted ? "0%" : `${musicPercent}%`;
  }

  // Oyundan çık: bekleyen bot kararını ve girdileri temizleyip mod menüsüne dön.
  quitToMenu() {
    this.recoverCanvas();
    this.clearTurnInput();
    // Portal (F5): menüye dönüş oynanış molasıdır; maç sonu kartından
    // gelindiyse maç arası reklam fırsatı değerlendirilir.
    this.portalGameplay(false);
    if (this.state === "GAMEOVER") this.portalMidgame();
    // Çevrimiçi maçtan çıkış: karşı tarafa iptal bildirilir, taşıma kapanır.
    if (this.online) {
      try { this.online.session.abort("LEFT"); } catch (e) { /* yoksay */ }
      this.closeOnline();
    }
    this.bot.cancel();
    for (const b of this.bots) b.cancel();
    // Yarıda bırakılan maçta da yüklenmiş cephane envantere geri döner.
    this._settleAmmoDepot();
    this.reset();
  }

  // Cephane deposunu maç sonucuna göre günceller: yüklenen ek mermiden
  // harcanan kısım ortak depodan (profile.ammo) düşülür; harcanmayan kısım
  // zaten depoda olduğu için yeniden eklenmez ve profil kaydedilir. Snapshot
  // taşıyan oyuncu yoksa (yerel maç, bot, ya da zaten çözülmüş maç) hiçbir
  // şey yapmaz — bu yüzden birden çok kez çağrılması güvenlidir.
  _settleAmmoDepot() {
    if (!this.profile || !this.players) return;
    const depot = getAmmoDepot(this.profile);
    let dirty = false;
    for (const ent of this.players) {
      const loaded = ent.ammoDepot;
      if (!loaded) continue;
      ent.ammoDepot = null;
      // spent = yüklenen − harcanmayan (iade); ortak depodan yalnız harcanan düşer.
      const settled = settleDepot(loaded, ent.ammo);
      for (const id of Object.keys(loaded)) {
        const spent = toSafeInt(loaded[id]) - toSafeInt(settled[id]);
        if (spent > 0) { depot[id] = Math.max(0, toSafeInt(depot[id]) - spent); dirty = true; }
      }
    }
    if (dirty) {
      setAmmoDepot(this.profile, depot);
      if (!saveProfile(this.profile)) notifyStorageFailure();
    }
  }

  // Bağlama duyarlı "geri/iptal": önce atış iptali, sonra ekranlar arası geri,
  // oyun içindeyse menüye dön. (Esc tuşu buraya bağlı.)
  goBack() {
    if (typeof GameSettings !== "undefined" && GameSettings.isOpen()) {
      GameSettings.close();
      return;
    }
    if (this.cancelCharge()) return;
    // Atölye: açık parça listesi varsa önce listeden çıkılır (ekran kapanmaz).
    if (this.state === "WORKSHOP" && this.workshopSlotOpen) { this.closeWorkshopSlot(); return; }
    if (this.state === "MAP_SELECT") { this.mapBack(); return; }
    if (this.state === "CHAR_SELECT") { this.charBack(); return; }
    if (this.state === "WORKSHOP") { this.closeWorkshop(); return; }
    if (this.state === "MARKET") { this.closeMarket(); return; }
    if (this.state === "TUTORIAL") { this.state = "MODE_SELECT"; this.updateHud(); return; }
    if (this.state === "DIFFICULTY_SELECT") { this.state = "MODE_SELECT"; this.updateHud(); return; }
    if (this.state === "BOT_COUNT_SELECT") { this.state = "DIFFICULTY_SELECT"; this.updateHud(); return; }
    if (this.state === "COUNT_SELECT") { this.state = "MODE_SELECT"; this.updateHud(); return; }
    // AIMING / PROJECTILE / SETTLE / GAMEOVER → menüye dön
    this.quitToMenu();
  }

  // Karakter seçiminde geri: P2 seçiyorsa P1 seçimine dön.
  charBack() {
    if (this.onlineRobotSelectReturn) {
      this.onlineRobotSelectReturn = false;
      this.state = "ONLINE_LOBBY";
      this.updateHud();
      return;
    }
    if (this.charSelectPhase > 0) {
      // Önceki oyuncuya dön, onun seçimini temizle
      this.charSelectPhase--;
      this.selectedChars[this.charSelectPhase] = null;
      this.charPage = 0;
      this.updateHud();
    } else {
      // İlk seçimde geri: bilgisayar modunda mod ekranına, yerelde sayıya dön
      this.state = isSinglePlayerProgressionMode(this.mode) ? "MODE_SELECT" : "COUNT_SELECT";
      this.updateHud();
    }
  }

  // Harita seçiminde geri: karakter seçimine (P2 yeniden seçer) dön.
  mapBack() {
    this.state = "CHAR_SELECT";
    this.charSelectPhase = this.selectedChars.length - 1; // son oyuncu yeniden seçsin
    this.selectedChars[this.charSelectPhase] = null;
    this.selectedMap = null;
    this.charPage = 0;
    this.updateHud();
  }

  fire(power) {
    const a = this.active;
    this.shooterIdx = this.turn;
    this.shotIsSkill = false; // normal silah atışı: Çekirdek bonusu geçerli
    this._noteHumanShot(a);
    if (this.mode === "tutorial") this._tutComplete(3); // rehber adımı: ateş
    const spec = a.weaponSpec;
    const muzzle = a.muzzle;
    a.consumeAmmo(); // mühimmatı düş (bitince Bazuka'ya döner); spec yukarıda alındı

    // nextShot yetenek modifikatörünü bu salvo için yakala (explode da okur).
    const mod = a.nextShotMod;
    a.nextShotMod = null;
    this.shotMod = mod;

    // Bomba Yağmuru: namlu/açı yerine fare hedefinin üstünden gökten düşür
    if (spec.airdrop) {
      this.fireAirdrop(a, spec, power);
      return;
    }

    const m = muzzle;
    const speed = spec.baseSpeed + power * spec.speedMul;
    let pellets = spec.pellets || 1;
    if (mod && mod.pellets > 1) pellets *= mod.pellets;
    let spread = spec.spread || 0;
    if (mod && mod.spread) spread = Math.max(spread, mod.spread);
    if (pellets > 1 && spread === 0) spread = 0.18; // tek mermilik silaha yelpaze ver
    const jitter = spec.speedJitter || 0;

    for (let i = 0; i < pellets; i++) {
      let ang = a.aim, sp = speed;
      if (pellets > 1) {
        const t = (i / (pellets - 1)) - 0.5;            // -0.5..0.5 yelpaze
        ang += t * spread;
        sp *= 1 + (Math.random() * 2 - 1) * jitter;
      }
      const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
      this.projectiles.push(new Projectile(m.x, m.y, vx, vy, spec));
    }

    SFX.shoot(spec);
    a.shotWeapon = spec;
    a.weaponRecoil = weaponRig(spec).recoil;
    a.lastShot = { aim: a.aim, power };
    this.lastShot = {
      by: a.name,
      color: a.color,
      weapon: spec.name,
      icon: spec.icon,
      angle: Math.round(-a.aim * 180 / Math.PI),
      power: Math.round(power * 100),
      speed: speed.toFixed(1),
    };
    this.state = "PROJECTILE";
  }

  // İnsanın (bot olmayan) atışı başlatıldığında ödül uygunluğu için işaretlenir;
  // sayaç, mermi çözümlenince (PROJECTILE boşalınca) ya da hasar veren modül
  // turu doğrudan kapatınca artar.
  _noteHumanShot(entity) {
    const mp = this.matchProgress;
    if (!mp) return;
    if (this.players.indexOf(entity) === mp.humanIndex) mp.pendingHumanShot = true;
  }

  // Bekleyen insan atışını çözümlenmiş say (ödül uygunluğu). Botun aksiyonunda
  // bayrak hiç işaretlenmediği için sayaç artmaz.
  _resolveHumanShot() {
    const mp = this.matchProgress;
    if (mp && mp.pendingHumanShot) { mp.humanShotsResolved++; mp.pendingHumanShot = false; }
  }

  // Bir atıcının güncel hasar çarpanı: taban robot gücü × (normal silahta)
  // çekirdek dalı bonusu × zorluk seviyesinin bot hasar ölçeği. Patlama ve
  // doğrudan isabet aynı çarpanı kullanır ki hasar iki yolda tutarlı kalsın.
  // Çekirdek bonusu yalnız normal silahta uygulanır; aparat yetenek mermileri
  // (spit) kendi dalından güçlenir, aynı hasara iki dal birden çarpılmaz.
  _shooterDamageMult(shooter) {
    if (!shooter) return 1;
    let mult = shooter.dmgMult;
    if (!this.shotIsSkill) mult *= shooter.weaponDamageMult || 1;
    mult *= shooter.aiDamageMult || 1;
    return mult;
  }

  explode(x, y, spec) {
    /* Çevrimiçi misafir: patlama YALNIZ görseldir. Arazi oyması ve hasar hostun
     * yetkisinde (TERRAIN + STATE paketleriyle gelir); misafir kendi kopyasında
     * ikinci kez oyarsa iki taraf ayrışır. */
    if (this.onlineGuest) {
      const r = Math.max(1, Math.round(spec.radius));
      this.explosions.push(new Explosion(x, y, r));
      SFX.explosion(r);
      this.triggerScreenShake(Math.min(1.0, r / 45 * 0.55));
      return;
    }
    const shooter = this.shooterIdx !== null ? this.players[this.shooterIdx] : null;
    // nextShot yeteneği: yarıçap/hasar/knockback çarpanları
    const mod = this.shotMod;
    const radius = Math.round(spec.radius * (mod ? mod.radiusMult : 1));

    this.terrain.destroy(x, y, radius);
    this.explosions.push(new Explosion(x, y, radius));
    SFX.explosion(radius);
    this.triggerScreenShake(Math.min(1.0, radius / 45 * 0.55));

    let dmgMult = this._shooterDamageMult(shooter);
    if (mod) dmgMult *= mod.dmgMult;
    const kbMult = mod ? mod.knockbackMult : 1;

    let anyHit = false;     // patlama başına tek isabet sesi (saçma başına değil)
    let anyKilled = false;  // bu patlamada yeni elenen oyuncu oldu mu
    for (const p of this.players) {
      if (!p.alive) continue;
      const dx = p.x - x, dy = (p.y - p.r) - y;
      const dist = Math.hypot(dx, dy);
      if (dist < radius + p.r) {
        const fall = 1 - dist / (radius + p.r);
        const rawDmg = Math.round(spec.damage * fall * dmgMult);
        const actual = p.damage(rawDmg);
        if (actual > 0) {
          anyHit = true;
          if (!p.alive) anyKilled = true;
          this.damagePopups.push({ x: p.x, y: p.y - p.r - 16, amount: actual, age: 0 });
          if (actual >= 45) {
            this.damagePopups.push({ x: p.x, y: p.y - p.r - 34, text: "KRİTİK! 🔥", color: "#ffd166", scale: 1.15, age: 0 });
          }
          // Maç içi insan performansı takibi (Combat Primleri)
          if (shooter && shooter.control !== "bot" && p !== shooter && this.combatStats) {
            this.combatStats.damageDealt += actual;
            if (dist < p.r + 6) this.combatStats.directHits++;
            if (!p.alive) {
              this.combatStats.kills++;
              if (!this.combatStats.firstKillClaimed) {
                this.combatStats.firstKillClaimed = true;
                this.combatStats.firstBlood = true;
                this.damagePopups.push({ x: p.x, y: p.y - p.r - 48, text: "İLK KAN! 🩸 +20 🔩", color: "#ff4444", scale: 1.25, age: 0 });
              }
            }
          }
        } else if (rawDmg > 0) {
          this.damagePopups.push({ x: p.x, y: p.y - p.r - 28, text: "KALKANLA ENGELLENDİ!", color: "#62d9ff", scale: 1.05, age: 0 });
        }
        // Aşındırıcı mermi: atıcı hariç hedefe zamanlı hasar bulaştır
        if (spec.poison && p !== shooter) {
          p.poison = { dps: spec.poison.dps || 8, turns: spec.poison.turns || 2 };
        }
        const kb = spec.knockback * fall * kbMult * (p.knockbackTakenMult || 1);
        const ang = Math.atan2(dy, dx);
        p.vx += Math.cos(ang) * kb;
        p.vy += Math.sin(ang) * kb - 2;
        p.onGround = false;
      }
    }
    if (anyHit) SFX.hit();
    if (anyKilled) SFX.eliminate();

    // Varil ve sandık patlama etkileri
    if (this.barrels) {
      for (const b of this.barrels) {
        if (!b.alive) continue;
        const bd = Math.hypot(b.x - x, b.y - y);
        if (bd < radius + b.r) {
          const fall = 1 - bd / (radius + b.r);
          b.hp -= Math.round((spec.damage || 35) * fall);
          if (b.hp <= 0 && b.alive) {
            b.alive = false;
            setTimeout(() => {
              this.explode(b.x, b.y, { radius: 52, damage: 48, knockback: 13, special: "Varil" });
              this.damagePopups.push({ x: b.x, y: b.y - 20, text: "VARİL PATLADI! 💥", color: "#ff8c00", scale: 1.25, age: 0 });
            }, 90);
          }
        }
      }
    }
    if (this.crates) {
      for (const c of this.crates) {
        if (c.dead) continue;
        if (Math.hypot(c.x - x, c.y - y) < radius + 12) {
          c.dead = true;
          this.damagePopups.push({ x: c.x, y: c.y - 12, text: "SANDIK İMHA EDİLDİ!", color: "#ff9966", scale: 1.0, age: 0 });
        }
      }
    }

    // Misket: patlama noktasından yukarı-dışarı parçacıklar saç (kendi spec'iyle;
    // clusterSpec'in cluster bayrağı olmadığından tekrar bölünmezler).
    if (spec.cluster) {
      for (let i = 0; i < spec.clusterCount; i++) {
        const a2 = -Math.PI / 2 + (Math.random() * 2 - 1) * 0.9; // çoğunlukla yukarı
        const s = 3 + Math.random() * 3;
        this.projectiles.push(new Projectile(x, y - 4, Math.cos(a2) * s, Math.sin(a2) * s, spec.clusterSpec));
      }
    }

    // Napalm: patlama noktasının çevresine yanan alan bırak
    if (spec.napalm) this.spawnFires(x, y, spec);
    // SETTLE'a geçişi mermi döngüsü karar verir (tüm mermiler bitince).
  }

  // ── Yetenek hasar yardımcıları (melee/radial/quake/dash anlık hasarı) ──────
  // Patlama dışındaki hasarlar da aynı sesli geri bildirimi kullanır.
  // Kalkanın engellediği hasar ve zaten ölü hedefler yeni ses üretmez.
  damagePlayer(target, amount) {
    if (!target.alive) return 0;
    const actual = target.damage(amount);
    if (actual > 0) {
      this.damagePopups.push({ x: target.x, y: target.y - target.r - 16, amount: actual, age: 0 });
      SFX.hit();
      if (actual >= 45) {
        this.damagePopups.push({ x: target.x, y: target.y - target.r - 34, text: "KRİTİK! 🔥", color: "#ffd166", scale: 1.15, age: 0 });
      }
    } else if (amount > 0) {
      this.damagePopups.push({ x: target.x, y: target.y - target.r - 28, text: "KALKANLA ENGELLENDİ!", color: "#62d9ff", scale: 1.05, age: 0 });
    }
    if (!target.alive) SFX.eliminate();
    return actual;
  }

  // Tek hedefe hasar + (fromX,fromY)'den uzağa knockback uygular; popup ekler.
  applySkillDamage(target, amount, fromX, fromY, knockback) {
    if (!target.alive) return 0;
    const actual = this.damagePlayer(target, Math.round(amount));
    const dx = target.x - fromX, dy = (target.y - target.r) - fromY;
    const ang = Math.atan2(dy, dx);
    const kb = knockback * (target.knockbackTakenMult || 1);
    target.vx += Math.cos(ang) * kb;
    target.vy += Math.sin(ang) * kb - 2; // hafif yukarı savur
    target.onGround = false;
    return actual;
  }

  // (x,y) merkezli yarıçap içindeki tüm düşmanlara mesafeyle azalan hasar.
  applyAreaDamage(x, y, radius, damage, knockback, exclude) {
    for (const p of this.players) {
      if (!p.alive || p === exclude) continue;
      const dx = p.x - x, dy = (p.y - p.r) - y;
      const dist = Math.hypot(dx, dy);
      if (dist < radius + p.r) {
        const fall = 1 - dist / (radius + p.r);
        this.applySkillDamage(p, damage * fall, x, y, knockback * fall);
      }
    }
  }

  // `spit` yeteneği: namludan gerçek mermi(ler) fırlat ve PROJECTILE'a geç.
  spawnSkillProjectiles(entity, p) {
    const baseSpec = SKILL_PROJECTILES[p.proj] || SKILL_PROJECTILES.fireball;
    // Aparat gücü fırlatılan merminin hasarını ve yarıçapını da ölçekler;
    // kaynak spec mutasyona uğratılmaz, ölçekli kopya üretilir.
    const scale = p.specScale || 1;
    const spec = scale !== 1 ? Object.assign({}, baseSpec, {
      damage: Math.round(baseSpec.damage * scale),
      radius: Math.round(baseSpec.radius * scale),
    }) : baseSpec;
    const idx = this.players.indexOf(entity);
    this.shooterIdx = idx >= 0 ? idx : this.turn;
    this.shotMod = null;
    this.shotIsSkill = true; // aparat mermisi: Çekirdek bonusu uygulanmaz
    this._noteHumanShot(entity);
    const m = entity.muzzle;
    const count = p.count || 1;
    const spread = p.spread || 0;
    const speed = p.speed || 9;
    const jitter = p.speedJitter || 0;
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? (i / (count - 1)) - 0.5 : 0;
      const ang = entity.aim + t * spread;
      const sp = speed * (1 + (Math.random() * 2 - 1) * jitter);
      this.projectiles.push(new Projectile(m.x, m.y, Math.cos(ang) * sp, Math.sin(ang) * sp, spec));
    }
    SFX.shoot(spec);
    this.state = "PROJECTILE";
  }

  // Hasar veren bir modül kullanıldığında turun atış hakkı dolar: oyuncu artık
  // ateş edemez, sıra fizik yatıştıktan sonra (SETTLE) sona erer. Mermi üreten
  // modüller (spit) zaten PROJECTILE durumuna geçtiği için burada durum
  // değiştirilmez; tur onların çözümüyle kapanır ve ödül sayacını da o yol işler.
  spendSkillShot(entity) {
    this.clearTurnInput(); // dolan güç varsa iptal et (yoksa boşa bırakma ateşler)
    if (this.state !== "AIMING") return;
    // Modül kullanımı da çözümlenmiş bir insan aksiyonudur: ödül uygunluğu
    // yalnız atışla sayıldığı için burada işaretlenip hemen çözümlenir.
    this._noteHumanShot(entity);
    this._resolveHumanShot();
    this.state = "SETTLE";
    this.settleTimer = 0;
  }

  endTurn() {
    this.bot.cancel();
    for (const b of this.bots) b.cancel();
    this.clearTurnInput();
    this.shotMod = null; // salvo bitti: nextShot modifikatörünü temizle
    this.shotIsSkill = false;

    // Sırasını tamamlayan oyuncunun skill cooldown'ını düşür + dash temizle
    const ending = this.players[this.turn];
    if (ending) {
      if (ending.skillCooldown > 0) ending.skillCooldown--;
      ending.dashAttack = null;
    }

    // Süreli yetenek durumlarını (zehir/hasar azaltma/uçuş) her tur sonunda işle
    for (const p of this.players) {
      if (!p.alive) continue;
      if (p.poison && p.poison.turns > 0) {
        this.damagePlayer(p, p.poison.dps);
        if (--p.poison.turns <= 0) p.poison = null;
      }
      if (p.damageReduce && --p.damageReduce.turns <= 0) p.damageReduce = null;
      if (p.glideTurns > 0) p.glideTurns--;
    }

    // Ölüleri kontrol et
    const alive = this.players.filter((p) => p.alive);
    // Hedef tahini için pozisyon takibi (Zor/Ustalık botları)
    for (const p of this.players) {
      if (!p.alive) continue;
      if (!p.lastPositions) p.lastPositions = [];
      p.lastPositions.push({ x: p.x, y: p.y });
      if (p.lastPositions.length > 3) p.lastPositions.shift();
    }
    if (alive.length <= 1) {
      this.state = "GAMEOVER";
      SFX.win();
      // Maç bitti: kullanılmayan satın alınmış mermi envantere geri yazılır
      // (ödül yazımından önce; ikisi de aynı profil nesnesini güncelliyor).
      this._settleAmmoDepot();
      const winner = alive[0];
      // Sonuç yalnız burada belirlenir; ödül de yalnız burada ve bir kez yazılır.
      // showOverlay ödül hesaplamaz, yalnız hazır sonuç modelini gösterir.
      const humanIdx = this.matchProgress ? this.matchProgress.humanIndex : 0;
      const humanPlayer = this.players[humanIdx];
      const result = winner ? (winner === humanPlayer ? "win" : "loss") : "draw";
      if (result === "win" && humanPlayer && this.combatStats) {
        if (humanPlayer.hp <= humanPlayer.maxHp * 0.20) {
          this.combatStats.clutch = true;
        }
      }
      const reward = this.grantMatchReward(result);
      if (this.mode === "tutorial") {
        // Öğretici maç: ödül yok, sonucu rehber diliyle anlat.
        const won = winner && winner === this.players[humanIdx];
        showOverlay(
          won ? t("overlay.tutorial.winTitle", "Öğretici tamamlandı! 🎓")
              : winner ? t("overlay.tutorial.lossTitle", "Öğretici maçını kaybettin")
                       : t("overlay.tutorial.drawTitle", "Berabere!"),
          won ? t("overlay.tutorial.winSub", "Artık hazırsın — Ana Menü'den gerçek maçlara çıkabilirsin.")
              : t("overlay.tutorial.lossSub", "Endişelenme — 'Tekrar Oyna' ile aynı bölümü yeniden dene."),
          null
        );
        this.updateHud();
        return;
      }
      showOverlay(
        winner ? t("overlay.match.winTitle", "{name} parça hakkını kazandı! 🏆", { name: winner.name })
               : t("overlay.match.drawTitle", "Tahsis berabere kaldı!"),
        winner ? "" : t("overlay.match.drawSub", "İkisi de elendi."),
        reward
      );
      // Portal (F5): maç bitti → oynanış durur; insan kazandıysa kutlama.
      this.lastMatchReward = reward;
      this.portalGameplay(false);
      if (typeof PORTAL !== "undefined" && PORTAL.isActive() && winner && winner === this.players[humanIdx]) {
        PORTAL.happytime();
      }
      // Çevrimiçi maçta ödül/atölye yoktur: kart sadeleşir, yeni maç odaya dönüşle.
      if (this.mode === "online") this._applyOverlayMode(true);
      this.updateHud();
      return;
    }
    // Sırayı yaşayan bir sonraki oyuncuya geçir
    do { this.turn = (this.turn + 1) % this.players.length; }
    while (!this.players[this.turn].alive);

    // İkmal sandığı (Airdrop): her 3 turda bir paraşütle sandık bırak
    this.crateDropCounter = (this.crateDropCounter || 0) + 1;
    if (this.crateDropCounter >= 3 && (!this.crates || this.crates.length < 3)) {
      this.crateDropCounter = 0;
      this.spawnCrate();
    }

    // Ani Ölüm (Sudden Death): 12. turdan itibaren devreye girer
    if (this.turnId >= (this.suddenDeathTurns || 12)) {
      if (!this.suddenDeath) {
        this.suddenDeath = true;
        if (typeof SFX !== "undefined" && SFX.alarm) SFX.alarm();
        this.triggerScreenShake(0.75);
        this.damagePopups.push({ x: this.W / 2, y: 110, text: "⚠️ ANİ ÖLÜM BAŞLADI! ⚠️", color: "#ff3333", scale: 1.45, age: 0 });
      }
      this.suddenDeathLevel = (this.suddenDeathLevel || 0) + 14;
      const acidY = this.H - this.suddenDeathLevel;
      for (const p of this.players) {
        if (p.alive && p.y >= acidY) {
          this.damagePlayer(p, 20);
          this.damagePopups.push({ x: p.x, y: p.y - p.r - 20, text: "ASİT HASARI! -20 ☣️", color: "#76ff03", scale: 1.15, age: 0 });
        }
      }
    }

    const windChanged = this.advanceWind();
    this.turnId++;
    // Yeni tur: açık silah listesi kapanır.
    this.weaponMenuOpen = false;
    this.active.refreshStamina();
    this.turnTimer = this.mode === "tutorial" ? TUTORIAL_TURN_DURATION : TURN_DURATION;
    this.state = "AIMING";
    SFX.turn();
    if (windChanged) SFX.windChange(windChanged.from, windChanged.to);
    if (this.mode === "tutorial") this._tutTurnStart();
    this.updateHud();
  }

  // Rüzgâr her atışta yeniden atılmaz. Aynı değer 2–4 tur korunur; süre
  // dolduğunda da oyuncunun gerçekten fark edebilmesi için yeni değer eskisinden
  // en az 0.8 ayrılır. Dönüş değeri yalnız değişim olduğunda efekt modelidir.
  advanceWind() {
    this.windTurnsRemaining = Math.max(0, (this.windTurnsRemaining || 1) - 1);
    if (this.windTurnsRemaining > 0) return null;

    const previous = this.wind || 0;
    const next = randDifferentWind(previous);
    this.wind = next;
    this.windTurnsRemaining = randWindDuration();
    this.windChangeFx = {
      from: previous,
      to: next,
      age: 0,
      duration: WIND_FX_DURATION,
    };
    return this.windChangeFx;
  }

  // Uygun bir tek oyunculu maçın (bilgisayara karşı) ödülünü
  // profile yazar. Önkoşullar: mod, en az bir çözümlenmiş insan atışı ve maç
  // anahtarının daha önce talep edilmemiş olması. Uygun değilse null döner (overlay ödülsüz çizilir).
  grantMatchReward(result) {
    const mp = this.matchProgress;
    if (!mp || mp.rewardGranted) return null;
    if (!isSinglePlayerProgressionMode(this.mode)) return null;
    if (mp.humanShotsResolved < 1) return null;
    if (!mp.humanRobotId) return null;
    const res = grantMatchReward(this.profile, {
      matchKey: mp.key,
      robotId: mp.humanRobotId,
      result,
      difficulty: this.difficulty,
      opponentCount: mp.opponentCount,
      combat: this.combatStats,
    });
    if (!res.ok) return null;
    this.profile = res.profile;
    mp.rewardGranted = true;
    if (!res.persisted) notifyStorageFailure();
    const def = CHARACTERS.find((c) => c.id === mp.humanRobotId);
    res.robotLabel = def ? def.label : "";
    return res;
  }

  /* Kare dağıtıcısı: çevrimiçi maçta host sabit adımlı ağ saatiyle, misafir
   * görsel yumuşatmayla ilerler; yerel modlarda çekirdek gövde çağrılır. */
  update(dt) {
    if (this.mode === "online" && this.online) {
      if (this.onlineGuest) this.updateGuest(dt);
      else this.updateOnlineHost(dt);
      return;
    }
    this.updateCore(dt);
  }

  updateCore(dt) {
    // ONLINE_LOBBY/ONLINE_LOADING: oyuncu listesi henüz yok — savaş döngüsüne
    // girilirse `this.active` tanımsız olur (test yakaladı, tests/net-game.js).
    if (this.state === "MODE_SELECT" || this.state === "DIFFICULTY_SELECT" || this.state === "BOT_COUNT_SELECT" || this.state === "CHAR_SELECT" || this.state === "COUNT_SELECT" || this.state === "MAP_SELECT" || this.state === "WORKSHOP" || this.state === "MARKET" || this.state === "TUTORIAL" || this.state === "ONLINE_LOBBY" || this.state === "ONLINE_LOADING") {
      if (this.state === "WORKSHOP") this.updateWorkshopFx(dt);
      if (this.state === "MARKET") this.updateMarketFx(dt);
      // Menülerde updateHud yalnız geçiş anında çağrıldığından, yarıda kalan ya
      // da atlanan bir geçiş silah panelini menüde asılı bırakabiliyordu.
      // Panel görünürlüğü bu yüzden her karede durumdan türetilir (ucuz: oyun
      // dışındayken yalnız tek bir class toggle'ı yapar).
      this.updateWeaponHud();
      return;
    }

    // Öğretici rehberi: adım tamamlama + flash geri sayımı yalnız eğitim maçında
    if (this.mode === "tutorial") this._tutUpdate(dt);

    if (this.windChangeFx) {
      this.windChangeFx.age += dt;
      if (this.windChangeFx.age >= this.windChangeFx.duration) this.windChangeFx = null;
    }

    // Karakterleri her zaman güncelle (yerçekimi/geri tepme)
    for (const p of this.players) if (p.alive) p.update(this.terrain);

    // Kalıcı tehlikeler: mayınlar (yakınlık tetikler) + napalm ateşleri (DoT)
    this.updateMines(dt);
    this.updateFires(dt);
    this.updateBarrels(dt);
    this.updateCrates(dt);
    this.updateScreenShake(dt);

    // Hücum modülü: hareket hâlindeyken çarptığı rakibe temas hasarı verir
    // hasarı uygular; yere konunca biter.
    for (const p of this.players) {
      if (!p.alive || !p.dashAttack) continue;
      for (const other of this.players) {
        if (other === p || !other.alive || p.dashAttack.hit.has(other)) continue;
        if (Math.hypot(other.x - p.x, (other.y - other.r) - (p.y - p.r)) < p.r + other.r + 4) {
          this.applySkillDamage(other, p.dashAttack.damage, p.x, p.y - p.r, p.dashAttack.knockback);
          p.dashAttack.hit.add(other);
        }
      }
      if (p.onGround && Math.abs(p.vx) < 0.5) p.dashAttack = null; // dash bitti
    }

    // Aktif oyuncu kendi turunda uçuruma düşüp öldüyse turu çöz
    if (this.state === "AIMING" && !this.active.alive) {
      this.input.charging = false;
      this.input.power = 0;
      updatePowerBar(0, false);
      this.state = "SETTLE";
      this.settleTimer = 0;
    }

    if (this.state === "AIMING") {
      const a = this.active;
      if (a.control === "bot") {
        this.clearTurnInput();
        // Ana bot
        if (this.bot.phase === "idle") this.bot.begin(this);
        this.bot.update(this, dt);
        // Ek botlar
        for (const b of this.bots) {
          if (b.phase === "idle") b.begin(this);
          b.update(this, dt);
        }
      } else {
        if (this.input.left) a.walk(-1, this.terrain);
        if (this.input.right) a.walk(1, this.terrain);
        if (this.input.mouseMoved !== false) a.aimTowards(this.input.mouseX, this.input.mouseY);
      }

      // Güç doldurma stamina harcamaz; stamina yalnızca yürümede tükenir
      if (a.control !== "bot" && this.input.charging) {
        this.input.power = Math.min(1, this.input.power + 0.012);
        const markerPct = a.lastShot ? a.lastShot.power * 100 : null;
        updatePowerBar(this.input.power, true, markerPct);
      }

      // Tur süresi: son 5 saniyede geri sayım sesli uyarısı
      if (this.isHumanTurn() && this.turnTimer <= 5.1 && this.turnTimer > 0) {
        const sec = Math.ceil(this.turnTimer);
        if (sec !== this._lastTickSec) {
          this._lastTickSec = sec;
          if (typeof SFX !== "undefined" && SFX.timerTick) {
            SFX.timerTick(sec <= 2);
          }
        }
      } else {
        this._lastTickSec = null;
      }

      // Tur süresi: dolunca sıra otomatik biter (atış dolduruluyorsa ateşle)
      this.turnTimer = Math.max(0, this.turnTimer - dt);
      if (this.turnTimer <= 0) {
        if (this.input.charging) this.releaseFire();
        else this.endTurn();
      }
    }

    if (this.state === "PROJECTILE") {
      // Kanca çekme: mermiler boşaldıktan sonra da ip bağlıyken salvo sürer
      if (this.tether) this.updateTether();
      // Anlık kopyayı işle; hayatta kalanları + patlamanın eklediği misket
      // parçacıklarını yeni diziye topla (döngü sırasında push güvenli olsun diye).
      const current = this.projectiles;
      this.projectiles = [];
      for (const pr of current) {
        if (pr.dead) continue;
        // Süpürülmüş (swept) çarpışma için kare başındaki konum saklanır:
        // hızlı cephane bir karede robotun içinden geçip gitmesin.
        const x0 = pr.x, y0 = pr.y;
        const res = pr.update(this.terrain, this.wind);
        const offScreen = !!res && !res.hit;

        // Mermi–varil çarpışması
        let hitBarrel = null, hitPlayer = null, hitAt = null;
        if (!offScreen && this.barrels) {
          for (const b of this.barrels) {
            if (!b.alive) continue;
            const hit = Projectile.sweepHit(x0, y0, pr.x, pr.y, b.x, b.y, b.r + pr.r);
            if (hit) { hitBarrel = b; hitAt = hit; break; }
          }
        }
        if (hitBarrel) {
          hitBarrel.hp = 0;
          hitBarrel.alive = false;
          pr.dead = true;
          this.explode(hitAt.x, hitAt.y, pr.spec);
          setTimeout(() => {
            this.explode(hitBarrel.x, hitBarrel.y, { radius: 52, damage: 48, knockback: 13, special: "Varil" });
            this.damagePopups.push({ x: hitBarrel.x, y: hitBarrel.y - 20, text: "VARİL PATLADI! 💥", color: "#ff8c00", scale: 1.25, age: 0 });
          }, 90);
          continue;
        }

        // Mermi–karakter çarpışması. Yalnız varış noktasına bakmak yerine
        // katedilen doğru parçası sınanır (bkz. Projectile.sweepHit); patlama
        // noktası da yoldaki temas noktasıdır ki doğrudan isabet doğru yere yazılsın.
        // passPlayers'lı yardımcı mermiler (ışınlanma topu, kanca) robotlardan
        // geçer: hasarsızdır, robot üzerinde takılıp kalmamalı.
        if (!offScreen && !pr.spec.passPlayers) {
          for (const p of this.players) {
            if (!p.alive) continue;
            const hit = Projectile.sweepHit(x0, y0, pr.x, pr.y, p.x, p.y - p.r, p.r + pr.r);
            if (hit) { hitPlayer = p; hitAt = hit; break; }
          }
        }
        if (hitPlayer) {
          pr.dead = true;
          // Doğrudan isabet bonusu (Keskin Nişancı)
          if (pr.spec.directHitDamage) {
            const shooter = this.shooterIdx !== null ? this.players[this.shooterIdx] : null;
            this.damagePlayer(hitPlayer, Math.round(pr.spec.directHitDamage * this._shooterDamageMult(shooter)));
            this.damagePopups.push({ x: hitPlayer.x, y: hitPlayer.y - hitPlayer.r - 34, text: "DOĞRUDAN İSABET! 🎯", color: "#ff4d4d", scale: 1.15, age: 0 });
          }
          this.explode(hitAt.x, hitAt.y, pr.spec);
          continue;
        }

        if (res) {
          if (res.hit) {
            // Yardımcı cephaneler patlamaz: top değdiği yere ışınlar,
            // kanca tutunup atıcıyı kendine çeker.
            if (pr.spec.teleport) { this.teleportShooter(res.x, res.y); continue; }
            if (pr.spec.hook) { this.startHookPull(res.x, res.y); continue; }
            if (pr.spec.mine) this.placeMine(res.x, res.y, pr.spec); // mayın: patlama yerine yerleş
            else this.explode(res.x, res.y, pr.spec);
          }
          continue; // pr.dead — ekrandan çıktı ya da patladı
        }
        this.projectiles.push(pr); // hayatta kalan
      }

      // Tüm mermiler (ve misket parçacıkları) bitince ve kanca ipi çözülünce
      // yerleşmeyi bekle
      if (this.projectiles.length === 0 && !this.tether) {
        // İnsanın salvosu tamamen çözümlendi: ödül uygunluk sayacı artar.
        this._resolveHumanShot();
        this.state = "SETTLE";
        this.settleTimer = 0;
      }
    }

    for (const ex of this.explosions) ex.update();
    this.explosions = this.explosions.filter((e) => !e.dead);
    if (typeof updateSkillFx === "function") updateSkillFx(this);

    // Hasar yazıları: yukarı süzül + yaşlan (ömrü ~1.1 sn)
    for (const d of this.damagePopups) {
      d.age += dt;
      d.y -= 34 * dt;
    }
    this.damagePopups = this.damagePopups.filter((d) => d.age < 1.1);

    if (this.state === "SETTLE") {
      this.settleTimer++;
      const allRest = this.players.every((p) => !p.alive || (p.onGround && Math.abs(p.vx) < 0.3 && Math.abs(p.vy) < 0.3));
      if (allRest && this.settleTimer > 20) this.endTurn();
      if (this.settleTimer > 240) this.endTurn(); // emniyet
    }

    this.updateHud();
  }

  /* Sağ üst köşe güvenli alanı: ses denetimi + dil seçici DOM'da sabit CSS px
   * durur; dünya ölçeği küçüldükçe dünya pikselinde daha çok yer kaplarlar.
   * Menü ekranları (çevrimiçi lobi) başlıklarını ve sütunlarını bu alanın
   * dışında tutar: `hudTopInset` (bu y'nin üstünde sağ üst köşe dolu) ve
   * `hudRightInset` (sağdan bu kadar içeride başlanmalı), ikisi de DÜNYA px. */
  measureHudInsets() {
    const canvas = this.canvas;
    if (!canvas || !canvas.getBoundingClientRect) { this.hudTopInset = 0; this.hudRightInset = 0; return; }
    const cr = canvas.getBoundingClientRect();
    if (!cr.width || !cr.height) return;
    const sx = this.W / cr.width, sy = this.H / cr.height;
    let top = 0, right = 0;
    for (const id of ["audio-control", "locale-control", "report-control"]) {
      const el = document.getElementById(id);
      if (!el || !el.getBoundingClientRect) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      top = Math.max(top, (r.bottom - cr.top) * sy);
      right = Math.max(right, (cr.right - r.left) * sx);
    }
    this.hudTopInset = Math.round(top) + 6;
    this.hudRightInset = Math.round(right) + 6;
  }

  // Geri tamponu, canvas'ın ekrandaki gerçek piksel boyutuna (DPR dahil) eşitle.
  // Dünya koordinatları W×H'de kalır; çizim bağlamı ölçeklenerek tam çözünürlükte
  // ve keskin render edilir. Boyut değişmediyse tampon yeniden atanmaz.
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;
    if (!cssW || !cssH) return;
    const pxW = Math.max(1, Math.round(cssW * dpr));
    const pxH = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== pxW || this.canvas.height !== pxH) {
      this.canvas.width = pxW;
      this.canvas.height = pxH;
      // Yerleşim değişti: sağ üstteki DOM denetimlerinin (ses + dil) kapladığı
      // alan ölçülür. Sabit CSS px oldukları için DAR dünyada oransal olarak
      // büyürler ve menü ekranlarının sağ üstünü kapatırlar (çevrimiçi lobi
      // bildirimi). Ölçüm yalnız boyut değiştiğinde yapılır (kare başına
      // getBoundingClientRect çağrısı olmasın).
      this.measureHudInsets();
    }
    // Dünya yüksekliği sabit (this.H); genişlik ekranın en-boy oranından türetilir
    // ki ölçek tek-tip kalsın (yatay gerilme/bozulma olmaz) ve oyun tüm ekran
    // genişliğini doldursun. Arazi/oyuncular sabitlenmesin diye genişlik yalnız
    // menülerde (henüz arazi yokken) güncellenir; maç boyunca kilitli kalır.
    const inMatch = this.terrain &&
      this.state !== "MODE_SELECT" && this.state !== "COUNT_SELECT" && this.state !== "CHAR_SELECT" && this.state !== "MAP_SELECT" && this.state !== "WORKSHOP" && this.state !== "MARKET" && this.state !== "TUTORIAL";
    if (!inMatch) {
      const aspect = Math.max(1.2, Math.min(3.0, pxW / pxH));
      this.W = Math.round(this.H * aspect);
    }
    this._scaleX = pxW / this.W;
    this._scaleY = pxH / this.H;
  }

  // Pencere boyutu değişince alt panel çapaları yeniden hesaplanır: güç barı ve
  // açılır silah listesi alt savaş panelinin üstünde durur (panel yüksekliği
  // CSS'te sabit olsa da tuval ölçeği resize'da değişir).
  syncBottomHud() {
    const battleBar = document.getElementById("battle-bar");
    const barCss = battleBar && battleBar.classList && !battleBar.classList.contains("hidden") ? battleBar.offsetHeight : 0;
    const canvas = this.canvas;
    const cssH = canvas ? (canvas.clientHeight || 0) : 0;
    const base = (barCss || 108) + 8;
    // DOM güç barı + uyarı şeridi panelin hemen üstünde dursun.
    const power = document.getElementById("power-bar");
    if (power) power.style.bottom = base + "px";
    const warn = document.getElementById("storage-warning");
    if (warn) warn.style.bottom = base + "px";
    // Açılır silah listesi güç barının da üstünde açılır.
    const panel = document.getElementById("weapon-panel");
    if (panel) panel.style.bottom = base + 24 + "px";
    // Modül kartı çizicisi (skills.js) için mantıksal alt inset: CSS px -> dünya px.
    if (cssH && barCss) this.hudBottomInset = barCss * (this.H / cssH) + 14;

    // Açılır liste açıkken mantıksal sınırlarını ölç (yerleşim/telemetri).
    if (panel && panel.classList && panel.classList.contains("open") && canvas) {
      const pr = panel.getBoundingClientRect();
      const cr = canvas.getBoundingClientRect();
      if (pr.width && cr.width && cr.height) {
        const sx = this.W / cr.width;
        const sy = this.H / cr.height;
        this.hudPanelRect = {
          left: (pr.left - cr.left) * sx,
          top: (pr.top - cr.top) * sy,
          bottom: (pr.bottom - cr.top) * sy,
        };
      }
    } else {
      this.hudPanelRect = null;
    }
  }

  render() {
    this.resize();
    const ctx = this.ctx;
    if (!ctx) return;

    // Görsel koruma (canvas state guard): her karenin başında transform,
    // globalAlpha, globalCompositeOperation, filter ve shadow durumunu
    // sıfırla. Böylece önceki kareden veya çöken bir fonksiyondan kalan
    // sızıntılar sonraki karelerin çizimini ve tüm oyun görselini bozmaz.
    ctx.setTransform(this._scaleX, 0, 0, this._scaleY, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (ctx.filter && ctx.filter !== "none") ctx.filter = "none";
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.clearRect(0, 0, this.W, this.H);

    if (this.state === "ONLINE_LOBBY") {
      this.lobby.render(ctx);
      return;
    }
    if (this.state === "ONLINE_LOADING") {
      // Başlangıç paketi beklenirken sade bir "hazırlanıyor" perdesi çizilir
      // (arazi/durum uygulanınca aşama PLAYING'e döner ve savaş görünümü gelir).
      this.renderOnlineLoading(ctx);
      return;
    }
    if (this.state === "COUNT_SELECT") {
      this.renderCountSelect(ctx);
      return;
    }
    if (this.state === "WORKSHOP") {
      this.renderWorkshop(ctx);
      return;
    }
    if (this.state === "MARKET") {
      this.renderMarket(ctx);
      return;
    }
    if (this.state === "MODE_SELECT") {
      this.renderModeSelect(ctx);
      return;
    }
    if (this.state === "TUTORIAL") {
      this.renderTutorial(ctx);
      return;
    }
    if (this.state === "DIFFICULTY_SELECT") {
      this.renderDifficultySelect(ctx);
      return;
    }
    if (this.state === "BOT_COUNT_SELECT") {
      this.renderBotCountSelect(ctx);
      return;
    }
    if (this.state === "CHAR_SELECT") {
      this.renderCharSelect(ctx);
      return;
    }
    if (this.state === "MAP_SELECT") {
      this.renderMapSelect(ctx);
      return;
    }

    // Savaş alanını sarsıntı ofsetiyle çiz
    const hasShake = this.screenShake && (Math.abs(this.screenShake.x) > 0.01 || Math.abs(this.screenShake.y) > 0.01);
    if (hasShake) {
      ctx.save();
      ctx.translate(Math.round(this.screenShake.x), Math.round(this.screenShake.y));
    }

    // Haritaya özgü gökyüzü + uzak silüet + temalı bulutlar (hepsi terrain'in arkasında)
    drawSky(ctx, this.W, this.H, this.terrain.theme);
    drawBackdrop(ctx, this.W, this.H, this.terrain.theme);
    drawClouds(ctx, this.W, this.terrain.theme.cloud);
    this.terrain.draw(ctx);
    this.drawMines(ctx);
    this.drawFires(ctx);
    this.drawBarrels(ctx);
    this.drawCrates(ctx);

    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (p.alive) p.draw(ctx, i === this.turn && this.state === "AIMING", this.renderTimeMs || 0);
    }

    // Modül cast efektleri oyuncuların üstünde, mermilerin ve HUD'un altında.
    if (typeof drawSkillFx === "function") drawSkillFx(ctx, this);

    if (this.state === "AIMING") {
      if (typeof GameSettings === "undefined" || GameSettings.get("aimGuide")) {
        this.drawLastAngle(ctx);
      }
      this.drawAim(ctx);
      if (this.active.weaponSpec.airdrop) this.drawAirdropTarget(ctx);
      // Modül kartı artık canvas'a değil alt paneldeki modül yuvasına çizilir
      // (skills.js > drawSkillHud tek başına kullanılabilir bir çizici olarak durur).
    }

    for (const pr of this.projectiles) pr.draw(ctx);
    this.drawTether(ctx); // kanca ipi: mermilerin üstünde, patlamaların altında
    for (const ex of this.explosions) ex.draw(ctx);
    this.drawSuddenDeath(ctx);
    if (typeof GameSettings === "undefined" || GameSettings.get("damagePopups")) {
      this.drawDamagePopups(ctx);
    }
    this.drawWindChangeFx(ctx);

    if (hasShake) {
      ctx.restore();
    }

    // Öğretici koç paneli: turun tepesinde, vignette'in altında
    if (this.mode === "tutorial") this.drawTutorialCoach(ctx);

    // Çevrimiçi bildirim şeridi (komut reddi/tur uyarısı)
    if (this.mode === "online") this.drawOnlineNotice(ctx);

    // Sinematik vignette — tüm sahnenin üstüne, en son
    drawVignette(ctx, this.W, this.H);

    // FPS Göstergesi (Ayarlar)
    if (typeof GameSettings !== "undefined" && GameSettings.get("showFps")) {
      const fpsVal = (typeof DIAG !== "undefined" && Number.isFinite(DIAG.fps)) ? DIAG.fps : FPS;
      ctx.save();
      ctx.font = uiTitleFont(11, 700);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(11, 26, 32, 0.75)";
      ctx.fillRect(8, 8, 64, 20);
      ctx.strokeStyle = "rgba(113, 211, 189, 0.4)";
      ctx.strokeRect(8, 8, 64, 20);
      ctx.fillStyle = "#71d3bd";
      ctx.fillText("FPS: " + fpsVal, 14, 12);
      ctx.restore();
    }
  }

  // Değişen rüzgâr yönünde kayan çizgiler ve kısa bir merkez bildirimi.
  // Çizgi hızı/uzunluğu yeni şiddetle artar; böylece sayı okunmasa da değişim anlaşılır.
  drawWindChangeFx(ctx) {
    const fx = this.windChangeFx;
    if (!fx) return;
    const progress = Math.min(1, fx.age / fx.duration);
    const alpha = Math.min(1, fx.age * 5) * (1 - progress);
    const direction = fx.to >= 0 ? 1 : -1;
    const strength = Math.min(1, Math.abs(fx.to) / 4);
    const travel = fx.age * (240 + strength * 300);

    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "#d9f4ff";
    ctx.lineWidth = 2 + strength * 1.5;
    for (let i = 0; i < 12; i++) {
      const phase = (travel + i * 97) % (this.W + 180);
      const x = direction > 0 ? phase - 90 : this.W + 90 - phase;
      const y = 55 + ((i * 43) % Math.max(100, this.H - 150));
      const length = 26 + strength * 54;
      ctx.globalAlpha = alpha * (0.35 + (i % 3) * 0.18);
      ctx.beginPath();
      ctx.moveTo(x - direction * length, y);
      ctx.quadraticCurveTo(x - direction * length * 0.45, y - 5, x, y);
      ctx.stroke();
    }

    // Merkez "RÜZGÂR DEĞİŞTİ" yazı paneli kaldırıldı: sağ üstteki rüzgar
    // göstergesi değişim sırasında "Rüzgar değişti: ← x.x" yazdığı için merkezde
    // ayrıca metne gerek yok — kayan çizgiler değişimi görsel olarak anlatır.
    ctx.restore();
  }

  renderCharSelect(ctx) {
    const W = this.W, H = this.H;
    const timeMs = this.renderTimeMs || 0;

    drawClouds(ctx, W, "rgba(190,215,240,0.14)");
    _msBackdrop(ctx, W, H, timeMs);

    // Başlık
    const phase = this.charSelectPhase;
    const total = this.selectedChars.length;

    // Sağ üst köşe: Hesap Seviyesi + Hurda Rozeti
    const accXp = this.profile ? this.profile.accountXp : 0;
    const accLvl = levelForAccountXp(accXp);
    const scrap = this.profile ? this.profile.scrap : 0;
    const nxtXp = nextAccountLevelXp(accLvl);
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.font = uiTitleFont(13, 700);
    ctx.fillStyle = "#ffd166";
    ctx.fillText(`🔩 ${scrap} Hurda`, W - 18, 14);
    ctx.font = uiTextFont(11, 700);
    ctx.fillStyle = "#63e6be";
    ctx.fillText(`Hesap Sv. ${accLvl}${nxtXp != null ? ` (${accXp}/${nxtXp} XP)` : ""}`, W - 18, 32);

    // Başlık aurası
    const tglow = ctx.createRadialGradient(W / 2, 26, 6, W / 2, 26, 200);
    tglow.addColorStop(0, "rgba(244, 189, 98, 0.16)");
    tglow.addColorStop(0.55, "rgba(113, 211, 189, 0.035)");
    tglow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tglow;
    ctx.fillRect(W / 2 - 220, 4, 440, 56);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    if (this.onlineRobotSelectReturn) {
      ctx.fillStyle = "rgba(113, 211, 189, 0.65)";
      ctx.font = uiTitleFont(9.5, 700);
      ctx.fillText("PROT-9 // ONLINE COMBAT LOADOUT", W / 2, 10);
      ctx.fillStyle = "#ffe45e";
      ctx.font = uiTitleFont(22, 700);
      ctx.fillText(t("online.charSelect.title", "Çevrimiçi Robotunu Seç"), W / 2, 24);
      _csHazardStrip(ctx, W / 2 - 100, 48, 200, 2.5);
      ctx.fillStyle = "#cfe0ee";
      ctx.font = uiTextFont(11.5);
      ctx.fillText(t("online.charSelect.sub", "Maçta kullanmak istediğin robotun kartına tıkla"), W / 2, 54);
    } else {
      ctx.fillStyle = "rgba(113, 211, 189, 0.65)";
      ctx.font = uiTitleFont(9.5, 700);
      ctx.fillText("PROT-9 // COMBAT UNIT SELECTION", W / 2, 10);
      ctx.fillStyle = PLAYER_TINTS[phase % PLAYER_TINTS.length];
      ctx.font = uiTitleFont(22, 700);
      const chooser = isSinglePlayerProgressionMode(this.mode) ? (phase === 0 ? "Robotunu seç" : "Bilgisayarın robotunu seç") : `Oyuncu ${phase + 1} / ${total} — robot seç`;
      ctx.fillText(chooser, W / 2, 24);
      _csHazardStrip(ctx, W / 2 - 100, 48, 200, 2.5);

      // Önceki oyuncuların seçtikleri (özet satırı)
      const picked = [];
      for (let i = 0; i < phase; i++) {
        if (this.selectedChars[i]) {
          const ctrl = this.playerControls[i] || "human";
          const icon = ctrl === "bot" ? "🤖" : "★";
          picked.push(`${icon} O${i + 1}: ${this.selectedChars[i].label}`);
        }
      }
      if (picked.length) {
        ctx.fillStyle = "#9fd6a8";
        ctx.font = uiTextFont(12, 700);
        ctx.fillText(picked.join("   •   ") + "   ✓", W / 2, 56);
      } else if (this.mode === "local") {
        // Yerel maçta yükseltmeler kapalıdır; oyuncuya açıkça söylenir.
        ctx.fillStyle = "#9fb6c9";
        ctx.font = uiTextFont(11.5);
        ctx.fillText(t("charSelect.localNote", "Standart kalibrasyon — geliştirmeler kapalı"), W / 2, 56);
      }
    }

    // Kart ölçüsü dünya genişliğinden gelir (charSelectLayout) — tüm dikey
    // pozisyonlar cx/cy'ye göreli, ch.r'dan bağımsız. 2 satırlık grid'e sığması
    // için kart yüksekliği ve iç aralıklar sıkıştırıldı.
    const L = this.charSelectLayout();
    const CARD_W = L.cardW, CARD_H = L.cardH, GAP = L.gap, GAP_Y = L.gapY;
    const CHAR_CY = 46;   // karakter merkezi (kart-içi y)
    const NAME_Y  = 70;   // isim başlangıcı
    const SUMMARY_Y = 86; // servis seviyesi + dal özeti satırı
    const STAT_Y  = 98;   // ilk stat satırı
    const STAT_GAP = 16;  // stat satırı adımı (label 9px + bar 5px + boşluk 2px)
    const SEP_Y   = STAT_Y + STAT_GAP * 3 + 2;  // 148
    const SKILL_Y = SEP_Y + 6;                   // 154

    // ── Sayfalama: karakterler COLS sütun × CS_ROWS satırlık grid'e bölünür;
    // sütun sayısı pencere genişliğine göre değişir (dar pencerede 4, genişte 6).
    const COLS = L.cols, PER_PAGE = L.perPage;
    const totalPages = Math.max(1, Math.ceil(CHARACTERS.length / PER_PAGE));
    this.charPage = Math.max(0, Math.min(this.charPage, totalPages - 1));
    const pageStart = this.charPage * PER_PAGE;
    const pageChars = CHARACTERS.slice(pageStart, pageStart + PER_PAGE);

    const colsUsed = Math.min(pageChars.length, COLS);
    const rowsUsed = Math.ceil(pageChars.length / COLS);
    const totalW = colsUsed * CARD_W + (colsUsed - 1) * GAP;
    const startX = (W - totalW) / 2;
    const startY = 76;

    this._cardRects = [];

    for (let i = 0; i < pageChars.length; i++) {
      const ch = pageChars[i];
      const col = i % COLS, row = (i / COLS) | 0;
      const cx = startX + col * (CARD_W + GAP);
      const cy = startY + row * (CARD_H + GAP_Y);
      this._cardRects.push({ x: cx, y: cy, w: CARD_W, h: CARD_H, ch });

      const mx = this.input.mouseX, my = this.input.mouseY;
      const hovered = mx >= cx && mx <= cx + CARD_W && my >= cy && my <= cy + CARD_H;
      const isOnlineActive = !!(this.onlineRobotSelectReturn && this.lobby && this.lobby.robotId === ch.id);
      // Daha önceki oyunculardan biri bu karakteri seçtiyse işaretle (yine de seçilebilir)
      const taken = !this.onlineRobotSelectReturn && this.selectedChars.slice(0, phase).includes(ch);

      ctx.save();

      // ── Kart arka planı: endüstriyel panel; hover'da 2px yukarı kayar
      // (dokunma alanı _cardRects'te sabit kalır). Alınmış robot kırmızı
      // kenar + kalın çerçeveyle işaretlenmeye devam eder.
      const cyv = cy + (hovered ? -2 : 0);
      _csPanel(ctx, cx, cyv, CARD_W, CARD_H, {
        accent: hovered ? "#ffe45e" : isOnlineActive ? "#4fc3f7" : taken ? "#ff7b7b" : "#2a3848",
        hover: hovered, glow: hovered || isOnlineActive,
        selected: isOnlineActive || taken,
      });

      // Kart üstü robot rengi şerit
      ctx.fillStyle = hovered ? ch.color : _hexA(ch.color, 0.75);
      ctx.fillRect(cx + 8, cyv + 1, CARD_W - 16, 2.5);

      // ── Karakter önizleme ─────────────────────────────────────
      const pcx = cx + CARD_W / 2, pcy = cyv + CHAR_CY;

      ctx.beginPath(); ctx.arc(pcx, pcy, 24, 0, Math.PI * 2);
      ctx.fillStyle = ch.color + "1a"; ctx.fill();
      ctx.beginPath(); ctx.arc(pcx, pcy, 19, 0, Math.PI * 2);
      ctx.fillStyle = ch.color + "2e"; ctx.fill();

      drawRobot(ctx, {
        cx: pcx, cy: pcy, r: ch.r, facing: 1, charDef: ch,
        timeMs: this.renderTimeMs || 0,
        motion: { vx: 0, vy: 0, onGround: true },
        // Karakter seçimi: takılı parçalar rozetle birlikte robotta da görünür
        // (oyuncu ne aldığını seçim ekranında görsün).
        parts: getRobotProgress(this.profile, ch.id).loadout,
      });

      // ── İsim + servis seviyesi ─────────────────────────────────
      // "Sv." rozeti sağ üst köşede (isim satırından ayrı): ikisi aynı
      // satırda merkezlenince iç içe giriyordu — kullanıcı bildirimi.
      // İsim artık kart genişliğinin tamamını kullanıp punto ile sığar.
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const nameText = `${ch.label} · ${ch.role}`;
      const nameFit = _fitTextLines(ctx, nameText, CARD_W - 24, 14, uiTitleFont, 1, 10);
      ctx.fillStyle = ch.color;
      ctx.font = nameFit.lines.length === 1 ? uiTitleFont(nameFit.px) : uiTitleFont(14);
      ctx.fillText(nameText, cx + CARD_W / 2, cyv + NAME_Y, nameFit.lines.length === 1 ? undefined : CARD_W - 24);

      // Servis seviyesi ve dal özeti. Yerel modda geliştirmeler kapalı olduğu
      // için bilgi soluk gösterilir (taban değerler geçerlidir).
      const up = getRobotProgress(this.profile, ch.id);
      const upgradesOn = isSinglePlayerProgressionMode(this.mode);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffd166";
      ctx.font = uiTextFont(9, 700);
      ctx.fillText(`Sv. ${levelForXp(up.xp)}`, cx + CARD_W - 12, cyv + 4);

      // Takılı parça rozeti: 4 yuva noktası (dolu = takılı). Yerel maçta
      // parçalar etkisiz olduğu için rozet de soluk gösterilir.
      ctx.globalAlpha = upgradesOn ? 1 : 0.45;
      _drawPartDots(ctx, cx + CARD_W - 12, cyv + 16, up.loadout);
      ctx.globalAlpha = 1;

      ctx.globalAlpha = upgradesOn ? 1 : 0.45;
      ctx.textAlign = "center";
      ctx.fillStyle = "#8fd9c4";
      ctx.font = uiTextFont(9);
      ctx.fillText(robotUpgradeSummary(up), cx + CARD_W / 2, cyv + SUMMARY_Y, CARD_W - 14);
      ctx.globalAlpha = 1;

      // ── Stat çubukları ────────────────────────────────────────
      const sx = cx + 12, statW = CARD_W - 24;
      _drawStatBar(ctx, sx, cyv + STAT_Y,             statW, "Can",   `${ch.hp}`,                    ch.hp / 160,               "#5fdc6b");
      _drawStatBar(ctx, sx, cyv + STAT_Y + STAT_GAP,  statW, "Zırh",  `${(ch.armor * 100) | 0}%`,    ch.armor / 0.30,            "#4ad1ff");
      _drawStatBar(ctx, sx, cyv + STAT_Y + STAT_GAP * 2, statW, "Hasar", `×${ch.dmgMult.toFixed(1)}`, (ch.dmgMult - 0.7) / 0.5, "#ffaa33");

      // ── Ayraç ─────────────────────────────────────────────────
      ctx.strokeStyle = "#ffffff16";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + 12, cyv + SEP_Y);
      ctx.lineTo(cx + CARD_W - 12, cyv + SEP_Y);
      ctx.stroke();

      // ── Skill bölümü ──────────────────────────────────────────
      ctx.fillStyle = "#ffffff0c";
      _csRoundRect(ctx, cx + 10, cyv + SKILL_Y - 1, CARD_W - 20, 17, 5);
      ctx.fill();

      ctx.fillStyle = "#ffee88";
      ctx.font = uiTextFont(10, 700);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      // Dar kartta uzun yetenek adı taşmasın: punto sabit, genişlik kırpılır.
      ctx.fillText(`[Q]  ${ch.skill.label}`, cx + CARD_W / 2, cyv + SKILL_Y + 1, CARD_W - 16);

      ctx.fillStyle = "#7899aa";
      ctx.font = uiTextFont(10);
      ctx.textBaseline = "top";
      ctx.fillText(ch.skill.desc, cx + CARD_W / 2, cyv + SKILL_Y + 21, CARD_W - 16);

      if (isOnlineActive) {
        ctx.fillStyle = "#4fc3f7";
        ctx.font = uiTextFont(9, 700);
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(t("online.charSelect.current", "SEÇİLİ"), cx + CARD_W - 8, cyv + CARD_H - 4);
      }

      // Kilitli robot kaplaması (v7)
      const unlocked = isRobotUnlocked(this.profile, ch.id);
      if (!unlocked) {
        ctx.fillStyle = "rgba(10, 16, 24, 0.88)";
        _csRoundRect(ctx, cx, cyv, CARD_W, CARD_H, 6);
        ctx.fill();

        const spec = robotPriceSpec(ch.id);
        const accXp = this.profile ? this.profile.accountXp : 0;
        const curAccLvl = levelForAccountXp(accXp);
        const curScrap = this.profile ? this.profile.scrap : 0;
        const canBuy = canUnlockRobot(this.profile, ch.id);

        ctx.font = uiTitleFont(24);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = canBuy.ok ? "#ffd166" : "#ff6b6b";
        ctx.fillText("🔒", cx + CARD_W / 2, cyv + CARD_H / 2 - 28);

        ctx.font = uiTitleFont(11, 700);
        ctx.textBaseline = "top";
        if (curAccLvl < spec.level) {
          ctx.fillStyle = "#ff6b6b";
          ctx.fillText(t("charSelect.locked", "KİLİTLİ"), cx + CARD_W / 2, cyv + CARD_H / 2 - 6);
          ctx.font = uiTextFont(10, 700);
          ctx.fillStyle = "#ffaa88";
          ctx.fillText(t("charSelect.reqLevel", "Hesap Sv. {level} Gerekli", { level: spec.level }), cx + CARD_W / 2, cyv + CARD_H / 2 + 10);
          ctx.fillStyle = "#8fa8ba";
          ctx.fillText(t("charSelect.reqPrice", "Fiyat: {price} 🔩", { price: spec.price }), cx + CARD_W / 2, cyv + CARD_H / 2 + 26);
        } else if (curScrap < spec.price) {
          ctx.fillStyle = "#ffd166";
          ctx.fillText(t("charSelect.locked", "KİLİTLİ"), cx + CARD_W / 2, cyv + CARD_H / 2 - 6);
          ctx.font = uiTextFont(10, 700);
          ctx.fillStyle = "#ff8888";
          ctx.fillText(`${spec.price} 🔩`, cx + CARD_W / 2, cyv + CARD_H / 2 + 10);
          ctx.fillStyle = "#8fa8ba";
          ctx.font = uiTextFont(9);
          ctx.fillText(t("charSelect.balance", "(Bakiye: {scrap} 🔩)", { scrap: curScrap }), cx + CARD_W / 2, cyv + CARD_H / 2 + 26);
        } else {
          ctx.fillStyle = "#63e6be";
          ctx.fillText(t("charSelect.canUnlock", "SATIN ALABİLİRSİN!"), cx + CARD_W / 2, cyv + CARD_H / 2 - 10);

          const btnW = CARD_W - 20, btnH = 26;
          const bx = cx + 10, by = cyv + CARD_H / 2 + 8;
          ctx.fillStyle = hovered ? "#2b6b55" : "#1a4738";
          _csRoundRect(ctx, bx, by, btnW, btnH, 4);
          ctx.fill();
          ctx.strokeStyle = hovered ? "#63e6be" : "#3ea882";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = uiTitleFont(10.5, 700);
          ctx.textBaseline = "middle";
          ctx.fillText(t("charSelect.buyAction", "{price} 🔩 SATIN AL", { price: spec.price }), cx + CARD_W / 2, by + btnH / 2);
        }
      }

      ctx.restore();
    }

    // ── Sayfa gezinme çubuğu (‹ Geri · Sayfa n/N · İleri ›) ─────────────────
    this._pageRects = null;
    if (totalPages > 1) {
      const navY = startY + rowsUsed * CARD_H + (rowsUsed - 1) * GAP_Y + 14, btnW = 104, btnH = 30, mid = W / 2;
      const prev = { x: mid - 150 - btnW, y: navY, w: btnW, h: btnH, dir: -1 };
      const next = { x: mid + 150,        y: navY, w: btnW, h: btnH, dir: 1 };
      this._pageRects = [prev, next];

      const mx = this.input.mouseX, my = this.input.mouseY;
      for (const b of this._pageRects) {
        const canUse = (b.dir < 0 && this.charPage > 0) || (b.dir > 0 && this.charPage < totalPages - 1);
        const hov = canUse && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
        ctx.globalAlpha = canUse ? 1 : 0.35;
        _csPanel(ctx, b.x, b.y, b.w, b.h, { accent: hov ? "#ffe45e" : "#2a3848", hover: hov, glow: hov, rivets: false });
        ctx.fillStyle = "#cfe0ee";
        ctx.font = uiTextFont(13, 700);
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(b.dir < 0 ? t("common.back", "‹ Geri") : t("common.forward", "İleri ›"), b.x + b.w / 2, b.y + b.h / 2);
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = "#ffe45e";
      ctx.font = uiTitleFont(15);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(t("common.page", "Sayfa {page} / {total}", { page: this.charPage + 1, total: totalPages }), mid, navY + btnH / 2);
    }

    // Geri butonu her fazda görünür: P2+ seçiminde önceki oyuncuya, ilk seçimde
    // bir önceki ekrana (bilgisayar modunda mod seçimi, yerelde oyuncu sayısı)
    // döner. Böylece yalnız fareyle oynayan da her ekrandan geri çıkabilir.
    this.drawBackButton(ctx, t("common.back", "‹ Geri"));
  }

  // Karakter seçim grid'inin o anki dünya genişliğine göre düzeni (sütun sayısı
  // + kart ölçüsü). Çizim, sayfa değiştirme ve tıklama aynı yerden okur — grid
  // tek kaynaktan üretilir.
  //
  // Neden gerekli: dünya genişliği pencere en-boy oranına göre 648–1620 arasında
  // değişir (resize()). Sabit 6 × 150 px grid (950 px) dar pencerede taşıyordu —
  // iki yandaki sütunlar kırpılıyor, kartların yarısı görünmüyordu (kullanıcı
  // bildirimi: "kartlar tam gözükmüyor"). Sütun sayısı kart okunabilir kalana
  // kadar azaltılır (6 → 4), geniş ekranda 6 sütun ve 150 px tavan korunur.
  charSelectLayout() {
    const SIDE = 24;             // iki yanda kalan güvenli boşluk (dünya px)
    const GAP = 10, GAP_Y = 10;
    const CARD_H = 186;
    const CARD_W_MAX = 150;      // tasarım ölçüsü: içerik bu genişlikte tam sığar
    const CARD_W_MIN = 132;      // altına inince isim/çubuk/ipucu metni sıkışıyor
    const fit = (n) => Math.min(CARD_W_MAX, (this.W - SIDE * 2 - (n - 1) * GAP) / n);
    let cols = CS_COLS;
    let cardW = fit(cols);
    for (; cols > 3; cols--) {
      cardW = fit(cols);
      if (cardW >= CARD_W_MIN) break;
    }
    // 4 sütun bile sığmıyorsa 3 sütuna düşülür (en dar dünya: 648 px → 193 px
    // kart, yani okunabilirlik yeniden sağlanır).
    if (cols === 3) cardW = fit(3);
    cardW = Math.floor(cardW);
    return { cols, cardW, cardH: CARD_H, gap: GAP, gapY: GAP_Y, perPage: cols * CS_ROWS };
  }

  // Karakter seçim sayfasını sınırlar içinde değiştir
  changeCharPage(dir) {
    if (this.state !== "CHAR_SELECT") return;
    const totalPages = Math.max(1, Math.ceil(CHARACTERS.length / this.charSelectLayout().perPage));
    this.charPage = Math.max(0, Math.min(this.charPage + dir, totalPages - 1));
  }

  handleCharSelectClick(mx, my) {
    // Önce geri butonu (P2 seçimindeyken P1'e dön)
    if (this.hitBackButton(mx, my)) { SFX.uiClick(); this.charBack(); return; }
    // Sonra sayfa gezinme butonları
    if (this._pageRects) {
      for (const b of this._pageRects) {
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          SFX.uiClick();
          this.changeCharPage(b.dir);
          return;
        }
      }
    }
    if (!this._cardRects) return;
    for (const rect of this._cardRects) {
      if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
        SFX.uiClick();

        // Kilitli karakter kontrolü ve satın alma
        const unlocked = isRobotUnlocked(this.profile, rect.ch.id);
        if (!unlocked) {
          const buy = unlockRobot(this.profile, rect.ch.id);
          if (buy.ok) {
            this.profile = buy.profile;
            if (typeof SFX !== "undefined" && SFX.upgradeTier) SFX.upgradeTier();
            this.damagePopups.push({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, text: `${rect.ch.label} SATIN ALINDI! 🔩`, color: "#63e6be", scale: 1.2, age: 0 });
            this.updateHud();
          } else {
            if (typeof SFX !== "undefined" && SFX.buzzer) SFX.buzzer();
            const reasonMsg = buy.reason === "LEVEL_REQUIRED"
              ? `Hesap Sv. ${buy.requiredLevel} Gerekli!`
              : `Yetersiz Hurda! (${buy.cost} 🔩 Gerekli)`;
            this.damagePopups.push({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, text: reasonMsg, color: "#ff6b6b", scale: 1.1, age: 0 });
          }
          return;
        }

        if (this.onlineRobotSelectReturn) {
          this.onlineRobotSelectReturn = false;
          if (this.lobby) this.lobby.selectRobot(rect.ch);
          this.state = "ONLINE_LOBBY";
          this.updateHud();
          return;
        }
        this.selectedChars[this.charSelectPhase] = rect.ch;
        if (this.charSelectPhase < this.selectedChars.length - 1) {
          this.charSelectPhase++;   // sıradaki oyuncu seçsin
          this.charPage = 0;        // ilk sayfadan başlasın
          this.updateHud();
        } else {
          // Tüm oyuncular seçti → harita seçim ekranına geç (kendi haritası sayfasına git)
          this.state = "MAP_SELECT";
          this.gotoOwnMapPage();
          this.updateHud();
        }
        return;
      }
    }
  }

  // Harita seçim ekranı: her karaktere özgü temalı haritalar, önizlemeli kartlar.
  renderMapSelect(ctx) {
    const W = this.W, H = this.H;
    const timeMs = this.renderTimeMs || 0;

    drawClouds(ctx, W, "rgba(190,215,240,0.14)");
    _msBackdrop(ctx, W, H, timeMs);

    // Başlık Bölgesi
    const titleY = 14;
    const tglow = ctx.createRadialGradient(W / 2, titleY + 18, 6, W / 2, titleY + 18, 200);
    tglow.addColorStop(0, "rgba(244, 189, 98, 0.16)");
    tglow.addColorStop(0.55, "rgba(113, 211, 189, 0.035)");
    tglow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tglow;
    ctx.fillRect(W / 2 - 220, titleY - 10, 440, 60);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(113, 211, 189, 0.65)";
    ctx.font = uiTitleFont(9.5, 700);
    ctx.fillText("PROT-9 // COMBAT ARENA PROTOCOL", W / 2, titleY);

    ctx.fillStyle = "#ffe45e";
    ctx.font = uiTitleFont(22, 700);
    ctx.shadowColor = "rgba(255, 228, 94, 0.42)";
    ctx.shadowBlur = 8;
    ctx.fillText(t("mapSelect.title", "Harita Seç"), W / 2, titleY + 13);
    ctx.shadowBlur = 0;

    _csHazardStrip(ctx, W / 2 - 110, titleY + 40, 220, 2.5);

    // Seçilen karakterler özeti (2–6 oyuncu)
    ctx.font = uiTitleFont(12, 700);
    ctx.fillStyle = "#cfe0ee";
    ctx.fillText(
      this.selectedChars.map((c) => c ? c.label : "?").join("  ⚔  "),
      W / 2, titleY + 48
    );

    // ── Sayfalama: haritalar MS_COLS × MS_ROWS grid'e bölünür ──
    const CARD_W = Math.min(264, Math.floor((W - 64 - (MS_COLS - 1) * 14) / MS_COLS));
    const CARD_H = Math.min(178, Math.floor((H - 154) / MS_ROWS));
    const GAP = 14, GAP_Y = 12;
    const COLS = MS_COLS, PER_PAGE = MS_COLS * MS_ROWS;
    const totalPages = Math.ceil(MAPS.length / PER_PAGE);
    this.mapPage = Math.max(0, Math.min(this.mapPage, totalPages - 1));
    const pageStart = this.mapPage * PER_PAGE;
    const pageMaps = MAPS.slice(pageStart, pageStart + PER_PAGE);

    const colsUsed = Math.min(pageMaps.length, COLS);
    const rowsUsed = Math.ceil(pageMaps.length / COLS);
    const totalW = colsUsed * CARD_W + (colsUsed - 1) * GAP;
    const startX = (W - totalW) / 2;
    const startY = 82;

    this._mapRects = [];

    for (let i = 0; i < pageMaps.length; i++) {
      const m = pageMaps[i];
      const col = i % COLS, row = (i / COLS) | 0;
      const cx = startX + col * (CARD_W + GAP);
      const cy = startY + row * (CARD_H + GAP_Y);
      this._mapRects.push({ x: cx, y: cy, w: CARD_W, h: CARD_H, map: m });

      const mx = this.input.mouseX, my = this.input.mouseY;
      const hovered = mx >= cx && mx <= cx + CARD_W && my >= cy && my <= cy + CARD_H;
      // Seçilen karakterlerden birine ait harita mı?
      const isSelected = this.selectedMap === m;

      ctx.save();

      // Seçili arena kendi vurgusunu taşır; robot seçimi harita temasını etkilemez.
      const cyv = cy + (hovered ? -2 : 0);
      _csPanel(ctx, cx, cyv, CARD_W, CARD_H, {
        accent: hovered ? "#ffe45e" : isSelected ? m.accent : "#2a3848",
        hover: hovered, glow: hovered,
        selected: isSelected,
      });

      // Kart üstü harita rengi şerit
      ctx.fillStyle = hovered ? m.accent : _hexA(m.accent, 0.75);
      ctx.fillRect(cx + 8, cyv + 1, CARD_W - 16, 2.5);

      // Önizleme (arazi şekli = skill arketipi) + monitör iç çerçevesi:
      // panel içinde küçük bir saha monitörü gibi okunur.
      drawMapPreview(ctx, cx + 8, cyv + 8, CARD_W - 16, CARD_H - 58, m);
      ctx.strokeStyle = "#00000099"; ctx.lineWidth = 1;
      ctx.strokeRect(cx + 7.5, cyv + 7.5, CARD_W - 15, CARD_H - 57);

      // İsim — Russo One geniş: punto küçülerek tek satırda tutulur
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const nameFit = _fitTextLines(ctx, m.label, CARD_W - 16, 15, uiTitleFont, 1, 11);
      ctx.fillStyle = "#eef5ff";
      ctx.font = uiTitleFont(nameFit.px);
      ctx.fillText(m.label, cx + CARD_W / 2, cyv + CARD_H - 45, CARD_W - 16);

      // Skill vurgusu
      const hint = _fitTextLines(ctx, m.hint || m.zoneLabel, CARD_W - 18, 10, (p) => uiTextFont(p), 2, 8);
      ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(hint.px);
      hint.lines.forEach((line, row) => ctx.fillText(line, cx + CARD_W / 2, cyv + CARD_H - 25 + row * 11));

      ctx.restore();
    }

    // ── Sayfa gezinme çubuğu ─────────────────────────────────────────────
    this._pageRects = null;
    if (totalPages > 1) {
      const navY = startY + rowsUsed * CARD_H + (rowsUsed - 1) * GAP_Y + 12, btnW = 104, btnH = 30, mid = W / 2;
      const prev = { x: mid - 150 - btnW, y: navY, w: btnW, h: btnH, dir: -1 };
      const next = { x: mid + 150,        y: navY, w: btnW, h: btnH, dir: 1 };
      this._pageRects = [prev, next];

      const mx = this.input.mouseX, my = this.input.mouseY;
      for (const b of this._pageRects) {
        const canUse = (b.dir < 0 && this.mapPage > 0) || (b.dir > 0 && this.mapPage < totalPages - 1);
        const hov = canUse && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
        ctx.globalAlpha = canUse ? 1 : 0.35;
        _csPanel(ctx, b.x, b.y, b.w, b.h, { accent: hov ? "#ffe45e" : "#2a3848", hover: hov, glow: hov, rivets: false });
        ctx.fillStyle = "#cfe0ee";
        ctx.font = uiTextFont(13, 700);
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(b.dir < 0 ? t("common.back", "‹ Geri") : t("common.forward", "İleri ›"), b.x + b.w / 2, b.y + b.h / 2);
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = "#ffe45e";
      ctx.font = uiTitleFont(14);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(t("common.page", "Sayfa {page} / {total}", { page: this.mapPage + 1, total: totalPages }), mid, navY + btnH / 2);
    }

    // Geri butonu: karakter seçimine dön
    this._backRect = null;
    this.drawBackButton(ctx, t("mapSelect.back", "‹ Robotlar"));
  }

  // Harita seçim sayfasını sınırlar içinde değiştir
  changeMapPage(dir) {
    if (this.state !== "MAP_SELECT") return;
    this.mapPage = 0;
  }

  // Açılışta oyunculardan birinin kendi karakter haritasının olduğu sayfaya git.
  gotoOwnMapPage() {
    this.mapPage = 0;
  }

  // Sol-üst köşeye t("common.back", "‹ Geri") butonu çiz ve hit-test için _backRect'i sakla.
  drawBackButton(ctx, label) {
    const x = 16, y = 16, w = 114, h = 32;
    this._backRect = { x, y, w, h };
    const mx = this.input.mouseX, my = this.input.mouseY;
    const hov = mx >= x && mx <= x + w && my >= y && my <= y + h;
    ctx.save();
    const hy = hov ? y - 1 : y;
    _csPanel(ctx, x, hy, w, h, {
      accent: hov ? "#71d3bd" : "rgba(113,211,189,0.45)",
      hover: hov,
      glow: hov,
      rivets: false,
      fillTop: hov ? "rgba(113,211,189,0.22)" : "rgba(113,211,189,0.06)",
    });
    ctx.fillStyle = hov ? "#ffffff" : "#cfe0ee";
    ctx.font = uiTitleFont(11.5, 700);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label || t("common.back", "‹ Geri"), x + w / 2, hy + h / 2);
    ctx.restore();
  }

  // _backRect içine tıklandı mı?
  hitBackButton(mx, my) {
    const b = this._backRect;
    return b && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
  }

  handleMapSelectClick(mx, my) {
    if (this.hitBackButton(mx, my)) { SFX.uiClick(); this.mapBack(); return; }
    // Sayfa gezinme butonları
    if (this._pageRects) {
      for (const b of this._pageRects) {
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          SFX.uiClick();
          this.changeMapPage(b.dir);
          return;
        }
      }
    }
    if (!this._mapRects) return;
    for (const rect of this._mapRects) {
      if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
        SFX.uiClick();
        this.selectedMap = rect.map;
        this.startGame();
        return;
      }
    }
  }

  drawDamagePopups(ctx) {
    for (const d of this.damagePopups) {
      const t = d.age / 1.1;          // 0 -> 1
      const alpha = Math.max(0, 1 - t); // sona doğru sön
      const pop = d.age < 0.14 ? d.age / 0.14 : 1;
      const baseSize = d.text ? 13 : 15;
      const scale = d.scale || 1.0;
      const size = Math.round((baseSize + 6 * pop) * scale);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = uiTextFont(size, 800);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "#000000cc";
      ctx.fillStyle = d.color || "#ff5e5e";
      const txt = d.text ? d.text : `-${d.amount}`;
      ctx.strokeText(txt, d.x, d.y);
      ctx.fillText(txt, d.x, d.y);
      ctx.restore();
    }
  }

  drawLastAngle(ctx) {
    const a = this.active;
    if (!a.lastShot) return;
    const ang = a.lastShot.aim;

    // Başlangıç noktası: SON atışın açısına göre namlu ağzı (güncel nişandan
    // bağımsız). Güncel nişan çizgisiyle AYNI geometri kullanılır ki iki çizgi
    // de silahın ağzından çıksın.
    const origin = typeof robotMuzzlePoint === "function"
      ? robotMuzzlePoint(a.x, a.y - a.r, a.r, a.facing, ang, a.charDef, a.heldWeaponSpec, a.weaponRecoil)
      : { x: a.x + Math.cos(ang) * (a.r + 12), y: (a.y - a.r) + Math.sin(ang) * (a.r + 12) };
    const ox = origin.x, oy = origin.y;
    // Güce göre uzunluk: güncel nişan oku ile aynı ölçek
    const len = 28 + a.lastShot.power * 70;
    const ex = ox + Math.cos(ang) * len;
    const ey = oy + Math.sin(ang) * len;

    ctx.save();
    // turuncu, belirgin kesik çizgi
    ctx.setLineDash([7, 4]);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ex, ey);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ff8c1a";
    ctx.stroke();
    ctx.setLineDash([]);

    // uçta dolu halka
    ctx.beginPath();
    ctx.arc(ex, ey, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ff8c1a";
    ctx.fill();

    // derece etiketi (noktanın altına, merkez hizalı — güncel nişanla çakışmayı önler)
    const deg = Math.round(-ang * 180 / Math.PI);
    ctx.font = uiTextFont(12, 700);
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000000cc";
    const lastLabel = typeof t === "function" ? t("hud.lastShotAngle", "Son: {deg}°", { deg }) : `Son: ${deg}°`;
    ctx.strokeText(lastLabel, ex, ey + 7);
    ctx.fillStyle = "#ff8c1a";
    ctx.fillText(lastLabel, ex, ey + 7);
    ctx.restore();
  }

  drawAim(ctx) {
    const a = this.active;
    const m = a.muzzle;
    const len = 28 + this.input.power * 70;
    const ex = m.x + Math.cos(a.aim) * len;
    const ey = m.y + Math.sin(a.aim) * len;

    ctx.save();
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(ex, ey);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffffaa";
    ctx.stroke();
    ctx.setLineDash([]);

    // ok ucu
    ctx.beginPath();
    ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe45e";
    ctx.fill();

    // Güncel nişan açısı etiketi (reticle noktasının hemen üstüne, merkez hizalı)
    const deg = Math.round(-a.aim * 180 / Math.PI);
    ctx.font = uiTextFont(12, 700);
    ctx.textBaseline = "bottom";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000000cc";
    ctx.strokeText(`${deg}°`, ex, ey - 6);
    ctx.fillStyle = "#ffe45e";
    ctx.fillText(`${deg}°`, ex, ey - 6);

    // Balistik Kılavuz (Yörünge Tahmini Noktaları)
    const spec = a.heldWeaponSpec || WEAPONS[a.weapon] || WEAPONS[0];
    const power = Math.max(0.12, this.input.power || 0.18);
    const spd = spec.baseSpeed + power * spec.speedMul;
    let simX = m.x, simY = m.y;
    let simVx = Math.cos(a.aim) * spd, simVy = Math.sin(a.aim) * spd;
    const grav = (spec.gravity || 0.9) * GRAVITY;
    const windF = (this.wind || 0) * (spec.windFactor || 0.02);

    for (let step = 1; step <= 8; step++) {
      simVx += windF * 1.5;
      simVy += grav * 1.5;
      simX += simVx * 1.5;
      simY += simVy * 1.5;
      const alpha = Math.max(0.1, (1 - step / 9) * 0.65);
      ctx.fillStyle = `rgba(255, 235, 110, ${alpha})`;
      ctx.beginPath();
      ctx.arc(simX, simY, Math.max(1.2, 2.8 - step * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  updateHud() {
    // Seçim/menü ekranlarında HUD'u gizle: sıra/rüzgâr bilgisi anlamsız ve
    // ortadaki büyük başlığı/butonları kapatıyor.
    // Çevrimiçi lobi de bir menüdür: HUD ve alt savaş paneli gizlenir.
    const menuState = this.state === "MODE_SELECT" || this.state === "DIFFICULTY_SELECT" || this.state === "BOT_COUNT_SELECT" || this.state === "COUNT_SELECT" || this.state === "CHAR_SELECT" || this.state === "MAP_SELECT" || this.state === "WORKSHOP" || this.state === "MARKET" || this.state === "TUTORIAL" || this.state === "ONLINE_LOBBY";
    const hud = document.getElementById("hud");
    if (hud) hud.classList.toggle("hidden", menuState);
    // Alt savaş paneli de aynı kurala uyar (menülerde oyuncu kartı anlamsız).
    const battleBar = document.getElementById("battle-bar");
    if (battleBar) battleBar.classList.toggle("hidden", menuState);

    const container = document.getElementById("players");
    if (container) {
      // Kart iskeleti BİR KEZ kurulur, sonra yerinde güncellenir: portre canvas'ı
      // her karede yeniden oluşturulursa robot çizimi 60 FPS'te boşa tekrarlanır.
      while (container.children.length < this.players.length) {
        const div = document.createElement("div");
        div.className = "player-info";
        div.setAttribute("role", "listitem");
        div.innerHTML =
          `<canvas class="p-avatar" width="44" height="44" aria-hidden="true"></canvas>` +
          `<div class="p-body">` +
            `<div class="p-top"><span class="p-order"></span><span class="name"></span></div>` +
            `<div class="hpbar"><div class="hpfill"></div></div>` +
            `<div class="p-hp"></div>` +
          `</div>`;
        div._refs = {
          avatar: div.querySelector(".p-avatar"),
          order: div.querySelector(".p-order"),
          name: div.querySelector(".name"),
          fill: div.querySelector(".hpfill"),
          hp: div.querySelector(".p-hp"),
        };
        container.appendChild(div);
      }
      while (container.children.length > this.players.length) {
        container.removeChild(container.lastChild);
      }
      // Her oyuncunun kartını güncelle (sıra rozeti + ad + can barı + portre).
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        const el = container.children[i];
        if (!el) continue;
        const refs = el._refs || {};
        // Aktif geliştirmesi olan insan robotunda adın yanında anahtar simgesi.
        const up = this.profile && p.charDef ? getRobotProgress(this.profile, p.charDef.id) : null;
        const hasUpgrades = isSinglePlayerProgressionMode(this.mode) && p.control !== "bot" && up && totalTiers(up) > 0;
        const nameTxt = `${p.name}${p.control === "bot" ? " 🤖" : ""}${hasUpgrades ? " 🔧" : ""}${p.alive ? "" : " ☠"}`;
        if (refs.name) {
          if (refs.name.textContent !== nameTxt) refs.name.textContent = nameTxt;
          refs.name.style.color = p.playerTint || p.color;
        }
        if (refs.order && refs.order.textContent !== (i + 1) + ".") refs.order.textContent = (i + 1) + ".";
        const ratio = p.maxHp > 0 ? Math.max(0, Math.min(1, p.hp / p.maxHp)) : 0;
        if (refs.fill) {
          const w = (ratio * 100).toFixed(1) + "%";
          if (refs.fill.style.width !== w) refs.fill.style.width = w;
          refs.fill.style.background = ratio > 0.4 ? "#5fdc6b" : "#ff6b6b";
        }
        if (refs.hp) {
          const hpTxt = `${Math.max(0, Math.round(p.hp))}/${Math.round(p.maxHp)}`;
          if (refs.hp.textContent !== hpTxt) refs.hp.textContent = hpTxt;
        }
        // Portre yalnız robot/parça değişince yeniden çizilir (maç boyunca sabit).
        if (refs.avatar && p.charDef) {
          if (p._avatarSig == null) {
            p._avatarSig = p.charDef.id + "|" + Object.keys(p.partLoadout || {}).sort()
              .map((k) => { const v = p.partLoadout[k]; return k + "=" + (Array.isArray(v) ? v.join("+") : v); }).join(",");
          }
          if (el._avatarSig !== p._avatarSig) {
            el._avatarSig = p._avatarSig;
            this.paintRobotPreview(refs.avatar, p.charDef, 44, p.partLoadout);
          }
        }
        // Sıradaki oyuncuyu vurgula, eleneni soluklaştır.
        el.classList.toggle("active", i === this.turn && this.state !== "GAMEOVER");
        el.classList.toggle("dead", !p.alive);
      }
    }
    const banner = document.getElementById("turn-banner");
    if (banner) {
      if (this.state === "MODE_SELECT") {
        banner.textContent = t("hud.banner.mode", "Oyun modu seçiliyor…");
        banner.style.color = "#fff";
      } else if (this.state === "DIFFICULTY_SELECT") {
        banner.textContent = t("hud.banner.difficulty", "Zorluk seçiliyor…");
        banner.style.color = "#fff";
      } else if (this.state === "BOT_COUNT_SELECT") {
        banner.textContent = t("hud.banner.botCount", "Rakip sayısı seçiliyor…");
        banner.style.color = "#fff";
      } else if (this.state === "COUNT_SELECT") {
        banner.textContent = t("hud.banner.playerCount", "Oyuncu sayısı seçiliyor…");
        banner.style.color = "#fff";
      } else if (this.state === "CHAR_SELECT") {
        banner.textContent = t("hud.banner.charSelect", "Oyuncu {n} robot seçiyor…", { n: this.charSelectPhase + 1 });
        banner.style.color = "#fff";
      } else if (this.state === "MAP_SELECT") {
        banner.textContent = t("hud.banner.mapSelect", "Fabrika bölgesi seçiliyor…");
        banner.style.color = "#fff";
      } else if (this.state === "WORKSHOP") {
        banner.textContent = t("hud.banner.workshop", "Atölye");
        banner.style.color = "#ffd166";
      } else if (this.state === "MARKET") {
        banner.textContent = t("hud.banner.market", "Cephane Pazarı");
        banner.style.color = "#63e6be";
      } else if (this.state === "TUTORIAL") {
        banner.textContent = t("hud.banner.tutorial", "Nasıl Oynanır — kontroller ve tur kuralları");
        banner.style.color = "#fff";
      } else if (this.state === "ONLINE_LOBBY") {
        banner.textContent = t("hud.banner.online", "Çevrimiçi oda");
        banner.style.color = "#63e6be";
      } else if (this.state === "ONLINE_LOADING") {
        banner.textContent = t("hud.banner.onlineLoading", "Dünya senkronize ediliyor…");
        banner.style.color = "#ffe45e";
      } else if (this.state === "GAMEOVER") {
        banner.textContent = t("hud.banner.alloc", "Tahsis Tamamlandı");
        banner.style.color = "#fff";
      } else if (!this.active) {
        // Emniyet: oyuncu listesi boşsa banner sıra yazmaz (durum geçişi
        // sırasında bir kare için olabilir).
        banner.textContent = t("hud.banner.mode", "Oyun modu seçiliyor…");
        banner.style.color = "#fff";
      } else {
        // Savaşta banner sade: yalnız sıra + süre. Bot durum yazıları ("nişan
        // alıyor…" vb. ve botların birleşik dizisi) üst bandı yazıyla dolduruyordu;
        // robotun ne yaptığını animasyon + ses zaten gösterdiği için kaldırıldı.
        // Not: yerel değişken adı `secs` — `t` olsaydı bu blokta global t()
        // çeviri fonksiyonunu gölgelerdi.
        const secs = Math.ceil(this.turnTimer);
        const sdTag = this.suddenDeath ? "  ⚠️ ANİ ÖLÜM!" : "";
        banner.textContent = t("hud.banner.turn", "Sıra: {name}  ⏱ {secs}s", { name: this.active.name, secs }) + sdTag;
        banner.style.color = (this.suddenDeath || secs <= 5) ? "#ff6b6b" : (this.active.playerTint || this.active.color);
      }
    }
    const wind = document.getElementById("wind-indicator");
    if (wind) {
      let windText;
      if (this.wind != null) {
        const dir = this.wind > 0 ? "→" : this.wind < 0 ? "←" : "•";
        const value = Math.abs(this.wind).toFixed(1);
        windText = this.windChangeFx
          ? t("hud.wind.changed", "Rüzgar değişti: {dir} {value}", { dir, value })
          : t("hud.wind", "Rüzgar: {dir} {value}", { dir, value });
      } else {
        windText = t("hud.wind.none", "Rüzgar: -");
      }
      // aria-live bölgesini her karede yeniden yazıp ekran okuyucuyu spamleme.
      if (wind.textContent !== windText) wind.textContent = windText;
      wind.classList.toggle("wind-changed", !!this.windChangeFx);
    }
    this.updateWeaponHud();
  }

  // Açılır silah listesi + seçili silahın açıklama paneli + alt panel yuvaları.
  // Kare başı maliyeti düşük tutmak için yalnız (sıra|silah|durum|modül|mühimmat)
  // değişince yeniden kurar; liste kapanıp açılması bu anahtara girmez.
  updateWeaponHud() {
    const panel = document.getElementById("weapon-panel");
    if (!panel) return;
    // Menüleri tek tek dışlamak güvenli değil: önceki maçın oyuncuları
    // bellekteyse panel bir menüye sızabiliyor. Silahlar yalnız gerçek savaş
    // döngüsünün üç durumunda görünür.
    const playing = this.players.length > 0 &&
      (this.state === "AIMING" || this.state === "PROJECTILE" || this.state === "SETTLE");
    panel.classList.toggle("hidden", !playing);
    if (!playing) { this._weaponKey = null; this.weaponMenuOpen = false; return; }

    const a = this.active;
    if (!a) return;
    // Açılır liste yalnız .open ile görünür: `hidden` sınıfı "savaş durumunda
    // panel mevcut" anlamını korur (menü sızmasını denetleyen test bunu okur).
    panel.classList.toggle("open", !!this.weaponMenuOpen);
    const toggleBtn = document.getElementById("weapon-toggle");
    if (toggleBtn) toggleBtn.classList.toggle("on", !!this.weaponMenuOpen);

    const key = this.turn + "|" + a.weapon + "|" + this.state + "|" + a.skillCooldown + "|" +
                WEAPONS.map((w) => a.ammo[w.id]).join(",");
    if (key === this._weaponKey) return;
    this._weaponKey = key;

    // Çubuk: her silah için çip (sayı tuşu + ikon + ad + mühimmat rozeti)
    const bar = document.getElementById("weapon-bar");
    if (bar) {
      bar.innerHTML = WEAPONS.map((w, i) => {
        const ammo = a.ammo[w.id];
        const ammoTxt = ammo === Infinity ? "∞" : ammo;
        const sel = i === a.weapon ? " selected" : "";
        const empty = ammo !== Infinity && ammo <= 0;
        const dis = empty ? " disabled" : "";
        return `<button class="weapon-chip${sel}${dis}" data-weapon="${i}"${empty ? " disabled" : ""}>` +
                 `<span class="wc-key">${i + 1}</span>` +
                 `<canvas class="wc-preview" data-preview="${i}" width="90" height="90"></canvas>` +
                 `<span class="wc-name">${w.name}</span>` +
                 `<span class="ammo-badge">${ammoTxt}</span>` +
               `</button>`;
      }).join("");
      // Seçili çipi kaydırmalı çubukta yatayda ortaya getir
      const sel = bar.querySelector(".weapon-chip.selected");
      if (sel) bar.scrollLeft = sel.offsetLeft - bar.clientWidth / 2 + sel.offsetWidth / 2;
      // Çiplerdeki mermi önizlemeleri (emoji ikon yerine gerçek tasarım)
      for (const cv of bar.querySelectorAll("canvas.wc-preview")) {
        this.paintProjectilePreview(cv, WEAPONS[Number(cv.dataset.preview)], 90);
      }
      // Panel yüksekliği değiştiyse alt HUD (güç barı + modül kartı) yeniden hizalanır
      this.syncBottomHud();
    }

    // Açıklama paneli: seçili silahın güç/hız/yarıçap + özel + mühimmat
    const desc = document.getElementById("weapon-desc");
    if (desc) {
      const spec = a.weaponSpec;
      const st = weaponStats(spec);
      const ammo = a.ammo[spec.id];
      const ammoTxt = ammo === Infinity ? "∞" : ammo;
      // Depodan yüklenmiş mermi varsa kaynağı da yazılır; ayrıca maç tavanı
      // hatırlatılır (depo 999 olsa bile bu sınır aşılamaz).
      const depotN = a.ammoDepot ? (a.ammoDepot[spec.id] || 0) : 0;
      const bMax = weaponBattleMax(spec);
      const capTxt = Number.isFinite(bMax) ? ` • savaş tavanı ${bMax}` : "";
      const ammoLine = depotN > 0
        ? `Mühimmat: ${ammoTxt} (taban ${spec.ammo} + depo ${depotN})${capTxt}`
        : `Mühimmat: ${ammoTxt}${capTxt}`;
      desc.innerHTML =
        `<div class="wd-title"><canvas class="wd-preview" width="48" height="48"></canvas>` +
          `<span class="wd-title-text">${spec.name}</span></div>` +
        `<div class="wd-text">${spec.desc}</div>` +
        `<div class="wd-stats">` +
          statRow("Hasar", st.dmg) +
          statRow("Hız", st.speed) +
          statRow("Yarıçap", st.radius) +
        `</div>` +
        `<div class="wd-meta"><span class="wd-special">${spec.special}</span>` +
        `<span class="wd-ammo">${ammoLine}</span></div>`;
      // Seçili silahın mermi önizlemesi (başlığın solunda)
      const previewCv = desc.querySelector("canvas.wd-preview");
      if (previewCv) this.paintProjectilePreview(previewCv, spec, 48);
    }

    // Alt paneldeki hızlı yuvalar (seçili silah / modül / Işınlanma / Kanca).
    paintBattleSlots(this, a);
  }

  /* Mermi önizlemesi — arayüzdeki küçük canvas'a oyun içi mermi çizicisini basar.
   * HUD yalnız (sıra|silah|durum|mühimmat) değişince kurulduğu için maliyet düşük;
   * yine de her (spec|boyut|dpr) bir kez çizilip `_previewCache` ile kopyalanır. */
  paintProjectilePreview(canvas, spec, size) {
    if (!canvas || !spec || !canvas.getContext) return;
    const dpr = Math.min(2, Math.max(1, (typeof window !== "undefined" && window.devicePixelRatio) || 1));
    const px = Math.round(size * dpr);
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cache = this._previewCache || (this._previewCache = new Map());
    const key = spec.id + "|" + size + "|" + dpr;
    let src = cache.get(key);
    if (!src) {
      src = document.createElement("canvas");
      src.width = px;
      src.height = px;
      const sctx = src.getContext("2d");
      if (sctx) { sctx.scale(dpr, dpr); Projectile.drawIcon(sctx, spec, size); }
      cache.set(key, src);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    ctx.drawImage(src, 0, 0);
  }

  /* Robot portresi — alt panel kartındaki küçük canvas'a oyun içi robot
   * çizicisini basar. Portre (charDef + parça loadout) maç boyunca sabit
   * olduğu için çağıran taraf yalnız imza değişince çağırır; çizim ayrıca
   * (charDef|boyut|dpr|loadout) anahtarına göre `_robotPreviewCache` ile
   * bir kez üretilip kopyalanır. */
  paintRobotPreview(canvas, charDef, size, parts) {
    if (!canvas || !charDef || !canvas.getContext) return;
    const dpr = Math.min(2, Math.max(1, (typeof window !== "undefined" && window.devicePixelRatio) || 1));
    const px = Math.round(size * dpr);
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const partSig = parts ? Object.keys(parts).sort()
      .map((k) => k + "=" + (Array.isArray(parts[k]) ? parts[k].join("+") : parts[k])).join(",") : "";
    const key = charDef.id + "|" + size + "|" + dpr + "|" + partSig;
    const cache = this._robotPreviewCache || (this._robotPreviewCache = new Map());
    let src = cache.get(key);
    if (!src) {
      src = document.createElement("canvas");
      src.width = px;
      src.height = px;
      const sctx = src.getContext("2d");
      if (sctx && typeof drawRobot === "function") {
        sctx.scale(dpr, dpr);
        drawRobot(sctx, {
          cx: size / 2, cy: size * 0.55, r: size * 0.37, facing: 1,
          charDef, timeMs: 0, motion: { vx: 0, vy: 0, onGround: true }, parts,
        });
      }
      cache.set(key, src);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    ctx.drawImage(src, 0, 0);
  }

  // ── Yeni silah sistemleri: Bomba Yağmuru, Mayın, Napalm ──────────────────

  // Bomba Yağmuru: fare hedef sütununun üstünden N bombayı aşağı düşür
  fireAirdrop(a, spec, power) {
    const tx = this.input.mouseX;
    const count = spec.airdropCount || 5;
    const spread = spec.airdropSpread || 80;
    for (let i = 0; i < count; i++) {
      const px = tx + (Math.random() * 2 - 1) * spread;
      const vx = (Math.random() * 2 - 1) * 0.6;
      const vy = 2 + Math.random() * 1.5;            // aşağı doğru başlangıç hızı
      this.projectiles.push(new Projectile(px, -24 - Math.random() * 40, vx, vy, spec));
    }
    SFX.shoot(spec);
    a.lastShot = { aim: a.aim, power };
    this.lastShot = {
      by: a.name, color: a.color, weapon: spec.name, icon: spec.icon,
      angle: 90, power: Math.round(power * 100), speed: "—",
    };
    this.state = "PROJECTILE";
  }

  // Mayın: araziye inince patlamaz, yere kurulur (turlar arası kalıcı)
  placeMine(x, y, spec) {
    this.mines.push({ x, y, spec, arm: spec.armFrames || 30, owner: this.shooterIdx });
  }

  // Her kare: kurulu mayınların menziline giren canlı oyuncuyu patlat
  updateMines(dt) {
    if (!this.mines || !this.mines.length) return;
    const survivors = [];
    for (const mine of this.mines) {
      if (mine.arm > 0) { mine.arm--; survivors.push(mine); continue; }
      let hit = false;
      for (const p of this.players) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - mine.x, (p.y - p.r) - mine.y) < (mine.spec.trigger || 32)) { hit = true; break; }
      }
      if (hit) {
        this.shooterIdx = mine.owner;  // hasar atfı + dmgMult koyana ait
        this.shotMod = null;           // mayın nextShot bonusundan etkilenmez
        this.shotIsSkill = false;      // kalıcı tehlike: Çekirdek bonusu geçerli
        this.explode(mine.x, mine.y, mine.spec);
      } else {
        survivors.push(mine);
      }
    }
    this.mines = survivors;
  }

  // ── Yardımcı cephaneler: Işınlanma Topu + Kanca ───────────────────────

  // Işınlanma Topu: merminin değdiği noktanın ÜSTÜNDEKİ açık alana atıcıyı
  // taşır. Temas noktasından yukarı doğru ilk açık piksel taranır; duvar
  // kenarına değen top bile robotu sütunun tepesine oturtur, içine gömmez.
  // Hasarsızdır: patlama/krater oluşmaz, tur normal akışta SETTLE ile biter.
  teleportShooter(x, y) {
    const t = this.terrain;
    const shooter = this.shooterIdx !== null ? this.players[this.shooterIdx] : null;
    if (!shooter || !shooter.alive || !t) return;
    // Temas noktasından yukarı doğru ilk açık pikseli bul (katı sütunun tepesi)
    let ty = Math.max(2, Math.min(t.h - 2, y | 0));
    let guard = t.h;
    while (guard-- > 0 && t.isSolid(x, ty)) ty--;
    if (ty <= 2) return; // ekranın tepesine taştı: ışınlanma iptal (mühimmat yanar)
    // Varış efektleri: eski ve yeni konumda mor parıltı + "zap" sesi
    this.explosions.push(new Explosion(shooter.x, shooter.y - shooter.r, 20, { r: 150, g: 90, b: 255 }));
    shooter.x = Math.max(shooter.r, Math.min(t.w - shooter.r, x));
    shooter.y = ty;
    shooter.vx = 0;
    shooter.vy = 0;
    shooter.onGround = false; // yerleşmeyi fizik halleder (SETTLE bekler)
    this.explosions.push(new Explosion(shooter.x, shooter.y - shooter.r, 20, { r: 150, g: 80, b: 255 }));
    SFX.teleport();
  }

  // Kanca: tutunduğu noktadan atıcıyı kendine doğru çeker. Mermi ölür; çekme
  // işlemi `this.tether` durumuna geçer ve tur, ip çözülünce (PROJECTILE ->
  // SETTLE geçidi) kapanır.
  startHookPull(ax, ay) {
    const shooter = this.shooterIdx !== null ? this.players[this.shooterIdx] : null;
    if (!shooter || !shooter.alive) return;
    // Zaten yeterince yakınsa çekmeye gerek yok (boşa tur harcamaz, tur biter)
    if (Math.hypot(ax - shooter.x, ay - (shooter.y - shooter.r)) < shooter.r + 8) return;
    this.tether = { owner: shooter, ax, ay, speed: 7.5, life: 240, blocked: 0 };
    // Tutunma anı: küçük beyaz çakma + metalik ses
    this.explosions.push(new Explosion(ax, ay, 10, { r: 220, g: 220, b: 240 }));
    SFX.hook();
  }

  // Her kare: gövdeyi ip boyunca ankraja sürükle. Gövde merkezi katı maddeye
  // girmeden önce durur (duvara çekilirken kenarda takılır); ilerleme kilitlenince
  // ya da ankraja varınca ip bırakılır ve fizik yerleşimi (SETTLE) devralır.
  updateTether() {
    const t = this.tether;
    const p = t.owner;
    t.life--;
    if (!p.alive || t.life <= 0) { this.tether = null; return; }
    const cx = p.x, cy = p.y - p.r; // gövde merkezi (ayak değil)
    const dx = t.ax - cx, dy = t.ay - cy;
    const dist = Math.hypot(dx, dy);
    // Varış: gövde merkezi ankraja yeterince yaklaştıysa bırak
    if (dist <= p.r + 6) {
      this.tether = null;
      p.vx = 0; p.vy = 0;
      return;
    }
    const step = Math.min(t.speed, dist);
    const ux = dx / dist, uy = dy / dist;
    // Alt adımlarla ilerle; gövdenin ÖNDEKI kenarı (merkez + r) katı maddeye
    // girecekse dur — gövde duvarın içinde kalmaz, kenarda takılıp kalır.
    const fromX = p.x, fromY = p.y;
    const sub = Math.max(1, Math.ceil(step / 2));
    for (let i = 0; i < sub; i++) {
      const sx = ux * (step / sub), sy = uy * (step / sub);
      if (this.terrain.isSolid(p.x + sx + ux * p.r, p.y - p.r + sy + uy * p.r)) break;
      p.x += sx;
      p.y += sy;
    }
    p.x = Math.max(p.r, Math.min(this.terrain.w - p.r, p.x));
    // İlerleme kilitlendiyse (ip gergin ama gövde takılı) kısa sürede bırak
    const moved = Math.hypot(p.x - fromX, p.y - fromY);
    if (moved < step * 0.4) t.blocked++;
    else t.blocked = 0;
    if (t.blocked > 8) { this.tether = null; p.vx = 0; p.vy = 0; return; }
    // Çekim sırasında yerçekimi birikmesin: hız tamamen ip tarafından belirlenir
    p.vx = 0;
    p.vy = 0;
    p.onGround = false;
  }

  // Kanca ipi: atıcıdan ankraja gergin ip + ucundaki kanca başı (yalnız görsel).
  drawTether(ctx) {
    const t = this.tether;
    if (!t || !t.owner.alive) return;
    const p = t.owner;
    const cx = p.x, cy = p.y - p.r;
    ctx.strokeStyle = "#cfcfd6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(t.ax, t.ay);
    ctx.stroke();
    // Ankrajda tutunan kanca başı (mermi kendisi öldüğü için burada çizilir)
    projRing(ctx, t.ax, t.ay, 4, "#f0f0f5", 2);
    ctx.beginPath();
    ctx.arc(t.ax, t.ay, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  // Napalm: patlama noktasının çevresine yanan yamalar serp (zemine oturur)
  spawnFires(x, y, spec) {
    const count = spec.fireCount || 8;
    const spread = spec.fireSpread || 40;
    const life = spec.fireLife || 140;
    for (let i = 0; i < count; i++) {
      const fx = x + (Math.random() * 2 - 1) * spread;
      const surf = this.terrain.surfaceBelow(fx, Math.max(0, (y - 40) | 0));
      this.fires.push({
        x: fx, y: surf < this.terrain.h ? surf : y,
        life, max: life, dps: spec.fireDamage || 4, tick: 0,
      });
    }
  }

  // Her kare: ateşleri yaşlandır + üstündeki canlı oyunculara periyodik hasar
  updateFires(dt) {
    if (!this.fires || !this.fires.length) return;
    for (const f of this.fires) {
      f.life--;
      f.tick++;
      if (f.tick % 15 === 0) {  // ~4x/sn: alev tiki
        for (const p of this.players) {
          if (!p.alive) continue;
          if (Math.hypot(p.x - f.x, p.y - f.y) < 22) {
            this.damagePlayer(p, f.dps);
          }
        }
      }
    }
    this.fires = this.fires.filter((f) => f.life > 0);
  }

  drawMines(ctx) {
    if (!this.mines) return;
    // Kurulu mayın, düşen mermiyle AYNI gövdeyi kullanır (projectile.js > mine
    // shape'i): aynı tasarım dili, tek bakım noktası. Yanıp sönme 200 ms'lik
    // yaş adımıyla sürülür; kurulmamış mayında LED sabit amber yanar.
    const shape = PROJECTILE_SHAPES.mine;
    const blinkAge = Math.floor(Date.now() / 200) * 12;
    for (const m of this.mines) {
      const armed = m.arm <= 0;
      ctx.save();
      ctx.translate(m.x, m.y - 3);
      shape(ctx, {
        x: 0, y: 0, r: 6, spec: m.spec || {}, armed: armed,
        age: armed ? blinkAge : 0, spinAngle: 0, stuck: false, trail: [],
      });
      ctx.restore();
    }
  }

  drawFires(ctx) {
    if (!this.fires) return;
    const now = Date.now();
    for (const f of this.fires) {
      const a = Math.max(0, f.life / f.max);
      const flick = 0.6 + 0.4 * Math.sin(now / 80 + f.x);
      for (let k = 0; k < 3; k++) {
        const fx = f.x + (k - 1) * 5;
        const h = (10 + k * 3) * flick * (0.5 + a * 0.5);
        ctx.beginPath();
        ctx.moveTo(fx - 4, f.y);
        ctx.quadraticCurveTo(fx, f.y - h, fx + 4, f.y);
        ctx.closePath();
        ctx.fillStyle = `rgba(255,${110 + k * 45},40,${0.55 * a + 0.15})`;
        ctx.fill();
      }
    }
  }

  // Bomba Yağmuru seçiliyken düşüş hedefini (fare sütunu) göster
  drawAirdropTarget(ctx) {
    const x = this.input.mouseX;
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, this.H);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#ff6b6baa";
    ctx.stroke();
    ctx.setLineDash([]);
    const sy = this.terrain.surfaceBelow(x, 0);
    ctx.beginPath();
    ctx.arc(x, sy < this.terrain.h ? sy : this.H - 4, 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  spawnInitialBarrels() {
    this.barrels = [];
    if (!this.terrain) return;
    const candidates = [0.22, 0.50, 0.78];
    for (const fx of candidates) {
      const bx = Math.round(this.W * fx);
      const by = this.terrain.surfaceBelow(bx, 0);
      if (by > 40 && by < this.H - 40) {
        this.barrels.push({ x: bx, y: by - 10, r: 10, hp: 25, maxHp: 25, alive: true });
      }
    }
  }

  updateBarrels(dt) {
    if (!this.barrels || !this.terrain) return;
    for (const b of this.barrels) {
      if (!b.alive) continue;
      const ground = this.terrain.surfaceBelow(b.x, Math.max(0, b.y - 8));
      if (b.y < ground - b.r) {
        b.y = Math.min(ground - b.r, b.y + 4);
      }
      if (b.y > this.H - 8) b.alive = false;
    }
    this.barrels = this.barrels.filter((b) => b.alive);
  }

  drawBarrels(ctx) {
    if (!this.barrels || !this.barrels.length) return;
    for (const b of this.barrels) {
      if (!b.alive) continue;
      ctx.save();
      const bw = 14, bh = 18;
      const bx = b.x - bw / 2, by = b.y - bh / 2;

      // Silindirik varil gövdesi (koyu kırmızı endüstriyel)
      const grad = ctx.createLinearGradient(bx, by, bx + bw, by);
      grad.addColorStop(0, "#8b1515");
      grad.addColorStop(0.4, "#d32f2f");
      grad.addColorStop(1, "#5f0909");
      ctx.fillStyle = grad;
      _csRoundRect(ctx, bx, by, bw, bh, 2.5);

      // Üst ve alt metal çemberler
      ctx.fillStyle = "#263238";
      ctx.fillRect(bx, by + 1, bw, 2.5);
      ctx.fillRect(bx, by + bh - 3.5, bw, 2.5);

      // Sarı-siyah tehlike şeridi (ortada)
      ctx.fillStyle = "#ffd600";
      ctx.fillRect(bx, by + 7, bw, 4);
      ctx.fillStyle = "#212121";
      ctx.fillRect(bx + 3, by + 7, 2.5, 4);
      ctx.fillRect(bx + 9, by + 7, 2.5, 4);

      // Alev simgesi
      ctx.font = uiTextFont(8, 800);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("🔥", b.x, by - 4);
      ctx.restore();
    }
  }

  spawnCrate() {
    if (!this.crates) this.crates = [];
    if (this.crates.length >= 3) return;
    const x = Math.round(this.W * (0.16 + Math.random() * 0.68));
    const roll = Math.random();
    let kind = "weapon";
    let weaponId = "cluster";
    let qty = 2;
    let amount = 35;

    if (roll < 0.40) {
      kind = "weapon";
      const choices = [
        { id: "nuke", q: 1 },
        { id: "mirv", q: 1 },
        { id: "airstrike", q: 1 },
        { id: "megacluster", q: 1 },
        { id: "cluster", q: 2 },
        { id: "drill", q: 2 },
        { id: "napalm", q: 2 },
        { id: "rubbertrio", q: 2 },
        { id: "teleportball", q: 2 },
        { id: "hook", q: 2 }
      ];
      const picked = choices[Math.floor(Math.random() * choices.length)];
      weaponId = picked.id;
      qty = picked.q;
    } else if (roll < 0.65) {
      kind = "health";
      amount = 35;
    } else if (roll < 0.85) {
      kind = "scrap";
      amount = 50;
    } else {
      kind = "shield";
    }

    this.crates.push({
      x,
      y: -20,
      vy: 1.35,
      onGround: false,
      parachute: true,
      kind,
      weaponId,
      qty,
      amount,
      wobble: Math.random() * Math.PI,
      dead: false
    });
    this.damagePopups.push({ x, y: 35, text: kind === "scrap" ? "🔩 HURDA SANDIĞI GELİYOR!" : "📦 İKMAL SANDIĞI GELİYOR!", color: kind === "scrap" ? "#ffd166" : "#ffe45e", scale: 1.05, age: 0 });
  }

  updateCrates(dt) {
    if (!this.crates) return;
    for (const c of this.crates) {
      if (c.dead) continue;
      if (!c.onGround) {
        c.y += c.vy;
        c.wobble += dt * 3.5;
        if (this.terrain && this.terrain.isSolid(c.x, c.y + 10)) {
          c.onGround = true;
          c.parachute = false;
          c.y = this.terrain.surfaceBelow(c.x, Math.max(0, c.y - 12)) - 8;
        }
        if (c.y > this.H) c.dead = true;
      }

      for (const p of this.players) {
        if (!p.alive) continue;
        const dist = Math.hypot(p.x - c.x, (p.y - p.r) - c.y);
        if (dist < p.r + 14) {
          c.dead = true;
          if (c.kind === "weapon") {
            p.ammo[c.weaponId] = (p.ammo[c.weaponId] || 0) + c.qty;
            const wObj = WEAPONS.find((w) => w.id === c.weaponId);
            const wName = wObj ? wObj.name : "Cephane";
            this.damagePopups.push({ x: c.x, y: c.y - 14, text: `+${c.qty} ${wName}! 📦`, color: "#ffe45e", scale: 1.15, age: 0 });
            if (typeof SFX !== "undefined" && SFX.pickup) SFX.pickup();
            this.updateWeaponHud();
          } else if (c.kind === "health") {
            const healed = Math.min(c.amount, p.maxHp - p.hp);
            p.hp = Math.min(p.maxHp, p.hp + c.amount);
            this.damagePopups.push({ x: c.x, y: c.y - 14, text: `+${healed > 0 ? healed : c.amount} HP! 🔧`, color: "#63e6be", scale: 1.15, age: 0 });
            if (typeof SFX !== "undefined" && SFX.skill) SFX.skill("heal");
          } else if (c.kind === "scrap") {
            const scrapAmt = c.amount || 50;
            if (this.profile) this.profile.scrap += scrapAmt;
            if (this.combatStats) this.combatStats.crateScrap = (this.combatStats.crateScrap || 0) + scrapAmt;
            this.damagePopups.push({ x: c.x, y: c.y - 14, text: `+${scrapAmt} HURDA! 🔩`, color: "#ffd166", scale: 1.25, age: 0 });
            if (typeof SFX !== "undefined" && SFX.upgradeTier) SFX.upgradeTier();
            this.updateHud();
          } else if (c.kind === "shield") {
            p.blockShield = true;
            this.damagePopups.push({ x: c.x, y: c.y - 14, text: "KUTUP KALKANI! 🛡️", color: "#62d9ff", scale: 1.15, age: 0 });
            if (typeof SFX !== "undefined" && SFX.skill) SFX.skill("shield");
          }
          break;
        }
      }
    }
    this.crates = this.crates.filter((c) => !c.dead);
  }

  drawCrates(ctx) {
    if (!this.crates || !this.crates.length) return;
    for (const c of this.crates) {
      if (c.dead) continue;
      ctx.save();
      if (c.parachute) {
        const wobble = Math.sin(c.wobble || 0) * 3;
        const px = c.x + wobble;
        const py = c.y - 18;
        ctx.strokeStyle = "rgba(220, 230, 240, 0.75)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px - 14, py); ctx.lineTo(c.x - 7, c.y - 7);
        ctx.moveTo(px - 5, py);  ctx.lineTo(c.x - 3, c.y - 7);
        ctx.moveTo(px + 5, py);  ctx.lineTo(c.x + 3, c.y - 7);
        ctx.moveTo(px + 14, py); ctx.lineTo(c.x + 7, c.y - 7);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px, py, 16, Math.PI, 0, false);
        ctx.fillStyle = c.kind === "weapon" ? "#ff8c1a" : c.kind === "health" ? "#2ecc71" : c.kind === "scrap" ? "#ffd166" : "#3498db";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffffcc";
        ctx.stroke();

        ctx.fillStyle = "#ffffffaa";
        ctx.beginPath();
        ctx.moveTo(px - 6, py - 15);
        ctx.quadraticCurveTo(px, py - 6, px + 6, py - 15);
        ctx.lineTo(px + 3, py);
        ctx.quadraticCurveTo(px, py - 4, px - 3, py);
        ctx.closePath();
        ctx.fill();
      }

      const cx = c.x - 8, cy = c.y - 8, cw = 16, ch = 16;
      ctx.fillStyle = "#6d4c41";
      ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeStyle = "#37474f";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cw, ch);

      ctx.strokeStyle = "#4e342e";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + 2, cy + 2); ctx.lineTo(cx + cw - 2, cy + ch - 2);
      ctx.moveTo(cx + cw - 2, cy + 2); ctx.lineTo(cx + 2, cy + ch - 2);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = uiTitleFont(10, 800);
      if (c.kind === "weapon") {
        ctx.fillStyle = "#ffe45e";
        ctx.fillText("✦", c.x, c.y);
      } else if (c.kind === "health") {
        ctx.fillStyle = "#63e6be";
        ctx.fillText("+", c.x, c.y);
      } else if (c.kind === "scrap") {
        ctx.fillStyle = "#ffd166";
        ctx.fillText("🔩", c.x, c.y);
      } else {
        ctx.fillStyle = "#62d9ff";
        ctx.fillText("◆", c.x, c.y);
      }
      ctx.restore();
    }
  }

  triggerScreenShake(amount) {
    if (!this.screenShake) this.screenShake = { trauma: 0, time: 0, x: 0, y: 0 };
    this.screenShake.trauma = Math.min(1.0, this.screenShake.trauma + (amount || 0.5));
  }

  updateScreenShake(dt) {
    if (this.screenShake && this.screenShake.trauma > 0) {
      this.screenShake.trauma = Math.max(0, this.screenShake.trauma - dt * 2.8);
      this.screenShake.time += dt;
      const p = Math.pow(this.screenShake.trauma, 1.8);
      const maxOffset = 13;
      this.screenShake.x = (Math.sin(this.screenShake.time * 62) + Math.cos(this.screenShake.time * 43)) * 0.5 * maxOffset * p;
      this.screenShake.y = (Math.cos(this.screenShake.time * 55) - Math.sin(this.screenShake.time * 37)) * 0.5 * maxOffset * p;
    } else if (this.screenShake) {
      this.screenShake.x = 0;
      this.screenShake.y = 0;
    }
  }

  drawSuddenDeath(ctx) {
    if (!this.suddenDeath || !(this.suddenDeathLevel > 0)) return;
    ctx.save();
    const acidY = this.H - this.suddenDeathLevel;
    const t = (this.renderTimeMs || 0) * 0.003;

    const grad = ctx.createLinearGradient(0, acidY, 0, this.H);
    grad.addColorStop(0, "rgba(0, 230, 118, 0.78)");
    grad.addColorStop(0.2, "rgba(27, 94, 32, 0.88)");
    grad.addColorStop(1, "rgba(10, 40, 15, 0.96)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, this.H);
    ctx.lineTo(0, acidY);
    for (let x = 0; x <= this.W; x += 30) {
      const wave = Math.sin(t * 3 + x * 0.04) * 4 + Math.cos(t * 2 + x * 0.02) * 2;
      ctx.lineTo(x, acidY + wave);
    }
    ctx.lineTo(this.W, this.H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(185, 255, 102, 0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x <= this.W; x += 30) {
      const wave = Math.sin(t * 3 + x * 0.04) * 4 + Math.cos(t * 2 + x * 0.02) * 2;
      if (x === 0) ctx.moveTo(x, acidY + wave);
      else ctx.lineTo(x, acidY + wave);
    }
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const bx = ((i * 127 + t * 40) % (this.W - 40)) + 20;
      const by = acidY + 8 + ((i * 31 + t * 50) % Math.max(10, this.suddenDeathLevel - 10));
      const br = 2 + (i % 3);
      ctx.fillStyle = "rgba(185, 255, 102, 0.65)";
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Görsel bozulma kurtarma mekanizması (canvas state recovery):
  // Çizim sırasında beklenmedik bir hata fırlatıldığında veya eksik save/restore
  // oluştuğunda canvas durumunu temiz varsayılana döndürür.
  recoverCanvas() {
    try {
      if (this.canvas && this.canvas.width) {
        this.canvas.width = this.canvas.width;
      }
      const ctx = this.ctx;
      if (ctx) {
        ctx.setTransform(this._scaleX || 1, 0, 0, this._scaleY || 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        if (ctx.filter && ctx.filter !== "none") ctx.filter = "none";
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
        ctx.clearRect(0, 0, this.W, this.H);
      }
    } catch (e) {
      console.warn("recoverCanvas hatası:", e);
    }
  }

  loop(ts) {
    requestAnimationFrame(this.loop.bind(this));
    this.renderTimeMs = ts;
    if (typeof DIAG !== "undefined") DIAG.frame(ts);   // tanılama: FPS örneği (F6)
    try {
      SFX.musicSync(this.state, this.mode); // arka plan müziği tema senkronu
    } catch (e) {
      /* ses senkron hatası oyunu durdurmaz */
    }

    // FPS'i 60'a sabitle: yeterli süre geçmediyse bu kareyi atla.
    // (1ms tolerans: tam 60Hz ekranlarda yanlışlıkla 30 FPS'e düşmeyi önler.)
    const elapsed = ts - this.lastTime;
    if (elapsed < FRAME_TIME - 1) return;
    // Kayma düzeltme: artan süreyi bir sonraki kareye taşı.
    this.lastTime = ts - (elapsed % FRAME_TIME);

    // Sabit adım: her güncelleme tam olarak 1/60 saniye ilerler.
    try {
      this.update(1 / FPS);
    } catch (err) {
      console.error("[Game Loop] Update hatası yakalandı:", err);
      if (typeof DIAG !== "undefined") DIAG.record("error", "Update: " + (err && err.message));
    }

    try {
      this.render();
    } catch (err) {
      console.error("[Game Loop] Render hatası yakalandı:", err);
      if (typeof DIAG !== "undefined") DIAG.record("error", "Render: " + (err && err.message));
      this.recoverCanvas();
    }
  }

  // Küçük çarpı/panel hit yardımcı: menü kartlarında tekrar eden test.
  hitRect(rect, x, y) {
    if (!rect) return false;
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

}

// Tek oyunculu ilerleme modu: bilgisayara karşı. Bu modda insan robotunda
// Atölye geliştirmeleri etkindir ve maç ödülü yazılır. game.js'teki tüm
// mode === "computer" kontrolleri bu kapıdan geçer.
function isSinglePlayerProgressionMode(mode) {
  return mode === "computer";
}

// Canvas metin kaydırma: kelime kelime kırar; öğretici metinleri
// kutu içine bu şekilde sarılır (Math.random() kullanmaz).
function _wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const rows = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? current + " " + word : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      rows.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) rows.push(current);
  return rows;
}

/* ---- yardımcılar ---- */
function randWind() {
  return (Math.random() * 2 - 1) * 4; // -4..4
}

function randWindDuration() {
  return WIND_MIN_TURNS + Math.floor(Math.random() * (WIND_MAX_TURNS - WIND_MIN_TURNS + 1));
}

function randDifferentWind(previous) {
  let next = randWind();
  for (let attempt = 0; attempt < 8 && Math.abs(next - previous) < 0.8; attempt++) {
    next = randWind();
  }
  // Aşırı talihsiz rastgele dizilerde bile görsel/sesli bildirimi anlamsız bırakma.
  if (Math.abs(next - previous) < 0.8) {
    next = previous >= 0 ? Math.max(-4, previous - 1.2) : Math.min(4, previous + 1.2);
  }
  return Math.max(-4, Math.min(4, next));
}

function getCSS(varName, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

let _clouds = null;
function drawClouds(ctx, W, color) {
  if (!_clouds) {
    _clouds = [];
    for (let i = 0; i < 5; i++) {
      _clouds.push({ x: Math.random() * W, y: 40 + Math.random() * 120, s: 0.6 + Math.random() * 0.8 });
    }
  }
  ctx.fillStyle = color || "#ffffffcc";
  for (const c of _clouds) {
    c.x += 0.15 * c.s;
    if (c.x > W + 60) c.x = -60;
    const s = c.s;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 20 * s, 0, 6.28);
    ctx.arc(c.x + 22 * s, c.y + 4, 16 * s, 0, 6.28);
    ctx.arc(c.x - 22 * s, c.y + 4, 16 * s, 0, 6.28);
    ctx.fill();
  }
}

function updatePowerBar(power, show, markerPct) {
  const bar = document.getElementById("power-bar");
  const fill = document.getElementById("power-fill");
  if (!bar || !fill) return;
  bar.classList.toggle("hidden", !show);
  fill.style.width = `${Math.round(power * 100)}%`;

  // Son atış işaretçisi: yalnızca bar görünürken ve geçerli bir değer varken
  const marker = document.getElementById("power-marker");
  if (marker) {
    const showMarker = show && markerPct != null;
    marker.classList.toggle("hidden", !showMarker);
    if (showMarker) marker.style.left = `${markerPct}%`;
  }
}

// ── Alt panel hızlı yuvaları (Wild Ones düzeni) ──────────────────────────
// Seçili silah / dahili modül / Işınlanma Topu / Kanca. Mesajlaşma ve sipariş
// (order snack) yuvaları bilinçli olarak yoktur. Serbest fonksiyon: `update()`
// menülerde `updateWeaponHud`'u sahte bir nesne üzerinden de çağırabildiği için
// (testler) metod çağrısına bağlı kalmadan yalnız DOM'u düzenler.
function paintBattleSlots(game, a) {
  if (!a || !a.charDef || !a.weaponSpec) return;
  paintWeaponSlot(game, "weapon", a, a.weaponSpec, true);
  paintSkillSlot(a, a.resolvedSkill || a.charDef.skill);
  // Yardımcı cihaz adları kısa tutulur: yuva darlığında ellipsis'e düşmesin.
  paintWeaponSlot(game, "teleport", a, WEAPONS.find((w) => w.id === "teleportball"), false, t("hud.slot.teleportShort", "Işınlanma"));
  paintWeaponSlot(game, "hook", a, WEAPONS.find((w) => w.id === "hook"), false, t("hud.slot.hook", "Kanca"));
}

// Silah/yardımcı yuvası: ikon (mermi çizicisi) + mühimmat sayacı + ad.
function paintWeaponSlot(game, slotName, a, spec, isSelected, label) {
  const el = document.getElementById("slot-" + slotName);
  if (!el || !spec) return;
  const cv = el.querySelector(".slot-icon");
  if (cv && game) game.paintProjectilePreview(cv, spec, 44);
  const left = a.ammo[spec.id];
  const empty = left !== Infinity && !(left > 0);
  setSlotText(el, ".slot-count", left === Infinity ? "∞" : String(left));
  setSlotText(el, ".slot-name", label || spec.name);
  el.classList.toggle("active", !!isSelected || a.weaponSpec === spec);
  el.classList.toggle("locked", empty);
}

// Modül yuvası: cast efektinin ikonu + hazır/geri sayım.
function paintSkillSlot(a, def) {
  const el = document.getElementById("slot-skill");
  if (!el || !def) return;
  const cv = el.querySelector(".slot-icon");
  if (cv && cv.getContext) {
    const dpr = Math.min(2, Math.max(1, (typeof window !== "undefined" && window.devicePixelRatio) || 1));
    const px = Math.round(44 * dpr);
    if (cv.width !== px) { cv.width = px; cv.height = px; }
    const ctx = cv.getContext("2d");
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, px, px);
      ctx.save();
      ctx.scale(dpr, dpr);
      if (typeof drawSkillFxIcon === "function") drawSkillFxIcon(ctx, def, 44);
      ctx.restore();
    }
  }
  const ready = a.skillCooldown <= 0;
  setSlotText(el, ".slot-count", ready ? "Q" : String(a.skillCooldown));
  setSlotText(el, ".slot-name", def.label);
  el.classList.toggle("ready", ready);
  el.classList.toggle("cooling", !ready);
  el.classList.toggle("active", false);
}

function setSlotText(el, sel, text) {
  const node = el.querySelector(sel);
  if (node && node.textContent !== text) node.textContent = text;
}

// ── UI yazı yardımcıları (ui-theme-plan.md §2.3) ────────────────────────
// Canvas yazılarını ortak font yardımcıları yönetir. Başlıklar da Chakra Petch
// 700 kullanır; farklı aile yerine ağırlık ve boyutla hiyerarşi kurulur.
function uiTitleFont(px) {
  return `700 ${px}px "Chakra Petch", "Segoe UI", sans-serif`;
}
function uiTextFont(px, weight) {
  // Gövde varsayılanı SemiBold (600): Chakra Petch'in ince/geniş 400 kesimi
  // 700 etiketlerin yanında "başka bir aile" gibi okunuyordu (kullanıcı
  // bildirimi, 2026-09-25). Açıkça 700 verilen etiket/buton/vurgu yazıları
  // kalır; gövde/açıklama/diyalog 600 olur.
  return `${weight || 600} ${px}px "Chakra Petch", "Segoe UI", sans-serif`;
}

// Atölye dalı ve parça yuvası adları: Türkçe kaynak metinler progression.js
// (BRANCH_LABELS) ve parts.js (SLOT_LABELS) içindedir; çeviri anahtarı dal/yuva
// kimliğinden üretilir (i18n.js > I18N_DYNAMIC_PREFIXES bu aileleri bildirir).
function branchLabel(branch) {
  return t("workshop.branch." + branch, BRANCH_LABELS[branch] || branch);
}
function slotLabel(slot) {
  return t("workshop.slot." + slot, SLOT_LABELS[slot] || slot);
}
// Pazar sekme başlıkları: sekme kimliğinden türetilir (market.tab.*) ve kaynak
// metin MARKET_TABS > label'dır — yuva sekmeleri Atölye ile aynı adı taşır.
function marketTabLabel(id) {
  const tab = MARKET_TABS.find((x) => x.id === id);
  return t("market.tab." + id, tab ? tab.label : id);
}

// Kart metni sığdırıcı: metni önce punto küçülterek, sonra satırlara bölerek
// verilen genişliğe oturtur (Russo One Segoe UI'dan geniş olduğu için uzun
// başlıklar karttan taşabilirdi — kullanıcı bildirimiyle eklendi). Dönen
// { lines, px } ile satır aralığı gerçek puntodan hesaplanır.
function _fitTextLines(ctx, text, maxWidth, px, fontFn, maxLines, minPx) {
  for (;;) {
    ctx.font = fontFn(px);
    const rows = _wrapCanvasText(ctx, text, maxWidth);
    if (rows.length <= maxLines || px <= minPx) return { lines: rows, px };
    px -= 1;
  }
}

// Karakter seçim ekranı için yardımcılar
function _csRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Operasyon konsolu panel yardımcıları ─────────────────────────────────
// Büyük yüzeyler _csPanel ile; küçük etiketler ve rozetler _csRoundRect ile
// çizilir. Kartların hitbox'ı render fonksiyonlarında ayrı tutulur.

// Kesik köşeli panel yolu: köşeler c piksel kadar 45° kesilir.
function _panelPath(ctx, x, y, w, h, c) {
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

// Eski tehlike şeritlerinin yerini ortak konsol vurgusu alır.
function _csHazardStrip(ctx, x, y, w, h) {
  ctx.fillStyle = "#f4bd62";
  ctx.fillRect(x, y, w, h);
}

// Hover parıltısı: mevcut yolu renkli gölgeyle ikinci kez konturlar.
function _csGlow(ctx, color, blur) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur || 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// Asma kilit glifi (Atölye eylem düğmesinin "kilitli" durumu): gövdenin
// üstünde iki kollu yay + kesik köşeli mini plaka. Tehlike şeridinin sakin
// karşılığıdır — şerit ekranın aile imzası olarak panelin üst kenarında kalır
// (ui-theme-phases.md §5 F3C-04, kullanıcı görsel kabulü).
// s: glif yüksekliği (px); glif cy'ye göre dikey ortalanır.
function _csLockGlyph(ctx, cx, cy, s, color) {
  const bodyW = s * 0.75, bodyH = s * 0.5;
  const bodyY = cy + s * 0.5 - bodyH;           // gövde glif kutusunun dibinde
  const r = s * 0.23, ay = bodyY - s * 0.22;    // yay merkezi gövdenin üstünde
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r, bodyY);
  ctx.lineTo(cx - r, ay);
  ctx.arc(cx, ay, r, Math.PI, 0);
  ctx.lineTo(cx + r, bodyY);
  ctx.stroke();
  _csRoundRect(ctx, cx - bodyW / 2, bodyY, bodyW, bodyH, 1.6);
  ctx.fill();
  // Anahtar deliği: gövdeyi "kilit" olarak okutur (koyu nokta)
  ctx.fillStyle = "#0b1015";
  ctx.beginPath();
  ctx.arc(cx, bodyY + bodyH * 0.5, s * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Ana panel. opts:
//   accent    — kenarlık rengi (varsayılan çelik mavisi #3b526b)
//   hover     — açık dolgu + (glow ile) parıltı
//   glow      — hover parıltısı açık/kapalı
//   selected  — kalın kenarlık (seçili durum)
//   rivets    — eski çağrılarla uyum için kabul edilir (çizilmez)
//   hazardTop — üst kenarda ince vurgu (eski çağrılarla uyumluluk)
//   fillTop/fillBottom — özel dolgu (seçili durumun yeşili vb.)
function _csPanel(ctx, x, y, w, h, opts) {
  const o = opts || {};
  const radius = Math.min(14, Math.floor(Math.min(w, h) / 5));
  _csRoundRect(ctx, x, y, w, h, radius);
  // Yumuşak, katmanlı konsol yüzeyi; içerik karttan daha belirgin kalır.
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, o.fillTop || (o.hover ? "#20343a" : "#18272c"));
  grad.addColorStop(1, o.fillBottom || (o.hover ? "#14252a" : "#101c21"));
  ctx.fillStyle = grad;
  ctx.fill();
  // Üst tehlike şeridi: panel yoluna kırparak kesik köşelerden taşmaz
  if (o.hazardTop) {
    ctx.save();
    _csRoundRect(ctx, x, y, w, h, radius);
    ctx.clip();
    _csHazardStrip(ctx, x, y, w, 5);
    ctx.restore();
  }
  // Kenarlık (+ hover parıltısı)
  _csRoundRect(ctx, x, y, w, h, radius);
  ctx.lineWidth = o.hover || o.selected ? 2 : 1;
  ctx.strokeStyle = o.accent || "#36525a";
  ctx.stroke();
  if (o.hover && o.glow) _csGlow(ctx, o.accent || "#ffe45e");
}

// ── Ana menü (MODE_SELECT) görünüm yardımcıları ──────────────────────────
// Menü yenilemesinde (kullanıcı isteği, 2026-02) eklenen üç parça:
// _hexA saydamlık dönüşürü, _msBackdrop sahne arka planı, _msIcon kart ikonları.

// "#rrggbb" → "rgba(r,g,b,a)": kenarlık/parıltı/dolgu saydamlıkları için
function _hexA(hex, a) {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16) || 0;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Ana menü arka planı: koyu fabrika zemini, siber-ızgara, süzülen kıvılcımlar ve köşe HUD çerçeveleri.
function _msBackdrop(ctx, W, H, timeMs) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0b1a20");
  grad.addColorStop(0.58, "#09151a");
  grad.addColorStop(1, "#071116");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Siber-ızgara dokusu
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(113, 211, 189, 0.025)";
  const gridSize = 48;
  for (let gx = gridSize; gx < W; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, H);
    ctx.stroke();
  }
  for (let gy = gridSize; gy < H; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();
  }

  // Atmosferik radyal ışık aurası
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.22, 10, W * 0.5, H * 0.22, H * 0.85);
  glow.addColorStop(0, "rgba(113,211,189,0.12)");
  glow.addColorStop(0.48, "rgba(244,189,98,0.04)");
  glow.addColorStop(1, "rgba(113,211,189,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Canlı süzülen parçacıklar (yavaşça yükselen kıvılcım tozları)
  const t = (timeMs || 0) * 0.0008;
  for (let i = 0; i < 20; i++) {
    const seed = i + 1;
    const px = Math.floor((seed * 173.3 + Math.sin(t + seed * 2) * 26 + (t * 12 * (seed % 3 + 1))) % W);
    const py = Math.floor((H + 20) - ((seed * 89.7 + t * (22 + (seed % 4) * 8)) % (H + 40)));
    const pa = Math.max(0.12, Math.min(0.55, 0.28 + Math.sin(t * 3 + seed) * 0.18));
    ctx.fillStyle = seed % 3 === 0 ? `rgba(244,189,98,${pa})` : `rgba(113,211,189,${pa})`;
    ctx.fillRect(px, py, (seed % 2) + 1.5, (seed % 2) + 1.5);
  }

  // Köşe braketleri (Endüstriyel HUD çerçevesi)
  ctx.strokeStyle = "rgba(113, 211, 189, 0.22)";
  ctx.lineWidth = 1.5;
  const bSize = 14, bPad = 10;
  // Sol üst
  ctx.beginPath();
  ctx.moveTo(bPad, bPad + bSize); ctx.lineTo(bPad, bPad); ctx.lineTo(bPad + bSize, bPad);
  ctx.stroke();
  // Sağ üst
  ctx.beginPath();
  ctx.moveTo(W - bPad - bSize, bPad); ctx.lineTo(W - bPad, bPad); ctx.lineTo(W - bPad, bPad + bSize);
  ctx.stroke();
  // Sol alt
  ctx.beginPath();
  ctx.moveTo(bPad, H - bPad - bSize); ctx.lineTo(bPad, H - bPad); ctx.lineTo(bPad + bSize, H - bPad);
  ctx.stroke();
  // Sağ alt
  ctx.beginPath();
  ctx.moveTo(W - bPad - bSize, H - bPad); ctx.lineTo(W - bPad, H - bPad); ctx.lineTo(W - bPad, H - bPad - bSize);
  ctx.stroke();

  ctx.restore();
}

// Kart üstü ikon plakası: kesik köşeli mini bölme + vektör glif. Her mod kendi
// imza ikonunu taşır; lit=true (hover) plakayı ve glifi parıltıyla yakar.
// Glifler kartın kendi accent renginde çizilir — ikonsuz kart kalmaz.
function _msIcon(ctx, kind, cx, cy, accent, lit) {
  const col = lit ? accent : _hexA(accent, 0.88);
  ctx.save();
  // Hover'da plaka arkası renk aurası
  if (lit) {
    const aura = ctx.createRadialGradient(cx, cy, 2, cx, cy, 28);
    aura.addColorStop(0, _hexA(accent, 0.35));
    aura.addColorStop(1, _hexA(accent, 0));
    ctx.fillStyle = aura;
    ctx.fillRect(cx - 30, cy - 30, 60, 60);
  }
  // Plaka: kart gövdesinden hafif ayrılan kesik köşeli mini bölme
  _panelPath(ctx, cx - 20, cy - 20, 40, 40, 5);
  ctx.fillStyle = _hexA(accent, lit ? 0.24 : 0.10);
  ctx.fill();
  ctx.lineWidth = lit ? 1.5 : 1.2;
  ctx.strokeStyle = _hexA(accent, lit ? 0.95 : 0.45);
  ctx.stroke();
  const atlasCells = { robot: 9, "dişli": 8, mermi: 11, "ağ": 5, soru: 15 };
  const atlas = typeof assetImage === "function" ? assetImage("atlases/ui") : null;
  if (atlas && atlasCells[kind] != null) {
    const cellSize = atlas.naturalWidth / 4;
    const cell = atlasCells[kind];
    ctx.drawImage(atlas, (cell % 4) * cellSize, Math.floor(cell / 4) * cellSize, cellSize, cellSize, cx - 13, cy - 13, 26, 26);
    ctx.restore();
    return;
  }
  // Glif: hover'da yumuşak renk parıltısı eşlik eder
  if (lit) { ctx.shadowColor = accent; ctx.shadowBlur = 9; }
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (kind === "robot") {
    // Otomatik birimler: fabrika robotu kafası — kafa + anten + gözler + ağız
    _panelPath(ctx, cx - 10, cy - 7, 20, 16, 3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy - 11);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy - 12.5, 1.6, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - 4.2, cy - 1, 1.8, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 4.2, cy - 1, 1.8, 0, 6.28); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 4.5, cy + 4); ctx.lineTo(cx + 4.5, cy + 4);
    ctx.stroke();
  } else if (kind === "ikili") {
    // Yerel operatörler: iki person — baş + omuz yayı, sağdaki öne offsetli
    ctx.beginPath(); ctx.arc(cx - 5.5, cy - 5, 3.4, 0, 6.28); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - 5.5, cy + 7, 6.2, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 5.5, cy - 3.5, 3.4, 0, 6.28); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 5.5, cy + 8.5, 6.2, Math.PI, Math.PI * 2); ctx.stroke();
  } else if (kind === "dişli") {
    // Atölye: dişli çark — 8 diş + gövde + merkez delik (kalibrasyon imgesi)
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + Math.PI / 8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 7.2, cy + Math.sin(a) * 7.2);
      ctx.lineTo(cx + Math.cos(a) * 11.4, cy + Math.sin(a) * 11.4);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx, cy, 7.2, 0, 6.28); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, 6.28); ctx.stroke();
  } else if (kind === "mermi") {
    // Cephane pazarı: üç mermi fişeği — orta sıra daha uzun (depo imgesi)
    const shell = (sx, h) => {
      ctx.beginPath();
      ctx.moveTo(sx - 2.6, cy + 9);
      ctx.lineTo(sx - 2.6, cy + 9 - h);
      ctx.quadraticCurveTo(sx - 2.6, cy + 3.5 - h, sx, cy + 2.5 - h);
      ctx.quadraticCurveTo(sx + 2.6, cy + 3.5 - h, sx + 2.6, cy + 9 - h);
      ctx.lineTo(sx + 2.6, cy + 9);
      ctx.closePath();
      ctx.stroke();
    };
    shell(cx - 7.5, 11);
    shell(cx, 14);
    shell(cx + 7.5, 11);
  } else if (kind === "ağ") {
    // Çevrimiçi: iki düğüm arasında bağlantı hattı (P2P imzası) + sinyal yayı
    ctx.beginPath(); ctx.arc(cx - 8, cy + 5, 3.4, 0, 6.28); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 8, cy + 5, 3.4, 0, 6.28); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 5.2, cy + 3.4); ctx.lineTo(cx + 5.2, cy + 3.4);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy - 4, 5.2, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy - 4, 9.4, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
  } else {
    // Nasıl Oynanır: halka içinde soru işareti (bilgi bölmesi glifi)
    ctx.beginPath(); ctx.arc(cx, cy, 10.5, 0, 6.28); ctx.stroke();
    ctx.font = '700 14px "Chakra Petch", "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", cx, cy + 0.5);
  }
  ctx.restore();
}

function _drawStatBar(ctx, x, y, w, label, value, frac, color) {
  // Etiket solda, değer sağda — her ikisi de textBaseline:"top"
  // (Faz 5 cilası: 9px → 10px, bar y+11'de 1px boşluk kalır)
  ctx.fillStyle = "#7799aa";
  ctx.font = uiTextFont(10);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(label, x, y);
  ctx.textAlign = "right";
  ctx.fillStyle = "#aaccdd";
  ctx.fillText(value, x + w, y);

  // Bar: etiketin 11px altında
  const barY = y + 11;
  ctx.fillStyle = "#1e2a38";
  ctx.fillRect(x, barY, w, 5);
  ctx.fillStyle = color;
  ctx.fillRect(x, barY, Math.min(w, Math.max(0, w * frac)), 5);
  // Toplam yükseklik: 11 (etiket) + 5 (bar) = 16px; STAT_GAP=18 → 2px ara
}

// Takılı parçaları 4 nokta olarak çizer (yuva sırası: kask → gövde → aparat →
// ayak; sağX en sağdaki noktanın merkezidir). Dolu = o yuvada parça var; İÇİ
// koyu göbek = o yuvada İKİ parça var (v6 çift donanım işareti). Bilinmeyen
// parça id'si yok sayılır (sanitizeLoadoutShape).
function _drawPartDots(ctx, rightX, y, loadout) {
  const lo = sanitizeLoadoutShape(loadout);
  const gap = 8, r = 2.7;
  for (let i = 0; i < PART_SLOTS.length; i++) {
    const list = lo[PART_SLOTS[i]];
    const count = list.filter(Boolean).length;
    const x = rightX - (PART_SLOTS.length - 1 - i) * gap;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = count ? "#63e6be" : "#2b3844";
    ctx.fill();
    if (!count) { ctx.strokeStyle = "#4a5866"; ctx.lineWidth = 1; ctx.stroke(); }
    if (count > 1) {
      ctx.beginPath();
      ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = "#12181d";
      ctx.fill();
    }
  }
}

// Silah açıklama paneli için 5'lik puan satırı (0-5).
// Dolu ve boş noktalar aynı ● glifidir, yalnızca renk farkıyla ayrılır —
// böylece ●/○ glif boyutu farkından kaynaklanan bozulma olmaz.
function statRow(label, n) {
  const filled = Math.max(0, Math.min(5, n | 0));
  let dots = "";
  for (let i = 0; i < 5; i++) dots += `<i class="dot${i < filled ? " on" : ""}">●</i>`;
  return `<div class="wd-row"><span class="wd-label">${label}</span>` +
         `<span class="wd-dots">${dots}</span></div>`;
}

// Maç sonu ödül satırı. Reklamla 2× yapılınca yeniden çizilir (showOverlay ve
// doubleMatchScrap aynı yolu kullanır: metin tek yerde).
function renderOverlayReward(reward) {
  const detail = document.getElementById("overlay-reward");
  if (!detail) return;
  if (reward && reward.ok) {
    const lines = [t("overlay.reward", "+{scrap} Hurda  •  +{xp} Servis XP", { scrap: reward.scrap, xp: reward.xp })];
    if (reward.rewardDetails && reward.rewardDetails.combatScrap > 0) {
      lines.push(`Savaş Primleri: +${reward.rewardDetails.combatScrap} 🔩 Hurda`);
    }
    if (reward.doubled) lines.push(t("overlay.ad.doubled", "Reklam ödülü: Hurda 2× 🎬"));
    if (reward.levelAfter > reward.levelBefore) {
      lines.push(t("overlay.levelUp", "{robot}Servis Seviyesi {before} → {after}", {
        robot: reward.robotLabel ? reward.robotLabel + " " : "",
        before: reward.levelBefore, after: reward.levelAfter,
      }));
    }
    if (reward.accLevelAfter > reward.accLevelBefore) {
      lines.push(`🎉 HESAP SEVİYESİ ATLADIN! Sv. ${reward.accLevelBefore} → Sv. ${reward.accLevelAfter} (+${reward.levelUpBonus || 0} 🔩 İkramiye!)`);
    }
    if (reward.message) lines.push(reward.message);
    detail.textContent = lines.join("\n");
    detail.classList.remove("hidden");
    return;
  }
  detail.textContent = "";
  detail.classList.add("hidden");
}

// Maç sonu overlay'i: ödül hesaplamaz, yalnız hazır sonuç modelini gösterir.
// Her gösterimde düğmeler varsayılana döner.
function showOverlay(title, sub, reward) {
  const defWorkshop = document.getElementById("workshop-btn");
    if (defWorkshop) defWorkshop.textContent = t("hud.goWorkshop", "Atölyeye Git");
  const defRestart = document.getElementById("restart-btn");
    if (defRestart) defRestart.textContent = t("hud.playAgain", "Tekrar Oyna");
  const defMenu = document.getElementById("menu-btn");
    if (defMenu) defMenu.textContent = t("hud.mainMenu", "Ana Menü");
  document.getElementById("overlay-title").textContent = title;
  document.getElementById("overlay-sub").textContent = sub || "";
  renderOverlayReward(reward);
  /* Ödüllü reklam düğmesi YALNIZ ödül varsa ve portal reklamı kullanılabiliyorsa
   * görünür; `file://`/SDK'sız açılışta hiç çizilmez (oyun aynı kalır). */
  const adBtn = document.getElementById("reward-ad-btn");
  if (adBtn) {
    const can = !!(reward && reward.ok && !reward.doubled) &&
      typeof PORTAL !== "undefined" && PORTAL.canReward();
    adBtn.textContent = t("overlay.ad.double", "Reklam izle · Hurdayı 2× yap");
    adBtn.disabled = false;
    adBtn.classList.toggle("hidden", !can);
  }
  document.getElementById("overlay").classList.remove("hidden");
}
function hideOverlay() {
  document.getElementById("overlay").classList.add("hidden");
}

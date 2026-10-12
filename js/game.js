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
const MS_COLS = 5;
const MS_ROWS = 2;

// Atölye grid düzeni: 4 sütun × 3 satır = sayfa başına 12 robot.
// WS_PANEL_H, sağdaki detay panelinin sabit yüksekliğidir; üç dal paneli ve
// eylem düğmesi bu kutunun içinde kalır.
const WS_COLS = 4;
const WS_ROWS = 3;
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
    // Açılır silah listesinin mantıksal sınırları; syncBottomHud liste açıkken
    // doldurur (yerleşim/telemetri), kapalıyken null olur.
    this.hudPanelRect = null;
    // Alt paneldeki silah listesi açılır panel mi açık? (SİLAH DEĞİŞTİR)
    this.weaponMenuOpen = false;

    this.input = { left: false, right: false, mouseX: 0, mouseY: 0, charging: false, power: 0 };

    this.lastTime = 0;
    this.playerCount = 2;   // seçilen oyuncu sayısı (2–6); COUNT_SELECT'te belirlenir
    this.matchId = 0;
    this.turnId = 0;
    this.bot = new BotController();
    this.bots = [];              // birden fazla bot kontrolcüsü
    this.difficulty = "normal";  // bilgisayar modu zorluk seviyesi
    // Profil sayfa açılışında bir kez yüklenir; kayıt yoksa varsayılan gelir.
    // storageOk false ise ekonomi çalışır ama kalıcı olmaz (tek seferlik uyarı).
    const loaded = loadProfile();
    this.profile = loaded.profile;
    this.storageOk = loaded.storageOk;
    this.sessionId = createSessionId(); // matchKey'i oturumlar arası ayırır
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

    updatePowerBar(0, false);
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
    // Bulutlar arka planda kalır, üstüne çelik gradyan + parıltı + vinyet
    // biner (_msBackdrop): düz siyah perde yerine dökümhane salonu derinliği.
    drawClouds(ctx, W, "rgba(190,215,240,0.14)");
    _msBackdrop(ctx, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    // Başlık: koyu gölge kopyası + sarı üst kopya — hafif derinlik
    ctx.fillStyle = "#000000aa"; ctx.font = uiTitleFont(34);
    ctx.fillText(t("brand.title", GAME_TITLE), W / 2 + 2, H / 2 - 164);
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(34);
    ctx.fillText(t("brand.title", GAME_TITLE), W / 2, H / 2 - 166);
    ctx.fillStyle = "#cfe0ee"; ctx.font = uiTextFont(15);
    ctx.fillText(
      t("menu.tagline", "Arena tahsis protokolünü başlat"),
      W / 2, H / 2 - 112
    );
    // Başlık altı tehlike şeridi: endüstriyel imza detayı (Faz 2 pilot)
    _csHazardStrip(ctx, W / 2 - 130, H / 2 - 86, 260, 5);
    const scrap = this.profile ? this.profile.scrap : START_SCRAP;
    // Ortak depo: robot başına ayrı depo yok; pazar kartının alt yazısı için
    // tek depo sayacı yeterlidir.
    const depotTotal = ammoDepotTotal(getAmmoDepot(this.profile));
    // Her kart kendi imza rengini ve vektör ikonunu taşır: kenarlık, ikon
    // plakası ve hover parıltısı aynı accent'ten türetilir — menü tek bakışta
    // bölme bölme okunur (robot/ikili/dişli/mermi/soru glifleri).
    const items = [
      { action: "computer", icon: "robot", accent: "#ff7b7b", title: t("menu.mode.computer.title", "Otomatik Birimlere Karşı"), sub: t("menu.mode.computer.sub", "1 operatör ve 1–3 fabrika robotu") },
      { action: "local", icon: "ikili", accent: "#7baeff", title: t("menu.mode.local.title", "Yerel Operatörler"), sub: t("menu.mode.local.sub", "Aynı cihazda 2–6 oyuncu") },
      { action: "workshop", icon: "dişli", accent: "#d8a72f", title: t("menu.mode.workshop.title", "ATÖLYE"), sub: t("menu.mode.workshop.sub", "Robotlarını kalibre et • {scrap} Hurda", { scrap }) },
      { action: "market", icon: "mermi", accent: "#3fae8c", title: t("menu.mode.market.title", "CEPHANE PAZARI"), sub: depotTotal > 0 ? t("menu.mode.market.sub", "Depoda {n} mermi • {scrap} Hurda", { n: depotTotal, scrap }) : t("menu.mode.market.subEmpty", "Ortak mühimmat deposu • {scrap} Hurda", { scrap }) },
      { action: "tutorial", icon: "soru", accent: "#4fc3f7", title: t("menu.mode.tutorial.title", "NASIL OYNANIR"), sub: t("menu.mode.tutorial.sub", "Kontroller ve tur kuralları") },
    ];
    // Kart sayısı ve pencere genişliği ne olursa olsun taşmasın diye genişlik
    // kart sayısına göre uyarlanır (kilit belgesi D-08); sığmayan pencerede
    // kartlar birlikte daralır.
    const gap = 14, bh = 132;
    const bw = Math.min(200, Math.floor((W - (items.length + 1) * gap) / items.length));
    const totalW = items.length * bw + (items.length - 1) * gap;
    const startX = (W - totalW) / 2, y = H / 2 - 38;
    this._modeRects = [];
    for (let i = 0; i < items.length; i++) {
      const x = startX + i * (bw + gap), it = items[i];
      const hovered = this.input.mouseX >= x && this.input.mouseX <= x + bw && this.input.mouseY >= y && this.input.mouseY <= y + bh;
      this._modeRects.push({ x, y, w: bw, h: bh, action: it.action });
      // Hover'da kart 3px yukarı kayar (dokunma alanı _modeRects'te değişmez)
      const hy = y + (hovered ? -3 : 0);
      // Tehdit şeridi (eski "servis bölmesi" imzası) kaldırıldı: kartlar
      // yalnız kendi iz rengi ve ikon plakasıyla ayrışır — başlık tipografisi
      // ve dikey ritim tüm bölmelerde aynı olsun diye tek punto kullanılır.
      _csPanel(ctx, x, hy, bw, bh, {
        // Kenarlık kartın kendi renginde: boşta soluk, hover'da tam doygun
        accent: hovered ? it.accent : _hexA(it.accent, 0.5),
        hover: hovered, glow: true,
        // Kart gövdesine iz renginin çok soluk tonu: kartlar birbirinden ayrılır
        fillTop: hovered ? _hexA(it.accent, 0.17) : _hexA(it.accent, 0.055),
      });
      // İkon plakası: kartın üstünde kesik köşeli mini bölme + vektör glif
      _msIcon(ctx, it.icon, x + bw / 2, hy + 31, it.accent, hovered);
      // Başlık/alt yazı kart genişliğine sığdırılır (satır bölme + punto küçültme);
      // 2 satırlık başlıkta alt yazı birkaç piksel aşağı kayar.
      ctx.textBaseline = "middle";
      const titleFit = _fitTextLines(ctx, it.title, bw - 14, 17, uiTitleFont, 2, 11);
      const subFit = _fitTextLines(ctx, it.sub, bw - 12, 11, (p) => uiTextFont(p), 2, 9);
      ctx.fillStyle = "#eef5ff";
      const tGap = titleFit.px + 1;
      const titleY = titleFit.lines.length === 1 ? hy + 72 : hy + 65;
      for (let j = 0; j < titleFit.lines.length; j++) ctx.fillText(titleFit.lines[j], x + bw / 2, titleY + j * tGap);
      ctx.fillStyle = "#9fb6c9";
      const subY = titleFit.lines.length === 1 ? hy + 104 : hy + 108;
      for (let j = 0; j < subFit.lines.length; j++) ctx.fillText(subFit.lines[j], x + bw / 2, subY + j * 12);
    }
    // Alt bilgi: sessiz yardımcı ipucu — sayfanın altını boş bırakmamak için
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#5e7488"; ctx.font = uiTextFont(11);
    ctx.fillText(t("menu.hint", "Fare ile bir bölme seç"), W / 2, H - 26);
  }

  // ── Zorluk seçimi (DIFFICULTY_SELECT) ────────────────────────────────────
  // Bilgisayara karşı modunda zorluk seviyesi seçilir.
  renderDifficultySelect(ctx) {
    const W = this.W, H = this.H;
    drawClouds(ctx, W);
    ctx.fillStyle = "#000000bb"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(28);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("Zorluk seç", W / 2, H / 2 - 100);
    // Başlık altı tehlike şeridi (pilot aile dili)
    _csHazardStrip(ctx, W / 2 - 100, H / 2 - 64, 200, 5);
    const levels = ["easy", "normal", "hard", "expert"];
    const labels = ["Kolay", "Orta", "Zor", "Ustalık"];
    const bw = 130, bh = 60, gap = 16;
    const totalW = levels.length * bw + (levels.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const y = H / 2 - 30;
    this._diffRects = [];
    for (let i = 0; i < levels.length; i++) {
      const x = startX + i * (bw + gap);
      const sel = this.difficulty === levels[i];
      const hovered = this.input.mouseX >= x && this.input.mouseX <= x + bw && this.input.mouseY >= y && this.input.mouseY <= y + bh;
      this._diffRects.push({ x, y, w: bw, h: bh, diff: levels[i] });
      // Seçili zorluk yeşil tint + yeşil kenarla kalıcı vurgulanır
      _csPanel(ctx, x, y, bw, bh, {
        accent: sel ? "#4aff4a" : hovered ? "#ffe45e" : "#3b526b",
        hover: hovered, glow: hovered,
        selected: sel,
        fillTop: sel ? "#1e3a26" : null, fillBottom: sel ? "#12251a" : null,
      });
      ctx.fillStyle = sel ? "#8aff8a" : "#eef5ff"; ctx.font = uiTitleFont(16);
      ctx.textBaseline = "middle";
      ctx.fillText(labels[i], x + bw / 2, y + bh / 2);
    }
    // Geri butonu
    this._backRect = { x: 20, y: H - 50, w: 80, h: 36 };
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
    drawClouds(ctx, W);
    ctx.fillStyle = "#000000bb"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(28);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("Rakip sayısı seç", W / 2, H / 2 - 100);
    // Başlık altı tehlike şeridi (pilot aile dili)
    _csHazardStrip(ctx, W / 2 - 100, H / 2 - 64, 200, 5);
    const counts = [1, 2, 3];
    const labels = ["1 Rakip", "2 Rakip", "3 Rakip"];
    const bw = 130, bh = 60, gap = 16;
    const totalW = counts.length * bw + (counts.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const y = H / 2 - 30;
    this._botCountRects = [];
    for (let i = 0; i < counts.length; i++) {
      const x = startX + i * (bw + gap);
      const hovered = this.input.mouseX >= x && this.input.mouseX <= x + bw && this.input.mouseY >= y && this.input.mouseY <= y + bh;
      this._botCountRects.push({ x, y, w: bw, h: bh, count: counts[i] });
      _csPanel(ctx, x, y, bw, bh, { accent: hovered ? "#ffe45e" : "#3b526b", hover: hovered, glow: hovered });
      ctx.fillStyle = "#eef5ff"; ctx.font = uiTitleFont(16);
      ctx.textBaseline = "middle";
      ctx.fillText(labels[i], x + bw / 2, y + bh / 2);
    }
    // Geri butonu
    this._backRect = { x: 20, y: H - 50, w: 80, h: 36 };
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

  // ── Atölye (WORKSHOP) ────────────────────────────────────────────────
  // Kalıcı profil üzerinde geliştirme satın alınan ayrı durum. Ana menüden
  // açılır; maç sonu overlay'inden de buraya geçilebilir.
  openWorkshop() {
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

  _workshopPageOf(id) {
    const idx = CHARACTERS.findIndex((c) => c.id === id);
    return idx >= 0 ? Math.floor(idx / (WS_COLS * WS_ROWS)) : 0;
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
      let msg = "Takma başarısız";
      if (res.reason === "NOT_OWNED") msg = "Bu parça envanterde yok";
      else if (res.reason === "SLOT_MISMATCH") msg = "Parça bu yuvaya uymuyor";
      else if (res.reason === "INVALID_INDEX") msg = "Geçersiz alt yuva";
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
      const where = `${SLOT_LABELS[slot]} ${slotIndex + 1}`;
      const msg = partId ? `${partById(partId).label} takıldı (${where})` : `${where} yuvası boşaltıldı`;
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
    const totalPages = Math.max(1, Math.ceil(CHARACTERS.length / (WS_COLS * WS_ROWS)));
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
    drawClouds(ctx, W);
    ctx.fillStyle = "#000000cc";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#ffe45e";
    ctx.font = uiTitleFont(26);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(t("workshop.title", "ATÖLYE"), W / 2, 20);
    ctx.fillStyle = "#9fb6c9";
    ctx.font = uiTextFont(12);
    ctx.fillText(this.workshopMode === "parts"
      ? t("workshop.subtitleParts", "Parça tak — parçalar geliştirmelerle aynı maç kapsamında etkindir")
      : t("workshop.subtitleUpgrades", "Robotlarını kalibre et — geliştirmeler yalnız bilgisayara karşı maçta etkindir"), W / 2, 48);

    const scrap = this.profile ? this.profile.scrap : START_SCRAP;
    const perPage = WS_COLS * WS_ROWS;
    const totalPages = Math.max(1, Math.ceil(CHARACTERS.length / perPage));
    this.workshopPage = Math.max(0, Math.min(this.workshopPage, totalPages - 1));
    const pageStart = this.workshopPage * perPage;
    const pageChars = CHARACTERS.slice(pageStart, pageStart + perPage);

    // ── Sol: sayfalı robot grid'i ──────────────────────────────────────
    const gx = 24, gy = 66, gridW = 452, gap = 8;
    const cardW = Math.floor((gridW - (WS_COLS - 1) * gap) / WS_COLS);
    const cardH = 88;
    const mx = this.input.mouseX, my = this.input.mouseY;
    this._workshopCardRects = [];

    for (let i = 0; i < pageChars.length; i++) {
      const ch = pageChars[i];
      const col = i % WS_COLS, row = (i / WS_COLS) | 0;
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

      drawRobot(ctx, {
        cx: cx + cardW / 2, cy: cyv + 30, r: 15, facing: 1, charDef: ch,
        timeMs: this.renderTimeMs || 0, motion: { vx: 0, vy: 0, onGround: true },
        upgradeVisuals: { attachmentGlow: sanitizeUpgrades(up).module >= 3 },
        parts: up.loadout,
      });

      ctx.fillStyle = ch.color;
      ctx.font = uiTextFont(12, 700);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(ch.label, cx + cardW / 2, cyv + 58, cardW - 10);
      ctx.fillStyle = "#9fb6c9";
      ctx.font = uiTextFont(9);
      ctx.fillText(t("workshop.robotCardMeta", "Sv. {level} • {tiers}/9", { level: levelForXp(up.xp), tiers: totalTiers(up) }), cx + cardW / 2, cyv + 72);
    }

    // Sayfa gezinme (klavye ve fare ile aynı işlevi görür)
    this._workshopPageRects = [];
    const navY = gy + WS_ROWS * cardH + (WS_ROWS - 1) * gap + 16, navW = 96, navH = 30;
    const prev = { x: gx, y: navY, w: navW, h: navH, dir: -1 };
    const next = { x: gx + gridW - navW, y: navY, w: navW, h: navH, dir: 1 };
    this._workshopPageRects = [prev, next];
    for (const b of this._workshopPageRects) {
      const canUse = (b.dir < 0 && this.workshopPage > 0) || (b.dir > 0 && this.workshopPage < totalPages - 1);
      const hov = canUse && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
      ctx.globalAlpha = canUse ? 1 : 0.35;
      _csPanel(ctx, b.x, b.y, b.w, b.h, { accent: hov ? "#ffe45e" : "#2a3848", hover: hov, glow: hov, rivets: false });
      ctx.fillStyle = "#cfe0ee";
      ctx.font = uiTextFont(13, 700);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.dir < 0 ? t("common.back", "‹ Geri") : t("common.forward", "İleri ›"), b.x + b.w / 2, b.y + b.h / 2);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#9fb6c9";
    ctx.font = uiTextFont(13, 700);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(t("common.page", "Sayfa {n} / {total}", { n: this.workshopPage + 1, total: totalPages }), gx + gridW / 2, navY + navH / 2);

    // ── Sağ: seçili robot detayı + üç dal paneli ──────────────────────
    const rx = 496, rw = W - rx - 24;
    const def = CHARACTERS.find((c) => c.id === this.workshopSelectedId) || CHARACTERS[0];
    const up = getRobotProgress(this.profile, def.id);
    const level = levelForXp(up.xp);
    const nextXp = nextLevelXp(level);
    const curXp = up.xp - xpForLevel(level);
    const spanXp = nextXp != null ? nextXp - xpForLevel(level) : 1;
    const xpFrac = nextXp != null ? clampNumber(curXp / spanXp, 0, 1) : 1;

    // Sağ büyük panel: servis bölmesi — üst kenarında tehlike şeridi.
    // (Bu ekran başlık altına şerit sığmaz; imza detayı buraya taşındı.)
    _csPanel(ctx, rx, gy, rw, WS_PANEL_H, { accent: "#2a3848", hazardTop: true });

    drawRobot(ctx, {
      cx: rx + rw / 2, cy: gy + 62, r: def.r * 1.5, facing: 1, charDef: def,
      timeMs: this.renderTimeMs || 0, motion: { vx: 0, vy: 0, onGround: true },
      upgradeVisuals: { attachmentGlow: sanitizeUpgrades(up).module >= 3 },
      parts: up.loadout,
    });
    ctx.fillStyle = "#eef5ff";
    ctx.font = uiTitleFont(18);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(t("workshop.robotMeta", "{label} · {role}", { label: def.label, role: def.role }), rx + rw / 2, gy + 100);

    ctx.fillStyle = "#ffd166";
    ctx.font = uiTextFont(13, 700);
    ctx.fillText(t("workshop.serviceLevel", "Servis Seviyesi {level}{suffix}", {
      level,
      suffix: nextXp != null ? ` — ${up.xp} / ${nextXp} XP` : t("workshop.masterService", " — Usta Servis"),
    }), rx + rw / 2, gy + 124);

    const barX = rx + 20, barW = rw - 40, barY = gy + 144;
    ctx.fillStyle = "#1e2a38";
    ctx.fillRect(barX, barY, barW, 7);
    ctx.fillStyle = "#63e6be";
    ctx.fillRect(barX, barY, barW * xpFrac, 7);

    // Hurda bakiyesi: satın alma sonrası kısa süre vurgulanır.
    const fxT = this.workshopFx ? this.workshopFx.t : WS_FX_DURATION;
    const pulse = Math.max(0, 1 - fxT / WS_FX_DURATION);
    ctx.fillStyle = `rgba(255,228,94,${0.75 + 0.25 * pulse})`;
    ctx.font = uiTitleFont(Math.round(14 + 3 * pulse));
    ctx.fillText(t("common.scrap", "Hurda: {scrap}", { scrap }), rx + rw / 2, barY + 14);
    if (level >= 4) {
      ctx.fillStyle = "#8fa8ba";
      ctx.font = uiTextFont(10);
      ctx.fillText(t("workshop.stats", "Maç {matches} • Galibiyet {wins}", { matches: up.stats.matches, wins: up.stats.wins }), rx + rw / 2, barY + 36);
    }

    // Mod sekmeleri (sağ panelin tepesi): GELİŞTİRME ↔ PARÇALAR. İki modda da
    // görünür; pazar sekmeleriyle aynı dil (1/2 ve Tab tuşları da çalışır).
    this._renderWorkshopModeTabs(ctx, rx, gy, rw, mx, my);

    if (this.workshopMode === "parts") {
      this._renderWorkshopParts(ctx, rx, rw, gy, barY, level, def, up, mx, my);
    } else {
      this._workshopBranchRects = [];
      const panelH = 58, panelGap = 6;
      let py = barY + (level >= 4 ? 54 : 36);
      for (const branch of BRANCHES) {
        const rect = { x: rx, y: py, w: rw, h: panelH, branch };
        this._workshopBranchRects.push(rect);
        this._drawWorkshopBranch(ctx, rect, def, up, level, branch, mx, my);
        py += panelH + panelGap;
      }

      // ── Eylem düğmesi: seçili dalın sonraki kademesini satın alır ─────
      const step = nextUpgradeStep(up, this.workshopBranch);
      // Plaka panelin alt boşluğunu doldurur ve panel dibine yapışır (alt
      // boşluk yok): sabit 42px'te plakanın altında boş bir "yuva" kalıyordu,
      // panel dibine 10px boşluk bırakınca da arada ince bir çizgi görünüyordu
      // (kullanıcı görsel kabulü). Alt kenar ve köşe perçinleri panelin alt
      // kenarıyla aynı yere gelir — çift çizgi oluşmaz.
      const btn = { x: rx, y: py + 4, w: rw, h: Math.max(42, gy + WS_PANEL_H - (py + 4)) };
      this._workshopActionRect = btn;
      // Dört durum, dört ayrı okunuş — hepsi metinle de anlatılır:
      //   ready  yeşil çelik + hover parıltısı (satın alınabilir)
      //   locked gri plaka + asma kilit glifi (Servis Seviyesi kapısı kapalı)
      //   short  gri plaka, glif yok (Hurda yetmiyor; geçici engel)
      //   done   sakin yeşil, sebep "Bu dal tamamlandı" (engel değil, iş yok)
      // Kilitli durumda ÜST TEHLİKE ŞERİDİ KULLANILMAZ: şerit bu ekranın aile
      // imzasıdır (sağ panelin üst kenarı). Devre dışı bir düğmede tekrar
      // edilince hem imza seyrelir hem de pasif kontrol ekranın en gürültülü
      // öğesi olur (kullanıcı görsel kabulü: "gövde kilidi" tasarım hatası).
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
      // İçerik bloğu (etiket + sebep satırı) plakanın ortasına hizalanır;
      // sebep satırı etiketin 15px altındadır (Math.round: tek satırlı
      // "hazır" durumunda etiket tam ortada kalır).
      const labelY = btn.y + Math.round(reason ? btn.h / 2 - 6.5 : btn.h / 2);
      ctx.font = uiTitleFont(14);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      // Kilitliyse etiket asma kilit glifiyle birlikte ortalanır (glif solunda).
      const lockW = WS_LOCK_GLYPH_W + 7;
      const lw = ctx.measureText(label).width;
      const groupX = btn.x + (btn.w - (lw + (state === "locked" ? lockW : 0))) / 2;
      if (state === "locked") _csLockGlyph(ctx, groupX + WS_LOCK_GLYPH_W / 2, labelY, WS_LOCK_GLYPH_W, "#a9b8c3");
      ctx.fillStyle = ready ? "#d8fff1" : state === "done" ? "#a9d8c8" : "#8b9aa5";
      ctx.textAlign = "left";
      ctx.fillText(label, groupX + (state === "locked" ? lockW : 0), labelY);
      ctx.textAlign = "center";
      if (reason) {
        ctx.fillStyle = state === "done" ? "#7f9c92" : "#8fa8ba";
        ctx.font = uiTextFont(10);
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
      ctx.fillText(n.text, rx + rw / 2, gy + WS_PANEL_H - 8);
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
    ctx.font = uiTextFont(12, 700);
    const tierText = step.ok ? t("workshop.tier", "Kademe {tier}", { tier: romanTier(step.nextTier) }) : t("workshop.maxCalibration", "Tam Kalibrasyon");
    ctx.fillText(t("workshop.branchPanel", "{branch} — {tier}", { branch: branchLabel(branch), tier: tierText }), rect.x + 10, rect.y + 7);

    ctx.fillStyle = "#8fd9c4";
    ctx.font = uiTextFont(10);
    const effect = upgradeEffectText(def, up, branch);
    ctx.fillText(effect, rect.x + 10, rect.y + 23, rect.w - 20);

    ctx.fillStyle = "#8fa8ba";
    ctx.font = uiTextFont(9);
    let status;
    // Üç durum aynı bilgiyi taşır (kademe • servis seviyesi • maliyet): tek anahtar.
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
    const w = 118, h = 22, gap = 8, y = gy + 7;
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
      ctx.font = uiTextFont(11, 700);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(t.label, x + w / 2, y + h / 2);
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
      const backW = 74, backH = 26;
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
      ctx.fillStyle = "#cfe0ee"; ctx.font = uiTextFont(12, 700);
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
        ctx.fillText(row.part ? row.part.label : t("workshop.clearSlot", "Boş bırak"), rx + 52, py + 6);
        ctx.fillStyle = "#8fd9c4"; ctx.font = uiTextFont(10);
        // Zaten bu alt yuvada takılı parçada fark "X → X" olurdu; onun yerine
        // açıklamayı göster (etiketler durumu zaten söylüyor).
        const detail = row.part
          ? (isEquippedHere ? row.part.desc : (partEffectText(def, up, row.partId, slotIndex) || row.part.desc))
          : t("workshop.clearSubSlot", "Bu alt yuvayı boşalt");
        ctx.fillText(detail, rx + 52, py + 23, rw - 150);

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
    const labelW = 74;
    const cellGap = 6;
    const cellW = Math.floor((rw - labelW - cellGap * (PARTS_PER_SLOT - 1)) / PARTS_PER_SLOT);
    const cursorIndex = this.workshopSlotIndex || 0;
    for (const slot of PART_SLOTS) {
      const rowY = py;
      _csPanel(ctx, rx, rowY, rw, panelH, { accent: "#242f3b", rivets: false });
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(10, 700);
      ctx.fillText(slotLabel(slot).toUpperCase(), rx + 10, rowY + panelH / 2);

      for (let i = 0; i < PARTS_PER_SLOT; i++) {
        const cx = rx + labelW + i * (cellW + cellGap);
        const rect = { x: cx, y: rowY + 5, w: cellW, h: panelH - 10, slot, index: i };
        this._workshopSlotRects.push(rect);
        const part = partById(loadout[slot][i]);
        const isCursor = slot === this.workshopSlot && i === cursorIndex;
        const hov = inside(rect);
        _csPanel(ctx, rect.x, rect.y, rect.w, rect.h, {
          accent: part ? "#63e6be" : isCursor ? "#ffe45e" : hov ? "#ffe45e" : "#1c2530",
          hover: hov, glow: hov, rivets: false,
        });
        if (part) {
          ctx.save();
          ctx.translate(rect.x + 5, rect.y + (rect.h - 26) / 2);
          drawPartIcon(ctx, part, 26);
          ctx.restore();
        }
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillStyle = part ? "#eef5ff" : "#5f6d78"; ctx.font = uiTextFont(11, 700);
        ctx.fillText(part ? part.label : t("workshop.empty", "Boş"), rect.x + (part ? 35 : 10), rect.y + rect.h / 2, rect.w - 42);
      }
      py += panelH + panelGap;
    }

    // İpucu satırı: ne yapılacağını yazıyla söyler.
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#6d7f8d"; ctx.font = uiTextFont(10);
    ctx.fillText(t("workshop.partsHint", "Hücreye tıkla → parça seç • yuva başına {perSlot} parça • sökme ücretsiz", { perSlot: PARTS_PER_SLOT }), rx + rw / 2, py + 6);
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
    for (const r of this._modeRects || []) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        SFX.uiClick();
        if (r.action === "workshop") this.openWorkshop();
        else if (r.action === "market") this.openMarket();
        else if (r.action === "tutorial") this.openTutorial();
        else this.beginMode(r.action);
        return;
      }
    }
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
    drawClouds(ctx, W);
    ctx.fillStyle = "#000000bb"; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(26);
    ctx.textAlign = "center";
    ctx.fillText(t("tutorial.title", "NASIL OYNANIR"), W / 2, 12);
    _csHazardStrip(ctx, W / 2 - 100, 48, 200, 4);

    const KEY_COL = 116;          // tuş sütunu genişliği
    const ROW_FONT = 12, ROW_GAP = 14;
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
    // Panel yüksekliği: başlık bölgesi + en uzun satır kümesine göre hesaplanır.
    const ph = 118;
    const startX = Math.max(8, (W - (2 * pw + gap)) / 2);
    const startY = 64;

    for (let i = 0; i < panels.length; i++) {
      const col = i % 2, row = (i / 2) | 0;
      const x = startX + col * (pw + gap);
      const y = startY + row * (118 + gap);
      _csPanel(ctx, x, y, pw, ph, { accent: panels[i].accent });
      // Panel başlığı: aksan rengiyle, ince tehlike şeridi solda
      _csHazardStrip(ctx, x + 10, y + 9, 14, 3);
      ctx.fillStyle = panels[i].accent;
      ctx.font = uiTitleFont(12);
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(panels[i].title, x + 30, y + 11);

      let ry = y + 28;
      for (const [key, desc] of panels[i].rows) {
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillStyle = panels[i].keyColor;
        ctx.font = uiTextFont(12, 700);
        ctx.fillText(key, x + 10, ry + 1);
        ctx.fillStyle = "#cfe0ee";
        ctx.font = uiTextFont(12);
        const lines = _wrapCanvasText(ctx, desc, pw - 24 - KEY_COL);
        for (let j = 0; j < lines.length; j++) ctx.fillText(lines[j], x + 14 + KEY_COL, ry + j * ROW_GAP);
        ry += Math.max(18, lines.length * ROW_GAP + 5);
      }
    }

    // Tur akışı şeridi: iki panel sütunu kadar geniş, altta özet
    const stripW = 2 * pw + gap, stripX = startX, stripY = startY + 2 * 118 + gap + 6;
    _csPanel(ctx, stripX, stripY, stripW, 44, { accent: "#3b526b" });
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#eef5ff"; ctx.font = uiTextFont(13, 700);
    ctx.fillText(t("tutorial.strip.flow", "Bir tur: hareket et → nişan al → gücü doldur → ateş et"), stripX + stripW / 2, stripY + 15);
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(12);
    ctx.fillText(t("tutorial.strip.turn", "Atış çözümlenince veya süre dolunca sıra sıradaki robota geçer — son ayakta kalan kazanır"), stripX + stripW / 2, stripY + 32);

    // Öğreticiyi oyna butonu: basit rehberli bölümü başlatır (yeşil = başlat)
    const bw = Math.min(320, stripW), bx = stripX + (stripW - bw) / 2, by = stripY + 58, bh = 42;
    const playHover = this.hitRect({ x: bx, y: by, w: bw, h: bh }, this.input.mouseX, this.input.mouseY);
    this._tutPlayRect = { x: bx, y: by, w: bw, h: bh };
    _csPanel(ctx, bx, by, bw, bh, {
      accent: playHover ? "#ffe45e" : "#4aff4a",
      hover: playHover, glow: playHover,
      fillTop: "#1e3a26", fillBottom: "#12251a",
    });
    ctx.fillStyle = playHover ? "#ffe45e" : "#8aff8a";
    ctx.font = uiTitleFont(15);
    ctx.fillText(t("tutorial.play", "▶ ÖĞRETİCİYİ OYNA"), bx + bw / 2, by + bh / 2);
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(11);
    ctx.fillText(t("tutorial.play.desc", "Basit bölüm: 1v1, rüzgârsız, adım adım rehberli"), bx + bw / 2, by + bh + 12);

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
    const label = spec ? spec.name : "Cephane";
    const res = buyAmmo(this.profile, weaponId, qty || 1);
    if (!res.ok) {
      let msg = "Satın alma başarısız";
      if (res.reason === "DEPOT_FULL") msg = `${label} deposu dolu (üst sınır ${AMMO_DEPOT_CAP})`;
      else if (res.reason === "SCRAP_REQUIRED") msg = `${label} için ${res.cost} Hurda gerekli`;
      else if (res.reason === "NOT_SELLABLE") msg = `${label} satılmıyor`;
      this._marketNotice(msg, "#ff9b9b");
      SFX.uiClick();
      return;
    }
    this.profile = res.profile;
    this.marketFx = { weaponId, t: 0 };
    this._marketNotice(`${res.bought}× ${label} alındı  (−${res.cost} Hurda)`, "#8affc0");
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
    drawClouds(ctx, W);
    ctx.fillStyle = "#000000cc";
    ctx.fillRect(0, 0, W, H);

    const scrap = this.profile ? this.profile.scrap : START_SCRAP;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffe45e";
    ctx.font = uiTitleFont(22);
    ctx.fillText("PAZAR", W / 2, 14);
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
      ctx.fillText(t.label, x + MK_TAB_W / 2, MK_TAB_Y + MK_TAB_H / 2);
    });

    // Bilgi satırı: soldan başlar — Hurda (sarı) + sekme özeti (gri). Sağ uç
    // bilinçli olarak BOŞtur: üst-sağ köşe DOM ses denetimine ayrılmıştır
    // (AUDIO_SAFE) — eskiden Hurda (W-24, 18)'e çiziliyordu (kullanıcı bildirimi).
    const pulse = this.marketFx ? Math.max(0, 1 - this.marketFx.t / MK_FX_DURATION) : 0;
    let summary;
    if (activeTab === "ammo") {
      const depot = getAmmoDepot(this.profile);
      summary = `Ortak depo: ${ammoDepotTotal(depot)} mermi • ${Object.keys(depot).length} silah`;
    } else {
      const slotParts = PARTS.filter((p) => p.slot === activeTab);
      const owned = this.profile ? getOwnedParts(this.profile) : [];
      const have = slotParts.filter((p) => owned.includes(p.id)).length;
      summary = `${SLOT_LABELS[activeTab]} yuvası: ${have}/${slotParts.length} parça • takma Atölye'de`;
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(255,228,94,${0.8 + 0.2 * pulse})`;
    ctx.font = uiTitleFont(Math.round(13 + 3 * pulse));
    const scrapText = `Hurda: ${scrap}`;
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
      ctx.fillText(full ? "Dolu" : `${price} Hurda`, cx + cardW - 10, cyv + 8);

      ctx.textAlign = "left";
      ctx.fillStyle = "#8fd9c4";
      ctx.font = uiTextFont(10);
      ctx.fillText(spec.special, tx, cyv + 26, cardW - 70);

      ctx.fillStyle = full ? "#ffb347" : "#8fa8ba";
      ctx.fillText(`Taban ${spec.ammo} • Savaş ≤${battleMax} • Depo ${have}/${AMMO_DEPOT_CAP}`, tx, cyv + 43, cardW - 112);
      if (!full) {
        ctx.textAlign = "right";
        ctx.fillStyle = "#6d7f8d";
        ctx.font = uiTextFont(9);
        ctx.fillText(`Shift ×${AMMO_BULK_QTY}`, cx + cardW - 10, cyv + 45);
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
    ctx.fillText(`Depo ${AMMO_DEPOT_CAP}'a kadar birikir; maça yalnız savaş tavanı kadar yüklenir, artanı maç sonunda geri döner • Shift ×${AMMO_BULK_QTY} / Ctrl ×${AMMO_BULK_QTY_BIG}`, this.W / 2, navY + MK_FOOT_NOTE_DY);
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
      ctx.fillText(isOwned ? "Alındı" : `${part.price} Hurda`, cx + cardW - 10, cyv + 8);

      // Sağ alt: yuva rozeti — parçanın nereye takıldığını söyler.
      ctx.fillStyle = isOwned ? "#5f6d78" : "#8fa8ba";
      ctx.font = uiTextFont(9, 700);
      ctx.fillText(SLOT_LABELS[part.slot].toUpperCase(), cx + cardW - 10, cyv + 45);

      // Etki satırı (ad + kısa açıklama + durum).
      ctx.textAlign = "left";
      ctx.fillStyle = isOwned ? "#6f8a80" : "#8fd9c4";
      ctx.font = uiTextFont(10);
      ctx.fillText(part.desc, tx, cyv + 26, cardW - 132);

      let status, statusColor;
      if (isOwned && wearers.length === 1) {
        const owner = CHARACTERS.find((c) => c.id === wearers[0]);
        status = `Takılı → ${owner ? owner.label : wearers[0]}`;
        statusColor = "#8affc0";
      } else if (isOwned && wearers.length > 1) {
        status = `Takılı → ${wearers.length} robotta`;
        statusColor = "#8affc0";
      } else if (isOwned) {
        status = "Envanterde • Atölye'den tak";
        statusColor = "#ffd166";
      } else {
        status = `${SLOT_LABELS[part.slot]} yuvası • her robota takılır`;
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
    ctx.fillText(`${SLOT_LABELS[slot]} parçaları tek seferlik alınır • aynı parça her robota takılabilir (kopya gerekmez) • takma Atölye'de`, this.W / 2, navY + MK_FOOT_NOTE_DY);
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
      ctx.fillText(b.dir < 0 ? "‹ Önceki" : "Sonraki ›", b.x + b.w / 2, b.y + b.h / 2);
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
    const label = part ? part.label : "Parça";
    const res = buyPart(this.profile, partId);
    if (!res.ok) {
      let msg = "Satın alma başarısız";
      if (res.reason === "ALREADY_OWNED") msg = `${label} zaten envanterinde — Atölye'den tak`;
      else if (res.reason === "SCRAP_REQUIRED") msg = `${label} için ${res.cost} Hurda gerekli`;
      else if (res.reason === "INVALID_PART") msg = "Bilinmeyen parça";
      this._marketNotice(msg, "#ff9b9b");
      SFX.uiClick();
      return;
    }
    this.profile = res.profile;
    this.marketFx = { partId, t: 0 };
    this._marketNotice(`${label} alındı (−${res.cost} Hurda) — Atölye'den bir robota tak`, "#8affc0");
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
  replay() {
    // Öğretici maçı: koç adımları sıfırlansın diye aynı kurulumla yeniden başlar
    if (this.mode === "tutorial") { this.beginTutorial(); return; }
    if (this.selectedChars.length && this.selectedChars.every(Boolean) && this.selectedMap) {
      this.cancelCharge();
      this.startGame();
    } else {
      this.reset();
    }
  }

  renderCountSelect(ctx) {
    const W = this.W, H = this.H;
    drawClouds(ctx, W);
    ctx.fillStyle = "#000000bb";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#ffe45e";
    ctx.font = uiTitleFont(30);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(t("brand.title", GAME_TITLE), W / 2, H / 2 - 132);
    ctx.fillStyle = "#cfe0ee";
    ctx.font = uiTitleFont(18);
    ctx.fillText("Kaç oyuncu?", W / 2, H / 2 - 84);
    // Başlık altı tehlike şeridi (pilot aile dili)
    _csHazardStrip(ctx, W / 2 - 130, H / 2 - 62, 260, 5);

    const BTN = 64, GAP = 16;
    const count = MAX_PLAYERS - MIN_PLAYERS + 1;
    const totalW = count * BTN + (count - 1) * GAP;
    const startX = (W - totalW) / 2;
    const y = Math.round(H / 2 - 40);
    this._countRects = [];
    const mx = this.input.mouseX, my = this.input.mouseY;

    for (let i = 0; i < count; i++) {
      const nPlayers = MIN_PLAYERS + i;
      const x = startX + i * (BTN + GAP);
      this._countRects.push({ x, y, w: BTN, h: BTN, n: nPlayers });

      const hovered = mx >= x && mx <= x + BTN && my >= y && my <= y + BTN;
      const isDefault = nPlayers === this.playerCount;
      _csPanel(ctx, x, y, BTN, BTN, {
        accent: hovered ? "#ffe45e" : isDefault ? "#4aa3ff" : "#2a3848",
        hover: hovered, glow: hovered,
        selected: isDefault,
      });

      ctx.fillStyle = "#eef5ff";
      ctx.font = uiTitleFont(26);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(nPlayers), x + BTN / 2, y + BTN / 2 + 1);
    }

    ctx.fillStyle = "#9fb6c9";
    ctx.font = uiTextFont(13);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Bir sayıya tıkla — sonra her oyuncu sırayla robotunu seçer", W / 2, y + BTN + 24);
    ctx.fillText("Test için 2 oyuncu en hızlısıdır", W / 2, y + BTN + 44);
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
      // Kaydırıcının ok tuşları ve butonun Space/Enter girdileri oyuna geçmez.
      if (e.target.closest?.("#audio-control") && !["m", "M", "Escape"].includes(e.key)) return;
      // Alt panel butonları odaktayken Space/Enter tarayıcının tıklamasına
      // bırakılır (ateş/güç doldurma tetiklenmesin).
      if (e.target.closest?.("#battle-actions") && (e.code === "Space" || e.key === "Enter")) return;
      // Esc: bağlama göre geri/iptal — atışı iptal et, seçim ekranında geri git,
      // oyun içindeyse menüye dön.
      if (e.key === "Escape") {
        e.preventDefault();
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
      if (this.state === "AIMING" && this.isHumanTurn() && (e.key === "a" || e.key === "A" || e.key === "ArrowLeft")) this.input.left = true;
      if (this.state === "AIMING" && this.isHumanTurn() && (e.key === "d" || e.key === "D" || e.key === "ArrowRight")) this.input.right = true;
      if (e.code === "Space") { e.preventDefault(); this.startCharge(); }
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
        e.preventDefault();
        if (this.state === "AIMING" && this.isHumanTurn() && this.active.jump()) {
          SFX.jump();
          if (this.mode === "tutorial") this._tutComplete(1); // rehber adımı: sıçrama
        }
      }
      if ((e.key === "q" || e.key === "Q") && this.state === "AIMING" && this.isHumanTurn()) {
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

    const rect = () => this.canvas.getBoundingClientRect();
    this.canvas.addEventListener("mousemove", (e) => {
      const r = rect();
      this.input.mouseX = (e.clientX - r.left) * (this.W / r.width);
      this.input.mouseY = (e.clientY - r.top) * (this.H / r.height);
    });
    this.canvas.addEventListener("mousedown", (e) => {
      if (this.state === "WORKSHOP") {
        this.handleWorkshopClick(this.input.mouseX, this.input.mouseY);
        return;
      }
      if (this.state === "MARKET") {
        this.handleMarketClick(this.input.mouseX, this.input.mouseY, e.shiftKey, e.ctrlKey || e.altKey || e.metaKey);
        return;
      }
      if (this.state === "TUTORIAL") { this.handleTutorialClick(this.input.mouseX, this.input.mouseY); return; }
      if (this.state === "COUNT_SELECT") {
        this.handleCountSelectClick(this.input.mouseX, this.input.mouseY);
        return;
      }
      if (this.state === "MODE_SELECT") {
        this.handleModeSelectClick(this.input.mouseX, this.input.mouseY);
        return;
      }
      if (this.state === "DIFFICULTY_SELECT") {
        this.handleDifficultySelectClick(this.input.mouseX, this.input.mouseY);
        return;
      }
      if (this.state === "BOT_COUNT_SELECT") {
        this.handleBotCountSelectClick(this.input.mouseX, this.input.mouseY);
        return;
      }
      if (this.state === "CHAR_SELECT") {
        this.handleCharSelectClick(this.input.mouseX, this.input.mouseY);
        return;
      }
      if (this.state === "MAP_SELECT") {
        this.handleMapSelectClick(this.input.mouseX, this.input.mouseY);
        return;
      }
      if (e.button === 2) { this.cancelCharge(); return; } // sağ tık: atışı iptal
      if (e.button === 0) this.startCharge();
    });
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

  // Silah seçimi (yalnız AIMING). Mühimmatı olmayan silah atlanır.
  selectWeapon(i) {
    if (this.state !== "AIMING" || !this.isHumanTurn()) return;
    const a = this.active;
    if (!a || i < 0 || i >= WEAPONS.length || !a.hasAmmo(i)) return;
    if (a.weapon !== i) SFX.weaponSwitch();
    a.weapon = i;
    this.weaponMenuOpen = false; // seçim yapıldı: açılır liste kapanır
    this.updateHud();
  }

  // Dahili modülü kullan (Q tuşu ve alt paneldeki modül yuvası aynı yolu kullanır).
  usePlayerSkill() {
    if (this.state !== "AIMING" || !this.isHumanTurn()) return;
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
    if (this.state !== "AIMING" || !this.isHumanTurn()) return;
    const a = this.active;
    if (!a) return;
    const n = WEAPONS.length;
    let i = a.weapon;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (a.hasAmmo(i)) { if (a.weapon !== i) SFX.weaponSwitch(); a.weapon = i; break; }
    }
    this.weaponMenuOpen = false;
    this.updateHud();
  }

  startCharge() {
    if (this.state !== "AIMING" || !this.isHumanTurn()) return;
    // Açık silah listesi varsa ilk tıklama yalnız listeyi kapatır: oyuncu
    // listeyi gezerken yanlışlıkla ateş başlamasın.
    if (this.weaponMenuOpen) { this.weaponMenuOpen = false; this.updateHud(); return; }
    this.input.charging = true;
  }

  releaseFire() {
    if (this.state !== "AIMING" || !this.input.charging) return;
    this.input.charging = false;
    const power = this.input.power;
    this.input.power = 0;
    updatePowerBar(0, false);
    this.fire(power);
  }

  // Güç dolduruluyorsa atışı ateş etmeden iptal et. İptal edildiyse true döner.
  cancelCharge() {
    if (!this.input.charging) return false;
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

  updateMuteButton() {
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
  }

  // Oyundan çık: bekleyen bot kararını ve girdileri temizleyip mod menüsüne dön.
  quitToMenu() {
    this.clearTurnInput();
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

    const m = a.muzzle;
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
    const shooter = this.shooterIdx !== null ? this.players[this.shooterIdx] : null;
    // nextShot yeteneği: yarıçap/hasar/knockback çarpanları
    const mod = this.shotMod;
    const radius = Math.round(spec.radius * (mod ? mod.radiusMult : 1));

    this.terrain.destroy(x, y, radius);
    this.explosions.push(new Explosion(x, y, radius));
    SFX.explosion(radius);

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
      if (!target.alive) SFX.eliminate();
    }
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
      const result = winner ? (winner === this.players[humanIdx] ? "win" : "loss") : "draw";
      const reward = this.grantMatchReward(result);
      if (this.mode === "tutorial") {
        // Öğretici maç: ödül yok, sonucu rehber diliyle anlat.
        const won = winner && winner === this.players[humanIdx];
        showOverlay(
          won ? "Öğretici tamamlandı! 🎓" : winner ? "Öğretici maçını kaybettin" : "Berabere!",
          won ? "Artık hazırsın — Ana Menü'den gerçek maçlara çıkabilirsin."
              : "Endişelenme — 'Tekrar Oyna' ile aynı bölümü yeniden dene.",
          null
        );
        this.updateHud();
        return;
      }
      showOverlay(
        winner ? `${winner.name} parça hakkını kazandı! 🏆` : "Tahsis berabere kaldı!",
        winner ? "" : "İkisi de elendi.",
        reward
      );
      this.updateHud();
      return;
    }
    // Sırayı yaşayan bir sonraki oyuncuya geçir
    do { this.turn = (this.turn + 1) % this.players.length; }
    while (!this.players[this.turn].alive);

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
    });
    if (!res.ok) return null;
    this.profile = res.profile;
    mp.rewardGranted = true;
    if (!res.persisted) notifyStorageFailure();
    const def = CHARACTERS.find((c) => c.id === mp.humanRobotId);
    res.robotLabel = def ? def.label : "";
    return res;
  }

  update(dt) {
    if (this.state === "MODE_SELECT" || this.state === "DIFFICULTY_SELECT" || this.state === "BOT_COUNT_SELECT" || this.state === "CHAR_SELECT" || this.state === "COUNT_SELECT" || this.state === "MAP_SELECT" || this.state === "WORKSHOP" || this.state === "MARKET" || this.state === "TUTORIAL") {
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
        a.aimTowards(this.input.mouseX, this.input.mouseY);
      }

      // Güç doldurma stamina harcamaz; stamina yalnızca yürümede tükenir
      if (a.control !== "bot" && this.input.charging) {
        this.input.power = Math.min(1, this.input.power + 0.012);
        const markerPct = a.lastShot ? a.lastShot.power * 100 : null;
        updatePowerBar(this.input.power, true, markerPct);
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

        // Mermi–karakter çarpışması. Yalnız varış noktasına bakmak yerine
        // katedilen doğru parçası sınanır (bkz. Projectile.sweepHit); patlama
        // noktası da yoldaki temas noktasıdır ki doğrudan isabet doğru yere yazılsın.
        // passPlayers'lı yardımcı mermiler (ışınlanma topu, kanca) robotlardan
        // geçer: hasarsızdır, robot üzerinde takılıp kalmamalı.
        let hitPlayer = null, hitAt = null;
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
    ctx.setTransform(this._scaleX, 0, 0, this._scaleY, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);

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

    // Haritaya özgü gökyüzü + uzak silüet + temalı bulutlar (hepsi terrain'in arkasında)
    drawSky(ctx, this.W, this.H, this.terrain.theme);
    drawBackdrop(ctx, this.W, this.H, this.terrain.theme);
    drawClouds(ctx, this.W, this.terrain.theme.cloud);
    this.terrain.draw(ctx);
    this.drawMines(ctx);
    this.drawFires(ctx);

    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (p.alive) p.draw(ctx, i === this.turn && this.state === "AIMING", this.renderTimeMs || 0);
    }

    // Modül cast efektleri oyuncuların üstünde, mermilerin ve HUD'un altında.
    if (typeof drawSkillFx === "function") drawSkillFx(ctx, this);

    if (this.state === "AIMING") {
      this.drawLastAngle(ctx);
      this.drawAim(ctx);
      if (this.active.weaponSpec.airdrop) this.drawAirdropTarget(ctx);
      // Modül kartı artık canvas'a değil alt paneldeki modül yuvasına çizilir
      // (skills.js > drawSkillHud tek başına kullanılabilir bir çizici olarak durur).
    }

    for (const pr of this.projectiles) pr.draw(ctx);
    this.drawTether(ctx); // kanca ipi: mermilerin üstünde, patlamaların altında
    for (const ex of this.explosions) ex.draw(ctx);
    this.drawDamagePopups(ctx);
    this.drawWindChangeFx(ctx);

    // Öğretici koç paneli: turun tepesinde, vignette'in altında
    if (this.mode === "tutorial") this.drawTutorialCoach(ctx);

    // Sinematik vignette — tüm sahnenin üstüne, en son
    drawVignette(ctx, this.W, this.H);
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

    drawClouds(ctx, W);
    ctx.fillStyle = "#000000aa";
    ctx.fillRect(0, 0, W, H);

    // Başlık
    const phase = this.charSelectPhase;
    const total = this.selectedChars.length;
    ctx.fillStyle = PLAYER_TINTS[phase % PLAYER_TINTS.length];
    ctx.font = uiTitleFont(24);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const chooser = isSinglePlayerProgressionMode(this.mode) ? (phase === 0 ? "Robotunu seç" : "Bilgisayarın robotunu seç") : `Oyuncu ${phase + 1} / ${total} — robot seç`;
    ctx.fillText(chooser, W / 2, 28);

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
      ctx.font = uiTextFont(13, 700);
      ctx.fillText(picked.join("   •   ") + "   ✓", W / 2, 62);
    } else if (this.mode === "local") {
      // Yerel maçta yükseltmeler kapalıdır; oyuncuya açıkça söylenir.
      ctx.fillStyle = "#9fb6c9";
      ctx.font = uiTextFont(12);
      ctx.fillText("Standart kalibrasyon — geliştirmeler kapalı", W / 2, 62);
    }

    // Kart sabitleri — tüm dikey pozisyonlar cx/cy'ye göreli, ch.r'dan bağımsız.
    // 2 satırlık grid'e sığması için kart yüksekliği ve iç aralıklar sıkıştırıldı.
    const CARD_W = 150, CARD_H = 186, GAP = 10, GAP_Y = 10;
    const CHAR_CY = 46;   // karakter merkezi (kart-içi y)
    const NAME_Y  = 70;   // isim başlangıcı
    const SUMMARY_Y = 86; // servis seviyesi + dal özeti satırı
    const STAT_Y  = 98;   // ilk stat satırı
    const STAT_GAP = 16;  // stat satırı adımı (label 9px + bar 5px + boşluk 2px)
    const SEP_Y   = STAT_Y + STAT_GAP * 3 + 2;  // 148
    const SKILL_Y = SEP_Y + 6;                   // 154

    // ── Sayfalama: karakterler CS_COLS sütun × CS_ROWS satırlık grid'e bölünür ──
    const COLS = CS_COLS, PER_PAGE = CS_COLS * CS_ROWS;
    const totalPages = Math.ceil(CHARACTERS.length / PER_PAGE);
    this.charPage = Math.max(0, Math.min(this.charPage, totalPages - 1));
    const pageStart = this.charPage * PER_PAGE;
    const pageChars = CHARACTERS.slice(pageStart, pageStart + PER_PAGE);

    const colsUsed = Math.min(pageChars.length, COLS);
    const rowsUsed = Math.ceil(pageChars.length / COLS);
    const totalW = colsUsed * CARD_W + (colsUsed - 1) * GAP;
    const startX = (W - totalW) / 2;
    const startY = 80;

    this._cardRects = [];

    for (let i = 0; i < pageChars.length; i++) {
      const ch = pageChars[i];
      const col = i % COLS, row = (i / COLS) | 0;
      const cx = startX + col * (CARD_W + GAP);
      const cy = startY + row * (CARD_H + GAP_Y);
      this._cardRects.push({ x: cx, y: cy, w: CARD_W, h: CARD_H, ch });

      const mx = this.input.mouseX, my = this.input.mouseY;
      const hovered = mx >= cx && mx <= cx + CARD_W && my >= cy && my <= cy + CARD_H;
      // Daha önceki oyunculardan biri bu karakteri seçtiyse işaretle (yine de seçilebilir)
      const taken = this.selectedChars.slice(0, phase).includes(ch);

      ctx.save();

      // ── Kart arka planı: endüstriyel panel; hover'da 2px yukarı kayar
      // (dokunma alanı _cardRects'te sabit kalır). Alınmış robot kırmızı
      // kenar + kalın çerçeveyle işaretlenmeye devam eder.
      const cyv = cy + (hovered ? -2 : 0);
      _csPanel(ctx, cx, cyv, CARD_W, CARD_H, {
        accent: hovered ? "#ffe45e" : taken ? "#ff7b7b" : "#2a3848",
        hover: hovered, glow: hovered,
        selected: taken,
      });

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
      ctx.fillText(`[Q]  ${ch.skill.label}`, cx + CARD_W / 2, cyv + SKILL_Y + 1);

      ctx.fillStyle = "#7899aa";
      ctx.font = uiTextFont(10);
      ctx.textBaseline = "top";
      ctx.fillText(ch.skill.desc, cx + CARD_W / 2, cyv + SKILL_Y + 21);

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
      ctx.fillText(`Sayfa ${this.charPage + 1} / ${totalPages}`, mid, navY + btnH / 2);
    }

    // Geri butonu her fazda görünür: P2+ seçiminde önceki oyuncuya, ilk seçimde
    // bir önceki ekrana (bilgisayar modunda mod seçimi, yerelde oyuncu sayısı)
    // döner. Böylece yalnız fareyle oynayan da her ekrandan geri çıkabilir.
    this.drawBackButton(ctx, t("common.back", "‹ Geri"));
  }

  // Karakter seçim sayfasını sınırlar içinde değiştir
  changeCharPage(dir) {
    if (this.state !== "CHAR_SELECT") return;
    const totalPages = Math.ceil(CHARACTERS.length / (CS_COLS * CS_ROWS));
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

    drawClouds(ctx, W);
    ctx.fillStyle = "#000000bb";
    ctx.fillRect(0, 0, W, H);

    // Başlık
    ctx.fillStyle = "#ffe45e";
    ctx.font = uiTitleFont(24);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Fabrika Bölgesi Seç", W / 2, 22);

    // Seçilen karakterler özeti (2–6 oyuncu)
    ctx.font = uiTextFont(13);
    ctx.fillStyle = "#cfe0ee";
    ctx.fillText(
      this.selectedChars.map((c) => c ? c.label : "?").join("  ⚔  "),
      W / 2, 50
    );

    // ── Sayfalama: haritalar MS_COLS × MS_ROWS grid'e bölünür ──
    const CARD_W = 168, CARD_H = 156, GAP = 12, GAP_Y = 12;
    const COLS = MS_COLS, PER_PAGE = MS_COLS * MS_ROWS;
    const totalPages = Math.ceil(MAPS.length / PER_PAGE);
    this.mapPage = Math.max(0, Math.min(this.mapPage, totalPages - 1));
    const pageStart = this.mapPage * PER_PAGE;
    const pageMaps = MAPS.slice(pageStart, pageStart + PER_PAGE);

    const colsUsed = Math.min(pageMaps.length, COLS);
    const rowsUsed = Math.ceil(pageMaps.length / COLS);
    const totalW = colsUsed * CARD_W + (colsUsed - 1) * GAP;
    const startX = (W - totalW) / 2;
    const startY = 72;

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
      const isOwn = this.selectedChars.some((c) => c && m.forChar === c.id);

      ctx.save();

      // Kart arka planı: endüstriyel panel; robotuna ait haritada haritanın
      // kendi vurgu rengi kenarlıkta yaşamaya devam eder (K-RENK).
      const cyv = cy + (hovered ? -2 : 0);
      _csPanel(ctx, cx, cyv, CARD_W, CARD_H, {
        accent: hovered ? "#ffe45e" : isOwn ? m.accent : "#2a3848",
        hover: hovered, glow: hovered,
        selected: isOwn,
      });

      // Önizleme (arazi şekli = skill arketipi) + monitör iç çerçevesi:
      // panel içinde küçük bir saha monitörü gibi okunur.
      drawMapPreview(ctx, cx + 8, cyv + 8, CARD_W - 16, 80, m);
      ctx.strokeStyle = "#00000099"; ctx.lineWidth = 1;
      ctx.strokeRect(cx + 7.5, cyv + 7.5, CARD_W - 15, 81);

      // İsim — Russo One geniş: punto küçülerek tek satırda tutulur
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const nameFit = _fitTextLines(ctx, m.label, CARD_W - 16, 14, uiTitleFont, 1, 10);
      ctx.fillStyle = "#eef5ff";
      ctx.font = nameFit.lines.length === 1 ? uiTitleFont(nameFit.px) : uiTitleFont(14);
      ctx.fillText(m.label, cx + CARD_W / 2, cyv + 92, nameFit.lines.length === 1 ? undefined : CARD_W - 16);

      // Skill vurgusu
      const skillFit = _fitTextLines(ctx, `${m.forLabel} · Q: ${m.skillLabel || "-"}`, CARD_W - 14, 10, (p) => uiTextFont(p, 700), 1, 8);
      ctx.fillStyle = "#ffee88";
      ctx.font = skillFit.lines.length === 1 ? uiTextFont(skillFit.px, 700) : uiTextFont(10, 700);
      ctx.fillText(`${m.forLabel} · Q: ${m.skillLabel || "-"}`, cx + CARD_W / 2, cyv + 110, skillFit.lines.length === 1 ? undefined : CARD_W - 14);

      // Arketip + tema
      ctx.fillStyle = m.accent;
      ctx.font = uiTextFont(10);
      ctx.fillText(`${m.arenaCode || ""} · ${ARCH_LABELS[m.archetype] || ""}`, cx + CARD_W / 2, cyv + 126);

      // Seçilen karakterin haritası: accent renkli mini rozet pill'i
      if (isOwn) {
        ctx.font = uiTextFont(9, 700);
        const tag = "★ senin robotun";
        const tagW = ctx.measureText(tag).width + 12;
        ctx.fillStyle = m.accent + "22";
        _csRoundRect(ctx, cx + (CARD_W - tagW) / 2, cyv + 135, tagW, 15, 5);
        ctx.fill();
        ctx.strokeStyle = m.accent + "88"; ctx.lineWidth = 1;
        _csRoundRect(ctx, cx + (CARD_W - tagW) / 2, cyv + 135, tagW, 15, 5);
        ctx.stroke();
        ctx.fillStyle = m.accent;
        ctx.fillText(tag, cx + CARD_W / 2, cyv + 140);
      }

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
      ctx.fillText(`Sayfa ${this.mapPage + 1} / ${totalPages}`, mid, navY + btnH / 2);
    }

    // Geri butonu: karakter seçimine dön
    this._backRect = null;
    this.drawBackButton(ctx, "‹ Robotlar");
  }

  // Harita seçim sayfasını sınırlar içinde değiştir
  changeMapPage(dir) {
    if (this.state !== "MAP_SELECT") return;
    const totalPages = Math.ceil(MAPS.length / (MS_COLS * MS_ROWS));
    this.mapPage = Math.max(0, Math.min(this.mapPage + dir, totalPages - 1));
  }

  // Açılışta oyunculardan birinin kendi karakter haritasının olduğu sayfaya git.
  gotoOwnMapPage() {
    const PER = MS_COLS * MS_ROWS;
    const idx = MAPS.findIndex((m) => this.selectedChars.some((c) => c && c.id === m.forChar));
    this.mapPage = idx >= 0 ? Math.floor(idx / PER) : 0;
  }

  // Sol-üst köşeye t("common.back", "‹ Geri") butonu çiz ve hit-test için _backRect'i sakla.
  drawBackButton(ctx, label) {
    const x = 16, y = 16, w = 104, h = 32;
    this._backRect = { x, y, w, h };
    const mx = this.input.mouseX, my = this.input.mouseY;
    const hov = mx >= x && mx <= x + w && my >= y && my <= y + h;
    ctx.save();
    _csPanel(ctx, x, y, w, h, { accent: hov ? "#ffe45e" : "#2a3848", hover: hov, glow: hov, rivets: false });
    ctx.fillStyle = "#cfe0ee";
    ctx.font = uiTextFont(13, 700);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label || t("common.back", "‹ Geri"), x + w / 2, y + h / 2);
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
      const alpha = 1 - t;            // sona doğru sön
      // İlk anda hızlı büyü ("pop"), sonra normal boyutta kal
      const pop = d.age < 0.12 ? d.age / 0.12 : 1;
      const size = 14 + 8 * pop;

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = uiTextFont(size, 700);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#000000aa";
      ctx.fillStyle = "#ff5e5e";
      const txt = `-${d.amount}`;
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
      ? robotMuzzlePoint(a.x, a.y - a.r, a.r, a.facing, ang)
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

    // derece etiketi (siyah konturlu, gökyüzünde okunur)
    const deg = Math.round(-ang * 180 / Math.PI);
    ctx.font = uiTextFont(13, 700);
    ctx.textBaseline = "middle";
    const tx = ex + (a.facing >= 0 ? 8 : -8);
    ctx.textAlign = a.facing >= 0 ? "left" : "right";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000000aa";
    ctx.strokeText(`${deg}°`, tx, ey);
    ctx.fillStyle = "#ff8c1a";
    ctx.fillText(`${deg}°`, tx, ey);
    ctx.restore();
  }

  drawAim(ctx) {
    const a = this.active;
    const m = a.muzzle;
    const len = 28 + this.input.power * 70;
    const ex = m.x + Math.cos(a.aim) * len;
    const ey = m.y + Math.sin(a.aim) * len;
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
    ctx.arc(ex, ey, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe45e";
    ctx.fill();
  }

  updateHud() {
    // Seçim/menü ekranlarında HUD'u gizle: sıra/rüzgâr bilgisi anlamsız ve
    // ortadaki büyük başlığı/butonları kapatıyor.
    const menuState = this.state === "MODE_SELECT" || this.state === "DIFFICULTY_SELECT" || this.state === "BOT_COUNT_SELECT" || this.state === "COUNT_SELECT" || this.state === "CHAR_SELECT" || this.state === "MAP_SELECT" || this.state === "WORKSHOP" || this.state === "MARKET" || this.state === "TUTORIAL";
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
      } else if (this.state === "GAMEOVER") {
        banner.textContent = t("hud.banner.alloc", "Tahsis Tamamlandı");
        banner.style.color = "#fff";
      } else {
        // Savaşta banner sade: yalnız sıra + süre. Bot durum yazıları ("nişan
        // alıyor…" vb. ve botların birleşik dizisi) üst bandı yazıyla dolduruyordu;
        // robotun ne yaptığını animasyon + ses zaten gösterdiği için kaldırıldı.
        // Not: yerel değişken adı `secs` — `t` olsaydı bu blokta global t()
        // çeviri fonksiyonunu gölgelerdi.
        const secs = Math.ceil(this.turnTimer);
        banner.textContent = t("hud.banner.turn", "Sıra: {name}  ⏱ {secs}s", { name: this.active.name, secs });
        banner.style.color = secs <= 5 ? "#ff6b6b" : (this.active.playerTint || this.active.color);
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

  loop(ts) {
    requestAnimationFrame(this.loop.bind(this));
    this.renderTimeMs = ts;
    SFX.musicSync(this.state, this.mode); // arka plan müziği tema senkronu

    // FPS'i 60'a sabitle: yeterli süre geçmediyse bu kareyi atla.
    // (1ms tolerans: tam 60Hz ekranlarda yanlışlıkla 30 FPS'e düşmeyi önler.)
    const elapsed = ts - this.lastTime;
    if (elapsed < FRAME_TIME - 1) return;
    // Kayma düzeltme: artan süreyi bir sonraki kareye taşı.
    this.lastTime = ts - (elapsed % FRAME_TIME);

    // Sabit adım: her güncelleme tam olarak 1/60 saniye ilerler.
    this.update(1 / FPS);
    this.render();
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
// Tüm canvas yazıları fontu bu iki yardımcıdan alır; aile değişecekse tek yer
// güncellenir. Başlık/buton = Russo One (tek kalınlıklı olduğundan "bold"
// eklenmez — sahte kalın üretilmesin), gövde/açıklama = Chakra Petch; kalın
// gövde için weight verilir (700). CSS tarafındaki aileler: --font-title/--font-text.
// Not: 13px ve altı küçük etiketler/ikincil butonlar okunabilirlik için
// Chakra Petch 700'de kalır (plan notu); Russo One 14px ve üstünde kullanılır.
function uiTitleFont(px) {
  return `${px}px "Russo One", "Segoe UI", sans-serif`;
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

// ── Endüstriyel panel yardımcıları (ui-theme-plan.md §3.2) ─────────────────
// "Dökümhane" görsel dili: kesik köşeli (chamfer) çelik panel, fırçalanmış
// metal gradyanı, köşe perçinleri ve isteğe bağlı sarı-siyah tehlike şeridi.
// Menü kartları/butonları _csPanel ile çizilir; _csRoundRect küçük öğeler
// (mühimmat baloncuğu, çip vb.) için ayrıca durur.

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

// 45° sarı-siyah tehlike şeridi: desen bir kez üretilip önbelleklenir
// (plan §7-3; her kare yeniden üretilmez). İlk çağrıda document'a dokunur —
// yalnız render sırasında çağrıldığı için test sandbox'ında tetiklenmez.
// Test sandbox'ında document/createPattern bulunmayabilir: desen üretilemezse
// _hazardPattern=false olur ve şerit düz sarı dolguyla çizilir (çizim bozulmaz).
let _hazardPattern = null;
function _csHazardStrip(ctx, x, y, w, h) {
  if (_hazardPattern === null) {
    try {
      if (typeof document !== "undefined" && typeof ctx.createPattern === "function") {
        const tile = document.createElement("canvas");
        tile.width = 16; tile.height = 16;
        const g = tile.getContext("2d");
        g.fillStyle = "#11161c"; g.fillRect(0, 0, 16, 16);
        g.strokeStyle = "#ffe45e"; g.lineWidth = 6;
        g.beginPath();
        for (let i = -16; i <= 32; i += 16) { g.moveTo(i, 20); g.lineTo(i + 20, -4); }
        g.stroke();
        _hazardPattern = ctx.createPattern(tile, "repeat");
      } else {
        _hazardPattern = false;
      }
    } catch (e) {
      _hazardPattern = false;
    }
  }
  ctx.save();
  ctx.fillStyle = _hazardPattern || "#ffe45e";
  ctx.fillRect(x, y, w, h);
  ctx.restore();
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
//   rivets    — köşe perçinleri (küçük butonlarda false)
//   hazardTop — üst kenarda tehlike şeridi (ekran/bölme aile imzası: sağ
//               panelin üst kenarı; devre dışı düğmelere uygulanmaz)
//   fillTop/fillBottom — özel dolgu (seçili durumun yeşili vb.)
function _csPanel(ctx, x, y, w, h, opts) {
  const o = opts || {};
  const c = Math.min(8, Math.floor(Math.min(w, h) / 4));
  _panelPath(ctx, x, y, w, h, c);
  // Fırçalanmış metal: üstte açık, altta koyu dikey gradyan (§3.1)
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, o.fillTop || (o.hover ? "#20304a" : "#1a2430"));
  grad.addColorStop(1, o.fillBottom || (o.hover ? "#121a26" : "#0f1720"));
  ctx.fillStyle = grad;
  ctx.fill();
  // Üst tehlike şeridi: panel yoluna kırparak kesik köşelerden taşmaz
  if (o.hazardTop) {
    ctx.save();
    _panelPath(ctx, x, y, w, h, c);
    ctx.clip();
    _csHazardStrip(ctx, x, y, w, 5);
    ctx.restore();
  }
  // Kenarlık (+ hover parıltısı)
  _panelPath(ctx, x, y, w, h, c);
  ctx.lineWidth = o.hover || o.selected ? 2.5 : 1.5;
  ctx.strokeStyle = o.accent || "#3b526b";
  ctx.stroke();
  if (o.hover && o.glow) _csGlow(ctx, o.accent || "#ffe45e");
  // Perçinler: dört köşede gömülü vida başı — koyu gövde + sol üst parlak nokta
  if (o.rivets !== false && w > 56 && h > 30) {
    const in2 = 7, r = 2.5;
    for (const [rx, ry] of [[x + in2, y + in2], [x + w - in2, y + in2], [x + in2, y + h - in2], [x + w - in2, y + h - in2]]) {
      ctx.fillStyle = "#2c3a4c";
      ctx.beginPath(); ctx.arc(rx, ry, r, 0, 6.28); ctx.fill();
      ctx.fillStyle = "#8fa6bd";
      ctx.beginPath(); ctx.arc(rx - 0.6, ry - 0.6, r * 0.45, 0, 6.28); ctx.fill();
    }
  }
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

// Ana menü arka planı: çelik gradyan + başlık arkası sıcak parıltı + seyrek
// teknik nokta ızgarası + köşe vinyeti + endüstriyel köşe dirsekleri.
// Düz siyah perdeyi değiştirir; bulutlar (drawClouds) altında kalır.
function _msBackdrop(ctx, W, H) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#101c2ae8");
  grad.addColorStop(0.55, "#0a111af0");
  grad.addColorStop(1, "#060a10f7");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Başlık arkası sıcak parıltı: dökümhane kor ışıması (çok soluk tutulur)
  const glow = ctx.createRadialGradient(W / 2, H / 2 - 150, 16, W / 2, H / 2 - 150, 330);
  glow.addColorStop(0, "rgba(255,228,94,0.10)");
  glow.addColorStop(1, "rgba(255,228,94,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // Teknik nokta ızgarası: mühendislik planı dokusu (soluk, kare başına 1 nokta)
  ctx.fillStyle = "rgba(140,180,220,0.05)";
  for (let gx = 24; gx < W; gx += 48) {
    for (let gy = 24; gy < H; gy += 48) ctx.fillRect(gx, gy, 2, 2);
  }
  // Köşe vinyeti: kenarlar kararmış salon hissi — merkezi öne çıkarır
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.98);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.52)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  // Endüstriyel köşe dirsekleri: sahne çerçevesi imzası. Sağ üst köşeyi
  // atlarız — ses denetimi widget'ı (DOM, z-index 7) o köşeyi kapatır.
  ctx.strokeStyle = "rgba(255,228,94,0.22)";
  ctx.lineWidth = 2;
  const m = 14, L = 22;
  ctx.beginPath();
  ctx.moveTo(m, m + L); ctx.lineTo(m, m); ctx.lineTo(m + L, m);
  ctx.moveTo(W - m, H - m - L); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m - L, H - m);
  ctx.moveTo(m + L, H - m); ctx.lineTo(m, H - m); ctx.lineTo(m, H - m - L);
  ctx.stroke();
}

// Kart üstü ikon plakası: kesik köşeli mini bölme + vektör glif. Her mod kendi
// imza ikonunu taşır; lit=true (hover) plakayı ve glifi parıltıyla yakar.
// Glifler kartın kendi accent renginde çizilir — ikonsuz kart kalmaz.
function _msIcon(ctx, kind, cx, cy, accent, lit) {
  const col = lit ? accent : _hexA(accent, 0.85);
  ctx.save();
  // Plaka: kart gövdesinden hafif ayrılan kesik köşeli mini bölme
  _panelPath(ctx, cx - 19, cy - 19, 38, 38, 5);
  ctx.fillStyle = _hexA(accent, lit ? 0.22 : 0.09);
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = _hexA(accent, lit ? 0.9 : 0.4);
  ctx.stroke();
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

// Maç sonu overlay'i: ödül hesaplamaz, yalnız hazır sonuç modelini gösterir.
// Her gösterimde düğmeler varsayılana döner.
function showOverlay(title, sub, reward) {
  const defWorkshop = document.getElementById("workshop-btn");
  if (defWorkshop) defWorkshop.textContent = "Atölyeye Git";
  const defRestart = document.getElementById("restart-btn");
  if (defRestart) defRestart.textContent = "Tekrar Oyna";
  const defMenu = document.getElementById("menu-btn");
  if (defMenu) defMenu.textContent = "Ana Menü";
  document.getElementById("overlay-title").textContent = title;
  document.getElementById("overlay-sub").textContent = sub || "";
  const detail = document.getElementById("overlay-reward");
  if (detail) {
    if (reward && reward.ok) {
      const lines = [`+${reward.scrap} Hurda  •  +${reward.xp} Servis XP`];
      if (reward.levelAfter > reward.levelBefore) {
        lines.push(`${reward.robotLabel ? reward.robotLabel + " " : ""}Servis Seviyesi ${reward.levelBefore} → ${reward.levelAfter}`);
      }
      if (reward.message) lines.push(reward.message);
      detail.textContent = lines.join("\n");
      detail.classList.remove("hidden");
    } else {
      detail.textContent = "";
      detail.classList.add("hidden");
    }
  }
  document.getElementById("overlay").classList.remove("hidden");
}
function hideOverlay() {
  document.getElementById("overlay").classList.add("hidden");
}

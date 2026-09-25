/* Oyun durum makinesi, sıra sistemi, girdi ve render döngüsü.
 * Durumlar: AIMING -> PROJECTILE -> SETTLE -> (sıra değiş) ... -> GAMEOVER
 */
const TURN_DURATION = 25;        // saniye: bir oyuncunun nişan/hamle süresi
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

// Cephane Pazarı: soldaki robot grid'i Atölye ile aynı (4×3 = 12), sağda
// 2 sütun × 5 satır mühimmat kartı (sayfa başına 10).
const MK_COLS = 2;
const MK_ROWS = 5;
const MK_PANEL_H = 440;
const MK_FX_DURATION = 0.6;   // satın alma sonrası kart parıltısı (saniye)
const MK_NOTICE_DURATION = 2.2; // geri bildirim yazısının ekranda kalma süresi

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
    // Modül kartının alt çapası: DOM silah paneli yüksekliğinin mantıksal
    // karşılığı. Panel mermi önizlemesiyle birlikte büyüyebildiği için sabit
    // sayı yerine ölçülür (syncBottomHud); 124 eski davranışın değeridir.
    this.hudBottomInset = 124;

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
    this.marketPage = 0;         // Cephane Pazarı: robot sayfası
    this.marketWeaponPage = 0;   // Cephane Pazarı: mühimmat sayfası
    this.marketSelectedId = null;
    this.marketFx = null;        // satın alma sonrası kart parıltısı
    this.marketNotice = null;    // kısa geri bildirim (eksik Hurda / dolu depo)
    // Hikâye modu çalışma alanları: kupa haritası, sahne oynatıcı, saha robotu
    // seçimi ve brifing durumu reset() ile temizlenir.
    this.storyMissionId = null;  // açık görev kartı (kupa haritası seçimi)
    this.storyMission = null;    // maç sırasında görev verisi
    this.storySceneId = null;    // oynatılan sahnenin kimliği
    this.storySceneIndex = 0;    // ekranda olan kutu
    this.storySceneChars = 0;    // yazı animasyonu ilerlemesi (harf)
    this.storySceneOnDone = null;// sahne bitince çağrılacak devamlılık
    this.storyFocus = 0;         // klavyeyle gezinilen satır/kart
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
    this.shooterIdx = null;
    this.shotMod = null;      // aktif salvonun nextShot modifikatörü (nextShot yeteneği)
    this.charPage = 0;        // karakter seçim ekranı sayfası
    this.mapPage = 0;         // harita seçim ekranı sayfası
    this.matchProgress = null; // maç başına ödül sayaçları (startGame kurar)
    this.storyMissionId = null;
    this.storyMission = null;
    this.storySceneId = null;
    this.storySceneIndex = 0;
    this.storySceneChars = 0;
    this.storySceneOnDone = null;
    this.storyFocus = 0;
    this.wind = null;
    this.windTurnsRemaining = 0;
    this.windChangeFx = null;
    this.state = "MODE_SELECT"; // önce oyun modu seçilir
    this._weaponKey = null;
    hideOverlay();
    updatePowerBar(0, false);
    this.updateHud();
  }

  startGame() {
    // Maç kurulurken sonuç kartı her hâlükârda kapanır. Hikâye yenilgisindeki
    // "Tekrar Oyna" yalnız startGame()'i çağırdığı için kart açık kalıyor,
    // maç arkada yeniden başlarken ekranda aynı menü duruyordu (F2-11).
    hideOverlay();
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
    // Geliştirmeler yalnız tek oyunculu ilerleme modlarında (bilgisayara karşı
    // ve hikâye) ve yalnız insan robotunda etkindir; botlar ve yerel maçlar
    // taban tanımı kullanır (aynı kurucu).
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
      ent.control = ctrl;
      return ent;
    });
    // Zorluk seviyesi botun çıkış gücünü de ölçekler (Kolay zayıf, Ustalık
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
    this.wind = randWind();
    this.windTurnsRemaining = randWindDuration();
    this.windChangeFx = null;
    this.settleTimer = 0;
    this.turnTimer = TURN_DURATION;
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
    // Hikâye modu menüden kendi rotasıyla açılır (openStoryResume); buraya
    // yalnız computer/local gelir. Yine de bilinmeyen değeri local'e düşür.
    this.mode = mode === "computer" ? "computer" : mode === "story" ? "story" : "local";
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
    drawClouds(ctx, W);
    ctx.fillStyle = "#000000bb"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(32);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("DÖKÜMHANE-9", W / 2, H / 2 - 145);
    ctx.fillStyle = "#cfe0ee"; ctx.font = uiTitleFont(18);
    ctx.fillText("Arena tahsis protokolünü başlat", W / 2, H / 2 - 92);
    // Başlık altı tehlike şeridi: endüstriyel imza detayı (Faz 2 pilot)
    _csHazardStrip(ctx, W / 2 - 130, H / 2 - 64, 260, 5);
    const scrap = this.profile ? this.profile.scrap : START_SCRAP;
    // Pazar kartının alt yazısı için tüm robotların deposu toplanır (34 küçük
    // nesne taraması; menü karesi başına maliyeti önemsizdir).
    const depotTotal = CHARACTERS.reduce((n, c) => n + ammoDepotTotal(getRobotAmmo(this.profile, c.id)), 0);
    // Hikâye kartının alt yazısı kayıta göre değişir: boş kampanyada haritaya,
    // ilerleme varsa "Devam Et", bitmiş devrede "Yeni Kupa" davetine (D-09).
    const story = this.profile ? this.profile.story : null;
    const storySub = !story || !story.completedMissions.length
      ? "Dokuz Bölge Kupası"
      : story.endingSeen ? "Yeni Kupa Devresi • Arşiv" : "Devam Et • Kupa Haritası";
    const items = [
      { action: "story", title: "HİKÂYE MODU", sub: storySub },
      { action: "computer", title: "Otomatik Birimlere Karşı", sub: "1 operatör ve 1–3 fabrika robotu" },
      { action: "local", title: "Yerel Operatörler", sub: "Aynı cihazda 2–6 oyuncu" },
      { action: "workshop", title: "ATÖLYE", sub: `Robotlarını kalibre et • ${scrap} Hurda` },
      { action: "market", title: "CEPHANE PAZARI", sub: depotTotal > 0 ? `Depoda ${depotTotal} mermi • ${scrap} Hurda` : `Robotuna mühimmat al • ${scrap} Hurda` },
    ];
    // Beş kart dar tarayıcı görünümünde taşmasın diye genişlik kart sayısına
    // göre uyarlanır (kilit belgesi D-08); sığmayan pencerede kartlar birlikte daralır.
    const gap = 16, bh = 88;
    const bw = Math.min(200, Math.floor((W - (items.length + 1) * gap) / items.length));
    const totalW = items.length * bw + (items.length - 1) * gap;
    const startX = (W - totalW) / 2, y = H / 2 - 44;
    this._modeRects = [];
    for (let i = 0; i < items.length; i++) {
      const x = startX + i * (bw + gap), it = items[i];
      const hovered = this.input.mouseX >= x && this.input.mouseX <= x + bw && this.input.mouseY >= y && this.input.mouseY <= y + bh;
      this._modeRects.push({ x, y, w: bw, h: bh, action: it.action });
      // Hover'da kart 2px yukarı kayar (dokunma alanı _modeRects'te değişmez)
      const hy = y + (hovered ? -2 : 0);
      // Atölye ve pazar kartları yeşil/altın kenar + üst tehlike şeridiyle
      // "servis bölmesi" gibi okunur (endüstriyel imza detay).
      const isService = it.action === "workshop" || it.action === "market";
      _csPanel(ctx, x, hy, bw, bh, {
        accent: hovered ? "#ffe45e" : it.action === "workshop" ? "#d8a72f" : it.action === "market" ? "#3fae8c" : "#3b526b",
        hover: hovered, glow: true,
        hazardTop: isService,
      });
      // Başlık/alt yazı kart genişliğine sığdırılır (satır bölme + punto küçültme);
      // 2 satırlık başlıkta alt yazı birkaç piksel aşağı kayar.
      ctx.textBaseline = "middle";
      const titleFit = _fitTextLines(ctx, it.title, bw - 14, isService ? 18 : 17, uiTitleFont, 2, 11);
      const subFit = _fitTextLines(ctx, it.sub, bw - 12, 12, (p) => uiTextFont(p), 2, 9);
      ctx.fillStyle = "#eef5ff";
      const tGap = titleFit.px + 1;
      const titleY = titleFit.lines.length === 1 ? hy + 31 : hy + 23;
      for (let j = 0; j < titleFit.lines.length; j++) ctx.fillText(titleFit.lines[j], x + bw / 2, titleY + j * tGap);
      ctx.fillStyle = "#9fb6c9";
      const subY = titleFit.lines.length === 1 ? hy + 58 : hy + 61;
      for (let j = 0; j < subFit.lines.length; j++) ctx.fillText(subFit.lines[j], x + bw / 2, subY + j * 12);
    }
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
    this.drawBackButton(ctx, "‹ Geri");
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
    this.drawBackButton(ctx, "‹ Geri");
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
    // Maç sonu overlay'inden gelinmiş olabilir: overlay ve bekleyen girdi kapanır.
    hideOverlay();
    this.clearTurnInput();
    this.state = "WORKSHOP";
    this.updateHud();
  }

  closeWorkshop() {
    this.workshopFx = null;
    // Maç sonu Atölye düğmesinden gelindiyse (hikâye/festival bağlamı) haritaya dön.
    if (this.mode === "story" || this.mode === "festival") { this.openStoryMap(); return; }
    this.state = "MODE_SELECT";
    this.updateHud();
  }

  _workshopPageOf(id) {
    const idx = CHARACTERS.findIndex((c) => c.id === id);
    return idx >= 0 ? Math.floor(idx / (WS_COLS * WS_ROWS)) : 0;
  }

  // Satın alma sonrası kısa "metal montaj" parıltısı her karede söner.
  updateWorkshopFx(dt) {
    if (!this.workshopFx) return;
    this.workshopFx.t += dt;
    if (this.workshopFx.t > WS_FX_DURATION) this.workshopFx = null;
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

  handleWorkshopKey(e) {
    if (this.state !== "WORKSHOP") return false;
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
    ctx.fillText("ATÖLYE", W / 2, 20);
    ctx.fillStyle = "#9fb6c9";
    ctx.font = uiTextFont(12);
    ctx.fillText("Robotlarını kalibre et — geliştirmeler yalnız bilgisayara karşı maçta etkindir", W / 2, 48);

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
      });

      ctx.fillStyle = ch.color;
      ctx.font = uiTextFont(12, 700);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(ch.label, cx + cardW / 2, cyv + 58, cardW - 10);
      ctx.fillStyle = "#9fb6c9";
      ctx.font = uiTextFont(9);
      ctx.fillText(`Sv. ${levelForXp(up.xp)} • ${totalTiers(up)}/9`, cx + cardW / 2, cyv + 72);
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
      ctx.fillText(b.dir < 0 ? "‹ Geri" : "İleri ›", b.x + b.w / 2, b.y + b.h / 2);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#9fb6c9";
    ctx.font = uiTextFont(13, 700);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`Sayfa ${this.workshopPage + 1} / ${totalPages}`, gx + gridW / 2, navY + navH / 2);

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
    });
    ctx.fillStyle = "#eef5ff";
    ctx.font = uiTitleFont(18);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(`${def.label} · ${def.role}`, rx + rw / 2, gy + 100);

    ctx.fillStyle = "#ffd166";
    ctx.font = uiTextFont(13, 700);
    ctx.fillText(`Servis Seviyesi ${level}${nextXp != null ? ` — ${up.xp} / ${nextXp} XP` : " — Usta Servis"}`, rx + rw / 2, gy + 124);

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
    ctx.fillText(`Hurda: ${scrap}`, rx + rw / 2, barY + 14);
    if (level >= 4) {
      ctx.fillStyle = "#8fa8ba";
      ctx.font = uiTextFont(10);
      ctx.fillText(`Maç ${up.stats.matches} • Galibiyet ${up.stats.wins}`, rx + rw / 2, barY + 36);
    }

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
    const btn = { x: rx, y: py + 4, w: rw, h: 42 };
    this._workshopActionRect = btn;
    let label, enabled = false, reason = "";
    if (!step.ok) {
      label = "Tam Kalibrasyon";
      reason = "Bu dal tamamlandı";
    } else if (level < step.requiredLevel) {
      label = `${BRANCH_LABELS[this.workshopBranch]} ${romanTier(step.nextTier)} — kilitli`;
      reason = `Servis Seviyesi ${step.requiredLevel} gerekli`;
    } else if (scrap < step.cost) {
      label = `${BRANCH_LABELS[this.workshopBranch]} ${romanTier(step.nextTier)} — ${step.cost} Hurda`;
      reason = `${step.cost - scrap} Hurda eksik`;
    } else {
      label = `${BRANCH_LABELS[this.workshopBranch]} ${romanTier(step.nextTier)} geliştir — ${step.cost} Hurda`;
      enabled = true;
    }
    const hovBtn = mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;
    // Etkin: yeşil çelik; kilitli: gri panel + üst tehlike şeridi
    // ("kilitli bölme" okunurluğu — doz plan §5 F3C-04).
    _csPanel(ctx, btn.x, btn.y, btn.w, btn.h, {
      accent: enabled ? "#63e6be" : "#3b4650",
      hover: enabled && hovBtn, glow: enabled && hovBtn,
      hazardTop: !enabled,
      fillTop: enabled ? (hovBtn ? "#1f513c" : "#173a2a") : "#161b20",
      fillBottom: enabled ? (hovBtn ? "#142f24" : "#0f241c") : "#0e1216",
    });
    ctx.fillStyle = enabled ? "#d8fff1" : "#8b9aa5";
    ctx.font = uiTitleFont(14);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, btn.x + btn.w / 2, btn.y + (reason ? 15 : btn.h / 2));
    if (reason) {
      ctx.fillStyle = "#8fa8ba";
      ctx.font = uiTextFont(10);
      ctx.fillText(reason, btn.x + btn.w / 2, btn.y + 30);
    }

    // Geri butonu (Esc ile aynı işlev)
    this.drawBackButton(ctx, "‹ Ana Menü");
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
    const tierText = step.ok ? `Kademe ${romanTier(step.nextTier)}` : "Tam Kalibrasyon";
    ctx.fillText(`${BRANCH_LABELS[branch]} — ${tierText}`, rect.x + 10, rect.y + 7);

    ctx.fillStyle = "#8fd9c4";
    ctx.font = uiTextFont(10);
    const effect = upgradeEffectText(def, up, branch);
    ctx.fillText(effect, rect.x + 10, rect.y + 23, rect.w - 20);

    ctx.fillStyle = "#8fa8ba";
    ctx.font = uiTextFont(9);
    let status;
    if (!step.ok) status = `Mevcut: ${romanTier(currentTier)} • geri alınamaz`;
    else if (level < step.requiredLevel) status = `Mevcut: ${romanTier(currentTier)} • Sv. ${step.requiredLevel} gerekli • ${step.cost} Hurda`;
    else status = `Mevcut: ${romanTier(currentTier)} • ${step.cost} Hurda • Sv. ${step.requiredLevel}`;
    ctx.fillText(status, rect.x + 10, rect.y + 39, rect.w - 20);
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
        if (r.action === "story") this.openStoryResume();
        else if (r.action === "workshop") this.openWorkshop();
        else if (r.action === "market") this.openMarket();
        else this.beginMode(r.action);
        return;
      }
    }
  }

  // ── Cephane Pazarı (MARKET) ─────────────────────────────────────────
  // Atölye ile aynı "robot seç → sağda işlem yap" kurgusu; sağda geliştirme
  // yerine satın alınabilir mühimmat kartları vardır. Alınan mermi robotun
  // deposuna (envanter) yazılır ve maç başında mermilere yüklenir; maç sonunda
  // harcanmayan kısım depoya döner (bkz. js/market.js).
  openMarket() {
    if (!this.marketSelectedId || !CHARACTERS.some((c) => c.id === this.marketSelectedId)) {
      const humanId = this.selectedChars && this.selectedChars[0] ? this.selectedChars[0].id : null;
      this.marketSelectedId = humanId || CHARACTERS[0].id;
    }
    this.marketPage = this._workshopPageOf(this.marketSelectedId);
    this.marketWeaponPage = 0;
    this.marketFx = null;
    this.marketNotice = null;
    hideOverlay();
    this.clearTurnInput();
    this.state = "MARKET";
    this.updateHud();
  }

  closeMarket() {
    this.marketFx = null;
    this.marketNotice = null;
    // Maç sonu Atölye düğmesinden gelinmiş olabilir (hikâye/festival bağlamı)
    if (this.mode === "story" || this.mode === "festival") { this.openStoryMap(); return; }
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

  // Seçili robot için mühimmat al. Önkoşullar market.js'te doğrulanır; arayüz
  // doğrudan bakiyeye/depoya dokunmaz. Başarısızlık sessiz kalmaz: nedeni kısa
  // bir yazıyla gösterilir.
  purchaseMarketAmmo(weaponId, qty) {
    const id = this.marketSelectedId;
    if (!id) return;
    const spec = weaponById(weaponId);
    const label = spec ? spec.name : "Cephane";
    const res = buyAmmo(this.profile, id, weaponId, qty || 1);
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

  changeMarketPage(dir) {
    const totalPages = Math.max(1, Math.ceil(CHARACTERS.length / (WS_COLS * WS_ROWS)));
    const next = this.marketPage + dir;
    if (next < 0 || next > totalPages - 1) return;
    SFX.uiClick();
    this.marketPage = next;
  }

  changeMarketWeaponPage(dir) {
    const totalPages = Math.max(1, Math.ceil(sellableWeapons().length / (MK_COLS * MK_ROWS)));
    const next = this.marketWeaponPage + dir;
    if (next < 0 || next > totalPages - 1) return;
    SFX.uiClick();
    this.marketWeaponPage = next;
  }

  renderMarket(ctx) {
    const W = this.W, H = this.H;
    drawClouds(ctx, W);
    ctx.fillStyle = "#000000cc";
    ctx.fillRect(0, 0, W, H);

    const scrap = this.profile ? this.profile.scrap : START_SCRAP;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffe45e";
    ctx.font = uiTitleFont(26);
    ctx.fillText("CEPHANE PAZARI", W / 2, 20);
    ctx.fillStyle = "#9fb6c9";
    ctx.font = uiTextFont(12);
    ctx.fillText("Robotuna mühimmat al — depo maç başında mermilere yüklenir, artanı maç sonunda geri döner", W / 2, 48);

    const mx = this.input.mouseX, my = this.input.mouseY;
    const perPage = WS_COLS * WS_ROWS;
    const totalPages = Math.max(1, Math.ceil(CHARACTERS.length / perPage));
    this.marketPage = Math.max(0, Math.min(this.marketPage, totalPages - 1));
    const pageStart = this.marketPage * perPage;
    const pageChars = CHARACTERS.slice(pageStart, pageStart + perPage);

    // ── Sol: sayfalı robot grid'i (Atölye yerleşimiyle aynı) ───────────
    const gx = 24, gy = 66, gridW = 452, gap = 8;
    const cardW = Math.floor((gridW - (WS_COLS - 1) * gap) / WS_COLS);
    const cardH = 88;
    this._marketCardRects = [];

    for (let i = 0; i < pageChars.length; i++) {
      const ch = pageChars[i];
      const col = i % WS_COLS, row = (i / WS_COLS) | 0;
      const cx = gx + col * (cardW + gap);
      const cy = gy + row * (cardH + gap);
      this._marketCardRects.push({ x: cx, y: cy, w: cardW, h: cardH, ch });
      const up = getRobotProgress(this.profile, ch.id);
      const depotN = ammoDepotTotal(up.ammo);
      const selected = ch.id === this.marketSelectedId;
      const hovered = mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH;

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
      });

      ctx.fillStyle = ch.color;
      ctx.font = uiTextFont(12, 700);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(ch.label, cx + cardW / 2, cyv + 58, cardW - 10);
      // Alt satır servis seviyesi yerine cephane deposunu gösterir: bu ekranda
      // oyuncunun aradığı bilgi "bu robotta ne kadar mermi var"dır.
      ctx.fillStyle = depotN > 0 ? "#8affc0" : "#9fb6c9";
      ctx.font = uiTextFont(9);
      ctx.fillText(depotN > 0 ? `Cephane ${depotN}` : "Cephane yok", cx + cardW / 2, cyv + 72);
    }

    // Robot sayfası gezinmesi
    this._marketPageRects = [];
    const navY = gy + WS_ROWS * cardH + (WS_ROWS - 1) * gap + 16, navW = 96, navH = 30;
    const prev = { x: gx, y: navY, w: navW, h: navH, dir: -1 };
    const next = { x: gx + gridW - navW, y: navY, w: navW, h: navH, dir: 1 };
    this._marketPageRects = [prev, next];
    for (const b of this._marketPageRects) {
      const canUse = (b.dir < 0 && this.marketPage > 0) || (b.dir > 0 && this.marketPage < totalPages - 1);
      const hov = canUse && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
      ctx.globalAlpha = canUse ? 1 : 0.35;
      _csPanel(ctx, b.x, b.y, b.w, b.h, { accent: hov ? "#ffe45e" : "#2a3848", hover: hov, glow: hov, rivets: false });
      ctx.fillStyle = "#cfe0ee";
      ctx.font = uiTextFont(13, 700);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.dir < 0 ? "‹ Geri" : "İleri ›", b.x + b.w / 2, b.y + b.h / 2);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#9fb6c9";
    ctx.font = uiTextFont(13, 700);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`Sayfa ${this.marketPage + 1} / ${totalPages}`, gx + gridW / 2, navY + navH / 2);

    // ── Sağ: seçili robotun mühimmat kartları ─────────────────────────
    const rx = 496, rw = W - rx - 24;
    const def = CHARACTERS.find((c) => c.id === this.marketSelectedId) || CHARACTERS[0];
    const depot = getRobotAmmo(this.profile, def.id);
    const depotN = ammoDepotTotal(depot);
    _csPanel(ctx, rx, gy, rw, MK_PANEL_H, { accent: "#2a3848", hazardTop: true });

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#eef5ff";
    ctx.font = uiTitleFont(16);
    ctx.fillText(`${def.label} · ${def.role}`, rx + 14, gy + 12);
    ctx.fillStyle = "#8fa8ba";
    ctx.font = uiTextFont(11);
    ctx.fillText(`Depo: ${depotN} / ${sellableWeapons().length * AMMO_DEPOT_CAP} mermi`, rx + 14, gy + 34);
    // Hurda bakiyesi: satın alma sonrası kısa süre parlar.
    const pulse = this.marketFx ? Math.max(0, 1 - this.marketFx.t / MK_FX_DURATION) : 0;
    ctx.textAlign = "right";
    ctx.fillStyle = `rgba(255,228,94,${0.8 + 0.2 * pulse})`;
    ctx.font = uiTitleFont(Math.round(14 + 3 * pulse));
    ctx.fillText(`Hurda: ${scrap}`, rx + rw - 14, gy + 20);
    // Alt sınır çizgisi: başlık ile kart ızgarasını ayırır.
    ctx.fillStyle = "#24313f";
    ctx.fillRect(rx + 12, gy + 54, rw - 24, 1);

    const weapons = sellableWeapons();
    const wPerPage = MK_COLS * MK_ROWS;
    const wPages = Math.max(1, Math.ceil(weapons.length / wPerPage));
    this.marketWeaponPage = Math.max(0, Math.min(this.marketWeaponPage, wPages - 1));
    const wStart = this.marketWeaponPage * wPerPage;
    const wPage = weapons.slice(wStart, wStart + wPerPage);

    const cellGap = 8, gridX = rx + 12, gridY = gy + 66;
    const cw = Math.floor((rw - 24 - (MK_COLS - 1) * cellGap) / MK_COLS);
    const chh = 58;
    this._marketWeaponRects = [];

    for (let i = 0; i < wPage.length; i++) {
      const spec = wPage[i];
      const col = i % MK_COLS, row = (i / MK_COLS) | 0;
      const cx = gridX + col * (cw + cellGap);
      const cy = gridY + row * (chh + cellGap);
      this._marketWeaponRects.push({ x: cx, y: cy, w: cw, h: chh, spec });

      const price = ammoPriceFor(spec);
      const have = depot[spec.id] || 0;
      const full = have >= AMMO_DEPOT_CAP;
      const affordable = scrap >= price;
      const hovered = mx >= cx && mx <= cx + cw && my >= cy && my <= cy + chh;
      const flashing = !!(this.marketFx && this.marketFx.weaponId === spec.id);
      const cyv = cy + (hovered ? -2 : 0);
      const enabled = !full && affordable;

      _csPanel(ctx, cx, cyv, cw, chh, {
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
        _csRoundRect(ctx, cx + 2, cyv + 2, cw - 4, chh - 4, 7);
        ctx.stroke();
        ctx.restore();
      }

      // Mermi tasarımı: HUD ile aynı çizici (Projectile.drawIcon)
      ctx.save();
      ctx.translate(cx + 4, cyv + 9);
      Projectile.drawIcon(ctx, spec, 40, { tail: false });
      ctx.restore();

      const tx = cx + 50, tw = cw - 58;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = full ? "#8b9aa5" : "#eef5ff";
      ctx.font = uiTextFont(12, 700);
      ctx.fillText(spec.name, tx, cyv + 8, tw);
      ctx.fillStyle = full ? "#ffb347" : "#8fa8ba";
      ctx.font = uiTextFont(10);
      ctx.fillText(`Taban ${spec.ammo} • Depo ${have}/${AMMO_DEPOT_CAP}`, tx, cyv + 26, tw);
      ctx.fillStyle = full ? "#8b9aa5" : affordable ? "#ffd166" : "#ff9b9b";
      ctx.font = uiTextFont(11, 700);
      ctx.fillText(full ? "Dolu" : `${price} Hurda ×1`, tx, cyv + 40, tw - 34);
      if (!full) {
        ctx.fillStyle = "#6d7f8d";
        ctx.font = uiTextFont(9);
        ctx.textAlign = "right";
        ctx.fillText(`Shift ×${AMMO_BULK_QTY}`, cx + cw - 8, cyv + 42);
      }
    }

    // Mühimmat sayfası gezinmesi
    this._marketWeaponPageRects = [];
    const wnavY = gridY + MK_ROWS * chh + (MK_ROWS - 1) * cellGap + 12;
    const wprev = { x: gridX, y: wnavY, w: 104, h: 30, dir: -1 };
    const wnext = { x: rx + rw - 12 - 104, y: wnavY, w: 104, h: 30, dir: 1 };
    this._marketWeaponPageRects = [wprev, wnext];
    for (const b of this._marketWeaponPageRects) {
      const canUse = (b.dir < 0 && this.marketWeaponPage > 0) || (b.dir > 0 && this.marketWeaponPage < wPages - 1);
      const hov = canUse && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
      ctx.globalAlpha = canUse ? 1 : 0.35;
      _csPanel(ctx, b.x, b.y, b.w, b.h, { accent: hov ? "#ffe45e" : "#2a3848", hover: hov, glow: hov, rivets: false });
      ctx.fillStyle = "#cfe0ee";
      ctx.font = uiTextFont(13, 700);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.dir < 0 ? "‹ Önceki" : "Sonraki ›", b.x + b.w / 2, b.y + b.h / 2);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#9fb6c9";
    ctx.font = uiTextFont(13, 700);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`${wStart + 1}–${Math.min(weapons.length, wStart + wPerPage)} / ${weapons.length}`, rx + rw / 2, wnavY + 15);

    // Geri bildirim satırı (eksik Hurda / dolu depo / başarılı satın alma)
    if (this.marketNotice) {
      const n = this.marketNotice;
      const a = Math.min(1, (MK_NOTICE_DURATION - n.t) / 0.35);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = n.color;
      ctx.font = uiTextFont(12, 700);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(n.text, rx + rw / 2, wnavY + 48);
      ctx.globalAlpha = 1;
    }

    this.drawBackButton(ctx, "‹ Ana Menü");
  }

  handleMarketClick(mx, my, shift) {
    if (this.hitBackButton(mx, my)) { SFX.uiClick(); this.closeMarket(); return; }
    for (const b of this._marketPageRects || []) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        this.changeMarketPage(b.dir);
        return;
      }
    }
    for (const b of this._marketWeaponPageRects || []) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        this.changeMarketWeaponPage(b.dir);
        return;
      }
    }
    for (const r of this._marketCardRects || []) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        if (this.marketSelectedId !== r.ch.id) {
          SFX.uiClick();
          this.marketSelectedId = r.ch.id;
          this.marketFx = null;
        }
        return;
      }
    }
    for (const r of this._marketWeaponRects || []) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        // Shift ile toplu alım (kartta da yazar: "Shift ×5").
        this.purchaseMarketAmmo(r.spec.id, shift ? AMMO_BULK_QTY : 1);
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
    ctx.fillText("DÖKÜMHANE-9", W / 2, H / 2 - 132);

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
    this.drawBackButton(ctx, "‹ Ana Menü");
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
      // Esc: bağlama göre geri/iptal — atışı iptal et, seçim ekranında geri git,
      // oyun içindeyse menüye dön.
      if (e.key === "Escape") { e.preventDefault(); this.goBack(); return; }
      // Hikâye ekranları: sahne ilerletme ve menü gezinme tamamen klavyeyle.
      if (this.state === "STORY_SCENE" && this.storySceneId && (e.key === "Enter" || e.code === "Space")) { e.preventDefault(); this.advanceStoryScene(); return; }
      if (this.handleStoryMenuKey(e)) return;
      // Atölye: ok tuşları sayfa/dal gezinir, Enter/Space satın alır.
      if (this.state === "WORKSHOP" && this.handleWorkshopKey(e)) return;
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
        if (this.state === "AIMING" && this.isHumanTurn() && this.active.jump()) SFX.jump();
      }
      if ((e.key === "q" || e.key === "Q") && this.state === "AIMING" && this.isHumanTurn()) {
        const kind = this.active.skillKind;
        if (useSkill(this.active, this)) {
          SFX.skill(kind);
          // Hasar veren modül turun atış hakkını doldurur: bu tur artık ateş
          // edilemez, sıra fizik yatıştıktan sonra biter.
          if (skillConsumesShot(kind)) this.spendSkillShot(this.active);
        }
        this.updateHud();
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
        this.handleMarketClick(this.input.mouseX, this.input.mouseY, e.shiftKey);
        return;
      }
      if (this.state === "STORY_SCENE") { this.handleStorySceneClick(this.input.mouseX, this.input.mouseY); return; }
      if (this.state === "STORY_MAP") { this.handleStoryMapClick(this.input.mouseX, this.input.mouseY); return; }
      if (this.state === "STORY_ROBOT_SELECT") { this.handleStoryRobotSelectClick(this.input.mouseX, this.input.mouseY); return; }
      if (this.state === "STORY_BRIEFING") { this.handleStoryBriefingClick(this.input.mouseX, this.input.mouseY); return; }
      if (this.state === "STORY_ARCHIVE") { this.handleStoryArchiveClick(this.input.mouseX, this.input.mouseY); return; }
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
        // Tekerlek hangi yarıdaysa o listeyi kaydırır: sol robotlar, sağ cephane.
        if (this.input.mouseX < 480) this.changeMarketPage(Math.sign(e.deltaY) || 1);
        else this.changeMarketWeaponPage(Math.sign(e.deltaY) || 1);
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
  }

  // Silah seçimi (yalnız AIMING). Mühimmatı olmayan silah atlanır.
  selectWeapon(i) {
    if (this.state !== "AIMING" || !this.isHumanTurn()) return;
    const a = this.active;
    if (!a || i < 0 || i >= WEAPONS.length || !a.hasAmmo(i)) return;
    if (a.weapon !== i) SFX.weaponSwitch();
    a.weapon = i;
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
    this.updateHud();
  }

  startCharge() {
    if (this.state !== "AIMING" || !this.isHumanTurn()) return;
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
      btn.setAttribute("aria-label", muted ? "Sesi aç" : "Sesi kapat");
      btn.title = `${muted ? "Sesi aç" : "Sesi kapat"} (M)`;
    }
    const label = document.getElementById("mute-label");
    if (label) label.textContent = muted ? "Sessiz" : "Ses";
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
  // Hikâye bağlamında çıkış kupa haritasına döner (Ana Menü değil).
  quitToMenu() {
    const storyContext = this.mode === "story" || this.mode === "festival";
    this.clearTurnInput();
    this.bot.cancel();
    for (const b of this.bots) b.cancel();
    this.reset();
    if (storyContext) this.openStoryMap();
  }

  // Bağlama duyarlı "geri/iptal": önce atış iptali, sonra ekranlar arası geri,
  // oyun içindeyse menüye dön. (Esc tuşu buraya bağlı.)
  goBack() {
    if (this.cancelCharge()) return;
    if (this.state === "MAP_SELECT") { this.mapBack(); return; }
    if (this.state === "CHAR_SELECT") { this.charBack(); return; }
    if (this.state === "WORKSHOP") { this.closeWorkshop(); return; }
    if (this.state === "MARKET") { this.closeMarket(); return; }
    // Hikâye ekranları hep kupa haritasına döner; haritadan çıkış menüye gider.
    if (this.state === "STORY_SCENE") { this.abortStoryScene(); return; }
    if (this.state === "STORY_ROBOT_SELECT" || this.state === "STORY_BRIEFING" || this.state === "STORY_ARCHIVE") { this.openStoryMap(); return; }
    if (this.state === "STORY_MAP") { this.state = "MODE_SELECT"; this.updateHud(); return; }
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

  // Bir atıcının güncel çıkış çarpanı: taban robot gücü × (normal silahta)
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
      const winner = alive[0];
      // Sonuç yalnız burada belirlenir; ödül de yalnız burada ve bir kez yazılır.
      // showOverlay ödül hesaplamaz, yalnız hazır sonuç modelini gösterir.
      const humanIdx = this.matchProgress ? this.matchProgress.humanIndex : 0;
      const result = winner ? (winner === this.players[humanIdx] ? "win" : "loss") : "draw";
      const reward = this.grantMatchReward(result);
      if (this.mode === "story" && this.storyMission) {
        // Hikâye akışı: ilerleme yalnız burada yazılır, sonra sonuç sahnesi
        // (varsa) ve overlay gösterilir.
        this.finishStoryMatch(result, reward);
        return;
      }
      if (this.mode === "festival") {
        // Kupa Festivali: ödül normal kapıyla yazılır; ilerlemeye dokunulmaz.
        const nextBtn = document.getElementById("story-next-btn");
        if (nextBtn) nextBtn.dataset.canNext = "0";
        showOverlay(
          winner ? `${winner.name} festival maçını kazandı! 🏆` : "Tahsis berabere kaldı!",
          winner ? "" : "İkisi de elendi.",
          reward,
          "story"
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
    this.turnTimer = TURN_DURATION;
    this.active.refreshStamina();
    this.state = "AIMING";
    SFX.turn();
    if (windChanged) SFX.windChange(windChanged.from, windChanged.to);
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

  // Uygun bir tek oyunculu maçın (bilgisayara karşı veya hikâye) ödülünü
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
    // Sahne oynatıcı: yazı animasyonu için kare başına güncelleme ister.
    // DOM katmanı burada da senkronlanır (updateHud sahne geçişinde bir kez
    // çağrılır; kaçan bir geçiş silah panelini sahnede bırakmasın).
    if (this.state === "STORY_SCENE") { this.updateStoryScene(dt); this.updateWeaponHud(); return; }
    if (this.state === "MODE_SELECT" || this.state === "DIFFICULTY_SELECT" || this.state === "BOT_COUNT_SELECT" || this.state === "CHAR_SELECT" || this.state === "COUNT_SELECT" || this.state === "MAP_SELECT" || this.state === "WORKSHOP" || this.state === "MARKET" || this.state === "STORY_MAP" || this.state === "STORY_ROBOT_SELECT" || this.state === "STORY_BRIEFING" || this.state === "STORY_ARCHIVE") {
      if (this.state === "WORKSHOP") this.updateWorkshopFx(dt);
      if (this.state === "MARKET") this.updateMarketFx(dt);
      // Menülerde updateHud yalnız geçiş anında çağrıldığından, yarıda kalan ya
      // da atlanan bir geçiş silah panelini menüde asılı bırakabiliyordu.
      // Panel görünürlüğü bu yüzden her karede durumdan türetilir (ucuz: oyun
      // dışındayken yalnız tek bir class toggle'ı yapar).
      this.updateWeaponHud();
      return;
    }

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
        let hitPlayer = null, hitAt = null;
        if (!offScreen) {
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
            if (pr.spec.mine) this.placeMine(res.x, res.y, pr.spec); // mayın: patlama yerine yerleş
            else this.explode(res.x, res.y, pr.spec);
          }
          continue; // pr.dead — ekrandan çıktı ya da patladı
        }
        this.projectiles.push(pr); // hayatta kalan
      }

      // Tüm mermiler (ve misket parçacıkları) bitince yerleşmeyi bekle
      if (this.projectiles.length === 0) {
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
      this.state !== "MODE_SELECT" && this.state !== "COUNT_SELECT" && this.state !== "CHAR_SELECT" && this.state !== "MAP_SELECT" && this.state !== "WORKSHOP";
    if (!inMatch) {
      const aspect = Math.max(1.2, Math.min(3.0, pxW / pxH));
      this.W = Math.round(this.H * aspect);
    }
    this._scaleX = pxW / this.W;
    this._scaleY = pxH / this.H;
  }

  // Pencere boyutu değişince alt HUD çapaları yeniden hesaplanır (inset tuval
  // ölçeğine bağlı olduğu için resize'da güncellenmeli).
  syncBottomHud() {
    const panel = document.getElementById("weapon-panel");
    if (!panel || panel.classList.contains("hidden")) return;  // gizliyken ölçüm 0 döner
    const cssH = this.canvas.clientHeight || 0;
    if (!cssH) return;
    const panelCss = panel.offsetHeight;
    if (!panelCss) return;
    // DOM güç barı + uyarı şeridi panelin üstünde dursun
    const above = panelCss + 18 + "px";
    const bar = document.getElementById("power-bar");
    if (bar) bar.style.bottom = above;
    const warn = document.getElementById("storage-warning");
    if (warn) warn.style.bottom = above;
    // Modül kartı (canvas) için mantıksal inset: CSS px -> dünya px
    this.hudBottomInset = panelCss * (this.H / cssH) + 14;
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
    if (this.state === "STORY_MAP") {
      this.renderStoryMap(ctx);
      return;
    }
    if (this.state === "STORY_SCENE") {
      this.renderStoryScene(ctx);
      return;
    }
    if (this.state === "STORY_ROBOT_SELECT") {
      this.renderStoryRobotSelect(ctx);
      return;
    }
    if (this.state === "STORY_BRIEFING") {
      this.renderStoryBriefing(ctx);
      return;
    }
    if (this.state === "STORY_ARCHIVE") {
      this.renderStoryArchive(ctx);
      return;
    }
    if (this.state === "MODE_SELECT") {
      this.renderModeSelect(ctx);
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
      drawSkillHud(ctx, this.active, this.W, this.H, this.hudBottomInset);
    }

    for (const pr of this.projectiles) pr.draw(ctx);
    for (const ex of this.explosions) ex.draw(ctx);
    this.drawDamagePopups(ctx);
    this.drawWindChangeFx(ctx);

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

    const arrow = direction > 0 ? "→" : "←";
    const label = `RÜZGÂR DEĞİŞTİ  ${arrow}  ${Math.abs(fx.to).toFixed(1)}`;
    ctx.globalAlpha = alpha * 0.94;
    ctx.font = uiTitleFont(18);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const width = ctx.measureText(label).width + 34;
    _csPanel(ctx, (this.W - width) / 2, 63, width, 38, { accent: "#9fe8ff", rivets: false });
    ctx.fillStyle = "#e9fbff";
    ctx.fillText(label, this.W / 2, 82);
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

      ctx.globalAlpha = upgradesOn ? 1 : 0.45;
      ctx.textAlign = "center";
      ctx.fillStyle = "#8fd9c4";
      ctx.font = uiTextFont(9);
      ctx.fillText(robotUpgradeSummary(up), cx + CARD_W / 2, cyv + SUMMARY_Y, CARD_W - 14);
      ctx.globalAlpha = 1;

      // ── Stat çubukları ────────────────────────────────────────
      const sx = cx + 12, statW = CARD_W - 24;
      _drawStatBar(ctx, sx, cyv + STAT_Y,             statW, "Bütünlük", `${ch.hp}`,                    ch.hp / 160,               "#5fdc6b");
      _drawStatBar(ctx, sx, cyv + STAT_Y + STAT_GAP,  statW, "Kaplama",  `${(ch.armor * 100) | 0}%`,    ch.armor / 0.30,            "#4ad1ff");
      _drawStatBar(ctx, sx, cyv + STAT_Y + STAT_GAP * 2, statW, "Çıkış", `×${ch.dmgMult.toFixed(1)}`, (ch.dmgMult - 0.7) / 0.5, "#ffaa33");

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
        ctx.fillText(b.dir < 0 ? "‹ Geri" : "İleri ›", b.x + b.w / 2, b.y + b.h / 2);
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
    this.drawBackButton(ctx, "‹ Geri");
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
        ctx.fillText(b.dir < 0 ? "‹ Geri" : "İleri ›", b.x + b.w / 2, b.y + b.h / 2);
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

  // Sol-üst köşeye "‹ Geri" butonu çiz ve hit-test için _backRect'i sakla.
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
    ctx.fillText(label || "‹ Geri", x + w / 2, y + h / 2);
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

    // Başlangıç noktası: SON atışın açısına göre namlu ucu (güncel nişandan bağımsız)
    const ox = a.x + Math.cos(ang) * (a.r + 12);
    const oy = (a.y - a.r) + Math.sin(ang) * (a.r + 12);
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
    // ortadaki büyük başlığı/butonları kapatıyor. Hikâye ekranları da aynı
    // kurala uyar: sahnenin "Enter/Space ile ilerlet" ipucu artık canvasa
    // çizilir (üst sağ) — DOM banner sahne başlığıyla çakışıyordu.
    const hud = document.getElementById("hud");
    if (hud) hud.classList.toggle("hidden",
      this.state === "MODE_SELECT" || this.state === "DIFFICULTY_SELECT" || this.state === "BOT_COUNT_SELECT" || this.state === "COUNT_SELECT" || this.state === "CHAR_SELECT" || this.state === "MAP_SELECT" || this.state === "WORKSHOP" ||
      this.state === "STORY_MAP" || this.state === "STORY_SCENE" || this.state === "STORY_ROBOT_SELECT" || this.state === "STORY_BRIEFING" || this.state === "STORY_ARCHIVE");

    const container = document.getElementById("players");
    if (container) {
      // Panel sayısını oyuncu sayısına eşitle (2–6; daha az oyuncuyla fazlalıkları sil)
      while (container.children.length < this.players.length) {
        const div = document.createElement("div");
        div.className = "player-info";
        container.appendChild(div);
      }
      while (container.children.length > this.players.length) {
        container.removeChild(container.lastChild);
      }
      // Her oyuncunun panelini güncelle
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        const el = container.children[i];
        if (!el) continue;
        const ready = p.skillCooldown === 0;
        const skillLine = p.charDef
          ? `<div class="skill-line ${ready ? "ready" : "cd"}">${p.charDef.skill.label}${ready ? " ✓" : ` (${p.skillCooldown}t)`}</div>`
          : "";
        // Aktif geliştirmesi olan insan robotunda adın yanında anahtar simgesi.
        const up = this.profile && p.charDef ? getRobotProgress(this.profile, p.charDef.id) : null;
        const hasUpgrades = isSinglePlayerProgressionMode(this.mode) && p.control !== "bot" && up && totalTiers(up) > 0;
        el.innerHTML =
          `<span class="name" style="color:${p.playerTint || p.color}">${i + 1}. ${p.name}${p.control === "bot" ? " 🤖" : ""}${hasUpgrades ? " 🔧" : ""}${p.alive ? "" : " ☠"}</span>` +
          `<div class="hpbar"><div class="hpfill" style="width:${Math.max(0, Math.min(100, p.hp / p.maxHp * 100))}%;background:${p.hp / p.maxHp > 0.4 ? "#5fdc6b" : "#ff6b6b"}"></div></div>` +
          skillLine;
        // Sıradaki oyuncuyu vurgula, eleneni soluklaştır
        el.classList.toggle("active", i === this.turn && this.state !== "GAMEOVER");
        el.classList.toggle("dead", !p.alive);
      }
    }
    const banner = document.getElementById("turn-banner");
    if (banner) {
      if (this.state === "MODE_SELECT") {
        banner.textContent = "Oyun modu seçiliyor…";
        banner.style.color = "#fff";
      } else if (this.state === "DIFFICULTY_SELECT") {
        banner.textContent = "Zorluk seçiliyor…";
        banner.style.color = "#fff";
      } else if (this.state === "BOT_COUNT_SELECT") {
        banner.textContent = "Rakip sayısı seçiliyor…";
        banner.style.color = "#fff";
      } else if (this.state === "COUNT_SELECT") {
        banner.textContent = "Oyuncu sayısı seçiliyor…";
        banner.style.color = "#fff";
      } else if (this.state === "CHAR_SELECT") {
        banner.textContent = `Oyuncu ${this.charSelectPhase + 1} robot seçiyor…`;
        banner.style.color = "#fff";
      } else if (this.state === "MAP_SELECT") {
        banner.textContent = "Fabrika bölgesi seçiliyor…";
        banner.style.color = "#fff";
      } else if (this.state === "WORKSHOP") {
        banner.textContent = "Atölye";
        banner.style.color = "#ffd166";
      } else if (this.state === "STORY_MAP") {
        banner.textContent = this.profile.story.endingSeen
          ? "Kupa Festivali — yıllık stres testi"
          : "Dokuz Bölge Kupası — Kupa Haritası";
        banner.style.color = "#ffd166";
      } else if (this.state === "STORY_SCENE") {
        banner.textContent = "Diyalog oynatılıyor — Enter/Space veya tıkla";
        banner.style.color = "#ffd166";
      } else if (this.state === "STORY_ROBOT_SELECT") {
        banner.textContent = "Saha robotu seçiliyor…";
        banner.style.color = "#ffd166";
      } else if (this.state === "STORY_BRIEFING") {
        banner.textContent = "Görev brifingi";
        banner.style.color = "#ffd166";
      } else if (this.state === "STORY_ARCHIVE") {
        banner.textContent = "Hikâye Arşivi";
        banner.style.color = "#ffd166";
      } else if (this.state === "GAMEOVER") {
        banner.textContent = "Tahsis Tamamlandı";
        banner.style.color = "#fff";
      } else {
        const t = Math.ceil(this.turnTimer);
        let statusText = this.active.control === "bot" && this.bot.status ? this.bot.status : "";
        // Ek bot durumları
        for (const b of this.bots) {
          if (b.status) statusText += ` | ${b.status}`;
        }
        banner.textContent = statusText
          ? `${statusText}  ⏱ ${t}s`
          : `Sıra: ${this.active.name}  ⏱ ${t}s`;
        banner.style.color = t <= 5 ? "#ff6b6b" : (this.active.playerTint || this.active.color);
      }
    }
    const wind = document.getElementById("wind-indicator");
    if (wind) {
      let windText;
      if (this.wind != null) {
        const dir = this.wind > 0 ? "→" : this.wind < 0 ? "←" : "•";
        windText = this.windChangeFx
          ? `Rüzgar değişti: ${dir} ${Math.abs(this.wind).toFixed(1)}`
          : `Rüzgar: ${dir} ${Math.abs(this.wind).toFixed(1)}`;
      } else {
        windText = "Rüzgar: -";
      }
      // aria-live bölgesini her karede yeniden yazıp ekran okuyucuyu spamleme.
      if (wind.textContent !== windText) wind.textContent = windText;
      wind.classList.toggle("wind-changed", !!this.windChangeFx);
    }
    this.updateWeaponHud();
  }

  // Silah çubuğu + seçili silahın açıklama paneli.
  // Kare başı maliyeti düşük tutmak için yalnızca (sıra|silah|durum|mühimmat)
  // değişince yeniden kurar.
  updateWeaponHud() {
    const panel = document.getElementById("weapon-panel");
    if (!panel) return;
    // Menüleri tek tek dışlamak güvenli değil: yeni bir STORY_* ekranı eklenince
    // önceki maçın oyuncuları bellekteyse panel o menüye sızabiliyor. Silahlar
    // yalnız gerçek savaş döngüsünün üç durumunda görünür.
    const playing = this.players.length > 0 &&
      (this.state === "AIMING" || this.state === "PROJECTILE" || this.state === "SETTLE");
    panel.classList.toggle("hidden", !playing);
    if (!playing) { this._weaponKey = null; return; }

    const a = this.active;
    if (!a) return;
    const key = this.turn + "|" + a.weapon + "|" + this.state + "|" +
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
      const ammo = a.ammo[spec.id];
      const ammoTxt = ammo === Infinity ? "∞" : ammo;
      desc.innerHTML =
        `<div class="wd-title"><canvas class="wd-preview" width="48" height="48"></canvas>` +
          `<span class="wd-title-text">${spec.name}</span></div>` +
        `<div class="wd-text">${spec.desc}</div>` +
        `<div class="wd-stats">` +
          statRow("Hasar", spec.stats.dmg) +
          statRow("Hız", spec.stats.speed) +
          statRow("Yarıçap", spec.stats.radius) +
        `</div>` +
        `<div class="wd-meta"><span class="wd-special">${spec.special}</span>` +
        `<span class="wd-ammo">Mühimmat: ${ammoTxt}</span></div>`;
      // Seçili silahın mermi önizlemesi (başlığın solunda)
      const previewCv = desc.querySelector("canvas.wd-preview");
      if (previewCv) this.paintProjectilePreview(previewCv, spec, 48);
    }
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

  // ── Hikâye modu (STORY_*) ─────────────────────────────────────────────────
  // Kupa haritası → giriş sahnesi → saha robotu seçimi → brifing → arena
  // rotasının tamamı mevcut durum makinesine eklenen beş durumla kurulur.
  // Savaş fiziği değişmez: kadro, harita ve rakipler görev verisinden gelir,
  // sıra/rüzgar/ödül akışı serbest maçınkini kullanır.

  // "HİKÂYE MODU" menü kartı: ilerleme varsa kayıtlı görevin brifingine gir
  // (Devam Et), boş veya bitmiş devrede kupa haritası/Arşiv'e yönlendir.
  openStoryResume() {
    const story = this.profile.story;
    const current = story.currentMissionId;
    if (story.endingSeen || !story.completedMissions.length ||
        !isMissionUnlocked(current, story.completedMissions)) {
      this.openStoryMap();
      return;
    }
    this.openStoryMission(current);
  }

  openStoryMap() {
    this.mode = "story";
    this.storyMissionId = null;
    this.storyMission = null;
    this.storyFocus = 0;
    this.clearTurnInput();
    // Kupa haritasına dönüş her zaman maç sonu overlay'ini kapatır: sahne
    // bittiğinde kart açık kalıp haritanın üstünde asılı kalabiliyordu.
    hideOverlay();
    this.state = "STORY_MAP";
    this.updateHud();
  }

  openStoryArchive() {
    this.mode = "story";
    this.storyFocus = 0;
    this.clearTurnInput();
    this.state = "STORY_ARCHIVE";
    this.updateHud();
  }

  // Görev kartına girildi: giriş sahnesi varsa oynat, yoksa robot seçimine.
  openStoryMission(missionId) {
    const mission = getMissionById(missionId);
    if (!mission || !isMissionUnlocked(missionId, this.profile.story.completedMissions)) return;
    this.storyMissionId = missionId;
    this.storyMission = mission;
    // Arena teması sahne/robot seçimi/brifing ekranlarında da okunur. Bunu
    // yalnız startStoryMission'da kurmak, kupa haritasından doğrudan gelen
    // oyunda saha robotu seçimini boş bırakıyordu (selectedMap null).
    this.selectedMap = getMapById(mission.mapId);
    if (mission.introSceneId && sceneById(mission.introSceneId)) {
      this.playStoryScene(mission.introSceneId, () => this.openStoryRobotSelect());
    } else {
      this.openStoryRobotSelect();
    }
  }

  // Sahne oynatıcı: kutu kutu ilerler, görülen sahne Arşiv'e işaretlenir.
  playStoryScene(sceneId, onDone) {
    const scene = sceneById(sceneId);
    if (!scene) { if (onDone) onDone(); return; }
    this.storySceneId = sceneId;
    this.storySceneIndex = 0;
    this.storySceneChars = 0;
    this.storySceneOnDone = onDone || null;
    this.storySceneStartMs = Date.now(); // fade-in için sahne başlangıcı
    if (!this.profile.story.seenScenes.includes(sceneId)) this.profile.story.seenScenes.push(sceneId);
    this.persistStory();
    this.clearTurnInput();
    SFX.sceneBip(scene.lines[0].speakerId); // ilk cümlenin başında konuşmacı bipli
    this.state = "STORY_SCENE";
    this.updateHud();
  }

  // Yazı animasyonu: her karede birkaç harf ilerler.
  updateStoryScene(dt) {
    const scene = sceneById(this.storySceneId);
    if (!scene) return;
    const line = scene.lines[this.storySceneIndex];
    if (line) this.storySceneChars = Math.min(line.text.length, this.storySceneChars + dt * STORY_SCENE_TYPE_SPEED);
  }

  // Sahne ilerletme: yazı bitmemisse tek basışta tamamlanır; son kutudan
  // sonra kayıtlı devamlılık çağrılır (robot seçimi / brifing / arşiv).
  advanceStoryScene() {
    const scene = sceneById(this.storySceneId);
    if (!scene) { this.endStoryScene(); return; }
    const line = scene.lines[this.storySceneIndex];
    if (line && this.storySceneChars < line.text.length) {
      this.storySceneChars = line.text.length;
      return;
    }
    if (this.storySceneIndex < scene.lines.length - 1) {
      this.storySceneIndex++;
      this.storySceneChars = 0;
      SFX.sceneBip(scene.lines[this.storySceneIndex].speakerId);
      return;
    }
    this.endStoryScene();
  }

  endStoryScene() {
    SFX.stopSceneBips(); // atlanan sahnenin sesi geride kalmaz (plan §21)
    const cb = this.storySceneOnDone;
    this.storySceneOnDone = null;
    this.storySceneId = null;
    if (cb) cb();
    else this.openStoryMap();
  }

  // Sahneyi bitirmeden çıkış (geri/Esc/geri butonu): bekleyen konuşmacı bipleri
  // ve devam çağrısı temizlenir, kupa haritasına dönülür. endStoryScene'den
  // farkı, sahnenin devamındaki ekrana (robot seçimi/brifing) geçmemesidir.
  abortStoryScene() {
    SFX.stopSceneBips();
    this.storySceneOnDone = null;
    this.storySceneId = null;
    this.openStoryMap();
  }

  openStoryRobotSelect() {
    this.storyFocus = 0;
    this.clearTurnInput();
    this.state = "STORY_ROBOT_SELECT";
    this.updateHud();
  }

  // 34 robotun tamamı açıktır; yalnız bu görevin rakipleri geçici kapalıdır.
  // Seçim profile yazılır ve sonraki görevlerde varsayılan olur (kilit §13).
  selectStoryRobot(robotId) {
    if (!this.storyMission || !selectableRobotsForMission(this.storyMission).includes(robotId)) return;
    this.profile.story.selectedRobotId = robotId;
    this.persistStory();
    SFX.uiClick();
    this.openStoryBriefing();
  }

  openStoryBriefing() {
    this.storyFocus = 0;
    this.clearTurnInput();
    this.state = "STORY_BRIEFING";
    this.updateHud();
  }

  // Brifingdeki zorluk seçimi kalıcıdır; maç kadrosunu etkilemez.
  cycleStoryDifficulty(dir) {
    const keys = Object.keys(STORY_DIFFICULTIES);
    const i = keys.indexOf(this.profile.story.difficulty);
    this.profile.story.difficulty = keys[(i + dir + keys.length) % keys.length];
    this.persistStory();
    SFX.uiClick();
  }

  // Görev verisinden kadro ve haritayı kurup mevcut startGame() akışını
  // kullanır. Önerilen seviye kapı değildir; denetim yalnız kilit grafiğidir.
  startStoryMission(missionId) {
    const mission = getMissionById(missionId);
    if (!mission || !isMissionUnlocked(missionId, this.profile.story.completedMissions)) return;
    const selectable = selectableRobotsForMission(mission);
    const chosen = this.profile.story.selectedRobotId;
    const robotId = selectable.includes(chosen) ? chosen : firstMissionRobotId(); // null/geçersiz → FIX-8
    const oppDefs = mission.opponents
      .map((id) => CHARACTERS.find((c) => c.id === id))
      .filter(Boolean);
    const playerDef = CHARACTERS.find((c) => c.id === robotId) || CHARACTERS[0];

    this.mode = "story";
    this.storyMissionId = missionId;
    this.storyMission = mission;
    this.difficulty = resolveStoryDifficulty(this.profile.story.difficulty).ai;
    this.selectedMap = getMapById(mission.mapId);
    this.selectedChars = [playerDef, ...oppDefs];
    this.playerControls = ["human", ...oppDefs.map(() => "bot")];
    this.bots = oppDefs.map(() => {
      const bot = new BotController();
      bot.difficulty = this.difficulty;
      return bot;
    });
    this.charSelectPhase = 0;
    hideOverlay();
    this.startGame();
    this.updateHud();
  }

  // Maç sonu: ilerleme YALNIZ burada ve bir kez yazılır (plan §18). Sonra
  // sonuç sahnesi (varsa), ardından overlay gösterilir.
  finishStoryMatch(result, reward) {
    const mission = this.storyMission || getMissionById(this.storyMissionId);
    if (!mission) { this.quitToMenu(); return; }
    const story = this.profile.story;
    if (result === "win") {
      if (!story.completedMissions.includes(mission.id)) story.completedMissions.push(mission.id);
      // Sıralı tut: kayıt okunur kalsın; Bakım Puanı zaten set mantığıyla türer.
      story.completedMissions.sort((a, b) => getMissionById(a).order - getMissionById(b).order);
      if (mission.winSceneId && sceneById(mission.winSceneId)) story.seenScenes.push(mission.winSceneId);
      const nextId = nextMissionId(mission.id);
      // Kayıt imleci yalnız İLERİ hareket eder: erken bir görevin rövanşı
      // oyuncuyu geride bırakılan göreve geri sarmaşmasın (F3-07 tekrar
      // oynama ilerlemeyi geri almaz).
      if (nextId && getMissionById(nextId).order > getMissionById(story.currentMissionId).order) {
        story.currentMissionId = nextId;
      } else if (!nextId) {
        story.endingSeen = true; // Ortak Vardiya tamamlandı: kupa festivali sürer
      }
    } else {
      // Yenilgi/beraberlik ilerlemeyi geri almaz; görev yeniden denenebilir.
      if (mission.lossSceneId && sceneById(mission.lossSceneId)) story.seenScenes.push(mission.lossSceneId);
    }
    this.persistStory();
    const sceneId = result === "win" ? mission.winSceneId : mission.lossSceneId;
    const after = () => this.showStoryOverlay(result, reward);
    // Ara sahne (F4-02): yalnız zafer sonrası ve yalnızca bu görevin ara
    // sahnesi yazılmışsa oynar (perde geçişleri / final öncesi).
    const midId = result === "win" ? mission.midSceneId : null;
    const playMidThenOverlay = () => {
      if (midId && sceneById(midId)) {
        if (!story.seenScenes.includes(midId)) story.seenScenes.push(midId);
        this.persistStory();
        this.playStoryScene(midId, after);
      } else after();
    };
    if (sceneId && sceneById(sceneId)) this.playStoryScene(sceneId, playMidThenOverlay);
    else playMidThenOverlay();
  }

  // Hikâye maç sonu overlay'i: düğme etiketleri mod bağlamına göre değişir.
  showStoryOverlay(result, reward) {
    const mission = this.storyMission || getMissionById(this.storyMissionId);
    const win = result === "win";
    // Maç bitti: durum GAMEOVER'a çekilir. Sahne oynatıcısından gelindiyse
    // STORY_SCENE'de kalmak, sahne kimliği temizlendiği için bir sonraki
    // render'da haritaya sessizce atlanmasına (kart asılı kalmasına) yol açıyordu.
    this.state = "GAMEOVER";
    const nextBtn = document.getElementById("story-next-btn");
    if (nextBtn) nextBtn.dataset.canNext = win && !this.profile.story.endingSeen ? "1" : "0";
    showOverlay(
      win ? `${mission.title} tamamlandı! 🏆` : `${mission.title} kazanılamadı`,
      win ? "" : "Görev yeniden denenebilir; ilerleme geri alınmaz.",
      reward,
      "story"
    );
    // Yenilgide düğme etiketi doğru dursun: tekrar etmek o görevdir.
    if (!win) {
      const restartBtn = document.getElementById("restart-btn");
      if (restartBtn) restartBtn.textContent = "Tekrar Oyna";
    }
  }

  // "Sonraki Etap": kayıtlı bir sonraki görevin giriş sahnesine girer.
  storyNextMission() {
    const story = this.profile.story;
    if (story.endingSeen || !isMissionUnlocked(story.currentMissionId, story.completedMissions)) {
      this.openStoryMap();
      return;
    }
    hideOverlay();
    this.openStoryMission(story.currentMissionId);
  }

  // Hikâye profiline dokunan her yazım tek kapıdan geçer; kayıt kullanılamıyorsa
  // tek seferlik uyarı gösterilir (profile.js ile aynı davranış).
  persistStory() {
    this.profile = normalizeProfile(this.profile);
    if (!saveProfile(this.profile)) notifyStorageFailure();
  }

  // Hikâye menü ekranlarında klavye gezinme. Brifingde ok tuşları zorluğu
  // değiştirir; diğer ekranlarda satır/kart seçimini gezinir.
  handleStoryMenuKey(e) {
    if (this.state === "STORY_BRIEFING") {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { this.cycleStoryDifficulty(-1); return true; }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { this.cycleStoryDifficulty(1); return true; }
      if (e.key === "Enter" || e.code === "Space") { e.preventDefault(); this.startStoryMission(this.storyMissionId); return true; }
      return false;
    }
    if (!this.state.startsWith("STORY_") || this.state === "STORY_SCENE") return false;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { if (this.storyFocus > 0) { this.storyFocus--; SFX.uiClick(); } return true; }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { this.storyFocus++; SFX.uiClick(); return true; }
    if (e.key === "Enter" || e.code === "Space") { e.preventDefault(); this.confirmStoryFocus(); return true; }
    return false;
  }

  // Klavye onayı duruma göre satırı/kartı çalıştırır (tıklama ile aynı rota).
  confirmStoryFocus() {
    if (this.state === "STORY_MAP") {
      const rows = this.storyRows();
      const row = rows[Math.min(this.storyFocus, rows.length - 1)];
      if (row && row.missionId === "__festival__") { this.openStoryFestival(); return; }
      if (row && row.status !== "locked") this.openStoryMission(row.missionId);
      return;
    }
    if (this.state === "STORY_ROBOT_SELECT") {
      const ids = selectableRobotsForMission(this.storyMission);
      const id = ids[Math.min(this.storyFocus, ids.length - 1)];
      if (id) this.selectStoryRobot(id);
      return;
    }
    if (this.state === "STORY_ARCHIVE") {
      const entries = this.profile.story.seenScenes.map((id) => ({ sceneId: id, info: storySceneInfo(id) }))
        .sort((a, b) => (a.info.mission ? a.info.mission.order : 99) - (b.info.mission ? b.info.mission.order : 99) || a.info.variant.localeCompare(b.info.variant));
      const entry = entries[Math.min(this.storyFocus, entries.length - 1)];
      if (entry) this.playStoryScene(entry.sceneId, () => this.openStoryArchive());
    }
  }

  // Kupa haritasındaki tıklanabilir görev satırları; storyRows() ile aynı
  // sırada üretilir (klavye gezinmesiyle çakışmasın).
  storyRows() {
    const out = [];
    for (const zoneId of STORY_CAMPAIGN.zoneOrder) {
      for (const mission of missionsForZone(zoneId)) {
        out.push({ missionId: mission.id, status: missionStatusOf(mission, this.profile.story) });
      }
    }
    // Epilog sonrası haritaya festival satırı düşer (klavye odağı da onu gösterir).
    if (this.profile.story.endingSeen) out.push({ missionId: "__festival__", status: "open" });
    return out;
  }

  // Kupa Festivali (Faz A): epilog sonrası yıllık stres testi. Rastgele arena
  // ve rakipler; ödül normal formülle yazılır, kampanya ilerlemesine
  // dokunulmaz (finishStoryMatch çağrılmaz). Epilogun "festival her yıl
  // düzenlenir" sözünü oynanışa bağlar.
  openStoryFestival() {
    const chosen = this.profile.story.selectedRobotId;
    const playerDef = CHARACTERS.find((c) => c.id === chosen) || CHARACTERS[0];
    const pool = CHARACTERS.filter((c) => c.id !== playerDef.id);
    const oppCount = 1 + Math.floor(Math.random() * 3);
    const oppDefs = [];
    while (oppDefs.length < oppCount) {
      const cand = pool[Math.floor(Math.random() * pool.length)];
      if (!oppDefs.some((d) => d.id === cand.id)) oppDefs.push(cand);
    }
    this.mode = "festival";
    this.storyMissionId = null;
    this.storyMission = null;
    this.difficulty = resolveStoryDifficulty(this.profile.story.difficulty).ai;
    this.selectedMap = MAPS[Math.floor(Math.random() * MAPS.length)];
    this.selectedChars = [playerDef, ...oppDefs];
    this.playerControls = ["human", ...oppDefs.map(() => "bot")];
    this.bots = oppDefs.map(() => {
      const bot = new BotController();
      bot.difficulty = this.difficulty;
      return bot;
    });
    this.charSelectPhase = 0;
    hideOverlay();
    this.startGame();
    this.updateHud();
  }

  // "Sonraki Etap": kayıtlı bir sonraki görevin giriş sahnesine girer.
  handleStoryMapClick(mx, my) {
    for (const r of this._storyMissionRects || []) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        if (r.status === "locked") { SFX.uiClick(); return; }
        this.openStoryMission(r.missionId);
        return;
      }
    }
    if (this.hitRect(this._storyArchiveRect, mx, my)) { SFX.uiClick(); this.openStoryArchive(); return; }
    if (this._storyFestivalRect && this.hitRect(this._storyFestivalRect, mx, my)) { SFX.uiClick(); this.openStoryFestival(); return; }
    if (this.hitBackButton(mx, my)) { SFX.uiClick(); this.state = "MODE_SELECT"; this.updateHud(); return; }
  }

  handleStorySceneClick(mx, my) {
    if (this.hitBackButton(mx, my)) { SFX.uiClick(); this.abortStoryScene(); return; }
    if (this.hitRect(this._storySkipRect, mx, my)) { SFX.uiClick(); this.endStoryScene(); return; }
    this.advanceStoryScene();
  }

  handleStoryRobotSelectClick(mx, my) {
    for (const r of this._storyRobotRects || []) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        this.selectStoryRobot(r.robotId);
        return;
      }
    }
    if (this.hitRect(this._backRect, mx, my)) { this.openStoryMap(); return; }
  }

  handleStoryBriefingClick(mx, my) {
    for (const r of this._storyDiffRects || []) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        this.profile.story.difficulty = r.diff;
        this.persistStory();
        SFX.uiClick();
        return;
      }
    }
    if (this.hitRect(this._storyStartRect, mx, my)) { this.startStoryMission(this.storyMissionId); return; }
    if (this.hitRect(this._backRect, mx, my)) { this.openStoryMap(); return; }
  }

  handleStoryArchiveClick(mx, my) {
    for (const r of this._storyArchiveEntryRects || []) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        this.playStoryScene(r.sceneId, () => this.openStoryArchive());
        return;
      }
    }
    if (this.hitRect(this._backRect, mx, my)) { this.openStoryMap(); return; }
  }

  // Küçük çarpı/panel hit yardımcı: menü kartlarında tekrar eden test.
  hitRect(rect, x, y) {
    if (!rect) return false;
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  renderStoryMap(ctx) {
    const W = this.W, H = this.H;
    drawClouds(ctx, W);
    ctx.fillStyle = "#000000bb"; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(26);
    ctx.fillText("DOKUZ BÖLGE KUPASI", W / 2, 12);

    const points = maintenancePoints(this.profile.story);
    ctx.fillStyle = "#cfe0ee"; ctx.font = uiTextFont(12);
    ctx.fillText(`Atölye Bakım Puanı: ${points.total} / 270`, W / 2, 40);

    const curt = new Set(curtailedZones(this.profile.story));
    const cardW = Math.floor((W - 4 * 12) / 3), cardH = 132, gap = 12;
    const startX = (W - (3 * cardW + 2 * gap)) / 2, startY = 62;
    this._storyMissionRects = [];

    // Bölgeleri boru hattıyla bağla (devre soldan sağa okunur).
    const centers = STORY_CAMPAIGN.zoneOrder.map((zoneId, i) => {
      const col = i % 3, row = (i / 3) | 0;
      return { x: startX + col * (cardW + gap) + cardW / 2, y: startY + row * (cardH + gap) + cardH / 2 };
    });
    ctx.strokeStyle = "#3b526b"; ctx.lineWidth = 3;
    for (let i = 0; i < centers.length - 1; i++) {
      const a = centers[i], b = centers[i + 1];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    for (let i = 0; i < STORY_CAMPAIGN.zoneOrder.length; i++) {
      const zoneId = STORY_CAMPAIGN.zoneOrder[i];
      const zone = STORY_ZONES.find((z) => z.zoneId === zoneId);
      const col = i % 3, row = (i / 3) | 0;
      const x = startX + col * (cardW + gap), y = startY + row * (cardH + gap);
      const inCur = curt.has(zoneId);
      // Kart içerigi (kilit §12): bölge kodu, görev durumu, ev sahibi
      // şampiyonlar, toplanan teknik kanıt, Bakım Puanı ve arşiv işareti.
      const zoneBP = points.zones[zoneId] || 0;
      const zoneEvidence = collectedEvidence(this.profile.story).filter((e) => e.zoneId === zoneId);
      const archived = missionsForZone(zoneId).some((m) =>
        this.profile.story.seenScenes.some((s) => s.startsWith(`scene_${m.id}_`)));
      // Bölge kartı: kısıntıda kırmızı kenar + koyu kızıl tint. İç köşeler
      // kod/rozet metinleriyle dolu — perçin kapalı (çakışmasın).
      _csPanel(ctx, x, y, cardW, cardH, {
        accent: inCur ? "#ff7b7b" : "#3b526b",
        fillTop: inCur ? "#1a1013" : null, fillBottom: inCur ? "#100b0d" : null,
        rivets: false,
      });

      // Bölge kodu + sağ üstte Bakım Puanı ve arşiv rozeti. Kısıntı yalnız
      // renkle değil metinle bildirilir (plan §18).
      ctx.fillStyle = inCur ? "#ff9b9b" : "#63e6be";
      ctx.font = uiTextFont(10, 700); ctx.textAlign = "left";
      ctx.fillText(zone.zoneCode, x + 10, y + 10);
      ctx.textAlign = "right";
      ctx.fillStyle = zoneBP > 0 ? "#ffe45e" : "#5c6b7a";
      ctx.fillText(`BP ${zoneBP}${archived ? "  📖" : ""}`, x + cardW - 10, y + 10);
      ctx.textAlign = "left";
      ctx.fillStyle = inCur ? "#ffb3b3" : "#eef5ff"; ctx.font = uiTitleFont(14);
      ctx.fillText(zone.zoneLabel, x + 10, y + 24);
      ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(10);
      ctx.fillText(inCur ? "KISINTIDA — bantlar bekliyor" : zone.fearText, x + 10, y + 42, cardW - 20);
      // Ev sahibi şampiyonları küçük etiketlerle listele.
      const champs = zone.representativeIds
        .map((id) => { const d = CHARACTERS.find((c) => c.id === id); return d ? d.label : id; })
        .join(" • ");
      ctx.fillStyle = "#5c6b7a"; ctx.font = uiTextFont(9);
      ctx.fillText(`Şampiyonlar: ${champs}`, x + 10, y + 55, cardW - 20);

      // Görev satırları (bölge başına 1–2 görev): tıklanabilir + klavye odağı.
      let ry = y + 72;
      for (const mission of missionsForZone(zoneId)) {
        const status = missionStatusOf(mission, this.profile.story);
        const rowRect = { x: x + 10, y: ry, w: cardW - 20, h: 20, missionId: mission.id, status };
        const rowIndex = this._storyMissionRects.length;
        this._storyMissionRects.push(rowRect);
        const hovered = this.hitRect(rowRect, this.input.mouseX, this.input.mouseY);
        const focused = rowIndex === Math.min(this.storyFocus, this._storyMissionRects.length - 1);
        if (hovered || (focused && status !== "locked")) {
          ctx.fillStyle = "#1c2a3c"; _csRoundRect(ctx, rowRect.x - 2, rowRect.y - 1, rowRect.w + 4, rowRect.h + 2, 6); ctx.fill();
        }
        ctx.fillStyle = status === "locked" ? "#5c6b7a" : status === "done" ? "#8aff8a" : "#ffe45e";
        ctx.font = uiTextFont(11, 700);
        ctx.fillText(status === "locked" ? "🔒" : status === "done" ? "✓" : "▶", rowRect.x, rowRect.y + 3);
        ctx.fillStyle = status === "locked" ? "#5c6b7a" : "#eef5ff";
        ctx.font = uiTextFont(11);
        ctx.fillText(mission.title, rowRect.x + 18, rowRect.y + 4, rowRect.w - 22);
        // Teknik kanıt toplandıysa görev satırında rozet göster.
        if (status === "done" && zoneEvidence.some((e) => e.missionId === mission.id)) {
          ctx.fillStyle = "#ffd166"; ctx.font = uiTextFont(10, 700); ctx.textAlign = "right";
          ctx.fillText("🧾", rowRect.x + rowRect.w, rowRect.y + 4);
          ctx.textAlign = "left";
        }
        ry += 24;
      }
    }

    // Alt şerit: Arşiv + (epilog sonrası) Festival + Ana Menü (geri butonu).
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(11); ctx.textAlign = "center";
    ctx.fillText(`Toplanan teknik kanıt: ${collectedEvidence(this.profile.story).length} / 9  •  Hurda: ${this.profile.scrap}`, W / 2, H - 42);
    this._storyArchiveRect = { x: 24, y: H - 42, w: 128, h: 30 };
    _csPanel(ctx, this._storyArchiveRect.x, this._storyArchiveRect.y, this._storyArchiveRect.w, this._storyArchiveRect.h, { accent: "#3b526b", rivets: false });
    ctx.fillStyle = "#cfe0ee"; ctx.font = uiTextFont(12, 700); ctx.textBaseline = "middle";
    ctx.fillText("Hikâye Arşivi", this._storyArchiveRect.x + this._storyArchiveRect.w / 2, this._storyArchiveRect.y + 15);

    // Kupa Festivali düğmesi: yalnız epilog oynandıktan sonra (endingSeen).
    if (this.profile.story.endingSeen) {
      this._storyFestivalRect = { x: W / 2 - 92, y: H - 42, w: 184, h: 30 };
      const fFocused = this.storyFocus >= this._storyMissionRects.length;
      const fHover = this.hitRect(this._storyFestivalRect, this.input.mouseX, this.input.mouseY);
      _csPanel(ctx, this._storyFestivalRect.x, this._storyFestivalRect.y, this._storyFestivalRect.w, this._storyFestivalRect.h, {
        accent: fHover || fFocused ? "#ffe45e" : "#63e6be",
        hover: fHover || fFocused, glow: fHover || fFocused, rivets: false,
      });
      ctx.fillStyle = "#63e6be"; ctx.font = uiTextFont(12, 700);
      ctx.fillText("Kupa Festivali ▸", this._storyFestivalRect.x + this._storyFestivalRect.w / 2, this._storyFestivalRect.y + 15);
    } else {
      this._storyFestivalRect = null;
    }
    this._backRect = { x: W - 104, y: H - 42, w: 80, h: 30 };
    this.drawBackButton(ctx, "‹ Ana Menü");
  }

  renderStoryScene(ctx) {
    const W = this.W, H = this.H;
    const scene = sceneById(this.storySceneId);
    if (!scene) { this.endStoryScene(); return; }
    // Sahne arka planı görevin bölge paletini kullanır (plan §10.5).
    const mission = STORY_MISSIONS.find((m) => m.introSceneId === scene.id || m.winSceneId === scene.id || m.lossSceneId === scene.id || m.midSceneId === scene.id);
    const theme = getMapById(mission ? mission.mapId : "kopek");
    // Sahne açılışı: 300 ms yumuşak fade-in (Math.random yok — kilit §16).
    const fade = Math.min(1, (Date.now() - (this.storySceneStartMs || Date.now())) / 300);
    ctx.globalAlpha = fade;
    drawSky(ctx, W, H, theme);
    drawBackdrop(ctx, W, H, theme);
    drawClouds(ctx, W, theme.cloud);
    ctx.fillStyle = "#00000099"; ctx.fillRect(0, 0, W, H);

    const line = scene.lines[Math.min(this.storySceneIndex, scene.lines.length - 1)];
    const isSystem = line.speakerId === "system";
    const def = isSystem ? null : CHARACTERS.find((c) => c.id === line.speakerId);
    const name = isSystem ? "MERKEZ" : def ? def.label : line.speakerId;
    const accent = isSystem ? "#9fb6c9" : def ? def.color : "#cfe0ee";

    // Alt diyalog sayfası: endüstriyel panel (fade globalAlpha'sı paneli de
    // yumuşakça soldurur). Portre çerçevesi ve iç öğeler aynen kalır.
    const sheet = { x: 24, y: H - 172, w: W - 48, h: 152 };
    _csPanel(ctx, sheet.x, sheet.y, sheet.w, sheet.h, { accent: "#3b526b" });

    // Portre: ikinci bir çizici yazılmaz; mevcut drawRobot büyük çizilir.
    ctx.fillStyle = "#06090b"; _csRoundRect(ctx, sheet.x + 14, sheet.y + 16, 116, 116, 10); ctx.fill();
    ctx.strokeStyle = isSystem ? "#3b526b" : def.accent || "#63e6be"; ctx.lineWidth = 2;
    _csRoundRect(ctx, sheet.x + 14, sheet.y + 16, 116, 116, 10); ctx.stroke();
    if (def) {
      // Konuşan portre hafifçe nefes alır: sin tabanlı, deterministic bobbing.
      const bob = Math.sin((this.renderTimeMs || 0) / 320) * 2;
      drawRobot(ctx, { cx: sheet.x + 72, cy: sheet.y + 80 + bob, r: 38, facing: 1, charDef: def, timeMs: this.renderTimeMs || 0, motion: { vx: 0, vy: 0, onGround: true } });
    } else {
      // Merkezi sistem: eski prosedür dili konuşan sanayi monitörü.
      ctx.fillStyle = "#1c2833"; _csRoundRect(ctx, sheet.x + 40, sheet.y + 40, 64, 68, 6); ctx.fill();
      ctx.fillStyle = "#7baeff"; ctx.fillRect(sheet.x + 50, sheet.y + 52, 44, 6);
      ctx.fillStyle = "#ffcb69"; ctx.fillRect(sheet.x + 50, sheet.y + 64, 44, 6);
      ctx.fillStyle = "#4aff9f"; ctx.fillRect(sheet.x + 50, sheet.y + 76, 28, 6);
    }

    const tx = sheet.x + 148, tw = sheet.w - 172;
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillStyle = isSystem ? "#cfe0ee" : def ? def.color : "#eef5ff";
    ctx.font = uiTitleFont(14);
    ctx.fillText(name, tx, sheet.y + 12);

    const shown = line.text.slice(0, Math.floor(this.storySceneChars));
    ctx.fillStyle = "#eef5ff"; ctx.font = uiTextFont(15);
    const rows = _wrapCanvasText(ctx, shown, tw);
    rows.slice(0, STORY_SCENE_MAX_ROWS).forEach((r, i) => ctx.fillText(r, tx, sheet.y + 36 + i * 20, tw));

    // x/y ilerleme göstergesi + "ilerlet" işaretçisi: metin tamamlandysa
    // yanıp sönen ok yazının bitişiği beklediğini gösterir.
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(12, 700); ctx.textAlign = "right";
    ctx.fillText(`${this.storySceneIndex + 1}/${scene.lines.length}`, sheet.x + sheet.w - 16, sheet.y + 12);
    if (this.storySceneChars >= line.text.length) {
      ctx.fillStyle = accent;
      ctx.font = uiTitleFont(14);
      const pulse = Math.sin((this.renderTimeMs || 0) / 260) > 0;
      ctx.fillText(pulse ? "▼" : "", sheet.x + sheet.w - 16, sheet.y + 12 + 18);
    }

    // Sahneyi Atla eylemi — panel dili (hover'da sarı kenar + parıltı)
    this._storySkipRect = { x: sheet.x + sheet.w - 132, y: sheet.y + sheet.h - 38, w: 118, h: 28 };
    const skipHover = this.hitRect(this._storySkipRect, this.input.mouseX, this.input.mouseY);
    _csPanel(ctx, this._storySkipRect.x, this._storySkipRect.y, this._storySkipRect.w, this._storySkipRect.h, {
      accent: skipHover ? "#ffe45e" : "#3b526b",
      hover: skipHover, glow: skipHover, rivets: false,
    });
    ctx.fillStyle = "#cfe0ee"; ctx.font = uiTextFont(12, 700); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Sahneyi Atla ▸", this._storySkipRect.x + this._storySkipRect.w / 2, this._storySkipRect.y + 14);

    // Üst bağlam rozeti: görev — bölge, küçük panel çipi içinde. HUD bu
    // ekranda gizli; sahne başlığı tamamen canvasa aittir. İlerletme ipucu
    // (eski DOM banner metni) sağ üst köşeye taşındı.
    const ctxLine = mission ? `${mission.title} — ${theme.zoneLabel}` : theme.zoneLabel;
    ctx.font = uiTextFont(12, 700);
    const chipW = Math.ceil(ctx.measureText(ctxLine).width) + 22;
    _csPanel(ctx, W / 2 - chipW / 2, 8, chipW, 24, { accent: "#3b526b", rivets: false });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#ffe45e";
    ctx.fillText(ctxLine, W / 2, 14);
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(11);
    ctx.textAlign = "right";
    ctx.fillText("İlerlet: Enter / Space / tık", W - 24, 13);
    // Sahneden çıkış (Esc ile aynı rota). Sahne tıklaması metni ilerlettiği
    // için geri butonu ilerletmeden önce kontrol edilir.
    this.drawBackButton(ctx, "‹ Kupa Haritası");
    ctx.globalAlpha = 1; // fade yalnız bu sahne çiziminde geçerli
  }

  renderStoryRobotSelect(ctx) {
    const W = this.W, H = this.H;
    drawClouds(ctx, W);
    ctx.fillStyle = "#000000bb"; ctx.fillRect(0, 0, W, H);
    const zone = STORY_ZONES.find((z) => z.zoneId === this.storyMission.zoneId);
    // Arena etiketi görev verisinden türetilir; selectedMap bir sebeple boşsa
    // bile seçim ekranı çizilmeye devam eder.
    const arena = this.selectedMap || getMapById(this.storyMission.mapId);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(22);
    ctx.fillText("Saha robotu seç", W / 2, 10);
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(12);
    ctx.fillText(`${this.storyMission.title} • ${zone.zoneLabel} • Arena: ${arena.label}`, W / 2, 36);

    const selectable = selectableRobotsForMission(this.storyMission);
    const cardW = 92, cardH = 74, gap = 8, cols = 7;
    const gridW = cols * cardW + (cols - 1) * gap;
    const startX = Math.round((W - gridW) / 2), startY = 64;
    this._storyRobotRects = [];
    const mx = this.input.mouseX, my = this.input.mouseY;

    for (let i = 0; i < CHARACTERS.length; i++) {
      const ch = CHARACTERS[i];
      const col = i % cols, row = (i / cols) | 0;
      const cx = startX + col * (cardW + gap), cy = startY + row * (cardH + gap);
      const allowed = selectable.includes(ch.id);
      const selected = ch.id === (this.profile.story.selectedRobotId || firstMissionRobotId());
      const hovered = mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH;
      this._storyRobotRects.push({ x: cx, y: cy, w: cardW, h: cardH, robotId: ch.id });

      ctx.globalAlpha = allowed ? 1 : 0.4;
      // Endüstriyel panel kart; hover lift yalnız seçilebilir kartta.
      const cyv = cy + (hovered && allowed ? -2 : 0);
      _csPanel(ctx, cx, cyv, cardW, cardH, {
        accent: selected ? "#63e6be" : hovered && allowed ? "#ffe45e" : "#2a3848",
        hover: hovered && allowed, glow: hovered && allowed, selected,
        fillTop: selected ? "#1b2b1f" : null, fillBottom: selected ? "#122015" : null,
      });

      drawRobot(ctx, { cx: cx + cardW / 2, cy: cyv + 28, r: 15, facing: 1, charDef: ch, timeMs: this.renderTimeMs || 0, motion: { vx: 0, vy: 0, onGround: true } });
      ctx.fillStyle = ch.color; ctx.font = uiTextFont(11, 700); ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(ch.label, cx + cardW / 2, cyv + 52, cardW - 8);
      if (!allowed) {
        ctx.fillStyle = "#ff9b9b"; ctx.font = uiTextFont(9, 700);
        ctx.fillText("Rakip 🔒", cx + cardW / 2, cyv + 64);
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(11);
    ctx.fillText("Rakip robotlar bu görevde seçilemez; seçim sonraki görevlerde de geçerlidir", W / 2, H - 26);
    this._backRect = { x: 24, y: H - 56, w: 128, h: 32 };
    this.drawBackButton(ctx, "‹ Kupa Haritası");
  }

  renderStoryBriefing(ctx) {
    const W = this.W, H = this.H;
    drawClouds(ctx, W);
    ctx.fillStyle = "#000000bb"; ctx.fillRect(0, 0, W, H);
    const mission = this.storyMission;
    const zone = STORY_ZONES.find((z) => z.zoneId === mission.zoneId);
    const level = levelForXp(getRobotProgress(this.profile, this.profile.story.selectedRobotId || firstMissionRobotId()).xp);
    const arena = this.selectedMap || getMapById(mission.mapId);

    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(24);
    ctx.fillText(mission.title, W / 2, 10);
    ctx.fillStyle = "#cfe0ee"; ctx.font = uiTextFont(13);
    ctx.fillText(`${zone.zoneLabel} • Arena: ${arena.label} (${arena.arenaCode}) • Önerilen Seviye: ${mission.recommendedLevel}`, W / 2, 38);

    // Rakip kadrosu: veriden gelir; görev dışı seçim sunulmaz.
    const oppCount = mission.opponents.length;
    const oppY = 64;
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(12, 700);
    ctx.fillText(`${oppCount} rakip`, W / 2 - 90, oppY + 12);
    let ox = W / 2 - 50;
    for (const id of mission.opponents) {
      const def = CHARACTERS.find((c) => c.id === id);
      drawRobot(ctx, { cx: ox, cy: oppY + 30, r: 17, facing: 1, charDef: def, timeMs: this.renderTimeMs || 0, motion: { vx: 0, vy: 0, onGround: true } });
      ctx.fillStyle = "#eef5ff"; ctx.font = uiTextFont(11, 700); ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(def.label, ox, oppY + 52);
      ox += 46;
    }

    // Zorluk seçimi: kadro değişmez, yalnız bot zekâsı değişir.
    ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(12, 700); ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("Vardiya zorluğu", W / 2, 140);
    const keys = Object.keys(STORY_DIFFICULTIES);
    const bw2 = 150, bh2 = 34, gap2 = 12;
    const dxs = W / 2 - (keys.length * bw2 + (keys.length - 1) * gap2) / 2;
    this._storyDiffRects = [];
    for (let i = 0; i < keys.length; i++) {
      const d = STORY_DIFFICULTIES[keys[i]];
      const sel = keys[i] === this.profile.story.difficulty;
      const x = dxs + i * (bw2 + gap2);
      const hovered = this.hitRect({ x, y: 160, w: bw2, h: bh2 }, this.input.mouseX, this.input.mouseY);
      this._storyDiffRects.push({ x, y: 160, w: bw2, h: bh2, diff: keys[i] });
      _csPanel(ctx, x, 160, bw2, bh2, {
        accent: sel ? "#4aff4a" : hovered ? "#ffe45e" : "#3b526b",
        hover: hovered, glow: hovered, selected: sel,
        fillTop: sel ? "#1e3a26" : null, fillBottom: sel ? "#12251a" : null,
      });
      ctx.fillStyle = sel ? "#8aff8a" : "#eef5ff"; ctx.font = uiTextFont(12, 700); ctx.textBaseline = "middle";
      ctx.fillText(d.label, x + bw2 / 2, 177);
    }

    // Hazırlık bilgisi: seviye kapı değildir; geliştirmeler insan robotunda etkin.
    const up = getRobotProgress(this.profile, this.profile.story.selectedRobotId || firstMissionRobotId());
    const playerDef = CHARACTERS.find((c) => c.id === (this.profile.story.selectedRobotId || firstMissionRobotId()));
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#cfe0ee"; ctx.font = uiTextFont(12);
    ctx.fillText(`${playerDef.label} • Servis Seviyesi ${levelForXp(up.xp)} • Atölye geliştirmesi: ${totalTiers(up)}/9 • Hurda: ${this.profile.scrap}`, W / 2, 210);

    // Görevin kanıtı: kazanılacak teknik ölçüm (kilit §7). Son görevde yoktur.
    if (mission.evidence) {
      ctx.fillStyle = "#ffd166"; ctx.font = uiTextFont(11, 700);
      ctx.fillText(`Kanıt: ${mission.evidence.label}`, W / 2, 228);
    }

    // Öğretici paketi (yalnız ilk üç görevde, yalnız burada).
    let ty = 238;
    for (const tid of mission.tutorials) {
      const bundle = STORY_TUTORIALS[tid];
      if (!bundle) continue;
      ctx.fillStyle = "#ffd166"; ctx.font = uiTextFont(12, 700);
      ctx.fillText(`Öğretici: ${bundle.title}`, W / 2, ty);
      ty += 18;
      for (const text of bundle.lines) {
        ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(11);
        for (const row of _wrapCanvasText(ctx, text, 560)) { ctx.fillText(row, W / 2, ty); ty += 15; }
      }
      ty += 6;
    }

    // Başla düğmesi. Geri → kupa haritası.
    this._storyStartRect = { x: W / 2 - 90, y: H - 56, w: 180, h: 36 };
    const startHover = this.hitRect(this._storyStartRect, this.input.mouseX, this.input.mouseY);
    // Ekranın birincil eylemi: tehlike şeritli büyük başlat paneli
    _csPanel(ctx, this._storyStartRect.x, this._storyStartRect.y, this._storyStartRect.w, this._storyStartRect.h, {
      accent: "#ffe45e", hover: startHover, glow: startHover, hazardTop: true,
    });
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(15); ctx.textBaseline = "middle";
    ctx.fillText("Maçı Başla ▶", W / 2, this._storyStartRect.y + 18);
    this._backRect = { x: 24, y: H - 48, w: 136, h: 32 };
    this.drawBackButton(ctx, "‹ Kupa Haritası");
  }

  renderStoryArchive(ctx) {
    const W = this.W, H = this.H;
    drawClouds(ctx, W);
    ctx.fillStyle = "#000000bb"; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#ffe45e"; ctx.font = uiTitleFont(24);
    ctx.fillText("Hikâye Arşivi", W / 2, 12);
    // Başlık altı tehlike şeridi — arşiv ekranında başlık bölgesi geniş
    _csHazardStrip(ctx, W / 2 - 110, 44, 220, 4);
    const entries = this.profile.story.seenScenes
      .map((id) => ({ sceneId: id, info: storySceneInfo(id) }))
      .sort((a, b) => (a.info.mission ? a.info.mission.order : 99) - (b.info.mission ? b.info.mission.order : 99) || a.info.variant.localeCompare(b.info.variant));

    if (!entries.length) {
      ctx.fillStyle = "#9fb6c9"; ctx.font = uiTextFont(13);
      ctx.fillText("Henüz izlenen sahne yok. Görev oynadıkça sahneler burada birikir.", W / 2, 90);
    } else {
      this._storyArchiveEntryRects = [];
      const rowH = 28, startX2 = W / 2 - 300;
      let ry = 64;
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const rect = { x: startX2, y: ry, w: 600, h: 24 };
        this._storyArchiveEntryRects.push({ ...e, ...rect });
        const hovered = this.hitRect(rect, this.input.mouseX, this.input.mouseY);
        const focused = i === Math.min(this.storyFocus, entries.length - 1);
        if (hovered || focused) { ctx.fillStyle = "#1c2a3c"; _csRoundRect(ctx, rect.x - 4, rect.y - 2, rect.w + 8, rect.h + 4, 6); ctx.fill(); }
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#cfe0ee"; ctx.font = uiTextFont(12);
        ctx.fillText(`${e.info.mission ? e.info.mission.title : "?"} — ${e.info.label}`, rect.x + 10, ry + rect.h / 2);
        ctx.fillStyle = "#5c6b7a"; ctx.font = uiTextFont(10); ctx.textAlign = "right";
        ctx.fillText("▶ yeniden izle", rect.x + rect.w, ry + rect.h / 2);
        ry += rowH;
      }
    }
    this._backRect = { x: 24, y: H - 48, w: 152, h: 32 };
    this.drawBackButton(ctx, "‹ Kupa Haritası");
  }
}

/* ---- hikâye modu yardımcıları ---- */

// Diyalog kutusunun yazı animasyon hızı (harf/saniye).
const STORY_SCENE_TYPE_SPEED = 45;
// Bir kutu aynı anda en fazla bu kadar satır gösterir; kalanını ilerletme
// basışı tamam saysa da veri sözleşmesi kutuyu 3 satırda tutmayı önerir.
const STORY_SCENE_MAX_ROWS = 5;

// Tek oyunculu ilerleme modları: bilgisayara karşı ve hikâye. Her ikisinde
// insan robotunda Atölye geliştirmeleri etkindir ve maç ödülü yazılır.
// game.js'teki tüm mode === "computer" kontrolleri bu kapıdan geçer.
function isSinglePlayerProgressionMode(mode) {
  return mode === "computer" || mode === "story" || mode === "festival";
}

// Canvas metin kaydırma: kelime kelime kırar; diyalog ve brifing metinleri
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

// Sahne kimliğinden (scene_<missionId>_<variant>) görev ve kutu etiketi üret.
// Arşiv listesi bu bilgiyi kullanır; bilinmeyen kimlikler soru işaretiyle
// görünür ama oyunu engellemez.
const STORY_SCENE_VARIANT_LABELS = { intro: "Giriş", win: "Zafer", loss: "Yenilgi", mid: "Ara" };
function storySceneInfo(sceneId) {
  const mission = STORY_MISSIONS.find((m) => sceneId.startsWith(`scene_${m.id}_`)) || null;
  const variant = mission ? sceneId.slice(`scene_${mission.id}_`.length) : "";
  return { mission, variant, label: STORY_SCENE_VARIANT_LABELS[variant] || variant || "Sahne" };
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
  return `${weight ? weight + " " : ""}${px}px "Chakra Petch", "Segoe UI", sans-serif`;
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

// Ana panel. opts:
//   accent    — kenarlık rengi (varsayılan çelik mavisi #3b526b)
//   hover     — açık dolgu + (glow ile) parıltı
//   glow      — hover parıltısı açık/kapalı
//   selected  — kalın kenarlık (seçili durum)
//   rivets    — köşe perçinleri (küçük butonlarda false)
//   hazardTop — üst kenarda tehlike şeridi
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
// Her gösterimde düğmeler varsayılana döner; hikâye bağlamı "story" moduyla
// kendi etiketlerini yazar (Kupa Haritası / Atölye / Sonraki Etap).
function showOverlay(title, sub, reward, mode) {
  const storyNextBtn = document.getElementById("story-next-btn");
  if (storyNextBtn) storyNextBtn.classList.add("hidden");
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
  if (mode === "story") {
    const menuBtn = document.getElementById("menu-btn");
    if (menuBtn) menuBtn.textContent = "Kupa Haritası";
    const workshopBtn = document.getElementById("workshop-btn");
    if (workshopBtn) workshopBtn.textContent = "Atölye";
    const restartBtn = document.getElementById("restart-btn");
    if (restartBtn) restartBtn.textContent = "Tekrar Etap";
    if (storyNextBtn && storyNextBtn.dataset.canNext === "1") storyNextBtn.classList.remove("hidden");
  }
}
function hideOverlay() {
  document.getElementById("overlay").classList.add("hidden");
}

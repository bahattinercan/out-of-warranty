/* Yıkılabilir arazi.
 * Çarpışma için bir "solid" maskesi (Uint8Array), çizim için offscreen canvas.
 * Patlama = maskeyi ve canvas'ı destination-out ile daire şeklinde sil.
 */
// Tema verilmezse kullanılacak varsayılan (klasik yeşil bahçe görünümü).
// drawSky de bu temayı okuyabildiğinden gökyüzü/bulut alanları da burada.
const _DEFAULT_THEME = {
  style: null,            // null = stil rastgele seçilir (eski davranış)
  sky: ["#7ec8ff", "#cfefff"],
  orb: "#fff3c4",
  dirt: "#6b4a2b",
  grassDeep: "#3fa34d",
  grassTop: "#57c267",
  cloud: "#ffffffcc",
};

class Terrain {
  constructor(width, height, theme) {
    this.w = width;
    this.h = height;
    this.version = 0; // bot kararlarının arazi değişince geçersizleşmesi için
    // Çevrimiçi (F3c): yetkili host, oyduğu kraterleri burada biriktirir ve
    // misafire gönderir (js/net/adapter.js > netFlushTerrain). Misafir tarafında
    // kayıt KAPALIDIR: hostun kayıtlarını oynatır, kendi kuyruğu büyümez.
    this.changes = [];
    this.recordChanges = false;
    // Harita teması: renkler + arazi stili. Eksik alanlar varsayılana düşer.
    this.theme = Object.assign({}, _DEFAULT_THEME, theme || {});
    this.solid = new Uint8Array(width * height); // 1 = dolu, 0 = boş (mantıksal çözünürlük)
    // Görsel katman, mantıksal çözünürlüğün ss katı kadar büyüktür ki oyun
    // ekrana büyütülünce arazi bulanıklaşmasın. Çarpışma maskesi (solid)
    // her zaman mantıksal w×h'de kalır; ctx ölçeklendiği için tüm çizim kodu
    // mantıksal koordinatları kullanmaya devam eder.
    this.ss = 2;
    this.canvas = document.createElement("canvas");
    this.canvas.width = width * this.ss;
    this.canvas.height = height * this.ss;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.scale(this.ss, this.ss);
    // Oyuk katmanı: arazi oyulunca arka plan sanatı değil koyu toprak kesiti
    // görünsün diye profilin ALTINA basılan opak katman (buildVoidLayer).
    this.voidCanvas = null;
    this.voidCtx = null;
    this.generate();
  }

  generate() {
    const { w, h } = this;
    this.solid.fill(0);

    const heights = this.buildProfile();
    this.surface = heights;

    // Maskeyi profile göre doldur
    for (let x = 0; x < w; x++) {
      const top = Math.max(0, Math.floor(heights[x]));
      for (let y = top; y < h; y++) this.solid[y * w + x] = 1;
    }

    // Köprü, raf ve tünel gibi tek yüzey profiliyle anlatılamayan parçalar.
    // Katı ve boş geometri aynı kayıttan hem maskeye hem görsele uygulanır.
    this.applyLayoutMask();

    this.gaps = [];          // artık uçurum yok
    this.paintTerrain(heights);
    this.paintLayoutGeometry();
    this.buildVoidLayer();
  }

  /* ── Oyuk katmanı (krater/tünel kesiti) ──────────────────────────────────
   * Neden var: `destroy()` pikselleri `destination-out` ile TAMAMEN siler, yani
   * delik alfa 0 olur ve arkasındaki her şey görünür. Arka planda ufuk haze'i
   * (drawBackdrop > _drawHaze) zeminden ~3 kat parlak olduğu için krater
   * "saydam, parlayan yama" gibi okunuyordu (ölçüm: zemin rgb(35,26,26),
   * delik rgb(103,67,53); kullanıcı bildirimi "vurulan yerler saydam").
   * Çözüm: maskeden türetilen profilin altına OPAK koyu katman basmak. Oyulan
   * yer artık arka planı değil koyu toprağı gösterir; kraterin gökyüzüne taşan
   * üst dilimi doğal olarak gökyüzü kalır (patlama ağzı).
   * Profil MASKEDEN okunur (netHeightsFromMask ile aynı kural): tünel/mağara
   * bir sütunu tamamen boşalttıysa o sütuna oyuk basılmaz, gökyüzüne koyu
   * şerit düşmez. Görsel katman olduğu için maske/hash/protokole dokunmaz. */
  _maskHeights() {
    const { w, h, solid } = this;
    const heights = new Array(w);
    for (let x = 0; x < w; x++) {
      let top = h;
      for (let y = 0; y < h; y++) {
        if (solid[y * w + x]) { top = y; break; }
      }
      heights[x] = top;
    }
    return heights;
  }

  buildVoidLayer() {
    const { w, h, ss } = this;
    if (!this.voidCanvas) {
      this.voidCanvas = document.createElement("canvas");
      this.voidCanvas.width = w * ss;
      this.voidCanvas.height = h * ss;
      this.voidCtx = this.voidCanvas.getContext("2d");
      this.voidCtx.scale(ss, ss);
    }
    const ctx = this.voidCtx;
    const dirt = this.theme.dirt;
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, _shade(dirt, -0.62));
    g.addColorStop(1, _shade(dirt, -0.90));
    ctx.fillStyle = g;
    const heights = this._maskHeights();
    for (let x = 0; x < w; x++) {
      const top = Math.max(0, Math.floor(heights[x]));
      if (top < h) ctx.fillRect(x, top, 1, h - top);
    }
    // Kesit katmanları: oyuğun arka duvarında yatay toprak şeritleri okunsun
    // (düz siyah daire yerine "kazılmış toprak" hissi). Gradient koyu olduğu
    // için şeritler AÇIK tonlardan seçilir; koyu şerit görünmezdi.
    ctx.fillStyle = _shadeA(dirt, 0.16, 0.34);
    ctx.fillRect(0, h * 0.70, w, 7);
    ctx.fillRect(0, h * 0.87, w, 5);
    ctx.fillStyle = _shadeA(dirt, -0.10, 0.30);
    ctx.fillRect(0, h * 0.79, w, 3);
    this.voidProfile = heights;
  }

  /* Oyulan kenara toprak kesiti duvarı basar: açılan deliğin çevresinde kesim
   * gölgesi + taze toprak şeridi + sönümlenen dış bant. `source-atop` kullanılır
   * → yalnız KALAN arazi piksellerine dokunur; silinmiş delik ve gökyüzü
   * etkilenmez (boya deliğin içine taşamaz). Deterministik: rastgelelik yok,
   * çevrimiçi iki taraf aynı görüntüyü üretir. */
  paintCutBands(ctx, shapes) {
    const dirt = this.theme.dirt;
    // Bantlar ince tutulur: kalın halka "gözlük" gibi duruyordu (görsel kontrol).
    // Sıra: kesim gölgesi (deliğin hemen dışı) → kırılmış toprak → dışa sönüm.
    const bands = [
      { d: 1.0, w: 2.5, color: _shadeA(dirt, -0.55, 0.75) },
      { d: 3.6, w: 3.0, color: _shadeA(dirt, 0.10, 0.28) },
      { d: 7.5, w: 4.0, color: _shadeA(dirt, -0.22, 0.18) },
    ];
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    for (const b of bands) {
      ctx.lineWidth = b.w;
      ctx.strokeStyle = b.color;
      ctx.beginPath();
      for (const shape of shapes) shape(ctx, b.d + b.w / 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Her maçta farklı, eğlenceli arazi: yumuşak tepeler + rastgele karakter
  // (engebeli / tek büyük tepe / çift tepeli vadi) + platolar.
  buildProfile() {
    const { w, h } = this;
    if (this.theme.layout) return mapLayoutProfile(this.theme.layout, w, h);
    const heights = new Float32Array(w);

    // Harita "karakteri": tema bir stil dayatır (her karaktere özgü his); tema
    // yoksa rastgele seçilir. İç rastgelelik korunur → her maç yine farklı.
    // Arketip varsa taban yumuşak ("rolling") kalır ki skill şekli net okunsun;
    // yoksa rastgele stil seçilir (eski davranış).
    const style = this.theme.style ||
      (this.theme.archetype ? "rolling"
        : ["rolling", "peak", "twin", "rugged"][Math.floor(Math.random() * 4)]);
    const baseline = h * (0.56 + Math.random() * 0.10);  // 0.56h–0.66h

    // Stile göre dalga seti
    let waves;
    if (style === "rugged") {
      // Çok engebeli: daha kısa dalga boyları, daha sık iniş-çıkış
      waves = [
        { amp: 38 + Math.random() * 30, len: 300 + Math.random() * 160, phase: Math.random() * 6.28 },
        { amp: 26 + Math.random() * 18, len: 130 + Math.random() * 70,  phase: Math.random() * 6.28 },
        { amp: 12 + Math.random() * 10, len: 55  + Math.random() * 40,  phase: Math.random() * 6.28 },
      ];
    } else {
      // Yumuşak temel
      waves = [
        { amp: 48 + Math.random() * 40, len: 440 + Math.random() * 240, phase: Math.random() * 6.28 },
        { amp: 18 + Math.random() * 16, len: 180 + Math.random() * 90,  phase: Math.random() * 6.28 },
        { amp: 7  + Math.random() * 9,  len: 70  + Math.random() * 50,  phase: Math.random() * 6.28 },
      ];
    }
    // İnce detay oktavı: tüm stillere doğal mikro-pürüz katar
    waves.push({ amp: 3 + Math.random() * 3, len: 22 + Math.random() * 18, phase: Math.random() * 6.28 });

    for (let x = 0; x < w; x++) {
      let y = baseline;
      for (const wv of waves) y -= wv.amp * Math.sin((x / wv.len) * Math.PI * 2 + wv.phase);
      heights[x] = y;
    }

    // Arketip varsa skill'i öne çıkaran şekli uygula; yoksa eski stil + plato.
    if (this.theme.archetype) {
      this.shapeArchetype(heights, this.theme.archetype);
    } else {
      // Stil eklentileri (Gauss tümsek/çukur ile)
      if (style === "peak") {
        // Ortada tek büyük tepe + iki yana küçük etek tepeler (daha doğal dağ)
        this.addBump(heights, w * (0.42 + Math.random() * 0.16), 150 + Math.random() * 70, 90 + Math.random() * 50);
        this.addBump(heights, w * (0.16 + Math.random() * 0.06), 80, 28 + Math.random() * 16);
        this.addBump(heights, w * (0.78 + Math.random() * 0.06), 80, 28 + Math.random() * 16);
      } else if (style === "twin") {
        // İki yanda tepe, ortada vadi (kapışma için klasik)
        this.addBump(heights, w * 0.28, 120, 70 + Math.random() * 40);
        this.addBump(heights, w * 0.72, 120, 70 + Math.random() * 40);
        this.addBump(heights, w * 0.50, 140, -(50 + Math.random() * 40)); // çukur
        // tepe sırtlarını hafif düzleştir → çatı/plato hissi
        this.flatten(heights, w * 0.28, 34, true);
        this.flatten(heights, w * 0.72, 34, true);
      } else if (style === "rugged") {
        // Dar sırtlar + sığ bir dere (oyun-güvenli; son clamp ile sınırlı)
        this.addBump(heights, w * (0.28 + Math.random() * 0.10), 22, 24 + Math.random() * 12);
        this.addBump(heights, w * (0.60 + Math.random() * 0.10), 20, 22 + Math.random() * 12);
        this.addBump(heights, w * 0.50, 26, -(18 + Math.random() * 14));
      }

      // 1–2 düz plato/mesa: siper + zıplama hedefi
      const plateaus = Math.random() < 0.6 ? (Math.random() < 0.4 ? 2 : 1) : 0;
      for (let i = 0; i < plateaus; i++) {
        const pw  = 70 + Math.random() * 90;
        const pcx = w * (0.22 + Math.random() * 0.56);
        const px0 = Math.max(0, Math.floor(pcx - pw / 2));
        const px1 = Math.min(w - 1, Math.ceil(pcx + pw / 2));
        const top = Math.min(heights[px0], heights[px1]) - (28 + Math.random() * 42);
        const edge = 18; // kenar yumuşatma
        for (let x = px0; x <= px1; x++) {
          const d = Math.min(x - px0, px1 - x);
          const blend = Math.min(1, d / edge);
          heights[x] = heights[x] * (1 - blend) + Math.min(heights[x], top) * blend;
        }
      }
    }

    // Spawn sütunlarını düzleştir → karakter eğimde kaymadan otursun
    this.flattenSpawns(heights);

    // Profili güvenli aralığa sıkıştır (ekrandan taşmasın)
    for (let x = 0; x < w; x++) heights[x] = Math.max(60, Math.min(h - 60, heights[x]));
    return heights;
  }

  layoutRect(rect) {
    return {
      x: Math.max(0, Math.round(rect.x * this.w)),
      y: Math.max(0, Math.round(rect.y * this.h)),
      w: Math.max(1, Math.round(rect.w * this.w)),
      h: Math.max(1, Math.round(rect.h * this.h)),
    };
  }

  fillMaskRect(rect, value) {
    const r = this.layoutRect(rect);
    const maxX = Math.min(this.w, r.x + r.w);
    const maxY = Math.min(this.h, r.y + r.h);
    for (let y = r.y; y < maxY; y++) {
      for (let x = r.x; x < maxX; x++) this.solid[y * this.w + x] = value;
    }
  }

  applyLayoutMask() {
    const layout = this.theme.layout;
    if (!layout) return;
    for (const rect of layout.solids || []) this.fillMaskRect(rect, 1);
    for (const rect of layout.cuts || []) this.fillMaskRect(rect, 0);
  }

  paintLayoutGeometry() {
    const layout = this.theme.layout;
    if (!layout) return;
    const ctx = this.ctx;

    // Ek platformlar da ana zeminin malzemesini taşır. Bunlar dekor değil,
    // mermi ve robotlarla çarpışan gerçek arazi parçalarıdır.
    for (const spec of layout.solids || []) {
      const r = this.layoutRect(spec);
      const grad = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      grad.addColorStop(0, this.theme.grassDeep);
      grad.addColorStop(Math.min(1, 9 / r.h), this.theme.dirt);
      grad.addColorStop(1, this.theme.dirt);
      ctx.fillStyle = grad;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = this.theme.grassTop;
      ctx.fillRect(r.x, r.y, r.w, 4);
      ctx.fillStyle = "rgba(10,18,24,.35)";
      ctx.fillRect(r.x, r.y + r.h - 3, r.w, 3);
      ctx.strokeStyle = "rgba(235,245,225,.34)";
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + .5, r.y + .5, Math.max(0, r.w - 1), Math.max(0, r.h - 1));
      if (r.w > 18 && r.h > 10) {
        ctx.strokeStyle = "rgba(18,26,30,.36)";
        ctx.beginPath();
        for (let x = r.x + 12; x < r.x + r.w - 4; x += 22) {
          ctx.moveTo(x, r.y + 7); ctx.lineTo(x, r.y + r.h - 5);
        }
        ctx.stroke();
      }
    }

    // Tünel boşlukları, ana yüzey çizildikten sonra gerçekten silinir. Böylece
    // görüntü ile çarpışma maskesi aynı üst-alt yolu gösterir. Delik koyu oyuk
    // katmanını gösterir (buildVoidLayer) ve kenarına toprak kesiti basılır.
    for (const spec of layout.cuts || []) {
      const r = this.layoutRect(spec);
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.strokeStyle = "rgba(15,12,12,0.65)";
      ctx.lineWidth = 4;
      ctx.strokeRect(r.x + 2, r.y + 2, Math.max(1, r.w - 4), Math.max(1, r.h - 4));
      ctx.restore();
      // Kraterlerle aynı kesit dili: tünel ağzında da toprak katmanları.
      this.paintCutBands(ctx, [
        (c, d) => c.rect(r.x - d, r.y - d, r.w + d * 2, r.h + d * 2),
      ]);
    }

    // Buz kırığı: kesitin iki duvarına katman ve çatlak çizgileri ekle. Maske
    // boş kalır; böylece düşüş/ölüm fiziği görsel kenarla bire bir örtüşür.
    for (const cliff of layout.cliffs || []) {
      const left = cliff.x * this.w, right = (cliff.x + cliff.w) * this.w;
      const top = cliff.y * this.h;
      for (const edgeX of [left, right]) {
        const inward = edgeX === left ? 1 : -1;
        const shade = ctx.createLinearGradient(edgeX, 0, edgeX + inward * 18, 0);
        shade.addColorStop(0, "#1a354a");
        shade.addColorStop(.45, "#547f96");
        shade.addColorStop(1, "rgba(160,221,239,.04)");
        ctx.fillStyle = shade;
        ctx.fillRect(edgeX, top, inward * 18, this.h - top);
        ctx.strokeStyle = "rgba(235,252,255,.92)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(edgeX, top); ctx.lineTo(edgeX + inward * 4, top + 20);
        ctx.lineTo(edgeX, top + 47); ctx.lineTo(edgeX + inward * 5, top + 77);
        ctx.stroke();
        ctx.strokeStyle = "rgba(88,199,230,.72)";
        ctx.lineWidth = 1.5;
        for (let y = top + 28; y < this.h - 12; y += 52) {
          ctx.beginPath(); ctx.moveTo(edgeX + inward * 3, y);
          ctx.lineTo(edgeX + inward * (8 + (y % 11)), y + 13); ctx.stroke();
        }
      }
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .42;
      const glow = ctx.createLinearGradient(left, top, right, top);
      glow.addColorStop(0, "#e4fcff"); glow.addColorStop(.5, "#40abd6"); glow.addColorStop(1, "#e4fcff");
      ctx.fillStyle = glow; ctx.fillRect(left, top - 2, right - left, 4);
      ctx.restore();
    }
  }

  // Bir bölgeyi düzleştir: useMin=true → en yüksek noktaya (düz çatı/plato),
  // aksi halde yerel ortalamaya (spawn pad'i). Kenarlar yumuşatılır.
  flatten(heights, cx, half, useMin) {
    const w = this.w;
    const x0 = Math.max(0, Math.floor(cx - half));
    const x1 = Math.min(w - 1, Math.ceil(cx + half));
    let val = useMin ? Infinity : 0, n = 0;
    for (let x = x0; x <= x1; x++) {
      if (useMin) val = Math.min(val, heights[x]);
      else { val += heights[x]; n++; }
    }
    if (!useMin) val /= Math.max(1, n);
    const edge = 14;
    for (let x = x0; x <= x1; x++) {
      const d = Math.min(x - x0, x1 - x);
      const b = Math.min(1, d / edge);
      heights[x] = heights[x] * (1 - b) + val * b;
    }
  }

  // İki spawn sütununu (0.18w, 0.82w) yerel ortalamaya düzleştir.
  flattenSpawns(heights) {
    const w = this.w;
    const pads = this.theme.layout && this.theme.layout.s ? this.theme.layout.s : [.18, .82];
    for (const x of pads) this.flatten(heights, w * x, 32, false);
  }

  // ── Skill arketipleri: karakterin yeteneğini öne çıkaran arazi şekli ──────
  // Hepsi addBump/flatten ile tek-değerli yükseklik alanı üzerinde çalışır
  // (oyun-güvenli: dik duvar yok, geniş sigma → tırmanılabilir; son clamp sınırlar).
  shapeArchetype(heights, arch) {
    switch (arch) {
      case "arena":    this.shapeArena(heights); break;
      case "vertical": this.shapeVertical(heights); break;
      case "open":     this.shapeOpen(heights); break;
      case "thick":    this.shapeThick(heights); break;
      case "lane":     this.shapeLane(heights); break;
      case "bastion":  this.shapeBastion(heights); break;
    }
  }

  // Yakın dövüş/AoE: iki yan plato + ortada alçak düz buluşma alanı.
  shapeArena(heights) {
    const w = this.w;
    this.addBump(heights, w * 0.30, 130, 55);
    this.addBump(heights, w * 0.70, 130, 55);
    this.flatten(heights, w * 0.50, 95, false);  // orta düz buluşma alanı
    this.flatten(heights, w * 0.30, 40, true);   // yan platolar düz
    this.flatten(heights, w * 0.70, 40, true);
  }

  // Zıplama/süzülme: kademeli yüksek platformlar + orta mesa (vantaj).
  shapeVertical(heights) {
    const w = this.w;
    this.addBump(heights, w * 0.50, 110, 95); this.flatten(heights, w * 0.50, 55, true);
    this.addBump(heights, w * 0.30, 70, 55);  this.flatten(heights, w * 0.30, 34, true);
    this.addBump(heights, w * 0.70, 70, 55);  this.flatten(heights, w * 0.70, 34, true);
    this.addBump(heights, w * 0.40, 50, 30);
    this.addBump(heights, w * 0.60, 50, 30);
  }

  // Güçlü/mermi atış: geniş açık + iki yanda (spawn yakını) vantaj tepesi.
  shapeOpen(heights) {
    const w = this.w;
    this.addBump(heights, w * 0.20, 90, 40); this.flatten(heights, w * 0.20, 42, true);
    this.addBump(heights, w * 0.80, 90, 40); this.flatten(heights, w * 0.80, 42, true);
    this.addBump(heights, w * 0.50, 200, -10); // ortayı hafif alçalt → net hat
  }

  // Kazma: yüzeyi yukarı çek (kalın gövde) ki gömülme anlamlı olsun + tümsek siper.
  shapeThick(heights) {
    const w = this.w;
    for (let x = 0; x < w; x++) heights[x] -= 55;
    this.addBump(heights, w * 0.35, 120, 30);
    this.addBump(heights, w * 0.65, 120, 30);
  }

  // Hücum: uzun düz orta koridor (hız alıp bağlan) + spawn yanlarında nazik rampa.
  shapeLane(heights) {
    const w = this.w;
    this.flatten(heights, w * 0.50, 200, false);
    this.addBump(heights, w * 0.16, 70, 28);
    this.addBump(heights, w * 0.84, 70, 28);
  }

  // İdare et/quake: korunaklı orta havza + iki siper sırtı.
  shapeBastion(heights) {
    const w = this.w;
    this.addBump(heights, w * 0.50, 140, -34); // orta çukur
    this.flatten(heights, w * 0.50, 70, false); // havza tabanı düz
    this.addBump(heights, w * 0.34, 46, 46);   // sol siper
    this.addBump(heights, w * 0.66, 46, 46);   // sağ siper
  }

  // Gauss eğrisiyle yumuşak tümsek (+amp = yukarı tepe) ya da çukur (−amp).
  addBump(heights, cx, sigma, amp) {
    const w = this.w;
    const x0 = Math.max(0, Math.floor(cx - sigma * 3));
    const x1 = Math.min(w - 1, Math.ceil(cx + sigma * 3));
    for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / sigma;
      heights[x] -= amp * Math.exp(-0.5 * dx * dx); // yukarı = y küçülür
    }
  }

  // Dokulu toprak + temaya özel yüzey bandı + objeler. Tüm tema sanatı maps.js'teki
  // çizerlere devredilir; hepsi offscreen canvas'a basıldığından destroy() krater
  // açınca doku ve objeleri de birlikte siler.
  paintTerrain(heights) {
    const { w, h, ctx } = this;
    const theme = this.theme;
    ctx.clearRect(0, 0, w, h);
    // Görselin gerçekten boyandığı profil: krater duvarının kırpma poligonu
    // bununla çizilir ki dolgu kenarı zeminin kendi sınırıyla birebir örtüşsün
    // (host: kayayan noktalı `surface`, misafir: maskeden türetilen tamsayı).
    this.paintSurface = heights;
    paintGround(ctx, heights, w, h, theme);      // dikey gradyan + strata + serpme doku
    paintSurfaceBand(ctx, heights, w, h, theme); // grass / rooftop / snow / autumn üst bant
    paintProps(ctx, heights, w, h, theme);       // temaya özel objeler (kraterle aşınır)
  }

  isSolid(x, y) {
    x = x | 0;
    y = y | 0;
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return false;
    return this.solid[y * this.w + x] === 1;
  }

  // Belirli bir x sütununda, verilen y'den AŞAĞI doğru ilk dolu yüzeyi bul.
  surfaceBelow(x, fromY) {
    x = x | 0;
    for (let y = Math.max(0, fromY | 0); y < this.h; y++) {
      if (this.solid[y * this.w + x] === 1) return y;
    }
    return this.h; // zemin yok -> dipsiz boşluk
  }

  // (x,y) civarındaki yüzey normalini tahmin et (sekme için).
  // Küçük bir çekirdeği tarayıp katı kütlenin tersine bir vektör üretir;
  // sonuç katıdan boşluğa doğru bakan birim normaldir. Katı yok/tümü katı -> yukarı.
  normalAt(x, y) {
    let nx = 0, ny = 0;
    const R = 4;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        if (this.isSolid(x + dx, y + dy)) { nx -= dx; ny -= dy; }
      }
    }
    const len = Math.hypot(nx, ny);
    return len ? { x: nx / len, y: ny / len } : { x: 0, y: -1 };
  }

  /* Krater iç duvarı — "toprak kesiti". Krater çemberinin ZEMİN İÇİNDE kalan
   * dilimini koyu toprak degradesiyle boyar, üstüne soluk jeolojik katmanlar
   * basar; gökyüzüne taşan üst dilim boyanmaz (patlama ağzı gökyüzü kalır).
   *
   * Neden satır/sütun dolgusu DEĞİL: eksen hizalı 1 px dikdörtgenler dolgu
   * sınırını dünya pikseli adımlarıyla çiziyordu → krater kenarı testere dişi,
   * sediment şeritleri tarama çizgisi gibi görünüyordu ("pixellik" bildirimi).
   * Artık iki KIRPMA kesişimi kullanılır: (1) krater çemberi, (2) yüzey
   * profilinin altı. Canvas kırpmayı kenar yumuşatarak uygular, dolgu tek
   * dikdörtgen olduğu için adım oluşmaz. */
  paintCraterWall(ctx, cx, cy, radius) {
    const { w, h } = this;
    const profile = this.paintSurface || this.voidProfile || this._maskHeights();
    const dirt = this.theme.dirt;
    const r = Math.max(0.5, radius - 0.5);
    const xa = Math.max(0, Math.floor(cx - r) - 1);
    const xb = Math.min(w - 1, Math.ceil(cx + r) + 1);
    const yTop = cy - r, yBot = cy + r;
    if (xb < xa) return;
    ctx.save();
    // (1) Krater çemberi — yuvarlak ağız kenarı yumuşak çizilir.
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    // (2) Zemin dilimi — kırpma poligonu yüzey profilini izler; profilin
    //     tepesine oturan ağız kenarı da böylece merdiven yapmaz.
    ctx.beginPath();
    ctx.moveTo(xa, h);
    for (let x = xa; x <= xb; x++) {
      const top = profile[x] == null ? h : Math.min(h, Math.max(0, profile[x]));
      ctx.lineTo(x, top);
    }
    ctx.lineTo(xb, h);
    ctx.closePath();
    ctx.clip();
    // Duvar: yüzeye yakın daha açık, dipte daha koyu tek dikey degrade.
    const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
    grad.addColorStop(0, _shade(dirt, -0.52));
    grad.addColorStop(1, _shade(dirt, -0.84));
    ctx.fillStyle = grad;
    ctx.fillRect(xa, yTop, xb - xa + 1, yBot - yTop);
    // Jeolojik katmanlar: 1 px tarama çizgisi değil, 3 px'lik soluk bantlar
    // (dünyadaki sabit y hizası → haritanın kendi strata çizgileriyle uyumlu).
    ctx.fillStyle = _shadeA(dirt, -0.05, 0.18);
    for (let y = Math.ceil(yTop); y <= yBot; y++) {
      if (y % 19 !== 0) continue;
      ctx.fillRect(xa, y, xb - xa + 1, 3);
    }
    ctx.restore();
  }

  destroy(cx, cy, radius) {
    /* Çevrimiçi (F3c): yetkili host oymayı kaydederken parametreleri YUVARLAR
     * ve kazımayı da yuvarlanmış değerlerle yapar. Misafir aynı tam sayıları
     * (netTerrainChange, 2 ondalık) uyguladığı için iki maske BİREBİR aynı
     * olur; yalnız kaydı yuvarlayıp ham değerle kazımak birkaç piksellik
     * kenar farkı bırakıyordu (tests/net-game.js yakaladı). */
    if (this.recordChanges) {
      cx = Math.round(cx * 100) / 100;
      cy = Math.round(cy * 100) / 100;
      radius = Math.round(radius * 100) / 100;
      this.changes.push({ x: cx, y: cy, r: radius });
    }
    this.version++;
    const { w, h } = this;
    const r2 = radius * radius;
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(w - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(h - 1, Math.ceil(cy + radius));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2) this.solid[y * w + x] = 0;
      }
    }
    // Canvas'tan da daireyi sil (boşluk açılır; altındaki KOYU oyuk katmanı —
    // buildVoidLayer — görünür, arka plan sanatı değil).
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Deliğin çevresine toprak kesiti duvarı (yalnız kalan araziye basılır) ve
    // deliğin zemin içindeki dilimine katmanlı toprak dolgusu (toprak kesiti).
    this.paintCraterWall(ctx, cx, cy, radius);
    this.paintCutBands(ctx, [
      (c, rr) => c.arc(cx, cy, radius + rr - 0.5, 0, Math.PI * 2),
    ]);
  }

  draw(ctx) {
    // Oyuk katmanı (opak, koyu) arazi görselinin ALTINA girer: oyulan pikseller
    // arka planı değil bu katmanı gösterir.
    if (this.voidCanvas) ctx.drawImage(this.voidCanvas, 0, 0, this.w, this.h);
    // Yüksek çözünürlüklü görsel katmanı mantıksal boyuta ölçekleyerek çiz;
    // ana bağlamın ölçeği bunu ekran boyutuna keskin biçimde büyütür.
    ctx.drawImage(this.canvas, 0, 0, this.w, this.h);
  }
}

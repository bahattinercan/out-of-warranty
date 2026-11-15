/* Seçilebilir haritalar + tüm tema-özel arazi/gökyüzü sanatı.
 *
 * Mimari not: Arazinin görsel katmanı bir offscreen canvas'tır ve patlama onu
 * `destination-out` ile siler (terrain.js). Bu yüzden buradaki paintGround /
 * paintSurfaceBand / paintProps fonksiyonları o offscreen canvas'a BİR KEZ basılır
 * ve krater açılınca doku + objeler kendiliğinden aşınır. drawBackdrop / drawSky /
 * drawVignette ise her karede ana canvas'a çizilir (terrain'in arkasında/önünde).
 *
 * Tema alanları:
 *   id/label, forChar/forLabel : kimlik + ait olduğu karakter
 *   style        : arazi profili — "rolling" | "peak" | "twin" | "rugged"
 *   sky          : 2 veya 3 duraklı gökyüzü gradyanı
 *   orb          : güneş/ay rengi
 *   dirt/grassDeep/grassTop : toprak / yüzey bandı / üst çizgi renkleri
 *   surface      : üst bant tarzı — "grass" | "rooftop" | "snow" | "autumn"
 *   props        : ağırlıklı obje listesi [{type,w}], propDensity: aralık (px)
 *   backdrop     : { kind:"hills"|"mountains"|"skyline" } uzak silüet
 *   haze         : ufuk pus rengi (rgba)
 *   cloud/accent : bulut rengi / kart vurgu rengi
 *   stars/snow   : gökyüzü hava efekti
 *   archetype    : skill'i öne çıkaran arazi şekli (terrain.buildProfile kullanır)
 *
 * 34 karakterin her birine bir harita vardır. BIOMES bölge malzemesini,
 * MAP_LAYOUT_SPECS ise her arenanın sabit ve öğrenilebilir savaş geometrisini
 * sağlar. SKILL_ARCHETYPE eski/fallback kayıtlar ve kart etiketi için korunur.
 */

// ── Biome görsel paletleri ────────────────────────────────────────────────
// (İlk 5: eski Arka Bahçe/Gece Çatıları/Orman/Kar/Sonbahar görünümü birebir.)
const BIOMES = {
  meadow: {
    sky: ["#5db4f5", "#bfe8ff", "#e6f6ff"], orb: "#fff3c4",
    dirt: "#6b4a2b", grassDeep: "#3fa34d", grassTop: "#5fc56b", surface: "grass",
    props: [{ type: "grassTuft", w: 3 }, { type: "flower", w: 2 }, { type: "bush", w: 2 }, { type: "rock", w: 1 }],
    propDensity: 90, backdrop: { kind: "hills" }, haze: "rgba(255,255,255,0.20)", cloud: "#ffffffcc",
  },
  city: {
    sky: ["#1a1030", "#2c1d4e", "#4a2f6e"], orb: "#e7e9f5",
    dirt: "#241b36", grassDeep: "#4f3673", grassTop: "#9c7cdb", surface: "rooftop",
    props: [{ type: "chimney", w: 2 }, { type: "antenna", w: 2 }],
    propDensity: 120, backdrop: { kind: "skyline" }, haze: "rgba(60,45,100,0.40)", cloud: "#5a4d86aa", stars: true,
  },
  forest: {
    sky: ["#6aa6b0", "#9cc9c4", "#d2eae5"], orb: "#fcf7d8",
    dirt: "#4a3119", grassDeep: "#2e7d40", grassTop: "#46a85a", surface: "grass",
    props: [{ type: "pine", w: 3 }, { type: "rock", w: 1 }, { type: "mushroom", w: 1 }],
    propDensity: 80, backdrop: { kind: "mountains" }, haze: "rgba(210,234,229,0.32)", cloud: "#ffffffc4",
  },
  snow: {
    sky: ["#9cc3df", "#cfe4f2", "#eef7ff"], orb: "#fdfeff",
    dirt: "#73809a", grassDeep: "#cfe0ee", grassTop: "#ffffff", surface: "snow",
    props: [{ type: "snowPine", w: 2 }, { type: "snowMound", w: 2 }, { type: "rock", w: 1 }],
    propDensity: 100, backdrop: { kind: "hills" }, haze: "rgba(255,255,255,0.35)", cloud: "#ffffffe0", snow: true,
  },
  autumn: {
    sky: ["#9c6848", "#c08e62", "#e0bd91"], orb: "#ffe6b0",
    dirt: "#8a5430", grassDeep: "#c8721f", grassTop: "#f59138", surface: "autumn",
    props: [{ type: "tree", w: 2 }, { type: "pumpkin", w: 1 }, { type: "mushroom", w: 1 }, { type: "grassTuft", w: 1 }],
    propDensity: 95, backdrop: { kind: "hills" }, haze: "rgba(255,210,150,0.28)", cloud: "#ffe9cccc",
  },
  savanna: {
    sky: ["#a98f56", "#c4ab78", "#ddc89c"], orb: "#ffe7a0",
    dirt: "#8a6a30", grassDeep: "#b89a3a", grassTop: "#e6d066", surface: "grass",
    props: [{ type: "grassTuft", w: 3 }, { type: "deadTree", w: 1 }, { type: "rock", w: 1 }],
    propDensity: 110, backdrop: { kind: "hills" }, haze: "rgba(240,220,150,0.30)", cloud: "#fff6dccc",
  },
  swamp: {
    sky: ["#7c8a6a", "#9aa882", "#c2cba8"], orb: "#e8eccc",
    dirt: "#39341f", grassDeep: "#4a5a2e", grassTop: "#6e7e3a", surface: "grass",
    props: [{ type: "reeds", w: 3 }, { type: "deadTree", w: 1 }, { type: "mushroom", w: 1 }, { type: "rock", w: 1 }],
    propDensity: 90, backdrop: { kind: "hills" }, haze: "rgba(120,130,90,0.36)", cloud: "#aab48caa",
  },
  desert: {
    sky: ["#9a6a44", "#bb8a5e", "#d6a877"], orb: "#ffe2ad",
    dirt: "#9a6a3a", grassDeep: "#cfa05a", grassTop: "#eccb86", surface: "sand",
    props: [{ type: "cactus", w: 2 }, { type: "rock", w: 2 }],
    propDensity: 120, backdrop: { kind: "mountains" }, haze: "rgba(240,200,140,0.30)", cloud: "#fbe8c8cc",
  },
  volcano: {
    sky: ["#3a2230", "#5a3030", "#7a4030"], orb: "#ff8a4a",
    dirt: "#2e2426", grassDeep: "#4a2f2a", grassTop: "#7a3f2f", surface: "ash",
    props: [{ type: "emberRock", w: 3 }, { type: "rock", w: 1 }],
    propDensity: 110, backdrop: { kind: "mountains" }, haze: "rgba(120,50,40,0.40)", cloud: "#5a3a3aaa",
  },
};

// Eski biome anahtarları harita/karakter eşleşmesini bozmamak için korunur;
// içerikleri GARANTİ DIŞI (Out of Warranty) fabrika bölgeleriyle değiştirilir.
const FACTORY_ZONES = {
  meadow: {
    zoneId: "scrapyard", backdropMid: false, zoneLabel: "Hurda Sahası", zoneCode: "HS",
    sky: ["#567681", "#91aeb2", "#cad5cf"], orb: "#f5d98a",
    dirt: "#4b3b35", grassDeep: "#596267", grassTop: "#a66b42", surface: "rooftop",
    props: [{ type:"gear", w:3 }, { type:"plate", w:2 }, { type:"cable", w:2 }, { type:"crate", w:1 }],
    propDensity: 88, backdrop:{ kind:"skyline" }, haze:"rgba(190,205,198,0.28)", cloud:"#d8ded8aa",
  },
  city: {
    zoneId: "assembly", backdropMid: false, zoneLabel: "Montaj Hattı", zoneCode: "MH",
    sky: ["#171d2b", "#273349", "#46566b"], orb: "#dbe8f4",
    dirt: "#252b31", grassDeep: "#39434c", grassTop: "#e2ad3b", surface: "rooftop",
    props: [{ type:"robotArm", w:2 }, { type:"crate", w:2 }, { type:"antenna", w:1 }],
    propDensity: 110, backdrop:{ kind:"skyline" }, haze:"rgba(65,80,105,0.38)", cloud:"#60708777", stars:true,
  },
  forest: {
    zoneId: "warehouse", backdropMid: false, zoneLabel: "Depo Rafları", zoneCode: "DR",
    sky: ["#43565b", "#6f8380", "#a9b3a5"], orb: "#f0dfad",
    dirt: "#353833", grassDeep: "#4a5148", grassTop: "#87906f", surface: "rooftop",
    props: [{ type:"crate", w:3 }, { type:"pallet", w:2 }, { type:"pipe", w:1 }],
    propDensity: 82, backdrop:{ kind:"mountains" }, haze:"rgba(170,180,160,0.28)", cloud:"#cbd1c0aa",
  },
  snow: {
    zoneId: "cooling", backdropMid: false, zoneLabel: "Soğutma Tesisi", zoneCode: "ST",
    sky: ["#7996aa", "#b3c7d2", "#e1edf2"], orb: "#f8ffff",
    dirt: "#566672", grassDeep: "#a8c5d2", grassTop: "#eafaff", surface: "snow",
    props: [{ type:"frostTank", w:2 }, { type:"valve", w:2 }, { type:"pipe", w:1 }],
    propDensity: 98, backdrop:{ kind:"hills" }, haze:"rgba(235,250,255,0.36)", cloud:"#f4ffffdd", snow:true,
  },
  autumn: {
    zoneId: "paint", zoneLabel: "Boya Atölyesi", zoneCode: "BA",
    sky: ["#74525f", "#a06f78", "#d3a28d"], orb: "#ffe0a4",
    dirt: "#57464b", grassDeep: "#a25056", grassTop: "#e88b45", surface: "autumn",
    props: [{ type:"paintCan", w:3 }, { type:"plate", w:2 }, { type:"pipe", w:1 }],
    propDensity: 92, backdrop:{ kind:"skyline" }, haze:"rgba(225,175,155,0.28)", cloud:"#f1c6b8aa",
  },
  savanna: {
    zoneId: "loading", zoneLabel: "Dış Yükleme", zoneCode: "DY",
    sky: ["#897850", "#baa16c", "#d8c497"], orb: "#ffe49a",
    dirt: "#5f5541", grassDeep: "#82764e", grassTop: "#d0b85a", surface: "sand",
    props: [{ type:"craneHook", w:2 }, { type:"crate", w:2 }, { type:"chain", w:1 }],
    propDensity: 108, backdrop:{ kind:"hills" }, haze:"rgba(225,205,155,0.28)", cloud:"#efe3c0aa",
  },
  swamp: {
    zoneId: "waste", backdropMid: false, zoneLabel: "Atık Arıtma", zoneCode: "AA",
    sky: ["#536450", "#78856c", "#a9ad8e"], orb: "#d9dda9",
    dirt: "#30362d", grassDeep: "#455b42", grassTop: "#79a14a", surface: "grass",
    props: [{ type:"barrel", w:3 }, { type:"pipe", w:2 }, { type:"valve", w:1 }],
    propDensity: 88, backdrop:{ kind:"hills" }, haze:"rgba(100,125,90,0.35)", cloud:"#8f9c7c99",
  },
  desert: {
    zoneId: "sandblast", zoneLabel: "Kumlama Ünitesi", zoneCode: "KU",
    sky: ["#87664e", "#b38a68", "#d2ad83"], orb: "#ffe1ad",
    dirt: "#705a47", grassDeep: "#a17c55", grassTop: "#d7b77f", surface: "sand",
    props: [{ type:"pressureTank", w:2 }, { type:"sandbag", w:2 }, { type:"pipe", w:1 }],
    propDensity: 116, backdrop:{ kind:"mountains" }, haze:"rgba(225,195,155,0.30)", cloud:"#ead7bd99",
  },
  volcano: {
    zoneId: "foundry", backdropMid: false, zoneLabel: "Döküm Ocağı", zoneCode: "DO",
    sky: ["#2f2229", "#553033", "#754333"], orb: "#ff8a48",
    dirt: "#292426", grassDeep: "#49312d", grassTop: "#8b4932", surface: "ash",
    props: [{ type:"emberRock", w:2 }, { type:"ladle", w:2 }, { type:"pipe", w:1 }],
    propDensity: 105, backdrop:{ kind:"mountains" }, haze:"rgba(120,55,45,0.40)", cloud:"#5a3a3aaa",
  },
};
Object.assign(BIOMES, FACTORY_ZONES);

// ── Skill türü → arazi arketipi (skill'i öne çıkaran şekil) ────────────────
const SKILL_ARCHETYPE = {
  heal: "bastion", quake: "bastion",
  shield: "arena", damageReduce: "arena", melee: "arena", radial: "arena",
  nextShot: "open", spit: "open",
  jump: "vertical", glide: "vertical",
  dash: "lane",
  dig: "thick",
};

// ── Karakter → biome (doğasına göre) ──────────────────────────────────────
const CHAR_BIOME = {
  kopek: "meadow", kedi: "city", ayi: "forest", tavsan: "snow", tilki: "autumn",
  panda: "forest", kaplan: "savanna", timsah: "swamp", suaygiri: "swamp", koala: "forest",
  kunduz: "swamp", ordek: "swamp", kokarca: "forest",
  aslan: "savanna", kurtadam: "city", sirtlan: "savanna", rakun: "city", ornitorenk: "swamp",
  yeti: "snow", dino: "volcano",
  gergedan: "savanna", kirpi: "meadow",
  maymun: "forest", kanguru: "desert", yarasa: "city", armadillo: "desert",
  hamster: "meadow", bukalemun: "forest",
  ejderha: "volcano", penguen: "snow", oklukirpi: "forest", sincap: "autumn", kus: "meadow", zurafa: "savanna",
};

// ── Haritaya özel savaş düzenleri ─────────────────────────────────────────
// p: [normalize x, normalize yüzey y] kontrol noktaları. Aynı y değerini
// paylaşan ardışık noktalar gerçek bir düz atış/doğuş alanı oluşturur.
// s: altı başlangıç adayının normalize x değerleri. Katmanlı haritalarda
// sf, yüzey aramasının başlayacağı normalize y değerini ayrıca belirtir.
// solids/cutouts yalnız gerçek üst-alt yol gerektiren üç arenada kullanılır.
// Ana geometri bilinçli olarak rastgele değildir: oyuncu haritayı öğrenebilir;
// rastgelelik yalnız küçük dekorların yerinde kalır.
const MAP_LAYOUT_SPECS = {
  kopek:      { name:"Eski Tamir Çukuru", hint:"Çukur korur; yukarı çıkmak atış açısını büyütür.", p:[[0,.58],[.25,.58],[.34,.73],[.46,.73],[.58,.73],[.66,.55],[.78,.55],[1,.61]], s:[.10,.25,.41,.57,.75,.90] },
  kedi:       { name:"Mıknatıs Köprüsü", hint:"Üst yol kısa ve açık, alt yol uzun ve korunaklıdır.", p:[[0,.64],[.18,.64],[.28,.76],[.72,.76],[.82,.64],[1,.64]], s:[.10,.23,.40,.60,.77,.90], sf:[0,0,.64,.64,0,0], solids:[{x:.18,y:.66,w:.10,h:.04},{x:.30,y:.546,w:.40,h:.067},{x:.72,y:.66,w:.10,h:.04}] },
  ayi:        { name:"Basınç Deposu", hint:"Küçük siperleri parçalayarak yeni atış hatları aç.", p:[[0,.685],[.24,.685],[.29,.61],[.34,.61],[.39,.685],[.46,.585],[.56,.585],[.62,.685],[.69,.62],[.75,.62],[.81,.685],[1,.685]], s:[.09,.21,.40,.62,.81,.92] },
  tavsan:     { name:"Buzlu Basamaklar", hint:"Basamakları yürüyerek çıkabilir, sıçrayarak kestirebilirsin.", p:[[0,.73],[.22,.73],[.34,.64],[.45,.64],[.56,.55],[.70,.55],[.80,.73],[1,.73]], s:[.10,.23,.43,.56,.78,.90] },
  tilki:      { name:"İkiz Boya Kabinleri", hint:"İki kabin farklı yüksekliklerden merkezi gözetler.", p:[[0,.72],[.12,.72],[.18,.555],[.33,.555],[.40,.74],[.60,.74],[.69,.60],[.83,.60],[.89,.72],[1,.72]], s:[.09,.25,.42,.58,.76,.91] },
  panda:      { name:"Pres Meydanı", hint:"Meydana inmek yakın dövüşü başlatır.", p:[[0,.57],[.20,.57],[.34,.75],[.66,.75],[.80,.57],[1,.57]], s:[.10,.24,.40,.60,.76,.90] },
  kaplan:     { name:"Kesim İskelesi", hint:"Karşı iskeleye geçmek için yüksekliğini bırakmalısın.", p:[[0,.64],[.14,.555],[.38,.555],[.46,.76],[.56,.76],[.62,.64],[.86,.64],[.94,.70],[1,.70]], s:[.09,.27,.44,.56,.74,.91] },
  timsah:     { name:"Boru Dirseği", hint:"Alçak sahadan sağdaki yüksek terasa yaklaş.", p:[[0,.73],[.26,.73],[.31,.66],[.37,.66],[.55,.73],[.65,.53],[.72,.53],[1,.53]], s:[.09,.24,.43,.58,.77,.91] },
  suaygiri:   { name:"Çökeltme Havuzu", hint:"Ortadaki set iki havzayı ayırır.", p:[[0,.58],[.18,.58],[.24,.75],[.45,.75],[.48,.685],[.54,.685],[.57,.75],[.78,.75],[.84,.58],[1,.58]], s:[.09,.28,.41,.61,.73,.91] },
  koala:      { name:"Ayar Tezgâhları", hint:"Üç tezgâh üç ayrı yakın çatışma noktasıdır.", p:[[0,.73],[.16,.73],[.20,.65],[.32,.65],[.36,.73],[.43,.62],[.56,.62],[.61,.73],[.69,.66],[.82,.66],[.87,.73],[1,.73]], s:[.09,.26,.38,.50,.64,.90] },
  kunduz:     { name:"Filtre Terasları", hint:"Rakibi aşağı itmek konumunu bozar; savaş hemen bitmez.", p:[[0,.53],[.18,.53],[.31,.64],[.42,.64],[.48,.75],[.62,.75],[.71,.66],[.81,.66],[1,.55]], s:[.10,.26,.42,.58,.74,.90] },
  ordek:      { name:"Kaynak Geçidi", hint:"Ortadaki ince siperi kaldırınca uzun görüş hattı açılır.", p:[[0,.73],[.12,.73],[.20,.60],[.47,.60],[.49,.515],[.53,.515],[.55,.60],[.80,.60],[.88,.73],[1,.73]], s:[.09,.28,.41,.60,.73,.91] },
  kokarca:    { name:"Eski Filtre Ambarı", hint:"Cepler korur fakat alan saldırısında çıkmayı bilmelisin.", p:[[0,.64],[.18,.64],[.23,.75],[.37,.75],[.43,.65],[.57,.65],[.63,.75],[.77,.75],[.82,.64],[1,.64]], s:[.09,.29,.44,.56,.71,.91] },
  aslan:      { name:"Trafo Avlusu", hint:"Merkez güçlüdür fakat iki taraftan da görünür.", p:[[0,.71],[.34,.71],[.42,.52],[.58,.52],[.66,.71],[1,.71]], s:[.09,.25,.37,.63,.75,.91] },
  kurtadam:   { name:"Alarm Kulesi", hint:"Kule iyi açı verir; yakın saldırı için aşağı inmelisin.", p:[[0,.72],[.13,.72],[.22,.48],[.37,.48],[.45,.73],[.57,.73],[.62,.64],[.80,.64],[.88,.72],[1,.72]], s:[.09,.28,.44,.57,.71,.91] },
  sirtlan:    { name:"Yankı Hangarı", hint:"Merkez sırtını aşınca çatışma bir anda yakınlaşır.", p:[[0,.65],[.18,.72],[.40,.72],[.45,.60],[.55,.60],[.60,.72],[.82,.72],[1,.65]], s:[.09,.25,.38,.62,.75,.91] },
  rakun:      { name:"Ayırma Çanağı", hint:"Düz merkez yakın savaşa, kenarlar güvenli atışa uygundur.", p:[[0,.55],[.16,.55],[.28,.65],[.34,.74],[.66,.74],[.72,.65],[.84,.55],[1,.55]], s:[.09,.24,.40,.60,.76,.91] },
  ornitorenk: { name:"Tahliye Setleri", hint:"Üç set, alan saldırısını farklı yüksekliklerde sınar.", p:[[0,.72],[.18,.72],[.22,.63],[.30,.63],[.34,.74],[.43,.74],[.46,.58],[.55,.58],[.59,.74],[.68,.74],[.72,.66],[.80,.66],[.84,.72],[1,.72]], s:[.09,.25,.38,.62,.76,.91] },
  yeti:       { name:"Donmuş Tank Sahası", hint:"Yüksek teraslar güvenlidir; merkez geçişi açıkta bırakır.", p:[[0,.52],[.15,.52],[.31,.52],[.39,.76],[.61,.76],[.69,.52],[.85,.52],[1,.52]], s:[.09,.23,.43,.57,.77,.91] },
  dino:       { name:"Temel Test Sahası", hint:"Üç kalın mevzi maç ilerledikçe aşınır.", p:[[0,.70],[.12,.60],[.29,.60],[.34,.71],[.39,.53],[.59,.53],[.64,.71],[.70,.64],[.88,.64],[.94,.70],[1,.70]], s:[.09,.22,.44,.55,.77,.91] },
  gergedan:   { name:"Yükleme Rampası", hint:"Düzlük hücuma hız kazandırır, kraterler yolu keser.", p:[[0,.62],[.12,.62],[.18,.685],[.67,.685],[.83,.54],[1,.54]], s:[.09,.25,.41,.58,.77,.91] },
  kirpi:      { name:"Hurda Yarışı", hint:"İki kısa pist arasında ne zaman duracağını seç.", p:[[0,.63],[.14,.61],[.39,.61],[.46,.72],[.54,.72],[.61,.61],[.86,.61],[1,.63]], s:[.09,.27,.42,.58,.73,.91] },
  maymun:     { name:"Üç Katlı Raf", hint:"Alt yol korunaklı, raflar açık fakat yüksek atış noktalarıdır.", p:[[0,.787],[1,.787]], s:[.09,.28,.43,.59,.75,.91], sf:[.73,.73,.73,.73,.73,.73], solids:[{x:.21,y:.66,w:.27,h:.045},{x:.53,y:.54,w:.27,h:.045}] },
  kanguru:    { name:"Kum Tepesi Atlayışı", hint:"Zirveye iki rampadan çık veya sıçrayarak kestir.", p:[[0,.74],[.22,.74],[.31,.60],[.39,.60],[.43,.47],[.57,.47],[.61,.60],[.70,.60],[.82,.74],[1,.74]], s:[.09,.25,.37,.63,.75,.91] },
  yarasa:     { name:"Tavan Servis Hattı", hint:"Yüksekten inerken dönüş yolunu da düşün.", p:[[0,.45],[.14,.45],[.28,.56],[.40,.56],[.50,.65],[.62,.65],[.72,.74],[1,.74]], s:[.09,.22,.40,.58,.76,.91] },
  armadillo:  { name:"Gömülü Servis Tüneli", hint:"Ortadaki dolguyu kaz veya üst rampadan dolaş.", p:[[0,.75],[.20,.75],[.30,.53],[.70,.53],[.80,.75],[1,.75]], s:[.09,.23,.40,.60,.77,.91], cuts:[{x:.30,y:.63,w:.17,h:.16},{x:.53,y:.63,w:.17,h:.16}] },
  hamster:    { name:"Levha Sığınağı", hint:"Solda tek kalın, sağda iki küçük siper bulunur.", p:[[0,.72],[.22,.72],[.27,.555],[.37,.555],[.42,.72],[.58,.72],[.62,.63],[.68,.63],[.72,.72],[.79,.65],[.85,.65],[.90,.72],[1,.72]], s:[.09,.21,.44,.56,.73,.92] },
  bukalemun:  { name:"Denetim Koridoru", hint:"Her siper farklı bir atış penceresi açar.", p:[[0,.72],[.24,.72],[.29,.62],[.35,.62],[.40,.70],[.47,.635],[.53,.635],[.59,.68],[.68,.57],[.76,.57],[.82,.66],[1,.66]], s:[.09,.21,.40,.61,.82,.92] },
  ejderha:    { name:"Döküm Ağzı", hint:"Merkez siperi yaklaşmaya yardım eder, sonra hızla aşınır.", p:[[0,.61],[.12,.61],[.36,.61],[.43,.75],[.47,.695],[.53,.695],[.57,.75],[.64,.61],[.88,.61],[1,.61]], s:[.09,.25,.41,.59,.75,.91] },
  penguen:    { name:"Soğutucu Kanallar", hint:"Merkez sırtını delerek iki kanal arasında görüş aç.", p:[[0,.64],[.16,.64],[.20,.74],[.43,.74],[.47,.57],[.53,.57],[.57,.74],[.80,.74],[.84,.64],[1,.64]], s:[.09,.28,.39,.61,.72,.91] },
  oklukirpi:  { name:"Sevkiyat Rafı", hint:"Üç dar siper çoklu atışlara farklı pencereler bırakır.", p:[[0,.74],[.24,.74],[.28,.575],[.33,.575],[.37,.74],[.49,.63],[.54,.63],[.59,.74],[.71,.545],[.76,.545],[.81,.74],[1,.74]], s:[.09,.21,.41,.62,.83,.92] },
  sincap:     { name:"Cıvata Ayıklama Masası", hint:"Küçük merkez mevzide bir atış yapıp yer değiştir.", p:[[0,.65],[.16,.65],[.21,.72],[.40,.72],[.43,.585],[.57,.585],[.60,.72],[.79,.72],[.84,.65],[1,.65]], s:[.09,.28,.39,.61,.72,.91] },
  kus:        { name:"Açık Hava Eleği", hint:"Merkez açıktır; yüksek kenarlar mesafeyi büyütür.", p:[[0,.53],[.12,.53],[.27,.72],[.73,.72],[.88,.53],[1,.53]], s:[.09,.25,.41,.59,.75,.91] },
  zurafa:     { name:"Konteyner Yıkama Alanı", hint:"Alçak kaideler arasında sürekli yer değiştir.", p:[[0,.75],[.15,.75],[.18,.68],[.28,.68],[.31,.75],[.37,.70],[.47,.70],[.50,.75],[.57,.675],[.67,.675],[.70,.75],[.77,.695],[.87,.695],[.90,.75],[1,.75]], s:[.09,.23,.42,.62,.82,.92] },
};

// Aynı profil üreticisi hem gerçek arazi hem kart önizlemesi tarafından
// kullanılır. Böylece seçim kartı başka, maç başka bir harita göstermez.
function mapLayoutProfile(layout, width, height) {
  const out = new Float32Array(width);
  const points = layout && layout.p;
  if (!points || points.length < 2) return out;
  let seg = 0;
  for (let x = 0; x < width; x++) {
    const t = width <= 1 ? 0 : x / (width - 1);
    while (seg < points.length - 2 && t > points[seg + 1][0]) seg++;
    const a = points[seg], b = points[seg + 1];
    const span = Math.max(0.0001, b[0] - a[0]);
    const u = Math.max(0, Math.min(1, (t - a[0]) / span));
    out[x] = (a[1] + (b[1] - a[1]) * u) * height;
  }
  return out;
}

function getMapSpawnPads(map, count) {
  const layout = map && map.layout;
  const xs = layout && layout.s ? layout.s : [.12,.27,.42,.58,.73,.88];
  const from = layout && layout.sf ? layout.sf : [];
  const sets = { 1:[2], 2:[0,5], 3:[0,2,5], 4:[0,1,4,5], 5:[0,1,2,4,5], 6:[0,1,2,3,4,5] };
  const picked = sets[Math.max(1, Math.min(6, count | 0))] || sets[2];
  return picked.map((i) => ({ x:xs[i], fromY:from[i] || 0, slot:i }));
}

// Her karaktere bir harita: görsel = biome + karakter rengi; arazi = özel layout.
function buildCharacterMaps() {
  return CHARACTERS.map((ch, index) => {
    const biome = BIOMES[CHAR_BIOME[ch.id]] || BIOMES.meadow;
    const archetype = SKILL_ARCHETYPE[ch.skill && ch.skill.kind] || "open";
    const layout = MAP_LAYOUT_SPECS[ch.id];
    return Object.assign({}, biome, {
      id: ch.id,
      label: layout ? layout.name : (biome.zoneLabel || "Fabrika Bölgesi"),
      zoneLabel: biome.zoneLabel || "Fabrika Bölgesi",
      arenaCode: `${biome.zoneCode || "FB"}-${String(index + 1).padStart(2, "0")}`,
      forChar: ch.id,
      forLabel: ch.label,
      skillLabel: ch.skill ? ch.skill.label : "",
      accent: ch.color,
      biome: CHAR_BIOME[ch.id] || "meadow",
      zoneId: biome.zoneId || "scrapyard",
      archetype,
      layout,
    });
  });
}

// Altı bağımsız arena. Geometri aynı profili hem gerçek zeminde hem kartta
// kullanır; ek platformlar arazi maskesinin parçası olarak çizilir.
const MAPS = [
  { id:"furnace", label:"Erimiş Döküm Ocağı", hint:"İki yüksek yan rampa, ortadaki dar ve sıcak havzaya bakar.", zoneLabel:"Döküm Ocağı", zoneId:"foundry", sky:["#201923","#603229","#d16d35"], orb:"#ffb65c", dirt:"#382a2b", grassDeep:"#74402f", grassTop:"#f08a43", surface:"ash", props:[{type:"emberRock",w:3},{type:"ladle",w:2},{type:"pipe",w:1}], propDensity:118, backdrop:{kind:"mountains"}, haze:"rgba(166,74,48,0.38)", accent:"#ff9e56", scene:"furnace", layout:{ p:[[0,.55],[.16,.56],[.29,.61],[.39,.72],[.46,.78],[.54,.78],[.61,.71],[.71,.61],[.84,.56],[1,.55]], s:[.08,.16,.25,.75,.84,.92] } },
  { id:"crane_yard", label:"Gece Vinç Sahası", hint:"Kademeli çatılar ve asılı platformlar; üst rota hızlı ama açıkta.", zoneLabel:"Vinç Sahası", zoneId:"warehouse", sky:["#101729","#202d4a","#667c97"], orb:"#e7e8cf", dirt:"#34363b", grassDeep:"#54555c", grassTop:"#d49b48", surface:"rooftop", props:[{type:"gear",w:2},{type:"crate",w:2},{type:"cable",w:1}], propDensity:125, backdrop:{kind:"skyline"}, haze:"rgba(75,86,116,0.36)", stars:true, accent:"#f0bd62", scene:"crane", layout:{ p:[[0,.70],[.17,.70],[.23,.59],[.36,.59],[.42,.70],[.58,.70],[.64,.57],[.78,.57],[.84,.66],[1,.66]], s:[.08,.16,.25,.75,.84,.92], solids:[{x:.29,y:.43,w:.13,h:.025},{x:.60,y:.39,w:.15,h:.025},{x:.43,y:.52,w:.12,h:.025}] } },
  { id:"reactor_garden", label:"Kök Salmış Reaktör", hint:"İki üst siperin arasında alçak vadi; yüksek yol ateşe açık.", zoneLabel:"Atık Arıtma", zoneId:"waste", sky:["#193433","#476d59","#c1c281"], orb:"#e7ed9b", dirt:"#3b382c", grassDeep:"#536645", grassTop:"#92a856", surface:"grass", props:[{type:"pine",w:2},{type:"mushroom",w:2},{type:"reeds",w:1}], propDensity:105, backdrop:{kind:"hills"}, haze:"rgba(151,177,125,0.32)", accent:"#a8ca70", scene:"reactor", layout:{ p:[[0,.69],[.16,.69],[.24,.57],[.39,.57],[.45,.68],[.55,.68],[.61,.56],[.76,.56],[.84,.69],[1,.69]], s:[.08,.16,.25,.75,.84,.92], solids:[{x:.27,y:.47,w:.18,h:.038},{x:.55,y:.46,w:.18,h:.038}] } },
  { id:"moon_scrapyard", label:"Ay Moloz Sahası", hint:"Parçalı platformlarda zıpla; alttaki geniş rota kesintisiz.", zoneLabel:"Hurda Sahası", zoneId:"scrapyard", sky:["#080f25","#1d3152","#6c8199"], orb:"#edf0df", dirt:"#343943", grassDeep:"#565c69", grassTop:"#a5a8a0", surface:"rooftop", props:[{type:"gear",w:3},{type:"plate",w:2},{type:"cable",w:1}], propDensity:130, backdrop:{kind:"mountains"}, haze:"rgba(118,139,173,0.35)", stars:true, accent:"#8fbbe2", scene:"moon", layout:{ p:[[0,.73],[.16,.73],[.22,.64],[.30,.64],[.35,.73],[.65,.73],[.70,.61],[.78,.61],[.84,.70],[1,.70]], s:[.08,.16,.25,.75,.84,.92], solids:[{x:.12,y:.53,w:.18,h:.035},{x:.38,y:.47,w:.15,h:.035},{x:.70,y:.49,w:.18,h:.035}] } },
  { id:"ice_rift", label:"Buz Kırığı", hint:"Derin yarık iki kıyıyı ayırır; düşen robot maçtan çıkar.", zoneLabel:"Soğutma Tesisi", zoneId:"cooling", sky:["#365b75","#9dc8df","#f0fbff"], orb:"#ffffff", dirt:"#536875", grassDeep:"#8aaeba", grassTop:"#e8f8ff", surface:"snow", props:[{type:"snowPine",w:2},{type:"rock",w:2},{type:"pipe",w:1}], propDensity:115, backdrop:{kind:"mountains"}, haze:"rgba(210,242,255,0.32)", snow:true, accent:"#9ce5ef", scene:"ice", layout:{ p:[[0,.71],[.15,.70],[.26,.66],[.36,.62],[.42,.59],[.58,.59],[.64,.62],[.74,.66],[.85,.70],[1,.71]], s:[.07,.15,.25,.75,.85,.93], cuts:[{x:.43,y:.58,w:.14,h:.42}], cliffs:[{x:.43,y:.58,w:.14}] } },
  { id:"flooded_lab", label:"Taşkın Laboratuvarı", hint:"Yüksek dış yürüyüş yolu ve yıkılabilir iç duvarlarla kapalı arena.", zoneLabel:"Montaj Hattı", zoneId:"assembly", sky:["#15343b","#397078","#a9d5c8"], orb:"#f1efce", dirt:"#344448", grassDeep:"#4c7772", grassTop:"#81b6a5", surface:"rooftop", props:[{type:"pipe",w:3},{type:"valve",w:2},{type:"crate",w:1}], propDensity:110, backdrop:{kind:"skyline"}, haze:"rgba(119,179,171,0.35)", accent:"#70d4c1", scene:"lab", layout:{ p:[[0,.70],[.16,.70],[.24,.62],[.40,.62],[.46,.70],[.54,.70],[.60,.62],[.76,.62],[.84,.70],[1,.70]], s:[.08,.16,.25,.75,.84,.92], solids:[{x:.04,y:.28,w:.025,h:.42},{x:.96,y:.28,w:.025,h:.42},{x:.29,y:.49,w:.035,h:.20},{x:.675,y:.49,w:.035,h:.20},{x:.42,y:.57,w:.16,h:.025}], cuts:[{x:.465,y:.70,w:.07,h:.30}] } },
];

function getMapById(id) {
  return MAPS.find((m) => m.id === id) || MAPS[0];
}

/* ---- Renk yardımcıları ---- */
function _hexToRgb(hex) {
  let h = String(hex).replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
// amt: -1 (siyaha) .. +1 (beyaza). Açma/koyultma.
function _shadeRgb(hex, amt) {
  const c = _hexToRgb(hex);
  const f = amt < 0 ? 0 : 255;
  const p = Math.min(1, Math.abs(amt));
  return {
    r: Math.round(c.r + (f - c.r) * p),
    g: Math.round(c.g + (f - c.g) * p),
    b: Math.round(c.b + (f - c.b) * p),
  };
}
function _shade(hex, amt) { const c = _shadeRgb(hex, amt); return `rgb(${c.r},${c.g},${c.b})`; }
function _shadeA(hex, amt, a) { const c = _shadeRgb(hex, amt); return `rgba(${c.r},${c.g},${c.b},${a})`; }
function _mix(a, b, t) {
  const A = _hexToRgb(a), B = _hexToRgb(b);
  return `rgb(${Math.round(A.r + (B.r - A.r) * t)},${Math.round(A.g + (B.g - A.g) * t)},${Math.round(A.b + (B.b - A.b) * t)})`;
}

/* ---- Gökyüzü + hava efektleri (her kare) ---- */

// Gökyüzü gradyanı (2 veya 3 duraklı) + güneş/ay + yıldız/kar.
function drawSky(ctx, W, H, theme) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const s = theme.sky;
  if (s.length >= 3) { g.addColorStop(0, s[0]); g.addColorStop(0.5, s[1]); g.addColorStop(1, s[2]); }
  else { g.addColorStop(0, s[0]); g.addColorStop(1, s[1]); }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Güneş/ay: yumuşak parıltılı disk (sağ üst, HUD'dan uzak)
  if (theme.orb) {
    const ox = W * 0.84, oy = H * 0.18;
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = theme.orb;
    ctx.beginPath(); ctx.arc(ox, oy, 42, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(ox, oy, 22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawSkyDecor(ctx, W, H, theme);
}

// Yıldız parıltısı (gece) / kar yağışı (karlı çayır). Parçacıklar bir kez üretilip
// önbelleğe alınır; her karede hafifçe ilerletilir. Mantıksal boyut sabit (W×H).
let _stars = null;
let _snowflakes = null;
function drawSkyDecor(ctx, W, H, theme) {
  if (theme.stars) {
    if (!_stars) {
      _stars = [];
      for (let i = 0; i < 70; i++) {
        _stars.push({ x: Math.random() * W, y: Math.random() * H * 0.62, r: 0.3 + Math.random() * 1.3, t: Math.random() * 6.28 });
      }
    }
    ctx.fillStyle = "#ffffff";
    for (const s of _stars) {
      s.t += 0.05;
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(s.t);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (theme.snow) {
    if (!_snowflakes) {
      _snowflakes = [];
      for (let i = 0; i < 90; i++) {
        _snowflakes.push({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 1.8, sp: 0.3 + Math.random() * 0.7, drift: Math.random() * 6.28 });
      }
    }
    ctx.fillStyle = "#ffffffcc";
    for (const f of _snowflakes) {
      f.y += f.sp; f.drift += 0.02; f.x += Math.sin(f.drift) * 0.3;
      if (f.y > H) { f.y = -2; f.x = Math.random() * W; }
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/* ---- Uzak arka plan (her kare, terrain'in arkasında) ---- */

let _backdropCache = {};
function drawBackdrop(ctx, W, H, theme) {
  // Raster katman (varsa): uzak + orta görsel hazırsa prosedürel silüetler hiç
  // çizilmez. Hazır değilse aşağıdaki yol AYNEN çalışır → ilk karede boşluk yok
  // (file://'de görsel asenkron geldiği için bu yedek zorunlu).
  // `typeof` koruması: sondalar (`_*.html`) index.html'den elle türediği için
  // assets.js'i yüklemeyen eski bir kopya açılırsa savaş ekranı çökmesin.
  if (theme.zoneId && typeof drawBackdropAsset === "function" && drawBackdropAsset(ctx, theme.zoneId, W, H, theme.backdropMid !== false)) {
    _drawHaze(ctx, W, H, theme);
    return;
  }
  if (!theme.backdrop) { _drawHaze(ctx, W, H, theme); return; }
  let cache = _backdropCache[theme.id];
  if (!cache) { cache = _buildBackdrop(theme, W, H); _backdropCache[theme.id] = cache; }

  for (const layer of cache.layers) {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (const p of layer.points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    if (layer.caps) {
      ctx.fillStyle = "#f4f8ff";
      for (const c of layer.caps) {
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x - 9, c.y + 11); ctx.lineTo(c.x + 9, c.y + 11); ctx.closePath(); ctx.fill();
      }
    }
    if (layer.windows) {
      for (const wnd of layer.windows) { ctx.fillStyle = wnd.c; ctx.fillRect(wnd.x, wnd.y, wnd.w, wnd.h); }
    }
  }
  drawMapLandmark(ctx, W, H, theme);
  _drawHaze(ctx, W, H, theme);
}

function drawMapLandmark(ctx, W, H, theme) {
  if (!theme.scene) return;
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.strokeStyle = _shade(theme.grassDeep, -0.12);
  ctx.fillStyle = _shade(theme.grassDeep, -0.04);
  const cx = W * 0.5, top = H * 0.18;
  if (theme.scene === "furnace") {
    ctx.strokeStyle = "#b65c39"; ctx.lineWidth = W * 0.012;
    ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, H * 0.39); ctx.stroke();
    ctx.fillStyle = "#493238"; ctx.beginPath(); ctx.moveTo(cx - W*.10,H*.34); ctx.lineTo(cx-W*.075,H*.46); ctx.lineTo(cx+W*.075,H*.46); ctx.lineTo(cx+W*.10,H*.34); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#f08a43"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#ff9e56"; ctx.fillRect(cx-W*.055,H*.40,W*.11,H*.012);
  } else if (theme.scene === "crane") {
    ctx.lineWidth = W*.012; ctx.beginPath(); ctx.moveTo(W*.22,H*.52); ctx.lineTo(W*.22,H*.22); ctx.lineTo(W*.60,H*.22); ctx.moveTo(W*.22,H*.31); ctx.lineTo(W*.49,H*.31); ctx.lineTo(W*.49,H*.51); ctx.moveTo(W*.78,H*.52); ctx.lineTo(W*.78,H*.16); ctx.lineTo(W*.94,H*.16); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W*.60,H*.22); ctx.lineTo(W*.60,H*.38); ctx.stroke(); ctx.fillRect(W*.585,H*.37,W*.03,H*.05);
  } else if (theme.scene === "reactor") {
    ctx.fillStyle = "#344b42"; ctx.beginPath(); ctx.ellipse(cx,H*.39,W*.105,H*.16,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#a8ca70"; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx,H*.39,W*.075,H*.12,0,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = "#d6ed8b"; ctx.beginPath(); ctx.arc(cx,H*.39,W*.025,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#738c50"; ctx.lineWidth = W*.009; ctx.beginPath(); ctx.moveTo(W*.24,H*.20); ctx.quadraticCurveTo(W*.33,H*.48,cx,H*.49); ctx.moveTo(W*.78,H*.18); ctx.quadraticCurveTo(W*.68,H*.43,cx,H*.49); ctx.stroke();
  } else if (theme.scene === "moon") {
    ctx.strokeStyle = "#9ca9b7"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(W*.29,H*.40,W*.10,-2.5,1.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W*.22,H*.47); ctx.lineTo(W*.35,H*.32); ctx.moveTo(W*.22,H*.32); ctx.lineTo(W*.35,H*.47); ctx.stroke();
    ctx.fillStyle = "#707c8b"; ctx.fillRect(W*.64,H*.43,W*.12,H*.05); ctx.fillRect(W*.67,H*.39,W*.06,H*.04);
    ctx.strokeStyle = "#bbc5ca"; ctx.beginPath(); ctx.moveTo(W*.65,H*.48); ctx.lineTo(W*.63,H*.52); ctx.moveTo(W*.75,H*.48); ctx.lineTo(W*.77,H*.52); ctx.stroke();
  } else if (theme.scene === "ice") {
    const ice = ctx.createLinearGradient(0,H*.2,0,H*.62);
    ice.addColorStop(0,"#eefaff"); ice.addColorStop(.48,"#8fc5df"); ice.addColorStop(1,"#426b87");
    ctx.fillStyle = ice;
    ctx.beginPath(); ctx.moveTo(W*.12,H*.57); ctx.lineTo(W*.22,H*.38); ctx.lineTo(W*.29,H*.46); ctx.lineTo(W*.37,H*.26); ctx.lineTo(W*.44,H*.48); ctx.lineTo(W*.50,H*.33); ctx.lineTo(W*.57,H*.49); ctx.lineTo(W*.65,H*.29); ctx.lineTo(W*.72,H*.43); ctx.lineTo(W*.83,H*.34); ctx.lineTo(W*.92,H*.55); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#e8fbff"; ctx.lineWidth = Math.max(2,W*.004); ctx.stroke();
    ctx.strokeStyle = "rgba(44,104,143,.85)"; ctx.lineWidth = Math.max(3,W*.009);
    ctx.beginPath(); ctx.moveTo(W*.47,H*.42); ctx.lineTo(W*.52,H*.49); ctx.lineTo(W*.48,H*.55); ctx.lineTo(W*.55,H*.62); ctx.stroke();
    ctx.strokeStyle = "rgba(231,252,255,.9)"; ctx.lineWidth = Math.max(1,W*.002);
    ctx.beginPath(); ctx.moveTo(W*.43,H*.47); ctx.lineTo(W*.48,H*.51); ctx.moveTo(W*.57,H*.45); ctx.lineTo(W*.53,H*.50); ctx.stroke();
  } else if (theme.scene === "lab") {
    ctx.save(); ctx.translate(cx,H*.39); ctx.rotate(-0.14);
    ctx.fillStyle = "#5b7779"; ctx.fillRect(-W*.095,-H*.09,W*.19,H*.18);
    ctx.strokeStyle = "#9ed8cf"; ctx.lineWidth = 4; ctx.strokeRect(-W*.095,-H*.09,W*.19,H*.18);
    ctx.fillStyle = "#73c5bc88"; ctx.fillRect(-W*.065,-H*.06,W*.13,H*.12);
    ctx.restore();
    ctx.strokeStyle = "#91beb9"; ctx.lineWidth = 3; ctx.strokeRect(W*.16,H*.27,W*.10,H*.23); ctx.strokeRect(W*.76,H*.27,W*.08,H*.23);
    ctx.strokeStyle = "rgba(205,246,236,.72)"; ctx.lineWidth = Math.max(2,W*.005);
    ctx.beginPath(); ctx.moveTo(W*.07,H*.17); ctx.lineTo(W*.93,H*.17); ctx.lineTo(W*.93,H*.22); ctx.lineTo(W*.07,H*.22); ctx.closePath(); ctx.stroke();
    for (let i=0;i<5;i++) { const xx=W*(.12+i*.19); ctx.strokeStyle=i%2?"#78bbb8":"#b2e3d5"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(xx,H*.18); ctx.lineTo(xx+W*.035,H*.29); ctx.stroke(); }
    ctx.fillStyle="rgba(60,211,190,.16)"; ctx.fillRect(W*.31,H*.28,W*.38,H*.16);
    ctx.strokeStyle="#92ddd0"; ctx.strokeRect(W*.31,H*.28,W*.38,H*.16);
  }
  ctx.restore();
}

function _drawHaze(ctx, W, H, theme) {
  if (!theme.haze) return;
  // Oyun bandı (robotların gezindiği dikey aralık) yumuşak bir karartma alır:
  // arkadaki bina/pencere detayı ön plandaki siluetlerle yarışmasın. Kenarları
  // gradyanla eritildi — düz şerit gökyüzünde yatay bir dikiş bırakıyordu
  // (ilk deneme, 2026-10-12). Bu katman yalnız arka plana uygulanır; arazi ve
  // oyuncular bundan sonra çizilir.
  const band = ctx.createLinearGradient(0, H * 0.40, 0, H * 0.86);
  band.addColorStop(0, "rgba(0,0,0,0)");
  band.addColorStop(0.35, "rgba(0,0,0,0.18)");
  band.addColorStop(0.75, "rgba(0,0,0,0.18)");
  band.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = band;
  ctx.fillRect(0, H * 0.40, W, H * 0.46);
  const g = ctx.createLinearGradient(0, H * 0.42, 0, H * 0.82);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, theme.haze);
  ctx.fillStyle = g;
  ctx.fillRect(0, H * 0.42, W, H * 0.42);
}

function _hillLayer(W, H, baseF, amp, len, color) {
  const base = H * baseF, ph = Math.random() * 6.28, ph2 = Math.random() * 6.28, points = [];
  for (let x = 0; x <= W; x += 6) {
    const y = base - amp * Math.sin((x / len) * 6.28 + ph) - amp * 0.4 * Math.sin((x / (len * 0.4)) * 6.28 + ph2);
    points.push({ x, y });
  }
  return { points, color };
}

function _ridgeLayer(W, H, baseF, amp, color, caps) {
  const base = H * baseF, points = [], peaks = [];
  const n = 6 + Math.floor(Math.random() * 3), step = W / n;
  for (let i = 0; i <= n; i++) {
    const x = i * step;
    const y = base - (i % 2 === 0 ? amp * (0.5 + Math.random() * 0.5) : amp * 0.18 * Math.random());
    points.push({ x, y });
    if (i % 2 === 0 && y < H * 0.52) peaks.push({ x, y });
  }
  return { points, color, caps: caps ? peaks : null };
}

function _buildBackdrop(theme, W, H) {
  const kind = theme.backdrop.kind;
  const skyBottom = theme.sky[theme.sky.length - 1];
  const layers = [];
  if (kind === "skyline") {
    const color = _mix(skyBottom, "#0a0a16", 0.72);
    const points = [], windows = [];
    const roofY = H * 0.72;
    let x = 0;
    while (x < W) {
      const bw = 24 + Math.random() * 46, bh = 44 + Math.random() * 120;
      const topY = roofY - bh;
      points.push({ x, y: roofY }, { x, y: topY }, { x: x + bw, y: topY }, { x: x + bw, y: roofY });
      for (let wy = topY + 7; wy < roofY - 5; wy += 11) {
        for (let wx = x + 5; wx < x + bw - 5; wx += 9) {
          // Okunabilirlik (2026-10-12): pencere ışıkları oyun bandında yüksek
          // frekanslı gürültü üretip robot siluetlerini yutuyordu. Yoğunluk
          // 0.45→0.30, renkler karartıldı: arka plan geri çekilir, ön plan okunur.
          if (Math.random() < 0.30) windows.push({ x: wx, y: wy, w: 4, h: 5, c: Math.random() < 0.7 ? "#8a6f3a" : "#54687d" });
        }
      }
      x += bw + 2;
    }
    layers.push({ points, color, windows });
  } else if (kind === "mountains") {
    layers.push(_ridgeLayer(W, H, 0.64, 78, _mix(skyBottom, "#46586a", 0.5), true));
    layers.push(_ridgeLayer(W, H, 0.74, 52, _mix(skyBottom, "#33424f", 0.68), false));
  } else { // hills
    const snowy = theme.surface === "snow";
    const land = snowy ? "#c2d2e2" : theme.grassDeep;
    layers.push(_hillLayer(W, H, 0.66, 26, 520, _mix(skyBottom, land, 0.42)));
    layers.push(_hillLayer(W, H, 0.73, 34, 360, _mix(skyBottom, land, 0.60)));
  }
  return { layers };
}

// Kenarları hafif karartan sinematik vignette (her kare, en sonda).
function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.30, W / 2, H * 0.5, H * 0.86);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/* ---- Arazi zemini (offscreen canvas'a bir kez; kraterle aşınır) ---- */

// Terrain yüzey poligonunu (katı kütle) izle — clip/dolgu için ortak.
function _traceSolid(ctx, heights, w, h) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x < w; x++) ctx.lineTo(x, heights[x]);
  ctx.lineTo(w, h);
  ctx.closePath();
}

// Toprak gövdesi: dikey gradyan + kaya katmanları (strata) + serpme doku.
function paintGround(ctx, heights, w, h, theme) {
  const dirt = theme.dirt;
  const textureByZone = {
    scrapyard: "tex/oxide-rust",
    assembly: "tex/painted-steel",
    warehouse: "tex/painted-steel",
    cooling: "tex/cooling-frost",
    paint: "tex/copper-plates",
    loading: "tex/sandblasted-steel",
    waste: "tex/oily-water",
    sandblast: "tex/sandblasted-steel",
    foundry: "tex/foundry-ash",
  };
  ctx.save();
  _traceSolid(ctx, heights, w, h);
  ctx.clip();

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, _shade(dirt, 0.08));
  g.addColorStop(1, _shade(dirt, -0.34));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const textureImage = typeof assetImage === "function" && theme.zoneId
    ? assetImage(textureByZone[theme.zoneId] || "tex/factory-concrete")
    : null;
  if (textureImage && typeof ctx.createPattern === "function") {
    const pattern = ctx.createPattern(textureImage, "repeat");
    if (pattern) {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  // strata: birkaç ince yatay sediment şeridi
  ctx.fillStyle = _shadeA(dirt, -0.22, 0.4);
  ctx.fillRect(0, h * 0.74, w, 6);
  ctx.fillRect(0, h * 0.88, w, 5);
  ctx.fillStyle = _shadeA(dirt, 0.14, 0.25);
  ctx.fillRect(0, h * 0.81, w, 3);

  // serpme doku noktaları (clip dışı düşenler kırpılır)
  let minSurf = h;
  for (let x = 0; x < w; x += 9) minSurf = Math.min(minSurf, heights[x]);
  for (let i = 0; i < 720; i++) {
    const x = Math.random() * w;
    const y = minSurf + Math.random() * (h - minSurf);
    ctx.fillStyle = Math.random() < 0.5 ? _shadeA(dirt, -0.26, 0.5) : _shadeA(dirt, 0.16, 0.4);
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();
}

// Üst bant — temaya göre (grass / rooftop / snow / autumn).
function paintSurfaceBand(ctx, heights, w, h, theme) {
  const surf = theme.surface || "grass";
  if (surf === "snow") _bandSnow(ctx, heights, w, h, theme);
  else if (surf === "rooftop") _bandRooftop(ctx, heights, w, h, theme);
  else if (surf === "autumn") _bandAutumn(ctx, heights, w, h, theme);
  else if (surf === "sand") _bandSand(ctx, heights, w, h, theme);
  else if (surf === "ash") _bandAsh(ctx, heights, w, h, theme);
  else _bandGrass(ctx, heights, w, h, theme);
}

// Yüzeyden `t` px kalınlıkta, yüzeyi takip eden bandı doldur.
function _fillBand(ctx, heights, w, t, color) {
  ctx.beginPath();
  ctx.moveTo(0, heights[0]);
  for (let x = 1; x < w; x++) ctx.lineTo(x, heights[x]);
  for (let x = w - 1; x >= 0; x--) ctx.lineTo(x, heights[x] + t);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
function _strokeSurface(ctx, heights, w, lw, color) {
  ctx.beginPath();
  ctx.moveTo(0, heights[0]);
  for (let x = 1; x < w; x++) ctx.lineTo(x, heights[x]);
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function _bandGrass(ctx, heights, w, h, theme) {
  ctx.save(); _traceSolid(ctx, heights, w, h); ctx.clip();
  _fillBand(ctx, heights, 16, theme.grassDeep);
  _fillBand(ctx, heights, 6, _shade(theme.grassTop, -0.05));
  ctx.restore();
  _strokeSurface(ctx, heights, w, 3, theme.grassTop);
  // çim bıçakları
  for (let x = 3; x < w; x += 7) {
    const y = heights[x];
    const hgt = 4 + ((x * 7) % 5);
    const lean = (x % 3) - 1;
    ctx.fillStyle = (x % 2) ? theme.grassTop : _shade(theme.grassDeep, 0.1);
    ctx.beginPath();
    ctx.moveTo(x - 1.6, y); ctx.lineTo(x + 1.6, y); ctx.lineTo(x + lean, y - hgt);
    ctx.closePath(); ctx.fill();
  }
}

function _bandSnow(ctx, heights, w, h, theme) {
  ctx.save(); _traceSolid(ctx, heights, w, h); ctx.clip();
  _fillBand(ctx, heights, 20, theme.grassDeep); // buz/kar taban tonu
  _fillBand(ctx, heights, 9, "#ffffff");        // beyaz üst dudak
  // altına soğuk gölge çizgisi
  ctx.beginPath();
  ctx.moveTo(0, heights[0] + 9);
  for (let x = 1; x < w; x++) ctx.lineTo(x, heights[x] + 9);
  ctx.lineWidth = 2; ctx.strokeStyle = "rgba(150,180,210,0.45)"; ctx.stroke();
  ctx.restore();
  _strokeSurface(ctx, heights, w, 3, "#ffffff");
  // parıltı
  for (let x = 6; x < w; x += 16) {
    ctx.fillStyle = (x % 32) ? "rgba(255,255,255,0.9)" : "rgba(200,225,255,0.9)";
    ctx.beginPath(); ctx.arc(x, heights[x] - 1.5, 0.9, 0, Math.PI * 2); ctx.fill();
  }
}

function _bandRooftop(ctx, heights, w, h, theme) {
  ctx.save(); _traceSolid(ctx, heights, w, h); ctx.clip();
  _fillBand(ctx, heights, 16, theme.grassDeep);
  // dikey kiremit çentikleri
  ctx.strokeStyle = _shadeA(theme.grassDeep, -0.3, 0.5);
  ctx.lineWidth = 0.8;
  for (let x = 0; x < w; x += 10) {
    ctx.beginPath(); ctx.moveTo(x, heights[x] + 2); ctx.lineTo(x, heights[x] + 11); ctx.stroke();
  }
  ctx.restore();
  _strokeSurface(ctx, heights, w, 3, theme.grassTop);
  // düz çatı bölümlerine pencere sıraları
  let runStart = 0;
  for (let x = 1; x <= w; x++) {
    const flat = x < w && Math.abs(heights[x] - heights[x - 1]) < 0.7;
    if (!flat) {
      if ((x - 1) - runStart >= 26) {
        const top = heights[runStart];
        for (let row = 0; row < 2; row++) {
          const wy = top + 6 + row * 8;
          for (let wx = runStart + 5; wx < x - 6; wx += 9) {
            ctx.fillStyle = Math.random() < 0.5 ? "#ffd87a" : "rgba(120,140,170,0.5)";
            ctx.fillRect(wx, wy, 4, 5);
          }
        }
      }
      runStart = x;
    }
  }
}

function _bandAutumn(ctx, heights, w, h, theme) {
  ctx.save(); _traceSolid(ctx, heights, w, h); ctx.clip();
  _fillBand(ctx, heights, 16, theme.grassDeep);
  // çok tonlu yamalar
  for (let x = 0; x < w; x += 13) {
    const y = heights[x] + 2;
    ctx.fillStyle = (x % 26) ? _shadeA(theme.grassTop, 0.05, 0.6) : _shadeA(theme.dirt, 0.12, 0.5);
    ctx.fillRect(x, y, 11, 6);
  }
  ctx.restore();
  _strokeSurface(ctx, heights, w, 3, theme.grassTop);
  // yaprak benekleri
  const leaf = ["#e0742a", "#c2521f", "#e8a020", "#a8431a"];
  for (let x = 4; x < w; x += 11) {
    ctx.fillStyle = leaf[(x | 0) % leaf.length];
    ctx.beginPath(); ctx.arc(x, heights[x] - 1, 1.3, 0, Math.PI * 2); ctx.fill();
  }
}

function _bandSand(ctx, heights, w, h, theme) {
  ctx.save(); _traceSolid(ctx, heights, w, h); ctx.clip();
  _fillBand(ctx, heights, 18, theme.grassDeep);
  _fillBand(ctx, heights, 7, theme.grassTop);
  // kum dalgaları (dune)
  ctx.strokeStyle = _shadeA(theme.grassDeep, -0.12, 0.4);
  ctx.lineWidth = 1;
  for (let x = 4; x < w; x += 22) {
    const y = heights[x] + 10;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8, y - 2, x + 16, y); ctx.stroke();
  }
  ctx.restore();
  _strokeSurface(ctx, heights, w, 2.5, _shade(theme.grassTop, 0.1));
  // çakıl benekleri
  for (let x = 8; x < w; x += 14) {
    ctx.fillStyle = _shadeA(theme.dirt, 0.1, 0.5);
    ctx.beginPath(); ctx.arc(x, heights[x] + 3, 0.8, 0, Math.PI * 2); ctx.fill();
  }
}

function _bandAsh(ctx, heights, w, h, theme) {
  ctx.save(); _traceSolid(ctx, heights, w, h); ctx.clip();
  _fillBand(ctx, heights, 16, theme.grassDeep);
  _fillBand(ctx, heights, 5, _shade(theme.grassTop, -0.1));
  ctx.restore();
  _strokeSurface(ctx, heights, w, 2.5, theme.grassTop);
  // ember parıltıları (yüzeyde sıcak çatlaklar)
  for (let x = 5; x < w; x += 9) {
    const glow = (x % 3 === 0);
    ctx.fillStyle = glow ? "rgba(255,140,60,0.9)" : "rgba(255,90,40,0.5)";
    ctx.beginPath(); ctx.arc(x, heights[x] - 1, glow ? 1.4 : 0.9, 0, Math.PI * 2); ctx.fill();
  }
}

/* ---- Objeler (offscreen canvas'a bir kez; kraterle aşınır) ---- */

function _pine(ctx, x, y, theme, snowy) {
  ctx.fillStyle = "#6b4a2a"; ctx.fillRect(x - 2, y - 6, 4, 7);
  const green = snowy ? "#3f7d52" : _shade(theme.grassDeep, -0.12);
  const tiers = [{ yy: -6, ww: 13, hh: 12 }, { yy: -12, ww: 10, hh: 11 }, { yy: -18, ww: 7, hh: 10 }];
  for (const t of tiers) {
    ctx.fillStyle = green;
    ctx.beginPath(); ctx.moveTo(x - t.ww, y + t.yy); ctx.lineTo(x + t.ww, y + t.yy); ctx.lineTo(x, y + t.yy - t.hh); ctx.closePath(); ctx.fill();
    if (snowy) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.moveTo(x, y + t.yy - t.hh); ctx.lineTo(x - 3, y + t.yy - t.hh + 5); ctx.lineTo(x + 3, y + t.yy - t.hh + 5); ctx.closePath(); ctx.fill();
    }
  }
}

const PROP_DRAWERS = {
  grassTuft(ctx, x, y, theme) {
    const col = theme.grassTop;
    for (let i = -2; i <= 2; i++) {
      const bx = x + i * 2, hgt = 7 + (2 - Math.abs(i)) * 2;
      ctx.strokeStyle = (i % 2) ? _shade(col, -0.1) : col;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + i, y - hgt * 0.6, bx + i * 1.5, y - hgt); ctx.stroke();
    }
  },
  flower(ctx, x, y, theme) {
    ctx.strokeStyle = _shade(theme.grassDeep, -0.05); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 9); ctx.stroke();
    const cols = ["#ff7eb6", "#ffe45e", "#ffffff", "#ff6b6b"], c = cols[(x | 0) % cols.length];
    ctx.fillStyle = c;
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 2.4, y - 9 + Math.sin(a) * 2.4, 1.7, 0, 6.28); ctx.fill(); }
    ctx.fillStyle = "#ffd54a"; ctx.beginPath(); ctx.arc(x, y - 9, 1.6, 0, 6.28); ctx.fill();
  },
  bush(ctx, x, y, theme) {
    ctx.fillStyle = _shade(theme.grassDeep, -0.05);
    ctx.beginPath(); ctx.arc(x - 5, y - 4, 6, 0, 6.28); ctx.arc(x + 5, y - 4, 6, 0, 6.28); ctx.arc(x, y - 8, 7, 0, 6.28); ctx.fill();
    ctx.fillStyle = _shade(theme.grassTop, -0.05); ctx.beginPath(); ctx.arc(x - 2, y - 9, 3, 0, 6.28); ctx.fill();
  },
  rock(ctx, x, y, theme) {
    const snow = theme.surface === "snow";
    const base = snow ? "#aebccc" : "#8b8f98";
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 6, y - 7); ctx.lineTo(x - 1, y - 10); ctx.lineTo(x + 5, y - 7); ctx.lineTo(x + 8, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = _shade(base, 0.2);
    ctx.beginPath(); ctx.moveTo(x - 1, y - 10); ctx.lineTo(x + 5, y - 7); ctx.lineTo(x + 1, y - 5); ctx.closePath(); ctx.fill();
    if (snow) { ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(x - 6, y - 7); ctx.lineTo(x - 1, y - 10); ctx.lineTo(x + 2, y - 8); ctx.lineTo(x - 2, y - 6); ctx.closePath(); ctx.fill(); }
  },
  mushroom(ctx, x, y, theme) {
    const cap = theme.surface === "autumn" ? "#b5651d" : "#d9433b";
    ctx.fillStyle = "#f0ead2"; ctx.fillRect(x - 1.5, y - 5, 3, 5);
    ctx.fillStyle = cap; ctx.beginPath(); ctx.arc(x, y - 5, 5, Math.PI, 2 * Math.PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x - 1.5, y - 6, 0.8, 0, 6.28); ctx.arc(x + 1.5, y - 5.5, 0.8, 0, 6.28); ctx.fill();
  },
  pine(ctx, x, y, theme) { _pine(ctx, x, y, theme, false); },
  snowPine(ctx, x, y, theme) { _pine(ctx, x, y, theme, true); },
  snowMound(ctx, x, y) {
    ctx.fillStyle = "#eef5fc"; ctx.beginPath(); ctx.ellipse(x, y, 12, 6, 0, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = "rgba(180,205,230,0.5)"; ctx.beginPath(); ctx.ellipse(x + 3, y, 7, 3, 0, Math.PI, 2 * Math.PI); ctx.fill();
  },
  chimney(ctx, x, y) {
    ctx.fillStyle = "#6b3f3a"; ctx.fillRect(x - 4, y - 14, 8, 14);
    ctx.fillStyle = "#4d2e2a"; ctx.fillRect(x - 5, y - 15, 10, 3);
    ctx.strokeStyle = "rgba(0,0,0,0.22)"; ctx.lineWidth = 0.6;
    for (let yy = y - 12; yy < y; yy += 3) { ctx.beginPath(); ctx.moveTo(x - 4, yy); ctx.lineTo(x + 4, yy); ctx.stroke(); }
    ctx.fillStyle = "rgba(220,220,230,0.16)";
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + k, y - 17 - k * 4, 2 + k, 0, 6.28); ctx.fill(); }
  },
  antenna(ctx, x, y, theme) {
    ctx.strokeStyle = _shade(theme.grassDeep, -0.4); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 16);
    for (let k = 0; k < 3; k++) { const yy = y - 16 + k * 4; ctx.moveTo(x, yy); ctx.lineTo(x - 4 + k, yy - 3); ctx.moveTo(x, yy); ctx.lineTo(x + 4 - k, yy - 3); }
    ctx.stroke();
  },
  tree(ctx, x, y) {
    ctx.fillStyle = "#5a3a22"; ctx.fillRect(x - 2.5, y - 12, 5, 13);
    const cols = ["#e0742a", "#c2521f", "#e8a020"];
    for (let k = 0; k < 3; k++) { ctx.fillStyle = cols[k % cols.length]; ctx.beginPath(); ctx.arc(x + (k - 1) * 5, y - 16 - (k === 1 ? 4 : 0), 7, 0, 6.28); ctx.fill(); }
    ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.arc(x, y - 20, 8, 0, 6.28); ctx.fill();
  },
  pumpkin(ctx, x, y) {
    ctx.fillStyle = "#e8771f"; ctx.beginPath(); ctx.ellipse(x, y - 5, 8, 6, 0, 0, 6.28); ctx.fill();
    ctx.strokeStyle = "#c2521f"; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(x + i * 3, y - 5, 2.5, 6, 0, 0, 6.28); ctx.stroke(); }
    ctx.strokeStyle = "#4a7a2a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x + 2, y - 14); ctx.stroke();
  },
  cactus(ctx, x, y) {
    const g = "#3f8a4a";
    ctx.fillStyle = g;
    ctx.fillRect(x - 3, y - 22, 6, 22);                       // gövde
    ctx.beginPath(); ctx.arc(x, y - 22, 3, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.fillRect(x - 9, y - 16, 4, 9); ctx.fillRect(x - 9, y - 16, 9, 4); // sol kol
    ctx.fillRect(x + 5, y - 13, 4, 8); ctx.fillRect(x, y - 13, 9, 4);     // sağ kol
    ctx.fillStyle = _shade(g, 0.18);
    ctx.fillRect(x - 1.5, y - 21, 1.5, 20);                   // dikey highlight
  },
  deadTree(ctx, x, y) {
    ctx.strokeStyle = "#4a3a2a"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 20); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 12); ctx.lineTo(x - 7, y - 18);
    ctx.moveTo(x, y - 15); ctx.lineTo(x + 6, y - 22);
    ctx.moveTo(x, y - 9); ctx.lineTo(x + 5, y - 12);
    ctx.stroke();
    ctx.lineCap = "butt";
  },
  reeds(ctx, x, y, theme) {
    const col = _shade(theme.grassTop, -0.05);
    ctx.strokeStyle = col; ctx.lineWidth = 1.6;
    for (let i = -3; i <= 3; i++) {
      const bx = x + i * 2.2;
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + i, y - 14, bx + i * 1.4, y - 20); ctx.stroke();
      ctx.fillStyle = "#7a5a2a";
      ctx.beginPath(); ctx.ellipse(bx + i * 1.4, y - 20, 1.4, 3, 0, 0, 6.28); ctx.fill();
    }
  },
  emberRock(ctx, x, y) {
    ctx.fillStyle = "#3a2e2e";
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 5, y - 8); ctx.lineTo(x + 2, y - 9); ctx.lineTo(x + 7, y - 5); ctx.lineTo(x + 8, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,120,40,0.9)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 3, y - 1); ctx.lineTo(x - 1, y - 5); ctx.lineTo(x + 3, y - 4); ctx.stroke();
    ctx.fillStyle = "rgba(255,150,60,0.85)";
    ctx.beginPath(); ctx.arc(x, y - 4, 1, 0, 6.28); ctx.fill();
  },
  gear(ctx, x, y, theme) {
    ctx.save(); ctx.translate(x, y - 7); ctx.fillStyle = _shade(theme.grassTop, -0.25);
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-2, -10, 4, 5); }
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, 6.28); ctx.fill();
    ctx.fillStyle = _shade(theme.dirt, -0.2); ctx.beginPath(); ctx.arc(0, 0, 3, 0, 6.28); ctx.fill(); ctx.restore();
  },
  plate(ctx, x, y, theme) {
    ctx.save(); ctx.translate(x, y - 5); ctx.rotate(((x | 0) % 7 - 3) * 0.05);
    ctx.fillStyle = _shade(theme.grassDeep, 0.08); ctx.fillRect(-10, -5, 20, 10);
    ctx.strokeStyle = _shade(theme.grassDeep, -0.35); ctx.lineWidth = 1; ctx.strokeRect(-10, -5, 20, 10);
    ctx.fillStyle = theme.grassTop; for (const px of [-7, 7]) { ctx.beginPath(); ctx.arc(px, 0, 1.2, 0, 6.28); ctx.fill(); } ctx.restore();
  },
  cable(ctx, x, y, theme) {
    ctx.strokeStyle = _shade(theme.grassDeep, -0.45); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - 5, 9, Math.PI, 6.28); ctx.arc(x + 3, y - 4, 6, 0, Math.PI); ctx.stroke();
  },
  crate(ctx, x, y, theme) {
    ctx.fillStyle = _shade(theme.grassTop, -0.22); ctx.fillRect(x - 9, y - 14, 18, 14);
    ctx.strokeStyle = _shade(theme.grassTop, -0.48); ctx.lineWidth = 1.5; ctx.strokeRect(x - 9, y - 14, 18, 14);
    ctx.beginPath(); ctx.moveTo(x - 8, y - 13); ctx.lineTo(x + 8, y - 1); ctx.moveTo(x + 8, y - 13); ctx.lineTo(x - 8, y - 1); ctx.stroke();
  },
  robotArm(ctx, x, y, theme) {
    ctx.strokeStyle = theme.grassTop; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y - 14); ctx.lineTo(x + 7, y - 23); ctx.stroke();
    ctx.fillStyle = _shade(theme.grassTop, -0.25);
    for (const p of [[x,y-14],[x+7,y-23]]) { ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, 6.28); ctx.fill(); }
  },
  pallet(ctx, x, y) {
    ctx.fillStyle = "#70513b";
    for (let i = -1; i <= 1; i++) ctx.fillRect(x - 11, y - 4 + i * 3, 22, 2);
    ctx.fillRect(x - 8, y - 8, 3, 8); ctx.fillRect(x + 5, y - 8, 3, 8);
  },
  pipe(ctx, x, y, theme) {
    ctx.strokeStyle = _shade(theme.grassTop, -0.28); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 8, y - 15); ctx.quadraticCurveTo(x - 8, y - 20, x - 3, y - 20); ctx.lineTo(x + 8, y - 20); ctx.stroke();
    ctx.fillStyle = theme.grassTop; ctx.fillRect(x + 6, y - 24, 3, 8);
  },
  frostTank(ctx, x, y) {
    ctx.fillStyle = "#8faeba"; ctx.fillRect(x - 7, y - 20, 14, 20);
    ctx.beginPath(); ctx.ellipse(x, y - 20, 7, 4, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#e8fbff"; ctx.fillRect(x - 7, y - 16, 14, 4);
  },
  valve(ctx, x, y, theme) {
    ctx.strokeStyle = _shade(theme.grassTop, -0.3); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 10, 6, 0, 6.28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, y - 10); ctx.lineTo(x + 6, y - 10); ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 4); ctx.stroke();
  },
  paintCan(ctx, x, y, theme) {
    ctx.fillStyle = "#c8ced0"; ctx.fillRect(x - 6, y - 12, 12, 12);
    ctx.fillStyle = theme.grassTop; ctx.fillRect(x - 6, y - 7, 12, 4);
    ctx.strokeStyle = "#555"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 12, 7, Math.PI, 0); ctx.stroke();
  },
  craneHook(ctx, x, y, theme) {
    ctx.strokeStyle = _shade(theme.grassTop, -0.4); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 28); ctx.lineTo(x, y - 10); ctx.arc(x + 3, y - 9, 6, Math.PI, Math.PI * 0.15); ctx.stroke();
  },
  chain(ctx, x, y, theme) {
    ctx.strokeStyle = _shade(theme.grassTop, -0.4); ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(x, y - 4 - i * 5, 3, 5, i % 2 ? Math.PI / 2 : 0, 0, 6.28); ctx.stroke(); }
  },
  barrel(ctx, x, y, theme) {
    ctx.fillStyle = _shade(theme.grassTop, -0.25); ctx.fillRect(x - 7, y - 17, 14, 17);
    ctx.strokeStyle = "#26302a"; ctx.lineWidth = 1.5; ctx.strokeRect(x - 7, y - 17, 14, 17);
    ctx.fillStyle = "#b9d85c"; ctx.fillRect(x - 7, y - 11, 14, 3);
  },
  pressureTank(ctx, x, y, theme) {
    ctx.fillStyle = _shade(theme.grassTop, -0.2); ctx.fillRect(x - 6, y - 21, 12, 21);
    ctx.beginPath(); ctx.ellipse(x, y - 21, 6, 4, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#d9bf62"; ctx.fillRect(x - 6, y - 9, 12, 3);
  },
  sandbag(ctx, x, y) {
    ctx.fillStyle = "#9c805d";
    for (const p of [[-6,-4],[5,-4],[0,-10]]) { ctx.beginPath(); ctx.ellipse(x+p[0], y+p[1], 7, 4, 0, 0, 6.28); ctx.fill(); }
  },
  ladle(ctx, x, y, theme) {
    ctx.strokeStyle = _shade(theme.grassTop, -0.3); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 8, y - 22); ctx.lineTo(x + 2, y - 8); ctx.stroke();
    ctx.fillStyle = "#3b3030"; ctx.beginPath(); ctx.arc(x + 5, y - 6, 7, 0, Math.PI); ctx.fill();
    ctx.fillStyle = "#ff873d"; ctx.fillRect(x, y - 6, 10, 2);
  },
};

function _pickWeighted(list, random = Math.random) {
  let tot = 0; for (const it of list) tot += it.w;
  let r = random() * tot;
  for (const it of list) { r -= it.w; if (r <= 0) return it.type; }
  return list[list.length - 1].type;
}

function _mapRandom(mapId) {
  let state = 2166136261;
  const key = String(mapId || "default-map");
  for (let i = 0; i < key.length; i++) state = Math.imul(state ^ key.charCodeAt(i), 16777619);
  if (!state) state = 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

// Üretim çizimden ayrıdır: testler ve tüm maç istemcileri aynı yerleşimi hesaplar.
function getMapPropPlacements(heights, w, theme) {
  if (!theme || !theme.props || !theme.props.length) return [];
  const dens = theme.propDensity || 100;
  const spawnXs = theme.layout && theme.layout.s
    ? theme.layout.s.map((v) => v * w)
    : [0.18 * w, 0.82 * w];
  const random = _mapRandom(theme.id);
  const placements = [];
  for (let x = 44; x < w - 44; x += dens * (0.6 + random() * 0.8)) {
    const px = Math.round(x);
    if (spawnXs.some((sx) => Math.abs(px - sx) < 36)) continue;
    placements.push({ x: px, y: heights[px], type: _pickWeighted(theme.props, random) });
  }
  return placements;
}

// Haritanın kimliği dekorları sabitler; çizim Math.random durumunu değiştirmez.
function paintProps(ctx, heights, w, h, theme) {
  for (const prop of getMapPropPlacements(heights, w, theme)) {
    const drawer = PROP_DRAWERS[prop.type];
    if (drawer) drawer(ctx, prop.x, prop.y, theme);
  }
}

/* ---- Harita seçim kartı için küçük önizleme ---- */

// Arketip (veya eski stil) için temsili yükseklik silüeti — karttaki arazi şekli.
function _previewProfile(key, w, baseY, amp) {
  const h = new Float32Array(w);
  const gauss = (t, c, k) => Math.exp(-(t - c) * (t - c) * k);
  for (let x = 0; x < w; x++) {
    const t = x / w; let y = baseY;
    switch (key) {
      // ── skill arketipleri ──
      case "arena": // iki yan plato + alçak düz orta
        y -= amp * 0.85 * gauss(t, 0.27, 36); y -= amp * 0.85 * gauss(t, 0.73, 36); y += amp * 0.25 * gauss(t, 0.5, 30); break;
      case "vertical": // kademeli platformlar + orta mesa
        y -= amp * 1.05 * gauss(t, 0.5, 26); y -= amp * 0.6 * gauss(t, 0.3, 60); y -= amp * 0.6 * gauss(t, 0.7, 60); break;
      case "open": // alçak + iki yanda vantaj
        y -= amp * 0.5 * gauss(t, 0.18, 60); y -= amp * 0.5 * gauss(t, 0.82, 60); y += amp * 0.12 * gauss(t, 0.5, 8); break;
      case "thick": // yüksek/dolgun gövde + tümsek
        y -= amp * 0.45; y -= amp * 0.3 * gauss(t, 0.35, 30); y -= amp * 0.3 * gauss(t, 0.65, 30); break;
      case "lane": // düz orta koridor + yan rampalar
        y -= amp * 0.45 * gauss(t, 0.14, 50); y -= amp * 0.45 * gauss(t, 0.86, 50); break;
      case "bastion": // orta havza + siper sırtları
        y += amp * 0.5 * gauss(t, 0.5, 14); y -= amp * 0.7 * gauss(t, 0.33, 40); y -= amp * 0.7 * gauss(t, 0.67, 40); break;
      // ── eski stiller (yedek) ──
      case "peak":
        y -= amp * 1.1 * gauss(t, 0.5, 14); y -= amp * 0.12 * Math.sin(t * Math.PI * 6); break;
      case "twin":
        y -= amp * 0.95 * gauss(t, 0.28, 42); y -= amp * 0.95 * gauss(t, 0.72, 42); y += amp * 0.35 * gauss(t, 0.5, 50); break;
      case "rugged":
        y -= amp * 0.40 * Math.sin(t * Math.PI * 3 + 0.5); y -= amp * 0.28 * Math.sin(t * Math.PI * 9 + 2); y -= amp * 0.18 * Math.sin(t * Math.PI * 17); break;
      default:
        y -= amp * 0.50 * Math.sin(t * Math.PI * 2); y -= amp * 0.22 * Math.sin(t * Math.PI * 5 + 1);
    }
    h[x] = y;
  }
  return h;
}

// Surface'e göre küçük obje ipucu (önizleme ölçeğinde).
function _previewProp(ctx, x, y, theme) {
  if (theme.zoneId) {
    ctx.strokeStyle = theme.grassTop; ctx.fillStyle = theme.grassDeep; ctx.lineWidth = 1.5;
    if (theme.zoneId === "scrapyard") {
      ctx.beginPath(); ctx.arc(x, y - 5, 5, 0, 6.28); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 5, 1.7, 0, 6.28); ctx.fill();
    } else if (theme.zoneId === "cooling") {
      ctx.fillRect(x - 4, y - 12, 8, 12); ctx.fillStyle = "#e9fbff"; ctx.fillRect(x - 4, y - 9, 8, 3);
    } else if (theme.zoneId === "foundry") {
      ctx.fillStyle = "#3a2e2e"; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x - 2, y - 7); ctx.lineTo(x + 5, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ff873d"; ctx.beginPath(); ctx.arc(x, y - 3, 1.5, 0, 6.28); ctx.fill();
    } else {
      ctx.fillRect(x - 5, y - 9, 10, 9); ctx.strokeStyle = theme.grassTop; ctx.strokeRect(x - 5, y - 9, 10, 9);
    }
    return;
  }
  const s = theme.surface;
  if (s === "rooftop") {
    ctx.fillStyle = "#ffd87a";
    ctx.fillRect(x - 3, y - 7, 2.4, 3); ctx.fillRect(x, y - 7, 2.4, 3); ctx.fillRect(x - 3, y - 3, 2.4, 3);
  } else if (s === "snow") {
    ctx.fillStyle = "#3f7d52"; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.lineTo(x, y - 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x - 2, y - 7); ctx.lineTo(x + 2, y - 7); ctx.closePath(); ctx.fill();
  } else if (s === "autumn") {
    ctx.fillStyle = "#5a3a22"; ctx.fillRect(x - 1, y - 8, 2, 8);
    ctx.fillStyle = "#e0742a"; ctx.beginPath(); ctx.arc(x, y - 11, 5, 0, 6.28); ctx.fill();
  } else if (s === "sand") {
    ctx.fillStyle = "#3f8a4a"; ctx.fillRect(x - 1.5, y - 11, 3, 11);
    ctx.fillRect(x - 5, y - 8, 2, 5); ctx.fillRect(x - 5, y - 8, 4, 2);
    ctx.fillRect(x + 3, y - 6, 2, 4); ctx.fillRect(x, y - 6, 4, 2);
  } else if (s === "ash") {
    ctx.fillStyle = "#3a2e2e"; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x - 2, y - 5); ctx.lineTo(x + 4, y - 4); ctx.lineTo(x + 5, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,140,60,0.9)"; ctx.beginPath(); ctx.arc(x, y - 3, 1.1, 0, 6.28); ctx.fill();
  } else {
    ctx.fillStyle = _shade(theme.grassDeep, -0.05);
    ctx.beginPath(); ctx.arc(x - 3, y - 3, 4, 0, 6.28); ctx.arc(x + 3, y - 3, 4, 0, 6.28); ctx.arc(x, y - 6, 4.5, 0, 6.28); ctx.fill();
  }
}

function drawMapPreview(ctx, x, y, w, h, theme) {
  ctx.save();
  _csRoundRect(ctx, x, y, w, h, 8);
  ctx.clip();

  // gökyüzü (2/3 duraklı)
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  const sk = theme.sky;
  if (sk.length >= 3) { g.addColorStop(0, sk[0]); g.addColorStop(0.5, sk[1]); g.addColorStop(1, sk[2]); }
  else { g.addColorStop(0, sk[0]); g.addColorStop(1, sk[1]); }
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);

  // Raster arka plan hazırsa gökyüzü/gece ipucu yerine gerçek katman çizilir.
  // Arazi profili ve obje ipuçları her iki yolda da kalır: kart oynanış
  // geometrisini göstermek zorunda, yalnız fon değişir.
  const rasterBg = theme.zoneId && typeof drawPreviewAsset === "function"
    ? drawPreviewAsset(ctx, theme.zoneId, x, y, w, h, theme.backdropMid !== false)
    : false;

  // güneş/ay
  if (theme.orb && !rasterBg) { ctx.fillStyle = theme.orb; ctx.beginPath(); ctx.arc(x + w - 18, y + 16, 8, 0, Math.PI * 2); ctx.fill(); }

  // yıldız/kar ipucu
  if ((theme.stars || theme.snow) && !rasterBg) {
    ctx.fillStyle = theme.stars ? "#ffffffcc" : "#ffffff";
    for (let i = 0; i < 16; i++) {
      const sx = x + 4 + ((i * 53) % (w - 8)), sy = y + 4 + ((i * 37) % Math.floor(h * 0.5));
      ctx.beginPath(); ctx.arc(sx, sy, theme.snow ? 1.4 : 1, 0, Math.PI * 2); ctx.fill();
    }
  }

  if (theme.scene && !rasterBg) {
    ctx.save(); ctx.translate(x, y); drawMapLandmark(ctx, w, h, theme); ctx.restore();
  }

  // uzak tepe ipucu
  const land = theme.surface === "snow" ? "#c2d2e2" : theme.grassDeep;
  if (!rasterBg) {
    ctx.fillStyle = _mix(sk[sk.length - 1], land, 0.5);
    ctx.beginPath(); ctx.moveTo(x, y + h);
    for (let i = 0; i <= w; i += 8) ctx.lineTo(x + i, y + h * 0.52 - 6 * Math.sin(i / 38));
    ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  }

  // Ana arazi silüeti. Haritaya özel kayıt varsa gerçek maçla aynı profil;
  // eski kayıtlar için arketip önizlemesi geriye uyumluluk amacıyla kalır.
  const baseY = y + h * 0.62;
  const prof = theme.layout
    ? Array.from(mapLayoutProfile(theme.layout, w, h), (py) => y + py)
    : _previewProfile(theme.archetype || theme.style, w, baseY, h * 0.32);
  ctx.beginPath(); ctx.moveTo(x, y + h);
  for (let i = 0; i < w; i++) ctx.lineTo(x + i, prof[i]);
  ctx.lineTo(x + w, y + h); ctx.closePath();
  ctx.fillStyle = theme.dirt; ctx.fill();

  // yüzey bandı + üst çizgi
  ctx.beginPath(); ctx.moveTo(x, prof[0]);
  for (let i = 1; i < w; i++) ctx.lineTo(x + i, prof[i]);
  for (let i = w - 1; i >= 0; i--) ctx.lineTo(x + i, prof[i] + 9);
  ctx.closePath(); ctx.fillStyle = theme.grassDeep; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, prof[0]);
  for (let i = 1; i < w; i++) ctx.lineTo(x + i, prof[i]);
  ctx.lineWidth = 2.5; ctx.strokeStyle = theme.grassTop; ctx.stroke();

  // Gerçek üst yollar ve tüneller kartta da görünür. Koordinatlar kartın kendi
  // boyutuna ölçeklendiği için önizleme ile maç geometrisi aynı kaynaktan gelir.
  if (theme.layout) {
    for (const rect of theme.layout.solids || []) {
      const rx = x + rect.x * w, ry = y + rect.y * h;
      const rw = rect.w * w, rh = rect.h * h;
      ctx.fillStyle = theme.dirt; ctx.fillRect(rx, ry, rw, rh);
      ctx.fillStyle = theme.grassDeep; ctx.fillRect(rx, ry, rw, Math.min(4, rh));
      ctx.fillStyle = theme.grassTop; ctx.fillRect(rx, ry, rw, Math.min(2, rh));
    }
    for (const rect of theme.layout.cuts || []) {
      const rx = x + rect.x * w, ry = y + rect.y * h;
      const rw = rect.w * w, rh = rect.h * h;
      const pit = ctx.createLinearGradient(0, ry, 0, y + h);
      pit.addColorStop(0, theme.scene === "ice" ? "#244b66" : sk[sk.length - 1]);
      pit.addColorStop(1, theme.scene === "ice" ? "#07111f" : _shade(theme.dirt, -0.45));
      ctx.fillStyle = pit; ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = _shade(theme.dirt, -0.35); ctx.lineWidth = 1.5;
      ctx.strokeRect(rx, ry, rw, rh);
    }
    for (const cliff of theme.layout.cliffs || []) {
      const left = x + cliff.x * w, right = x + (cliff.x + cliff.w) * w;
      const top = y + cliff.y * h;
      for (const edgeX of [left, right]) {
        const inward = edgeX === left ? 1 : -1;
        ctx.fillStyle = "rgba(46,92,118,.92)";
        ctx.fillRect(edgeX, top, inward * 5, y + h - top);
        ctx.strokeStyle = "#eafcff"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(edgeX, top); ctx.lineTo(edgeX + inward * 2, top + 7);
        ctx.lineTo(edgeX, top + 14); ctx.lineTo(edgeX + inward * 3, top + 23); ctx.stroke();
      }
    }
  }

  // obje ipuçları
  for (const fx of [0.34, 0.6, 0.8]) {
    const idx = Math.min(w - 1, Math.max(0, Math.round(w * fx)));
    _previewProp(ctx, x + idx, prof[idx], theme);
  }

  ctx.restore();
}

// Çeviri katmanı: katalog yüklendiği anda seçili dili uygula. i18n.js bu
// dosyadan önce yüklenir; katalog çevirisi (DATA_CATALOGS) dil değişiminde
// setLocale içinde, ilk yüklemede ise burada uygulanır — böylece sondalar gibi
// betik yükleme anında çizen sayfalar da doğru dilde çizer.
if (typeof applyDataTranslations === "function") applyDataTranslations();

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

/* ══════════════════════════════════════════════════════════════════════════
 * 100% Vektör Arka Plan Çizim Motoru (Zero-Pixel Vector Backdrops)
 *
 * Her haritaya özel; çözünürlükten bağımsız (HiDPI / 2K / 4K / Retina),
 * sıfır pikselleşme, temiz cel-shaded endüstriyel çizgiler ve zengin
 * katmanlı silüetler.
 * ══════════════════════════════════════════════════════════════════════════ */

function drawMapBackdropVector(ctx, W, H, theme) {
  const scene = theme.scene || "";
  const zone = theme.zoneId || "";
  if (scene === "furnace" || zone === "foundry") {
    _drawFurnaceBackdrop(ctx, W, H, theme);
  } else if (scene === "crane" || zone === "warehouse") {
    _drawCraneYardBackdrop(ctx, W, H, theme);
  } else if (scene === "reactor" || zone === "waste") {
    _drawReactorGardenBackdrop(ctx, W, H, theme);
  } else if (scene === "moon" || zone === "scrapyard") {
    _drawMoonScrapyardBackdrop(ctx, W, H, theme);
  } else if (scene === "ice" || zone === "cooling") {
    _drawIceRiftBackdrop(ctx, W, H, theme);
  } else if (scene === "lab" || zone === "assembly") {
    _drawFloodedLabBackdrop(ctx, W, H, theme);
  } else {
    _drawGenericZoneBackdrop(ctx, W, H, theme);
  }
}

function _drawFurnaceBackdrop(ctx, W, H, theme) {
  ctx.save();

  // 1. Zengin Sanayi Gökyüzü ve Işık Gradyanı
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.85);
  skyGrad.addColorStop(0, "#190f1d");
  skyGrad.addColorStop(0.35, "#3b1723");
  skyGrad.addColorStop(0.68, "#7a2a22");
  skyGrad.addColorStop(0.92, "#d65d28");
  skyGrad.addColorStop(1.0, "#ff8e38");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Dumanlı Kızıl Güneş / Ocaktan Yansıyan Ufuk Parıltısı
  const sunX = W * 0.74, sunY = H * 0.32;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, W * 0.22);
  sunGlow.addColorStop(0, "rgba(255, 170, 70, 0.45)");
  sunGlow.addColorStop(0.4, "rgba(235, 90, 40, 0.22)");
  sunGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, W * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffb266";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
  ctx.fill();

  // 3. Uzak Katman: Yüksek Soğutma Kuleleri & Fabrika Silüetleri (Far Layer)
  ctx.fillStyle = "#26151f";
  // Kule 1 (Sol)
  ctx.beginPath();
  ctx.moveTo(W * 0.04, H * 0.65);
  ctx.quadraticCurveTo(W * 0.08, H * 0.38, W * 0.09, H * 0.24);
  ctx.lineTo(W * 0.17, H * 0.24);
  ctx.quadraticCurveTo(W * 0.18, H * 0.38, W * 0.22, H * 0.65);
  ctx.closePath();
  ctx.fill();
  // Kule 2 (Orta-Sağ)
  ctx.beginPath();
  ctx.moveTo(W * 0.58, H * 0.65);
  ctx.quadraticCurveTo(W * 0.62, H * 0.35, W * 0.63, H * 0.20);
  ctx.lineTo(W * 0.72, H * 0.20);
  ctx.quadraticCurveTo(W * 0.73, H * 0.35, W * 0.77, H * 0.65);
  ctx.closePath();
  ctx.fill();

  // İnce Yüksek Bacalar ve Duman Bulutları
  const chimneys = [
    { x: W * 0.03, w: W * 0.022, h: H * 0.44 },
    { x: W * 0.26, w: W * 0.018, h: H * 0.38 },
    { x: W * 0.83, w: W * 0.025, h: H * 0.48 },
    { x: W * 0.93, w: W * 0.020, h: H * 0.40 },
  ];
  for (const c of chimneys) {
    ctx.fillRect(c.x, H * 0.65 - c.h, c.w, c.h);
    ctx.fillRect(c.x - 3, H * 0.65 - c.h, c.w + 6, 6);
    ctx.fillStyle = "rgba(45, 20, 26, 0.45)";
    const topY = H * 0.65 - c.h;
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2 + 6, topY - 14, 18, 0, Math.PI * 2);
    ctx.arc(c.x + c.w / 2 + 20, topY - 32, 26, 0, Math.PI * 2);
    ctx.arc(c.x + c.w / 2 + 42, topY - 50, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#26151f";
  }

  // Uzak Galeri ve Boru Hatları
  ctx.strokeStyle = "#26151f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W * 0.08, H * 0.38);
  ctx.lineTo(W * 0.65, H * 0.42);
  ctx.moveTo(W * 0.22, H * 0.48);
  ctx.lineTo(W * 0.85, H * 0.44);
  ctx.stroke();

  // 4. Orta Katman: Çelik Konstrüksiyon, Tavan Vinci Rayları (Mid Architecture)
  ctx.strokeStyle = "#381d26";
  ctx.lineWidth = 6;
  const gantryY = H * 0.16;
  ctx.beginPath();
  ctx.moveTo(0, gantryY);
  ctx.lineTo(W, gantryY);
  ctx.moveTo(0, gantryY + 18);
  ctx.lineTo(W, gantryY + 18);
  ctx.stroke();

  // Kafes Kiriş Çaprazları (X X X)
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let gx = 0; gx < W; gx += 40) {
    ctx.moveTo(gx, gantryY);
    ctx.lineTo(gx + 40, gantryY + 18);
    ctx.moveTo(gx + 40, gantryY);
    ctx.lineTo(gx, gantryY + 18);
  }
  ctx.stroke();

  // Dikey Taşıyıcı Sütunlar
  ctx.fillStyle = "#381d26";
  const cols = [W * 0.15, W * 0.45, W * 0.85];
  for (const cx of cols) {
    ctx.fillRect(cx - 8, gantryY, 16, H * 0.6);
    // Güvenlik Korkuluğu ve Sarı/Siyah İkaz Şeridi (Hazard Stripes)
    for (let hy = gantryY + 40; hy < H * 0.65; hy += 70) {
      ctx.fillStyle = "#e2ad3b";
      ctx.fillRect(cx - 16, hy, 32, 8);
      ctx.fillStyle = "#1e1318";
      ctx.beginPath();
      ctx.moveTo(cx - 14, hy); ctx.lineTo(cx - 8, hy + 8);
      ctx.moveTo(cx - 4, hy);  ctx.lineTo(cx + 2, hy + 8);
      ctx.moveTo(cx + 6, hy);  ctx.lineTo(cx + 12, hy + 8);
      ctx.strokeStyle = "#1e1318"; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = "#381d26";
    }
  }

  // 5. Odak Noktası: Asılı Dev Döküm Potası (Smelting Ladle) ve Akan Erimiş Metal
  const lX = W * 0.50, lY = H * 0.32;
  ctx.strokeStyle = "#5a3038";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(lX - 35, gantryY + 18);
  ctx.lineTo(lX - 30, lY);
  ctx.moveTo(lX + 35, gantryY + 18);
  ctx.lineTo(lX + 30, lY);
  ctx.stroke();

  // Pota Gövdesi
  ctx.save();
  ctx.translate(lX, lY);
  ctx.rotate(0.14);

  ctx.fillStyle = "#4a262e";
  ctx.strokeStyle = "#200e14";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-45, -15);
  ctx.lineTo(45, -15);
  ctx.lineTo(36, 42);
  ctx.quadraticCurveTo(0, 52, -36, 42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#5c323b";
  ctx.fillRect(-48, 8, 96, 6);
  ctx.fillStyle = "#ff6a20";
  ctx.beginPath();
  ctx.ellipse(0, -15, 42, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffdf79";
  ctx.beginPath();
  ctx.ellipse(-12, -15, 26, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Erimiş Metal Akıntısı (Molten Metal Cascade)
  const pourX = lX - 36, pourStartY = lY + 2;
  const pourEndY = H * 0.72;

  // Dış Işıma Aurası (Ateş Parıltısı)
  const pourAura = ctx.createLinearGradient(pourX - 25, 0, pourX + 25, 0);
  pourAura.addColorStop(0, "rgba(255, 90, 0, 0)");
  pourAura.addColorStop(0.5, "rgba(255, 100, 20, 0.55)");
  pourAura.addColorStop(1, "rgba(255, 90, 0, 0)");
  ctx.fillStyle = pourAura;
  ctx.fillRect(pourX - 30, pourStartY, 60, pourEndY - pourStartY + 10);

  // Ana Lav Dalgası
  ctx.fillStyle = "#ff5500";
  ctx.beginPath();
  ctx.moveTo(pourX - 9, pourStartY);
  ctx.quadraticCurveTo(pourX - 14, (pourStartY + pourEndY) / 2, pourX - 18, pourEndY);
  ctx.lineTo(pourX + 18, pourEndY);
  ctx.quadraticCurveTo(pourX + 14, (pourStartY + pourEndY) / 2, pourX + 9, pourStartY);
  ctx.closePath();
  ctx.fill();

  // İç Akkor Çekirdek (Parlak Sarı/Beyaz Sıvı Çelik)
  ctx.fillStyle = "#fff4b8";
  ctx.beginPath();
  ctx.moveTo(pourX - 3, pourStartY);
  ctx.quadraticCurveTo(pourX - 5, (pourStartY + pourEndY) / 2, pourX - 7, pourEndY);
  ctx.lineTo(pourX + 7, pourEndY);
  ctx.quadraticCurveTo(pourX + 5, (pourStartY + pourEndY) / 2, pourX + 3, pourStartY);
  ctx.closePath();
  ctx.fill();

  // Erimiş Metal Havuzu / Cüruf Yatağı
  const poolGrad = ctx.createLinearGradient(0, pourEndY - 5, 0, pourEndY + 35);
  poolGrad.addColorStop(0, "#ffe885");
  poolGrad.addColorStop(0.3, "#ff6e1a");
  poolGrad.addColorStop(1, "#661812");
  ctx.fillStyle = poolGrad;
  ctx.beginPath();
  ctx.ellipse(pourX, pourEndY, 75, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Uçuşan Ateş Kıvılcımları (Sparks & Embers)
  const sparks = [
    { x: -18, y: -25, r: 2.2 }, { x: 12, y: -45, r: 1.8 }, { x: -35, y: -70, r: 1.4 },
    { x: 28, y: -85, r: 2.0 }, { x: -8, y: -110, r: 1.6 }, { x: 42, y: -130, r: 1.5 },
    { x: -22, y: -155, r: 1.9 }, { x: 16, y: -180, r: 1.3 }, { x: -45, y: -210, r: 1.7 },
  ];
  for (const s of sparks) {
    ctx.fillStyle = "#ffe480";
    ctx.beginPath();
    ctx.arc(pourX + s.x, pourEndY + s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 100, 20, 0.35)";
    ctx.beginPath();
    ctx.arc(pourX + s.x, pourEndY + s.y, s.r * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function _drawCraneYardBackdrop(ctx, W, H, theme) {
  ctx.save();

  // 1. Derin Gece & Liman Gökyüzü
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.85);
  skyGrad.addColorStop(0, "#080e1b");
  skyGrad.addColorStop(0.40, "#121e36");
  skyGrad.addColorStop(0.75, "#1f3352");
  skyGrad.addColorStop(1.0, "#334e70");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Parlak Ay & Yumuşak Gece Halesi
  const moonX = W * 0.82, moonY = H * 0.18;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, 12, moonX, moonY, 65);
  moonGlow.addColorStop(0, "rgba(230, 240, 255, 0.35)");
  moonGlow.addColorStop(0.5, "rgba(180, 210, 255, 0.12)");
  moonGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 65, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#eaf2fb";
  ctx.beginPath();
  ctx.arc(moonX, moonY, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ccd9e8";
  ctx.beginPath();
  ctx.arc(moonX - 6, moonY + 4, 5, 0, Math.PI * 2);
  ctx.arc(moonX + 8, moonY - 5, 3.5, 0, Math.PI * 2);
  ctx.arc(moonX + 4, moonY + 8, 4, 0, Math.PI * 2);
  ctx.fill();

  // 3. Liman Arama Işığı (Searchlight Beam)
  const beamGrad = ctx.createLinearGradient(W * 0.18, H * 0.62, W * 0.45, H * 0.05);
  beamGrad.addColorStop(0, "rgba(200, 230, 255, 0.22)");
  beamGrad.addColorStop(1, "rgba(200, 230, 255, 0)");
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(W * 0.18, H * 0.62);
  ctx.lineTo(W * 0.40, 0);
  ctx.lineTo(W * 0.52, 0);
  ctx.closePath();
  ctx.fill();

  // 4. Uzak Silüet: Şehir ve Asma Köprü Kuleleri
  ctx.fillStyle = "#152438";
  const skyline = [
    { x: W * 0.05, w: 32, h: 110 }, { x: W * 0.10, w: 28, h: 80 }, { x: W * 0.14, w: 42, h: 140 },
    { x: W * 0.25, w: 36, h: 95 },  { x: W * 0.32, w: 50, h: 160 }, { x: W * 0.40, w: 30, h: 120 },
    { x: W * 0.65, w: 45, h: 130 }, { x: W * 0.72, w: 35, h: 90 },  { x: W * 0.88, w: 40, h: 150 },
  ];
  for (const b of skyline) {
    ctx.fillRect(b.x, H * 0.65 - b.h, b.w, b.h);
    for (let wy = H * 0.65 - b.h + 12; wy < H * 0.65 - 10; wy += 14) {
      for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += 9) {
        if ((wx * 13 + wy * 17) % 5 === 0) {
          ctx.fillStyle = ((wx + wy) % 3 === 0) ? "#ffe680" : "#70d6ff";
          ctx.fillRect(wx, wy, 3.5, 4.5);
          ctx.fillStyle = "#152438";
        }
      }
    }
  }

  // Uzak Asma Köprü Kulesi ve Kablolar
  const brX = W * 0.54, brH = 175;
  ctx.fillRect(brX, H * 0.65 - brH, 8, brH);
  ctx.fillRect(brX + 22, H * 0.65 - brH, 8, brH);
  ctx.fillRect(brX - 4, H * 0.65 - brH + 30, 38, 5);
  ctx.strokeStyle = "#152438";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(brX - 60, H * 0.65 - 40);
  ctx.quadraticCurveTo(brX, H * 0.65 - brH + 10, brX + 15, H * 0.65 - brH);
  ctx.quadraticCurveTo(brX + 30, H * 0.65 - brH + 10, brX + 90, H * 0.65 - 40);
  ctx.stroke();

  // 5. Orta Katman: İki Büyük Liman Vinci (Lattice Gantry Cranes)
  const c1X = W * 0.22, c1BaseY = H * 0.65;
  ctx.strokeStyle = "#253a54";
  ctx.fillStyle = "#253a54";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(c1X - 42, c1BaseY);
  ctx.lineTo(c1X, c1BaseY - 170);
  ctx.lineTo(c1X + 42, c1BaseY);
  ctx.stroke();

  ctx.lineWidth = 2;
  for (let step = 0; step < 4; step++) {
    const y1 = c1BaseY - 35 * step, y2 = c1BaseY - 35 * (step + 1);
    const span1 = 42 * (1 - step / 5), span2 = 42 * (1 - (step + 1) / 5);
    ctx.beginPath();
    ctx.moveTo(c1X - span1, y1); ctx.lineTo(c1X + span2, y2);
    ctx.moveTo(c1X + span1, y1); ctx.lineTo(c1X - span2, y2);
    ctx.stroke();
  }

  const boomY = c1BaseY - 170;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(c1X - 60, boomY + 8);
  ctx.lineTo(c1X + 160, boomY - 16);
  ctx.moveTo(c1X - 60, boomY - 6);
  ctx.lineTo(c1X + 160, boomY - 30);
  ctx.stroke();

  ctx.fillRect(c1X - 65, boomY - 12, 22, 24);
  ctx.fillStyle = "#ffe480";
  ctx.fillRect(c1X + 8, boomY - 2, 10, 8);
  ctx.fillStyle = "#253a54";

  const cableX = c1X + 90, cableTopY = boomY - 22;
  ctx.strokeStyle = "#5a7a9e";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cableX, cableTopY);
  ctx.lineTo(cableX, cableTopY + 75);
  ctx.moveTo(cableX + 32, cableTopY);
  ctx.lineTo(cableX + 32, cableTopY + 75);
  ctx.stroke();

  ctx.fillStyle = "#d4682a";
  ctx.fillRect(cableX - 6, cableTopY + 75, 44, 22);
  ctx.strokeStyle = "#1b2533";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cableX - 6, cableTopY + 75, 44, 22);
  for (let kx = cableX - 2; kx < cableX + 36; kx += 7) {
    ctx.beginPath(); ctx.moveTo(kx, cableTopY + 76); ctx.lineTo(kx, cableTopY + 96); ctx.stroke();
  }

  const c2X = W * 0.78, c2BaseY = H * 0.65;
  ctx.strokeStyle = "#203248";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(c2X - 25, c2BaseY); ctx.lineTo(c2X, c2BaseY - 120); ctx.lineTo(c2X + 25, c2BaseY);
  ctx.moveTo(c2X - 40, c2BaseY - 120); ctx.lineTo(c2X + 90, c2BaseY - 140);
  ctx.stroke();

  ctx.fillStyle = "#ff2a3a";
  ctx.beginPath();
  ctx.arc(c1X, boomY - 32, 3.5, 0, Math.PI * 2);
  ctx.arc(c2X, c2BaseY - 142, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 50, 50, 0.4)";
  ctx.beginPath();
  ctx.arc(c1X, boomY - 32, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function _drawReactorGardenBackdrop(ctx, W, H, theme) {
  ctx.save();

  // 1. Toksik Biyom Gökyüzü (Teal to Murky Olive)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, "#0c1d1a");
  skyGrad.addColorStop(0.35, "#183226");
  skyGrad.addColorStop(0.70, "#2c4b37");
  skyGrad.addColorStop(1.0, "#486f4a");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Uzak Soğutma Kuleleri ve Çatlak Detayı (krater oyulunca dipsiz boşluk kalmaması için H'ye uzanır)
  ctx.fillStyle = "#1e332a";
  const t1X = W * 0.16, t1Y = H;
  ctx.beginPath();
  ctx.moveTo(t1X - 60, t1Y);
  ctx.quadraticCurveTo(t1X - 28, H * 0.45, t1X - 35, H * 0.25);
  ctx.lineTo(t1X + 35, H * 0.25);
  ctx.quadraticCurveTo(t1X + 28, H * 0.45, t1X + 60, t1Y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#38d95e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(t1X - 6, H * 0.28);
  ctx.lineTo(t1X + 4, H * 0.35);
  ctx.lineTo(t1X - 8, H * 0.43);
  ctx.lineTo(t1X + 12, H * 0.52);
  ctx.stroke();

  const t2X = W * 0.82;
  ctx.beginPath();
  ctx.moveTo(t2X - 52, t1Y);
  ctx.quadraticCurveTo(t2X - 24, H * 0.48, t2X - 30, H * 0.31);
  ctx.lineTo(t2X + 30, H * 0.31);
  ctx.quadraticCurveTo(t2X + 24, H * 0.48, t2X + 52, t1Y);
  ctx.closePath();
  ctx.fill();

  // 3. Orta Katman: Reaktör Çekirdeği ve Neon Yeşil Radyasyon Işıması
  const rX = W * 0.50, rY = H * 0.38;

  const radGlow = ctx.createRadialGradient(rX, rY, 15, rX, rY, 110);
  radGlow.addColorStop(0, "rgba(80, 255, 120, 0.65)");
  radGlow.addColorStop(0.35, "rgba(50, 210, 90, 0.30)");
  radGlow.addColorStop(0.75, "rgba(30, 140, 60, 0.10)");
  radGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = radGlow;
  ctx.beginPath();
  ctx.arc(rX, rY, 110, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#273a30";
  ctx.beginPath();
  ctx.arc(rX, rY, 52, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#435f4f";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(rX, rY, 52, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#55ff77";
  ctx.beginPath();
  ctx.arc(rX, rY, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#eaffb5";
  ctx.beginPath();
  ctx.arc(rX, rY, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#a8ca70";
  ctx.lineWidth = 4;
  for (let a = 0; a < 8; a++) {
    const ang = a * (Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(rX + Math.cos(ang) * 28, rY + Math.sin(ang) * 28);
    ctx.lineTo(rX + Math.cos(ang) * 54, rY + Math.sin(ang) * 54);
    ctx.stroke();
  }

  // 4. Doğanın İstila Ettiği Borular ve Sarmaşıklar
  ctx.strokeStyle = "#2d4838";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(W * 0.15, H * 0.22);
  ctx.quadraticCurveTo(W * 0.32, H * 0.44, rX, rY + 30);
  ctx.moveTo(W * 0.85, H * 0.20);
  ctx.quadraticCurveTo(W * 0.68, H * 0.42, rX, rY + 30);
  ctx.stroke();

  ctx.fillStyle = "#548842";
  for (let v = 0; v < 14; v++) {
    const vx = rX - 160 + v * 25;
    const vy = rY + 20 + Math.sin(v * 0.7) * 16;
    ctx.beginPath();
    ctx.ellipse(vx, vy, 8, 4, v * 0.4, 0, Math.PI * 2);
    ctx.fill();
    if (v % 3 === 0) {
      ctx.strokeStyle = "#3e6a32";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.quadraticCurveTo(vx - 5, vy + 22, vx + 2, vy + 38);
      ctx.stroke();
    }
  }

  // Uçuşan Biyo-Işıldayan Sporlar
  const spores = [
    { x: -70, y: -40, r: 2.4 }, { x: 50, y: -65, r: 2.0 }, { x: -30, y: 55, r: 1.8 },
    { x: 80, y: 30, r: 2.2 },  { x: -90, y: 80, r: 1.6 }, { x: 30, y: -90, r: 2.5 },
  ];
  for (const sp of spores) {
    ctx.fillStyle = "#a6ff54";
    ctx.beginPath();
    ctx.arc(rX + sp.x, rY + sp.y, sp.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(166, 255, 84, 0.3)";
    ctx.beginPath();
    ctx.arc(rX + sp.x, rY + sp.y, sp.r * 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function _drawMoonScrapyardBackdrop(ctx, W, H, theme) {
  ctx.save();

  // 1. Derin Uzay Boşluğu Gradyanı
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.85);
  skyGrad.addColorStop(0, "#02040b");
  skyGrad.addColorStop(0.40, "#070e1e");
  skyGrad.addColorStop(0.75, "#121d30");
  skyGrad.addColorStop(1.0, "#1f2d44");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Kozmik Nebula & Yıldız Tozu Bulutları
  const nebGrad1 = ctx.createRadialGradient(W * 0.28, H * 0.25, 20, W * 0.28, H * 0.25, 140);
  nebGrad1.addColorStop(0, "rgba(130, 40, 180, 0.18)");
  nebGrad1.addColorStop(0.6, "rgba(70, 25, 130, 0.08)");
  nebGrad1.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = nebGrad1;
  ctx.beginPath(); ctx.arc(W * 0.28, H * 0.25, 140, 0, Math.PI * 2); ctx.fill();

  const nebGrad2 = ctx.createRadialGradient(W * 0.65, H * 0.20, 20, W * 0.65, H * 0.20, 160);
  nebGrad2.addColorStop(0, "rgba(30, 120, 180, 0.18)");
  nebGrad2.addColorStop(0.6, "rgba(20, 60, 120, 0.07)");
  nebGrad2.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = nebGrad2;
  ctx.beginPath(); ctx.arc(W * 0.65, H * 0.20, 160, 0, Math.PI * 2); ctx.fill();

  // Yoğun Yıldız Kümesi
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 137.5) % 1) * W;
    const sy = ((i * 269.3) % 0.58) * H;
    const sr = 0.5 + ((i * 17) % 3) * 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    if (i % 9 === 0) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy);
      ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy + 4);
      ctx.stroke();
    }
  }

  // 3. Gökyüzünde Parlayan Dünya Küresi
  const eX = W * 0.78, eY = H * 0.22, eR = 36;
  const earthHalo = ctx.createRadialGradient(eX, eY, eR * 0.8, eX, eY, eR * 1.5);
  earthHalo.addColorStop(0, "rgba(80, 170, 255, 0.5)");
  earthHalo.addColorStop(0.5, "rgba(50, 120, 220, 0.2)");
  earthHalo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = earthHalo;
  ctx.beginPath(); ctx.arc(eX, eY, eR * 1.5, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#1b62b3";
  ctx.beginPath(); ctx.arc(eX, eY, eR, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#4a8553";
  ctx.beginPath();
  ctx.arc(eX - 10, eY - 8, 12, 0, Math.PI * 2);
  ctx.arc(eX + 4, eY + 6, 14, 0, Math.PI * 2);
  ctx.arc(eX - 8, eY + 14, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.beginPath();
  ctx.ellipse(eX - 4, eY - 14, 18, 5, -0.2, 0, Math.PI * 2);
  ctx.ellipse(eX + 2, eY + 4, 22, 6, 0.3, 0, Math.PI * 2);
  ctx.ellipse(eX - 6, eY + 18, 16, 4, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(4, 7, 18, 0.58)";
  ctx.beginPath();
  ctx.arc(eX + 12, eY, eR * 1.05, -Math.PI / 2, Math.PI / 2);
  ctx.quadraticCurveTo(eX + 2, eY, eX + 12, eY - eR * 1.05);
  ctx.fill();

  // 4. Uzak Ay Krater Sıradağları
  ctx.fillStyle = "#182030";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.65);
  const lunarPoints = [
    [0.08, 0.54], [0.18, 0.48], [0.28, 0.58], [0.42, 0.46],
    [0.55, 0.52], [0.68, 0.44], [0.82, 0.56], [0.94, 0.50], [1.0, 0.58]
  ];
  for (const lp of lunarPoints) ctx.lineTo(W * lp[0], H * lp[1]);
  ctx.lineTo(W, H * 0.65);
  ctx.closePath();
  ctx.fill();

  // 5. Orta Katman: Çökmüş Dev Parabolik Uydu Çanağı
  const dX = W * 0.28, dY = H * 0.42;
  ctx.save();
  ctx.translate(dX, dY);
  ctx.rotate(-0.35);

  ctx.strokeStyle = "#8b9cb0";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 75, 24, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  for (let sp = 0; sp < 8; sp++) {
    const ang = sp * (Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * 75, Math.sin(ang) * 24);
    ctx.stroke();
  }

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-50, 0); ctx.lineTo(0, -42);
  ctx.moveTo(50, 0);  ctx.lineTo(0, -42);
  ctx.moveTo(0, 18);  ctx.lineTo(0, -42);
  ctx.stroke();
  ctx.fillStyle = "#70d6ff";
  ctx.beginPath(); ctx.arc(0, -42, 5, 0, Math.PI * 2); ctx.fill();

  ctx.restore();

  // Terk Edilmiş Gezgin Enkazı (Rover Excavator)
  const rX = W * 0.68, rY = H * 0.49;
  ctx.fillStyle = "#334156";
  ctx.strokeStyle = "#1a2434";
  ctx.lineWidth = 3;
  ctx.fillRect(rX - 45, rY - 24, 60, 28);
  ctx.strokeRect(rX - 45, rY - 24, 60, 28);

  ctx.fillStyle = "#8fbbe2";
  ctx.beginPath(); ctx.arc(rX - 15, rY - 24, 14, Math.PI, 0); ctx.fill();

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(rX - 52, rY + 4, 75, 14);

  ctx.strokeStyle = "#8fbbe2";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(rX + 15, rY - 14);
  ctx.lineTo(rX + 45, rY - 38);
  ctx.lineTo(rX + 65, rY - 18);
  ctx.stroke();

  // Katlanmış Güneş Paneli Enkazı
  ctx.fillStyle = "#184570";
  ctx.strokeStyle = "#70a6db";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W * 0.48, H * 0.46);
  ctx.lineTo(W * 0.58, H * 0.42);
  ctx.lineTo(W * 0.56, H * 0.52);
  ctx.lineTo(W * 0.46, H * 0.56);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function _drawIceRiftBackdrop(ctx, W, H, theme) {
  ctx.save();

  // 1. Kutup Alacakaranlığı Gradyanı
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.85);
  skyGrad.addColorStop(0, "#0f1c2a");
  skyGrad.addColorStop(0.35, "#1b354b");
  skyGrad.addColorStop(0.70, "#39637f");
  skyGrad.addColorStop(1.0, "#7cb0c7");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Kuzey Işıkları (Aurora Borealis Dalgaları)
  const aurora1 = ctx.createLinearGradient(0, H * 0.05, 0, H * 0.35);
  aurora1.addColorStop(0, "rgba(50, 235, 160, 0)");
  aurora1.addColorStop(0.5, "rgba(50, 235, 160, 0.28)");
  aurora1.addColorStop(1, "rgba(20, 200, 230, 0)");
  ctx.fillStyle = aurora1;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.22);
  ctx.bezierCurveTo(W * 0.25, H * 0.08, W * 0.45, H * 0.30, W * 0.70, H * 0.12);
  ctx.bezierCurveTo(W * 0.85, H * 0.05, W * 0.95, H * 0.20, W, H * 0.16);
  ctx.lineTo(W, H * 0.35);
  ctx.lineTo(0, H * 0.35);
  ctx.closePath();
  ctx.fill();

  // 3. Buzul Sıradağları (Jagged Glacial Peaks)
  ctx.fillStyle = "#2d4e68";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.65);
  const glacierPeaks = [
    [0.10, 0.42], [0.18, 0.52], [0.26, 0.34], [0.36, 0.48], [0.48, 0.28],
    [0.60, 0.46], [0.72, 0.32], [0.84, 0.50], [0.92, 0.38], [1.0, 0.55]
  ];
  for (const gp of glacierPeaks) ctx.lineTo(W * gp[0], H * gp[1]);
  ctx.lineTo(W, H * 0.65);
  ctx.closePath();
  ctx.fill();

  // Karlı Zirve Işıltıları (Snow Facets)
  ctx.fillStyle = "#d8f2ff";
  ctx.beginPath();
  for (let p = 0; p < glacierPeaks.length; p += 2) {
    const gp = glacierPeaks[p];
    ctx.moveTo(W * gp[0], H * gp[1]);
    ctx.lineTo(W * gp[0] - 12, H * gp[1] + 24);
    ctx.lineTo(W * gp[0] + 14, H * gp[1] + 28);
    ctx.closePath();
  }
  ctx.fill();

  // 4. Kanyonun İçindeki Işıldayan Turkuaz Yarık (Glowing Crevasse)
  const riftX = W * 0.50, riftY = H * 0.46;
  const riftGlow = ctx.createRadialGradient(riftX, riftY, 5, riftX, riftY, 65);
  riftGlow.addColorStop(0, "rgba(0, 240, 255, 0.55)");
  riftGlow.addColorStop(0.5, "rgba(0, 200, 255, 0.20)");
  riftGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = riftGlow;
  ctx.beginPath(); ctx.arc(riftX, riftY, 65, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = "#4deeea";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(riftX - 25, H * 0.36);
  ctx.lineTo(riftX - 5, H * 0.44);
  ctx.lineTo(riftX + 15, H * 0.50);
  ctx.lineTo(riftX, H * 0.62);
  ctx.stroke();

  // 5. Kriyojenik Soğutma Küreleri (Cryo Tanks) ve İskele
  const tk1X = W * 0.24, tk1Y = H * 0.44, tk1R = 34;
  ctx.fillStyle = "#507590";
  ctx.strokeStyle = "#254055";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(tk1X, tk1Y, tk1R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(tk1X, tk1Y, tk1R, 10, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#dff6ff";
  ctx.beginPath();
  ctx.arc(tk1X - 8, tk1Y - 14, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#324e65";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(tk1X - 22, tk1Y + 22); ctx.lineTo(tk1X - 32, H * 0.65);
  ctx.moveTo(tk1X + 22, tk1Y + 22); ctx.lineTo(tk1X + 32, H * 0.65);
  ctx.stroke();

  const tk2X = W * 0.76, tk2Y = H * 0.42;
  ctx.fillStyle = "#4a6d85";
  ctx.fillRect(tk2X - 18, tk2Y - 30, 36, 60);
  ctx.strokeRect(tk2X - 18, tk2Y - 30, 36, 60);
  ctx.beginPath(); ctx.arc(tk2X, tk2Y - 30, 18, Math.PI, 0); ctx.fill(); ctx.stroke();

  const ventX = tk2X, ventY = tk2Y - 48;
  const steamGrad = ctx.createLinearGradient(ventX, ventY, ventX + 30, ventY - 70);
  steamGrad.addColorStop(0, "rgba(240, 252, 255, 0.85)");
  steamGrad.addColorStop(0.5, "rgba(220, 245, 255, 0.45)");
  steamGrad.addColorStop(1, "rgba(200, 235, 255, 0)");
  ctx.fillStyle = steamGrad;
  ctx.beginPath();
  ctx.arc(ventX + 6, ventY - 15, 14, 0, Math.PI * 2);
  ctx.arc(ventX + 18, ventY - 38, 22, 0, Math.PI * 2);
  ctx.arc(ventX + 35, ventY - 65, 32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#dff4ff";
  const iciclePoints = [W * 0.18, W * 0.22, W * 0.26, W * 0.30, W * 0.70, W * 0.74, W * 0.78];
  for (const ix of iciclePoints) {
    const len = 12 + ((ix * 7) % 18);
    ctx.beginPath();
    ctx.moveTo(ix - 3, H * 0.50);
    ctx.lineTo(ix, H * 0.50 + len);
    ctx.lineTo(ix + 3, H * 0.50);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function _drawFloodedLabBackdrop(ctx, W, H, theme) {
  ctx.save();

  // 1. Siber-Endüstriyel Kubbe Tavan ve Işıklar
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.85);
  skyGrad.addColorStop(0, "#08161a");
  skyGrad.addColorStop(0.35, "#102930");
  skyGrad.addColorStop(0.70, "#1f4750");
  skyGrad.addColorStop(1.0, "#3e7882");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#163038";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.12); ctx.lineTo(W, H * 0.12);
  ctx.moveTo(0, H * 0.20); ctx.lineTo(W, H * 0.20);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let tx = 0; tx < W; tx += 45) {
    ctx.moveTo(tx, H * 0.12); ctx.lineTo(tx + 45, H * 0.20);
    ctx.moveTo(tx + 45, H * 0.12); ctx.lineTo(tx, H * 0.20);
  }
  ctx.stroke();

  ctx.fillStyle = "#70f5ff";
  for (let lx = W * 0.15; lx < W * 0.9; lx += W * 0.24) {
    ctx.fillRect(lx, H * 0.20, 48, 5);
    const coneGrad = ctx.createLinearGradient(lx + 24, H * 0.20, lx + 24, H * 0.55);
    coneGrad.addColorStop(0, "rgba(112, 245, 255, 0.20)");
    coneGrad.addColorStop(1, "rgba(112, 245, 255, 0)");
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(lx, H * 0.20);
    ctx.lineTo(lx - 25, H * 0.55);
    ctx.lineTo(lx + 73, H * 0.55);
    ctx.lineTo(lx + 48, H * 0.20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#70f5ff";
  }

  // 2. Uzak Katman: Montaj Hatları ve Server Blokları
  ctx.fillStyle = "#18323a";
  const racks = [
    { x: W * 0.08, w: 38, h: 120 }, { x: W * 0.32, w: 45, h: 140 },
    { x: W * 0.62, w: 42, h: 130 }, { x: W * 0.86, w: 40, h: 125 }
  ];
  for (const r of racks) {
    ctx.fillRect(r.x, H * 0.65 - r.h, r.w, r.h);
    for (let ly = H * 0.65 - r.h + 10; ly < H * 0.65 - 10; ly += 12) {
      ctx.fillStyle = (ly % 24 === 0) ? "#00ffcc" : "#39ff14";
      ctx.fillRect(r.x + 6, ly, 3, 3);
      ctx.fillRect(r.x + 14, ly, 3, 3);
    }
    ctx.fillStyle = "#18323a";
  }

  // 3. Odak Noktası: Kırık Silindirik Numune/Klon Tüpü
  const tubX = W * 0.50, tubY = H * 0.40, tubW = 85, tubH = 110;

  const tubGlow = ctx.createRadialGradient(tubX, tubY, 15, tubX, tubY, 80);
  tubGlow.addColorStop(0, "rgba(0, 245, 212, 0.45)");
  tubGlow.addColorStop(0.6, "rgba(0, 180, 200, 0.15)");
  tubGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = tubGlow;
  ctx.beginPath(); ctx.arc(tubX, tubY, 80, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "rgba(0, 245, 212, 0.35)";
  ctx.fillRect(tubX - tubW / 2, tubY - tubH / 2, tubW, tubH);

  ctx.fillStyle = "#20464f";
  ctx.fillRect(tubX - 16, tubY - tubH / 2 + 15, 32, tubH - 30);
  ctx.fillStyle = "#00ffc4";
  ctx.beginPath(); ctx.arc(tubX, tubY, 8, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#2d4e56";
  ctx.strokeStyle = "#13272d";
  ctx.lineWidth = 3;
  ctx.fillRect(tubX - tubW / 2 - 6, tubY - tubH / 2 - 12, tubW + 12, 16);
  ctx.strokeRect(tubX - tubW / 2 - 6, tubY - tubH / 2 - 12, tubW + 12, 16);
  ctx.fillRect(tubX - tubW / 2 - 6, tubY + tubH / 2 - 4, tubW + 12, 16);
  ctx.strokeRect(tubX - tubW / 2 - 6, tubY + tubH / 2 - 4, tubW + 12, 16);

  ctx.fillStyle = "#b8ffff";
  const bubbles = [
    { x: -18, y: 25, r: 3 }, { x: 14, y: 12, r: 2.5 },
    { x: -8, y: -18, r: 2 },  { x: 22, y: -32, r: 3.5 }
  ];
  for (const b of bubbles) {
    ctx.beginPath(); ctx.arc(tubX + b.x, tubY + b.y, b.r, 0, Math.PI * 2); ctx.fill();
  }

  // 4. Eklemli Robotik Kaynak Kolu
  const armX = W * 0.26, armY = H * 0.20;
  ctx.strokeStyle = "#385e68";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(armX, armY);
  ctx.lineTo(armX + 25, armY + 50);
  ctx.lineTo(armX - 10, armY + 95);
  ctx.stroke();

  ctx.fillStyle = "#5fbcd0";
  ctx.beginPath(); ctx.arc(armX + 25, armY + 50, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(armX - 10, armY + 95, 5, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = "rgba(255, 40, 80, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(armX - 10, armY + 95);
  ctx.lineTo(armX + 45, armY + 145);
  ctx.stroke();

  // 5. Taşmış Su Havuzu ve Yüzey Yansımaları
  const waterY = H * 0.58;
  const waterGrad = ctx.createLinearGradient(0, waterY, 0, H * 0.68);
  waterGrad.addColorStop(0, "rgba(0, 180, 200, 0.25)");
  waterGrad.addColorStop(1, "rgba(10, 40, 50, 0.65)");
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, waterY, W, H * 0.68 - waterY);

  ctx.strokeStyle = "rgba(120, 245, 255, 0.4)";
  ctx.lineWidth = 2;
  for (let wy = waterY + 8; wy < H * 0.65; wy += 12) {
    ctx.beginPath();
    ctx.moveTo(W * 0.15, wy); ctx.lineTo(W * 0.35, wy);
    ctx.moveTo(W * 0.42, wy); ctx.lineTo(W * 0.62, wy);
    ctx.moveTo(W * 0.70, wy); ctx.lineTo(W * 0.88, wy);
    ctx.stroke();
  }

  ctx.restore();
}

function _drawGenericZoneBackdrop(ctx, W, H, theme) {
  ctx.save();
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.85);
  const s = theme.sky || ["#2a3542", "#4a5d73", "#7e9bb5"];
  if (s.length >= 3) {
    skyGrad.addColorStop(0, s[0]); skyGrad.addColorStop(0.5, s[1]); skyGrad.addColorStop(1, s[2]);
  } else {
    skyGrad.addColorStop(0, s[0]); skyGrad.addColorStop(1, s[1]);
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  const col = _shade(theme.dirt || "#334155", -0.4);
  ctx.fillStyle = col;
  ctx.fillRect(W * 0.08, H * 0.38, W * 0.16, H * 0.28);
  ctx.beginPath();
  ctx.arc(W * 0.16, H * 0.38, W * 0.08, Math.PI, 0);
  ctx.fill();

  ctx.fillRect(W * 0.32, H * 0.44, W * 0.12, H * 0.22);
  ctx.fillRect(W * 0.60, H * 0.36, W * 0.14, H * 0.30);
  ctx.fillRect(W * 0.78, H * 0.42, W * 0.15, H * 0.24);

  ctx.strokeStyle = _shade(theme.dirt || "#334155", -0.2);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(W * 0.16, H * 0.46);
  ctx.lineTo(W * 0.65, H * 0.46);
  ctx.moveTo(W * 0.35, H * 0.52);
  ctx.lineTo(W * 0.85, H * 0.52);
  ctx.stroke();

  ctx.restore();
}

function drawBackdrop(ctx, W, H, theme) {
  drawMapBackdropVector(ctx, W, H, theme);
}

function drawMapLandmark(ctx, W, H, theme) {
  // Geriye dönük uyumluluk için korundu; detaylar drawMapBackdropVector içinde çizilir.
}

function _drawHaze(ctx, W, H, theme) {
  // Vektörel arkaplanda krater içinde yatay dikiş izi / sis kırılması oluşmaması için
  // arkaplan %100 net ve kesintisiz çizilir.
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

  // 100% Vektör arka planı kart boyutuna kusursuz ölçekle
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / 960, h / 540);
  drawMapBackdropVector(ctx, 960, 540, theme);
  ctx.restore();

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
    const sk = Array.isArray(theme.sky) && theme.sky.length ? theme.sky : ["#2a3542", "#4a5d73", "#7e9bb5"];
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

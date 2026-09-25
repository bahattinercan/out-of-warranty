/* DÖKÜMHANE-9: Dokuz Bölge Kupası — hikâye modunun saf verisi.
 *
 * Bu dosya yalnız VERİ tutar; hiçbir fonksiyon tanımlamaz. Kural katmanı
 * js/story.js'te, kalıcılık js/profile.js'te, ekran çizimi js/game.js'tedir.
 * Böylece kampanya içeriği kod değişikliği olmadan, test uyarısı eşliğinde
 * düzenlenebilir (bkz. docs/story-mode-lock.md §6–§10).
 *
 * Kimlik sözleşmesi (kilit belgesi §2, D-02 ve D-10):
 *   görev  : <zoneShortId>_<slug>            → örn. waste_unseen_line
 *   sahne  : scene_<missionId>_<variant>      → örn. scene_waste_unseen_line_intro
 *   kanıt  : satır içi (kind: "zone" | "milestone"); ayrı harita YOKTUR
 *
 * Bölge kimlikleri ve kodları js/maps.js içindeki FACTORY_ZONES ile birebir
 * aynıdır; bu eşleşme tests/run.js ve tests/story.js tarafından doğrulanır.
 */

const STORY_CAMPAIGN = {
  id: "nine_zones_cup_v1",
  title: "DÖKÜMHANE-9: Dokuz Bölge Kupası",
  // Üç perde; dağılım 3 / 3 / 6'dır (kilit belgesi D-03).
  acts: [
    {
      id: 1,
      title: "Kupa Işıkları",
      missionIds: ["scrapyard_open_service_slot", "assembly_magnet_objection", "cooling_frozen_shift"],
    },
    {
      id: 2,
      title: "Karanlık Tribünler",
      missionIds: ["paint_right_to_color", "waste_unseen_line", "warehouse_weight_of_proof"],
    },
    {
      id: 3,
      title: "Tek Sistem, Dokuz Bölge",
      missionIds: [
        "sandblast_line_under_sand", "loading_keep_gate_open", "foundry_without_dousing_furnace",
        "scrapyard_ninth_measurement", "warehouse_final_shift", "foundry_joint_shift",
      ],
    },
  ],
  // Kupa haritasının yerleşim sırası. Görev 1–9'un bölge sırasıyla birebir
  // aynıdır; bu, haritada sol baştan sağa ilerleyen bir devre gibi okunur.
  zoneOrder: [
    "scrapyard", "assembly", "cooling", "paint", "waste",
    "warehouse", "sandblast", "loading", "foundry",
  ],
  // Bakım Puanı ağırlıkları (kilit belgesi D-05): Perde I 10, II 20, III 30.
  maintenancePointWeights: { 1: 10, 2: 20, 3: 30 },
  // İlk sürümde kilit grafiği tamamen doğrusaldır (kilit belgesi D-12);
  // ileride bölgesel yan görevler için dallanma bu alandan açılır.
  linearUnlock: true,
};

// ── Dokuz fabrika bölgesi ───────────────────────────────────────────────────
// zoneId/zoneCode değerleri FACTORY_ZONES ile eşleşmek zorundadır. functionText
// bölgenin vazgeçilmez işlevi, fearText ise kupayı isteme nedenidir; kupa
// haritası kartında her ikisi de gösterilir (plan §6, §12).

const STORY_ZONES = [
  {
    zoneId: "scrapyard", zoneLabel: "Hurda Sahası", zoneCode: "HS",
    functionText: "Eski parçaları geri kazanır",
    fearText: "Ayıklama bantları durmak üzere",
    representativeIds: ["kirpi", "hamster", "kus"],
  },
  {
    zoneId: "assembly", zoneLabel: "Montaj Hattı", zoneCode: "MH",
    functionText: "Parçaları çalışan birimlere dönüştürür",
    fearText: "Konveyör senkronu bozuluyor",
    representativeIds: ["kedi", "rakun", "kurtadam"],
  },
  {
    zoneId: "cooling", zoneLabel: "Soğutma Tesisi", zoneCode: "ST",
    functionText: "Çekirdek ve makineleri soğutur",
    fearText: "Yedek pompaların yarısı donmuş",
    representativeIds: ["yeti", "penguen", "tavsan"],
  },
  {
    zoneId: "paint", zoneLabel: "Boya Atölyesi", zoneCode: "BA",
    functionText: "Koruyucu kaplama üretir",
    fearText: "Korozyon bölgelere yayılıyor",
    representativeIds: ["tilki", "sincap"],
  },
  {
    zoneId: "waste", zoneLabel: "Atık Arıtma", zoneCode: "AA",
    functionText: "Malzeme ve ısı geri kazanır",
    fearText: "Filtreler kullanım sınırında",
    representativeIds: ["kokarca", "ornitorenk", "zurafa"],
  },
  {
    zoneId: "warehouse", zoneLabel: "Depo Rafları", zoneCode: "DR",
    functionText: "Yedek parçaları korur ve dağıtır",
    fearText: "Raflar çökme sınırında",
    representativeIds: ["panda", "ayi", "suaygiri"],
  },
  {
    zoneId: "sandblast", zoneLabel: "Kumlama Ünitesi", zoneCode: "KU",
    functionText: "Eski parçaları yeniler",
    fearText: "Basınç hattı tıkanmış",
    representativeIds: ["armadillo", "kanguru"],
  },
  {
    zoneId: "loading", zoneLabel: "Dış Yükleme", zoneCode: "DY",
    functionText: "Dış dünyayla fiziksel bağı korur",
    fearText: "Ana kapı ve vinçler kapanıyor",
    representativeIds: ["gergedan", "kaplan", "sirtlan"],
  },
  {
    zoneId: "foundry", zoneLabel: "Döküm Ocağı", zoneCode: "DO",
    functionText: "Yeni metal parça üretir",
    fearText: "Ocağı söndürmek kalıcı olabilir",
    representativeIds: ["ejderha", "dino", "aslan"],
  },
];

// ── On iki görev ────────────────────────────────────────────────────────────
// Kadro, harita, kanıt ve öğreticiler tamamı veridedir; görev başına özel
// savaş kodu yoktur (plan §2.2). opponents alanı karakter id'sidir; o görevde
// bu robotlar insan seçiminde geçici kapalı olur (kilit §13, D-13).
//
// evidence: görev 1–9 dokuz teknik ölçümü (kind:"zone") taşır; 10–11
// kilometre taşı (kind:"milestone"); görev 12 çözümün kanıtı değil sonucudur
// (null). curtailments: görev ilk kez tamamlanınca kısıntıya giren bölgeler
// (kilit §12, D-18) — anlatısal bir andır, formülle türetilemez.
const STORY_MISSIONS = [
  {
    id: "scrapyard_open_service_slot",
    act: 1, order: 1,
    title: "Açık Servis Kontenjanı",
    zoneId: "scrapyard", mapId: "kirpi",
    opponents: ["kirpi"],
    recommendedLevel: 1,
    introSceneId: "scene_scrapyard_open_service_slot_intro",
    winSceneId: "scene_scrapyard_open_service_slot_win",
    lossSceneId: "scene_scrapyard_open_service_slot_loss",
    evidence: { id: "scrapyard_recovery_capacity", label: "Hurda geri kazanım kapasitesi", kind: "zone" },
    tutorials: ["movement_aim"],
    unlocks: ["assembly_magnet_objection"],
    curtailments: [],
  },
  {
    id: "assembly_magnet_objection",
    act: 1, order: 2,
    title: "Mıknatısın İtirazı",
    zoneId: "assembly", mapId: "kedi",
    opponents: ["kedi", "rakun"],
    recommendedLevel: 1,
    introSceneId: "scene_assembly_magnet_objection_intro",
    winSceneId: "scene_assembly_magnet_objection_win",
    lossSceneId: "scene_assembly_magnet_objection_loss",
    evidence: { id: "assembly_idle_conveyor_load", label: "Konveyörlerin boşta çalışma tüketimi", kind: "zone" },
    tutorials: ["wind_ammo_weapons"],
    unlocks: ["cooling_frozen_shift"],
    curtailments: [],
  },
  {
    id: "cooling_frozen_shift",
    act: 1, order: 3,
    title: "Donmuş Vardiya",
    zoneId: "cooling", mapId: "yeti",
    opponents: ["penguen", "yeti"],
    recommendedLevel: 2,
    introSceneId: "scene_cooling_frozen_shift_intro",
    winSceneId: "scene_cooling_frozen_shift_win",
    lossSceneId: "scene_cooling_frozen_shift_loss",
    midSceneId: "scene_cooling_frozen_shift_mid", // Perde I sonu: bant durur (F4-02)
    evidence: { id: "cooling_redundant_map", label: "Gereksiz soğutma haritası", kind: "zone" },
    tutorials: ["module_shield_platforms"],
    unlocks: ["paint_right_to_color"],
    // Plan §8'in açık anlatı anı: Soğutma etabında ilk kısıntı başlar ve
    // Hurda Sahası'nın ayıklama bandı durur.
    curtailments: ["scrapyard"],
  },
  {
    id: "paint_right_to_color",
    act: 2, order: 4,
    title: "Renk Hakkı",
    zoneId: "paint", mapId: "tilki",
    opponents: ["tilki", "sincap"],
    recommendedLevel: 2,
    introSceneId: "scene_paint_right_to_color_intro",
    winSceneId: "scene_paint_right_to_color_win",
    lossSceneId: "scene_paint_right_to_color_loss",
    evidence: { id: "paint_coating_loss", label: "Kaplama kaynaklı iletim kaybı", kind: "zone" },
    tutorials: [],
    unlocks: ["waste_unseen_line"],
    curtailments: [],
  },
  {
    id: "waste_unseen_line",
    act: 2, order: 5,
    title: "Kimsenin İzlemediği Hat",
    zoneId: "waste", mapId: "ornitorenk",
    opponents: ["kokarca", "ornitorenk"],
    recommendedLevel: 3,
    introSceneId: "scene_waste_unseen_line_intro",
    winSceneId: "scene_waste_unseen_line_win",
    lossSceneId: "scene_waste_unseen_line_loss",
    evidence: { id: "waste_heat_recovery", label: "Isı ve malzeme geri kazanım oranı", kind: "zone" },
    tutorials: [],
    unlocks: ["warehouse_weight_of_proof"],
    curtailments: [],
  },
  {
    id: "warehouse_weight_of_proof",
    act: 2, order: 6,
    title: "Ağırlığın Kanıtı",
    zoneId: "warehouse", mapId: "panda",
    opponents: ["panda", "ayi"],
    recommendedLevel: 4,
    introSceneId: "scene_warehouse_weight_of_proof_intro",
    winSceneId: "scene_warehouse_weight_of_proof_win",
    lossSceneId: "scene_warehouse_weight_of_proof_loss",
    midSceneId: "scene_warehouse_weight_of_proof_mid", // Perde II sonu: Ana Bara çöker (F4-02)
    evidence: { id: "warehouse_shared_inventory", label: "Ortak parça envanteri ve dağıtım gecikmeleri", kind: "zone" },
    tutorials: [],
    unlocks: ["sandblast_line_under_sand"],
    curtailments: [],
  },
  {
    id: "sandblast_line_under_sand",
    act: 3, order: 7,
    title: "Kumun Altındaki Hat",
    zoneId: "sandblast", mapId: "armadillo",
    opponents: ["armadillo", "kanguru"],
    recommendedLevel: 4,
    introSceneId: "scene_sandblast_line_under_sand_intro",
    winSceneId: "scene_sandblast_line_under_sand_win",
    lossSceneId: "scene_sandblast_line_under_sand_loss",
    evidence: { id: "sandblast_refurb_savings", label: "Yenileme başına enerji tasarrufu", kind: "zone" },
    tutorials: [],
    unlocks: ["loading_keep_gate_open"],
    curtailments: [],
  },
  {
    id: "loading_keep_gate_open",
    act: 3, order: 8,
    title: "Kapı Açık Kalsın",
    zoneId: "loading", mapId: "gergedan",
    opponents: ["gergedan", "kaplan"],
    recommendedLevel: 5,
    introSceneId: "scene_loading_keep_gate_open_intro",
    winSceneId: "scene_loading_keep_gate_open_win",
    lossSceneId: "scene_loading_keep_gate_open_loss",
    evidence: { id: "loading_mechanical_storage", label: "Mekanik enerji depolama kapasitesi", kind: "zone" },
    tutorials: [],
    unlocks: ["foundry_without_dousing_furnace"],
    curtailments: [],
  },
  {
    id: "foundry_without_dousing_furnace",
    act: 3, order: 9,
    title: "Ocağı Söndürmeden",
    zoneId: "foundry", mapId: "ejderha",
    opponents: ["ejderha", "dino", "aslan"],
    recommendedLevel: 5,
    introSceneId: "scene_foundry_without_dousing_furnace_intro",
    winSceneId: "scene_foundry_without_dousing_furnace_win",
    lossSceneId: "scene_foundry_without_dousing_furnace_loss",
    evidence: { id: "foundry_min_safe_load", label: "Minimum güvenli ocak yükü", kind: "zone" },
    tutorials: [],
    unlocks: ["scrapyard_ninth_measurement"],
    curtailments: [],
  },
  {
    id: "scrapyard_ninth_measurement",
    act: 3, order: 10,
    title: "Dokuzuncu Ölçüm",
    zoneId: "scrapyard", mapId: "kopek",
    opponents: ["yeti", "kokarca", "gergedan"],
    recommendedLevel: 6,
    introSceneId: "scene_scrapyard_ninth_measurement_intro",
    winSceneId: "scene_scrapyard_ninth_measurement_win",
    lossSceneId: "scene_scrapyard_ninth_measurement_loss",
    midSceneId: "scene_scrapyard_ninth_measurement_mid", // Final öncesi stres testi (F4-02)
    evidence: { id: "ninth_measurement_sync", label: "Bölgeler arası senkronizasyon sonucu", kind: "milestone" },
    tutorials: [],
    unlocks: ["warehouse_final_shift"],
    curtailments: [],
  },
  {
    id: "warehouse_final_shift",
    act: 3, order: 11,
    title: "Final Vardiyası",
    zoneId: "warehouse", mapId: "panda",
    opponents: ["panda"],
    recommendedLevel: 6,
    introSceneId: "scene_warehouse_final_shift_intro",
    winSceneId: "scene_warehouse_final_shift_win",
    lossSceneId: "scene_warehouse_final_shift_loss",
    evidence: { id: "lead_maintenance_authority", label: "Resmî Baş Bakım Yetkisi", kind: "milestone" },
    tutorials: [],
    unlocks: ["foundry_joint_shift"],
    curtailments: [],
  },
  {
    id: "foundry_joint_shift",
    act: 3, order: 12,
    title: "Ortak Vardiya",
    zoneId: "foundry", mapId: "dino",
    opponents: ["ejderha", "yeti", "aslan"],
    recommendedLevel: 7,
    introSceneId: "scene_foundry_joint_shift_intro",
    winSceneId: "scene_foundry_joint_shift_win",
    lossSceneId: "scene_foundry_joint_shift_loss",
    // Kriz çözümü kanıt değil, sonuçtur (kilit §7): son görev kanıt üretmez.
    evidence: null,
    tutorials: [],
    unlocks: [],
    curtailments: [],
  },
];

// ── Sahneler ────────────────────────────────────────────────────────────────
// Konuşmacı kimliği bir karakter id'sidir; tek istisna merkezi sistem için
// "system" (kilit §9, K-06). Kampanyanın 39 sahnesi tamamlandığı için bayrak
// true'dur; eksik bir sahne artık uyarı değil test hatasıdır.
const STORY_SCENES_COMPLETE = true;

const STORY_SCENES = {
  // ── Görev 1: Açık Servis Kontenjanı (Hurda Sahası) ──
  scene_scrapyard_open_service_slot_intro: {
    id: "scene_scrapyard_open_service_slot_intro",
    backgroundZoneId: "scrapyard",
    lines: [
      { speakerId: "system", text: "Dokuz Bölge Kupası başlıyor! Kazanan bölgenin makineleri önce tamir edilecek." },
      { speakerId: "tavsan", text: "Biz de katılalım! Atölyenin kapısını her sabah itmekten yoruldum." },
      { speakerId: "kedi", text: "Ya diğer bölgeler? Onların da bozuk makineleri var." },
      { speakerId: "kopek", text: "Onları da düşünmeliyiz. Önce turnuvaya katılalım, sonra herkesin neye ihtiyacı olduğunu öğreniriz." },
      { speakerId: "system", text: "Atölye ekibi, turnuvaya girmek için bu maçı kazanmalı." },
      { speakerId: "kirpi", text: "Ben BİLYE-3. Kolay bir rakip beklemiyordunuz, değil mi?" },
      { speakerId: "kopek", text: "Pek sayılmaz. Hadi, güzel bir maç olsun!" },
    ],
  },
  scene_scrapyard_open_service_slot_win: {
    id: "scene_scrapyard_open_service_slot_win",
    backgroundZoneId: "scrapyard",
    lines: [
      { speakerId: "system", text: "Maçı Atölye kazandı! Turnuvaya hoş geldiniz." },
      { speakerId: "kirpi", text: "İyi maçtı! Gelin, şu duran bantları göstereyim. Parçaları artık elimizle ayırıyoruz." },
      { speakerId: "kopek", text: "Bakalım neleri tamir edebiliriz. Belki hepsi için yeni parça gerekmiyordur." },
      { speakerId: "tavsan", text: "Ben de yardım ederim! Küçük parçalar bende, kocamanları size bırakıyorum." },
    ],
  },
  scene_scrapyard_open_service_slot_loss: {
    id: "scene_scrapyard_open_service_slot_loss",
    backgroundZoneId: "scrapyard",
    lines: [
      { speakerId: "kirpi", text: "Bu kez ben kazandım. Ama son atışında az kalsın yakalıyordun!" },
      { speakerId: "kopek", text: "Biraz dinlenelim. Hazır olunca yeniden deneriz." },
      { speakerId: "system", text: "Atölye ekibi, hazır olduğunda yeniden maça çıkabilir." },
    ],
  },

  // ── Görev 2: Mıknatısın İtirazı (Montaj Hattı) ──
  scene_assembly_magnet_objection_intro: {
    id: "scene_assembly_magnet_objection_intro",
    backgroundZoneId: "assembly",
    lines: [
      { speakerId: "system", text: "Sıradaki durak Montaj Hattı. Yarışmacılar, yerlerinizi alın!" },
      { speakerId: "kedi", text: "Enerjinin boşa harcandığını söylüyorsun. Nereden biliyorsun?" },
      { speakerId: "kopek", text: "Şu boş banda bak. Üzerinde hiçbir şey yok ama sabahtan beri dönüyor." },
      { speakerId: "rakun", text: "Onu durdurmak mı? Bana hep çalışır durumda tutmam söylendi." },
      { speakerId: "kedi", text: "O zaman maçtan sonra sayacı kontrol edelim. Ne kadar enerji harcadığını öğreniriz." },
      { speakerId: "kopek", text: "Anlaştık. Ama önce maç! DÖNER-5 çoktan hazırlanmış bile." },
    ],
  },
  scene_assembly_magnet_objection_win: {
    id: "scene_assembly_magnet_objection_win",
    backgroundZoneId: "assembly",
    lines: [
      { speakerId: "system", text: "Montaj Hattı maçını Atölye kazandı!" },
      { speakerId: "kedi", text: "Sayaca baktım. Haklıymışsın; boş bantlar da çok enerji harcıyor." },
      { speakerId: "kopek", text: "Diğer bölgelere de bakalım mı? Gözümüzden kaçan başka şeyler olabilir." },
      { speakerId: "rakun", text: "Bana da haber verin. Boş yere dönüp duruyorsam bilmek isterim." },
    ],
  },
  scene_assembly_magnet_objection_loss: {
    id: "scene_assembly_magnet_objection_loss",
    backgroundZoneId: "assembly",
    lines: [
      { speakerId: "kedi", text: "Bu kez olmadı. Rüzgâr son atışı yana savurdu." },
      { speakerId: "kopek", text: "Fark ettim. Bir dahaki sefer nişan alırken onu da hesaba katalım." },
      { speakerId: "rakun", text: "Ben hazırım! Siz dinlenin, ben biraz daha döneyim." },
    ],
  },

  // ── Görev 3: Donmuş Vardiya (Soğutma) ──
  scene_cooling_frozen_shift_intro: {
    id: "scene_cooling_frozen_shift_intro",
    backgroundZoneId: "cooling",
    lines: [
      { speakerId: "system", text: "Soğutma Tesisi'ne hoş geldiniz. Maç birazdan başlayacak." },
      { speakerId: "yeti", text: "Bizim makineler durursa fabrika fazla ısınır. O yüzden bu kupayı kazanmalıyız." },
      { speakerId: "penguen", text: "Hem şu taraftaki soğutucu da zor çalışıyor. Her gün başında bekliyorum." },
      { speakerId: "kedi", text: "Arkada kapalı depolar gördüm. Onları da mı soğutuyorsunuz?" },
      { speakerId: "kopek", text: "Maçtan sonra içlerine bakalım. Belki artık kullanılmıyorlardır." },
      { speakerId: "penguen", text: "Olur. Ama önce sizi yenmem gerekiyor!" },
    ],
  },
  scene_cooling_frozen_shift_win: {
    id: "scene_cooling_frozen_shift_win",
    backgroundZoneId: "cooling",
    lines: [
      { speakerId: "system", text: "Soğutma Tesisi maçı tamamlandı. Atölye bir sonraki bölüme geçebilir." },
      { speakerId: "kedi", text: "Üç depo bomboş! İçeride soğuk tutulması gereken hiçbir şey yok." },
      { speakerId: "yeti", text: "Kimse bana boşaltıldıklarını söylemedi. Bunca zamandır boş odaları soğutmuşuz." },
      { speakerId: "penguen", text: "Onları kapatırsak çalışan soğutuculara daha çok enerji kalır." },
    ],
  },
  scene_cooling_frozen_shift_loss: {
    id: "scene_cooling_frozen_shift_loss",
    backgroundZoneId: "cooling",
    lines: [
      { speakerId: "penguen", text: "İyi denemeydi! Buraya alışmak biraz zaman alır." },
      { speakerId: "yeti", text: "Acele etme. Atış yapmadan önce durduğun yere dikkat et." },
      { speakerId: "kopek", text: "Tamam. Biraz toparlanıp yeniden deneyelim." },
    ],
  },
  scene_cooling_frozen_shift_mid: {
    id: "scene_cooling_frozen_shift_mid",
    backgroundZoneId: "scrapyard",
    lines: [
      { speakerId: "system", text: "Duyuru: Hurda Sahası'na verilen enerji azaltıldı. Ayıklama bandı durdu." },
      { speakerId: "kopek", text: "Az önce oradaydık. Bant durursa parçaları nasıl ayıracaklar?" },
      { speakerId: "kedi", text: "Turnuva alanının ışıkları hâlâ yanıyor. Ama oradaki makineler çalışmıyor." },
      { speakerId: "tavsan", text: "BİLYE-3'e haber götüreyim. Onu unutmadığımızı bilsin." },
    ],
  },

  // ── Görev 4: Renk Hakkı (Boya) ──
  scene_paint_right_to_color_intro: {
    id: "scene_paint_right_to_color_intro",
    backgroundZoneId: "paint",
    lines: [
      { speakerId: "system", text: "Boya Atölyesi maçı başlıyor. Yarışmacılar hazır mı?" },
      { speakerId: "tilki", text: "Bize hep aynı şeyi söylüyorlar: Boya sonra da yapılırmış!" },
      { speakerId: "sincap", text: "Benim tekerin üstü paslandı. Şimdi dönerken gıcırdıyor. Duydunuz mu?" },
      { speakerId: "kopek", text: "Duyduk. Pası temizleyip üstünü korumamız gerek." },
      { speakerId: "kedi", text: "Demek boya sadece güzel görünmek için değilmiş." },
      { speakerId: "tilki", text: "Sonunda! Maç bitsin, size boyasız kalan boruları da göstereyim." },
    ],
  },
  scene_paint_right_to_color_win: {
    id: "scene_paint_right_to_color_win",
    backgroundZoneId: "paint",
    lines: [
      { speakerId: "system", text: "Boya Atölyesi maçını Atölye ekibi kazandı!" },
      { speakerId: "tilki", text: "Şu boruya bakın. Boyası dökülmüş, altı da paslanmış." },
      { speakerId: "kopek", text: "Yanındaki bağlantı da ısınmış. Bunu tamir edelim, tekrar paslanmasını da önleyelim." },
      { speakerId: "kedi", text: "Bunları daha önce görseydim Boya Atölyesi'ni listenin sonuna koymazdım." },
      { speakerId: "sincap", text: "Benim tekeri de unutmayın. Gizlice bir yere gitmem mümkün değil!" },
    ],
  },
  scene_paint_right_to_color_loss: {
    id: "scene_paint_right_to_color_loss",
    backgroundZoneId: "paint",
    lines: [
      { speakerId: "tilki", text: "Bu sefer biz kazandık. Rövanşa var mısınız?" },
      { speakerId: "sincap", text: "Ben varım! Ama önce tekerime biraz yağ süreceğim." },
      { speakerId: "kedi", text: "Biz de hazırlanırız. Sonraki maçta görüşürüz." },
    ],
  },

  // ── Görev 5: Kimsenin İzlemediği Hat (Atık) ──
  scene_waste_unseen_line_intro: {
    id: "scene_waste_unseen_line_intro",
    backgroundZoneId: "waste",
    lines: [
      { speakerId: "system", text: "Sıradaki maç Atık Arıtma'da. Yarışmacılar arenaya bekleniyor." },
      { speakerId: "kokarca", text: "Hoş geldiniz! Seyirci de getirirsiniz diye ummuştum." },
      { speakerId: "ornitorenk", text: "Buraya pek gelen olmaz. Bir şey bozulunca da tamir için uzun süre bekleriz." },
      { speakerId: "kedi", text: "Şu boru neden bu kadar sıcak?" },
      { speakerId: "kopek", text: "Gerçekten çok sıcak. Bu ısı nereye gidiyor?" },
      { speakerId: "kokarca", text: "Dışarı. Biz de öylece boşa gidişini izliyoruz." },
    ],
  },
  scene_waste_unseen_line_win: {
    id: "scene_waste_unseen_line_win",
    backgroundZoneId: "waste",
    lines: [
      { speakerId: "system", text: "Atık Arıtma maçını Atölye kazandı!" },
      { speakerId: "kedi", text: "Bu sıcaklığı Döküm Ocağı'na taşıyabiliriz. Belki orada işe yarar." },
      { speakerId: "ornitorenk", text: "Öyle mi? Şu eski boru o tarafa gidiyor. Beraber kontrol edelim." },
      { speakerId: "kokarca", text: "Bizi de plana ekleyin. Bu sefer dışarıda kalmak istemiyoruz." },
    ],
  },
  scene_waste_unseen_line_loss: {
    id: "scene_waste_unseen_line_loss",
    backgroundZoneId: "waste",
    lines: [
      { speakerId: "kokarca", text: "Bu maç bizim. Biraz dinlenmek ister misiniz?" },
      { speakerId: "ornitorenk", text: "Şurada boş yer var. Sıcak borulara yaklaşmayın yeter." },
      { speakerId: "kopek", text: "Sağ olun. Hazır olunca yeniden deneriz." },
    ],
  },

  // ── Görev 6: Ağırlığın Kanıtı (Depo) ──
  scene_warehouse_weight_of_proof_intro: {
    id: "scene_warehouse_weight_of_proof_intro",
    backgroundZoneId: "warehouse",
    lines: [
      { speakerId: "system", text: "Depo Rafları maçı başlıyor. Atölye ekibinin karşısında PRES-4 ve BOM-12 var." },
      { speakerId: "panda", text: "Şu raflardaki parçalar hepimize lazım. Depo kapanırsa kimseyi tamir edemeyiz." },
      { speakerId: "ayi", text: "Raflardan biri dün yine eğildi. Altındaki kasaları güçlükle kurtardım." },
      { speakerId: "kedi", text: "Ama diğer bölgeler de zor durumda. Hepsini bekletemeyiz." },
      { speakerId: "kopek", text: "Belki her yere yetecek kadar enerji bulabiliriz. Birlikte bakmamıza izin ver." },
      { speakerId: "panda", text: "Bakabilirsiniz. Ama bir çözüm bulana kadar depoyu korumam gerek." },
    ],
  },
  scene_warehouse_weight_of_proof_win: {
    id: "scene_warehouse_weight_of_proof_win",
    backgroundZoneId: "warehouse",
    lines: [
      { speakerId: "system", text: "Bu maçı Atölye ekibi kazandı!" },
      { speakerId: "panda", text: "İyi oynadınız. Ama depoyla ilgili söylediklerim hâlâ geçerli." },
      { speakerId: "ayi", text: "Şu kasalarda bekleyen parçalar var. Gönderecek çalışan aracımız kalmadı." },
      { speakerId: "kedi", text: "Başka bölgelerin boşta duran araçlarını kullanabiliriz." },
      { speakerId: "kopek", text: "Bunu deneyelim. PRES-4, parçaları nereye göndermek gerekiyor?" },
    ],
  },
  scene_warehouse_weight_of_proof_loss: {
    id: "scene_warehouse_weight_of_proof_loss",
    backgroundZoneId: "warehouse",
    lines: [
      { speakerId: "panda", text: "Bugün biz kazandık. Son ana kadar iyi mücadele ettiniz." },
      { speakerId: "ayi", text: "Ben de biraz dinleneceğim. Bu gövdeyle hareket etmek kolay değil." },
      { speakerId: "kopek", text: "İyi maçtı. Hazırlanıp yeniden geleceğiz." },
    ],
  },
  scene_warehouse_weight_of_proof_mid: {
    id: "scene_warehouse_weight_of_proof_mid",
    backgroundZoneId: "warehouse",
    lines: [
      { speakerId: "system", text: "Dikkat! Fabrikanın ana elektrik hattında arıza var. Kalan maçlar daha erken başlayacak." },
      { speakerId: "kedi", text: "Herkesin makinesi aynı anda çalışınca hat dayanamıyor." },
      { speakerId: "kopek", text: "Ben de bir yere yetişince başka bir yer bozuluyor. Tek başıma yetişemiyorum." },
      { speakerId: "panda", text: "Yardım iste, FIX-8. Biz de buradayız." },
    ],
  },

  // ── Görev 7: Kumun Altındaki Hat (Kumlama) ──
  scene_sandblast_line_under_sand_intro: {
    id: "scene_sandblast_line_under_sand_intro",
    backgroundZoneId: "sandblast",
    lines: [
      { speakerId: "system", text: "Kumlama Ünitesi'ne hoş geldiniz. Sıradaki maç başlıyor!" },
      { speakerId: "armadillo", text: "Şu yığına dikkat edin. Altından eski bir boru geçiyor." },
      { speakerId: "kanguru", text: "Ben üstünden atlarım! Dönüşte nereye ineceğime de bakarım artık." },
      { speakerId: "kopek", text: "Maçtan sonra boruya bakalım. MAT-6 yolu açsın, ben kırık yerleri tamir edeyim." },
      { speakerId: "kedi", text: "Ben de makinelerin ne kadar enerji harcadığını kontrol ederim." },
      { speakerId: "armadillo", text: "Tamamdır. İşleri bölüşürsek daha çabuk bitiririz." },
    ],
  },
  scene_sandblast_line_under_sand_win: {
    id: "scene_sandblast_line_under_sand_win",
    backgroundZoneId: "sandblast",
    lines: [
      { speakerId: "system", text: "Kumlama Ünitesi maçını Atölye kazandı!" },
      { speakerId: "armadillo", text: "Boru sağlam çıktı. Temizleyince yeniden kullanabiliriz." },
      { speakerId: "kopek", text: "İyi ki baktık. Az daha yenisini yapacaktık." },
      { speakerId: "kedi", text: "Eski parçaları yenilemek daha az enerji istiyor. Bunu diğer bölgelere de söyleyelim." },
      { speakerId: "kanguru", text: "Ben haber veririm! Bu kez inerken dikkat edeceğim, söz." },
    ],
  },
  scene_sandblast_line_under_sand_loss: {
    id: "scene_sandblast_line_under_sand_loss",
    backgroundZoneId: "sandblast",
    lines: [
      { speakerId: "armadillo", text: "Bu maç bizim oldu. İsterseniz yeniden deneyebiliriz." },
      { speakerId: "kanguru", text: "Yalnız önce yayıma bakayım. Biraz fazla sıçradım galiba." },
      { speakerId: "kopek", text: "Biz de bir nefes alalım. Sonra görüşürüz." },
    ],
  },

  // ── Görev 8: Kapı Açık Kalsın (Dış Yükleme) ──
  scene_loading_keep_gate_open_intro: {
    id: "scene_loading_keep_gate_open_intro",
    backgroundZoneId: "loading",
    lines: [
      { speakerId: "system", text: "Dış Yükleme maçı başlıyor. Yarışmacılar hazır olsun!" },
      { speakerId: "gergedan", text: "Bu kapı kapanırsa dışarı çıkamayız. Kupayı bunun için istiyorum." },
      { speakerId: "kaplan", text: "Kapıyı açan vinç de sürekli duruyor. Dün yarım gün uğraştık." },
      { speakerId: "kedi", text: "Vincin ağırlığı inerken elektrik üretebiliriz. Sonra kapıyı açmak için kullanırız." },
      { speakerId: "gergedan", text: "Yani enerji kesilse bile kapıyı açabilir miyiz?" },
      { speakerId: "kopek", text: "Biriktirdiğimiz elektrik yeterse açabiliriz. Maçtan sonra deneyelim." },
    ],
  },
  scene_loading_keep_gate_open_win: {
    id: "scene_loading_keep_gate_open_win",
    backgroundZoneId: "loading",
    lines: [
      { speakerId: "system", text: "Dış Yükleme maçını Atölye kazandı!" },
      { speakerId: "gergedan", text: "Kapı açıldı! Hem de ana güç kapalıyken!" },
      { speakerId: "kaplan", text: "Bir daha denedim. Yine açıldı. Bu gerçekten işe yarıyor." },
      { speakerId: "kedi", text: "Vincin ağırlığında biriktirdiğimiz enerji, gerektiğinde kapıyı açmaya yetiyor." },
      { speakerId: "kopek", text: "Şimdi Döküm Ocağı'na gidelim. Oradakilere de bir fikrimiz var." },
    ],
  },
  scene_loading_keep_gate_open_loss: {
    id: "scene_loading_keep_gate_open_loss",
    backgroundZoneId: "loading",
    lines: [
      { speakerId: "gergedan", text: "Bu sefer sizi geçtim! Güzel maçtı." },
      { speakerId: "kaplan", text: "Dinlenmek isterseniz şurada yer var. Vinç yolunu boş bırakın yeter." },
      { speakerId: "kopek", text: "Sağ olun. Birazdan yeniden hazır oluruz." },
    ],
  },

  // ── Görev 9: Ocağı Söndürmeden (Döküm) ──
  scene_foundry_without_dousing_furnace_intro: {
    id: "scene_foundry_without_dousing_furnace_intro",
    backgroundZoneId: "foundry",
    lines: [
      { speakerId: "system", text: "Döküm Ocağı'ndaki maç başlıyor. Sıcak borulardan uzak durun." },
      { speakerId: "ejderha", text: "Ocağı kapatmamızı istemeyin. Yeniden ısıtacak kadar enerjimiz yok." },
      { speakerId: "dino", text: "Ocak durursa yeni parça da yapamayız." },
      { speakerId: "aslan", text: "Üstelik makineler şimdiden zorlanıyor. Daha fazla güç veremeyiz." },
      { speakerId: "kedi", text: "Atık Arıtma'dan gelen sıcaklığı kullanabiliriz. Böylece daha az elektriğe ihtiyacımız olur." },
      { speakerId: "kopek", text: "Ocağı açık tutacak bir yol arıyoruz. Maçtan sonra birlikte deneyelim." },
    ],
  },
  scene_foundry_without_dousing_furnace_win: {
    id: "scene_foundry_without_dousing_furnace_win",
    backgroundZoneId: "foundry",
    lines: [
      { speakerId: "system", text: "Döküm Ocağı maçını Atölye kazandı. Dokuz bölge turu tamamlandı!" },
      { speakerId: "ejderha", text: "Sıcaklık düşmedi! Daha az elektrikle de çalışabiliyoruz." },
      { speakerId: "dino", text: "Yeni parçalar da hazır. Onlarda bir sorun yok." },
      { speakerId: "aslan", text: "Elektrik hattı da eskisi kadar zorlanmıyor." },
      { speakerId: "kedi", text: "Demek işe yarıyor. Şimdi bütün bölgeler için planı tamamlayabiliriz." },
    ],
  },
  scene_foundry_without_dousing_furnace_loss: {
    id: "scene_foundry_without_dousing_furnace_loss",
    backgroundZoneId: "foundry",
    lines: [
      { speakerId: "ejderha", text: "Bu kez biz kazandık. Biraz dinlenin." },
      { speakerId: "dino", text: "Ocağa biz bakarız. Siz hazır olunca haber verin." },
      { speakerId: "kopek", text: "Tamam. Toparlanıp yeniden geleceğiz." },
    ],
  },

  // ── Görev 10: Dokuzuncu Ölçüm (yarı final) ──
  scene_scrapyard_ninth_measurement_intro: {
    id: "scene_scrapyard_ninth_measurement_intro",
    backgroundZoneId: "scrapyard",
    lines: [
      { speakerId: "system", text: "Yarı final başlıyor! Kazanan ekip finale çıkacak." },
      { speakerId: "yeti", text: "Yeni planınızın soğutucuları durdurmadığından emin olmak istiyorum." },
      { speakerId: "kokarca", text: "Ben de bizi unutmadığınızdan. Borular hazır, haberinizi bekliyoruz." },
      { speakerId: "gergedan", text: "Kapıyı da kontrol ettim. Biz hazırız!" },
      { speakerId: "kedi", text: "Maç boyunca makineleri izleyeceğim. Bir sorun olursa hemen haber veririm." },
      { speakerId: "kopek", text: "Herkes hazırsa başlayalım. Bakalım birlikte çalışınca neler olacak." },
    ],
  },
  scene_scrapyard_ninth_measurement_win: {
    id: "scene_scrapyard_ninth_measurement_win",
    backgroundZoneId: "scrapyard",
    lines: [
      { speakerId: "system", text: "Atölye finale çıktı! Deneme boyunca bütün bölgelerin makineleri çalışmaya devam etti." },
      { speakerId: "yeti", text: "Soğutucular durmadı. Bu iyi haber." },
      { speakerId: "kokarca", text: "Bizim borular da çalıştı. Üstelik maçı izlemeye gelenler olmuş!" },
      { speakerId: "gergedan", text: "Kapı da açık. Size güvenmeye başlıyorum." },
      { speakerId: "panda", text: "Sonuçları gördüm. Finalde görüşürüz, FIX-8." },
    ],
  },
  scene_scrapyard_ninth_measurement_mid: {
    id: "scene_scrapyard_ninth_measurement_mid",
    backgroundZoneId: "warehouse",
    lines: [
      { speakerId: "system", text: "Finalistler belli oldu: Atölye ekibi ve PRES-4!" },
      { speakerId: "kopek", text: "Buraya kadar geldik. Yine de biraz heyecanlandım." },
      { speakerId: "kedi", text: "Hazırlığımızı yaptık. İstersen son kez birlikte kontrol edelim." },
      { speakerId: "tavsan", text: "Ben size yer ayırdım! Yani... kendime ayırdım. Sizi oradan destekleyeceğim." },
    ],
  },
  scene_scrapyard_ninth_measurement_loss: {
    id: "scene_scrapyard_ninth_measurement_loss",
    backgroundZoneId: "scrapyard",
    lines: [
      { speakerId: "yeti", text: "Bu kez olmadı. Bir daha deneyelim." },
      { speakerId: "kokarca", text: "Biz buradayız. Hazırlanmanız için bekleriz." },
      { speakerId: "gergedan", text: "Acele etmeyin. İyi bir başlangıç için önce dinlenmek gerek." },
    ],
  },

  // ── Görev 11: Final Vardiyası (final) ──
  scene_warehouse_final_shift_intro: {
    id: "scene_warehouse_final_shift_intro",
    backgroundZoneId: "warehouse",
    lines: [
      { speakerId: "system", text: "Final başlıyor! Kazanan, fabrikanın bakımına nereden başlanacağına karar verecek." },
      { speakerId: "panda", text: "Kazanırsanız planınıza bir şans vereceğim. Ama maçı kolaylaştırmamı beklemeyin." },
      { speakerId: "kopek", text: "Beklemiyoruz. Sen de hazır ol, kupayı almaya geldik!" },
      { speakerId: "kedi", text: "Her şey hazır. İki tarafa da iyi şanslar." },
      { speakerId: "tavsan", text: "Hadi Atölye! Buradan duyuluyor muyum? Hadi!" },
    ],
  },
  scene_warehouse_final_shift_win: {
    id: "scene_warehouse_final_shift_win",
    backgroundZoneId: "warehouse",
    lines: [
      { speakerId: "system", text: "Kupayı Atölye kazandı! Dikkat: Ana elektrik hattı arızalandı!" },
      { speakerId: "panda", text: "Maç sizindi. Şimdi söyleyin, nerede yardım gerekiyor?" },
      { speakerId: "kopek", text: "Döküm Ocağı'na gitmeliyiz. Hazırladığımız planı şimdi uygulamamız gerek." },
      { speakerId: "kedi", text: "Ben bölgelere haber veriyorum. Herkes kendi makinesinin başına geçsin." },
      { speakerId: "tavsan", text: "Ben de anahtarları götürüyorum. Yolu açın!" },
    ],
  },
  scene_warehouse_final_shift_loss: {
    id: "scene_warehouse_final_shift_loss",
    backgroundZoneId: "warehouse",
    lines: [
      { speakerId: "panda", text: "İyi maçtı. Bu kez ben kazandım." },
      { speakerId: "kopek", text: "Sonuna kadar denedik. Biraz dinlenmeye ihtiyacımız var." },
      { speakerId: "kedi", text: "Hazır olunca yeniden deneriz. Ben yanınızdayım." },
    ],
  },

  // ── Görev 12: Ortak Vardiya (final krizi + epilog) ──
  scene_foundry_joint_shift_intro: {
    id: "scene_foundry_joint_shift_intro",
    backgroundZoneId: "foundry",
    lines: [
      { speakerId: "system", text: "Dikkat! Üç robotun kontrolü bozuldu. Arenaya yaklaşmayın." },
      { speakerId: "ejderha", text: "Kolum durmuyor! Geri çekilin, size çarpmak istemiyorum!" },
      { speakerId: "yeti", text: "Benim de düğmelerim çalışmıyor. Bizi durdurmanız gerek!" },
      { speakerId: "aslan", text: "Yaklaşırken dikkat edin. Etrafıma elektrik saçıyorum!" },
      { speakerId: "panda", text: "Bağlantıyı ben tutarım. Siz arkadaşlarımızı durdurun, sonra tamir edelim." },
      { speakerId: "kopek", text: "Herkes görevini biliyor. Hadi başlayalım!" },
    ],
  },
  scene_foundry_joint_shift_win: {
    id: "scene_foundry_joint_shift_win",
    backgroundZoneId: "foundry",
    lines: [
      { speakerId: "system", text: "Elektrik hattı yeniden çalışıyor. Dokuz bölgeye de yeterli enerji ulaşıyor." },
      { speakerId: "kedi", text: "Oldu! Kimsenin makinesini kapatmamız gerekmiyor." },
      { speakerId: "panda", text: "Haklıymışsın, FIX-8. Depoyu kurtarmanın tek yolu diğerlerini bekletmek değilmiş." },
      { speakerId: "kopek", text: "Sen olmasan o bağlantıyı tutamazdık. İyi ki yardım ettin." },
      { speakerId: "tavsan", text: "Kupaya dokuz ışık taktım! Her bölgeye bir tane. Hepsi yanıyor, bakın!" },
      { speakerId: "system", text: "Dokuz Bölge Kupası tamamlandı. Gelecek turnuvada yeniden görüşmek üzere!" },
    ],
  },
  scene_foundry_joint_shift_loss: {
    id: "scene_foundry_joint_shift_loss",
    backgroundZoneId: "foundry",
    lines: [
      { speakerId: "ejderha", text: "Kolum hâlâ durmuyor. Lütfen dikkatli olun!" },
      { speakerId: "yeti", text: "Bizi burada bırakmayın. Yeniden deneyin!" },
      { speakerId: "kopek", text: "Buradayız. Sizi yalnız bırakmayacağız." },
    ],
  },
};

// ── Öğretici paketleri ─────────────────────────────────────────────────────
// Yalnız ilk üç görevde kullanılır (kilit §8, D-11) ve yalnız brifing
// ekranında gösterilir; savaş sırasında ayrı bir kaplama çizilmez.
const STORY_TUTORIALS = {
  movement_aim: {
    id: "movement_aim",
    title: "Hareket ve Ateş",
    lines: [
      "A/D veya ←→ ile yürü; yürüme enerji harcar, enerji her turda yenilenir.",
      "Fareyle nişan al; sol tıkı basılı tutup güç doldur, bırakınca ateş et.",
      "W veya ↑ tuşuyla sıçra; sıçrama da enerji harcar, dikkatli kullan.",
    ],
  },
  wind_ammo_weapons: {
    id: "wind_ammo_weapons",
    title: "Rüzgâr ve Mühimmat",
    lines: [
      "Rüzgâr mermini yana iter. Atıştan önce ekrandaki rüzgâr okuna bak.",
      "Bazuka bitmez. Diğer silahlarda kaç atışın kaldığını ekrandaki sayılardan görebilirsin.",
      "1–9 tuşları veya fare tekerleği ile silah değiştir; her silah farklı davranır.",
    ],
  },
  module_shield_platforms: {
    id: "module_shield_platforms",
    title: "Dahili Modül",
    lines: [
      "Robotunun özel yeteneğini Q tuşuyla kullan. Bazı robotlar kendini tamir eder, bazıları kalkan açar.",
      "Hasar veren bir modül kullanırsan o tur ateş edemezsin; onarım ve kalkan gibi yardımcı modüller atışı harcamaz.",
      "Yeteneği yeniden kullanmak için birkaç tur beklemelisin. Hazır olduğunda ekranda bir işaret çıkar.",
      "Yüksekten nişan almak kolay olabilir. Ama kenara çok yaklaşırsan aşağı düşebilirsin.",
    ],
  },
};

// ── Hikâye zorlukları ──────────────────────────────────────────────────────
// Hikâye etiketi ↔ mevcut AI zorluğu (plan §13). Kadro değişmez, yalnız bot
// zekâsı değişir; ödül formülü zorluk çarpanını kendisi kullanır.
const STORY_DIFFICULTIES = {
  easy:   { id: "easy",   label: "Rahat Vardiya",    ai: "easy",   desc: "Hikâye ve temel kontroller" },
  normal: { id: "normal", label: "Standart Vardiya", ai: "normal", desc: "Önerilen ilk deneyim" },
  hard:   { id: "hard",   label: "Yoğun Vardiya",    ai: "hard",   desc: "Sisteme hâkim oyuncu" },
  expert: { id: "expert", label: "Usta Vardiya",     ai: "expert", desc: "Gelişmiş robot/silah kullanımı" },
};

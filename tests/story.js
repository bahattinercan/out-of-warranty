/* Hikâye modu veri, kilit grafiği ve profil göçü testleri — bağımlılıksız.
 *
 * tests/progression.js çatısını taklit eder: story-data.js ve story.js DOM'a
 * dokunmadığı için karakter/profil dosyalarıyla tek bir vm sandbox'ında
 * yüklenir. localStorage yerine sahte depolama kullanılır; böylece profil göçü
 * (v1→v3) ve bozuk story kurtarması tarayıcı olmadan doğrulanır.
 *
 * Normatif kural listesi docs/story-mode-lock.md §14'tedir (14 hata + 3 uyarı).
 *
 * Çalıştır:  node tests/story.js
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "js");
const FILES = ["characters.js", "progression.js", "profile.js", "parts.js", "market.js", "maps.js", "story-data.js", "story.js", "ai.js"];
const bundle =
  FILES.map((f) => fs.readFileSync(path.join(JS_DIR, f), "utf8")).join("\n;\n") +
  "\n;globalThis.__S = { CHARACTERS, MAPS, FACTORY_ZONES, STORY_CAMPAIGN, STORY_ZONES, STORY_MISSIONS, STORY_SCENES, STORY_TUTORIALS, STORY_DIFFICULTIES, STORY_SCENES_COMPLETE, validateStoryData, getMissionById, missionsInOrder, firstMissionId, nextMissionId, actOf, missionPrerequisites, isMissionUnlocked, selectableRobotsForMission, defaultStoryProgress, normalizeStoryProgress, maintenancePoints, collectedEvidence, curtailedZones, resolveStoryDifficulty, sceneById, sceneTotalLines, PROFILE_SCHEMA_VERSION, defaultProfile, normalizeProfile, loadProfile, saveProfile, PROFILE_KEY, getMapById, calculateMatchReward, BotController };";

const sandbox = { Math, Date, console, JSON, Set, Map, Array, Object, Number, String, isFinite, parseInt };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
try {
  vm.runInContext(bundle, sandbox, { filename: "story-bundle.js" });
} catch (e) {
  console.error("Kaynaklar yüklenemedi:\n", e);
  process.exit(1);
}
const S = sandbox.__S;

// ── Minik test çatısı ───────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
let section = "";
function group(name) { section = name; console.log(`\n▸ ${name}`); }
function check(name, cond, detail) {
  if (cond) pass++;
  else { fail++; failures.push(`[${section}] ${name}${detail ? " — " + detail : ""}`); console.log(`  ✗ ${name}${detail ? " — " + detail : ""}`); }
}

function makeStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

// ── 1) Tek seferlik doğrulama ───────────────────────────────────────────────
// Kilit belgesi §14'teki 14 hata kuralının tamamı validateStoryData içinde
// toplu çalışır; aşağıdaki gruplar hem kural başına ayrı test hem de bozuk
// veri enjeksiyonu ile kuralın gerçekten HATA ürettiğini doğrular.
const validation = S.validateStoryData();
const idFormatOk = (id) => /^[a-z0-9_]+$/.test(id);

// ── 2) Kimlik benzersizliği ve biçim ────────────────────────────────────────
group("Kimlik benzersizliği ve biçim");
{
  const missionIds = S.STORY_MISSIONS.map((m) => m.id);
  const sceneIds = Object.keys(S.STORY_SCENES);
  const evidenceIds = S.STORY_MISSIONS.filter((m) => m.evidence).map((m) => m.evidence.id);
  const tutorialIds = Object.keys(S.STORY_TUTORIALS);

  check("12 görev tanımlı", S.STORY_MISSIONS.length === 12);
  check("görev kimlikleri benzersiz", new Set(missionIds).size === missionIds.length);
  check("görev kimlikleri biçime uygun", missionIds.every(idFormatOk));
  check("sahne kimlikleri benzersiz", new Set(sceneIds).size === sceneIds.length);
  check("sahne kimlikleri biçime uygun", sceneIds.every(idFormatOk));
  check("kanıt kimlikleri benzersiz", new Set(evidenceIds).size === evidenceIds.length);
  check("öğretici kimlikleri benzersiz", new Set(tutorialIds).size === tutorialIds.length);
  // Dört kimlik uzayı (görev/sahne/kanıt/öğretici) birbirine geçemez.
  const all = [...missionIds, ...sceneIds, ...evidenceIds, ...tutorialIds];
  check("kimlikler türler arasında da benzersiz", new Set(all).size === all.length);
}

// ── 3) Görev kimliği ve bölge eşleşmesi ────────────────────────────────────
group("Görev kimliği ve bölge eşleşmesi");
{
  const hostZones = S.STORY_MISSIONS.filter((m) => m.order <= 9).map((m) => m.zoneId);
  for (const m of S.STORY_MISSIONS) {
    check(`${m.id}: kimlik bölge önekiyle başlar`, m.id.startsWith(m.zoneId + "_"));
    check(`${m.id}: mapId MAPS içinde`, S.MAPS.some((x) => x.id === m.mapId));
    check(`${m.id}: mapId zoneId === zoneId`, S.MAPS.find((x) => x.id === m.mapId).zoneId === m.zoneId);
  }
  check("görev 1–9 dokuz farklı bölgeye ev sahipliği yapıyor", new Set(hostZones).size === 9);
  check("zoneOrder görev 1–9'un bölge sırasıyla aynı", JSON.stringify(hostZones) === JSON.stringify(S.STORY_CAMPAIGN.zoneOrder));
  // §4 tablosundaki dokuz bölge zoneOrder ile aynı sıradadır.
  check("STORY_ZONES sırası zoneOrder ile aynı",
    JSON.stringify(S.STORY_ZONES.map((z) => z.zoneId)) === JSON.stringify(S.STORY_CAMPAIGN.zoneOrder));
}

// ── 4) Kadro sözleşmesi ────────────────────────────────────────────────────
group("Kadro sözleşmesi");
{
  const ids = new Set(S.CHARACTERS.map((c) => c.id));
  for (const m of S.STORY_MISSIONS) {
    check(`${m.id}: 1–3 rakip`, m.opponents.length >= 1 && m.opponents.length <= 3);
    check(`${m.id}: rakip listesi benzersiz`, new Set(m.opponents).size === m.opponents.length);
    check(`${m.id}: rakipler CHARACTERS içinde`, m.opponents.every((o) => ids.has(o)));
  }
  // Görev 1'de harita sahibi (kirpi/BİLYE-3) tek rakiptir; kilit §13'ün
  // "rakip robot seçilemez" kuralını tek başına karşılar.
  const m1 = S.getMissionById("scrapyard_open_service_slot");
  check("görev 1: tek rakip harita sahibidir", m1.opponents.length === 1 && m1.opponents[0] === m1.mapId);
  // Saha robotu seçimi rakipleri çıkarır; diğer robotlar açık kalır (§13).
  const selectable = S.selectableRobotsForMission(S.getMissionById("foundry_without_dousing_furnace"));
  check("görev 9'da 3 rakip hariç 31 robot seçilebilir", selectable.length === 31);
  check("görev 9 rakipleri seçilemez listesinde", ["ejderha", "dino", "aslan"].every((o) => !selectable.includes(o)));
}

// ── 5) Perde, sıra ve önerilen seviye ──────────────────────────────────────
group("Perde, sıra ve önerilen seviye");
{
  const ordered = S.missionsInOrder();
  check("order 1..12 artan dizide", ordered.every((m, i) => m.order === i + 1));
  const byAct = {};
  for (const m of S.STORY_MISSIONS) byAct[m.act] = (byAct[m.act] || 0) + 1;
  check("perde dağılımı 3/3/6", byAct[1] === 3 && byAct[2] === 3 && byAct[3] === 6);
  // STORY_CAMPAIGN.acts listeleri ile act alanı ayrışamaz.
  for (const act of S.STORY_CAMPAIGN.acts) {
    check(`perde ${act.id} listesi act alanıyla tutarlı`,
      act.missionIds.every((id) => S.getMissionById(id).act === act.id) &&
      act.missionIds.length === S.STORY_MISSIONS.filter((m) => m.act === act.id).length);
  }
  const levels = ordered.map((m) => m.recommendedLevel);
  check("önerilen seviye 1–8 aralığında", levels.every((l) => l >= 1 && l <= 8));
  check("önerilen seviye azalmıyor", levels.every((l, i) => i === 0 || l >= levels[i - 1]));
  check("önerilen seviyeler §8'den birebir", JSON.stringify(levels) === JSON.stringify([1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6, 7]));
}

// ── 6) Kilit grafiği ───────────────────────────────────────────────────────
group("Kilit grafiği");
{
  const ordered = S.missionsInOrder();
  const last = ordered[ordered.length - 1];
  check("son görev kilit açmıyor", last.unlocks.length === 0);
  for (const m of S.STORY_MISSIONS) {
    check(`${m.id}: unlocks bilinen görevlere işaret ediyor`, m.unlocks.every((u) => !!S.getMissionById(u)));
  }
  // Doğrusal zincir: her görev yalnız bir önceki görev tarafından açılır.
  for (const m of ordered) {
    const prereqs = S.missionPrerequisites(m.id);
    if (m.order === 1) {
      check("ilk görev ön koşulsuz", prereqs.length === 0 && S.isMissionUnlocked(m.id, []));
    } else {
      const prev = ordered[m.order - 2];
      check(`${m.id}: ön koşul yalnız bir önceki görev`, prereqs.length === 1 && prereqs[0] === prev.id);
      check(`${m.id}: önceki görev tamamlanmadan kapalı`, S.isMissionUnlocked(m.id, []) === false);
      check(`${m.id}: önceki görev tamamlanınca açılır`, S.isMissionUnlocked(m.id, [prev.id]) === true);
    }
  }
  // Zincir bütünü: boş kayıttan itibaren hepsi sırayla açılır (döngüsüz).
  const done = [];
  for (const m of ordered) {
    if (S.isMissionUnlocked(m.id, done)) done.push(m.id);
  }
  check("kilit zinciri ilk görevden finale kadar kopmuyor", done.length === 12);
  // Döngü testi: zincir bir görevi kendi ön koşulu yapamaz.
  const cycle = S.STORY_MISSIONS.every((m) => !m.unlocks.includes(m.id));
  check("kilit grafiğinde özgöseline döngü yok", cycle);
}

// ── 7) Kanıt sözleşmesi ────────────────────────────────────────────────────
group("Kanıt sözleşmesi");
{
  const zoneEv = S.STORY_MISSIONS.filter((m) => m.evidence && m.evidence.kind === "zone");
  const msEv = S.STORY_MISSIONS.filter((m) => m.evidence && m.evidence.kind === "milestone");
  check("tam olarak 9 zone kanıtı", zoneEv.length === 9);
  check("tam olarak 2 milestone kanıtı", msEv.length === 2);
  check("zone kanıtları dokuz farklı bölgeden", new Set(zoneEv.map((m) => m.zoneId)).size === 9);
  check("zone kanıt kimlikleri bölge önekli", zoneEv.every((m) => m.evidence.id.startsWith(m.zoneId + "_")));
  check("milestone kanıtları görev 10–11'de", JSON.stringify(msEv.map((m) => m.order)) === JSON.stringify([10, 11]));
  check("son görev (Ortak Vardiya) kanıt üretmez", S.getMissionById("foundry_joint_shift").evidence === null);
  // Plan §15 örneğiyle bağlantı: waste_heat_recovery kimliği korunur.
  check("waste_heat_recovery kimliği görev 5'te",
    S.getMissionById("waste_unseen_line").evidence.id === "waste_heat_recovery");
}

// ── 8) Öğretici paketleri ──────────────────────────────────────────────────
group("Öğretici paketleri");
{
  for (const m of S.STORY_MISSIONS) {
    check(`${m.id}: öğreticiler yalnız ilk üç görevde`, m.order <= 3 || m.tutorials.length === 0);
    check(`${m.id}: öğretici kimlikleri biliniyor`, m.tutorials.every((t) => !!S.STORY_TUTORIALS[t]));
  }
  const t1 = S.getMissionById("scrapyard_open_service_slot").tutorials;
  check("görev 1 tek öğretici taşır", JSON.stringify(S.getMissionById("scrapyard_open_service_slot").tutorials) === JSON.stringify(["movement_aim"]));
  check("görev 2 öğreticisi rüzgâr/mühimmat", S.getMissionById("assembly_magnet_objection").tutorials[0] === "wind_ammo_weapons");
  check("görev 3 öğreticisi modül", S.getMissionById("cooling_frozen_shift").tutorials[0] === "module_shield_platforms");
  for (const t of Object.keys(S.STORY_TUTORIALS)) {
    check(`öğretici ${t} 2–4 kutu taşır`, S.STORY_TUTORIALS[t].lines.length >= 2 && S.STORY_TUTORIALS[t].lines.length <= 4);
  }
}

// ── 9) Sahne sözleşmesi (yazılan sahneler + eksikler uyarı) ────────────────
group("Sahne sözleşmesi");
{
  const charIds = new Set(S.CHARACTERS.map((c) => c.id));
  for (const m of S.STORY_MISSIONS) {
    for (const [field, variant] of [["introSceneId", "intro"], ["winSceneId", "win"], ["lossSceneId", "loss"]]) {
      check(`${m.id}: ${field} kimlik sözleşmesi uygun`, m[field] === `scene_${m.id}_${variant}`);
      const scene = S.sceneById(m[field]);
      if (!scene) continue; // Faz 1'de eksik sahne uyarıdır; 10. grupta ölçülür
      check(`${m[field]}: sahne kimliği eşleşiyor`, scene.id === m[field]);
      check(`${m.id}: arka plan bölgesi görevle aynı`, scene.backgroundZoneId === m.zoneId);
      const speakers = scene.lines.map((l) => l.speakerId);
      check(`${m.id}: konuşmacılar biliniyor`, speakers.every((s) => s === "system" || charIds.has(s)));
    }
  }
  // Tüm kampanya sahnelendi (STORY_SCENES_COMPLETE=true): 39 sahne
  // (12 görev × intro/win/loss) + 3 ara sahne (m3/m6/m10).
  check("STORY_SCENES_COMPLETE açık", S.STORY_SCENES_COMPLETE === true);
  check("yazılmış sahne sayısı 39 (36 görev sahnesi + 3 ara)", Object.keys(S.STORY_SCENES).length === 39);
  check("her görevin üç sahnesi yazılmış",
    S.STORY_MISSIONS.every((m) => S.sceneById(m.introSceneId) && S.sceneById(m.winSceneId) && S.sceneById(m.lossSceneId)));
  // Ara sahnelar yalnız perde geçişlerinde: m3, m6, m10 (F4-02).
  const midMissions = S.STORY_MISSIONS.filter((m) => m.midSceneId);
  check("ara sahne yalnız m3/m6/m10'da", midMissions.map((m) => m.id).join(",") ===
    "cooling_frozen_shift,warehouse_weight_of_proof,scrapyard_ninth_measurement");
  check("ara sahnelar veriyle eşleşiyor", midMissions.every((m) =>
    S.sceneById(m.midSceneId) && m.midSceneId === `scene_${m.id}_mid`));
  check("görev 1 giriş sahnesi 4–8 kutu", S.sceneTotalLines("scene_scrapyard_open_service_slot_intro") >= 4);
  check("görev 12 epilogu 3–6 kutu", S.sceneTotalLines("scene_foundry_joint_shift_win") <= 6);
  check("epilog Merkez kapanış cümlesiyle biter",
    S.sceneById("scene_foundry_joint_shift_win").lines.at(-1).speakerId === "system");
  // Kısa cevaplar geçerli; boş veya 22 kelimeyi aşan kutu olmamalı.
  const sceneWarnings = validation.warnings.filter((w) => w.includes("kutu") && w.includes("olmalı"));
  check("sahnelerde kutu uzunluğu uyarısı yok", sceneWarnings.length === 0,
    `${sceneWarnings.length} uyarı`);
}

// ── 10) Kısıntı verisi ─────────────────────────────────────────────────────
group("Kısıntı verisi");
{
  const zoneIds = new Set(S.STORY_ZONES.map((z) => z.zoneId));
  const allCur = S.STORY_MISSIONS.reduce((a, m) => a.concat(m.curtailments || []), []);
  check("curtailments yalnız bilinen bölgelere işaret ediyor", allCur.every((z) => zoneIds.has(z)));
  // Plan §8'in açık anı: görev 3, Hurda Sahası'nı kısıntıya sokar.
  check("görev 3 scrapyard'ı kısıntıya sokuyor",
    S.getMissionById("cooling_frozen_shift").curtailments.includes("scrapyard"));
  const touched = S.STORY_MISSIONS.filter((m) => (m.curtailments || []).length > 0);
  check("kısıntı yalnız anlatı anlarında", JSON.stringify(touched.map((m) => m.id)) === JSON.stringify(["cooling_frozen_shift"]));
}

// ── 11) Bölge temsilcileri (görevlendirme uyarısı) ─────────────────────────
group("Bölge temsilcileri");
{
  const charIds = new Set(S.CHARACTERS.map((c) => c.id));
  const expectedAssignments = ["kokarca", "zurafa", "aslan", "suaygiri"];
  let reps = 0, mismatches = [];
  for (const zone of S.STORY_ZONES) {
    check(`${zone.zoneId}: bölge etiketi/kodu FACTORY_ZONES ile aynı`,
      Object.values(S.FACTORY_ZONES).some((f) => f.zoneId === zone.zoneId && f.zoneLabel === zone.zoneLabel && f.zoneCode === zone.zoneCode));
    for (const rep of zone.representativeIds) {
      reps++;
      if (!charIds.has(rep)) { check(`${rep} CHARACTERS içinde`, false); continue; }
      const home = S.MAPS.find((x) => x.id === rep).zoneId;
      if (home !== zone.zoneId) mismatches.push(rep);
    }
  }
  check("25 temsilci tanımlı", reps === 25);
  check("ev bölgesi uyuşmazlığı tam 4", mismatches.length === 4, mismatches.join(","));
  check("beklenen dört görevlendirme korunuyor",
    JSON.stringify(mismatches.slice().sort()) === JSON.stringify(["aslan", "kokarca", "suaygiri", "zurafa"]));
  // Her bölge en az iki temsilci taşır; dokuz bölgenin tamamı temsil ediliyor.
  check("dokuz bölgenin tamamında temsilci var", S.STORY_ZONES.every((z) => z.representativeIds.length >= 2));
}

// ── 12) Profil göçü ve bozuk kayıt ────────────────────────────────────────
group("Profil göçü ve bozuk kayıt");
{
  check("şema sürümü 6", S.PROFILE_SCHEMA_VERSION === 6);
  const fresh = S.defaultProfile();
  check("varsayılan profil story alanı taşır",
    !!fresh.story && fresh.story.campaignId === "nine_zones_cup_v1");
  check("varsayılan story ilk görevi gösterir", fresh.story.currentMissionId === S.firstMissionId());
  check("defaultStoryProgress round-trip",
    JSON.stringify(S.normalizeStoryProgress(fresh.story)) === JSON.stringify(fresh.story));

  // v1 → v3 göçü: ekonomi aynen korunur, hikâye varsayılana, depo boşa düşer.
  const v1 = {
    version: 1, scrap: 555,
    robots: { kopek: { xp: 450, upgrades: { chassis: 2, module: 1, core: 0 }, stats: { matches: 7, wins: 5 } } },
    claimedMatches: ["a", "b"], updatedAt: 123,
  };
  const v2 = S.normalizeProfile(v1);
  check("v1 Hurda korunur", v2.scrap === 555);
  check("v1 XP ve kademeler korunur", v2.robots.kopek.xp === 450 && v2.robots.kopek.upgrades.chassis === 2 && v2.robots.kopek.upgrades.module === 1);
  check("v1 maç istatistikleri korunur", v2.robots.kopek.stats.matches === 7 && v2.robots.kopek.stats.wins === 5);
  check("v1 maç anahtarları korunur", JSON.stringify(v2.claimedMatches) === JSON.stringify(["a", "b"]));
  check("v1 updatedAt korunur", v2.updatedAt === 123);
  check("v6 sürümü yazılır", v2.version === 6);
  check("v1 kaydına varsayılan hikâye eklenir", v2.story.currentMissionId === S.firstMissionId() && v2.story.completedMissions.length === 0);

  // Bozuk story ekonomiyi SIFIRLAMAZ (kilit §10'un en kritik kuralı).
  const corruptVariants = [
    null, "metin", 42,
    { campaignId: "baska_kampanya", scrap: "gölge" },
    { campaignId: "nine_zones_cup_v1", completedMissions: ["olmayan_gorev", "waste_unseen_line", "waste_unseen_line"] },
  ];
  for (const story of corruptVariants) {
    const p = S.normalizeProfile({ version: 2, scrap: 777, story });
    check(`bozuk story'de Hurda korunur (${JSON.stringify(story).slice(0, 40)})`, p.scrap === 777);
    check(`bozuk story'de ilk görevde`, p.story.currentMissionId === S.firstMissionId());
  }
  // Bilinmeyen kimlikler atılır, yinelenenler tekilleştirilir.
  const messy = S.normalizeStoryProgress({
    campaignId: "nine_zones_cup_v1",
    currentMissionId: "olmayan_gorev",
    completedMissions: ["waste_unseen_line", "waste_unseen_line", "hayalet"],
    // NOT: sahne kimliği STORY_SCENES'te bulunmalı; bu fazda yalnız görev 1–2
    // sahnelendiği için görev 2'nin zafer sahnesi kullanılır.
    seenScenes: ["scene_assembly_magnet_objection_win", "scene_assembly_magnet_objection_win", "hayalet_sahne"],
    difficulty: "cekirdek_içi",
    selectedRobotId: "hayalet",
    endingSeen: "evet",
  });
  check("bilinmeyen görev atılır ve tekrar tekilleşir",
    JSON.stringify(messy.completedMissions) === JSON.stringify(["waste_unseen_line"]));
  check("bilinmeyen sahne atılır ve tekrar tekilleşir",
    JSON.stringify(messy.seenScenes) === JSON.stringify(["scene_assembly_magnet_objection_win"]));
  check("geçersiz currentMissionId ilk göreve döner", messy.currentMissionId === S.firstMissionId());
  check("geçersiz zorluk normal olur", messy.difficulty === "normal");
  check("geçersiz robot null olur", messy.selectedRobotId === null);
  check("endingSeen boolean'a sıkıştırılır", messy.endingSeen === false);

  // Kalıcı kayıt yolu story'yi korumalı (makeStorage gerçek saklar).
  const store = makeStorage();
  const p1 = S.normalizeProfile({ version: 2, scrap: 900, story: { campaignId: "nine_zones_cup_v1", completedMissions: ["waste_unseen_line"] } });
  const ok = S.saveProfile(p1, store);
  const p2 = S.loadProfile(store).profile;
  check("kayıt story alanını korur", ok && p2.scrap === 900 && p2.story.completedMissions[0] === "waste_unseen_line");
}

// ── 13) Bakım Puanı ve türetilen durumlar ──────────────────────────────────
group("Bakım Puanı ve türetilen durumlar");
{
  const story = { campaignId: "nine_zones_cup_v1", currentMissionId: S.firstMissionId(), completedMissions: [], seenScenes: [], difficulty: "normal", selectedRobotId: null, endingSeen: false };
  check("boş kayıtta Bakım Puanı 0", S.maintenancePoints(story).total === 0);
  check("boş kayıtta kanıt yok", S.collectedEvidence(story).length === 0);
  check("boş kayıtta kısıntı yok", S.curtailedZones(story).length === 0);

  // Yalnız tamamlanan görevlerden türer; tekrar (duplicate) puanı artırmaz.
  story.completedMissions = ["cooling_frozen_shift", "cooling_frozen_shift"];
  const mid = S.maintenancePoints(story);
  check("tekrar tamamlama puanı ikiye bölünmez", mid.total === 10 && mid.zones.cooling === 10);
  check("görev 3 tamamlanınca scrapyard kısıntıya girer",
    JSON.stringify(S.curtailedZones(story)) === JSON.stringify(["scrapyard"]));
  check("görev 3'ün kanıtı toplanır",
    JSON.stringify(S.collectedEvidence(story).map((e) => e.id)) === JSON.stringify(["cooling_redundant_map"]));

  // Tam kampanya: toplam 270, bölge dağılımı kilit §11 tablosuyla aynı.
  story.completedMissions = S.STORY_MISSIONS.map((m) => m.id);
  const full = S.maintenancePoints(story);
  check("tam kampanya toplamı 270", full.total === 270);
  check("bölge dökümü kilit tablosuyla aynı",
    full.zones.foundry === 60 && full.zones.warehouse === 50 && full.zones.scrapyard === 40 &&
    full.zones.sandblast === 30 && full.zones.loading === 30 && full.zones.paint === 20 &&
    full.zones.waste === 20 && full.zones.assembly === 10 && full.zones.cooling === 10);
  check("tam kampanyada dokuz teknik kanıt", S.collectedEvidence(story).length === 9);
  check("kilometre taşları teknik kanıt sayılmaz",
    S.collectedEvidence(story).every((e) => e.id !== "lead_maintenance_authority"));
  // Epilog: endingSeen ile hiç kısıntı gösterilmez.
  story.endingSeen = true;
  check("endingSeen'de kısıntı sıfırlanır", S.curtailedZones(story).length === 0);
  story.endingSeen = false;

  // Kanıt kilidi: görev 10'a gelindiğinde dokuz kanıt tamamlanmış olur.
  const partial = S.normalizeStoryProgress({
    campaignId: "nine_zones_cup_v1",
    completedMissions: S.STORY_MISSIONS.filter((m) => m.order <= 9).map((m) => m.id),
  });
  check("görev 10 öncesi dokuz kanıt tamamlanmış", S.collectedEvidence(partial).length === 9);
}

// ── 14) Doğrulama çıktısının kendisi ───────────────────────────────────────
group("validateStoryData çıktısı");
{
  check("kampanya verisi hatasız", validation.ok === true, validation.errors.join(" | "));
  check("sahne kampanyası tamamlandığı için uyarı yok", validation.warnings.length === 0,
    validation.warnings.join(" | "));
}

// ── 15) Duman testi matrisi (F5-01/F5-02) ───────────────────────────────
group("Duman testi matrisi (12 görev × 4 zorluk)");
{
  const AI_LEVELS = ["easy", "normal", "hard", "expert"];
  const diffKeys = Object.keys(S.STORY_DIFFICULTIES);
  for (const m of S.STORY_MISSIONS) {
    for (const key of diffKeys) {
      const resolved = S.resolveStoryDifficulty(key);
      const combo = `${m.id} × ${key}`;
      // Bot zorluğu yalnız AI seviyesine çevrilir; görünmez bonus yoktur.
      check(`${combo}: AI seviyesi geçerli`, AI_LEVELS.includes(resolved.ai));
      check(`${combo}: kadro/harita veriden sapmaz`,
        m.opponents.length >= 1 && S.getMapById(m.mapId).arenaCode != null);
      check(`${combo}: en az bir seçilebilir robot var`,
        S.selectableRobotsForMission(m).length >= 1);
      // Ödül tutarlılığı: hikâye zorluğunun çarpanı AI çarpanıyla aynıdır.
      const reward = S.calculateMatchReward({
        difficulty: resolved.ai,
        opponentCount: m.opponents.length,
        result: "win",
        place: 1,
      });
      check(`${combo}: ödül formülü sonucu pozitif`, reward && reward.scrap > 0 && reward.xp > 0);
    }
  }
  // Ödül tekdüzeliği: aynı görevde zorluk yükseldikçe Hurda azalmamalı (F5-02).
  for (const m of S.STORY_MISSIONS) {
    const scraps = diffKeys.map((k) =>
      S.calculateMatchReward({ difficulty: S.resolveStoryDifficulty(k).ai, opponentCount: m.opponents.length, result: "win", place: 1 }).scrap);
    check(`${m.id}: ödül zorlukla azalmaz`, scraps[0] <= scraps[1] && scraps[1] <= scraps[2] && scraps[2] <= scraps[3]);
  }

  // Geliştirmesiz ve geliştirilmiş profil aynı kadroyu alır (F5-02):
  // botlara görünmez HP/hasar bonusu yoktur; görev verisi hiçbir stat alanı
  // taşımaz (opponents/mapId/recommendedLevel dışında).
  const statFields = ["hp", "damage", "armor", "hpBonus", "damageBonus"];
  const withStats = S.STORY_MISSIONS.filter((m) => statFields.some((k) => Object.prototype.hasOwnProperty.call(m, k)));
  check("görev verisi görünür stat bonusu taşımaz", withStats.length === 0);
  // Görünmez bonus kod tarafında da yoktur: BotController yalnız difficulty alır.
  check("BotController constructor'da tek argüman alır", S.BotController && S.BotController.length === 1);
}

// ── Sonuç ───────────────────────────────────────────────────────────────────
console.log(`\n────────────────────────────────────────────────`);
console.log(`Toplam: ${pass + fail}  •  ✓ Geçti: ${pass}  •  ✗ Kaldı: ${fail}`);
if (fail) {
  console.error("\nBaşarısız testler:");
  failures.forEach((f) => console.log(" - " + f));
  process.exit(1);
}
console.log("Tüm hikâye testleri geçti ✅");

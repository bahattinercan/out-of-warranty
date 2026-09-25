/* Hikâye modunun kural katmanı: veri doğrulama, kilit grafiği, sahne ve
 * sonuç yardımcıları.
 *
 * Bu dosya DOM'a ve localStorage'a dokunmaz (tests/story.js bunu doğrular);
 * ekran çizimi js/game.js'te, kalıcılık js/profile.js'tedir. profile.js,
 * `story` alanını normalizasyonu için bu dosyadaki normalizeStoryProgress()
 * fonksiyonunu çağırır — klasik scriptler olduğu için çağrı çalışma zamanında
 * yapılır ve dosyaların yükleme sırası bunu güvenli kılar.
 *
 * Veri kaynağı js/story-data.js'tir; sözleşme docs/story-mode-lock.md §6–§14.
 */

// ── Küçük yardımcılar ───────────────────────────────────────────────────────

// Sahte JSON/bozuk kayıt girdisinde dize listesi üretir; olmayan/yanlış tip
// güvenli boş listeye düşer.
function _storyStringList(raw) {
  return Array.isArray(raw) ? raw.filter((x) => typeof x === "string" && x) : [];
}

// Yinelenen kimlikleri tekilleştirir; sırayı korur.
function _storyUnique(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

// CHARACTERS içinde gerçek bir robot kimliği mi? (profil.js'teki knownRobotId
// ile aynı kural; story.js profile.js'e bağımlı kalmamalı.)
function isStoryRobotId(robotId) {
  if (typeof robotId !== "string" || !robotId) return false;
  if (typeof CHARACTERS === "undefined" || !Array.isArray(CHARACTERS)) return true;
  return CHARACTERS.some((c) => c && c.id === robotId);
}

// ── Görev erişimi ───────────────────────────────────────────────────────────

function getMissionById(id) {
  return STORY_MISSIONS.find((m) => m.id === id) || null;
}

// `order` artan sırada; kilitsiz ilerleme hep bu sırayı izler.
function missionsInOrder() {
  return STORY_MISSIONS.slice().sort((a, b) => a.order - b.order);
}

function firstMissionId() {
  return missionsInOrder()[0].id;
}

// `order`'a göre bir sonraki görev; son görevde null döner.
function nextMissionId(missionId) {
  const current = getMissionById(missionId);
  if (!current) return null;
  const next = missionsInOrder().find((m) => m.order === current.order + 1);
  return next ? next.id : null;
}

// Görevin perdesi (1..3); bilinmeyen görevde 0 döner — çağıran taraf sıfırı
// "puansız" olarak yorumlar.
function actOf(missionId) {
  const m = getMissionById(missionId);
  return m ? m.act : 0;
}

// Görevi açmak için tamamlanması gereken görevler: `unlocks` ileriye işaret
// ettiği için bu görevi listeleyen görevler ön koşuldur.
function missionPrerequisites(missionId) {
  return STORY_MISSIONS.filter((m) => Array.isArray(m.unlocks) && m.unlocks.includes(missionId)).map((m) => m.id);
}

// completedMissions dizisindeki tüm ön koşullar tamamlanmadıkça görev kapalıdır.
function isMissionUnlocked(missionId, completedMissions) {
  const prereqs = missionPrerequisites(missionId);
  if (prereqs.length === 0) return true; // ilk görev (veya ön koşulsuz görev)
  const done = new Set(_storyStringList(completedMissions));
  return prereqs.every((id) => done.has(id));
}

// ── Saha robotu seçimi ─────────────────────────────────────────────────────

// 34 robotun tamamı açıktır (plan §20); yalnız bu görevin rakipleri o görev
// için geçici kapalıdır. Dönüş: seçilebilir karakter id'lerinin listesi.
function selectableRobotsForMission(mission) {
  const locked = new Set(mission && mission.opponents ? mission.opponents : []);
  return CHARACTERS.map((c) => c.id).filter((id) => !locked.has(id));
}

// Seçim boşsa veya geçersizse saha robotu Atölye kaptanıdır (kilit D-17).
function resolveStoryRobotId(selectedRobotId) {
  if (isStoryRobotId(selectedRobotId)) return selectedRobotId;
  return firstMissionRobotId();
}

// FIX-8 hem kaptan hem varsayılan saha birimidir.
function firstMissionRobotId() {
  return "kopek";
}

// Kupa haritasının dokuz bölge kartındaki görev satırları: bölge sırasıyla
// artan görev sırası. Harita çizimi ile klavye gezinmesi bu sırayı paylaşır.
function missionsForZone(zoneId) {
  return missionsInOrder().filter((m) => m.zoneId === zoneId);
}

// Görevin kupa haritasındaki durumu: kilitli / oynanabilir (açık) / tamamlanmış.
// Kilometre taşı ve kanıt bilgisi completedMissions'tan türetilir, saklanmaz.
function missionStatusOf(mission, storyProgress) {
  const completed = storyProgress && Array.isArray(storyProgress.completedMissions)
    ? storyProgress.completedMissions
    : [];
  if (completed.includes(mission.id)) return "done";
  return isMissionUnlocked(mission.id, completed) ? "open" : "locked";
}

// ── Sahne erişimi ───────────────────────────────────────────────────────────

function sceneById(id) {
  return Object.prototype.hasOwnProperty.call(STORY_SCENES, id) ? STORY_SCENES[id] : null;
}

// Sahnenin toplam kutu sayısı; sahne yoksa 0 döner (öğretici/ilerleme UI'sı
// boş sahnede bir kutu bile çizmez).
function sceneTotalLines(sceneId) {
  const scene = sceneById(sceneId);
  return scene && Array.isArray(scene.lines) ? scene.lines.length : 0;
}

// ── Profil `story` şeması ───────────────────────────────────────────────────

// Yalnız bu yedi alan saklanır (kilit §10, D-16); Bakım Puanı, kanıt ve
// kısıntı türetilir, asla ayrı yazılmaz.
function defaultStoryProgress() {
  return {
    campaignId: STORY_CAMPAIGN.id,
    currentMissionId: firstMissionId(),
    completedMissions: [],
    seenScenes: [],
    difficulty: "normal",
    selectedRobotId: null,
    endingSeen: false,
  };
}

// Her türlü girdi (bozuk/eksik/gelecek şema) için geçerli bir hikâye durumu
// üretir. Ekonomiye burada dokunulmaz: bozuk `story` yalnız hikâyeyi sıfırlar.
function normalizeStoryProgress(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  // Kampanya kimliği uyuşmuyorsa kayıt başka bir kampanyaya (veya gelecekteki
  // sürüme) aittir; ekonomiyi korumak yerine hikâyeyi baştan başlatmak güvenlidir.
  if (src.campaignId !== STORY_CAMPAIGN.id) return defaultStoryProgress();

  const missionIds = new Set(STORY_MISSIONS.map((m) => m.id));
  const sceneIds = new Set(Object.keys(STORY_SCENES));

  const completed = _storyUnique(_storyStringList(src.completedMissions).filter((id) => missionIds.has(id)))
    .sort((a, b) => getMissionById(a).order - getMissionById(b).order);
  const seen = _storyUnique(_storyStringList(src.seenScenes).filter((id) => sceneIds.has(id)));

  return {
    campaignId: STORY_CAMPAIGN.id,
    currentMissionId: missionIds.has(src.currentMissionId) ? src.currentMissionId : firstMissionId(),
    completedMissions: completed,
    seenScenes: seen,
    difficulty: STORY_DIFFICULTIES[src.difficulty] ? src.difficulty : "normal",
    selectedRobotId: isStoryRobotId(src.selectedRobotId) ? src.selectedRobotId : null,
    endingSeen: src.endingSeen === true,
  };
}

// ── Türetilen durumlar ─────────────────────────────────────────────────────

// Bakım Puanı (kilit §11, D-05): yalnız ilk tamamlama puan verir; tekrar
// tamamlama `completedMissions` tekilleştirildiği için zaten sayılmaz.
// Dönen değer hem Atölye toplamını hem bölge bazında dökümü taşır.
function maintenancePoints(storyProgress) {
  const completed = new Set(storyProgress && storyProgress.completedMissions ? storyProgress.completedMissions : []);
  const weights = STORY_CAMPAIGN.maintenancePointWeights;
  let total = 0;
  const zones = {};
  for (const m of STORY_MISSIONS) {
    if (!completed.has(m.id)) continue;
    const pts = weights[m.act] || 0;
    total += pts;
    zones[m.zoneId] = (zones[m.zoneId] || 0) + pts;
  }
  return { total, zones };
}

// Toplanan teknik kanıtlar (kind:"zone"). Kilometre taşları burada sayılmaz;
// Ortak Vardiya Planı'nı kuran veri yalnız dokuz teknik ölçümdür.
function collectedEvidence(storyProgress) {
  const completed = new Set(storyProgress && storyProgress.completedMissions ? storyProgress.completedMissions : []);
  const out = [];
  for (const m of STORY_MISSIONS) {
    if (!completed.has(m.id) || !m.evidence || m.evidence.kind !== "zone") continue;
    out.push({ id: m.evidence.id, label: m.evidence.label, zoneId: m.zoneId, missionId: m.id });
  }
  return out;
}

// Kısıntıdaki bölgeler: tamamlanan görevlerin `curtailments` birleşimi.
// Epilog'da (endingSeen) fabrika kararlı çalıştığı için hiç kısıntı gösterilmez.
function curtailedZones(storyProgress) {
  if (!storyProgress || storyProgress.endingSeen !== true) {
    const src = storyProgress && storyProgress.completedMissions ? storyProgress : { completedMissions: [] };
    return _storyUnique(missionsInOrder()
      .filter((m) => new Set(src.completedMissions).has(m.id))
      .reduce((acc, m) => acc.concat(Array.isArray(m.curtailments) ? m.curtailments : []), []));
  }
  return [];
}

// Hikâye etiketini AI zorluğuna çevirir; bilinmeyen değer Standart Vardiya'dır.
function resolveStoryDifficulty(difficulty) {
  const d = STORY_DIFFICULTIES[difficulty] || STORY_DIFFICULTIES.normal;
  return { id: d.id, label: d.label, ai: d.ai };
}

// ── Veri doğrulama ──────────────────────────────────────────────────────────

// Kısa cevaplar doğaldır; yalnız boş veya 22 kelimeyi aşan kutuları uyar.
function _wordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

// Sahne beklenen kutu aralığı: giriş 4–8, sonuç (win/loss) 3–6, ara (mid)
// 3–8. Dışı uyarı üretir; hata değildir (metin Faz 4'te düzenlenir).
function _sceneLineRange(variant) {
  if (variant === "intro") return [4, 8];
  if (variant === "mid") return [3, 8];
  return [3, 6];
}

// Tüm kampanya verisini bir kez doğrular. `errors` testi düşürür, `warnings`
// içerik notudur (uzun kutu, henüz yazılmamış sahne, görevlendirilmiş robot).
// tests/story.js bu fonksiyonun çıktısını kilit belgesi §14'teki kurallara
// göre doğrular.
function validateStoryData() {
  const errors = [];
  const warnings = [];

  // 1) Kimlik biçimi ve benzersizliği
  const ids = {};
  const addId = (kind, id) => {
    if (!id || typeof id !== "string" || !/^[a-z0-9_]+$/.test(id)) {
      errors.push(`${kind} kimliği geçersiz biçimde: ${id}`);
      return;
    }
    if (ids[id]) errors.push(`${kind} kimliği tekrarlı: ${id}`);
    ids[id] = kind;
  };
  for (const m of STORY_MISSIONS) addId("görev", m.id);
  for (const sceneId of Object.keys(STORY_SCENES)) addId("sahne", sceneId);
  for (const t of Object.keys(STORY_TUTORIALS)) addId("öğretici", t);

  // 2) Görev kimliği <zoneShortId>_<slug> biçiminde
  for (const m of STORY_MISSIONS) {
    if (!m.id.startsWith(`${m.zoneId}_`)) {
      errors.push(`${m.id}: kimlik bölge önekini taşımıyor (${m.zoneId}_)`);
    }
  }

  // 3) Harita/bölge eşleşmesi + zoneOrder dizilimi
  for (const m of STORY_MISSIONS) {
    const map = getMapById(m.mapId);
    if (!map || map.id !== m.mapId) {
      errors.push(`${m.id}: mapId ${m.mapId} MAPS içinde yok`);
      continue;
    }
    if (map.zoneId !== m.zoneId) {
      errors.push(`${m.id}: haritanın bölgesi ${map.zoneId}, görev ${m.zoneId} diyor`);
    }
  }
  const ordered = missionsInOrder();
  const hostZones = ordered.filter((m) => m.order <= 9).map((m) => m.zoneId);
  if (hostZones.length !== 9 || new Set(hostZones).size !== 9) {
    errors.push(`görev 1–9 dokuz farklı bölgeye ev sahipliği yapmıyor (${new Set(hostZones).size})`);
  } else if (JSON.stringify(hostZones) !== JSON.stringify(STORY_CAMPAIGN.zoneOrder)) {
    errors.push("STORY_CAMPAIGN.zoneOrder görev 1–9'un bölge sırasıyla aynı değil");
  }

  // 4) Kadro: 1–3 benzersiz rakip; sahne konuşmacıları bilinen karakterler
  for (const m of STORY_MISSIONS) {
    const opps = Array.isArray(m.opponents) ? m.opponents : [];
    if (opps.length < 1 || opps.length > 3) {
      errors.push(`${m.id}: rakip sayısı ${opps.length}, 1–3 olmalı`);
    }
    if (new Set(opps).size !== opps.length) {
      errors.push(`${m.id}: rakip listesi tekrarlı`);
    }
    for (const id of opps) {
      if (!isStoryRobotId(id)) errors.push(`${m.id}: rakip ${id} CHARACTERS içinde yok`);
    }
  }

  // 5) Perde/sıra tutarlılığı: order 1..N artan, perde dağılımı acts ile aynı
  const orders = ordered.map((m) => m.order);
  if (orders.some((o, i) => o !== i + 1)) {
    errors.push("görev order değerleri 1..N artan dizide değil");
  }
  const byAct = {};
  for (const m of STORY_MISSIONS) byAct[m.act] = (byAct[m.act] || 0) + 1;
  for (const act of STORY_CAMPAIGN.acts) {
    const fromData = byAct[act.id] || 0;
    if (fromData !== act.missionIds.length) {
      errors.push(`perde ${act.id}: kampanya verisi ${act.missionIds.length} görev diyor, görev verisi ${fromData}`);
    }
    for (const id of act.missionIds) {
      const m = getMissionById(id);
      if (!m) errors.push(`perde ${act.id}: bilinmeyen görev ${id}`);
      else if (m.act !== act.id) errors.push(`${id}: act ${m.act}, perde ${act.id} listesinde`);
    }
  }
  if (ordered.length !== 12) errors.push(`görev sayısı ${ordered.length}, 12 olmalı`);

  // 6) Önerilen seviye 1–8 ve azalmayan (kapı değil, hazırlık bilgisi)
  let prevLevel = 0;
  for (const m of ordered) {
    const lvl = m.recommendedLevel;
    if (!Number.isFinite(lvl) || lvl < 1 || lvl > 8) {
      errors.push(`${m.id}: önerilen seviye ${lvl}, 1–8 olmalı`);
      prevLevel = 0; // geçersiz değer zinciri bozmasın
    } else if (lvl < prevLevel) {
      errors.push(`${m.id}: önerilen seviye önceki görevden düşüyor`);
      prevLevel = lvl;
    } else {
      prevLevel = lvl;
    }
  }

  // 7) Kilit grafiği: bilinen hedefler, döngüsüz, ilk görevden erişilebilir,
  //    doğrusal ve son görev kilit açmıyor
  const lastId = ordered[ordered.length - 1].id;
  if (Array.isArray(lastId ? getMissionById(lastId).unlocks : null) && getMissionById(lastId).unlocks.length !== 0) {
    errors.push(`${lastId}: son görev yeni görev açmamalı`);
  }
  for (const m of STORY_MISSIONS) {
    for (const target of m.unlocks || []) {
      if (!getMissionById(target)) errors.push(`${m.id}: unlocks bilinmeyen görevi gösteriyor (${target})`);
    }
  }
  // Erişilebilirlik: kilit zincirini baştan yürüt; zincir koparsa görev
  // asla açılamaz.
  const done = new Set();
  for (const m of ordered) {
    if (missionPrerequisites(m.id).length === 0 || missionPrerequisites(m.id).every((p) => done.has(p))) {
      done.add(m.id);
    } else {
      errors.push(`${m.id}: ön koşulları tamamlanmış zincirde açılamıyor`);
      break;
    }
  }
  if (STORY_CAMPAIGN.linearUnlock) {
    for (const m of ordered) {
      const prereqs = missionPrerequisites(m.id);
      if (prereqs.length > 1) {
        errors.push(`${m.id}: doğrusal modda birden fazla ön koşul var (${prereqs.length})`);
      } else if (prereqs.length === 1) {
        const prev = ordered[m.order - 2]; // order k-1 → dizide k-2
        if (!prev || prev.id !== prereqs[0]) {
          errors.push(`${m.id}: doğrusal zincir kırık (ön koşul ${prereqs[0]})`);
        }
      }
    }
  }

  // 8) Kanıt sözleşmesi: 9 zone (farklı bölgeden) + 2 milestone, son görev null
  const zoneEvidence = [];
  for (const m of STORY_MISSIONS) {
    if (m.evidence === null || m.evidence === undefined) {
      if (m.order !== 12) warnings.push(`${m.id}: kanıtı yok (sadece son görev kanıtsız olmalı)`);
      continue;
    }
    const e = m.evidence;
    if (e.kind !== "zone" && e.kind !== "milestone") {
      errors.push(`${m.id}: evidence.kind ${e.kind}, "zone"|"milestone" olmalı`);
      continue;
    }
    if (ids[e.id]) errors.push(`${m.id}: kanıt kimliği tekrarlı (${e.id})`);
    else ids[e.id] = true;
    if (e.kind === "zone") {
      if (!e.id.startsWith(`${m.zoneId}_`)) {
        errors.push(`${m.id}: bölge kanıtı ${e.id} bölge önekiyle başlamıyor`);
      }
      zoneEvidence.push({ zone: m.zoneId, id: e.id });
    }
  }
  if (zoneEvidence.length !== 9) {
    errors.push(`zone kanıtı sayısı ${zoneEvidence.length}, 9 olmalı`);
  } else if (new Set(zoneEvidence.map((x) => x.zone)).size !== 9) {
    errors.push("zone kanıtları dokuz farklı bölgeden gelmiyor");
  }
  const milestones = STORY_MISSIONS.filter((m) => m.evidence && m.evidence.kind === "milestone");
  if (milestones.length !== 2) errors.push(`milestone kanıt sayısı ${milestones.length}, 2 olmalı`);
  if (ordered[ordered.length - 1].evidence !== null) {
    errors.push("son görev (Ortak Vardiya) kanıt üretmemeli");
  }

  // 9) Öğretici paketleri: yalnız ilk üç görevde; kimlikler bilinmeli
  for (const m of STORY_MISSIONS) {
    const has = Array.isArray(m.tutorials) && m.tutorials.length > 0;
    if (has && m.order > 3) {
      errors.push(`${m.id}: ilk üç görev dışında öğretici olamaz`);
    }
    for (const t of m.tutorials || []) {
      if (!STORY_TUTORIALS[t]) errors.push(`${m.id}: bilinmeyen öğretici ${t}`);
    }
  }
  for (const t of Object.keys(STORY_TUTORIALS)) {
    const bundle = STORY_TUTORIALS[t];
    if (!Array.isArray(bundle.lines) || bundle.lines.length < 2 || bundle.lines.length > 4) {
      warnings.push(`öğretici ${t}: kutu sayısı 2–4 aralığında değil`);
    }
  }

  // 10) Sahne sözleşmesi: konuşmacılar bilinmeli; kutu uzunlukları uyarıdır
  const lineRangeWarn = [];
  for (const m of STORY_MISSIONS) {
    for (const [field, variant] of [["introSceneId", "intro"], ["winSceneId", "win"], ["lossSceneId", "loss"]]) {
      const id = m[field];
      const scene = sceneById(id);
      if (!scene) {
        if (STORY_SCENES_COMPLETE) {
          errors.push(`${m.id}: ${field} sahne verisi eksik (${id})`);
        } else {
          warnings.push(`${m.id}: ${variant} sahnesi henüz yazılmadı (${id})`);
        }
        continue;
      }
      if (scene.id !== id) errors.push(`${id}: sahne kendi kimliğini taşımıyor (${scene.id})`);
      if (scene.backgroundZoneId !== m.zoneId) {
        errors.push(`${id}: backgroundZoneId ${scene.backgroundZoneId}, görev ${m.zoneId}`);
      }
      if (!Array.isArray(scene.lines) || scene.lines.length === 0) {
        errors.push(`${id}: sahne kutusu yok`);
        continue;
      }
      for (const line of scene.lines) {
        if (line.speakerId !== "system" && !isStoryRobotId(line.speakerId)) {
          errors.push(`${id}: bilinmeyen konuşmacı ${line.speakerId}`);
        }
        const words = _wordCount(line.text);
        if (words < 1 || words > 22) {
          warnings.push(`${id}: kutu ${words} kelime (1–22 olmalı): "${line.speakerId}"`);
        }
      }
      const [min, max] = _sceneLineRange(variant);
      if (scene.lines.length < min || scene.lines.length > max) {
        lineRangeWarn.push(`${id}: ${scene.lines.length} kutu (${min}–${max} olmalı)`);
      }
    }
  }
  warnings.push(...lineRangeWarn);

  // 11) Kısıntı verisi: yalnız bilinen bölgeler; §8'in açık anı korunur
  for (const m of STORY_MISSIONS) {
    const cur = Array.isArray(m.curtailments) ? m.curtailments : [];
    for (const z of cur) {
      if (!STORY_ZONES.some((zone) => zone.zoneId === z)) {
        errors.push(`${m.id}: curtailments bilinmeyen bölge ${z}`);
      }
    }
  }
  const frozen = getMissionById("cooling_frozen_shift");
  if (!frozen || !(frozen.curtailments || []).includes("scrapyard")) {
    warnings.push("plan §8'in açık anı eksik: cooling_frozen_shift scrapyard'ı kısıntıya sokmalı");
  }

  // 12) Bölge temsilcileri: id'ler bilinmeli; ev bölgesi uyuşmazlığı bilinen
  // 4 "görevlendirme" dışına çıkmamalı (kilit §5).
  const expectedAssignments = ["kokarca", "zurafa", "aslan", "suaygiri"];
  for (const zone of STORY_ZONES) {
    for (const rep of zone.representativeIds) {
      if (!isStoryRobotId(rep)) {
        errors.push(`${zone.zoneId}: temsilci ${rep} CHARACTERS içinde değil`);
        continue;
      }
      const homeZone = getMapById(rep).zoneId;
      if (homeZone !== zone.zoneId && !expectedAssignments.includes(rep)) {
        warnings.push(`${zone.zoneId}: temsilci ${rep} ev bölgesi ${homeZone} (beklenmeyen görevlendirme)`);
      }
    }
  }
  // Beklenen dört görevlendirme hâlâ listede mi? Kaybolursa kilit belgesinin
  // §5'i ile veri ayrışmış olur.
  for (const id of expectedAssignments) {
    const home = getMapById(id).zoneId;
    const serves = STORY_ZONES.filter((z) => z.representativeIds.includes(id)).map((z) => z.zoneId);
    if (!serves.length) {
      warnings.push(`${id} beklenen görevlendirme listeden çıkarılmış`);
    } else if (home === serves[0]) {
      warnings.push(`${id} artık ev bölgesini temsil ediyor; kilit §5 listesi güncellenmeli`);
    }
  }

  // 13) Bölge etiket/kodları FACTORY_ZONES ile birebir eşleşmeli. Görev 1–9
  // dokuz bölgeye ev sahipliği yaptığından her bölgenin temasına host
  // görevin haritasından ulaşılır (kilit §4).
  for (const m of ordered) {
    if (m.order > 9) break;
    const map = getMapById(m.mapId);
    const zone = STORY_ZONES.find((z) => z.zoneId === m.zoneId);
    if (!map || !zone) continue;
    if (map.zoneLabel && map.zoneLabel !== zone.zoneLabel) {
      errors.push(`${zone.zoneId}: bölge etiketi FACTORY_ZONES ile uyuşmuyor (${map.zoneLabel})`);
    }
    const theme = typeof BIOMES !== "undefined" && BIOMES[map.biome] ? BIOMES[map.biome] : null;
    if (theme && theme.zoneCode && theme.zoneCode !== zone.zoneCode) {
      errors.push(`${zone.zoneId}: bölge kodu FACTORY_ZONES ile uyuşmuyor (${theme.zoneCode})`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

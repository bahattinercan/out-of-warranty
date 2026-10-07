/* Cephane pazarı ve envanter testleri — bağımlılıksız (saf Node).
 *
 * market.js DOM'a dokunmaz; fiyat tablosu, depo doğrulaması, satın alma
 * önkoşulları ve maç yükleme/iade döngüsü tarayıcısız doğrulanır.
 * localStorage yerine sahte depolama kullanılır.
 *
 * Çalıştır:  node tests/market.js
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "js");
const FILES = ["characters.js", "progression.js", "profile.js", "parts.js", "market.js", "weapons.js", "maps.js"];
const bundle =
  FILES.map((f) => fs.readFileSync(path.join(JS_DIR, f), "utf8")).join("\n;\n") +
  "\n;globalThis.__K = { CHARACTERS, WEAPONS, AMMO_DEPOT_CAP, AMMO_BULK_QTY, AMMO_BULK_QTY_BIG, AMMO_PRICES, AMMO_PRICE_K, AMMO_PRICE_MIN, AMMO_PRICE_MAX, ammoPriceFor, ammoBasePrice, weaponPowerScore, weaponStats, sellableWeapons, sanitizeAmmoDepot, getAmmoDepot, setAmmoDepot, mergeDepots, ammoDepotTotal, buyAmmo, mergeAmmoWithDepot, battleLoad, unspentDepot, settleDepot, weaponById, weaponBattleMax, isSellableWeapon, " +
  "PROFILE_SCHEMA_VERSION, defaultProfile, defaultRobotProgress, normalizeProfile, loadProfile, saveProfile, getRobotProgress, PROFILE_KEY, START_SCRAP, initialAmmo, toSafeInt, " +
  "PARTS, PART_SLOTS, SLOT_LABELS, partById, sanitizeParts, sanitizeLoadoutShape, getOwnedParts, isPartOwned, buildPartsSummary, buyPart, equipPart, drawPartIcon, PART_ICON_SHAPES, PARTS_PER_SLOT, loadoutPartIds, " +
  "resolveRobotBuild, sanitizeUpgrades, partEffectText, PART_KNOCKBACK_MIN };";

const sandbox = { Math, Date, console, JSON, Set, Map, Array, Object, Number, String, isFinite, parseInt };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
try {
  vm.runInContext(bundle, sandbox, { filename: "market-bundle.js" });
} catch (e) {
  console.error("Kaynaklar yüklenemedi:\n", e);
  process.exit(1);
}
const K = sandbox.__K;

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
    _map: map,
  };
}

const ROBOT = K.CHARACTERS[0].id;
const SECOND = K.CHARACTERS[1].id;

// ── 1) Fiyat tablosu ────────────────────────────────────────────────────────
group("Fiyat tablosu");
{
  const sellable = K.sellableWeapons();
  check("satılabilir cephane sayısı 19", sellable.length === 19, `= ${sellable.length}`);
  check("Bazuka satılamaz", K.ammoPriceFor("bazooka") === null && !K.isSellableWeapon(K.weaponById("bazooka")));
  check("bilinmeyen silah satılamaz", K.ammoPriceFor("hayalet_silah") === null);
  check("hiçbir satılabilir silah sınırsız değil", sellable.every((w) => w.ammo !== Infinity));

  for (const w of sellable) {
    const p = K.ammoPriceFor(w.id);
    check(`${w.id} fiyatı pozitif tam sayı`, Number.isFinite(p) && p > 0 && p === Math.round(p), `= ${p}`);
    check(`${w.id} fiyatı tabloda açık`, Number.isFinite(K.AMMO_PRICES[w.id]));
  }

  // Tabloda olmayan ama geçerli bir silah için türetilmiş yedek fiyat devreye girer.
  // Gerçek spec alanları kullanılır (stats kaldırıldı: puanlar artık türetilir).
  const fake = { id: "gelecek_silah", ammo: 2, damage: 80, baseSpeed: 5, radius: 84 };
  const derived = K.ammoPriceFor(fake);
  check("tablo dışı silah için yedek fiyat üretilir", Number.isFinite(derived) && derived >= K.AMMO_PRICE_MIN, `= ${derived}`);
  check("yedek fiyat güçlü silahta daha yüksek", derived > K.ammoPriceFor("grenade"), `${derived} vs ${K.ammoPriceFor("grenade")}`);

  // Tablo, formülün çıktısıyla çelişmez (bilinçli istisnalar dışında) — tek
  // kaynak kuralı: fiyat = round(0.8 × güç puanı + 20), 30–130 aralığına kırpılır.
  const EXCEPTIONS = ["grenade", "teleportball", "hook"];
  const drifted = sellable.filter((w) => !EXCEPTIONS.includes(w.id) && K.AMMO_PRICES[w.id] !== K.ammoBasePrice(w));
  check("tablo fiyatları formülle uyuşur (istisnalar hariç)", drifted.length === 0,
    drifted.map((w) => `${w.id}: ${K.AMMO_PRICES[w.id]}≠${K.ammoBasePrice(w)}`).join(", "));

  // Savaş tavanı: taban mühimmat ile tutarlı, pozitif ve sonlu (Bazuka hariç).
  check("Bazuka savaş tavanı sınırsız", K.weaponBattleMax(K.weaponById("bazooka")) === Infinity);
  const badCaps = sellable.filter((w) => {
    const cap = K.weaponBattleMax(w);
    return !Number.isFinite(cap) || cap < w.ammo || cap !== Math.round(cap);
  });
  check("her satılabilir silahın savaş tavanı ≥ taban ve sonlu", badCaps.length === 0,
    badCaps.map((w) => w.id).join(", "));
}

// ── 2) Depo doğrulama ───────────────────────────────────────────────────────
group("Depo doğrulama");
{
  check("boş/bozuk girdi boş depo", JSON.stringify(K.sanitizeAmmoDepot(null)) === "{}" && JSON.stringify(K.sanitizeAmmoDepot("metin")) === "{}");
  const d = K.sanitizeAmmoDepot({ grenade: 2, sniper: 0, bazooka: 5, hayalet: 4, cluster: -3, nuke: 5000, sticky: "4" });
  check("bilinmeyen silah atılır", !("hayalet" in d));
  check("sınırsız silah (Bazuka) depoda tutulmaz", !("bazooka" in d));
  check("sıfır ve negatif adet tutulmaz", !("sniper" in d) && !("cluster" in d));
  check("üst sınır uygulanır", d.nuke === K.AMMO_DEPOT_CAP, `= ${d.nuke}`);
  check("geçerli adetler korunur", d.grenade === 2 && d.sticky === 4);
  check("metin adet sayıya çevrilir", typeof d.sticky === "number");
  check("depo toplamı sayılır", K.ammoDepotTotal(d) === 2 + 4 + K.AMMO_DEPOT_CAP);
  check("girdi mutasyona uğramaz", K.sanitizeAmmoDepot(d) !== d);
}

// ── 3) Profil entegrasyonu ────────────────────────────────────────────────
group("Profil entegrasyonu");
{
  const p = K.defaultProfile();
  check("varsayılan profil boş ortak depo taşır", JSON.stringify(K.defaultProfile().ammo) === "{}");
  check("depo okuma bozuk girdide boş döner", JSON.stringify(K.getAmmoDepot({ ammo: "bozuk" })) === "{}");
  check("profil'siz okuma boş döner", JSON.stringify(K.getAmmoDepot(null)) === "{}");

  check("depo yazma", K.setAmmoDepot(p, { grenade: 4, hayalet: 9 }) === true);
  check("depo yazıldı", K.getAmmoDepot(p).grenade === 4);
  check("bilinmeyen silah yazımda atılır", K.getAmmoDepot(p).hayalet === undefined);

  const roundtrip = K.normalizeProfile(p);
  check("normalize ortak depoyu korur", roundtrip.ammo.grenade === 4);

  const stored = makeStorage();
  check("kayıt başarılı", K.saveProfile(roundtrip, stored) === true);
  const loaded = K.loadProfile(stored).profile;
  check("kayıttan depo geri okunur", loaded.ammo.grenade === 4);
}

// ── 4) v3 → v4 göçü (ortak depo) ────────────────────────────────────────────
group("Profil v3 → v5 göçü (ortak depo)");
{
  check("şema sürümü 6", K.PROFILE_SCHEMA_VERSION === 6);
  const v3 = K.normalizeProfile({
    version: 3, scrap: 777,
    ammo: { grenade: 2 },
    robots: {
      [ROBOT]: { xp: 450, upgrades: { chassis: 2, module: 1, core: 0 }, stats: { matches: 7, wins: 5 } },
      [SECOND]: { xp: 100, ammo: { grenade: 3, bazooka: 2, hayalet: 1, sniper: "4" } },
    },
    claimedMatches: ["a"], updatedAt: 123,
  });
  check("v6 sürümü yazılır", v3.version === 6);
  check("Hurda korunur", v3.scrap === 777);
  check("XP ve kademeler korunur", v3.robots[ROBOT].xp === 450 && v3.robots[ROBOT].upgrades.chassis === 2);
  check("maç istatistikleri korunur", v3.robots[ROBOT].stats.matches === 7 && v3.robots[ROBOT].stats.wins === 5);
  check("maç anahtarları korunur", JSON.stringify(v3.claimedMatches) === JSON.stringify(["a"]));
  // Robot depoları + kök depo tek ortak depoda birleşir (grenade 2 + 3 = 5).
  check("robot depoları köke taşınır ve birleşir", v3.ammo.grenade === 5, `= ${v3.ammo.grenade}`);
  check("bozuk depo kayıtları göçte temizlenir", !("bazooka" in v3.ammo) && !("hayalet" in v3.ammo) && v3.ammo.sniper === 4);
  check("robot kaydında ammo alanı kalmaz", !("ammo" in v3.robots[SECOND]));
  check("gelecekteki şema sürümü varsayılana düşer", K.normalizeProfile({ version: 99, scrap: 5 }).scrap === K.START_SCRAP);
}

// ── 5) Satın alma ───────────────────────────────────────────────────────────
group("Satın alma");
{
  const base = K.normalizeProfile({ version: 3, scrap: 2000 });
  const price = K.ammoPriceFor("grenade");

  const ok = K.buyAmmo(base, "grenade", 1);
  check("mutlu yol başarılı", ok.ok === true, ok.reason);
  check("Hurda düşülür", ok.profile.scrap === 2000 - price, `= ${ok.profile.scrap}`);
  check("maliyet raporlanır", ok.cost === price && ok.price === price && ok.bought === 1);
  check("depo adedi raporlanır", ok.count === 1);
  check("girdi profili mutasyona uğramaz", base.scrap === 2000 && K.ammoDepotTotal(K.getAmmoDepot(base)) === 0);

  const bulk = K.buyAmmo(ok.profile, "grenade", K.AMMO_BULK_QTY);
  check("toplu alım istenen adedi alır", bulk.ok === true && bulk.bought === K.AMMO_BULK_QTY, `= ${bulk.bought}`);
  check("toplu alım depoyu tavanına kadar doldurur", bulk.count === 1 + K.AMMO_BULK_QTY);

  const capped = K.buyAmmo(bulk.profile, "grenade", K.AMMO_BULK_QTY);
  check("ardışık alımlar birikir", capped.ok === true && capped.count === 1 + 2 * K.AMMO_BULK_QTY, `= ${capped.count}`);

  // Depo tavanı artık 999: tavan yalnız çok büyük alımda devreye girer.
  const rich = K.normalizeProfile({ version: 3, scrap: 1e9 });
  const huge = K.buyAmmo(rich, "grenade", 5000);
  check("depo tavanı (999) aşılmaz", huge.ok === true && huge.count === K.AMMO_DEPOT_CAP, `= ${huge.count}`);
  check("tam depo işaretlenir", huge.full === true);

  const full = K.buyAmmo(huge.profile, "grenade", 1);
  check("dolu depo reddedilir", full.ok === false && full.reason === "DEPOT_FULL");

  const poor = K.buyAmmo(K.normalizeProfile({ version: 3, scrap: price - 1 }), "sniper", 1);
  check("yetersiz Hurda reddedilir", poor.ok === false && poor.reason === "SCRAP_REQUIRED");
  check("yetersiz Hurda maliyeti bildirilir", poor.cost === K.ammoPriceFor("sniper"));

  const partial = K.buyAmmo(K.normalizeProfile({ version: 3, scrap: K.ammoPriceFor("nuke") + 5 }), "nuke", 5);
  check("bakiye yetmezse kısmi alım yapılır", partial.ok === true && partial.bought === 1, `= ${partial.bought}`);
  check("kısmi alım sonrası bakiye negatif olmaz", partial.profile.scrap === 5, `= ${partial.profile.scrap}`);

  check("bilinmeyen silah", K.buyAmmo(base, "hayalet", 1).reason === "INVALID_WEAPON");
  check("sınırsız silah satılmaz", K.buyAmmo(base, "bazooka", 1).reason === "NOT_SELLABLE");
  check("adet 0 ise en az 1 alınır", K.buyAmmo(base, "grenade", 0).bought === 1);

  const stored = makeStorage();
  const persisted = K.buyAmmo(base, "sniper", 2, stored);
  check("depolama ile kalıcı yazılır", persisted.ok && persisted.persisted === true);
  const reloaded = K.loadProfile(stored).profile;
  check("satın alma kayıttan geri okunur", reloaded.ammo.sniper === 2 && reloaded.scrap === 2000 - 2 * K.ammoPriceFor("sniper"));
}

// ── 6) Maça yükleme ve iade ─────────────────────────────────────────────────
group("Maça yükleme ve iade");
{
  const baseAmmo = K.initialAmmo();
  const depot = { grenade: 3, nuke: 1 };
  const merged = K.mergeAmmoWithDepot(baseAmmo, depot);
  check("taban mühimmat korunur", merged.sniper === baseAmmo.sniper && merged.cluster === baseAmmo.cluster);
  check("depo tabana eklenir", merged.grenade === baseAmmo.grenade + 3, `= ${merged.grenade}`);
  check("nuke depo ile artar", merged.nuke === baseAmmo.nuke + 1);
  check("sınırsız mühimmat korunur", merged.bazooka === Infinity);
  check("girdi sayaçları mutasyona uğramaz", baseAmmo.grenade === 3 && depot.grenade === 3);
  check("bilinmeyen depo anahtarı yok sayılır", K.mergeAmmoWithDepot(baseAmmo, { hayalet: 5 }).hayalet === undefined);

  // Savaş tavanı: depo 999 olsa bile maça yalnız `battleMax` kadar girer ve
  // iade snapshot'ı deponun tamamı değil, GERÇEKTEN yüklenen dilimdir.
  const gCap = K.weaponBattleMax(K.weaponById("grenade"));
  const capLoad = K.battleLoad(baseAmmo, { grenade: 500, cluster: 500 });
  check("depo tavanı maça yüklenmez", capLoad.ammo.grenade === gCap, `= ${capLoad.ammo.grenade}`);
  check("yüklenen dilim = tavan − taban", capLoad.loaded.grenade === gCap - baseAmmo.grenade, `= ${capLoad.loaded.grenade}`);
  check("depo taşımayan silah sayaçta kalır", capLoad.ammo.sniper === baseAmmo.sniper && capLoad.loaded.sniper === undefined);
  check("sınırsız mühimmat tavanla kırpılmaz", capLoad.ammo.bazooka === Infinity);
  check("hiç atış yapılmazsa tavanlı dilim tam iade", K.settleDepot(capLoad.loaded, capLoad.ammo).grenade === capLoad.loaded.grenade);
  check("hepsi harcanırsa tavanlı iade sıfır", (K.settleDepot(capLoad.loaded, { grenade: 0 }).grenade || 0) === 0);

  // İade kuralı: taban mühimmat ÖNCE tüketilir, depo sona kalır.
  const base = baseAmmo.grenade; // 3
  const d = (map, id) => (map[id] === undefined ? 0 : map[id]);
  check("hiç atış yapılmazsa tam iade", d(K.settleDepot({ grenade: 4 }, { grenade: base + 4 }), "grenade") === 4);
  check("taban kısmen tüketilmişse depo dokunulmaz", d(K.settleDepot({ grenade: 2 }, { grenade: base }), "grenade") === 2);
  check("taban tükendikten sonra depodan harcanır", d(K.settleDepot({ grenade: 4 }, { grenade: base }), "grenade") === 3);
  check("hepsi tükenirse iade sıfırdır", d(K.settleDepot({ grenade: 4 }, { grenade: 0 }), "grenade") === 0);
  check("depo aşan kalan iade edilmez", d(K.settleDepot({ grenade: 4 }, { grenade: base + 9 }), "grenade") === 4);
  check("depo taşımayan silah iade etmez", d(K.settleDepot({ grenade: 0 }, { grenade: 99 }), "grenade") === 0);
  check("tek silah iadesi doğru", K.unspentDepot({ nuke: 1 }, { nuke: 2 }, "nuke") === 1);

  // Uçtan uca: depo → maç → atış → iade. Robot depoları normalizeProfile
  // göçüyle köke (ortak depoya) taşınır; maç sonunda harcanan kadar depodan
  // düşülür, harcanmayan kısım depoda yerinde kalır.
  const profile = K.normalizeProfile({ version: 3, scrap: 0, robots: { [ROBOT]: { ammo: depot } } });
  const loaded = K.getAmmoDepot(profile);
  const ammo = K.mergeAmmoWithDepot(K.initialAmmo(), loaded);
  check("maç başı el bombası 3 taban + 3 depo", ammo.grenade === 6);
  ammo.grenade -= 4; // 4 atış: 3 taban + 1 depo
  const left = K.settleDepot(loaded, ammo);
  check("4 atıştan sonra 2 mermi depoda kalır", (left.grenade || 0) === 2, `= ${left.grenade}`);
  check("kullanılmayan nuke depoda kalır", left.nuke === 1);
  const after = K.normalizeProfile(profile);
  const spent = loaded.grenade - (left.grenade || 0);
  K.setAmmoDepot(after, { ...K.getAmmoDepot(after), grenade: Math.max(0, (K.getAmmoDepot(after).grenade || 0) - spent) });
  check("iade profile yazılır", K.getAmmoDepot(after).grenade === 2);
}

// ── 10) Parça kataloğu ───────────────────────────────────────────────────
group("Parça kataloğu");
{
  const parts = K.PARTS;
  check("katalog 24 parça (yuva başına 6)", parts.length === 24, `= ${parts.length}`);
  check("partById bilinmeyen → null", K.partById("hayalet_parça") === null && K.partById(null) === null);
  const EKSENLER = ["maxHpFlat", "maxHpPct", "armorFlat", "staminaFlat", "weaponDamagePct", "powerPct", "knockbackRedPct", "cooldownFlat", "moveSpeedMult", "jumpPowerMult"];
  const goren = new Set();
  for (const p of parts) {
    check(`${p.id}: id tekrarsız`, !goren.has(p.id) && goren.add(p.id));
    check(`${p.id}: geçerli yuva`, K.PART_SLOTS.includes(p.slot), p.slot);
    check(`${p.id}: fiyat 40–130 bandında tam sayı`, Number.isInteger(p.price) && p.price >= 40 && p.price <= 130, `= ${p.price}`);
    check(`${p.id}: ad/açıklama dolu`, !!p.label && !!p.desc);
    const keys = Object.keys(p.effects || {});
    check(`${p.id}: en az bir etki`, keys.length >= 1);
    check(`${p.id}: etkiler tanımlı eksenlerde`, keys.every((k) => EKSENLER.includes(k)));
    check(`${p.id}: ikon tanımlı (shape/tint/accent)`, !!(p.icon && p.icon.shape && p.icon.tint && p.icon.accent));
  }
  // Yova dağılımı: her yuvada 6 parça (24 toplam).
  const beklenenYova = { helmet: 6, body: 6, tool: 6, feet: 6 };
  for (const slot of K.PART_SLOTS) {
    const n = parts.filter((p) => p.slot === slot).length;
    check(`${slot} yuvasında ${beklenenYova[slot]} parça`, n === beklenenYova[slot], `= ${n}`);
  }
  check("SLOT_LABELS tüm yuvaları karşılar",
    K.PART_SLOTS.every((s) => K.SLOT_LABELS[s]) && Object.keys(K.SLOT_LABELS).length === K.PART_SLOTS.length);
  // İkonlar: tüm parçalar saf çizicyle mock ctx'te patlamadan çizilmeli.
  const ikonCtx = { beginPath(){}, closePath(){}, moveTo(){}, lineTo(){}, arc(){}, rect(){}, roundRect(){}, quadraticCurveTo(){}, fill(){}, stroke(){}, save(){}, restore(){}, fillStyle: "", strokeStyle: "", lineWidth: 1 };
  check("drawPartIcon tüm parçaları patlamasız çizer",
    parts.every((p) => { try { K.drawPartIcon(ikonCtx, p, 40); return true; } catch (_) { return false; } }));
  check("drawPartIcon bilinmeyen shape → bolt yedeği", (() => { try { K.drawPartIcon(ikonCtx, { icon: { shape: "yok" } }, 40); return true; } catch (_) { return false; } })());
}

// ── 11) Parça doğrulama ───────────────────────────────────────────────────
group("Parça doğrulama");
{
  check("sanitizeParts boş/bozuk → []", JSON.stringify(K.sanitizeParts(null)) === "[]" && JSON.stringify(K.sanitizeParts("metin")) === "[]" && JSON.stringify(K.sanitizeParts({})) === "[]");
  check("sanitizeParts bilinmeyeni atar, tekrarı ayıklar", JSON.stringify(K.sanitizeParts(["lehim_yamasi", "hayalet", "lehim_yamasi", "nisan_mercegi"])) === '["lehim_yamasi","nisan_mercegi"]');
  check("sanitizeLoadoutShape bozuk → ikişer null dizi", JSON.stringify(K.sanitizeLoadoutShape(null)) === '{"helmet":[null,null],"body":[null,null],"tool":[null,null],"feet":[null,null]}');
  const lo = K.sanitizeLoadoutShape({ kafa: "nisan_mercegi", body: "lehim_yamasi", helmet: "lehim_yamasi", feet: "hayalet" });
  check("bilinmeyen yuva anahtarı atılır", !("kafa" in lo));
  check("yuvasıyla uyuşmayan parça atılır", lo.helmet[0] === null && lo.helmet[1] === null);
  check("geçerli eşleşme korunur (diziye sarılır)", lo.body[0] === "lehim_yamasi" && lo.body[1] === null);
  check("özet metni yuvaları sayar", K.buildPartsSummary({ body: "lehim_yamasi" }).includes("Gövde: Lehim Yaması") && K.buildPartsSummary(null).includes("Kask: —"));
  check("getOwnedParts sahte profili düzeltir", JSON.stringify(K.getOwnedParts({ parts: ["lehim_yamasi", "hayalet", 5] })) === '["lehim_yamasi"]');
  // v6: her yuva İKİ parça tutar.
  const legacy = K.sanitizeLoadoutShape({ body: "lehim_yamasi", feet: "turbo_palet" });
  check("v5 tek-id kaydı diziye sarılır ([id, null])",
    legacy.body[0] === "lehim_yamasi" && legacy.body[1] === null && legacy.feet[0] === "turbo_palet");
  const dizi = K.sanitizeLoadoutShape({ body: ["lehim_yamasi", "kompozit_plaka"] });
  check("iki parça korunur", dizi.body[0] === "lehim_yamasi" && dizi.body[1] === "kompozit_plaka");
  check("üçüncü parça kırpılır (yuva başına 2)",
    K.sanitizeLoadoutShape({ body: ["lehim_yamasi", "kompozit_plaka", "takviyeli_govde"] }).body.length === 2);
  check("aynı parça bir yuvada iki kez duramaz",
    JSON.stringify(K.sanitizeLoadoutShape({ body: ["lehim_yamasi", "lehim_yamasi"] })) === '{"helmet":[null,null],"body":["lehim_yamasi",null],"tool":[null,null],"feet":[null,null]}');
  check("loadoutPartIds takılı parçaları düz listeler",
    JSON.stringify(K.loadoutPartIds({ body: ["lehim_yamasi", "kompozit_plaka"], feet: "turbo_palet" })) === '["lehim_yamasi","kompozit_plaka","turbo_palet"]');
  check("özet iki parçayı da yazar",
    K.buildPartsSummary({ body: ["lehim_yamasi", "kompozit_plaka"] }).includes("Lehim Yaması, Kompozit Plaka"));
}

// ── 12) Profil v5: sahiplik + çakışma ────────────────────────────────────
group("Profil v5 çapraz doğrulama");
{
  // Sahipsiz parça loadout'tan düşer.
  const p1 = K.normalizeProfile({ version: 5, scrap: 10, parts: [], robots: { [ROBOT]: { xp: 0, upgrades: {}, stats: {}, loadout: { helmet: null, body: "lehim_yamasi", tool: null, feet: null } } } });
  check("sahipsiz loadout düşer", p1.robots[ROBOT].loadout.body[0] === null && p1.robots[ROBOT].loadout.body[1] === null);
  // Parçalar robota KİLİTLİ DEĞİLDİR: aynı parça birden çok robotta durabilir.
  const p2 = K.normalizeProfile({ version: 5, scrap: 10, parts: ["lehim_yamasi"], robots: { [ROBOT]: { xp: 0, upgrades: {}, stats: {}, loadout: { helmet: null, body: "lehim_yamasi", tool: null, feet: null } }, [SECOND]: { xp: 0, upgrades: {}, stats: {}, loadout: { helmet: null, body: "lehim_yamasi", tool: null, feet: null } } } });
  check("aynı parça birden çok robotta kalır (kilit yok)",
    p2.robots[ROBOT].loadout.body[0] === "lehim_yamasi" && p2.robots[SECOND].loadout.body[0] === "lehim_yamasi");
  // Bozuk parts alanı ekonomiye dokunmaz.
  const p3 = K.normalizeProfile({ version: 5, scrap: 77, ammo: { grenade: 2 }, parts: "metin", robots: { [ROBOT]: { xp: 5, upgrades: { chassis: 1, module: 0, core: 0 }, stats: {}, loadout: null } } });
  check("bozuk parts ekonomiye dokunmaz", p3.scrap === 77 && K.getAmmoDepot(p3).grenade === 2 && JSON.stringify(p3.parts) === "[]");
  check("loadout ikişer null dizi üretilir", JSON.stringify(p3.robots[ROBOT].loadout) === '{"helmet":[null,null],"body":[null,null],"tool":[null,null],"feet":[null,null]}');
}

// ── 13) Migrasyon v4→v5 ───────────────────────────────────────────────────
group("Migrasyon v4→v5");
{
  const v4 = { version: 4, scrap: 100, ammo: { grenade: 2 }, robots: { [ROBOT]: { xp: 50, upgrades: { chassis: 1, module: 0, core: 0 }, stats: { matches: 2, wins: 1 } } } };
  const p = K.normalizeProfile(v4);
  check("sürüm 6'ya yükselir", p.version === 6, `= ${p.version}`);
  check("v4 verisi kayıpsız", p.scrap === 100 && K.getAmmoDepot(p).grenade === 2 && p.robots[ROBOT].upgrades.chassis === 1 && p.robots[ROBOT].stats.matches === 2);
  check("parça alanları boş üretilir", JSON.stringify(p.parts) === "[]" && p.robots[ROBOT].loadout.helmet[0] === null);
  const v3 = { version: 3, scrap: 40, robots: { [ROBOT]: { xp: 10, upgrades: {}, stats: {}, ammo: { grenade: 1 } } } };
  const p3 = K.normalizeProfile(v3);
  check("v3→v6 birleşik göç", p3.version === 6 && K.getAmmoDepot(p3).grenade === 1 && JSON.stringify(p3.parts) === "[]");
  const future = K.normalizeProfile({ version: K.PROFILE_SCHEMA_VERSION + 1, scrap: 999 });
  check("gelecek sürüm güvenli fallback", future.version === K.PROFILE_SCHEMA_VERSION && future.scrap === K.START_SCRAP);
  check("bozuk parça alanı göçte ekonomiyi bozmaz", K.normalizeProfile({ version: 4, scrap: 55, parts: 42, robots: null }).scrap === 55);
  // v5 → v6: tek-id loadout diziye sarılır, ekonomi dokunulmaz.
  const v5 = { version: 5, scrap: 123, parts: ["lehim_yamasi"], robots: { [ROBOT]: { xp: 10, upgrades: {}, stats: {}, loadout: { helmet: null, body: "lehim_yamasi", tool: null, feet: null } } } };
  const p6 = K.normalizeProfile(v5);
  check("v5→v6 göçü: tek parça diziye sarılır",
    p6.version === 6 && p6.robots[ROBOT].loadout.body[0] === "lehim_yamasi" && p6.robots[ROBOT].loadout.body[1] === null);
  check("v5→v6 göçü ekonomiyi korur", p6.scrap === 123 && JSON.stringify(p6.parts) === '["lehim_yamasi"]');
}

// ── 14) Parça satın alma ─────────────────────────────────────────────────
group("Parça satın alma");
{
  const prof = K.normalizeProfile({ version: 5, scrap: 200, parts: [] });
  const res = K.buyPart(prof, "lehim_yamasi");
  check("başarılı alım", res.ok && res.cost === 40 && res.profile.scrap === 160 && JSON.stringify(res.profile.parts) === '["lehim_yamasi"]', `scrap=${res.ok ? res.profile.scrap : res.reason}`);
  const st = makeStorage();
  K.saveProfile(res.profile, st);
  check("alım kalıcı (saveProfile/loadProfile)", K.loadProfile(st).profile.parts[0] === "lehim_yamasi");
  const again = K.buyPart(res.profile, "lehim_yamasi");
  check("tekrar alım reddedilir (benzersiz)", !again.ok && again.reason === "ALREADY_OWNED");
  const poor = K.buyPart({ scrap: 10, parts: [] }, "yedek_yukleyici");
  check("bakiye yetersiz: bakiyeye dokunulmaz", !poor.ok && poor.reason === "SCRAP_REQUIRED" && poor.scrap === 10);
  const ghost = K.buyPart(prof, "hayalet");
  check("bilinmeyen parça reddedilir", !ghost.ok && ghost.reason === "INVALID_PART");
  const multi = K.buyPart(res.profile, "denge_jiroskobu");
  check("ikinci parça eklenir", multi.ok && JSON.stringify(multi.profile.parts) === '["lehim_yamasi","denge_jiroskobu"]');
  check("sıra satın alma sırasıdır", K.getOwnedParts(multi.profile)[0] === "lehim_yamasi");
}

// ── 15) Takma / sökme / taşıma ────────────────────────────────────────────
group("Parça takma");
{
  const owned = { scrap: 200, parts: ["lehim_yamasi", "yedek_yukleyici", "denge_jiroskobu"] };
  let r = K.equipPart(owned, ROBOT, "body", "lehim_yamasi");
  check("geçerli takma (1. alt yuva)", r.ok && r.index === 0 && r.profile.robots[ROBOT].loadout.body[0] === "lehim_yamasi");
  check("değişmez takma işlem yok", K.equipPart(r.profile, ROBOT, "body", "lehim_yamasi").changed === false);
  r = K.equipPart(r.profile, SECOND, "body", "lehim_yamasi");
  check("ikinci robota da takılır (kopya gerekmez)", r.ok && r.profile.robots[SECOND].loadout.body[0] === "lehim_yamasi");
  check("ilk robotta takılı KALIR (taşıma yok)", r.profile.robots[ROBOT].loadout.body[0] === "lehim_yamasi");
  // Hata senaryoları bağımsız profillerle — başarısız eşin profil alanı yoktur.
  const failBase = r.profile;
  const sm = K.equipPart(failBase, ROBOT, "helmet", "lehim_yamasi");
  check("yuva uyuşmazlığı reddedilir", !sm.ok && sm.reason === "SLOT_MISMATCH");
  const no = K.equipPart(failBase, ROBOT, "helmet", "nisan_mercegi");
  check("sahipsiz parça takılamaz", !no.ok && no.reason === "NOT_OWNED");
  const badSlot = K.equipPart(failBase, ROBOT, "kafa", "yedek_yukleyici");
  check("bilinmeyen yuva reddedilir", !badSlot.ok && badSlot.reason === "INVALID_SLOT");
  const badBot = K.equipPart(failBase, "hayalet_robot", "tool", "yedek_yukleyici");
  check("bilinmeyen robot reddedilir", !badBot.ok && badBot.reason === "INVALID_ROBOT");
  const beforeScrap = failBase.scrap;
  r = K.equipPart(failBase, ROBOT, "feet", null);
  check("sökme alt yuvayı boşaltır", r.ok && r.profile.robots[ROBOT].loadout.feet[0] === null);
  check("sökme ücretsiz (scrap korunur)", r.profile.scrap === beforeScrap);
  const st2 = makeStorage();
  const rr = K.equipPart(r.profile, ROBOT, "feet", "denge_jiroskobu", st2);
  check("takma kalıcı", rr.ok && rr.changed && K.loadProfile(st2).profile.robots[ROBOT].loadout.feet[0] === "denge_jiroskobu");

  // ── İki alt yuva (v6) ─────────────────────────────────────────────────
  let two = K.equipPart(K.normalizeProfile({ version: 6, scrap: 0, parts: ["lehim_yamasi", "kompozit_plaka", "takviyeli_govde"] }), ROBOT, "body", "lehim_yamasi");
  check("ilk takma 1. alt yuvaya yazılır", two.ok && two.index === 0 && two.profile.robots[ROBOT].loadout.body[0] === "lehim_yamasi");
  two = K.equipPart(two.profile, ROBOT, "body", "kompozit_plaka", { index: 1 });
  check("açık indeks 2. alt yuvaya yazar",
    two.ok && two.profile.robots[ROBOT].loadout.body[0] === "lehim_yamasi" && two.profile.robots[ROBOT].loadout.body[1] === "kompozit_plaka");
  check("aynı yuvada iki parça bir arada durur (etki toplanır)",
    two.profile.robots[ROBOT].loadout.body.filter(Boolean).length === 2);
  const moved = K.equipPart(two.profile, ROBOT, "body", "lehim_yamasi", { index: 1 });
  check("aynı parça diğer alt yuvaya alınınca eskisinden çekilir",
    moved.ok && moved.profile.robots[ROBOT].loadout.body[0] === null && moved.profile.robots[ROBOT].loadout.body[1] === "lehim_yamasi");
  const badIdx = K.equipPart(two.profile, ROBOT, "body", "takviyeli_govde", { index: 2 });
  check("geçersiz alt yuva reddedilir", !badIdx.ok && badIdx.reason === "INVALID_INDEX");
  // Otomatik yerleşim (indeks verilmez): 1. → 2. → (ikisi doluysa) 1. değiştirir.
  let auto = K.equipPart(K.normalizeProfile({ version: 6, scrap: 0, parts: ["lehim_yamasi", "kompozit_plaka", "takviyeli_govde"] }), ROBOT, "body", "lehim_yamasi");
  auto = K.equipPart(auto.profile, ROBOT, "body", "kompozit_plaka");
  check("otomatik yerleşim ikinci boşluğa geçer", auto.index === 1);
  auto = K.equipPart(auto.profile, ROBOT, "body", "takviyeli_govde");
  check("ikisi doluysa otomatik yerleşim 1. yuvayı değiştirir",
    auto.index === 0 && auto.profile.robots[ROBOT].loadout.body[0] === "takviyeli_govde");
  // Index verilmediğinde zaten takılı parça no-op kalır (yerinden oynamaz).
  const noop = K.equipPart(auto.profile, ROBOT, "body", "takviyeli_govde");
  check("zaten takılı parça indeks verilmeden no-op'tur", noop.changed === false && noop.index === 0);
  // Eski imza (5. parametre storage) hâlâ çalışır.
  const st3 = makeStorage();
  const legacyCall = K.equipPart(K.normalizeProfile({ version: 6, scrap: 0, parts: ["lehim_yamasi"] }), ROBOT, "body", "lehim_yamasi", st3);
  check("eski çağrı biçimi (storage) korunur", legacyCall.ok && K.loadProfile(st3).profile.robots[ROBOT].loadout.body[0] === "lehim_yamasi");
  check("aynı yuvaya aynı parça no-op'tur (disk yazılmaz)",
    K.equipPart(r.profile, ROBOT, "body", "lehim_yamasi", makeStorage()).changed === false);
}

// ── 16) Parça build etkileri ─────────────────────────────────────────────
group("Parça build etkileri");
{
  const ko = K.CHARACTERS.find((c) => c.id === ROBOT);        // hp 110, armor 0.15
  const za = K.CHARACTERS.find((c) => c.id === "tavsan");     // cooldown 3
  const bo = K.CHARACTERS.find((c) => c.id === "ayi");        // gövde t3 savrulma
  const loadout2 = () => ({ helmet: null, body: null, tool: null, feet: null });

  // Regresyon: boş loadout, loadout'suz build ile birebir aynı.
  const withEmpty = K.resolveRobotBuild(ko, { xp: 0, upgrades: { chassis: 1, module: 0, core: 0 }, loadout: loadout2() }, { upgradesEnabled: true });
  const without = K.resolveRobotBuild(ko, { xp: 0, upgrades: { chassis: 1, module: 0, core: 0 } }, { upgradesEnabled: true });
  check("boş loadout = loadout'suz build (regresyon)", JSON.stringify(withEmpty) === JSON.stringify(without));

  const hpPart = K.resolveRobotBuild(ko, { upgrades: { chassis: 1, module: 0, core: 0 }, loadout: { helmet: null, body: "lehim_yamasi", tool: null, feet: null } }, { upgradesEnabled: true });
  check("can: kademe×%5 + yama +15 → 131", hpPart.maxHp === 131, `= ${hpPart.maxHp}`);

  // İki parça aynı yuvada: etkiler TOPLANIR (v6).
  const ikiParca = K.resolveRobotBuild(ko, { upgrades: {}, loadout: { helmet: null, body: ["lehim_yamasi", "kompozit_plaka"], tool: null, feet: null } }, { upgradesEnabled: true });
  check("aynı yuvadaki iki parça toplanır (can +15, zırh +%6)",
    ikiParca.maxHp === 125 && Math.abs(ikiParca.armor - (0.15 + 0.06)) < 1e-9,
    `hp=${ikiParca.maxHp} armor=${ikiParca.armor}`);
  const ikiKask = K.resolveRobotBuild(ko, { upgrades: {}, loadout: { helmet: ["nisan_mercegi", "hedef_takip"], body: null, tool: null, feet: null } }, { upgradesEnabled: true });
  check("iki kask parçası silah hasarını toplar (+%5 +%8)",
    Math.abs(ikiKask.weaponDamageMult - 1.13) < 1e-9, `= ${ikiKask.weaponDamageMult}`);
  // partEffectText alt yuvayı bilir: 2. yuvaya konan parçanın farkını gösterir.
  const birParcaLoadout = { helmet: null, body: ["lehim_yamasi", null], tool: null, feet: null };
  check("etki önizlemesi 2. alt yuvayı hesaba katar",
    K.partEffectText(ko, { upgrades: {}, loadout: birParcaLoadout }, "kompozit_plaka", 1).indexOf("→") > 0);
  check("etki önizlemesi 1. alt yuva için mevcut parçayı DEĞİŞTİRİR (toplamaz)",
    /Zırh %15 → %15/.test(K.partEffectText(ko, { upgrades: {}, loadout: birParcaLoadout }, "kompozit_plaka", 0)) ||
    K.partEffectText(ko, { upgrades: {}, loadout: birParcaLoadout }, "kompozit_plaka", 0).indexOf("→") > 0);

  const pl = K.resolveRobotBuild(ko, { upgrades: { chassis: 2, module: 0, core: 0 }, loadout: { helmet: null, body: "kompozit_plaka", tool: null, feet: null } }, { upgradesEnabled: true });
  check("zırh: t2 +%2 + plaka +%6 → 0.23", Math.abs(pl.armor - 0.23) < 1e-9, `= ${pl.armor}`);

  // Zırh tavanı: sentetik yüksek-armor parça kırpılır (katalog benzersiz
  // olduğundan gerçek parçalarla 0.40'a ulaşılamaz).
  K.PARTS.push({ id: "test_kalip", label: "Test Kalıp", slot: "body", price: 1, desc: "denge", effects: { armorFlat: 0.60 }, icon: { shape: "plate", tint: "#ffffff", accent: "#ffffff" } });
  const capped = K.resolveRobotBuild(ko, { upgrades: {}, loadout: { helmet: null, body: "test_kalip", tool: null, feet: null } }, { upgradesEnabled: true });
  check("zırh tavanı kırpılır (0.40)", capped.armor === K.ARMOR_CAP || capped.armor === 0.40, `= ${capped.armor}`);
  K.PARTS.pop();

  const cd = K.resolveRobotBuild(za, { upgrades: { chassis: 0, module: 2, core: 0 }, loadout: { helmet: null, body: null, tool: "yedek_yukleyici", feet: null } }, { upgradesEnabled: true });
  check("cooldown: t2 −1 + yükleyici −1 → alt sınır 2", cd.skill.cooldown === 2, `= ${cd.skill.cooldown}`);
  const cdOnly = K.resolveRobotBuild(za, { upgrades: {}, loadout: { helmet: null, body: null, tool: "yedek_yukleyici", feet: null } }, { upgradesEnabled: true });
  check("cooldown: yalnız parça 3→2", cdOnly.skill.cooldown === 2, `= ${cdOnly.skill.cooldown}`);

  const kb = K.resolveRobotBuild(bo, { upgrades: { chassis: 3, module: 0, core: 0 }, loadout: { helmet: "denge_sensoru", body: null, tool: null, feet: "denge_jiroskobu" } }, { upgradesEnabled: true });
  check("savrulma çarpımsal: 0.9×0.78=0.702", Math.abs(kb.knockbackTakenMult - 0.702) < 1e-9, `= ${kb.knockbackTakenMult}`);

  // Savrulma alt sınırı: sentetik damper + kademe birlikte kırpılır.
  K.PARTS.push({ id: "test_damper", label: "Test Damper", slot: "feet", price: 1, desc: "denge", effects: { knockbackRedPct: 0.90 }, icon: { shape: "damping", tint: "#ffffff", accent: "#ffffff" } });
  const clamped = K.resolveRobotBuild(bo, { upgrades: { chassis: 3, module: 0, core: 0 }, loadout: { helmet: "denge_sensoru", body: null, tool: null, feet: "test_damper" } }, { upgradesEnabled: true });
  check("savrulma alt sınırı 0.5", clamped.knockbackTakenMult === K.PART_KNOCKBACK_MIN, `= ${clamped.knockbackTakenMult}`);
  K.PARTS.pop();

  const wd = K.resolveRobotBuild(ko, { upgrades: { chassis: 0, module: 0, core: 3 }, loadout: { helmet: "nisan_mercegi", body: null, tool: null, feet: null } }, { upgradesEnabled: true });
  check("silah hasarı: t3 +%7 + mercek +%5 → 1.12", Math.abs(wd.weaponDamageMult - 1.12) < 1e-9, `= ${wd.weaponDamageMult}`);

  const en = K.resolveRobotBuild(ko, { upgrades: {}, loadout: { helmet: null, body: "sogutucu_radyator", tool: null, feet: null } }, { upgradesEnabled: true });
  check("enerji: taban 70 + radyatör +10 → 80", en.maxStamina === 80, `= ${en.maxStamina}`);

  // Hareket hızı (Turbo Palet): çarpan + üst sınır kırpması.
  const sp = K.resolveRobotBuild(ko, { upgrades: {}, loadout: { helmet: null, body: null, tool: null, feet: "turbo_palet" } }, { upgradesEnabled: true });
  check("turbo palet hız çarpanı 1.10", Math.abs(sp.moveSpeedMult - 1.10) < 1e-9, `= ${sp.moveSpeedMult}`);
  check("parçasız hız çarpanı 1", K.resolveRobotBuild(ko, { upgrades: {}, loadout: { helmet: null, body: null, tool: null, feet: null } }, { upgradesEnabled: true }).moveSpeedMult === 1);
  check("hız üst sınırı kırpılır (PART_MOVE_SPEED_MAX)", (() => {
    K.PARTS.push({ id: "test_turbo", label: "Test Turbo", slot: "feet", price: 1, desc: "hız", effects: { moveSpeedMult: 5 }, icon: { shape: "turboPad", tint: "#fff", accent: "#fff" } });
    const capped = K.resolveRobotBuild(ko, { upgrades: {}, loadout: { helmet: null, body: null, tool: null, feet: "test_turbo" } }, { upgradesEnabled: true });
    K.PARTS.pop();
    return Math.abs(capped.moveSpeedMult - 1.20) < 1e-9;
  })());
  check("hız etkisi metni", /Hareket hızı/.test(K.partEffectText(ko, { upgrades: {}, loadout: { helmet: null, body: null, tool: null, feet: null } }, "turbo_palet")));

  const pm = K.resolveRobotBuild(ko, { upgrades: { chassis: 0, module: 1, core: 0 }, loadout: { helmet: "termal_vizor", body: null, tool: "takviye_bobini", feet: null } }, { upgradesEnabled: true });
  check("modül gücü çarpımsal: 1.06×1.14 (t1+vizör+bobin)", Math.abs(pm.skill.powerMult - 1.2084) < 1e-9, `= ${pm.skill.powerMult}`);
  const pmOne = K.resolveRobotBuild(ko, { upgrades: { chassis: 0, module: 1, core: 0 }, loadout: { helmet: null, body: null, tool: "takviye_bobini", feet: null } }, { upgradesEnabled: true });
  check("modül gücü tek parça: 1.06×1.08", Math.abs(pmOne.skill.powerMult - 1.1448) < 1e-9, `= ${pmOne.skill.powerMult}`);

  const locked = K.resolveRobotBuild(ko, { upgrades: { chassis: 1, module: 0, core: 0 }, loadout: { helmet: null, body: "lehim_yamasi", tool: null, feet: null } }, { upgradesEnabled: false });
  check("kilitli maçta parçalar etkisiz", locked.maxHp === 110, `= ${locked.maxHp}`);

  const ghost = K.resolveRobotBuild(ko, { upgrades: {}, loadout: { helmet: null, body: "hayalet_parca", tool: null, feet: null } }, { upgradesEnabled: true });
  check("katalogda olmayan parça yok sayılır", ghost.maxHp === 110);

  check("etki metni: can", K.partEffectText(ko, { upgrades: {}, loadout: loadout2() }, "lehim_yamasi") === "Can 110 → 125");
  check("etki metni: bilinmeyen parça → boş", K.partEffectText(ko, { upgrades: {}, loadout: loadout2() }, "hayalet") === "");
}

// ── Özet ────────────────────────────────────────────────────────────────────
console.log(`\n${pass} geçti, ${fail} kaldı`);
if (fail) {
  console.log("\nBaşarısız testler:");
  for (const f of failures) console.log("  • " + f);
  process.exit(1);
}

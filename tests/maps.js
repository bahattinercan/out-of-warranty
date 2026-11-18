/* Haritaya özel geometri ve doğuş sözleşmeleri — saf Node, bağımlılıksız.
 * Çalıştır: node tests/maps.js
 */
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "js");
const bundle = ["characters.js", "maps.js", "terrain.js"]
  .map((f) => fs.readFileSync(path.join(JS_DIR, f), "utf8"))
  .join("\n;\n") +
  "\n;globalThis.__MAP_TEST = { MAPS, CHARACTERS, MAP_LAYOUT_SPECS, mapLayoutProfile, getMapSpawnPads, applyMapTurnMechanics, getMapPropPlacements: typeof getMapPropPlacements === \"function\" ? getMapPropPlacements : null, Terrain, drawMapPreview: typeof drawMapPreview === \"function\" ? drawMapPreview : null };";
const sandbox = { Math, Float32Array, Uint8Array, Array, Object, Set, Map, console, _csRoundRect: () => {} };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(bundle, sandbox, { filename:"maps-bundle.js" });
const M = sandbox.__MAP_TEST;

let pass = 0, fail = 0;
const failures = [];
function check(name, condition, detail) {
  if (condition) pass++;
  else { fail++; failures.push(`${name}${detail ? ` — ${detail}` : ""}`); }
}

check("bağımsız haritaların tamamında özel yerleşim var",
  M.MAPS.length === 14 && M.MAPS.every((m) => m.layout && !m.forChar));
check("harita kimlikleri robotlardan bağımsız ve benzersiz",
  new Set(M.MAPS.map((m) => m.id)).size === 14 && M.MAPS.every((m) => !M.CHARACTERS.some((c) => c.id === m.id)));
check("harita adları ve taktik notları birbirinden farklı",
  new Set(M.MAPS.map((m) => m.label)).size === 14 && M.MAPS.every((m) => m.hint));
check("haritalar görsel sahne kimlikleriyle kaydedilir",
  new Set(M.MAPS.map((m) => m.scene)).size === 14 && M.MAPS.every((m) => m.scene));
check("fırın dışındaki haritalar PNG arka, ön ve oynanabilir yüzey katmanı kullanır",
  M.MAPS.filter((m) => m.id !== "furnace").every((m) =>
    m.backdropArt === `gameplay/${m.id.replaceAll("_", "-")}-background` &&
    m.foregroundArt === `gameplay/${m.id.replaceAll("_", "-")}-foreground` &&
    m.surfaceArt === `gameplay/${m.id.replaceAll("_", "-")}-surface`));

const conveyorMap = M.MAPS.find((m) => m.id === "conveyor_port");
check("Konveyör Limanı iki zıt yönlü bandı ve yeterli itiş mesafesini tanımlar",
  !!conveyorMap && conveyorMap.conveyors.length === 2 && conveyorMap.conveyors[0].direction === 1 && conveyorMap.conveyors[1].direction === -1 && conveyorMap.conveyorShift === 12);
check("Konveyör Limanı başlangıç noktalarını hareketli bantların dışında tutar",
  !!conveyorMap && M.getMapSpawnPads(conveyorMap, 6).every((pad) =>
    !conveyorMap.conveyors.some((belt) => pad.x >= belt.start && pad.x <= belt.end)));
if (conveyorMap) {
  const terrain = { w: 960, h: 540, isSolid: () => false, surfaceBelow: () => 350 };
  const onLeftBelt = { x: 400, y: 350, r: 12, alive: true, onGround: true, vx: 1, vy: 2 };
  const onRightBelt = { x: 560, y: 350, r: 12, alive: true, onGround: true, vx: -1, vy: 1 };
  const safe = { x: 240, y: 350, r: 12, alive: true, onGround: true };
  const airborne = { x: 400, y: 330, r: 12, alive: true, onGround: false };
  const dead = { x: 400, y: 350, r: 12, alive: false, onGround: true };
  const moved = M.applyMapTurnMechanics(conveyorMap, [onLeftBelt, onRightBelt, safe, airborne, dead], terrain);
  check("bantlar yere basan robotları merkeze taşır ve düşey hareketi dengeler",
    moved.length === 2 && onLeftBelt.x === 412 && onRightBelt.x === 548 && onLeftBelt.vx === 0 && onRightBelt.vy === 0);
  check("bantlar havadaki, ölü veya güvenli iskeledeki robotlara dokunmaz",
    safe.x === 240 && airborne.x === 400 && dead.x === 400);
  const blocked = { x: 400, y: 350, r: 12, alive: true, onGround: true };
  M.applyMapTurnMechanics(conveyorMap, [blocked], { ...terrain, isSolid: () => true });
  check("bant güvenli olmayan katı engelin içinden robotu taşımaz", blocked.x === 400);
}
const steamMap = M.MAPS.find((m) => m.id === "steamworks");
check("Buhar Bacaları iki sırayla çalışan güvenli tahliye jeti tanımlar",
  !!steamMap && steamMap.steamVents.length === 2 && steamMap.steamVents.every((vent) => vent.lift > 0 && vent.radius > 0));
if (steamMap) {
  const terrain = { w: 960, h: 540, isSolid: () => false, surfaceBelow: () => 350 };
  const left = { x: 355, y: 350, r: 12, alive: true, onGround: true, vy: 0 };
  const right = { x: 605, y: 350, r: 12, alive: true, onGround: true, vy: 0 };
  const moved0 = M.applyMapTurnMechanics(steamMap, [left, right], terrain, 0);
  check("ilk tahliye jeti yakındaki robotu hasar vermeden havaya alır",
    moved0.length === 1 && left.vy < 0 && !left.onGround && right.onGround);
  const moved1 = M.applyMapTurnMechanics(steamMap, [left, right], terrain, 1);
  check("sonraki tur karşı bacayı etkinleştirir",
    moved1.length === 1 && right.vy < 0 && !right.onGround);
}

check("dekor yerleşimi saf test edilebilir bir üretici sunar",
  typeof M.getMapPropPlacements === "function");
if (M.getMapPropPlacements) {
  const sample = M.MAPS[0];
  const profile = M.mapLayoutProfile(sample.layout, 960, 540);
  const first = M.getMapPropPlacements(profile, 960, sample);
  const second = M.getMapPropPlacements(profile, 960, sample);
  check("aynı harita her üretimde aynı dekorları verir",
    JSON.stringify(first) === JSON.stringify(second));
  check("harita kimliği dekor yerleşimini belirler",
    JSON.stringify(first) !== JSON.stringify(M.getMapPropPlacements(profile, 960,
      Object.assign({}, sample, { id: `${sample.id}-variant` }))));
  check("dekorlar tüm doğuş adaylarının çevresini boş bırakır",
    M.MAPS.every((map) => {
      const heights = M.mapLayoutProfile(map.layout, 960, 540);
      const props = M.getMapPropPlacements(heights, 960, map);
      return props.every((prop) => map.layout.s.every((sx) => Math.abs(prop.x - sx * 960) >= 36));
    }));
}

const signatures = new Set();
for (const map of M.MAPS) {
  const layout = map.layout;
  const profile = M.mapLayoutProfile(layout, 960, 540);
  signatures.add(Array.from(profile).filter((_, i) => i % 24 === 0).map((v) => Math.round(v)).join(","));

  check(`${map.id}: profil 960 sütun üretir`, profile.length === 960);
  check(`${map.id}: profil ekranın güvenli dikey alanındadır`,
    Array.from(profile).every((y) => y >= 200 && y <= 430));
  check(`${map.id}: altı doğuş adayı sıralı ve sınırlar içinde`,
    layout.s.length === 6 && layout.s.every((x, i) => x > 0 && x < 1 && (i === 0 || x > layout.s[i - 1])));

  for (let count = 2; count <= 6; count++) {
    const pads = M.getMapSpawnPads(map, count);
    check(`${map.id}: ${count} oyuncuya ${count} doğuş`,
      pads.length === count && pads.every((p) => p.x > 0 && p.x < 1 && p.fromY >= 0 && p.fromY < 1));
  }
}

check("on dört ana yüzey silüeti birbirinden farklıdır", signatures.size === 14,
  `benzersiz=${signatures.size}`);
const basinMap = M.MAPS.find((m) => m.id === "settling_basin");
check("KEPÇE-8 iki havza arasında alçak savak ve altı güvenli doğuş noktası taşır",
  !!basinMap && basinMap.layout.s.length === 6 && basinMap.layout.s.every((x) => x < .48 || x > .54) &&
  basinMap.layout.p.some(([x, y]) => x === .48 && y === .685) && basinMap.layout.p.some(([x, y]) => x === .54 && y === .685));
check("TOK-2 üç ayrı kalibrasyon tezgâhı taşır", M.MAPS.find((m) => m.id === "calibration_benches").layout.p.filter(([, y], i, p) => y < .70 && (i === 0 || p[i - 1][1] >= .70)).length === 3);
check("VUR-5 iki yamaçtan tek güvenli havzaya iner", M.MAPS.find((m) => m.id === "filter_terraces").layout.p.some(([, y]) => y >= .75));
check("PUNTA-1 köprü ve merkez dikmesini katı arazi maskesine ekler", M.MAPS.find((m) => m.id === "weld_gantries").layout.solids.length === 2);
check("SIZ-7 merkez platformu ve iki sığ siper tanımlar", M.MAPS.find((m) => m.id === "old_filter_bay").layout.p.some(([, y]) => y === .65));
check("EMP-80 yüksek merkezi platform ve yan yaklaşım rotaları taşır", M.MAPS.find((m) => m.id === "substation_yard").layout.p.some(([, y]) => y === .519));
check("Ay Moloz Sahası üç ek platform taşır",
  M.MAPS.find((m) => m.id === "moon_scrapyard").layout.solids.length === 3);
check("Buz Kırığı fiziksel olarak dipsiz bir uçurum taşır",
  M.MAPS.find((m) => m.id === "ice_rift").layout.cliffs.length === 1);
check("Taşkın Laboratuvarı çevre ve iç duvarlar taşır",
  M.MAPS.find((m) => m.id === "flooded_lab").layout.solids.filter((r) => r.h > .1).length === 4);
check("uçurum haritasında hiçbir doğuş yarıkta değildir",
  M.getMapSpawnPads(M.MAPS.find((m) => m.id === "ice_rift"), 6).every((p) => p.x < .42 || p.x > .58));

function maskFor(map, initiallySolid) {
  const terrain = Object.create(M.Terrain.prototype);
  terrain.w = 960; terrain.h = 540;
  terrain.solid = new Uint8Array(terrain.w * terrain.h);
  if (initiallySolid) terrain.solid.fill(1);
  terrain.theme = map;
  terrain.applyLayoutMask();
  return terrain;
}

function terrainFor(map) {
  const terrain = maskFor(map, false);
  const profile = M.mapLayoutProfile(map.layout, terrain.w, terrain.h);
  for (let x = 0; x < terrain.w; x++) {
    for (let y = Math.floor(profile[x]); y < terrain.h; y++) terrain.solid[y * terrain.w + x] = 1;
  }
  // Temel yüzey dolduktan sonra ek katılar ve tünel boşlukları uygulanır.
  terrain.applyLayoutMask();
  return terrain;
}

for (const map of M.MAPS) {
  const terrain = terrainFor(map);
  for (let count = 2; count <= 6; count++) {
    for (const pad of M.getMapSpawnPads(map, count)) {
      const x = Math.round(pad.x * terrain.w);
      const y = terrain.surfaceBelow(x, pad.fromY * terrain.h);
      let bodyClear = y < terrain.h;
      for (let cy = Math.max(0, y - 32); bodyClear && cy < y; cy++) {
        if (terrain.isSolid(x, cy)) bodyClear = false;
      }
      check(`${map.id}: ${count} oyuncu doğuşu zeminde ve gövde alanı boş`, bodyClear,
        `x=${x}, y=${y}`);
    }
  }
}

const debris = maskFor(M.MAPS.find((m) => m.id === "moon_scrapyard"), false);
check("Ay platformları çarpışma maskesinde katı, alt rota açıktır",
  debris.isSolid(250, 292) && !debris.isSolid(250, 380));
const lab = maskFor(M.MAPS.find((m) => m.id === "flooded_lab"), true);
check("Laboratuvar duvarları gerçek çarpışma maskesindedir",
  lab.isSolid(40, 250) && lab.isSolid(930, 250) && lab.isSolid(300, 330));
const ice = maskFor(M.MAPS.find((m) => m.id === "ice_rift"), true);
check("Buz Kırığı yarığı zemini dibine kadar gerçekten keser",
  !ice.isSolid(480, 320) && !ice.isSolid(480, 520) && ice.isSolid(400, 400));

if (M.drawMapPreview) {
  const mockCtx = new Proxy({}, { get: () => () => ({ addColorStop: () => {} }) });
  for (const map of M.MAPS) {
    let ok = true, err = null;
    try {
      M.drawMapPreview(mockCtx, 0, 0, 200, 150, map);
    } catch (e) {
      ok = false;
      err = e.message;
    }
    check(`${map.id}: drawMapPreview hatasız çalışır`, ok, err);
  }
}

if (fail) {
  console.error(`\n${fail} harita testi başarısız:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`${pass} harita testi geçti.`);

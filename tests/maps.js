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
  "\n;globalThis.__MAP_TEST = { MAPS, CHARACTERS, MAP_LAYOUT_SPECS, mapLayoutProfile, getMapSpawnPads, getMapPropPlacements: typeof getMapPropPlacements === \"function\" ? getMapPropPlacements : null, Terrain, drawMapPreview: typeof drawMapPreview === \"function\" ? drawMapPreview : null };";
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

check("altı bağımsız haritanın tamamında özel yerleşim var",
  M.MAPS.length === 6 && M.MAPS.every((m) => m.layout && !m.forChar));
check("harita kimlikleri robotlardan bağımsız ve benzersiz",
  new Set(M.MAPS.map((m) => m.id)).size === 6 && M.MAPS.every((m) => !M.CHARACTERS.some((c) => c.id === m.id)));
check("harita adları ve taktik notları birbirinden farklı",
  new Set(M.MAPS.map((m) => m.label)).size === 6 && M.MAPS.every((m) => m.hint));
check("altı haritanın her biri farklı bir resimli arka plan kullanır",
  new Set(M.MAPS.map((m) => m.zoneId)).size === 6 && M.MAPS.every((m) => m.scene));

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

check("altı ana yüzey silüeti birbirinden farklıdır", signatures.size === 6,
  `benzersiz=${signatures.size}`);
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

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
  "\n;globalThis.__MAP_TEST = { MAPS, MAP_LAYOUT_SPECS, mapLayoutProfile, getMapSpawnPads, Terrain };";
const sandbox = { Math, Float32Array, Uint8Array, Array, Object, Set, Map, console };
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

check("34 haritanın tamamında özel yerleşim var",
  M.MAPS.length === 34 && M.MAPS.every((m) => m.layout));
check("harita adları birbirinden farklı",
  new Set(M.MAPS.map((m) => m.label)).size === 34);

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

check("34 ana yüzey silüeti de birbirinden farklıdır", signatures.size === 34,
  `benzersiz=${signatures.size}`);
check("Mıknatıs Köprüsü gerçek bir ek üst yol taşır",
  M.MAP_LAYOUT_SPECS.kedi.solids && M.MAP_LAYOUT_SPECS.kedi.solids.length === 3);
check("Üç Katlı Raf iki ek üst yol taşır",
  M.MAP_LAYOUT_SPECS.maymun.solids && M.MAP_LAYOUT_SPECS.maymun.solids.length === 2);
check("Gömülü Servis Tüneli iki gerçek boşluk taşır",
  M.MAP_LAYOUT_SPECS.armadillo.cuts && M.MAP_LAYOUT_SPECS.armadillo.cuts.length === 2);

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

const bridge = maskFor(M.MAPS.find((m) => m.id === "kedi"), false);
check("Mıknatıs Köprüsü maskede doludur ve alt yolu boştur",
  bridge.isSolid(480, 296) && !bridge.isSolid(480, 380));
const tunnel = maskFor(M.MAPS.find((m) => m.id === "armadillo"), true);
check("Servis Tüneli maskede boş oda ve katı ayırıcı üretir",
  !tunnel.isSolid(360, 370) && tunnel.isSolid(480, 370) && !tunnel.isSolid(600, 370));

if (fail) {
  console.error(`\n${fail} harita testi başarısız:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`${pass} harita testi geçti.`);

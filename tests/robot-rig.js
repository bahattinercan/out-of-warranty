const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const image = id => ({ id, naturalWidth: 512, naturalHeight: 512 });
const sandbox = { console, assetImage: id => id.startsWith("robots/") || id === "weapons/launcher" ? image(id) : null };
vm.createContext(sandbox);
vm.runInContext(["i18n", "characters", "robots", "weapons", "entity"]
  .map(name => fs.readFileSync(path.join(__dirname, "../js", name + ".js"), "utf8")).join("\n;\n") +
  "\n;globalThis.rigTest = { CHARACTERS, WEAPONS, Entity, visualScale: RB_VISUAL_SCALE };", sandbox);
const { CHARACTERS, WEAPONS, visualScale } = sandbox.rigTest;
const noop = () => {};

function context() {
  const draws = [];
  const scales = [];
  const target = {
    draws,
    scales,
    drawImage(asset, ...args) { draws.push({ id: asset.id, args }); },
    scale(x, y) { scales.push([x, y]); },
    save: noop, restore: noop,
    translate: noop, rotate: noop,
  };
  return new Proxy(target, { get: (object, key) => key in object ? object[key] : noop });
}

for (const charDef of CHARACTERS) {
  const r = charDef.r * visualScale;
  for (const facing of [1, -1]) {
    for (const aim of [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2]) {
      const ctx = context();
      assert.equal(sandbox.drawRobot(ctx, { charDef, r: charDef.r, facing, aim }), true,
        charDef.label + ": sprite çizimi başarılı olmalı");
      assert.deepEqual(ctx.draws.map(draw => draw.id), ["robots/" + charDef.id, "weapons/launcher"],
        charDef.label + ": tam gövde sprite'ı silah sprite'ından önce çizilmeli");
      assert.ok(Math.abs(ctx.draws[0].args[2] - r * 2.32) < 1e-8,
        charDef.label + ": tam gövde sprite'ı sabit görsel genişliğe uymalı");
      assert.deepEqual(ctx.scales, [[facing, 1]], charDef.label + ": sprite bakış yönünde aynalanmalı");
    }
  }

  const idle = context();
  sandbox.drawRobot(idle, { charDef, r: charDef.r, facing: 1 });
  assert.deepEqual(idle.draws.map(draw => draw.id), ["robots/" + charDef.id],
    charDef.label + ": boşta tam gövde sprite'ı silah eklemeden çizilmeli");
}

const missingAssets = sandbox.assetImage;
sandbox.assetImage = () => null;
const procedural = context();
for (const charDef of CHARACTERS) {
  assert.equal(sandbox.drawRobot(procedural, { charDef, r: charDef.r, facing: 1, aim: -0.6 }), true,
    charDef.label + ": görsel bulunamadığında prosedürel çizim fallback'i çalışmalı");
}
sandbox.assetImage = missingAssets;

assert.equal(sandbox.drawRobot(context(), { charDef: null }), false,
  "karakter tanımı yoksa çizim reddedilmeli");
assert.equal(vm.runInContext("WEAPONS.every(weapon => Object.hasOwn(WEAPON_RIG_BY_ID, weapon.id))", sandbox), true,
  "her silah için açık bir tutuş profili bulunmalı");

console.log("Robot çizimi: 34 tam gövde sprite'ı, 2 yön, 7 nişan açısı, silah katmanı ve prosedürel fallback geçti.");

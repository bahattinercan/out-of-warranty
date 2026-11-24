const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const image = id => ({ id, naturalWidth: 512, naturalHeight: 512 });
const sandbox = { console, assetImage: id => id.startsWith("robots/") || id === "weapons/launcher" ? image(id) : null };
vm.createContext(sandbox);
vm.runInContext(["i18n", "characters", "robot-animation-manifest", "robots", "weapons", "entity"]
  .map(name => fs.readFileSync(path.join(__dirname, "../js", name + ".js"), "utf8")).join("\n;\n") +
  "\n;globalThis.rigTest = { CHARACTERS, WEAPONS, proportions: _rbProportions };", sandbox);
const { CHARACTERS, WEAPONS, proportions } = sandbox.rigTest;
const noop = () => {};
const drawHand = sandbox._rbHand;
const hands = [];
sandbox._rbHand = (ctx, x, y, ...args) => {
  hands.push({ x, y });
  drawHand(ctx, x, y, ...args);
};

function context() {
  const draws = [];
  const scales = [];
  const paints = [];
  const target = {
    draws,
    scales,
    paints,
    drawImage(asset, ...args) { draws.push({ id: asset.id, args }); },
    scale(x, y) { scales.push([x, y]); },
    fill() { paints.push("fill"); },
    stroke() { paints.push("stroke"); },
    save: noop, restore: noop,
    translate: noop, rotate: noop,
  };
  return new Proxy(target, { get: (object, key) => key in object ? object[key] : noop });
}

for (const charDef of CHARACTERS) {
  const pose = proportions(charDef);
  assert.ok(Math.abs(pose.upperDy - 0.96 * (1 - pose.legs)) < 1e-12,
    charDef.label + ": upper body should stay aligned with its hip pivot");
  for (const facing of [1, -1]) {
    for (const aim of [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2]) {
      const ctx = context();
      hands.length = 0;
      assert.equal(sandbox.drawRobot(ctx, { charDef, r: charDef.r, facing, aim }), true,
        charDef.label + ": vector render should succeed");
      assert.equal(ctx.draws.length, 0, charDef.label + ": robot and weapon must not use raster images");
      assert.ok(ctx.paints.length > 0, charDef.label + ": Canvas vector shapes should be painted");
      assert.ok(ctx.scales.some(([x, y]) => x === facing && y === 1),
        charDef.label + ": vector robot should mirror to face its direction");
      const r = charDef.r * vm.runInContext("RB_VISUAL_SCALE", sandbox);
      const ax = Math.cos(aim) * facing, ay = Math.sin(aim);
      const gripX = r * (0.10 * pose.torsoX + 0.12 * ax - 0.24 * ay);
      const gripY = r * (-0.34 + 0.12 * ay + 0.24 * ax);
      assert.equal(hands.length, 2);
      assert.ok(Math.hypot(hands[1].x - gripX, hands[1].y - gripY) < 1e-8,
        charDef.label + ": front hand must stay on the launcher grip");
    }
  }

  const idle = context();
  sandbox.drawRobot(idle, { charDef, r: charDef.r, facing: 1 });
  assert.equal(idle.draws.length, 0, charDef.label + ": idle render must not use raster images");
  assert.ok(idle.paints.length > 0, charDef.label + ": idle vector robot should be painted");
}

const missingAssets = sandbox.assetImage;
sandbox.assetImage = () => null;
for (const charDef of CHARACTERS) {
  const ctx = context();
  assert.equal(sandbox.drawRobot(ctx, { charDef, r: charDef.r, facing: 1, aim: -0.6 }), true,
    charDef.label + ": vector render should work without loaded artwork");
  assert.ok(ctx.paints.length > 0, charDef.label + ": vector robot should be painted without assets");
}
sandbox.assetImage = missingAssets;

assert.equal(sandbox.drawRobot(context(), { charDef: null }), false,
  "render should reject a missing character definition");
assert.equal(vm.runInContext("WEAPONS.every(weapon => Object.hasOwn(WEAPON_RIG_BY_ID, weapon.id))", sandbox), true,
  "every weapon should have an explicit grip profile");

console.log("Robot rendering: 34 Canvas vector characters, 2 facings, 7 aim angles, and asset-free drawing passed.");

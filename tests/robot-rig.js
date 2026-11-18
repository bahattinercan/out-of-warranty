/* Gerçek görseller hazırken de robot elleri silahı kavramalı. */
const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sandbox = { console, assetImage: id => ({ id, naturalWidth: 371, naturalHeight: 419 }) };
vm.createContext(sandbox);
vm.runInContext(["i18n", "characters", "robots", "weapons", "entity"]
  .map(name => fs.readFileSync(path.join(__dirname, "../js", name + ".js"), "utf8")).join("\n;\n") +
  "\n;globalThis.rigTest = { CHARACTERS, WEAPONS, Entity };", sandbox);
const { CHARACTERS, WEAPONS, Entity } = sandbox.rigTest;
assert.equal(vm.runInContext("WEAPONS.every(weapon => Object.hasOwn(WEAPON_RIG_BY_ID, weapon.id))", sandbox), true,
  "her silah için açık bir tutuş profili bulunmalı");
const noop = () => {};
const context = () => {
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const arcs = [];
  const images = [];
  const imageDraws = [];
  const point = (x, y) => ({ x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5] });
  return new Proxy({
    point, arcs,
    images,
    imageDraws,
    drawImage(image, ...args) { images.push(image.id); imageDraws.push({ id: image.id, args }); },
    save() { stack.push(matrix.slice()); },
    restore() { matrix = stack.pop(); },
    translate(x, y) { const p = point(x, y); matrix[4] = p.x; matrix[5] = p.y; },
    scale(x, y) { matrix[0] *= x; matrix[1] *= x; matrix[2] *= y; matrix[3] *= y; },
    rotate(angle) {
      const [a, b, c, d] = matrix, cos = Math.cos(angle), sin = Math.sin(angle);
      matrix[0] = a * cos + c * sin; matrix[1] = b * cos + d * sin;
      matrix[2] = c * cos - a * sin; matrix[3] = d * cos - b * sin;
    },
    arc(x, y, radius) { arcs.push({ ...point(x, y), radius }); },
  }, {
    get: (target, key) => target[key] || noop,
    set: (target, key, value) => { target[key] = value; return true; },
  });
};

const armLines = [], armJoints = [];
const armContext = new Proxy({
  lineTo(x, y) { armLines.push([x, y]); },
  arc(x, y, radius) { armJoints.push({ x, y, radius }); },
}, { get: (target, key) => target[key] || noop, set: (target, key, value) => { target[key] = value; return true; } });
sandbox._rbArm(armContext, 0, 0, 12, 0, 1, 2, "#e8a020", { elbow: { x: 6, y: 4 } });
assert.ok(armLines.length >= 12, "robot kolları iki zırh segmenti ve kenar çizgileriyle çizilmeli");
assert.equal(armJoints.length, 3, "omuz, dirsek ve bilek mafsalları çizilmeli");

const originalHand = sandbox._rbHand;
let hands = [];
sandbox._rbHand = (ctx, x, y, angle, size, color, grip) => {
  hands.push({ ...ctx.point(x, y), angle, grip });
  originalHand(ctx, x, y, angle, size, color, grip);
};

for (const charDef of CHARACTERS) {
  hands = [];
  const ctx = context();
  sandbox.drawRobot(ctx, { charDef, r: charDef.r, aim: -0.6, facing: 1 });
  if (charDef.id === "kopek") {
    assert.ok(ctx.images.includes("robot-parts/fix8-parts-atlas"), charDef.label + ": tek FIX-8 atlas dosyası kullanılmalı");
    assert.ok(ctx.imageDraws.filter(draw => draw.id === "robot-parts/fix8-parts-atlas").length >= 8,
      charDef.label + ": atlasın gövde, uzuv ve teker parçaları çizilmeli");
  } else if (["kedi", "ayi", "tilki", "tavsan", "rakun", "yarasa"].includes(charDef.id)) {
    const expected = {
      kedi: ["head", "body", "pelvis", "arm-upper", "arm-lower", "arm-back-upper", "arm-back-lower", "leg-upper", "leg-lower"],
      ayi: ["head", "body", "pelvis", "arm-upper", "arm-lower", "arm-back-upper", "arm-back-lower", "track-near", "track-far"],
      tilki: ["head", "body", "pelvis", "arm-upper", "arm-lower", "arm-back-upper", "arm-back-lower", "leg-upper", "leg-lower", "foot-near", "foot-far"],
      tavsan: ["head", "body", "pelvis", "arm-upper", "arm-lower", "arm-back-upper", "arm-back-lower", "leg-upper", "leg-lower", "foot-near", "foot-far"],
      rakun: ["head", "body", "pelvis", "arm-upper", "arm-lower", "arm-back-upper", "arm-back-lower", "ball-near", "ball-far"],
      yarasa: ["head", "body", "pelvis", "arm-upper", "arm-lower", "arm-back-upper", "arm-back-lower", "rotor-near", "rotor-far"],
    }[charDef.id];
    for (const part of expected) {
      assert.ok(ctx.images.includes("robot-parts/" + charDef.id + "-art-" + part),
        charDef.label + ": pilot key art parçası kullanılmalı (" + part + ")");
    }
    assert.ok(ctx.imageDraws.some(draw => draw.id === "robot-parts/" + charDef.id + "-art-head"),
      charDef.label + ": pilot kafa görseli çizilmeli");
  } else {
    assert.ok(ctx.images.includes("robot-models/" + charDef.id + "-body"), charDef.label + ": özel gövde SVG'si kullanılmalı");
    assert.ok(ctx.images.includes("robot-models/" + charDef.id + "-head"), charDef.label + ": özel kafa SVG'si kullanılmalı");
    const headDraw = ctx.imageDraws.find(draw => draw.id === "robot-models/" + charDef.id + "-head");
    assert.equal(headDraw.args[2], charDef.r * 1.1 * 2, charDef.label + ": splash oranına uygun büyük kafa kullanılmalı");
  }
  assert.equal(hands.filter(hand => hand.grip).length, 2,
    charDef.label + ": görseller yüklüyken iki el de silahı tutmalı");
}

const originalArm = sandbox._rbArm;
for (const facing of [1, -1]) {
  let armCalls = 0;
  let screenShoulderX = 0;
  sandbox._rbArm = (ctx, sx, sy, ...args) => {
    armCalls++;
    screenShoulderX = ctx.point(sx, sy).x;
    return originalArm(ctx, sx, sy, ...args);
  };
  hands = [];
  sandbox.drawRobot(context(), { charDef: CHARACTERS[0], r: CHARACTERS[0].r, aim: -0.6, facing, frontArmOnly: true });
  assert.equal(armCalls, 1, "oyun içi görünümde yalnızca öndeki kol çizilmeli");
  assert.equal(hands.length, 1, "oyun içi görünümde yalnızca öndeki el çizilmeli");
  assert.equal(Math.sign(screenShoulderX), facing, "görünen kol karakterin baktığı tarafta olmalı");
}
sandbox._rbArm = originalArm;

const modelFiles = fs.readdirSync(path.join(__dirname, "../assets/robot-models"));
assert.equal(modelFiles.length, CHARACTERS.length, "her robotun parça klasörü olmalı");
for (const charDef of CHARACTERS) {
  for (const part of ["body", "head"]) {
    const svg = fs.readFileSync(path.join(__dirname, "../assets/robot-models", charDef.id, part + ".svg"), "utf8");
    assert.match(svg, /<svg[^>]+viewBox="0 0 110 82"/);
    assert.ok(svg.includes(`aria-label="${charDef.label} ${part}"`));
    assert.equal((svg.match(/<linearGradient\b/g) || []).length, 4, charDef.label + ": parça dört katmanlı palet gölgesi taşımalı");
    assert.ok((svg.match(/<path\b/g) || []).length >= (part === "body" ? 8 : 3), charDef.label + ": parça ayrıntı geometrisi içermeli");
  }
}

assert.equal(typeof sandbox.robotWeaponPose, "function", "ortak silah pozu bulunmalı");
const originalLauncher = sandbox._rbLauncher;
let expectedHands = [];
sandbox._rbLauncher = (ctx, angle, r, accent, x, y, weapon) => {
  const grip = sandbox.weaponRig(weapon), cos = Math.cos(angle), sin = Math.sin(angle);
  expectedHands = [[grip.frontX, grip.frontY], [grip.backX, grip.backY]]
    .map(([gx, gy]) => ctx.point(x + (gx * cos - gy * sin) * r, y + (gx * sin + gy * cos) * r));
  originalLauncher(ctx, angle, r, accent, x, y, weapon);
};
for (const charDef of CHARACTERS) {
  for (const weapon of WEAPONS) {
    for (const facing of [-1, 1]) {
      for (const angle of [-90, -60, -30, 0, 30, 60, 90]) {
        for (const recoil of [0, 0.5, 1]) {
          const aim = Math.atan2(Math.sin(angle * Math.PI / 180), facing * Math.cos(angle * Math.PI / 180));
          const pose = sandbox.robotWeaponPose(charDef, aim, facing, weapon, recoil);
          const rig = sandbox.weaponRig(weapon);
          assert.ok(Math.abs(pose.frontArm.wristAngle - (pose.angle + rig.frontWrist)) < 1e-8,
            charDef.label + ": ön bilek silah ailesinin kavrama açısını kullanmalı");
          assert.ok(Math.abs(pose.backArm.wristAngle - (pose.angle + rig.backWrist)) < 1e-8,
            charDef.label + ": arka bilek silah ailesinin kavrama açısını kullanmalı");
          for (const arm of [pose.frontArm, pose.backArm]) {
            const upper = Math.hypot(arm.elbow.x - arm.shoulder.x, arm.elbow.y - arm.shoulder.y);
            const lower = Math.hypot(arm.hand.x - arm.elbow.x, arm.hand.y - arm.elbow.y);
            assert.ok(Math.abs(upper - arm.upperLength) < 1e-8, charDef.label + ": üst kol uzamamalı");
            assert.ok(Math.abs(lower - arm.lowerLength) < 1e-8, charDef.label + ": ön kol uzamamalı");
          }
          const entity = new Entity(300, 400, charDef.color, charDef.label, charDef);
          entity.facing = facing;
          entity.aim = aim;
          entity.weapon = WEAPONS.indexOf(weapon);
          entity.weaponRecoil = recoil;
          const actual = entity.muzzle;
          const scale = charDef.r * 1.1;
          assert.ok(Math.hypot(actual.x - (entity.x + facing * scale * pose.muzzle.x),
            actual.y - (entity.y - entity.r + scale * pose.muzzle.y)) < 1e-8,
          charDef.label + ": mermi ve çizilen namlu aynı noktada olmalı");
          if (["bazooka", "sniper", "shotgun", "grenade", "hook"].includes(weapon.id) && angle % 90 === 0 && recoil !== 0.5) {
            hands = [];
            const ctx = context();
            sandbox.drawRobot(ctx, { cx: entity.x, cy: entity.y - entity.r, r: entity.r,
              charDef, facing, aim, weapon, recoil, timeMs: 1250,
              motion: { walk: 1, walkAmp: 1, walkPhase: 1.1, vx: 2.2, onGround: true } });
            assert.equal(hands.length, 2);
            for (const expected of expectedHands) {
              assert.ok(hands.some(hand => hand.grip && Math.hypot(hand.x - expected.x, hand.y - expected.y) < 0.01),
                charDef.label + ": çizilen el tutamaktan ayrılmamalı");
            }
            const ringRadius = scale * 0.28 * 0.44;
            assert.ok(ctx.arcs.some(arc => Math.abs(arc.radius - ringRadius) < 1e-8 && Math.hypot(arc.x - actual.x, arc.y - actual.y) < 0.01),
              charDef.label + ": hareket ve geri tepmede çizilen namlu mermi çıkışını izlemeli");
          }
        }
      }
    }
  }
}

for (const charDef of CHARACTERS) {
  const normal = context();
  const damaged = context();
  sandbox.drawRobot(normal, { charDef, r: charDef.r, facing: 1, timeMs: 900 });
  sandbox.drawRobot(damaged, { charDef, r: charDef.r, facing: 1, timeMs: 900,
    healthRatio: 0.2, hitFlash: 1, shieldFlash: 1, skillPose: charDef.skill.kind, skillProgress: 0.5 });
  assert.ok(damaged.arcs.length > normal.arcs.length,
    charDef.label + ": hasar, kalkan ve yetenek çizimleri ek görsel durum üretmeli");
}
// Son mermi harcandığında silah seçimi değişse de atış ve geri tepme eski silahta kalmalı.
const { G, dom } = require("./harness");
const game = new G.Game(dom.document.createElement("canvas"));
game.selectedChars = G.CHARACTERS.slice(0, 2);
game.selectedMap = G.MAPS[0];
game.mode = "computer";
game.playerControls = ["human", "bot"];
game.startGame();
const shooter = game.active;
shooter.weapon = G.WEAPONS.findIndex(weapon => weapon.id === "sniper");
shooter.ammo.sniper = 1;
const origin = shooter.muzzle;
game.fire(0.6);
assert.equal(shooter.weaponSpec.id, "bazooka");
assert.equal(shooter.heldWeaponSpec.id, "sniper");
assert.ok(shooter.weaponRecoil > 0);
assert.equal(game.projectiles[0].x, origin.x);
assert.equal(game.projectiles[0].y, origin.y);
for (let i = 0; i < 15; i++) shooter.update(game.terrain);
assert.equal(shooter.weaponRecoil, 0);
assert.equal(shooter.heldWeaponSpec.id, "bazooka");
console.log("Robot iskeleti: 34 model, tüm silahlar, iki yön, 7 açı ve 3 geri tepme pozu geçti.");

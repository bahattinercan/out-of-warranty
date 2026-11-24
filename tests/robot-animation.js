/* robot-animation.js — Test suite for 34 robots full-body spritesheet animation system.
 *
 * Verifies:
 * 1. 34-character manifest coverage.
 * 2. 10 mandatory animation states and baseline frame counts per character.
 * 3. State resolution priority and transitions.
 * 4. Deterministic frame calculations (loop, one-shot clamping, walkPhase locking).
 * 5. Canvas vector rendering stays independent of optional raster artwork.
 *
 * Run: node tests/robot-animation.js
 */
const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const JS_DIR = path.join(__dirname, "..", "js");
const FILES = [
  "i18n.js", "version.js", "characters.js", "robot-animation-manifest.js",
  "robots.js", "weapons.js", "entity.js"
];

const sandbox = {
  console,
  Math,
  Date,
  assetImage: (id) => {
    if (id.startsWith("robots/") || id === "weapons/launcher") {
      return { id, naturalWidth: 512, naturalHeight: 512 };
    }
    return null;
  }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const bundle = FILES.map((f) => fs.readFileSync(path.join(JS_DIR, f), "utf8")).join("\n;\n") +
  "\n;globalThis.__A = { CHARACTERS, ROBOT_ANIMATIONS, ROBOT_ANIMATION_STATES, getRobotAnimationDef, resolveRobotAnimation, getRobotAnimationFrame, drawRobot, RB_VISUAL_SCALE };";

try {
  vm.runInContext(bundle, sandbox, { filename: "bundle-anim.js" });
} catch (e) {
  console.error("Failed to load animation test bundle:", e);
  process.exit(1);
}

const {
  CHARACTERS,
  ROBOT_ANIMATIONS,
  ROBOT_ANIMATION_STATES,
  getRobotAnimationDef,
  resolveRobotAnimation,
  getRobotAnimationFrame,
  drawRobot,
  RB_VISUAL_SCALE
} = sandbox.__A;

let totalChecks = 0;
let passedChecks = 0;

function check(desc, condition, detail) {
  totalChecks++;
  if (condition) {
    passedChecks++;
  } else {
    console.error(`FAIL: ${desc}` + (detail ? ` -> ${detail}` : ""));
    process.exitCode = 1;
  }
}

console.log("=== Robot Animation System Tests ===\n");

// ── 1. Roster & Manifest Coverage ──────────────────────────────────────────
check("CHARACTERS has exactly 34 robots", CHARACTERS.length === 34, `found ${CHARACTERS.length}`);
check("ROBOT_ANIMATIONS has 34 entries", Object.keys(ROBOT_ANIMATIONS).length === 34);

const MANDATORY_STATES = ["idle", "walk", "aim", "fire", "jump", "fall", "land", "hit", "skill", "death"];
const EXPECTED_FRAMES = {
  idle: 4,
  walk: 6,
  aim: 1,
  fire: 3,
  jump: 3,
  fall: 2,
  land: 3,
  hit: 3,
  skill: 3,
  death: 6
};

for (const charDef of CHARACTERS) {
  const anim = getRobotAnimationDef(charDef.id);
  check(`Manifest exists for ${charDef.id} (${charDef.label})`, anim !== null);
  if (!anim) continue;

  check(`${charDef.id} cell dimensions are valid positive integers`,
    anim.cellWidth > 0 && anim.cellHeight > 0);
  check(`${charDef.id} has groundContact and gripPoint anchors`,
    anim.groundContact && anim.groundContact.x != null && anim.groundContact.y != null &&
    anim.gripPoint && anim.gripPoint.x != null && anim.gripPoint.y != null);

  for (const st of MANDATORY_STATES) {
    const stDef = anim.states && anim.states[st];
    check(`${charDef.id} has mandatory state "${st}"`, !!stDef);
    if (stDef) {
      check(`${charDef.id} state "${st}" frame count matches target (${EXPECTED_FRAMES[st]})`,
        stDef.frames === EXPECTED_FRAMES[st],
        `got ${stDef.frames}, expected ${EXPECTED_FRAMES[st]}`);
    }
  }
}

// ── 2. State Priority & Resolution ──────────────────────────────────────────
// Priority: death > hit > skill > fire > land > air (jump/fall) > walk > aim > idle

// Death
check("resolveRobotAnimation: alive=false yields death",
  resolveRobotAnimation({ alive: false, visualHitTimer: 10, aim: 0.5 }) === "death");

// Hit
check("resolveRobotAnimation: visualHitTimer yields hit",
  resolveRobotAnimation({ alive: true, visualHitTimer: 0.1, aim: 0.5 }) === "hit");

// Skill
check("resolveRobotAnimation: skillPoseTimer yields skill",
  resolveRobotAnimation({ alive: true, skillPoseTimer: 0.2, aim: 0.5 }) === "skill");

// Fire
check("resolveRobotAnimation: weaponRecoil yields fire",
  resolveRobotAnimation({ alive: true, weaponRecoil: 0.3, aim: 0.5 }) === "fire");

// Land
check("resolveRobotAnimation: landTimer yields land",
  resolveRobotAnimation({ alive: true, onGround: true, motion: { landTimer: 0.2 } }) === "land");

// Airborne: Jump vs Fall
check("resolveRobotAnimation: onGround=false with vy < 0 yields jump",
  resolveRobotAnimation({ alive: true, onGround: false, vy: -5 }) === "jump");
check("resolveRobotAnimation: onGround=false with vy >= 0 yields fall",
  resolveRobotAnimation({ alive: true, onGround: false, vy: 2 }) === "fall");

// Walk
check("resolveRobotAnimation: walkAmp > 0.05 yields walk",
  resolveRobotAnimation({ alive: true, onGround: true, motion: { walkAmp: 0.5 } }) === "walk");
check("resolveRobotAnimation: vx > 0.2 yields walk",
  resolveRobotAnimation({ alive: true, onGround: true, motion: { vx: 1.5 } }) === "walk");

// Aim
check("resolveRobotAnimation: stationary with aim yields aim",
  resolveRobotAnimation({ alive: true, onGround: true, aim: 0.4 }) === "aim");

// Idle
check("resolveRobotAnimation: default resting yields idle",
  resolveRobotAnimation({ alive: true, onGround: true }) === "idle");

// ── 3. Frame Calculation Determinisim ───────────────────────────────────────
const sampleDef = getRobotAnimationDef("kopek");

// Loop wraps correctly
check("getRobotAnimationFrame: idle loops over 4 frames",
  getRobotAnimationFrame(sampleDef, "idle", { timeMs: 0 }) === 0 &&
  getRobotAnimationFrame(sampleDef, "idle", { timeMs: 200 }) === 1 &&
  getRobotAnimationFrame(sampleDef, "idle", { timeMs: 800 }) === 0);

// Distance-locked walkPhase
check("getRobotAnimationFrame: walk respects walkPhase",
  getRobotAnimationFrame(sampleDef, "walk", { motion: { walkPhase: 0 } }) === 0 &&
  getRobotAnimationFrame(sampleDef, "walk", { motion: { walkPhase: Math.PI } }) === 3);

// One-shot clamps at final frame
check("getRobotAnimationFrame: death clamps at frame 5 (6 frames total)",
  getRobotAnimationFrame(sampleDef, "death", { stateElapsedMs: 5000 }) === 5);

// ── 4. Fallback & Drawing Robustness ────────────────────────────────────────
function stubContext() {
  const calls = [];
  const target = {
    calls,
    save() { calls.push({ type: "save" }); },
    restore() { calls.push({ type: "restore" }); },
    translate(x, y) { calls.push({ type: "translate", x, y }); },
    scale(x, y) { calls.push({ type: "scale", x, y }); },
    rotate(a) { calls.push({ type: "rotate", a }); },
    drawImage(...args) { calls.push({ type: "drawImage", args }); }
  };
  return new Proxy(target, { get(object, key) { return key in object ? object[key] : () => {}; } });
}

// Fallback when hasSheet is false
const ctxFallback = stubContext();
const drawnFallback = drawRobot(ctxFallback, {
  charDef: CHARACTERS[0],
  cx: 100,
  cy: 200,
  facing: 1
});
check("drawRobot renders when hasSheet=false", drawnFallback === true);
const imageCalls = ctxFallback.calls.filter(c => c.type === "drawImage");
check("Vector rendering does not draw the robot raster asset", imageCalls.length === 0);

// Gameplay remains on vector rendering when a spritesheet is available
sampleDef.hasSheet = true;
sampleDef.sheetAsset = "robots/kopek"; // Re-use loaded image stub
const ctxAnim = stubContext();
const drawnAnim = drawRobot(ctxAnim, {
  charDef: CHARACTERS[0],
  cx: 100,
  cy: 200,
  facing: 1,
  aim: 0.5,
  timeMs: 250
});
check("drawRobot renders when hasSheet=true", drawnAnim === true);
const animDraws = ctxAnim.calls.filter(c => c.type === "drawImage");
check("Gameplay does not draw the spritesheet", animDraws.length === 0);
sampleDef.hasSheet = false; // reset flag

console.log(`\nResults: ${passedChecks} / ${totalChecks} passed.`);
if (passedChecks === totalChecks) {
  console.log("All robot animation tests passed! ✅");
} else {
  process.exit(1);
}

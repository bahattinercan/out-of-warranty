/* robot-animation-manifest.js — Full-body spritesheet animation manifest and state resolution.
 *
 * Provides frame definitions, timing, anchors, and state resolution for all 34 robots.
 * Adheres to zero-dependency classic script loading (<script>) for direct file:// compatibility.
 */

// Target frames per state (baseline contract):
// idle: 4, walk: 6, aim: 1, fire: 3, jump: 3, fall: 2, land: 3, hit: 3, skill: 3, death: 6
const ROBOT_ANIMATION_STATES = {
  idle:  { row: 0, frames: 4, fps: 5,  loop: true },
  walk:  { row: 1, frames: 6, fps: 8,  loop: true },
  aim:   { row: 2, frames: 1, fps: 1,  loop: false },
  fire:  { row: 3, frames: 3, fps: 12, loop: false, returnState: "aim" },
  jump:  { row: 4, frames: 3, fps: 12, loop: false, returnState: "fall" },
  fall:  { row: 5, frames: 2, fps: 6,  loop: true },
  land:  { row: 6, frames: 3, fps: 15, loop: false, returnState: "idle" },
  hit:   { row: 7, frames: 3, fps: 15, loop: false, returnState: "idle" },
  skill: { row: 8, frames: 3, fps: 10, loop: false, returnState: "idle" },
  death: { row: 9, frames: 6, fps: 10, loop: false, holdLastFrame: true }
};

const _ROBOT_IDS = [
  "kopek", "kedi", "ayi", "tavsan", "tilki",
  "panda", "kaplan", "timsah", "suaygiri", "koala",
  "kunduz", "ordek", "kokarca", "aslan", "kurtadam",
  "sirtlan", "rakun", "ornitorenk", "yeti", "dino",
  "gergedan", "kirpi", "maymun", "kanguru", "yarasa",
  "armadillo", "hamster", "bukalemun", "ejderha", "penguen",
  "oklukirpi", "sincap", "kus", "zurafa"
];

function _cloneStates() {
  const res = {};
  for (const k in ROBOT_ANIMATION_STATES) {
    res[k] = Object.assign({}, ROBOT_ANIMATION_STATES[k]);
  }
  return res;
}

const ROBOT_ANIMATIONS = {};

for (const id of _ROBOT_IDS) {
  ROBOT_ANIMATIONS[id] = {
    id: id,
    cellWidth: 256,
    cellHeight: 272,
    groundContact: { x: 128, y: 250 },
    gripPoint: { x: 168, y: 136 },
    muzzleOffset: { x: 192, y: 128 },
    facing: "mirror",
    hasSheet: true, // All 34 robots have verified full-body spritesheets
    sheetAsset: "robot-sheets/" + id,
    states: _cloneStates()
  };
}

/**
 * Retrieves the animation definition for a given robot id.
 * Returns null if not registered.
 */
function getRobotAnimationDef(charId) {
  if (!charId) return null;
  return ROBOT_ANIMATIONS[charId] || null;
}

/**
 * Resolves the current semantic animation state for an entity or drawing options.
 * Pure resolver: evaluates physics state, visual timers, and event signals.
 *
 * Priority order:
 * 1. death (alive === false)
 * 2. hit (visualHitTimer > 0 or motion.hit)
 * 3. skill (skillPoseTimer > 0 or motion.skillActive)
 * 4. fire (weaponRecoil > 0 or motion.fireActive)
 * 5. land (motion.landTimer > 0)
 * 6. jump / fall (onGround === false: vy < 0 -> jump, vy >= 0 -> fall)
 * 7. walk (walk amplitude > 0.05 or horizontal speed > 0.2)
 * 8. aim (aim angle is finite)
 * 9. idle (default baseline)
 */
function resolveRobotAnimation(entityOrOptions, timeMs) {
  const o = entityOrOptions || {};
  const motion = o.motion || o;

  // 1. Death
  if (o.alive === false || motion.alive === false) {
    return "death";
  }

  // 2. Hit
  if ((o.visualHitTimer && o.visualHitTimer > 0) ||
      (motion.visualHitTimer && motion.visualHitTimer > 0) ||
      (motion.hitTimer && motion.hitTimer > 0) ||
      motion.hit === true) {
    return "hit";
  }

  // 3. Skill
  if ((o.skillPoseTimer && o.skillPoseTimer > 0) ||
      (motion.skillPoseTimer && motion.skillPoseTimer > 0) ||
      motion.skillActive === true) {
    return "skill";
  }

  // 4. Fire
  if ((o.weaponRecoil && o.weaponRecoil > 0) ||
      (motion.weaponRecoil && motion.weaponRecoil > 0) ||
      (motion.fireTimer && motion.fireTimer > 0) ||
      motion.fireActive === true) {
    return "fire";
  }

  // 5. Land
  if (motion.landTimer && motion.landTimer > 0) {
    return "land";
  }

  // 6. Airborne: Jump vs Fall
  const onGround = motion.onGround !== undefined ? motion.onGround : (o.onGround !== undefined ? o.onGround : true);
  if (!onGround) {
    const vy = motion.vy !== undefined ? motion.vy : (o.vy !== undefined ? o.vy : 0);
    return vy < 0 ? "jump" : "fall";
  }

  // 7. Walk
  const walkAmp = Math.abs(motion.walkAmp != null ? motion.walkAmp : (motion.walk != null ? motion.walk : 0));
  const vx = Math.abs(motion.vx || 0);
  if (walkAmp > 0.05 || vx > 0.2) {
    return "walk";
  }

  // 8. Aim
  if (o.state === "aim" || motion.state === "aim" || o.aimActive === true ||
      (Number.isFinite(o.aim) && o.aiming !== false && motion.aiming !== false) ||
      (Number.isFinite(motion.aim) && o.aiming !== false && motion.aiming !== false)) {
    return "aim";
  }

  // 9. Idle default (alive and grounded baseline)
  return "idle";
}

/**
 * Calculates current frame index for a given state and timing context.
 */
function getRobotAnimationFrame(animDef, stateName, options) {
  if (!animDef || !animDef.states) return 0;
  const state = animDef.states[stateName] || animDef.states.idle;
  if (!state || !state.frames || state.frames <= 1) return 0;

  const motion = options.motion || options;
  const timeMs = Number.isFinite(options.timeMs) ? options.timeMs : (Number.isFinite(motion.timeMs) ? motion.timeMs : 0);

  if (stateName === "walk") {
    // Distance-locked walk phase if available
    if (Number.isFinite(motion.walkPhase)) {
      const normalizedPhase = ((motion.walkPhase % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
      return Math.floor((normalizedPhase / (Math.PI * 2)) * state.frames) % state.frames;
    }
  }

  // Time-based frame calculation
  const fps = state.fps || 8;
  const frameDurationMs = 1000 / fps;
  const stateElapsed = Number.isFinite(options.stateElapsedMs) ? options.stateElapsedMs : timeMs;
  const totalCycles = stateElapsed / frameDurationMs;

  if (state.loop) {
    return Math.floor(totalCycles) % state.frames;
  }

  // One-shot: clamp or hold last frame
  const clampedFrame = Math.min(state.frames - 1, Math.floor(totalCycles));
  return clampedFrame;
}

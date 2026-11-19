/* Her robotun görsel kaynağı ve anatomisi açıkça listelenir. Hareket aileleri
 * yalnız ortak hesap sunar; parça seçimi ve hedef ölçüler profil verisidir. */
const _RB_RIG_ANATOMY = {
  kopek: "wheels", kedi: "wheels", ayi: "tracks", tavsan: "spring", tilki: "legs",
  panda: "tracks", kaplan: "legs", timsah: "tracks", suaygiri: "tracks", koala: "wheels",
  kunduz: "wheels", ordek: "legs", kokarca: "wheels", aslan: "legs", kurtadam: "legs",
  sirtlan: "wheels", rakun: "ball", ornitorenk: "wheels", yeti: "tracks", dino: "legs",
  gergedan: "wheels", kirpi: "ball", maymun: "spring", kanguru: "spring", yarasa: "rotors",
  armadillo: "tracks", hamster: "ball", bukalemun: "legs", ejderha: "tracks", penguen: "wheels",
  oklukirpi: "tracks", sincap: "wheels", kus: "rotors", zurafa: "legs",
};

const _RB_RIG_ASSET = {
  kopek: { kind: "atlas", id: "robot-parts/fix8-parts-atlas", grid: [3, 3] },
  kedi: { kind: "parts", prefix: "robot-parts/kedi-art-" },
  ayi: { kind: "parts", prefix: "robot-parts/ayi-art-" },
  tavsan: { kind: "parts", prefix: "robot-parts/tavsan-art-" },
  tilki: { kind: "parts", prefix: "robot-parts/tilki-art-" },
  rakun: { kind: "parts", prefix: "robot-parts/rakun-art-" },
  yarasa: { kind: "parts", prefix: "robot-parts/yarasa-art-" },
  panda: { kind: "atlas", id: "robot-parts/panda-complete-parts", grid: [3, 3] },
  kaplan: { kind: "atlas", id: "robot-parts/kaplan-complete-parts", grid: [3, 3] },
  timsah: { kind: "atlas", id: "robot-parts/timsah-complete-parts", grid: [3, 3] },
  suaygiri: { kind: "atlas", id: "robot-parts/suaygiri-complete-parts", grid: [3, 3] },
  koala: { kind: "atlas", id: "robot-parts/koala-complete-parts", grid: [3, 3] },
  kunduz: { kind: "atlas", id: "robot-parts/kunduz-complete-parts", grid: [3, 3] },
  ordek: { kind: "atlas", id: "robot-parts/ordek-complete-parts", grid: [3, 3] },
  kokarca: { kind: "atlas", id: "robot-parts/kokarca-complete-parts", grid: [3, 3] },
  aslan: { kind: "atlas", id: "robot-parts/aslan-complete-parts", grid: [3, 3] },
  kurtadam: { kind: "atlas", id: "robot-parts/kurtadam-complete-parts", grid: [3, 3] },
  sirtlan: { kind: "atlas", id: "robot-parts/sirtlan-complete-parts", grid: [3, 3] },
  ornitorenk: { kind: "atlas", id: "robot-parts/ornitorenk-complete-parts", grid: [3, 3] },
  yeti: { kind: "atlas", id: "robot-parts/yeti-complete-parts", grid: [3, 3] },
  dino: { kind: "atlas", id: "robot-parts/dino-complete-parts", grid: [3, 3] },
  gergedan: { kind: "atlas", id: "robot-parts/gergedan-complete-parts", grid: [3, 3] },
  kirpi: { kind: "atlas", id: "robot-parts/kirpi-complete-parts", grid: [3, 3] },
  maymun: { kind: "atlas", id: "robot-parts/maymun-complete-parts", grid: [3, 3] },
  kanguru: { kind: "atlas", id: "robot-parts/kanguru-complete-parts", grid: [3, 3] },
  armadillo: { kind: "atlas", id: "robot-parts/armadillo-complete-parts", grid: [3, 3] },
  hamster: { kind: "atlas", id: "robot-parts/hamster-complete-parts", grid: [3, 3] },
  bukalemun: { kind: "atlas", id: "robot-parts/bukalemun-complete-parts", grid: [3, 3] },
  ejderha: { kind: "atlas", id: "robot-parts/ejderha-complete-parts", grid: [3, 3] },
  penguen: { kind: "atlas", id: "robot-parts/penguen-complete-parts", grid: [3, 3] },
  oklukirpi: { kind: "atlas", id: "robot-parts/oklukirpi-complete-parts", grid: [3, 3] },
  sincap: { kind: "atlas", id: "robot-parts/sincap-complete-parts", grid: [3, 3] },
  kus: { kind: "atlas", id: "robot-parts/kus-complete-parts", grid: [3, 3] },
  zurafa: { kind: "atlas", id: "robot-parts/zurafa-complete-parts", grid: [3, 3] },
};
const _RB_RIG_SOURCE_PARTS = {
  kopek: {
    "arm-upper": [1 / 3, 0, 1 / 3, 1 / 3], "arm-lower": [0, 1 / 3, 1 / 3, 1 / 3],
    "leg-upper": [2 / 3, 1 / 3, 1 / 3, 1 / 3], "leg-lower": [0, 2 / 3, 1 / 3, 1 / 3],
    pelvis: [1 / 3, 1 / 3, 1 / 3, 1 / 3], "wheel-near": [1 / 3, 2 / 3, 1 / 3, 1 / 3],
    "wheel-far": [2 / 3, 2 / 3, 1 / 3, 1 / 3],
  },
};

// Robot başına [kafa ölçeği, gövde genişliği, duruş genişliği, eklemli bacak
// genişliği, ayak genişliği]. Bu küçük ayarlar ortak anatomiye zorlamadan her
// modelin splash siluetini korur.
const _RB_RIG_SHAPE = {
  kopek: [0.92, 0.92, 0.94, 0.94, 0.95], kedi: [0.90, 0.90, 0.92, 0.88, 0.90],
  ayi: [0.88, 1.08, 1.10, 1.05, 1.05], tavsan: [1.02, 0.82, 0.82, 0.80, 0.90],
  tilki: [0.90, 0.92, 0.92, 0.88, 0.88], panda: [0.92, 1.06, 1.08, 1.06, 1.10],
  kaplan: [0.92, 0.96, 0.98, 0.94, 0.94], timsah: [0.86, 1.12, 1.10, 1.08, 1.04],
  suaygiri: [0.88, 1.12, 1.12, 1.08, 1.08], koala: [0.94, 0.90, 0.94, 0.88, 0.92],
  kunduz: [0.92, 0.98, 0.96, 0.92, 0.96], ordek: [0.94, 0.84, 0.86, 0.82, 0.84],
  kokarca: [0.90, 0.92, 0.92, 0.90, 0.92], aslan: [0.96, 1.02, 1.00, 0.98, 0.98],
  kurtadam: [0.90, 0.98, 0.98, 0.96, 0.94], sirtlan: [0.92, 0.90, 0.92, 0.88, 0.90],
  rakun: [0.94, 0.92, 0.94, 0.84, 0.90], ornitorenk: [0.88, 1.04, 1.02, 0.96, 0.98],
  yeti: [0.94, 1.08, 1.08, 1.04, 1.06], dino: [0.92, 1.08, 1.06, 1.06, 1.02],
  gergedan: [0.88, 1.10, 1.08, 1.02, 1.04], kirpi: [0.90, 0.96, 0.94, 0.82, 0.86],
  maymun: [0.94, 0.88, 0.88, 0.86, 0.90], kanguru: [1.00, 0.90, 0.92, 0.88, 0.94],
  yarasa: [0.94, 0.90, 0.88, 0.84, 0.88], armadillo: [0.92, 1.06, 1.06, 1.02, 1.02],
  hamster: [0.92, 0.94, 0.92, 0.82, 0.86], bukalemun: [0.90, 0.96, 0.94, 0.92, 0.90],
  ejderha: [0.94, 1.08, 1.08, 1.02, 1.02], penguen: [0.96, 0.96, 0.98, 0.90, 0.94],
  oklukirpi: [0.92, 0.96, 0.98, 0.94, 0.96], sincap: [0.96, 0.84, 0.86, 0.80, 0.86],
  kus: [0.90, 0.86, 0.82, 0.76, 0.78], zurafa: [0.90, 0.92, 0.90, 0.84, 0.86],
};
const _RB_RIG_FEATURES = {
  kopek: ["articulated-legs", "wheel-feet", "twin-ground-modules"],
  kedi: ["articulated-legs", "wheel-feet", "magnetic-frame"],
  ayi: ["tracked-undercarriage", "heavy-pelvis"],
  tavsan: ["articulated-legs", "spring-legs", "separate-toes"],
  tilki: ["articulated-legs", "separate-toes"],
  panda: ["tracked-undercarriage", "heavy-pelvis"], kaplan: ["articulated-legs", "separate-toes"],
  timsah: ["tracked-undercarriage", "long-chassis"], suaygiri: ["tracked-undercarriage", "heavy-pelvis"],
  koala: ["wheel-undercarriage"], kunduz: ["wheel-undercarriage"], ordek: ["articulated-legs", "separate-toes"],
  kokarca: ["wheel-undercarriage"], aslan: ["articulated-legs"], kurtadam: ["articulated-legs"],
  sirtlan: ["wheel-undercarriage"], rakun: ["rolling-ball"], ornitorenk: ["wheel-undercarriage"],
  yeti: ["tracked-undercarriage", "heavy-pelvis"], dino: ["articulated-legs", "heavy-pelvis"],
  gergedan: ["wheel-undercarriage", "heavy-pelvis"], kirpi: ["rolling-ball"], maymun: ["spring-legs"],
  kanguru: ["spring-legs"], yarasa: ["rotor-set", "hover-body"], armadillo: ["tracked-undercarriage", "heavy-pelvis"],
  hamster: ["rolling-ball"], bukalemun: ["articulated-legs"], ejderha: ["tracked-undercarriage", "heavy-pelvis"],
  penguen: ["wheel-undercarriage"], oklukirpi: ["tracked-undercarriage"], sincap: ["wheel-undercarriage"],
  kus: ["rotor-set", "hover-body"], zurafa: ["articulated-legs", "long-chassis"],
};
const _RB_RIG_ANCHORS = {
  kopek: { hipY: 0.31, pelvis: [-0.42, 0.10, 0.84, 0.38] },
  kedi: { hipY: 0.30, pelvis: [-0.42, 0.08, 0.84, 0.36] },
  ayi: { hipY: 0.35, pelvis: [-0.44, 0.10, 0.88, 0.42] },
  tavsan: { hipY: 0.32, pelvis: [-0.38, 0.08, 0.76, 0.40] },
  tilki: { hipY: 0.32, pelvis: [-0.40, 0.08, 0.80, 0.38] },
};

const _RB_RIG_CELL = (column, row) => [column / 3, row / 3, 1 / 3, 1 / 3];
function _rbAtlasPart(name, cell, target, layer, extra = {}) {
  return { name, source: _RB_RIG_CELL(cell[0], cell[1]), target, layer, ...extra };
}

function _rbAtlasRigParts(id, anatomy, shape) {
  const [head, torso, stance, leg, foot] = shape;
  const parts = [
    _rbAtlasPart("far-leg", [2, 1], [-0.31 * stance, 0.34, 0.36 * leg, 0.52], 10, { group: "legs" }),
    { name: "pelvis", source: null, target: [-0.34 * torso, 0.08, 0.68 * torso, 0.34], layer: 20, kind: "vector" },
    _rbAtlasPart("back-armor", [2, 0], [-0.46 * torso, -0.72, 0.92 * torso, 0.79], 25),
    _rbAtlasPart("torso", [1, 0], [-0.54 * torso, -0.82, 1.08 * torso, 0.98], 30),
    _rbAtlasPart("near-leg", [0, 2], [0.01 * stance, 0.34, 0.36 * leg, 0.52], 40, { group: "legs" }),
  ];
  if (anatomy === "tracks") {
    parts[0] = _rbAtlasPart("far-link", [2, 1], [-0.31 * stance, 0.36, 0.36 * leg, 0.45], 10, { group: "legs" });
    parts[4] = _rbAtlasPart("near-link", [0, 2], [0.01 * stance, 0.36, 0.36 * leg, 0.45], 40, { group: "legs" });
    parts.push(_rbAtlasPart("far-track", [1, 2], [-0.61 * stance, 0.52, 0.60 * stance, 0.39], 15, { group: "ground" }));
    parts.push(_rbAtlasPart("near-track", [2, 2], [0.01 * stance, 0.52, 0.60 * stance, 0.39], 45, { group: "ground" }));
  } else if (anatomy === "ball") {
    parts[0] = _rbAtlasPart("rolling-module-far", [1, 2], [-0.37 * stance, 0.43, 0.58 * stance, 0.48], 10, { group: "ground" });
    parts[4] = _rbAtlasPart("rolling-module-near", [2, 2], [-0.06 * stance, 0.43, 0.58 * stance, 0.48], 40, { group: "ground" });
    parts.splice(1, 1);
  } else if (anatomy === "rotors") {
    parts[0] = _rbAtlasPart("hover-module-far", [1, 2], [-0.46 * stance, 0.42, 0.62 * stance, 0.34], 10, { group: "hover" });
    parts[4] = _rbAtlasPart("hover-module-near", [2, 2], [-0.12 * stance, 0.42, 0.62 * stance, 0.34], 40, { group: "hover" });
    parts.splice(1, 1);
  } else if (anatomy === "wheels") {
    parts.push(_rbAtlasPart("far-wheel", [1, 2], [-0.42 * stance, 0.58, 0.68 * foot, 0.33], 15, { group: "ground", rotate: "roll" }));
    parts.push(_rbAtlasPart("near-wheel", [2, 2], [-0.02 * stance, 0.58, 0.68 * foot, 0.33], 45, { group: "ground", rotate: "roll" }));
  } else {
    parts.push(_rbAtlasPart("far-foot", [1, 2], [-0.36 * stance, 0.70, 0.52 * foot, 0.20], 15, { group: "ground" }));
    parts.push(_rbAtlasPart("near-foot", [2, 2], [-0.02 * stance, 0.70, 0.52 * foot, 0.20], 45, { group: "ground" }));
  }
  parts.push(
    _rbAtlasPart("front-arm", [0, 1], [0.39 * torso, -0.34, 0.48, 0.72], 55, { group: "weapon-arm", pivot: [0.5, 0.12] }),
    _rbAtlasPart("head", [0, 0], [-0.42 * head, -1.50, 0.84 * head, 0.94 * head], 70),
  );
  if (anatomy === "spring") {
    const lower = parts.find(part => part.name === "near-leg");
    if (lower) lower.group = "spring";
  }
  return parts;
}

function _rbFix8RigParts(shape) {
  const [head, torso, stance, leg, foot] = shape;
  return [
    _rbAtlasPart("far-leg", [2, 1], [-0.27 * stance, 0.31, 0.30 * leg, 0.38], 10, { group: "legs" }),
    _rbAtlasPart("far-wheel", [1, 2], [-0.42 * stance, 0.48, 0.62 * foot, 0.43], 15, { group: "ground", rotate: "roll" }),
    _rbAtlasPart("far-shin", [0, 2], [-0.25 * stance, 0.57, 0.23 * leg, 0.34], 18, { group: "legs" }),
    _rbAtlasPart("pelvis", [1, 1], [-0.40 * torso, 0.02, 0.80 * torso, 0.42], 20),
    _rbAtlasPart("body", [2, 0], [-0.52 * torso, -0.76, 1.04 * torso, 0.88], 30),
    _rbAtlasPart("near-wheel", [2, 2], [-0.02 * stance, 0.48, 0.62 * foot, 0.43], 35, { group: "ground", rotate: "roll" }),
    _rbAtlasPart("near-leg", [2, 1], [0.03 * stance, 0.31, 0.30 * leg, 0.38], 40, { group: "legs" }),
    _rbAtlasPart("near-shin", [0, 2], [0.17 * stance, 0.57, 0.23 * leg, 0.34], 45, { group: "legs" }),
    _rbAtlasPart("front-arm", [1, 0], [0.36 * torso, -0.30, 0.46, 0.70], 55, { group: "weapon-arm", pivot: [0.5, 0.12] }),
    _rbAtlasPart("head", [0, 0], [-0.42 * head, -1.50, 0.84 * head, 0.94 * head], 70),
  ];
}

function _rbArtRigParts(id, anatomy, asset) {
  const names = {
    kopek: ["head", "body", "arm-upper", "arm-lower", "pelvis", "leg-upper", "leg-lower", "wheel-near", "wheel-far"],
    kedi: ["head", "body", "arm-upper", "arm-lower", "arm-back-upper", "arm-back-lower", "pelvis", "leg-upper", "leg-lower", "wheel-foot"],
    ayi: ["head", "body", "arm-upper", "arm-lower", "arm-back-upper", "arm-back-lower", "pelvis", "track-near", "track-far"],
    tavsan: ["head", "body", "arm-upper", "arm-lower", "arm-back-upper", "arm-back-lower", "pelvis", "leg-upper", "leg-lower", "foot-near", "foot-far"],
    tilki: ["head", "body", "arm-upper", "arm-lower", "arm-back-upper", "arm-back-lower", "pelvis", "leg-upper", "leg-lower", "foot-near", "foot-far"],
    rakun: ["head", "body", "arm-upper", "arm-lower", "arm-back-upper", "arm-back-lower", "pelvis", "ball-near", "ball-far"],
    yarasa: ["head", "body", "arm-upper", "arm-lower", "arm-back-upper", "arm-back-lower", "pelvis", "rotor-near", "rotor-far"],
  }[id];
  const targets = {
    head: [-0.5, -1.6, 1, 0.95], body: [-0.65, -0.82, 1.3, 0.98],
    "arm-upper": [0.34, -0.35, 0.4, 0.48], "arm-lower": [0.45, -0.04, 0.34, 0.4],
    "arm-back-upper": [-0.48, -0.35, 0.4, 0.48], "arm-back-lower": [-0.55, -0.02, 0.34, 0.4],
    pelvis: [-0.42, 0.02, 0.84, 0.50], "leg-upper": [-0.34, 0.38, 0.34, 0.36],
    "leg-lower": [-0.31, 0.61, 0.32, 0.30], "foot-near": [-0.02, 0.76, 0.48, 0.15],
    "foot-far": [-0.40, 0.76, 0.48, 0.15], "wheel-foot": [-0.08, 0.62, 0.56, 0.29],
    "wheel-near": [-0.1, 0.62, 0.56, 0.29], "wheel-far": [-0.44, 0.62, 0.56, 0.29],
    "track-near": [0.02, 0.52, 0.63, 0.37], "track-far": [-0.62, 0.52, 0.63, 0.37],
    "ball-near": [-0.15, 0.56, 0.56, 0.35], "ball-far": [-0.38, 0.56, 0.56, 0.35],
    "rotor-near": [0.13, 0.12, 0.62, 0.22], "rotor-far": [-0.75, 0.12, 0.62, 0.22],
  };
  return names.map((name, index) => ({ name, source: [0, 0, 1, 1], asset: asset.prefix + name,
    target: targets[name], layer: index * 10, group: ["track-near", "track-far", "wheel-near", "wheel-far",
      "wheel-foot", "ball-near", "ball-far", "rotor-near", "rotor-far", "foot-near", "foot-far"].includes(name) ? "ground" : "body" }));
}

const ROBOT_RIG_PROFILES = Object.create(null);
for (const charDef of CHARACTERS) {
  const asset = _RB_RIG_ASSET[charDef.id];
  const anatomy = _RB_RIG_ANATOMY[charDef.id];
  const shape = _RB_RIG_SHAPE[charDef.id];
  if (!asset || !anatomy || !shape) throw new Error("Robot rig profili eksik: " + charDef.id);
  const groundY = anatomy === "rotors" ? 0.76 : anatomy === "ball" ? 0.91 : 0.91;
  const parts = asset.kind === "atlas"
    ? charDef.id === "kopek" ? _rbFix8RigParts(shape) : _rbAtlasRigParts(charDef.id, anatomy, shape)
    : _rbArtRigParts(charDef.id, anatomy, asset);
  ROBOT_RIG_PROFILES[charDef.id] = {
    id: charDef.id,
    anatomy,
    asset: { ...asset },
    sourceParts: _RB_RIG_SOURCE_PARTS[charDef.id] || null,
    groundContact: { kind: anatomy === "rotors" ? "hover" : "surface", y: groundY },
    parts,
    weaponPose: { shoulder: [0.36 * shape[1], -0.38], visibleArm: "front" },
    anchors: { hipSpread: charDef.id === "kopek" ? 0.42 : 0.36,
      hipY: (_RB_RIG_ANCHORS[charDef.id] || {}).hipY || 0.38,
      pelvis: (_RB_RIG_ANCHORS[charDef.id] || {}).pelvis || [-0.42, 0.12, 0.84, 0.42], groundY },
    features: _RB_RIG_FEATURES[charDef.id],
    upperBodyOffset: charDef.id === "kopek" ? -0.55 : 0,
    layout: { head: shape[0], bodyWidth: shape[1], stance: shape[2], legWidth: shape[3], footWidth: shape[4] },
  };
}

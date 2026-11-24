/* FIX-8 cutout rig data. Atlas rects are written by tools/rig-pack.py. */
var ROBOT_RIGS = typeof ROBOT_RIGS !== "undefined" ? ROBOT_RIGS : {};
ROBOT_RIGS.kopek = {
  version: 1,
  atlas: "robot-rigs/kopek",
  unit: 256,
  groundY: 265,
  wheelRadius: 19,
  bones: [
    { id: "root", parent: null, x: 110, y: 160 },
    { id: "pelvis", parent: "root", x: 0, y: 0 },
    { id: "torso", parent: "pelvis", x: -2.5, y: -7.5 },
    { id: "neck", parent: "torso", x: 5, y: -42.5 },
    { id: "head", parent: "neck", x: 0, y: -11 },
    { id: "antenna", parent: "head", x: -59.5, y: -51 },
    { id: "backpack", parent: "torso", x: -43.5, y: -45 },
    { id: "upperArm_B", parent: "torso", x: -37.5, y: -37.5 },
    { id: "foreArm_B", parent: "upperArm_B", x: -17.5, y: 26 },
    { id: "hand_B", parent: "foreArm_B", x: -7.5, y: 29 },
    { id: "upperArm_F", parent: "torso", x: 36.5, y: -41.5 },
    { id: "foreArm_F", parent: "upperArm_F", x: 6, y: 33 },
    { id: "hand_F", parent: "foreArm_F", x: 9, y: 17 },
    { id: "weapon", parent: "hand_F", x: 2, y: 0 },
    { id: "prop_welder", parent: "hand_B", x: 114, y: -9 },
    { id: "thigh_B", parent: "pelvis", x: -27.5, y: 5 },
    { id: "shin_B", parent: "thigh_B", x: -7.5, y: 31 },
    { id: "wheelHousing_B", parent: "shin_B", x: -5, y: 24 },
    { id: "wheel_B", parent: "wheelHousing_B", x: -5, y: 27 },
    { id: "thigh_F", parent: "pelvis", x: 15, y: 7.5 },
    { id: "shin_F", parent: "thigh_F", x: 15, y: 28.5 },
    { id: "wheelHousing_F", parent: "shin_F", x: 0, y: 24 },
    { id: "wheel_F", parent: "wheelHousing_F", x: -2.5, y: 27 }
  ],
  parts: {
    antenna: { bone: "antenna", pivot: [15, 36], origin: [-15, -36] },
    head: { bone: "head", pivot: [61, 69], origin: [-61, -69] },
    visor_glow: { bone: "head", pivot: [51, 38], origin: [-51, -38] },
    neck: { bone: "neck", pivot: [15.5, 15], origin: [-15.5, -15] },
    backpack: { bone: "backpack", pivot: [38.5, 27.5], origin: [-38.5, -27.5] },
    torso: { bone: "torso", pivot: [41.5, 56], origin: [-41.5, -56] },
    pelvis: { bone: "pelvis", pivot: [18, 11], origin: [-18, -11] },
    upperArm_B: { bone: "upperArm_B", pivot: [25.5, 16.5], origin: [-25.5, -16.5] },
    foreArm_B: { bone: "foreArm_B", pivot: [27.5, 8], origin: [-27.5, -8] },
    hand_B: { bone: "hand_B", pivot: [17.5, 15], origin: [-17.5, -15] },
    upperArm_F: { bone: "upperArm_F", pivot: [16, 11.5], origin: [-16, -11.5] },
    foreArm_F: { bone: "foreArm_F", pivot: [10, 10], origin: [-10, -10] },
    hand_F_grip: { bone: "hand_F", pivot: [0, 19], origin: [0, -19] },
    prop_welder: { bone: "prop_welder", pivot: [15, 45], origin: [-15, -45] },
    thigh_B: { bone: "thigh_B", pivot: [23, 10], origin: [-23, -10] },
    shin_B: { bone: "shin_B", pivot: [23, 11], origin: [-23, -11] },
    wheelHousing_B: { bone: "wheelHousing_B", pivot: [36, 8.5], origin: [-36, -8.5] },
    wheel_B: { bone: "wheel_B", pivot: [21, 22], origin: [-21, -22] },
    thigh_F: { bone: "thigh_F", pivot: [17, 14], origin: [-17, -14] },
    shin_F: { bone: "shin_F", pivot: [24.5, 10.5], origin: [-24.5, -10.5] },
    wheelHousing_F: { bone: "wheelHousing_F", pivot: [34.5, 8.5], origin: [-34.5, -8.5] },
    wheel_F: { bone: "wheel_F", pivot: [22.5, 22], origin: [-22.5, -22] }
  },
  // GENERATED ATLAS START
  atlasSize: [1013, 112],
  rects: {"head":[0,0,122,80],"prop_welder":[124,0,82,74],"torso":[208,0,89,58],"backpack":[299,0,54,55],"upperArm_B":[355,0,36,51],"upperArm_F":[393,0,36,51],"thigh_B":[431,0,36,47],"hand_B":[469,0,138,46],"thigh_F":[609,0,38,45],"foreArm_B":[649,0,44,44],"antenna":[695,0,20,40],"wheelHousing_B":[717,0,54,38],"shin_F":[773,0,39,37],"wheelHousing_F":[814,0,56,36],"pelvis":[872,0,49,36],"shin_B":[923,0,39,36],"wheel_F":[964,0,49,28],"wheel_B":[0,82,48,28],"foreArm_F":[50,82,17,26],"hand_F_grip":[69,82,22,19],"neck":[93,82,33,18],"visor_glow":[128,82,8,11]},
  // GENERATED ATLAS END
  // GENERATED ORIGINS START
  origins: {"antenna":[-15.0,-36.0],"head":[-72.5,-77.0],"visor_glow":[0,0],"neck":[-16.0,-15.0],"backpack":[-38.0,-26.0],"torso":[-46.5,-53.0],"pelvis":[-30.5,-10.5],"upperArm_B":[-20.5,-13.0],"foreArm_B":[-32.0,-7.0],"hand_B":[-21.0,-12.0],"upperArm_F":[-18.0,-10.0],"foreArm_F":[-4.0,-5.0],"hand_F_grip":[0,-9.5],"prop_welder":[-7.5,-43.5],"thigh_B":[-21.0,-12.5],"shin_B":[-21.5,-9.0],"wheelHousing_B":[-33.5,-7.0],"wheel_B":[-23.5,-10.0],"thigh_F":[-13.0,-13.0],"shin_F":[-21.5,-9.5],"wheelHousing_F":[-30.5,-6.0],"wheel_F":[-23.0,-10.0]},
  // GENERATED ORIGINS END
  drawOrder: [
    "upperArm_B", "foreArm_B", "hand_B", "thigh_B", "shin_B", "wheelHousing_B", "wheel_B",
    "backpack", "pelvis", "torso", "neck", "head", "visor_glow", "antenna",
    "thigh_F", "shin_F", "wheelHousing_F", "wheel_F", "weapon", "upperArm_F", "foreArm_F", "hand_F_grip", "prop_welder"
  ],
  sockets: {
    weaponGrip: { bone: "hand_F", x: 4, y: 0 },
    contact_B: { bone: "wheel_B", x: 0, y: 19 },
    contact_F: { bone: "wheel_F", x: 0, y: 19 },
    muzzle: { bone: "weapon", x: 39, y: 0 }
  },
  clips: {
    idle: { loop: true, duration: 1600, tracks: {
      pelvis: { y: [[0,0],[800,2],[1600,0]] }, torso: { rot: [[0,0],[800,-1.5],[1600,0]] },
      head: { rot: [[0,0],[900,2],[1600,0]] }, upperArm_B: { rot: [[0,0],[800,4],[1600,0]] },
      foreArm_B: { rot: [[0,0],[900,6],[1600,0]] }, thigh_B: { rot: [[0,4],[1600,4]] }, thigh_F: { rot: [[0,-4],[1600,-4]] },
      shin_B: { rot: [[0,6],[800,9],[1600,6]] }, shin_F: { rot: [[0,6],[800,9],[1600,6]] }
    } },
    walk: { loop: true, duration: 600, phaseDriven: true, tracks: {
      thigh_F: { rot: [[0,-22],[300,22],[600,-22]] }, thigh_B: { rot: [[0,22],[300,-22],[600,22]] },
      shin_F: { rot: [[0,10],[150,35],[300,10],[600,10]] }, shin_B: { rot: [[0,10],[300,10],[450,35],[600,10]] },
      pelvis: { y: [[0,0],[150,-3],[300,0],[450,-3],[600,0]] }, torso: { rot: [[0,-7],[300,-5],[600,-7]] },
      upperArm_B: { rot: [[0,18],[300,-18],[600,18]] }, foreArm_B: { rot: [[0,10],[300,25],[600,10]] },
      head: { rot: [[0,1],[300,-1],[600,1]] }, wheelHousing_B: { rot: [[0,9.6],[300,9.6],[600,9.6]] },
      wheelHousing_F: { rot: [[0,9.6],[300,-25.6],[600,9.6]] }
    } },
    aim: { loop: false, duration: 1, tracks: { pelvis:{y:[[0,2]]}, thigh_F:{rot:[[0,-10]]}, thigh_B:{rot:[[0,10]]}, shin_F:{rot:[[0,12]]}, shin_B:{rot:[[0,12]]} } },
    fire: { loop:false, duration:250, tracks: {
      weapon:{x:[[0,0],[40,-8,"out"],[250,0]]}, foreArm_F:{rot:[[0,0],[40,-15,"out"],[250,0]]},
      torso:{rot:[[0,0],[50,5,"out"],[250,0]]}, pelvis:{x:[[0,0],[60,-2,"out"],[250,0]]}, head:{rot:[[0,0],[60,4,"out"],[250,0]]}
    } },
    jump: { loop:false, duration:300, tracks: {
      shin_F:{rot:[[0,45],[100,0],[180,60],[300,60]]}, shin_B:{rot:[[0,45],[100,0],[180,60],[300,60]]},
      thigh_F:{rot:[[0,-15],[100,0],[180,-25],[300,-25]]}, thigh_B:{rot:[[0,-15],[100,0],[180,-25],[300,-25]]},
      pelvis:{y:[[0,8],[100,-6],[180,-6],[300,-6]]}, upperArm_B:{rot:[[0,20],[100,-40],[300,-40]]}
    } },
    fall: { loop:true, duration:400, tracks: {
      thigh_F:{rot:[[0,-10],[400,-10]]}, thigh_B:{rot:[[0,15],[400,15]]},
      shin_F:{rot:[[0,20],[200,28],[400,20]]}, shin_B:{rot:[[0,20],[200,28],[400,20]]},
      upperArm_B:{rot:[[0,-55],[400,-55]]}, torso:{rot:[[0,-4],[400,-4]]}
    } },
    land: { loop:false, duration:250, tracks: {
      shin_F:{rot:[[0,10],[60,50],[140,0],[250,6]]}, shin_B:{rot:[[0,10],[60,50],[140,0],[250,6]]},
      thigh_F:{rot:[[0,-4],[60,-20],[140,0],[250,-4]]}, thigh_B:{rot:[[0,4],[60,-20],[140,0],[250,4]]},
      pelvis:{y:[[0,0],[60,8],[140,-2],[250,0]]},torso:{rot:[[0,0],[60,4],[140,0],[250,0]]},head:{rot:[[0,0],[60,-3],[140,0],[250,0]]}
    } },
    hit: { loop:false, duration:300, tracks: {
      head:{rot:[[0,0],[60,12],[180,-3],[300,0]]},torso:{rot:[[0,0],[60,10],[180,-3],[300,0]]},
      pelvis:{x:[[0,0],[60,-4],[180,1],[300,0]]},upperArm_B:{rot:[[0,0],[60,-30],[180,8],[300,0]]}
    } },
    skill: { loop:false, duration:600, tracks: {
      upperArm_B:{rot:[[0,0],[150,-70],[250,20],[450,20],[600,0]]},foreArm_B:{rot:[[0,0],[150,-60],[250,-80],[450,-80],[600,0]]},
      torso:{rot:[[0,0],[150,-4],[300,3],[450,3],[600,0]]},prop_welder:{x:[[0,-114],[150,0],[450,0],[600,-114]],y:[[0,9],[150,0],[450,0],[600,9]]},
      weapon:{rot:[[0,0],[150,20],[450,20],[600,0]]},
      prop_welder:{rot:[[0,0],[150,-56],[450,-56],[600,0]]}
    },events:[{at:150,name:"welderOn"},{at:450,name:"welderOff"}] },
    death: { loop:false, duration:900, tracks: {
      torso:{rot:[[0,0],[120,6],[300,6],[550,-8],[900,-8]]},
      shin_F:{rot:[[0,0],[120,0],[300,50],[550,50],[900,50]]},shin_B:{rot:[[0,0],[120,0],[300,50],[550,50],[900,50]]},
      thigh_F:{rot:[[0,-4],[300,-30],[550,-30],[900,-30]]},thigh_B:{rot:[[0,4],[300,-30],[550,-30],[900,-30]]},
      pelvis:{y:[[0,0],[120,0],[300,10],[550,4],[700,0],[900,0]]},head:{rot:[[0,0],[300,-10],[550,-10],[900,-10]]},
      root:{rot:[[0,0],[300,0],[450,-80],[900,-80]]},
      weapon:{x:[[0,0],[300,0],[550,40],[900,60]],y:[[0,0],[300,0],[550,36],[900,85]],rot:[[0,0],[300,0],[550,50],[900,20]]}
    } }
  }
};

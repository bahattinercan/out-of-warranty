/* Source-specific cutout rig for the Kaplan heavy-saw robot. */
var ROBOT_RIGS = typeof ROBOT_RIGS !== "undefined" ? ROBOT_RIGS : {};
ROBOT_RIGS.kaplan = {
  version: 1,
  atlas: "robot-rigs/kaplan",
  unit: 256,
  groundY: 129,
  wheelRadius: 1,
  bones: [
    { id:"root", parent:null, x:128, y:0 },
    { id:"pelvis", parent:"root", x:-7.5, y:-1.5 },
    { id:"torso", parent:"pelvis", x:1.5, y:-13.5 },
    { id:"neck", parent:"torso", x:4.5, y:-50.5 },
    { id:"head", parent:"neck", x:2.5, y:-6.5 },
    { id:"backpack", parent:"torso", x:-49.5, y:-37.5 },
    { id:"upperArm_B", parent:"torso", x:-30.5, y:-38.5 },
    { id:"foreArm_B", parent:"upperArm_B", x:-19.5, y:25.5 },
    { id:"hand_B", parent:"foreArm_B", x:-22.5, y:14 },
    { id:"saw_B", parent:"hand_B", x:-4.5, y:32 },
    { id:"upperArm_F", parent:"torso", x:30.5, y:-27.5 },
    { id:"foreArm_F", parent:"upperArm_F", x:15.5, y:26.5 },
    { id:"hand_F", parent:"foreArm_F", x:27.5, y:18 },
    { id:"saw_F", parent:"hand_F", x:14.5, y:15.5 },
    { id:"thigh_B", parent:"pelvis", x:-17, y:10 },
    { id:"shin_B", parent:"thigh_B", x:-11.5, y:32 },
    { id:"ankle_B", parent:"shin_B", x:-13, y:46.5 },
    { id:"foot_B", parent:"ankle_B", x:-2, y:20 },
    { id:"thigh_F", parent:"pelvis", x:13, y:11.5 },
    { id:"shin_F", parent:"thigh_F", x:10.5, y:31.5 },
    { id:"ankle_F", parent:"shin_F", x:8, y:46.5 },
    { id:"foot_F", parent:"ankle_F", x:8.5, y:18.5 }
  ],
  parts: {
    head:{bone:"head"}, neck:{bone:"neck"}, backpack:{bone:"backpack"}, torso:{bone:"torso"}, pelvis:{bone:"pelvis"},
    upperArm_B:{bone:"upperArm_B"}, foreArm_B:{bone:"foreArm_B"}, hand_B:{bone:"hand_B"}, saw_B:{bone:"saw_B"},
    upperArm_F:{bone:"upperArm_F"}, foreArm_F:{bone:"foreArm_F"}, hand_F:{bone:"hand_F"}, saw_F:{bone:"saw_F"},
    thigh_B:{bone:"thigh_B"}, shin_B:{bone:"shin_B"}, ankle_B:{bone:"ankle_B"}, foot_B:{bone:"foot_B"},
    thigh_F:{bone:"thigh_F"}, shin_F:{bone:"shin_F"}, ankle_F:{bone:"ankle_F"}, foot_F:{bone:"foot_F"}
  },
  atlasSize: [512, 274],
  rects: {"ankle_B":[0,0,85,51],"ankle_F":[87,0,50,46],"backpack":[139,0,73,82],"foot_B":[214,0,69,46],"foot_F":[285,0,83,53],"foreArm_B":[370,0,32,34],"foreArm_F":[404,0,45,43],"hand_B":[451,0,54,44],"hand_F":[0,84,77,98],"head":[79,84,68,55],"neck":[149,84,40,26],"pelvis":[191,84,50,28],"saw_B":[243,84,64,64],"saw_F":[309,84,71,81],"shin_B":[382,84,58,64],"shin_F":[442,84,41,72],"thigh_B":[0,184,46,50],"thigh_F":[48,184,40,52],"torso":[90,184,83,72],"upperArm_B":[175,184,34,52],"upperArm_F":[211,184,84,90]},
  origins: {"ankle_B":[-51.0,-31.0],"ankle_F":[-27.0,-25.5],"backpack":[-57.0,-55.5],"foot_B":[-27.0,-11.5],"foot_F":[-41.5,-24.0],"foreArm_B":[-16.5,-4.5],"foreArm_F":[-22.5,-14.5],"hand_B":[-29.0,-19.5],"hand_F":[-26.0,-67.0],"head":[-29.5,-47.0],"neck":[-23.5,-15.0],"pelvis":[-23.5,-13.5],"saw_B":[-34.5,-17.5],"saw_F":[-30.5,-30.5],"shin_B":[-35.5,-19.0],"shin_F":[-21.0,-22.0],"thigh_B":[-30.0,-17.5],"thigh_F":[-15.5,-17.5],"torso":[-39.5,-56.5],"upperArm_B":[-15.0,-34.5],"upperArm_F":[-2.5,-70.0]},
  drawOrder: ["thigh_B","shin_B","ankle_B","foot_B","backpack","upperArm_B","foreArm_B","hand_B","saw_B","pelvis","torso","neck","head","thigh_F","shin_F","ankle_F","foot_F","upperArm_F","foreArm_F","hand_F","saw_F"],
  sockets: { contact_B:{bone:"foot_B",x:0,y:21.5}, contact_F:{bone:"foot_F",x:0,y:23.5} },
  clips: {
    idle:{loop:true,duration:1600,tracks:{pelvis:{y:[[0,0],[800,1],[1600,0]]},torso:{rot:[[0,0],[800,-1],[1600,0]]},head:{rot:[[0,0],[800,2],[1600,0]]},thigh_B:{rot:[[0,2],[1600,2]]},thigh_F:{rot:[[0,-2],[1600,-2]]},shin_B:{rot:[[0,2],[800,5],[1600,2]]},shin_F:{rot:[[0,2],[800,5],[1600,2]]}}},
    walk:{loop:true,duration:700,phaseDriven:true,tracks:{thigh_F:{rot:[[0,-24],[350,24],[700,-24]]},thigh_B:{rot:[[0,24],[350,-24],[700,24]]},shin_F:{rot:[[0,6],[175,31],[350,6],[700,6]]},shin_B:{rot:[[0,6],[350,6],[525,31],[700,6]]},ankle_F:{rot:[[0,4],[350,-3],[700,4]]},ankle_B:{rot:[[0,-3],[350,4],[700,-3]]},pelvis:{y:[[0,0],[175,-2],[350,0],[525,-2],[700,0]]},upperArm_B:{rot:[[0,7],[350,-7],[700,7]]}}},
    aim:{loop:false,duration:1,tracks:{thigh_B:{rot:[[0,3]]},thigh_F:{rot:[[0,-3]]},shin_B:{rot:[[0,4]]},shin_F:{rot:[[0,4]]}}},
    fire:{loop:false,duration:240,tracks:{torso:{rot:[[0,0],[45,4,"out"],[240,0]]},pelvis:{x:[[0,0],[50,-1],[240,0]]},upperArm_F:{rot:[[0,0],[45,-10,"out"],[240,0]]},saw_F:{rot:[[0,0],[45,-7,"out"],[240,0]]}}},
    jump:{loop:false,duration:320,tracks:{thigh_B:{rot:[[0,-12],[110,18],[320,18]]},thigh_F:{rot:[[0,-12],[110,18],[320,18]]},shin_B:{rot:[[0,38],[110,4],[320,4]]},shin_F:{rot:[[0,38],[110,4],[320,4]]},pelvis:{y:[[0,0],[100,-7],[320,-7]]},upperArm_B:{rot:[[0,0],[120,-28],[320,-28]]}}},
    fall:{loop:true,duration:400,tracks:{torso:{rot:[[0,-4],[400,-4]]},thigh_B:{rot:[[0,-15],[400,-15]]},thigh_F:{rot:[[0,15],[400,15]]},shin_B:{rot:[[0,20],[200,27],[400,20]]},shin_F:{rot:[[0,20],[200,27],[400,20]]},upperArm_B:{rot:[[0,-24],[400,-24]]}}},
    land:{loop:false,duration:260,tracks:{pelvis:{y:[[0,0],[55,7],[140,-2],[260,0]]},thigh_B:{rot:[[0,0],[55,-15],[140,0],[260,0]]},thigh_F:{rot:[[0,0],[55,-15],[140,0],[260,0]]},shin_B:{rot:[[0,4],[55,36],[140,4],[260,4]]},shin_F:{rot:[[0,4],[55,36],[140,4],[260,4]]},torso:{rot:[[0,0],[55,3],[140,0],[260,0]]}}},
    hit:{loop:false,duration:300,tracks:{head:{rot:[[0,0],[60,10],[180,-3],[300,0]]},torso:{rot:[[0,0],[60,8],[180,-2],[300,0]]},pelvis:{x:[[0,0],[60,-3],[180,1],[300,0]]},upperArm_B:{rot:[[0,0],[60,-22],[180,8],[300,0]]}}},
    skill:{loop:false,duration:600,tracks:{upperArm_B:{rot:[[0,0],[150,-35],[300,-35],[600,0]]},foreArm_B:{rot:[[0,0],[150,-25],[300,-25],[600,0]]},saw_B:{rot:[[0,0],[150,-12],[300,-12],[600,0]]},torso:{rot:[[0,0],[150,-3],[450,-3],[600,0]]}}},
    death:{loop:false,duration:900,tracks:{torso:{rot:[[0,0],[150,5],[380,8],[650,80],[900,80]]},head:{rot:[[0,0],[380,-8],[650,-35],[900,-35]]},pelvis:{y:[[0,0],[300,0],[520,8],[900,8]]},thigh_B:{rot:[[0,0],[350,-16],[600,-55],[900,-55]]},thigh_F:{rot:[[0,0],[350,15],[600,-40],[900,-40]]},shin_B:{rot:[[0,4],[450,35],[900,35]]},shin_F:{rot:[[0,4],[450,35],[900,35]]},upperArm_B:{rot:[[0,0],[300,-25],[600,-55],[900,-55]]}}}
  }
};

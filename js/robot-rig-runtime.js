/* Cutout rig pose evaluation and Canvas 2D rendering. Classic-script / file:// safe. */
var _ROBOT_RIG_ANIM = new WeakMap();
var _ROBOT_RIG_TAU = Math.PI * 2;

function getRobotRig(id) {
  return typeof ROBOT_RIGS !== "undefined" && ROBOT_RIGS[id] ? ROBOT_RIGS[id] : null;
}

function robotRigReady(id) {
  var rig = getRobotRig(id);
  return !!(rig && rig.rects && typeof assetImage === "function" && assetImage(rig.atlas));
}

function _rigClipTime(clip, options, stateStartMs) {
  var time = Number.isFinite(options.timeMs) ? options.timeMs : 0;
  var elapsed = Math.max(0, time - stateStartMs);
  if (clip.phaseDriven && options.motion && Number.isFinite(options.motion.walkPhase)) {
    elapsed = ((options.motion.walkPhase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) * clip.duration / (Math.PI * 2);
  }
  if (clip.loop && clip.duration > 0) elapsed %= clip.duration;
  else elapsed = Math.min(elapsed, clip.duration || 0);
  return elapsed;
}

function _rigSampleTrack(keys, time, loop, duration) {
  if (!keys || !keys.length) return 0;
  if (keys.length === 1 || time <= keys[0][0]) return keys[0][1];
  for (var i = 1; i < keys.length; i++) {
    var b = keys[i], a = keys[i - 1];
    if (time <= b[0]) {
      var span = b[0] - a[0];
      var t = span > 0 ? (time - a[0]) / span : 0;
      var easing = b[2] || "linear";
      if (easing === "in") t *= t;
      else if (easing === "out") t = 1 - (1 - t) * (1 - t);
      else if (easing === "inout") t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      else if (easing === "step") t = 0;
      var av = a[1], bv = b[1];
      return av + (bv - av) * t;
    }
  }
  return loop && duration > 0 ? keys[0][1] : keys[keys.length - 1][1];
}

function _rigCompose(parent, x, y, rot) {
  var c = Math.cos(parent.rot), s = Math.sin(parent.rot);
  return { x: parent.x + x * c - y * s, y: parent.y + x * s + y * c, rot: parent.rot + rot };
}

function _rigBuildPose(rig, locals) {
  var world = new Map();
  for (var i = 0; i < rig.bones.length; i++) {
    var bone = rig.bones[i], local = locals.get(bone.id);
    var pose = bone.parent ? _rigCompose(world.get(bone.parent), bone.x + local.x, bone.y + local.y, local.rot) :
      { x: bone.x + local.x, y: bone.y + local.y, rot: local.rot };
    world.set(bone.id, pose);
  }
  return world;
}

function _rigWorldBounds(rig, bones) {
  var bounds={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};
  Object.keys(rig.parts).forEach(function(id){
    var part=rig.parts[id],rect=rig.rects[id],bone=part&&bones.get(part.bone);
    if(!part||!rect||!bone)return;
    var origin=rig.origins[id]||part.origin||[0,0],c=Math.cos(bone.rot),s=Math.sin(bone.rot);
    [[origin[0],origin[1]],[origin[0]+rect[2],origin[1]],[origin[0],origin[1]+rect[3]],[origin[0]+rect[2],origin[1]+rect[3]]].forEach(function(p){
      var x=bone.x+p[0]*c-p[1]*s,y=bone.y+p[0]*s+p[1]*c;
      bounds.minX=Math.min(bounds.minX,x);bounds.minY=Math.min(bounds.minY,y);
      bounds.maxX=Math.max(bounds.maxX,x);bounds.maxY=Math.max(bounds.maxY,y);
    });
  });
  return bounds;
}

function _rigApplyAimIK(rig, locals, options, state) {
  if (!Number.isFinite(options.aim) || state === "skill" || state === "death" || state === "hit") return;
  var torso = locals.get("torso"), upper = locals.get("upperArm_F"), fore = locals.get("foreArm_F");
  var upperBone = rig.bones.find(function (b) { return b.id === "upperArm_F"; });
  var foreBone = rig.bones.find(function (b) { return b.id === "hand_F"; });
  if (!torso || !upper || !fore || !upperBone || !foreBone) return;
  var elbowBone = rig.bones.find(function (b) { return b.id === "foreArm_F"; });
  if (!elbowBone) return;
  var l1 = Math.hypot(elbowBone.x, elbowBone.y), l2 = Math.hypot(foreBone.x, foreBone.y);
  var reach = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, (l1 + l2) * 0.85));
  var aim = Math.atan2(Math.sin(options.aim), Math.cos(options.aim) * (options.facing < 0 ? -1 : 1));
  var a1 = Math.acos(Math.max(-1, Math.min(1, (l1*l1 + reach*reach - l2*l2) / (2*l1*reach))));
  var a2 = Math.acos(Math.max(-1, Math.min(1, (l2*l2 + reach*reach - l1*l1) / (2*l2*reach))));
  var bindUpper = Math.atan2(elbowBone.y, elbowBone.x), bindFore = Math.atan2(foreBone.y, foreBone.x);
  var torsoWorldRot = 0;
  for (var i=0;i<rig.bones.length;i++) {
    var b=rig.bones[i];
    if (b.id === "torso") break;
    if (b.id === "pelvis") torsoWorldRot += locals.get("pelvis").rot;
  }
  torsoWorldRot += torso.rot;
  if (Math.abs(aim) > Math.PI/6) {
    var lean = Math.max(-8,Math.min(8,aim*180/Math.PI*0.15))*Math.PI/180;
    torso.rot += lean; torsoWorldRot += lean;
  }
  var elbowAngle = aim + a1; // fixed downward bend in screen coordinates
  var upperAim = elbowAngle - torsoWorldRot - bindUpper;
  upper.rot += upperAim;
  fore.rot += (aim - a2) - torsoWorldRot - upperAim - bindFore;
}

function evaluateRobotRigPose(rig, options) {
  if (!rig || !Array.isArray(rig.bones) || !rig.parts) return null;
  var o = options || {}, motion = o.motion || {};
  var now = Number.isFinite(o.timeMs) ? o.timeMs : 0;
  var state = o.state || (typeof resolveRobotAnimation === "function" ? resolveRobotAnimation(o, now) : "idle");
  var clip = rig.clips[state] || rig.clips.idle || { duration: 1, tracks: {} };
  var anim = o._rigState;
  var start = anim && anim.state === state ? anim.stateStartMs : (Number.isFinite(o.stateElapsedMs) ? now-o.stateElapsedMs : 0);
  var t = _rigClipTime(clip, o, start);
  var locals = new Map();
  for (var i = 0; i < rig.bones.length; i++) {
    var bone = rig.bones[i], track = (clip.tracks && clip.tracks[bone.id]) || {};
    locals.set(bone.id, {
      x: _rigSampleTrack(track.x, t, clip.loop, clip.duration),
      y: _rigSampleTrack(track.y, t, clip.loop, clip.duration),
      rot: _rigSampleTrack(track.rot, t, clip.loop, clip.duration) * Math.PI / 180
    });
  }
  _rigApplyAimIK(rig, locals, o, state);
  var bones = _rigBuildPose(rig, locals);
  var visible = new Set(Object.keys(rig.parts));
  if (state === "skill" && (t < 150 || t >= 450)) visible.delete("prop_welder");
  else if (state !== "skill") visible.delete("prop_welder");
  if (Number.isFinite(o.aim)) visible.add("weapon");
  else visible.delete("weapon");
  // Distance-locked wheel rotation keeps the tires in sync with translation.
  var phase = Number.isFinite(motion.walkPhase) ? motion.walkPhase : 0;
  var wheel = (phase * 40 / (Math.PI * 2)) / rig.wheelRadius;
  if (motion.onGround !== false && !(state === "death" && t >= 300)) {
    if (locals.has("wheel_B")) locals.get("wheel_B").rot += wheel;
    if (locals.has("wheel_F")) locals.get("wheel_F").rot += wheel;
    bones = _rigBuildPose(rig, locals);
  }
  // Ground contact follows the lower wheel socket after all pose layers.
  if (motion.onGround !== false && !(state === "death" && t >= 300)) {
    var cb = rig.sockets.contact_B, cf = rig.sockets.contact_F;
    var pb = bones.get(cb.bone), pf = bones.get(cf.bone);
    var shift = rig.groundY - Math.max(pb.y + cb.y, pf.y + cf.y);
    bones.forEach(function (p) { p.y += shift; });
  }
  if(state==="death"&&t>=300){
    var root=locals.get("root"),deathRotation=root.rot,contact=rig.sockets.contact_F;
    root.rot=0;
    var bindBones=_rigBuildPose(rig,locals),bindContact=bindBones.get(contact.bone);
    var targetX=bindContact.x+contact.x;
    root.rot=deathRotation;
    bones=_rigBuildPose(rig,locals);
    var fallenContact=bones.get(contact.bone);
    var dx=targetX-(fallenContact.x+contact.x),dy=rig.groundY-(fallenContact.y+contact.y);
    bones.forEach(function(p){p.x+=dx;p.y+=dy;});
    var bounds=_rigWorldBounds(rig,bones),clampY=rig.groundY-bounds.maxY;
    bones.forEach(function(p){p.y+=clampY;});
  }
  return { bones: bones, visible: visible, state: state, time: t, locals: locals };
}

function _rigBlendPose(from, to, weight) {
  if (!from || weight >= 1) return to;
  var mixed = new Map();
  to.bones.forEach(function (b, id) {
    var a = from.bones.get(id);
    if (!a) { mixed.set(id, b); return; }
    var delta = Math.atan2(Math.sin(b.rot-a.rot), Math.cos(b.rot-a.rot));
    mixed.set(id, { x:a.x+(b.x-a.x)*weight, y:a.y+(b.y-a.y)*weight, rot:a.rot+delta*weight });
  });
  return { bones:mixed, visible:to.visible, state:to.state, time:to.time, locals:to.locals };
}

function _rigAdvanceSecondary(pose, anim, now) {
  if (!anim) return;
  if (!anim.secondary) anim.secondary = { antenna:0, backpack:0, velocityA:0, velocityB:0, lastMs:now };
  var spring=anim.secondary, torso=pose.bones.get("torso"), target=Math.max(-0.314,Math.min(0.314,-torso.rot*0.7));
  var elapsed=Math.max(0,Math.min(250,now-spring.lastMs));
  while(elapsed>0){
    var dt=Math.min(1/60,elapsed/1000); elapsed-=dt*1000;
    var aa=(target-spring.antenna)*120-spring.velocityA*14;
    var ab=(target*0.55-spring.backpack)*120-spring.velocityB*14;
    spring.velocityA+=aa*dt; spring.antenna+=spring.velocityA*dt;
    spring.velocityB+=ab*dt; spring.backpack+=spring.velocityB*dt;
    spring.antenna=Math.max(-0.314,Math.min(0.314,spring.antenna));
    spring.backpack=Math.max(-0.314,Math.min(0.314,spring.backpack));
  }
  spring.lastMs=now;
  var antenna=pose.bones.get("antenna"), backpack=pose.bones.get("backpack");
  if(antenna) antenna.rot+=spring.antenna;
  if(backpack) backpack.rot+=spring.backpack;
}

function _rigDrawJointCap(ctx, id) {
  var radius={foreArm_B:7,hand_B:5,foreArm_F:6,hand_F_grip:5,shin_B:6,shin_F:6,
    wheelHousing_B:5,wheelHousing_F:5,wheel_B:5,wheel_F:5}[id];
  if(!radius) return;
  ctx.beginPath();ctx.arc(0,0,radius,0,_ROBOT_RIG_TAU);
  ctx.fillStyle="#4a4d55";ctx.fill();ctx.strokeStyle="#1d1f24";ctx.lineWidth=2;ctx.stroke();
}

function robotRigMuzzlePoint(rig, options) {
  var pose = evaluateRobotRigPose(rig, options);
  if (!pose || !Number.isFinite(options && options.aim)) return null;
  var hand = pose.bones.get("weapon") || pose.bones.get("hand_F"), facing = options.facing < 0 ? -1 : 1;
  var weaponRotation=(pose.locals.get("weapon")||{rot:0}).rot;
  var aim=pose.state==="death"?weaponRotation:Math.atan2(Math.sin(options.aim),Math.cos(options.aim)*facing)+weaponRotation;
  var lx = 144, ly = 0;
  var x = hand.x + lx * Math.cos(aim) - ly * Math.sin(aim);
  var y = hand.y + lx * Math.sin(aim) + ly * Math.cos(aim);
  var r = options.r || options.charDef && options.charDef.r || 14;
  var scale = (r * (typeof RB_VISUAL_SCALE === "number" ? RB_VISUAL_SCALE : 1) * 2.32) / rig.unit;
  return { x: (options.cx || 0) + facing * (x - 128) * scale, y: (options.cy || 0) + r - rig.groundY * scale + y * scale };
}

function drawRobotRig(ctx, rig, options) {
  var o = options || {}, image = rig && typeof assetImage === "function" ? assetImage(rig.atlas) : null;
  if (!image || !image.naturalWidth || !rig.rects) return false;
  var key = o.animKey && (typeof o.animKey === "object" || typeof o.animKey === "function") ? o.animKey : null;
  var state = o.state || (typeof resolveRobotAnimation === "function" ? resolveRobotAnimation(o, o.timeMs) : "idle");
  var anim = key ? (_ROBOT_RIG_ANIM.get(key) || { state: state, stateStartMs: o.timeMs || 0, prev: null, pose: null }) : null;
  var now = Number.isFinite(o.timeMs) ? o.timeMs : 0;
  if (anim && anim.state !== state) {
    anim.prev = anim.pose; anim.state = state; anim.stateStartMs = now;
  }
  var poseOptions = Object.assign({}, o, { state: state, _rigState: anim });
  var pose = evaluateRobotRigPose(rig, poseOptions);
  if (!pose) return false;
  if (anim && anim.prev) {
    var blend = state === "death" ? 60 : state === "fire" ? 40 : 100;
    var w = Math.max(0, Math.min(1, (now-anim.stateStartMs)/blend)); w=w*w*(3-2*w);
    pose = _rigBlendPose(anim.prev, pose, w);
    if (w>=1) anim.prev=null;
  }
  _rigAdvanceSecondary(pose,anim,now);
  if (anim) { anim.pose=pose; _ROBOT_RIG_ANIM.set(key,anim); }
  var rawR=o.r || o.charDef && o.charDef.r || 14;
  var scale=(rawR*(typeof RB_VISUAL_SCALE === "number" ? RB_VISUAL_SCALE : 1)*2.32)/rig.unit;
  var facing=o.facing<0?-1:1, drawX=(o.cx||0)-facing*128*scale, drawY=(o.cy||0)+rawR-rig.groundY*scale;
  var localAim=Number.isFinite(o.aim)?Math.atan2(Math.sin(o.aim),Math.cos(o.aim)*facing):0;
  ctx.save(); ctx.translate(drawX,drawY); ctx.scale(facing*scale,scale);
  for (var i=0;i<rig.drawOrder.length;i++) {
    var id=rig.drawOrder[i];
    if (id==="weapon") {
      if (!pose.visible.has("weapon")) continue;
      var weapon=assetImage("weapons/launcher"), grip=pose.bones.get("weapon"), weaponLocal=pose.locals.get("weapon");
      if (weapon && grip) { ctx.save(); ctx.translate(grip.x,grip.y); ctx.rotate(pose.state==="death"?(weaponLocal?weaponLocal.rot:0):localAim+(weaponLocal?weaponLocal.rot:0)); ctx.drawImage(weapon,-6,-38,150,76); ctx.restore(); }
      continue;
    }
    var part=rig.parts[id], rect=rig.rects[id], bone=part&&pose.bones.get(part.bone);
    if (!part||!rect||!bone||!pose.visible.has(id)) continue;
    ctx.save(); ctx.translate(bone.x,bone.y); ctx.rotate(bone.rot);
    _rigDrawJointCap(ctx,id);
    if (id==="visor_glow") {
      if (pose.state==="death") ctx.globalAlpha=Math.max(0,1-pose.time/700);
      else if (pose.state==="hit") ctx.globalAlpha=0.35+0.65*Math.abs(Math.sin(pose.time/24));
    }
    var origin=rig.origins[id]||part.origin||[0,0];
    ctx.drawImage(image,rect[0],rect[1],rect[2],rect[3],origin[0],origin[1],rect[2],rect[3]);
    ctx.restore();
  }
  ctx.restore(); return true;
}

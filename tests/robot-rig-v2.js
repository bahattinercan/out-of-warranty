/* FIX-8 rig core contract checks. Run: node tests/robot-rig-v2.js */
const vm=require('vm'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..','js');
const sandbox={console,Math,Date,JSON,Map,Set,WeakMap,Number,Object,Array,String,Boolean,Error,Infinity,NaN};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
for(const file of ['robot-animation-manifest.js','robot-rig-runtime.js','rigs/kopek.js','robots.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
const rig=sandbox.getRobotRig('kopek');
assert(rig,'FIX-8 rig is registered');
const base=sandbox.evaluateRobotRigPose(rig,{state:'idle',timeMs:0,motion:{onGround:true}});
assert(base && base.bones.size===rig.bones.length,'bind pose contains every bone');
for(const p of base.bones.values()) assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.rot),'bind pose is finite');
const walkA=sandbox.evaluateRobotRigPose(rig,{state:'walk',timeMs:150,motion:{onGround:true,walkPhase:Math.PI/2}});
const walkB=sandbox.evaluateRobotRigPose(rig,{state:'walk',timeMs:9999,motion:{onGround:true,walkPhase:Math.PI/2}});
assert(Math.abs(walkA.bones.get('thigh_F').rot-walkB.bones.get('thigh_F').rot)<1e-9,'walk pose is phase locked');
const aim=sandbox.evaluateRobotRigPose(rig,{state:'aim',timeMs:0,aim:-0.45,facing:1,r:14,motion:{onGround:true}});
assert(aim.visible.has('weapon'),'aim pose shows launcher');
assert(!aim.visible.has('prop_welder'),'battle aim hides welder');
const clipNames=['idle','walk','aim','fire','jump','fall','land','hit','skill','death'];
assert.deepStrictEqual(Object.keys(rig.clips).sort(),clipNames.slice().sort(),'all ten clips exist');
for(const name of clipNames){
  const duration=rig.clips[name].duration||1;
  const sample=sandbox.evaluateRobotRigPose(rig,{state:name,timeMs:Math.floor(duration/2),stateElapsedMs:Math.floor(duration/2),aim:-0.2,facing:1,motion:{onGround:name!=='jump'&&name!=='fall'}});
  for(const p of sample.bones.values()) assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.rot),name+' pose stays finite');
}
const skillEarly=sandbox.evaluateRobotRigPose(rig,{state:'skill',timeMs:100,stateElapsedMs:100,motion:{onGround:true}});
const skillHold=sandbox.evaluateRobotRigPose(rig,{state:'skill',timeMs:300,stateElapsedMs:300,motion:{onGround:true}});
const skillEnd=sandbox.evaluateRobotRigPose(rig,{state:'skill',timeMs:500,stateElapsedMs:500,motion:{onGround:true}});
assert(!skillEarly.visible.has('prop_welder')&&skillHold.visible.has('prop_welder')&&!skillEnd.visible.has('prop_welder'),'welder appears only during repair hold');
const muzzle=sandbox.robotRigMuzzlePoint(rig,{state:'aim',timeMs:0,aim:-0.45,facing:1,cx:100,cy:200,r:14,motion:{onGround:true}});
assert(Number.isFinite(muzzle.x)&&Number.isFinite(muzzle.y),'muzzle query is finite');
for(const facing of [1,-1])for(const aimAngle of [-Math.PI/4,0,Math.PI/4]){
  const options={state:'aim',timeMs:0,aim:aimAngle,facing,cx:100,cy:200,r:14,motion:{onGround:true}};
  const rigPoint=sandbox.robotRigMuzzlePoint(rig,options),r=14*1.10;
  const legacy={x:100+facing*r*0.28+Math.cos(aimAngle)*r*1.42,y:200-r*0.42+Math.sin(aimAngle)*r*1.42};
  assert(Math.hypot(rigPoint.x-legacy.x,rigPoint.y-legacy.y)<8,'rig muzzle stays within the approved legacy gameplay offset');
}
const calls=[]; const image={naturalWidth:1004,naturalHeight:150};
sandbox.assetImage=()=>image; sandbox.RB_VISUAL_SCALE=1.25;
const translations=[];
const ctx=new Proxy({}, {get(_t,k){ if(k==='drawImage') return (...a)=>calls.push(a); if(k==='translate') return (...a)=>translations.push(a); return ()=>{}; }});
const drawOptions={state:'aim',timeMs:0,aim:-0.45,facing:1,cx:100,cy:200,r:14,motion:{onGround:true}};
assert(sandbox.drawRobotRig(ctx,rig,drawOptions),'ready atlas draws');
assert(calls.length===Object.keys(rig.parts).length,'visible parts and launcher are drawn');
const scale=14*1.10*2.32/256;
assert(Math.abs(translations[0][0]-(100-128*scale))<1e-9,'right facing is centered on entity');
calls.length=0;translations.length=0;
assert(sandbox.drawRobotRig(ctx,rig,{...drawOptions,facing:-1}),'left facing atlas draws');
assert(Math.abs(translations[0][0]-(100+128*scale))<1e-9,'left facing mirrors around entity center');
calls.length=0;translations.length=0;
assert(sandbox.drawRobot(ctx,{...drawOptions,charDef:{id:'kopek',visualKind:'robot',r:14}}),'drawRobot renders the character');
assert(calls.length===0,'drawRobot uses Canvas vectors instead of the rig atlas');
console.log('FIX-8 rig data: pose contracts pass; gameplay renderer uses Canvas vectors');

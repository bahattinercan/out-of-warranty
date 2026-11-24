#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/manifest.json"), "utf8"));
const sandbox = { console, Math, Date, JSON, Map, Set, WeakMap, Number, Object, Array, String, Boolean };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const file of ["robot-animation-manifest.js", "robot-rig-runtime.js", "rigs/kopek.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), sandbox, { filename: file });
}

const failures = [];
function check(condition, message) { if (!condition) failures.push(message); }
const atlasAssets = new Map(manifest.assets.map((asset) => [asset.id, asset]));
for (const [id, rig] of Object.entries(sandbox.ROBOT_RIGS || {})) {
  check(atlasAssets.has(rig.atlas), `${id}: atlas missing from manifest`);
  const atlas = atlasAssets.get(rig.atlas);
  check(!!atlas && atlas.alpha, `${id}: atlas must be registered with alpha`);
  check(!!atlas && atlas.w === rig.atlasSize[0] && atlas.h === rig.atlasSize[1], `${id}: atlas dimensions mismatch`);
  const boneIds = new Set();
  for (const bone of rig.bones) {
    check(!boneIds.has(bone.id), `${id}: duplicate bone ${bone.id}`);
    check(bone.parent == null || boneIds.has(bone.parent), `${id}: parent must precede ${bone.id}`);
    boneIds.add(bone.id);
  }
  for (const [partId, rect] of Object.entries(rig.rects || {})) {
    const part = rig.parts[partId];
    check(!!part, `${id}: ${partId} rect has no part`);
    check(!!part && boneIds.has(part.bone), `${id}: ${partId} references unknown bone`);
    check(rect.length === 4 && rect.every(Number.isFinite), `${id}: ${partId} rect is invalid`);
    check(rect[0] >= 0 && rect[1] >= 0 && rect[0] + rect[2] <= rig.atlasSize[0] && rect[1] + rect[3] <= rig.atlasSize[1], `${id}: ${partId} rect leaves atlas`);
  }
  const order = rig.drawOrder.filter((part) => part !== "weapon");
  check(order.length === Object.keys(rig.parts).length, `${id}: draw order part count mismatch`);
  check(new Set(order).size === order.length && Object.keys(rig.parts).every((part) => order.includes(part)), `${id}: draw order must contain each part once`);
  const required = ["idle", "walk", "aim", "fire", "jump", "fall", "land", "hit", "skill", "death"];
  for (const state of required) check(!!rig.clips[state], `${id}: missing ${state} clip`);
  for (const [state, clip] of Object.entries(rig.clips)) {
    for (const [boneId, tracks] of Object.entries(clip.tracks || {})) {
      check(boneIds.has(boneId), `${id}/${state}: track references ${boneId}`);
      for (const [property, keys] of Object.entries(tracks)) {
        let prev = -Infinity;
        for (const key of keys) {
          check(key.length >= 2 && key.every((v, i) => i > 1 || Number.isFinite(v)), `${id}/${state}/${boneId}.${property}: non-finite key`);
          check(key[0] >= prev && key[0] <= clip.duration, `${id}/${state}/${boneId}.${property}: key times out of order/range`);
          if (property === "rot") check(Math.abs(key[1]) <= 180, `${id}/${state}/${boneId}: rotation exceeds 180°`);
          prev = key[0];
        }
      }
    }
  }
  const grounded = ["idle", "walk", "aim", "fire", "land", "hit", "skill"];
  for (const state of grounded) {
    const clip = rig.clips[state];
    for (let time = 0; time <= clip.duration; time += 16) {
      const pose = sandbox.evaluateRobotRigPose(rig, { state, timeMs: time, stateElapsedMs: time, aim: -0.5, facing: 1, r: 14, motion: { onGround: true, walkPhase: time / 100 } });
      const contacts = [rig.sockets.contact_B, rig.sockets.contact_F].map((socket) => pose.bones.get(socket.bone).y + socket.y);
      check(Math.abs(Math.max(...contacts) - rig.groundY) <= 1.01, `${id}/${state}@${time}: ground lock error`);
    }
  }
  const death=rig.clips.death;
  for(let time=300;time<=death.duration;time+=150){
    const pose=sandbox.evaluateRobotRigPose(rig,{state:"death",timeMs:time,stateElapsedMs:time,aim:-0.5,facing:1,r:14,motion:{onGround:true}});
    const bounds=sandbox._rigWorldBounds(rig,pose.bones);
    check(bounds.maxY<=rig.groundY+0.01,`${id}/death@${time}: body crosses the ground line`);
  }
}

if (failures.length) {
  console.error(`rig-check: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`rig-check: ${Object.keys(sandbox.ROBOT_RIGS).length} rig(s), atlas bounds, hierarchy, clips and grounded contacts passed`);
}

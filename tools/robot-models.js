#!/usr/bin/env node
/* Builds layered, game-scale SVG body and head art for the complete robot roster. */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "assets", "robot-models");
const sandbox = { Math, Object, Array, String };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js/characters.js"), "utf8") +
  "\nglobalThis.roster=CHARACTERS;", sandbox);

const bodyForms = {
  compact: "M19 29 32 18h46l14 13v32H19z",
  u_frame: "M18 17h20v34h34V17h20v53H18z",
  tank: "M13 32 25 18h60l12 14v36H13z",
  small: "M25 30 37 20h37l11 12v31H25z",
  wide: "M12 32 24 20h63l12 12v34H12z",
  angular: "M18 34 31 17h49l15 18-9 32H23z",
  long: "M9 35 20 23h70l12 12v31H9z",
  flat: "M14 36 26 24h58l12 12v29H14z",
  round: "M18 41a36 30 0 0 1 72 0v26H18z",
  coil: "M19 31 31 18h49l12 14v35H19z",
  low: "M14 39 25 27h61l10 12v28H14z",
  forward: "M16 32 29 20h49l21 13v34H16z",
  tall: "M24 19 38 11h36l13 11v46H24z",
  furnace: "M17 32 29 19h52l13 14v35H17z",
};

function shade(hex, amount) {
  const match = /^#([\da-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const rgb = [0, 2, 4].map(offset => parseInt(match[1].slice(offset, offset + 2), 16));
  return "#" + rgb.map(channel => Math.round(Math.max(0, Math.min(255,
    amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount)))
    .toString(16).padStart(2, "0")).join("");
}

function defs(robot, part) {
  const prefix = `${robot.id}-${part}`;
  return `<defs>
    <linearGradient id="${prefix}-shell" x1="0" y1="0" x2="0.18" y2="1"><stop stop-color="${shade(robot.color, 0.42)}"/><stop offset=".34" stop-color="${robot.color}"/><stop offset="1" stop-color="${shade(robot.color, -0.42)}"/></linearGradient>
    <linearGradient id="${prefix}-metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#67747a"/><stop offset=".38" stop-color="#3b474d"/><stop offset="1" stop-color="#20282d"/></linearGradient>
    <linearGradient id="${prefix}-accent" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${shade(robot.accent, 0.36)}"/><stop offset="1" stop-color="${shade(robot.accent, -0.22)}"/></linearGradient>
    <linearGradient id="${prefix}-glass" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#263a43"/><stop offset=".55" stop-color="#101b20"/><stop offset="1" stop-color="#070d11"/></linearGradient>
  </defs>`;
}

function attachmentDetail(robot) {
  const dark = "#20272d";
  const accent = robot.accent;
  if (robot.attachment === "magnet" || robot.attachment === "emp_coil") {
    return '<path d="M21 40v7q5 7 10 0v-7" fill="none" stroke="url(#' + robot.id + '-body-accent)" stroke-width="3" stroke-linecap="round"/><path d="M19 39v5h5v-5m4 0v5h5v-5" fill="' + accent + '" stroke="' + dark + '" stroke-width="1.5"/>';
  }
  if (robot.attachment === "coil" || robot.attachment === "overcoil") {
    return '<path d="M21 40q-4 3 0 6t0 6m5-12q-4 3 0 6t0 6m5-12q-4 3 0 6t0 6" fill="none" stroke="' + accent + '" stroke-width="2" stroke-linecap="round"/>';
  }
  if (["pressure_tank", "coolant_cannon", "coolant_wave", "cryo_ring"].includes(robot.attachment)) {
    return '<path d="M20 37h6l3 3v9l-3 3h-6z" fill="url(#' + robot.id + '-body-metal)" stroke="' + dark + '" stroke-width="2"/><path d="M21 40h5v3h-5zm0 6h5v3h-5z" fill="' + accent + '"/>';
  }
  if (["fan", "vortex_fan"].includes(robot.attachment)) {
    return '<circle cx="25" cy="44" r="6" fill="url(#' + robot.id + '-body-metal)" stroke="' + dark + '" stroke-width="2"/><path d="M25 39v10m-4-3 8-5m-8 0 8 5" stroke="' + accent + '" stroke-width="2" stroke-linecap="round"/>';
  }
  if (["siren", "resonator"].includes(robot.attachment)) {
    return '<path d="M20 39q6 4 0 8t0 8m4-15q6 4 0 8t0 8" fill="none" stroke="' + accent + '" stroke-width="2" stroke-linecap="round"/>';
  }
  if (["welder", "mallet", "hammer", "drill", "clamp", "rotary_arm"].includes(robot.attachment)) {
    const marks = {
      welder: "M20 38l7 7-7 7m6-7h6",
      clamp: "M20 38v14m0-12 8-4m-8 12 8 4",
      drill: "M19 40h9l4 5-4 5h-9z",
      rotary_arm: "M20 39l6 5-4 7 7 2",
    };
    const mark = marks[robot.attachment] || "M20 39h9v10h-9zM24.5 35v4";
    return '<path d="' + mark + '" fill="none" stroke="' + accent + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  return "";
}

function shellParts(robot, index) {
  const shape = bodyForms[robot.body] || bodyForms.compact;
  const stripeY = 31 + (index % 4) * 3;
  const ventCount = 2 + index % 3;
  const vents = Array.from({ length: ventCount }, (_, i) =>
    `<path d="M${29 + i * 10} 57h6v5h-6z" fill="#aeb9bf" stroke="#20272d" stroke-width="1.5"/>`).join("");
  let specialty = "";
  if (robot.body === "tank" || robot.locomotion === "tracks") {
    specialty = '<path d="M20 62h70v9H20z" fill="#30383d" stroke="#161b1f" stroke-width="3"/><circle cx="31" cy="66" r="3" fill="#bdc2c2"/><circle cx="53" cy="66" r="3" fill="#bdc2c2"/><circle cx="77" cy="66" r="3" fill="#bdc2c2"/>';
  } else if (robot.body === "coil" || robot.attachment.includes("coil")) {
    specialty = '<path d="M42 49q-10 4 0 8t0 8M54 49q-10 4 0 8t0 8M66 49q-10 4 0 8t0 8" fill="none" stroke="#f4c54c" stroke-width="3"/>';
  } else if (robot.body === "furnace") {
    specialty = '<path d="M39 52q-4-9 4-14 0 7 5 8 2-8 9-11-2 9 5 12 6 5 1 12H42z" fill="#ff752c" stroke="#57291d" stroke-width="2"/><path d="M49 57q-2-5 3-8 0 4 4 5 3 2 0 5z" fill="#ffe17a"/>';
  } else if (robot.locomotion === "spring") {
    specialty = '<path d="M42 54h6l-5 4h10l-5 4h10l-5 5h9" fill="none" stroke="#dce5ea" stroke-width="3" stroke-linejoin="round"/>';
  } else if (robot.locomotion === "rotors") {
    specialty = '<path d="M27 24h-9v-8h9M83 24h9v-8h-9" fill="none" stroke="#242b31" stroke-width="4"/><path d="M12 14h22M76 14h22" stroke="#a8dfff" stroke-width="2"/>';
  }
  specialty += attachmentDetail(robot);
  const chest = robot.face === "gauge" || robot.attachment.includes("tank")
    ? '<circle cx="55" cy="44" r="10" fill="#252e34" stroke="#161b1f" stroke-width="3"/><path d="M55 44l5-6" stroke="#ffcf5d" stroke-width="2"/><circle cx="55" cy="44" r="2" fill="#e8ecee"/>'
    : `<path d="M34 ${stripeY}h43v5H34z" fill="${robot.accent}" stroke="#20272d" stroke-width="1.5"/>`;
  const shoulderPlates = '<path d="M21 25 27 19h10l5 6-4 9H25zM69 25l5-6h10l6 6-4 9H73z" fill="url(#' + robot.id + '-body-shell)" stroke="#171d21" stroke-width="3" stroke-linejoin="round"/><path d="M26 23h10M74 23h10" stroke="#ffffff" stroke-opacity=".48" stroke-width="1.5"/><circle cx="32" cy="28" r="2" fill="url(#' + robot.id + '-body-accent)"/><circle cx="78" cy="28" r="2" fill="url(#' + robot.id + '-body-accent)"/>';
  const chestPlate = '<path d="M32 34 38 30h34l7 5-4 17H37z" fill="url(#' + robot.id + '-body-metal)" stroke="#161c20" stroke-width="2.5" stroke-linejoin="round"/><path d="M38 32h32" stroke="#dbe4e7" stroke-opacity=".62" stroke-width="1.5"/><path d="M36 52h42" stroke="' + robot.accent + '" stroke-width="2" stroke-opacity=".82"/>';
  const bolts = [[25, 39], [85, 39], [28, 51], [82, 51], [28, 61], [82, 61]].map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="1.6" fill="#c4cdd0" stroke="#20272b" stroke-width="1"/><path d="M${x - 0.8} ${y}h1.6" stroke="#30383d" stroke-width=".7"/>`).join("");
  const highlights = `<path d="${shape}" fill="none" stroke="#ffffff" stroke-opacity=".26" stroke-width="1.4" stroke-linejoin="round"/><path d="M25 59h58" stroke="#f5f8fa" stroke-opacity=".25" stroke-width="1"/>`;
  return `<path d="${shape}" fill="url(#${robot.id}-body-shell)" stroke="#171d21" stroke-width="5" stroke-linejoin="round"/><path d="M22 53h66v10H22z" fill="url(#${robot.id}-body-metal)" stroke="#171d21" stroke-width="3"/>${specialty}${chestPlate}${chest}${shoulderPlates}${vents}${bolts}${highlights}<path d="M20 38h7v8h-7zM84 38h7v8h-7z" fill="url(#${robot.id}-body-accent)" stroke="#171d21" stroke-width="2"/>`;
}

function headFeatures(robot, index) {
  const features = {
    kopek: '<path d="M32 27Q20 24 19 34l5 13 11-5M77 27q13-3 14 7l-5 13-11-5" fill="url(#kopek-head-shell)" stroke="#171d21" stroke-width="3"/>',
    kedi: '<path d="M31 28 29 10l17 13M78 28 81 10 64 23" fill="url(#kedi-head-shell)" stroke="#171d21" stroke-width="3" stroke-linejoin="round"/>',
    ayi: '<circle cx="32" cy="23" r="9" fill="url(#ayi-head-shell)" stroke="#171d21" stroke-width="3"/><circle cx="78" cy="23" r="9" fill="url(#ayi-head-shell)" stroke="#171d21" stroke-width="3"/>',
    tavsan: '<path d="M39 24Q29 4 34 2q8-3 13 21M67 24Q77 4 72 2q-8-3-13 21" fill="url(#tavsan-head-shell)" stroke="#171d21" stroke-width="3"/>',
    tilki: '<path d="M31 27 21 9l22 10M78 27 89 9 66 19" fill="url(#tilki-head-shell)" stroke="#171d21" stroke-width="3" stroke-linejoin="round"/><path d="M36 21l7 3m28-3-7 3" stroke="#f4c477" stroke-width="2"/>',
    panda: '<circle cx="31" cy="23" r="9" fill="#252b30" stroke="#151a1e" stroke-width="3"/><circle cx="79" cy="23" r="9" fill="#252b30" stroke="#151a1e" stroke-width="3"/>',
    timsah: '<path d="M72 40 103 43l2 12-31 1z" fill="url(#timsah-head-shell)" stroke="#171d21" stroke-width="3"/><path d="M81 49h22" stroke="#dce9d3" stroke-width="2" stroke-dasharray="3 2"/>',
    suaygiri: '<path d="M37 49q18-5 37 0l8 10H34z" fill="url(#suaygiri-head-metal)" stroke="#171d21" stroke-width="3"/><circle cx="45" cy="54" r="1.4" fill="#d7dde0"/><circle cx="68" cy="54" r="1.4" fill="#d7dde0"/>',
    ornitorenk: '<path d="M65 42q22-4 34 2v9q-14 7-34 1z" fill="url(#ornitorenk-head-accent)" stroke="#171d21" stroke-width="3"/><path d="M77 46h18" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/>',
    penguen: '<path d="M31 42Q20 47 26 57l10 1M79 42q11 5 5 15l-10 1" fill="url(#penguen-head-metal)" stroke="#171d21" stroke-width="3"/>',
    gergedan: '<path d="M49 25 55 5l8 20z" fill="url(#gergedan-head-accent)" stroke="#171d21" stroke-width="3" stroke-linejoin="round"/>',
    dino: '<path d="M35 24 29 13l11 5 3-11 8 13 5-13 7 13 8-9 1 13" fill="url(#dino-head-accent)" stroke="#171d21" stroke-width="3" stroke-linejoin="round"/>',
    zurafa: '<path d="M43 22V9h6v13M67 22V9h6v13" fill="none" stroke="#30383d" stroke-width="4"/><circle cx="46" cy="8" r="4" fill="url(#zurafa-head-accent)" stroke="#171d21" stroke-width="2"/><circle cx="70" cy="8" r="4" fill="url(#zurafa-head-accent)" stroke="#171d21" stroke-width="2"/>',
    kus: '<path d="M31 28 18 14l19 8M78 28l14-14-20 8" fill="url(#kus-head-shell)" stroke="#171d21" stroke-width="3" stroke-linejoin="round"/>',
    yarasa: '<path d="M32 28 17 13l4 18 12 5M77 28l16-15-4 18-12 5" fill="url(#yarasa-head-shell)" stroke="#171d21" stroke-width="3" stroke-linejoin="round"/>',
    kirpi: '<path d="m31 27 1-13 8 9 5-16 7 16 8-18 5 19 10-12-2 17" fill="url(#kirpi-head-accent)" stroke="#171d21" stroke-width="2.5" stroke-linejoin="round"/>',
    oklukirpi: '<path d="m31 28 1-14 8 10 5-17 7 17 8-19 5 20 10-13-2 17" fill="url(#oklukirpi-head-metal)" stroke="#171d21" stroke-width="2.5" stroke-linejoin="round"/>',
    kanguru: '<path d="M35 25 31 5l15 19M72 25 78 5 63 24" fill="url(#kanguru-head-shell)" stroke="#171d21" stroke-width="3" stroke-linejoin="round"/>',
  };
  return features[robot.id] || (index % 2 === 0
    ? `<path d="M31 27 24 12l17 9M78 27l8-15-18 9" fill="url(#${robot.id}-head-shell)" stroke="#171d21" stroke-width="3" stroke-linejoin="round"/>`
    : '<circle cx="31" cy="23" r="8" fill="url(#' + robot.id + '-head-shell)" stroke="#171d21" stroke-width="3"/><circle cx="79" cy="23" r="8" fill="url(#' + robot.id + '-head-shell)" stroke="#171d21" stroke-width="3"/>');
}

function headParts(robot, index) {
  const visor = robot.face === "single_lens"
    ? '<circle cx="55" cy="40" r="13" fill="url(#' + robot.id + '-head-glass)" stroke="#11171b" stroke-width="3"/><circle cx="55" cy="40" r="8" fill="url(#' + robot.id + '-head-accent)"/><circle cx="52" cy="37" r="2" fill="#fff"/>'
    : robot.face === "gauge" || robot.face === "speedometer"
      ? '<circle cx="55" cy="40" r="15" fill="url(#' + robot.id + '-head-glass)" stroke="#11171b" stroke-width="4"/><path d="M45 43a11 11 0 0 1 20 0" fill="none" stroke="url(#' + robot.id + '-head-accent)" stroke-width="4"/><path d="M55 40l7-8" stroke="#fff" stroke-width="2"/>'
      : robot.face === "warning_led"
        ? '<path d="M38 34h34v17H38z" fill="#252d32" stroke="#151a1e" stroke-width="3"/><circle cx="46" cy="42" r="4" fill="#ff4545"/><circle cx="57" cy="42" r="4" fill="currentColor"/><circle cx="67" cy="42" r="4" fill="#ff4545"/>'
        : '<path d="M34 34h42v16H34z" fill="url(#' + robot.id + '-head-glass)" stroke="#11171b" stroke-width="3"/><path d="M45 37v10m19-10v10" stroke="url(#' + robot.id + '-head-accent)" stroke-width="6" stroke-linecap="round"/><path d="M44 37h2m17 0h2" stroke="#fff" stroke-opacity=".8" stroke-width="1.5" stroke-linecap="round"/>';
  const mouth = '<path d="M42 57h26" stroke="#181e23" stroke-width="4" stroke-linecap="round"/><path d="M44 56h21" stroke="#ffffff" stroke-opacity=".38" stroke-width="1"/>';
  const shellHighlight = '<path d="M39 20h33l4 8" fill="none" stroke="#ffffff" stroke-opacity=".34" stroke-width="2" stroke-linecap="round"/><circle cx="35" cy="33" r="2" fill="#d5dde0"/><circle cx="75" cy="33" r="2" fill="#d5dde0"/>';
  return `<path d="M31 29 35 18h40l7 12-4 29H34z" fill="url(#${robot.id}-head-shell)" stroke="#181e23" stroke-width="5" stroke-linejoin="round"/>${headFeatures(robot, index)}<path d="M34 32h42v20H34z" fill="url(#${robot.id}-head-glass)" stroke="#11171b" stroke-width="2.5" stroke-linejoin="round"/>${visor}${mouth}${shellHighlight}<path d="M53 18V11h8" fill="none" stroke="#252d32" stroke-width="3"/><circle cx="63" cy="11" r="3" fill="url(#${robot.id}-head-accent)" stroke="#181e23" stroke-width="2"/>`;
}

function svg(robot, artwork, part) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 82" role="img" aria-label="${robot.label} ${part}">${defs(robot, part)}<g>${artwork}</g></svg>\n`;
}

const roster = Array.from(sandbox.roster);
const entries = [];
for (let index = 0; index < roster.length; index++) {
  const robot = roster[index];
  const folder = path.join(output, robot.id);
  fs.mkdirSync(folder, { recursive: true });
  for (const [part, artwork] of [["body", shellParts(robot, index)], ["head", headParts(robot, index)]]) {
    const file = path.join(folder, `${part}.svg`);
    const source = svg(robot, artwork, part);
    fs.writeFileSync(file, source);
    entries.push({
      id: `robot-models/${robot.id}-${part}`,
      file: `assets/robot-models/${robot.id}/${part}.svg`,
      w: 110, h: 82, alpha: true, kb: Buffer.byteLength(source) / 1024,
      size: "110x82", steps: 0, prompt: `Modular ${part} vector asset for ${robot.label}; ${robot.body} chassis, ${robot.face} face, palette matched to roster.`,
      palette: [robot.color, robot.accent], zone: null, phase: "R", gate: "pass",
      stats: { coverage: 45 }, generationSource: "tools/robot-models.js",
    });
  }
}

const manifestPath = path.join(root, "assets", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.assets = manifest.assets.filter(asset => !asset.id.startsWith("robot-models/"));
manifest.assets.push(...entries);
manifest.assets.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const lines = manifest.assets.map(asset => `  ${JSON.stringify(asset.id)}: ${JSON.stringify(asset.file)},`).join("\n");
fs.writeFileSync(path.join(root, "js", "assets-manifest.js"), `/* Generated asset index. Source: assets/manifest.json. */\nconst ASSET_INDEX = {\n${lines}\n};\n`);
console.log(`${roster.length} robot için ${entries.length} ayrı gövde/kafa SVG modeli üretildi.`);

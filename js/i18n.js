/* Metin yerelleştirme (F2, 12 Ekim 2026) — klasik script, global `I18N`/`t`.
 *
 * TASARIM: Türkçe metinler KODUN İÇİNDE kaynak metindir (mevcut hâli korunur);
 * diğer diller yalnızca birer "override" sözlüğüdür. `t(key, "Türkçe metin")`
 * çağrısı seçili dilde çeviri varsa onu, yoksa verilen Türkçe metni döndürür.
 * Böylece: (a) TR hiçbir koşulda bozulmaz, (b) çeviriler ekran ekran eklenir,
 * (c) eksik çeviri oyunu kırmaz — yalnız Türkçe görünür.
 *
 * Anahtar kuralı: `<ekran>.<öğe>[.<alan>]` → "menu.mode.computer.title".
 * Süzgeç/kalıp: `t("menu.mode.workshop.sub", "Robotlarını kalibre et • {scrap}
 * Hurda", { scrap })` — `{ad}` yer tutucuları `vars` ile doldurulur.
 *
 * DENETİM: tests/i18n.js kod içindeki `t(<anahtar>)` çağrılarının tamamının
 * sözlükte bulunduğunu, sözlükte kodda kullanılmayan anahtar kalmadığını ve
 * her dilin anahtar kümesinin aynı olduğunu doğrular. Yeni anahtar eklerken
 * önce koda yaz, sonra sözlüğe ekle (test sırayı sana söyler).
 *
 * Sıra: index.html'de metin kullanan HERKESTEN önce yüklenir (audio.js'ten de
 * önce), çünkü `GAME_TITLE` gibi başlıklar çizim anında buradan çevrilir.
 */
const LANG_ORDER = ["tr", "en", "zh-Hans", "ru", "es-ES", "pt-BR"];
// Yayın öncesi TAM çeviri zorunlu diller. tests/i18n.js bu dillerde kod içindeki
// her anahtarın karşılığını arar; diğer diller eksik olabilir (kısmi çeviri
// serbest, eksik yerler Türkçe görünür).
const LANG_REQUIRED = ["en"];
// Çalışma zamanında ÜRETİLEN anahtar aileleri (ör. dal/yuva adları: anahtar
// kimlikten kurulur, `t("workshop.branch." + branch, ...)`). tests/i18n.js bu
// öneklerle başlayan sözlük anahtarlarını "kodda kullanılıyor" sayar; hangi
// kimliklerin gerçekten var olduğunu ayrıca kataloglardan doğrular.
const I18N_DYNAMIC_PREFIXES = ["workshop.branch.", "workshop.slot.", "tutorial.coach.", "market.tab.", "weapon.", "part.", "char.", "map.", "mapzone.", "arena.", "service."];
const LANG_LABELS = {
  "tr": "Türkçe",
  "en": "English",
  "zh-Hans": "简体中文",
  "ru": "Русский",
  "es-ES": "Español",
  "pt-BR": "Português (BR)",
};
// Dil tercihi kendi anahtarında tutulur (nwo_muted / nwo_volume gibi profil
// dışı). Profil şemasına taşınması F2b'de yapılacak; o zamana kadar bu anahtar
// tek kaynaktır ve profil silinince dil tercihi kaybolmaz.
const I18N_STORAGE_KEY = "nwo_locale";

/* Sözlükler. `tr` BİLEREK boş: kaynak metinler kodun içindedir. Yeni bir dil
 * eklerken buraya anahtar kümesi eklenir; küme `en` ile birebir aynı olmalıdır
 * (tests/i18n.js eşitliği zorlar). */
const I18N = {
  tr: {},
  en: {
    // ── Ayarlar Menüsü (Settings) ──────────────────────────────────────
    "menu.settings": "SETTINGS",
    "hud.settings": "Settings",
    "hud.settings.title": "Settings (O)",
    "settings.title": "Settings",
    "settings.close.title": "Close (Esc)",
    "settings.tab.audio": "Audio",
    "settings.tab.graphics": "Display",
    "settings.tab.gameplay": "Gameplay",
    "settings.tab.controls": "Controls",
    "settings.tab.profile": "Profile & Data",
    "settings.audio.sfxHeading": "Sound Effects",
    "settings.audio.sfxVolume": "SFX Volume",
    "settings.audio.mute": "Mute Sound",
    "settings.audio.unmute": "Unmute Sound",
    "settings.audio.test": "Test Sound",
    "settings.audio.musicHeading": "Music",
    "settings.audio.musicVolume": "Music Volume",
    "settings.audio.musicMute": "Mute Music",
    "settings.audio.musicUnmute": "Unmute Music",
    "settings.graphics.heading": "Display & Visuals",
    "settings.graphics.fullscreenLabel": "Fullscreen Mode",
    "settings.graphics.fullscreenSub": "Can also be toggled with F",
    "settings.graphics.enterFullscreen": "Enter Fullscreen",
    "settings.graphics.exitFullscreen": "Exit Fullscreen",
    "settings.graphics.damageLabel": "Damage Popups",
    "settings.graphics.damageSub": "Numbers popping up upon hits",
    "settings.graphics.aimLabel": "Aim Guide Line",
    "settings.graphics.aimSub": "Previous turn angle and tracer guide",
    "settings.graphics.fpsLabel": "FPS Counter",
    "settings.graphics.fpsSub": "Show frame rate at top-left",
    "settings.gameplay.heading": "Gameplay & Language",
    "settings.gameplay.langLabel": "Interface Language",
    "settings.gameplay.langSub": "Switch text and display language",
    "settings.gameplay.matchRules": "Match Rules:",
    "settings.gameplay.ruleTurn": "Turn time for aiming and moving is limited.",
    "settings.gameplay.ruleWind": "Wind affects projectile trajectory, observe direction.",
    "settings.gameplay.ruleEnergy": "Moving and jumping consumes energy, spend wisely.",
    "settings.controls.heading": "Keyboard & Mouse Mapping",
    "settings.controls.combatHeading": "Movement & Combat",
    "settings.controls.systemHeading": "System & Shortcuts",
    "settings.controls.or": "or",
    "settings.controls.move": "Move (Consumes energy)",
    "settings.controls.jump": "Jump",
    "settings.controls.mouseAim": "Mouse Movement",
    "settings.controls.aim": "Aim Angle",
    "settings.controls.mouseHold": "Left Click (Hold)",
    "settings.controls.shoot": "Charge Power & Fire",
    "settings.controls.module": "Inherent Module Skill",
    "settings.controls.weapons": "Weapon / Ammo Selection",
    "settings.controls.fullscreen": "Toggle Fullscreen",
    "settings.controls.mute": "Toggle Audio Mute",
    "settings.controls.settings": "Settings Menu / Back",
    "settings.profile.heading": "Profile Information",
    "settings.profile.scrapLabel": "Current Scrap:",
    "settings.profile.partsLabel": "Owned Parts:",
    "settings.profile.scrapUnit": "Scrap",
    "settings.profile.partsUnit": "Parts",
    "settings.profile.backupTitle": "Backup Profile (Export)",
    "settings.profile.backupDesc": "Copy your save data to clipboard to keep it safe.",
    "settings.profile.exportBtn": "Copy Profile to Clipboard",
    "settings.profile.copied": "Copied to clipboard!",
    "settings.profile.promptCopy": "Copy profile text:",
    "settings.profile.restoreTitle": "Restore Save (Import)",
    "settings.profile.restoreDesc": "Paste previously copied JSON profile data.",
    "settings.profile.restorePlaceholder": "Profile JSON text",
    "settings.profile.importBtn": "Import",
    "settings.profile.importSuccess": "Profile loaded successfully!",
    "settings.profile.importError": "Invalid profile data!",
    "settings.profile.resetHeading": "Reset",
    "settings.profile.resetWarning": "Scrap, parts and upgrades will be deleted!",
    "settings.profile.resetBtn": "Reset All Progress",
    "settings.profile.resetConfirm": "Are you sure? Click again to reset",
    "settings.profile.resetDone": "Progress reset.",

    // ── Çevrimiçi (F3c) ────────────────────────────────────────────────
    "menu.mode.online.title": "Online",
    "menu.mode.online.sub": "2–6 players by room code — over the internet",
    "online.title": "ONLINE",
    "online.subtitle": "Operators sharing one room code — over the internet (2–6)",
    "online.modeBadge": "● P2P ONLINE NETWORK",
    "online.role.host": "CREATE ROOM",
    "online.role.host.sub": "Generate a code, invite a friend",
    "online.role.hostBadge": "NEW ROOM",
    "online.role.join": "JOIN WITH CODE",
    "online.role.join.sub": "Type your friend's code",
    "online.role.joinBadge": "JOIN CODE",
    "online.charSelect.title": "Select Your Online Robot",
    "online.charSelect.sub": "Click a robot card to equip it for online matches",
    "online.charSelect.current": "EQUIPPED",
    "online.code.title": "ROOM CODE",
    "online.code.hint": "Type the code — it joins on the last letter (Enter works too)",
    "online.code.paste": "You can paste the invite link (Ctrl+V)",
    "online.back": "‹ Back",
    "online.seats.title": "SEATS",
    "online.seat.empty": "Waiting…",
    "online.seat.host": "ROOM OWNER",
    "online.seat.guest": "GUEST",
    "online.seat.number": "SEAT {n}",
    "online.seat.bot": "BOT",
    "online.seats.capacity": "SEATS {n}",
    "online.seat.waiting": "NOT CONNECTED",
    "online.seat.ready": "READY",
    "online.seat.notReady": "NOT READY",
    "online.seat.you": "YOU",
    "online.roomCode": "ROOM CODE",
    "online.roomCode.hint": "Your friend types this code on the JOIN screen",
    "online.invite.copy": "COPY INVITE LINK",
    "online.invite.copied": "Invite link copied",
    "online.invite.failed": "Could not copy — share the code manually",
    "online.start": "START MATCH",
    "online.startWait": "Starts when every player is ready",
    "online.ready": "I'M READY",
    "online.readyCancel": "NOT READY",
    "online.readyWait": "The match starts when the room owner begins",
    "online.leave": "‹ LEAVE",
    "online.robot.title": "YOUR ROBOT",
    "online.robot.hint": "Change with ◀ ▶",
    "online.robot.select": "SELECT ROBOT",
    "online.robot.change": "CHANGE ROBOT",
    "online.robot.viewAll": "View and select all robots",
    "online.status.idle": "Ready",
    "online.status.connecting": "Connecting…",
    "online.status.open": "Connection established",
    "online.status.closed": "Connection closed",
    "online.notice.joined": "Opponent joined the room",
    "online.notice.seatsOccupied": "Cannot remove seats while players are connected",
    "online.notice.codePasted": "Room code pasted",
    "online.notice.roomNotReady": "The room is not ready yet — try again in a second",
    "online.notice.startNeedsReady": "Starts when every player is ready",
    "online.notice.left": "A player left the room",
    "online.notice.resumed": "A player rejoined the match",
    "online.status.preparing": "Preparing the room…",
    "online.notice.notYourTurn": "It is not your turn",
    "online.notice.shotUsed": "Your shot for this turn is used",
    "online.notice.noCharge": "Power charge was closed",
    "online.notice.noAmmo": "That weapon is out of ammo",
    "online.notice.staleTurn": "The turn closed — command is stale",
    "online.notice.conflict": "Command conflict — try again",
    "online.notice.rejected": "Command not applied: {reason}",
    "hud.banner.online": "Online room",
    "hud.banner.onlineLoading": "Synchronising the world…",
    "online.loading.title": "Synchronising the world",
    "online.loading.sub": "Fetching terrain and starting state from the host…",
    "online.loading.code": "Room: {code}",
    "online.loss.sub": "The other side won — create a new room and try again.",
    "online.abort.title": "Online match ended",
    "online.abort.LEFT": "You left the match.",
    "online.abort.SIM_DEBT": "The simulation fell behind — the match was cancelled.",
    "online.abort.REMATCH": "The room owner restarted the match.",
    "online.abort.ABORTED": "The match was cancelled.",
    "online.err.NO_PEERJS": "Could not load the online library (internet required)",
    "online.err.PROTOCOL_MISMATCH": "Version mismatch — both sides must run the current build",
    "online.err.ROOM_FULL": "The room is full",
    "online.err.ROOM_NOT_FOUND": "Room not found — check the code",
    "online.err.BAD_CODE": "The code must be 5 characters",
    "online.err.TIMEOUT": "Connection timed out",
    "online.err.CLOSED": "The other side disconnected",
    "online.err.CONNECT": "Could not connect — try again",
    "online.err.NETWORK": "Network error — check your connection",
    "online.err.BROWSER": "This browser does not support WebRTC",
    "online.err.PEER_INIT": "Could not start the connection",
    "online.err.NOT_HOST": "This room is not hosted here",
    "online.err.NOT_GUEST": "This side cannot send that message",
    "online.err.WRONG_PHASE": "The match is not in the right phase",
    "online.err.NO_MATCH_ID": "Room identity is missing",

    // ── Marka ve menü ──────────────────────────────────────────────────
    "brand.title": "OUT OF WARRANTY",
    "menu.tagline": "Start the arena allocation protocol",
    "menu.hint": "Pick a section with the mouse",
    "menu.mode.computer.title": "Versus Automated Units",
    "menu.mode.computer.sub": "1 operator vs 1–3 factory robots",
    "menu.mode.local.title": "Local Operators",
    "menu.mode.local.sub": "2–6 players on one device",
    "menu.mode.workshop.title": "WORKSHOP",
    "menu.mode.workshop.sub": "Calibrate robots • {scrap} Scrap",
    "menu.mode.market.title": "AMMO MARKET",
    "menu.mode.market.sub": "In depot: {n} shells • {scrap} Scrap",
    "menu.mode.market.subEmpty": "Shared depot • {scrap} Scrap",
    "menu.mode.tutorial.title": "HOW TO PLAY",
    "menu.mode.tutorial.sub": "Controls and turn rules",
    "menu.badge.scrap": "{scrap} SCRAP",
    "menu.badge.workshop": "WORKSHOP ›",
    "menu.mode.badge.ai": "VS BOTS",
    "menu.mode.badge.local": "2–6 PLAYERS",
    "menu.mode.badge.online": "LIVE P2P",
    "menu.status.ready": "SYSTEM READY",
    "menu.card.enter": "ENTER ➔",
    "tutorial.title": "HOW TO PLAY",
    "tutorial.sub": "Field controls and basic combat engagement rules",
    // ── Savaş HUD'u (dil seçici, üst şerit, alt panel) ──────────────────
    // ── Mod/oyuncu/harita seçimi + modül kartı (F2c-4b) ────────────────
    "mode.difficulty.title": "Choose difficulty",
    "mode.difficulty.sub": "Select AI combat calibration",
    "difficulty.easy": "Easy",
    "difficulty.normal": "Normal",
    "difficulty.hard": "Hard",
    "difficulty.expert": "Expert",
    "difficulty.desc.easy": "Low accuracy, ideal for rookie pilots",
    "difficulty.desc.normal": "Balanced aiming and moderate reflex",
    "difficulty.desc.hard": "High accuracy and aggressive maneuvering",
    "difficulty.desc.expert": "Flawless ballistic calculation",
    "common.selected": "SELECTED",
    "mode.botCount.title": "Choose the number of opponents",
    "mode.botCount.sub": "Number of opponent bots to deploy into simulation",
    "opponents.1": "1 Opponent",
    "opponents.1.desc": "One-on-one tactical duel",
    "opponents.2": "2 Opponents",
    "opponents.2.desc": "Three-way crossfire engagement",
    "opponents.3": "3 Opponents",
    "opponents.3.desc": "Four-player all-out battlefield melee",
    "mode.playerCount.title": "How many players?",
    "mode.playerCount.sub": "Number of players taking turns on this machine",
    "mode.playerCount.players": "{n} PLAYERS",
    "mode.playerCount.hint": "Click a number — then each player picks a robot in turn",
    "mode.playerCount.hintFast": "Two players is the fastest way to test",
    "charSelect.localNote": "Standard calibration — upgrades off",
    "charSelect.locked": "LOCKED",
    "charSelect.reqLevel": "Account Lv. {level} Required",
    "charSelect.reqPrice": "Price: {price} 🔩",
    "charSelect.balance": "(Balance: {scrap} 🔩)",
    "charSelect.canUnlock": "AVAILABLE TO UNLOCK!",
    "charSelect.buyAction": "UNLOCK FOR {price} 🔩",
    "mapSelect.title": "Choose an Arena",
    "online.map.title": "ARENA",
    "map.furnace.label": "Molten Foundry",
    "map.furnace.hint": "Two high side ramps overlook a narrow, dangerous basin.",
    "map.crane_yard.label": "Night Crane Yard",
    "map.crane_yard.hint": "Climb stepped roofs and suspended platforms for a fast, exposed route.",
    "map.reactor_garden.label": "Rootbound Reactor",
    "map.reactor_garden.hint": "Two high firing ledges overlook a low valley between them.",
    "map.moon_scrapyard.label": "Lunar Scrapfield",
    "map.moon_scrapyard.hint": "Debris islands overlook a continuous safe lower route.",
    "map.ice_rift.label": "Ice Rift",
    "map.ice_rift.hint": "A deadly bottomless crevasse splits the shores; falling knocks you out.",
    "map.flooded_lab.label": "Flooded Laboratory",
    "map.flooded_lab.hint": "An elevated perimeter surrounds a walled arena with breakable inner barriers.",
    "skill.cooldown": "{n} turns until ready",
    "skill.consumesShot": "Uses up the turn's shot",
    "hud.turnIdle": "Turn: -",
    "hud.windIdle": "Wind: -",
    "hud.rotateScreen": "Please Rotate Your Device",
    "hud.rotateSub": "Landscape orientation is required for optimal gameplay.",
    "hud.language": "Language",
    "hud.fullscreen": "Fullscreen",
    "hud.fullscreen.title": "Fullscreen (F)",
    "hud.quit": "Quit",
    "hud.quit.title": "Back to menu (Esc)",
    "hud.audio.group": "Sound settings",
    "hud.volume": "Volume level",
    "hud.sfx.label": "SFX",
    "hud.mute.off": "Mute",
    "hud.mute.on": "Unmute",
    "hud.mute.labelOff": "Sound",
    "hud.mute.labelOn": "Muted",
    "hud.music.volume": "Music volume",
    "hud.music.on": "Unmute music",
    "hud.music.off": "Mute music",
    "hud.music.label": "Music",
    "hud.music.labelOff": "Music",
    "hud.music.labelOn": "Music Off",
    "hud.powerMarker": "Last shot power",
    "hud.lastShotAngle": "Last: {deg}°",
    "hud.goWorkshop": "Go to workshop",
    "hud.playAgain": "Play again",
    "hud.mainMenu": "Main menu",
    "hud.robots": "Robots",
    "hud.weaponList.title": "Toggle weapon list (1–9)",
    "hud.weaponToggle.a": "WEAPON",
    "hud.weaponToggle.b": "SWITCH",
    "hud.slot.weapon": "Selected weapon",
    "hud.slot.skill": "Built-in module (Q)",
    "hud.slot.teleport": "Teleport ball",
    "hud.slot.hook": "Grapple",
    "hud.slot.teleportShort": "Teleport",
    // Durum şeridi (canvas ekranları) — {n}/{name}/{secs}/{dir}/{value} kalıpları
    "hud.banner.mode": "Selecting game mode…",
    "hud.banner.difficulty": "Selecting difficulty…",
    "hud.banner.botCount": "Selecting opponent count…",
    "hud.banner.playerCount": "Selecting player count…",
    "hud.banner.charSelect": "Player {n} is picking a robot…",
    "hud.banner.mapSelect": "Selecting factory zone…",
    "hud.banner.workshop": "Workshop",
    "hud.banner.market": "Ammo Market",
    "hud.banner.tutorial": "How to Play — controls and turn rules",
    "hud.banner.alloc": "Allocation Complete",
    "hud.banner.turn": "Turn: {name}  ⏱ {secs}s",
    "hud.wind": "Wind: {dir} {value}",
    "hud.wind.changed": "Wind changed: {dir} {value}",
    "hud.wind.none": "Wind: -",
    // ── Ortak metinler ────────────────────────────────────────────────────
    "common.back": "‹ Back",
    "common.forward": "Forward ›",
    "common.mainMenu": "‹ Main Menu",
    "common.page": "Page {n} / {total}",
    "common.pageShort": "{n}/{total}",
    "common.scrap": "Scrap: {scrap}",
    "common.page": "Page {page} / {total}",
    // ── Atölye (F2b-2) ───────────────────────────────────────────────────
    "workshop.title": "WORKSHOP",
    "workshop.subtitleParts": "Install parts — parts apply in the same matches as upgrades",
    "workshop.subtitleUpgrades": "Calibrate your robots — upgrades only apply in matches versus the computer",
    "workshop.robotMeta": "{label} · {role}",
    "workshop.serviceLevel": "Service Level {level}{suffix}",
    "workshop.masterService": " — Master Service",
    "workshop.robotCardMeta": "Lv. {level} • {tiers}/9",
    "workshop.stats": "Matches {matches} • Wins {wins}",
    "workshop.maxCalibration": "Full Calibration",
    "workshop.branchDone": "This branch is complete",
    "workshop.tier": "Tier {tier}",
    "workshop.branchPanel": "{branch} — {tier}",
    "workshop.action.locked": "{branch} — Tier {tier} locked",
    "workshop.action.short": "{branch} — Tier {tier} — {cost} Scrap",
    "workshop.action.upgrade": "{branch} — Upgrade tier {tier} — {cost} Scrap",
    "workshop.modelLocked": "THIS MODEL IS LOCKED",
    "workshop.reqLevel": "Required Account Level: Lv. {req} (Current: Lv. {cur})",
    "workshop.reqPrice": "Price: {price} 🔩 Scrap",
    "workshop.action.unlock": "ACTIVATE FOR {cost} 🔩",
    "workshop.action.levelReq": "LEVEL REQUIRED (Lv. {level})",
    "workshop.action.scrapReq": "INSUFFICIENT SCRAP ({cost} 🔩)",
    "workshop.reason.serviceLevel": "Service Level {level} required",
    "workshop.reason.shortScrap": "{cost} Scrap short",
    "workshop.current.irreversible": "Current: {tier} • cannot be undone",
    "workshop.current.needsLevel": "Current: {tier} • Lv. {level} required • {cost} Scrap",
    "workshop.tab.upgrades": "UPGRADES",
    "workshop.tab.parts": "PARTS",
    "workshop.pickPart": "{slot} {index} — pick a part",
    "workshop.noPartInInventory": "No {slot} part in inventory — buy one in the Market",
    "workshop.clearSlot": "Leave empty",
    "workshop.clearSubSlot": "Clear this sub-slot",
    "workshop.partHere": "✓ here",
    "workshop.partInSlot": "✓ in slot {index}",
    "workshop.empty": "Empty",
    "workshop.partsHint": "Click a cell → pick a part • {perSlot} parts per slot • removal is free",
    // Dinamik aile (I18N_DYNAMIC_PREFIXES): dal ve yuva adları
    "workshop.branch.chassis": "Chassis",
    "workshop.branch.module": "Attachment",
    "workshop.branch.core": "Core",
    "workshop.slot.helmet": "Helmet",
    "workshop.slot.body": "Body",
    "workshop.slot.tool": "Tool",
    "workshop.slot.feet": "Feet",
    // ── Nasıl Oynanır ekranı ve eğitim koçu (F2b-3) ───────────────────────
    "tutorial.panel.aim.title": "YOUR TURN — SHOOTING",
    "tutorial.panel.move.title": "MOVEMENT",
    "tutorial.panel.weapons.title": "WEAPONS AND MODULES",
    "tutorial.panel.rules.title": "RULES AND TIPS",
    "tutorial.aim.mouse.key": "Mouse",
    "tutorial.aim.mouse.desc": "Aim — the guide line follows the mouse",
    "tutorial.aim.click.key": "Left click",
    "tutorial.aim.click.desc": "Hold → power builds, release → fire",
    "tutorial.aim.cancel.key": "Right click / Esc",
    "tutorial.aim.cancel.desc": "Cancel the shot",
    "tutorial.move.walk.key": "A / D  ← →",
    "tutorial.move.walk.desc": "Walk (costs energy)",
    "tutorial.move.jump.key": "W / ↑",
    "tutorial.move.jump.desc": "Jump (costs energy)",
    "tutorial.move.energy.key": "⚡ Energy",
    "tutorial.move.energy.desc": "Refills every turn — runs out fast",
    "tutorial.weapons.select.key": "1–9 / Wheel",
    "tutorial.weapons.select.desc": "Pick a weapon (ammo is limited)",
    "tutorial.weapons.module.key": "Q",
    "tutorial.weapons.module.desc": "Use the built-in module — a damaging one uses that turn's shot",
    "tutorial.weapons.panel.key": "Bottom panel",
    "tutorial.weapons.panel.desc": "The selected weapon's description shows at the bottom",
    "tutorial.rules.timer.key": "⏱ 25 s",
    "tutorial.rules.timer.desc": "When time runs out the turn passes to the opponent",
    "tutorial.rules.wind.key": "🌀 Wind",
    "tutorial.rules.wind.desc": "Pushes the shell off course — watch the gauge up top",
    "tutorial.rules.audio.key": "M • Esc / ⏏",
    "tutorial.rules.audio.desc": "Mute • leave the match and return to the menu",
    "tutorial.strip.flow": "One turn: move → aim → charge → fire",
    "tutorial.strip.turn": "When the shot resolves or time runs out the turn passes on — last robot standing wins",
    "tutorial.play": "▶ PLAY THE TUTORIAL",
    "tutorial.play.desc": "Simple round: 1v1, no wind, step-by-step guidance",
    "tutorial.status.resolving": "Resolving the shot…",
    "tutorial.status.opponent": "Opponent's turn — watch and learn",
    "tutorial.status.done": "✓ Done! Next step…",
    "tutorial.badge": "TUTORIAL",
    // Dinamik aile: koç adımları (indeksle üretilir)
    "tutorial.coach.0": "Walk with A / D or ← → (costs energy)",
    "tutorial.coach.1": "Jump with W or ↑ (costs energy)",
    "tutorial.coach.2": "Aim with the mouse — turn the line",
    "tutorial.coach.3": "Hold left click → power builds → release and fire",
    "tutorial.coach.4": "Free for all! Take out the opponent — try the Q module and weapons 1–9",
    // ── Cephane Pazarı (F2b-4) ──────────────────────────────────────────
    "market.title": "MARKET",
    "market.tab.ammo": "AMMO",
    "market.tab.helmet": "HELMET",
    "market.tab.body": "BODY",
    "market.tab.tool": "TOOL",
    "market.tab.feet": "FEET",
    "market.depotSummary": "Shared depot: {total} shells • {weapons} weapons",
    "market.partsSummary": "{slot} slot: {have}/{total} parts • equip in the Workshop",
    "market.full": "Full",
    "market.price": "{price} Scrap",
    "market.ammoMeta": "Base {base} • Battle ≤{max} • Depot {have}/{cap}",
    "market.bulkShift": "Shift ×{qty}",
    "market.ammoNote": "The depot banks up to {cap}; a match loads only the battle cap and the rest returns afterwards • Shift ×{qty} / Ctrl ×{big}",
    "market.ammoFallback": "Ammo",
    "market.owned": "Owned",
    "market.equippedOne": "Equipped → {robot}",
    "market.equippedMany": "Equipped → on {count} robots",
    "market.inInventory": "In inventory • equip in the Workshop",
    "market.partUsable": "Fits the {slot} slot • equips on any robot",
    "market.partsNote": "{slot} parts are a one-time purchase • the same part fits every robot (no copies needed) • equip in the Workshop",
    "market.prev": "‹ Previous",
    "market.next": "Next ›",
    "market.fail": "Purchase failed",
    "market.ammoDepotFull": "{label} depot is full (limit {cap})",
    "market.scrapRequired": "Need {cost} Scrap for {label}",
    "market.notSellable": "{label} is not for sale",
    "market.ammoBought": "{qty}× {label} bought  (−{cost} Scrap)",
    "market.partFallback": "Part",
    "market.alreadyOwned": "{label} is already in your inventory — equip it in the Workshop",
    "market.unknownPart": "Unknown part",
    "market.partBought": "{label} bought (−{cost} Scrap) — equip it on a robot in the Workshop",
    // ── Atölye takma bildirimleri ───────────────────────────────────────
    "workshop.failEquip": "Equip failed",
    "workshop.notOwned": "That part is not in your inventory",
    "workshop.slotMismatch": "That part does not fit this slot",
    "workshop.invalidIndex": "Invalid sub-slot",
    "workshop.slotWhere": "{slot} {index}",
    "workshop.equipped": "{part} equipped ({where})",
    "workshop.cleared": "{where} slot cleared",
    // ── Maç sonu kaplaması + depolama uyarısı ───────────────────────────
    "overlay.tutorial.winTitle": "Tutorial complete! 🎓",
    "overlay.tutorial.winSub": "You're ready — start real matches from the main menu.",
    "overlay.tutorial.lossTitle": "You lost the tutorial match",
    "overlay.tutorial.lossSub": "Don't worry — hit 'Play Again' to retry the same round.",
    "overlay.tutorial.drawTitle": "A draw!",
    "overlay.match.winTitle": "{name} took the scrap round! 🏆",
    "overlay.match.drawTitle": "The round ended in a draw!",
    "overlay.match.drawSub": "Both robots were destroyed.",
    "hud.report": "Report",
    "hud.report.title": "Copy the error report",
    "hud.report.copied": "Copied",
    "hud.report.failed": "Could not copy",
    "overlay.reward": "+{scrap} Scrap  •  +{xp} Service XP",
    "overlay.ad.double": "Watch an ad · Double the scrap",
    "overlay.ad.loading": "Loading ad…",
    "overlay.ad.failed": "Ad could not open — try again",
    "overlay.ad.doubled": "Ad reward: 2× scrap 🎬",
    "overlay.levelUp": "{robot}Service Level {before} → {after}",
    "storage.warning": "Progress could not be saved this session.",
    // ── Veri katalogları: silahlar (F2c-1) ──────────────────────────────
    "weapon.bazooka.name": "Bazooka",
    "weapon.bazooka.special": "Balanced",
    "weapon.bazooka.desc": "Balanced rocket. Explodes where it hits.",
    "weapon.grenade.name": "Grenade",
    "weapon.grenade.special": "Bounces • fuse",
    "weapon.grenade.desc": "Rolls and bounces, then explodes when the fuse runs out.",
    "weapon.sniper.name": "Sniper",
    "weapon.sniper.special": "Fast • piercing",
    "weapon.sniper.desc": "Flies very fast and straight; heavy damage on a direct hit.",
    "weapon.shotgun.name": "Shotgun",
    "weapon.shotgun.special": "5 pellets",
    "weapon.shotgun.desc": "Five pellets per shot; wide spread, short range.",
    "weapon.cluster.name": "Cluster",
    "weapon.cluster.special": "Splits mid-air",
    "weapon.cluster.desc": "Splits into fragments on impact and sets off several explosions.",
    "weapon.triple.name": "Triple Rocket",
    "weapon.triple.special": "3 rockets • spread",
    "weapon.triple.desc": "Fires three rockets at once; wide spread.",
    "weapon.sticky.name": "Sticky Bomb",
    "weapon.sticky.special": "Sticks • fuse",
    "weapon.sticky.desc": "Sticks where it lands and blows up on a short fuse.",
    "weapon.rubber.name": "Rubber Bomb",
    "weapon.rubber.special": "Very bouncy • fuse",
    "weapon.rubber.desc": "Bounces hard off walls; explodes when the fuse runs out.",
    "weapon.rubbertrio.name": "Rubber Trio",
    "weapon.rubbertrio.special": "3 bounces",
    "weapon.rubbertrio.desc": "Three bouncy bombs; wide spread.",
    "weapon.grenadetrio.name": "Grenade Trio",
    "weapon.grenadetrio.special": "3 bombs • fuse",
    "weapon.grenadetrio.desc": "Three grenades; wide spread, fuse-detonated.",
    "weapon.megacluster.name": "Mega Cluster",
    "weapon.megacluster.special": "8 fragments",
    "weapon.megacluster.desc": "Splits into eight fragments on impact.",
    "weapon.nuke.name": "Nuke",
    "weapon.nuke.special": "Huge blast",
    "weapon.nuke.desc": "Massive blast. Slow but devastating.",
    "weapon.barrage.name": "Rocket Barrage",
    "weapon.barrage.special": "5 rockets",
    "weapon.barrage.desc": "Five rockets per shot; wide spread.",
    "weapon.mirv.name": "MIRV",
    "weapon.mirv.special": "Splits overhead",
    "weapon.mirv.desc": "Splits into fragments at the top of its arc.",
    "weapon.airstrike.name": "Airstrike",
    "weapon.airstrike.special": "Strike from above",
    "weapon.airstrike.desc": "Six bombs rain down on the mouse target.",
    "weapon.drill.name": "Drill",
    "weapon.drill.special": "Piercing",
    "weapon.drill.desc": "Drills through terrain, then explodes.",
    "weapon.mine.name": "Mine",
    "weapon.mine.special": "Triggers on approach",
    "weapon.mine.desc": "Dropped on the ground; hits whoever comes near once armed.",
    "weapon.napalm.name": "Napalm",
    "weapon.napalm.special": "Burning field",
    "weapon.napalm.desc": "Explodes and leaves a burning area behind.",
    "weapon.teleportball.name": "Teleport Ball",
    "weapon.teleportball.special": "Teleports",
    "weapon.teleportball.desc": "Teleports you above where it lands; deals no damage.",
    "weapon.hook.name": "Hook",
    "weapon.hook.special": "Pulls you",
    "weapon.hook.desc": "Flies straight and pulls you to whatever it grabs; deals no damage.",
    // ── Veri katalogları: parçalar (F2c-2) ──────────────────────────────
    "part.nisan_mercegi.label": "Aiming Scope",
    "part.nisan_mercegi.desc": "Weapon shells hit 5% harder",
    "part.termal_vizor.label": "Thermal Visor",
    "part.termal_vizor.desc": "Module power +6%",
    "part.denge_sensoru.label": "Balance Sensor",
    "part.denge_sensoru.desc": "Reduces knockback by 10%",
    "part.hedef_takip.label": "Target Tracking Unit",
    "part.hedef_takip.desc": "Weapon shells hit 8% harder",
    "part.radar_anteni.label": "Radar Antenna",
    "part.radar_anteni.desc": "Module power +9%",
    "part.zirh_kaski.label": "Armored Helmet",
    "part.zirh_kaski.desc": "Armor +4% • knockback −5%",
    "part.lehim_yamasi.label": "Solder Patch",
    "part.lehim_yamasi.desc": "Max HP +15",
    "part.kompozit_plaka.label": "Composite Plate",
    "part.kompozit_plaka.desc": "Armor +6%",
    "part.sogutucu_radyator.label": "Cooling Radiator",
    "part.sogutucu_radyator.desc": "Max energy +10",
    "part.takviyeli_govde.label": "Reinforced Hull",
    "part.takviyeli_govde.desc": "HP +10%",
    "part.cift_kat_plaka.label": "Double-Layer Plate",
    "part.cift_kat_plaka.desc": "Armor +9%",
    "part.basinc_hucre.label": "Pressure Cell",
    "part.basinc_hucre.desc": "Energy +14 • HP +8",
    "part.yedek_yukleyici.label": "Backup Loader",
    "part.yedek_yukleyici.desc": "Module cooldown shortened by 1 turn (minimum 2)",
    "part.takviye_bobini.label": "Boost Coil",
    "part.takviye_bobini.desc": "Module power +8%",
    "part.hassas_ayar_civtasi.label": "Fine-Tuning Bolt",
    "part.hassas_ayar_civtasi.desc": "Weapon damage +4%",
    "part.asiri_yuk_bobini.label": "Overload Coil",
    "part.asiri_yuk_bobini.desc": "Module power +12%",
    "part.namlu_aparati.label": "Barrel Attachment",
    "part.namlu_aparati.desc": "Weapon damage +7%",
    "part.zamanlayici_cip.label": "Timer Chip",
    "part.zamanlayici_cip.desc": "Module cooldown −1 turn • module power +4%",
    "part.denge_jiroskobu.label": "Balance Gyro",
    "part.denge_jiroskobu.desc": "Reduces knockback by 12%",
    "part.yay_takozlari.label": "Spring Pads",
    "part.yay_takozlari.desc": "Max energy +8",
    "part.turbo_palet.label": "Turbo Tracks",
    "part.turbo_palet.desc": "Move speed +10%",
    "part.sicrama_yayi.label": "Jump Spring",
    "part.sicrama_yayi.desc": "Jump power +10%",
    "part.kilitli_taban.label": "Locking Base",
    "part.kilitli_taban.desc": "Reduces knockback by 15%",
    "part.cift_turbo.label": "Dual Turbo Tracks",
    "part.cift_turbo.desc": "Move speed +16%",
    // ── Veri katalogları: robotlar (F2c-3) ─────────────────────────────
    "char.kopek.role": "Maintenance",
    "char.kopek.skill.label": "Emergency Repair",
    "char.kopek.skill.desc": "Gain 25 HP",
    "char.kedi.role": "Defense",
    "char.kedi.skill.label": "Polar Shield",
    "char.kedi.skill.desc": "Block the next hit",
    "char.ayi.role": "Demolition",
    "char.ayi.skill.label": "Pressure Loading",
    "char.ayi.skill.desc": "Next blast is bigger",
    "char.tavsan.role": "Scout",
    "char.tavsan.skill.label": "Spring Launcher",
    "char.tavsan.skill.desc": "High jump",
    "char.tilki.role": "Artillery",
    "char.tilki.skill.label": "Twin Barrel",
    "char.tilki.skill.desc": "Fire two shells",
    "char.panda.role": "Loading",
    "char.panda.skill.label": "Press Strike",
    "char.panda.skill.desc": "Heavy blow to the target ahead",
    "char.kaplan.role": "Cutting",
    "char.kaplan.skill.label": "Twin Cutter",
    "char.kaplan.skill.desc": "Slashing attack ahead",
    "char.timsah.role": "Hauling",
    "char.timsah.skill.label": "Rotary Joint",
    "char.timsah.skill.desc": "Knocks the target ahead away",
    "char.suaygiri.role": "Loading",
    "char.suaygiri.skill.label": "Hydraulic Claw",
    "char.suaygiri.skill.desc": "Massive claw slam",
    "char.koala.role": "Calibration",
    "char.koala.skill.label": "Tuning Mallet",
    "char.koala.skill.desc": "Mallet blow ahead",
    "char.kunduz.role": "Riveting",
    "char.kunduz.skill.label": "Balance Hammer",
    "char.kunduz.skill.desc": "Powerful knockback ahead",
    "char.ordek.role": "Welding",
    "char.ordek.skill.label": "Spot Weld Strike",
    "char.ordek.skill.desc": "Fast blow ahead",
    "char.kokarca.role": "Waste",
    "char.kokarca.skill.label": "Waste Gas",
    "char.kokarca.skill.desc": "Sprays corrosive gas forward",
    "char.aslan.role": "Energy",
    "char.aslan.skill.label": "EMP Strike",
    "char.aslan.skill.desc": "Blasts energy around you",
    "char.kurtadam.role": "Alarm",
    "char.kurtadam.skill.label": "Alarm Resonance",
    "char.kurtadam.skill.desc": "Knocks back with a sound wave",
    "char.sirtlan.role": "Vibration",
    "char.sirtlan.skill.label": "Frequency Overflow",
    "char.sirtlan.skill.desc": "Hits the area with resonance",
    "char.rakun.role": "Separation",
    "char.rakun.skill.label": "Centrifuge",
    "char.rakun.skill.desc": "Knocks everything around you back",
    "char.ornitorenk.role": "Cooling",
    "char.ornitorenk.skill.label": "Coolant Vent",
    "char.ornitorenk.skill.desc": "Liquid wave around you",
    "char.yeti.role": "Cooling",
    "char.yeti.skill.label": "Cryo Strike",
    "char.yeti.skill.desc": "Cold burst around you",
    "char.dino.role": "Press",
    "char.dino.skill.label": "Ground Maul",
    "char.dino.skill.desc": "Shakes every opponent",
    "char.gergedan.role": "Courier",
    "char.gergedan.skill.label": "Turbo Wheel",
    "char.gergedan.skill.desc": "Charge forward, damaging what you hit",
    "char.kirpi.role": "Bearing",
    "char.kirpi.skill.label": "Bearing Charge",
    "char.kirpi.skill.desc": "Ram by rolling",
    "char.maymun.role": "Rack Service",
    "char.maymun.skill.label": "Service Hook",
    "char.maymun.skill.desc": "Long-distance jump",
    "char.kanguru.role": "High Rack",
    "char.kanguru.skill.label": "Overload Spring",
    "char.kanguru.skill.desc": "Very high jump",
    "char.yarasa.role": "Ventilation",
    "char.yarasa.skill.label": "Emergency Rotor",
    "char.yarasa.skill.desc": "Glide this turn",
    "char.armadillo.role": "Excavation",
    "char.armadillo.skill.label": "Depth Auger",
    "char.armadillo.skill.desc": "Burrow into the ground",
    "char.hamster.role": "Security",
    "char.hamster.skill.label": "Armor Lock",
    "char.hamster.skill.desc": "Halve damage for 2 turns",
    "char.bukalemun.role": "Inspection",
    "char.bukalemun.skill.label": "Optic Deflector",
    "char.bukalemun.skill.desc": "Block the next hit",
    "char.ejderha.role": "Casting",
    "char.ejderha.skill.label": "Slag Sphere",
    "char.ejderha.skill.desc": "Hurl a molten metal sphere",
    "char.penguen.role": "Cooling",
    "char.penguen.skill.label": "Coolant Capsule",
    "char.penguen.skill.desc": "Launch two capsules",
    "char.oklukirpi.role": "Assembly",
    "char.oklukirpi.skill.label": "Rivet Salvo",
    "char.oklukirpi.skill.desc": "Launch three rivets",
    "char.sincap.role": "Parts Sorting",
    "char.sincap.skill.label": "Explosive Bolt",
    "char.sincap.skill.desc": "Launch an exploding bolt",
    "char.kus.role": "Ventilation",
    "char.kus.skill.label": "Vortex Fan",
    "char.kus.skill.desc": "Launch a pressure vortex",
    "char.zurafa.role": "Treatment",
    "char.zurafa.skill.label": "Corrosive Spray",
    "char.zurafa.skill.desc": "Launch corrosive liquid",
    // ── Veri katalogları: haritalar (F2c-4) ────────────────────────────
    "map.kopek.label": "Old Repair Pit",
    "map.kopek.skillLabel": "Emergency Repair",
    "map.kedi.label": "Magnet Bridge",
    "map.kedi.skillLabel": "Polar Shield",
    "map.ayi.label": "Pressure Depot",
    "map.ayi.skillLabel": "Pressure Loading",
    "map.tavsan.label": "Frozen Steps",
    "map.tavsan.skillLabel": "Spring Launcher",
    "map.tilki.label": "Twin Paint Booths",
    "map.tilki.skillLabel": "Twin Barrel",
    "map.panda.label": "Press Square",
    "map.panda.skillLabel": "Press Strike",
    "map.kaplan.label": "Cutting Dock",
    "map.kaplan.skillLabel": "Twin Cutter",
    "map.timsah.label": "Pipe Elbow",
    "map.timsah.skillLabel": "Rotary Joint",
    "map.suaygiri.label": "Settling Basin",
    "map.suaygiri.skillLabel": "Hydraulic Claw",
    "map.koala.label": "Calibration Benches",
    "map.koala.skillLabel": "Tuning Mallet",
    "map.kunduz.label": "Filter Terraces",
    "map.kunduz.skillLabel": "Balance Hammer",
    "map.ordek.label": "Welding Passage",
    "map.ordek.skillLabel": "Spot Weld Strike",
    "map.kokarca.label": "Old Filter Store",
    "map.kokarca.skillLabel": "Waste Gas",
    "map.aslan.label": "Transformer Yard",
    "map.aslan.skillLabel": "EMP Strike",
    "map.kurtadam.label": "Alarm Tower",
    "map.kurtadam.skillLabel": "Alarm Resonance",
    "map.sirtlan.label": "Echo Hangar",
    "map.sirtlan.skillLabel": "Frequency Overflow",
    "map.rakun.label": "Separation Bowl",
    "map.rakun.skillLabel": "Centrifuge",
    "map.ornitorenk.label": "Drainage Banks",
    "map.ornitorenk.skillLabel": "Coolant Vent",
    "map.yeti.label": "Frozen Tank Field",
    "map.yeti.skillLabel": "Cryo Strike",
    "map.dino.label": "Foundation Test Yard",
    "map.dino.skillLabel": "Ground Maul",
    "map.gergedan.label": "Loading Ramp",
    "map.gergedan.skillLabel": "Turbo Wheel",
    "map.kirpi.label": "Scrap Race",
    "map.kirpi.skillLabel": "Bearing Charge",
    "map.maymun.label": "Three-Storey Rack",
    "map.maymun.skillLabel": "Service Hook",
    "map.kanguru.label": "Sand Hill Jump",
    "map.kanguru.skillLabel": "Overload Spring",
    "map.yarasa.label": "Ceiling Service Line",
    "map.yarasa.skillLabel": "Emergency Rotor",
    "map.armadillo.label": "Buried Service Tunnel",
    "map.armadillo.skillLabel": "Depth Auger",
    "map.hamster.label": "Plate Shelter",
    "map.hamster.skillLabel": "Armor Lock",
    "map.bukalemun.label": "Inspection Corridor",
    "map.bukalemun.skillLabel": "Optic Deflector",
    "map.ejderha.label": "Casting Spout",
    "map.ejderha.skillLabel": "Slag Sphere",
    "map.penguen.label": "Coolant Channels",
    "map.penguen.skillLabel": "Coolant Capsule",
    "map.oklukirpi.label": "Shipping Rack",
    "map.oklukirpi.skillLabel": "Rivet Salvo",
    "map.sincap.label": "Bolt Sorting Table",
    "map.sincap.skillLabel": "Explosive Bolt",
    "map.kus.label": "Open-Air Screen",
    "map.kus.skillLabel": "Vortex Fan",
    "map.zurafa.label": "Container Wash Bay",
    "map.zurafa.skillLabel": "Corrosive Spray",
    "mapzone.scrapyard.zoneLabel": "Scrap Yard",
    "mapzone.assembly.zoneLabel": "Assembly Line",
    "mapzone.warehouse.zoneLabel": "Warehouse Racks",
    "mapzone.cooling.zoneLabel": "Cooling Plant",
    "mapzone.paint.zoneLabel": "Paint Shop",
    "mapzone.loading.zoneLabel": "Loading Dock",
    "mapzone.waste.zoneLabel": "Waste Treatment",
    "mapzone.foundry.zoneLabel": "Foundry",
    "mapzone.sandblast.zoneLabel": "Sandblast Unit",
    // ── Servis seviyesi ödülleri + Atölye etki özetleri (F2c-5) ────────
    "service.1.unlock": "Base robot",
    "service.2.unlock": "Tier I upgrades",
    "service.3.unlock": "Profile badge",
    "service.4.unlock": "Detailed match stats",
    "service.5.unlock": "Tier II upgrades",
    "service.6.unlock": "Attachment accent effect",
    "service.7.unlock": "Profile badge II",
    "service.8.unlock": "Tier III upgrades",
    "service.9.unlock": "Hull wear cosmetic (future)",
    "service.10.unlock": "Master Service title",
    "progression.unlockOpened": "{unlock} unlocked",
    "progression.maxTier": "Full Calibration",
    "progression.hp": "HP {from} → {to}",
    "progression.armor": "Armor {from}% → {to}%",
    "progression.hpKnockback": "HP {from} → {to} • Knockback −10%",
    "progression.energy": "Energy {from} → {to}",
    "progression.energyWeaponDamage": "Energy {from} → {to} • Weapon damage +{pct}% total",
    "progression.modulePower": "Module power +{pct}%",
    "progression.modulePowerTotal": "Module power +{pct}% total • Attachment accent light",
    "progression.modulePowerRange": "Module power +{from}% → +{to}%",
    "progression.weaponDamage": "Weapon damage +{pct}%",
    "progression.weaponDamageRange": "Weapon damage +{from}% → +{to}%",
    "progression.cooldown": "Module cooldown {from} → {to} turns",
    "progression.knockback": "Knockback taken {from}% → {to}%",
    "progression.jump": "Jump +{from}% → +{to}%",
    "progression.moveSpeed": "Move speed +{from}% → +{to}%",
    "mapSelect.back": "‹ Robots",
    "arena.arena": "Close arena",
    "arena.vertical": "Platforms",
    "arena.open": "Open ground",
    "arena.thick": "Thick ground",
    "arena.lane": "Attack lane",
    "arena.bastion": "Fortress",
  },
  "zh-Hans": {},
  ru: {},
  "es-ES": {},
  "pt-BR": {},
};

let _i18nLocale = "tr";

// Tarayıcı dil etiketini (BCP 47) desteklediğimiz kümeye indirger. Tanınmayan
// dil İngilizceye düşer (uluslararası yayın dili); etiket hiç yoksa oyunun
// kendi dili (tr) kalır — yayın öncesi varsayılan davranış.
function normalizeLocale(tag) {
  if (!tag || typeof tag !== "string") return "tr";
  const low = tag.toLowerCase();
  if (low.startsWith("tr")) return "tr";
  if (low.startsWith("en")) return "en";
  if (low.startsWith("zh")) return "zh-Hans"; // Hant yok: ilk sürümde Basit Çince
  if (low.startsWith("ru")) return "ru";
  if (low.startsWith("es")) return "es-ES";
  if (low.startsWith("pt")) return "pt-BR";
  return "en";
}

function getLocale() {
  return _i18nLocale;
}

// Dili değiştirir. `persist: false` ile yalnız oturumluk değişir (ilk açılış
// tespiti böyle çalışır: kullanıcı seçimi değil, tarayıcı ipucu).
function setLocale(lang, opts) {
  const next = normalizeLocale(lang);
  _i18nLocale = next;
  if (!opts || opts.persist !== false) {
    try { if (typeof localStorage !== "undefined" && localStorage) localStorage.setItem(I18N_STORAGE_KEY, next); } catch (e) { /* yoksay */ }
  }
  applyDomTranslations();
  applyDataTranslations();
  if (typeof document !== "undefined" && document && document.getElementById) {
    const sel = document.getElementById("locale-select");
    if (sel && sel.value !== next) sel.value = next;
  }
  if (typeof document !== "undefined" && document && document.dispatchEvent && typeof CustomEvent === "function") {
    document.dispatchEvent(new CustomEvent("localechange", { detail: { locale: next } }));
  }
  return next;
}

// Çeviri: seçili dil → (varsa) tr sözlüğü → çağrı yerinin Türkçe metni → anahtar.
// Anahtarın görünmesi eksik çevirinin sessizce kaybolmaması içindir (fallback
// verilmeyen çağrı hemen fark edilir).
function t(key, fallback, vars) {
  const dict = I18N[_i18nLocale] || {};
  let out = dict[key];
  if (out === undefined) out = (I18N.tr || {})[key];
  if (out === undefined) out = fallback;
  if (out === undefined) return key;
  if (vars && out.indexOf("{") >= 0) {
    out = out.replace(/\{(\w+)\}/g, (m, name) => (vars[name] === undefined ? m : String(vars[name])));
  }
  return out;
}

// DOM metinleri: <span data-i18n="key"> ve title için data-i18n-title.
// Canvas dışı arayüz (HUD, kaplama düğmeleri) bu iki öznitelikle çevrilir;
// özniteliği olmayan düğüm DOM'un kendi (Türkçe) metnini korur.
// DOM çevirisinde Türkçe KAYNAK metin düğüm başına bir kez saklanır. Aksi
// hâlde fallback olarak düğümün o anki metni okunur ve EN'e geçip TR'ye
// dönüldüğünde ekranda İngilizce metin kalır (dil geri dönüşü bozulur —
// tests/i18n.js bunu yakaladı).
const _domSources = new WeakMap();
function _domSource(el, kind, current) {
  let rec = _domSources.get(el);
  if (!rec) { rec = {}; _domSources.set(el, rec); }
  if (rec[kind] === undefined) rec[kind] = current;
  return rec[kind];
}

function applyDomTranslations(root) {
  if (typeof document === "undefined" || !document || !document.querySelectorAll) return 0;
  const scope = root || document;
  let n = 0;
  const nodes = scope.querySelectorAll("[data-i18n]");
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    const key = el.getAttribute("data-i18n");
    const fb = el.getAttribute("data-i18n-fallback") || _domSource(el, "text", el.textContent);
    el.textContent = t(key, fb);
    n++;
  }
  const titled = scope.querySelectorAll("[data-i18n-title]");
  for (let i = 0; i < titled.length; i++) {
    const el = titled[i];
    const src = _domSource(el, "title", el.getAttribute("title") || "");
    el.setAttribute("title", t(el.getAttribute("data-i18n-title"), src));
    n++;
  }
  // aria-label ayrı öznitelik: ekran okuyucu metni görsel metinden farklı
  // olabilir (ör. ikon düğmesinin "Sesi kapat" etiketi).
  const aria = scope.querySelectorAll("[data-i18n-aria]");
  for (let i = 0; i < aria.length; i++) {
    const el = aria[i];
    const src = _domSource(el, "aria", el.getAttribute("aria-label") || "");
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"), src));
    n++;
  }
  return n;
}

// Dil seçici: seçenekler LANG_ORDER/LANG_LABELS'ten üretilir — yeni dil
// eklendiğinde HTML'de değişiklik gerekmez. Seçim değişince tercih depoya
// yazılır, DOM metinleri uygulanır ve `localechange` olayı yayınlanır (oyun
// HUD'u kendini yeniler: sıra/rüzgar/yuva adları).
function buildLocaleSelect() {
  if (typeof document === "undefined" || !document || !document.getElementById) return false;
  const sel = document.getElementById("locale-select");
  if (!sel) return false;
  sel.textContent = "";
  for (let i = 0; i < LANG_ORDER.length; i++) {
    const lang = LANG_ORDER[i];
    const opt = document.createElement("option");
    opt.value = lang;
    opt.textContent = LANG_LABELS[lang] || lang;
    sel.appendChild(opt);
  }
  sel.value = _i18nLocale;
  if (!sel._i18nWired) {
    sel._i18nWired = true;
    sel.addEventListener("change", () => setLocale(sel.value));
  }
  return true;
}

// ── Veri kataloğu çevirisi ───────────────────────────────────────────────
// Katalog dosyaları (weapons/parts/characters/maps) Türkçe kaynak metni taşır ve
// i18n.js'ten SONRA yüklenir; bu yüzden çeviri yükleme anında değil, dil
// uygulanırken yapılır (setLocale). Özgün Türkçe değerler ilk uygulamada
// saklanır, böylece Türkçeye dönüldüğünde katalog birebir eski hâline döner.
//
// Kimlik A kararı: model kodları (characters > label: FIX-8, maps > forLabel)
// ÇEVRİLMEZ — marka kimliğinin parçası, hangi dilde olursa olsun aynı kalır.
// Kapsam testi (tests/i18n.js) anahtar listesini bu yapılandırmadan üretir:
// buraya kaydedilmeyen katalog alanı çevrilmez, Türkçe kalır.
const DATA_CATALOGS = [
  {
    // Katalog globali i18n.js'ten SONRA yüklenir; o ana kadar tanımsızdır ve test
    // paketi tüm dosyaları tek betikte birleştirdiğinde de TDZ hatası verir —
    // try/catch ikisini de sessizce "katalog henüz yok" sayar.
    get: () => { try { return WEAPONS; } catch (e) { return null; } },
    prefix: "weapon",
    paths: [
      { key: "name", id: "id", at: ["name"] },
      { key: "special", id: "id", at: ["special"] },
      { key: "desc", id: "id", at: ["desc"] },
    ],
  },
  {
    get: () => { try { return PARTS; } catch (e) { return null; } },
    prefix: "part",
    // `hint` yolu YOK: parça spec'lerinde `hint` alanı tanımlı değil (yalnız
    // label + desc var, pazar kartı da yalnız bunları okur). Kayıtlı olmayan
    // alan için anahtar üretmek `part.*.hint` sözlük anahtarlarını zorunlu
    // kılıyor ve testi kırıyordu (24 kullanılmayan anahtar).
    paths: [
      { key: "label", id: "id", at: ["label"] },
      { key: "desc", id: "id", at: ["desc"] },
    ],
  },
  {
    get: () => { try { return CHARACTERS; } catch (e) { return null; } },
    prefix: "char",
    // Model kodu (`label`: FIX-8, MIK-0 …) bilinçli olarak listede YOK:
    // Kimlik A kararı gereği marka kodu her dilde aynı kalır.
    paths: [
      { key: "role", id: "id", at: ["role"] },
      { key: "skill.label", id: "id", at: ["skill", "label"] },
      { key: "skill.desc", id: "id", at: ["skill", "desc"] },
    ],
  },
  {
    // Servis seviyesi ödülleri (progression.js): "açılan içerik" adları maç
    // sonu kaplamasında görünür. Kimlik seviye numarasıdır.
    get: () => { try { return SERVICE_LEVELS; } catch (e) { return null; } },
    prefix: "service",
    paths: [{ key: "unlock", id: "level", at: ["unlock"] }],
  },
  {
    get: () => { try { return MAPS; } catch (e) { return null; } },
    prefix: "map",
    // `forLabel` (robotun model kodu) ve `zoneCode` (HS, MH …) bilinçli olarak
    // listede yok: kodlar her dilde aynı kalır.
    paths: [
      { key: "label", id: "id", at: ["label"] },
      { key: "hint", id: "id", at: ["hint"] },
      // Bölge adı bölge kimliğiyle anahtarlanır: aynı bölgedeki 3-4 harita
      // aynı adı paylaşır, tek çeviri yeter (ayrı önek: harita kimliğiyle
      // karışmasın diye).
      { key: "zoneLabel", id: "zoneId", at: ["zoneLabel"], prefix: "mapzone" },
    ],
  },
];

// Katalog nesnesi → { anahtar: türkçe değer }: dil geri alınırken özgün metin.
const _dataOriginals = new Map();

// Kayıtlı katalogların çeviri önekleri ("weapon." gibi) — test bekçisi bunları
// dinamik anahtar ailesi olarak tanır.
function dataTranslationPrefixes() {
  const out = [];
  for (const cat of DATA_CATALOGS) {
    out.push(cat.prefix + ".");
    for (const p of cat.paths) if (p.prefix) out.push(p.prefix + ".");
  }
  return out;
}

// Uygulanacak (tutucu nesne, alan, anahtar) üçlülerini üretir: çeviri ile kapsam
// testi aynı listeyi kullanır, anahtar üretimi tek yerde kalsın diye.
function dataTranslationEntries() {
  const out = [];
  for (const cat of DATA_CATALOGS) {
    const list = cat.get();
    if (!list) continue;                    // katalog henüz yüklenmedi
    for (const item of list) {
      for (const p of cat.paths) {
        const holder = p.at.length === 1 ? item : item[p.at[0]];
        const id = item[p.id];
        if (!holder || !id) continue;
        const prefix = p.prefix || cat.prefix;   // yol başına önek (ör. mapzone.)
        out.push({ holder, at: p.at[p.at.length - 1], key: prefix + "." + id + "." + p.key });
      }
    }
  }
  return out;
}

// Kayıtlı katalogları seçili dile çevirir. Katalog henüz yüklenmemişse sessizce
// geçer (i18n.js kataloglardan önce yüklenir; ilk çağrı bu yüzden boş dönebilir
// — asıl uygulama main.js'te ve her dil değişiminde yapılır).
function applyDataTranslations() {
  for (const e of dataTranslationEntries()) {
    let orig = _dataOriginals.get(e.holder);
    if (!orig) { orig = {}; _dataOriginals.set(e.holder, orig); }
    if (!(e.key in orig)) orig[e.key] = e.holder[e.at];
    if (typeof orig[e.key] !== "string") continue;
    e.holder[e.at] = t(e.key, orig[e.key]);
  }
}

// İlk açılış: kayıtlı tercih → tarayıcı dili → tr. Kayıtlı tercih varsa
// uygulanır; yoksa tespit edilen dil yalnız oturumluk kalır (kullanıcı kendi
// seçimini yapana kadar depoya yazılmaz).
(function initLocale() {
  let saved = null;
  try { if (typeof localStorage !== "undefined" && localStorage) saved = localStorage.getItem(I18N_STORAGE_KEY); } catch (e) { /* yoksay */ }
  if (saved) {
    setLocale(saved, { persist: false });
  } else {
    const nav = typeof navigator !== "undefined" && navigator ? navigator.language : null;
    setLocale(nav ? normalizeLocale(nav) : "tr", { persist: false });
  }
  // Dil seçici DOM'u hazırsa şimdi kur; betik <head>'e taşınırsa
  // DOMContentLoaded'da yeniden denemek için kendini bağlar.
  if (!buildLocaleSelect()) {
    if (typeof document !== "undefined" && document && document.addEventListener) {
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildLocaleSelect);
    }
  }
  // İlk uygulama kataloglar hazır olmadan çalışır (i18n.js onlardan önce yüklenir).
  // Normalde her katalog dosyası yüklendiğinde kendini bildirir (applyDataTranslations
  // çağrısı katalog dosyalarının sonundadır); bu kanca sonradan eklenecek bir katalog
  // tetikleyiciyi unutursa diye güvenlik ağıdır. Fonksiyon idempotenttir.
  if (typeof document !== "undefined" && document && document.addEventListener) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyDataTranslations);
    else applyDataTranslations();
  }
})();

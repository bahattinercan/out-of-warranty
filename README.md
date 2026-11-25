<p align="center">
  <img src="art/marketing/key-art.webp" alt="Out of Warranty" width="100%" style="border-radius: 8px;" />
</p>

<h1 align="center">⚙️ Out of Warranty (Garanti Dışı)</h1>

<p align="center">
  <strong>A turn-based 2D tactical artillery game where service robots fight for spare parts in an abandoned megafactory.</strong>
</p>

<p align="center">
  <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript"><img src="https://img.shields.io/badge/Language-Pure%20Vanilla%20JS-F7DF1E?style=flat&logo=javascript&logoColor=black" alt="JavaScript" /></a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API"><img src="https://img.shields.io/badge/Graphics-HTML5%20Canvas-E34F26?style=flat&logo=html5&logoColor=white" alt="HTML5 Canvas" /></a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API"><img src="https://img.shields.io/badge/Audio-Web%20Audio%20API%20(Procedural)-673AB7?style=flat" alt="Web Audio API" /></a>
  <a href="https://webrtc.org/"><img src="https://img.shields.io/badge/Multiplayer-WebRTC%20P2P-339933?style=flat&logo=webrtc&logoColor=white" alt="WebRTC" /></a>
  <img src="https://img.shields.io/badge/Dependencies-Zero%20(No%20Build)-brightgreen?style=flat" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/Tests-1400%2B%20Passing-success?style=flat" alt="Tests Passing" />
  <img src="https://img.shields.io/badge/i18n-6%20Languages-blue?style=flat" alt="Six-language support" />
  <img src="https://img.shields.io/badge/Version-v0.6.2-orange?style=flat" alt="Version v0.6.2" />
</p>

---

**Language / Dil:** [English](#about-the-game) · [Türkçe](#türkçe)

## Contents

[About](#about-the-game) · [Quick start](#quick-start) · [Features](#key-features) · [Controls](#controls) · [Arenas](#industrial-arenas) · [Weapons](#arsenal--weapon-specs) · [Robot roster](#robot-roster-34) · [Architecture](#codebase-architecture) · [Tests](#testing--verification) · [Distribution](#distribution--packaging) · [Licenses](#licenses--third-party-notices) · [Privacy](#privacy--data)

## 📖 About the Game

**Out of Warranty** is a modern browser-based tactical artillery game inspired by the spirit of classic titles like *Wild Ones* and *Worms*, re-imagined with a gritty industrial robotic aesthetic.

In the abandoned foundries, assembly lines, and cooling plants of a desolate megafactory, discarded maintenance robots clash to secure their warranty and claim scarce spare parts. Featuring fully destructible terrain, dynamic crosswind physics, 34 distinct playable robots with active internal modules, a deep workshop metagame with wearable equipment, and serverless WebRTC peer-to-peer multiplayer.

> [!TIP]
> **Zero Dependencies, Zero Build Step:** The game requires no npm installations, transpilers, bundlers (Vite/Webpack), or external libraries. Double-click `index.html` in your browser and play immediately!

---

## 🚀 Quick Start

No local web server, runtime installation, or compilation is required. The game works out of the box via the `file://` protocol:

```bash
# Windows (PowerShell / Command Prompt)
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

Simply open `index.html` in any modern web browser (Chrome, Firefox, Edge, Safari).

---

## ✨ Key Features

- 💥 **Fully Destructible Terrain:** Every explosive impact excavates craters and wears down surface props in real-time with sub-step ray-swept collision detection.
- 🤖 **34 Unique Robots & Class Modules:** Maintenance, defense, scout, courier, casting, and heavy demolition units. Each robot has an active `Q` module with deterministic visual cast effects.
- 🎯 **20 Weapons & Tactical Gadgets:** From standard ballistics and cluster grenades to burrowing drills, bouncy clusters, air strikes, tactical grapple hooks, and teleportation beacons.
- 🛠️ **Workshop & Metagame Progression:** Earn **Scrap** and **Service XP** in matches against AI bots to upgrade Chassis, Attachment, and Core branches.
- 🎛️ **24 Wearable Parts:** Customize your bots with optics, heat sinks, gyroscopes, and booster treads that render dynamically on the humanoid canvas skeleton.
- 🌐 **WebRTC P2P Online Multiplayer:** Serverless, direct peer-to-peer 2–6 player rooms with host-authoritative physics, reconnect tolerance, and room code sharing.
- 👥 **Local Hot-Seat & Smart AI:** Local couch multiplayer for 2–6 players on a single keyboard, or single-player vs. ballistic-calculating AI bots across 4 difficulty tiers.
- 🔊 **Procedural Web Audio Engine:** Zero external audio assets to download. All gunshots, ricochets, explosions, and mechanical hums are synthesized directly in code using the Web Audio API.
- 🌍 **Six-Language Support (i18n):** Turkish, English, Simplified Chinese, Russian, Spanish, and Brazilian Portuguese.
- 📦 **Portal Ready:** Built-in SDK bridge for platforms like itch.io, CrazyGames, and Poki.

---

## 🎮 Controls

| Key | Action |
|:---:|---|
| <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | Move robot (steer while airborne) |
| <kbd>W</kbd> or <kbd>↑</kbd> | Jump |
| **Mouse Aim** | Aim weapon angle |
| **Left Click** or <kbd>Space</kbd> | Hold to charge power, release to fire |
| **Right Click** or <kbd>Esc</kbd> | Cancel primed shot |
| <kbd>1</kbd>–<kbd>9</kbd> or **Mouse Wheel** | Select active weapon |
| <kbd>Q</kbd> | Trigger robot's internal skill module |
| <kbd>M</kbd> | Toggle audio mute |
| <kbd>F</kbd> | Toggle full screen |
| In Market: <kbd>1</kbd>–<kbd>5</kbd> | Switch tabs (Ammo, Helmet, Chassis, Attachment, Foot) |
| In Workshop: <kbd>1</kbd> / <kbd>2</kbd> or <kbd>Tab</kbd> | Toggle between UPGRADES and PARTS modes |

---

## 🗺️ Industrial Arenas

Matches take place across 14 hand-crafted industrial arenas with unique tactical layouts:

| Arena | Tactical Environment & Dynamics |
|---|---|
| **Molten Foundry** | Steep outer ramps with a narrow, lethal molten center basin |
| **Night Crane Yard** | Multi-tiered industrial rooftops and high suspended platforms |
| **Overgrown Reactor** | High concrete bunkers flanking a recessed central trench |
| **Lunar Debris Yard** | Low-gravity feel with floating scrap platforms and an uninterrupted lower route |
| **Frost Fracture** | A deadly, bottomless chasm separating two opposing cliff edges |
| **Flooded Laboratory** | Enclosed boundary walls with destructible interior bulkhead barriers |
| **Conveyor Port** | Opposing cargo belts carry grounded robots toward the center once per turn; raised side docks provide an alternate firing route |
| **Steamworks** | Paired pressure vents alternate each turn, launching nearby grounded robots into the air |
| **KEPÇE-8 · Settling Basin** | A low central weir splits two broad dry basins, blocking flat shots while leaving mortar arcs open |
| **TOK-2 · Calibration Benches** | Three low workbenches create short cover pockets and moving decisions between platforms |
| **VUR-5 · Filter Terraces** | Two stepped slopes descend to a shared basin where knockback can dislodge high-ground holders |
| **PUNTA-1 · Weld Gantries** | An elevated bridge speeds traversal while a thin central pylon interrupts direct firing lines |
| **SIZ-7 · Old Filter Bay** | Two shallow side alcoves trade flat-shot cover for mortar exposure beneath a central deck |
| **EMP-80 · Substation Yard** | A high center pedestal grants sightlines but exposes its holder to both flanks |

### Arena Art

| Foundry · far | Foundry · mid | Cooling · far | Cooling · mid |
|:---:|:---:|:---:|:---:|
| <img src="assets/bg/foundry-far.webp" alt="Foundry distant background" width="180"> | <img src="assets/bg/foundry-mid.webp" alt="Foundry middle background" width="180"> | <img src="assets/bg/cooling-far.webp" alt="Cooling distant background" width="180"> | <img src="assets/bg/cooling-mid.webp" alt="Cooling middle background" width="180"> |

### Key Art

| Foundry · FIRIN-3, MAT-6, KES-9 | Cooling Plant · SOĞUT-2, KRİYO-7, DALGA-2 |
|:---:|:---:|
| <img src="assets/menu/key-art-foundry.webp" alt="FIRIN-3, MAT-6 and KES-9 in a glowing foundry" width="480"> | <img src="assets/menu/key-art-cooling-plant.webp" alt="SOĞUT-2, KRİYO-7 and DALGA-2 in a frozen cooling plant" width="480"> |

| Paint Atelier · ÇİFT-6, HAYALET-4, KANCA-4 | Loading Yard · PRES-4, TEK-8, ZIP-X |
|:---:|:---:|
| <img src="assets/menu/key-art-paint-atelier.webp" alt="ÇİFT-6, HAYALET-4 and KANCA-4 in a colorful paint atelier" width="480"> | <img src="assets/menu/key-art-loading-yard.webp" alt="PRES-4, TEK-8 and ZIP-X in a sunset loading yard" width="480"> |

### Menu Screen Art

| Robot Count | Character Select |
|:---:|:---:|
| <img src="assets/menu/key-art-menu-bot-count.webp" alt="Robots waiting in factory deployment bays" width="480"> | <img src="assets/menu/key-art-menu-character-select.webp" alt="Service robots in a maintenance hangar" width="480"> |

| Map Select | Workshop |
|:---:|:---:|
| <img src="assets/menu/key-art-menu-map-select.webp" alt="Foundry, crane yard and cooling plant seen from a control bridge" width="480"> | <img src="assets/menu/key-art-menu-workshop.webp" alt="Repair robots working at a factory workbench" width="480"> |

| Ammo Market | Tutorial |
|:---:|:---:|
| <img src="assets/menu/key-art-menu-ammo-market.webp" alt="Service robots at an industrial ammunition depot" width="480"> | <img src="assets/menu/key-art-menu-tutorial.webp" alt="A robot practicing a shot in the factory training range" width="480"> |

| Online Role Select | Join by Code |
|:---:|:---:|
| <img src="assets/menu/key-art-menu-online-role.webp" alt="Two robots linked through a glowing factory relay" width="480"> | <img src="assets/menu/key-art-menu-online-code.webp" alt="Robot operator at a factory communications booth" width="480"> |

| Online Room | Online Loading |
|:---:|:---:|
| <img src="assets/menu/key-art-loading-yard.webp" alt="Robots waiting in the factory loading yard" width="480"> | <img src="assets/menu/key-art-menu-online-loading.webp" alt="Robot waiting for synchronization in a factory tunnel" width="480"> |

---

## 💣 Arsenal & Weapon Specs

The primary **Bazooka** has infinite ammunition. Heavy ordnance and tactical gadgets are limited and can be purchased from the Market using Scrap:

| Ammo / Weapon | Damage & Effect | Blast Radius | Base Ammo | Battle Cap |
|---|---|:---:|:---:|:---:|
| **Bazooka** | Standard Ballistic Rocket (46) | 38 | ∞ | ∞ |
| **Grenade** | Timed Fuse Explosive (40) | 46 | 3 | 5 |
| **Sniper** | High-Velocity Armor Piercing (30 + 40 direct) | 16 | 2 | 3 |
| **Shotgun** | 5-Pellet Cone Spread (16 × 5) | 18 | 2 | 4 |
| **Cluster Bomb** | Aerial Fragmentation (28 + 5 × 18 shrapnel) | 30 | 1 | 3 |
| **Triple Rocket** | 3-Rocket Sequential Volley (28 × 3) | 30 | 2 | 4 |
| **Sticky Bomb** | Surface-Adhesive Contact Charge (44) | 44 | 2 | 4 |
| **Bouncy Bomb** | High-Elasticity Ricochet Sphere (34) | 40 | 3 | 6 |
| **Nuke** | Catastrophic Blast & Mega Crater (80) | 84 | 1 | 2 |
| **Drill** | Subterranean Ground-Boring Torpedo (34) | 30 | 2 | 4 |
| **Landmine** | Proximity Sensor Ground Trap (42) | 40 | 2 | 5 |
| **Napalm** | Persistent Incendiary Flame Field (26 + burn) | 30 | 1 | 3 |
| **Teleport Orb** | Utility — Instantly teleports firer to impact site | 12 | 2 | 5 |
| **Grapple Hook** | Utility — Pulls robot to terrain anchor point | 12 | 2 | 5 |

---

## 🤖 Robot Classes & Anatomical Rig

All 34 robots are built on a shared, data-driven modular humanoid Canvas skeleton:

```
[Helmet / Visor] ─── [Face / Diagnostic Display]
       │
   [Chassis] ──────── [Mission Attachment (Weapon / Backpack)]
       │
[Legs / Treads / Mono-wheel / Hover Rotors / Coils]
```

### Featured Models:
- **FIX-8 (Maintenance):** *Emergency Repair* — Welds damaged armor plates to restore HP in the heat of battle.
- **MIK-0 (Defense):** *Polar Barrier* — Projects a magnetic shield that completely neutralizes the next incoming attack.
- **TEK-8 (Courier):** *Turbo Wheel* — High acceleration dash that rams into enemy robots.
- **PRES-4 (Cargo):** *Press Slam* — Deploys a crushing hydraulic press to obliterate adjacent foes.
- **MAT-6 (Excavation):** *Depth Auger* — Bores directly through solid ground to create fortified underground trenches.
- **FIRIN-3 (Smelter):** *Slag Sphere* — Hurls molten slag that covers the terrain in lingering heat.

### Robot Roster (34)

Every model is shown by its player-facing model code and role.

| | | | |
| :---: | :---: | :---: | :---: |
| <img src="assets/portraits/kurtadam.webp" alt="SİREN-6" width="120"><br>**SİREN-6**<br>Alarm | <img src="assets/portraits/zurafa.webp" alt="ASİT-6" width="120"><br>**ASİT-6**<br>Arıtma | <img src="assets/portraits/kokarca.webp" alt="SIZ-7" width="120"><br>**SIZ-7**<br>Atık | <img src="assets/portraits/rakun.webp" alt="DÖNER-5" width="120"><br>**DÖNER-5**<br>Ayırma |

| | | | |
| :---: | :---: | :---: | :---: |
| <img src="assets/portraits/kopek.webp" alt="FIX-8" width="120"><br>**FIX-8**<br>Bakım | <img src="assets/portraits/bukalemun.webp" alt="HAYALET-4" width="120"><br>**HAYALET-4**<br>Denetim | <img src="assets/portraits/ejderha.webp" alt="FIRIN-3" width="120"><br>**FIRIN-3**<br>Döküm | <img src="assets/portraits/aslan.webp" alt="EMP-80" width="120"><br>**EMP-80**<br>Enerji |

| | | | |
| :---: | :---: | :---: | :---: |
| <img src="assets/portraits/hamster.webp" alt="ZIRH-2" width="120"><br>**ZIRH-2**<br>Güvenlik | <img src="assets/portraits/kus.webp" alt="FAN-5" width="120"><br>**FAN-5**<br>Havalandırma | <img src="assets/portraits/yarasa.webp" alt="VIZIR" width="120"><br>**VIZIR**<br>Havalandırma | <img src="assets/portraits/koala.webp" alt="TOK-2" width="120"><br>**TOK-2**<br>Kalibrasyon |

| | | | |
| :---: | :---: | :---: | :---: |
| <img src="assets/portraits/ordek.webp" alt="PUNTA-1" width="120"><br>**PUNTA-1**<br>Kaynak | <img src="assets/portraits/armadillo.webp" alt="MAT-6" width="120"><br>**MAT-6**<br>Kazı | <img src="assets/portraits/kaplan.webp" alt="KES-9" width="120"><br>**KES-9**<br>Kesim | <img src="assets/portraits/tavsan.webp" alt="ZIP" width="120"><br>**ZIP**<br>Keşif |

| | | | |
| :---: | :---: | :---: | :---: |
| <img src="assets/portraits/gergedan.webp" alt="TEK-8" width="120"><br>**TEK-8**<br>Kurye | <img src="assets/portraits/oklukirpi.webp" alt="PERÇİN-3" width="120"><br>**PERÇİN-3**<br>Montaj | <img src="assets/portraits/sincap.webp" alt="CİV-1" width="120"><br>**CİV-1**<br>Parça Ayırma | <img src="assets/portraits/kunduz.webp" alt="VUR-5" width="120"><br>**VUR-5**<br>Perçinleme |

| | | | |
| :---: | :---: | :---: | :---: |
| <img src="assets/portraits/dino.webp" alt="ŞOK-9" width="120"><br>**ŞOK-9**<br>Pres | <img src="assets/portraits/maymun.webp" alt="KANCA-4" width="120"><br>**KANCA-4**<br>Raf Bakımı | <img src="assets/portraits/kirpi.webp" alt="BİLYE-3" width="120"><br>**BİLYE-3**<br>Rulman | <img src="assets/portraits/kedi.webp" alt="MIK-0" width="120"><br>**MIK-0**<br>Savunma |

| | | | |
| :---: | :---: | :---: | :---: |
| <img src="assets/portraits/ornitorenk.webp" alt="DALGA-2" width="120"><br>**DALGA-2**<br>Soğutma | <img src="assets/portraits/yeti.webp" alt="KRİYO-7" width="120"><br>**KRİYO-7**<br>Soğutma | <img src="assets/portraits/penguen.webp" alt="SOĞUT-2" width="120"><br>**SOĞUT-2**<br>Soğutma | <img src="assets/portraits/timsah.webp" alt="SAP-3" width="120"><br>**SAP-3**<br>Taşıma |

| | | | |
| :---: | :---: | :---: | :---: |
| <img src="assets/portraits/sirtlan.webp" alt="REZ-7" width="120"><br>**REZ-7**<br>Titreşim | <img src="assets/portraits/tilki.webp" alt="ÇİFT-6" width="120"><br>**ÇİFT-6**<br>Topçu | <img src="assets/portraits/suaygiri.webp" alt="KEPÇE-8" width="120"><br>**KEPÇE-8**<br>Yükleme | <img src="assets/portraits/panda.webp" alt="PRES-4" width="120"><br>**PRES-4**<br>Yükleme |

| | |
| :---: | :---: |
| <img src="assets/portraits/kanguru.webp" alt="ZIP-X" width="120"><br>**ZIP-X**<br>Yüksek Raf | <img src="assets/portraits/ayi.webp" alt="BOM-12" width="120"><br>**BOM-12**<br>Yıkım |


---

## 🛠️ Codebase Architecture

The project emphasizes pristine vanilla engineering without framework bloat:

```
dokumhane-9/
├── index.html           # Canvas stage, HUD layout, and ordered script loader
├── css/style.css        # Clean industrial operations-console UI styling
├── js/
│   ├── game.js          # Main game loop and state machine
│   ├── entity.js        # Robot entity physics, locomotion, and health
│   ├── robots.js        # Modular humanoid robot Canvas renderer
│   ├── weapons.js       # Weapon specifications and projectile parameters
│   ├── projectile.js    # Projectile physics, sub-step sweep, and explosions
│   ├── terrain.js       # Destructible bitmap mask and crater sculpting
│   ├── ai.js            # Ballistic trajectory solver and tactical AI
│   ├── progression.js   # Metagame progression, service levels, and economy
│   ├── profile.js       # LocalStorage schema, migrations, and purchase API
│   ├── market.js        # Shared ammunition inventory and market flow
│   ├── parts.js         # Wearable hardware parts catalog and visual layers
│   ├── audio.js         # Procedural Web Audio API sound synthesizer
│   ├── i18n.js          # Dynamic TR/EN localization engine
│   ├── online-lobby.js  # WebRTC lobby UI and matchmaking flow
│   ├── portal.js        # Poki and CrazyGames SDK bridge
│   └── net/             # P2P protocol, state sync (RLE), and transport
├── tests/               # 1400+ unit and integration tests (pure Node.js)
├── tools/               # Release packaging and asset pipeline scripts
└── art/                 # Concept art, marketing assets, and key illustrations
```

---

## 🧪 Testing & Verification

The repository contains an exhaustive suite of over 1,400 tests running directly on Node.js without third-party test runners:

```powershell
# Run the entire test suite
node tests/run.js

# Specific subsystem tests
node tests/market.js          # Market validation and transaction tests
node tests/progression.js     # Upgrade tiers and reward formulas
node tests/i18n.js            # Translation key parity and catalog integrity
node tests/maps.js            # Map generation and collision mask tests
node tests/audio.js           # Web Audio procedural synthesis check

# Multiplayer and networking tests
node tests/net.js             # Protocol packet serialization
node tests/net-state.js       # State snapshot & RLE terrain sync
node tests/net-integration.js # End-to-end network stack
node tests/net-game.js        # Complete lobby -> match -> victory flow

# Release package verification
node tests/release.js         # Size budgets, script order, and bundle checks
```

---

## 📦 Distribution & Packaging

To generate a standalone, self-contained zip distribution ready for deployment to HTML5 game portals (itch.io, Poki, CrazyGames):

```powershell
# Inspect package contents and size budget (Dry Run)
node tools/build.js --dry

# Build release zip (outputs dist/out-of-warranty-0.6.2.zip)
node tools/build.js
```

The release package must include THIRD-PARTY-NOTICES.md and fonts/LICENSE-*.txt; publish the privacy document at a hosted URL for portal or Steam submissions.

---

## Licenses & Third-Party Notices

The game and repository are proprietary, all rights reserved, as described in the root `LICENSE`; no broader permission is implied. Chakra Petch and Russo One are distributed under the SIL Open Font License (OFL). PeerJS 1.5.4 is MIT licensed and is loaded only for online signalling. CrazyGames and Poki SDKs are loaded only when their matching portal query parameter is present. Artwork in the game includes generated assets, then processed for use in the game; the provenance notes are in `THIRD-PARTY-NOTICES.md`. Include `THIRD-PARTY-NOTICES.md` and `fonts/LICENSE-*.txt` in release packages.

## Privacy & Data

- Settings, locale and the player profile are stored in browser local storage.
- Online lobby uses PeerJS signalling; portal SDKs load only for CrazyGames or Poki builds.
- Diagnostics are copied to the clipboard only when requested; the game sends no diagnostics.
- Play the public browser build at [Out of Warranty](https://bahattinercan.github.io/out-of-warranty/).
- Read [Gizlilik ve Veriler (Türkçe)](./docs/privacy-and-data.md) ([published page](https://bahattinercan.github.io/out-of-warranty/docs/privacy-and-data.html); [English](https://bahattinercan.github.io/out-of-warranty/docs/privacy-en.html)) for storage keys and deletion steps.


---

# Türkçe

## Garanti Dışı Hakkında

**Out of Warranty (Garanti Dışı)**; terk edilmiş bir megafabrikada yedek parçalar için savaşan servis robotlarını konu alan, tarayıcıda çalışan 2B sıra tabanlı taktik topçu oyunudur. Tamamen yıkılabilir araziler, rüzgâr fiziği, 34 oynanabilir robot, atölye ilerlemesi ve WebRTC eşler arası çok oyunculu oyun sunar.

## Hızlı Başlangıç

Kurulum veya derleme gerekmez. `index.html` dosyasını doğrudan açarak başlayın (manuel ilk açılış testi).

## Özellikler

- Yıkılabilir arazi, değişken rüzgâr ve sekiz endüstriyel arena.
- 34 robot, etkin sınıf yetenekleri, 20 silah ve 24 giyilebilir parça.
- Yerel sıcak koltuk çok oyunculu oyun, dört zorluk seviyeli yapay zekâ ve WebRTC çevrimiçi oyun.
- Kodla üretilen Web Audio sesleri; İngilizce ve Türkçe arayüz.

## Kontroller

| Tuş | İşlev |
|:---:|---|
| <kbd>A</kbd>/<kbd>D</kbd> veya oklar | Hareket |
| <kbd>W</kbd> veya yukarı ok | Zıplama |
| Fare | Nişan alma; sol tıkla güç doldurup bırakınca ateş |
| Sağ tık veya <kbd>Esc</kbd> | Atışı iptal etme |
| <kbd>1</kbd>–<kbd>9</kbd> / tekerlek | Silah seçme |
| <kbd>Q</kbd> | Robot yeteneği |
| <kbd>M</kbd> / <kbd>F</kbd> | Sesi kapatma / tam ekran |

## Arenalar

Foundry, Night Crane Yard, Overgrown Reactor, Lunar Debris Yard, Frost Fracture ve Flooded Laboratory arenalarının taktik özellikleri ve görselleri [Arenas bölümünde](#industrial-arenas) gösterilmiştir.

## Silahlar ve Robot Başvurusu

Bazooka sınırsız mühimmatlıdır; diğer mühimmat ve aygıtlar maç içinde sınırlıdır. Hasar ve mühimmat tablosu için [Arsenal & Weapon Specs](#arsenal--weapon-specs) bölümüne, 34 model kodu ve rol için [robot galerisine](#robot-roster-34) bakın.

## Mimari

Oyun saf JavaScript, HTML Canvas ve Web Audio ile çalışır; derleme adımı yoktur. `js/` oyun sistemlerini, `assets/` görselleri, `tests/` denetimleri, `tools/` dağıtım araçlarını içerir.

## Testler

Depoda Node.js tabanlı birim ve bütünleşme testleri bulunur. Çalıştırma yönergeleri [Testing & Verification](#testing--verification) bölümündedir.

## Dağıtım

Portal paketi `node tools/build.js` ile hazırlanır. İlk açılışı doğrulamak için `index.html` dosyasını doğrudan açın. Paket içeriği ve boyut denetimi için [Distribution & Packaging](#distribution--packaging) bölümüne bakın.

## Lisanslar

Oyun ve kaynaklar tüm hakları saklı, tescilli lisans altındadır. Chakra Petch ve Russo One OFL; PeerJS MIT lisanslıdır. CrazyGames ve Poki SDK’ları yalnız ilgili portal bağlamında yüklenir. Ayrıntılar ve paketle birlikte dağıtılacak bildirimler için [Licenses & Third-Party Notices](#licenses--third-party-notices) ile `THIRD-PARTY-NOTICES.md` dosyasına bakın.

## Gizlilik

Yerel kayıt, çevrimiçi sinyalleşme, portal SDK’ları ve tanılama hakkında ayrıntılar: [Gizlilik ve Veri](./docs/privacy-and-data.md).

## Depo Yapısı

`docs/` içinde teknik belgeler ile `privacy-and-data.md` gizlilik açıklaması; kökte `LICENSE` ve `THIRD-PARTY-NOTICES.md`; `fonts/` içinde font lisansları bulunur.


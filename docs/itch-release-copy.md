# itch.io Release Copy (Closed Beta — v0.6.2)

This document contains ready-to-use copy for the **closed beta** page on itch.io: title, short/long descriptions, tags, controls, and tester instructions. Packaging command: `node tools/build.js` → `dist/out-of-warranty-0.6.2.zip` (with `index.html` at the zip root → select "This file will be played in the browser" on itch.io).

> The version tag originates from `js/version.js > GAME_VERSION` as a **single source of truth**; when bumping the version, update the number in this file in sync (`node tests/release.js` verifies that both match).

---

## 1. Page Metadata & Settings

| Field | Value |
|---|---|
| Title | **Out of Warranty (Garanti Dışı)** |
| Project Type | HTML (playable in browser) |
| Visibility (Closed Beta) | **Restricted** + password; distribute link strictly to 20–50 invited testers |
| "This file will be played in the browser" | ✅ Checked |
| Mobile Friendly | ✅ (Touch aim/firing tested; landscape orientation recommended) |
| Pricing | Free (closed playtest) |
| Release Tag / Version | `v0.6.2 · closed-beta · in-game feedback form` |
| Tags | `artillery`, `turn-based`, `multiplayer`, `local-multiplayer`, `pvp`, `tanks`, `destructible-terrain`, `2d` |

## 2. Short Description (One Sentence)

**EN:** A turn-based 2D artillery duel: 34 faulty robots, destructible terrain, dynamic wind, and 2–6 player local/online matches — all in the browser with zero install.

**TR:** Sıra tabanlı 2D topçu düellosu: 34 arızalı robot, yıkılabilir arazi, rüzgâr ve 2–6 oyunculu yerel/çevrimiçi maçlar — hepsi tarayıcıda, kurulumsuz.

## 3. Long Description (EN)

> **OUT OF WARRANTY (Garanti Dışı)**
>
> One final shift before the megafactory shuts down: deploy refurbished maintenance robots, calculate crosswinds, vaporize the terrain, and dismantle the opposing operator.
>
> **What's in the game?**
> - **34 Playable Robots** — Each with a unique industrial model code (FIX-8, MIK-0, BOM-12 …) and specialized tactical module.
> - **Destructible Terrain** — Permanent craters; that defensive hill you're taking cover behind might vanish on the next turn.
> - **20 Diverse Weapons** — Bazookas, cluster shells, landmines, bouncing bombs, missile swarms, armor-piercing drills, and tactical tools.
> - **2–6 Players** — Hot-seat on a shared keyboard or online via room codes. Pure peer-to-peer WebRTC networking with zero external servers.
> - **Deep Workshop Progression** — Scavenge scrap metal, upgrade robot subsystems, equip modular accessories, and stock a persistent ammo depot.
>
> **Controls:** `A/D` walk, Mouse aim, Hold & Release = fire, `1–9` weapon hotkeys, `Q` tactical module, `W` jump, `M` mute audio, `F` toggle fullscreen.
>
> **Languages:** English · Türkçe (toggle via top-right 🌐).
>
> **Privacy Note:** Game progress and preferences stay in your browser. Feedback is not sent automatically; you choose whether to copy or download a report.

## 4. Short Summary (Quick View)

**Out of Warranty** — a turn-based 2D artillery duel for 2–6 players. 34 faulty robots, destructible terrain, wind physics, and 20 weapons. Play hot-seat on one keyboard or online with a room code (WebRTC, serverless). Controls: `A/D` move, mouse aim, hold & release to fire, `1–9` weapon select, `Q` module, `W` jump. Languages: English, Turkish.

## 5. Playtester Briefing Message

```
Hello! You are invited to the closed beta test for "Out of Warranty" (20–50 testers).
All you need to do: open the link → play one match (2–3 turns is enough) → send me answers to these 5 questions. No downloads, no installation required.

1) Did you understand what to do in the first 30 seconds? (yes/no + where you got stuck)
2) How responsive were aiming and firing controls? (Rate 1-5)
3) Would you play another round? (Rate 1-5)
4) Did anything break or behave strangely? (Paste a screenshot or copy the report from the top-right 🐞 button)
5) What was the single most frustrating aspect?

Link: <closed-beta-url>   Password: <password>
Thank you for your feedback!
```

## 6. Pre-Publishing Checklist

- [ ] `node tools/build.js` generates ZIP, `node tests/release.js` passes 100%.
- [ ] ZIP uploaded to itch.io; "played in the browser" checked; mobile orientation set.
- [ ] Page set to **Restricted + password**; link shared only with invited testers.
- [ ] Main menu displays version stamp (`v0.6.2 · yayin`).
- [ ] Feedback form opens and copies/downloads a report only after the player selects that action.
- [ ] Single match played: victory card, scrap awards, and `2×` ad button (hidden when no portal is active) verified.
- [ ] Online room code tested across two browser tabs; disconnect → bot takeover observed.
- [ ] `?rapor=1` exposes the diagnostic report button and copies report text to clipboard.
- [ ] High-resolution screenshots captured: combat scene, lobby seats, workshop interface.

## 7. Packaging Hygiene

- **Do NOT** include probes (`_*.html`), `tests/`, `docs/`, or `tools/` in the release ZIP (the build script automatically filters them out).
- **Do NOT** commit distribution zip archives to git (`dist/` is gitignored).
- Avoid adding untested feature experiments to closed test builds; restrict updates to bugfixes with incremental patch bumps (`0.6.2`).

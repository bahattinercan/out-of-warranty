# Audio Production Record

The user rejected the AI-rendered sets and asked to improve the music made in code. Runtime uses two distinct procedural arena-rock themes: a slower, clean G-major menu score and a faster, driven E-minor battle score. Each has four eight-bar arrangements; a shuffled bag plays all four before reshuffling and prevents the next bag from starting with the previous ending. Result stings are procedural too. Every sound-effect family also has four shuffled timbre profiles, with profile changes to pitch, duration, filter, attack, and resonance while keeping peak gain stable. Weapon fire and explosions are split into their distinct sound families. The old MP3s are unreferenced historical outputs.

## Retired AI Renders

| Asset | Old duration | Caption |
|---|---:|---|
| `assets/audio/menu.mp3` | 45.20 s | `docs/audio-prompts/menu.txt` |
| `assets/audio/battle.mp3` | 36.56 s | `docs/audio-prompts/battle.txt` |
| `assets/audio/victory.mp3` | 12.00 s | `docs/audio-prompts/victory.txt` |
| `assets/audio/defeat.mp3` | 9.00 s | `docs/audio-prompts/defeat.txt` |

## Playback Contract

`js/audio.js` produces all music through Web Audio, preserving direct `file://` launch and existing music mute/volume preferences. The retired files above are not used by playback.

## Listening Status

The code-generated music still needs a human listening pass to judge its guitar timbre, melody, and combat mix; automated tests cannot establish musical fit.

## 2026-11-26 Guitar Attack Pass

Driven guitar notes now pair their existing shaped saw wave with a short, quiet, high-passed noise transient and a brief filter-brightness sweep. The menu keeps its clean, softer attack. The music bus ceiling was lowered to leave more peak headroom for critical combat feedback. The transient is tracked and stopped with the rest of the music voices; no runtime files or dependencies were added. Automated checks cover the transient's presence in battle and absence in the menu. Human listening remains open.

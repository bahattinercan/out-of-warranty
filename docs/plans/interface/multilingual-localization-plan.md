# Multilingual Localization Plan

## Goal

Ship complete player-facing localization for the four languages already listed by the game: Simplified Chinese (`zh-Hans`), Russian (`ru`), Spanish for Spain (`es-ES`), and Brazilian Portuguese (`pt-BR`). Turkish remains the source language and English remains the existing complete reference translation. This plan adds translation content to the existing system; it does not introduce a localization library, new runtime files, or additional languages.

## Baseline Before Implementation

- `js/i18n.js` already declares all six locales in `LANG_ORDER` and provides language labels, browser-language normalization, persistence, DOM translation, canvas/game string lookup, and data-catalog translation.
- At the start of implementation, the four additional locale dictionaries were empty and English was the only locale in `LANG_REQUIRED`.
- The baseline `node tests/i18n.js` run passed 125 assertions; the dictionaries now contain 785 entries per target language, including 238 unique catalog keys.
- `docs/plans/platforms/web-launch-plan.md` already proposes the rollout order: Chinese and Russian, followed by Spanish and Brazilian Portuguese. This document turns that sequence into an implementation and release plan.
- Existing project changes may be present during implementation. Review `git status` first and keep translation work limited to the files listed below.

## Scope and Translation Rules

Translate every player-visible string in `I18N.en`, including dynamically generated catalog entries for weapons, parts, robots, maps, map zones, service unlocks, and arenas. Include DOM labels, canvas HUD and overlays, tutorials, settings, market/workshop, online lobby and errors, match results, and accessibility labels.

- Preserve every English dictionary key exactly; do not change key names or Turkish source strings as part of translation.
- Preserve interpolation tokens such as `{n}`, `{name}`, `{code}`, and `{reason}` exactly, including their spelling and count.
- Keep robot model codes, product/brand names, protocol identifiers, and keyboard shortcuts unchanged where the game treats them as universal identifiers.
- Use locale-appropriate terminology, punctuation, capitalization, and number formatting in translated copy. Do not add locale-specific number formatting unless the current UI supports it consistently.
- Keep translations concise enough for the existing narrow/mobile layouts and canvas labels. Flag strings that need layout changes instead of silently shortening or changing their meaning.
- Translation drafts may be machine-assisted. Per the project owner's direction, the assistant performs the first-pass terminology, placeholder, and completeness review; playtesters provide the next round of in-game feedback.

## Delivery Phases

### Phase 0 — Establish the translation baseline

1. Record the English key count, dynamic catalog entry count, and current `node tests/i18n.js` result.
2. Export or copy the English key/value set into a translator-friendly review format without changing runtime architecture.
3. Agree on a short glossary for recurring game terms (scrap, turn, weapon, skill, equipment slot, arena, online room) for each target language.

**Exit criteria:** all source keys and dynamic catalog families are accounted for; glossary and review owners are identified.

### Phase 1 — Simplified Chinese and Russian (Implemented)

1. Fill `I18N["zh-Hans"]` and `I18N.ru` in `js/i18n.js` with complete translations of the current English key set.
2. Translate all catalog entries produced by `DATA_CATALOGS` and runtime-generated key families.
3. Review terminology, placeholders, punctuation, and glyph rendering with fluent readers.
4. Exercise language switching and first-visit browser detection for `zh-CN`/`zh-Hans` and `ru-RU`/`ru`.
5. Inspect representative screens at desktop and mobile widths; include settings, character/map selection, workshop/market, battle HUD, tutorial, results, and online errors.

**Exit criteria:** each language has zero missing/extra keys, all dynamic catalog entries are translated, no missing-glyph boxes or clipped critical text remain in reviewed screens, and the assistant review plus playtest feedback is complete. Add `zh-Hans` and `ru` to `LANG_REQUIRED` only after these criteria pass.

**Status:** Dictionaries, required-locale gates, desktop/landscape screenshots, and assistant first-pass review are complete. Player feedback remains pending.

### Phase 2 — Spanish and Brazilian Portuguese (Implemented)

Repeat Phase 1 for `es-ES` and `pt-BR`, with terminology and review specific to Spain Spanish and Brazilian Portuguese. Verify `es-*` resolves to `es-ES` and `pt-*` resolves to `pt-BR`.

**Exit criteria:** same completeness, visual, and playtest criteria as Phase 1. Add both locales to `LANG_REQUIRED` only after they pass.

**Status:** Dictionaries, required-locale gates, desktop/landscape screenshots, and assistant first-pass review are complete. Player feedback remains pending.

### Phase 3 — Release and documentation (Implemented; full verification pending)

1. Confirm the language selector labels and order remain correct and persisted selections still round-trip.
2. Update README language-support claims from bilingual to the actual supported-language set, and update `docs/plans/platforms/web-launch-plan.md` status/sequence so it reflects shipped work.
3. Run the full project verification commands and inspect packaging output to confirm `file://` use and the dependency-free runtime remain intact.
4. Include all four locales in the release notes only when their dictionaries are required and reviewed.

## Planned Files

| File | Planned change |
| --- | --- |
| `js/i18n.js` | Populate four dictionaries; promote a locale to `LANG_REQUIRED` only after its phase passes. No new loader or dependency. |
| `tests/i18n.js` | Extend checks if needed for required-locale placeholder parity, coverage reporting, locale normalization, and switch/fallback behavior. Preserve existing tests. |
| `js/game.js` | Wrap no-space CJK card text and keep menu headings, descriptions, and the currency/workshop badge from colliding. |
| `tests/run.js` | Add a regression check that CJK canvas text wraps within its available width. |
| `README.md` | Replace bilingual support wording with the shipped locales and accurately describe coverage. |
| `docs/plans/platforms/web-launch-plan.md` | Mark the existing language rollout milestones with their actual status. |

Do not modify `index.html` for the language list: the selector is built from `LANG_ORDER`. Do not add JavaScript files, dependencies, profile schema changes, or network translation services.

## Acceptance Criteria

- Every required locale has the exact same key set as `I18N.en`, including keys for dynamic catalogs and runtime-generated families.
- Every required locale preserves the interpolation placeholder set for each corresponding English value.
- `node tests/i18n.js` passes and reports zero missing or orphaned keys for all required locales.
- Existing Turkish and English behavior, language persistence, browser-language detection, fallback behavior, and language switching remain correct.
- Fluent review is recorded for each locale; desktop and mobile review finds no missing glyphs or blocking text overflow on the representative screens.
- The game remains dependency-free and playable from `file://`.
- `npm run verify` and `bash ~/.pi/agent/bin/verify.sh` pass after implementation; if the global script is unavailable in the environment, record the exact reason and run the project verification script.

## Verification Plan

For each locale batch:

1. `node tests/i18n.js`
2. `node tests/run.js`
3. `node tests/mobile.js`
4. Visual language-switch review at desktop and mobile sizes, including special glyph checks for Chinese and Russian.

For the release batch:

1. `npm run verify`
2. `bash ~/.pi/agent/bin/verify.sh`
3. `node tools/build.js --dry`
4. Open `index.html` directly with `file://`, switch among all six locales, reload, and confirm the selected language persists.

## Rollback

If a locale fails review or verification, remove it from `LANG_REQUIRED` and leave it available as an explicitly incomplete locale only if the product owner accepts Turkish fallback for that release. Revert only that locale's dictionary and related test/documentation edits; retain the other completed locales. Do not remove the existing locale identifier or alter stored `nwo_locale` values, so saved preferences remain compatible.

## Implementation Status

- All four dictionaries now contain 785 entries and are required locales; key parity and interpolation placeholders are checked by `tests/i18n.js`.
- Desktop (1440×900) and landscape mobile (844×390) screenshots were reviewed for all four locales. The menu card text and currency/workshop badge overlap found during review were fixed. CJK and Cyrillic glyphs rendered correctly.
- Targeted localization, game, mobile, encoding, release, and package-dry-run checks pass.
- Full project verification stops at `tests/robot-rig.js:64` because the FIX-8 special body SVG assertion fails. The design audit also reports two 320px text-stress errors on `#audio-control` and `#orientation-warning`; these remain for separate review.
- Player testing is still needed for terminology and readability feedback.

## Review Follow-up

- Rollout order is confirmed: Chinese and Russian first, then Spanish and Brazilian Portuguese.
- The assistant completed the first-pass translation and placeholder/coverage review; playtesters should report terminology, readability, and layout issues before release.
- This scope covers in-game text and the README support statement. Store/portal copy can be localized separately.

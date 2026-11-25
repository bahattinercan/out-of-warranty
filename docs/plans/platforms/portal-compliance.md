# Web Portal Integration (F5)

Date: October 16, 2026 · Status: **Code complete** (CrazyGames + Poki adaptors), awaiting verification in production portal environments.
Release sequence: itch.io closed testing → **CrazyGames Basic** → analytics/metrics → Full Launch + SDK ad placements → Poki submission (`docs/plans/platforms/web-launch-plan.md` §7).

## 1. Scope of Implementation

`js/portal.js` — **The single bridge isolating portals from the game.**
No direct SDK calls exist elsewhere in the codebase; `Game`/`OnlineLobby` exclusively interact through the `PORTAL` facade.

| Feature | Behavior |
|---|---|
| Provider Selection | `?portal=crazygames` / `?portal=poki` (or the hosting page's `window.__PORTAL_PROVIDER__` variable). If neither is present, **portal mode is disabled** — behavior over `file://` and plain HTTP remains completely identical. |
| SDK Loading | Lazy loading: only the script for the active provider is loaded (`sdk.crazygames.com/crazygames-sdk-v3.js` / `game-cdn.poki.com/scripts/v2/poki-sdk.js`). 12-second timeout; if loading fails, game continues offline, with no broken buttons. |
| Error Handling | When no portal is active, all methods return `{ ok: false }` and **never throw exceptions**; no `try/catch` clutter in gameplay code. |
| Lifecycle Telemetry | `loadingStart/Stop`, `gameplayStart/Stop` (duplicate events are deduplicated), `happytime` (awarded only on human victory on CrazyGames). On Poki: `loadingStop` maps to `gameLoadingFinished`. |
| Rewarded Ads | Match victory/defeat card features **"Watch Ad · 2× Scrap"**. Scrap is doubled only when the ad completes fully (`doubleMatchScrap`: 2× Scrap, XP is never multiplied — ads grant zero combat advantage, `§8`). Capped at 1 redemption per match. |
| Interstitial Ads | Displayed only when **leaving** the match results screen (returning to menu or rematching). Enforces a **3-minute client-side cooldown**; CrazyGames `adCooldown` error codes are also handled gracefully. No banners or in-game mid-turn interruptions. |
| Multiplayer Room Invites | Host announces room metadata: `updateRoom({ roomId, isJoinable, inviteParams:{oda} })`; open seats set `isJoinable: true`, full rooms or active matches set `false`, leaving fires `leftRoom()`. Invites: `inviteLink({oda})` copies invite URL to clipboard; joiners automatically parse the room code via `inviteParam("oda")`. |
| Portal Compatibility | The browser **fullscreen button is hidden** inside portal iframes; `game.settings.muteAudio` handles portal master volume (portal mute overrides in-game volume); functions seamlessly under ad-blockers and incognito mode. |

**Intentional Boundary:** "Revive on defeat" (rewarded resurrection) has been **intentionally omitted** from this phase. Because mid-match revivals alter turn sequencing, projectile refunds, and results calculations, it is deferred to phase F5b; currently, only rewarded 2× scrap and exit interstitials are active.

## 2. Local Testing

```powershell
# Default: Portals OFF (no external SDKs loaded)
start index.html

# Dry-run with mock SDK (reward flows, button states, event sequencing)
start _portal_probe.html                 # ad completes → 2× scrap
start "_portal_probe.html?noClick=1"      # button layout inspection
```

`_portal_probe.html` executes against the real `css/style.css`, real `js/portal.js`, and real `showOverlay`/`renderOverlayReward` codepaths, stubbing only the external portal SDK. Headless console verification:

```
PROBE OK init=ok provider=crazygames · buttonVisible=true · ad=ok rewardScrap=80
persisted=240 · calls=init,loadingStart,loadingStop,gameplayStart,requestAd:rewarded,gameplayStop
```

Pre-release portal checklist: developer dashboard registration, ensuring `?portal=` parameter injection by the host (or auto-detecting the SDK global), verifying 16:9 iframe responsive scaling, and visually confirming fullscreen button suppression.

## 3. Test Suites

```bash
node tests/portal.js      # 46 asserts: provider selection, no-ops, CG/Poki contracts,
                          #   ad callbacks, 3-minute cooldowns, room invites, muteAudio
node tests/reward-ad.js   # 19 asserts: button visibility, 2× Scrap, ad failure fallbacks,
                          #   hiding in online match cards, portal muteAudio integration
```

Both suites run against a **mock SDK**: neither requires external network calls or developer accounts. End-to-end verification inside real portal sandboxes is conducted during publishing.

# Steam Multiplayer — Algorithmic Review

Date: October 8, 2026. Scope: `multiplayer-plan.md`, current gameplay logic, and official Steam API contracts. This review represents design-level counterexample analysis and specification hardening prior to native networking integration.

## Executive Summary

A star topology with player-authoritative hosting is well suited for 2–6 player turn-based peer matches. No fundamental architectural flaws were identified; however, direct implementation would have encountered nine edge-case hazards capable of producing misfires, infinite resync loops, or conflicting session states. The plan resolves these hazards via the rules below.

- **P1:** Could corrupt match outcomes or core connection flows.
- **P2:** Affects recovery/refactoring accuracy or fault tolerance.

| ID | Pri | Hazard & Counterexample | Architectural Resolution |
|---|---|---|---|
| A1 | P1 | Unreliable aiming packet drops, reliable RELEASE arrives; host fires with stale aim angle. Sending only an angle is also insufficient for Airstrike. | Firing intent carries atomic angle / weaponId / targetX inside the reliable action envelope; single-shot actions are sequenced. |
| A2 | P1 | If every `stateVersion` gap triggers recovery, normal unreliable packet loss induces perpetual full snapshot requests. | Gaps in independent dynamic `snapshotSeq` are normal; only baseVersion gaps in terrain delta streams trigger recovery. |
| A3 | P1 | If a Steam lobby sets `joinable=false` at match start, disconnected players cannot rejoin, even via invite. | Lobby remains joinable; application-level roster locks reject unauthorized newcomers. Room capacity is clearly enforced. |
| A4 | P1 | A single guest loses connection to the host for 10s while others remain connected; if that guest triggers a global abort, clients diverge on match outcome. | Isolate local disconnect UI from the host's authoritative global ABORT; host decides grace timeouts; authority epoch fencing invalidates stale sessions. |
| A5 | P1 | While a snapshot is serialized and in flight, a new terrain destruction event arrives; if applied out of order, craters re-fill or damage applies twice. | Invariant snapshot captured in a single tick, bounded by `eventHighWater` and `terrainVersion`, using segmented hashes and ring-buffered events. |
| A6 | P2 | Initial shot transitions state to `PROJECTILE`; if a duplicate command arrives and only phase is checked, an error returns instead of the prior success ACK. A single global sequence counter would clobber movement against firing. | Post-identification result cache check; per-stream sequence numbering; `chargeId`; connection-agnostic deduplication tombstones. |
| A7 | P2 | `JSON.stringify(Infinity)` yields `null`; missing `shotMod`/wind turn counters/fuse values produce divergent salvos after checkpoint restore. | Wire schema uses explicit infinity tokens; visual snapshot is decoupled from full simulation checkpoints. |
| A8 | P2 | Mixing 60 Hz physics with 20 Hz network broadcasts skews walking and fuse timing. Discarding debt decouples turn clocks from real time. Stale ready/load ACKs can trigger premature match start. | Fixed 1/60s simulation core, bounded catchup compensation, overload bailouts; start barrier enforced via `lobbyRevision`, `startAttemptId`, and `snapshotId`. |
| A9 | P2 | Disconnect timeout expires mid-salvo and entity is removed from player array; shooter/mine owner indices point to another robot. Dual native modules/processes initializing SDKs clobber callback dispatch. | Invariant slot / `entityId` mapping, elimination handled only at safe turn boundaries; single Steam service owner with isolated simulation worker. |

## Verified Dependencies in Current Codebase

- `js/game.js:fireAirdrop` reads the target column from `input.mouseX`; an aim angle alone cannot express target placement.
- `fire` transfers `nextShotMod` to `shotMod` and assigns `shooterIdx`; explosion calculations read these fields asynchronously. Mid-salvo checkpoints must preserve them.
- `advanceWind` maintains 2–4 turn wind stability via `windTurnsRemaining`; sending only the scalar `wind` value is insufficient.
- `Entity.hasAmmo`/`consumeAmmo` and the HUD use `Infinity` for the standard bazooka; automatic JSON serialization produces `null`.
- `Projectile.update` steps fuses and cluster splits on frame counts; `Entity.walk` and shot charging are also step-based. The 60 Hz simulation core must be maintained.
- `endTurn` updates cooldowns, poison, flight, and damage reduction, evaluates surviving combatants, and advances turns and wind. It cannot be invoked twice for the same `turnId`; network ACKs and reconnections must never re-trigger it.
- `placeMine` stores `shooterIdx` as owner; compacting the player array upon disconnect corrupts ownership. Fixed `entityId`s are required.
- `Terrain.destroy` draws directly to the offscreen canvas while modifying the bitmask; replaying client events out of order diverges visual appearance from collision geometry.

## Required Acceptance Test Scenarios

1. Triple-delivered RELEASE: exactly one salvo fired, single ammo deduction, identical success ACK.
2. MOVE `seq=100` followed by reliable ACTION `seq=7`: independent streams ensure valid actions are never overwritten.
3. Aim packet dropped: verified angle/target embedded in reliable RELEASE is utilized.
4. Full state `seq=10` followed by `seq=13`: newer full state applies cleanly without triggering recovery thrashing.
5. Terrain `v11` delayed, `v12` arrives: `v12` is buffered until `v11` arrives and dependencies resolve.
6. Damage/crater occurs during chunked snapshot transmission: `eventHighWater` boundary cleanly bifurcates pre- and post-snapshot events.
7. LOADING A cancelled, LOADING B starts, stale LOADED A arrives: discarded; B continues unperturbed.
8. Heartbeat lost while charging power: input lease timeout safely discards charge; no phantom shots on turn expiry.
9. Disconnect grace expires mid-salvo: projectile/owner IDs remain intact; elimination executes cleanly at turn boundary.
10. Single player split-brain: connected players continue uninterrupted; isolated client cannot force global match abortion.
11. Host migration / authority handover: new authority assigns a new match epoch; late snapshots from former host are rejected.
12. Checkpoint recovery: preserves infinite bazooka + mines + poison + projectile fuses + RNG seed + `shotMod` + wind counter; simulation resume produces bit-identical command log.

## References

- [ISteamNetworkingSockets — ConfigureConnectionLanes](https://partner.steamgames.com/doc/api/ISteamNetworkingSockets#ConfigureConnectionLanes): No ordering guarantees between lanes; reliable messages within the same lane remain strictly ordered.
- [ISteamMatchmaking — SetLobbyJoinable](https://partner.steamgames.com/doc/api/ISteamMatchmaking#SetLobbyJoinable): When set to false, friends and invitees cannot join.
- [ISteamMatchmaking — GetLobbyOwner](https://partner.steamgames.com/doc/api/ISteamMatchmaking#GetLobbyOwner): Ownership shifts automatically on disconnect; simulation state handoff must be handled at the application layer.
- [Steamworks API Lifecycle](https://partner.steamgames.com/doc/sdk/api): Initialization, callback pumps, and shutdown discipline.

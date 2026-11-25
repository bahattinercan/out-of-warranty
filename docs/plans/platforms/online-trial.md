# Online Testing Guide (F3c Exit Criteria)

This guide provides procedures for testing the online multiplayer mode on a **live network**. Automated test suites (`tests/net-game.js`) validate the host + guest stack in a single process via loopback transport; real WebRTC and NAT traversal characteristics can only be measured with two distinct browser instances.

**Exit Criteria (`docs/plans/platforms/web-launch-plan.md` §4):** 5 full turns played across two distinct networks, room setup in **< 20 seconds**, disconnection rate **< 5%**.

---

## Stage 1 — Dual Tabs on the Same Machine (Smoke Test)

Validates the end-to-end PeerJS/WebRTC pipeline (CDN → signalling → ICE → data channels); with ~0ms network latency, this serves as a baseline **smoke test**. An active internet connection is required.

```powershell
start index.html
```

1. **Tab A:** Click `ONLINE` → `HOST ROOM`. A 5-character room code appears (e.g. `ABC-DE`). `COPY LINK` copies the invite URL to the clipboard.
2. **Tab B:** Click `ONLINE` → `JOIN ROOM` → enter the code (or press `Ctrl+V` to paste the invite URL — the room code is automatically parsed) → click `READY`.
3. **Tab A:** Click `START MATCH` (disabled until the guest signals readiness).
4. **Verification Checklist:**
   - Identical map, identical terrain (including craters), identical wind vector.
   - Guest aim indicator is rendered on the host screen; shots fire and explode on the host.
   - 5 full turns complete successfully; turn rotation alternates predictably.
   - Terrain destruction produces **identical craters on both screens**.
   - If a tab closes, the entity remains in-game for 12s before AI takeover activates.
   - Match conclusion displays the victory/defeat card (Workshop/Rematch buttons are hidden in online mode; `Main Menu` terminates the room).
5. **Browser Console (F12 → Console):** The only expected notice is the standard AudioContext autoplay warning. Report any red uncaught exceptions.

### Stage 1b — Six Seats (F4 Smoke Test)

The `HOST ROOM` screen contains seat capacity toggles (**2 3 4 5 6**). Select 6 and open 5 additional browser tabs (each tab has isolated `sessionStorage` and represents an independent guest):

1. On all 5 tabs: `JOIN ROOM` → enter code → click `READY`.
2. All 5 seats must display **READY**; `START MATCH` remains disabled if any seat is unready.
3. Upon start, turns rotate 1→2→3→4→5→6; all clients see identical wind, terrain, and active player indicators.
4. Refreshing a tab (`F5`) and rejoining via the same invite link: the player returns to the **exact same seat**, bot control is relinquished, and world state is restored.
5. Closing a tab marks the seat as **BOT** after 12 seconds, which takes its turns automatically.
6. Attempting to join an already full 6-seat lobby displays **"Room Full"**.

## Stage 2 — Dual Devices Across Separate Networks (Primary Metric)

The optimal test setup consists of **one device on home Wi-Fi and another on mobile hotspot** (traversing disparate NAT boundaries):

| Metric | Measurement Method | Target |
|---|---|---|
| Setup Latency | Stopwatch from code generation to match start | < 20s |
| Turns Completed | In-game turn counter | ≥ 5 turns |
| Disconnects | Mid-turn connection drops or stalls | < 5% (0 in 5 turns) |
| Terrain Consistency | Visual & structural parity of craters | 100% parity |
| Input Responsiveness | Smoothness of guest aim on host view | Fluid, no stutter |

---

## Troubleshooting

| On-Screen Notice | Meaning | Remediation |
|---|---|---|
| Could not load online library | PeerJS CDN unreachable (offline / blocked) | Verify network connection; corporate firewalls may block unpkg.com |
| Room not found — check code | Code invalid or host closed tab | Re-enter code; ensure host keeps `HOST ROOM` open |
| Connection timed out | Signalling succeeded but P2P failed (symmetric NAT / firewall) | Enable TURN relay fallback (see below) |
| Opponent disconnected | Remote tab was closed or network switched | Host a new room |
| Version mismatch | Clients running different builds | Clear browser cache and ensure identical versions |
| Room full | All lobby seats occupied | Create a new room |
| Cannot paste code | Clipboard permissions denied or empty | Use `Ctrl+V` to paste URL; or type 5-letter code manually |
| Button unresponsive | Room initializing or awaiting opponent | Check subtitle text for status; tap once on mobile |

**TURN Fallback:** `js/online-lobby.js > ONLINE_TURN_SERVERS` is empty by default (requires a relay credential). For players behind symmetric NATs, configure a TURN provider (such as Metered Open Relay); transport automatically consumes configured ICE servers.

**PeerJS Cloud Limits:** Free PeerJS Cloud tiers may throttle under high concurrent usage. For scaled deployments, swap the signalling URL to a custom server (e.g. Cloudflare Worker + Durable Objects); the transport API remains identical.

---

## Code References

| File | Responsibility |
|---|---|
| `js/online-lobby.js` | Lobby UI, room codes, invite links, lazy PeerJS loading, ICE configuration |
| `js/net/transport.js` | PeerJS/WebRTC wrapper, state machine, room code generation |
| `js/net/session.js` | Authoritative host session: command validation, turn leases, disconnect handling |
| `js/net/state.js` | Snapshot captures, terrain masks / crater histories, state hashing |
| `js/net/adapter.js` | Game ↔ Network adapter: commands → game actions, state/terrain broadcasts |
| `js/game.js` | `beginOnlineMatch`, `updateOnlineHost`, `updateGuest`, `onlineCommand` |

Automated suite: `node tests/net-game.js` (64 asserts from lobby through match completion).
Visual probe: `_online_probe.html` (renders 6 states in a single canvas; TR and EN).

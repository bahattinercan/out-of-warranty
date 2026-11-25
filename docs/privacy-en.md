# Privacy & Data

Out of Warranty does not create an account or a server profile. Game progress and preferences are stored in the browser you use to play the game.

## Data stored on the device

The following records are kept in browser `localStorage`:

- `nwo_settings`: graphics and gameplay preferences.
- `nwo_locale`: selected interface language.
- Profile record: progress, inventory, and purchases; under the local storage key of the profile module.
- Audio preferences: `nwo_muted` and `nwo_volume`.

Feedback reports and attached images stay in memory while the feedback dialog is open. They are not written to `localStorage`.

This data is tied to the browser profile; it is not synchronized with other devices.

## Data leaving the device

- When joining an online lobby, PeerJS 1.5.4 is loaded from `unpkg.com` for signalling. Room connection metadata may pass through the PeerJS infrastructure to establish matchmaking; game traffic is transmitted peer-to-peer via WebRTC.
- When the game is launched with the `?portal=crazygames` or `?portal=poki` parameter, the corresponding platform SDK is loaded. The SDK operates for the platform's game/reward/ad services.
- Feedback is not submitted automatically. Copying or downloading a report requires an explicit player action.
- Outside of these features, the game does not transmit data. No third-party fonts or other CDNs are used.

## What is not collected

The game does not collect accounts, analytics, or telemetry. A feedback or diagnostic report is prepared only on request and is copied or downloaded only when the player chooses that action.

## Deleting data

You can delete local progress using the **Settings > Profile & Data > Reset All Progress** option in the game. Clearing site data in your browser settings will also remove all stored records.

## Portal and Steam publication

For portal or Steam releases, this document must be provided as a publicly accessible, hosted privacy URL. If ad-serving SDKs are used, the use of the relevant ad SDK must be disclosed on the store/portal page and in applicable platform submission forms.

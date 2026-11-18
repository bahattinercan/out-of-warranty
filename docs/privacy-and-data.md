# Privacy & Data

Out of Warranty does not create an account or a server profile. Game progress and preferences are stored locally in the browser you use to play the game.

## Data Stored on the Device

The following records are kept in browser `localStorage`:

- `nwo_settings`: Graphics and gameplay preferences.
- `nwo_locale`: Selected interface language.
- Profile record: Progress, inventory, and purchases; stored under the local storage key of the profile module.
- Audio preferences: `nwo_muted` and `nwo_volume`.

This data is tied to the browser profile; it is never synchronized with other devices.

## Data Leaving the Device

- When joining an online lobby, PeerJS 1.5.4 is loaded from `unpkg.com` for signalling. Room connection metadata may pass through the PeerJS infrastructure to establish matchmaking; game traffic is transmitted peer-to-peer via WebRTC.
- When the game is launched with the `?portal=crazygames` or `?portal=poki` parameter, the corresponding platform SDK is loaded. The SDK operates for the platform's game/reward/ad services.
- Outside of these two features, the game does not transmit data. No third-party fonts or other CDNs are used.

## What is Not Collected

The game does not collect accounts, analytics, telemetry, or automated diagnostic reports. A diagnostic report is prepared and copied to the clipboard only when explicitly requested by the player; it is never transmitted over the network.

## Deleting Data

You can delete local progress using the **Settings > Profile & Data > Reset All Progress** option in the game. Clearing site data in your browser settings will also remove all stored records.

## Portal and Steam Publication

For portal or Steam releases, this document must be provided as a publicly accessible, hosted privacy URL. If ad-serving SDKs are used, the use of the relevant ad SDK must be disclosed on the store/portal page and in applicable platform submission forms.

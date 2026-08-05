# Raszynfashion Stream Utils

A lightweight Next.js overlay utility for fighting game streams.

## Features

- Live overlay page for OBS browser source usage
- Config page for player names, teams, flags, scores, and accent colors
- Overlay visibility toggle (show or hide all overlay UI)
- OBS CEF-safe accent editing with HEX inputs and swatches
- Persistent settings in local storage
- Cross-tab and cross-window sync with BroadcastChannel plus storage fallback

## Pages

- /config
- /overlay
- /overlay?preview for a background preview mode

## Local Development

1. Install dependencies
2. Run development server
3. Open /config
4. Add /overlay as a browser source in OBS

Commands:

- npm install
- npm run dev
- npm run build
- npm run start

## Overlay Visibility

The config page includes:

- A checkbox to show or hide the overlay
- A quick action button to toggle visibility

When hidden, the /overlay route renders no overlay bars, which is useful during breaks.

## Config Storage

Config is stored under the browser local storage key:

- tekken-overlay-config

Config updates are broadcast over channel:

- overlay-config

## Remote Sync (cross-device)

`/overlay` polls `GET /api/overlay-config` (~1s) so it stays in sync across
different machines/browsers, not just tabs on the same device. `/config`
pushes changes via `PUT /api/overlay-config` (debounced), authorized with a
bearer token pasted into the "Remote sync token" field (stored in
`localStorage` under `overlay-config-token`).

Required environment variables (see `docs/remote-config-spec.md` for details):

- `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN`) — Upstash Redis credentials, auto-provisioned by
  the Vercel Marketplace integration.
- `CONFIG_API_TOKEN` — server-only secret required to authorize `PUT` requests.

Without these env vars, `/config` falls back to local-storage-only editing and
`/overlay` simply has nothing to poll successfully, so both keep working
offline.

## Notes for OBS CEF

Native color inputs can be inconsistent in older CEF versions. This project uses:

- HEX text inputs
- Preset swatch buttons

Both methods update accent colors reliably.

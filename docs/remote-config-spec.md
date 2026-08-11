# Remote Overlay Config — Spec

## Problem

`/config` currently writes to `window.localStorage` and syncs other tabs on the
**same browser** via `BroadcastChannel`/`storage` events. Different machines,
browsers, or OBS instances never see each other's changes. We need every
`/overlay` client to reflect the same config regardless of device.

## Chosen approach

**Upstash Redis (Vercel Marketplace integration) as a single JSON key, exposed
through two Next.js route handlers, polled by `/overlay`.**

Rejected alternatives:

- **Prisma + local SQLite file** — Vercel's filesystem is ephemeral and not
  shared across serverless instances; a file written in one invocation is not
  guaranteed to exist in the next. Would require a hosted SQLite (Turso/libSQL)
  to work at all, which is more moving parts than a one-row config needs.
- **Vercel Postgres** — overkill for a single config blob; adds a migration
  workflow for a shape that already evolves field-by-field.
- **Push-based realtime (SSE/WebSocket/Pusher)** — nicer latency, but Vercel
  serverless functions don't hold long-lived connections well without extra
  infra. Polling every few seconds is simple, robust, and fast enough for OBS overlays.

## Data model

Single Redis key: `overlay-config`

```json
{
  "config": { "...": "OverlayConfig fields, see lib/overlayConfig.ts" },
  "updatedAt": 1730000000000
}
```

No new fields are introduced to `OverlayConfig` itself. `normalizeOverlayConfig`
continues to be the single source of truth for shape/defaults, reused on both
client and server.

## API routes

### `GET /api/overlay-config`

- Public, no auth (OBS browser sources can't hold secrets).
- Reads the Redis key, runs it through `normalizeOverlayConfig`, returns:

```json
{ "config": OverlayConfig, "updatedAt": number }
```

- If the key doesn't exist yet, returns `defaultOverlayConfig` with
  `updatedAt: 0` (does not write anything).

### `PUT /api/overlay-config`

- Requires header `Authorization: Bearer <CONFIG_API_TOKEN>`; 401 if missing/invalid.
- Body: `Partial<OverlayConfig>` (client sends the full object in practice).
- Server normalizes with `normalizeOverlayConfig`, stores
  `{ config, updatedAt: Date.now() }`, returns the same shape as `GET`.
- Basic payload validation: reject non-object bodies and cap string field
  lengths (e.g. names/sponsors) to prevent abuse of the store — reuse
  `normalizeOverlayConfig` for coercion instead of trusting client types.

## `lib/overlayConfig.ts` changes

Add server-sync helpers alongside the existing local-storage helpers (don't
remove those — they remain the same-machine fast path):

- `fetchRemoteOverlayConfig(): Promise<{ config: OverlayConfig; updatedAt: number } | null>`
  — wraps `GET /api/overlay-config`, swallows network errors (returns `null`).
- `pushRemoteOverlayConfig(config: OverlayConfig, token: string): Promise<boolean>`
  — wraps `PUT /api/overlay-config`.

Keep `STORAGE_KEY`, `OVERLAY_CHANNEL`, `loadOverlayConfig`, `saveOverlayConfig`,
`broadcastOverlayConfig` as-is.

## `/config` page changes

- On mount: try `fetchRemoteOverlayConfig()` first; if it returns data, seed
  state from it; otherwise fall back to `loadOverlayConfig()` (existing
  behavior) so editing still works offline/misconfigured.
- On change (existing effect that calls `saveOverlayConfig` +
  `broadcastOverlayConfig`): additionally debounce (e.g. 300–500ms) a call to
  `pushRemoteOverlayConfig`. Debounce avoids one PUT per keystroke/score click.
- Token entry: a small settings field (or `.env`-provided at build time via
  `NEXT_PUBLIC_` — **not recommended** since it'd be visible client-side).
  Preferred: operator pastes the token once into a password-style input, stored
  in `localStorage` under a separate key (e.g. `overlay-config-token`), never
  logged or displayed in plaintext controls elsewhere.
- Non-blocking failure UI: small inline indicator ("not synced" / last synced
  time) if the PUT fails (e.g. bad token, offline), so silent divergence isn't
  possible.

## `/overlay` page changes

- Keep existing `loadOverlayConfig` + `BroadcastChannel` + `storage` event
  handling for same-machine instant updates.
- Replace the 500ms `localStorage` polling interval with a ~5s poll of
  `fetchRemoteOverlayConfig()`. Compare `updatedAt` (not full JSON stringify)
  to decide whether to update state, and only overwrite if the remote
  `updatedAt` is newer than the last applied one.
- On successful remote fetch, also write through to `localStorage` via
  `saveOverlayConfig` so a same-machine `/config` tab opened later still has a
  reasonable starting point offline.

## Environment / Vercel setup

1. Add the Upstash Redis integration from the Vercel Marketplace to the
   project (provisions `KV_REST_API_URL` / `KV_REST_API_TOKEN` or
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` env vars
   automatically).
2. Add `CONFIG_API_TOKEN` as a Vercel project env var (server-only, random
   string) — used to authorize `PUT /api/overlay-config`.
3. Add `@upstash/redis` as a dependency.
4. For local dev, add the same env vars to `.env.local` (gitignored) pointing
   at the same (or a dev) Upstash database.

## Rollout / backward compatibility

- Existing `overlay-config.json` file at the repo root is a stale manual
  artifact, not read by the app at runtime — no migration needed for it.
- First deploy: Redis key is empty, `GET` returns defaults; first `/config`
  edit populates it. No breaking change for anyone with existing
  `localStorage` config — that still loads immediately, then gets pushed to
  Redis on first edit/interval.
- Ship behind the existing `overlayVisible` semantics unchanged.

## Security notes

- `PUT` is the only mutating route; gated by a bearer token compared with
  timing-safe equality server-side.
- `GET` is intentionally public (required for OBS), so no sensitive data
  should ever be added to `OverlayConfig` (names/scores/colors only — keep it
  that way).
- Validate/coerce all incoming fields server-side via `normalizeOverlayConfig`
  rather than trusting client-sent types, to avoid storing malformed data that
  could break the overlay renderer.

## Testing checklist (ties into AGENTS.md Change Checklist)

- [ ] `npm run build` passes.
- [ ] Editing `/config` on machine A updates `/overlay` open on machine B
      within ~5s.
- [ ] Overlay visibility toggle still works end-to-end through the API path.
- [ ] `/config` still works with the API unreachable (falls back to local
      storage, shows "not synced" indicator, doesn't throw).
- [ ] `PUT` without/with wrong token returns 401 and does not change stored
      config.

## Out of scope (future ideas, not part of this change)

- Real push updates (SSE/WebSocket) instead of polling.
- Multi-tenant auth / per-user configs.
- Config history/undo.

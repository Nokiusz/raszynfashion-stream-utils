# Config Page Live Sync — Spec

## Problem

`/overlay` already polls `GET /api/overlay-config` every 5s, so the
broadcast overlay always reflects the latest remote config (see
[remote-config-spec.md](remote-config-spec.md)). `/config` does not: it only
calls `fetchRemoteOverlayConfig()` once on mount. If two people have `/config`
open at the same time (or one person has it open on two machines), edits made
in one tab are invisible in the other until a manual refresh — whoever saves
last silently overwrites the other's changes next time they touch a field.

Goal: keep every open `/config` page showing the same data, live, without
clobbering whatever the local operator is actively typing.

## Chosen approach

**Fetch `fetchRemoteOverlayConfig()` from `/config` whenever the operator
clicks anywhere in the controls (event-delegated, not a fixed timer), and
only apply an incoming remote update when the local client has no unsaved
edit in flight. Also expose an explicit "Pull latest" button for operators
who want to force a check without touching any other field (e.g. right after
opening the tab, before the first click).**

Rejected alternatives:

- **Fixed-interval polling (e.g. every 1.5–5s), matching `/overlay`** — was
  the first cut of this spec, but it means every open `/config` tab keeps
  hitting the API/Redis forever even while completely idle (nobody typing,
  nobody clicking). Click-triggered fetching only spends network when a human
  is actually interacting with the page, which fits `/config`'s
  human-in-the-loop usage far better than `/overlay`'s always-on broadcast
  usage.
- **Push-based realtime (SSE/WebSocket)** — same reasoning as
  [remote-config-spec.md](remote-config-spec.md): not worth the added infra
  for a low-frequency, single-document config.
- **Always apply the newest remote value on every fetch** — would fight the
  local operator: if someone is mid-edit (e.g. typing a name) and a click
  elsewhere triggers a fetch, their own in-progress edit gets overwritten by
  whatever was last pushed (possibly their own slightly-stale state before the
  debounce fired). Needs a "don't clobber active edits" guard.
- **Lock config editing to a single operator (pessimistic lock/token
  ownership)** — more correct in theory, but adds UX friction (lock
  acquisition/expiry/stuck-lock recovery) this project doesn't need; last-edit
  wins with a short debounce is an accepted tradeoff already made for the
  remote push path.

## Conflict-avoidance rule

Track two refs in `app/config/page.tsx`:

- `lastAppliedUpdatedAtRef` — the `updatedAt` of the config currently held in
  state (set on initial load, on every successful push, and on every applied
  fetch result).
- `isDirtyRef` — `true` from the moment the local user changes any field
  until the debounced push for that change has finished (success or failure).

`fetchAndApplyRemote()` is the single shared routine both trigger paths call:

1. `fetchRemoteOverlayConfig()`.
2. Return `"error"` if it returns `null` (network error) — keep current state.
3. Return `"up-to-date"` if `remote.updatedAt <= lastAppliedUpdatedAtRef.current`
   — nothing new.
4. Return `"dirty"` if `isDirtyRef.current` is `true` — a local edit is still
   pending/being pushed; applying now would overwrite what the operator is
   typing/just did. A later trigger (the operator's own next push completing
   counts) will pick up any conflicting remote change instead.
5. Otherwise `setConfig(remote.config)`, update
   `lastAppliedUpdatedAtRef.current = remote.updatedAt`, and return
   `"updated"`.

This mirrors the `lastRemoteUpdatedAtRef` pattern already used in
`app/overlay/page.tsx`, plus the new dirty-guard specific to `/config` since
`/overlay` never writes.

## Trigger paths

Two call sites share `fetchAndApplyRemote()`:

1. **Click delegation (silent).** A native `click` listener (via `useEffect` +
   a `ref` on the `.controls-grid` container, **not** a JSX `onClick` prop —
   a JSX handler on a plain `div` trips the `jsx-a11y` "static element needs a
   role/keyboard listener" lint rules this repo otherwise avoids by not using
   ARIA roles) calls `fetchAndApplyRemote()` on every click anywhere inside
   the controls, including clicks that themselves mutate `config` (score
   buttons, swap, reset, flag picks, suggestion picks) — ignoring the return
   value. Because those mutating handlers run first (inner handler before the
   delegated outer listener, same synchronous tick) and set
   `isDirtyRef.current = true` before the fetch's guard reads it, the fetch
   still happens (so a stale local session catches up ASAP) but the result is
   correctly discarded (`"dirty"`) until the debounced push finishes.
2. **Manual "Pull latest" button (with feedback).** A dedicated button in the
   sync panel calls `fetchAndApplyRemote()` and reflects the result in a
   `pullState` UI string (`"Updated from remote"` / `"Already up to date"` /
   `"Skipped — you have unsaved changes"` / `"Pull failed — check
   connection"`), auto-clearing after ~2.5s. Its click handler calls
   `event.stopPropagation()` so it doesn't also trigger the (redundant)
   click-delegated fetch on the same click.

## `app/config/page.tsx` changes

- Add `lastAppliedUpdatedAtRef` (`useRef<number>(0)`) and `isDirtyRef`
  (`useRef<boolean>(false)`).
- Initial load effect: after `fetchRemoteOverlayConfig()` succeeds, set
  `lastAppliedUpdatedAtRef.current = remote.updatedAt`.
- `update()` (and the other state-mutating helpers like `applyKnownPlayer`):
  set `isDirtyRef.current = true` when they change `config`.
- In the existing debounced push effect, after `pushRemoteOverlayConfig`
  resolves (success or failure), set `isDirtyRef.current = false`; on success
  also set `lastAppliedUpdatedAtRef.current` to the `updatedAt` the push
  produced (re-fetch is unnecessary — the server always uses `Date.now()` at
  write time, so read the response body from `pushRemoteOverlayConfig` or have
  it return the new `updatedAt` alongside the boolean; simplest: change
  `pushRemoteOverlayConfig`'s return type to
  `Promise<{ ok: boolean; updatedAt?: number }>`).
- New effect: attach a native `click` listener (via `useEffect` + a `ref`,
  not a JSX `onClick`) on the `.controls-grid` container that calls
  `pollRemote()` (thin wrapper around `fetchAndApplyRemote()`), cleared on
  unmount, following the conflict-avoidance rule above. `pollRemote` itself is
  wrapped in `useCallback` so the listener isn't torn down/re-added every
  render.
- New `pullState` state (`"idle" | "pulling" | "updated" | "up-to-date" |
  "dirty" | "error"`) and a "Pull latest" button in the sync panel (next to
  the token input) that calls `fetchAndApplyRemote()` directly and shows the
  result, auto-resetting to `"idle"` after ~2.5s via a `window.setTimeout`
  ref. Button `onClick` calls `event.stopPropagation()` so the click-delegated
  listener above doesn't also fire for the same click.
- When an incoming remote update is applied, also refresh
  `accent1Draft`/`accent2Draft` (already handled by the existing
  `useEffect` keyed on `config.themeAccent`/`config.themeAccent2`) so the hex
  input drafts don't go stale.

## `lib/overlayConfig.ts` changes

- `pushRemoteOverlayConfig` return type changes from `Promise<boolean>` to
  `Promise<{ ok: boolean; updatedAt: number | null }>` so callers don't need a
  second round-trip to learn the new `updatedAt`. Update the one existing
  caller in `app/config/page.tsx` accordingly.
- No changes to `fetchRemoteOverlayConfig`, `normalizeOverlayConfig`, or the
  API route — this is purely a client-side polling/merge concern.

## Constants

No new polling-interval constant — this is intentionally not a timer.
`PUSH_DEBOUNCE_MS` (400ms) is unchanged.

## Testing checklist (ties into AGENTS.md Change Checklist)

- [ ] `npm run build` passes.
- [ ] Open `/config` in two tabs/browsers with the same token. Edit a field in
      tab A; clicking anywhere in tab B's controls after tab A's debounced
      push completes reflects the change.
- [ ] Clicking "Pull latest" in tab B (with no local edits pending) shows
      "Updated from remote" and applies tab A's change; clicking it again
      immediately shows "Already up to date".
- [ ] While actively typing in tab B, clicking "Pull latest" shows "Skipped —
      you have unsaved changes" and does not overwrite the field being typed.
- [ ] While actively typing in tab B, an incoming remote update from tab A
      does not overwrite the field being typed mid-keystroke; it applies only
      after tab B's own edit finishes pushing.
- [ ] Clicking a mutating control (score button, swap, reset, flag/suggestion
      pick) in tab B still fetches remote state, but the fetch result is
      discarded until tab B's own push settles — no clobbering.
- [ ] `/overlay` still updates correctly (unaffected by this change).
- [ ] Fetch failures (network error) don't throw or spam the console beyond
      the existing `console.warn` in `fetchRemoteOverlayConfig`.
- [ ] Two tabs with no token (view-only) both stay in sync purely from
      click-triggered fetches, no push required.

## Out of scope (future ideas, not part of this change)

- Field-level merge (only overwrite fields the local user hasn't touched,
  rather than replacing the whole config object).
- Presence indicators ("Alice is editing the left score").
- Real push updates (SSE/WebSocket) instead of polling — same rationale as
  remote-config-spec.md.

# Player Name Suggestions — Spec

## Problem

Operators retype the same team/sponsor + nickname combos for recurring
players every stream (e.g. `TKND` / `Nokiusz`). Typos and inconsistent
casing/flags across sessions are common. We want typeahead suggestions on the
existing sponsor/name text inputs that, when picked, fill in sponsor, name,
and flag together for that side — without removing the ability to just type
a one-off value.

## Scope guardrails (see AGENTS.md)

- No new fields on `OverlayConfig` / the Redis-synced blob. This feature is a
  local *input helper*, not part of the synced overlay state. Keeps `GET
  /api/overlay-config` payload unchanged and avoids any new remote-sync
  surface.
- No native `<datalist>`/`<select>` reliance for the dropdown UI itself, to
  stay consistent with the existing custom `FlagDropdown` pattern and
  OBS/CEF-safe control conventions already used on `/config`.

## Data model

```ts
// lib/knownPlayers.ts
export type KnownPlayer = {
  name: string; // display/nickname, e.g. "Nokiusz"
  sponsor: string; // team/sponsor tag, e.g. "TKND" (may be "")
  flagCode: string; // lowercase ISO code from FLAG_OPTIONS, e.g. "pl"
};
```

- `flagCode` fallback: if a stored player record has no `flagCode` (or it's
  empty/unrecognized), applying the suggestion sets `"pl"` — matching
  `defaultOverlayConfig.leftFlagCode` / `rightFlagCode` in
  [lib/overlayConfig.ts](../lib/overlayConfig.ts).
- Matching against `FLAG_OPTIONS` (defined in `app/config/page.tsx`) is
  case-insensitive; unrecognized codes fall back to `"pl"` the same way.

### Storage: seed list + learned entries

Two sources merged at read time, seed first so learned/edited entries can
override:

1. **Seed list** — a small hardcoded array in `lib/knownPlayers.ts` for known
   regulars (can be edited by hand, checked into git).
2. **Learned list** — auto-recorded to `localStorage` (key:
   `overlay-known-players`) every time `/config` saves a non-empty
   `leftName`/`rightName`. Not synced to Redis (local-machine convenience
   only, same rationale as `overlay-config-token`).

Merging rule: match by case-insensitive `name`; a learned entry with the same
name replaces the seed entry's `sponsor`/`flagCode` (most-recently-used data
wins). Cap the learned list at e.g. 50 entries (evict oldest by last-used
timestamp) to keep `localStorage` small.

```ts
// lib/knownPlayers.ts additions
export const KNOWN_PLAYERS_STORAGE_KEY = "overlay-known-players";

export const loadKnownPlayers = (): KnownPlayer[] => { /* seed ++ learned, deduped */ };
export const rememberKnownPlayer = (player: KnownPlayer): void => { /* upsert + cap + persist */ };
```

## Matching / suggestion logic

`suggestPlayers(query: string, players: KnownPlayer[]): KnownPlayer[]`

- Case-insensitive **substring** match against `name` OR `sponsor` (so typing
  `tknd` surfaces players sponsored by TKND, not just name matches).
- Empty query → no suggestions (don't show a full dropdown of everyone on
  focus; only after the operator starts typing).
- Limit to top 6 matches, ordered: prefix matches on `name` first, then
  prefix matches on `sponsor`, then substring matches, ties broken by most
  recently used.

## Component: `PlayerSuggestInput`

New shared component (used for both the sponsor input and the name input on
each side) wrapping a plain text `<input>` with a suggestions listbox,
modeled after the existing `FlagDropdown` component in
`app/config/page.tsx`.

```tsx
<PlayerSuggestInput
  value={config.leftSponsor}
  placeholder="Team / Sponsor"
  suggestions={suggestPlayers(query, knownPlayers)}
  onChange={(value) => update("leftSponsor", value)}
  onPick={(player) => applyKnownPlayer("left", player)}
/>
```

- Internally renders the same `<input>` styling classes already used
  (`name-input` / plain sponsor input) so no visual regression — the
  suggestion listbox is an absolutely positioned panel below the input,
  reusing `.flag-menu`-style layout conventions (dark panel, hover state).
- **Freeform typing always remains the value.** The dropdown is advisory:
  `onChange` fires on every keystroke same as today; nothing is forced to
  match a known player. If the operator ignores the dropdown and presses
  Enter/blurs, the typed text is kept as-is (current behavior, unchanged).

### Keyboard behavior (on `keydown`, matching the ask)

Handled in the input's `onKeyDown`:

| Key | Behavior |
| --- | --- |
| `ArrowDown` | Open dropdown (if closed) / move highlight to next suggestion, wraps at end |
| `ArrowUp` | Move highlight to previous suggestion, wraps at start |
| `Enter` | If a suggestion is highlighted and dropdown open, apply it and close dropdown (prevents form submit / default). If no suggestion highlighted, behaves as today (blur-on-enter for name/sponsor inputs, matching the existing `blurOnEnter` pattern used for accent inputs) |
| `Escape` | Close dropdown without changing the input value |
| `Tab` | Close dropdown, allow default focus move (no forced selection) |
| any other key | Update `query` from the input's live value on the next render (existing `onChange`), dropdown re-filters |

Mouse click on a suggestion row applies it the same way as `Enter` (parity
for non-keyboard users), even though the primary ask is keydown-driven.

### Applying a suggestion

```ts
const applyKnownPlayer = (side: "left" | "right", player: KnownPlayer) => {
  const flagCode = FLAG_OPTIONS.some((f) => f.code === player.flagCode)
    ? player.flagCode
    : "pl";
  setConfig((current) => ({
    ...current,
    [`${side}FlagCode`]: flagCode,
    [`${side}Sponsor`]: player.sponsor,
    [`${side}Name`]: player.name,
  }));
  rememberKnownPlayer({ ...player, flagCode });
};
```

Applying a suggestion updates all three fields for that side in one state
update (so the existing debounced remote-push / localStorage-save /
broadcast effect in `app/config/page.tsx` fires once, same as any other
`update()` call).

## `/config` page changes

- Wrap the existing `left-sponsor-input` / `right-sponsor-input` and the two
  `name-input` elements with `PlayerSuggestInput`, wiring `onPick` to
  `applyKnownPlayer("left" | "right", player)`.
- Load `knownPlayers` once via `loadKnownPlayers()` in the existing mount
  effect (alongside the token/remote-config bootstrap), store in state.
- After a manual (non-suggestion) edit settles — reuse the existing
  save-effect's debounce timing, or simply call `rememberKnownPlayer` when
  the name field blurs with a non-empty value — so typed-from-scratch players
  get learned too, not just ones chosen from suggestions.

## Rollout / backward compatibility

- No `OverlayConfig` shape change → no Redis/localStorage config migration
  needed.
- No seed players shipped initially beyond maybe the two defaults already in
  `defaultOverlayConfig` (`REDX`, `NOKIUSZ`, both with no team by default) —
  everything else is learned organically per machine.
- If `localStorage` is unavailable/throws (private browsing, quota), suggestion
  loading/saving degrades to seed-list-only or no-op, same defensive
  try/catch pattern as `loadOverlayConfig`/`saveOverlayConfig`.

## Testing checklist

- [ ] `npm run build` passes.
- [ ] Typing a partial name/sponsor shows matching suggestions within one
      keystroke.
- [ ] `ArrowDown`/`ArrowUp` cycle highlight; `Enter` on a highlighted
      suggestion fills sponsor + name + flag for the correct side only.
- [ ] Picking a suggestion with no stored flag falls back to `pl`.
- [ ] Freeform typing with no suggestion picked still saves exactly what was
      typed (parity with current behavior).
- [ ] `Escape` closes the dropdown without altering the input value.
- [ ] Suggestions persist across a page reload (learned via `localStorage`)
      but do not appear in the Redis-synced payload sent to
      `PUT /api/overlay-config`.

## Out of scope (future ideas)

- Syncing the known-players directory across machines (would need its own
  Redis key/route, separate from `overlay-config`).
- A management UI to edit/delete learned suggestions.
- Fuzzy (typo-tolerant) matching beyond substring matching.

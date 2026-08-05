# Agent Guide

This file documents practical implementation constraints and preferred patterns for AI coding agents working in this repository.

## Project Scope

- Next.js app router project
- Main routes: /config and /overlay
- Runtime target includes OBS browser source environments

## Architecture Rules

1. Keep overlay config shape centralized in lib/overlayConfig.ts.
2. Add new settings to:

- OverlayConfig type
- defaultOverlayConfig
- normalizeOverlayConfig

3. Use helper functions from lib/overlayConfig.ts for loading, saving, and broadcasting.

## OBS Compatibility Rules

1. Avoid relying on native input type color controls for critical workflows.
2. Prefer text-based HEX input plus preset controls when color editing is needed.
3. Keep controls large and readable for browser source interaction windows.

## UI Conventions

1. Config page sizing is scoped with config-shell styles.
2. Keep styles in styles/globals.css unless there is a clear reason to split files.
3. Prefer additive class-based styling over inline style except dynamic color preview chips.

## Safety and Quality

1. Prefer ASCII-only text unless there is a strong reason otherwise.
2. Remove dead code and duplicate selectors when touched.
3. Run npm run build after non-trivial refactors.
4. Keep behavior backward-compatible with saved configs by normalizing missing fields.

## Change Checklist

Before finalizing:

1. Build passes
2. /config updates /overlay in real time
3. Overlay visibility toggle works
4. No accidental break to OBS-targeted workflows

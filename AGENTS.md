# AGENTS.md

Instructions for AI coding agents working on this repository. People should read
[CONTRIBUTING.md](CONTRIBUTING.md) first; this file adds what an agent tends to get wrong.

## What this is

A Lovelace card (TypeScript, Lit, bundled with esbuild into `dist/managed-switch-card.js`) for the
Home Assistant integration [ha-managed-switch](https://github.com/eizedev/ha-managed-switch). It
reads only: the integration's WebSocket command `managed_switch/ports` and entity states.

## Commands

```sh
npm ci --ignore-scripts
npm run typecheck      # tsc, strict
npm test               # vitest
npm run build          # dist/managed-switch-card.js
```

## Rules that matter here

- **Logic in `src/model.ts`** as pure functions with tests in `test/`; `src/managed-switch-card.ts`
  only renders. Entities are found through the integration's command, never by guessing entity
  IDs (they follow the user's language).
- **Model layouts** go into `MODEL_LAYOUTS`, keyed by `sysObjectID`, only for models someone has
  seen (CONTRIBUTING.md); everything else uses the automatic layout.
- **Texts** in English and German (`WORDS` in `src/model.ts`, labels in the editor).
- The card never calls a service or changes anything.
- **Screenshots** come from the integration's demo instance (`scripts/demo/screenshots.py --card`
  in ha-managed-switch), never from a real network.
- **Docs describe the current state**: README, the card page of the integration's website
  (`docs/card.md` in ha-managed-switch) and `CHANGELOG.md` (Keep a Changelog) in the same change.
  Commit messages follow Conventional Commits.
- **`.claude/settings.json`** keeps claude.ai session links out of commits and pull requests
  (`attribution.sessionUrl: false`) and denies reads of secret files. Keep these keys.

## Exceptions to the repository standards

- No docs website of its own: the card is documented on the integration's website
  (https://ha-managed-switch.eize.dev/card/), because card and integration are used together
  (confirmed by the owner, 2026-10-30).

## Don'ts

- Don't add write actions (services, buttons that change a switch).
- Don't edit `package-lock.json` by hand.

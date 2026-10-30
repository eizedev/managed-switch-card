# Contributing

Thanks for helping. The most useful contribution is a layout for a switch model that the card
does not know yet.

## A layout for your switch

The card draws known models as their front panel and every other switch as one or two rows of
ports. To add a model:

1. Find its `sysObjectID`: in Home Assistant, the switch's device page, *Download diagnostics*
   (`system.object_id`).
2. Note the port names in the order of the front panel, row by row, and which are SFP slots.
3. Try it in the card's YAML first (`layout:`, see the documentation), then open a pull request
   that adds it to `MODEL_LAYOUTS` in `src/model.ts` with a test, or an issue with the same
   information.

## Development

```sh
npm ci --ignore-scripts
npm run typecheck && npm test && npm run build
```

To see the card, use the demo instance of [ha-managed-switch](https://github.com/eizedev/ha-managed-switch)
(CONTRIBUTING.md there, "Demo instance and screenshots") with `screenshots.py --card
<path to dist/managed-switch-card.js>`.

## Rules for changes

- The card only reads.
- Texts in English and German.
- Update the README, the card page in ha-managed-switch (`docs/card.md`) and
  [CHANGELOG.md](CHANGELOG.md) in the same change.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).

## Releases

1. In a pull request, rename `[Unreleased]` in CHANGELOG.md to `[X.Y.Z] - <date>`, add an empty
   `[Unreleased]` and the compare links, and set `version` in `package.json` to `X.Y.Z`.
2. After the merge, tag the merge commit on `main` `vX.Y.Z` and push the tag.
3. `.github/workflows/release.yml` runs the checks, refuses a tag that is not on `main` or does not
   match `package.json`, builds the card and creates the GitHub release with
   `managed-switch-card.js`, its SHA-256 and build provenance. HACS offers each release.

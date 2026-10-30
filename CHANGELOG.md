# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-10-30

### Fixed

- In a sections view the card is as high as its ports and trunks need; the trunks no longer
  overlap the next card.
- In a narrow card (phones, three columns) the SFP ports move below the others instead of
  covering the last ports; long device names no longer widen a port.

## [0.1.1] - 2026-10-30

### Changed

- A port to another of your switches shows a link symbol (⇄) instead of an arrow up: the arrow
  sat on both ends of the same cable, although "up" usually means towards the router.

## [0.1.0] - 2026-10-30

First release.

### Added

- The front panel of a managed switch from the Managed Switch (SNMP) integration (0.2.0 or newer):
  ports coloured by link and speed, uplinks to other switches, trunk members, PoE delivering
  power, the device on each port, data rates on request.
- Layouts of the tested models (HPE OfficeConnect 1920S 8G, HPE Instant On 1930 8G 2SFP), an
  automatic layout for other switches, and a layout of your own in YAML.
- A click on a port opens its device sensor; a settings dialog with a switch picker; English and
  German.
- While Home Assistant starts or the switch is set up again, the card keeps its last picture,
  tries again after 15 seconds and reads the ports again once the switch is back; it says when
  the integration is too old.

[Unreleased]: https://github.com/eizedev/managed-switch-card/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/eizedev/managed-switch-card/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/eizedev/managed-switch-card/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/eizedev/managed-switch-card/releases/tag/v0.1.0

# Managed Switch Card for Home Assistant

| HACS | Release | CI | License |
| ---- | ------- | -- | ------- |
| [![HACS custom](https://img.shields.io/badge/HACS-custom-41BDF5?cacheSeconds=3600)](https://hacs.xyz/docs/faq/custom_repositories/) | [![Release](https://img.shields.io/github/v/release/eizedev/managed-switch-card?cacheSeconds=3600)](https://github.com/eizedev/managed-switch-card/releases) | [![CI](https://github.com/eizedev/managed-switch-card/actions/workflows/ci.yml/badge.svg)](https://github.com/eizedev/managed-switch-card/actions/workflows/ci.yml) | [![License](https://img.shields.io/github/license/eizedev/managed-switch-card?cacheSeconds=3600)](https://github.com/eizedev/managed-switch-card/blob/main/LICENSE) |

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/eizedev/managed-switch-card/main/assets/header-dark.svg">
  <img alt="Managed Switch Card for Home Assistant" src="https://raw.githubusercontent.com/eizedev/managed-switch-card/main/assets/header-light.svg" height="72">
</picture>

A dashboard card that draws your **managed switches** like their own web interface: every port
coloured by link and speed, uplinks to other switches, trunk members, PoE delivering power, and
the device connected to each port. It shows what the
[Managed Switch (SNMP)](https://github.com/eizedev/ha-managed-switch) integration reads.

[![Open your Home Assistant instance and open this repository in HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=eizedev&repository=managed-switch-card&category=plugin)

<img src="https://raw.githubusercontent.com/eizedev/managed-switch-card/main/assets/card.png" alt="Three switches as cards: green ports at 1 Gbit/s, orange at 100 Mbit/s, white without link, arrows on the links between the switches, the device name under each port" width="100%">

**Documentation: [ha-managed-switch.eize.dev/card](https://ha-managed-switch.eize.dev/card/)**

## Install

1. Install the integration [Managed Switch (SNMP)](https://github.com/eizedev/ha-managed-switch) 0.2.0 or newer and add your switches.
2. In HACS, add this repository as a custom repository of the type *Dashboard* (or use the button
   above), install **Managed Switch Card** and reload the browser:

   ```text
   https://github.com/eizedev/managed-switch-card
   ```

3. Edit a dashboard, *Add card*, **Managed Switch**, and choose the switch.

## Configuration

```yaml
type: custom:managed-switch-card
device_id: 0123456789abcdef0123456789abcdef  # the switch, chosen in the card's dialog
title: Hallway                               # optional, else the switch's name
show_names: true                             # device names under the ports (default)
show_rates: false                            # data rates; the integration's rate sensors must be on
```

Details, colours and your own layout: [documentation](https://ha-managed-switch.eize.dev/card/).

## Contributing

A layout for your switch model helps most: see [CONTRIBUTING.md](https://github.com/eizedev/managed-switch-card/blob/main/CONTRIBUTING.md);
for security issues [SECURITY.md](https://github.com/eizedev/managed-switch-card/blob/main/SECURITY.md).

## License

[MIT](https://github.com/eizedev/managed-switch-card/blob/main/LICENSE). Provided "as is", without warranty of any kind. The header images are CC BY 4.0;
their source is in [eizedev/brand](https://github.com/eizedev/brand).

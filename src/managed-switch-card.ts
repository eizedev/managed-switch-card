// A Lovelace card that draws a managed switch's front panel from the Managed Switch (SNMP)
// integration: ports coloured by link and speed, PoE, uplinks, the device on each port.

import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { PortsLoader, errorText } from "./loader";
import {
  availability,
  cardSize,
  deviceLabel,
  layoutFor,
  numeric,
  portTitle,
  powered,
  rateLabel,
  speedLabel,
  tone,
  words,
  type Layout,
  type PortInfo,
  type PortsReply,
  type StateLike,
  type States,
} from "./model";

declare const __VERSION__: string;

interface Hass {
  states: States;
  entities?: Record<string, { platform?: string; device_id?: string | null } | undefined>;
  language?: string;
  formatEntityState?(state: StateLike): string;
  callWS<T>(message: Record<string, unknown>): Promise<T>;
}

interface CardConfig {
  type: string;
  device_id?: string;
  title?: string;
  show_names?: boolean;
  show_speed?: boolean;
  show_rates?: boolean;
  layout?: Layout;
}

export class ManagedSwitchCard extends LitElement {
  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  hass?: Hass;
  private _config?: CardConfig;
  private _loader = new PortsLoader(() => this.requestUpdate());
  private _available = "";

  static getConfigElement(): HTMLElement {
    return document.createElement("managed-switch-card-editor");
  }

  /** The card as the card picker offers it: for the first managed switch there is. */
  static getStubConfig(hass: Hass): Partial<CardConfig> {
    const entity = Object.values(hass.entities ?? {}).find(
      (e) => e?.platform === "managed_switch" && e.device_id,
    );
    return {
      device_id: entity?.device_id ?? undefined,
      show_names: true,
      show_speed: true,
      show_rates: false,
    };
  }

  setConfig(config: CardConfig): void {
    this._config = { show_names: true, show_speed: true, show_rates: false, ...config };
    this._loader.reset();
    this._available = "";
  }

  getCardSize(): number {
    const reply = this._loader.reply;
    if (!reply) return 3;
    const trunks = reply.ports.filter((p) => p.kind === "trunk").length;
    return cardSize(layoutFor(reply, this._config?.layout), trunks);
  }

  /** In a sections view: full width, as high as the ports and trunks need. */
  getGridOptions(): Record<string, number | string> {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const id = this._config?.device_id;
    if (!this.hass || !id) return;
    const hass = this.hass;
    // Entities coming back mean the switch was set up again: its ports may have changed.
    const available = availability(this._loader.reply, hass.states);
    const again = this._available !== "" && available !== this._available && !available.includes("0");
    this._available = available;
    this._loader.load((m) => hass.callWS<PortsReply>(m), id, Date.now(), again);
  }

  private _format = (state: StateLike): string =>
    this.hass?.formatEntityState?.(state) ?? state.state;

  private _open(entityId: string | null | undefined): void {
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }),
    );
  }

  private _port(port: PortInfo, sfp = false): TemplateResult {
    const states = this.hass?.states ?? {};
    const w = words(this.hass?.language);
    const e = port.entities;
    const kind = tone(states[e.link ?? ""], states[e.speed ?? ""]);
    const rates = this._config?.show_rates
      ? [rateLabel(states[e.received ?? ""]), rateLabel(states[e.sent ?? ""])]
      : ["", ""];
    const title = portTitle(port, states, w, this._format);
    return html`
      <button
        class="port ${kind} ${sfp ? "sfp" : ""}"
        title=${title}
        aria-label=${title.replaceAll("\n", ", ")}
        @click=${() => this._open(e.device ?? e.link)}
      >
        <span class="jack">
          ${port.uplink ? html`<ha-icon icon="mdi:swap-horizontal-bold" class="badge link"></ha-icon>` : nothing}
          ${port.poe && powered(states[e.poe ?? ""])
            ? html`<ha-icon icon="mdi:flash" class="badge poe"></ha-icon>`
            : nothing}
          <span class="bottom">
            ${port.trunk !== null ? html`<span class="trunk">T</span>` : nothing}
            ${this._config?.show_speed && ["fast", "slow", "slowest"].includes(kind)
              ? html`<span class="speed">${speedLabel(states[e.speed ?? ""])}</span>`
              : nothing}
          </span>
        </span>
        <span class="name">${port.name}</span>
        ${this._config?.show_names
          ? html`<span class="device">${deviceLabel(states[e.device ?? ""])}</span>`
          : nothing}
        ${rates[0] || rates[1]
          ? html`<span class="rate">↓${rates[0] || "–"} ↑${rates[1] || "–"}</span>`
          : nothing}
      </button>
    `;
  }

  protected override render(): TemplateResult {
    const w = words(this.hass?.language);
    if (!this._config?.device_id) {
      return html`<ha-card><div class="note">${w.noSwitch}</div></ha-card>`;
    }
    const reply = this._loader.reply;
    const error = this._loader.error;
    if (!reply) {
      const text = error === undefined ? "…" : errorText(error, w);
      return html`<ha-card><div class="note">${text}</div></ha-card>`;
    }
    const byName = new Map(reply.ports.map((p) => [p.name, p]));
    const layout = layoutFor(reply, this._config.layout);
    const trunks = reply.ports.filter((p) => p.kind === "trunk");
    const states = this.hass?.states ?? {};
    const se = reply.switch.entities;
    const consumption = numeric(states[se.poe_consumption ?? ""]);
    const budget = numeric(states[se.poe_budget ?? ""]);
    return html`
      <ha-card>
        <div class="header">
          <div>
            <div class="title">${this._config.title ?? reply.switch.name}</div>
            <div class="model">${[reply.switch.model, reply.switch.firmware].filter(Boolean).join(" · ")}</div>
          </div>
          ${consumption !== undefined && budget !== undefined
            ? html`<button class="poe-total" @click=${() => this._open(se.poe_consumption)}>
                <ha-icon icon="mdi:flash"></ha-icon>${consumption} / ${budget} W
              </button>`
            : nothing}
        </div>
        ${error !== undefined ? html`<div class="note">${errorText(error, w)}</div>` : nothing}
        <div class="panel">
          <div class="rows">
            ${layout.rows.map(
              (row) => html`<div class="row">
                ${row.map((name) => {
                  const port = byName.get(name);
                  return port ? this._port(port) : nothing;
                })}
              </div>`,
            )}
          </div>
          ${layout.sfp.length
            ? html`<div class="row sfp-row">
                ${layout.sfp.map((name) => {
                  const port = byName.get(name);
                  return port ? this._port(port, true) : nothing;
                })}
              </div>`
            : nothing}
        </div>
        ${trunks.length
          ? html`<div class="trunks">
              <span class="label">${w.trunks}</span>
              ${trunks.map((trunk) => this._port(trunk))}
            </div>`
          : nothing}
      </ha-card>
    `;
  }

  static override styles = css`
    ha-card {
      padding: 12px 16px 16px;
    }
    .note {
      padding: 8px 0;
      color: var(--secondary-text-color);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 12px;
    }
    .title {
      font-size: 1.2em;
      font-weight: 500;
    }
    .model {
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
    .poe-total {
      all: unset;
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      color: var(--secondary-text-color);
      white-space: nowrap;
    }
    .poe-total:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .poe-total ha-icon {
      --mdc-icon-size: 18px;
      color: var(--warning-color, #e5c07b);
    }
    .panel {
      display: flex;
      gap: 12px;
      padding: 10px;
      border-radius: 10px;
      background: var(--secondary-background-color);
      overflow-x: auto;
      /* the SFP ports move below the others when the card is too narrow for both */
      flex-wrap: wrap;
    }
    .rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1 1 0;
      min-width: min-content;
    }
    .row {
      display: flex;
      gap: 4px;
    }
    .sfp-row {
      flex: 0 0 auto;
      padding-left: 12px;
      border-left: 2px solid var(--divider-color);
      align-self: flex-start;
    }
    .port {
      all: unset;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      /* as wide as the card allows: 64 px each at most, 28 px at least */
      flex: 1 1 0;
      min-width: 28px;
      max-width: 64px;
      gap: 2px;
      font-size: 0.75em;
    }
    .sfp {
      flex: 0 0 auto;
      width: 52px;
    }
    .trunks .port {
      flex: 0 0 auto;
      width: 64px;
    }
    .port:focus-visible .jack {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .jack {
      position: relative;
      width: 100%;
      max-width: 40px;
      height: 32px;
      border-radius: 4px 4px 8px 8px;
      border: 2px solid var(--divider-color);
      box-sizing: border-box;
    }
    .sfp .jack {
      width: 46px;
      height: 22px;
      border-radius: 3px;
    }
    .fast .jack {
      background: var(--success-color, #43a047);
      border-color: var(--success-color, #43a047);
    }
    .slow .jack {
      background: var(--warning-color, #ffa600);
      border-color: var(--warning-color, #ffa600);
    }
    .slowest .jack {
      background: var(--error-color, #db4437);
      border-color: var(--error-color, #db4437);
    }
    .up .jack {
      background: var(--info-color, #039be5);
      border-color: var(--info-color, #039be5);
    }
    .down .jack {
      background: var(--card-background-color);
    }
    .unknown .jack {
      background: var(--disabled-color, #bdbdbd);
      opacity: 0.5;
    }
    /* trunk mark and speed in the lower half, under the link and PoE symbols */
    .bottom {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 1px;
      display: flex;
      justify-content: center;
      gap: 3px;
      font-size: 0.75em;
      font-weight: 600;
      line-height: 1.2;
      color: var(--text-primary-color, #fff);
      pointer-events: none;
    }
    .badge {
      position: absolute;
      --mdc-icon-size: 14px;
      color: var(--text-primary-color, #fff);
    }
    .badge.link {
      left: 2px;
      top: 2px;
    }
    .badge.poe {
      right: 2px;
      top: 2px;
    }
    .name {
      font-weight: 500;
      /* as wide as the port, however long the text: it does not widen the port */
      width: 0;
      min-width: 100%;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .device,
    .rate {
      color: var(--secondary-text-color);
      text-align: center;
      width: 0;
      min-width: 100%;
      font-size: 0.9em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .trunks {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }
    .trunks .label {
      color: var(--secondary-text-color);
      margin-right: 4px;
    }
  `;
}

/** The card's settings dialog: the switch, names under the ports, rates. */
export class ManagedSwitchCardEditor extends LitElement {
  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  hass?: Hass;
  private _config?: CardConfig;

  setConfig(config: CardConfig): void {
    this._config = config;
  }

  private _schema(): unknown[] {
    return [
      { name: "device_id", required: true, selector: { device: { integration: "managed_switch" } } },
      { name: "title", selector: { text: {} } },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "show_names", selector: { boolean: {} } },
          { name: "show_speed", selector: { boolean: {} } },
          { name: "show_rates", selector: { boolean: {} } },
        ],
      },
    ];
  }

  private _label = (field: { name: string }): string =>
    words(this.hass?.language).fields[field.name] ?? field.name;

  private _changed(event: CustomEvent<{ value: CardConfig }>): void {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: event.detail.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected override render(): TemplateResult {
    if (!this.hass || !this._config) return html``;
    return html`<ha-form
      .hass=${this.hass}
      .data=${this._config}
      .schema=${this._schema()}
      .computeLabel=${this._label}
      @value-changed=${this._changed}
    ></ha-form>`;
  }
}

if (!customElements.get("managed-switch-card")) {
  customElements.define("managed-switch-card", ManagedSwitchCard);
  customElements.define("managed-switch-card-editor", ManagedSwitchCardEditor);
}

interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview: boolean;
  documentationURL: string;
}

const registry = window as unknown as { customCards?: CustomCardEntry[] };
registry.customCards = registry.customCards ?? [];
if (!registry.customCards.some((card) => card.type === "managed-switch-card")) {
  registry.customCards.push({
    type: "managed-switch-card",
    name: "Managed Switch",
    description: "The front panel of a managed switch: ports by link and speed, PoE, connected devices.",
    preview: true,
    documentationURL: "https://ha-managed-switch.eize.dev/card/",
  });
}

console.info(`%c MANAGED-SWITCH-CARD %c ${__VERSION__} `, "color:#fff;background:#4078f2", "");

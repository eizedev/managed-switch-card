// What the card shows, as pure functions of the integration's data and the entity states, so
// they can be tested without Home Assistant.

/** One port as the integration's `managed_switch/ports` command describes it. */
export interface PortInfo {
  if_index: number;
  name: string;
  alias: string | null;
  kind: "ethernet" | "trunk";
  trunk: number | null;
  members: number[];
  uplink: boolean;
  poe: boolean;
  entities: Record<string, string | null>;
}

export interface SwitchInfo {
  entry_id: string;
  name: string;
  vendor: string | null;
  model: string | null;
  firmware: string | null;
  object_id: string | null;
  entities: Record<string, string | null>;
}

export interface PortsReply {
  switch: SwitchInfo;
  ports: PortInfo[];
}

/** The parts of a Home Assistant state the card reads. */
export interface StateLike {
  state: string;
  attributes: Record<string, unknown>;
}

export type States = Record<string, StateLike | undefined>;

/** How a front panel is laid out: rows of copper ports, then SFP ports, by port name. */
export interface Layout {
  rows: string[][];
  sfp: string[];
}

/** Front panels of tested models, by sysObjectID. */
export const MODEL_LAYOUTS: Record<string, Layout> = {
  // HPE OfficeConnect 1920S 8G PPoE+ (JL383A): eight ports in a row, 1-4 with PoE
  "1.3.6.1.4.1.11.2.3.7.11.186": { rows: [["1", "2", "3", "4", "5", "6", "7", "8"]], sfp: [] },
  // HPE Networking Instant On 1930 8G 2SFP (JL680A): eight ports, then two SFP slots
  "1.3.6.1.4.1.11.2.3.7.11.194": {
    rows: [["1", "2", "3", "4", "5", "6", "7", "8"]],
    sfp: ["9", "10"],
  },
};

const PER_ROW = 12;

/**
 * The front panel for a switch: the model's layout if known (or the one in the card's
 * configuration), else the Ethernet ports in their order, odd numbers above even ones as on most
 * switches with more than one row.
 */
export function layoutFor(reply: PortsReply, override?: Layout): Layout {
  const names = new Set(reply.ports.filter((p) => p.kind === "ethernet").map((p) => p.name));
  const known = override ?? MODEL_LAYOUTS[reply.switch.object_id ?? ""];
  if (known) {
    // Keep only ports the switch has; ports the layout does not name go in an extra row.
    const rows = known.rows.map((row) => row.filter((n) => names.has(n))).filter((r) => r.length);
    const sfp = known.sfp.filter((n) => names.has(n));
    const placed = new Set([...rows.flat(), ...sfp]);
    const rest = [...names].filter((n) => !placed.has(n));
    return { rows: rest.length ? [...rows, rest] : rows, sfp };
  }
  const ethernet = reply.ports.filter((p) => p.kind === "ethernet").map((p) => p.name);
  if (ethernet.length <= PER_ROW) {
    return { rows: ethernet.length ? [ethernet] : [], sfp: [] };
  }
  const rows: string[][] = [];
  for (let start = 0; start < ethernet.length; start += PER_ROW * 2) {
    const block = ethernet.slice(start, start + PER_ROW * 2);
    rows.push(block.filter((_, i) => i % 2 === 0), block.filter((_, i) => i % 2 === 1));
  }
  return { rows: rows.filter((r) => r.length), sfp: [] };
}

export type Tone = "fast" | "slow" | "slowest" | "down" | "unknown";

/** The colour class of a port: 1 Gbit/s and more, 100 Mbit/s, 10 Mbit/s, no link. */
export function tone(link: StateLike | undefined, speed: StateLike | undefined): Tone {
  if (!link || link.state === "unavailable" || link.state === "unknown") return "unknown";
  if (link.state !== "on") return "down";
  const mbits = Number(speed?.state);
  if (!Number.isFinite(mbits) || mbits >= 1000) return "fast";
  return mbits >= 100 ? "slow" : "slowest";
}

/** Whether a PoE port delivers power right now. */
export function powered(poe: StateLike | undefined): boolean {
  return poe?.state === "delivering_power";
}

/** The device line under a port: the device sensor's state, shortened. */
export function deviceLabel(device: StateLike | undefined, max = 18): string {
  const text = device && !["unknown", "unavailable", ""].includes(device.state) ? device.state : "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** A data rate in bit/s or Mbit/s as text, or "" without a value. */
export function rateLabel(rate: StateLike | undefined): string {
  const value = Number(rate?.state);
  if (!rate || !Number.isFinite(value)) return "";
  const unit = String(rate.attributes.unit_of_measurement ?? "");
  const mbits = unit === "bit/s" ? value / 1e6 : unit === "kbit/s" ? value / 1e3 : value;
  return mbits >= 100 ? `${Math.round(mbits)}` : mbits.toFixed(mbits >= 10 ? 0 : 1);
}

/** The text a pointer or screen reader gets for a port. */
export function portTitle(port: PortInfo, states: States, words: Words): string {
  const lines = [`${words.port} ${port.name}${port.alias ? ` · ${port.alias}` : ""}`];
  const link = states[port.entities.link ?? ""];
  const speed = states[port.entities.speed ?? ""];
  const t = tone(link, speed);
  lines.push(t === "down" ? words.noLink : t === "unknown" ? words.unknown : `${speed?.state} Mbit/s`);
  if (port.uplink) lines.push(words.uplink);
  if (port.poe) lines.push(`PoE: ${states[port.entities.poe ?? ""]?.state ?? "?"}`);
  const device = states[port.entities.device ?? ""];
  const devices = (device?.attributes.devices as { name?: string; mac?: string }[] | undefined) ?? [];
  for (const d of devices.slice(0, 10)) lines.push(`• ${d.name ?? d.mac ?? "?"}`);
  if (devices.length > 10) lines.push(`… +${devices.length - 10}`);
  return lines.join("\n");
}

export interface Words {
  port: string;
  noLink: string;
  unknown: string;
  uplink: string;
  trunks: string;
  received: string;
  sent: string;
  poe: string;
  restart: string;
  noSwitch: string;
}

export const WORDS: Record<string, Words> = {
  en: {
    port: "Port",
    noLink: "No link",
    unknown: "Unknown",
    uplink: "Link to another switch",
    trunks: "Trunks",
    received: "in",
    sent: "out",
    poe: "PoE",
    restart: "Restarted",
    noSwitch: "Choose a managed switch in the card's settings.",
  },
  de: {
    port: "Port",
    noLink: "Kein Link",
    unknown: "Unbekannt",
    uplink: "Verbindung zu einem anderen Switch",
    trunks: "Trunks",
    received: "rein",
    sent: "raus",
    poe: "PoE",
    restart: "Neustart",
    noSwitch: "Wähle in den Einstellungen der Karte einen Managed Switch.",
  },
};

export function words(language: string | undefined): Words {
  return WORDS[(language ?? "en").split("-")[0]] ?? WORDS.en;
}

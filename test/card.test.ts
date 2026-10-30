// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import "../src/managed-switch-card";
import type { ManagedSwitchCard, ManagedSwitchCardEditor } from "../src/managed-switch-card";
import type { PortsReply, StateLike } from "../src/model";

const state = (s: string, attributes: Record<string, unknown> = {}): StateLike => ({ state: s, attributes });

const REPLY: PortsReply = {
  switch: {
    entry_id: "e",
    name: "switch-1",
    vendor: "HPE",
    model: "1920S",
    firmware: "PD.02.22",
    object_id: "1.3.6.1.4.1.11.2.3.7.11.186",
    entities: { poe_consumption: "sensor.poe", poe_budget: "sensor.budget" },
  },
  ports: [
    {
      if_index: 1,
      name: "1",
      alias: null,
      kind: "ethernet",
      trunk: null,
      members: [],
      uplink: true,
      poe: true,
      entities: { link: "l1", speed: "s1", device: "d1", poe: "p1", received: "r1", sent: "t1" },
    },
    {
      if_index: 2,
      name: "2",
      alias: null,
      kind: "ethernet",
      trunk: 100,
      members: [],
      uplink: false,
      poe: false,
      entities: { link: "l2", speed: "s2", device: "d2" },
    },
    {
      if_index: 100,
      name: "TRK 1",
      alias: null,
      kind: "trunk",
      trunk: null,
      members: [2],
      uplink: false,
      poe: false,
      entities: { link: "lt", speed: "st", device: "dt" },
    },
  ],
};

const STATES = {
  l1: state("on"),
  s1: state("1000"),
  d1: state("Router +1", { devices: [{ name: "Router" }, { mac: "02:00:00:00:00:01" }] }),
  p1: state("delivering_power"),
  r1: state("12.5", { unit_of_measurement: "Mbit/s" }),
  t1: state("3", { unit_of_measurement: "Mbit/s" }),
  l2: state("off"),
  lt: state("on"),
  st: state("100"),
  "sensor.poe": state("4.2"),
  "sensor.budget": state("65"),
};

function hass(callWS = vi.fn(async () => REPLY), states: Record<string, StateLike> = STATES) {
  return {
    states,
    entities: { "event.switch_1": { platform: "managed_switch", device_id: "dev1" } },
    language: "de",
    formatEntityState: (s: StateLike) => `«${s.state}»`,
    callWS,
  };
}

async function card(config: Record<string, unknown>, h: object = hass()): Promise<ManagedSwitchCard> {
  const el = document.createElement("managed-switch-card") as ManagedSwitchCard;
  el.setConfig({ type: "custom:managed-switch-card", ...config });
  el.hass = h as never;
  document.body.append(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r));
  await el.updateComplete;
  return el;
}

const root = (el: Element): ShadowRoot => el.shadowRoot as ShadowRoot;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the card", () => {
  it("asks for a switch without one", async () => {
    const el = await card({});
    expect(root(el).textContent).toContain("Wähle in den Einstellungen");
  });

  it("draws the ports, trunks and PoE total", async () => {
    const el = await card({ device_id: "dev1" });
    const ports = [...root(el).querySelectorAll("button.port")];
    expect(ports.map((p) => p.querySelector(".name")?.textContent)).toEqual(["1", "2", "TRK 1"]);
    const [one, two, trunk] = ports;
    expect(one.classList.contains("fast")).toBe(true);
    expect(one.querySelector(".speed")?.textContent).toBe("1G");
    expect(one.querySelector(".badge.link")).not.toBeNull();
    expect(one.querySelector(".badge.poe")).not.toBeNull();
    expect(one.querySelector(".device")?.textContent).toBe("Router +1");
    expect(one.getAttribute("aria-label")).toContain("PoE: «delivering_power»");
    expect(one.getAttribute("aria-label")).not.toContain("\n");
    expect(two.classList.contains("down")).toBe(true);
    expect(two.querySelector(".speed")).toBeNull();
    expect(two.querySelector(".bottom .trunk")).not.toBeNull();
    expect(trunk.querySelector(".speed")?.textContent).toBe("100");
    expect(root(el).querySelector(".poe-total")?.textContent).toContain("4.2 / 65 W");
    expect(root(el).querySelector(".title")?.textContent).toBe("switch-1");
    expect(root(el).querySelector(".model")?.textContent).toBe("1920S · PD.02.22");
    expect(el.getCardSize()).toBe(5);
    expect(el.getGridOptions()).toMatchObject({ rows: "auto" });
  });

  it("follows its options", async () => {
    const el = await card({
      device_id: "dev1",
      title: "Hallway",
      show_names: false,
      show_speed: false,
      show_rates: true,
    });
    const one = root(el).querySelector("button.port") as HTMLElement;
    expect(root(el).querySelector(".title")?.textContent).toBe("Hallway");
    expect(one.querySelector(".device")).toBeNull();
    expect(one.querySelector(".speed")).toBeNull();
    expect(one.querySelector(".rate")?.textContent).toBe("↓13 ↑3.0");
  });

  it("opens the device sensor on a click and the PoE sensor from the total", async () => {
    const el = await card({ device_id: "dev1" });
    const opened: string[] = [];
    el.addEventListener("hass-more-info", (e) => opened.push((e as CustomEvent).detail.entityId));
    (root(el).querySelector("button.port") as HTMLElement).click();
    (root(el).querySelector(".poe-total") as HTMLElement).click();
    expect(opened).toEqual(["d1", "sensor.poe"]);
  });

  it("explains an integration that is too old", async () => {
    const callWS = vi.fn(async () => {
      throw { code: "unknown_command", message: "Unknown command." };
    });
    const el = await card({ device_id: "dev1" }, hass(callWS));
    expect(root(el).textContent).toContain("0.2.0 oder neuer");
  });

  it("explains a device that is not a set-up switch", async () => {
    const callWS = vi.fn(async () => REPLY);
    const el = await card({ device_id: "dev1" }, hass(callWS));
    callWS.mockRejectedValueOnce({ code: "not_found" });
    el.setConfig({ type: "custom:managed-switch-card", device_id: "dev2" });
    el.hass = hass(callWS) as never;
    await new Promise((r) => setTimeout(r));
    await el.updateComplete;
    expect(root(el).textContent).toContain("nicht eingerichtet");
    expect(root(el).querySelector("button.port")).toBeNull();
  });

  it("puts SFP ports apart on a 1930 and reads again when the switch comes back", async () => {
    const port = (name: string) => ({
      ...REPLY.ports[1],
      if_index: Number(name),
      name,
      trunk: null,
      entities: { link: `l${name}`, speed: `s${name}`, device: `d${name}` },
    });
    const reply: PortsReply = {
      switch: { ...REPLY.switch, object_id: "1.3.6.1.4.1.11.2.3.7.11.194", model: null, entities: {} },
      ports: ["1", "9", "10"].map(port),
    };
    const states: Record<string, StateLike> = { l1: state("on"), s1: state("2500"), l9: state("unavailable") };
    const callWS = vi.fn(async () => reply);
    const h = { ...hass(callWS, states), language: undefined, formatEntityState: undefined };
    const el = await card({ device_id: "dev3" }, h);
    expect([...root(el).querySelectorAll(".sfp-row .name")].map((n) => n.textContent)).toEqual(["9", "10"]);
    expect(root(el).querySelector(".speed")?.textContent).toBe("2.5G");
    expect(root(el).querySelector(".poe-total")).toBeNull();
    expect(root(el).querySelector(".trunks")).toBeNull();
    expect(root(el).querySelector(".model")?.textContent).toBe("PD.02.22");
    expect(el.getCardSize()).toBe(3);
    // the switch's entities come back (set up again): read again; a failure keeps the picture
    callWS.mockRejectedValueOnce({ code: "x", message: "boom" });
    el.hass = { ...h, states: { ...states, l9: state("off") } } as never;
    await new Promise((r) => setTimeout(r));
    await el.updateComplete;
    expect(callWS).toHaveBeenCalledTimes(2);
    expect(root(el).querySelectorAll("button.port")).toHaveLength(3);
    expect(root(el).textContent).toContain("boom");
  });

  it("shows a port without link, PoE state or device names plainly", async () => {
    const reply: PortsReply = { ...REPLY, ports: [{ ...REPLY.ports[0], uplink: false, entities: {} }] };
    const el = await card({ device_id: "dev1", show_rates: true }, hass(vi.fn(async () => reply), {}));
    const one = root(el).querySelector("button.port") as HTMLElement;
    expect(one.classList.contains("unknown")).toBe(true);
    expect(one.querySelector(".rate")).toBeNull();
    expect(one.getAttribute("aria-label")).toBe("Port 1, Unbekannt, PoE: ?");
    one.click(); // nothing to open
  });

  it("offers the first managed switch in the card picker", () => {
    const Card = customElements.get("managed-switch-card") as unknown as {
      getStubConfig(h: unknown): Record<string, unknown>;
      getConfigElement(): HTMLElement;
    };
    expect(Card.getStubConfig(hass())).toMatchObject({ device_id: "dev1", show_speed: true });
    expect(Card.getStubConfig({ ...hass(), entities: {} }).device_id).toBeUndefined();
    expect(Card.getConfigElement().tagName.toLowerCase()).toBe("managed-switch-card-editor");
    const listed = (window as unknown as { customCards: { type: string }[] }).customCards;
    expect(listed.filter((c) => c.type === "managed-switch-card")).toHaveLength(1);
  });
});

describe("the editor", () => {
  it("passes the changed configuration on, with German labels", async () => {
    const el = document.createElement("managed-switch-card-editor") as ManagedSwitchCardEditor;
    el.setConfig({ type: "custom:managed-switch-card", device_id: "dev1", layout: { rows: [["1"]], sfp: [] } });
    el.hass = hass() as never;
    document.body.append(el);
    await el.updateComplete;
    const form = root(el).querySelector("ha-form") as HTMLElement & {
      computeLabel: (f: { name: string }) => string;
      schema: unknown[];
    };
    expect(form.computeLabel({ name: "show_speed" })).toBe("Geschwindigkeit in den Ports");
    expect(form.computeLabel({ name: "unknown" })).toBe("unknown");
    const changed: unknown[] = [];
    el.addEventListener("config-changed", (e) => changed.push((e as CustomEvent).detail.config));
    form.dispatchEvent(new CustomEvent("value-changed", { detail: { value: { device_id: "dev2" } } }));
    expect(changed).toEqual([{ device_id: "dev2" }]);
  });

  it("draws nothing before it has Home Assistant", async () => {
    const el = document.createElement("managed-switch-card-editor") as ManagedSwitchCardEditor;
    document.body.append(el);
    await el.updateComplete;
    expect(root(el).querySelector("ha-form")).toBeNull();
  });
});

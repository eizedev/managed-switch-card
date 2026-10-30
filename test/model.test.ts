import { describe, expect, it } from "vitest";

import {
  availability,
  cardSize,
  deviceLabel,
  layoutFor,
  numeric,
  portTitle,
  powered,
  rateLabel,
  tone,
  words,
  type PortInfo,
  type PortsReply,
} from "../src/model";

function port(name: string, extra: Partial<PortInfo> = {}): PortInfo {
  return {
    if_index: Number(name) || 100,
    name,
    alias: null,
    kind: "ethernet",
    trunk: null,
    members: [],
    uplink: false,
    poe: false,
    entities: { link: `binary_sensor.p${name}_link`, speed: `sensor.p${name}_speed`, device: `sensor.p${name}_device` },
    ...extra,
  };
}

function reply(objectId: string | null, names: string[]): PortsReply {
  return {
    switch: { entry_id: "e", name: "sw", vendor: null, model: null, firmware: null, object_id: objectId, entities: {} },
    ports: [...names.map((n) => port(n)), port("TRK 1", { kind: "trunk", members: [2, 3] })],
  };
}

describe("layoutFor", () => {
  it("uses the model's front panel", () => {
    const r = reply("1.3.6.1.4.1.11.2.3.7.11.194", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
    expect(layoutFor(r)).toEqual({ rows: [["1", "2", "3", "4", "5", "6", "7", "8"]], sfp: ["9", "10"] });
  });

  it("puts ports the model layout does not name in an extra row", () => {
    const r = reply("1.3.6.1.4.1.11.2.3.7.11.186", ["1", "2", "3", "4", "5", "6", "7", "8", "49"]);
    expect(layoutFor(r).rows).toEqual([["1", "2", "3", "4", "5", "6", "7", "8"], ["49"]]);
  });

  it("drops ports of the layout the switch does not have", () => {
    const r = reply("1.3.6.1.4.1.11.2.3.7.11.194", ["1", "2"]);
    expect(layoutFor(r)).toEqual({ rows: [["1", "2"]], sfp: [] });
  });

  it("takes a layout from the card's configuration", () => {
    const r = reply(null, ["1", "2", "3"]);
    expect(layoutFor(r, { rows: [["3", "1"]], sfp: ["2"] })).toEqual({ rows: [["3", "1"]], sfp: ["2"] });
  });

  it("lays out unknown switches by themselves: one row, or odd above even", () => {
    expect(layoutFor(reply(null, ["1", "2", "3"])).rows).toEqual([["1", "2", "3"]]);
    const many = Array.from({ length: 24 }, (_, i) => String(i + 1));
    const rows = layoutFor(reply(null, many)).rows;
    expect(rows[0].slice(0, 3)).toEqual(["1", "3", "5"]);
    expect(rows[1].slice(0, 3)).toEqual(["2", "4", "6"]);
    expect(layoutFor(reply(null, [])).rows).toEqual([]);
  });
});

describe("tone", () => {
  const on = { state: "on", attributes: {} };
  it("colours by link and speed", () => {
    expect(tone(on, { state: "1000", attributes: {} })).toBe("fast");
    expect(tone(on, { state: "2500", attributes: {} })).toBe("fast");
    expect(tone(on, { state: "100", attributes: {} })).toBe("slow");
    expect(tone(on, { state: "10", attributes: {} })).toBe("slowest");
    expect(tone(on, undefined)).toBe("up");
    expect(tone(on, { state: "unavailable", attributes: {} })).toBe("up");
    expect(tone({ state: "off", attributes: {} }, undefined)).toBe("down");
    expect(tone({ state: "unavailable", attributes: {} }, undefined)).toBe("unknown");
    expect(tone(undefined, undefined)).toBe("unknown");
  });
});

describe("labels", () => {
  it("shortens device names and hides unknown", () => {
    expect(deviceLabel({ state: "Living room TV", attributes: {} })).toBe("Living room TV");
    expect(deviceLabel({ state: "A very long device name here", attributes: {} }, 10)).toBe("A very lo…");
    expect(deviceLabel({ state: "unknown", attributes: {} })).toBe("");
    expect(deviceLabel(undefined)).toBe("");
  });

  it("shows rates in Mbit/s", () => {
    expect(rateLabel({ state: "123.4", attributes: { unit_of_measurement: "Mbit/s" } })).toBe("123");
    expect(rateLabel({ state: "2500000", attributes: { unit_of_measurement: "bit/s" } })).toBe("2.5");
    expect(rateLabel({ state: "15000", attributes: { unit_of_measurement: "kbit/s" } })).toBe("15");
    expect(rateLabel({ state: "unknown", attributes: {} })).toBe("");
    expect(rateLabel(undefined)).toBe("");
  });

  it("knows PoE delivering power", () => {
    expect(powered({ state: "delivering_power", attributes: {} })).toBe(true);
    expect(powered({ state: "searching", attributes: {} })).toBe(false);
  });

  it("describes a port", () => {
    const p = port("4", { alias: "uplink", uplink: true, poe: true, entities: { link: "l", speed: "s", device: "d", poe: "p" } });
    const states = {
      l: { state: "on", attributes: {} },
      s: { state: "1000", attributes: {} },
      p: { state: "searching", attributes: {} },
      d: { state: "AP +1", attributes: { devices: [{ name: "AP" }, { mac: "02:00:00:00:00:01" }] } },
    };
    expect(portTitle(p, states, words("de")).split("\n")).toEqual([
      "Port 4 · uplink",
      "1000 Mbit/s",
      "Verbindung zu einem anderen Switch",
      "PoE: searching",
      "• AP",
      "• 02:00:00:00:00:01",
    ]);
    const down = { l: { state: "off", attributes: {} } };
    expect(portTitle(port("1", { entities: { link: "l" } }), down, words("en"))).toBe("Port 1\nNo link");
    expect(portTitle(port("1"), {}, words("xx"))).toBe("Port 1\nUnknown");
    const noSpeed = { l: { state: "on", attributes: {} } };
    expect(portTitle(port("1", { entities: { link: "l" } }), noSpeed, words("en"))).toBe("Port 1\nLink");
  });

  it("shows PoE states in the user's language", () => {
    const p = port("1", { poe: true, entities: { poe: "p" } });
    const states = { p: { state: "delivering_power", attributes: {} } };
    const lines = portTitle(p, states, words("en"), (s) => `<${s.state}>`).split("\n");
    expect(lines.at(-1)).toBe("PoE: <delivering_power>");
    expect(portTitle(p, {}, words("en")).split("\n").at(-1)).toBe("PoE: ?");
  });

  it("lists at most ten devices", () => {
    const devices = Array.from({ length: 12 }, (_, i) => ({ name: `d${i}` }));
    const states = { d: { state: "x", attributes: { devices } } };
    const lines = portTitle(port("1", { entities: { device: "d" } }), states, words("en")).split("\n");
    expect(lines.at(-1)).toBe("… +2");
  });
});

describe("numbers and sizes", () => {
  it("reads numbers, not unknown states", () => {
    expect(numeric({ state: "12.5", attributes: {} })).toBe(12.5);
    expect(numeric({ state: "unavailable", attributes: {} })).toBeUndefined();
    expect(numeric({ state: "", attributes: {} })).toBeUndefined();
    expect(numeric(undefined)).toBeUndefined();
  });

  it("notices ports whose entities are unavailable", () => {
    const r = reply(null, ["1", "2"]);
    const states = { "binary_sensor.p1_link": { state: "unavailable", attributes: {} } };
    expect(availability(r, states)).toBe("011");
    expect(availability(undefined, states)).toBe("");
  });

  it("grows with rows and trunks", () => {
    expect(cardSize(undefined, 0)).toBe(3);
    expect(cardSize({ rows: [["1"], ["2"]], sfp: [] }, 1)).toBe(7);
    expect(cardSize({ rows: [], sfp: ["9"] }, 0)).toBe(3);
  });
});

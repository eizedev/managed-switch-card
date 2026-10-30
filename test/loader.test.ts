import { describe, expect, it, vi } from "vitest";

import { PortsLoader, REFRESH_MS, RETRY_MS, errorText } from "../src/loader";
import { words, type PortsReply } from "../src/model";

const answer = (name: string): PortsReply => ({
  switch: { entry_id: "e", name, vendor: null, model: null, firmware: null, object_id: null, entities: {} },
  ports: [],
});

/** A callWS whose answers the test hands out one by one. */
function fakeWS() {
  const calls: { id: unknown; resolve: (r: PortsReply) => void; reject: (e: unknown) => void }[] = [];
  const callWS = vi.fn(
    (m: Record<string, unknown>) =>
      new Promise<PortsReply>((resolve, reject) => calls.push({ id: m.device_id, resolve, reject })),
  );
  return { callWS, calls };
}

const tick = () => new Promise((r) => setTimeout(r));

describe("PortsLoader", () => {
  it("reads once, again after the refresh time, and at once when asked", async () => {
    const { callWS, calls } = fakeWS();
    const changed = vi.fn();
    const loader = new PortsLoader(changed);
    loader.load(callWS, "a", 0);
    loader.load(callWS, "a", 1); // still waiting for the answer
    calls[0].resolve(answer("A"));
    await tick();
    expect(loader.reply?.switch.name).toBe("A");
    expect(changed).toHaveBeenCalledOnce();
    loader.load(callWS, "a", REFRESH_MS - 1);
    expect(callWS).toHaveBeenCalledTimes(1);
    loader.load(callWS, "a", REFRESH_MS + 1);
    expect(callWS).toHaveBeenCalledTimes(2);
    calls[1].resolve(answer("A"));
    await tick();
    loader.load(callWS, "a", REFRESH_MS + 2, true);
    expect(callWS).toHaveBeenCalledTimes(3);
  });

  it("keeps the last answer when a read fails, and tries again soon", async () => {
    const { callWS, calls } = fakeWS();
    const loader = new PortsLoader(() => undefined);
    loader.load(callWS, "a", 0);
    calls[0].resolve(answer("A"));
    await tick();
    loader.load(callWS, "a", REFRESH_MS + 1);
    calls[1].reject({ code: "not_found", message: "gone" });
    await tick();
    expect(loader.reply?.switch.name).toBe("A");
    expect(loader.error).toEqual({ code: "not_found", message: "gone" });
    loader.load(callWS, "a", REFRESH_MS + RETRY_MS);
    expect(callWS).toHaveBeenCalledTimes(2);
    loader.load(callWS, "a", REFRESH_MS + RETRY_MS + 2);
    expect(callWS).toHaveBeenCalledTimes(3);
    calls[2].resolve(answer("A2"));
    await tick();
    expect(loader.error).toBeUndefined();
  });

  it("ignores an answer for a switch the card no longer shows", async () => {
    const { callWS, calls } = fakeWS();
    const loader = new PortsLoader(() => undefined);
    loader.load(callWS, "a", 0);
    loader.load(callWS, "b", 1);
    calls[1].resolve(answer("B"));
    calls[0].resolve(answer("A"));
    await tick();
    expect(loader.reply?.switch.name).toBe("B");
    loader.reset();
    expect(loader.reply).toBeUndefined();
    calls.length = 0;
    loader.load(callWS, "b", 2);
    calls[0].reject(undefined);
    await tick();
    expect(loader.error).toBe("error");
  });
});

describe("errorText", () => {
  it("explains the errors a user can fix", () => {
    const en = words("en");
    expect(errorText({ code: "unknown_command", message: "Unknown command." }, en)).toBe(en.oldIntegration);
    expect(errorText({ code: "not_found" }, en)).toBe(en.notFound);
    expect(errorText({ code: "x", message: "boom" }, en)).toBe("boom");
    expect(errorText("plain", en)).toBe("plain");
  });
});

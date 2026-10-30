// When the card asks the integration for a switch's ports, and what it keeps from the answer;
// apart from the card so it can be tested without a browser.

import type { PortsReply, Words } from "./model";

/** The ports are read again this often. */
export const REFRESH_MS = 5 * 60 * 1000;
/** After a failed read (Home Assistant starting, switch not set up yet) the card tries again. */
export const RETRY_MS = 15 * 1000;

export type CallWS = (message: Record<string, unknown>) => Promise<PortsReply>;

interface WsError {
  code?: string;
  message?: string;
}

/** The text the card shows for a failed read. */
export function errorText(err: unknown, words: Words): string {
  const { code, message } = (err ?? {}) as WsError;
  if (code === "unknown_command") return words.oldIntegration;
  if (code === "not_found") return words.notFound;
  return message ?? String(err);
}

export class PortsLoader {
  /** The last good answer for the current switch; kept while a later read fails. */
  reply?: PortsReply;
  /** Why the last read failed, if it did. */
  error?: unknown;
  private deviceId?: string;
  private loadedAt = 0;
  private pending = false;

  constructor(private readonly changed: () => void) {}

  /** Forget the switch, for a new configuration. */
  reset(): void {
    this.reply = undefined;
    this.error = undefined;
    this.deviceId = undefined;
    this.loadedAt = 0;
  }

  /**
   * Read the ports of `deviceId` when due: for a new switch, every REFRESH_MS, RETRY_MS after a
   * failure, or at once with `again` (the switch was set up again). One read at a time.
   */
  load(callWS: CallWS, deviceId: string, now: number, again = false): void {
    if (this.pending && this.deviceId === deviceId) return;
    const wait = this.error === undefined ? REFRESH_MS : RETRY_MS;
    if (this.deviceId === deviceId && !again && now - this.loadedAt < wait) return;
    if (this.deviceId !== deviceId) this.reply = undefined;
    this.deviceId = deviceId;
    this.loadedAt = now;
    this.pending = true;
    callWS({ type: "managed_switch/ports", device_id: deviceId }).then(
      (reply) => this.settle(deviceId, reply, undefined),
      (err: unknown) => this.settle(deviceId, undefined, err ?? "error"),
    );
  }

  private settle(deviceId: string, reply: PortsReply | undefined, error: unknown): void {
    if (deviceId !== this.deviceId) return; // an answer for a switch the card no longer shows
    this.pending = false;
    if (reply) this.reply = reply;
    this.error = error;
    this.changed();
  }
}

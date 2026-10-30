import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function run(tag: string): { out: string; code: number } {
  try {
    return { out: execFileSync("node", ["scripts/release-notes.mjs", tag], { encoding: "utf8" }), code: 0 };
  } catch (error) {
    const e = error as { status: number; stderr: string };
    return { out: e.stderr, code: e.status };
  }
}

describe("release notes", () => {
  const version = JSON.parse(readFileSync("package.json", "utf8")).version as string;

  it("prints the section of the package's version", () => {
    const { out, code } = run(`v${version}`);
    expect(code).toBe(0);
    expect(out).toContain("Documentation: https://ha-managed-switch.eize.dev/card/");
  });

  it("refuses other versions and bad tags", () => {
    expect(run("v99.0.0")).toMatchObject({ code: 1 });
    expect(run("latest").out).toContain("is not a tag");
  });
});

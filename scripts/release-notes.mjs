// Print the CHANGELOG.md section of a release tag; stop if package.json has another version.
//   node scripts/release-notes.mjs vX.Y.Z
import { readFileSync } from "node:fs";

const tag = process.argv[2] ?? "";
const match = /^v(\d+\.\d+\.\d+)$/.exec(tag);
if (!match) {
  console.error(`${tag} is not a tag like v1.2.3`);
  process.exit(1);
}
const version = match[1];
const pkg = JSON.parse(readFileSync("package.json", "utf8")).version;
if (pkg !== version) {
  console.error(`package.json says ${pkg}, the tag ${version}: they do not match`);
  process.exit(1);
}
const changelog = readFileSync("CHANGELOG.md", "utf8");
const start = changelog.indexOf(`## [${version}]`);
if (start < 0) {
  console.error(`CHANGELOG.md has no section [${version}]`);
  process.exit(1);
}
const rest = changelog.slice(start).split("\n").slice(1);
const end = rest.findIndex((line) => line.startsWith("## [") || line.startsWith("["));
const body = (end < 0 ? rest : rest.slice(0, end)).join("\n").trim();
if (!body) {
  console.error(`The section [${version}] of CHANGELOG.md is empty`);
  process.exit(1);
}
console.log(`${body}\n\nDocumentation: https://ha-managed-switch.eize.dev/card/`);

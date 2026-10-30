// Bundle the card into one file for Home Assistant: dist/managed-switch-card.js.
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

await build({
  entryPoints: ["src/managed-switch-card.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  sourcemap: false,
  legalComments: "eof",
  define: { __VERSION__: JSON.stringify(version) },
  outfile: "dist/managed-switch-card.js",
});
console.log(`built dist/managed-switch-card.js ${version}`);

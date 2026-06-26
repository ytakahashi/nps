import { assertEquals } from "./deps.ts";
import { NpmScripts, Script } from "../src/core.ts";
import { formatScriptsAsTsv } from "../src/format.ts";

Deno.test("format scripts as TSV", () => {
  const scripts = new NpmScripts([
    new Script("dev", "vite"),
    new Script("test:unit", "vitest"),
    new Script("lint", "eslint\t.\n--fix"),
  ]);

  const actual = formatScriptsAsTsv(scripts);

  assertEquals(
    actual,
    [
      "dev\tvite",
      "test:unit\tvitest",
      "lint\teslint . --fix",
    ].join("\n"),
  );
});

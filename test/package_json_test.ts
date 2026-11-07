import { assertEquals, assertRejects, fromFileUrl } from "./deps.ts";
import { readPackageJson } from "../src/package_json.ts";

Deno.test("readPackageJson preserves scripts without a package manager declaration", async () => {
  const actual = await readPackageJson(
    fromFileUrl(new URL("npm/package.json", import.meta.url)),
  );
  assertEquals(actual.packageManager, undefined);
  assertEquals(actual.scripts, {
    test: "mocha",
    lint: "eslint --ext .js,.jsx,.ts,.tsx  ./src",
    build: "tsc",
  });
});

Deno.test("readPackageJson preserves the package manager declaration", async () => {
  const actual = await readPackageJson(
    fromFileUrl(new URL("npm/package_yarn.json", import.meta.url)),
  );
  assertEquals(actual.packageManager, "yarn@3.0.0");
  assertEquals(actual.scripts, {
    test: "mocha",
    lint: "eslint --ext .js,.jsx,.ts,.tsx  ./src",
    build: "tsc",
  });
});

Deno.test("readPackageJson preserves devEngines", async () => {
  const actual = await readPackageJson(
    fromFileUrl(new URL("dev_engines/package.json", import.meta.url)),
  );
  assertEquals(actual.devEngines, {
    packageManager: { name: "pnpm", version: "^10.0.0", onFail: "warn" },
  });
});

Deno.test("readPackageJson leaves script validation to the consumer", async () => {
  const actual = await readPackageJson(
    fromFileUrl(new URL("invalid_scripts/package.json", import.meta.url)),
  );
  assertEquals(actual.scripts, { valid: "echo valid", test: 42 });
});

Deno.test("readPackageJson rejects a missing file", async () => {
  await assertRejects(
    () => readPackageJson("not_exist.json"),
    Error,
    "failed to read 'not_exist.json'",
  );
});

Deno.test("readPackageJson rejects invalid JSON", async () => {
  await assertRejects(
    () =>
      readPackageJson(
        fromFileUrl(new URL("package_json/invalid.json.txt", import.meta.url)),
      ),
    SyntaxError,
  );
});

Deno.test("readPackageJson rejects a null root", async () => {
  const path = fromFileUrl(new URL("package_json/null.json", import.meta.url));
  await assertRejects(
    () => readPackageJson(path),
    Error,
    `expected an object in '${path}'`,
  );
});

Deno.test("readPackageJson rejects an array root", async () => {
  const path = fromFileUrl(new URL("package_json/array.json", import.meta.url));
  await assertRejects(
    () => readPackageJson(path),
    Error,
    `expected an object in '${path}'`,
  );
});

Deno.test("readPackageJson rejects a string root", async () => {
  const path = fromFileUrl(
    new URL("package_json/string.json", import.meta.url),
  );
  await assertRejects(
    () => readPackageJson(path),
    Error,
    `expected an object in '${path}'`,
  );
});

Deno.test("readPackageJson rejects a number root", async () => {
  const path = fromFileUrl(
    new URL("package_json/number.json", import.meta.url),
  );
  await assertRejects(
    () => readPackageJson(path),
    Error,
    `expected an object in '${path}'`,
  );
});

Deno.test("readPackageJson rejects a boolean root", async () => {
  const path = fromFileUrl(
    new URL("package_json/boolean.json", import.meta.url),
  );
  await assertRejects(
    () => readPackageJson(path),
    Error,
    `expected an object in '${path}'`,
  );
});

import {
  assertEquals,
  assertRejects,
  dirname,
  fromFileUrl,
  SEPARATOR,
} from "./deps.ts";
import { resolvePackageManager } from "../src/package_manager.ts";

Deno.test("resolvePackageManager: npm", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    {},
    `${dir}${SEPARATOR}npm${SEPARATOR}`,
  );
  assertEquals(actual, "npm");
});

Deno.test("resolvePackageManager: yarn", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    {},
    `${dir}${SEPARATOR}yarn${SEPARATOR}`,
  );
  assertEquals(actual, "yarn");
});

Deno.test("resolvePackageManager: pnpm", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    {},
    `${dir}${SEPARATOR}pnpm${SEPARATOR}`,
  );
  assertEquals(actual, "pnpm");
});

Deno.test("resolvePackageManager: bun", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    {},
    `${dir}${SEPARATOR}bun${SEPARATOR}`,
  );
  assertEquals(actual, "bun");
});

Deno.test("resolvePackageManager: bun lockb", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    {},
    `${dir}${SEPARATOR}bun_lockb${SEPARATOR}`,
  );
  assertEquals(actual, "bun");
});

Deno.test("resolvePackageManager: bun takes precedence when multiple lockfiles exist", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    {},
    `${dir}${SEPARATOR}multiple_lockfiles`,
  );
  assertEquals(actual, "bun");
});

Deno.test("resolvePackageManager: fail", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () => resolvePackageManager({}, dir),
    Error,
    "'bun.lock', 'bun.lockb', 'package-lock.json', 'yarn.lock', or 'pnpm-lock.yaml' not found",
  );
});

Deno.test("resolvePackageManager: devEngines takes precedence over packageManager and lockfiles", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    {
      devEngines: { packageManager: { name: "pnpm" } },
      packageManager: "yarn@3.0.0",
    },
    `${dir}${SEPARATOR}npm`,
  );
  assertEquals(actual, "pnpm");
});

Deno.test("resolvePackageManager: packageManager takes precedence over lockfiles", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    { packageManager: "yarn@3.0.0+sha224.hash" },
    `${dir}${SEPARATOR}npm`,
  );
  assertEquals(actual, "yarn");
});

Deno.test("resolvePackageManager: unrelated devEngines fields fall through to packageManager", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    {
      devEngines: { runtime: { name: "node" } },
      packageManager: "bun@1.0.0",
    },
    `${dir}${SEPARATOR}npm`,
  );
  assertEquals(actual, "bun");
});

Deno.test("resolvePackageManager: unrelated devEngines fields fall through to lockfiles", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    { devEngines: { runtime: { name: "node" } } },
    `${dir}${SEPARATOR}npm`,
  );
  assertEquals(actual, "npm");
});

Deno.test("resolvePackageManager: devEngines works without lockfiles and ignores version and onFail", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    {
      devEngines: {
        packageManager: { name: "bun", version: "^1", onFail: "ignore" },
      },
    },
    dir,
  );
  assertEquals(actual, "bun");
});

Deno.test("resolvePackageManager rejects invalid declarations: devEngines is a string", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        { devEngines: "npm", packageManager: "yarn@3" },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    "'devEngines' must be",
  );
});

Deno.test("resolvePackageManager rejects invalid declarations: devEngines.packageManager is null", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        { devEngines: { packageManager: null }, packageManager: "yarn@3" },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    "'devEngines.packageManager' must be",
  );
});

Deno.test("resolvePackageManager: devEngines.packageManager array uses the first entry", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    {
      devEngines: {
        packageManager: [{ name: "pnpm" }, { name: "npm" }],
      },
      packageManager: "yarn@3",
    },
    `${dir}${SEPARATOR}npm`,
  );
  assertEquals(actual, "pnpm");
});

Deno.test("resolvePackageManager: empty devEngines.packageManager array falls through to packageManager", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    { devEngines: { packageManager: [] }, packageManager: "yarn@3" },
    `${dir}${SEPARATOR}npm`,
  );
  assertEquals(actual, "yarn");
});

Deno.test("resolvePackageManager: empty devEngines.packageManager array falls through to lockfiles", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    { devEngines: { packageManager: [] } },
    `${dir}${SEPARATOR}npm`,
  );
  assertEquals(actual, "npm");
});

Deno.test("resolvePackageManager rejects invalid declarations: devEngines.packageManager array has a non-object entry", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        {
          devEngines: { packageManager: [{ name: "pnpm" }, "npm"] },
          packageManager: "yarn@3",
        },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    "'devEngines.packageManager[1]' must be an object",
  );
});

Deno.test("resolvePackageManager rejects invalid declarations: devEngines.packageManager array entry has no name", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        {
          devEngines: { packageManager: [{ version: "^10" }] },
          packageManager: "yarn@3",
        },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    "'devEngines.packageManager[0].name' must be",
  );
});

Deno.test("resolvePackageManager rejects invalid declarations: devEngines.packageManager is a boolean", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        { devEngines: { packageManager: false }, packageManager: "yarn@3" },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    "'devEngines.packageManager' must be",
  );
});

Deno.test("resolvePackageManager rejects invalid declarations: devEngines.packageManager.name is null", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        {
          devEngines: { packageManager: { name: null } },
          packageManager: "yarn@3",
        },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    "'devEngines.packageManager.name' must be",
  );
});

Deno.test("resolvePackageManager rejects invalid declarations: packageManager is missing a name before the version", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        { packageManager: "@1.0.0" },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    "'packageManager' must be",
  );
});

Deno.test("resolvePackageManager: devEngines.packageManager array allows unsupported alternatives after the first entry", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    {
      devEngines: {
        packageManager: [{ name: "pnpm" }, { name: "deno" }],
      },
    },
    `${dir}${SEPARATOR}npm`,
  );
  assertEquals(actual, "pnpm");
});

Deno.test("resolvePackageManager rejects unsupported package managers: devEngines.packageManager.name is unknown", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        {
          devEngines: { packageManager: { name: "deno" } },
          packageManager: "yarn@3",
        },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    `'devEngines.packageManager.name' must be one of bun, npm, yarn, pnpm, but got "deno"`,
  );
});

Deno.test("resolvePackageManager rejects unsupported package managers: devEngines.packageManager.name has surrounding whitespace", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        { devEngines: { packageManager: { name: " pnpm" } } },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    `'devEngines.packageManager.name' must be one of bun, npm, yarn, pnpm, but got " pnpm"`,
  );
});

Deno.test("resolvePackageManager rejects unsupported package managers: devEngines.packageManager.name differs in case", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        { devEngines: { packageManager: { name: "PNPM" } } },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    `'devEngines.packageManager.name' must be one of bun, npm, yarn, pnpm, but got "PNPM"`,
  );
});

Deno.test("resolvePackageManager rejects unsupported package managers: devEngines.packageManager.name is empty", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        { devEngines: { packageManager: { name: "" } } },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    `'devEngines.packageManager.name' must be one of bun, npm, yarn, pnpm, but got ""`,
  );
});

Deno.test("resolvePackageManager rejects unsupported package managers: first devEngines.packageManager array entry is unknown", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        {
          devEngines: {
            packageManager: [{ name: "deno" }, { name: "npm" }],
          },
        },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    `'devEngines.packageManager[0].name' must be one of bun, npm, yarn, pnpm, but got "deno"`,
  );
});

Deno.test("resolvePackageManager rejects unsupported package managers: packageManager is unknown", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        { packageManager: "deno@2.0.0" },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    `'packageManager' must be one of bun, npm, yarn, pnpm, but got "deno"`,
  );
});

Deno.test("resolvePackageManager rejects unsupported package managers: packageManager has surrounding whitespace", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  await assertRejects(
    () =>
      resolvePackageManager(
        { packageManager: " yarn@3.0.0" },
        `${dir}${SEPARATOR}npm`,
      ),
    Error,
    `'packageManager' must be one of bun, npm, yarn, pnpm, but got " yarn"`,
  );
});

Deno.test("resolvePackageManager: packageManager accepts a Corepack hash suffix", async () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = await resolvePackageManager(
    { packageManager: "pnpm@10.0.0+sha512.abc" },
    `${dir}${SEPARATOR}npm`,
  );
  assertEquals(actual, "pnpm");
});

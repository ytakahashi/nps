import {
  assertEquals,
  assertRejects,
  dirname,
  fromFileUrl,
  SEPARATOR,
} from "./deps.ts";
import {
  CommandRunner,
  NpmScripts,
  readPackageJson,
  resolvePackageManager,
  runScript,
  Script,
  SelectPrompt,
  selectScript,
} from "../src/core.ts";

Deno.test("readPackageJson", async (t) => {
  await t.step("success (packageManager: not defined)", async () => {
    const dir = dirname(fromFileUrl(import.meta.url));
    const actual = await readPackageJson(
      `${dir}${SEPARATOR}npm${SEPARATOR}package.json`,
    );

    const actualPackageManager = actual.packageJson.packageManager;
    assertEquals(actualPackageManager, undefined);

    const actualNpmScripts = actual.scripts;
    assertEquals(actualNpmScripts.getScripts().length, 3);
    assertEquals(actualNpmScripts.getScripts()[0].stage, "test");
    assertEquals(actualNpmScripts.getScripts()[0].command, "mocha");
    assertEquals(actualNpmScripts.getScripts()[1].stage, "lint");
    assertEquals(
      actualNpmScripts.getScripts()[1].command,
      "eslint --ext .js,.jsx,.ts,.tsx  ./src",
    );
    assertEquals(actualNpmScripts.getScripts()[2].stage, "build");
    assertEquals(actualNpmScripts.getScripts()[2].command, "tsc");
  });

  await t.step("success (packageManager: yarn)", async () => {
    const dir = dirname(fromFileUrl(import.meta.url));
    const actual = await readPackageJson(
      `${dir}${SEPARATOR}npm${SEPARATOR}package_yarn.json`,
    );

    const actualPackageManager = actual.packageJson.packageManager;
    assertEquals(actualPackageManager, "yarn@3.0.0");

    const actualNpmScripts = actual.scripts;
    assertEquals(actualNpmScripts.getScripts().length, 3);
    assertEquals(actualNpmScripts.getScripts()[0].stage, "test");
    assertEquals(actualNpmScripts.getScripts()[0].command, "mocha");
    assertEquals(actualNpmScripts.getScripts()[1].stage, "lint");
    assertEquals(
      actualNpmScripts.getScripts()[1].command,
      "eslint --ext .js,.jsx,.ts,.tsx  ./src",
    );
    assertEquals(actualNpmScripts.getScripts()[2].stage, "build");
    assertEquals(actualNpmScripts.getScripts()[2].command, "tsc");
  });

  await t.step("fail", async () => {
    await assertRejects(
      () => readPackageJson("not_exist.json"),
      Error,
      "failed to read 'not_exist.json'",
    );
  });

  await t.step(
    "preserves devEngines for package manager resolution",
    async () => {
      const dir = dirname(fromFileUrl(import.meta.url));
      const { packageJson, scripts } = await readPackageJson(
        `${dir}${SEPARATOR}dev_engines${SEPARATOR}package.json`,
      );
      assertEquals(await resolvePackageManager(packageJson, dir), "pnpm");
      assertEquals(scripts.getScripts()[0].stage, "test");
    },
  );
});

Deno.test("resolvePackageManager", async (t) => {
  const dir = dirname(fromFileUrl(import.meta.url));

  await t.step("npm", async () => {
    const actual = await resolvePackageManager(
      {},
      `${dir}${SEPARATOR}npm${SEPARATOR}`,
    );
    assertEquals(actual, "npm");
  });

  await t.step("yarn", async () => {
    const actual = await resolvePackageManager(
      {},
      `${dir}${SEPARATOR}yarn${SEPARATOR}`,
    );
    assertEquals(actual, "yarn");
  });

  await t.step("pnpm", async () => {
    const actual = await resolvePackageManager(
      {},
      `${dir}${SEPARATOR}pnpm${SEPARATOR}`,
    );
    assertEquals(actual, "pnpm");
  });

  await t.step("bun", async () => {
    const actual = await resolvePackageManager(
      {},
      `${dir}${SEPARATOR}bun${SEPARATOR}`,
    );
    assertEquals(actual, "bun");
  });

  await t.step("bun lockb", async () => {
    const actual = await resolvePackageManager(
      {},
      `${dir}${SEPARATOR}bun_lockb${SEPARATOR}`,
    );
    assertEquals(actual, "bun");
  });

  await t.step(
    "bun takes precedence when multiple lockfiles exist",
    async () => {
      const actual = await resolvePackageManager(
        {},
        `${dir}${SEPARATOR}multiple_lockfiles`,
      );
      assertEquals(actual, "bun");
    },
  );

  await t.step("fail", async () => {
    await assertRejects(
      () => resolvePackageManager({}, dir),
      Error,
      "'bun.lock', 'bun.lockb', 'package-lock.json', 'yarn.lock', or 'pnpm-lock.yaml' not found",
    );
  });
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

Deno.test("filter scripts (without argument)", () => {
  const scripts = new NpmScripts([
    new Script("foo", "echo foo"),
    new Script("bar", "echo bar"),
    new Script("baz", "echo baz"),
  ]);
  const actual = scripts.filterItems();
  assertEquals(actual.getScripts().length, 3);
});

Deno.test("filter scripts (with argument)", () => {
  const scripts = new NpmScripts([
    new Script("foo", "echo foo"),
    new Script("bar", "echo bar"),
    new Script("baz", "echo baz"),
  ]);

  const actual = scripts.filterItems("ba");
  assertEquals(actual.getScripts().length, 2);
  assertEquals(actual.getScripts()[0].stage, "bar");
  assertEquals(actual.getScripts()[1].stage, "baz");
});

class MockedSelectPrompt implements SelectPrompt {
  called = 0;
  calledWith: NpmScripts | undefined;

  select = (scripts: NpmScripts): Promise<Script> => {
    this.called++;
    this.calledWith = scripts;
    return Promise.resolve(scripts.getScripts()[0]);
  };
}

Deno.test("select a script (not invoke prompt)", async () => {
  // Given
  const foo = new Script("foo", "echo foo");
  const scripts = new NpmScripts([foo]);
  const promptMock = new MockedSelectPrompt();

  // When
  const actual = await selectScript(scripts, promptMock);

  // Then
  assertEquals(actual, foo);
  assertEquals(promptMock.called, 0);
});

Deno.test("select a script (invoke prompt)", async () => {
  // Given
  const foo = new Script("foo", "echo foo");
  const bar = new Script("bar", "echo bar");
  const scripts = new NpmScripts([foo, bar]);
  const promptMock = new MockedSelectPrompt();

  // When
  await selectScript(scripts, promptMock);

  // Then
  assertEquals(promptMock.called, 1);
  assertEquals(promptMock.calledWith, scripts);
});

class MockedCommandRunner implements CommandRunner {
  calledWith: string[] = [];
  run = async (cmd: string[]) => {
    await Promise.resolve(this.calledWith = cmd);
  };
}

Deno.test("run script without arguments", () => {
  const packageManager = "npm";
  const stage = new Script("build", "build");
  const args: string[] = [];
  const commandRunner = new MockedCommandRunner();

  runScript(packageManager, stage, args, commandRunner);
  assertEquals(commandRunner.calledWith, ["npm", "run", "build"]);
});

Deno.test("run script with arguments", () => {
  const packageManager = "yarn";
  const stage = new Script("test", "test");
  const args: string[] = ["test.ts"];
  const commandRunner = new MockedCommandRunner();

  runScript(packageManager, stage, args, commandRunner);
  assertEquals(commandRunner.calledWith, ["yarn", "run", "test", "test.ts"]);
});

Deno.test("run script with bun", () => {
  const packageManager = "bun";
  const stage = new Script("test", "test");
  const args: string[] = ["test.ts"];
  const commandRunner = new MockedCommandRunner();

  runScript(packageManager, stage, args, commandRunner);
  assertEquals(commandRunner.calledWith, ["bun", "run", "test", "test.ts"]);
});

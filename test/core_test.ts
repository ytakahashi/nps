import {
  assertEquals,
  assertRejects,
  dirname,
  fromFileUrl,
  SEP,
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
    const actual = await readPackageJson(`${dir}${SEP}npm${SEP}package.json`);

    const actualPackageManager = actual.packageManager;
    assertEquals(actualPackageManager, null);

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
      `${dir}${SEP}npm${SEP}package_yarn.json`,
    );

    const actualPackageManager = actual.packageManager;
    assertEquals(actualPackageManager, "yarn");

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
});

Deno.test("resolvePackageManager", async (t) => {
  const dir = dirname(fromFileUrl(import.meta.url));

  await t.step("npm", async () => {
    const actual = await resolvePackageManager(`${dir}${SEP}npm${SEP}`);
    assertEquals(actual, "npm");
  });

  await t.step("yarn", async () => {
    const actual = await resolvePackageManager(`${dir}${SEP}yarn${SEP}`);
    assertEquals(actual, "yarn");
  });

  await t.step("pnpm", async () => {
    const actual = await resolvePackageManager(`${dir}${SEP}pnpm${SEP}`);
    assertEquals(actual, "pnpm");
  });

  await t.step("fail", async () => {
    await assertRejects(
      () => resolvePackageManager(dir),
      Error,
      "'package-lock.json' or 'yarn.lock' or 'pnpm-lock.yaml' not found",
    );
  });
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

import { assertEquals, assertThrows } from "./deps.ts";
import { MockedCommandRunner, MockedSelectPrompt } from "./test_doubles.ts";
import {
  NpmScripts,
  runScript,
  Script,
  selectScript,
} from "../src/npm_scripts.ts";

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

Deno.test("run script without arguments", async () => {
  const packageManager = "npm";
  const stage = new Script("build", "build");
  const args: string[] = [];
  const commandRunner = new MockedCommandRunner();

  await runScript(packageManager, stage, args, commandRunner);
  assertEquals(commandRunner.calledWith, ["npm", "run", "build"]);
});

Deno.test("run script with arguments", async () => {
  const packageManager = "yarn";
  const stage = new Script("test", "test");
  const args: string[] = ["test.ts"];
  const commandRunner = new MockedCommandRunner();

  await runScript(packageManager, stage, args, commandRunner);
  assertEquals(commandRunner.calledWith, ["yarn", "run", "test", "test.ts"]);
});

Deno.test("run script with bun", async () => {
  const packageManager = "bun";
  const stage = new Script("test", "test");
  const args: string[] = ["test.ts"];
  const commandRunner = new MockedCommandRunner();

  await runScript(packageManager, stage, args, commandRunner);
  assertEquals(commandRunner.calledWith, ["bun", "run", "test", "test.ts"]);
});

Deno.test("NpmScripts.fromPackageJson preserves script order and commands", () => {
  const scripts = NpmScripts.fromPackageJson({
    scripts: {
      test: "mocha",
      lint: "eslint --ext .js,.jsx,.ts,.tsx  ./src",
      build: "tsc",
    },
  });
  assertEquals(
    scripts.getScripts().map(({ stage, command }) => ({ stage, command })),
    [
      { stage: "test", command: "mocha" },
      { stage: "lint", command: "eslint --ext .js,.jsx,.ts,.tsx  ./src" },
      { stage: "build", command: "tsc" },
    ],
  );
});

Deno.test("NpmScripts.fromPackageJson accepts missing scripts", () => {
  assertEquals(NpmScripts.fromPackageJson({}).getScripts(), []);
});

Deno.test("NpmScripts.fromPackageJson accepts an empty scripts object", () => {
  assertEquals(NpmScripts.fromPackageJson({ scripts: {} }).getScripts(), []);
});

Deno.test("NpmScripts.fromPackageJson preserves empty commands", () => {
  assertEquals(
    NpmScripts.fromPackageJson({ scripts: { test: "" } }).getScripts().map((
      { stage, command },
    ) => ({ stage, command })),
    [{ stage: "test", command: "" }],
  );
});

Deno.test("NpmScripts.fromPackageJson rejects null scripts", () => {
  assertThrows(
    () => NpmScripts.fromPackageJson({ scripts: null }),
    Error,
    "'scripts' must be an object",
  );
});

Deno.test("NpmScripts.fromPackageJson rejects array scripts", () => {
  assertThrows(
    () => NpmScripts.fromPackageJson({ scripts: [] }),
    Error,
    "'scripts' must be an object",
  );
});

Deno.test("NpmScripts.fromPackageJson rejects string scripts", () => {
  assertThrows(
    () => NpmScripts.fromPackageJson({ scripts: "echo test" }),
    Error,
    "'scripts' must be an object",
  );
});

Deno.test("NpmScripts.fromPackageJson rejects number scripts", () => {
  assertThrows(
    () => NpmScripts.fromPackageJson({ scripts: 42 }),
    Error,
    "'scripts' must be an object",
  );
});

Deno.test("NpmScripts.fromPackageJson rejects boolean scripts", () => {
  assertThrows(
    () => NpmScripts.fromPackageJson({ scripts: false }),
    Error,
    "'scripts' must be an object",
  );
});

Deno.test("NpmScripts.fromPackageJson rejects a null command", () => {
  assertThrows(
    () =>
      NpmScripts.fromPackageJson({
        scripts: { valid: "echo valid", test: null },
      }),
    Error,
    `'scripts["test"]' must be a string`,
  );
});

Deno.test("NpmScripts.fromPackageJson rejects an array command", () => {
  assertThrows(
    () =>
      NpmScripts.fromPackageJson({
        scripts: { valid: "echo valid", test: [] },
      }),
    Error,
    `'scripts["test"]' must be a string`,
  );
});

Deno.test("NpmScripts.fromPackageJson rejects an object command", () => {
  assertThrows(
    () =>
      NpmScripts.fromPackageJson({
        scripts: { valid: "echo valid", test: {} },
      }),
    Error,
    `'scripts["test"]' must be a string`,
  );
});

Deno.test("NpmScripts.fromPackageJson rejects a number command", () => {
  assertThrows(
    () =>
      NpmScripts.fromPackageJson({
        scripts: { valid: "echo valid", test: 42 },
      }),
    Error,
    `'scripts["test"]' must be a string`,
  );
});

Deno.test("NpmScripts.fromPackageJson rejects a boolean command", () => {
  assertThrows(
    () =>
      NpmScripts.fromPackageJson({
        scripts: { valid: "echo valid", test: false },
      }),
    Error,
    `'scripts["test"]' must be a string`,
  );
});

Deno.test("NpmScripts.fromPackageJson rejects an undefined command", () => {
  assertThrows(
    () =>
      NpmScripts.fromPackageJson({
        scripts: { valid: "echo valid", test: undefined },
      }),
    Error,
    `'scripts["test"]' must be a string`,
  );
});

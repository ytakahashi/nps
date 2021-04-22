import { assertEquals, dirname, fromFileUrl } from "./deps.ts";
import {
  CommandRunner,
  filterScripts,
  readPackageScript,
  runScript,
  SelectPrompt,
  selectScript,
} from "../src/core.ts";

Deno.test("read package.json", () => {
  const dir = dirname(fromFileUrl(import.meta.url));
  const actual = readPackageScript(`${dir}/package.json`);
  assertEquals(actual.length, 3);
  assertEquals(actual[0], {
    stage: "test",
    command: "mocha",
  });
  assertEquals(actual[1], {
    stage: "lint",
    command: "eslint --ext .js,.jsx,.ts,.tsx  ./src",
  });
  assertEquals(actual[2], {
    stage: "build",
    command: "tsc",
  });
});

Deno.test("filter scripts (without argument)", () => {
  const scripts = [
    {
      stage: "foo",
      command: "echo foo",
    },
    {
      stage: "bar",
      command: "echo bar",
    },
    {
      stage: "baz",
      command: "echo baz",
    },
  ];

  const actual = filterScripts(scripts);
  assertEquals(actual.length, 3);
});

Deno.test("filter scripts (with argument)", () => {
  const scripts = [
    {
      stage: "foo",
      command: "echo foo",
    },
    {
      stage: "bar",
      command: "echo bar",
    },
    {
      stage: "baz",
      command: "echo baz",
    },
  ];

  const actual = filterScripts(scripts, "ba");
  assertEquals(actual.length, 2);
  assertEquals(actual[0].stage, "bar");
  assertEquals(actual[1].stage, "baz");
});

type Options = {
  name: string;
  value: string;
}[];

class MockedSelectPrompt extends SelectPrompt {
  called = 0;
  calledWith: Options = [];
  run = (options: Options): Promise<string> => {
    this.called++;
    this.calledWith = options;
    return Promise.resolve("");
  };
}

Deno.test("select a script (not invoke prompt)", async () => {
  const scripts = [
    {
      stage: "foo",
      command: "echo foo",
    },
  ];

  const promptMock = new MockedSelectPrompt();
  const actual = await selectScript(scripts, promptMock);
  assertEquals(actual, "foo");
  assertEquals(promptMock.called, 0);
});

Deno.test("select a script (invoke prompt)", async () => {
  const scripts = [
    {
      stage: "foo",
      command: "echo foo",
    },
    {
      stage: "bar",
      command: "echo bar",
    },
  ];

  const promptMock = new MockedSelectPrompt();
  await selectScript(scripts, promptMock);
  assertEquals(promptMock.called, 1);
  assertEquals(promptMock.calledWith.length, 2);
  assertEquals(promptMock.calledWith[0], {
    name: "foo (echo foo)",
    value: "foo",
  });
  assertEquals(promptMock.calledWith[1], {
    name: "bar (echo bar)",
    value: "bar",
  });
});

class MockedCommandRunner extends CommandRunner {
  calledWith: string[] = [];
  run = async (cmd: string[]) => {
    await Promise.resolve(this.calledWith = cmd);
  };
}

Deno.test("run script without arguments", () => {
  const packageManager = "npm";
  const stage = "build";
  const args: string[] = [];
  const commandRunner = new MockedCommandRunner();

  runScript(packageManager, stage, args, commandRunner);
  assertEquals(commandRunner.calledWith, ["npm", "run", "build"]);
});

Deno.test("run script with arguments", () => {
  const packageManager = "yarn";
  const stage = "test";
  const args: string[] = ["test.ts"];
  const commandRunner = new MockedCommandRunner();

  runScript(packageManager, stage, args, commandRunner);
  assertEquals(commandRunner.calledWith, ["yarn", "run", "test", "test.ts"]);
});

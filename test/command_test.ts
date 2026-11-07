import {
  assertEquals,
  assertRejects,
  assertStrictEquals,
  dirname,
  fromFileUrl,
  SEPARATOR,
} from "./deps.ts";
import { Command } from "../src/command.ts";
import type { Arguments, CommandDependencies } from "../src/command.ts";
import { MockedCommandRunner, MockedSelectPrompt } from "./test_doubles.ts";

const version = "9.9.9";
const helpMessage = "HELP_MESSAGE";

const fixtureDir = dirname(fromFileUrl(import.meta.url));

function createArguments(overrides: Partial<Arguments> = {}): Arguments {
  return {
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    ...overrides,
  };
}

function createCommand(
  args: Partial<Arguments> = {},
  overrides: Partial<CommandDependencies> = {},
): Command {
  return new Command(createArguments(args), version, helpMessage, {
    selectPrompt: new MockedSelectPrompt(),
    commandRunner: new MockedCommandRunner(),
    ...overrides,
  });
}

// Captures everything written to console.log while `fn` runs.
async function captureLog(
  fn: () => Promise<void> | void,
): Promise<string[]> {
  const original = console.log;
  const logs: string[] = [];
  console.log = (...args: unknown[]) => {
    logs.push(args.map((a) => String(a)).join(" "));
  };
  try {
    await fn();
  } finally {
    console.log = original;
  }
  return logs;
}

// These helpers mutate process globals and must be used sequentially.
async function captureExit(fn: () => Promise<void>): Promise<string[]> {
  const originalExit = Deno.exit;
  const sentinel = new Error("Intercepted Deno.exit");
  const exitCodes: (number | undefined)[] = [];
  Deno.exit = ((code?: number) => {
    exitCodes.push(code);
    throw sentinel;
  }) as typeof Deno.exit;

  try {
    const logs = await captureLog(async () => {
      const error = await assertRejects(fn);
      assertStrictEquals(error, sentinel);
    });
    assertEquals(exitCodes, [1]);
    return logs;
  } finally {
    Deno.exit = originalExit;
  }
}

// Runs `fn` with the process working directory temporarily set to `dir`.
// Command reads ./package.json, so the cwd must point at a fixture.
async function withCwd(
  dir: string,
  fn: () => Promise<void> | void,
): Promise<void> {
  const original = Deno.cwd();
  Deno.chdir(dir);
  try {
    await fn();
  } finally {
    Deno.chdir(original);
  }
}

Deno.test("Command#run dispatches --help", async () => {
  const selectPrompt = new MockedSelectPrompt();
  const commandRunner = new MockedCommandRunner();
  const logs = await captureLog(() =>
    createCommand({ hasHelpOption: true }, { selectPrompt, commandRunner })
      .run()
  );
  assertEquals(logs, [helpMessage]);
  assertEquals(selectPrompt.called, 0);
  assertEquals(commandRunner.called, 0);
});

Deno.test("Command#run dispatches --version", async () => {
  const selectPrompt = new MockedSelectPrompt();
  const commandRunner = new MockedCommandRunner();
  const logs = await captureLog(() =>
    createCommand({ hasVersionOption: true }, { selectPrompt, commandRunner })
      .run()
  );
  assertEquals(logs, [version]);
  assertEquals(selectPrompt.called, 0);
  assertEquals(commandRunner.called, 0);
});

Deno.test("Command#run dispatches --init-completion zsh", async () => {
  const selectPrompt = new MockedSelectPrompt();
  const commandRunner = new MockedCommandRunner();
  const logs = await captureLog(() =>
    createCommand(
      { hasInitCompletionOption: true, initCompletionShell: "zsh" },
      { selectPrompt, commandRunner },
    )
      .run()
  );
  assertEquals(logs.length, 1);
  assertEquals(logs[0].includes("compdef _nps_complete_npm npm"), true);
  assertEquals(selectPrompt.called, 0);
  assertEquals(commandRunner.called, 0);
});

Deno.test("Command#run --init-completion exits for unsupported shell", async () => {
  const logs = await captureExit(() =>
    createCommand({
      hasInitCompletionOption: true,
      initCompletionShell: "bash",
    }).run()
  );
  assertEquals(logs, ["nps: unsupported completion shell"]);
});

Deno.test("Command#run --list-scripts prints scripts as TSV", async () => {
  const selectPrompt = new MockedSelectPrompt();
  const commandRunner = new MockedCommandRunner();
  let logs: string[] = [];
  await withCwd(`${fixtureDir}${SEPARATOR}npm`, async () => {
    logs = await captureLog(() =>
      createCommand({ hasListScriptsOption: true }, {
        selectPrompt,
        commandRunner,
      }).run()
    );
  });

  assertEquals(logs, [
    [
      "test\tmocha",
      "lint\teslint --ext .js,.jsx,.ts,.tsx  ./src",
      "build\ttsc",
    ].join("\n"),
  ]);
  assertEquals(selectPrompt.called, 0);
  assertEquals(commandRunner.called, 0);
});

Deno.test("Command#run --list-scripts stays silent when package.json is missing", async () => {
  // The completion script consumes this output, so a missing package.json must
  // produce no output (and must not throw) rather than leaking an error.
  let logs: string[] = ["sentinel"];
  await withCwd(`${fixtureDir}${SEPARATOR}yarn`, async () => {
    logs = await captureLog(() =>
      createCommand({ hasListScriptsOption: true }).run()
    );
  });

  assertEquals(logs, []);
});

Deno.test("Command#run --list-scripts ignores invalid package manager declarations without lockfiles", async () => {
  let logs: string[] = [];
  await withCwd(
    `${fixtureDir}${SEPARATOR}invalid_package_manager`,
    async () => {
      logs = await captureLog(() =>
        createCommand({ hasListScriptsOption: true }).run()
      );
    },
  );

  assertEquals(logs, ["test\techo test"]);
});

Deno.test("Command#run --list-scripts stays silent for invalid script commands", async () => {
  let logs: string[] = ["sentinel"];
  await withCwd(`${fixtureDir}${SEPARATOR}invalid_scripts`, async () => {
    logs = await captureLog(() =>
      createCommand({ hasListScriptsOption: true }).run()
    );
  });
  assertEquals(logs, []);
});

Deno.test("Command#run --list-scripts stays silent for a non-object scripts field", async () => {
  let logs: string[] = ["sentinel"];
  await withCwd(`${fixtureDir}${SEPARATOR}invalid_scripts_object`, async () => {
    logs = await captureLog(() =>
      createCommand({ hasListScriptsOption: true }).run()
    );
  });
  assertEquals(logs, []);
});

Deno.test("Command#run reports invalid scripts before package manager resolution", async () => {
  let logs: string[] = [];
  // This fixture has no lockfile: script validation must fail first.
  await withCwd(`${fixtureDir}${SEPARATOR}invalid_scripts`, async () => {
    logs = await captureExit(() => createCommand().run());
  });
  assertEquals(logs, [`nps: 'scripts["test"]' must be a string`]);
});

Deno.test("Command#run executes with npm resolved from a lockfile", async () => {
  const selectPrompt = new MockedSelectPrompt();
  const commandRunner = new MockedCommandRunner();
  await withCwd(
    `${fixtureDir}${SEPARATOR}npm`,
    () =>
      createCommand({ npsArgument: "test" }, { selectPrompt, commandRunner })
        .run(),
  );
  assertEquals(commandRunner.called, 1);
  assertEquals(commandRunner.calledWith, ["npm", "run", "test"]);
  assertEquals(selectPrompt.called, 0);
});

Deno.test("Command#run executes with pnpm resolved from devEngines", async () => {
  const selectPrompt = new MockedSelectPrompt();
  const commandRunner = new MockedCommandRunner();
  await withCwd(
    `${fixtureDir}${SEPARATOR}dev_engines`,
    () =>
      createCommand({ npsArgument: "test" }, { selectPrompt, commandRunner })
        .run(),
  );
  assertEquals(commandRunner.called, 1);
  assertEquals(commandRunner.calledWith, ["pnpm", "run", "test"]);
  assertEquals(selectPrompt.called, 0);
});

Deno.test("Command#run executes the prompt selection from filtered candidates", async () => {
  const selectPrompt = new MockedSelectPrompt("build");
  const commandRunner = new MockedCommandRunner();
  await withCwd(
    `${fixtureDir}${SEPARATOR}npm`,
    () =>
      createCommand({ npsArgument: "i" }, { selectPrompt, commandRunner })
        .run(),
  );
  assertEquals(selectPrompt.called, 1);
  assertEquals(
    selectPrompt.calledWith?.getScripts().map((script) => script.stage),
    ["lint", "build"],
  );
  assertEquals(commandRunner.called, 1);
  assertEquals(commandRunner.calledWith, ["npm", "run", "build"]);
});

Deno.test("Command#run forwards command arguments to the runner", async () => {
  const commandRunner = new MockedCommandRunner();
  await withCwd(
    `${fixtureDir}${SEPARATOR}npm`,
    () =>
      createCommand({
        npsArgument: "test",
        commandArguments: ["-f", "test.spec.ts"],
      }, { commandRunner })
        .run(),
  );
  assertEquals(commandRunner.called, 1);
  assertEquals(commandRunner.calledWith, [
    "npm",
    "run",
    "test",
    "-f",
    "test.spec.ts",
  ]);
});

Deno.test("Command#run reports a package.json read failure once", async () => {
  const selectPrompt = new MockedSelectPrompt();
  const commandRunner = new MockedCommandRunner();
  let logs: string[] = [];
  await withCwd(`${fixtureDir}${SEPARATOR}yarn`, async () => {
    logs = await captureExit(() =>
      createCommand({ npsArgument: "test" }, { selectPrompt, commandRunner })
        .run()
    );
  });
  assertEquals(logs, ["nps: failed to read 'package.json'"]);
  assertEquals(selectPrompt.called, 0);
  assertEquals(commandRunner.called, 0);
});

Deno.test("Command#run reports a package manager resolution failure once", async () => {
  const selectPrompt = new MockedSelectPrompt();
  const commandRunner = new MockedCommandRunner();
  let logs: string[] = [];
  await withCwd(
    `${fixtureDir}${SEPARATOR}invalid_package_manager`,
    async () => {
      logs = await captureExit(() =>
        createCommand({ npsArgument: "test" }, { selectPrompt, commandRunner })
          .run()
      );
    },
  );
  assertEquals(logs, [
    "nps: 'devEngines.packageManager' must be an object or an array of objects",
  ]);
  assertEquals(selectPrompt.called, 0);
  assertEquals(commandRunner.called, 0);
});

Deno.test("Command#run reports empty scripts before package manager resolution", async () => {
  const selectPrompt = new MockedSelectPrompt();
  const commandRunner = new MockedCommandRunner();
  let logs: string[] = [];
  await withCwd(`${fixtureDir}${SEPARATOR}empty_scripts`, async () => {
    logs = await captureExit(() =>
      createCommand({}, { selectPrompt, commandRunner }).run()
    );
  });
  assertEquals(logs, ["nps: scripts not defined"]);
  assertEquals(selectPrompt.called, 0);
  assertEquals(commandRunner.called, 0);
});

Deno.test("Command#run reports unmatched scripts once", async () => {
  const selectPrompt = new MockedSelectPrompt();
  const commandRunner = new MockedCommandRunner();
  let logs: string[] = [];
  await withCwd(`${fixtureDir}${SEPARATOR}npm`, async () => {
    logs = await captureExit(() =>
      createCommand({ npsArgument: "missing" }, { selectPrompt, commandRunner })
        .run()
    );
  });
  assertEquals(logs, ['nps: no script matches "missing"']);
  assertEquals(selectPrompt.called, 0);
  assertEquals(commandRunner.called, 0);
});

Deno.test("Command#run reports a prompt rejection without running a script", async () => {
  let promptCalls = 0;
  const commandRunner = new MockedCommandRunner();
  let logs: string[] = [];
  await withCwd(`${fixtureDir}${SEPARATOR}npm`, async () => {
    logs = await captureExit(() =>
      createCommand({ npsArgument: "i" }, {
        selectPrompt: {
          select: () => {
            promptCalls++;
            return Promise.reject(new Error("selection failed"));
          },
        },
        commandRunner,
      }).run()
    );
  });
  assertEquals(logs, ["nps: selection failed"]);
  assertEquals(promptCalls, 1);
  assertEquals(commandRunner.called, 0);
});

Deno.test("Command#run reports a runner rejection once", async () => {
  const selectPrompt = new MockedSelectPrompt();
  const calls: string[][] = [];
  let logs: string[] = [];
  await withCwd(`${fixtureDir}${SEPARATOR}npm`, async () => {
    logs = await captureExit(() =>
      createCommand({ npsArgument: "test" }, {
        selectPrompt,
        commandRunner: {
          run: (cmd) => {
            calls.push([...cmd]);
            return Promise.reject(new Error("execution failed"));
          },
        },
      }).run()
    );
  });
  assertEquals(logs, ["nps: execution failed"]);
  assertEquals(calls, [["npm", "run", "test"]]);
  assertEquals(selectPrompt.called, 0);
});

import {
  assertEquals,
  assertRejects,
  dirname,
  fromFileUrl,
  SEPARATOR,
} from "./deps.ts";
import { Command } from "../src/command.ts";

const version = "9.9.9";
const helpMessage = "HELP_MESSAGE";

const fixtureDir = dirname(fromFileUrl(import.meta.url));

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

// Runs `fn` with the process working directory temporarily set to `dir`.
// `listScripts` reads ./package.json, so the cwd must point at a fixture.
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
  const logs = await captureLog(() =>
    new Command(["--help"], version, helpMessage).run()
  );
  assertEquals(logs, [helpMessage]);
});

Deno.test("Command#run dispatches --version", async () => {
  const logs = await captureLog(() =>
    new Command(["--version"], version, helpMessage).run()
  );
  assertEquals(logs, [version]);
});

Deno.test("Command#run dispatches --init-completion zsh", async () => {
  const logs = await captureLog(() =>
    new Command(["--init-completion", "zsh"], version, helpMessage).run()
  );
  assertEquals(logs.length, 1);
  assertEquals(logs[0].includes("compdef _nps_complete_npm npm"), true);
});

Deno.test("Command#run --init-completion exits for unsupported shell", async () => {
  // exit() in command.ts calls Deno.exit(1); intercept it so the test process
  // survives and we can assert the exit code and message.
  const originalExit = Deno.exit;
  let exitCode: number | undefined;
  Deno.exit = ((code?: number) => {
    exitCode = code;
    throw new Error("exit");
  }) as typeof Deno.exit;

  let logs: string[] = [];
  try {
    logs = await captureLog(async () => {
      try {
        await new Command(["--init-completion", "bash"], version, helpMessage)
          .run();
      } catch (_) {
        // expected: the stubbed Deno.exit throws instead of terminating
      }
    });
  } finally {
    Deno.exit = originalExit;
  }

  assertEquals(exitCode, 1);
  assertEquals(logs, ["nps: unsupported completion shell"]);
});

Deno.test("Command#run --list-scripts prints scripts as TSV", async () => {
  let logs: string[] = [];
  await withCwd(`${fixtureDir}${SEPARATOR}npm`, async () => {
    logs = await captureLog(() =>
      new Command(["--list-scripts"], version, helpMessage).run()
    );
  });

  assertEquals(logs, [
    [
      "test\tmocha",
      "lint\teslint --ext .js,.jsx,.ts,.tsx  ./src",
      "build\ttsc",
    ].join("\n"),
  ]);
});

Deno.test("Command#run --list-scripts stays silent when package.json is missing", async () => {
  // The completion script consumes this output, so a missing package.json must
  // produce no output (and must not throw) rather than leaking an error.
  let logs: string[] = ["sentinel"];
  await withCwd(`${fixtureDir}${SEPARATOR}yarn`, async () => {
    logs = await captureLog(() =>
      new Command(["--list-scripts"], version, helpMessage).run()
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
        new Command(["--list-scripts"], version, helpMessage).run()
      );
    },
  );

  assertEquals(logs, ["test\techo test"]);
});

Deno.test("Command#run --list-scripts stays silent for invalid script commands", async () => {
  let logs: string[] = ["sentinel"];
  await withCwd(`${fixtureDir}${SEPARATOR}invalid_scripts`, async () => {
    logs = await captureLog(() =>
      new Command(["--list-scripts"], version, helpMessage).run()
    );
  });
  assertEquals(logs, []);
});

Deno.test("Command#run --list-scripts stays silent for a non-object scripts field", async () => {
  let logs: string[] = ["sentinel"];
  await withCwd(`${fixtureDir}${SEPARATOR}invalid_scripts_object`, async () => {
    logs = await captureLog(() =>
      new Command(["--list-scripts"], version, helpMessage).run()
    );
  });
  assertEquals(logs, []);
});

Deno.test("Command#run reports invalid scripts before package manager resolution", async () => {
  const originalExit = Deno.exit;
  let exitCode: number | undefined;
  Deno.exit = ((code?: number) => {
    exitCode = code;
    throw new Error("exit");
  }) as typeof Deno.exit;

  let logs: string[] = [];
  try {
    // This fixture has no lockfile: script validation must fail first.
    await withCwd(`${fixtureDir}${SEPARATOR}invalid_scripts`, async () => {
      logs = await captureLog(() =>
        assertRejects(
          () => new Command([], version, helpMessage).run(),
          Error,
          "exit",
        ).then(() => {})
      );
    });
  } finally {
    Deno.exit = originalExit;
  }
  assertEquals(exitCode, 1);
  assertEquals(logs, [`nps: 'scripts["test"]' must be a string`]);
});

import { assertEquals } from "./deps.ts";
import { parseArguments } from "../src/argument_parser.ts";

Deno.test("parseArguments returns defaults for no arguments", () => {
  assertEquals(parseArguments([]), {
    npsArgument: undefined,
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });
});

Deno.test("parseArguments uses the first positional argument as the filter", () => {
  assertEquals(parseArguments(["lint"]), {
    npsArgument: "lint",
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });
});

Deno.test("parseArguments ignores additional positional arguments", () => {
  assertEquals(parseArguments(["lint", "xyz"]), {
    npsArgument: "lint",
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });
});

Deno.test("parseArguments passes literal arguments without a filter", () => {
  assertEquals(parseArguments(["--", "--ext", ".ts", "lib/"]), {
    npsArgument: undefined,
    commandArguments: ["--ext", ".ts", "lib/"],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });
});

Deno.test("parseArguments parses a filter and literal arguments", () => {
  assertEquals(parseArguments(["build", "--", "abc"]), {
    npsArgument: "build",
    commandArguments: ["abc"],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });
});

Deno.test("parseArguments preserves literal flags for the script", () => {
  assertEquals(parseArguments(["test", "--", "-f", "test.spec.ts"]), {
    npsArgument: "test",
    commandArguments: ["-f", "test.spec.ts"],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });
});

Deno.test("parseArguments recognizes the list-scripts option", () => {
  assertEquals(parseArguments(["--list-scripts"]), {
    npsArgument: undefined,
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: true,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });
});

Deno.test("parseArguments parses the completion shell", () => {
  assertEquals(parseArguments(["--init-completion", "zsh"]), {
    npsArgument: undefined,
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: true,
    initCompletionShell: "zsh",
  });
});

Deno.test("parseArguments recognizes -h", () => {
  assertEquals(parseArguments(["-h"]), {
    npsArgument: undefined,
    commandArguments: [],
    hasHelpOption: true,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });
});

Deno.test("parseArguments recognizes --help", () => {
  assertEquals(parseArguments(["--help"]), {
    npsArgument: undefined,
    commandArguments: [],
    hasHelpOption: true,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });
});

Deno.test("parseArguments recognizes -V", () => {
  assertEquals(parseArguments(["-V"]), {
    npsArgument: undefined,
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: true,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });
});

Deno.test("parseArguments recognizes --version", () => {
  assertEquals(parseArguments(["--version"]), {
    npsArgument: undefined,
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: true,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });
});

Deno.test("parseArguments leaves the completion shell undefined without a value", () => {
  assertEquals(parseArguments(["--init-completion"]), {
    npsArgument: undefined,
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: true,
    initCompletionShell: undefined,
  });
});

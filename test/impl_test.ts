import { assertEquals } from "./deps.ts";
import { CliffyArgParser } from "../src/impl.ts";

Deno.test("CliffyArgParser#parse", () => {
  const sut = new CliffyArgParser();

  assertEquals(sut.parse([]), {
    npsArgument: undefined,
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });

  assertEquals(sut.parse(["lint"]), {
    npsArgument: "lint",
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });

  assertEquals(sut.parse(["lint", "xyz"]), {
    npsArgument: "lint",
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });

  assertEquals(sut.parse(["--", "--ext", ".ts", "lib/"]), {
    npsArgument: undefined,
    commandArguments: ["--ext", ".ts", "lib/"],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });

  assertEquals(sut.parse(["build", "--", "abc"]), {
    npsArgument: "build",
    commandArguments: ["abc"],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });

  assertEquals(sut.parse(["test", "--", "-f", "test.spec.ts"]), {
    npsArgument: "test",
    commandArguments: ["-f", "test.spec.ts"],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });

  assertEquals(sut.parse(["--list-scripts"]), {
    npsArgument: undefined,
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: true,
    hasInitCompletionOption: false,
    initCompletionShell: undefined,
  });

  assertEquals(sut.parse(["--init-completion", "zsh"]), {
    npsArgument: undefined,
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
    hasListScriptsOption: false,
    hasInitCompletionOption: true,
    initCompletionShell: "zsh",
  });
});

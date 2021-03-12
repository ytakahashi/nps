import { assertEquals } from "https://deno.land/std@0.89.0/testing/asserts.ts";
import { parseArguments } from "../src/command.ts";

Deno.test("parseArguments", () => {
  assertEquals(parseArguments([]), {
    npsArgument: undefined,
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
  });

  assertEquals(parseArguments(["lint"]), {
    npsArgument: "lint",
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
  });

  assertEquals(parseArguments(["lint", "xyz"]), {
    npsArgument: "lint",
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
  });

  assertEquals(parseArguments(["--", "--ext", ".ts", "lib/"]), {
    npsArgument: undefined,
    commandArguments: ["--ext", ".ts", "lib/"],
    hasHelpOption: false,
    hasVersionOption: false,
  });

  assertEquals(parseArguments(["build", "--", "abc"]), {
    npsArgument: "build",
    commandArguments: ["abc"],
    hasHelpOption: false,
    hasVersionOption: false,
  });

  assertEquals(parseArguments(["test", "--", "-f", "test.spec.ts"]), {
    npsArgument: "test",
    commandArguments: ["-f", "test.spec.ts"],
    hasHelpOption: false,
    hasVersionOption: false,
  });
});

import { assertEquals } from "./deps.ts";
import { CliffyArgParser } from "../src/impl.ts";

Deno.test("CliffyArgParser#parse", () => {
  const sut = new CliffyArgParser();

  assertEquals(sut.parse([]), {
    npsArgument: undefined,
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
  });

  assertEquals(sut.parse(["lint"]), {
    npsArgument: "lint",
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
  });

  assertEquals(sut.parse(["lint", "xyz"]), {
    npsArgument: "lint",
    commandArguments: [],
    hasHelpOption: false,
    hasVersionOption: false,
  });

  assertEquals(sut.parse(["--", "--ext", ".ts", "lib/"]), {
    npsArgument: undefined,
    commandArguments: ["--ext", ".ts", "lib/"],
    hasHelpOption: false,
    hasVersionOption: false,
  });

  assertEquals(sut.parse(["build", "--", "abc"]), {
    npsArgument: "build",
    commandArguments: ["abc"],
    hasHelpOption: false,
    hasVersionOption: false,
  });

  assertEquals(sut.parse(["test", "--", "-f", "test.spec.ts"]), {
    npsArgument: "test",
    commandArguments: ["-f", "test.spec.ts"],
    hasHelpOption: false,
    hasVersionOption: false,
  });
});

import { assertEquals } from "./deps.ts";
import { zshCompletionScript } from "../src/completion.ts";

Deno.test("zsh completion script", () => {
  const actual = zshCompletionScript();

  assertEquals(actual.includes("nps --list-scripts"), true);
  assertEquals(actual.includes('displays+=("$name => $description")'), true);
  assertEquals(actual.includes("_nps_complete_run_command()"), true);
  assertEquals(actual.includes('compadd -S " " -- "$command"'), true);
  assertEquals(
    actual.includes(
      "if _nps_complete_run_command run || _nps_complete_run_command run-script; then",
    ),
    true,
  );
  assertEquals(actual.includes("compdef _nps_complete_npm npm"), true);
  assertEquals(actual.includes("compdef _nps_complete_pnpm pnpm"), true);
  assertEquals(actual.includes("compdef _nps_complete_yarn yarn"), true);
  assertEquals(actual.includes("compdef _nps_complete_bun bun"), true);
});

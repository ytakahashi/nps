import type { NpmScripts, Script, SelectPrompt } from "./npm_scripts.ts";
import { Select } from "./deps.ts";

export class CliffySelectPrompt implements SelectPrompt {
  async select(scripts: NpmScripts): Promise<Script> {
    const options = scripts.getScripts().map((s) => s.optionMessage());
    const selected = await Select.prompt({
      message: "Select a script",
      options: options,
      search: true,
      keys: {
        nextPage: ["pagedown", "right"],
        previousPage: ["pageup", "left"],
      },
    });
    return scripts.getMatchesTo(selected);
  }
}

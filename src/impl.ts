import {
  ArgParser,
  Arguments,
  CommandRunner,
  NpmScripts,
  Script,
  SelectPrompt,
} from "./core.ts";
import { $, parseFlags, Select } from "./deps.ts";

export class CliffyArgParser implements ArgParser {
  parse(args: string[]): Arguments {
    const parsed = parseFlags(args);
    const k = Object.keys(parsed.flags);
    return {
      npsArgument: parsed.unknown[0],
      commandArguments: parsed.literal,
      hasHelpOption: k.includes("h") || k.includes("help"),
      hasVersionOption: k.includes("V") || k.includes("version"),
    };
  }
}

export class CliffySelectPrompt implements SelectPrompt {
  async select(scripts: NpmScripts): Promise<Script> {
    const options = scripts.getScripts().map((s) => s.optionMessage());
    const selected = await Select.prompt({
      message: "Select a script",
      options: options,
      search: true,
    });
    return scripts.getMatchesTo(selected);
  }
}

export class DaxCommandRunner implements CommandRunner {
  async run(cmd: string[]) {
    const cmdStr = cmd.join(" ");
    console.log(cmdStr);
    await $.raw`${cmdStr}`;
  }
}

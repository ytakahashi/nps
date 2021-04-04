import { parseFlags } from "https://deno.land/x/cliffy@v0.18.0/flags/mod.ts";
import { existsSync } from "https://deno.land/std@0.89.0/fs/mod.ts";
import {
  CommandRunner,
  filterScripts,
  readPackageScript,
  runScript,
  SelectPrompt,
  selectScript,
} from "./core.ts";

const packageFile = "package.json";

function exit(message: string) {
  console.log(message);
  Deno.exit(1);
}

type Arguments = {
  npsArgument?: string;
  commandArguments: string[];
  hasHelpOption: boolean;
  hasVersionOption: boolean;
};

export function parseArguments(args: string[]): Arguments {
  const parsed = parseFlags(args);
  const k = Object.keys(parsed.flags);
  return {
    npsArgument: parsed.unknown[0],
    commandArguments: parsed.literal,
    hasHelpOption: k.includes("h") || k.includes("help"),
    hasVersionOption: k.includes("V") || k.includes("version"),
  };
}

export class Command {
  #version: string;
  #helpMessage: string;

  constructor(version: string, helpMessage: string) {
    this.#helpMessage = helpMessage;
    this.#version = version;
  }

  main = async (args: Arguments): Promise<void> => {
    if (!existsSync(packageFile)) {
      exit("nps: package.json not found");
    }

    const packageManager = existsSync("yarn.lock") ? "yarn" : "npm";
    const scripts = readPackageScript(packageFile);
    if (scripts.length === 0) {
      exit("nps: scripts not defined");
    }
    const filtered = filterScripts(scripts, args.npsArgument);
    if (filtered.length === 0) {
      exit(`nps: no script matches "${args.npsArgument}"`);
    }
    const target = await selectScript(filtered, new SelectPrompt());

    await runScript(
      packageManager,
      target,
      args?.commandArguments,
      new CommandRunner(),
    );
  };

  run = async (args: Arguments): Promise<void> => {
    if (args.hasHelpOption) {
      this.showHelp();
    } else if (args.hasVersionOption) {
      this.showVersion();
    } else {
      await this.main(args);
    }
  };

  showHelp = (): void => {
    console.log(this.#helpMessage);
  };

  showVersion = (): void => {
    console.log(this.#version);
  };
}

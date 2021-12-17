import { parseFlags } from "./deps.ts";
import {
  CommandRunner,
  filterScripts,
  readPackageScript,
  resolvePackageManager,
  runScript,
  SelectPrompt,
  selectScript,
} from "./core.ts";

function exit(message: string): never {
  console.log(`nps: ${message}`);
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
    const scripts = await readPackageScript().catch((e) => exit(e.message));
    if (scripts.length === 0) {
      exit("scripts not defined");
    }
    const packageManager = await resolvePackageManager().catch((e) =>
      exit(e.message)
    );
    const filtered = filterScripts(scripts, args.npsArgument);
    if (filtered.length === 0) {
      exit(`no script matches "${args.npsArgument}"`);
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

import { NpmScripts, runScript, selectScript } from "./npm_scripts.ts";
import { readPackageJson } from "./package_json.ts";
import { resolvePackageManager } from "./package_manager.ts";
import { zshCompletionScript } from "./completion.ts";
import { formatScriptsAsTsv } from "./format.ts";
import {
  CliffyArgParser,
  CliffySelectPrompt,
  DaxCommandRunner,
} from "./impl.ts";

export type Arguments = {
  npsArgument?: string;
  commandArguments: string[];
  hasHelpOption: boolean;
  hasVersionOption: boolean;
  hasListScriptsOption: boolean;
  hasInitCompletionOption: boolean;
  initCompletionShell?: string;
};

export interface ArgParser {
  parse(args: string[]): Arguments;
}

function exit(message: string): never {
  console.log(`nps: ${message}`);
  Deno.exit(1);
}

export class Command {
  #args: Arguments;
  #version: string;
  #helpMessage: string;

  constructor(args: string[], version: string, helpMessage: string) {
    this.#args = new CliffyArgParser().parse(args);
    this.#helpMessage = helpMessage;
    this.#version = version;
  }

  main = async (): Promise<void> => {
    const packageJson = await readPackageJson().catch((e) => exit(e.message));
    const scripts = NpmScripts.fromPackageJson(packageJson);
    if (!scripts.hasItems()) {
      exit("scripts not defined");
    }

    const packageManager = await resolvePackageManager(packageJson).catch((e) =>
      exit(e.message)
    );

    const filtered = scripts.filterItems(this.#args.npsArgument);
    if (!filtered.hasItems()) {
      exit(`no script matches "${this.#args.npsArgument}"`);
    }

    const target = await selectScript(filtered, new CliffySelectPrompt());
    await runScript(
      packageManager,
      target,
      this.#args.commandArguments,
      new DaxCommandRunner(),
    );
  };

  listScripts = async (): Promise<void> => {
    // Completion must stay silent on both read and script validation errors.
    const scripts = await readPackageJson()
      .then((packageJson) => NpmScripts.fromPackageJson(packageJson))
      .catch(() => undefined);
    if (scripts === undefined || !scripts.hasItems()) {
      return;
    }

    console.log(formatScriptsAsTsv(scripts));
  };

  initCompletion = (): void => {
    if (this.#args.initCompletionShell !== "zsh") {
      exit("unsupported completion shell");
    }

    console.log(zshCompletionScript());
  };

  run = async (): Promise<void> => {
    if (this.#args.hasHelpOption) {
      this.showHelp();
    } else if (this.#args.hasVersionOption) {
      this.showVersion();
    } else if (this.#args.hasListScriptsOption) {
      await this.listScripts();
    } else if (this.#args.hasInitCompletionOption) {
      this.initCompletion();
    } else {
      await this.main().catch((e) => {
        exit(e.message);
      });
    }
  };

  showHelp = (): void => {
    console.log(this.#helpMessage);
  };

  showVersion = (): void => {
    console.log(this.#version);
  };
}

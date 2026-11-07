import { NpmScripts, runScript, selectScript } from "./npm_scripts.ts";
import { readPackageJson } from "./package_json.ts";
import { resolvePackageManager } from "./package_manager.ts";
import { zshCompletionScript } from "./completion.ts";
import { formatScriptsAsTsv } from "./format.ts";
import type { CommandRunner, SelectPrompt } from "./npm_scripts.ts";

export type Arguments = {
  npsArgument?: string;
  commandArguments: string[];
  hasHelpOption: boolean;
  hasVersionOption: boolean;
  hasListScriptsOption: boolean;
  hasInitCompletionOption: boolean;
  initCompletionShell?: string;
};

export type CommandDependencies = {
  selectPrompt: SelectPrompt;
  commandRunner: CommandRunner;
};

function exit(message: string): never {
  console.log(`nps: ${message}`);
  Deno.exit(1);
}

export class Command {
  #args: Arguments;
  #version: string;
  #helpMessage: string;

  #selectPrompt: SelectPrompt;
  #commandRunner: CommandRunner;

  constructor(
    args: Arguments,
    version: string,
    helpMessage: string,
    deps: CommandDependencies,
  ) {
    this.#args = args;
    this.#selectPrompt = deps.selectPrompt;
    this.#commandRunner = deps.commandRunner;
    this.#helpMessage = helpMessage;
    this.#version = version;
  }

  main = async (): Promise<void> => {
    // Report execution errors once through run().
    const packageJson = await readPackageJson();
    const scripts = NpmScripts.fromPackageJson(packageJson);
    if (!scripts.hasItems()) {
      throw new Error("scripts not defined");
    }

    const packageManager = await resolvePackageManager(packageJson);

    const filtered = scripts.filterItems(this.#args.npsArgument);
    if (!filtered.hasItems()) {
      throw new Error(`no script matches "${this.#args.npsArgument}"`);
    }

    const target = await selectScript(filtered, this.#selectPrompt);
    await runScript(
      packageManager,
      target,
      this.#args.commandArguments,
      this.#commandRunner,
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

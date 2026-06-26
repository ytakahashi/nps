import {
  Arguments,
  readPackageJson,
  resolvePackageManager,
  runScript,
  selectScript,
} from "./core.ts";
import { zshCompletionScript } from "./completion.ts";
import { formatScriptsAsTsv } from "./format.ts";
import {
  CliffyArgParser,
  CliffySelectPrompt,
  DaxCommandRunner,
} from "./impl.ts";

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
    let { packageManager, scripts } = await readPackageJson().catch((e) =>
      exit(e.message)
    );
    if (!scripts.hasItems()) {
      exit("scripts not defined");
    }

    if (packageManager == null) {
      packageManager = await resolvePackageManager().catch((e) =>
        exit(e.message)
      );
    }

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
    const result = await readPackageJson().catch(() => undefined);
    if (result === undefined || !result.scripts.hasItems()) {
      return;
    }

    console.log(formatScriptsAsTsv(result.scripts));
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

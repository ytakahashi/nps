import {
  Arguments,
  readPackageScript,
  resolvePackageManager,
  runScript,
  selectScript,
} from "./core.ts";
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
    const scripts = await readPackageScript().catch((e) => exit(e.message));
    if (!scripts.hasItems()) {
      exit("scripts not defined");
    }

    const packageManager = await resolvePackageManager().catch((e) =>
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

  run = async (): Promise<void> => {
    if (this.#args.hasHelpOption) {
      this.showHelp();
    } else if (this.#args.hasVersionOption) {
      this.showVersion();
    } else {
      await this.main();
    }
  };

  showHelp = (): void => {
    console.log(this.#helpMessage);
  };

  showVersion = (): void => {
    console.log(this.#version);
  };
}

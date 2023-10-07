export type Arguments = {
  npsArgument?: string;
  commandArguments: string[];
  hasHelpOption: boolean;
  hasVersionOption: boolean;
};

type Scripts = {
  [key: string]: string;
};

export interface SelectPrompt {
  select(scripts: NpmScripts): Promise<Script>;
}

export interface CommandRunner {
  run(cmd: string[]): Promise<void>;
}

export interface ArgParser {
  parse(args: string[]): Arguments;
}

export class Script {
  stage: string;
  command: string;
  constructor(stage: string, command: string) {
    this.stage = stage;
    this.command = command;
  }
  optionMessage = (): string => `${this.stage} (${this.command})`;
}

export class NpmScripts {
  #scripts: Script[];

  constructor(scripts: Script[]) {
    this.#scripts = scripts;
  }

  getScripts = (): Script[] => this.#scripts;

  hasItems = (): boolean => this.#scripts.length !== 0;

  filterItems = (value?: string): NpmScripts => {
    const filtered = value === undefined
      ? this.#scripts
      : this.#scripts.filter((s) => s.stage.includes(value));
    return new NpmScripts(filtered);
  };

  shouldPrompt = (): boolean => this.#scripts.length === 1;

  getMatchesTo = (optionMessage: string): Script => {
    const matched = this.#scripts.find((script) =>
      script.optionMessage() === optionMessage
    );
    if (matched === undefined) {
      throw new Error(`Unexpected: ${optionMessage}`);
    }
    return matched;
  };
}

export async function readPackageJson(
  packageFile = `package.json`,
) {
  const json = await Deno.readTextFile(packageFile)
    .catch((_) => {
      throw new Error(`failed to read '${packageFile}'`);
    })
    .then((data) => JSON.parse(data));

  const packageManager = json.packageManager
    ? json.packageManager.split("@")[0] as string
    : null;
  const scripts = Object.entries(json.scripts as Scripts)
    .map((script) => new Script(script[0], script[1]));

  return {
    packageManager,
    scripts: new NpmScripts(scripts),
  };
}

export async function resolvePackageManager(
  dir = "",
): Promise<string> {
  const exists = (path: string) =>
    Deno.lstat(path).then((f) => f.isFile).catch((_) => false);
  const [npm, yarn, pnpm] = await Promise.all([
    exists(`${dir}package-lock.json`),
    exists(`${dir}yarn.lock`),
    exists(`${dir}pnpm-lock.yaml`),
  ]);
  if (npm) {
    return "npm";
  } else if (yarn) {
    return "yarn";
  } else if (pnpm) {
    return "pnpm";
  } else {
    throw new Error(
      "'package-lock.json' or 'yarn.lock' or 'pnpm-lock.yaml' not found",
    );
  }
}

export async function selectScript(
  scripts: NpmScripts,
  prompt: SelectPrompt,
): Promise<Script> {
  if (scripts.shouldPrompt()) {
    return scripts.getScripts()[0];
  }

  return await prompt.select(scripts);
}

export async function runScript(
  packageManager: string,
  script: Script,
  args: string[],
  commandRunner: CommandRunner,
) {
  const cmd = [packageManager, "run", script.stage];
  if (args.length > 0) {
    cmd.push(...args);
  }
  await commandRunner.run(cmd);
}

import { $, Select } from "./deps.ts";

type Scripts = {
  [key: string]: string;
};

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

export async function readPackageScript(
  packageFile = `package.json`,
): Promise<NpmScripts> {
  return await Deno.readTextFile(packageFile)
    .catch((_) => {
      throw new Error(`failed to read '${packageFile}'`);
    })
    .then((data) => JSON.parse(data).scripts as Scripts)
    .then((scripts) =>
      Object.entries(scripts).map((entry) => new Script(entry[0], entry[1]))
    )
    .then((scripts) => new NpmScripts(scripts));
}

export async function resolvePackageManager(
  dir = "",
): Promise<string> {
  const exists = (path: string) =>
    Deno.lstat(path).then((f) => f.isFile).catch((_) => false);
  const [npm, yarn] = await Promise.all([
    exists(`${dir}package-lock.json`),
    exists(`${dir}yarn.lock`),
  ]);
  if (npm) {
    return "npm";
  } else if (yarn) {
    return "yarn";
  } else {
    throw new Error("'package-lock.json' or 'yarn.lock' not found");
  }
}

export class SelectPrompt {
  select(scripts: NpmScripts): Promise<Script> {
    const options = scripts.getScripts().map((s) => s.optionMessage());
    return Select.prompt({
      message: "Select a script",
      options: options,
      search: true,
    }).then((result) => scripts.getMatchesTo(result));
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

export class CommandRunner {
  async run(cmd: string[]) {
    const cmdStr = cmd.join(" ");
    console.log(cmdStr);
    await $.raw`${cmdStr}`;
  }
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

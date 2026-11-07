import type { PackageJson } from "./package_json.ts";
import { isObject } from "./validation.ts";

export interface SelectPrompt {
  select(scripts: NpmScripts): Promise<Script>;
}

export interface CommandRunner {
  run(cmd: string[]): Promise<void>;
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

  static fromPackageJson(packageJson: PackageJson): NpmScripts {
    if (packageJson.scripts === undefined) {
      return new NpmScripts([]);
    }
    if (!isObject(packageJson.scripts)) {
      throw new Error("'scripts' must be an object");
    }

    // Reject invalid entries rather than silently dropping declared scripts.
    const scripts = Object.entries(packageJson.scripts).map(
      ([stage, command]) => {
        if (typeof command !== "string") {
          throw new Error(
            `'scripts[${JSON.stringify(stage)}]' must be a string`,
          );
        }
        return new Script(stage, command);
      },
    );
    return new NpmScripts(scripts);
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
    const matched = this.#scripts.find(
      (script) => script.optionMessage() === optionMessage,
    );
    if (matched === undefined) {
      throw new Error(`Unexpected: ${optionMessage}`);
    }
    return matched;
  };
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

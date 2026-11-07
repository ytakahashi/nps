export type Arguments = {
  npsArgument?: string;
  commandArguments: string[];
  hasHelpOption: boolean;
  hasVersionOption: boolean;
  hasListScriptsOption: boolean;
  hasInitCompletionOption: boolean;
  initCompletionShell?: string;
};

type Scripts = {
  [key: string]: string;
};

const supportedPackageManagers = ["bun", "npm", "yarn", "pnpm"] as const;

export type PackageManager = typeof supportedPackageManagers[number];

export type PackageJson = {
  scripts?: unknown;
  devEngines?: unknown;
  packageManager?: unknown;
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
    const matched = this.#scripts.find(
      (script) => script.optionMessage() === optionMessage,
    );
    if (matched === undefined) {
      throw new Error(`Unexpected: ${optionMessage}`);
    }
    return matched;
  };
}

export async function readPackageJson(
  packageFile = `package.json`,
): Promise<{ packageJson: PackageJson; scripts: NpmScripts }> {
  const json: unknown = await Deno.readTextFile(packageFile)
    .catch((_) => {
      throw new Error(`failed to read '${packageFile}'`);
    })
    .then((data) => JSON.parse(data));

  if (!isObject(json)) {
    throw new Error(`expected an object in '${packageFile}'`);
  }
  const scripts = Object.entries((json.scripts ?? {}) as Scripts).map(
    (script) => new Script(script[0], script[1]),
  );

  return {
    packageJson: json,
    scripts: new NpmScripts(scripts),
  };
}

export async function resolvePackageManager(
  packageJson: PackageJson,
  dir = ".",
): Promise<PackageManager> {
  const declared = getDeclaredPackageManager(packageJson);
  if (declared !== undefined) {
    return declared;
  }

  return await findPackageManagerByLockfile(dir);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSupportedPackageManager(value: string): value is PackageManager {
  return (supportedPackageManagers as readonly string[]).includes(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`'${field}' must be a string`);
  }
  return value;
}

// Names are matched exactly because it is passed to the shell as the command to run.
function requireSupportedPackageManager(
  name: string,
  field: string,
): PackageManager {
  if (!isSupportedPackageManager(name)) {
    throw new Error(
      `'${field}' must be one of ${
        supportedPackageManagers.join(", ")
      }, but got ${JSON.stringify(name)}`,
    );
  }
  return name;
}

// Resolution falls through to the next source only when nothing is declared.
// A declaration that is present but malformed or unsupported is an error.
function getDeclaredPackageManager(
  packageJson: PackageJson,
): PackageManager | undefined {
  if (packageJson.devEngines !== undefined) {
    if (!isObject(packageJson.devEngines)) {
      throw new Error("'devEngines' must be an object");
    }
    const declared = getDevEnginesPackageManager(
      packageJson.devEngines.packageManager,
    );
    if (declared !== undefined) {
      return declared;
    }
  }

  if (packageJson.packageManager !== undefined) {
    // Corepack format: `<name>@<version>[+<hash>]`.
    const declaration = requireString(
      packageJson.packageManager,
      "packageManager",
    );
    return requireSupportedPackageManager(
      declaration.split("@")[0],
      "packageManager",
    );
  }
  return undefined;
}

// `devEngines.packageManager` accepts either a single declaration or an array.
// For an array, the first entry is used.
function getDevEnginesPackageManager(
  declaration: unknown,
): PackageManager | undefined {
  if (declaration === undefined) {
    return undefined;
  }
  if (Array.isArray(declaration)) {
    const names = declaration.map((entry, i) =>
      requireDevEnginesPackageManagerName(
        entry,
        `devEngines.packageManager[${i}]`,
        "an object",
      )
    );
    if (names.length === 0) {
      return undefined;
    }
    return requireSupportedPackageManager(
      names[0],
      "devEngines.packageManager[0].name",
    );
  }
  return requireSupportedPackageManager(
    requireDevEnginesPackageManagerName(
      declaration,
      "devEngines.packageManager",
      "an object or an array of objects",
    ),
    "devEngines.packageManager.name",
  );
}

function requireDevEnginesPackageManagerName(
  declaration: unknown,
  field: string,
  expected: string,
): string {
  if (!isObject(declaration)) {
    throw new Error(`'${field}' must be ${expected}`);
  }
  return requireString(declaration.name, `${field}.name`);
}

async function findPackageManagerByLockfile(
  dir: string,
): Promise<PackageManager> {
  const exists = (path: string) =>
    Deno.lstat(path)
      .then((f) => f.isFile)
      .catch((_) => false);
  const [bunLock, bunLockb, npm, yarn, pnpm] = await Promise.all([
    exists(`${dir}/bun.lock`),
    exists(`${dir}/bun.lockb`),
    exists(`${dir}/package-lock.json`),
    exists(`${dir}/yarn.lock`),
    exists(`${dir}/pnpm-lock.yaml`),
  ]);
  if (bunLock || bunLockb) {
    return "bun";
  } else if (npm) {
    return "npm";
  } else if (yarn) {
    return "yarn";
  } else if (pnpm) {
    return "pnpm";
  } else {
    throw new Error(
      "'bun.lock', 'bun.lockb', 'package-lock.json', 'yarn.lock', or 'pnpm-lock.yaml' not found",
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

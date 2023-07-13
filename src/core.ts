import { Select } from "./deps.ts";

type Scripts = {
  [key: string]: string;
};

type Script = {
  stage: string;
  command: string;
};

export async function readPackageScript(
  packageFile = `package.json`,
): Promise<Script[]> {
  return await Deno.readTextFile(packageFile)
    .catch((_) => {
      throw new Error(`failed to read '${packageFile}'`);
    })
    .then((data) => JSON.parse(data).scripts as Scripts)
    .then((scripts) =>
      Object.entries(scripts)
        .map((entry) => ({
          stage: entry[0],
          command: entry[1],
        }))
    );
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

export function filterScripts(scripts: Script[], value?: string): Script[] {
  return value === undefined
    ? scripts
    : scripts.filter((s) => s.stage.includes(value));
}

export class SelectPrompt {
  run(options: {
    name: string;
    value: string;
  }[]): Promise<string> {
    return Select.prompt({
      message: "Select a script",
      options: options,
      search: true,
    });
  }
}

export async function selectScript(
  scripts: Script[],
  prompt: SelectPrompt,
): Promise<string> {
  if (scripts.length === 1) {
    return scripts[0].stage;
  }

  const options = scripts.map((s) => ({
    name: `${s.stage} (${s.command})`,
    value: s.stage,
  }));
  return await prompt.run(options);
}

export class CommandRunner {
  async run(cmd: string[]) {
    console.log(cmd.join(" "));
    const p = Deno.run({ cmd: cmd });
    await p.status();
  }
}

export async function runScript(
  packageManager: string,
  stage: string,
  args: string[],
  commandRunner: CommandRunner,
) {
  const cmd = [packageManager, "run", stage];
  if (args.length > 0) {
    cmd.push(...args);
  }
  await commandRunner.run(cmd);
}

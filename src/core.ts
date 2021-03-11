import { Select } from "https://deno.land/x/cliffy@v0.18.0/prompt/mod.ts";

type Scripts = {
  [key: string]: string;
};

type Script = {
  stage: string;
  command: string;
};

export function readPackageScript(packageFile: string): Script[] {
  const packageJson = Deno.readTextFileSync(packageFile);
  const scripts: Scripts = JSON.parse(packageJson).scripts;
  return Object.entries(scripts)
    .map((entry) => ({
      stage: entry[0],
      command: entry[1],
    }));
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

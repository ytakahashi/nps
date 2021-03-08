import { existsSync } from "https://deno.land/std@0.89.0/fs/mod.ts";
import { Command } from "https://deno.land/x/cliffy@v0.18.0/command/mod.ts";
import {
  Select,
  SelectValueOptions,
} from "https://deno.land/x/cliffy@v0.18.0/prompt/mod.ts";

const packageFile = "package.json";

type Scripts = {
  [key: string]: string;
};

async function getTarget(): Promise<string> {
  const packageJson = Deno.readTextFileSync(packageFile);
  const scripts: Scripts = JSON.parse(packageJson).scripts;

  const options: SelectValueOptions = [];
  for (const key in scripts) {
    const name = `${key} (${scripts[key]})`;
    options.push({
      name: name,
      value: key,
    });
  }
  return await Select.prompt({
    message: "Select a script",
    options: options,
    search: true,
  });
}

async function main() {
  if (!existsSync(packageFile)) {
    console.log("nps: package.json not found");
    Deno.exit(1);
  }

  const packageManager = existsSync("yarn.lock") ? "yarn" : "npm";
  const target = await getTarget();
  console.log(`${packageManager} run ${target}`);
  const p = Deno.run({
    cmd: [packageManager, "run", target],
  });

  await p.status();
}

await new Command()
  .name("nps")
  .version("0.1.0")
  .description("Interactive npm-scripts runner for Node.js projects.")
  .action(main)
  .parse(Deno.args);

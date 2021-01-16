import { existsSync } from "https://deno.land/std@0.82.0/fs/mod.ts";
import {
  Select,
  SelectValueOptions,
} from "https://deno.land/x/cliffy@v0.17.0/prompt/mod.ts";

const packageFile = "package.json";

type PackageManager = "npm" | "yarn";

type Scripts = {
  [key: string]: string;
};

function determinePackageManager(): PackageManager | undefined {
  if (existsSync("package-lock.json")) {
    return "npm";
  }
  if (existsSync("yarn.lock")) {
    return "yarn";
  }
  return undefined;
}

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
    console.log("package.json not found");
    Deno.exit(1);
  }

  const packageManager = determinePackageManager();
  if (packageManager === undefined) {
    console.log("lock file not found");
    Deno.exit(1);
  }

  const target = await getTarget();
  console.log(`${packageManager} run ${target}`);
  const p = Deno.run({
    cmd: [packageManager, "run", target],
  });

  await p.status();
}

await main();

import { existsSync } from "https://deno.land/std@0.89.0/fs/mod.ts";
import { Command } from "https://deno.land/x/cliffy@v0.18.0/command/mod.ts";
import {
  filterScripts,
  readPackageScript,
  SelectPrompt,
  selectScript,
} from "./src/core.ts";

const packageFile = "package.json";

async function main(_: unknown, script?: string) {
  if (!existsSync(packageFile)) {
    console.log("nps: package.json not found");
    Deno.exit(1);
  }

  const packageManager = existsSync("yarn.lock") ? "yarn" : "npm";
  const scripts = readPackageScript(packageFile);
  const filtered = filterScripts(scripts, script);
  const target = await selectScript(filtered, new SelectPrompt());

  console.log(`${packageManager} run ${target}`);
  const p = Deno.run({
    cmd: [packageManager, "run", target],
  });

  await p.status();
}

await new Command()
  .name("nps")
  .version("0.2.0")
  .description("Interactive npm-scripts runner for Node.js projects.")
  .arguments("[script]")
  .action(main)
  .parse(Deno.args);

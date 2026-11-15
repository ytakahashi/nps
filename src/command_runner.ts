import type { CommandRunner } from "./npm_scripts.ts";
import { $ } from "./deps.ts";

export class DaxCommandRunner implements CommandRunner {
  async run(cmd: string[]) {
    const cmdStr = cmd.join(" ");
    console.log(cmdStr);
    try {
      await $.raw`${cmdStr}`;
    } catch (_e) {
      throw Error(`'${cmdStr}' failed.`);
    }
  }
}

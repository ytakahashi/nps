import type { Arguments } from "./command.ts";
import { parseFlags } from "./deps.ts";

export function parseArguments(args: string[]): Arguments {
  const parsed = parseFlags(args);
  const k = Object.keys(parsed.flags);
  const initCompletion = parsed.flags.initCompletion;
  return {
    npsArgument: parsed.unknown[0],
    commandArguments: parsed.literal,
    hasHelpOption: k.includes("h") || k.includes("help"),
    hasVersionOption: k.includes("V") || k.includes("version"),
    hasListScriptsOption: k.includes("listScripts"),
    hasInitCompletionOption: k.includes("initCompletion"),
    initCompletionShell: typeof initCompletion === "string"
      ? initCompletion
      : undefined,
  };
}

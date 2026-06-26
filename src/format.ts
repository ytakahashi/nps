import { NpmScripts, Script } from "./core.ts";

function sanitizeTsvField(value: string): string {
  return value.replaceAll("\t", " ").replaceAll("\n", " ");
}

function formatScriptAsTsv(script: Script): string {
  return `${sanitizeTsvField(script.stage)}\t${
    sanitizeTsvField(script.command)
  }`;
}

export function formatScriptsAsTsv(scripts: NpmScripts): string {
  return scripts.getScripts().map(formatScriptAsTsv).join("\n");
}

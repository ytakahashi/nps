import type {
  CommandRunner,
  NpmScripts,
  Script,
  SelectPrompt,
} from "../src/npm_scripts.ts";

export class MockedSelectPrompt implements SelectPrompt {
  called = 0;
  calledWith: NpmScripts | undefined;
  #selectedStage: string | undefined;

  constructor(selectedStage?: string) {
    this.#selectedStage = selectedStage;
  }

  select = (scripts: NpmScripts): Promise<Script> => {
    this.called++;
    this.calledWith = scripts;
    const selected = this.#selectedStage === undefined
      ? scripts.getScripts()[0]
      : scripts.getScripts().find((script) =>
        script.stage === this.#selectedStage
      );
    // A configured selection must match a candidate instead of falling back.
    if (selected === undefined) {
      return Promise.reject(
        new Error("No matching script in prompt candidates"),
      );
    }
    return Promise.resolve(selected);
  };
}

export class MockedCommandRunner implements CommandRunner {
  called = 0;
  calledWith: string[] = [];

  run = (cmd: string[]): Promise<void> => {
    this.called++;
    this.calledWith = [...cmd];
    return Promise.resolve();
  };
}

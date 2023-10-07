<!-- deno-fmt-ignore-file -->

# nps

[![deno land](https://img.shields.io/badge/deno.land/x/nps-lightgrey.svg?logo=deno&labelColor=black)](https://deno.land/x/nps)
[![tag](https://img.shields.io/github/tag/ytakahashi/nps.svg)](https://github.com/ytakahashi/nps)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Actions Status](https://github.com/ytakahashi/nps/workflows/Deno/badge.svg)](https://github.com/ytakahashi/nps/actions/workflows/deno.yml)

Interactive npm-scripts runner for Node.js projects.

![image](./image/nps.gif)

## Install

```terminal
deno install --allow-read --allow-run --allow-write --allow-env --allow-net=deno.land https://deno.land/x/nps/nps.ts
```

## Update

```terminal
deno install -r -f --allow-read --allow-run --allow-write --allow-env --allow-net=deno.land https://deno.land/x/nps/nps.ts
```

## Usage

Run following command in Node.js project.

```terminal
nps
```

If `package-lock.json` or `yarn.lock` or `pnpm-lock.yaml` exists in the directory, the appropriate command (`npm` or `yarn` or `pnpm`) will be executed to run the selected script.

### Filter npm-scripts

If an argument is provided, scripts are filtered by the value and prompt shows filtered items.  
If given value matches only one script, the command is run immediately.

### Pass arguments to command

Arguments after double dash (`--`) are treated as script command option like [npm run](https://docs.npmjs.com/cli/v7/commands/npm-run-script).  
All the arguments after the `--` are passed directly to selected script.

import { Command } from "./src/command.ts";

const version = "0.11.0";

const helpMessage = `nps ${version}
Interactive npm-scripts runner for Node.js projects.

To run:
  nps

To filter scripts:
  nps <script_name>

To pass arguments to selected command:
  nps -- <arguments>

OPTIONS:
  -h, --help       Prints help information
  -V, --version    Prints version information

ARGUMENTS:
  Arbitrary arguments can be passed to this command and/or command defined in package.json.
  If an argument is provided, npm-scrips are filtered by the word.
  If arguments are provided after double dash ("--"), those arguments are passed to npm script command.

EXAMPLES:
  # filters npm-scrips which contains the word "test"
  # and pass "-f test/myTest.spec.ts" to npm script command.
  $ nps test -- -f test/myTest.spec.ts
`;

await new Command(Deno.args, version, helpMessage).run();

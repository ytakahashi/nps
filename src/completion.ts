/**
 * Generates the zsh script printed by `nps --init-completion zsh`.
 *
 * - Instead of registering a brand-new completion, each package manager's
 *   existing completion is wrapped: we only intercept the script-name
 *   position of `<pm> run <script>` and delegate every other case back to the
 *   original completion. This keeps the package managers' own completions
 *   (options, subcommands, etc.) intact rather than replacing them.
 * - The original completion is captured into `_nps_previous_<pm>_completion`
 *   before we override it with `compdef`. The guard around each capture makes
 *   the script idempotent: re-sourcing it (e.g. reloading `.zshrc`) must not
 *   overwrite the saved original with our own wrapper, which would otherwise
 *   create an infinite delegation loop.
 * - Script names are fetched at completion time via `nps --list-scripts`, so
 *   completion always reflects the current directory's package.json.
 */
export function zshCompletionScript(): string {
  return [
    "# nps zsh completion",
    // Ensure `compdef` is available; only bootstrap compinit when it is not.
    "autoload -Uz compinit",
    "if ! whence -w compdef >/dev/null; then",
    "  compinit",
    "fi",
    "",
    // Capture each package manager's current completion so the wrappers below
    // can fall back to it. The `!= _nps_complete_*` guard prevents a re-source
    // from saving our own wrapper as the "previous" completion.
    'if [[ "${_comps[npm]}" != "_nps_complete_npm" ]]; then',
    '  typeset -g _nps_previous_npm_completion="${_comps[npm]}"',
    "fi",
    'if [[ "${_comps[pnpm]}" != "_nps_complete_pnpm" ]]; then',
    '  typeset -g _nps_previous_pnpm_completion="${_comps[pnpm]}"',
    "fi",
    'if [[ "${_comps[yarn]}" != "_nps_complete_yarn" ]]; then',
    '  typeset -g _nps_previous_yarn_completion="${_comps[yarn]}"',
    "fi",
    'if [[ "${_comps[bun]}" != "_nps_complete_bun" ]]; then',
    '  typeset -g _nps_previous_bun_completion="${_comps[bun]}"',
    "fi",
    "",
    // Read tab-separated `<name>\t<description>` lines from `nps --list-scripts`.
    // `compadd -d` uses display strings as the visible list entries, so each
    // display must include the script name even though only the name is inserted.
    "_nps_complete_package_scripts() {",
    "  emulate -L zsh",
    "  local -a candidates displays",
    "  local name description",
    "",
    "  while IFS=$'\\t' read -r name description; do",
    '    [[ -n "$name" ]] || continue',
    '    candidates+=("$name")',
    '    displays+=("$name => $description")',
    "  done < <(nps --list-scripts 2>/dev/null)",
    "",
    "  if (( ${#candidates[@]} )); then",
    '    compadd -d displays -- "${candidates[@]}"',
    "  fi",
    "}",
    "",
    // Delegate to the captured original completion. Fall back to `_default`
    // (filename completion) when there was none, or to guard against ever
    // recursing into our own wrapper.
    "_nps_call_previous_completion() {",
    "  emulate -L zsh",
    '  local previous="$1"',
    "",
    '  if [[ -n "$previous" && "$previous" != _nps_complete_* ]]; then',
    '    "$previous"',
    "  else",
    "    _default",
    "  fi",
    "}",
    "",
    // Only complete script names at the `<pm> run <script>` position
    // (CURRENT == 3); anything else is handed back to the original completion.
    "_nps_complete_npm() {",
    "  emulate -L zsh",
    "",
    '  if [[ "${words[2]}" == "run" || "${words[2]}" == "run-script" ]] && (( CURRENT == 3 )); then',
    "    _nps_complete_package_scripts",
    "    return",
    "  fi",
    "",
    '  _nps_call_previous_completion "$_nps_previous_npm_completion"',
    "}",
    "",
    "_nps_complete_pnpm() {",
    "  emulate -L zsh",
    "",
    '  if [[ "${words[2]}" == "run" ]] && (( CURRENT == 3 )); then',
    "    _nps_complete_package_scripts",
    "    return",
    "  fi",
    "",
    '  _nps_call_previous_completion "$_nps_previous_pnpm_completion"',
    "}",
    "",
    "_nps_complete_yarn() {",
    "  emulate -L zsh",
    "",
    '  if [[ "${words[2]}" == "run" ]] && (( CURRENT == 3 )); then',
    "    _nps_complete_package_scripts",
    "    return",
    "  fi",
    "",
    '  _nps_call_previous_completion "$_nps_previous_yarn_completion"',
    "}",
    "",
    "_nps_complete_bun() {",
    "  emulate -L zsh",
    "",
    '  if [[ "${words[2]}" == "run" ]] && (( CURRENT == 3 )); then',
    "    _nps_complete_package_scripts",
    "    return",
    "  fi",
    "",
    '  _nps_call_previous_completion "$_nps_previous_bun_completion"',
    "}",
    "",
    // Install the wrappers as the completion for each package manager.
    "compdef _nps_complete_npm npm",
    "compdef _nps_complete_pnpm pnpm",
    "compdef _nps_complete_yarn yarn",
    "compdef _nps_complete_bun bun",
  ].join("\n");
}

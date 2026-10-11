import { usageError } from "./output";

export type FlagSpec = Record<string, "boolean" | "string">;

export type Parsed = {
  positionals: string[];
  flags: Record<string, string | boolean>;
};

/**
 * Parses argv against the flags a command accepts. `--json` is always
 * accepted. Unknown flags are usage errors that name the flag.
 */
export function parseArgs(argv: string[], spec: FlagSpec, help: string): Parsed {
  const known: FlagSpec = { json: "boolean", ...spec };
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const eq = arg.indexOf("=");
    const name = arg.slice(2, eq === -1 ? undefined : eq);
    const kind = known[name];
    if (!kind) throw usageError(`unknown flag --${name}`, help);
    if (kind === "boolean") {
      if (eq !== -1) throw usageError(`--${name} does not take a value`, help);
      flags[name] = true;
    } else if (eq !== -1) {
      flags[name] = arg.slice(eq + 1);
    } else {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw usageError(`--${name} needs a value`, help);
      }
      flags[name] = value;
      i++;
    }
  }
  return { positionals, flags };
}

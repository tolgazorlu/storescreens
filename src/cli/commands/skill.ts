import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { parseArgs } from "../args";
import { CliError, print, printJson, usageError } from "../output";

declare const __SCREENY_SKILL__: string;

const HELP = "screeny skill to print the agent skill, screeny skill install to install it";
const INSTALL_HELP =
  "screeny skill install [--dir <dir>] [--force], default dir ~/.claude/skills/screeny";

/** Prints skills/screeny/SKILL.md, embedded in the bundle at build time. */
export async function skill(argv: string[]) {
  if (argv[0] === "install") return install(argv.slice(1));
  const { positionals, flags } = parseArgs(argv, {}, HELP);
  if (positionals.length) {
    throw usageError(`unexpected argument ${positionals[0]}`, HELP);
  }
  if (flags.json) {
    printJson({ skill: __SCREENY_SKILL__ });
    return;
  }
  print(__SCREENY_SKILL__);
}

/**
 * Writes the embedded skill to <dir>/SKILL.md. An identical file is left as is;
 * a file with other content is only replaced with --force.
 */
async function install(argv: string[]) {
  const { positionals, flags } = parseArgs(
    argv,
    { dir: "string", force: "boolean" },
    INSTALL_HELP,
  );
  if (positionals.length) {
    throw usageError(`unexpected argument ${positionals[0]}`, INSTALL_HELP);
  }
  const dir =
    typeof flags.dir === "string"
      ? path.resolve(flags.dir)
      : path.join(homedir(), ".claude", "skills", "screeny");
  const file = path.join(dir, "SKILL.md");
  const current = existsSync(file) ? readFileSync(file, "utf8") : null;
  let status: "installed" | "unchanged" | "overwritten";
  if (current === __SCREENY_SKILL__) {
    status = "unchanged";
  } else if (current !== null && !flags.force) {
    throw new CliError(
      `${file} has different content and was left untouched`,
      "screeny skill install --force to overwrite it",
    );
  } else {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, __SCREENY_SKILL__);
    status = current === null ? "installed" : "overwritten";
  }
  if (flags.json) {
    printJson({ path: file, status });
    return;
  }
  print(
    status === "unchanged"
      ? `skill: already installed at ${file}`
      : `skill: ${status} ${file}`,
  );
}

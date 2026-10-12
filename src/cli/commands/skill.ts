import { parseArgs } from "../args";
import { print, printJson, usageError } from "../output";

declare const __SCREENY_SKILL__: string;

const HELP = "screeny skill to print the agent skill";

/** Prints skills/screeny/SKILL.md, embedded in the bundle at build time. */
export async function skill(argv: string[]) {
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

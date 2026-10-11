import { parseArgs } from "../args";
import { print, printJson } from "../output";
import { loadService } from "../service";

const HELP = "screeny new <name> to create a project";

export async function projects(argv: string[]) {
  const { flags } = parseArgs(argv, {}, HELP);
  const service = await loadService();
  const list = (await service.listProjectSummaries()).map((s) => ({
    slug: s.project.slug,
    name: s.project.name,
    screens: s.screenCount,
  }));
  if (flags.json) {
    printJson(list);
    return;
  }
  if (!list.length) {
    print(`projects: no projects yet\nhelp: ${HELP}`);
    return;
  }
  const lines = [`projects[${list.length}]:`];
  for (const p of list) {
    lines.push(`  ${p.slug}  screens: ${p.screens}  name: ${p.name}`);
  }
  print(lines.join("\n"));
}

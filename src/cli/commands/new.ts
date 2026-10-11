import { parseArgs } from "../args";
import { print, printJson, usageError } from "../output";
import { loadService } from "../service";

const HELP = "screeny new <name>, e.g. screeny new 'Demo App'";

/** Creates a project. If the name's slug already exists, reports it and exits 0. */
export async function newProject(argv: string[]) {
  const { positionals, flags } = parseArgs(argv, {}, HELP);
  const name = positionals.join(" ").trim();
  if (!name) throw usageError("missing project name", HELP);
  const service = await loadService();
  const slug = service.slugify(name);
  const existing = (await service.listProjects()).find((p) => p.slug === slug);
  const project = existing ?? (await service.createProject(name));
  if (flags.json) {
    printJson({ ...project, created: !existing });
    return;
  }
  print(
    [
      existing
        ? `project: ${slug} already exists`
        : `project: created ${project.slug}`,
      `name: ${project.name}`,
      `help: screeny generate ${project.slug} --spec <file.json> to add screens`,
    ].join("\n"),
  );
}

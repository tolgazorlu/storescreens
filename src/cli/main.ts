import { parseArgs } from "./args";
import { CliError, print, printError, printJson, usageError } from "./output";
import { newProject } from "./commands/new";
import { projects } from "./commands/projects";
import { loadService } from "./service";

declare const __SCREENY_VERSION__: string;

const DESCRIPTION =
  "Create App Store and Google Play screenshot sets from the terminal";
const HOME_HELP = "run screeny with no arguments to see projects and commands";

async function home(argv: string[]) {
  const { flags } = parseArgs(argv, {}, HOME_HELP);
  const service = await loadService();
  const projects = (await service.listProjectSummaries()).map((s) => ({
    slug: s.project.slug,
    name: s.project.name,
    screens: s.screenCount,
  }));
  const help = projects.length
    ? [
        "screeny render <project> --out <dir> to write PNGs",
        "screeny generate <project> --spec <file.json> to add screens",
        "screeny new <name> to create another project",
      ]
    : [
        "screeny new <name> to create a project",
        "screeny generate <project> --spec <file.json> to add screens",
      ];
  if (flags.json) {
    printJson({ bin: "screeny", description: DESCRIPTION, projects, help });
    return;
  }
  const lines = ["bin: screeny", `description: ${DESCRIPTION}`];
  if (projects.length) {
    lines.push(`projects[${projects.length}]:`);
    for (const p of projects) lines.push(`  ${p.slug}  screens: ${p.screens}`);
  } else {
    lines.push("projects: no projects yet");
  }
  for (const h of help) lines.push(`help: ${h}`);
  print(lines.join("\n"));
}

async function run(argv: string[]) {
  const [command] = argv;
  if (command === "--version" || command === "-v" || command === "version") {
    print(__SCREENY_VERSION__);
    return;
  }
  if (command === undefined || command.startsWith("--")) return home(argv);
  if (command === "projects") return projects(argv.slice(1));
  if (command === "new") return newProject(argv.slice(1));
  throw usageError(`unknown command ${command}`, HOME_HELP);
}

const argv = process.argv.slice(2);
try {
  await run(argv);
} catch (err) {
  const json = argv.includes("--json");
  if (err instanceof CliError) {
    printError(err, json);
    process.exitCode = err.code;
  } else {
    const message = err instanceof Error ? err.message : String(err);
    printError(new CliError(message, HOME_HELP), json);
    process.exitCode = 1;
  }
}

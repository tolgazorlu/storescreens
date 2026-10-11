import { loadService } from "./service";

declare const __SCREENY_VERSION__: string;

const args = process.argv.slice(2);

if (args[0] === "--version" || args[0] === "-v" || args[0] === "version") {
  process.stdout.write(`${__SCREENY_VERSION__}\n`);
} else {
  const service = await loadService();
  const projects = await service.listProjectSummaries();
  process.stdout.write(`bin: screeny\nprojects: ${projects.length}\n`);
}

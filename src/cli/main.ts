declare const __SCREENY_VERSION__: string;

const args = process.argv.slice(2);

if (args[0] === "--version" || args[0] === "-v" || args[0] === "version") {
  process.stdout.write(`${__SCREENY_VERSION__}\n`);
} else {
  process.stdout.write("bin: screeny\n");
}

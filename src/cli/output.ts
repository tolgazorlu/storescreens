/** A failure reported to the user as `error:` + `help:` with a fixed exit code. */
export class CliError extends Error {
  constructor(
    message: string,
    readonly help: string,
    readonly code: 1 | 2 = 1,
  ) {
    super(message);
  }
}

/** Usage errors (unknown command, unknown flag, missing argument) exit 2. */
export function usageError(message: string, help: string) {
  return new CliError(message, help, 2);
}

export function print(text: string) {
  process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
}

export function printJson(value: unknown) {
  print(JSON.stringify(value, null, 2));
}

export function printError(err: CliError, json: boolean) {
  if (json) printJson({ error: err.message, help: err.help });
  else print(`error: ${err.message}\nhelp: ${err.help}`);
}

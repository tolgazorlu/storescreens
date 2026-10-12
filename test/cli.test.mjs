// End-to-end tests for the built CLI (dist-cli/screeny.js). Every run gets a temp
// SCREENY_DATA_DIR and a temp cwd, and stdin is closed so a prompt would fail fast.
import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "..");
const BIN = path.join(ROOT, "dist-cli", "screeny.js");
const temps = [];

function tempDir(prefix) {
  const dir = mkdtempSync(path.join(tmpdir(), `screeny-${prefix}-`));
  temps.push(dir);
  return dir;
}

after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** A sandbox: its own data dir and cwd. `run` spawns the CLI with stdin closed. */
function sandbox() {
  const dataDir = tempDir("data");
  const cwd = tempDir("cwd");
  const env = { ...process.env, SCREENY_DATA_DIR: dataDir };
  const run = (...args) => {
    const r = spawnSync(process.execPath, [BIN, ...args], {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      timeout: 60_000,
    });
    assert.equal(r.error, undefined, `screeny ${args.join(" ")} did not finish`);
    return { code: r.status, stdout: r.stdout, stderr: r.stderr };
  };
  const json = (...args) => {
    const r = run(...args, "--json");
    return { ...r, body: JSON.parse(r.stdout) };
  };
  return { dataDir, cwd, env, run, json };
}

const SPEC = {
  device: "iphone-6.9",
  locale: "en",
  screens: [
    { template: "text-only", title: "Hello from the CLI", subtitle: "Şğüçöı İ" },
    { template: "title-top", title: "Second screen" },
  ],
};

describe("home and version", () => {
  test("home view with no projects", () => {
    const { run } = sandbox();
    const r = run();
    assert.equal(r.code, 0);
    assert.match(r.stdout, /^bin: screeny$/m);
    assert.match(r.stdout, /^projects: no projects yet$/m);
    assert.match(r.stdout, /^help: screeny new <name>/m);
  });

  test("home view lists projects, also as json", () => {
    const { run, json } = sandbox();
    assert.equal(run("new", "Demo App").code, 0);
    assert.match(run().stdout, /^ {2}demo-app {2}screens: 0$/m);
    const { code, body } = json();
    assert.equal(code, 0);
    assert.equal(body.bin, "screeny");
    assert.deepEqual(body.projects, [{ slug: "demo-app", name: "Demo App", screens: 0 }]);
  });

  test("--version, -v and version print the package version", () => {
    const { run } = sandbox();
    const { version } = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
    for (const flag of ["--version", "-v", "version"]) {
      const r = run(flag);
      assert.equal(r.code, 0);
      assert.equal(r.stdout.trim(), version);
    }
  });
});

describe("usage errors", () => {
  test("unknown command exits 2 with error and help", () => {
    const r = sandbox().run("bogus");
    assert.equal(r.code, 2);
    assert.match(r.stdout, /^error: unknown command bogus$/m);
    assert.match(r.stdout, /^help: /m);
  });

  test("unknown flag exits 2", () => {
    const r = sandbox().run("projects", "--nope");
    assert.equal(r.code, 2);
    assert.match(r.stdout, /^error: /m);
  });

  test("missing argument exits 2, json error shape", () => {
    const { code, body } = sandbox().json("new");
    assert.equal(code, 2);
    assert.equal(typeof body.error, "string");
    assert.equal(typeof body.help, "string");
  });

  test("missing project is a runtime error, exit 1", () => {
    const { code, body } = sandbox().json("render", "nope", "--out", "out");
    assert.equal(code, 1);
    assert.match(body.error, /nope/);
  });

  test("invalid spec exits 2", () => {
    const { cwd, run, json } = sandbox();
    run("new", "demo");
    writeFileSync(path.join(cwd, "bad.json"), JSON.stringify({ device: "x", screens: [] }));
    assert.equal(json("generate", "demo", "--spec", "bad.json").code, 2);
    writeFileSync(path.join(cwd, "broken.json"), "{not json");
    assert.equal(json("generate", "demo", "--spec", "broken.json").code, 2);
  });
});

describe("projects", () => {
  test("new is idempotent", () => {
    const { json } = sandbox();
    const first = json("new", "demo");
    assert.equal(first.code, 0);
    assert.equal(first.body.created, true);
    const second = json("new", "demo");
    assert.equal(second.code, 0);
    assert.equal(second.body.created, false);
    assert.deepEqual(json("projects").body, [{ slug: "demo", name: "demo", screens: 0 }]);
  });
});

describe("generate, render, export", () => {
  test("generate + render write PNGs, export writes an App Store zip", () => {
    const { cwd, run, json } = sandbox();
    assert.equal(run("new", "demo").code, 0);
    writeFileSync(path.join(cwd, "spec.json"), JSON.stringify(SPEC));
    const gen = json("generate", "demo", "--spec", "./spec.json");
    assert.equal(gen.code, 0, gen.stdout);
    assert.equal(gen.body.created, 2);

    const ren = json("render", "demo", "--out", "./out");
    assert.equal(ren.code, 0, ren.stdout);
    assert.equal(ren.body.rendered, 2);
    for (const f of ren.body.files) {
      assert.ok(f.file.endsWith(path.join("out", "en", path.basename(f.file))), f.file);
      assert.equal(readFileSync(f.file).subarray(0, 4).toString("hex"), "89504e47");
    }

    const exp = json("export", "demo", "--apple", "--out", "./out");
    assert.equal(exp.code, 0, exp.stdout);
    assert.ok(exp.body.file.endsWith("demo-appstore.zip"));
    assert.equal(readFileSync(exp.body.file).subarray(0, 2).toString(), "PK");
  });

  test("export without --apple is a usage error", () => {
    const { run } = sandbox();
    run("new", "demo");
    assert.equal(run("export", "demo", "--out", "out").code, 2);
  });
});

describe("no prompts", () => {
  test("every non-mcp command terminates with stdin closed", () => {
    const { cwd, run } = sandbox();
    writeFileSync(path.join(cwd, "spec.json"), JSON.stringify(SPEC));
    const commands = [
      [],
      ["projects"],
      ["new", "demo"],
      ["add-image", "demo", "missing.png"],
      ["generate", "demo", "--spec", "spec.json"],
      ["render", "demo", "--out", "out"],
      ["export", "demo", "--apple", "--out", "out"],
      ["--version"],
    ];
    for (const args of commands) {
      const r = run(...args);
      assert.ok(r.code === 0 || r.code === 1 || r.code === 2, `${args.join(" ")}: ${r.code}`);
    }
  });
});

describe("data dir isolation", () => {
  test("runs write only into SCREENY_DATA_DIR", () => {
    const { dataDir, cwd, run } = sandbox();
    run("new", "demo");
    assert.ok(existsSync(dataDir));
    assert.ok(!existsSync(path.join(cwd, "data")));
  });
});

/** Talks to `screeny mcp` over stdio, one awaited request at a time. */
function mcpClient(env, cwd) {
  const child = spawn(process.execPath, [BIN, "mcp"], { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
  const lines = [];
  let buffer = "";
  let stderr = "";
  const waiters = new Map();
  child.stderr.on("data", (d) => (stderr += d));
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      if (!line.trim()) continue;
      lines.push(line);
      const msg = JSON.parse(line);
      waiters.get(msg.id)?.(msg);
    }
  });
  let nextId = 1;
  const request = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => reject(new Error(`mcp ${method} timed out`)), 30_000);
      waiters.set(id, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  const notify = (method) => child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method }) + "\n");
  const close = () =>
    new Promise((resolve) => {
      child.on("close", (code) => resolve({ code, lines, stderr }));
      child.stdin.end();
    });
  return { request, notify, close };
}

describe("mcp stdio", () => {
  test("initialize, tools/list, tools/call with clean stdout", async () => {
    const { env, cwd, dataDir } = sandbox();
    const mcp = mcpClient(env, cwd);
    const init = await mcp.request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    });
    assert.equal(init.result.serverInfo.name, "screeny");
    mcp.notify("notifications/initialized");

    const list = await mcp.request("tools/list");
    const names = list.result.tools.map((t) => t.name);
    assert.ok(names.includes("list_projects"));
    assert.ok(names.includes("create_project"));

    const created = await mcp.request("tools/call", {
      name: "create_project",
      arguments: { name: "MCP Demo" },
    });
    assert.notEqual(created.result.isError, true);
    const listed = await mcp.request("tools/call", { name: "list_projects", arguments: {} });
    assert.match(JSON.stringify(listed.result), /MCP Demo/);

    const { code, lines } = await mcp.close();
    assert.equal(code, 0);
    for (const line of lines) assert.equal(JSON.parse(line).jsonrpc, "2.0");
    assert.ok(existsSync(dataDir));
  });
});

describe("skill", () => {
  test("skill prints the SKILL.md embedded at build time", () => {
    const { run } = sandbox();
    const expected = readFileSync(path.join(ROOT, "skills", "screeny", "SKILL.md"), "utf8");
    const r = run("skill");
    assert.equal(r.code, 0);
    assert.equal(r.stdout, expected);
  });

  test("skill works from a bundle copy with no skills dir next to it", () => {
    const expected = readFileSync(path.join(ROOT, "skills", "screeny", "SKILL.md"), "utf8");
    const dir = tempDir("bundle");
    copyFileSync(BIN, path.join(dir, "screeny.js"));
    writeFileSync(path.join(dir, "package.json"), '{ "type": "module" }\n');
    symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"));
    const r = spawnSync(process.execPath, [path.join(dir, "screeny.js"), "skill"], {
      cwd: tempDir("cwd"),
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, expected);
  });

  test("skill install writes SKILL.md idempotently and respects local edits", () => {
    const { run, json } = sandbox();
    const expected = readFileSync(path.join(ROOT, "skills", "screeny", "SKILL.md"), "utf8");
    const dir = path.join(tempDir("skills"), "screeny");
    const file = path.join(dir, "SKILL.md");

    const first = json("skill", "install", "--dir", dir);
    assert.equal(first.code, 0);
    assert.deepEqual(first.body, { path: file, status: "installed" });
    assert.equal(readFileSync(file, "utf8"), expected);

    const second = run("skill", "install", "--dir", dir);
    assert.equal(second.code, 0);
    assert.match(second.stdout, /already installed/);
    assert.equal(readFileSync(file, "utf8"), expected);

    writeFileSync(file, "local edit\n");
    const kept = run("skill", "install", "--dir", dir);
    assert.equal(kept.code, 1);
    assert.match(kept.stdout, /error: .*left untouched/);
    assert.match(kept.stdout, /help: .*--force/);
    assert.equal(readFileSync(file, "utf8"), "local edit\n");

    const forced = json("skill", "install", "--dir", dir, "--force");
    assert.equal(forced.code, 0);
    assert.equal(forced.body.status, "overwritten");
    assert.equal(readFileSync(file, "utf8"), expected);
  });
});

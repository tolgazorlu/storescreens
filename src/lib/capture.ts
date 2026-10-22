import "server-only";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { addAsset, BadRequest, getProject } from "@/lib/service";

/**
 * Capture in-app screenshots from a booted iOS simulator, optionally replaying
 * an argent flow (https://github.com/software-mansion/argent) before each shot,
 * and upload them as project assets. Status bar pinning and the locale launch
 * arguments follow goldie (software-mansion-labs/goldie, MIT).
 */
const run = promisify(execFile);

export type CaptureShot = {
  /** Asset name stem; the file is saved as `<name>-<locale>.png` (or `<name>.png` without a locale). */
  name: string;
  /** Absolute path of an argent flow YAML replayed after the app launches. */
  flow?: string;
};

export type CaptureInput = {
  bundleId: string;
  /** Simulator UDID, or "booted". */
  udid?: string;
  /** Launches the app in this language, e.g. "tr" or "en-US". */
  locale?: string;
  shots: CaptureShot[];
  /** Wait after launch and after a flow before the screenshot. */
  settleMs?: number;
};

const BUNDLE_ID = /^[A-Za-z0-9.-]+$/;
const UDID = /^(booted|[A-F0-9-]{36})$/i;
const LOCALE = /^[a-zA-Z]{2,3}([-_][a-zA-Z0-9]{2,4})?$/;
const NAME = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,60}$/;

async function bootedUdid(): Promise<string> {
  const { stdout } = await run("xcrun", ["simctl", "list", "devices", "booted", "-j"]);
  const list = Object.values(JSON.parse(stdout).devices as Record<string, { udid: string }[]>).flat();
  if (!list.length) throw new BadRequest("No booted iOS simulator");
  return list[0].udid;
}

async function argent(args: string[], what = `argent ${args[1]}`) {
  try {
    await run("npx", ["-y", "@swmansion/argent@0.30.1", ...args], { timeout: 180_000, maxBuffer: 10 << 20 });
  } catch (e) {
    const out = (e as { stdout?: string }).stdout || (e as Error).message;
    throw new BadRequest(`${what} failed: ${out.slice(-1500)}`);
  }
}

/** 9:41, full battery and signal, like goldie's pinStatusBar. */
async function pinStatusBar(udid: string) {
  await run("xcrun", [
    "simctl", "status_bar", udid, "override",
    "--time", "9:41", "--batteryState", "charged", "--batteryLevel", "100",
    "--wifiMode", "active", "--wifiBars", "3",
    "--cellularMode", "active", "--cellularBars", "4", "--dataNetwork", "5g",
  ]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function captureScreens(projectId: string, input: CaptureInput) {
  const p = await getProject(projectId);
  const udid = input.udid ?? "booted";
  if (!BUNDLE_ID.test(input.bundleId)) throw new BadRequest("bundleId is invalid");
  if (!UDID.test(udid)) throw new BadRequest("udid must be a simulator UDID or 'booted'");
  if (input.locale && !LOCALE.test(input.locale)) throw new BadRequest("locale must look like tr or en-US");
  for (const s of input.shots) {
    if (!NAME.test(s.name)) throw new BadRequest(`shot name ${s.name} is invalid`);
    if (s.flow && (!path.isAbsolute(s.flow) || !/\.ya?ml$/.test(s.flow) || !existsSync(s.flow)))
      throw new BadRequest(`flow ${s.flow} must be an existing absolute .yaml path`);
  }
  const settle = input.settleMs ?? 1500;

  await pinStatusBar(udid);

  // shortcut: the locale is passed as launch arguments, which localizes the app but not system
  // UI (permission sheets, keyboard); pin the simulator's global prefs like goldie if that matters.
  const localeArgs = input.locale
    ? ["-AppleLanguages", `(${input.locale})`, "-AppleLocale", input.locale.replace("-", "_")]
    : [];
  const realUdid = udid === "booted" ? await bootedUdid() : udid;
  const dir = await mkdtemp(path.join(tmpdir(), "storescreens-capture-"));
  const results: { name: string; assetId: string; url: string; width: number | null; height: number | null }[] = [];
  try {
    for (const shot of input.shots) {
      if (shot.flow) {
        // argent must launch the app itself to inject its devtools, or flow selectors see no UI tree.
        await argent(["run", "restart-app", "--args",
          JSON.stringify({ udid: realUdid, bundleId: input.bundleId, launchArgs: localeArgs })]);
      } else {
        await run("xcrun", [
          "simctl", "launch", "--terminate-running-process", udid, input.bundleId, ...localeArgs,
        ]);
      }
      await sleep(settle);
      if (shot.flow) {
        // Flows must be fragments (no `launch` step), or argent relaunches without the locale.
        await argent(["e2e", "run", shot.flow, "--device", realUdid], `flow ${path.basename(shot.flow)}`);
        // argent clears the status bar override when a flow ends.
        await pinStatusBar(udid);
        await sleep(settle);
      }
      const file = path.join(dir, `${shot.name}.png`);
      // A cold launch can still be blank after the settle wait: shoot until two frames match.
      let prev: Buffer | null = null;
      let data: Buffer = Buffer.alloc(0);
      for (let i = 0; i < 20; i++) {
        await run("xcrun", ["simctl", "io", udid, "screenshot", "--type=png", file]);
        data = await readFile(file);
        if (prev?.equals(data)) break;
        prev = data;
        await sleep(750);
      }
      const name = input.locale ? `${shot.name}-${input.locale}.png` : `${shot.name}.png`;
      const a = await addAsset(p.id, {
        name,
        data,
        contentType: "image/png",
        kind: "screenshot",
      });
      results.push({ name, assetId: a.id, url: a.url, width: a.width, height: a.height });
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
    await run("xcrun", ["simctl", "status_bar", udid, "clear"]).catch(() => {});
  }
  return results;
}

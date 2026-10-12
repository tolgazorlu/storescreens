import { describe, expect, it } from "vitest";
import { rejectUnlessLocal } from "@/lib/guard";

const h = (o: Record<string, string>) => new Headers(o);

describe("rejectUnlessLocal", () => {
  it("answers the app and local tools", () => {
    expect(rejectUnlessLocal(h({ host: "localhost:4110" }))).toBeNull();
    expect(rejectUnlessLocal(h({ host: "127.0.0.1:4110", origin: "http://127.0.0.1:4110" }))).toBeNull();
  });
  it("refuses DNS rebinding and other origins", () => {
    expect(rejectUnlessLocal(h({ host: "evil.example" }))).toMatch(/localhost/);
    expect(rejectUnlessLocal(h({ host: "localhost:4110", origin: "http://evil.example" }))).toMatch(/cross-origin/);
    expect(rejectUnlessLocal(h({ host: "localhost:4110", origin: "garbage" }))).toMatch(/cross-origin/);
  });
});


import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
// Usage: B=http://localhost:4110 node scripts/mcp-smoke.mjs
// Runs entirely against its own "Smoke Test" project (created on demand),
// never against a real project: picking "the first project" here once
// clobbered a production screen set via generate_screens(replace:true).
const B = process.env.B ?? "http://localhost:4110";
const transport = new StreamableHTTPClientTransport(new URL(B + "/api/mcp"));
const client = new Client({ name: "test", version: "0" });
await client.connect(transport);
const tools = await client.listTools();
console.log("tools:", tools.tools.map(t => t.name).join(", "));
const t = (r) => JSON.parse(r.content[0].text);

const SLUG = "smoke-test";
let projects = t(await client.callTool({ name: "list_projects", arguments: {} }));
let p = projects.find((x) => x.slug === SLUG);
if (!p) {
  p = t(await client.callTool({ name: "create_project", arguments: { name: "Smoke Test" } }));
}
let proj = t(await client.callTool({ name: "get_project", arguments: { project: p.slug } }));

// 1x1 PNG, used as both the fake screenshot and logo.
const PIXEL =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
let shots = proj.assets.filter((a) => a.kind === "screenshot");
let logo = proj.assets.find((a) => a.kind === "logo");
if (shots.length < 2) {
  for (let i = shots.length; i < 2; i++) {
    const a = t(await client.callTool({ name: "upload_asset", arguments: {
      project: p.slug, name: `shot${i}.png`, kind: "screenshot", base64: PIXEL,
    }}));
    shots.push(a);
  }
}
if (!logo) {
  logo = t(await client.callTool({ name: "upload_asset", arguments: {
    project: p.slug, name: "logo.png", kind: "logo", base64: PIXEL,
  }}));
}

const gen = t(await client.callTool({ name: "generate_screens", arguments: {
  project: p.slug, locale: "tr", device: "iphone-6.9", logo: logo.id, replace: true,
  background: { type: "solid", color: "#2E3DF2" },
  screens: [
    { template: "hero", title: "Fiyat listeleriniz, tek bir QR kod", subtitle: "Her listeyi tek, düzenli bir yerde toplayın.", screenshot: shots[0].id },
    { template: "title-top", title: "Fotoğraf, fiyat ve kategoriler", screenshot: shots[1].id },
    { template: "caption-bottom", title: "Müşterilerinize anında ulaşın", subtitle: "Menünüzü güncelleyin, QR aynı kalsın.", screenshot: shots[0].id },
  ],
}}));
console.log("generated:", gen.created.length, gen.editor);
const upd = t(await client.callTool({ name: "update_screen_text", arguments: { screen: gen.created[1].id, index: 0, text: "Fotoğraf, fiyat\nve kategoriler" } }));
console.log("update:", upd);
const zip = t(await client.callTool({ name: "export_zip", arguments: { project: p.slug, locale: "tr" } }));
console.log("zip:", zip);

const derive = t(await client.callTool({ name: "derive_screens", arguments: {
  project: p.slug, from: { device: "iphone-6.9" }, to: "ipad", locales: ["tr"],
}}));
console.log("derive ipad:", derive.created.length);
const deriveDuo = t(await client.callTool({ name: "derive_screens", arguments: {
  project: p.slug, from: { device: "iphone-6.9" }, to: "duo-outer", locales: ["tr"],
}}));
console.log("derive duo-outer:", deriveDuo.created.length);
const apple = t(await client.callTool({ name: "export_apple_zip", arguments: { project: p.slug } }));
console.log("apple zip:", apple);

await client.close();

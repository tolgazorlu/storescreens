
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
// Usage: B=http://localhost:3000 node scripts/mcp-smoke.mjs (needs a project with 2 screenshots + logo)
const B = process.env.B ?? "http://localhost:3000";
const transport = new StreamableHTTPClientTransport(new URL(B + "/api/mcp"));
const client = new Client({ name: "test", version: "0" });
await client.connect(transport);
const tools = await client.listTools();
console.log("tools:", tools.tools.map(t => t.name).join(", "));
const t = (r) => JSON.parse(r.content[0].text);
const projects = t(await client.callTool({ name: "list_projects", arguments: {} }));
const p = projects[0];
const proj = t(await client.callTool({ name: "get_project", arguments: { project: p.slug } }));
const shots = proj.assets.filter(a => a.kind === "screenshot");
const logo = proj.assets.find(a => a.kind === "logo");
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
await client.close();

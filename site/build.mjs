// Copies the static site into dist/ and injects the Microsoft Clarity tag when CLARITY_ID is set
// (it is set in the Vercel project; a fork or a local build gets no analytics).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const id = process.env.CLARITY_ID ?? "";
if (id && !/^[a-z0-9]+$/i.test(id)) throw new Error("CLARITY_ID must be alphanumeric");
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
cpSync("img", "dist/img", { recursive: true });
cpSync("style.css", "dist/style.css");
const tag = id ? `<script async src="https://www.clarity.ms/tag/${id}"></script>` : "";
writeFileSync("dist/index.html", readFileSync("index.html", "utf8").replace("<!--CLARITY-->", tag));
console.log(`built dist/ (clarity: ${id ? "on" : "off"})`);

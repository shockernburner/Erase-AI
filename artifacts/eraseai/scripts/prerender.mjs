// After `vite build`: write a static HTML file for every public page, with
// that page's own title, description, canonical URL, social tags and full
// text, then the sitemap. Without this every URL served the same index.html,
// whose canonical pointed at the home page, so search engines treated content
// pages as duplicates of "/" and crawlers that don't run JavaScript saw an
// empty page.
//
// Output: dist/public/index.html (home) and dist/public/<path>/index.html.

import { build } from "vite";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "dist/public");
const ssrDir = path.join(root, "dist/prerender");

process.env.PORT ||= "5173";
process.env.BASE_PATH ||= "/";

await build({
  configFile: path.join(root, "vite.config.ts"),
  logLevel: "warn",
  ssr: { noExternal: true },
  build: {
    ssr: path.join(root, "src/seo/prerender-entry.tsx"),
    outDir: ssrDir,
    emptyOutDir: true,
    rollupOptions: { output: { format: "esm", entryFileNames: "entry.mjs" } },
  },
});

const { allPages, canonicalUrl, renderBody, SITE_LD } = await import(pathToFileURL(path.join(ssrDir, "entry.mjs")).href);
const template = await readFile(path.join(publicDir, "index.html"), "utf8");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function setTag(html, pattern, tag) {
  if (!pattern.test(html)) throw new Error(`index.html is missing ${pattern}`);
  return html.replace(pattern, tag);
}

function pageHtml(page) {
  const url = canonicalUrl(page.path);
  const title = esc(page.title);
  const description = esc(page.description);
  let html = template;
  html = setTag(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = setTag(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`);
  html = setTag(html, /<meta name="keywords" content="[^"]*" \/>/, page.keywords ? `<meta name="keywords" content="${esc(page.keywords)}" />` : "");
  html = setTag(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`);
  html = setTag(html, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${description}" />`);
  html = setTag(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);
  html = setTag(html, /<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="${page.ogType ?? "website"}" />`);
  html = setTag(html, /<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${title}" />`);
  html = setTag(html, /<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${description}" />`);
  html = setTag(html, /<link rel="canonical" href="[^"]*" \/>/, page.noindex ? `<meta name="robots" content="noindex" />` : `<link rel="canonical" href="${url}" />`);
  html = setTag(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${JSON.stringify(SITE_LD).replace(/</g, "\\u003c")}</script>`,
  );
  html = setTag(html, /<div id="root"><\/div>/, `<div id="root">${renderBody(page.path)}</div>`);
  return html;
}

const pages = allPages();
for (const page of pages) {
  const file = page.path === "/" ? path.join(publicDir, "index.html") : path.join(publicDir, page.path.slice(1), "index.html");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, pageHtml(page));
}

const indexable = pages.filter((p) => !p.noindex);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable
  .map(
    (p) => `  <url>
    <loc>${canonicalUrl(p.path)}</loc>
    <lastmod>${p.updated}</lastmod>
    <priority>${(p.priority ?? 0.5).toFixed(1)}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;
await writeFile(path.join(publicDir, "sitemap.xml"), sitemap);

// A plain-text map of the site for AI assistants and answer engines (llmstxt.org).
const llms = `# EraseAI

> EraseAI is an AI firewall and AI data loss prevention (AI DLP) tool. It checks messages and files before they are sent to ChatGPT, Claude, Gemini and other AI, and stops API keys, passwords, payment card numbers and personal data. Free Chrome extension; Android app; API for developers; plans for teams, families and enterprises. Made by Vantward Solutions Pte. Ltd., Singapore.

## Product
- [Home](${canonicalUrl("/")}): what EraseAI does, plans and pricing
- [AI firewall](${canonicalUrl("/ai-firewall")}): how the check at the Send button works
- [Chrome extension](https://chromewebstore.google.com/detail/eraseai-firewall/hckhbadbpkihjpooeljdocgidelcampp): free, checks every message on your device
- [Android app](https://play.google.com/store/apps/details?id=com.eraseai.firewall): protection in AI apps on your phone

## Guides
${pages
  .filter((p) => p.path.startsWith("/learn/"))
  .map((p) => `- [${p.title.replace(/ \| EraseAI$/, "")}](${canonicalUrl(p.path)}): ${p.description}`)
  .join("\n")}

## Contact
- [Contact](${canonicalUrl("/contact")}): director@vantward.com
`;
await writeFile(path.join(publicDir, "llms.txt"), llms);

await rm(ssrDir, { recursive: true, force: true });
console.log(`[prerender] wrote ${pages.length} pages, sitemap.xml (${indexable.length} URLs) and llms.txt`);

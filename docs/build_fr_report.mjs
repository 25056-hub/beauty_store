import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const requireFromFrontend = createRequire(path.join(root, "frontend", "package.json"));
const { chromium } = requireFromFrontend("playwright");
const mdPath = path.join(root, "docs", "rapport_beauty_store_fr.md");
const htmlPath = path.join(root, "docs", "rapport_beauty_store_fr_print.html");
const pdfPath = path.join(root, "docs", "rapport_beauty_store_fr.pdf");

const markdown = fs.readFileSync(mdPath, "utf8").replace(/^\uFEFF/, "");

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMarkdown(value) {
  return escapeHtml(value).replace(/`([^`]+)`/g, "<code>$1</code>");
}

const lines = markdown.split(/\r?\n/);
const toc = lines
  .map((line) => line.match(/^##\s+(.+)/)?.[1])
  .filter(Boolean);

const blocks = [];
let inList = false;

function closeList() {
  if (inList) {
    blocks.push("</ul>");
    inList = false;
  }
}

for (const rawLine of lines) {
  const line = rawLine.trimEnd();

  if (!line.trim()) {
    closeList();
    continue;
  }

  let match = line.match(/^#\s+(.+)/);
  if (match) {
    closeList();
    blocks.push(`<h1>${inlineMarkdown(match[1])}</h1>`);
    continue;
  }

  match = line.match(/^##\s+(.+)/);
  if (match) {
    closeList();
    blocks.push(`<h2>${inlineMarkdown(match[1])}</h2>`);
    continue;
  }

  match = line.match(/^###\s+(.+)/);
  if (match) {
    closeList();
    blocks.push(`<h3>${inlineMarkdown(match[1])}</h3>`);
    continue;
  }

  match = line.match(/^!\[(.*?)\]\((.*?)\)/);
  if (match) {
    closeList();
    blocks.push(
      `<figure><img src="${escapeHtml(match[2])}" alt="${escapeHtml(match[1])}"><figcaption>${inlineMarkdown(match[1])}</figcaption></figure>`,
    );
    continue;
  }

  match = line.match(/^-\s+(.+)/);
  if (match) {
    if (!inList) {
      blocks.push("<ul>");
      inList = true;
    }
    blocks.push(`<li>${inlineMarkdown(match[1])}</li>`);
    continue;
  }

  closeList();
  blocks.push(`<p>${inlineMarkdown(line.trim())}</p>`);
}

closeList();

const tocHtml = toc
  .map(
    (title, index) =>
      `<li><span>${String(index + 1).padStart(2, "0")}</span>${inlineMarkdown(title)}</li>`,
  )
  .join("\n");

const contentHtml = blocks.join("\n");

const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rapport du Projet - Beauty Store</title>
  <style>
    @page {
      size: A4;
      margin: 17mm 16mm 18mm;
    }

    :root {
      --ink: #211b1d;
      --muted: #6f6265;
      --soft: #f8e4e4;
      --line: #ead0d0;
      --accent: #bd6f78;
      --accent-dark: #93535d;
      --cream: #fffaf7;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: white;
      color: var(--ink);
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 11.9pt;
      line-height: 1.6;
    }

    .cover {
      display: grid;
      height: 269mm;
      align-content: center;
      border: 1px solid var(--line);
      background:
        radial-gradient(circle at 84% 8%, #f2bcc5 0, transparent 25%),
        radial-gradient(circle at 8% 94%, #f8dddd 0, transparent 28%),
        linear-gradient(135deg, #fff 0%, #fff8f5 54%, #f9dddd 100%);
      padding: 20mm;
      page-break-after: always;
      text-align: center;
    }

    .logo {
      width: 115px;
      margin: 0 auto 18px;
    }

    .kicker {
      color: var(--accent-dark);
      font-size: 9pt;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .cover h1 {
      margin: 14px 0 0;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 39pt;
      font-weight: 500;
      line-height: 1;
    }

    .subtitle {
      max-width: 560px;
      margin: 18px auto 0;
      color: var(--muted);
      font-size: 12.5pt;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 34px;
      text-align: left;
    }

    .team-box {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      max-width: 620px;
      margin: 14px auto 0;
      text-align: left;
    }

    .card {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(255, 250, 247, 0.78);
      padding: 10px 12px;
    }

    .card span {
      display: block;
      color: var(--muted);
      font-size: 8.2pt;
      font-weight: 800;
      text-transform: uppercase;
    }

    .card strong {
      display: block;
      margin-top: 5px;
      font-size: 11.2pt;
    }

    .toc {
      padding-top: 4mm;
      page-break-after: always;
    }

    .toc h1,
    .content h1,
    .content h2 {
      font-family: Georgia, "Times New Roman", serif;
      font-weight: 500;
    }

    .toc h1 {
      margin: 0 0 16px;
      font-size: 27pt;
    }

    .toc ol {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 18px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .toc li {
      border-bottom: 1px dotted var(--line);
      padding: 4px 0 6px;
      color: var(--muted);
      font-weight: 700;
    }

    .toc li span {
      display: inline-grid;
      width: 24px;
      height: 24px;
      margin-right: 7px;
      place-items: center;
      border-radius: 50%;
      background: var(--soft);
      color: var(--accent-dark);
      font-size: 8pt;
    }

    .content {
      orphans: 3;
      widows: 3;
    }

    .content h1,
    .content h2,
    .content h3 {
      color: var(--ink);
      line-height: 1.18;
      page-break-after: avoid;
    }

    .content h1 {
      margin: 0 0 18px;
      font-size: 29pt;
    }

    .content h2 {
      margin: 20px 0 10px;
      padding-top: 4mm;
      border-top: 1px solid var(--line);
      color: var(--accent-dark);
      font-size: 21pt;
    }

    .content h3 {
      margin: 12px 0 6px;
      font-size: 12.6pt;
    }

    figure {
      margin: 12px 0 16px;
      page-break-inside: avoid;
    }

    figure img {
      display: block;
      width: 100%;
      max-height: 128mm;
      object-fit: contain;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--cream);
    }

    figcaption {
      margin-top: 6px;
      color: var(--muted);
      font-size: 9pt;
      font-weight: 700;
      text-align: center;
    }

    p {
      margin: 6px 0;
    }

    ul {
      margin: 6px 0 9px 21px;
      padding: 0;
    }

    li {
      margin: 2px 0;
    }

    code {
      border: 1px solid var(--line);
      border-radius: 4px;
      background: #fff;
      padding: 1px 5px;
      color: var(--accent-dark);
      font-family: Consolas, "Courier New", monospace;
      font-size: 9pt;
    }

    .footer-note {
      margin-top: 18px;
      border-top: 1px solid var(--line);
      padding-top: 8px;
      color: var(--muted);
      font-size: 9pt;
      text-align: center;
    }
  </style>
</head>
<body>
  <section class="cover">
    <img class="logo" src="../frontend/public/logo.png" alt="Beauty Store">
    <div class="kicker">Rapport de projet</div>
    <h1>Beauty Store</h1>
    <p class="subtitle">Application web e-commerce pour la vente de produits de beauté, avec interface client, panier, commandes, paiement Bankily B-pay et tableau de bord administrateur.</p>
    <div class="meta-grid">
      <div class="card"><span>Type</span><strong>Projet e-commerce</strong></div>
      <div class="card"><span>Frontend</span><strong>React + Vite</strong></div>
      <div class="card"><span>Backend</span><strong>FastAPI + MySQL</strong></div>
    </div>
    <div class="team-box">
      <div class="card"><span>Matricules</span><strong>25053, 25056, 25058, 25082, 25093</strong></div>
      <div class="card"><span>Encadré par</span><strong>Cheikhani Hamoude</strong></div>
    </div>
  </section>

  <section class="toc">
    <h1>Sommaire</h1>
    <ol>
${tocHtml}
    </ol>
  </section>

  <main class="content">
${contentHtml}
    <div class="footer-note">© 2026 Beauty Store - Rapport généré depuis le fichier Markdown principal.</div>
  </main>
</body>
</html>
`;

fs.writeFileSync(htmlPath, html, "utf8");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
});
await browser.close();

console.log(`Generated ${path.relative(root, htmlPath)}`);
console.log(`Generated ${path.relative(root, pdfPath)}`);
console.log(`Sections: ${toc.length}`);
console.log(`Markdown lines: ${lines.length}`);

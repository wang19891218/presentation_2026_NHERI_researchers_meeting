// Robust reveal.js -> PDF export using reveal's native ?print-pdf mode.
// Uses a single page.pdf() CDP call (avoids decktape's many per-slide evaluates,
// which stall under memory pressure). Run: node tools/print_pdf.mjs <url> <out>
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

const url = process.argv[2] || "http://127.0.0.1:8771/index.html?print-pdf";
const out = process.argv[3] || "../Wang-Haifeng_Geometry-Aware-CondNN-Wind-Pressure.pdf";

// Locate the puppeteer-downloaded Chromium.
const chromePath = execSync(
  "find " + process.env.HOME + "/.cache/puppeteer/chrome -name chrome -type f | head -1"
).toString().trim();
if (!existsSync(chromePath)) { console.error("No chrome found"); process.exit(2); }

const browser = await puppeteer.launch({
  headless: "new",
  protocolTimeout: 240000,
  executablePath: chromePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
page.on("console", (m) => { /* swallow WebGL warnings */ });

console.log("navigating:", url);
await page.goto(url, { waitUntil: "networkidle0", timeout: 120000 });
// Give reveal time to apply the print-pdf stacked layout + decode images.
await new Promise((r) => setTimeout(r, 4000));
await page.evaluate(async () => {
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
  await Promise.all(Array.from(document.images).map((img) =>
    img.complete ? Promise.resolve() : new Promise((res) => { img.onload = img.onerror = res; })));
});

console.log("printing PDF ->", out);
await page.pdf({
  path: out,
  printBackground: true,
  preferCSSPageSize: true,   // honor reveal's @page { size: 1280px 720px }
  width: "1280px",
  height: "720px",
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
await browser.close();
console.log("done");

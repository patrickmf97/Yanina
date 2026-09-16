import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.SCREENSHOT_URL || "https://yaniterapia.vercel.app";
const OUT = path.resolve("screenshots");

const pages = [
  ["01-home", "/"],
  ["02-agendar", "/agendar"],
  ["03-entrar", "/entrar"],
  ["04-cadastro", "/cadastro"],
  ["05-recuperar", "/recuperar"],
];

const devices = [
  { name: "desktop", viewport: { width: 1440, height: 1000 }, fullPage: true },
  { name: "instagram", viewport: { width: 1080, height: 1350 }, fullPage: false },
  { name: "mobile", viewport: { width: 390, height: 844 }, fullPage: true },
];

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

try {
  for (const device of devices) {
    const dir = path.join(OUT, device.name);
    await fs.mkdir(dir, { recursive: true });

    const context = await browser.newContext({
      viewport: device.viewport,
      deviceScaleFactor: 1,
      locale: "es-AR",
      timezoneId: "America/Argentina/Buenos_Aires",
    });

    for (const [name, route] of pages) {
      const page = await context.newPage();
      const url = new URL(route, BASE_URL).toString();
      console.log(`Capturando ${device.name}: ${url}`);

      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.evaluate(() => document.fonts?.ready);
      await page.screenshot({
        path: path.join(dir, `${name}.png`),
        fullPage: device.fullPage,
      });
      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`\nCapturas geradas em: ${OUT}`);
console.log("Desktop: apresentação da cliente");
console.log("Instagram: 1080x1350 (4:5)");
console.log("Mobile: página completa em 390px");

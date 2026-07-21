import { chromium } from "@playwright/test";

async function main() {
  const url = "http://127.0.0.1:43110";
  console.log(`[pwa-test] Launching Chromium to test PWA on ${url}...`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  page.on("console", (msg) => {
    console.log(`[browser-console] ${msg.type()}: ${msg.text()}`);
  });

  page.on("pageerror", (err) => {
    console.error(`[browser-pageerror]`, err);
  });

  try {
    await page.goto(url, { waitUntil: "networkidle" });
    
    // Check manifest link tag in HTML
    const manifestHref = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link ? link.getAttribute("href") : null;
    });
    console.log(`[pwa-test] Manifest link href: ${manifestHref}`);

    // Check service worker registration
    const swStatus = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return "not_supported";
      const reg = await navigator.serviceWorker.getRegistration();
      return reg ? { state: reg.active ? reg.active.state : "no_active", scope: reg.scope } : "none";
    });
    console.log(`[pwa-test] ServiceWorker registration:`, swStatus);

    // Perform Admin Login
    await page.fill("#login-email", "admin@example.com");
    await page.fill("#login-password", "ChangeMe123!");

    const captchaText = await page.evaluate(() => document.querySelector("svg text")?.textContent);
    if (captchaText) {
      const match = captchaText.match(/(\d+)\s*\+\s*(\d+)/);
      if (match) {
        await page.fill("#login-captcha", String(parseInt(match[1], 10) + parseInt(match[2], 10)));
      }
    }

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Check post-login SW and Manifest
    const swPostLogin = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return reg ? { state: reg.active ? reg.active.state : "no_active", scope: reg.scope } : "none";
    });
    console.log(`[pwa-test] Post-login ServiceWorker:`, swPostLogin);

    // Check if install button is in sidebar
    const installButton = await page.$('button[aria-label="Install app"], button[aria-label="安装 App"]');
    console.log(`[pwa-test] In-app PWA Install Button visible in sidebar: ${Boolean(installButton)}`);

  } catch (err) {
    console.error("[pwa-test] Error:", err);
  } finally {
    await browser.close();
  }
}

main();

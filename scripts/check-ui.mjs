import { chromium } from "@playwright/test";

async function main() {
  const url = process.argv[2] || process.env.CODEX_UI_CHECK_URL || "http://127.0.0.1:43110";
  console.log(`[playwright-check] Connecting to ${url}...`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  try {
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
    console.log(`[playwright-check] Initial response status: ${response ? response.status() : "none"}`);
    
    const title = await page.title();
    console.log(`[playwright-check] Page title: "${title}"`);

    // Check preloader state
    const hasPreload = await page.$(".app-preload");
    const hasLoginForm = await page.$("#login-email");

    if (hasPreload && !hasLoginForm) {
      // Give app another 3s to finish mounting if needed
      await page.waitForTimeout(3000);
    }

    const isLoginFieldVisible = await page.$("#login-email");

    if (isLoginFieldVisible) {
      console.log("[playwright-check] Member login screen detected. Performing admin login test...");
      const adminEmail = process.env.CODEX_UI_ADMIN_EMAIL || "admin@example.com";
      const adminPassword = process.env.CODEX_UI_ADMIN_PASSWORD || "ChangeMe123!";

      await page.fill("#login-email", adminEmail);
      await page.fill("#login-password", adminPassword);

      const captchaText = await page.evaluate(() => {
        const textElem = document.querySelector("svg text");
        return textElem ? textElem.textContent : null;
      });

      if (captchaText) {
        console.log(`[playwright-check] Captcha prompt: "${captchaText}"`);
        const match = captchaText.match(/(\d+)\s*\+\s*(\d+)/);
        if (match) {
          const sum = parseInt(match[1], 10) + parseInt(match[2], 10);
          console.log(`[playwright-check] Solved captcha: ${sum}`);
          await page.fill("#login-captcha", String(sum));
        }
      }

      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`[playwright-check] Console errors:`, consoleErrors);
    console.log(`[playwright-check] Page errors:`, pageErrors);
    console.log(`[playwright-check] Body preview:`, bodyText.slice(0, 180).replace(/\n/g, " "));

    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      console.error("[playwright-check] FAILED: Console or page errors detected.");
      process.exit(1);
    }

    const stillStuckPreload = await page.$("#root > .app-preload");
    if (stillStuckPreload) {
      console.error("[playwright-check] FAILED: App stuck at preload screen.");
      process.exit(1);
    }

    console.log("[playwright-check] SUCCESS: UI loaded cleanly with Playwright!");
  } catch (err) {
    console.error("[playwright-check] FAILED with error:", err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();

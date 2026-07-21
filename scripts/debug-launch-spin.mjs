import { chromium } from "@playwright/test";

async function main() {
  const url = "http://127.0.0.1:43110";
  console.log(`[debug-spin] Opening ${url} with Playwright...`);

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
    await page.waitForTimeout(2000);

    const hasLogin = await page.$("#login-email");
    if (hasLogin) {
      console.log("[debug-spin] Logging in as admin...");
      await page.fill("#login-email", "admin@example.com");
      await page.fill("#login-password", "ChangeMe123!");

      const captchaText = await page.evaluate(() => document.querySelector("svg text")?.textContent);
      if (captchaText) {
        const match = captchaText.match(/(\d+)\s*\+\s*(\d+)/);
        if (match) {
          const sum = parseInt(match[1], 10) + parseInt(match[2], 10);
          await page.fill("#login-captcha", String(sum));
        }
      }

      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    const allButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.map((b) => ({ text: b.innerText.trim(), ariaLabel: b.getAttribute('aria-label') }));
    });
    console.log("[debug-spin] All buttons on page:", JSON.stringify(allButtons, null, 2));

    // Open Settings Drawer
    const settingsButton = page.locator('button:has-text("Settings"), button:has-text("设置"), button[aria-label="Open settings"], button[aria-label="打开设置"]');
    if (await settingsButton.count() === 0) {
      console.error("[debug-spin] Settings button not found! Page body:");
      console.log(await page.evaluate(() => document.body.innerText));
      return;
    }

    console.log("[debug-spin] Clicking Settings button...");
    await settingsButton.first().click();
    await page.waitForTimeout(1500);

    // Click Launch Adapters item in drawer
    console.log("[debug-spin] Looking for Launch Adapters in drawer...");
    const launchItem = page.locator('.MuiListItemButton-root').filter({ hasText: "Launch adapters" }).or(
      page.locator('.MuiListItemButton-root').filter({ hasText: "启动器适配" })
    );

    if (await launchItem.count() > 0) {
      console.log("[debug-spin] Clicking Launch Adapters list item...");
      await launchItem.first().click();
      await page.waitForTimeout(3000);
    } else {
      console.log("[debug-spin] Launch Adapters item not found by text filter, clicking text directly...");
      await page.click('text="Launch adapters"');
      await page.waitForTimeout(3000);
    }

    const chipsText = await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('.MuiChip-root'));
      return chips.map((c) => c.textContent?.trim());
    });

    console.log("[debug-spin] All Chips on screen:", chipsText);

    const drawerText = await page.evaluate(() => {
      const drawer = document.querySelector('.MuiDrawer-root, [role="presentation"]');
      return drawer ? drawer.innerText : "";
    });

    console.log("[debug-spin] Drawer inner text preview (first 1000 chars):");
    console.log(drawerText.slice(0, 1000));

    const spinnerCount = await page.locator('.MuiCircularProgress-root').count();
    console.log(`[debug-spin] Active CircularProgress spinners count: ${spinnerCount}`);

    await page.screenshot({ path: "/root/codex-react-ui/scripts/launch-adapters-screen.png" });
    console.log("[debug-spin] Saved screenshot to scripts/launch-adapters-screen.png");

  } catch (err) {
    console.error("[debug-spin] Error:", err);
  } finally {
    await browser.close();
  }
}

main();

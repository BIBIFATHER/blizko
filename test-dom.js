import { chromium } from 'playwright';
import fs from 'fs';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:3001');
  await page.waitForTimeout(2000); // wait for animations
  // get the hero section
  const html = await page.content();
  fs.writeFileSync('dom_dump.html', html);
  console.log('DOM dumped to dom_dump.html');
  await browser.close();
})();

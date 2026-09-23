import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto("http://localhost:5173/login");
await page.getByLabel(/email/i).fill("test-sfmv21-admin@fieldforce.local");
await page.getByLabel(/password/i).fill("TestPass123!");
const signInBtn = page.getByRole("button", { name: /sign in/i });
await signInBtn.click();
await signInBtn.waitFor({ state: "hidden" }).catch(() => {});
await page.waitForTimeout(1200);

await page.goto("http://localhost:5173/reports");
await page.waitForTimeout(1000);
await page.getByRole("button", { name: "State-wise" }).click();
await page.waitForTimeout(500);
const stateWiseText = await page.locator(".ant-empty-description").textContent();
console.log("state-wise empty text:", stateWiseText);

await page.getByRole("button", { name: "B2B group" }).click();
await page.waitForTimeout(500);
const b2bText = await page.locator(".ant-empty-description").textContent();
console.log("b2b group empty text:", b2bText);

await browser.close();
console.log("done");

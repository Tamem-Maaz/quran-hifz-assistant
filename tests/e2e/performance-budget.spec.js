import { expect, test } from "@playwright/test";

/**
 * ميزانية الأداء (القسم 13.4): أقل من 200 كيلوبايت لأول تحميل (عدا الخطوط).
 * "أول تحميل" هنا يعني مسار الرسم الحرج للوحة اليوم — لا يشمل التخزين المسبق
 * الخلفي لـ Service Worker (تكلفة تثبيت PWA لاحقة، لا تحميل أول رؤية)، ولا
 * صور الخرائط الذهنية (تُحمَّل كسولًا عند زيارة شاشة منفصلة فقط).
 */

const BUDGET_BYTES = 200 * 1024;

test("حجم أول تحميل للوحة اليوم أقل من 200 كيلوبايت", async ({ page }) => {
  /** @type {{url:string, bytes:number}[]} */
  const responses = [];

  page.on("response", async (response) => {
    const request = response.request();
    if (request.method() !== "GET") return;
    const url = new URL(response.url());
    if (url.pathname.startsWith("/docs/maps/")) return; // كسول، خارج مسار الرسم الأول
    if (url.pathname.endsWith("service-worker.js")) return; // تسجيل PWA، ليس رسمًا مرئيًا

    try {
      const body = await response.body();
      responses.push({ url: url.pathname, bytes: body.length });
    } catch {
      // استجابات لا جسم لها (مثل 304) — تجاهل
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "أهلًا بك" })).toBeVisible();

  // مهلة قصيرة لضمان اكتمال طلبات مسار الرسم الحرج (surahs.json وmaps.json
  // تُجلَبان بالتوازي مع الرسم) قبل أن يبدأ التخزين المسبق لـ Service Worker.
  await page.waitForTimeout(300);

  const totalBytes = responses.reduce((sum, r) => sum + r.bytes, 0);
  const breakdown = responses
    .sort((a, b) => b.bytes - a.bytes)
    .map((r) => `  ${(r.bytes / 1024).toFixed(1)} KB  ${r.url}`)
    .join("\n");

  console.log(`إجمالي أول تحميل: ${(totalBytes / 1024).toFixed(1)} KB\n${breakdown}`);

  expect(totalBytes, `إجمالي ${(totalBytes / 1024).toFixed(1)} KB يتجاوز ميزانية 200 KB:\n${breakdown}`).toBeLessThan(
    BUDGET_BYTES
  );
});

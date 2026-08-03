import { expect, test } from "@playwright/test";

/**
 * ميزانية الأداء (القسم 13.4): أقل من 200 كيلوبايت لأول تحميل (عدا الخطوط).
 * "أول تحميل" هنا يعني مسار الرسم الحرج للوحة اليوم — لا يشمل التخزين المسبق
 * الخلفي لـ Service Worker (تكلفة تثبيت PWA لاحقة، لا تحميل أول رؤية)، ولا
 * صور الخرائط الذهنية (تُحمَّل كسولًا عند زيارة شاشة منفصلة فقط).
 *
 * الخطوط مستثناة من هذه الميزانية بالتصميم (كما تنص هذه الفقرة أصلًا): هي
 * أصل هوية بصرية طلبه المستخدم صراحةً، تُحمَّل مرّة واحدة فقط ثم تبقى في
 * ذاكرة التخزين المؤقت للمتصفح ولـ Service Worker إلى الأبد — لا تتكرر
 * تكلفتها في كل زيارة كما يتكرر JS/CSS/JSON عند تغيّرها. لهما مع ذلك سقف
 * منفصل أدناه كي لا يتضخّم عدد الأوزان المستضافة دون أن يلاحظه أحد.
 */

const BUDGET_BYTES = 200 * 1024;
const FONT_BUDGET_BYTES = 150 * 1024;

test("حجم أول تحميل للوحة اليوم أقل من 200 كيلوبايت (عدا الخطوط)", async ({ page }) => {
  /** @type {{url:string, bytes:number}[]} */
  const responses = [];
  /** @type {{url:string, bytes:number}[]} */
  const fontResponses = [];

  page.on("response", async (response) => {
    const request = response.request();
    if (request.method() !== "GET") return;
    const url = new URL(response.url());
    if (url.pathname.startsWith("/docs/maps/")) return; // كسول، خارج مسار الرسم الأول
    if (url.pathname.endsWith("service-worker.js")) return; // تسجيل PWA، ليس رسمًا مرئيًا

    try {
      const body = await response.body();
      if (url.pathname.startsWith("/assets/fonts/")) {
        fontResponses.push({ url: url.pathname, bytes: body.length });
      } else {
        responses.push({ url: url.pathname, bytes: body.length });
      }
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

  const fontBytes = fontResponses.reduce((sum, r) => sum + r.bytes, 0);
  const fontBreakdown = fontResponses
    .sort((a, b) => b.bytes - a.bytes)
    .map((r) => `  ${(r.bytes / 1024).toFixed(1)} KB  ${r.url}`)
    .join("\n");

  console.log(
    `إجمالي أول تحميل (عدا الخطوط): ${(totalBytes / 1024).toFixed(1)} KB\n${breakdown}\n` +
      `إجمالي الخطوط: ${(fontBytes / 1024).toFixed(1)} KB\n${fontBreakdown}`
  );

  expect(totalBytes, `إجمالي ${(totalBytes / 1024).toFixed(1)} KB يتجاوز ميزانية 200 KB:\n${breakdown}`).toBeLessThan(
    BUDGET_BYTES
  );
  expect(
    fontBytes,
    `إجمالي الخطوط ${(fontBytes / 1024).toFixed(1)} KB يتجاوز سقف 150 KB:\n${fontBreakdown}`
  ).toBeLessThan(FONT_BUDGET_BYTES);
});

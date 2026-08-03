import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * مسار الترقية الصريح المطلوب في القسم 15: نسخة قديمة مثبَّتة ← نشر نسخة
 * جديدة ← التحقق من ظهور إشعار التحديث وتفعيله بعد الضغط.
 *
 * ملاحظة منهجية: محاكاة "نشر جديد" عبر اعتراض الطلب (context.route) لا يصل
 * إلى مسار تحديث Service Worker فعليًا في Chromium — فحص التحديث يمر بمسار
 * شبكة داخلي لا يعبر طبقة اعتراض Playwright. لذا نغيّر الملف الحقيقي على
 * القرص مؤقتًا (تعليق بايتي بحت، لا يمسّ أي منطق تخزين مؤقت فعلي) ونعيده
 * دومًا حتى عند فشل الاختبار. التغيير محايد وظيفيًا فلا يؤثر في أي اختبار
 * آخر قد يحمّل service-worker.js أثناء نافذة التعديل القصيرة.
 */

const SW_PATH = fileURLToPath(new URL("../../service-worker.js", import.meta.url));

test("يظهر إشعار التحديث ويُفعَّل عند نشر نسخة جديدة من Service Worker", async ({ page }) => {
  const original = readFileSync(SW_PATH, "utf8");

  try {
    await page.goto("/");
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });

    writeFileSync(SW_PATH, `/* نشر تجريبي جديد */\n${original}`);

    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });

    await expect(page.getByText("يتوفر تحديث للتطبيق")).toBeVisible({ timeout: 10000 });

    const waitingBeforeClick = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration?.waiting;
    });
    expect(waitingBeforeClick).toBe(true);

    await page.getByRole("button", { name: "إعادة التحميل" }).click();

    // الضغط يرسل SKIP_WAITING فتُفعَّل النسخة الجديدة (controllerchange) وتُعاد
    // الصفحة تلقائيًا. نتحقق من نجاح التفعيل الفعلي بعد إعادة التحميل ومن
    // عدم بقاء نسخة "waiting" عالقة.
    await page.waitForLoadState("load");
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });

    const stateAfter = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return { active: !!registration?.active, waiting: !!registration?.waiting };
    });
    expect(stateAfter.active).toBe(true);
    expect(stateAfter.waiting).toBe(false);
  } finally {
    writeFileSync(SW_PATH, original);
  }
});

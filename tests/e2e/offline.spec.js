import { expect, test } from "@playwright/test";
import { completeAllStages, startNewSession } from "./helpers.js";

/**
 * معيار اكتمال المرحلة 6 حرفيًا (القسم 18): «التطبيق يعمل كاملًا في وضع الطيران».
 */

async function waitForServiceWorkerControl(page) {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });
}

test.describe("العمل دون إنترنت (القسم 15 و18)", () => {
  test("يعمل التطبيق كاملًا في وضع الطيران بعد أول زيارة", async ({ page, context }) => {
    await page.goto("/");
    await waitForServiceWorkerControl(page);

    await context.setOffline(true);
    await page.reload();

    // لا خطأ تصفّح دون اتصال — لوحة اليوم تظهر طبيعيًا
    await expect(page.getByRole("heading", { name: "أهلًا بك" })).toBeVisible();

    // رحلة سبق كاملة دون اتصال إطلاقًا
    await startNewSession(page);
    await completeAllStages(page);
    await expect(page.getByRole("heading", { name: /أنجزت سبق اليوم/ })).toBeVisible();

    // التنقّل بين الشاشات دون اتصال (وحدات JS مخزَّنة مسبقًا)
    await page.getByRole("button", { name: "الإحصائيات" }).click();
    await expect(page.getByRole("heading", { name: "الإحصائيات" })).toBeVisible();

    await context.setOffline(false);
  });

  test("يستأنف جلسة محفوظة دون اتصال بعد إعادة تحميل الصفحة", async ({ page, context }) => {
    await page.goto("/");
    await waitForServiceWorkerControl(page);

    await startNewSession(page);
    await page.getByRole("button", { name: "استمعت" }).click();

    await context.setOffline(true);
    await page.reload();

    // إعادة تحميل تُبقي على "#/session" فتستأنف مباشرة عند نفس المرحلة —
    // بلا اتصال وبلا حاجة لأي نقرة (نفس سلوك resume.spec.js، مُثبَت هنا أنه
    // يعمل حتى دون شبكة إطلاقًا).
    await expect(page.getByRole("heading", { name: "قراءة التفسير" })).toBeVisible();

    // ومحاكاة "إغلاق المتصفح" الحقيقي (بلا hash) تعمل أيضًا دون اتصال
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "السبق: جلسة مفتوحة" })).toBeVisible();
    await page.getByRole("button", { name: "استئناف" }).click();
    await expect(page.getByRole("heading", { name: "قراءة التفسير" })).toBeVisible();

    await context.setOffline(false);
  });
});

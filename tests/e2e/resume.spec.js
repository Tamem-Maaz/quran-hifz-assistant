import { expect, test } from "@playwright/test";
import { clickAndConfirm, startNewSession } from "./helpers.js";

test.describe("استئناف الجلسة بعد إغلاق المتصفح (القسم 6.1 و16)", () => {
  test("يستأنف من نفس المرحلة بعد إغلاق المتصفح وإعادة فتح التطبيق من الرابط الرئيسي", async ({ page }) => {
    await page.goto("/");
    await startNewSession(page);

    await page.getByRole("button", { name: "استمعت" }).click(); // listeningBefore
    await expect(page.getByRole("heading", { name: "قراءة التفسير" })).toBeVisible();

    // محاكاة إغلاق المتصفح وإعادة فتح التطبيق: التنقّل إلى الرابط الجذر بلا hash،
    // بخلاف page.reload() التي تُبقي على "#/session" وتستأنف مباشرة بلا حاجة لهذا الزر.
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "السبق: جلسة مفتوحة" })).toBeVisible();
    await page.getByRole("button", { name: "استئناف" }).click();

    // يجب أن يظهر مباشرة عند المرحلة الثانية (التفسير) لا الأولى
    await expect(page.getByRole("heading", { name: "قراءة التفسير" })).toBeVisible();
  });

  test("يستأنف عند مرحلة الحفظ بالتقدّم المحفوظ بدل الصفر", async ({ page }) => {
    await page.goto("/");
    await startNewSession(page);

    await page.getByRole("button", { name: "استمعت" }).click();
    await page.getByRole("button", { name: "قرأت التفسير" }).click();
    await page.getByRole("button", { name: "استمعت" }).click();
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: "كررت مرة" }).click();
    }
    await expect(page.getByText("4 / 10")).toBeVisible();

    await page.goto("/");
    await page.getByRole("button", { name: "استئناف" }).click();

    await expect(page.getByRole("heading", { name: "الحفظ بالتكرار" })).toBeVisible();
    await expect(page.getByText("4 / 10")).toBeVisible();
  });

  test("إعادة تحميل الصفحة أثناء الجلسة تستأنف مباشرة عند نفس المرحلة دون الحاجة لأي نقرة", async ({ page }) => {
    await page.goto("/");
    await startNewSession(page);
    await page.getByRole("button", { name: "استمعت" }).click();

    await page.reload();

    await expect(page.getByRole("heading", { name: "قراءة التفسير" })).toBeVisible();
  });

  test("جلسة مهجورة لا تُستأنف ولا تمنع بدء سبق جديد", async ({ page }) => {
    await page.goto("/");
    await startNewSession(page, { surah: "1", from: "1", to: "1" });
    await clickAndConfirm(page, /إنهاء الجلسة الآن/, "نعم، أنهِ الجلسة");

    await expect(page.getByRole("heading", { name: "لم تبدأ سبقًا جديدًا اليوم" })).toBeVisible();
  });
});

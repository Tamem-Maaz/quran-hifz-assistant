import { expect, test } from "@playwright/test";
import { clickAndConfirm, completeAllStages, startNewSession } from "./helpers.js";

test.describe("دورة تصدير → إعادة ضبط → استيراد (القسم 11 و16)", () => {
  test("تعيد الحالة بالضبط بعد التصدير وإعادة الضبط والاستيراد", async ({ page }) => {
    await page.goto("/");
    await startNewSession(page);
    await completeAllStages(page);

    await page.getByRole("button", { name: "الإعدادات", exact: true }).click();

    const download = await Promise.all([
      page.waitForEvent("download"),
      clickAndConfirm(page, "تصدير نسخة احتياطية الآن", "نعم، صدّر الآن"),
    ]).then(([d]) => d);

    expect(download.suggestedFilename()).toMatch(/^quran-memorization-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const exportPath = await download.path();

    // إعادة الضبط (بتأكيد مزدوج) — تُصدِّر نسخة احتياطية تلقائية أخرى قبل الحذف، فلننتظرها أيضًا
    await page.getByRole("button", { name: "إعادة ضبط التطبيق" }).click();
    const autoBackup = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "نعم، احذف كل شيء" }).click(),
    ]).then(([d]) => d);
    expect(autoBackup.suggestedFilename()).toMatch(/\.json$/);

    await expect(page.getByRole("heading", { name: "أهلًا بك" })).toBeVisible();

    // الاستيراد: يستبدل الحالة الفارغة الحالية بمحتوى الملف المصدَّر أولًا
    await page.getByRole("button", { name: "الإعدادات", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles(exportPath);

    await expect(page.getByText(/سيتم استبدال بياناتك الحالية بالكامل/)).toBeVisible();
    await expect(page.getByText("1 جلسة")).toBeVisible();
    await expect(page.getByText("1 عنصر مراجعة")).toBeVisible();

    const importAutoBackup = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "تأكيد الاستبدال" }).click(),
    ]).then(([d]) => d);
    expect(importAutoBackup.suggestedFilename()).toMatch(/\.json$/);

    await page.getByRole("button", { name: "اليوم", exact: true }).click();
    await expect(page.getByRole("heading", { name: /أنجزت سبق اليوم/ })).toBeVisible();
    await expect(page.getByText("4 آية من 6236")).toBeVisible();
  });

  test("يرفض ملفًا تالفًا برسالة خطأ واضحة دون تعديل الحالة", async ({ page }) => {
    await page.goto("/");
    await startNewSession(page);
    await completeAllStages(page);

    await page.getByRole("button", { name: "الإعدادات", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "corrupted.json",
      mimeType: "application/json",
      buffer: Buffer.from("{ليس JSON صالحًا"),
    });

    await expect(page.getByRole("alert")).toContainText("JSON");

    await page.getByRole("button", { name: "اليوم", exact: true }).click();
    await expect(page.getByRole("heading", { name: /أنجزت سبق اليوم/ })).toBeVisible();
  });
});

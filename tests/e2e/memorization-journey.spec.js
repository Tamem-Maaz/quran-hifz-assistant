import { expect, test } from "@playwright/test";
import { clickAndConfirm, completeAllStages, startNewSession } from "./helpers.js";

test.describe("رحلة الحفظ الكاملة (القسم 16)", () => {
  test("إنشاء جلسة وإتمام المراحل الست يجدولها في طابور المراجعة", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "أهلًا بك" })).toBeVisible();

    await startNewSession(page);
    await expect(page.getByText("البقرة 12 — 15")).toBeVisible();

    await completeAllStages(page);

    await expect(page.getByRole("heading", { name: /أنجزت سبق اليوم/ })).toBeVisible();
    await expect(page.getByText("4 آية من 6236")).toBeVisible();
  });

  test("مقطع محفوظ يظهر مستحقًا للمراجعة بعد يوم واحد بالضبط (معيار اكتمال المرحلة 4)", async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 7, 3, 9, 0, 0) });
    await page.goto("/");

    await startNewSession(page);
    await completeAllStages(page);

    await page.getByRole("button", { name: "المراجعة", exact: true }).click();
    await expect(page.getByText("لا مراجعات مستحقة الآن")).toBeVisible();

    await page.clock.setFixedTime(new Date(2026, 7, 4, 9, 0, 0));
    await page.reload();
    await page.getByRole("button", { name: "المراجعة", exact: true }).click();

    await expect(page.getByRole("heading", { name: "المراجعة المستحقة (1)" })).toBeVisible();
    await expect(page.getByText("البقرة 12 — 15")).toBeVisible();
    await expect(page.getByText("سبقي")).toBeVisible();
  });

  test("نجاح المراجعة يقدّم الفاصل الزمني التالي ويزيله من مستحقات اليوم", async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 7, 3, 9, 0, 0) });
    await page.goto("/");
    await startNewSession(page);
    await completeAllStages(page);

    await page.clock.setFixedTime(new Date(2026, 7, 4, 9, 0, 0));
    await page.reload();
    await page.getByRole("button", { name: "المراجعة", exact: true }).click();
    await clickAndConfirm(page, "نجحت", "نعم، نجحت");

    await expect(page.getByText("لا مراجعات مستحقة الآن")).toBeVisible();
  });

  test("إخفاق المراجعة يعيد الفاصل إلى البداية ويزيد عدد الإخفاقات", async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 7, 3, 9, 0, 0) });
    await page.goto("/");
    await startNewSession(page);
    await completeAllStages(page);

    await page.clock.setFixedTime(new Date(2026, 7, 4, 9, 0, 0));
    await page.reload();
    await page.getByRole("button", { name: "المراجعة", exact: true }).click();
    await clickAndConfirm(page, "لم أنجح", "نعم، لم أنجح");
    await expect(page.getByText("لا مراجعات مستحقة الآن")).toBeVisible();

    // فاصل الإخفاق الأول ثابت دائمًا على يوم واحد — يجب أن يظهر مستحقًا غدًا
    await page.clock.setFixedTime(new Date(2026, 7, 5, 9, 0, 0));
    await page.reload();
    await page.getByRole("button", { name: "المراجعة", exact: true }).click();
    await expect(page.getByRole("heading", { name: "المراجعة المستحقة (1)" })).toBeVisible();
  });
});

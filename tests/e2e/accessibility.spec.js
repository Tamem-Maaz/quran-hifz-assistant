import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { startNewSession } from "./helpers.js";

/**
 * تدقيق وصولية آلي (القسم 13.3 و18): لا مخالفات WCAG 2.1 AA عبر كل الشاشات.
 */

async function expectNoAAViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} عنصر — ${v.help}`);
  expect(summary, `مخالفات AA:\n${summary.join("\n")}`).toEqual([]);
}

test.describe("تدقيق الوصولية (axe-core, WCAG 2.1 AA)", () => {
  test("لوحة اليوم — حالة مستخدم جديد", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "أهلًا بك" })).toBeVisible();
    await expectNoAAViolations(page);
  });

  test("بدء سبق جديد", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "ابدأ أول جلسة" }).click();
    await expect(page.getByRole("heading", { name: "بدء سبق جديد" })).toBeVisible();
    await expectNoAAViolations(page);
  });

  test("جلسة الحفظ — مرحلة الاستماع ومرحلة الحفظ ومرحلة التسميع", async ({ page }) => {
    await page.goto("/");
    await startNewSession(page);
    await expectNoAAViolations(page);

    await page.getByRole("button", { name: "استمعت" }).click();
    await page.getByRole("button", { name: "قرأت التفسير" }).click();
    await page.getByRole("button", { name: "استمعت" }).click();
    await expectNoAAViolations(page); // مرحلة الحفظ (بها progressbar وعدّاد aria-live)

    for (let i = 0; i < 10; i++) await page.getByRole("button", { name: "كررت مرة" }).click();
    await page.getByRole("button", { name: "راجعت" }).click();
    await expectNoAAViolations(page); // مرحلة التسميع (بها قائمة آيات وأزرار تكرارية)
  });

  test("لوحة اليوم — سبق مكتمل ومراجعة مستحقة", async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 7, 3, 9, 0, 0) });
    await page.goto("/");
    await startNewSession(page);
    for (const label of ["استمعت", "قرأت التفسير", "استمعت"]) {
      await page.getByRole("button", { name: label }).click();
    }
    for (let i = 0; i < 10; i++) await page.getByRole("button", { name: "كررت مرة" }).click();
    await page.getByRole("button", { name: "راجعت" }).click();
    await page.getByRole("button", { name: "أنهيت التسميع" }).click();
    await page.getByRole("button", { name: "إنهاء الجلسة وجدولة المراجعة" }).click();

    await page.clock.setFixedTime(new Date(2026, 7, 4, 9, 0, 0));
    await page.reload();
    await expectNoAAViolations(page);

    await page.getByRole("button", { name: "المراجعة", exact: true }).click();
    await expect(page.getByRole("heading", { name: "المراجعة المستحقة (1)" })).toBeVisible();
    await expectNoAAViolations(page);
  });

  test("الإحصائيات", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "الإحصائيات" }).click();
    await expect(page.getByRole("heading", { name: "الإحصائيات" })).toBeVisible();
    await expectNoAAViolations(page);
  });

  test("الخرائط الذهنية", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "الخرائط" }).click();
    await expect(page.getByRole("heading", { name: "الخرائط الذهنية" })).toBeVisible();
    await expectNoAAViolations(page);
  });

  test("الإعدادات", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "الإعدادات" }).click();
    await expect(page.getByRole("heading", { name: "الإعدادات" })).toBeVisible();
    await expectNoAAViolations(page);
  });
});

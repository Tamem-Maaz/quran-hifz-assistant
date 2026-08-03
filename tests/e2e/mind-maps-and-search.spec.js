import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("بحث السورة وزر الخريطة الذهنية (بدء سبق جديد)", () => {
  test("البحث بالاسم يصفّي قائمة السور مع تحديث عدد النتائج", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "ابدأ أول جلسة" }).click();

    await page.getByLabel("ابحث عن سورة").fill("يوسف");
    await expect(page.getByText("1 نتيجة")).toBeVisible();

    const select = page.getByLabel("السورة");
    await expect(select.locator("option")).toHaveCount(1);
    await expect(select.locator("option")).toHaveText("12. يوسف (111 آية)");
  });

  test("البحث بالرقم يعمل أيضًا", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "ابدأ أول جلسة" }).click();

    await page.getByLabel("ابحث عن سورة").fill("114");
    const select = page.getByLabel("السورة");
    await expect(select.locator("option")).toHaveText("114. الناس (6 آية)");
  });

  test("بحث بلا أي تطابق يعرض رسالة واضحة", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "ابدأ أول جلسة" }).click();

    await page.getByLabel("ابحث عن سورة").fill("xyz123لا-يوجد");
    await expect(page.getByText("لا نتائج مطابقة")).toBeVisible();
  });

  test("زر الخريطة الذهنية يظهر فقط للسور المتوفرة ويختفي لغيرها", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "ابدأ أول جلسة" }).click();

    // البقرة (2) لها خريطة متوفرة
    await page.getByLabel("السورة").selectOption("2");
    await expect(page.getByRole("button", { name: "فتح الخريطة الذهنية" })).toBeVisible();

    // الجاثية (45) لا خريطة لها
    await page.getByLabel("السورة").selectOption("45");
    await expect(page.getByRole("button", { name: "فتح الخريطة الذهنية" })).toHaveCount(0);
  });

  test("فتح الخريطة الذهنية يعرض الصورة الصحيحة ويُغلق بـ Escape مع إعادة التركيز", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "ابدأ أول جلسة" }).click();
    await page.getByLabel("السورة").selectOption("2");

    const openButton = page.getByRole("button", { name: "فتح الخريطة الذهنية" });
    await openButton.click();

    const dialog = page.locator("dialog.lightbox");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("img")).toHaveAttribute("alt", "الخريطة الذهنية لسورة البقرة");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(openButton).toBeFocused();
  });

  test("النقر خارج الصورة (الخلفية المعتمة) يُغلق النافذة", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "ابدأ أول جلسة" }).click();
    await page.getByLabel("السورة").selectOption("2");
    await page.getByRole("button", { name: "فتح الخريطة الذهنية" }).click();

    const dialog = page.locator("dialog.lightbox");
    await expect(dialog).toBeVisible();

    // النقر خارج مربّع الحوار كليًا (وليس داخل زاويته) — الحوار متمركز بهامش
    // ≥ 4% من الشاشة على كل جهة (max-width/height: 92vw/92vh)، فزاوية الصفحة
    // الفعلية تقع دائمًا على الخلفية المعتمة خارج عنصر dialog نفسه.
    await page.mouse.click(3, 3);
    await expect(dialog).toBeHidden();
  });
});

test.describe("تكبير صور معرض الخرائط", () => {
  test("النقر على خريطة مصغّرة يفتحها بالحجم الكامل، وزر الإغلاق يعمل", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "الخرائط" }).click();

    const thumb = page.getByRole("button", { name: "تكبير الخريطة الذهنية لسورة الفاتحة" });
    await thumb.click();

    const dialog = page.locator("dialog.lightbox");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("img")).toHaveAttribute("alt", "الخريطة الذهنية لسورة الفاتحة");

    await page.getByRole("button", { name: "إغلاق" }).click();
    await expect(dialog).toBeHidden();
    await expect(thumb).toBeFocused();
  });

  test("لا مخالفات AA أثناء فتح صندوق التكبير", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "الخرائط" }).click();
    await page.getByRole("button", { name: "تكبير الخريطة الذهنية لسورة الفاتحة" }).click();
    await expect(page.locator("dialog.lightbox")).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.help}`);
    expect(summary, `مخالفات AA:\n${summary.join("\n")}`).toEqual([]);
  });
});

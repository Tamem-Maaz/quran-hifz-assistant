import { expect, test } from "@playwright/test";
import { pressStage, startNewSession } from "./helpers.js";

/**
 * سؤال التأكيد قبل كل فعل. المطلوب إثباته ثلاثة أمور: أن الفعل لا يقع بمجرّد
 * الضغط، وأن التراجع (بالزرّ أو بـEscape) لا يترك أثرًا، وأن أزرار المراحل
 * وعدّاداتها مشمولةٌ بالشرط نفسه — بما فيها «كررت مرة» في كل ضغطة.
 */

test.describe("تأكيد الأفعال", () => {
  test("«رجوع» في نافذة التأكيد لا يُنهي الجلسة", async ({ page }) => {
    await page.goto("/");
    await startNewSession(page);
    await expect(page.getByRole("heading", { name: "الاستماع", exact: true })).toBeVisible();

    await page.getByRole("button", { name: /إنهاء الجلسة الآن/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "رجوع" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole("heading", { name: "الاستماع", exact: true })).toBeVisible();
  });

  test("Escape يغلق نافذة التأكيد دون تنفيذ الفعل", async ({ page }) => {
    await page.goto("/");
    await startNewSession(page);

    await page.getByRole("button", { name: /إنهاء الجلسة الآن/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("heading", { name: "الاستماع", exact: true })).toBeVisible();
  });

  test("التأكيد يُنفّذ الفعل: الجلسة تُحفظ متوقفة ويعود إلى لوحة اليوم", async ({ page }) => {
    await page.goto("/");
    await startNewSession(page);

    await page.getByRole("button", { name: /إنهاء الجلسة الآن/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "نعم، أنهِ الجلسة" }).click();

    // الجلسة المتوقفة لا تُستأنف (status: abandoned)، فلوحة اليوم تعرض دعوة
    // لسبق جديد لا زرّ استئناف — وهو ما تَعِد به رسالة التأكيد نفسها.
    await expect(page.getByRole("heading", { name: "لم تبدأ سبقًا جديدًا اليوم" })).toBeVisible();
    await expect(page.getByRole("button", { name: "استئناف" })).toHaveCount(0);
  });

  test("أزرار المراحل تسأل أيضًا: «استمعت» لا تُنهي المرحلة إلا بالتأكيد", async ({ page }) => {
    await page.goto("/");
    await startNewSession(page);
    await expect(page.getByRole("heading", { name: "الاستماع", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "استمعت" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "رجوع" }).click();
    await expect(page.getByRole("heading", { name: "الاستماع", exact: true })).toBeVisible();

    await pressStage(page, "استمعت");
    await expect(page.getByRole("heading", { name: "قراءة التفسير" })).toBeVisible();
  });

  test("عدّاد التكرار يسأل في كل ضغطة، ونصّ السؤال يذكر الرقم القادم", async ({ page }) => {
    await page.goto("/");
    await startNewSession(page);
    for (const label of ["استمعت", "قرأت التفسير", "استمعت"]) {
      await pressStage(page, label);
    }
    await expect(page.getByRole("heading", { name: "الحفظ بالتكرار" })).toBeVisible();

    await page.getByRole("button", { name: "كررت مرة" }).click();
    await expect(page.getByRole("dialog")).toContainText("يصير العدّاد 1 من 10");
    await page.getByRole("dialog").getByRole("button", { name: "نعم، كررت مرة" }).click();
    await expect(page.getByText("1 / 10")).toBeVisible();

    // التراجع فعلٌ أيضًا: له سؤاله
    await page.getByRole("button", { name: "تراجع" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "نعم، تراجع" }).click();
    await expect(page.getByText("0 / 10")).toBeVisible();
  });

  test("التنقّل لا يسأل: أزرار الشريط الجانبي تفتح الشاشات مباشرة", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "الإحصائيات" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "الإحصائيات" })).toBeVisible();
  });
});

/**
 * دوال مساعدة مشتركة لاختبارات Playwright للتدفقات الحرجة (القسم 16).
 */

/**
 * ينشئ جلسة جديدة عبر الواجهة (السورة والنطاق الافتراضي: البقرة 12-15).
 * @param {import('@playwright/test').Page} page
 */
export async function startNewSession(page, { surah = "2", from = "12", to = "15" } = {}) {
  await page.getByRole("button", { name: /ابدأ (أول جلسة|سبق جديد|جلسة إضافية)/ }).click();
  await page.getByLabel("السورة").selectOption(surah);
  await page.getByLabel("من آية").fill(from);
  await page.getByLabel("إلى آية").fill(to);
  await page.getByRole("button", { name: "ابدأ الجلسة" }).click();
}

/**
 * يؤكّد فعلًا مؤثّرًا: زرّ الفعل يفتح نافذة تأكيد، والتنفيذ لا يقع إلا بضغط
 * زرّ التأكيد داخلها (نصّه يبدأ دائمًا بـ«نعم، …» فلا يلتبس بزرّ الفعل).
 * @param {import('@playwright/test').Page} page
 * @param {string} actionName اسم زرّ الفعل في الشاشة
 * @param {string} confirmName اسم زرّ التأكيد داخل النافذة
 */
export async function clickAndConfirm(page, actionName, confirmName) {
  await page.getByRole("button", { name: actionName }).click();
  await page.getByRole("dialog").getByRole("button", { name: confirmName }).click();
}

/**
 * يُتمّ المراحل الست كاملة لجلسة مفتوحة حاليًا، بدءًا من المرحلة الأولى.
 * @param {import('@playwright/test').Page} page
 * @param {number} [targetReps]
 */
export async function completeAllStages(page, targetReps = 10) {
  await page.getByRole("button", { name: "استمعت" }).click(); // listeningBefore
  await page.getByRole("button", { name: "قرأت التفسير" }).click(); // tafsir
  await page.getByRole("button", { name: "استمعت" }).click(); // listeningAfter

  for (let i = 0; i < targetReps; i++) {
    await page.getByRole("button", { name: "كررت مرة" }).click();
  }

  await page.getByRole("button", { name: "راجعت" }).click(); // review
  await page.getByRole("button", { name: "أنهيت التسميع" }).click(); // recitation

  await clickAndConfirm(page, "إنهاء الجلسة وجدولة المراجعة", "نعم، أنهِ وجدوِل");
}

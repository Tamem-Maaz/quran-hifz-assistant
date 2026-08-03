import { el } from "./dom.js";

/**
 * يفتح صورة بحجمها الكامل في نافذة حوار أصلية (`<dialog>`): Escape وخلفية
 * معتمة يغلقانها (الأولى سلوك أصلي للعنصر، والثانية عبر فحص حدود المحتوى)،
 * والتركيز يعود لعنصر الاستدعاء عند الإغلاق.
 * @param {{src:string, alt:string, triggerElement?:HTMLElement}} options
 */
export function openImageLightbox({ src, alt, triggerElement }) {
  const img = el("img", { className: "lightbox__image", attrs: { src, alt } });

  const dialog = /** @type {HTMLDialogElement} */ (
    el("dialog", { className: "lightbox", attrs: { "aria-label": alt } }, [
      el("button", {
        className: "lightbox__close",
        text: "✕",
        attrs: { type: "button", "aria-label": "إغلاق" },
        onClick: () => dialog.close(),
      }),
      img,
    ])
  );

  dialog.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();
    const insideContent =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!insideContent) dialog.close();
  });

  dialog.addEventListener("close", () => {
    dialog.remove();
    triggerElement?.focus();
  });

  document.body.append(dialog);
  dialog.showModal();
}

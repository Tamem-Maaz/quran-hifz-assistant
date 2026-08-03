import { el } from "./dom.js";

/**
 * سؤال تأكيد قبل فعل مؤثّر. نافذة حوار أصلية (`<dialog>`): حبس التركيز
 * وEscape سلوكٌ أصلي للعنصر لا محاكاة، والتركيز الافتراضي على «رجوع» لا على
 * التأكيد — فالضغط المتسرّع على Enter يتراجع ولا يُنفّذ.
 *
 * الفعل يُستدعى بعد إغلاق النافذة لا قبله: كل شاشة تُعاد بناؤها كاملة عند
 * تغيّر الحالة، فتنفيذُه والنافذة مفتوحة يترك حوارًا معلّقًا فوق شاشة جديدة.
 *
 * @param {{title:string, message?:string, confirmLabel:string, variant?:'primary'|'danger', triggerElement?:HTMLElement, onConfirm:() => void}} options
 */
export function confirmAction({ title, message, confirmLabel, variant = "primary", triggerElement, onConfirm }) {
  const titleElement = el("h2", { className: "confirm__title", text: title });

  const dialog = /** @type {HTMLDialogElement} */ (el("dialog", { className: "confirm" }));

  // حدث `close` يُطلَق في مهمة لاحقة لا فور النداء، فلا يصلح وحده لتشغيل
  // الفعل: الإغلاق والتنفيذ يجريان هنا تزامنيًا، والحدث لا يخدم إلا مسار
  // Escape (إغلاق أصلي دون ضغط زرّ). `settled` يمنع تكرار الحسم.
  let settled = false;

  /** @param {boolean} confirmed */
  function settle(confirmed) {
    if (settled) return;
    settled = true;
    dialog.close();
    dialog.remove();
    if (confirmed) {
      onConfirm();
    } else {
      // إعادة التركيز إلى الزرّ الذي فتح النافذة معنيّة عند التراجع وحده:
      // عند التأكيد يختفي ذلك الزرّ غالبًا مع إعادة بناء الشاشة.
      triggerElement?.focus();
    }
  }

  const confirmButton = el("button", {
    className: `btn btn-${variant}`,
    text: confirmLabel,
    attrs: { type: "button" },
    onClick: () => settle(true),
  });

  const cancelButton = el("button", {
    className: "btn btn-secondary",
    text: "رجوع",
    attrs: { type: "button", autofocus: "" },
    onClick: () => settle(false),
  });

  dialog.append(titleElement);
  if (message) dialog.append(el("p", { className: "confirm__message", text: message }));
  dialog.append(el("div", { className: "actions" }, [confirmButton, cancelButton]));

  dialog.addEventListener("close", () => settle(false));

  document.body.append(dialog);
  dialog.showModal();
}

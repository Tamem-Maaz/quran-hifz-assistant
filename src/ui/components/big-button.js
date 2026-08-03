import { el } from "./dom.js";
import { confirmAction } from "./confirm.js";

/** @typedef {{title:string, message?:string, confirmLabel:string}} ConfirmOptions */

/**
 * الزرّ الأساسي للتطبيق. الحجم `lg` (لا يقلّ عن 64px ارتفاعًا، القسم 6.2)
 * مخصَّص لأفعال المراحل التي تُضغط والعين على المصحف لا على الشاشة؛ وما
 * عداها من الأفعال الثانوية (إلغاء، فتح شاشة) يكفيه الحجم العادي (44px).
 *
 * `confirm` يجعل الفعل مشروطًا بسؤال تأكيد: الشرط خاصيةٌ في الزرّ نفسه لا
 * سطرٌ يُكتب في كل موضع نداء، فلا يُنسى في موضع ويُطبَّق في آخر. تُوضع على
 * الأفعال المؤثّرة وحدها — لا على عدّادات المراحل التي تُضغط عشرات المرات.
 *
 * @param {{text:string, onClick:() => void, variant?: 'primary'|'secondary'|'danger'|'ghost', size?: 'md'|'lg', disabled?: boolean, ariaLabel?: string, confirm?: ConfirmOptions}} options
 * @returns {HTMLButtonElement}
 */
export function bigButton({
  text,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  ariaLabel,
  confirm,
}) {
  const button = /** @type {HTMLButtonElement} */ (
    el("button", {
      className: `btn btn-${variant}${size === "lg" ? " btn--lg" : ""}`,
      text,
      attrs: {
        type: "button",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        // يعلن للقارئات أن الضغط يفتح حوارًا لا أنه ينفّذ الفعل مباشرة
        ...(confirm ? { "aria-haspopup": "dialog" } : {}),
      },
      onClick: () => {
        if (disabled) return;
        if (!confirm) {
          onClick();
          return;
        }
        confirmAction({
          title: confirm.title,
          message: confirm.message,
          confirmLabel: confirm.confirmLabel,
          variant: variant === "danger" ? "danger" : "primary",
          triggerElement: button,
          onConfirm: onClick,
        });
      },
    })
  );
  button.disabled = disabled;
  return button;
}

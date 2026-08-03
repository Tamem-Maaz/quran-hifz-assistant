import { el } from "./dom.js";

/**
 * الزرّ الأساسي للتطبيق. الحجم `lg` (لا يقلّ عن 64px ارتفاعًا، القسم 6.2)
 * مخصَّص لأفعال المراحل التي تُضغط والعين على المصحف لا على الشاشة؛ وما
 * عداها من الأفعال الثانوية (إلغاء، فتح شاشة) يكفيه الحجم العادي (44px).
 * @param {{text:string, onClick:() => void, variant?: 'primary'|'secondary'|'danger'|'ghost', size?: 'md'|'lg', disabled?: boolean, ariaLabel?: string}} options
 * @returns {HTMLButtonElement}
 */
export function bigButton({ text, onClick, variant = "primary", size = "md", disabled = false, ariaLabel }) {
  const button = /** @type {HTMLButtonElement} */ (
    el("button", {
      className: `btn btn-${variant}${size === "lg" ? " btn--lg" : ""}`,
      text,
      attrs: { type: "button", ...(ariaLabel ? { "aria-label": ariaLabel } : {}) },
      onClick: () => {
        if (!disabled) onClick();
      },
    })
  );
  button.disabled = disabled;
  return button;
}

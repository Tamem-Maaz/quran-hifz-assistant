import { el } from "./dom.js";

/**
 * زر أساسي كبير (لا يقل عن 64px ارتفاعًا، القسم 6.2) لأفعال المراحل الرئيسية.
 * @param {{text:string, onClick:() => void, variant?: 'primary'|'secondary'|'danger', disabled?: boolean, ariaLabel?: string}} options
 * @returns {HTMLButtonElement}
 */
export function bigButton({ text, onClick, variant = "primary", disabled = false, ariaLabel }) {
  const button = /** @type {HTMLButtonElement} */ (
    el("button", {
      className: `btn btn-${variant}`,
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

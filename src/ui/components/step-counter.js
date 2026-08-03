import { el } from "./dom.js";
import { bigButton } from "./big-button.js";

/**
 * عدّاد خطوة (القسم 6.2): عرض العدّاد، شريط تقدّم اختياري عند وجود هدف، وزر
 * تراجع اختياري. لا قفل لإمكانية الزيادة حتى بعد بلوغ الهدف.
 * @param {{count:number, target?:number, onIncrement:() => void, onDecrement?:() => void, incrementLabel:string, progressLabel?:string}} options
 * @returns {HTMLElement}
 */
export function stepCounter({ count, target, onIncrement, onDecrement, incrementLabel, progressLabel }) {
  // dir="ltr" إلزامي: كسر "0 / 10" داخل سياق RTL يُعيد ترتيبها بصريًا إلى "10 / 0"
  // بلا عزل صريح لاتجاه الأرقام (خوارزمية Unicode Bidi على نص محايد بين رقمين).
  const display = el("div", {
    className: "step-counter__display",
    attrs: { "aria-live": "polite", dir: "ltr" },
    text: target ? `${count} / ${target}` : `${count}`,
  });

  const children = [];

  if (target) {
    const fill = el("div", { className: "progress-bar__fill" });
    fill.style.width = `${Math.min(100, (count / target) * 100)}%`;
    const track = el(
      "div",
      {
        className: "progress-bar",
        attrs: {
          role: "progressbar",
          "aria-label": progressLabel ?? incrementLabel,
          "aria-valuemin": "0",
          "aria-valuemax": String(target),
          "aria-valuenow": String(Math.min(count, target)),
        },
      },
      [fill]
    );
    children.push(track);
  }

  children.push(display);

  const actionButtons = [bigButton({ text: incrementLabel, onClick: onIncrement })];
  if (onDecrement) {
    actionButtons.push(
      bigButton({ text: "↶ تراجع", onClick: onDecrement, variant: "secondary", ariaLabel: "تراجع خطوة واحدة" })
    );
  }
  children.push(el("div", { className: "step-counter__actions" }, actionButtons));

  return el("div", { className: "step-counter" }, children);
}

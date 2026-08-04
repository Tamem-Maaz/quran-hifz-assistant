import { el } from "./dom.js";
import { bigButton } from "./big-button.js";
import { rosette } from "./icons.js";

/** فوق هذا العدد تصير الحصى صفًّا طويلًا لا يُقرأ بلمحة — فيحلّ محلّها شريط. */
const MAX_TALLY_MARKS = 30;

/**
 * عدّاد خطوة (القسم 6.2): عرض العدّاد، وتقدّم مرئي عند وجود هدف، وزر تراجع
 * اختياري. لا قفل لإمكانية الزيادة حتى بعد بلوغ الهدف.
 * @param {{count:number, target?:number, onIncrement:() => void, onDecrement?:() => void, incrementLabel:string, progressLabel?:string}} options
 * @returns {HTMLElement}
 */
export function stepCounter({ count, target, onIncrement, onDecrement, incrementLabel, progressLabel }) {
  // dir="ltr" إلزامي: كسر "0 / 10" داخل سياق RTL يُعيد ترتيبها بصريًا إلى "10 / 0"
  // بلا عزل صريح لاتجاه الأرقام (خوارزمية Unicode Bidi على نص محايد بين رقمين).
  const display = el("div", {
    className: "counter__display",
    attrs: { "aria-live": "polite", dir: "ltr" },
    text: target ? `${count} / ${target}` : `${count}`,
  });

  const children = [];

  if (target) {
    children.push(buildProgress(count, target, progressLabel ?? incrementLabel));
  }

  children.push(display);

  const actionButtons = [
    bigButton({
      text: incrementLabel,
      onClick: onIncrement,
      size: "lg",
      confirm: {
        title: `تأكيد: ${incrementLabel}؟`,
        message: incrementMessage(count, target),
        confirmLabel: `نعم، ${incrementLabel}`,
      },
    }),
  ];
  if (onDecrement) {
    actionButtons.push(
      bigButton({
        text: "تراجع",
        onClick: onDecrement,
        variant: "secondary",
        ariaLabel: "تراجع خطوة واحدة",
        confirm: {
          title: "تراجع عن آخر خطوة؟",
          message: `ينزل العدّاد من ${count} إلى ${Math.max(0, count - 1)}.`,
          confirmLabel: "نعم، تراجع",
        },
      })
    );
  }
  children.push(el("div", { className: "actions" }, actionButtons));

  return el("div", { className: "counter" }, children);
}

/**
 * نصّ التأكيد للزيادة: يذكر أثر الضغطة لا مجرّد إعادة صياغة الزرّ — إلى أي
 * رقم يصير العدّاد، وهل هذه الضغطة بالذات هي التي تُنهي المرحلة.
 * @param {number} count
 * @param {number} [target]
 * @returns {string}
 */
function incrementMessage(count, target) {
  const next = count + 1;
  if (!target) return "بهذه الضغطة تكتمل المرحلة وتنتقل إلى التالية.";
  if (next >= target) return `يصير العدّاد ${next} من ${target} — وبها تكتمل المرحلة وتنتقل إلى التالية.`;
  return `يصير العدّاد ${next} من ${target}.`;
}

/**
 * التقدّم نحو الهدف. الشكل الافتراضي حصى من علامات الأرباع: كل تكرار مُنجَز
 * يطبع علامةً ذهبية، فيُقرأ ما تبقّى بلمحة دون قراءة رقم — كما تُعدّ الأرباع
 * في هامش المصحف. الحاوية نفسها هي progressbar دلاليًا، والعلامات زخرفية.
 * @param {number} count
 * @param {number} target
 * @param {string} label
 * @returns {HTMLElement}
 */
function buildProgress(count, target, label) {
  const attrs = {
    role: "progressbar",
    "aria-label": label,
    "aria-valuemin": "0",
    "aria-valuemax": String(target),
    "aria-valuenow": String(Math.min(count, target)),
  };

  if (target > MAX_TALLY_MARKS) {
    const fill = el("div", { className: "progress__fill" });
    fill.style.inlineSize = `${Math.min(100, (count / target) * 100)}%`;
    return el("div", { className: "progress", attrs }, [fill]);
  }

  const marks = [];
  for (let index = 1; index <= target; index++) {
    const done = index <= count;
    const isLatest = done && index === count;
    marks.push(rosette(`tally__mark${done ? " tally__mark--done" : ""}${isLatest ? " tally__mark--last" : ""}`));
  }
  return el("div", { className: "tally", attrs }, marks);
}

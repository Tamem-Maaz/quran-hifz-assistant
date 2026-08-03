import { el } from "./dom.js";

/**
 * رأس بطاقة: عنوان فوقي اختياري يسمّي نوع البطاقة (بلون الذهب، كالعنوان
 * الجانبي في هامش المخطوطة)، ثم العنوان يتبعه خطّ شعري يمتدّ إلى حافة
 * البطاقة — إطار الصفحة بدل صندوق حول العنوان.
 * @param {string} title
 * @param {{eyebrow?:string, level?:'h1'|'h2'|'h3'}} [options]
 * @returns {HTMLElement}
 */
export function cardHead(title, { eyebrow, level = "h2" } = {}) {
  const head = el("div", { className: "card__head" }, [
    el(level, { text: title }),
    el("span", { className: "rule-fill" }),
  ]);
  if (!eyebrow) return head;
  return el("div", { className: "card__eyebrow" }, [el("p", { className: "eyebrow", text: eyebrow }), head]);
}

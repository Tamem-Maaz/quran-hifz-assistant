import { svgEl } from "./dom.js";

/**
 * العلامة الهندسية: نجمة ثمانية بنمط "رُبع الحزب" — علامة تقسيم الحفظ
 * التقليدية في هوامش المصحف. العنصر المميّز الوحيد للهوية البصرية.
 * @param {string} [className]
 * @returns {SVGElement}
 */
export function brandMark(className = "brand-mark") {
  return svgEl("svg", { viewBox: "0 0 100 100", class: className, "aria-hidden": "true", focusable: "false" }, [
    svgEl("polygon", {
      points:
        "50.00,8.00 56.70,33.83 79.70,20.30 66.17,43.30 92.00,50.00 66.17,56.70 79.70,79.70 56.70,66.17 50.00,92.00 43.30,66.17 20.30,79.70 33.83,56.70 8.00,50.00 33.83,43.30 20.30,20.30 43.30,33.83",
      fill: "currentColor",
    }),
  ]);
}

const STROKE_ATTRS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "1.8",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true",
  focusable: "false",
};

const ICON_BUILDERS = {
  "new-session": () =>
    svgEl("svg", STROKE_ATTRS, [
      svgEl("circle", { cx: "12", cy: "12", r: "9" }),
      svgEl("line", { x1: "12", y1: "8", x2: "12", y2: "16" }),
      svgEl("line", { x1: "8", y1: "12", x2: "16", y2: "12" }),
    ]),
  session: () =>
    svgEl("svg", STROKE_ATTRS, [
      svgEl("path", { d: "M4 5.5c2-1 5-1 7 1v13c-2-2-5-2-7-1v-13Z" }),
      svgEl("path", { d: "M20 5.5c-2-1-5-1-7 1v13c2-2 5-2 7-1v-13Z" }),
    ]),
  today: () =>
    svgEl("svg", STROKE_ATTRS, [
      svgEl("circle", { cx: "12", cy: "12", r: "4" }),
      svgEl("line", { x1: "12", y1: "2", x2: "12", y2: "5" }),
      svgEl("line", { x1: "12", y1: "19", x2: "12", y2: "22" }),
      svgEl("line", { x1: "2", y1: "12", x2: "5", y2: "12" }),
      svgEl("line", { x1: "19", y1: "12", x2: "22", y2: "12" }),
      svgEl("line", { x1: "4.9", y1: "4.9", x2: "7", y2: "7" }),
      svgEl("line", { x1: "17", y1: "17", x2: "19.1", y2: "19.1" }),
      svgEl("line", { x1: "4.9", y1: "19.1", x2: "7", y2: "17" }),
      svgEl("line", { x1: "17", y1: "7", x2: "19.1", y2: "4.9" }),
    ]),
  review: () =>
    svgEl("svg", STROKE_ATTRS, [
      svgEl("path", { d: "M4 12a8 8 0 0 1 14-5.3" }),
      svgEl("path", { d: "M20 12a8 8 0 0 1-14 5.3" }),
      svgEl("path", { d: "M18 3v4h-4" }),
      svgEl("path", { d: "M6 21v-4h4" }),
    ]),
  stats: () =>
    svgEl("svg", STROKE_ATTRS, [
      svgEl("line", { x1: "5", y1: "20", x2: "5", y2: "10" }),
      svgEl("line", { x1: "12", y1: "20", x2: "12", y2: "4" }),
      svgEl("line", { x1: "19", y1: "20", x2: "19", y2: "14" }),
    ]),
  maps: () =>
    svgEl("svg", STROKE_ATTRS, [
      svgEl("circle", { cx: "12", cy: "5", r: "2.2" }),
      svgEl("circle", { cx: "5", cy: "19", r: "2.2" }),
      svgEl("circle", { cx: "19", cy: "19", r: "2.2" }),
      svgEl("path", { d: "M12 7.2v4M12 11.2 6.3 17M12 11.2 17.7 17" }),
    ]),
  settings: () =>
    svgEl("svg", STROKE_ATTRS, [
      svgEl("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
      svgEl("circle", { cx: "9", cy: "6", r: "2" }),
      svgEl("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
      svgEl("circle", { cx: "15", cy: "12", r: "2" }),
      svgEl("line", { x1: "4", y1: "18", x2: "20", y2: "18" }),
      svgEl("circle", { cx: "11", cy: "18", r: "2" }),
    ]),
};

/**
 * @param {keyof typeof ICON_BUILDERS} name
 * @returns {SVGElement}
 */
export function navIcon(name) {
  return ICON_BUILDERS[name]();
}

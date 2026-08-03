import { el } from "./dom.js";
import { formatDayKeyLong } from "../format.js";

const CELLS_PER_WEEK = 7;

/**
 * @param {number} count
 * @returns {0|1|2|3}
 */
function bucketFor(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
}

/**
 * خريطة حرارية لأيام النشاط (القسم 10.2). الأسبوع الأقدم على أقصى اليمين
 * (بداية القراءة بالعربية)، والأحدث على أقصى اليسار.
 * @param {{dayKey:string, count:number}[]} days من الأقدم إلى الأحدث
 * @returns {HTMLElement}
 */
export function activityHeatmap(days) {
  const weeks = [];
  for (let i = 0; i < days.length; i += CELLS_PER_WEEK) {
    weeks.push(days.slice(i, i + CELLS_PER_WEEK));
  }

  const grid = el(
    "div",
    { className: "heatmap" },
    weeks.map((week) =>
      el(
        "div",
        { className: "heatmap__week" },
        week.map((day) =>
          el("div", {
            className: `heatmap__cell heatmap__cell--${bucketFor(day.count)}`,
            attrs: {
              role: "img",
              "aria-label":
                day.count > 0
                  ? `${formatDayKeyLong(day.dayKey)}: ${day.count} نشاط`
                  : `${formatDayKeyLong(day.dayKey)}: بلا نشاط`,
              title: `${day.dayKey} (${day.count})`,
            },
          })
        )
      )
    )
  );

  const legend = el("div", { className: "heatmap__legend" }, [
    el("span", { className: "muted", text: "أقل" }),
    el("div", { className: "heatmap__cell heatmap__cell--0" }),
    el("div", { className: "heatmap__cell heatmap__cell--1" }),
    el("div", { className: "heatmap__cell heatmap__cell--2" }),
    el("div", { className: "heatmap__cell heatmap__cell--3" }),
    el("span", { className: "muted", text: "أكثر" }),
  ]);

  const scrollContainer = el("div", { className: "heatmap-scroll" }, [grid]);

  // إظهار الأسبوع الأحدث (اليوم) افتراضيًا بدل الأقدم — سلوك تمرير RTL يختلف
  // بين المتصفحات، فـ scrollIntoView أكثر موثوقية من ضبط scrollLeft يدويًا.
  requestAnimationFrame(() => {
    const lastWeek = grid.lastElementChild;
    lastWeek?.scrollIntoView({ inline: "end", block: "nearest" });
  });

  return el("div", { className: "heatmap-wrapper" }, [scrollContainer, legend]);
}

/**
 * الخرائط الذهنية (القسم 4 و21). صور ثابتة من docs/maps — تحميل كسول
 * وwidth/height صريحان لمنع القفز أثناء التحميل (القسم 13.4).
 */

import { el, clear } from "../components/dom.js";
import { openImageLightbox } from "../components/lightbox.js";

/** @typedef {import('../store.js').AppContext} AppContext */

/**
 * @param {HTMLElement} container
 * @param {AppContext} ctx
 */
export function render(container, ctx) {
  const { maps, surahs } = ctx;

  const intro = el("p", {
    className: "muted",
    text: `متوفرة حاليًا لـ ${maps.length} من 114 سورة — تُضاف الباقي تباعًا. اضغط أي خريطة لتكبيرها.`,
  });

  const grid = el(
    "div",
    { className: "maps-grid" },
    maps.map((m) => {
      const surah = surahs.find((s) => s.id === m.surah);
      const name = surah ? surah.name : `سورة ${m.surah}`;
      const src = `docs/maps/${encodeURIComponent(m.fileName)}`;
      const alt = `الخريطة الذهنية لسورة ${name}`;
      const img = el("img", {
        attrs: { src, alt, loading: "lazy", width: String(m.width), height: String(m.height) },
      });
      const thumbButton = el(
        "button",
        {
          className: "map-thumb-button",
          attrs: { type: "button", "aria-label": `تكبير الخريطة الذهنية لسورة ${name}` },
          onClick: () => openImageLightbox({ src, alt, triggerElement: thumbButton }),
        },
        [img]
      );
      return el("figure", {}, [thumbButton, el("figcaption", { text: `${m.surah}. ${name}` })]);
    })
  );

  clear(container);
  container.append(
    el("div", { className: "view view-maps" }, [el("h1", { text: "الخرائط الذهنية" }), intro, grid])
  );
}

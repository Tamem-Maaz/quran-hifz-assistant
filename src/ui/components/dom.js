/**
 * منشئ عناصر DOM بسيط. نص المحتوى دائمًا عبر textContent أو createTextNode —
 * ممنوع innerHTML نهائيًا (القسم 14 من خطة المشروع).
 */

/**
 * @param {string} tag
 * @param {{className?:string, text?:string, attrs?:Record<string,string>, onClick?:(e:MouseEvent)=>void}} [options]
 * @param {(Node|string)[]} [children]
 * @returns {HTMLElement}
 */
export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) node.setAttribute(key, value);
  }
  if (options.onClick) node.addEventListener("click", options.onClick);
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

/**
 * يفرّغ حاوية دون innerHTML.
 * @param {HTMLElement} container
 */
export function clear(container) {
  while (container.firstChild) container.removeChild(container.firstChild);
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * منشئ عناصر SVG — عناصر SVG تحتاج createElementNS، لا createElement
 * العادي (وإلا لا تُعرَض). كل الأيقونات في التطبيق تُبنى بهذا بدل innerHTML.
 * @param {string} tag
 * @param {Record<string,string>} [attrs]
 * @param {SVGElement[]} [children]
 * @returns {SVGElement}
 */
export function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  for (const child of children) node.append(child);
  return node;
}

/**
 * مخزن حالة بسيط فوق `storage/repository.js`: يحتفظ بنسخة في الذاكرة، يحفظ عبر
 * المستودع عند كل تغيير، ويُخطر المشتركين (الشاشات) لإعادة الرسم.
 */

/** @typedef {import('../core/types.js').AppState} AppState */
/** @typedef {import('../storage/repository.js').Repository} Repository */

/**
 * @typedef {Object} Store
 * @property {() => AppState} getState
 * @property {(state: AppState) => void} setState
 * @property {(listener: (state: AppState) => void) => () => void} subscribe
 */

/**
 * سياق مشترك يُمرَّر لكل شاشة: المخزن، بيانات السور، ودالة الوقت الحالي
 * (بدل `Date.now()` مباشرة داخل الشاشات، لتبقى قابلة للاختبار لاحقًا).
 * @typedef {Object} AppContext
 * @property {Store} store
 * @property {{id:number, name:string, ayahCount:number, type:string, juz:number[]}[]} surahs
 * @property {{surah:number, fileName:string, width:number, height:number}[]} maps
 * @property {() => number} now
 */

/**
 * @param {Repository} repository
 * @param {number} now
 * @returns {Store}
 */
export function createStore(repository, now) {
  let state = repository.load(now);
  const listeners = new Set();

  /** @returns {AppState} */
  function getState() {
    return state;
  }

  /**
   * @param {AppState} nextState
   */
  function setState(nextState) {
    state = nextState;
    repository.save(state);
    for (const listener of listeners) listener(state);
  }

  /**
   * @param {(state: AppState) => void} listener
   * @returns {() => void}
   */
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, setState, subscribe };
}

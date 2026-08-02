/**
 * الواجهة العامة للتخزين. طبقة `ui/` لا تستدعي `local-storage.js` مباشرة —
 * هذا هو العقد الذي يسمح بالانتقال إلى IndexedDB لاحقًا بتعديل هذا الملف فقط.
 */

import { loadState, saveState } from "./local-storage.js";

/** @typedef {import('../core/types.js').AppState} AppState */

/**
 * @typedef {Object} Repository
 * @property {(now: number) => AppState} load
 * @property {(state: AppState) => void} save
 * @property {(listener: (state: AppState) => void) => () => void} subscribe
 */

/**
 * @returns {Repository}
 */
export function createRepository() {
  const listeners = new Set();

  /** @param {number} now */
  function load(now) {
    return loadState(now);
  }

  /** @param {AppState} state */
  function save(state) {
    saveState(state);
    for (const listener of listeners) listener(state);
  }

  /** @param {(state: AppState) => void} listener */
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { load, save, subscribe };
}

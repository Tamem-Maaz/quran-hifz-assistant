/** بديل بسيط لـ `localStorage` للاختبارات في Node (القسم 16، طبقة storage). */
export class MemoryStorage {
  #store = new Map();
  #quotaBytes = Infinity;

  /** @param {number} [quotaBytes] */
  constructor(quotaBytes) {
    if (quotaBytes !== undefined) this.#quotaBytes = quotaBytes;
  }

  get length() {
    return this.#store.size;
  }

  key(index) {
    return [...this.#store.keys()][index] ?? null;
  }

  getItem(key) {
    return this.#store.has(key) ? this.#store.get(key) : null;
  }

  setItem(key, value) {
    const stringValue = String(value);
    const projectedSize = [...this.#store.entries()]
      .filter(([k]) => k !== key)
      .reduce((sum, [k, v]) => sum + k.length + v.length, 0) + key.length + stringValue.length;
    if (projectedSize > this.#quotaBytes) {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    }
    this.#store.set(key, stringValue);
  }

  removeItem(key) {
    this.#store.delete(key);
  }

  clear() {
    this.#store.clear();
  }
}

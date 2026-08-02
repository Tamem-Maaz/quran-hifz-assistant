/**
 * نقطة الدخول. المرحلة الحالية (1: الأساس) تكتفي بربط storage/ بـ core/ والتحقق
 * من عمل الأنبوب كاملًا — التوجيه والواجهة الفعلية (المراحل الست، لوحة اليوم) تُبنى
 * في المرحلة 2.
 */

import { createRepository } from "./storage/repository.js";
import { toDayKey } from "./core/dates.js";
import { countCompletedSessions } from "./core/statistics.js";

const repository = createRepository();
const now = Date.now();
const todayKey = toDayKey(new Date(now));
const state = repository.load(now);

const app = document.getElementById("app");
if (!app) {
  throw new Error("عنصر #app غير موجود في index.html");
}

const heading = document.createElement("h1");
heading.textContent = "المساعد بحفظ القرآن الكريم";

const status = document.createElement("p");
status.textContent = `اليوم: ${todayKey} — الجلسات المكتملة: ${countCompletedSessions(state.sessions)}`;

app.append(heading, status);

// ---------- Design tokens ----------
export const C = {
  ink: '#1B2B4B',
  inkSoft: '#3A4A6B',
  paper: '#FAF9F5',
  paperDeep: '#F1EEE6',
  line: '#E4E0D6',
  sage: '#4F7C6C',
  sageBg: '#E7EFEA',
  amber: '#C98A3E',
  amberBg: '#F6EBDA',
  coral: '#B5555C',
  coralBg: '#F5E4E3',
  violet: '#6E5C93',
  violetBg: '#EDE8F3',
};
export const DOCTOR_COLORS = [C.violet, C.sage, C.amber, C.coral];

export const DAYS_RO = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
export const MONTHS_RO = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
export const DAY_LABEL = { 1: 'Luni', 2: 'Marți', 3: 'Miercuri', 4: 'Joi', 5: 'Vineri', 6: 'Sâmbătă', 0: 'Duminică' };
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const DEFAULT_HOURS = {
  1: { enabled: true, start: '09:00', end: '17:00', slot: 20, breakStart: '13:00', breakEnd: '14:00' },
  2: { enabled: true, start: '09:00', end: '17:00', slot: 20, breakStart: '13:00', breakEnd: '14:00' },
  3: { enabled: true, start: '09:00', end: '17:00', slot: 20, breakStart: '13:00', breakEnd: '14:00' },
  4: { enabled: true, start: '09:00', end: '17:00', slot: 20, breakStart: '13:00', breakEnd: '14:00' },
  5: { enabled: true, start: '09:00', end: '15:00', slot: 20, breakStart: '', breakEnd: '' },
  6: { enabled: false, start: '09:00', end: '13:00', slot: 20, breakStart: '', breakEnd: '' },
  0: { enabled: false, start: '09:00', end: '13:00', slot: 20, breakStart: '', breakEnd: '' },
};

export function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return `${DAYS_RO[d.getDay()]}, ${d.getDate()} ${MONTHS_RO[d.getMonth()]} ${d.getFullYear()}`;
}
export function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return `${d.getDate()} ${MONTHS_RO[d.getMonth()]}`;
}
export function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
export function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
export function minToTime(m) {
  const h = Math.floor(m / 60), mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
export function rangesOverlap(t1, d1, t2, d2) {
  const s1 = timeToMin(t1), e1 = s1 + Number(d1 || 30);
  const s2 = timeToMin(t2), e2 = s2 + Number(d2 || 30);
  return s1 < e2 && e1 > s2;
}
export function summarizeWorkingHours(wh) {
  return DAY_ORDER.map((d) => {
    const c = wh[d];
    if (!c || !c.enabled) return `${DAY_LABEL[d]}: închis`;
    return `${DAY_LABEL[d]}: ${c.start}-${c.end}${c.breakStart && c.breakEnd ? ` (pauză ${c.breakStart}-${c.breakEnd})` : ''}`;
  }).join(', ');
}

// dateStr, workingHoursForDay (object keyed 0-6), blockedDates (array for this doctor), appointments (array for this doctor)
export function getAvailableSlots(dateStr, workingHours, blockedDates, appointments, excludeId) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  const cfg = workingHours[dow];
  if (!cfg || !cfg.enabled) return [];
  const blocked = blockedDates.find((b) => b.date === dateStr);
  if (blocked && blocked.all_day) return [];
  const startMin = timeToMin(cfg.start);
  const endMin = timeToMin(cfg.end);
  const slotLen = cfg.slot || 20;
  const busy = appointments
    .filter((a) => a.date === dateStr && a.status !== 'cancelled' && a.id !== excludeId)
    .map((a) => ({ start: timeToMin(a.time), end: timeToMin(a.time) + Number(a.duration || 30) }));
  if (blocked && !blocked.all_day && blocked.start_time && blocked.end_time) {
    busy.push({ start: timeToMin(blocked.start_time), end: timeToMin(blocked.end_time) });
  }
  if (cfg.breakStart && cfg.breakEnd) {
    busy.push({ start: timeToMin(cfg.breakStart), end: timeToMin(cfg.breakEnd) });
  }
  const nowMin = dateStr === getTodayStr() ? new Date().getHours() * 60 + new Date().getMinutes() : -1;
  const slots = [];
  for (let t = startMin; t + slotLen <= endMin; t += slotLen) {
    if (t < nowMin) continue;
    const overlaps = busy.some((r) => t < r.end && t + slotLen > r.start);
    if (!overlaps) slots.push(minToTime(t));
  }
  return slots;
}

export function stripFences(text) {
  return text.replace(/```json/gi, '').replace(/```/g, '').trim();
}

// Calls our own serverless function, which holds the Anthropic key server-side.
export async function callAssistant(system, messages) {
  const res = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages }),
  });
  if (!res.ok) throw new Error('assistant request failed');
  const data = await res.json();
  return data.text || '';
}

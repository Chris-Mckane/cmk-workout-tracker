// All date, duration and timer maths. Dates are local "YYYY-MM-DD" strings (never UTC);
// datetimes are ISO strings; timer stamps are epoch milliseconds.

const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 86400000;
const pad = n => String(n).padStart(2, '0');

export const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => localDate();

export function parseDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, n) {
  const d = parseDate(date);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

// Weeks run Monday to Sunday.
export const weekStart = date => addDays(date, -((parseDate(date).getDay() + 6) % 7));

// Every date from `from` to `to`, both included.
export function datesBetween(from, to) {
  const dates = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  return dates;
}

export const monthStart = date => `${date.slice(0, 8)}01`;
export function monthEnd(date) {
  const d = parseDate(date);
  return localDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
export function addMonths(date, n) {
  const d = parseDate(date);
  return localDate(new Date(d.getFullYear(), d.getMonth() + n, 1));
}
export function monthLabel(date) {
  const d = parseDate(date);
  return `${FULL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function weekLabel(start) {
  const a = parseDate(start), b = parseDate(addDays(start, 6));
  const dayMonth = d => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const from = a.getFullYear() !== b.getFullYear() ? `${dayMonth(a)} ${a.getFullYear()}`
    : a.getMonth() !== b.getMonth() ? dayMonth(a) : a.getDate();
  return `${from} to ${dayMonth(b)} ${b.getFullYear()}`;
}

export function fmtDay(date, withYear = false) {
  const d = parseDate(date);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
}

// ISO datetime <-> the local "YYYY-MM-DDTHH:MM" value of a datetime-local input.
export function toInput(iso) {
  const d = new Date(iso);
  return `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const fromInput = value => new Date(value).toISOString();

export const dateOfIso = iso => localDate(new Date(iso));
export const fmtTime = iso => toInput(iso).slice(11);
export const fmtDateTime = iso => `${fmtDay(dateOfIso(iso))}, ${fmtTime(iso)}`;

export const secondsBetween = (startIso, endIso) => Math.max(0, Math.round((new Date(endIso) - new Date(startIso)) / 1000));
export const daysSince = (iso, now = Date.now()) => iso ? (now - new Date(iso)) / DAY_MS : Infinity;

export function fmtHM(sec) {
  const minutes = Math.floor(sec / 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function fmtClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

// Workout timer: accumulated seconds plus the current run, measured from its start stamp.
export const elapsedSec = (active, now = Date.now()) =>
  Math.floor(active.timerAccumSec + (active.timerStartedAt ? (now - active.timerStartedAt) / 1000 : 0));

export const restLeftSec = (restEndsAt, now = Date.now()) =>
  restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0;

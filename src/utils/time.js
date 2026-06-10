export const MAURITIUS_TIME_ZONE = 'Indian/Mauritius';

function pad(value) {
  return String(value).padStart(2, '0');
}

export function mauritiusNowDate() {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: MAURITIUS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return new Date(Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second || 0),
    0,
  ));
}

export function parseAppDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s)(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, y, mo, d, h, mi, se] = match;
    return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se || 0), 0));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatInput(value = mauritiusNowDate()) {
  const d = parseAppDate(value) || mauritiusNowDate();
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function todayInput() {
  return formatInput().slice(0, 10);
}

export function formatDateTime(value, withSeconds = true) {
  const d = parseAppDate(value);
  if (!d) return value || '-';
  const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return withSeconds ? `${base}:${pad(d.getUTCSeconds())}` : base;
}

export function dateParts(value) {
  const d = parseAppDate(value);
  if (!d) return { date: '-', time: '-', day: '-', month: '-', year: '-' };
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
    day: pad(d.getUTCDate()),
    month: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`,
    year: `${d.getUTCFullYear()}`,
  };
}

export function secondsBetween(startValue, endValue, nowOverride = null) {
  const start = parseAppDate(startValue);
  const end = parseAppDate(endValue) || parseAppDate(nowOverride) || mauritiusNowDate();
  return start ? Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000)) : 0;
}

export function durationLabel(seconds) {
  let s = Math.max(0, Math.floor(Number(seconds || 0)));
  const d = Math.floor(s / 86400);
  s %= 86400;
  const h = Math.floor(s / 3600);
  s %= 3600;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return d ? `${d}d ${h}h ${m}m ${sec}s` : `${h}h ${m}m ${sec}s`;
}

export function monthKey(value) {
  const d = parseAppDate(value) || mauritiusNowDate();
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function dayKey(value) {
  const d = parseAppDate(value) || mauritiusNowDate();
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function weekKey(value) {
  const d = parseAppDate(value) || mauritiusNowDate();
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diff = Math.floor((d.getTime() - first.getTime()) / 86400000);
  return `${d.getUTCFullYear()}-W${pad(Math.ceil((diff + first.getUTCDay() + 1) / 7))}`;
}

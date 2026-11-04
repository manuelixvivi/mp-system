/**
 * Time utility module for MP Control System
 * Guarantees all date and time calculations strictly use Waktu Indonesia Barat (WIB, UTC+7, Asia/Jakarta)
 * independent of client/server local machine timezone or clock manipulation.
 */

export interface WibDateTimeParts {
  year: number;
  month: number; // 1 - 12
  day: number; // 1 - 31
  hours: number; // 0 - 23
  minutes: number; // 0 - 59
  seconds: number; // 0 - 59
  isoDate: string; // "YYYY-MM-DD"
  timeStr: string; // "HH:mm:ss"
  displayStr: string; // "HH:mm:ss WIB"
  isoString: string; // "YYYY-MM-DDTHH:mm:ss+07:00"
}

/**
 * Extracts date and time components strictly in Asia/Jakarta (WIB) timezone
 */
export function getWibParts(date: Date = new Date()): WibDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  const hours = parseInt(map.hour, 10);
  const minutes = parseInt(map.minute, 10);
  const seconds = parseInt(map.second, 10);

  const pad = (n: number) => String(n).padStart(2, '0');
  const isoDate = `${year}-${pad(month)}-${pad(day)}`;
  const timeStr = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    isoDate,
    timeStr,
    displayStr: `${timeStr} WIB`,
    isoString: `${isoDate}T${timeStr}+07:00`,
  };
}

/**
 * Returns today's ISO date string ("YYYY-MM-DD") in WIB
 */
export function getWibIsoDate(date: Date = new Date()): string {
  return getWibParts(date).isoDate;
}

/**
 * Returns current time string ("HH:mm:ss") in WIB
 */
export function getWibTimeString(date: Date = new Date()): string {
  return getWibParts(date).timeStr;
}

/**
 * Returns current timestamp in epoch milliseconds
 */
export function getWibTimestamp(date: Date = new Date()): number {
  return date.getTime();
}

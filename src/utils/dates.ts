// Apple Core Data uses a different epoch: January 1, 2001 00:00:00 UTC
// Unix epoch: January 1, 1970 00:00:00 UTC
// Difference: 978307200 seconds

const CORE_DATA_EPOCH_OFFSET = 978307200;

/**
 * Convert Core Data timestamp to JavaScript Date
 */
export function coreDataToDate(coreDataTimestamp: number): Date {
  const unixTimestamp = coreDataTimestamp + CORE_DATA_EPOCH_OFFSET;
  return new Date(unixTimestamp * 1000);
}

/**
 * Convert Core Data timestamp to ISO 8601 string with local timezone offset
 */
export function coreDataToISO(coreDataTimestamp: number): string {
  const date = coreDataToDate(coreDataTimestamp);
  return toLocalISOString(date);
}

/**
 * Format a Date as ISO 8601 string with local timezone offset
 * e.g., "2026-01-07T14:02:00.751-08:00" instead of "2026-01-07T22:02:00.751Z"
 */
function toLocalISOString(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const absOffset = Math.abs(offset);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const minutes = String(absOffset % 60).padStart(2, "0");

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}${sign}${hours}:${minutes}`;
}

/**
 * Convert JavaScript Date to Core Data timestamp
 */
export function dateToCoreData(date: Date): number {
  const unixTimestamp = Math.floor(date.getTime() / 1000);
  return unixTimestamp - CORE_DATA_EPOCH_OFFSET;
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

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
 * Convert Core Data timestamp to ISO 8601 string
 */
export function coreDataToISO(coreDataTimestamp: number): string {
  return coreDataToDate(coreDataTimestamp).toISOString();
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

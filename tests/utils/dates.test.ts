import { describe, it, expect } from "vitest";
import {
  coreDataToDate,
  coreDataToISO,
  dateToCoreData,
  formatDuration,
} from "../../src/utils/dates.js";

describe("dates utility", () => {
  describe("coreDataToDate", () => {
    it("should convert Core Data timestamp to JavaScript Date", () => {
      // Core Data timestamp 0 = Jan 1, 2001 00:00:00 UTC
      const date = coreDataToDate(0);
      expect(date.toISOString()).toBe("2001-01-01T00:00:00.000Z");
    });

    it("should handle a known timestamp", () => {
      // 757382400 seconds after Jan 1, 2001 = Jan 1, 2025 00:00:00 UTC
      const date = coreDataToDate(757382400);
      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(0); // January
      expect(date.getUTCDate()).toBe(1);
    });
  });

  describe("coreDataToISO", () => {
    it("should return an ISO 8601 string with timezone offset", () => {
      const iso = coreDataToISO(0);
      // Should be in format: YYYY-MM-DDTHH:mm:ss.sss+HH:MM or -HH:MM
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
      // Parsing it back should give the correct UTC time (Jan 1, 2001 00:00:00 UTC)
      const parsed = new Date(iso);
      expect(parsed.toISOString()).toBe("2001-01-01T00:00:00.000Z");
    });

    it("should represent the correct point in time", () => {
      const timestamp = 757382400; // Jan 1, 2025 00:00:00 UTC
      const iso = coreDataToISO(timestamp);
      const parsed = new Date(iso);
      expect(parsed.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    });
  });

  describe("dateToCoreData", () => {
    it("should be the inverse of coreDataToDate", () => {
      const originalTimestamp = 757382400;
      const date = coreDataToDate(originalTimestamp);
      const convertedBack = dateToCoreData(date);
      expect(convertedBack).toBe(originalTimestamp);
    });
  });

  describe("formatDuration", () => {
    it("should format seconds only", () => {
      expect(formatDuration(45)).toBe("0:45");
    });

    it("should format minutes and seconds", () => {
      expect(formatDuration(125)).toBe("2:05");
    });

    it("should format hours, minutes, and seconds", () => {
      expect(formatDuration(3665)).toBe("1:01:05");
    });

    it("should handle zero", () => {
      expect(formatDuration(0)).toBe("0:00");
    });
  });
});

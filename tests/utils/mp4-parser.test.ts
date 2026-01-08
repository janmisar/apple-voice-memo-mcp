import { describe, it, expect } from "vitest";
import { parseTsrpToText, parseTsrpToSegments } from "../../src/utils/mp4-parser.js";
import type { TsrpData } from "../../src/types/index.js";

describe("mp4-parser utility", () => {
  const mockTsrpData: TsrpData = {
    attributedString: {
      attributeTable: [
        { timeRange: [0.0, 0.5] },
        { timeRange: [0.5, 1.0] },
        { timeRange: [1.0, 1.5] },
      ],
      runs: ["Hello", 0, " ", 1, "World", 2],
    },
    locale: {
      identifier: "en_US",
      current: 0,
    },
  };

  describe("parseTsrpToText", () => {
    it("should extract text from tsrp data", () => {
      const text = parseTsrpToText(mockTsrpData);
      expect(text).toBe("Hello World");
    });

    it("should handle empty runs", () => {
      const emptyData: TsrpData = {
        attributedString: {
          attributeTable: [],
          runs: [],
        },
        locale: { identifier: "en_US", current: 0 },
      };
      expect(parseTsrpToText(emptyData)).toBe("");
    });
  });

  describe("parseTsrpToSegments", () => {
    it("should extract timestamped segments from tsrp data", () => {
      const segments = parseTsrpToSegments(mockTsrpData);

      expect(segments).toHaveLength(3);
      expect(segments[0]).toEqual({ text: "Hello", start: 0.0, end: 0.5 });
      expect(segments[1]).toEqual({ text: " ", start: 0.5, end: 1.0 });
      expect(segments[2]).toEqual({ text: "World", start: 1.0, end: 1.5 });
    });

    it("should handle empty data", () => {
      const emptyData: TsrpData = {
        attributedString: {
          attributeTable: [],
          runs: [],
        },
        locale: { identifier: "en_US", current: 0 },
      };
      expect(parseTsrpToSegments(emptyData)).toEqual([]);
    });
  });
});

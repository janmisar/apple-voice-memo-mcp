import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../../src/utils/paths.js", () => ({
  getAudioFilePath: vi.fn(),
}));

vi.mock("../../src/utils/mp4-parser.js", () => ({
  extractTsrpAtom: vi.fn(),
  parseTsrpToText: vi.fn(),
  parseTsrpToSegments: vi.fn(),
}));

import { TranscriptExtractor } from "../../src/services/transcript-extractor.js";
import { getAudioFilePath } from "../../src/utils/paths.js";
import {
  extractTsrpAtom,
  parseTsrpToText,
  parseTsrpToSegments,
} from "../../src/utils/mp4-parser.js";
import type { TsrpData } from "../../src/types/index.js";

const mockedGetAudioFilePath = vi.mocked(getAudioFilePath);
const mockedExtractTsrpAtom = vi.mocked(extractTsrpAtom);
const mockedParseTsrpToText = vi.mocked(parseTsrpToText);
const mockedParseTsrpToSegments = vi.mocked(parseTsrpToSegments);

describe("TranscriptExtractor", () => {
  const mockTsrpData: TsrpData = {
    attributedString: {
      attributeTable: [
        { timeRange: [0.0, 1.0] },
        { timeRange: [1.0, 2.0] },
      ],
      runs: ["Hello", 0, " World", 1],
    },
    locale: {
      identifier: "en_US",
      current: 0,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAudioFilePath.mockReturnValue("/path/to/memo.m4a");
    mockedExtractTsrpAtom.mockReturnValue(mockTsrpData);
    mockedParseTsrpToText.mockReturnValue("Hello World");
    mockedParseTsrpToSegments.mockReturnValue([
      { text: "Hello", start: 0.0, end: 1.0 },
      { text: " World", start: 1.0, end: 2.0 },
    ]);
  });

  describe("extractTranscript", () => {
    it("should return text format by default", () => {
      const extractor = new TranscriptExtractor();
      const result = extractor.extractTranscript("memo.m4a");

      expect(result).toEqual({
        text: "Hello World",
        locale: "en_US",
      });
      expect(mockedParseTsrpToSegments).not.toHaveBeenCalled();
    });

    it("should return text format explicitly", () => {
      const extractor = new TranscriptExtractor();
      const result = extractor.extractTranscript("memo.m4a", "text");

      expect(result).toEqual({
        text: "Hello World",
        locale: "en_US",
      });
    });

    it("should return timestamped format with segments", () => {
      const extractor = new TranscriptExtractor();
      const result = extractor.extractTranscript("memo.m4a", "timestamped");

      expect(result).toEqual({
        text: "Hello World",
        segments: [
          { text: "Hello", start: 0.0, end: 1.0 },
          { text: " World", start: 1.0, end: 2.0 },
        ],
        locale: "en_US",
      });
    });

    it("should return json format with segments", () => {
      const extractor = new TranscriptExtractor();
      const result = extractor.extractTranscript("memo.m4a", "json");

      expect(result).toEqual({
        text: "Hello World",
        segments: [
          { text: "Hello", start: 0.0, end: 1.0 },
          { text: " World", start: 1.0, end: 2.0 },
        ],
        locale: "en_US",
      });
    });

    it("should return null when audio file not found", () => {
      mockedGetAudioFilePath.mockReturnValue(null);

      const extractor = new TranscriptExtractor();
      const result = extractor.extractTranscript("nonexistent.m4a");

      expect(result).toBeNull();
    });

    it("should return null when no tsrp atom found", () => {
      mockedExtractTsrpAtom.mockReturnValue(null);

      const extractor = new TranscriptExtractor();
      const result = extractor.extractTranscript("memo.m4a");

      expect(result).toBeNull();
    });

    it("should handle empty locale identifier", () => {
      const tsrpWithEmptyLocale: TsrpData = {
        attributedString: {
          attributeTable: [],
          runs: ["Test"],
        },
        locale: {
          identifier: "",
          current: 0,
        },
      };
      mockedExtractTsrpAtom.mockReturnValue(tsrpWithEmptyLocale);
      mockedParseTsrpToText.mockReturnValue("Test");

      const extractor = new TranscriptExtractor();
      const result = extractor.extractTranscript("memo.m4a");

      // Empty string is falsy, so falls back to "unknown"
      expect(result?.locale).toBe("unknown");
    });

    it("should handle undefined locale gracefully", () => {
      const tsrpWithUndefinedLocale = {
        attributedString: {
          attributeTable: [],
          runs: ["Test"],
        },
        locale: undefined,
      } as unknown as TsrpData;
      mockedExtractTsrpAtom.mockReturnValue(tsrpWithUndefinedLocale);
      mockedParseTsrpToText.mockReturnValue("Test");

      const extractor = new TranscriptExtractor();
      const result = extractor.extractTranscript("memo.m4a");

      expect(result?.locale).toBe("unknown");
    });
  });

  describe("extractTranscriptById", () => {
    it("should delegate to extractTranscript", () => {
      const extractor = new TranscriptExtractor();
      const result = extractor.extractTranscriptById(1, "memo.m4a", "json");

      expect(result).toEqual({
        text: "Hello World",
        segments: [
          { text: "Hello", start: 0.0, end: 1.0 },
          { text: " World", start: 1.0, end: 2.0 },
        ],
        locale: "en_US",
      });
    });

    it("should use text format by default", () => {
      const extractor = new TranscriptExtractor();
      const result = extractor.extractTranscriptById(1, "memo.m4a");

      expect(result).toEqual({
        text: "Hello World",
        locale: "en_US",
      });
    });
  });
});

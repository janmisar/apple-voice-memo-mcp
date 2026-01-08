import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTranscript,
  getTranscriptSchema,
} from "../../src/tools/get-transcript.js";
import { VoiceMemoDatabase } from "../../src/services/voice-memo-db.js";
import { TranscriptExtractor } from "../../src/services/transcript-extractor.js";

describe("get-transcript tool", () => {
  let mockDb: VoiceMemoDatabase;
  let mockExtractor: TranscriptExtractor;

  beforeEach(() => {
    mockDb = {
      getMemo: vi.fn(),
    } as unknown as VoiceMemoDatabase;

    mockExtractor = {
      extractTranscript: vi.fn(),
    } as unknown as TranscriptExtractor;
  });

  describe("getTranscriptSchema", () => {
    it("should require id", () => {
      const result = getTranscriptSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should accept valid id", () => {
      const result = getTranscriptSchema.safeParse({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("should accept format text", () => {
      const result = getTranscriptSchema.safeParse({ id: 1, format: "text" });
      expect(result.success).toBe(true);
    });

    it("should accept format json", () => {
      const result = getTranscriptSchema.safeParse({ id: 1, format: "json" });
      expect(result.success).toBe(true);
    });

    it("should accept format timestamped", () => {
      const result = getTranscriptSchema.safeParse({
        id: 1,
        format: "timestamped",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid format", () => {
      const result = getTranscriptSchema.safeParse({
        id: 1,
        format: "markdown",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("getTranscript function", () => {
    it("should return text format by default", async () => {
      const mockMemo = {
        id: 1,
        title: "Recording 1",
        customLabel: "My Meeting",
        date: "2025-01-01T10:00:00.000-08:00",
        duration: 60,
        path: "memo1.m4a",
        fullPath: "/path/to/memo1.m4a",
        hasTranscript: true,
      };

      vi.mocked(mockDb.getMemo).mockReturnValue(mockMemo);
      vi.mocked(mockExtractor.extractTranscript).mockReturnValue({
        text: "Hello world",
        locale: "en_US",
      });

      const result = await getTranscript({ id: 1 }, mockDb, mockExtractor);
      const parsed = JSON.parse(result);

      expect(parsed.id).toBe(1);
      expect(parsed.title).toBe("My Meeting");
      expect(parsed.text).toBe("Hello world");
      expect(parsed.locale).toBe("en_US");
      expect(parsed.segments).toBeUndefined();
    });

    it("should return segments for json format", async () => {
      const mockMemo = {
        id: 1,
        title: "Recording 1",
        customLabel: null,
        date: "2025-01-01T10:00:00.000-08:00",
        duration: 60,
        path: "memo1.m4a",
        fullPath: "/path/to/memo1.m4a",
        hasTranscript: true,
      };

      vi.mocked(mockDb.getMemo).mockReturnValue(mockMemo);
      vi.mocked(mockExtractor.extractTranscript).mockReturnValue({
        text: "Hello world",
        segments: [
          { text: "Hello", start: 0, end: 0.5 },
          { text: " world", start: 0.5, end: 1.0 },
        ],
        locale: "en_US",
      });

      const result = await getTranscript(
        { id: 1, format: "json" },
        mockDb,
        mockExtractor
      );
      const parsed = JSON.parse(result);

      expect(parsed.text).toBe("Hello world");
      expect(parsed.segments).toHaveLength(2);
      expect(parsed.segments[0]).toEqual({ text: "Hello", start: 0, end: 0.5 });
    });

    it("should return segments for timestamped format", async () => {
      const mockMemo = {
        id: 1,
        title: "Recording 1",
        customLabel: null,
        date: "2025-01-01T10:00:00.000-08:00",
        duration: 60,
        path: "memo1.m4a",
        fullPath: "/path/to/memo1.m4a",
        hasTranscript: true,
      };

      vi.mocked(mockDb.getMemo).mockReturnValue(mockMemo);
      vi.mocked(mockExtractor.extractTranscript).mockReturnValue({
        text: "Hello world",
        segments: [{ text: "Hello world", start: 0, end: 1.0 }],
        locale: "en_US",
      });

      const result = await getTranscript(
        { id: 1, format: "timestamped" },
        mockDb,
        mockExtractor
      );
      const parsed = JSON.parse(result);

      expect(parsed.segments).toBeDefined();
    });

    it("should return error when memo not found", async () => {
      vi.mocked(mockDb.getMemo).mockReturnValue(null);

      const result = await getTranscript({ id: 999 }, mockDb, mockExtractor);
      const parsed = JSON.parse(result);

      expect(parsed.error).toBe("Voice memo with ID 999 not found");
    });

    it("should return error when transcript not available", async () => {
      const mockMemo = {
        id: 1,
        title: "Recording 1",
        customLabel: null,
        date: "2025-01-01T10:00:00.000-08:00",
        duration: 60,
        path: "memo1.m4a",
        fullPath: "/path/to/memo1.m4a",
        hasTranscript: false,
      };

      vi.mocked(mockDb.getMemo).mockReturnValue(mockMemo);
      vi.mocked(mockExtractor.extractTranscript).mockReturnValue(null);

      const result = await getTranscript({ id: 1 }, mockDb, mockExtractor);
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("No transcript available for memo 1");
      expect(parsed.memoId).toBe(1);
      expect(parsed.hasTranscript).toBe(false);
    });

    it("should use title when customLabel is null", async () => {
      const mockMemo = {
        id: 1,
        title: "Recording 1",
        customLabel: null,
        date: "2025-01-01T10:00:00.000-08:00",
        duration: 60,
        path: "memo1.m4a",
        fullPath: "/path/to/memo1.m4a",
        hasTranscript: true,
      };

      vi.mocked(mockDb.getMemo).mockReturnValue(mockMemo);
      vi.mocked(mockExtractor.extractTranscript).mockReturnValue({
        text: "Test",
        locale: "en_US",
      });

      const result = await getTranscript({ id: 1 }, mockDb, mockExtractor);
      const parsed = JSON.parse(result);

      expect(parsed.title).toBe("Recording 1");
    });
  });
});

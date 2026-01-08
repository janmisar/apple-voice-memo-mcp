import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMemo, getMemoSchema } from "../../src/tools/get-memo.js";
import { VoiceMemoDatabase } from "../../src/services/voice-memo-db.js";

describe("get-memo tool", () => {
  let mockDb: VoiceMemoDatabase;

  beforeEach(() => {
    mockDb = {
      getMemo: vi.fn(),
    } as unknown as VoiceMemoDatabase;
  });

  describe("getMemoSchema", () => {
    it("should require id", () => {
      const result = getMemoSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should accept valid id", () => {
      const result = getMemoSchema.safeParse({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("should reject non-integer id", () => {
      const result = getMemoSchema.safeParse({ id: 1.5 });
      expect(result.success).toBe(false);
    });
  });

  describe("getMemo function", () => {
    it("should return memo details", async () => {
      const mockMemo = {
        id: 1,
        title: "Recording 1",
        customLabel: "My Meeting",
        date: "2025-01-01T10:00:00.000-08:00",
        duration: 125,
        path: "memo1.m4a",
        fullPath: "/path/to/memo1.m4a",
        hasTranscript: true,
      };

      vi.mocked(mockDb.getMemo).mockReturnValue(mockMemo);

      const result = await getMemo({ id: 1 }, mockDb);
      const parsed = JSON.parse(result);

      expect(parsed.id).toBe(1);
      expect(parsed.title).toBe("My Meeting");
      expect(parsed.customLabel).toBe("My Meeting");
      expect(parsed.originalTitle).toBe("Recording 1");
      expect(parsed.date).toBe("2025-01-01T10:00:00.000-08:00");
      expect(parsed.duration).toBe(125);
      expect(parsed.durationFormatted).toBe("2:05");
      expect(parsed.path).toBe("memo1.m4a");
      expect(parsed.hasTranscript).toBe(true);
    });

    it("should return error when memo not found", async () => {
      vi.mocked(mockDb.getMemo).mockReturnValue(null);

      const result = await getMemo({ id: 999 }, mockDb);
      const parsed = JSON.parse(result);

      expect(parsed.error).toBe("Voice memo with ID 999 not found");
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
        hasTranscript: false,
      };

      vi.mocked(mockDb.getMemo).mockReturnValue(mockMemo);

      const result = await getMemo({ id: 1 }, mockDb);
      const parsed = JSON.parse(result);

      expect(parsed.title).toBe("Recording 1");
      expect(parsed.customLabel).toBeNull();
    });

    it("should format duration in hours when over 60 minutes", async () => {
      const mockMemo = {
        id: 1,
        title: "Long Recording",
        customLabel: null,
        date: "2025-01-01T10:00:00.000-08:00",
        duration: 3665, // 1 hour, 1 minute, 5 seconds
        path: "memo1.m4a",
        fullPath: "/path/to/memo1.m4a",
        hasTranscript: false,
      };

      vi.mocked(mockDb.getMemo).mockReturnValue(mockMemo);

      const result = await getMemo({ id: 1 }, mockDb);
      const parsed = JSON.parse(result);

      expect(parsed.durationFormatted).toBe("1:01:05");
    });
  });
});

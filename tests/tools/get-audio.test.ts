import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAudio, getAudioSchema } from "../../src/tools/get-audio.js";
import { VoiceMemoDatabase } from "../../src/services/voice-memo-db.js";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from "fs";

const mockedReadFileSync = vi.mocked(readFileSync);

describe("get-audio tool", () => {
  let mockDb: VoiceMemoDatabase;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      getMemo: vi.fn(),
    } as unknown as VoiceMemoDatabase;
  });

  describe("getAudioSchema", () => {
    it("should require id", () => {
      const result = getAudioSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should accept valid id", () => {
      const result = getAudioSchema.safeParse({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("should accept format path", () => {
      const result = getAudioSchema.safeParse({ id: 1, format: "path" });
      expect(result.success).toBe(true);
    });

    it("should accept format base64", () => {
      const result = getAudioSchema.safeParse({ id: 1, format: "base64" });
      expect(result.success).toBe(true);
    });

    it("should reject invalid format", () => {
      const result = getAudioSchema.safeParse({ id: 1, format: "wav" });
      expect(result.success).toBe(false);
    });
  });

  describe("getAudio function", () => {
    it("should return path format by default", async () => {
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

      const result = await getAudio({ id: 1 }, mockDb);
      const parsed = JSON.parse(result);

      expect(parsed.id).toBe(1);
      expect(parsed.path).toBe("/path/to/memo1.m4a");
      expect(parsed.mimeType).toBe("audio/mp4");
      expect(parsed.filename).toBe("memo1.m4a");
    });

    it("should return base64 encoded audio", async () => {
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

      const audioContent = Buffer.from("fake audio data");
      vi.mocked(mockDb.getMemo).mockReturnValue(mockMemo);
      mockedReadFileSync.mockReturnValue(audioContent);

      const result = await getAudio({ id: 1, format: "base64" }, mockDb);
      const parsed = JSON.parse(result);

      expect(parsed.id).toBe(1);
      expect(parsed.mimeType).toBe("audio/mp4");
      expect(parsed.filename).toBe("memo1.m4a");
      expect(parsed.base64).toBe(audioContent.toString("base64"));
      expect(parsed.sizeBytes).toBe(audioContent.length);
    });

    it("should return error when memo not found", async () => {
      vi.mocked(mockDb.getMemo).mockReturnValue(null);

      const result = await getAudio({ id: 999 }, mockDb);
      const parsed = JSON.parse(result);

      expect(parsed.error).toBe("Voice memo with ID 999 not found");
    });

    it("should return error when audio file path is empty", async () => {
      const mockMemo = {
        id: 1,
        title: "Recording 1",
        customLabel: null,
        date: "2025-01-01T10:00:00.000-08:00",
        duration: 60,
        path: "memo1.m4a",
        fullPath: "", // empty path
        hasTranscript: false,
      };

      vi.mocked(mockDb.getMemo).mockReturnValue(mockMemo);

      const result = await getAudio({ id: 1 }, mockDb);
      const parsed = JSON.parse(result);

      expect(parsed.error).toBe("Audio file not found for memo 1");
    });

    it("should handle file read error for base64", async () => {
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
      mockedReadFileSync.mockImplementation(() => {
        throw new Error("EACCES: permission denied");
      });

      const result = await getAudio({ id: 1, format: "base64" }, mockDb);
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("Failed to read audio file");
      expect(parsed.error).toContain("EACCES: permission denied");
    });

    it("should handle non-Error exceptions", async () => {
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
      mockedReadFileSync.mockImplementation(() => {
        throw "string error";
      });

      const result = await getAudio({ id: 1, format: "base64" }, mockDb);
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain("Unknown error");
    });
  });
});

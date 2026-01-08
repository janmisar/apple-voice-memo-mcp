import { describe, it, expect, vi, beforeEach } from "vitest";
import { transcribeMemo, transcribeSchema } from "../../src/tools/transcribe.js";
import { VoiceMemoDatabase } from "../../src/services/voice-memo-db.js";
import { TranscriptionService } from "../../src/services/transcription-service.js";

describe("transcribe tool", () => {
  let mockDb: VoiceMemoDatabase;
  let mockTranscriptionService: TranscriptionService;

  beforeEach(() => {
    mockDb = {
      getMemo: vi.fn(),
    } as unknown as VoiceMemoDatabase;

    mockTranscriptionService = {
      transcribe: vi.fn(),
    } as unknown as TranscriptionService;
  });

  describe("transcribeSchema", () => {
    it("should require id", () => {
      const result = transcribeSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should accept valid id", () => {
      const result = transcribeSchema.safeParse({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("should accept language", () => {
      const result = transcribeSchema.safeParse({ id: 1, language: "es-ES" });
      expect(result.success).toBe(true);
    });
  });

  describe("transcribeMemo function", () => {
    it("should return error when memo not found", async () => {
      vi.mocked(mockDb.getMemo).mockReturnValue(null);

      const result = await transcribeMemo(
        { id: 999 },
        mockDb,
        mockTranscriptionService
      );
      const parsed = JSON.parse(result);

      expect(parsed.error).toBe("Voice memo with ID 999 not found");
    });

    it("should return message when already transcribed", async () => {
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

      const result = await transcribeMemo(
        { id: 1 },
        mockDb,
        mockTranscriptionService
      );
      const parsed = JSON.parse(result);

      expect(parsed.alreadyTranscribed).toBe(true);
      expect(parsed.message).toContain("already has a transcript");
      expect(parsed.id).toBe(1);
      expect(parsed.title).toBe("My Meeting");
    });

    it("should transcribe and return result", async () => {
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
      vi.mocked(mockTranscriptionService.transcribe).mockResolvedValue({
        success: true,
        transcript: "Hello world",
        segments: [{ text: "Hello world", start: 0, end: 1 }],
      });

      const result = await transcribeMemo(
        { id: 1 },
        mockDb,
        mockTranscriptionService
      );
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.transcript).toBe("Hello world");
      expect(parsed.segments).toHaveLength(1);
      expect(parsed.id).toBe(1);
      expect(parsed.title).toBe("Recording 1");
      expect(parsed.note).toContain("SFSpeechRecognizer");
    });

    it("should return error when transcription fails", async () => {
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
      vi.mocked(mockTranscriptionService.transcribe).mockResolvedValue({
        success: false,
        error: "Speech recognition permission denied",
      });

      const result = await transcribeMemo(
        { id: 1 },
        mockDb,
        mockTranscriptionService
      );
      const parsed = JSON.parse(result);

      expect(parsed.error).toBe("Speech recognition permission denied");
      expect(parsed.id).toBe(1);
      expect(parsed.suggestion).toContain("macOS Sequoia");
    });

    it("should use default language en-US", async () => {
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
      vi.mocked(mockTranscriptionService.transcribe).mockResolvedValue({
        success: true,
        transcript: "Test",
      });

      await transcribeMemo({ id: 1 }, mockDb, mockTranscriptionService);

      expect(mockTranscriptionService.transcribe).toHaveBeenCalledWith(
        "memo1.m4a",
        "en-US"
      );
    });

    it("should use specified language", async () => {
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
      vi.mocked(mockTranscriptionService.transcribe).mockResolvedValue({
        success: true,
        transcript: "Hola mundo",
      });

      await transcribeMemo(
        { id: 1, language: "es-ES" },
        mockDb,
        mockTranscriptionService
      );

      expect(mockTranscriptionService.transcribe).toHaveBeenCalledWith(
        "memo1.m4a",
        "es-ES"
      );
    });

    it("should use customLabel as title when available", async () => {
      const mockMemo = {
        id: 1,
        title: "Recording 1",
        customLabel: "Custom Label",
        date: "2025-01-01T10:00:00.000-08:00",
        duration: 60,
        path: "memo1.m4a",
        fullPath: "/path/to/memo1.m4a",
        hasTranscript: false,
      };

      vi.mocked(mockDb.getMemo).mockReturnValue(mockMemo);
      vi.mocked(mockTranscriptionService.transcribe).mockResolvedValue({
        success: true,
        transcript: "Test",
      });

      const result = await transcribeMemo(
        { id: 1 },
        mockDb,
        mockTranscriptionService
      );
      const parsed = JSON.parse(result);

      expect(parsed.title).toBe("Custom Label");
    });
  });
});

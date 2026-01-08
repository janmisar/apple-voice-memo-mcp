import { describe, it, expect, vi, beforeEach } from "vitest";
import { listMemos, listMemosSchema } from "../../src/tools/list-memos.js";
import { VoiceMemoDatabase } from "../../src/services/voice-memo-db.js";

describe("list-memos tool", () => {
  let mockDb: VoiceMemoDatabase;

  beforeEach(() => {
    mockDb = {
      listMemos: vi.fn(),
    } as unknown as VoiceMemoDatabase;
  });

  describe("listMemosSchema", () => {
    it("should accept empty input", () => {
      const result = listMemosSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept valid limit", () => {
      const result = listMemosSchema.safeParse({ limit: 25 });
      expect(result.success).toBe(true);
    });

    it("should reject limit below 1", () => {
      const result = listMemosSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it("should reject limit above 100", () => {
      const result = listMemosSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    it("should accept valid offset", () => {
      const result = listMemosSchema.safeParse({ offset: 10 });
      expect(result.success).toBe(true);
    });

    it("should reject negative offset", () => {
      const result = listMemosSchema.safeParse({ offset: -1 });
      expect(result.success).toBe(false);
    });

    it("should accept search string", () => {
      const result = listMemosSchema.safeParse({ search: "meeting" });
      expect(result.success).toBe(true);
    });
  });

  describe("listMemos function", () => {
    it("should return formatted memo list", async () => {
      const mockMemos = [
        {
          id: 1,
          title: "Recording 1",
          customLabel: "My Meeting",
          date: "2025-01-01T10:00:00.000-08:00",
          duration: 120,
          path: "memo1.m4a",
          fullPath: "/path/to/memo1.m4a",
          hasTranscript: true,
        },
        {
          id: 2,
          title: "Recording 2",
          customLabel: null,
          date: "2025-01-02T10:00:00.000-08:00",
          duration: 60,
          path: "memo2.m4a",
          fullPath: "/path/to/memo2.m4a",
          hasTranscript: false,
        },
      ];

      vi.mocked(mockDb.listMemos).mockReturnValue({
        memos: mockMemos,
        total: 2,
      });

      const result = await listMemos({ limit: 50, offset: 0 }, mockDb);
      const parsed = JSON.parse(result);

      expect(parsed.memos).toHaveLength(2);
      expect(parsed.memos[0].title).toBe("My Meeting");
      expect(parsed.memos[1].title).toBe("Recording 2");
      expect(parsed.total).toBe(2);
      expect(parsed.limit).toBe(50);
      expect(parsed.offset).toBe(0);
    });

    it("should use customLabel as title when available", async () => {
      const mockMemos = [
        {
          id: 1,
          title: "Recording 1",
          customLabel: "Custom Title",
          date: "2025-01-01T10:00:00.000-08:00",
          duration: 120,
          path: "memo1.m4a",
          fullPath: "/path/to/memo1.m4a",
          hasTranscript: false,
        },
      ];

      vi.mocked(mockDb.listMemos).mockReturnValue({
        memos: mockMemos,
        total: 1,
      });

      const result = await listMemos({}, mockDb);
      const parsed = JSON.parse(result);

      expect(parsed.memos[0].title).toBe("Custom Title");
    });

    it("should use default limit and offset", async () => {
      vi.mocked(mockDb.listMemos).mockReturnValue({ memos: [], total: 0 });

      await listMemos({}, mockDb);

      expect(mockDb.listMemos).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        search: undefined,
      });
    });

    it("should pass search parameter", async () => {
      vi.mocked(mockDb.listMemos).mockReturnValue({ memos: [], total: 0 });

      await listMemos({ search: "meeting" }, mockDb);

      expect(mockDb.listMemos).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        search: "meeting",
      });
    });

    it("should include hasTranscript in output", async () => {
      const mockMemos = [
        {
          id: 1,
          title: "Recording 1",
          customLabel: null,
          date: "2025-01-01T10:00:00.000-08:00",
          duration: 120,
          path: "memo1.m4a",
          fullPath: "/path/to/memo1.m4a",
          hasTranscript: true,
        },
      ];

      vi.mocked(mockDb.listMemos).mockReturnValue({
        memos: mockMemos,
        total: 1,
      });

      const result = await listMemos({}, mockDb);
      const parsed = JSON.parse(result);

      expect(parsed.memos[0].hasTranscript).toBe(true);
    });
  });
});

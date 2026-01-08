import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing the module
vi.mock("../../src/utils/paths.js", () => ({
  getDatabasePath: vi.fn(),
  getAudioFilePath: vi.fn(),
}));

vi.mock("../../src/utils/dates.js", () => ({
  coreDataToISO: vi.fn((ts) => `2025-01-01T00:00:00.000-08:00`),
}));

vi.mock("../../src/utils/mp4-parser.js", () => ({
  hasTranscript: vi.fn(() => false),
}));

// Mock better-sqlite3
const mockStatement = {
  get: vi.fn(),
  all: vi.fn(),
};

const mockDb = {
  prepare: vi.fn(() => mockStatement),
  close: vi.fn(),
};

vi.mock("better-sqlite3", () => ({
  default: vi.fn(() => mockDb),
}));

import { VoiceMemoDatabase } from "../../src/services/voice-memo-db.js";
import { getDatabasePath, getAudioFilePath } from "../../src/utils/paths.js";
import { hasTranscript } from "../../src/utils/mp4-parser.js";

const mockedGetDatabasePath = vi.mocked(getDatabasePath);
const mockedGetAudioFilePath = vi.mocked(getAudioFilePath);
const mockedHasTranscript = vi.mocked(hasTranscript);

describe("VoiceMemoDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetDatabasePath.mockReturnValue("/path/to/db");
    mockedGetAudioFilePath.mockReturnValue("/path/to/audio.m4a");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should get database path on construction", () => {
      new VoiceMemoDatabase();
      expect(mockedGetDatabasePath).toHaveBeenCalled();
    });
  });

  describe("listMemos", () => {
    it("should list memos with default pagination", () => {
      const mockRows = [
        {
          Z_PK: 1,
          ZPATH: "memo1.m4a",
          ZCUSTOMLABEL: "My Memo",
          ZENCRYPTEDTITLE: "Recording 1",
          ZDATE: 757382400,
          ZDURATION: 60,
        },
        {
          Z_PK: 2,
          ZPATH: "memo2.m4a",
          ZCUSTOMLABEL: null,
          ZENCRYPTEDTITLE: "Recording 2",
          ZDATE: 757382500,
          ZDURATION: 120,
        },
      ];

      mockStatement.get.mockReturnValue({ count: 2 });
      mockStatement.all.mockReturnValue(mockRows);

      const db = new VoiceMemoDatabase();
      const result = db.listMemos();

      expect(result.total).toBe(2);
      expect(result.memos).toHaveLength(2);
      expect(result.memos[0].id).toBe(1);
      expect(result.memos[0].customLabel).toBe("My Memo");
      expect(result.memos[1].customLabel).toBeNull();
    });

    it("should apply limit and offset", () => {
      mockStatement.get.mockReturnValue({ count: 10 });
      mockStatement.all.mockReturnValue([]);

      const db = new VoiceMemoDatabase();
      db.listMemos({ limit: 5, offset: 10 });

      expect(mockStatement.all).toHaveBeenCalledWith(5, 10);
    });

    it("should apply search filter", () => {
      mockStatement.get.mockReturnValue({ count: 1 });
      mockStatement.all.mockReturnValue([]);

      const db = new VoiceMemoDatabase();
      db.listMemos({ search: "test" });

      expect(mockStatement.all).toHaveBeenCalledWith("%test%", "%test%", 50, 0);
    });

    it("should throw error when database path not found", () => {
      mockedGetDatabasePath.mockReturnValue(null);

      const db = new VoiceMemoDatabase();

      expect(() => db.listMemos()).toThrow(
        "Voice Memos database not found"
      );
    });

    it("should check for transcript in each memo", () => {
      const mockRows = [
        {
          Z_PK: 1,
          ZPATH: "memo1.m4a",
          ZCUSTOMLABEL: null,
          ZENCRYPTEDTITLE: "Recording 1",
          ZDATE: 757382400,
          ZDURATION: 60,
        },
      ];

      mockStatement.get.mockReturnValue({ count: 1 });
      mockStatement.all.mockReturnValue(mockRows);
      mockedHasTranscript.mockReturnValue(true);

      const db = new VoiceMemoDatabase();
      const result = db.listMemos();

      expect(mockedHasTranscript).toHaveBeenCalledWith("/path/to/audio.m4a");
      expect(result.memos[0].hasTranscript).toBe(true);
    });

    it("should handle missing audio file path", () => {
      const mockRows = [
        {
          Z_PK: 1,
          ZPATH: "memo1.m4a",
          ZCUSTOMLABEL: null,
          ZENCRYPTEDTITLE: "Recording 1",
          ZDATE: 757382400,
          ZDURATION: 60,
        },
      ];

      mockStatement.get.mockReturnValue({ count: 1 });
      mockStatement.all.mockReturnValue(mockRows);
      mockedGetAudioFilePath.mockReturnValue(null);

      const db = new VoiceMemoDatabase();
      const result = db.listMemos();

      expect(result.memos[0].fullPath).toBe("");
      expect(result.memos[0].hasTranscript).toBe(false);
    });
  });

  describe("getMemo", () => {
    it("should get a single memo by id", () => {
      const mockRow = {
        Z_PK: 1,
        ZPATH: "memo1.m4a",
        ZCUSTOMLABEL: "Test Label",
        ZENCRYPTEDTITLE: "Recording 1",
        ZDATE: 757382400,
        ZDURATION: 60,
      };

      mockStatement.get.mockReturnValue(mockRow);

      const db = new VoiceMemoDatabase();
      const result = db.getMemo(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.customLabel).toBe("Test Label");
      expect(result?.title).toBe("Recording 1");
    });

    it("should return null when memo not found", () => {
      mockStatement.get.mockReturnValue(undefined);

      const db = new VoiceMemoDatabase();
      const result = db.getMemo(999);

      expect(result).toBeNull();
    });

    it("should use ZPATH as title fallback when ZENCRYPTEDTITLE is null", () => {
      const mockRow = {
        Z_PK: 1,
        ZPATH: "memo1.m4a",
        ZCUSTOMLABEL: null,
        ZENCRYPTEDTITLE: null,
        ZDATE: 757382400,
        ZDURATION: 60,
      };

      mockStatement.get.mockReturnValue(mockRow);

      const db = new VoiceMemoDatabase();
      const result = db.getMemo(1);

      expect(result?.title).toBe("memo1.m4a");
    });
  });

  describe("close", () => {
    it("should close the database connection", () => {
      const db = new VoiceMemoDatabase();
      // Trigger connection by calling a method
      mockStatement.get.mockReturnValue({ count: 0 });
      mockStatement.all.mockReturnValue([]);
      db.listMemos();

      db.close();

      expect(mockDb.close).toHaveBeenCalled();
    });

    it("should handle closing when not connected", () => {
      const db = new VoiceMemoDatabase();
      // Don't trigger connection
      db.close();

      expect(mockDb.close).not.toHaveBeenCalled();
    });
  });
});

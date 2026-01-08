import { z } from "zod";
import { VoiceMemoDatabase } from "../services/voice-memo-db.js";

export const listMemosSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Maximum number of memos to return (1-100, default: 50)"),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Number of memos to skip for pagination (default: 0)"),
  search: z
    .string()
    .optional()
    .describe("Search term to filter memos by title or custom label"),
});

export type ListMemosInput = z.infer<typeof listMemosSchema>;

export async function listMemos(
  input: ListMemosInput,
  db: VoiceMemoDatabase
): Promise<string> {
  const { limit = 50, offset = 0, search } = input;

  const result = db.listMemos({ limit, offset, search });

  return JSON.stringify(
    {
      memos: result.memos.map((memo) => ({
        id: memo.id,
        title: memo.customLabel || memo.title,
        date: memo.date,
        duration: memo.duration,
        hasTranscript: memo.hasTranscript,
      })),
      total: result.total,
      limit,
      offset,
    },
    null,
    2
  );
}

export const listMemosToolDefinition = {
  name: "list_voice_memos",
  description:
    "List voice memos from Apple Voice Memos app with metadata. Returns memo IDs, titles, dates, durations, and whether they have transcripts.",
  inputSchema: {
    type: "object" as const,
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of memos to return (1-100, default: 50)",
      },
      offset: {
        type: "number",
        description: "Number of memos to skip for pagination (default: 0)",
      },
      search: {
        type: "string",
        description: "Search term to filter memos by title or custom label",
      },
    },
  },
};

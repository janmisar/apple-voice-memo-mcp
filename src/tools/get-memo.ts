import { z } from "zod";
import { VoiceMemoDatabase } from "../services/voice-memo-db.js";
import { formatDuration } from "../utils/dates.js";

export const getMemoSchema = z.object({
  id: z.number().int().describe("The ID of the voice memo to retrieve"),
});

export type GetMemoInput = z.infer<typeof getMemoSchema>;

export async function getMemo(
  input: GetMemoInput,
  db: VoiceMemoDatabase
): Promise<string> {
  const { id } = input;

  const memo = db.getMemo(id);

  if (!memo) {
    return JSON.stringify({
      error: `Voice memo with ID ${id} not found`,
    });
  }

  return JSON.stringify(
    {
      id: memo.id,
      title: memo.customLabel || memo.title,
      customLabel: memo.customLabel,
      originalTitle: memo.title,
      date: memo.date,
      duration: memo.duration,
      durationFormatted: formatDuration(memo.duration),
      path: memo.path,
      hasTranscript: memo.hasTranscript,
    },
    null,
    2
  );
}

export const getMemoToolDefinition = {
  name: "get_voice_memo",
  description:
    "Get detailed metadata for a specific voice memo by its ID. Returns title, date, duration, and transcript availability.",
  inputSchema: {
    type: "object" as const,
    properties: {
      id: {
        type: "number",
        description: "The ID of the voice memo to retrieve",
      },
    },
    required: ["id"],
  },
};

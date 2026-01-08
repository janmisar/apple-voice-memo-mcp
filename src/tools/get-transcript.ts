import { z } from "zod";
import { VoiceMemoDatabase } from "../services/voice-memo-db.js";
import { TranscriptExtractor } from "../services/transcript-extractor.js";

export const getTranscriptSchema = z.object({
  id: z.number().int().describe("The ID of the voice memo"),
  format: z
    .enum(["text", "json", "timestamped"])
    .optional()
    .describe(
      "Output format: 'text' for plain text, 'json' for structured data, 'timestamped' for text with timestamps (default: text)"
    ),
});

export type GetTranscriptInput = z.infer<typeof getTranscriptSchema>;

export async function getTranscript(
  input: GetTranscriptInput,
  db: VoiceMemoDatabase,
  extractor: TranscriptExtractor
): Promise<string> {
  const { id, format = "text" } = input;

  const memo = db.getMemo(id);

  if (!memo) {
    return JSON.stringify({
      error: `Voice memo with ID ${id} not found`,
    });
  }

  const transcript = extractor.extractTranscript(memo.path, format);

  if (!transcript) {
    return JSON.stringify({
      error:
        `No transcript available for memo ${id}. The memo may not have been transcribed yet. ` +
        `On macOS Sequoia+, open the memo in Voice Memos app to trigger automatic transcription. ` +
        `Alternatively, use the transcribe_memo tool to generate a transcript.`,
      memoId: id,
      hasTranscript: false,
    });
  }

  if (format === "text") {
    return JSON.stringify({
      id: memo.id,
      title: memo.customLabel || memo.title,
      text: transcript.text,
      locale: transcript.locale,
    });
  }

  return JSON.stringify({
    id: memo.id,
    title: memo.customLabel || memo.title,
    text: transcript.text,
    segments: transcript.segments,
    locale: transcript.locale,
  });
}

export const getTranscriptToolDefinition = {
  name: "get_transcript",
  description:
    "Extract and return the transcript from a voice memo. Transcripts are stored by Apple inside the audio file. " +
    "Returns plain text, structured JSON, or timestamped segments.",
  inputSchema: {
    type: "object" as const,
    properties: {
      id: {
        type: "number",
        description: "The ID of the voice memo",
      },
      format: {
        type: "string",
        enum: ["text", "json", "timestamped"],
        description:
          "Output format: 'text' for plain text, 'json' for structured data, 'timestamped' for text with timestamps (default: text)",
      },
    },
    required: ["id"],
  },
};

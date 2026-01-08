import { z } from "zod";
import { VoiceMemoDatabase } from "../services/voice-memo-db.js";
import { TranscriptionService } from "../services/transcription-service.js";

export const transcribeSchema = z.object({
  id: z.number().int().describe("The ID of the voice memo to transcribe"),
  language: z
    .string()
    .optional()
    .describe(
      "Language code for transcription (e.g., 'en-US', 'es-ES'). Default: 'en-US'"
    ),
});

export type TranscribeInput = z.infer<typeof transcribeSchema>;

export async function transcribeMemo(
  input: TranscribeInput,
  db: VoiceMemoDatabase,
  transcriptionService: TranscriptionService
): Promise<string> {
  const { id, language = "en-US" } = input;

  const memo = db.getMemo(id);

  if (!memo) {
    return JSON.stringify({
      error: `Voice memo with ID ${id} not found`,
    });
  }

  // Check if already transcribed
  if (memo.hasTranscript) {
    return JSON.stringify({
      id: memo.id,
      title: memo.customLabel || memo.title,
      alreadyTranscribed: true,
      message:
        "This memo already has a transcript. Use get_transcript to retrieve it.",
    });
  }

  const result = await transcriptionService.transcribe(memo.path, language);

  if (!result.success) {
    return JSON.stringify({
      error: result.error,
      id: memo.id,
      suggestion:
        "On macOS Sequoia+, you can also open the memo in Voice Memos app to trigger automatic transcription.",
    });
  }

  return JSON.stringify({
    id: memo.id,
    title: memo.customLabel || memo.title,
    success: true,
    transcript: result.transcript,
    segments: result.segments,
    note:
      "This transcript was generated using SFSpeechRecognizer and is not saved to the original file. " +
      "For permanent transcripts, open the memo in Voice Memos app on macOS Sequoia+.",
  });
}

export const transcribeToolDefinition = {
  name: "transcribe_memo",
  description:
    "Transcribe a voice memo using Apple's SFSpeechRecognizer. This generates a transcript for memos that haven't been transcribed yet. " +
    "Note: The transcript is returned but not saved to the original file. " +
    "Requires Speech Recognition permission and downloaded language packs.",
  inputSchema: {
    type: "object" as const,
    properties: {
      id: {
        type: "number",
        description: "The ID of the voice memo to transcribe",
      },
      language: {
        type: "string",
        description:
          "Language code for transcription (e.g., 'en-US', 'es-ES'). Default: 'en-US'",
      },
    },
    required: ["id"],
  },
};

import { z } from "zod";
import { readFileSync } from "fs";
import { VoiceMemoDatabase } from "../services/voice-memo-db.js";

export const getAudioSchema = z.object({
  id: z.number().int().describe("The ID of the voice memo"),
  format: z
    .enum(["path", "base64"])
    .optional()
    .describe(
      "Output format: 'path' returns file path, 'base64' returns encoded audio (default: path)"
    ),
});

export type GetAudioInput = z.infer<typeof getAudioSchema>;

export async function getAudio(
  input: GetAudioInput,
  db: VoiceMemoDatabase
): Promise<string> {
  const { id, format = "path" } = input;

  const memo = db.getMemo(id);

  if (!memo) {
    return JSON.stringify({
      error: `Voice memo with ID ${id} not found`,
    });
  }

  if (!memo.fullPath) {
    return JSON.stringify({
      error: `Audio file not found for memo ${id}`,
    });
  }

  if (format === "path") {
    return JSON.stringify({
      id: memo.id,
      path: memo.fullPath,
      mimeType: "audio/mp4",
      filename: memo.path,
    });
  }

  // Base64 encode the audio file
  try {
    const audioBuffer = readFileSync(memo.fullPath);
    const base64 = audioBuffer.toString("base64");

    return JSON.stringify({
      id: memo.id,
      mimeType: "audio/mp4",
      filename: memo.path,
      base64,
      sizeBytes: audioBuffer.length,
    });
  } catch (error) {
    return JSON.stringify({
      error: `Failed to read audio file: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}

export const getAudioToolDefinition = {
  name: "get_audio",
  description:
    "Retrieve the audio file for a voice memo. Can return either the file path or base64-encoded audio data.",
  inputSchema: {
    type: "object" as const,
    properties: {
      id: {
        type: "number",
        description: "The ID of the voice memo",
      },
      format: {
        type: "string",
        enum: ["path", "base64"],
        description:
          "Output format: 'path' returns file path, 'base64' returns encoded audio (default: path)",
      },
    },
    required: ["id"],
  },
};

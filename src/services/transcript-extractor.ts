import { getAudioFilePath } from "../utils/paths.js";
import {
  extractTsrpAtom,
  parseTsrpToText,
  parseTsrpToSegments,
} from "../utils/mp4-parser.js";
import type { Transcript } from "../types/index.js";

export class TranscriptExtractor {
  extractTranscript(
    memoPath: string,
    format: "text" | "json" | "timestamped" = "text"
  ): Transcript | null {
    const fullPath = getAudioFilePath(memoPath);

    if (!fullPath) {
      return null;
    }

    const tsrpData = extractTsrpAtom(fullPath);

    if (!tsrpData) {
      return null;
    }

    const text = parseTsrpToText(tsrpData);
    const locale = tsrpData.locale?.identifier || "unknown";

    if (format === "text") {
      return { text, locale };
    }

    if (format === "timestamped" || format === "json") {
      const segments = parseTsrpToSegments(tsrpData);
      return { text, segments, locale };
    }

    return { text, locale };
  }

  extractTranscriptById(
    memoId: number,
    memoPath: string,
    format: "text" | "json" | "timestamped" = "text"
  ): Transcript | null {
    return this.extractTranscript(memoPath, format);
  }
}

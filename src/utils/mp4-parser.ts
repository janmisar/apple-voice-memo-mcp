import { readFileSync } from "fs";
import type { TsrpData, TranscriptSegment } from "../types/index.js";

/**
 * Parse MPEG-4 atoms to extract the tsrp (transcript) atom from Voice Memos m4a files.
 *
 * MPEG-4 files are structured as nested "atoms" (also called boxes).
 * Each atom has:
 * - 4 bytes: size (big-endian uint32)
 * - 4 bytes: type (4 ASCII characters)
 * - remaining: data (may contain nested atoms)
 *
 * The transcript is stored at: moov/trak/udta/tsrp
 */

interface Atom {
  type: string;
  size: number;
  dataOffset: number;
  data: Buffer;
}

function readAtom(buffer: Buffer, offset: number): Atom | null {
  if (offset + 8 > buffer.length) {
    return null;
  }

  const size = buffer.readUInt32BE(offset);
  const type = buffer.toString("ascii", offset + 4, offset + 8);

  if (size < 8 || offset + size > buffer.length) {
    return null;
  }

  return {
    type,
    size,
    dataOffset: offset + 8,
    data: buffer.subarray(offset + 8, offset + size),
  };
}

function findAtom(buffer: Buffer, type: string, offset = 0): Atom | null {
  let currentOffset = offset;

  while (currentOffset < buffer.length) {
    const atom = readAtom(buffer, currentOffset);
    if (!atom) break;

    if (atom.type === type) {
      return atom;
    }

    currentOffset += atom.size;
  }

  return null;
}

function findNestedAtom(buffer: Buffer, path: string[]): Atom | null {
  let currentBuffer = buffer;
  let currentAtom: Atom | null = null;

  for (const atomType of path) {
    currentAtom = findAtom(currentBuffer, atomType);
    if (!currentAtom) {
      return null;
    }
    currentBuffer = currentAtom.data;
  }

  return currentAtom;
}

export function extractTsrpAtom(filePath: string): TsrpData | null {
  try {
    const buffer = readFileSync(filePath);

    // Navigate to moov/trak/udta/tsrp
    const tsrpAtom = findNestedAtom(buffer, ["moov", "trak", "udta", "tsrp"]);

    if (!tsrpAtom) {
      return null;
    }

    // The tsrp atom data starts with "tsrp" prefix before the JSON
    const dataString = tsrpAtom.data.toString("utf8");

    // Find the start of the JSON (after "tsrp" prefix if present)
    let jsonStart = 0;
    if (dataString.startsWith("tsrp")) {
      jsonStart = 4;
    }

    // Find the JSON content (look for opening brace)
    const braceIndex = dataString.indexOf("{", jsonStart);
    if (braceIndex === -1) {
      return null;
    }

    const jsonString = dataString.substring(braceIndex);
    return JSON.parse(jsonString) as TsrpData;
  } catch {
    return null;
  }
}

export function parseTsrpToText(tsrpData: TsrpData): string {
  const { runs } = tsrpData.attributedString;
  const textParts: string[] = [];

  for (const item of runs) {
    if (typeof item === "string") {
      textParts.push(item);
    }
  }

  return textParts.join("");
}

export function parseTsrpToSegments(tsrpData: TsrpData): TranscriptSegment[] {
  const { attributeTable, runs } = tsrpData.attributedString;
  const segments: TranscriptSegment[] = [];

  let currentText = "";
  let currentIndex = -1;

  for (const item of runs) {
    if (typeof item === "string") {
      currentText = item;
    } else if (typeof item === "number") {
      currentIndex = item;
      if (
        currentText &&
        currentIndex >= 0 &&
        currentIndex < attributeTable.length
      ) {
        const timeRange = attributeTable[currentIndex].timeRange;
        segments.push({
          text: currentText,
          start: timeRange[0],
          end: timeRange[1],
        });
      }
      currentText = "";
    }
  }

  return segments;
}

export function hasTranscript(filePath: string): boolean {
  return extractTsrpAtom(filePath) !== null;
}

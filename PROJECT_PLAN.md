# Apple Voice Memo MCP Server - Project Plan

## Executive Summary

This project builds an MCP (Model Context Protocol) server that provides programmatic access to Apple Voice Memos on macOS. The server exposes tools for listing voice memos, retrieving audio files, extracting/retrieving transcripts, and triggering transcription for memos that haven't been transcribed yet.

## Technical Research Summary

### Voice Memos Data Storage

**Database Location (macOS Sonoma/Sequoia):**
```
~/Library/Group Containers/group.com.apple.VoiceMemos.shared/Recordings/CloudRecordings.db
```

**Audio Files Location:**
```
~/Library/Group Containers/group.com.apple.VoiceMemos.shared/Recordings/
```

**Database Schema (CloudRecordings.db - ZCLOUDRECORDING table):**
| Column | Description |
|--------|-------------|
| Z_PK | Primary key |
| ZPATH | Filename (format: `YYYYMMDD hhmmss-HASH.m4a`) |
| ZCUSTOMLABEL | Custom name (if renamed by user) |
| ZENCRYPTEDTITLE | Original/auto-generated title |
| ZDATE | Recording date (Core Data timestamp - seconds since Jan 1, 2001) |
| ZDURATION | Duration in seconds |

**Core Data Timestamp Conversion:**
```
Unix Timestamp = Core Data Timestamp + 978307200
```

### Transcript Storage (Key Discovery)

Apple stores transcripts **directly inside the .m4a audio files** using a custom MPEG-4 atom called `tsrp` at path `moov/trak/udta/tsrp`.

**Transcript JSON Structure:**
```json
{
  "attributedString": {
    "attributeTable": [
      {"timeRange": [start_seconds, end_seconds]}
    ],
    "runs": ["word1", 0, "word2", 1, ...]
  },
  "locale": {
    "identifier": "en_US",
    "current": 0
  }
}
```

**Extraction Methods:**
1. Use `mp4extract` tool: `mp4extract --payload-only moov/trak/udta/tsrp audio.m4a tsrp.bin`
2. Parse with `strings` and `jq`: `strings audio.m4a | grep "tsrp" | sed 's/tsrp//g' | jq`
3. Native parsing of MPEG-4 atoms in code

### Transcription Options

**Option 1: Apple's Built-in Transcription (macOS Sequoia+)**
- Voice Memos app automatically transcribes when recording is opened
- Transcripts stored in `tsrp` atom inside m4a file
- No public API to trigger programmatically

**Option 2: SFSpeechRecognizer (Apple Speech Framework)**
- Works on macOS 10.15+
- Requires permission: `NSSpeechRecognitionUsageDescription` in Info.plist
- On-device recognition available with `requiresOnDeviceRecognition`
- Best for audio < 1 minute; longer files may need chunking
- Language packs must be downloaded via System Settings

**Option 3: SpeechAnalyzer (macOS 26+ / WWDC 2025)**
- New API optimized for long-form audio
- Better for lectures, meetings, conversations
- Automatic language detection
- Not yet released (future enhancement)

### MCP Server Implementation

**Technology Stack:**
- TypeScript with Node.js
- `@modelcontextprotocol/sdk` - Official MCP SDK
- `zod` - Schema validation
- `better-sqlite3` - SQLite database access
- Custom Swift CLI helper for transcription (SFSpeechRecognizer)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MCP Server (TypeScript)                     │
├─────────────────────────────────────────────────────────────────┤
│  Tools:                                                         │
│  ├── list_voice_memos      - Query CloudRecordings.db          │
│  ├── get_voice_memo        - Get metadata for specific memo    │
│  ├── get_audio             - Return audio file path/base64     │
│  ├── get_transcript        - Extract tsrp atom from m4a        │
│  └── transcribe_memo       - Trigger transcription via Swift   │
├─────────────────────────────────────────────────────────────────┤
│  Internal Components:                                           │
│  ├── VoiceMemoDB           - SQLite access to CloudRecordings  │
│  ├── TranscriptExtractor   - Parse tsrp atom from m4a files    │
│  └── TranscriptionService  - Shell out to Swift CLI helper     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Swift CLI Helper (Optional Component)               │
│  Uses SFSpeechRecognizer to transcribe audio files              │
│  Output: JSON transcript with word-level timestamps              │
└─────────────────────────────────────────────────────────────────┘
```

## MCP Tools Specification

### 1. `list_voice_memos`
**Description:** List all voice memos with metadata
**Parameters:**
- `limit` (optional): Max number of results (default: 50)
- `offset` (optional): Pagination offset
- `search` (optional): Search in title/custom label

**Returns:**
```json
{
  "memos": [
    {
      "id": "Z_PK value",
      "title": "Recording title",
      "customLabel": "User-defined name or null",
      "date": "ISO 8601 timestamp",
      "duration": 123.45,
      "path": "filename.m4a",
      "hasTranscript": true
    }
  ],
  "total": 100
}
```

### 2. `get_voice_memo`
**Description:** Get detailed metadata for a specific memo
**Parameters:**
- `id` (required): Memo ID (Z_PK)

**Returns:** Single memo object with full metadata

### 3. `get_audio`
**Description:** Retrieve audio file data
**Parameters:**
- `id` (required): Memo ID
- `format` (optional): "path" | "base64" (default: "path")

**Returns:**
```json
{
  "path": "/full/path/to/recording.m4a",
  "base64": "..." // if format is base64
}
```

### 4. `get_transcript`
**Description:** Extract and return transcript from memo
**Parameters:**
- `id` (required): Memo ID
- `format` (optional): "text" | "json" | "timestamped" (default: "text")

**Returns:**
```json
{
  "text": "Full transcript text",
  "segments": [  // if format is "timestamped"
    {"text": "word", "start": 0.0, "end": 0.5}
  ],
  "locale": "en_US"
}
```

### 5. `transcribe_memo`
**Description:** Transcribe a memo using SFSpeechRecognizer
**Parameters:**
- `id` (required): Memo ID
- `language` (optional): Language code (default: "en-US")

**Returns:**
```json
{
  "success": true,
  "transcript": "Transcribed text...",
  "segments": [...],
  "note": "Transcript generated via SFSpeechRecognizer (not saved to original file)"
}
```

## Project Structure

```
apple-voice-memo-mcp/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Build, lint, test on PR/push
│       └── release.yml         # NPM publish on tag
├── src/
│   ├── index.ts                # MCP server entry point
│   ├── server.ts               # Server setup and tool registration
│   ├── tools/
│   │   ├── list-memos.ts
│   │   ├── get-memo.ts
│   │   ├── get-audio.ts
│   │   ├── get-transcript.ts
│   │   └── transcribe.ts
│   ├── services/
│   │   ├── voice-memo-db.ts    # SQLite database access
│   │   ├── transcript-extractor.ts  # M4A tsrp atom parser
│   │   └── transcription-service.ts # Swift CLI integration
│   ├── utils/
│   │   ├── paths.ts            # Voice Memos path resolution
│   │   ├── dates.ts            # Core Data timestamp conversion
│   │   └── mp4-parser.ts       # MPEG-4 atom parsing
│   └── types/
│       └── index.ts            # TypeScript type definitions
├── swift-helper/               # Optional Swift CLI for transcription
│   ├── Package.swift
│   └── Sources/
│       └── VoiceMemoTranscriber/
│           └── main.swift
├── tests/
│   ├── services/
│   │   ├── voice-memo-db.test.ts
│   │   └── transcript-extractor.test.ts
│   └── tools/
│       └── list-memos.test.ts
├── package.json
├── tsconfig.json
├── eslint.config.js
├── .prettierrc
├── LICENSE
└── README.md
```

## Implementation Phases

### Phase 1: Core Infrastructure
1. Project setup (TypeScript, ESLint, Prettier)
2. MCP server skeleton with stdio transport
3. Voice Memos database service (read-only SQLite access)
4. Path resolution utilities for macOS Voice Memos locations
5. Core Data timestamp conversion utilities

### Phase 2: Basic Tools
1. `list_voice_memos` tool - query database, return memo list
2. `get_voice_memo` tool - single memo lookup
3. `get_audio` tool - return file path or base64 encoded audio

### Phase 3: Transcript Features
1. MPEG-4 atom parser for `tsrp` extraction
2. `get_transcript` tool - extract and format transcripts
3. Support for text, JSON, and timestamped formats

### Phase 4: Transcription Service
1. Swift CLI helper using SFSpeechRecognizer
2. `transcribe_memo` tool - trigger transcription
3. Handle permissions and language pack requirements

### Phase 5: Polish & Release
1. Comprehensive error handling
2. Documentation and usage examples
3. NPM package publishing
4. Claude Desktop integration guide

## CI/CD Pipeline

### GitHub Actions Workflows

**ci.yml - Continuous Integration:**
- Triggers: push to main, pull requests
- Jobs:
  - Lint (ESLint + Prettier check)
  - Type check (tsc --noEmit)
  - Build (tsc)
  - Test (vitest)
- Matrix: Node.js 18.x, 20.x

**release.yml - Release Automation:**
- Triggers: version tags (v*)
- Jobs:
  - Build and test
  - Publish to NPM
  - Create GitHub release

## Dependencies

### Runtime
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `zod` - Schema validation
- `better-sqlite3` - SQLite database access

### Development
- `typescript` - Type safety
- `vitest` - Testing framework
- `eslint` - Linting
- `prettier` - Code formatting
- `@types/node` - Node.js type definitions
- `@types/better-sqlite3` - SQLite type definitions

## Security Considerations

1. **Read-only access**: Never modify Voice Memos database or files
2. **Path validation**: Prevent directory traversal attacks
3. **File access**: Only access files within Voice Memos directory
4. **No network access**: All operations are local-only
5. **Permission transparency**: Clear documentation of required permissions

## macOS Permissions Required

1. **Full Disk Access** (System Settings > Privacy & Security)
   - Required to access `~/Library/Group Containers/` directory

2. **Speech Recognition** (for transcription feature)
   - System will prompt when SFSpeechRecognizer is first used

## Usage Example

**Claude Desktop Configuration (`claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "voice-memos": {
      "command": "npx",
      "args": ["-y", "apple-voice-memo-mcp"]
    }
  }
}
```

**Example Conversation:**
```
User: "List my recent voice memos"
Claude: [calls list_voice_memos] "You have 15 voice memos. Here are the 5 most recent..."

User: "What did I say in the 'Meeting Notes' recording?"
Claude: [calls get_transcript] "In your 'Meeting Notes' recording from yesterday, you discussed..."

User: "Transcribe the untranscribed recording from Monday"
Claude: [calls transcribe_memo] "I've transcribed the recording. Here's what it contains..."
```

## Timeline Milestones

- **M1**: Core infrastructure and database access working
- **M2**: List/get memo tools functional
- **M3**: Transcript extraction working
- **M4**: Transcription service integrated
- **M5**: Published to NPM with documentation

## Open Questions / Future Enhancements

1. **iCloud sync**: Should we handle memos that haven't synced yet?
2. **iOS support**: Could a companion iOS app be useful?
3. **SpeechAnalyzer**: Adopt new API when macOS 26 ships
4. **Whisper integration**: Optional Whisper-based transcription for better quality?
5. **Export features**: Export memos to other formats (MP3, WAV)?

## References

- [Voice Memos File Locations](https://nono.ma/location-of-apple-voice-memos)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Apple Speech Framework](https://developer.apple.com/documentation/speech)
- [Voice Memo Transcripts in M4A](https://thomascountz.com/2025/06/08/unlocking-apple-voice-memo-transcripts)
- [SFSpeechRecognizer Documentation](https://developer.apple.com/documentation/speech/sfspeechrecognizer)

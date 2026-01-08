# Apple Voice Memo MCP Server

An MCP (Model Context Protocol) server that provides programmatic access to Apple Voice Memos on macOS. Use this to let Claude and other AI assistants interact with your voice recordings.

## Features

- **List voice memos** - Browse all your voice memos with metadata
- **Get memo details** - Retrieve detailed information about specific recordings
- **Get audio** - Access the audio file path or base64-encoded audio data
- **Get transcripts** - Extract transcripts from memos (stored by Apple in the audio file)
- **Transcribe memos** - Generate transcripts using Apple's SFSpeechRecognizer

## Requirements

- macOS Sonoma (14.0) or later (Sequoia recommended for transcription)
- Node.js 18+
- Full Disk Access permission (for accessing Voice Memos data)
- Voice Memos app must have been opened at least once

## Installation

```bash
npm install -g apple-voice-memo-mcp
```

Or use directly with npx:

```bash
npx apple-voice-memo-mcp
```

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

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

### Permissions

1. **Full Disk Access**: Required to read the Voice Memos database
   - Go to System Settings > Privacy & Security > Full Disk Access
   - Add your terminal app or Claude Desktop

2. **Speech Recognition** (for transcription):
   - Required only if using the `transcribe_memo` tool
   - System will prompt when first used

## MCP Tools

### `list_voice_memos`

List all voice memos with metadata.

**Parameters:**
- `limit` (optional): Maximum number of results (1-100, default: 50)
- `offset` (optional): Pagination offset
- `search` (optional): Search term to filter by title

**Example response:**
```json
{
  "memos": [
    {
      "id": 1,
      "title": "Meeting Notes",
      "date": "2025-01-07T10:30:00.000Z",
      "duration": 120.5,
      "hasTranscript": true
    }
  ],
  "total": 15
}
```

### `get_voice_memo`

Get detailed metadata for a specific memo.

**Parameters:**
- `id` (required): Memo ID

### `get_audio`

Retrieve the audio file.

**Parameters:**
- `id` (required): Memo ID
- `format` (optional): "path" or "base64" (default: "path")

### `get_transcript`

Extract transcript from a memo.

**Parameters:**
- `id` (required): Memo ID
- `format` (optional): "text", "json", or "timestamped"

### `transcribe_memo`

Transcribe a memo using SFSpeechRecognizer.

**Parameters:**
- `id` (required): Memo ID
- `language` (optional): Language code (default: "en-US")

## How It Works

### Data Access

Voice Memos data is stored in:
- **Database**: `~/Library/Group Containers/group.com.apple.VoiceMemos.shared/Recordings/CloudRecordings.db`
- **Audio files**: Same directory, `.m4a` format

### Transcript Storage

Apple stores transcripts directly inside the `.m4a` audio files using a custom MPEG-4 atom called `tsrp`. This MCP server parses these atoms to extract transcripts - no separate transcript files exist.

## Development

```bash
# Clone the repository
git clone https://github.com/jwulff/apple-voice-memo-mcp.git
cd apple-voice-memo-mcp

# Install dependencies
npm install

# Build
npm run build

# Run in development
npm run dev

# Test with MCP inspector
npm run inspector
```

## Troubleshooting

### "Voice Memos database not found"

1. Ensure you've opened the Voice Memos app at least once
2. Grant Full Disk Access to your terminal/application
3. Check if iCloud sync is enabled for Voice Memos

### "No transcript available"

- On macOS Sequoia+, open the memo in Voice Memos app to trigger automatic transcription
- Older macOS versions don't have automatic transcription
- Use the `transcribe_memo` tool to generate a transcript via SFSpeechRecognizer

## License

MIT

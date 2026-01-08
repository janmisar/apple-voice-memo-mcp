# Contributing to apple-voice-memo-mcp

Thank you for your interest in contributing to apple-voice-memo-mcp! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js 18.0.0 or higher
- npm
- macOS (required for Voice Memos database access)
- Full Disk Access permission for accessing Voice Memos data

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jwulff/apple-voice-memo-mcp.git
   cd apple-voice-memo-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Running Tests

```bash
# Run tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Run tests in watch mode
npm run test:watch
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Check formatting
npm run format:check

# Format code
npm run format

# Type check
npm run typecheck
```

## Project Structure

```
apple-voice-memo-mcp/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # MCP server setup
│   ├── services/         # Business logic
│   │   ├── voice-memo-db.ts
│   │   ├── transcript-extractor.ts
│   │   └── transcription-service.ts
│   ├── tools/            # MCP tool handlers
│   │   ├── list-memos.ts
│   │   ├── get-memo.ts
│   │   ├── get-audio.ts
│   │   ├── get-transcript.ts
│   │   └── transcribe.ts
│   ├── utils/            # Utility functions
│   │   ├── dates.ts
│   │   ├── mp4-parser.ts
│   │   └── paths.ts
│   └── types/            # TypeScript type definitions
│       └── index.ts
├── tests/                # Test files (mirrors src structure)
├── swift-helper/         # Swift CLI for transcription
└── dist/                 # Compiled output
```

## Making Changes

### Coding Standards

- Use TypeScript for all new code
- Follow the existing code style (enforced by ESLint and Prettier)
- Write tests for new functionality
- Maintain or improve test coverage
- Add JSDoc comments for public APIs

### Commit Messages

We use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Ensure tests pass and coverage is maintained
5. Submit a pull request

### Pull Request Checklist

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code is formatted (`npm run format:check`)
- [ ] Types are correct (`npm run typecheck`)
- [ ] Test coverage is maintained or improved
- [ ] Documentation is updated if needed

## Architecture

### MCP Server

The server implements the Model Context Protocol (MCP) with the following tools:

- `list_voice_memos`: List voice memos with pagination and search
- `get_voice_memo`: Get detailed metadata for a specific memo
- `get_audio`: Retrieve audio file path or base64-encoded data
- `get_transcript`: Extract Apple's built-in transcript
- `transcribe_memo`: Transcribe using Apple's SFSpeechRecognizer

### Database Access

Voice Memos data is stored in a SQLite database at:
```
~/Library/Group Containers/group.com.apple.VoiceMemos.shared/Recordings/CloudRecordings.db
```

The database is opened in read-only mode for safety.

### Transcript Extraction

Transcripts are stored inside the M4A audio files as `tsrp` atoms in the MPEG-4 container. The `mp4-parser.ts` utility navigates the atom hierarchy to extract them.

## Reporting Issues

When reporting issues, please include:

- macOS version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Any error messages

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

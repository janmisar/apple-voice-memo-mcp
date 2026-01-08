# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive test suite with 99%+ coverage
- CONTRIBUTING.md with development guidelines
- CI/CD workflows for testing and linting

### Fixed
- Timestamps now return local time with timezone offset instead of UTC

## [0.1.0] - 2025-01-08

### Added
- Initial release
- MCP server implementation with 5 tools:
  - `list_voice_memos`: List voice memos with pagination and search
  - `get_voice_memo`: Get detailed metadata for a specific memo
  - `get_audio`: Retrieve audio file path or base64-encoded data
  - `get_transcript`: Extract Apple's built-in transcript from audio files
  - `transcribe_memo`: Transcribe using Apple's SFSpeechRecognizer
- MPEG-4 atom parser for extracting transcripts from M4A files
- Support for multiple macOS Voice Memos database locations
- Core Data timestamp conversion utilities
- Swift helper for SFSpeechRecognizer transcription

### Technical Details
- TypeScript implementation
- MCP SDK integration
- SQLite database access (read-only)
- ESLint and Prettier configuration
- Vitest for testing

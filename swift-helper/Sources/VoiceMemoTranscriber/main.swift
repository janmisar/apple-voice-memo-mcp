import Foundation
import Speech

// Simple CLI transcriber using SFSpeechRecognizer
// Usage: VoiceMemoTranscriber <audio-file> [--language <code>] [--json]

struct TranscriptionResult: Codable {
    let text: String
    let segments: [Segment]?

    struct Segment: Codable {
        let text: String
        let start: Double
        let end: Double
    }
}

func printUsage() {
    fputs("""
    Usage: VoiceMemoTranscriber <audio-file> [options]

    Options:
      --language <code>  Language code (e.g., en-US, es-ES). Default: en-US
      --json            Output as JSON
      --help            Show this help message

    Example:
      VoiceMemoTranscriber recording.m4a --language en-US --json

    Note: Requires Speech Recognition permission and downloaded language packs.
    Configure in System Settings > Accessibility > Voice Control.

    """, stderr)
}

func requestAuthorization() async -> Bool {
    await withCheckedContinuation { continuation in
        SFSpeechRecognizer.requestAuthorization { status in
            continuation.resume(returning: status == .authorized)
        }
    }
}

func transcribe(audioURL: URL, locale: Locale, asJSON: Bool) async throws {
    guard let recognizer = SFSpeechRecognizer(locale: locale) else {
        fputs("Error: Speech recognizer not available for locale \(locale.identifier)\n", stderr)
        exit(1)
    }

    guard recognizer.isAvailable else {
        fputs("Error: Speech recognizer is not available. Check language pack installation.\n", stderr)
        exit(1)
    }

    // Prefer on-device recognition for privacy
    if recognizer.supportsOnDeviceRecognition {
        // On-device is available
    }

    let request = SFSpeechURLRecognitionRequest(url: audioURL)
    request.shouldReportPartialResults = false

    if recognizer.supportsOnDeviceRecognition {
        request.requiresOnDeviceRecognition = true
    }

    let result = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<SFSpeechRecognitionResult, Error>) in
        recognizer.recognitionTask(with: request) { result, error in
            if let error = error {
                continuation.resume(throwing: error)
                return
            }

            if let result = result, result.isFinal {
                continuation.resume(returning: result)
            }
        }
    }

    if asJSON {
        var segments: [TranscriptionResult.Segment] = []

        for segment in result.bestTranscription.segments {
            segments.append(TranscriptionResult.Segment(
                text: segment.substring,
                start: segment.timestamp,
                end: segment.timestamp + segment.duration
            ))
        }

        let output = TranscriptionResult(
            text: result.bestTranscription.formattedString,
            segments: segments
        )

        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        let jsonData = try encoder.encode(output)
        print(String(data: jsonData, encoding: .utf8)!)
    } else {
        print(result.bestTranscription.formattedString)
    }
}

// Parse arguments
var arguments = CommandLine.arguments.dropFirst()
var audioPath: String?
var languageCode = "en-US"
var outputJSON = false

while let arg = arguments.popFirst() {
    switch arg {
    case "--help", "-h":
        printUsage()
        exit(0)
    case "--language", "-l":
        guard let code = arguments.popFirst() else {
            fputs("Error: --language requires a value\n", stderr)
            exit(1)
        }
        languageCode = code
    case "--json", "-j":
        outputJSON = true
    default:
        if arg.hasPrefix("-") {
            fputs("Error: Unknown option \(arg)\n", stderr)
            exit(1)
        }
        audioPath = arg
    }
}

guard let path = audioPath else {
    fputs("Error: No audio file specified\n", stderr)
    printUsage()
    exit(1)
}

let audioURL = URL(fileURLWithPath: path)

guard FileManager.default.fileExists(atPath: path) else {
    fputs("Error: File not found: \(path)\n", stderr)
    exit(1)
}

// Run async main
Task {
    // Request authorization
    let authorized = await requestAuthorization()
    guard authorized else {
        fputs("Error: Speech recognition not authorized. Grant permission in System Settings.\n", stderr)
        exit(1)
    }

    let locale = Locale(identifier: languageCode)

    do {
        try await transcribe(audioURL: audioURL, locale: locale, asJSON: outputJSON)
        exit(0)
    } catch {
        fputs("Error: \(error.localizedDescription)\n", stderr)
        exit(1)
    }
}

// Keep the run loop alive
RunLoop.main.run()

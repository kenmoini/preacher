import Foundation
import UIKit

/// Manages execution of iOS Shortcuts via the `shortcuts://` URL scheme.
/// Supports x-callback-url for result reporting, sequential execution queue, and timeouts.
@MainActor
class ShortcutRunner: ObservableObject {
    @Published var isExecuting = false
    @Published var currentShortcut: String?

    /// Callback invoked when an execution completes.
    /// Parameters: executionId, success, output
    var onExecutionComplete: ((String, Bool, String?) -> Void)?

    private var executionQueue: [(id: String, name: String, input: String?, timeout: TimeInterval)] = []
    private var activeExecution: (id: String, timer: Timer?)?
    private var processing = false

    // MARK: - Public API

    /// Enqueue a shortcut execution request.
    func enqueue(id: String, shortcutName: String, input: String?, timeout: TimeInterval = 30) {
        executionQueue.append((id: id, name: shortcutName, input: input, timeout: timeout))
        processNext()
    }

    /// Execute a shortcut immediately (bypasses queue). Used for notification action taps.
    func executeImmediate(shortcutName: String, input: String?) async -> Bool {
        return await openShortcutURL(name: shortcutName, input: input)
    }

    /// Called when the app returns from Shortcuts (via URL scheme callback or app activation).
    /// Since `shortcuts://` doesn't reliably support x-callback-url on modern iOS,
    /// we treat the app returning to foreground as a completion signal.
    func handleAppDidBecomeActive() {
        guard let active = activeExecution else { return }
        completeExecution(id: active.id, success: true, output: nil)
    }

    /// Cancel the current execution and clear the queue.
    func cancelAll() {
        activeExecution?.timer?.invalidate()
        activeExecution = nil
        executionQueue.removeAll()
        isExecuting = false
        currentShortcut = nil
        processing = false
    }

    // MARK: - Queue Processing

    private func processNext() {
        guard !processing, !executionQueue.isEmpty else { return }
        processing = true

        let next = executionQueue.removeFirst()
        isExecuting = true
        currentShortcut = next.name

        activeExecution?.timer?.invalidate()

        // Set up timeout
        let timer = Timer.scheduledTimer(withTimeInterval: next.timeout, repeats: false) { [weak self] _ in
            Task { @MainActor in
                self?.completeExecution(id: next.id, success: false, output: "Timeout after \(Int(next.timeout))s")
            }
        }
        activeExecution = (id: next.id, timer: timer)

        Task {
            let success = await openShortcutURL(name: next.name, input: next.input)
            if !success {
                completeExecution(id: next.id, success: false, output: "Failed to open Shortcuts app")
            }
            // If success, we wait for handleAppDidBecomeActive() or timeout
        }
    }

    private func completeExecution(id: String, success: Bool, output: String?) {
        activeExecution?.timer?.invalidate()
        activeExecution = nil
        isExecuting = false
        currentShortcut = nil
        processing = false

        onExecutionComplete?(id, success, output)

        // Process next in queue
        if !executionQueue.isEmpty {
            processNext()
        }
    }

    // MARK: - URL Scheme

    private func openShortcutURL(name: String, input: String?) async -> Bool {
        var components = URLComponents()
        components.scheme = "shortcuts"
        components.host = "run-shortcut"
        components.queryItems = [
            URLQueryItem(name: "name", value: name),
        ]

        if let input {
            components.queryItems?.append(URLQueryItem(name: "input", value: "text"))
            components.queryItems?.append(URLQueryItem(name: "text", value: input))
        }

        guard let url = components.url else { return false }
        return await UIApplication.shared.open(url)
    }
}

import Foundation
import Combine

/// Manages the WebSocket connection to the Pulpit server.
/// Handles authentication, reconnection with exponential backoff, heartbeat, and message dispatch.
class WebSocketManager: NSObject, ObservableObject {
    @Published var isConnected = false
    @Published var connectionError: String?

    private var webSocketTask: URLSessionWebSocketTask?
    private var session: URLSession!
    private var serverURL: String?
    private var registrationToken: String?
    private var deviceId: String?

    // Reconnection
    private var reconnectAttempt = 0
    private var maxReconnectDelay: TimeInterval = 60
    private var reconnectTimer: Timer?
    private var shouldReconnect = false

    // Callbacks
    var onNotification: (([String: Any]) -> Void)?
    var onExecuteShortcut: ((String, String, String?) -> Void)?  // id, shortcutName, input

    override init() {
        super.init()
        self.session = URLSession(configuration: .default, delegate: self, delegateQueue: .main)
    }

    // MARK: - Public API

    func connect(serverURL: String, registrationToken: String) {
        self.serverURL = serverURL
        self.registrationToken = registrationToken
        self.shouldReconnect = true
        self.reconnectAttempt = 0

        performConnect()
    }

    func disconnect() {
        shouldReconnect = false
        reconnectTimer?.invalidate()
        reconnectTimer = nil
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
    }

    func sendAutomationStatus(ready: Bool) {
        let message: [String: Any] = [
            "type": "status",
            "automationServerReady": ready,
        ]
        sendJSON(message)
    }

    func sendExecuteResult(id: String, success: Bool, output: String?) {
        var message: [String: Any] = [
            "type": "execute_result",
            "id": id,
            "success": success,
        ]
        if let output {
            message["output"] = output
        }
        sendJSON(message)
    }

    // MARK: - Connection

    private func performConnect() {
        guard let serverURL,
              let url = URL(string: serverURL),
              var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return
        }

        // Convert http(s) to ws(s)
        components.scheme = components.scheme == "https" ? "wss" : "ws"
        components.path = "/ws"

        guard let wsURL = components.url else { return }

        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = session.webSocketTask(with: wsURL)
        webSocketTask?.resume()
        receiveMessage()
    }

    private func authenticate() {
        guard let registrationToken else { return }
        let authMessage: [String: Any] = [
            "type": "auth",
            "token": registrationToken,
        ]
        sendJSON(authMessage)
    }

    // MARK: - Message Handling

    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            guard let self else { return }

            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleTextMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleTextMessage(text)
                    }
                @unknown default:
                    break
                }
                // Continue listening
                self.receiveMessage()

            case .failure(let error):
                print("[WebSocket] Receive error: \(error.localizedDescription)")
                self.handleDisconnect()
            }
        }
    }

    private func handleTextMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return
        }

        switch type {
        case "auth_ok":
            deviceId = json["deviceId"] as? String
            reconnectAttempt = 0
            connectionError = nil
            isConnected = true
            print("[WebSocket] Authenticated, deviceId: \(deviceId ?? "unknown")")

        case "ping":
            sendJSON(["type": "pong"])

        case "notification":
            if let payload = json["payload"] as? [String: Any] {
                onNotification?(payload)
            }

        case "execute_shortcut":
            if let id = json["id"] as? String,
               let shortcutName = json["shortcutName"] as? String {
                let input = json["input"] as? String
                onExecuteShortcut?(id, shortcutName, input)
            }

        case "error":
            let errorMsg = json["message"] as? String ?? "Unknown WebSocket error"
            connectionError = errorMsg
            print("[WebSocket] Error: \(errorMsg)")

        default:
            print("[WebSocket] Unknown message type: \(type)")
        }
    }

    // MARK: - Reconnection

    private func handleDisconnect() {
        isConnected = false
        webSocketTask = nil

        guard shouldReconnect else { return }

        let delay = min(pow(2.0, Double(reconnectAttempt)), maxReconnectDelay)
        reconnectAttempt += 1
        connectionError = "Disconnected. Reconnecting in \(Int(delay))s..."
        print("[WebSocket] Reconnecting in \(delay)s (attempt \(reconnectAttempt))")

        reconnectTimer?.invalidate()
        reconnectTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            self?.performConnect()
        }
    }

    // MARK: - Send

    private func sendJSON(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let text = String(data: data, encoding: .utf8) else {
            return
        }
        webSocketTask?.send(.string(text)) { error in
            if let error {
                print("[WebSocket] Send error: \(error.localizedDescription)")
            }
        }
    }
}

// MARK: - URLSessionWebSocketDelegate

extension WebSocketManager: URLSessionWebSocketDelegate {
    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?
    ) {
        print("[WebSocket] Connected")
        authenticate()
    }

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?
    ) {
        print("[WebSocket] Closed: \(closeCode)")
        handleDisconnect()
    }

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didCompleteWithError error: Error?
    ) {
        if let error {
            print("[WebSocket] Task error: \(error.localizedDescription)")
            handleDisconnect()
        }
    }
}

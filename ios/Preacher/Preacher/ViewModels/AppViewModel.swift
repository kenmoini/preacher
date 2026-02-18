import Foundation
import SwiftUI
import UserNotifications

@MainActor
class AppViewModel: ObservableObject {
    @Published var isConfigured = false
    @Published var serverURL: String?
    @Published var deviceName: String?
    @Published var deviceId: String?
    @Published var isWebSocketConnected = false
    @Published var pushPermissionGranted = false
    @Published var isAutomationServerEnabled = false {
        didSet {
            webSocketManager.sendAutomationStatus(ready: isAutomationServerEnabled)
            UIApplication.shared.isIdleTimerDisabled = isAutomationServerEnabled
        }
    }
    @Published var recentExecutions: [ShortcutExecution] = []
    @Published var connectionError: String?

    let notificationManager = NotificationManager()
    let webSocketManager = WebSocketManager()
    let shortcutRunner = ShortcutRunner()

    private var serverConfig: ServerConfig?
    private var apiClient: ServerAPIClient?

    init() {
        loadConfig()
        setupWebSocketCallbacks()
        setupShortcutRunnerCallbacks()
    }

    // MARK: - Configuration Flow

    /// Validates the server URL, requests notification permissions, and stores the URL.
    /// The actual device registration happens when APNs delivers the device token.
    func configure(serverURL: String, deviceName: String) async throws {
        guard URL(string: serverURL) != nil else {
            throw PreacherError.invalidServerURL
        }

        // Normalize URL (remove trailing slash)
        let normalizedURL = serverURL.hasSuffix("/") ? String(serverURL.dropLast()) : serverURL

        // Check server health
        let client = ServerAPIClient(serverURL: normalizedURL)
        _ = try await client.checkHealth()

        // Request notification permissions
        let granted = await notificationManager.requestPermission()
        pushPermissionGranted = granted

        self.serverURL = normalizedURL
        self.deviceName = deviceName
        self.apiClient = client

        // Store partial config so we can resume after APNs token arrives
        KeychainManager.save(.serverURL, value: normalizedURL)
        KeychainManager.save(.deviceName, value: deviceName)
    }

    /// Called by AppDelegate when APNs delivers the device token.
    func registerDevice(apnsToken: String) async {
        guard let serverURL else { return }

        if apiClient == nil {
            apiClient = ServerAPIClient(serverURL: serverURL)
        }
        guard let apiClient else { return }

        let name = deviceName ?? UIDevice.current.name

        // Store APNs token for re-registration
        KeychainManager.save(.apnsToken, value: apnsToken)

        do {
            let registration = try await apiClient.registerDevice(name: name, apnsToken: apnsToken)

            let config = ServerConfig(
                url: serverURL,
                deviceId: registration.id,
                registrationToken: registration.registrationToken,
                deviceName: name
            )

            // Persist to Keychain
            KeychainManager.saveConfig(config)

            self.serverConfig = config
            self.deviceId = registration.id
            self.isConfigured = true

            // Connect WebSocket
            connectWebSocket()
        } catch {
            print("[AppViewModel] Device registration failed: \(error)")
        }
    }

    /// Called by AppDelegate when a push notification is received while app is in foreground.
    func handlePushReceived(userInfo: [AnyHashable: Any]) {
        notificationManager.handleReceivedPush(userInfo: userInfo)
    }

    // MARK: - Notification Actions

    func handleNotificationAction(actionId: String, userInfo: [AnyHashable: Any]) async {
        guard let preacherData = userInfo["preacher"] as? [String: Any],
              let actions = preacherData["actions"] as? [[String: Any]] else {
            return
        }

        for action in actions {
            guard let id = action["id"] as? String, id == actionId else { continue }

            if let urlString = action["url"] as? String, let url = URL(string: urlString) {
                await UIApplication.shared.open(url)
            }

            if let shortcutName = action["shortcut"] as? String {
                await executeShortcut(name: shortcutName, input: action["input"] as? String)
            }
        }
    }

    // MARK: - Shortcut Execution

    /// Execute a shortcut. Server-triggered executions use the queue with timeout.
    /// Notification action taps execute immediately.
    func executeShortcut(name: String, input: String?, executionId: String? = nil) async {
        if let executionId {
            // Server-triggered: use the queue with timeout management
            shortcutRunner.enqueue(id: executionId, shortcutName: name, input: input, timeout: 30)
        } else {
            // User-triggered (notification action): execute immediately
            let opened = await shortcutRunner.executeImmediate(shortcutName: name, input: input)
            recordExecution(
                id: UUID().uuidString,
                shortcutName: name,
                input: input,
                success: opened,
                output: opened ? nil : "Failed to open Shortcuts app"
            )
        }
    }

    /// Called when the app returns to foreground (e.g., after Shortcuts finishes).
    func handleAppDidBecomeActive() {
        shortcutRunner.handleAppDidBecomeActive()
    }

    private func recordExecution(id: String, shortcutName: String, input: String?, success: Bool, output: String?) {
        let execution = ShortcutExecution(
            id: id,
            shortcutName: shortcutName,
            input: input,
            success: success,
            output: output,
            error: success ? nil : (output ?? "Unknown error"),
            timestamp: Date()
        )
        recentExecutions.insert(execution, at: 0)
        if recentExecutions.count > 50 {
            recentExecutions = Array(recentExecutions.prefix(50))
        }
    }

    private func setupShortcutRunnerCallbacks() {
        shortcutRunner.onExecutionComplete = { [weak self] id, success, output in
            Task { @MainActor in
                guard let self else { return }
                // Record in execution history
                let name = self.shortcutRunner.currentShortcut ?? "Unknown"
                self.recordExecution(id: id, shortcutName: name, input: nil, success: success, output: output)
                // Report back to server
                self.webSocketManager.sendExecuteResult(id: id, success: success, output: output)
            }
        }
    }

    // MARK: - WebSocket

    func connectWebSocket() {
        guard let config = serverConfig else { return }
        webSocketManager.connect(serverURL: config.url, registrationToken: config.registrationToken)
    }

    func disconnectWebSocket() {
        webSocketManager.disconnect()
    }

    private func setupWebSocketCallbacks() {
        // Observe connection state
        webSocketManager.$isConnected
            .receive(on: DispatchQueue.main)
            .assign(to: &$isWebSocketConnected)

        webSocketManager.$connectionError
            .receive(on: DispatchQueue.main)
            .assign(to: &$connectionError)

        // Handle incoming notifications via WebSocket
        webSocketManager.onNotification = { [weak self] payload in
            DispatchQueue.main.async {
                self?.notificationManager.showLocalNotification(from: payload)
            }
        }

        // Handle shortcut execution requests from server
        webSocketManager.onExecuteShortcut = { [weak self] id, shortcutName, input in
            Task { @MainActor in
                await self?.executeShortcut(name: shortcutName, input: input, executionId: id)
            }
        }
    }

    // MARK: - Reset

    func reset() {
        disconnectWebSocket()
        shortcutRunner.cancelAll()
        KeychainManager.deleteAll()
        notificationManager.clearHistory()

        serverConfig = nil
        apiClient = nil
        isConfigured = false
        serverURL = nil
        deviceName = nil
        deviceId = nil
        isWebSocketConnected = false
        isAutomationServerEnabled = false
        recentExecutions = []
        connectionError = nil
    }

    // MARK: - Config Persistence (Keychain)

    private func loadConfig() {
        // Migrate from UserDefaults if needed
        if let data = UserDefaults.standard.data(forKey: "preacher_config"),
           let config = try? JSONDecoder().decode(ServerConfig.self, from: data) {
            KeychainManager.saveConfig(config)
            UserDefaults.standard.removeObject(forKey: "preacher_config")
        }

        guard let config = KeychainManager.loadConfig() else { return }

        serverConfig = config
        serverURL = config.url
        deviceName = config.deviceName
        deviceId = config.deviceId
        apiClient = ServerAPIClient(serverURL: config.url)
        isConfigured = true

        // Check notification authorization
        notificationManager.checkAuthorizationStatus()

        // Re-connect WebSocket
        connectWebSocket()
    }
}

enum PreacherError: LocalizedError {
    case invalidServerURL
    case serverUnreachable
    case registrationFailed

    var errorDescription: String? {
        switch self {
        case .invalidServerURL:
            return "Invalid server URL. Please enter a valid URL."
        case .serverUnreachable:
            return "Could not reach the Pulpit server. Check the URL and try again."
        case .registrationFailed:
            return "Failed to register device with the server."
        }
    }
}

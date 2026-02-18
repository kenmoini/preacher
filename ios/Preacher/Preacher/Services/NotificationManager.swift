import Foundation
import UserNotifications
import UIKit

/// Manages UNUserNotificationCenter: permission requests, category registration,
/// local notification creation from WebSocket payloads, and notification history.
class NotificationManager: ObservableObject {
    @Published var isAuthorized = false
    @Published var notifications: [PreacherNotification] = []

    private let center = UNUserNotificationCenter.current()
    private let historyKey = "preacher_notification_history"
    private let maxHistory = 100

    init() {
        loadHistory()
        checkAuthorizationStatus()
    }

    // MARK: - Permissions

    func requestPermission() async -> Bool {
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            await MainActor.run { isAuthorized = granted }
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
            return granted
        } catch {
            print("[Notifications] Permission request failed: \(error)")
            return false
        }
    }

    func checkAuthorizationStatus() {
        center.getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                self?.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }

    // MARK: - Category Registration

    /// Registers a notification category with action buttons.
    /// Call this when server sends notification definitions with actions.
    func registerCategory(categoryId: String, actions: [PreacherAction]) {
        let notificationActions = actions.prefix(4).map { action in
            UNNotificationAction(
                identifier: action.id,
                title: action.name,
                options: action.url != nil ? [.foreground] : []
            )
        }

        let category = UNNotificationCategory(
            identifier: categoryId,
            actions: Array(notificationActions),
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        // Merge with existing categories
        center.getNotificationCategories { [weak self] existing in
            var categories = existing
            categories.insert(category)
            self?.center.setNotificationCategories(categories)
        }
    }

    // MARK: - WebSocket Notification Display

    /// Creates a local notification from a WebSocket notification payload.
    /// This is used when the server sends a notification via WebSocket
    /// (as a supplement to APNs push).
    func showLocalNotification(from payload: [String: Any]) {
        let content = UNMutableNotificationContent()
        content.title = payload["title"] as? String ?? ""
        content.body = payload["text"] as? String ?? ""

        if let threadId = payload["threadId"] as? String {
            content.threadIdentifier = threadId
        }

        if let sound = payload["sound"] as? String {
            content.sound = mapSound(sound)
        } else {
            content.sound = .default
        }

        if let isTimeSensitive = payload["isTimeSensitive"] as? Bool, isTimeSensitive {
            content.interruptionLevel = .timeSensitive
        }

        // Store full payload in userInfo for action handling
        content.userInfo = ["preacher": payload]

        // Register category if actions are present
        if let actions = payload["actions"] as? [[String: Any]], !actions.isEmpty {
            let categoryId = "preacher_\(UUID().uuidString.prefix(8))"
            let preacherActions = actions.map { dict in
                PreacherAction(
                    id: dict["id"] as? String ?? UUID().uuidString,
                    name: dict["name"] as? String ?? "Action",
                    input: dict["input"] as? String,
                    shortcut: dict["shortcut"] as? String,
                    url: dict["url"] as? String,
                    runOnServer: dict["runOnServer"] as? Bool,
                    keepNotification: dict["keepNotification"] as? Bool
                )
            }
            registerCategory(categoryId: categoryId, actions: preacherActions)
            content.categoryIdentifier = categoryId
        }

        let id = payload["id"] as? String ?? UUID().uuidString
        let request = UNNotificationRequest(identifier: id, content: content, trigger: nil)

        center.add(request) { error in
            if let error {
                print("[Notifications] Failed to show local notification: \(error)")
            }
        }

        // Add to history
        addToHistory(payload: payload)
    }

    // MARK: - History

    func addToHistory(payload: [String: Any]) {
        let notification = PreacherNotification(
            id: payload["id"] as? String ?? UUID().uuidString,
            title: payload["title"] as? String ?? "Notification",
            text: payload["text"] as? String,
            receivedAt: Date(),
            actions: nil,
            threadId: payload["threadId"] as? String
        )

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.notifications.insert(notification, at: 0)
            if self.notifications.count > self.maxHistory {
                self.notifications = Array(self.notifications.prefix(self.maxHistory))
            }
            self.saveHistory()
        }
    }

    /// Called when a push notification is received (from APNs).
    /// Parses the userInfo and adds to history.
    func handleReceivedPush(userInfo: [AnyHashable: Any]) {
        var payload: [String: Any] = [:]

        if let aps = userInfo["aps"] as? [String: Any],
           let alert = aps["alert"] as? [String: Any] {
            payload["title"] = alert["title"]
            payload["text"] = alert["body"]
        }

        if let preacher = userInfo["preacher"] as? [String: Any] {
            payload.merge(preacher) { _, new in new }
        }

        if !payload.isEmpty {
            addToHistory(payload: payload)
        }
    }

    func clearHistory() {
        notifications.removeAll()
        UserDefaults.standard.removeObject(forKey: historyKey)
    }

    private func saveHistory() {
        if let data = try? JSONEncoder().encode(notifications) {
            UserDefaults.standard.set(data, forKey: historyKey)
        }
    }

    private func loadHistory() {
        guard let data = UserDefaults.standard.data(forKey: historyKey),
              let saved = try? JSONDecoder().decode([PreacherNotification].self, from: data) else {
            return
        }
        notifications = saved
    }

    // MARK: - Sound Mapping

    private func mapSound(_ sound: String) -> UNNotificationSound {
        switch sound {
        case "vibrateOnly":
            return UNNotificationSound(named: UNNotificationSoundName("silence.caf"))
        case "subtle":
            return UNNotificationSound(named: UNNotificationSoundName("subtle.caf"))
        case "question":
            return UNNotificationSound(named: UNNotificationSoundName("question.caf"))
        case "jobDone":
            return UNNotificationSound(named: UNNotificationSoundName("jobdone.caf"))
        case "problem":
            return UNNotificationSound(named: UNNotificationSoundName("problem.caf"))
        case "loud":
            return UNNotificationSound(named: UNNotificationSoundName("loud.caf"))
        case "lasers":
            return UNNotificationSound(named: UNNotificationSoundName("lasers.caf"))
        default:
            return .default
        }
    }
}

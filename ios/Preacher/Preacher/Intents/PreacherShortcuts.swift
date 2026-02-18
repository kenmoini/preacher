import AppIntents

/// Makes Preacher's App Intents discoverable in the iOS Shortcuts app.
struct PreacherShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: RunServerActionIntent(),
            phrases: [
                "Run \(.applicationName) action",
                "Execute \(.applicationName) action",
                "Trigger \(.applicationName) server action",
            ],
            shortTitle: "Run Server Action",
            systemImageName: "play.circle"
        )
        AppShortcut(
            intent: SendNotificationIntent(),
            phrases: [
                "Send \(.applicationName) notification",
                "Push notification with \(.applicationName)",
                "Notify with \(.applicationName)",
            ],
            shortTitle: "Send Notification",
            systemImageName: "bell.badge"
        )
    }
}

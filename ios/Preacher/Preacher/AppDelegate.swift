import UIKit
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate {
    var appViewModel: AppViewModel?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let token = deviceToken.hexString
        Task {
            await appViewModel?.registerDevice(apnsToken: token)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[APNs] Registration failed: \(error.localizedDescription)")
    }

    // Handle silent push notifications (content-available: 1)
    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        // Check if this is an execute command via silent push
        if let preacher = userInfo["preacher"] as? [String: Any],
           let type = preacher["type"] as? String,
           type == "execute_shortcut",
           let shortcutName = preacher["shortcutName"] as? String {
            let executionId = preacher["id"] as? String
            let input = preacher["input"] as? String
            Task {
                await appViewModel?.executeShortcut(
                    name: shortcutName,
                    input: input,
                    executionId: executionId
                )
                completionHandler(.newData)
            }
            return
        }

        // Regular notification received in background
        Task {
            await appViewModel?.handlePushReceived(userInfo: userInfo)
        }
        completionHandler(.newData)
    }
}

extension AppDelegate: UNUserNotificationCenterDelegate {
    // Show notifications even when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo

        // Add to notification history
        Task {
            await appViewModel?.handlePushReceived(userInfo: userInfo)
        }

        completionHandler([.banner, .sound, .badge])
    }

    // Handle notification action taps
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        let actionId = response.actionIdentifier

        // Default tap opens the app (handled by system)
        guard actionId != UNNotificationDefaultActionIdentifier,
              actionId != UNNotificationDismissActionIdentifier else {
            completionHandler()
            return
        }

        Task {
            await appViewModel?.handleNotificationAction(
                actionId: actionId,
                userInfo: userInfo
            )
        }
        completionHandler()
    }
}

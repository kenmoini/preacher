import AppIntents

/// App Intent that sends a notification via the Pulpit server.
/// Visible in the iOS Shortcuts app as "Send Pulpit Notification".
struct SendNotificationIntent: AppIntent {
    static var title: LocalizedStringResource = "Send Pulpit Notification"
    static var description = IntentDescription("Sends a push notification to devices via your Pulpit server.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Title", description: "Notification title")
    var notificationTitle: String

    @Parameter(title: "Message", description: "Notification body text")
    var message: String?

    @Parameter(title: "Template Name", description: "Use a saved notification template instead of title/message")
    var templateName: String?

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        guard let config = KeychainManager.loadConfig() else {
            throw SendNotificationError.notConfigured
        }

        let baseURL = URL(string: config.url)!

        // If template name is provided, use the template endpoint
        if let templateName, !templateName.isEmpty {
            let url = baseURL.appendingPathComponent("api/v1/notifications/\(templateName)")
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            // Override title/message if provided
            var body: [String: Any] = [:]
            if !notificationTitle.isEmpty {
                body["title"] = notificationTitle
            }
            if let message, !message.isEmpty {
                body["text"] = message
            }
            request.httpBody = try JSONSerialization.data(withJSONObject: body)

            let (data, response) = try await URLSession.shared.data(for: request)
            return try processResponse(data: data, response: response)
        }

        // Ad-hoc notification
        let url = baseURL.appendingPathComponent("api/v1/notifications")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: Any] = ["title": notificationTitle]
        if let message, !message.isEmpty {
            body["text"] = message
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        return try processResponse(data: data, response: response)
    }

    private func processResponse(data: Data, response: URLResponse) throws -> some IntentResult & ReturnsValue<String> {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw SendNotificationError.networkError
        }

        if httpResponse.statusCode == 200 || httpResponse.statusCode == 201 {
            return .result(value: "Notification sent successfully")
        } else {
            let errorBody = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            let message = errorBody?["error"] as? String ?? "HTTP \(httpResponse.statusCode)"
            throw SendNotificationError.serverError(message)
        }
    }
}

enum SendNotificationError: Error, CustomLocalizedStringResourceConvertible {
    case notConfigured
    case networkError
    case serverError(String)

    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .notConfigured:
            return "Preacher is not configured. Open the app and connect to a Pulpit server first."
        case .networkError:
            return "Could not reach the Pulpit server."
        case .serverError(let message):
            return "Server error: \(message)"
        }
    }
}

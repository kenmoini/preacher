import AppIntents

/// App Intent that triggers a server action on the Pulpit server.
/// Visible in the iOS Shortcuts app as "Run Server Action".
struct RunServerActionIntent: AppIntent {
    static var title: LocalizedStringResource = "Run Server Action"
    static var description = IntentDescription("Triggers a named action on your Pulpit server.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Action Name", description: "The name of the server action to execute")
    var actionName: String

    @Parameter(title: "Input", description: "Optional input to pass to the action")
    var input: String?

    @Parameter(title: "Wait for Result", description: "Whether to wait for the action to complete", default: false)
    var waitForResult: Bool

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        guard let config = KeychainManager.loadConfig() else {
            throw RunServerActionError.notConfigured
        }

        let client = ServerAPIClient(serverURL: config.url)

        let url = URL(string: config.url)!
            .appendingPathComponent("api/v1/execute")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: Any] = ["action": actionName]
        if let input {
            body["input"] = input
        }
        if !waitForResult {
            body["nowait"] = true
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw RunServerActionError.networkError
        }

        if httpResponse.statusCode == 200 || httpResponse.statusCode == 202 {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let output = json["output"] as? String {
                return .result(value: output)
            }
            return .result(value: "Action triggered successfully")
        } else {
            let errorBody = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            let message = errorBody?["error"] as? String ?? "HTTP \(httpResponse.statusCode)"
            throw RunServerActionError.serverError(message)
        }
    }
}

enum RunServerActionError: Error, CustomLocalizedStringResourceConvertible {
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

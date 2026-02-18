import Foundation

actor ServerAPIClient {
    private let session: URLSession
    private var baseURL: URL

    init(serverURL: String) {
        self.baseURL = URL(string: serverURL)!
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 30
        self.session = URLSession(configuration: config)
    }

    func updateBaseURL(_ url: String) {
        if let newURL = URL(string: url) {
            self.baseURL = newURL
        }
    }

    // MARK: - Health

    struct HealthResponse: Codable {
        let name: String
        let version: String
        let status: String
    }

    func checkHealth() async throws -> HealthResponse {
        let url = baseURL.appendingPathComponent("api/v1/health")
        let (data, response) = try await session.data(from: url)
        try validateResponse(response)
        return try JSONDecoder().decode(HealthResponse.self, from: data)
    }

    // MARK: - Device Registration

    func registerDevice(name: String, apnsToken: String) async throws -> DeviceRegistrationResponse {
        let url = baseURL.appendingPathComponent("api/v1/devices")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = DeviceRegistrationRequest(name: name, apnsToken: apnsToken, platform: "ios")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: request)
        try validateResponse(response)
        return try JSONDecoder().decode(DeviceRegistrationResponse.self, from: data)
    }

    // MARK: - Device Update

    struct DeviceUpdateRequest: Codable {
        var apnsToken: String?
        var name: String?
        var isAutomationEnabled: Bool?
    }

    func updateDevice(id: String, update: DeviceUpdateRequest) async throws {
        let url = baseURL.appendingPathComponent("api/v1/devices/\(id)")
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(update)

        let (_, response) = try await session.data(for: request)
        try validateResponse(response)
    }

    // MARK: - Helpers

    private func validateResponse(_ response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        switch http.statusCode {
        case 200...299:
            return
        case 401:
            throw APIError.unauthorized
        case 404:
            throw APIError.notFound
        case 409:
            throw APIError.conflict
        case 500...599:
            throw APIError.serverError(http.statusCode)
        default:
            throw APIError.httpError(http.statusCode)
        }
    }
}

enum APIError: LocalizedError {
    case invalidResponse
    case unauthorized
    case notFound
    case conflict
    case serverError(Int)
    case httpError(Int)
    case decodingFailed

    var errorDescription: String? {
        switch self {
        case .invalidResponse: return "Invalid response from server."
        case .unauthorized: return "Unauthorized. Check your credentials."
        case .notFound: return "Resource not found on server."
        case .conflict: return "Conflict with existing resource."
        case .serverError(let code): return "Server error (\(code))."
        case .httpError(let code): return "HTTP error (\(code))."
        case .decodingFailed: return "Failed to decode server response."
        }
    }
}

import XCTest
@testable import Preacher

/// Tests for API error handling and URL construction.
final class APIClientTests: XCTestCase {

    // MARK: - APIError

    func testAPIErrorDescriptions() {
        XCTAssertNotNil(APIError.invalidResponse.errorDescription)
        XCTAssertNotNil(APIError.unauthorized.errorDescription)
        XCTAssertNotNil(APIError.notFound.errorDescription)
        XCTAssertNotNil(APIError.conflict.errorDescription)
        XCTAssertNotNil(APIError.serverError(500).errorDescription)
        XCTAssertNotNil(APIError.httpError(418).errorDescription)
        XCTAssertNotNil(APIError.decodingFailed.errorDescription)
    }

    func testServerErrorIncludesStatusCode() {
        let error = APIError.serverError(503)
        XCTAssertTrue(error.errorDescription!.contains("503"))
    }

    func testHTTPErrorIncludesStatusCode() {
        let error = APIError.httpError(429)
        XCTAssertTrue(error.errorDescription!.contains("429"))
    }

    // MARK: - PreacherError

    func testPreacherErrorDescriptions() {
        XCTAssertNotNil(PreacherError.invalidServerURL.errorDescription)
        XCTAssertTrue(PreacherError.invalidServerURL.errorDescription!.contains("Invalid"))

        XCTAssertNotNil(PreacherError.serverUnreachable.errorDescription)
        XCTAssertTrue(PreacherError.serverUnreachable.errorDescription!.contains("reach"))

        XCTAssertNotNil(PreacherError.registrationFailed.errorDescription)
        XCTAssertTrue(PreacherError.registrationFailed.errorDescription!.contains("register"))
    }

    // MARK: - URL Construction

    func testHealthEndpointURL() {
        let base = URL(string: "https://pulpit.example.com")!
        let url = base.appendingPathComponent("api/v1/health")
        XCTAssertEqual(url.absoluteString, "https://pulpit.example.com/api/v1/health")
    }

    func testDevicesEndpointURL() {
        let base = URL(string: "http://192.168.1.50:26547")!
        let url = base.appendingPathComponent("api/v1/devices")
        XCTAssertEqual(url.absoluteString, "http://192.168.1.50:26547/api/v1/devices")
    }

    func testWebSocketURLConversion() {
        // Test the ws/wss URL scheme conversion logic used by WebSocketManager
        let httpURL = URL(string: "http://localhost:26547")!
        var components = URLComponents(url: httpURL, resolvingAgainstBaseURL: false)!
        components.scheme = components.scheme == "https" ? "wss" : "ws"
        components.path = "/ws"

        XCTAssertEqual(components.url?.absoluteString, "ws://localhost:26547/ws")
    }

    func testWebSocketHTTPSConversion() {
        let httpsURL = URL(string: "https://pulpit.example.com")!
        var components = URLComponents(url: httpsURL, resolvingAgainstBaseURL: false)!
        components.scheme = components.scheme == "https" ? "wss" : "ws"
        components.path = "/ws"

        XCTAssertEqual(components.url?.absoluteString, "wss://pulpit.example.com/ws")
    }

    // MARK: - Shortcuts URL Scheme

    func testShortcutURLConstruction() {
        var components = URLComponents()
        components.scheme = "shortcuts"
        components.host = "run-shortcut"
        components.queryItems = [
            URLQueryItem(name: "name", value: "Morning Routine"),
        ]

        XCTAssertNotNil(components.url)
        let url = components.url!
        XCTAssertEqual(url.scheme, "shortcuts")
        XCTAssertEqual(url.host, "run-shortcut")
        XCTAssertTrue(url.absoluteString.contains("name=Morning"))
    }

    func testShortcutURLWithInput() {
        var components = URLComponents()
        components.scheme = "shortcuts"
        components.host = "run-shortcut"
        components.queryItems = [
            URLQueryItem(name: "name", value: "Process Text"),
            URLQueryItem(name: "input", value: "text"),
            URLQueryItem(name: "text", value: "Hello World"),
        ]

        let url = components.url!
        XCTAssertTrue(url.absoluteString.contains("input=text"))
        XCTAssertTrue(url.absoluteString.contains("text=Hello"))
    }

    func testShortcutURLWithSpecialCharacters() {
        var components = URLComponents()
        components.scheme = "shortcuts"
        components.host = "run-shortcut"
        components.queryItems = [
            URLQueryItem(name: "name", value: "My Shortcut & More"),
        ]

        // URLComponents should percent-encode the ampersand
        let url = components.url!
        XCTAssertNotNil(url)
        XCTAssertFalse(url.absoluteString.contains("&More"))
    }

    // MARK: - Server URL Normalization

    func testServerURLNormalizationRemovesTrailingSlash() {
        let url = "https://pulpit.example.com/"
        let normalized = url.hasSuffix("/") ? String(url.dropLast()) : url
        XCTAssertEqual(normalized, "https://pulpit.example.com")
    }

    func testServerURLNormalizationKeepsCleanURL() {
        let url = "https://pulpit.example.com"
        let normalized = url.hasSuffix("/") ? String(url.dropLast()) : url
        XCTAssertEqual(normalized, "https://pulpit.example.com")
    }

    func testServerURLWithPort() {
        let url = "http://192.168.1.100:26547"
        XCTAssertNotNil(URL(string: url))

        let parsed = URL(string: url)!
        XCTAssertEqual(parsed.port, 26547)
        XCTAssertEqual(parsed.host, "192.168.1.100")
    }
}

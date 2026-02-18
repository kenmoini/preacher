import XCTest
@testable import Preacher

/// Tests for WebSocket message JSON parsing logic.
/// These test the JSON structure that the WebSocket protocol uses.
final class WebSocketMessageTests: XCTestCase {

    // MARK: - Client -> Server Messages

    func testAuthMessageFormat() throws {
        let message: [String: Any] = [
            "type": "auth",
            "token": "my-registration-token",
        ]
        let data = try JSONSerialization.data(withJSONObject: message)
        let parsed = try JSONSerialization.jsonObject(with: data) as! [String: Any]

        XCTAssertEqual(parsed["type"] as? String, "auth")
        XCTAssertEqual(parsed["token"] as? String, "my-registration-token")
    }

    func testExecuteResultMessageFormat() throws {
        let message: [String: Any] = [
            "type": "execute_result",
            "id": "exec-uuid-123",
            "success": true,
            "output": "Done!",
        ]
        let data = try JSONSerialization.data(withJSONObject: message)
        let parsed = try JSONSerialization.jsonObject(with: data) as! [String: Any]

        XCTAssertEqual(parsed["type"] as? String, "execute_result")
        XCTAssertEqual(parsed["id"] as? String, "exec-uuid-123")
        XCTAssertEqual(parsed["success"] as? Bool, true)
        XCTAssertEqual(parsed["output"] as? String, "Done!")
    }

    func testStatusMessageFormat() throws {
        let message: [String: Any] = [
            "type": "status",
            "automationServerReady": true,
        ]
        let data = try JSONSerialization.data(withJSONObject: message)
        let parsed = try JSONSerialization.jsonObject(with: data) as! [String: Any]

        XCTAssertEqual(parsed["type"] as? String, "status")
        XCTAssertEqual(parsed["automationServerReady"] as? Bool, true)
    }

    func testPongMessageFormat() throws {
        let message: [String: Any] = ["type": "pong"]
        let data = try JSONSerialization.data(withJSONObject: message)
        let parsed = try JSONSerialization.jsonObject(with: data) as! [String: Any]

        XCTAssertEqual(parsed["type"] as? String, "pong")
    }

    // MARK: - Server -> Client Messages

    func testParseAuthOk() throws {
        let json = """
        {"type": "auth_ok", "deviceId": "device-uuid-123"}
        """.data(using: .utf8)!

        let parsed = try JSONSerialization.jsonObject(with: json) as! [String: Any]
        XCTAssertEqual(parsed["type"] as? String, "auth_ok")
        XCTAssertEqual(parsed["deviceId"] as? String, "device-uuid-123")
    }

    func testParseExecuteShortcut() throws {
        let json = """
        {
            "type": "execute_shortcut",
            "id": "exec-456",
            "shortcutName": "Morning Routine",
            "input": "start now"
        }
        """.data(using: .utf8)!

        let parsed = try JSONSerialization.jsonObject(with: json) as! [String: Any]
        XCTAssertEqual(parsed["type"] as? String, "execute_shortcut")
        XCTAssertEqual(parsed["id"] as? String, "exec-456")
        XCTAssertEqual(parsed["shortcutName"] as? String, "Morning Routine")
        XCTAssertEqual(parsed["input"] as? String, "start now")
    }

    func testParseExecuteShortcutWithoutInput() throws {
        let json = """
        {"type": "execute_shortcut", "id": "exec-789", "shortcutName": "Toggle Lights"}
        """.data(using: .utf8)!

        let parsed = try JSONSerialization.jsonObject(with: json) as! [String: Any]
        XCTAssertEqual(parsed["type"] as? String, "execute_shortcut")
        XCTAssertNil(parsed["input"])
    }

    func testParseNotification() throws {
        let json = """
        {
            "type": "notification",
            "payload": {
                "title": "Alert",
                "text": "Something happened",
                "sound": "system",
                "actions": [
                    {"name": "Open", "url": "https://example.com"}
                ]
            }
        }
        """.data(using: .utf8)!

        let parsed = try JSONSerialization.jsonObject(with: json) as! [String: Any]
        XCTAssertEqual(parsed["type"] as? String, "notification")

        let payload = parsed["payload"] as! [String: Any]
        XCTAssertEqual(payload["title"] as? String, "Alert")
        XCTAssertEqual(payload["text"] as? String, "Something happened")
        XCTAssertEqual(payload["sound"] as? String, "system")

        let actions = payload["actions"] as! [[String: Any]]
        XCTAssertEqual(actions.count, 1)
        XCTAssertEqual(actions[0]["name"] as? String, "Open")
    }

    func testParsePing() throws {
        let json = """
        {"type": "ping"}
        """.data(using: .utf8)!

        let parsed = try JSONSerialization.jsonObject(with: json) as! [String: Any]
        XCTAssertEqual(parsed["type"] as? String, "ping")
    }

    // MARK: - Error Cases

    func testInvalidJSON() {
        let invalid = "not json".data(using: .utf8)!
        XCTAssertThrowsError(try JSONSerialization.jsonObject(with: invalid))
    }

    func testMissingTypeField() throws {
        let json = """
        {"deviceId": "abc"}
        """.data(using: .utf8)!

        let parsed = try JSONSerialization.jsonObject(with: json) as! [String: Any]
        XCTAssertNil(parsed["type"])
    }
}

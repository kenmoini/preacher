import XCTest
@testable import Preacher

final class ModelTests: XCTestCase {

    // MARK: - ServerConfig

    func testServerConfigEncodeDecode() throws {
        let config = ServerConfig(
            url: "https://pulpit.example.com",
            deviceId: "abc-123",
            registrationToken: "tok-456",
            deviceName: "My iPhone"
        )

        let data = try JSONEncoder().encode(config)
        let decoded = try JSONDecoder().decode(ServerConfig.self, from: data)

        XCTAssertEqual(decoded.url, "https://pulpit.example.com")
        XCTAssertEqual(decoded.deviceId, "abc-123")
        XCTAssertEqual(decoded.registrationToken, "tok-456")
        XCTAssertEqual(decoded.deviceName, "My iPhone")
    }

    func testServerConfigDecodeFromJSON() throws {
        let json = """
        {
            "url": "http://192.168.1.50:26547",
            "deviceId": "device-uuid",
            "registrationToken": "reg-token",
            "deviceName": "Test Device"
        }
        """.data(using: .utf8)!

        let config = try JSONDecoder().decode(ServerConfig.self, from: json)
        XCTAssertEqual(config.url, "http://192.168.1.50:26547")
        XCTAssertEqual(config.deviceId, "device-uuid")
    }

    // MARK: - DeviceRegistrationRequest

    func testDeviceRegistrationRequestEncode() throws {
        let request = DeviceRegistrationRequest(
            name: "iPhone 15",
            apnsToken: "abcdef0123456789",
            platform: "ios"
        )

        let data = try JSONEncoder().encode(request)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]

        XCTAssertEqual(json["name"] as? String, "iPhone 15")
        XCTAssertEqual(json["apnsToken"] as? String, "abcdef0123456789")
        XCTAssertEqual(json["platform"] as? String, "ios")
    }

    // MARK: - DeviceRegistrationResponse

    func testDeviceRegistrationResponseDecode() throws {
        let json = """
        {
            "id": "device-uuid-123",
            "registrationToken": "64-char-hex-token"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(DeviceRegistrationResponse.self, from: json)
        XCTAssertEqual(response.id, "device-uuid-123")
        XCTAssertEqual(response.registrationToken, "64-char-hex-token")
    }

    // MARK: - PreacherNotification

    func testPreacherNotificationDecode() throws {
        let json = """
        {
            "id": "notif-1",
            "title": "Server Alert",
            "text": "Disk usage at 90%",
            "receivedAt": 1700000000,
            "threadId": "server-alerts",
            "actions": [
                {
                    "id": "act-1",
                    "name": "View Dashboard",
                    "url": "https://example.com/dashboard",
                    "keepNotification": true
                }
            ]
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .secondsSince1970

        let notification = try decoder.decode(PreacherNotification.self, from: json)
        XCTAssertEqual(notification.id, "notif-1")
        XCTAssertEqual(notification.title, "Server Alert")
        XCTAssertEqual(notification.text, "Disk usage at 90%")
        XCTAssertEqual(notification.threadId, "server-alerts")
        XCTAssertEqual(notification.actions?.count, 1)
        XCTAssertEqual(notification.actions?.first?.name, "View Dashboard")
        XCTAssertEqual(notification.actions?.first?.url, "https://example.com/dashboard")
        XCTAssertEqual(notification.actions?.first?.keepNotification, true)
    }

    func testPreacherNotificationMinimal() throws {
        let json = """
        {
            "id": "notif-2",
            "title": "Simple Alert",
            "receivedAt": 1700000000
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .secondsSince1970

        let notification = try decoder.decode(PreacherNotification.self, from: json)
        XCTAssertEqual(notification.id, "notif-2")
        XCTAssertEqual(notification.title, "Simple Alert")
        XCTAssertNil(notification.text)
        XCTAssertNil(notification.actions)
        XCTAssertNil(notification.threadId)
    }

    // MARK: - PreacherAction

    func testPreacherActionDecode() throws {
        let json = """
        {
            "id": "action-1",
            "name": "Run Backup",
            "shortcut": "Backup Script",
            "input": "daily",
            "runOnServer": true,
            "keepNotification": false
        }
        """.data(using: .utf8)!

        let action = try JSONDecoder().decode(PreacherAction.self, from: json)
        XCTAssertEqual(action.id, "action-1")
        XCTAssertEqual(action.name, "Run Backup")
        XCTAssertEqual(action.shortcut, "Backup Script")
        XCTAssertEqual(action.input, "daily")
        XCTAssertEqual(action.runOnServer, true)
        XCTAssertEqual(action.keepNotification, false)
        XCTAssertNil(action.url)
    }

    // MARK: - ShortcutExecution

    func testShortcutExecutionProperties() {
        let execution = ShortcutExecution(
            id: "exec-1",
            shortcutName: "Morning Routine",
            input: "start",
            success: true,
            output: "Completed",
            error: nil,
            timestamp: Date()
        )

        XCTAssertEqual(execution.id, "exec-1")
        XCTAssertEqual(execution.shortcutName, "Morning Routine")
        XCTAssertEqual(execution.input, "start")
        XCTAssertTrue(execution.success)
        XCTAssertEqual(execution.output, "Completed")
        XCTAssertNil(execution.error)
    }

    func testShortcutExecutionFailure() {
        let execution = ShortcutExecution(
            id: "exec-2",
            shortcutName: "Failing Script",
            input: nil,
            success: false,
            output: nil,
            error: "Timeout after 30s",
            timestamp: Date()
        )

        XCTAssertFalse(execution.success)
        XCTAssertEqual(execution.error, "Timeout after 30s")
        XCTAssertNil(execution.input)
    }
}

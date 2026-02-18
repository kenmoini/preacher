import XCTest
@testable import Preacher

/// Tests for App Intent error types.
final class IntentTests: XCTestCase {

    // MARK: - SendNotificationError

    func testSendNotificationErrorNotConfigured() {
        let error = SendNotificationError.notConfigured
        XCTAssertNotNil(error.localizedStringResource)
    }

    func testSendNotificationErrorNetworkError() {
        let error = SendNotificationError.networkError
        XCTAssertNotNil(error.localizedStringResource)
    }

    func testSendNotificationErrorServerError() {
        let error = SendNotificationError.serverError("Bad Request")
        XCTAssertNotNil(error.localizedStringResource)
    }

    // MARK: - RunServerActionError

    func testRunServerActionErrorNotConfigured() {
        let error = RunServerActionError.notConfigured
        XCTAssertNotNil(error.localizedStringResource)
    }

    func testRunServerActionErrorNetworkError() {
        let error = RunServerActionError.networkError
        XCTAssertNotNil(error.localizedStringResource)
    }

    func testRunServerActionErrorServerError() {
        let error = RunServerActionError.serverError("Internal Server Error")
        XCTAssertNotNil(error.localizedStringResource)
    }

    // MARK: - Notification Endpoint URL Construction

    func testTemplateNotificationURL() {
        let base = URL(string: "https://pulpit.example.com")!
        let url = base.appendingPathComponent("api/v1/notifications/welcome")
        XCTAssertEqual(url.absoluteString, "https://pulpit.example.com/api/v1/notifications/welcome")
    }

    func testAdHocNotificationURL() {
        let base = URL(string: "https://pulpit.example.com")!
        let url = base.appendingPathComponent("api/v1/notifications")
        XCTAssertEqual(url.absoluteString, "https://pulpit.example.com/api/v1/notifications")
    }

    func testExecuteActionURL() {
        let base = URL(string: "https://pulpit.example.com")!
        let url = base.appendingPathComponent("api/v1/execute")
        XCTAssertEqual(url.absoluteString, "https://pulpit.example.com/api/v1/execute")
    }
}

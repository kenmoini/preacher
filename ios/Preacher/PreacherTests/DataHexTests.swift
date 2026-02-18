import XCTest
@testable import Preacher

final class DataHexTests: XCTestCase {

    func testEmptyData() {
        let data = Data()
        XCTAssertEqual(data.hexString, "")
    }

    func testSingleByte() {
        let data = Data([0xFF])
        XCTAssertEqual(data.hexString, "ff")
    }

    func testMultipleBytes() {
        let data = Data([0xDE, 0xAD, 0xBE, 0xEF])
        XCTAssertEqual(data.hexString, "deadbeef")
    }

    func testAllZeros() {
        let data = Data([0x00, 0x00, 0x00])
        XCTAssertEqual(data.hexString, "000000")
    }

    func testTypicalAPNsToken() {
        // APNs tokens are 32 bytes -> 64 hex chars
        let bytes: [UInt8] = (0..<32).map { UInt8($0) }
        let data = Data(bytes)
        let hex = data.hexString
        XCTAssertEqual(hex.count, 64)
        XCTAssertTrue(hex.hasPrefix("000102"))
    }

    func testLowercaseOutput() {
        let data = Data([0xAB, 0xCD])
        XCTAssertEqual(data.hexString, "abcd")
        // Verify no uppercase characters
        XCTAssertEqual(data.hexString, data.hexString.lowercased())
    }
}

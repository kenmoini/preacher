import Foundation

struct ServerConfig: Codable {
    let url: String
    let deviceId: String
    let registrationToken: String
    let deviceName: String
}

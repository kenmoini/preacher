import Foundation

struct DeviceRegistrationRequest: Codable {
    let name: String
    let apnsToken: String
    let platform: String
}

struct DeviceRegistrationResponse: Codable {
    let id: String
    let registrationToken: String
}

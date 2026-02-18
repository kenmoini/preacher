import Foundation

struct PreacherNotification: Identifiable, Codable {
    let id: String
    let title: String
    let text: String?
    let receivedAt: Date
    let actions: [PreacherAction]?
    let threadId: String?
}

struct PreacherAction: Identifiable, Codable {
    let id: String
    let name: String
    let input: String?
    let shortcut: String?
    let url: String?
    let runOnServer: Bool?
    let keepNotification: Bool?
}

import Foundation

struct ShortcutExecution: Identifiable {
    let id: String
    let shortcutName: String
    let input: String?
    let success: Bool
    let output: String?
    let error: String?
    let timestamp: Date
}

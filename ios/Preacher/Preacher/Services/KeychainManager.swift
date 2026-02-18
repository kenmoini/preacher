import Foundation
import Security

enum KeychainManager {
    private static let service = "com.kenmoini.Preacher"

    enum Key: String {
        case serverURL = "preacher_server_url"
        case deviceId = "preacher_device_id"
        case registrationToken = "preacher_registration_token"
        case deviceName = "preacher_device_name"
        case apnsToken = "preacher_apns_token"
    }

    @discardableResult
    static func save(_ key: Key, value: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }

        // Delete existing item first
        delete(key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    static func load(_ key: Key) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    static func delete(_ key: Key) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    static func deleteAll() {
        for key in [Key.serverURL, .deviceId, .registrationToken, .deviceName, .apnsToken] {
            delete(key)
        }
    }

    // Convenience: save full ServerConfig
    static func saveConfig(_ config: ServerConfig) {
        save(.serverURL, value: config.url)
        save(.deviceId, value: config.deviceId)
        save(.registrationToken, value: config.registrationToken)
        save(.deviceName, value: config.deviceName)
    }

    static func loadConfig() -> ServerConfig? {
        guard let url = load(.serverURL),
              let deviceId = load(.deviceId),
              let token = load(.registrationToken),
              let name = load(.deviceName) else {
            return nil
        }
        return ServerConfig(url: url, deviceId: deviceId, registrationToken: token, deviceName: name)
    }
}

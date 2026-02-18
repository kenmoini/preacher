import UserNotifications

class NotificationService: UNNotificationServiceExtension {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let content = bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        let userInfo = request.content.userInfo

        // Try to attach an image from the "image" URL or "imageData" base64
        Task {
            if let imageURL = userInfo["image"] as? String {
                await attachImageFromURL(imageURL, to: content)
            } else if let imageData = userInfo["imageData"] as? String {
                attachImageFromBase64(imageData, to: content)
            }

            contentHandler(content)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        // Deliver the best attempt content before the extension is terminated
        if let contentHandler, let bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }

    // MARK: - Image Attachment

    private func attachImageFromURL(_ urlString: String, to content: UNMutableNotificationContent) async {
        guard let url = URL(string: urlString) else { return }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else { return }

            let ext = fileExtension(for: httpResponse.mimeType)
            let tempURL = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString)
                .appendingPathExtension(ext)

            try data.write(to: tempURL)

            let attachment = try UNNotificationAttachment(
                identifier: "image",
                url: tempURL,
                options: nil
            )
            content.attachments = [attachment]
        } catch {
            print("[NotificationService] Failed to download image: \(error)")
        }
    }

    private func attachImageFromBase64(_ base64String: String, to content: UNMutableNotificationContent) {
        guard let data = Data(base64Encoded: base64String) else { return }

        let ext = detectImageType(data)
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension(ext)

        do {
            try data.write(to: tempURL)
            let attachment = try UNNotificationAttachment(
                identifier: "image",
                url: tempURL,
                options: nil
            )
            content.attachments = [attachment]
        } catch {
            print("[NotificationService] Failed to create attachment from base64: \(error)")
        }
    }

    private func fileExtension(for mimeType: String?) -> String {
        switch mimeType {
        case "image/png": return "png"
        case "image/gif": return "gif"
        case "image/webp": return "webp"
        default: return "jpg"
        }
    }

    private func detectImageType(_ data: Data) -> String {
        guard data.count >= 4 else { return "jpg" }
        let bytes = [UInt8](data.prefix(4))

        if bytes[0] == 0x89 && bytes[1] == 0x50 { return "png" }
        if bytes[0] == 0x47 && bytes[1] == 0x49 { return "gif" }
        return "jpg"
    }
}

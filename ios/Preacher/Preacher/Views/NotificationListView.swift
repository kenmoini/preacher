import SwiftUI

struct NotificationListView: View {
    @EnvironmentObject var appViewModel: AppViewModel

    var body: some View {
        NavigationStack {
            if appViewModel.notificationManager.notifications.isEmpty {
                ContentUnavailableView(
                    "No Notifications",
                    systemImage: "bell.slash",
                    description: Text("Notifications from your Pulpit server will appear here.")
                )
                .navigationTitle("Notifications")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        connectionIndicator
                    }
                }
            } else {
                List {
                    ForEach(appViewModel.notificationManager.notifications) { notification in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(notification.title)
                                .font(.headline)
                            if let text = notification.text {
                                Text(text)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            Text(notification.receivedAt, style: .relative)
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                .navigationTitle("Notifications")
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        connectionIndicator
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Clear") {
                            appViewModel.notificationManager.clearHistory()
                        }
                    }
                }
            }
        }
    }

    private var connectionIndicator: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(appViewModel.isWebSocketConnected ? .green : .orange)
                .frame(width: 8, height: 8)
            Text(appViewModel.isWebSocketConnected ? "Live" : "Offline")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

#Preview {
    NotificationListView()
        .environmentObject(AppViewModel())
}

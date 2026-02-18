import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    @State private var showResetConfirmation = false

    var body: some View {
        NavigationStack {
            List {
                Section("Server") {
                    HStack {
                        Text("URL")
                        Spacer()
                        Text(appViewModel.serverURL ?? "Not configured")
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }

                    HStack {
                        Text("WebSocket")
                        Spacer()
                        HStack(spacing: 6) {
                            Circle()
                                .fill(appViewModel.isWebSocketConnected ? .green : .red)
                                .frame(width: 8, height: 8)
                            Text(appViewModel.isWebSocketConnected ? "Connected" : "Disconnected")
                                .foregroundStyle(.secondary)
                        }
                    }

                    if let error = appViewModel.connectionError {
                        HStack {
                            Image(systemName: "exclamationmark.triangle")
                                .foregroundStyle(.orange)
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    if !appViewModel.isWebSocketConnected {
                        Button("Reconnect") {
                            appViewModel.connectWebSocket()
                        }
                    }
                }

                Section("Device") {
                    HStack {
                        Text("Name")
                        Spacer()
                        Text(appViewModel.deviceName ?? "Unknown")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("Device ID")
                        Spacer()
                        Text(appViewModel.deviceId ?? "Not registered")
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                }

                Section("Notifications") {
                    HStack {
                        Text("Push Notifications")
                        Spacer()
                        Text(appViewModel.notificationManager.isAuthorized ? "Enabled" : "Disabled")
                            .foregroundStyle(appViewModel.notificationManager.isAuthorized ? .green : .red)
                    }

                    HStack {
                        Text("History")
                        Spacer()
                        Text("\(appViewModel.notificationManager.notifications.count) notifications")
                            .foregroundStyle(.secondary)
                    }
                }

                Section {
                    Button("Disconnect & Reset", role: .destructive) {
                        showResetConfirmation = true
                    }
                } footer: {
                    Text("This will remove all stored credentials and disconnect from the server.")
                }

                Section {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("0.1.0")
                            .foregroundStyle(.secondary)
                    }
                } header: {
                    Text("About")
                } footer: {
                    Text("Preacher - Open source push notification client for iOS\nhttps://github.com/kenmoini/preacher")
                }
            }
            .navigationTitle("Settings")
            .confirmationDialog("Reset Preacher?", isPresented: $showResetConfirmation) {
                Button("Disconnect & Reset", role: .destructive) {
                    appViewModel.reset()
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("This will delete all stored credentials and notification history. You will need to set up the app again.")
            }
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(AppViewModel())
}

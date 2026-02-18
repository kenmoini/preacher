import SwiftUI

struct AutomationServerView: View {
    @EnvironmentObject var appViewModel: AppViewModel

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Toggle("Automation Server Mode", isOn: $appViewModel.isAutomationServerEnabled)

                    if appViewModel.isAutomationServerEnabled {
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
                                    .font(.caption)
                                Text(error)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: {
                    Text("Server")
                } footer: {
                    if appViewModel.isAutomationServerEnabled {
                        Text("Screen auto-lock is disabled while automation mode is active. Keep the app in the foreground for reliable shortcut execution.")
                    } else {
                        Text("When enabled, this device will automatically execute shortcuts triggered from your Pulpit server.")
                    }
                }

                if appViewModel.isAutomationServerEnabled {
                    // Active execution
                    if appViewModel.shortcutRunner.isExecuting,
                       let current = appViewModel.shortcutRunner.currentShortcut {
                        Section("Active Execution") {
                            HStack {
                                ProgressView()
                                    .padding(.trailing, 4)
                                VStack(alignment: .leading) {
                                    Text(current)
                                        .font(.body)
                                    Text("Running...")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Button("Cancel") {
                                    appViewModel.shortcutRunner.cancelAll()
                                }
                                .font(.caption)
                                .foregroundStyle(.red)
                            }
                        }
                    }

                    Section {
                        if appViewModel.recentExecutions.isEmpty {
                            HStack {
                                Spacer()
                                VStack(spacing: 8) {
                                    Image(systemName: "clock.arrow.circlepath")
                                        .font(.title2)
                                        .foregroundStyle(.tertiary)
                                    Text("No executions yet")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                    Text("Trigger an action from the Pulpit dashboard or API")
                                        .font(.caption)
                                        .foregroundStyle(.tertiary)
                                        .multilineTextAlignment(.center)
                                }
                                .padding(.vertical, 12)
                                Spacer()
                            }
                        } else {
                            ForEach(appViewModel.recentExecutions, id: \.id) { execution in
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(execution.shortcutName)
                                            .font(.body)
                                        HStack(spacing: 4) {
                                            Text(execution.timestamp, style: .relative)
                                            if let error = execution.error {
                                                Text("- \(error)")
                                            }
                                        }
                                        .font(.caption)
                                        .foregroundStyle(.tertiary)
                                    }
                                    Spacer()
                                    Image(systemName: execution.success ? "checkmark.circle.fill" : "xmark.circle.fill")
                                        .foregroundStyle(execution.success ? .green : .red)
                                }
                            }
                        }
                    } header: {
                        HStack {
                            Text("Recent Executions")
                            Spacer()
                            if !appViewModel.recentExecutions.isEmpty {
                                Text("\(appViewModel.recentExecutions.count)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Automation")
        }
    }
}

#Preview {
    AutomationServerView()
        .environmentObject(AppViewModel())
}

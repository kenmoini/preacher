import SwiftUI

struct SetupView: View {
    @EnvironmentObject var appViewModel: AppViewModel
    @State private var serverURL = ""
    @State private var deviceName = ""
    @State private var isConnecting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                VStack(spacing: 8) {
                    Image(systemName: "bell.badge.waveform")
                        .font(.system(size: 60))
                        .foregroundStyle(.blue)

                    Text("Preacher")
                        .font(.largeTitle.bold())

                    Text("Connect to your Pulpit server")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                VStack(spacing: 16) {
                    TextField("Server URL", text: $serverURL)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)

                    TextField("Device Name", text: $deviceName)
                        .textFieldStyle(.roundedBorder)

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
                .padding(.horizontal, 32)

                Button {
                    connect()
                } label: {
                    if isConnecting {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Connect")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .padding(.horizontal, 32)
                .disabled(serverURL.isEmpty || deviceName.isEmpty || isConnecting)

                Spacer()
                Spacer()
            }
            .navigationTitle("Setup")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func connect() {
        isConnecting = true
        errorMessage = nil
        Task {
            do {
                try await appViewModel.configure(serverURL: serverURL, deviceName: deviceName)
            } catch {
                errorMessage = error.localizedDescription
            }
            isConnecting = false
        }
    }
}

#Preview {
    SetupView()
        .environmentObject(AppViewModel())
}

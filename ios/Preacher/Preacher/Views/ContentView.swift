import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appViewModel: AppViewModel

    var body: some View {
        Group {
            if appViewModel.isConfigured {
                MainTabView()
            } else {
                SetupView()
            }
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            NotificationListView()
                .tabItem {
                    Label("Notifications", systemImage: "bell")
                }

            AutomationServerView()
                .tabItem {
                    Label("Automation", systemImage: "gearshape.2")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppViewModel())
}

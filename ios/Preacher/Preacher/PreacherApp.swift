import SwiftUI

@main
struct PreacherApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var appViewModel = AppViewModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appViewModel)
                .onAppear {
                    appDelegate.appViewModel = appViewModel
                }
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .active {
                        // Notify ShortcutRunner that app returned to foreground
                        // (e.g., after Shortcuts app finishes executing)
                        appViewModel.handleAppDidBecomeActive()
                    }
                }
        }
    }
}

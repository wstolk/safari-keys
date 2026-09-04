import SwiftUI
import SafariServices

@main
struct SafariKeysApp: App {
    @StateObject private var store = SettingsStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
        .windowResizability(.contentSize)
        .defaultSize(width: 520, height: 620)

        Settings {
            SettingsView()
                .environmentObject(store)
        }
    }
}

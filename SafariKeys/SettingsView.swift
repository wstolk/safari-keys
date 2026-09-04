import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: SettingsStore

    var body: some View {
        Form {
            Section("Hints") {
                TextField("Hint characters", text: $store.hintCharacters)
                    .font(.body.monospaced())
                Text("Used to label links when you press f.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Section("Scrolling") {
                Stepper(value: $store.scrollStep, in: 20...240, step: 10) {
                    Text("Scroll step  \(store.scrollStep) px")
                }
                Toggle("Smooth scrolling", isOn: $store.smoothScroll)
            }
            Section("Excluded sites") {
                TextEditor(text: $store.excludedHostsText)
                    .font(.body.monospaced())
                    .frame(minHeight: 96)
                Text("One host per line, such as github.com. Subdomains are included.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .frame(minWidth: 420, minHeight: 380)
        .onChange(of: store.hintCharacters) { _, _ in store.save() }
        .onChange(of: store.scrollStep) { _, _ in store.save() }
        .onChange(of: store.smoothScroll) { _, _ in store.save() }
        .onChange(of: store.excludedHostsText) { _, _ in store.save() }
    }
}

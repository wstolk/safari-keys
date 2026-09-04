import AppKit
import SafariServices
import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var store: SettingsStore
    @Environment(\.scenePhase) private var scenePhase
    @State private var extensionEnabled = false
    @State private var statusLoaded = false

    private let extensionIdentifier = AppSettings.extensionBundleID

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            HStack(alignment: .center, spacing: 14) {
                Image(nsImage: NSApp.applicationIconImage)
                    .resizable()
                    .frame(width: 64, height: 64)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 4) {
                    Text("Safari Keys")
                        .font(.largeTitle.weight(.semibold))
                    Text("Vim-style keys for Safari.")
                        .foregroundStyle(.secondary)
                }
            }

            statusCard

            Button("Open Safari Settings…") {
                Task { await openSafariSettings() }
            }
            .keyboardShortcut(.defaultAction)

            cheatsheet

            Text("On a webpage, press ? for the full list. Keys only run on sites Safari has allowed — choose Always Allow on Every Website.")
                .font(.callout)
                .foregroundStyle(.secondary)
        }
        .padding(28)
        .frame(minWidth: 480)
        .task {
            await refreshState()
            if CommandLine.arguments.contains("--show-safari-settings") {
                await openSafariSettings()
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                Task { await refreshState() }
            }
        }
    }

    private var statusCard: some View {
        HStack(spacing: 12) {
            Image(systemName: extensionEnabled ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                .font(.title2)
                .foregroundStyle(extensionEnabled ? Color.green : Color.orange)
            VStack(alignment: .leading, spacing: 2) {
                Text(statusLoaded ? (extensionEnabled ? "Extension enabled" : "Extension is off") : "Checking Safari…")
                    .font(.headline)
                Text(extensionEnabled
                     ? "If keys are missing on a page, click the Safari Keys toolbar button and choose Always Allow on Every Website."
                     : "Enable Safari Keys in Safari Settings, then set website access to All Websites.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(14)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var cheatsheet: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Start here")
                .font(.headline)
            Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 6) {
                row("j k", "Scroll")
                row("f F", "Follow a link")
                row("o T", "Command palette / tabs")
                row("J K", "Previous / next tab")
                row("i Esc", "Insert / normal")
            }
            .font(.body.monospaced())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func row(_ keys: String, _ label: String) -> some View {
        GridRow {
            Text(keys)
                .foregroundStyle(.primary)
            Text(label)
                .font(.body)
                .fontDesign(.default)
                .foregroundStyle(.secondary)
        }
    }

    private func openSafariSettings() async {
        try? await SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionIdentifier)
    }

    private func refreshState() async {
        let enabled = (try? await SFSafariExtensionManager.stateOfSafariExtension(withIdentifier: extensionIdentifier))?.isEnabled ?? false
        extensionEnabled = enabled
        statusLoaded = true
        store.save()
    }
}

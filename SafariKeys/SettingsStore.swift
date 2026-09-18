import Foundation
import Combine

@MainActor
final class SettingsStore: ObservableObject {
    @Published var excludedHostsText: String
    @Published var hintCharacters: String
    @Published var scrollStep: Int
    @Published var smoothScroll: Bool

    init(settings: AppSettings? = nil) {
        let settings = settings ?? AppSettings.load()
        excludedHostsText = settings.excludedHosts.joined(separator: "\n")
        hintCharacters = settings.hintCharacters
        scrollStep = settings.scrollStep
        smoothScroll = settings.smoothScroll
    }

    var current: AppSettings {
        AppSettings(
            excludedHosts: AppSettings.hosts(from: excludedHostsText),
            hintCharacters: hintCharacters.isEmpty ? AppSettings.default.hintCharacters : hintCharacters,
            scrollStep: max(10, scrollStep),
            smoothScroll: smoothScroll
        )
    }

    func save() {
        current.save()
    }
}

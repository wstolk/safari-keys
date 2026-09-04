import Foundation
import Testing
@testable import SafariKeysCore

@Test func defaultSettingsHaveVimiumHintAlphabet() {
    let settings = AppSettings.default
    #expect(settings.hintCharacters == "sadfjklewcmpgh")
    #expect(settings.scrollStep == 60)
    #expect(settings.smoothScroll)
    #expect(settings.excludedHosts.isEmpty)
}

@Test func settingsRoundTripThroughJSON() throws {
    let original = AppSettings(
        excludedHosts: ["github.com", "mail.google.com"],
        hintCharacters: "asdf",
        scrollStep: 40,
        smoothScroll: false
    )
    let data = try JSONEncoder().encode(original)
    let decoded = try JSONDecoder().decode(AppSettings.self, from: data)
    #expect(decoded == original)
}

@Test func settingsDecodeFillsDefaultsForMissingKeys() throws {
    let data = Data(#"{}"#.utf8)
    let settings = try AppSettings.decodeLenient(from: data)
    #expect(settings == AppSettings.default)
}

@Test func excludedHostsParseFromMultilineText() {
    let hosts = AppSettings.hosts(from: "github.com\n\nExample.COM\n")
    #expect(hosts == ["github.com", "example.com"])
}

import Foundation

public struct AppSettings: Codable, Equatable, Sendable {
    public var excludedHosts: [String]
    public var hintCharacters: String
    public var scrollStep: Int
    public var smoothScroll: Bool

    public static let `default` = AppSettings(
        excludedHosts: [],
        hintCharacters: "sadfjklewcmpgh",
        scrollStep: 60,
        smoothScroll: true
    )

    public static let appGroupID = "group.com.safari-keys.macos"
    public static let storageKey = "settings"

    public init(
        excludedHosts: [String],
        hintCharacters: String,
        scrollStep: Int,
        smoothScroll: Bool
    ) {
        self.excludedHosts = excludedHosts
        self.hintCharacters = hintCharacters
        self.scrollStep = scrollStep
        self.smoothScroll = smoothScroll
    }

    public static func decodeLenient(from data: Data) throws -> AppSettings {
        let raw = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        return AppSettings(
            excludedHosts: (raw["excludedHosts"] as? [String]) ?? AppSettings.default.excludedHosts,
            hintCharacters: (raw["hintCharacters"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? AppSettings.default.hintCharacters,
            scrollStep: (raw["scrollStep"] as? Int).flatMap { $0 > 0 ? $0 : nil } ?? AppSettings.default.scrollStep,
            smoothScroll: raw["smoothScroll"] as? Bool ?? AppSettings.default.smoothScroll
        )
    }

    public static func hosts(from text: String) -> [String] {
        var seen = Set<String>()
        var hosts: [String] = []
        for line in text.split(whereSeparator: \.isNewline) {
            let host = line.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            guard !host.isEmpty, !seen.contains(host) else { continue }
            seen.insert(host)
            hosts.append(host)
        }
        return hosts
    }

    public func encodeData() throws -> Data {
        try JSONEncoder().encode(self)
    }

    public static func load(from defaults: UserDefaults = UserDefaults(suiteName: appGroupID) ?? .standard) -> AppSettings {
        guard let data = defaults.data(forKey: storageKey) else {
            return .default
        }
        return (try? decodeLenient(from: data)) ?? .default
    }

    public func save(to defaults: UserDefaults = UserDefaults(suiteName: appGroupID) ?? .standard) {
        defaults.set(try? encodeData(), forKey: Self.storageKey)
    }
}

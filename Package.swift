// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SafariKeysCore",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "SafariKeysCore", targets: ["SafariKeysCore"]),
    ],
    targets: [
        .target(
            name: "SafariKeysCore",
            path: "Shared"
        ),
        .testTarget(
            name: "SafariKeysCoreTests",
            dependencies: ["SafariKeysCore"]
        ),
    ]
)

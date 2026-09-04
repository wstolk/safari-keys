import SafariServices
import os.log

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        let message = request?.userInfo?[SFExtensionMessageKey]
        os_log(.default, "Safari Keys native message: %{public}@", String(describing: message))

        let payload = message as? [String: Any]
        let type = payload?["type"] as? String ?? "getSettings"
        let settings = AppSettings.load()
        var responseBody: [String: Any] = ["ok": true]

        switch type {
        case "getSettings":
            responseBody["settings"] = [
                "excludedHosts": settings.excludedHosts,
                "hintCharacters": settings.hintCharacters,
                "scrollStep": settings.scrollStep,
                "smoothScroll": settings.smoothScroll,
            ]
        default:
            responseBody["ok"] = false
        }

        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: responseBody]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}

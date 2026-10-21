import Foundation
import UIKit
import AVFoundation
import Capacitor

/// JS: Capacitor.registerPlugin('AttiehPlayer').play({ url, title, subtitle, start, introStart, introEnd, introAuto, hasNext, rtl })
/// Resolves when the viewer leaves the player: { position, duration, ended, next }   (seconds)
@objc(AttiehPlayerPlugin)
public class AttiehPlayerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AttiehPlayerPlugin"
    public let jsName = "AttiehPlayer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise)
    ]

    @objc func play(_ call: CAPPluginCall) {
        guard let s = call.getString("url"), let url = URL(string: s) else {
            call.reject("Invalid url")
            return
        }
        var opts = AttiehPlayerOptions(
            url: url,
            title: call.getString("title") ?? "",
            subtitle: call.getString("subtitle") ?? "",
            start: call.getDouble("start") ?? 0,
            introStart: call.getDouble("introStart") ?? -1,
            introEnd: call.getDouble("introEnd") ?? -1,
            introAuto: call.getBool("introAuto") ?? false,
            hasNext: call.getBool("hasNext") ?? false,
            rtl: call.getBool("rtl") ?? true
        )
        if let l = call.getObject("labels") { opts.labels = l.compactMapValues { $0 as? String } }
        DispatchQueue.main.async {
            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback, options: [])
            try? AVAudioSession.sharedInstance().setActive(true)
            let vc = AttiehPlayerViewController(options: opts)
            vc.modalPresentationStyle = .fullScreen
            vc.onFinish = { position, duration, ended, next in
                call.resolve(["position": position, "duration": duration, "ended": ended, "next": next])
            }
            guard let host = self.bridge?.viewController else { call.reject("No view controller"); return }
            var top: UIViewController = host
            while let p = top.presentedViewController { top = p }
            top.present(vc, animated: true)
        }
    }
}

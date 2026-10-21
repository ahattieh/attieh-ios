import UIKit
import MobileVLCKit

struct AttiehPlayerOptions {
    let url: URL
    let title: String
    let subtitle: String
    let start: Double
    let introStart: Double
    let introEnd: Double
    let introAuto: Bool
    let hasNext: Bool
    let rtl: Bool
    var labels: [String: String] = [:]
    func t(_ key: String, _ fallback: String) -> String { return labels[key] ?? fallback }
}

/// Full-screen VLC player: plays mkv/avi/ts and anything else iOS can't play by itself.
final class AttiehPlayerViewController: UIViewController, VLCMediaPlayerDelegate {
    var onFinish: ((Double, Double, Bool, Bool) -> Void)?

    private let opts: AttiehPlayerOptions
    private let player = VLCMediaPlayer()
    private let videoView = UIView()
    private let overlay = UIView()
    private let topShade = CAGradientLayer()
    private let bottomShade = CAGradientLayer()
    private let titleLabel = UILabel()
    private let subLabel = UILabel()
    private let closeBtn = UIButton(type: .system)
    private let tracksBtn = UIButton(type: .system)
    private let playBtn = UIButton(type: .system)
    private let backBtn = UIButton(type: .system)
    private let fwdBtn = UIButton(type: .system)
    private let slider = UISlider()
    private let curLabel = UILabel()
    private let remLabel = UILabel()
    private let skipBtn = UIButton(type: .system)
    private let nextBtn = UIButton(type: .system)
    private let spinner = UIActivityIndicatorView(style: .large)

    private var hideTimer: Timer?
    private var started = false
    private var finished = false
    private var dragging = false
    private var introDone = false
    private var lastTimeMs: Int32 = 0

    init(options: AttiehPlayerOptions) {
        self.opts = options
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError("not used") }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }
    override var preferredInterfaceOrientationForPresentation: UIInterfaceOrientation { .landscapeRight }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        view.semanticContentAttribute = opts.rtl ? .forceRightToLeft : .forceLeftToRight

        videoView.backgroundColor = .black
        videoView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(videoView)
        pin(videoView, to: view)

        overlay.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(overlay)
        pin(overlay, to: view)
        topShade.colors = [UIColor(white: 0, alpha: 0.75).cgColor, UIColor.clear.cgColor]
        bottomShade.colors = [UIColor.clear.cgColor, UIColor(white: 0, alpha: 0.85).cgColor]
        overlay.layer.addSublayer(topShade)
        overlay.layer.addSublayer(bottomShade)

        buildControls()

        spinner.color = .white
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.hidesWhenStopped = true
        view.addSubview(spinner)
        NSLayoutConstraint.activate([spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
                                     spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor)])
        spinner.startAnimating()

        let tap = UITapGestureRecognizer(target: self, action: #selector(toggleOverlay))
        tap.numberOfTapsRequired = 1
        let dbl = UITapGestureRecognizer(target: self, action: #selector(doubleTap(_:)))
        dbl.numberOfTapsRequired = 2
        tap.require(toFail: dbl)
        view.addGestureRecognizer(tap)
        view.addGestureRecognizer(dbl)

        let media = VLCMedia(url: opts.url)
        media.addOption(":network-caching=2000")
        media.addOption(":http-reconnect")
        player.media = media
        player.delegate = self
        player.drawable = videoView
        player.play()
        UIApplication.shared.isIdleTimerDisabled = true
        showOverlay()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let b = overlay.bounds
        topShade.frame = CGRect(x: 0, y: 0, width: b.width, height: 120)
        bottomShade.frame = CGRect(x: 0, y: b.height - 170, width: b.width, height: 170)
    }

    // MARK: controls
    private func buildControls() {
        func icon(_ b: UIButton, _ name: String, _ size: CGFloat) {
            if #available(iOS 13.0, *) {
                let cfg = UIImage.SymbolConfiguration(pointSize: size, weight: .semibold)
                b.setImage(UIImage(systemName: name, withConfiguration: cfg), for: .normal)
            }
            b.tintColor = .white
            b.translatesAutoresizingMaskIntoConstraints = false
            overlay.addSubview(b)
        }
        func pill(_ b: UIButton, _ text: String) {
            b.setTitle(text, for: .normal)
            b.titleLabel?.font = .systemFont(ofSize: 15, weight: .bold)
            b.setTitleColor(.black, for: .normal)
            b.backgroundColor = UIColor.white
            b.layer.cornerRadius = 20
            b.contentEdgeInsets = UIEdgeInsets(top: 9, left: 18, bottom: 9, right: 18)
            b.translatesAutoresizingMaskIntoConstraints = false
            overlay.addSubview(b)
        }

        icon(closeBtn, "xmark", 20)
        closeBtn.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        icon(tracksBtn, "captions.bubble", 20)
        tracksBtn.addTarget(self, action: #selector(tracksTapped), for: .touchUpInside)
        icon(playBtn, "pause.fill", 40)
        playBtn.addTarget(self, action: #selector(playTapped), for: .touchUpInside)
        icon(backBtn, "gobackward.10", 30)
        backBtn.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        icon(fwdBtn, "goforward.10", 30)
        fwdBtn.addTarget(self, action: #selector(fwdTapped), for: .touchUpInside)

        titleLabel.font = .systemFont(ofSize: 20, weight: .heavy)
        titleLabel.textColor = .white
        titleLabel.text = opts.title
        subLabel.font = .systemFont(ofSize: 14, weight: .medium)
        subLabel.textColor = UIColor(white: 1, alpha: 0.75)
        subLabel.text = opts.subtitle
        for l in [titleLabel, subLabel, curLabel, remLabel] {
            l.translatesAutoresizingMaskIntoConstraints = false
            overlay.addSubview(l)
        }
        titleLabel.textAlignment = .natural
        subLabel.textAlignment = .natural
        for l in [curLabel, remLabel] {
            l.font = .monospacedDigitSystemFont(ofSize: 13, weight: .semibold)
            l.textColor = .white
            l.text = "0:00"
        }

        slider.translatesAutoresizingMaskIntoConstraints = false
        slider.minimumTrackTintColor = UIColor(red: 0.96, green: 0.65, blue: 0.14, alpha: 1)
        slider.maximumTrackTintColor = UIColor(white: 1, alpha: 0.3)
        slider.semanticContentAttribute = .forceLeftToRight
        slider.addTarget(self, action: #selector(sliderBegan), for: .touchDown)
        slider.addTarget(self, action: #selector(sliderMoved), for: .valueChanged)
        slider.addTarget(self, action: #selector(sliderEnded), for: [.touchUpInside, .touchUpOutside, .touchCancel])
        overlay.addSubview(slider)

        pill(skipBtn, opts.t("skipIntro", "تخطي الشارة"))
        skipBtn.isHidden = true
        skipBtn.addTarget(self, action: #selector(skipIntro), for: .touchUpInside)
        pill(nextBtn, opts.t("next", "الحلقة التالية"))
        nextBtn.isHidden = !opts.hasNext
        nextBtn.addTarget(self, action: #selector(nextTapped), for: .touchUpInside)

        let g = overlay.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            closeBtn.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 16),
            closeBtn.topAnchor.constraint(equalTo: g.topAnchor, constant: 14),
            closeBtn.widthAnchor.constraint(equalToConstant: 44), closeBtn.heightAnchor.constraint(equalToConstant: 44),
            tracksBtn.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -16),
            tracksBtn.centerYAnchor.constraint(equalTo: closeBtn.centerYAnchor),
            tracksBtn.widthAnchor.constraint(equalToConstant: 44), tracksBtn.heightAnchor.constraint(equalToConstant: 44),
            titleLabel.leadingAnchor.constraint(equalTo: closeBtn.trailingAnchor, constant: 12),
            titleLabel.trailingAnchor.constraint(lessThanOrEqualTo: tracksBtn.leadingAnchor, constant: -12),
            titleLabel.topAnchor.constraint(equalTo: g.topAnchor, constant: 12),
            subLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            subLabel.trailingAnchor.constraint(lessThanOrEqualTo: tracksBtn.leadingAnchor, constant: -12),
            subLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 2),

            playBtn.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            playBtn.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            playBtn.widthAnchor.constraint(equalToConstant: 80), playBtn.heightAnchor.constraint(equalToConstant: 80),
            backBtn.centerYAnchor.constraint(equalTo: playBtn.centerYAnchor),
            backBtn.rightAnchor.constraint(equalTo: playBtn.leftAnchor, constant: -56),
            backBtn.widthAnchor.constraint(equalToConstant: 64), backBtn.heightAnchor.constraint(equalToConstant: 64),
            fwdBtn.centerYAnchor.constraint(equalTo: playBtn.centerYAnchor),
            fwdBtn.leftAnchor.constraint(equalTo: playBtn.rightAnchor, constant: 56),
            fwdBtn.widthAnchor.constraint(equalToConstant: 64), fwdBtn.heightAnchor.constraint(equalToConstant: 64),

            curLabel.leftAnchor.constraint(equalTo: g.leftAnchor, constant: 20),
            curLabel.bottomAnchor.constraint(equalTo: g.bottomAnchor, constant: -16),
            remLabel.rightAnchor.constraint(equalTo: g.rightAnchor, constant: -20),
            remLabel.centerYAnchor.constraint(equalTo: curLabel.centerYAnchor),
            slider.leftAnchor.constraint(equalTo: curLabel.rightAnchor, constant: 12),
            slider.rightAnchor.constraint(equalTo: remLabel.leftAnchor, constant: -12),
            slider.centerYAnchor.constraint(equalTo: curLabel.centerYAnchor),

            skipBtn.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -20),
            skipBtn.bottomAnchor.constraint(equalTo: slider.topAnchor, constant: -18),
            nextBtn.trailingAnchor.constraint(equalTo: skipBtn.leadingAnchor, constant: -10),
            nextBtn.bottomAnchor.constraint(equalTo: skipBtn.bottomAnchor)
        ])
    }

    private func pin(_ v: UIView, to p: UIView) {
        NSLayoutConstraint.activate([v.leadingAnchor.constraint(equalTo: p.leadingAnchor), v.trailingAnchor.constraint(equalTo: p.trailingAnchor),
                                     v.topAnchor.constraint(equalTo: p.topAnchor), v.bottomAnchor.constraint(equalTo: p.bottomAnchor)])
    }

    @objc private func toggleOverlay() {
        if overlay.alpha > 0.5 { hideOverlay() } else { showOverlay() }
    }
    private func showOverlay() {
        UIView.animate(withDuration: 0.2) { self.overlay.alpha = 1 }
        scheduleHide()
    }
    private func hideOverlay() {
        if dragging { return }
        UIView.animate(withDuration: 0.25) { self.overlay.alpha = 0 }
    }
    private func scheduleHide() {
        hideTimer?.invalidate()
        hideTimer = Timer.scheduledTimer(withTimeInterval: 4, repeats: false) { [weak self] _ in
            guard let self = self, self.player.isPlaying else { return }
            self.hideOverlay()
        }
    }

    @objc private func doubleTap(_ g: UITapGestureRecognizer) {
        let x = g.location(in: view).x
        jump(x < view.bounds.width / 2 ? -10 : 10)
        showOverlay()
    }
    @objc private func playTapped() {
        if player.isPlaying { player.pause() } else { player.play() }
        updatePlayIcon(playing: !player.isPlaying)
        showOverlay()
    }
    @objc private func backTapped() { jump(-10); showOverlay() }
    @objc private func fwdTapped() { jump(10); showOverlay() }
    private func jump(_ secs: Int32) {
        if secs > 0 { player.jumpForward(secs) } else { player.jumpBackward(-secs) }
    }
    @objc private func skipIntro() {
        if opts.introEnd > 0 { seek(to: opts.introEnd) }
        introDone = true
        skipBtn.isHidden = true
    }
    @objc private func nextTapped() { finish(ended: false, next: true) }
    @objc private func closeTapped() { finish(ended: false, next: false) }

    @objc private func sliderBegan() { dragging = true; hideTimer?.invalidate() }
    @objc private func sliderMoved() {
        let len = lengthMs()
        if len > 0 { curLabel.text = fmt(Double(slider.value) * Double(len) / 1000) }
    }
    @objc private func sliderEnded() {
        dragging = false
        let len = lengthMs()
        if len > 0 { seek(to: Double(slider.value) * Double(len) / 1000) }
        scheduleHide()
    }

    private func seek(to secs: Double) {
        player.time = VLCTime(int: Int32(max(0, secs) * 1000))
    }
    private func lengthMs() -> Int32 { return player.media?.length.intValue ?? 0 }
    private func fmt(_ s: Double) -> String {
        let t = Int(max(0, s)), h = t / 3600, m = (t % 3600) / 60, sec = t % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, sec) : String(format: "%d:%02d", m, sec)
    }
    private func updatePlayIcon(playing: Bool) {
        if #available(iOS 13.0, *) {
            let cfg = UIImage.SymbolConfiguration(pointSize: 40, weight: .semibold)
            playBtn.setImage(UIImage(systemName: playing ? "pause.fill" : "play.fill", withConfiguration: cfg), for: .normal)
        }
    }

    // MARK: audio & subtitle tracks
    @objc private func tracksTapped() {
        hideTimer?.invalidate()
        let sheet = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        let audioNames = (player.audioTrackNames as? [String]) ?? []
        let audioIdx = (player.audioTrackIndexes as? [NSNumber]) ?? []
        let curA = player.currentAudioTrackIndex
        for (i, name) in audioNames.enumerated() where i < audioIdx.count {
            let idx = audioIdx[i].int32Value
            if idx < 0 { continue }
            sheet.addAction(UIAlertAction(title: opts.t("audio", "الصوت") + ": " + name + (idx == curA ? "  ✓" : ""), style: .default) { [weak self] _ in
                self?.player.currentAudioTrackIndex = idx
            })
        }
        let subNames = (player.videoSubTitlesNames as? [String]) ?? []
        let subIdx = (player.videoSubTitlesIndexes as? [NSNumber]) ?? []
        let curS = player.currentVideoSubTitleIndex
        for (i, name) in subNames.enumerated() where i < subIdx.count {
            let idx = subIdx[i].int32Value
            let label = idx < 0 ? opts.t("off", "بدون") : name
            sheet.addAction(UIAlertAction(title: opts.t("subs", "الترجمة") + ": " + label + (idx == curS ? "  ✓" : ""), style: .default) { [weak self] _ in
                self?.player.currentVideoSubTitleIndex = idx
            })
        }
        sheet.addAction(UIAlertAction(title: opts.t("cancel", "إلغاء"), style: .cancel) { [weak self] _ in self?.scheduleHide() })
        if let pop = sheet.popoverPresentationController { pop.sourceView = tracksBtn; pop.sourceRect = tracksBtn.bounds }
        present(sheet, animated: true)
    }

    // MARK: VLC events
    @objc(mediaPlayerStateChanged:) func mediaPlayerStateChanged(_ aNotification: Notification!) {
        switch player.state {
        case .opening, .buffering:
            if !player.isPlaying { spinner.startAnimating() }
        case .playing:
            spinner.stopAnimating()
            updatePlayIcon(playing: true)
            if !started {
                started = true
                var start = opts.start
                if opts.introAuto && opts.introEnd > 0 && start < opts.introEnd && start <= opts.introStart + 2 { start = opts.introEnd; introDone = true }
                if start > 5 { seek(to: start) }
            }
        case .paused:
            spinner.stopAnimating()
            updatePlayIcon(playing: false)
            showOverlay()
        case .ended:
            finish(ended: true, next: false)
        case .error:
            spinner.stopAnimating()
            let a = UIAlertController(title: nil, message: opts.t("error", "تعذّر التشغيل"), preferredStyle: .alert)
            a.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in self?.finish(ended: false, next: false) })
            present(a, animated: true)
        default:
            break
        }
    }

    @objc(mediaPlayerTimeChanged:) func mediaPlayerTimeChanged(_ aNotification: Notification!) {
        let t = player.time.intValue, len = lengthMs()
        lastTimeMs = t
        if player.isPlaying { spinner.stopAnimating() }
        if !dragging {
            curLabel.text = fmt(Double(t) / 1000)
            remLabel.text = len > 0 ? "-" + fmt(Double(len - t) / 1000) : "--:--"
            if len > 0 { slider.value = Float(Double(t) / Double(len)) }
        }
        let secs = Double(t) / 1000
        if opts.introEnd > 0 && !introDone {
            let inIntro = secs >= opts.introStart && secs < opts.introEnd - 1
            if inIntro && opts.introAuto { skipIntro() }
            else { skipBtn.isHidden = !inIntro }
        }
    }

    private func finish(ended: Bool, next: Bool) {
        if finished { return }
        finished = true
        hideTimer?.invalidate()
        let pos = Double(lastTimeMs) / 1000, dur = Double(lengthMs()) / 1000
        player.delegate = nil
        player.stop()
        UIApplication.shared.isIdleTimerDisabled = false
        let cb = onFinish
        dismiss(animated: true) { cb?(pos, dur, ended, next) }
    }
}

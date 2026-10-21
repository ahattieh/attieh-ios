#!/bin/bash
# Attieh for iPhone — run once on the Mac:  bash setup-mac.sh
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "❌ Node.js مش مثبت — نزّله من https://nodejs.org (LTS) وأعد التشغيل"; exit 1; }
command -v xcodebuild >/dev/null || { echo "❌ Xcode مش مثبت — نزّله من App Store وافتحه مرة"; exit 1; }
if ! command -v pod >/dev/null; then
  echo "… تثبيت CocoaPods"
  if command -v brew >/dev/null; then brew install cocoapods; else sudo gem install cocoapods; fi
fi
echo "… تثبيت الحزم"
npm install
echo "… تجهيز مشروع iOS (أول مرة بياخد وقت لأنه بينزّل مشغّل VLC)"
npx cap sync ios
echo "✅ جاهز — بيفتح Xcode هلأ"
npx cap open ios

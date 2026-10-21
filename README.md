# Attieh للآيفون

نفس تطبيق التلفزيون، بالعرض، باللمس. الأفلام والمسلسلات اللي الآيفون ما بيقدر يشغّلها لحاله (mkv…) بتنفتح بمشغّل VLC داخل التطبيق.

## على الماك (مرة وحدة)
1. ثبّت **Xcode** من App Store وافتحه مرة لحتى يكمّل التثبيت.
2. ثبّت **Node.js** (نسخة LTS) من nodejs.org.
3. فك ضغط المجلد، افتح Terminal جوّاه واكتب:
   ```
   bash setup-mac.sh
   ```
   بيثبّت CocoaPods إذا ناقص، بيجهّز المشروع، وبيفتح Xcode.

## بـ Xcode
1. على اليسار اكبس **App** (الأيقونة الزرقا فوق) ← تبويب **Signing & Capabilities**.
2. **Team**: اختار Apple ID تبعك (Add Account إذا مش موجود) — Personal Team.
3. **Bundle Identifier**: غيّره لشي خاص فيك، مثلاً `com.ahmadattieh.attieh`.
4. وصّل الآيفون بالكيبل، واختاره من فوق بدل Simulator.
5. اكبس ▶ (Run).

## على الآيفون أول مرة
- **Settings ← Privacy & Security ← Developer Mode** شغّله (بيطلب إعادة تشغيل).
- بعد التثبيت: **Settings ← General ← VPN & Device Management** ← اختار حسابك ← **Trust**.
- مع Apple ID المجاني التطبيق بيشتغل 7 أيام؛ بعدها وصّل التلفون واكبس ▶ مرة ثانية من Xcode.

## تحديث التطبيق لاحقاً
ابدّل مجلد `www` بالنسخة الجديدة وبعدين: `npx cap sync ios` ثم ▶ من Xcode.

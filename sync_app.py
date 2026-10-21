"""Copy the Amira TV web app into www/ and rebrand it as Attieh for iPhone."""
import os, re, shutil, sys
SRC = '/home/claude/amira-iptv'; ROOT = os.path.dirname(os.path.abspath(__file__)); DST = os.path.join(ROOT, 'www')
VER = sys.argv[1] if len(sys.argv) > 1 else '1.0.0'
if os.path.exists(DST): shutil.rmtree(DST)
os.makedirs(DST)
shutil.copy(os.path.join(SRC, 'index.html'), DST)
shutil.copytree(os.path.join(SRC, 'css'), os.path.join(DST, 'css'))
shutil.copytree(os.path.join(SRC, 'js'), os.path.join(DST, 'js'))
shutil.copy(os.path.join(ROOT, 'node_modules/@capacitor/core/dist/capacitor.js'), os.path.join(DST, 'js/lib/capacitor.js'))
def sub(rel, a, b):
    p = os.path.join(DST, rel); s = open(p, encoding='utf-8').read()
    if a not in s: raise SystemExit('missing in %s: %r' % (rel, a[:60]))
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
sub('index.html', '<title>Amira IPTV</title>', '<title>Attieh</title>')
sub('index.html', '<div class="sp-word"><b>A</b><b>m</b><b>i</b><b>r</b><b>a</b></div>', '<div class="sp-word"><b>A</b><b>t</b><b>t</b><b>i</b><b>e</b><b>h</b></div>')
sub('index.html', '<div class="brand-corner">Amira<span>IPTV</span></div>', '<div class="brand-corner">Attieh<span>IPTV</span></div>')
sub('index.html', '<div class="prof-logo">Amira<span>IPTV</span></div>', '<div class="prof-logo">Attieh<span>IPTV</span></div>')
sub('index.html', 'Amira IPTV · Version', 'Attieh · Version')
sub('index.html', '<script src="js/lib/hls.min.js"></script>', '<script src="js/lib/capacitor.js"></script>\n<script src="js/lib/hls.min.js"></script>')
p = os.path.join(DST, 'index.html'); s = open(p, encoding='utf-8').read(); open(p, 'w', encoding='utf-8').write(re.sub(r'Version \d+\.\d+\.\d+', 'Version ' + VER, s))
p = os.path.join(DST, 'js/app.js'); s = open(p, encoding='utf-8').read()
s = s.replace('أهلاً بك في Amira', 'أهلاً بك في Attieh'); s = re.sub(r"var APP_VER = '[^']+'", "var APP_VER = '%s'" % VER, s)
open(p, 'w', encoding='utf-8').write(s)
sub('js/i18n.js', "['أهلاً بك في Amira', 'Welcome to Amira', 'Bienvenido a Amira', 'Bienvenue sur Amira']", "['أهلاً بك في Attieh', 'Welcome to Attieh', 'Bienvenido a Attieh', 'Bienvenue sur Attieh']")
for css in ('css/style.css', 'css/style.ltr.css'):
    p = os.path.join(DST, css); open(p, 'a', encoding='utf-8').write('\n.sp-word b:nth-child(6){animation-delay:.55s}\n')
print('www synced, version', VER)

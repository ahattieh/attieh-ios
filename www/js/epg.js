/* XMLTV EPG parser — keeps only a window of -3h..+24h to stay light on TV memory. */
var EPG = (function () {
  var data = {}, names = {};

  function parseTime(s) {
    var m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/.exec(s || '');
    if (!m) return 0;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    if (m[7]) {
      var sign = m[7].charAt(0) === '-' ? -1 : 1;
      t -= sign * (+m[7].substr(1, 2) * 60 + +m[7].substr(3, 2)) * 60000;
    }
    return t;
  }
  function dec(s) {
    return String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&');
  }
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/\b(fhd|uhd|hd|sd|4k)\b/g, '')
      .replace(/[\s|\-_.:()\[\]]/g, '');
  }

  function parse(xml) {
    var now = Date.now(), from = now - 3 * 3600e3, to = now + 24 * 3600e3;
    var d = {}, n = {}, m;
    var chRe = /<channel\s+id="([^"]*)"[^>]*>([\s\S]*?)<\/channel>/g;
    while ((m = chRe.exec(xml))) {
      var id = dec(m[1]), dm, dnRe = /<display-name[^>]*>([\s\S]*?)<\/display-name>/g;
      n[norm(id)] = id;
      while ((dm = dnRe.exec(m[2]))) n[norm(dec(dm[1]))] = id;
    }
    var pRe = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g;
    while ((m = pRe.exec(xml))) {
      var at = m[1];
      var st = /start="([^"]*)"/.exec(at), sp = /stop="([^"]*)"/.exec(at), cid = /channel="([^"]*)"/.exec(at);
      if (!st || !cid) continue;
      var s = parseTime(st[1]), e = sp ? parseTime(sp[1]) : s + 3600e3;
      if (e < from || s > to) continue;
      var tm = /<title[^>]*>([\s\S]*?)<\/title>/.exec(m[2]);
      var ds = /<desc[^>]*>([\s\S]*?)<\/desc>/.exec(m[2]);
      var key = dec(cid[1]);
      (d[key] || (d[key] = [])).push({
        start: s, stop: e,
        title: tm ? dec(tm[1]).trim() : '',
        desc: ds ? dec(ds[1]).trim() : ''
      });
    }
    for (var k in d) d[k].sort(function (a, b) { return a.start - b.start; });
    data = d; names = n;
    return Object.keys(d).length;
  }

  function key(ch) {
    if (data['__' + ch.id]) return '__' + ch.id;
    if (ch.tvgId && data[ch.tvgId]) return ch.tvgId;
    return names[norm(ch.tvgId)] || names[norm(ch.name)];
  }

  function now(ch) {
    var list = data[key(ch)];
    if (!list) return null;
    var t = Date.now();
    for (var i = 0; i < list.length; i++) {
      if (list[i].start <= t && list[i].stop > t) return { cur: list[i], next: list[i + 1] || null };
    }
    return null;
  }

  /* Demo schedule for the bundled test streams (clearly labelled as test content). */
  var DEMO_TITLES = {
    demo1: 'Big Buck Bunny', demo2: 'Tears of Steel', demo3: 'Sintel',
    demo4: 'BipBop — إشارة اختبار', demo5: 'BipBop 16:9 — إشارة اختبار', demo6: 'بث حي تجريبي'
  };
  function demo(channels) {
    var d = {}, n = {}, h = 3600e3, start = Math.floor(Date.now() / h) * h - 2 * h;
    channels.forEach(function (ch) {
      var title = DEMO_TITLES[ch.tvgId] || ch.name, list = [];
      for (var t = start; t < start + 26 * h; t += h) {
        list.push({ start: t, stop: t + h, title: title, desc: 'عرض تجريبي متكرر من بثوث الاختبار المفتوحة، لتجربة الواجهة والمشغّل قبل إضافة قائمتك.' });
      }
      d[ch.tvgId || ch.id] = list;
      n[norm(ch.tvgId)] = ch.tvgId;
    });
    data = d; names = n;
  }

  return {
    parse: parse, now: now, demo: demo,
    put: function (ch, list) { data['__' + ch.id] = list.sort(function (a, b) { return a.start - b.start; }); },
    has: function (ch) { return !!data[key(ch)]; },
    list: function (ch) { return data[key(ch)] || null; },
    clear: function () { data = {}; names = {}; }
  };
})();

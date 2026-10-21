/* M3U / M3U8 playlist parser (supports #EXTINF attributes and #EXTGRP). */
var M3U = (function () {
  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  /* "Name S01 E20", "Name S1E20", "Name - الحلقة 20", "Name Ep 20" */
  function parseEp(name) {
    var m = /^(.*?)[\s._\-|:]*S(\d{1,2})[\s._-]*E(\d{1,4})\b/i.exec(name);
    if (m) return { title: m[1].trim(), s: +m[2], e: +m[3] };
    m = /^(.*?)[\s._\-|:]*(?:الحلقة|حلقة|\bEp(?:isode)?\.?|\bE(?=\d)|\sح\.?)\s*(\d{1,4})\s*$/i.exec(name);
    if (m && m[1].trim()) return { title: m[1].trim(), s: 1, e: +m[2] };
    return null;
  }
  var ATTR = /([a-zA-Z0-9_-]+)="([^"]*)"/g;

  function parse(text) {
    var lines = String(text || '').split(/\r?\n/), out = [], cur = null, num = 0, seen = {};
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (line.indexOf('#EXTINF') === 0) {
        cur = { attrs: {}, name: '' };
        var m; ATTR.lastIndex = 0;
        while ((m = ATTR.exec(line))) cur.attrs[m[1].toLowerCase()] = m[2];
        var stripped = line.replace(ATTR, '');
        var ci = stripped.indexOf(',');
        cur.name = ci >= 0 ? stripped.substring(ci + 1).trim() : '';
      } else if (line.indexOf('#EXTGRP:') === 0) {
        if (cur) cur.grp = line.substring(8).trim();
      } else if (line.charAt(0) === '#') {
        continue;
      } else {
        if (!cur) cur = { attrs: {}, name: '' };
        var a = cur.attrs;
        var name = cur.name || a['tvg-name'] || ('قناة ' + (num + 1));
        var id = hash(line + '|' + name);
        if (!seen[id]) {
          seen[id] = 1; num++;
          var tt = (a['tvg-type'] || '').toLowerCase();
          var series = tt === 'series' || /\/series\//i.test(line);
          var isLive = /\/live\//i.test(line) || tt === 'live';
          var vod = !isLive && (series || tt === 'movie' || tt === 'vod' || /\/movie\//i.test(line) || /\.(mp4|mkv|avi|mov|m4v|webm)(\?|$)/i.test(line));
          var group = a['group-title'] || cur.grp || 'غير مصنّفة';
          var item = {
            id: id, num: num, name: name,
            logo: a['tvg-logo'] || '',
            group: group,
            tvgId: a['tvg-id'] || '',
            vod: vod, type: series ? 'series' : (vod ? 'movie' : 'live'),
            url: line
          };
          var ep = vod ? parseEp(name) : null;
          if (series && !ep) ep = { title: name.replace(/\s*\d+\s*$/, '') || name, s: 1, e: 0 };
          if (ep) {
            item.type = 'series';
            item.stitle = ep.title || name; item.s = ep.s; item.e = ep.e;
            item.sk = (ep.title || name).toLowerCase().replace(/\s+/g, ' ').trim() + '|' + group;
          }
          out.push(item);
        }
        cur = null;
      }
    }
    return out;
  }
  return { parse: parse, hash: hash, parseEp: parseEp };
})();

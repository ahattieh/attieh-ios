/* Amira IPTV — main app logic (ES5 for older webOS). */
(function () {
  'use strict';

  var KEY = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 461, BACKSPACE: 8, ESC: 27,
    CHUP: 33, CHDOWN: 34, RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406, F: 70, SPACE: 32,
    PLAY: 415, PAUSE: 19, PLAYPAUSE: 10252, MEDIA_PP: 179, STOP: 413, FF: 417, RW: 412
  };
  var RAIL_LIMIT = 20, GRID_BATCH = 30, NAV_DELAY = 140, SEEK_COMMIT = 600;

  var DEMO = [
    '#EXTM3U',
    '#EXTINF:-1 tvg-id="demo1" tvg-type="movie" group-title="أفلام قصيرة",Big Buck Bunny',
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    '#EXTINF:-1 tvg-id="demo2" tvg-type="movie" group-title="أفلام قصيرة",Tears of Steel',
    'https://test-streams.mux.dev/tos_ismc/main.m3u8',
    '#EXTINF:-1 tvg-id="demo3" tvg-type="movie" group-title="أفلام قصيرة",Sintel',
    'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    '#EXTINF:-1 tvg-id="demo4" group-title="إشارات اختبار",اختبار 1',
    'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    '#EXTINF:-1 tvg-id="demo5" group-title="إشارات اختبار",اختبار 2',
    'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
    '#EXTINF:-1 tvg-id="demo6" group-title="بث مباشر تجريبي",مباشر تجريبي',
    'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8'
  ].join('\n');

  function kindState() { return { list: [], groups: [], by: {}, sel: '__all', dirty: true }; }
  var S = {
    channels: [], byId: {}, kind: { live: kindState(), movies: kindState(), shows: kindState() }, lists: {}, grids: {},
    favs: [], recent: [], pos: {}, settings: {}, demo: false, feat: null,
    series: {}, done: {}, curSeries: null, curSeason: null, prevScreen: 'shows', pins: {}, intro: {}, searchable: [],
    screen: 'home', homeDirty: false, myDirty: true, lastFocus: {}, lastBack: 0, lastKey: 0
  };

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  var closest = Nav.closest;
  /* per-person data lives under the current profile; everything else (login, settings, cache, intro marks) is shared */
  var PER_PROFILE = { favs: 1, recent: 1, pos: 1, done: 1, pins: 1, eps: 1, hidden: 1, pl: 1 };
  function skey(k) {
    if (k === 'cache' && S.settings && S.settings.activePl) return 'amira.cache.' + S.settings.activePl;
    return 'amira.' + (PER_PROFILE[k] && S.pid ? 'p.' + S.pid + '.' : '') + k;
  }
  function load(k, d) { try { var v = localStorage.getItem(skey(k)); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(skey(k), JSON.stringify(v)); return true; } catch (e) { return false; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(t) { var d = new Date(t); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function dur(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + ':' + pad2(m) : m) + ':' + pad2(s);
  }
  function hue(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function bg(ch) { var h = hue(ch.group + '|' + ch.name); return 'background:linear-gradient(135deg,hsl(' + h + ',42%,30%) 0%,hsl(' + ((h + 40) % 360) + ',50%,13%) 100%)'; }
  function initials(n) {
    var w = String(n).replace(/[^\w؀-ۿ\s]/g, ' ').trim().split(/\s+/);
    var s = (w[0] || '?').charAt(0); if (w[1]) s += w[1].charAt(0);
    return s.toUpperCase();
  }
  function pct(p) { return Math.max(0, Math.min(100, (Date.now() - p.start) / (p.stop - p.start) * 100)); }
  function isFav(id) { return S.favs.indexOf(id) >= 0; }
  function ids2list(ids) { return ids.map(function (id) { return S.byId[id]; }).filter(Boolean); }
  function visible(el) { return el && el.getClientRects().length > 0; }

  var IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (IS_IOS) document.documentElement.classList.add('ios');
  var APP_VER = '1.0.0';
  function LR(k) { return I18N.isLtr() && (k === 37 || k === 39) ? 76 - k : k; }   // mirror ◀▶ in LTR languages
  var IC = {restart: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/></svg>', pen: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>', del: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><path d="M22 3H7c-.7 0-1.2.4-1.6.9L0 12l5.4 8.1c.4.5.9.9 1.6.9h15a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-3 12.6L17.6 17 14 13.4 10.4 17 9 15.6 12.6 12 9 8.4 10.4 7 14 10.6 17.6 7 19 8.4 15.4 12 19 15.6z"/></svg>', search: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>', sort: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><path d="M16 17V10h-2v7h-3l4 4 4-4h-3zM9 3 5 7h3v7h2V7h3L9 3z"/></svg>', swap: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/></svg>', list: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>', grid: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>', eye: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>'};
  try { document.getElementById('sp-ver').textContent = 'Version ' + APP_VER; document.getElementById('set-ver').textContent = APP_VER; } catch (e) {}
  var KD = { r: '<i class="kd r"></i>', g: '<i class="kd g"></i>', y: '<i class="kd y"></i>', b: '<i class="kd b"></i>' };
  function toast(msg, err, html) {
    var t = $('toast'); if (html) t.innerHTML = msg; else t.textContent = msg; t.className = 'show' + (err ? ' err' : '');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = ''; }, 3200);
  }
  function loader(text) {
    var sp = $('splash');
    if (sp && !S.splashGone) { if (text) $('sp-status').textContent = text; return; }   // status shows on the splash
    if (text) { $('loader-text').textContent = text; $('loader').className = 'show'; }
    else $('loader').className = '';
  }
  /* animated splash: stays at least ~1.8s (so the intro plays), then fades into the app */
  var BOOT = Date.now();
  function hideSplash() {
    if (S.splashGone || S.splashT) return;
    S.splashT = setTimeout(function () {
      var sp = $('splash'); if (!sp) return;
      S.splashGone = true;
      sp.className = 'out';
      if (S.profiles && S.profiles.length > 1 && !Player.isOpen()) openProfiles(false);   // who is watching?
      else maybeAutoPlay();
      setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 600);
    }, Math.max(0, 1800 - (Date.now() - BOOT)));
  }
  function fetchData(url, binary) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.timeout = 60000;
      if (binary) x.responseType = 'arraybuffer';
      x.onload = function () {
        if ((x.status >= 200 && x.status < 300) || (x.status === 0 && x.response)) res(x.response);
        else rej(new Error('HTTP ' + x.status));
      };
      x.onerror = function () { rej(new Error('خطأ في الشبكة')); };
      x.ontimeout = function () { rej(new Error('انتهت المهلة')); };
      x.send();
    });
  }

  /* ---------- cards ---------- */
  function epLabel(ep) {
    var se = S.series[ep.sk], multi = se && (se.seasons.length > 1 || (!se.loaded && se.xseries && ep.s > 1));
    return (multi ? 'م' + ep.s + ' · ' : '') + 'الحلقة ' + ep.e;
  }
  function meta(ch) {           // subtitle + progress for a card
    if (ch.isSeries && !ch.eps.length) {
      var le = lastEpOf(ch.sk), lp = le && S.pos[le.id];
      return le ? { sub: 'تابع ' + epLabel(le), pct: lp ? lp.t / lp.d * 100 : null } : { sub: ch.rating ? '★ ' + ch.rating : ch.group, pct: null };
    }
    if (ch.isSeries) {
      var nu = nextUp(ch), np = S.pos[nu.id], started = lastEpOf(ch.sk);
      if (!started) return { sub: ch.eps.length + ' حلقة', pct: null };
      return { sub: (np ? 'تابع ' : 'التالية: ') + epLabel(nu), pct: np ? np.t / np.d * 100 : null };
    }
    if (ch.sk && S.series[ch.sk]) {
      var ep = S.pos[ch.id];
      return ep ? { sub: epLabel(ch) + ' · متبقٍ ' + dur(ep.d - ep.t), pct: ep.t / ep.d * 100 }
                : { sub: epLabel(ch) + (S.done[ch.id] ? ' · ✓' : ''), pct: null };
    }
    if (ch.vod) {
      var p = S.pos[ch.id];
      return p ? { sub: 'متبقٍ ' + dur(p.d - p.t), pct: p.t / p.d * 100 } : { sub: ch.group, pct: null };
    }
    var info = EPG.now(ch);
    return info ? { sub: info.cur.title, pct: pct(info.cur) } : { sub: ch.group, pct: null };
  }
  function badge(ch) {
    if (!ch.vod) return '<span class="badge-live">مباشر</span>';
    if (ch.isSeries) return '<span class="badge-live badge-vod">مسلسل' + (ch.eps.length ? ' · ' + ch.eps.length : '') + '</span>';
    return '<span class="badge-live badge-vod">' + (ch.type === 'series' ? 'حلقة' : 'فيلم') + '</span>';
  }
  function posterHTML(ch, idx) {
    var m = meta(ch);
    return '<div class="card poster focusable" data-id="' + ch.id + '"' + (idx != null ? ' data-idx="' + idx + '"' : '') + '>' +
      '<div class="card-thumb poster-thumb' + (ch.logo ? '' : ' noimg') + '" style="' + bg(ch) + '">' +
        (ch.logo ? '<img loading="lazy" decoding="async" src="' + esc(ch.logo) + '" onerror="this.parentNode.className+=\' noimg\'">' : '') +
        '<span class="poster-fallback"><b>' + esc(initials(ch.name)) + '</b><em>' + esc(ch.name) + '</em><i></i></span>' +
        badge(ch) + (isFav(ch.id) ? '<span class="fav-star">★</span>' : '') +
      '</div>' +
      '<div class="card-name"><span>' + esc(ch.stitle && !ch.isSeries ? ch.stitle : ch.name) + '</span></div>' +
      '<div class="card-now">' + esc(m.sub) + '</div>' +
      '<div class="progress' + (m.pct == null ? ' empty' : '') + '"><i style="width:' + (m.pct || 0) + '%"></i></div>' +
    '</div>';
  }
  function cardHTML(ch, idx) {
    if (ch.vod) return posterHTML(ch, idx);
    var m = meta(ch);
    return '<div class="card focusable" data-id="' + ch.id + '"' + (idx != null ? ' data-idx="' + idx + '"' : '') + '>' +
      '<div class="card-thumb' + (ch.logo ? '' : ' noimg') + '" style="' + bg(ch) + '">' +
        (ch.logo ? '<img loading="lazy" decoding="async" src="' + esc(ch.logo) + '" onerror="this.parentNode.className+=\' noimg\'">' : '') +
        '<span class="card-initials">' + esc(initials(ch.name)) + '</span>' + badge(ch) +
        (isFav(ch.id) ? '<span class="fav-star">★</span>' : '') +
        (ch.vod ? '' : '<span class="card-num">' + ch.num + '</span>') +
      '</div>' +
      '<div class="card-name"><span>' + esc(ch.name) + '</span></div>' +
      '<div class="card-now">' + esc(m.sub) + '</div>' +
      '<div class="progress' + (m.pct == null ? ' empty' : '') + '"><i style="width:' + (m.pct || 0) + '%"></i></div>' +
    '</div>';
  }
  function updateCards(root) {
    var cards = (root || document).querySelectorAll('.card[data-id]');
    for (var i = 0; i < cards.length; i++) {
      var ch = S.byId[cards[i].getAttribute('data-id')]; if (!ch) continue;
      var m = meta(ch), p = cards[i].querySelector('.progress');
      cards[i].querySelector('.card-now').textContent = m.sub;
      p.className = 'progress' + (m.pct == null ? ' empty' : '');
      p.firstChild.style.width = (m.pct || 0) + '%';
    }
  }

  /* ---------- full-screen backdrop behind home / details (Shahid style) ---------- */
  function stageSet(it) {
    var st = $('stage'); if (!st) return;
    var src = '', mode = '';
    if (it) {
      var vi = it.info || {}, wide = it.bd || vi.backdrop || it.backdrop || '';
      if (wide) { src = wide; mode = 'w'; } else if (it.vod && it.logo) { src = it.logo; mode = 'p'; } else if (it.logo) { src = it.logo; mode = 'lg'; }
    }
    var key = it ? mode + '|' + (src || it.id) : '';
    if (key === S.stageKey) return;
    S.stageKey = key;
    var ls = st.querySelectorAll('.st-l'); S.stIdx = (S.stIdx || 0) + 1;
    var tok = S.stIdx, nx = ls[tok % 2], old = ls[(tok + 1) % 2];
    function show(html) {
      if (tok !== S.stIdx) return;
      nx.innerHTML = html; nx.setAttribute('style', it && mode !== 'w' && mode !== 'p' ? bg(it) : '');
      nx.className = 'st-l'; void nx.offsetWidth; nx.className = 'st-l show'; old.className = 'st-l';
    }
    if (!it) { show(''); return; }
    if (!src) { show(''); return; }
    var img = new Image();
    img.onload = function () { show('<img class="st-' + mode + '" src="' + esc(src) + '">'); };
    img.onerror = function () { mode = ''; show(''); };
    img.src = src;
  }
  function homeShow(it) {
    var box = $('home-info'); if (!box) return;
    S.hiItem = it;
    if (!it) { box.className = 'home-info'; stageSet(null); return; }
    var vi = it.info || {}, pos = it.vod ? S.pos[it.id] : null;
    var type = !it.vod ? 'مباشر' : it.isSeries ? 'مسلسل' : it.type === 'series' ? 'حلقة' : 'فيلم';
    var rating = it.rating || vi.rating;
    var metas = [it.year || vi.year, vi.duration, it.genre || vi.genre, it.group].filter(Boolean);
    var desc = it.plot || vi.plot || '', now = !it.vod && EPG.now(it);
    if (now) desc = (now.cur.title || '') + (now.cur.desc ? ' — ' + now.cur.desc : '');
    var h = '<div class="hi-type"><span class="badge-live' + (it.vod ? ' badge-vod' : '') + '">' + type + '</span>' +
      (rating ? '<span class="hi-rate">★ ' + (Math.round(rating * 10) / 10) + '</span>' : '') + (!it.vod ? '<span class="hi-num">' + it.num + '</span>' : '') + '</div>';
    h += '<h1 class="hi-title">' + esc(it.stitle && !it.isSeries ? it.stitle : it.name) + '</h1>';
    if (it.type === 'series' && !it.isSeries) h += '<div class="hi-ep">' + esc(epLabel(it)) + '</div>';
    if (metas.length) h += '<div class="hi-meta">' + metas.map(esc).join('<i>•</i>') + '</div>';
    if (desc) h += '<p class="hi-desc">' + esc(desc) + '</p>';
    if (pos) h += '<div class="hi-left">متبقٍ ' + dur(pos.d - pos.t) + '</div><div class="progress hi-prog"><i style="width:' + (pos.t / pos.d * 100) + '%"></i></div>';
    else if (now) h += '<div class="progress hi-prog"><i style="width:' + pct(now.cur) + '%"></i></div>';
    box.innerHTML = h; box.className = 'home-info show';
    clearTimeout(S.stT);                                   // the big picture changes only once you stop on something
    S.stT = setTimeout(function () { if (S.hiItem === it) stageSet(it); }, 420);
    clearTimeout(S.hiT);
    if (it.vod && !it.isSeries && it.type === 'movie' && !it.info && S.settings.api && it.sid) {
      S.hiT = setTimeout(function () { loadVodInfo(it, 'low', function () { if (S.hiItem === it && S.screen === 'home') homeShow(it); }); }, 650);
    }
  }
  function homeWelcome() {
    var box = $('home-info'); if (!box) return;
    S.hiItem = null; stageSet(null);
    box.innerHTML = S.channels.length || S.settings.api
      ? '<h1 class="hi-title">أهلاً بك في Attieh</h1><p class="hi-desc">اختر من القنوات أو الأفلام أو المسلسلات — وأي شي بتشوفه بيظهر هون.</p>'
      : '<h1 class="hi-title">لا توجد قنوات بعد</h1><p class="hi-desc">أضف رابط قائمتك أو حساب Xtream من الإعدادات.</p>';
    box.className = 'home-info show';
  }
  /* home: the focused row sits under the info block; rows above it fade out */
  function homeFocus(el) {
    var sc = $('home-scroller'), rail = closest(el, 'rail'), hero = $('hero');
    var ty = 0;
    if (rail) ty = -((rail.getBoundingClientRect().top - sc.getBoundingClientRect().top) - Nav.rem(36));
    if (ty > 0) ty = 0;
    sc._ty = ty; sc.style.transform = 'translate3d(0,' + ty + 'px,0)';
    if (hero) hero.classList.toggle('past', !!rail);
    var rails = sc.querySelectorAll('.rail'), before = true;
    for (var i = 0; i < rails.length; i++) { if (rails[i] === rail) before = false; rails[i].classList.toggle('past', !!rail && before); }
    clearTimeout(S.hfT);
    S.hfT = setTimeout(function () {
      if (S.screen !== 'home') return;
      var it = rail ? S.byId[el.getAttribute('data-id')] : S.feat;
      if (it) { if (it !== S.hiItem) homeShow(it); } else if (!rail) homeWelcome();
    }, 110);
  }

  /* ---------- home ---------- */
  function heroHTML(ch) {
    var h = '<div class="hero home-top" id="hero"><div class="hero-actions">';
    if (!ch) {
      if (S.settings.api) {
        h += '<div class="btn primary focusable" data-action="goto" data-screen="live">📺 القنوات</div>' +
          (S.kind.movies.groups.length ? '<div class="btn focusable" data-action="goto" data-screen="movies">🎬 الأفلام</div>' : '') +
          (S.kind.shows.groups.length ? '<div class="btn focusable" data-action="goto" data-screen="shows">🎞 المسلسلات</div>' : '');
      } else h += '<div class="btn primary focusable" data-action="goto" data-screen="settings">⚙ الإعدادات</div>';
      return h + '</div></div>';
    }
    var fav = isFav(ch.id), pos = ch.vod ? S.pos[ch.id] : null;
    h += '<div class="btn primary focusable" data-action="play" data-id="' + ch.id + '">▶ ' + (pos ? 'تابع المشاهدة' : 'شاهد الآن') + '</div>';
    if (ch.vod && !ch.isSeries && ch.type === 'movie') h += '<div class="btn focusable" data-action="info" data-id="' + ch.id + '">التفاصيل</div>';
    h += '<div class="btn focusable" data-action="fav" data-id="' + ch.id + '">' + (fav ? '★ في المفضلة' : '☆ أضف للمفضلة') + '</div>';
    if (S.demo) h += '<div class="btn focusable" data-action="goto" data-screen="settings">⚙ أضف اشتراكك</div>';
    return h + '</div></div>';
  }

  function railHTML(title, key, list, more) {
    if (list && (S.kids || S.settings.locks || S.hidden)) list = list.filter(itemAllowed);
    if (!list || !list.length) return '';
    S.lists[key] = list;
    var h = '<div class="rail"><div class="rail-title">' + esc(title) + '<span class="rail-count">' + list.length + '</span></div>' +
            '<div class="rail-viewport"><div class="rail-track" data-list="' + esc(key) + '">';
    var n = Math.min(list.length, RAIL_LIMIT);
    for (var i = 0; i < n; i++) h += cardHTML(list[i]);
    if (more && list.length > RAIL_LIMIT) {
      h += '<div class="card card-more focusable" data-action="group" data-kind="' + more.kind + '" data-group="' + esc(more.group) + '">' +
           '<div class="card-thumb"><span>عرض الكل</span><b>' + list.length + '</b></div></div>';
    }
    return h + '</div></div></div>';
  }

  function personalRails(px) {
    var R = ids2list(S.recent), F = ids2list(S.favs);
    var cont = R.filter(function (c) { return c.vod && S.pos[c.id]; });
    var seen = R.filter(function (c) { return !(c.vod && S.pos[c.id]); });
    return railHTML('تابع المشاهدة', px + 'cont', cont) +
      railHTML('شوهد مؤخراً', px + 'recent', seen) +
      railHTML('أفلامي ومسلسلاتي المفضلة', px + 'fv', F.filter(function (c) { return c.vod; })) +
      railHTML('قنواتي المفضلة', px + 'fl', F.filter(function (c) { return !c.vod; }));
  }

  function renderMyList() {
    var h = '<div class="page-head"><h1>قائمتي</h1>' +
      (S.recent.length ? '<div class="btn focusable" data-action="clear-history">مسح سجل المشاهدة</div>' : '') + '</div>';
    var rails = personalRails('my:');
    h += rails || '<div class="empty" style="padding:2rem 4rem">قائمتك فارغة. أي قناة أو فيلم بتشوفه بيظهر هون، وبتقدر تضيف للمفضلة بالزر ' + KD.r + ' (أو F).</div>';
    var sc = $('mylist-scroller'); sc.innerHTML = h; Nav.resetScroll(sc);
    S.myDirty = false;
  }

  function renderHome() {
    S.lists = {};
    var newRail = newRailHTML();
    S.feat = S.byId[S.recent[0]] || S.byId[S.favs[0]] || (S.lists['home:new'] || [])[0] || S.channels[0] || null;
    if (S.feat && !itemAllowed(S.feat)) S.feat = null;
    var h = heroHTML(S.feat);
    var epgWant = ids2list(S.recent).concat(ids2list(S.favs));
    h += personalRails('home:');
    h += '<div id="new-rail">' + newRail + '</div>';
    var waits = [];
    function rail(k, g, title) {
      var K = S.kind[k];
      if (!groupOpen(k, g)) return;
      if (K.by[g]) { h += railHTML(title, k + ':' + g, K.by[g], { kind: k, group: g }); return; }
      if (!K.lazy) return;
      var wid = 'rw' + waits.length;
      waits.push([wid, k, g, title]);
      h += '<div class="rail rail-wait" id="' + wid + '"><div class="rail-title">' + esc(title) + '</div><div class="rail-viewport"><div class="skel-row">' +
           '<i></i><i></i><i></i><i></i><i></i><i></i></div></div></div>';
    }
    // pinned categories first, then a few of each kind
    ['live', 'movies', 'shows'].forEach(function (k) {
      var K = S.kind[k];
      pinsOf(k).forEach(function (g) { if (K.by[g] || (K.lazy && K.gid[g] != null)) rail(k, g, '★ ' + g); });
    });
    ['live', 'movies', 'shows'].forEach(function (k) {
      var K = S.kind[k], pins = pinsOf(k), n = 0, max = K.lazy ? 3 : 5;
      K.groups.forEach(function (g) { if (n < max && pins.indexOf(g) < 0) { n++; rail(k, g, g); } });
    });
    var sc = $('home-scroller');
    sc.innerHTML = h;
    waits.forEach(function (w) {
      queueFetch(w[1], w[2], function (items) {
        var el = $(w[0]); if (!el) return;
        var tmp = document.createElement('div');
        tmp.innerHTML = items && items.length ? railHTML(w[3], w[1] + ':' + w[2], items, { kind: w[1], group: w[2] }) : '';
        if (tmp.firstChild) el.parentNode.replaceChild(tmp.firstChild, el); else el.parentNode.removeChild(el);
        if (w[1] === 'live' && items) epgFill(items.slice(0, 7));
      });
    });
    ['live'].forEach(function (k) { var K = S.kind[k]; K.groups.forEach(function (g) { if (K.by[g] && sc.querySelector('[data-list="' + k + ':' + cssEsc(g) + '"]')) epgWant = epgWant.concat(K.by[g].slice(0, 7)); }); });
    epgFill(epgWant.slice(0, 10));
    Nav.resetScroll(sc);
    if (S.feat) homeShow(S.feat); else homeWelcome();
    S.homeDirty = false;
  }

  /* newest movies & series from everything loaded so far (fills in as categories load in the background) */
  function newRailHTML() {
    var pool = [];
    ['movies', 'shows'].forEach(function (k) { if (S.kind[k]) pool = pool.concat(poolOf(k)); });
    pool = pool.filter(function (c) { return c.added; }).sort(function (a, b) { return b.added - a.added; }).slice(0, 24);
    saveBgPool(pool);
    return pool.length >= 4 ? railHTML('🆕 أضيف مؤخراً', 'home:new', pool) : '';
  }
  /* newest titles, remembered for the "who's watching" backdrop (shown before the catalogue loads) */
  function saveBgPool(pool) {
    var out = [];
    pool.forEach(function (c) { if (out.length < 10 && (c.bd || c.logo) && itemAllowed(c)) out.push({ n: c.name, i: c.logo || '', b: c.bd || '', y: c.year || '', g: c.genre || '', t: c.isSeries ? 'مسلسل' : 'فيلم' }); });
    if (out.length < 3) return;
    var js = JSON.stringify(out); if (js === S.bgPoolJs) return;
    S.bgPoolJs = js; rawSave('bgpool', out);
    if (S.screen === 'profiles' && !S.bgPool) startProfBg();
  }
  function startProfBg() {
    S.bgPool = rawLoad('bgpool', []);
    clearInterval(S.bgT); S.bgIdx = -1;
    if (!S.bgPool || !S.bgPool.length) { S.bgPool = null; $('pbg').className = 'pbg'; return; }
    $('pbg').className = 'pbg on';
    profBgNext();
    S.bgT = setInterval(function () { if (S.screen !== 'profiles') { clearInterval(S.bgT); return; } profBgNext(); }, 7000);
  }
  function profBgNext() {
    var P = S.bgPool; if (!P || !P.length) return;
    S.bgIdx = (S.bgIdx + 1) % P.length;
    var it = P[S.bgIdx], ls = document.querySelectorAll('#pbg .pbg-l'), nx = ls[S.bgIdx % 2], old = ls[(S.bgIdx + 1) % 2];
    var img = new Image();
    img.onload = img.onerror = function () {
      nx.innerHTML = it.b ? '<img class="pbg-wide" src="' + esc(it.b) + '">'
        : '<img class="pbg-blur" src="' + esc(it.i) + '"><img class="pbg-poster" src="' + esc(it.i) + '">';
      nx.classList.remove('show'); void nx.offsetWidth; nx.classList.add('show'); old.classList.remove('show');
      var meta = [it.t, it.y, it.g].filter(Boolean).join('  •  ');
      $('pbg-info').innerHTML = '<div class="pbg-title">' + esc(it.n) + '</div><div class="pbg-meta">' + esc(meta) + '</div>';
      $('pbg-info').className = 'pbg-info'; void $('pbg-info').offsetWidth; $('pbg-info').className = 'pbg-info show';
    };
    img.src = it.b || it.i;
  }
  function refreshNewRail() {
    var box = $('new-rail'); if (!box) return;
    var cur = Nav.current(); if (cur && box.contains(cur)) return;      // don't move things under your feet
    box.innerHTML = newRailHTML();
    if (!S.feat && S.screen === 'home' && (S.lists['home:new'] || [])[0]) {      // first titles arrived: feature the newest
      S.feat = S.lists['home:new'][0];
      var hero = $('hero'); if (hero && !(cur && hero.contains(cur))) { var t = document.createElement('div'); t.innerHTML = heroHTML(S.feat); hero.parentNode.replaceChild(t.firstChild, hero); }
      if (!S.hiItem) homeShow(S.feat);
    }
  }

  /* ---------- programme guide (live tab) ---------- */
  var GUIDE_H = 3;                                        // hours shown
  function toggleGuide() {
    S.guide = !S.guide;
    $('guide-chip').innerHTML = S.guide ? IC.grid + ' عرض القنوات' : '📅 دليل البرامج';
    var K = S.kind.live;
    if (K.q) kindSearch('live'); else selectGroup('live', K.sel, true);
  }
  function guideHTML(list) {
    var now = Date.now(), t0 = now - 30 * 60000, span = GUIDE_H * 3600000, h = '<div class="g-times">';
    for (var t = Math.ceil(t0 / 1800000) * 1800000; t < t0 + span; t += 1800000) h += '<span style="left:' + ((t - t0) / span * 100) + '%">' + fmt(t) + '</span>';
    h += '</div>';
    list.slice(0, 80).forEach(function (c, idx) {
      h += '<div class="g-row focusable" data-id="' + c.id + '" data-idx="' + idx + '"><div class="g-ch"><i>' + c.num + '</i><b>' + esc(c.name) + '</b></div><div class="g-line">' + guideLine(c, t0, span, now) + '</div></div>';
    });
    return h;
  }
  function guideLine(c, t0, span, now) {
    var L = EPG.list ? EPG.list(c) : null, h = '<i class="g-now" style="left:' + ((now - t0) / span * 100) + '%"></i>';
    if (!L || !L.length) return h + '<div class="g-empty">' + (EPG.has(c) ? 'ما في معلومات' : 'جارِ التحميل…') + '</div>';
    L.forEach(function (p) {
      if (p.stop <= t0 || p.start >= t0 + span) return;
      var a = Math.max(p.start, t0), b = Math.min(p.stop, t0 + span);
      h += '<div class="g-prog' + (p.start <= now && p.stop > now ? ' now' : '') + '" style="left:' + ((a - t0) / span * 100) + '%;width:' + ((b - a) / span * 100) + '%">' +
           '<b>' + esc(p.title) + '</b><small>' + fmt(p.start) + ' – ' + fmt(p.stop) + '</small></div>';
    });
    return h;
  }
  function renderGuide(list) {
    var gr = $('grid-live');
    gr.classList.add('guide'); Nav.resetScroll(gr);
    S.grids['grid-live'] = { list: list, n: list.length, guide: true };
    if (!list.length) { gr.innerHTML = '<div class="empty">ما في قنوات</div>'; return; }
    gr.innerHTML = guideHTML(list);
    list.slice(0, 14).forEach(function (c) { c._guideNow = true; });
    epgFill(list.slice(0, 80));
  }
  function refreshGuideRow(c) {
    var row = document.querySelector('#grid-live .g-row[data-id="' + c.id + '"]'); if (!row) return;
    var now = Date.now();
    row.querySelector('.g-line').innerHTML = guideLine(c, now - 30 * 60000, GUIDE_H * 3600000, now);
  }

  /* ---------- grids ---------- */
  function renderGrid(id, list, emptyMsg) {
    var el = $(id);
    S.grids[id] = { list: list, n: 0 };
    Nav.resetScroll(el);
    if (!list.length) { el.innerHTML = '<div class="empty">' + esc(emptyMsg) + '</div>'; return; }
    el.innerHTML = '';
    appendGrid(id);
  }
  function appendGrid(id) {
    var g = S.grids[id], start = g.n, end = Math.min(g.n + GRID_BATCH, g.list.length), h = '';
    for (var i = g.n; i < end; i++) h += cardHTML(g.list[i], i);
    $(id).insertAdjacentHTML('beforeend', h);
    g.n = end;
    if (g.list[0] && !g.list[0].vod) epgFill(g.list.slice(start, Math.min(end, start + 18)));
  }

  /* ---------- browse screens (live / vod) ---------- */
  var KIND_ALL = { live: 'كل القنوات', movies: 'كل الأفلام', shows: 'كل المسلسلات' };
  var KIND_UNIT = { live: ' قناة', movies: ' فيلم', shows: ' مسلسل' };
  function pinsOf(k) { return (S.pins[k] || []).filter(function (g) { return groupShown(k, g); }); }
  /* ---------- category visibility: kids profile, parental lock, hidden ---------- */
  var KIDS_RE = /(kid|child|cartoon|anim|toon|disney|family|junior|baby|أطفال|اطفال|كرتون|كارتون|انمي|أنمي|رسوم|عائلي|عائلية|براعم|spacetoon|سبيستون|majid|ماجد)/i;
  function isLocked(k, g) { var L = (S.settings.locks || {})[k]; return !!(L && L.indexOf(g) >= 0); }
  function isHidden(k, g) { var H = S.hidden[k]; return !!(H && H.indexOf(g) >= 0); }
  function groupShown(k, g) {                         // may appear in the side list at all
    if (S.kids) return KIDS_RE.test(g) && !isLocked(k, g);
    return true;
  }
  function groupOpen(k, g) {                          // may appear on the home page / in search without asking
    return groupShown(k, g) && !isHidden(k, g) && (!isLocked(k, g) || S.unlocked);
  }
  function itemAllowed(c) {
    var k = kindOf(c), g = c.group;
    if (c.sk && !c.isSeries && S.series[c.sk]) g = S.series[c.sk].group;
    return groupOpen(k, g);
  }
  function groupItem(k, g, pinned) {
    var L = S.kind[k].by[g], lk = isLocked(k, g), hd = isHidden(k, g);
    return '<div class="group-item focusable' + (pinned ? ' pinned' : '') + (lk ? ' locked' : '') + (hd ? ' hiddeng' : '') + '" data-kind="' + k + '" data-group="' + esc(g) + '">' +
      '<i class="pin" data-pin="1">' + (pinned ? '★' : '☆') + '</i><span>' + esc(g) + '</span>' +
      '<em>' + (L && !(lk && !S.unlocked) ? L.length : '') + '</em>' +
      (S.kids ? '' : '<b class="gtools"><i class="gt gt-hide" data-gt="hide" title="إخفاء">' + IC.eye + '</i><i class="gt gt-lock" data-gt="lock" title="قفل">' + (lk ? '🔒' : '🔓') + '</i></b>') +
      '</div>';
  }
  function togglePin(k, g) {
    if (!k || !g || g === '__all') return;
    var list = S.pins[k] = pinsOf(k).slice(), i = list.indexOf(g);
    if (i >= 0) list.splice(i, 1); else list.push(g);
    save('pins', S.pins);
    S.homeDirty = true;
    var keepSel = S.kind[k].sel;
    renderBrowse(k, true);
    S.kind[k].sel = keepSel;
    var el = document.querySelector('#groups-' + k + ' .group-item[data-group="' + cssEsc(g) + '"]');
    if (el) { S.hover = true; Nav.focus(el); S.hover = false; }
    toast(i >= 0 ? 'أُزيلت «' + g + '» من القوائم المثبّتة' : 'ثُبّتت «' + g + '» في أعلى القائمة');
  }
  function cssEsc(v) { return String(v).replace(/["\\]/g, '\\$&'); }
  function renderBrowse(k, keep) {
    var K = S.kind[k], pins = pinsOf(k).filter(function (g) { return (K.lazy ? K.gid[g] != null : K.by[g]) && !isHidden(k, g); });
    var h = K.lazy ? '' : '<div class="group-item focusable" data-kind="' + k + '" data-group="__all"><i class="pin"></i><span>' + KIND_ALL[k] + '</span><em>' + K.list.length + '</em></div>';
    if (pins.length) {
      h += '<div class="group-sep">★ المثبّتة</div>';
      pins.forEach(function (g) { h += groupItem(k, g, true); });
      h += '<div class="group-sep">كل الفئات</div>';
    }
    var hiddenList = [];
    for (var i = 0; i < K.groups.length; i++) {
      var gg = K.groups[i];
      if (pins.indexOf(gg) >= 0 || !groupShown(k, gg)) continue;
      if (isHidden(k, gg)) { hiddenList.push(gg); continue; }
      h += groupItem(k, gg, false);
    }
    if (hiddenList.length) {
      h += '<div class="group-sep toggle focusable" data-action="show-hidden" data-kind="' + k + '">' + (K.showHidden ? '▾' : '▸') + ' فئات مخفية (' + hiddenList.length + ')</div>';
      if (K.showHidden) hiddenList.forEach(function (g) { h += groupItem(k, g, false); });
    }
    if (S.kids && !h) h = '<div class="empty" style="padding:1rem">ما في فئات أطفال بهالقسم</div>';
    var sc = $('groups-' + k), ty = sc._ty;
    sc.innerHTML = h;
    if (keep && ty) { sc._ty = ty; sc.style.transform = 'translate3d(0,' + ty + 'px,0)'; } else Nav.resetScroll(sc);
    $('hint-' + k).innerHTML = S.kids ? 'ملف أطفال 👶' : KD.r + ' ★ تثبيت · ' + KD.g + ' 👁 إخفاء · ' + KD.y + ' 🔒 قفل';
    if (keep) { K.dirty = false; return; }
    var firstOk = K.groups.filter(function (g) { return groupShown(k, g) && !isHidden(k, g) && !isLocked(k, g); })[0];
    if (K.lazy) { if (K.gid[K.sel] == null || !groupShown(k, K.sel) || (isLocked(k, K.sel) && !S.unlocked)) K.sel = pins.filter(function (g) { return !isLocked(k, g) || S.unlocked; })[0] || firstOk || K.groups[0]; }
    else if (K.sel !== '__all' && !K.by[K.sel]) K.sel = '__all';
    selectGroup(k, K.sel, true);
    K.dirty = false;
  }
  var SORTS = { live: ['def', 'az', 'num'], movies: ['def', 'new', 'rate', 'az'], shows: ['def', 'new', 'rate', 'az'] };
  var SORT_LABEL = { def: 'الترتيب: الافتراضي', 'new': 'الترتيب: الأحدث', rate: 'الترتيب: الأعلى تقييماً', az: 'الترتيب: أبجدي', num: 'الترتيب: رقم القناة' };
  function sorted(k, list) {
    var mode = S.kind[k].sort || 'def';
    $('sort-' + k).innerHTML = IC.sort + ' ' + SORT_LABEL[mode].replace('الترتيب: ', '');
    if (mode === 'def') return list;
    var a = list.slice();
    if (mode === 'new') a.sort(function (x, y) { return (y.added || 0) - (x.added || 0); });
    else if (mode === 'rate') a.sort(function (x, y) { return (y.rating || 0) - (x.rating || 0); });
    else if (mode === 'num') a.sort(function (x, y) { return (x.num || 0) - (y.num || 0); });
    else a.sort(function (x, y) { return norm(x.name) < norm(y.name) ? -1 : norm(x.name) > norm(y.name) ? 1 : 0; });
    return a;
  }
  function selectGroup(k, g, force) {
    var K = S.kind[k];
    if (g && g !== '__all' && isLocked(k, g) && !S.unlocked) {
      askPin('الفئة مقفولة', '«' + g + '» — اكتب رمز القفل', function () { selectGroup(k, g, true); });
      return;
    }
    if (K.q && !force) { K.q = ''; $('q-' + k).value = ''; $('q-' + k).parentNode.classList.remove('has'); force = true; }
    if (K.q && force && g === K.sel) return;      // keep showing results while the search box has text
    if (g === K.sel && !force) return;
    K.sel = g;
    var items = $('groups-' + k).querySelectorAll('.group-item');
    for (var i = 0; i < items.length; i++) items[i].classList.toggle('active', items[i].getAttribute('data-group') === g);
    if (K.lazy && !K.by[g]) {
      $('head-' + k).innerHTML = esc(g) + '<small>جارِ التحميل…</small>';
      var gr = $('grid-' + k); Nav.resetScroll(gr); S.grids['grid-' + k] = null;
      gr.innerHTML = '<div class="grid-loading"><div class="spinner"></div></div>';
      fetchGroup(k, g).then(function () {
        if (K.sel === g) selectGroup(k, g, true);
        var gi = document.querySelector('#groups-' + k + ' .group-item[data-group="' + cssEsc(g) + '"] em');
        if (gi) gi.textContent = K.by[g].length;
      }, function (err) {
        if (K.sel === g) gr.innerHTML = '<div class="empty">تعذّر تحميل الفئة: ' + esc(err.message) + '</div>';
      });
      return;
    }
    var list = g === '__all' ? K.list : (K.by[g] || []);
    $('head-' + k).innerHTML = (pinsOf(k).indexOf(g) >= 0 ? '★ ' : '') + esc(g === '__all' ? KIND_ALL[k] : g) + '<small>' + list.length + KIND_UNIT[k] + '</small>';
    if (k === 'live' && S.guide) { renderGuide(sorted(k, list)); return; }
    if (k === 'live') $('grid-live').classList.remove('guide');
    renderGrid('grid-' + k, sorted(k, list), 'لا يوجد محتوى في هذه الفئة');
  }

  /* Arabic-friendly matching: ignore diacritics and alef/yaa/taa-marbuta spelling differences */
  function norm(t) {
    return String(t || '').toLowerCase()
      .replace(/[\u064B-\u0652\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/\s+/g, ' ').trim();
  }
  /* every word you type must appear somewhere in the name, in any order */
  function matches(name, q) {
    var n = norm(name), w = q.split(' ');
    for (var i = 0; i < w.length; i++) if (w[i] && n.indexOf(w[i]) < 0) return false;
    return true;
  }
  /* ---------- search index ----------
     Many servers refuse to send a whole section in one request (they return an empty list),
     so the index is built category by category in the background. Results show straight away
     from what's already loaded and grow as more categories arrive. */
  function poolOf(k) {
    var K = S.kind[k];
    if (!K.lazy) return K.list;
    if (K.all) return K.all;
    var seen = {}, out = [];
    K.list.forEach(function (c) { if (!seen[c.id]) { seen[c.id] = 1; out.push(c); } });
    return out;
  }
  function indexKind(k, onProgress) {
    var K = S.kind[k];
    if (!K.lazy || K.all || K.idxDone) { if (onProgress) onProgress(true); return; }
    K.idxListeners = K.idxListeners || [];
    if (onProgress) K.idxListeners.push(onProgress);
    if (K.idxBusy) return;
    K.idxBusy = true;
    function notify(done) {
      var ls = K.idxListeners.slice(); if (done) K.idxListeners = [];
      ls.forEach(function (f) { try { f(done); } catch (e) {} });
    }
    function byCategory() {
      var todo = K.groups.filter(function (g) { return !K.by[g]; }), i = 0, running = 0, last = 0;
      K.idxTotal = K.groups.length; K.idxLeft = todo.length;
      if (!todo.length) { K.idxDone = true; K.idxBusy = false; notify(true); return; }
      function next() {
        while (running < 2 && i < todo.length) {
          var g = todo[i++]; running++;
          fetchGroup(k, g, K.idxLowRun ? 'low' : true).then(step, step);
        }
      }
      function step() {
        running--; K.idxLeft--;
        if (K.idxLeft <= 0) { K.idxDone = true; K.idxBusy = false; notify(true); return; }
        if (Date.now() - last > 700) { last = Date.now(); notify(false); }
        next();
      }
      next();
    }
    // try the one-shot full list first; if the server sends nothing, go category by category
    var names = {}; Object.keys(K.gid).forEach(function (n) { if (K.gid[n] != null) names[K.gid[n]] = n; });
    xapi(XK[k].items, '', K.idxLowRun ? 'low' : true).then(function (arr) {
      if (Array.isArray(arr) && arr.length) {
        K.all = arr.map(function (it, i) {
          var o = makeItem(k, it, i, names[it.category_id] || K.groups[0] || 'أخرى');
          return S.byId[o.id] && (!o.isSeries || S.byId[o.id].isSeries) ? S.byId[o.id] : adopt(o);
        });
        K.idxDone = true; K.idxBusy = false; notify(true);
      } else byCategory();
    }, byCategory);
  }
  function findIn(list, q, withNum) {
    var out = [];
    for (var i = 0; i < list.length && out.length < 500; i++) {
      var c = list[i];
      if (!itemAllowed(c)) continue;
      if (matches(c.name, q) || (withNum && !c.vod && String(c.num) === q)) out.push(c);
    }
    return out;
  }
  function progressNote(k) {
    var K = S.kind[k];
    if (!K.lazy || K.all || K.idxDone) return '';
    if (!K.idxTotal) return ' · جارِ تجهيز البحث…';
    return ' · جارِ البحث في باقي الفئات (' + (K.idxTotal - K.idxLeft) + '/' + K.idxTotal + ')';
  }
  /* re-render results only if you're not in the middle of browsing them */
  function showResults(gridId, list, empty) {
    var gr = $(gridId), cur = Nav.current();
    var inside = cur && gr.contains(cur);
    var st = S.grids[gridId];
    if (inside && st && st.list.length === list.length) return;
    if (inside && st && st.list.length && list.length > st.list.length) {   // keep focus: just extend the list
      st.list = list; if (st.n < GRID_BATCH) appendGrid(gridId); return;
    }
    renderGrid(gridId, list, empty);
  }

  function kindSearch(k) {
    var K = S.kind[k], inp = $('q-' + k), q = norm(inp.value);
    inp.parentNode.classList.toggle('has', !!inp.value);
    if (!q) { K.q = ''; selectGroup(k, K.sel, true); return; }
    K.q = q;
    var head = $('head-' + k), label = esc(inp.value.trim());
    function draw(done) {
      if (K.q !== q) return;
      var res = findIn(poolOf(k), q, k === 'live');
      head.innerHTML = 'نتائج «' + label + '»<small>' + res.length + KIND_UNIT[k] + (done ? '' : progressNote(k)) + '</small>';
      if (!res.length && !done) {
        var gr = $('grid-' + k);
        if (!gr.querySelector('.grid-loading')) { Nav.resetScroll(gr); S.grids['grid-' + k] = { list: [], n: 0 }; gr.innerHTML = '<div class="grid-loading"><div class="spinner"></div><p>جارِ البحث…</p></div>'; }
        return;
      }
      if (k === 'live' && S.guide) { renderGuide(sorted(k, res)); return; }
      showResults('grid-' + k, sorted(k, res), 'ما في نتائج — جرّب جزء ثاني من الاسم');
    }
    draw(false);
    K.idxLowRun = false;               // you're waiting now: index at normal speed
    indexKind(k, draw);
  }

  function runSearch() {
    var q = norm($('search-input').value);
    if (!q) { renderGrid('search-grid', [], 'اكتب اسم القناة أو الفيلم أو رقم القناة.'); return; }
    S.gq = q;
    var kinds = ['live', 'movies', 'shows'];
    function draw() {
      if (S.gq !== q) return;
      var res = [], done = true;
      kinds.forEach(function (k) {
        var K = S.kind[k];
        if (K.lazy && !K.all && !K.idxDone) done = false;
        res = res.concat(findIn(poolOf(k), q, true));
      });
      if (!res.length && !done) {
        var gr = $('search-grid');
        if (!gr.querySelector('.grid-loading')) { Nav.resetScroll(gr); S.grids['search-grid'] = { list: [], n: 0 }; gr.innerHTML = '<div class="grid-loading"><div class="spinner"></div><p>جارِ البحث في كل الأقسام…</p></div>'; }
        return;
      }
      showResults('search-grid', res.slice(0, 500), 'ما في نتائج — جرّب جزء ثاني من الاسم');
    }
    draw();
    kinds.forEach(function (k) { if (S.kind[k]) S.kind[k].idxLowRun = false; indexKind(k, draw); });
  }

  /* ---------- series ---------- */
  function lastEpOf(sk) {
    for (var i = 0; i < S.recent.length; i++) { var c = S.byId[S.recent[i]]; if (c && c.sk === sk && !c.isSeries) return c; }
    return null;
  }
  function nextUp(se) {
    var last = lastEpOf(se.sk);
    if (!last) return se.eps[0];
    if (S.pos[last.id] || !S.done[last.id]) return last;
    var i = se.eps.indexOf(last);
    return se.eps[i + 1] || last;
  }
  function epCardHTML(ep, se, nuId) {
    var p = S.pos[ep.id], done = S.done[ep.id], m = meta(ep);
    var tag = ep.id === nuId ? '<span class="badge-live badge-next">' + (p ? 'تابع' : (lastEpOf(se.sk) ? 'التالية' : 'ابدأ')) + '</span>'
            : done ? '<span class="badge-live badge-done">✓ شوهدت</span>' : '';
    return '<div class="card focusable" data-action="play-ep" data-id="' + ep.id + '">' +
      '<div class="card-thumb" style="' + bg(se) + '">' +
        (se.logo ? '<img class="ep-bg" decoding="async" src="' + esc(se.logo) + '" onerror="this.style.display=\'none\'">' : '') +
        '<span class="ep-num"><b>' + ep.e + '</b><small>الحلقة</small></span>' + tag +
      '</div>' +
      '<div class="card-name">الحلقة ' + ep.e + '</div>' +
      '<div class="card-now">' + esc(p ? 'متبقٍ ' + dur(p.d - p.t) : (done ? 'شوهدت' : se.name)) + '</div>' +
      '<div class="progress' + (m.pct == null ? ' empty' : '') + '"><i style="width:' + (m.pct || 0) + '%"></i></div>' +
    '</div>';
  }
  function seriesHeroHTML(se) {
    var nu = nextUp(se), started = !!lastEpOf(se.sk), fav = isFav(se.id);
    var h = '<div class="hero series-hero"><div class="hero-bg" style="' + bg(se) + '">' +
      ((se.backdrop || se.logo) ? '<img class="hero-backdrop" src="' + esc(se.backdrop || se.logo) + '" onerror="this.style.display=\'none\'">' : '') + '</div>';
    h += se.logo ? '<img class="hero-poster" src="' + esc(se.logo) + '" onerror="this.style.display=\'none\'">'
                 : '<div class="hero-logo-txt">' + esc(initials(se.name)) + '</div>';
    h += '<div class="hero-shade"></div><div class="hero-content">';
    h += '<div class="hero-meta"><span class="badge-live badge-vod">مسلسل</span><span class="hero-group">' + esc(se.group) + '</span></div>';
    h += '<h1 class="hero-title">' + esc(se.name) + '</h1>';
    h += '<div class="info-meta">' + (se.rating ? '<span class="rate">★ ' + (+se.rating).toFixed(1) + '</span>' : '') + (se.year ? '<span>' + esc(se.year) + '</span>' : '') +
         (se.genre ? '<span>' + esc(se.genre) + '</span>' : '') + '<span>' + (se.seasons.length > 1 ? se.seasons.length + ' مواسم · ' : '') + se.eps.length + ' حلقة</span></div>';
    if (se.plot) h += '<p class="info-plot">' + esc(se.plot) + '</p>';
    if (se.cast) h += '<div class="info-people"><b>بطولة:</b> ' + esc(String(se.cast).split(',').slice(0, 5).join('، ')) + '</div>';
    var np = S.pos[nu.id];
    if (started) {
      h += '<div class="hero-time" style="direction:rtl">' + (np ? 'وصلت إلى ' + epLabel(nu) + ' · متبقٍ ' + dur(np.d - np.t) : 'التالية: ' + epLabel(nu)) + '</div>';
      if (np) h += '<div class="progress hero-progress"><i style="width:' + (np.t / np.d * 100) + '%"></i></div>';
    }
    h += '<div class="hero-actions">';
    h += '<div class="btn primary focusable" data-action="play-ep" data-id="' + nu.id + '">▶ ' + (started ? (np ? 'تابع ' : 'شاهد ') + epLabel(nu) : 'ابدأ المشاهدة') + '</div>';
    h += '<div class="btn focusable" data-action="fav" data-id="' + se.id + '">' + (fav ? '★ في المفضلة' : '☆ أضف للمفضلة') + '</div>';
    h += '</div></div></div>';
    return h;
  }
  function renderSeries() {
    var se = S.series[S.curSeries]; if (!se) return;
    var season = S.curSeason, nu = nextUp(se), h = seriesHeroHTML(se);
    if (se.seasons.length > 1) {
      h += '<div class="season-tabs">';
      se.seasons.forEach(function (sn) {
        h += '<div class="season-chip focusable' + (sn === season ? ' active' : '') + '" data-action="season" data-season="' + sn + '">الموسم ' + sn + '</div>';
      });
      h += '</div>';
    } else h += '<div class="ep-head">الحلقات</div>';
    h += '<div class="grid ep-grid" id="series-grid">';
    se.eps.forEach(function (ep) { if (ep.s === season) h += epCardHTML(ep, se, nu.id); });
    h += '</div>';
    var sc = $('series-scroller'); sc.innerHTML = h; Nav.resetScroll(sc);
  }
  function openSeries(sk, focusEpId) {
    var se = S.series[sk]; if (!se) return;
    if (se.xseries && !se.loaded) { ensureSeries(se).then(function () { openSeries(sk, focusEpId); }, function () {}); return; }
    if (S.screen !== 'series') S.prevScreen = S.screen;
    S.curSeries = sk;
    var nu = nextUp(se), target = focusEpId ? S.byId[focusEpId] : null;
    S.curSeason = (target || nu).s;
    renderSeries();
    showScreen('series');
    stageSet(se);
    var f = focusEpId && document.querySelector('#series-grid .card[data-id="' + focusEpId + '"]');
    Nav.focus(f || document.querySelector('#screen-series .btn'));
  }
  function playEp(ep) {
    var se = S.series[ep.sk];
    if (!se) { Player.open(ep, null); return; }
    ensureSeries(se).then(function () {
      var full = S.byId[ep.id] || ep;
      if (se.eps.indexOf(full) < 0) full = se.eps.filter(function (x) { return x.id === ep.id; })[0] || ep;
      rememberEp(full);
      Player.open(full, se.eps);
    }, function () { Player.open(ep, null); });
  }
  /* ---------- movie details page ---------- */
  function fmtLen(str, secs) {
    var m = /^(\d+):(\d+)(?::\d+)?$/.exec(String(str || ''));
    var mins = secs ? Math.round(secs / 60) : (m ? (+m[1]) * 60 + (+m[2]) : 0);
    if (!mins) return str || '';
    var h = Math.floor(mins / 60), mm = mins % 60;
    return (h ? h + ' س ' : '') + (mm ? mm + ' د' : '');
  }
  function infoHTML(m) {
    var p = S.pos[m.id], fav = isFav(m.id), i = m.info || {};
    var h = '<div class="info-hero"><div class="hero-bg" style="' + bg(m) + '">' +
      ((i.backdrop || m.logo) ? '<img class="info-bd" src="' + esc(i.backdrop || m.logo) + '" onerror="this.style.display=\'none\'">' : '') + '</div><div class="info-shade"></div>';
    if (i.poster || m.logo) h += '<img class="info-poster" src="' + esc(i.poster || m.logo) + '" onerror="this.style.display=\'none\'">';
    h += '<div class="info-body"><div class="hero-meta"><span class="badge-live badge-vod">فيلم</span><span class="hero-group">' + esc(m.group) + '</span></div>';
    h += '<h1 class="info-title">' + esc(untag(i.name || m.name)) + '</h1>';
    var rating = i.rating || m.rating;
    h += '<div class="info-meta">' + (rating ? '<span class="rate">★ ' + (+rating).toFixed(1) + '</span>' : '') +
      (i.year ? '<span>' + esc(i.year) + '</span>' : '') + (i.duration ? '<span>' + esc(i.duration) + '</span>' : '') +
      (i.genre ? '<span>' + esc(i.genre) + '</span>' : '') + '</div>';
    if (i.plot) h += '<p class="info-plot">' + esc(i.plot) + '</p>';
    else if (m.infoLoading) h += '<div class="info-loading">جارِ تحميل التفاصيل…</div>';
    if (i.director) h += '<div class="info-people"><b>إخراج:</b> ' + esc(i.director) + '</div>';
    if (i.cast) h += '<div class="info-people"><b>بطولة:</b> ' + esc(String(i.cast).split(',').slice(0, 6).join('، ')) + '</div>';
    if (p) h += '<div class="progress hero-progress" style="max-width:30rem;margin-top:1.2rem"><i style="width:' + (p.t / p.d * 100) + '%"></i></div>';
    h += '<div class="hero-actions">';
    h += '<div class="btn primary focusable" data-action="info-play" data-id="' + m.id + '">▶ ' + (p ? 'تابع من ' + dur(p.t) : 'شاهد الآن') + '</div>';
    if (p) h += '<div class="btn focusable" data-action="info-restart" data-id="' + m.id + '">' + IC.restart + ' من البداية</div>';
    h += '<div class="btn focusable" data-action="fav" data-id="' + m.id + '">' + (fav ? '★ في المفضلة' : '☆ أضف للمفضلة') + '</div>';
    h += '</div></div></div>';
    var more = (S.kind.movies.by[m.group] || []).filter(function (x) { return x !== m; });
    h += railHTML('من نفس الفئة', 'info:more', more);
    return h;
  }
  function renderInfo() {
    var m = S.byId[S.curInfo]; if (!m) return;
    var sc = $('info-scroller'), cur = Nav.current(), hadBtn = cur && sc.contains(cur) && cur.getAttribute('data-action');
    sc.innerHTML = infoHTML(m);
    if (S.screen === 'info') Nav.focus((hadBtn && sc.querySelector('[data-action="' + hadBtn + '"]')) || sc.querySelector('.btn'));
  }
  function openInfo(m) {
    if (S.screen !== 'info') S.prevScreen = S.screen;
    S.curInfo = m.id;
    loadVodInfo(m, true, function () { if (S.curInfo === m.id && S.screen === 'info') { renderInfo(); stageSet(m); } });
    renderInfo();
    showScreen('info');
    stageSet(m);
    Nav.resetScroll($('info-scroller'));
    Nav.focus($('info-scroller').querySelector('.btn'));
  }
  function loadVodInfo(m, prio, cb) {
    if (!m.info && !m.infoLoading && S.settings.api && m.sid) {
      m.infoLoading = true;
      xapi('get_vod_info', '&vod_id=' + m.sid, prio).then(function (d) {
        var i = (d && d.info) || {}, md = (d && d.movie_data) || {};
        var bd = i.backdrop_path;
        m.info = {
          name: md.name || i.name || '', plot: i.plot || i.description || '', cast: i.cast || i.actors || '', director: i.director || '',
          genre: i.genre || '', year: String(i.releasedate || i.release_date || i.year || '').slice(0, 4),
          duration: fmtLen(i.duration, i.duration_secs),
          rating: parseFloat(i.rating) || 0, poster: i.movie_image || i.cover_big || '', backdrop: (Array.isArray(bd) ? bd[0] : bd) || ''
        };
        m.infoLoading = false;
        if (cb) cb();
      }, function () { m.infoLoading = false; m.info = {}; if (cb) cb(); });
    }
  }
  function closeInfo() {
    var prev = S.prevScreen || 'movies';
    showScreen(prev);
    var sec = $('screen-' + prev), lf = S.lastFocus[sec.id];
    Nav.focus(lf && sec.contains(lf) && visible(lf) ? lf : (firstIn(sec) || navItem(prev)));
  }

  function closeSeries() {
    var prev = S.prevScreen || 'shows';
    showScreen(prev);
    var sec = $('screen-' + prev), lf = S.lastFocus[sec.id];
    Nav.focus(lf && sec.contains(lf) && visible(lf) ? lf : (firstIn(sec) || navItem(prev)));
  }

  /* ---------- playlists (several subscriptions / M3U lists) ---------- */
  function migratePlaylists() {
    var st = S.settings;
    if (st.pls) return;
    st.pls = [];
    if (st.xs && st.xu) st.pls.push({ id: 'pl1', name: hostOf(st.xs), type: 'xtream', xs: st.xs, xu: st.xu, xp: st.xp });
    else if (st.m3u) st.pls.push({ id: 'pl1', name: hostOf(st.m3u), type: 'm3u', m3u: st.m3u, epg: st.epg || '' });
    if (st.pls.length) {
      st.activePl = 'pl1';
      try { var c = localStorage.getItem('amira.cache'); if (c) { localStorage.setItem('amira.cache.pl1', c); localStorage.removeItem('amira.cache'); } } catch (e) {}
    }
    save('settings', st);
  }
  function hostOf(u) { var m = /^\w+:\/\/([^\/:?#]+)/.exec(String(u || '')); return m ? m[1] : String(u || 'قائمة'); }
  function plById(id) { return (S.settings.pls || []).filter(function (p) { return p.id === id; })[0]; }
  function upsertPl(pl) {
    var st = S.settings, list = st.pls = st.pls || [];
    var ex = list.filter(function (p) { return p.type === pl.type && (pl.type === 'xtream' ? p.xs === pl.xs && p.xu === pl.xu : p.m3u === pl.m3u); })[0];
    var nm = ($('set-plname') && $('set-plname').value.trim()) || '';
    if (ex) { for (var k in pl) ex[k] = pl[k]; if (nm) ex.name = nm; pl = ex; }
    else { pl.id = 'pl' + Date.now().toString(36); pl.name = nm || hostOf(pl.xs || pl.m3u); list.push(pl); }
    if ($('set-plname')) $('set-plname').value = '';
    st.activePl = pl.id; save('settings', st); save('pl', pl.id);
    return pl;
  }
  function activatePl(id, quiet) {
    var pl = plById(id); if (!pl) return;
    var st = S.settings;
    st.activePl = id; save('pl', id);
    epgAsked = {}; epgQ = []; EPG.clear();
    if (pl.type === 'xtream') {
      st.xs = pl.xs; st.xu = pl.xu; st.xp = pl.xp; st.api = true; st.m3u = '';
      save('settings', st);
      var cache = load('cache', null);
      if (cache && cache.cats) { setCatalog(cache.cats, false); setTimeout(refreshCats, 3000); }
      else loadXtreamApi(true);
    } else {
      st.api = false; st.m3u = pl.m3u; st.epg = pl.epg || '';
      save('settings', st);
      loadPlaylist(pl.m3u, pl.epg || '');
    }
    if (!quiet) toast('📺 ' + pl.name);
  }
  function renderPlaylists() {
    var st = S.settings, h = '';
    (st.pls || []).forEach(function (p) {
      var on = p.id === st.activePl;
      h += '<div class="pl-row' + (on ? ' on' : '') + '"><div class="pl-info"><b>' + esc(p.name) + (on ? ' <span class="pl-tag">✓ شغّالة</span>' : '') + '</b>' +
        '<small>' + (p.type === 'xtream' ? 'Xtream · ' + esc(hostOf(p.xs)) + ' · ' + esc(p.xu) : 'M3U · ' + esc(hostOf(p.m3u))) + '</small></div>' +
        (on ? '' : '<div class="btn primary focusable" data-action="pl-use" data-pl="' + p.id + '">تشغيل</div>') +
        '<div class="btn focusable" data-action="pl-del" data-pl="' + p.id + '">حذف</div></div>';
    });
    $('pl-list').innerHTML = h || '<p class="note">ما في قوائم بعد — أضف اشتراك Xtream أو رابط M3U تحت.</p>';
  }
  function deletePl(id) {
    var st = S.settings, pl = plById(id); if (!pl) return;
    amodal('حذف «' + pl.name + '»؟', 'رح تنحذف القائمة من التطبيق', false, [
      { label: 'حذف', primary: true, run: function () {
        amClose(false);
        st.pls = st.pls.filter(function (p) { return p.id !== id; });
        try { localStorage.removeItem('amira.cache.' + id); } catch (e) {}
        save('settings', st);
        if (st.activePl === id) { st.activePl = st.pls[0] ? st.pls[0].id : null; save('settings', st); if (st.activePl) activatePl(st.activePl); else { st.xs = st.xu = st.xp = st.m3u = ''; st.api = false; save('settings', st); loadDemo(); } }
        renderPlaylists(); fillSettings();
        Nav.focus(document.querySelector('#pl-list .btn') || $('set-plname'));
        toast('انحذفت القائمة');
      } },
      { label: 'إلغاء', run: function () { amClose(); } }
    ], function () { amClose(); });
  }
  /* open the last live channel on start (setting) */
  function maybeAutoPlay() {
    if (S.autoDone || !S.settings.autoLast || Player.isOpen()) return;
    S.autoDone = true;
    var ch = ids2list(S.recent).filter(function (c) { return !c.vod && itemAllowed(c); })[0];
    if (ch) setTimeout(function () { if (!Player.isOpen() && S.screen !== 'profiles') Player.open(ch, groupList(ch) || [ch]); }, 400);
  }

  /* ---------- small app modal: PIN entry ---------- */
  function amodal(title, sub, withInput, btns, onBack) {
    S.am = { btns: btns, onBack: onBack, prevFocus: Nav.current() };
    $('am-title').textContent = title; $('am-sub').textContent = sub || '';
    var inp = $('am-input'); inp.value = ''; S.am.pad = !!withInput;
    $('am-pad').className = 'am-pad' + (withInput ? '' : ' hide'); amDots();
    var h = '';
    btns.forEach(function (b, i) { h += '<div class="btn focusable' + (b.primary ? ' primary' : '') + '" data-am="' + i + '">' + esc(b.label) + '</div>'; });
    $('am-btns').innerHTML = h;
    $('amodal').className = 'show';
    Nav.focus(withInput ? $('am-pad').querySelector('[data-kp="1"]') : $('am-btns').firstChild);
  }
  function amDots() {
    var v = $('am-input').value, h = '';
    for (var i = 0; i < 4; i++) h += '<i' + (i < v.length ? ' class="on"' : '') + '></i>';
    $('am-dots').innerHTML = h;
  }
  function amPress(d) { if (d === 'ok') { if (S.am && S.am.enter) S.am.enter(); } else amType(d); }
  function amType(d) {
    if (!S.am || !S.am.pad) return;
    var inp = $('am-input');
    if (d === 'del') inp.value = inp.value.slice(0, -1);
    else if (inp.value.length < 4) inp.value += d;
    amDots();
    if (inp.value.length === 4 && S.am.enter) setTimeout(function () { if (S.am && $('am-input').value.length === 4) S.am.enter(); }, 120);
  }
  function amClose(refocus) {
    var st = S.am; S.am = null; $('amodal').className = '';
    try { $('am-input').blur(); } catch (e) {}
    if (refocus !== false && st && st.prevFocus && document.body.contains(st.prevFocus)) Nav.focus(st.prevFocus);
  }
  function askPin(title, sub, onOk) {
    if (!S.settings.pin) { onOk(); return; }
    function check() {
      if ($('am-input').value === S.settings.pin) { S.unlocked = true; amClose(); onOk(); toast('🔓 انفتح القفل لحد ما تسكّر التطبيق'); }
      else { $('am-sub').textContent = 'الرمز غلط، جرّب مرة ثانية'; $('am-input').value = ''; amDots(); var bx = document.querySelector('.am-box'); bx.classList.remove('shake'); void bx.offsetWidth; bx.classList.add('shake'); }
    }
    amodal(title, sub, true, [{ label: 'فتح', primary: true, keep: true, run: check }, { label: 'إلغاء', run: function () { amClose(); } }], function () { amClose(); });
    S.am.enter = check;
  }
  function setPin(after) {
    function step2(first) {
      amodal('أكّد الرمز', 'اكتبه مرة ثانية', true, [{ label: 'حفظ', primary: true, keep: true, run: function () {
        if ($('am-input').value !== first) { $('am-sub').textContent = 'الرمزين مش متطابقين'; $('am-input').value = ''; amDots(); return; }
        S.settings.pin = first; save('settings', S.settings); S.unlocked = !!after; amClose(); fillSettings(); if (after) after(); else toast('🔒 تم تعيين رمز القفل');
      } }, { label: 'إلغاء', run: function () { amClose(); } }], function () { amClose(); });
      S.am.enter = function () { S.am.btns[0].run(); };
    }
    function step1() {
      amodal('رمز قفل جديد', after ? 'لازم تعيّن رمز من 4 أرقام قبل ما تقفل' : '4 أرقام', true, [{ label: 'التالي', primary: true, keep: true, run: function () {
        var v = $('am-input').value;
        if (!/^\d{4}$/.test(v)) { $('am-sub').textContent = 'لازم يكون 4 أرقام'; return; }
        step2(v);
      } }, { label: 'إلغاء', run: function () { amClose(); } }], function () { amClose(); });
      S.am.enter = function () { S.am.btns[0].run(); };
    }
    if (S.settings.pin) askPinStrict(step1); else step1();
  }
  /* changing protection always needs the current PIN, even if unlocked this session */
  function askPinStrict(onOk) {
    if (!S.settings.pin) { onOk(); return; }
    var was = S.unlocked; S.unlocked = false;
    askPin('رمز القفل الحالي', 'للتأكيد', function () { S.unlocked = was || true; onOk(); });
  }
  /* settings: pick which categories are locked */
  function renderLockList() {
    var box = $('lock-list'); if (!box) return;
    var k = S.lockKind;
    [].forEach.call(document.querySelectorAll('#lock-kinds .btn'), function (b) { b.classList.toggle('primary', b.getAttribute('data-kind') === k); });
    if (!k) { box.innerHTML = ''; return; }
    var K = S.kind[k], gs = (K && K.groups || []).filter(function (g) { return g !== '__all' && groupShown(k, g); });
    var cur = Nav.current(), cg = cur && cur.getAttribute('data-group');
    if (!gs.length) { box.innerHTML = '<div class="note">ما في فئات بهالقسم لسا</div>'; return; }
    var h = '';
    gs.forEach(function (g) {
      var on = isLocked(k, g);
      h += '<div class="lk-chip focusable' + (on ? ' on' : '') + '" data-action="lock-g" data-kind="' + k + '" data-group="' + esc(g) + '">' + (on ? '🔒 ' : '🔓 ') + esc(g) + '</div>';
    });
    box.innerHTML = h;
    if (cg != null) { var el = box.querySelector('[data-group="' + cssEsc(cg) + '"]'); if (el) Nav.focus(el); }
  }
  function toggleLock(k, g) {
    if (!k || !g || g === '__all' || S.kids) return;
    function go() {
      var L = S.settings.locks = S.settings.locks || {}, a = L[k] = (L[k] || []).slice(), i = a.indexOf(g);
      if (i >= 0) a.splice(i, 1); else a.push(g);
      save('settings', S.settings);
      S.homeDirty = true; S.myDirty = true;
      if (S.kind[k]) S.kind[k].dirty = true;
      if (S.screen === k) {
        renderBrowse(k, true);
        var el = document.querySelector('#groups-' + k + ' .group-item[data-group="' + cssEsc(g) + '"]'); if (el) { S.hover = true; Nav.focus(el); S.hover = false; }
      }
      if (S.screen === 'settings') renderLockList();
      toast(i >= 0 ? '🔓 انفتحت «' + g + '»' : '🔒 انقفلت «' + g + '» — بتحتاج الرمز لتنفتح');
    }
    if (!S.settings.pin) { setPin(go); return; }
    if (S.unlocked) go(); else askPin('رمز القفل', 'لتغيير قفل «' + g + '»', go);
  }
  function toggleHide(k, g) {
    if (!k || !g || g === '__all' || S.kids) return;
    var H = S.hidden[k] = (S.hidden[k] || []).slice(), i = H.indexOf(g);
    if (i >= 0) H.splice(i, 1); else H.push(g);
    save('hidden', S.hidden);
    S.homeDirty = true;
    renderBrowse(k, true);
    var el = document.querySelector('#groups-' + k + ' .group-item[data-group="' + cssEsc(g) + '"]') || document.querySelector('#groups-' + k + ' .focusable');
    if (el) { S.hover = true; Nav.focus(el); S.hover = false; }
    toast(i >= 0 ? '👁 رجعت «' + g + '»' : 'انخفت «' + g + '» — بتلاقيها تحت بـ «فئات مخفية»');
  }

  /* ---------- profiles ---------- */
  var PCOLORS = ['#e5484d', '#f5a524', '#2fd18b', '#4da3ff', '#a98bff', '#ff4d9d', '#16b6c4', '#8a8f98'];
  function rawLoad(k, d) { try { var v = localStorage.getItem('amira.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function rawSave(k, v) { try { localStorage.setItem('amira.' + k, JSON.stringify(v)); } catch (e) {} }
  function initProfiles() {
    S.profiles = rawLoad('profiles', null);
    if (!S.profiles || !S.profiles.length) {
      // first run with profiles: the existing history/favourites become the first profile
      S.profiles = [{ id: 'p1', name: 'أنا', c: 1 }];
      Object.keys(PER_PROFILE).forEach(function (k) {
        try {
          var v = localStorage.getItem('amira.' + k);
          if (v != null) { localStorage.setItem('amira.p.p1.' + k, v); localStorage.removeItem('amira.' + k); }
        } catch (e) {}
      });
      rawSave('profiles', S.profiles);
    }
    var last = rawLoad('profile', null);
    S.pid = S.profiles.some(function (p) { return p.id === last; }) ? last : S.profiles[0].id;
  }
  function avHTML(p) {                          // a profile's picture: drawn avatar, or its initial on a colour
    if (p && p.av != null) return '<img class="av-img" src="' + Avatars.url(p.av) + '" alt="">';
    return '<span class="av-ini" style="background:' + PCOLORS[(p ? p.c : 0) % PCOLORS.length] + '">' + esc(p ? initials(p.name).charAt(0) : '') + '</span>';
  }
  var LANGS = { ar: 'العربية', en: 'English', es: 'Español', fr: 'Français' };
  function applyLang(l) {
    l = l || 'ar';
    if (I18N.lang() === l) return;
    I18N.setLang(l); Nav.setRtl(l === 'ar');
    var trs = document.querySelectorAll('.rail-track');          // horizontal offsets flip with the direction
    for (var i = 0; i < trs.length; i++) { trs[i]._tx = 0; trs[i].style.transform = ''; }
    S.homeDirty = true; S.myDirty = true;
    ['live', 'movies', 'shows'].forEach(function (k) { if (S.kind && S.kind[k]) S.kind[k].dirty = true; });
  }
  function profileOf(id) { return S.profiles.filter(function (p) { return p.id === id; })[0]; }
  function loadProfileData() {
    S.favs = load('favs', []); S.recent = load('recent', []); S.pos = load('pos', {}); S.done = load('done', {}); S.pins = load('pins', {});
    S.hidden = load('hidden', {});
    var me = profileOf(S.pid), av = $('avatar-btn');
    S.kids = !!(me && me.kids);
    applyLang(me && me.lang);
    document.body.classList.toggle('kids', S.kids);
    av.innerHTML = me ? avHTML(me) : ''; $('sn-name').textContent = me ? me.name : '';
    av.style.background = '';
  }
  function switchProfile(id) {
    S.pid = id; rawSave('profile', id); S.unlocked = false;
    loadProfileData();
    var restore = (Object.keys(PER_PROFILE));            // re-draw everything that depends on personal data
    S.homeDirty = true; S.myDirty = true; S.lastFocus = {};
    ['live', 'movies', 'shows'].forEach(function (k) { if (S.kind[k]) S.kind[k].dirty = true; });
    document.body.classList.remove('picking');
    var myPl = load('pl', null);
    if (myPl && myPl !== S.settings.activePl && plById(myPl)) { activatePl(myPl, true); toast('أهلاً ' + profileOf(id).name); setTimeout(maybeAutoPlay, 1500); return; }
    renderHome(); S.homeDirty = false;
    showScreen('home'); focusHome();
    toast('أهلاً ' + profileOf(id).name);
    maybeAutoPlay();
  }
  function renderProfiles(mode) {
    S.profMode = 'pick';
    var meL = profileOf(S.pid); applyLang(meL && meL.lang);
    var h = '';
    $('prof-title').textContent = 'مين عم يتفرّج؟';
    S.profiles.forEach(function (p) {
      h += '<div class="prow"><div class="prof focusable' + (p.id === S.pid ? ' me' : '') + '" data-action="pick-profile" data-pid="' + p.id + '">' +
        '<div class="prof-av">' + avHTML(p) + (p.kids ? '<span class="kid-badge">👶</span>' : '') + '</div>' +
        '<div class="prof-name">' + esc(p.name) + '</div></div>' +
        '<div class="prof-pen focusable" data-action="prof-edit" data-pid="' + p.id + '" title="تعديل">' + IC.pen + '</div></div>';
    });
    if (S.profiles.length < 6) h += '<div class="prow"><div class="prof prof-add focusable" data-action="prof-new"><div class="prof-av">+</div><div class="prof-name">إضافة ملف</div></div></div>';
    var L = $('prof-list'); L.innerHTML = h; L.className = 'prof-list';
    $('prof-actions').innerHTML = '';
    $('prof-form').className = 'prof-form'; S.peLangs = false;
    $('screen-profiles').classList.remove('editing-prof');
    updBack();
  }
  function openProfiles(fromApp) {
    S.profFromApp = !!fromApp;
    if (Player.isOpen() || Player.isMini()) Player.close(true);
    document.body.classList.add('picking');
    renderProfiles('pick');
    showScreen('profiles');
    startProfBg();
    Nav.focus(document.querySelector('#prof-list .prof[data-pid="' + S.pid + '"]') || document.querySelector('#prof-list .prof'));
  }
  function profileForm(pid) {
    var p = pid ? profileOf(pid) : null;
    S.profEditing = pid || null;
    S.profColor = p ? p.c : S.profiles.length % PCOLORS.length;
    S.profAv = p ? (p.av != null ? p.av : null) : Math.floor(Math.random() * Avatars.count);
    S.profKids = !!(p && p.kids);
    S.profLang = (p && p.lang) || 'ar';
    $('prof-list').className = 'prof-list hide'; $('prof-actions').innerHTML = '';
    $('pe-title').textContent = p ? 'تعديل الملف الشخصي' : 'ملف شخصي جديد';
    $('prof-name').value = p ? p.name : '';
    $('pe-del').style.display = p && S.profiles.length > 1 ? '' : 'none';
    peFill();
    $('prof-form').className = 'prof-form show';
    $('screen-profiles').classList.add('editing-prof');
    Nav.focus($('prof-name')); updBack();
  }
  function peFill() {
    var tmp = { av: S.profAv, c: S.profColor, name: $('prof-name').value || '?' };
    $('pe-big').innerHTML = avHTML(tmp);
    $('pe-kids-sw').className = 'pe-sw' + (S.profKids ? ' on' : '');
    $('pe-lang-v').textContent = LANGS[S.profLang] || LANGS.ar;
  }
  function peOpenPicker() {
    var h = '';
    for (var i = 0; i < Avatars.count; i++) h += '<div class="pe-av focusable' + (i === S.profAv ? ' sel' : '') + '" data-action="pe-pickav" data-av="' + i + '"><img src="' + Avatars.url(i) + '" alt=""></div>';
    var g = $('pe-grid'); g.innerHTML = h; Nav.resetScroll(g);
    $('prof-form').className = 'prof-form show picking-av';
    Nav.focus(g.querySelector('.sel') || g.firstChild);
  }
  function peClosePicker() { $('prof-form').className = 'prof-form show'; peFill(); Nav.focus(document.querySelector('.pe-row[data-action="pe-avatar"]')); }
  function peOpenLangs() {
    S.peLangs = true; $('prof-form').className = 'prof-form show langs';
    var ls = document.querySelectorAll('.pe-lang');
    for (var i = 0; i < ls.length; i++) ls[i].classList.toggle('sel', ls[i].getAttribute('data-lang') === S.profLang);
    Nav.focus(document.querySelector('.pe-lang.sel') || ls[0]);
  }
  function peCloseLangs() { S.peLangs = false; $('prof-form').className = 'prof-form show'; peFill(); Nav.focus(document.querySelector('.pe-row[data-action="pe-lang"]')); }
  function profileSave() {
    var name = $('prof-name').value.trim().slice(0, 16);
    if (!name) { toast('اكتب اسم للملف', true); Nav.focus($('prof-name')); return; }
    if (S.profEditing) { var p = profileOf(S.profEditing); p.name = name; p.c = S.profColor; p.kids = S.profKids; p.av = S.profAv; p.lang = S.profLang; }
    else {
      var id = 'p' + Date.now().toString(36);
      S.profiles.push({ id: id, name: name, c: S.profColor, kids: S.profKids, av: S.profAv, lang: S.profLang });
    }
    rawSave('profiles', S.profiles);
    if (S.profEditing === S.pid) loadProfileData();
    renderProfiles(S.profEditing ? 'edit' : 'pick');
    Nav.focus(document.querySelector('#prof-list .prof[data-pid="' + (S.profEditing || S.profiles[S.profiles.length - 1].id) + '"]') || document.querySelector('#prof-list .prof'));
  }
  function profileDelete() {
    var id = S.profEditing, p = profileOf(id);
    if (!p || S.profiles.length < 2) return;
    S.profiles = S.profiles.filter(function (x) { return x.id !== id; });
    rawSave('profiles', S.profiles);
    Object.keys(PER_PROFILE).forEach(function (k) { try { localStorage.removeItem('amira.p.' + id + '.' + k); } catch (e) {} });
    if (S.pid === id) { S.pid = S.profiles[0].id; rawSave('profile', S.pid); loadProfileData(); S.homeDirty = true; S.myDirty = true; }
    toast('انحذف ملف «' + p.name + '»');
    renderProfiles('edit');
    Nav.focus(document.querySelector('#prof-list .prof'));
  }

  var THEMES = [
    { id: 'night', name: 'ليلي', bg: '#0b0b10', ac: '#f5a524' },
    { id: 'emerald', name: 'زمرّد', bg: '#080f0d', ac: '#2fd18b' },
    { id: 'ruby', name: 'ياقوت', bg: '#10090c', ac: '#ff4d6d' },
    { id: 'ocean', name: 'محيط', bg: '#080c16', ac: '#4da3ff' },
    { id: 'violet', name: 'بنفسجي', bg: '#0d0a16', ac: '#a98bff' },
    { id: 'light', name: 'نهاري', bg: '#f2f2f6', ac: '#e8590c' }
  ];
  function applyTheme(id) {
    document.body.setAttribute('data-theme', id || 'night');
    var chips = document.querySelectorAll('.theme-chip');
    for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('active', chips[i].getAttribute('data-theme') === (id || 'night'));
  }
  function renderThemes() {
    var cur = S.settings.theme || 'night', h = '';
    THEMES.forEach(function (t) {
      h += '<div class="theme-chip focusable' + (t.id === cur ? ' active' : '') + '" data-action="theme" data-theme="' + t.id + '">' +
        '<span class="sw" style="background:' + t.bg + '"><i style="background:' + t.ac + '"></i></span>' + t.name + '</div>';
    });
    $('themes').innerHTML = h;
  }

  function fillSettings() {
    var s = S.settings;
    if (!$('themes').children.length) renderThemes();
    $('isound-btn').textContent = 'صوت بداية التطبيق: ' + (s.introSound === false ? 'متوقف' : 'مفعّل');
    $('autonext-btn').textContent = 'التشغيل التلقائي للحلقة التالية: ' + (s.autoNext === false ? 'متوقف' : 'مفعّل');
    $('acct-info').textContent = s.api ? ('الاشتراك: ' + (s.expiry ? 'ينتهي ' + new Date(s.expiry).toLocaleDateString('ar') : 'بدون تاريخ انتهاء') +
      ' · عدد الاتصالات المسموحة: ' + (s.maxConn || 1)) : '';
    renderPlaylists();
    $('lp-mode-btn').textContent = 'المعاينة المصغّرة للقنوات: ' + ({ auto: 'تلقائي لما توقف', ok: 'بس لما أكبس OK', off: 'متوقفة' })[s.lp || 'auto'];
    $('autolast-btn').textContent = 'فتح آخر قناة عند التشغيل: ' + (s.autoLast ? 'مفعّل' : 'متوقف');
    $('pin-btn').textContent = s.pin ? 'تغيير رمز القفل' : 'تعيين رمز القفل';
    $('pin-clear').style.display = s.pin ? '' : 'none';
    renderLockList();
    $('debug-btn').textContent = 'معلومات التشغيل فوق الفيديو: ' + (s.debug ? 'ظاهرة' : 'مخفية');
    $('preview-btn').textContent = 'معاينة الصورة على شريط الوقت: ' + (s.preview === false ? 'متوقفة' : s.preview === 'force' ? 'إجبارية (قد تقطع الفيديو)' : 'مفعّلة') +
      (s.api && (s.maxConn || 1) < 2 && s.preview !== false && s.preview !== 'force' && s.previewBlocked ? ' (السيرفر رفض اتصال ثاني — الوقت بس)' : '');
    // the forms are for adding a NEW list; saved lists are shown above them
    if (!S.formsTouched) { $('set-m3u').value = ''; $('set-epg').value = ''; $('set-xs').value = ''; $('set-xu').value = ''; $('set-xp').value = ''; }
  }

  function refreshLive() {
    if (document.hidden) return;
    updateCards(document.querySelector('.screen.active'));
    var hero = $('hero');
    if (hero && !closest(Nav.current(), 'hero')) {
      var tmp = document.createElement('div'); tmp.innerHTML = heroHTML(S.feat);
      hero.parentNode.replaceChild(tmp.firstChild, hero);
    }
    if (Player.isOpen() || Player.isMini()) Player.refresh();
  }

  /* ---------- screens & focus (tabs switch on focus, each tab remembers its spot) ---------- */
  function navItem(name) { return document.querySelector('.nav-item[data-screen="' + name + '"]'); }
  function firstIn(sec) {
    var all = sec.querySelectorAll('.focusable');
    for (var i = 0; i < all.length; i++) if (visible(all[i])) return all[i];
    return null;
  }

  function needsRender(name) {
    return (name === 'home' && S.homeDirty) || (S.kind[name] && S.kind[name].dirty) || (name === 'favs' && S.myDirty) ||
           (name === 'search' && !S.grids['search-grid']);
  }
  function renderScreen(name) {
    if (name === 'home' && S.homeDirty) renderHome();
    if (S.kind[name] && S.kind[name].dirty) renderBrowse(name);
    if (name === 'favs' && S.myDirty) renderMyList();
    if (name === 'search' && !S.grids['search-grid']) runSearch();
    if (name === 'settings') fillSettings();
  }
  /* build the browse tabs in the background after loading, so the first visit is instant too */
  function backgroundIndex() {
    if (!S.settings.api) return;
    ['movies', 'shows'].forEach(function (k) {
      var K = S.kind[k]; if (!K || !K.lazy || K.idxDone || K.idxBusy) return;
      K.idxLowRun = true;
      indexKind(k, function (done) { if (done) refreshNewRail(); });
    });
  }
  function prerender() {
    clearTimeout(S.bgIdxT); S.bgIdxT = setTimeout(backgroundIndex, 25000);
    clearTimeout(S.preT);
    var order = ['live', 'movies', 'shows', 'favs'];
    (function next(i) {
      if (i >= order.length) return;
      S.preT = setTimeout(function () {
        var k = order[i];
        if (S.screen !== k && !Player.isOpen()) {
          if (S.kind[k] && S.kind[k].dirty) {
            S.prerendering = true;
            try { renderBrowse(k); } finally { S.prerendering = false; }
          }
          else if (k === 'favs' && S.myDirty) renderMyList();
        }
        next(i + 1);
      }, i ? 400 : 1500);
    })(0);
  }
  /* Switch instantly; if the tab needs building, show a spinner first so it never looks frozen. */
  /* Switch instantly; if the tab needs building, show a spinner first so it never looks frozen. */
  function showScreen(name, cb) {
    clearTimeout(S.navT); S.navT = null;
    if (S.screen === name && document.querySelector('#screen-' + name + '.active')) { if (cb) cb(); return; }
    S.screen = name;
    var secs = document.querySelectorAll('.screen');
    for (var i = 0; i < secs.length; i++) secs[i].classList.toggle('active', secs[i].id === 'screen-' + name);
    var navs = document.querySelectorAll('.nav-item');
    var navName = (name === 'series' || name === 'info') ? S.prevScreen : name;
    for (var j = 0; j < navs.length; j++) navs[j].classList.toggle('active', navs[j].getAttribute('data-screen') === navName);
    if (name !== 'live' && Player.isMini()) Player.close(true);      // the channel preview belongs to the channels tab
    document.body.classList.toggle('staged', name === 'home' || name === 'info' || name === 'series');
    updBack();
    if (name === 'home') { if (S.hiItem) stageSet(S.hiItem); else if (S.feat) stageSet(S.feat); }
    clearTimeout(S.busyT);
    if (!needsRender(name)) { $('screen-busy').className = ''; renderScreen(name); if (cb) cb(); return; }
    $('screen-busy').className = 'show';
    S.busyT = setTimeout(function () {
      S.busyT = null;
      if (S.screen !== name) return;
      renderScreen(name);
      $('screen-busy').className = '';
      if (cb) cb();
    }, 30);
  }

  function enterContent() {
    var cur = Nav.current();
    function go() {
      var sec = $('screen-' + S.screen), lf = S.lastFocus[sec.id];
      Nav.focus(lf && sec.contains(lf) && visible(lf) ? lf : firstIn(sec));
    }
    if (S.navT && cur && cur.classList.contains('nav-item')) showScreen(cur.getAttribute('data-screen'), go);
    else if (S.busyT && $('screen-busy').className) setTimeout(enterContent, 60);
    else go();
  }

  function focusHome() {
    var b = document.querySelector('#hero .btn');
    Nav.focus(b || navItem('home'));
  }

  /* a name that doesn't fit in two lines slides so you can read all of it */
  var marqEl = null;
  function marquee(el) {
    if (marqEl) { marqEl.classList.remove('marq'); marqEl.style.removeProperty('--dx'); marqEl = null; }
    var n = el && el.querySelector && el.querySelector('.card-name');
    if (!n || !n.firstChild || n.scrollHeight <= n.clientHeight + 2) return;
    n.classList.add('marq');
    var over = n.firstChild.offsetWidth - n.clientWidth;
    if (over <= 4) { n.classList.remove('marq'); return; }
    n.style.setProperty('--dx', (I18N.isLtr() ? -over : over) + 'px');               // RTL text: slide right to reveal the end
    n.style.setProperty('--md', Math.max(3, over / 60) + 's');
    marqEl = n;
  }
  function schedulePreview(el) {
    clearTimeout(S.lpT);
    if (S.screen !== 'live' || (S.settings.lp || 'auto') !== 'auto') return;
    var id = el.getAttribute && el.getAttribute('data-id');
    if (!id || !(el.classList.contains('card') || el.classList.contains('g-row')) || !$('grid-live').contains(el)) return;
    S.lpT = setTimeout(function () {
      if (Nav.current() !== el || S.screen !== 'live' || Player.isOpen()) return;
      var c = S.byId[id]; if (c && !c.vod) Player.mini(c, S.grids['grid-live'] ? S.grids['grid-live'].list : groupList(c));
    }, 900);
  }
  function onFocus(el) {
    document.body.classList.toggle('nav-open', !!(el && closest(el, 'sn-me') || (el && el.classList.contains('nav-item'))));
    if (S.screen === 'home' && el && $('home-scroller').contains(el)) homeFocus(el);
    var pn = document.querySelector('.pe-name'); if (pn) pn.classList.toggle('has-focus', el && el.id === 'prof-name');
    marquee(el);
    schedulePreview(el);
    if (S.hover) {                       // pointer hover: just highlight, never switch tabs/groups
      var hs = closest(el, 'screen'); if (hs) S.lastFocus[hs.id] = el;
      return;
    }
    if (el.classList.contains('nav-item')) {
      clearTimeout(S.navT);
      var name = el.getAttribute('data-screen');
      S.navT = setTimeout(function () { showScreen(name); }, NAV_DELAY);
      return;
    }
    var sec = closest(el, 'screen');
    if (sec) S.lastFocus[sec.id] = el;
    if (el.classList.contains('group-item')) {
      clearTimeout(S.gt);
      var k = el.getAttribute('data-kind'), g = el.getAttribute('data-group');
      S.gt = setTimeout(function () { selectGroup(k, g); }, 200);
    }
    var grid = closest(el, 'grid');
    if (grid && el.hasAttribute('data-idx')) {
      var st = S.grids[grid.id];
      if (st && +el.getAttribute('data-idx') >= st.n - 12 && st.n < st.list.length) appendGrid(grid.id);
    }
  }

  function contextList(el) {
    var tr = closest(el, 'rail-track');
    if (tr) return S.lists[tr.getAttribute('data-list')];
    var g = closest(el, 'grid');
    if (g && S.grids[g.id]) return S.grids[g.id].list;
    return null;
  }
  function kindOf(ch) { return !ch.vod ? 'live' : (ch.isSeries || ch.sk ? 'shows' : 'movies'); }
  function groupList(ch) { var K = S.kind[kindOf(ch)]; return K.by[ch.group]; }

  function activate(el) {
    if (!el) return;
    if (el.tagName === 'INPUT') { el.focus(); return; }
    if (el.classList.contains('nav-item')) {
      var nm = el.getAttribute('data-screen');
      if (S.screen !== nm || S.navT) showScreen(nm);   // pointer click switches the tab; OK enters it
      else enterContent();
      return;
    }
    if (el.classList.contains('group-item')) {
      clearTimeout(S.gt);
      var k = el.getAttribute('data-kind');
      selectGroup(k, el.getAttribute('data-group'));
      var c = $('grid-' + k).querySelector('.card'); if (c) Nav.focus(c);
      return;
    }
    var act = el.getAttribute('data-action'), id = el.getAttribute('data-id');
    if (S.screen === 'live' && id && (el.classList.contains('g-row') || el.classList.contains('card')) && !act) {
      var lc = S.byId[id], lmode = S.settings.lp || 'auto', llist = S.grids['grid-live'] ? S.grids['grid-live'].list : groupList(lc);
      if (lc && !lc.vod) {
        if (lmode === 'off') { Player.open(lc, llist); return; }
        if (Player.isMini() && Player.current() === lc) { Player.expand(); return; }
        clearTimeout(S.lpT);
        Player.mini(lc, llist);
        if (lmode === 'auto') Player.expand();        // in automatic mode OK means "I want this one"
        return;
      }
    }
    if (el.classList.contains('g-row') && id) { var gc = S.byId[id]; if (gc) Player.open(gc, S.grids['grid-live'] ? S.grids['grid-live'].list : groupList(gc)); return; }
    if (!act && el.classList.contains('card') && id) {
      var ch = S.byId[id];
      if (ch && ch.isSeries) openSeries(ch.sk);
      else if (ch && ch.sk && S.series[ch.sk]) playEp(ch);
      else if (ch && ch.vod && S.screen !== 'info') openInfo(ch);
      else if (ch) Player.open(ch, contextList(el) || groupList(ch));
      return;
    }
    switch (act) {
      case 'play':
        var c2 = S.byId[id];
        if (c2 && c2.isSeries) openSeries(c2.sk);
        else if (c2 && c2.sk && S.series[c2.sk]) playEp(c2);
        else if (c2) Player.open(c2, groupList(c2));
        break;
      case 'info-play':
        var im = S.byId[id];
        if (im) { if (S.pos[im.id]) Player.resumeAt(S.pos[im.id].t); Player.open(im, groupList(im)); }   // the button already said "continue"
        break;
      case 'info-restart':
        var ir = S.byId[id]; if (ir) { delete S.pos[ir.id]; save('pos', S.pos); Player.open(ir, groupList(ir)); }
        break;
      case 'sort':
        var sk2 = el.getAttribute('data-kind'), opts = SORTS[sk2], cur4 = opts.indexOf(S.kind[sk2].sort || opts[0]);
        S.kind[sk2].sort = opts[(cur4 + 1) % opts.length];
        S.settings.sorts = S.settings.sorts || {}; S.settings.sorts[sk2] = S.kind[sk2].sort; save('settings', S.settings);
        if (S.kind[sk2].q) kindSearch(sk2); else selectGroup(sk2, S.kind[sk2].sel, true);
        break;
      case 'play-ep':
        var ep = S.byId[id]; if (ep) playEp(ep);
        break;
      case 'season':
        S.curSeason = +el.getAttribute('data-season');
        var chips = document.querySelectorAll('.season-chip');
        for (var ci = 0; ci < chips.length; ci++) chips[ci].classList.toggle('active', +chips[ci].getAttribute('data-season') === S.curSeason);
        var se2 = S.series[S.curSeries], nu2 = nextUp(se2), gh = '';
        se2.eps.forEach(function (e2) { if (e2.s === S.curSeason) gh += epCardHTML(e2, se2, nu2.id); });
        $('series-grid').innerHTML = gh;
        break;
      case 'debug':
        S.settings.debug = !S.settings.debug; save('settings', S.settings); fillSettings();
        break;
      case 'preview':   // on → force (even with 1 connection) → off → on
        var pv = S.settings.preview;
        S.settings.preview = pv === false ? true : (pv === 'force' ? false : 'force');
        if (S.settings.preview === true) S.settings.previewBlocked = false;   // turning it back on retries the 2nd connection
        save('settings', S.settings); fillSettings();
        break;
      case 'intro-sound':
        S.settings.introSound = S.settings.introSound === false; save('settings', S.settings); fillSettings();
        if (S.settings.introSound) playIntroSound();
        break;
      case 'autonext':
        S.settings.autoNext = S.settings.autoNext === false; save('settings', S.settings); fillSettings();
        break;
      case 'fav': toggleFav(id); break;
      case 'goto': showScreen(el.getAttribute('data-screen'), enterContent); break;
      case 'group':
        var kk = el.getAttribute('data-kind');
        S.kind[kk].sel = el.getAttribute('data-group'); S.kind[kk].dirty = true;
        showScreen(kk, function () { var c3 = $('grid-' + kk).querySelector('.card'); if (c3) Nav.focus(c3); });
        break;
      case 'load-m3u':
        var u = $('set-m3u').value.trim();
        if (!u) toast('أدخل رابط القائمة أولاً', true);
        else { S.settings.api = false; S.formsTouched = false; upsertPl({ type: 'm3u', m3u: u, epg: $('set-epg').value.trim() }); loadPlaylist(u, $('set-epg').value.trim()); }
        break;
      case 'load-xtream': loadXtream(); break;
      case 'load-demo':
        S.settings.m3u = ''; S.settings.epg = ''; S.settings.api = false; save('settings', S.settings);
        loadDemo(); showScreen('home'); focusHome(); toast('تم تحميل المحتوى التجريبي');
        break;
      case 'theme':
        S.settings.theme = el.getAttribute('data-theme'); save('settings', S.settings);
        applyTheme(S.settings.theme);
        break;
      case 'clear-history':
        S.recent = []; S.pos = {}; S.done = {}; save('recent', S.recent); save('pos', S.pos); save('done', S.done);
        S.homeDirty = true; renderMyList(); Nav.focus(navItem('favs')); updateCards();
        toast('تم مسح سجل المشاهدة');
        break;
      case 'pl-use': activatePl(el.getAttribute('data-pl')); break;
      case 'pl-del': deletePl(el.getAttribute('data-pl')); break;
      case 'autolast': S.settings.autoLast = !S.settings.autoLast; save('settings', S.settings); fillSettings(); break;
      case 'lp-mode':
        var LPM = ['auto', 'ok', 'off'], cm = LPM.indexOf(S.settings.lp || 'auto');
        S.settings.lp = LPM[(cm + 1) % 3]; save('settings', S.settings); fillSettings();
        if (S.settings.lp === 'off' && Player.isMini()) Player.close(true);
        break;
      case 'lp-expand': if (Player.isMini()) Player.expand(); else toast('وقّف على قناة أو اكبس عليها لتشتغل هون'); break;
      case 'guide': toggleGuide(); break;
      case 'reload-cats':
        if (S.settings.api) loadXtreamApi(true); else if (S.settings.m3u) loadPlaylist(S.settings.m3u, S.settings.epg);
        break;
      case 'reload-epg':
        if (S.settings.epg) loadEpg(S.settings.epg); else toast('لا يوجد رابط دليل برامج', true);
        break;
      case 'profiles': openProfiles(true); break;
      case 'show-hidden':
        var hk = el.getAttribute('data-kind'); S.kind[hk].showHidden = !S.kind[hk].showHidden; renderBrowse(hk, true);
        var sep = document.querySelector('#groups-' + hk + ' .group-sep.toggle'); if (sep) Nav.focus(sep);
        break;
      case 'info': if (S.byId[id]) openInfo(S.byId[id]); break;
      case 'pin-set': setPin(); break;
      case 'lock-kind': S.lockKind = el.getAttribute('data-kind'); renderLockList(); break;
      case 'lock-g': toggleLock(el.getAttribute('data-kind'), el.getAttribute('data-group')); break;
      case 'pin-clear':
        if (!S.settings.pin) { toast('ما في رمز قفل'); break; }
        askPinStrict(function () { delete S.settings.pin; S.settings.locks = {}; save('settings', S.settings); S.unlocked = false; fillSettings(); S.homeDirty = true; toast('انلغى قفل الأهالي'); });
        break;
      case 'prof-kids':
        S.profKids = !S.profKids; peFill();
        break;
      case 'pe-avatar': peOpenPicker(); break;
      case 'pe-pickav': S.profAv = +el.getAttribute('data-av'); peClosePicker(); break;
      case 'pe-lang': peOpenLangs(); break;
      case 'pe-setlang':
        S.profLang = el.getAttribute('data-lang'); peCloseLangs();
        if (!S.profEditing || S.profEditing === S.pid) applyLang(S.profLang);
        break;
      case 'pick-profile':
        var pid = el.getAttribute('data-pid');
        var curP = profileOf(S.pid);
        if (curP && curP.kids && pid !== S.pid && S.settings.pin && !S.leaveKidsOk) {   // leaving a kids profile needs the PIN
          askPinStrict(function () { S.leaveKidsOk = true; activate(el); S.leaveKidsOk = false; });
          break;
        }
        if (pid === S.pid && S.profFromApp) { document.body.classList.remove('picking'); showScreen('home'); focusHome(); }
        else switchProfile(pid);
        break;
      case 'prof-new': case 'prof-edit':
        if (S.kids && S.settings.pin && !S.leaveKidsOk) { askPinStrict(function () { S.leaveKidsOk = true; activate(el); S.leaveKidsOk = false; }); break; }
        profileForm(act === 'prof-new' ? null : el.getAttribute('data-pid')); break;
      case 'prof-manage':
        if (S.kids && S.settings.pin && !S.leaveKidsOk) { askPinStrict(function () { S.leaveKidsOk = true; activate(el); S.leaveKidsOk = false; }); break; }
        renderProfiles('edit'); Nav.focus(document.querySelector('#prof-list .prof')); break;
      case 'prof-done': renderProfiles('pick'); Nav.focus(document.querySelector('#prof-list .prof[data-pid="' + S.pid + '"]')); break;
      case 'prof-color':
        S.profColor = +el.getAttribute('data-c');
        var pcs = document.querySelectorAll('.pcol');
        for (var pi = 0; pi < pcs.length; pi++) pcs[pi].classList.toggle('sel', +pcs[pi].getAttribute('data-c') === S.profColor);
        break;
      case 'prof-save': profileSave(); break;
      case 'prof-delete':
        var dp = profileOf(S.profEditing); if (!dp) break;
        amodal('حذف ملف «' + dp.name + '»؟', 'رح تنحذف قائمته وسجل مشاهدته ومفضلته', false, [
          { label: 'حذف', primary: true, run: function () { amClose(false); profileDelete(); } },
          { label: 'إلغاء', run: function () { amClose(); } }
        ], function () { amClose(); });
        Nav.focus($('am-btns').lastChild);              // safe choice selected first
        break;
      case 'prof-cancel': renderProfiles(S.profEditing ? 'edit' : 'pick'); Nav.focus(document.querySelector('#prof-list .prof')); break;
      case 'clear':
        try { Object.keys(localStorage).forEach(function (key) { if (key.indexOf('amira.') === 0) localStorage.removeItem(key); }); } catch (e) {}
        initProfiles(); loadProfileData();
        S.settings = {}; S.favs = []; S.recent = []; S.pos = {}; S.done = {}; S.pins = {}; S.intro = {}; applyTheme('night'); renderThemes();
        loadDemo(); showScreen('home'); focusHome(); toast('تم مسح كل البيانات');
        break;
    }
  }

  function back() {
    var cur = Nav.current();
    if (S.screen === 'profiles') {
      if (S.peLangs) { peCloseLangs(); return; }
      if ($('prof-form').className.indexOf('picking-av') >= 0) { peClosePicker(); return; }
      if ($('prof-form').className.indexOf('show') >= 0) { renderProfiles(S.profEditing ? 'edit' : 'pick'); Nav.focus(document.querySelector('#prof-list .prof')); return; }
      if (S.profMode === 'edit') { renderProfiles('pick'); Nav.focus(document.querySelector('#prof-list .prof')); return; }
      if (S.profFromApp) { document.body.classList.remove('picking'); showScreen('home'); focusHome(); return; }
      if (Date.now() - S.lastBack < 2000) exitApp(); else { S.lastBack = Date.now(); toast('اضغط رجوع مرة أخرى للخروج'); }
      return;
    }
    if (S.screen === 'series' && cur && !cur.classList.contains('nav-item')) { closeSeries(); return; }
    if (S.screen === 'info' && cur && !cur.classList.contains('nav-item')) { closeInfo(); return; }
    if (cur && !cur.classList.contains('nav-item')) {
      if (S.screen === 'home' && !closest(cur, 'hero') && $('hero')) focusHome();   // jump back to top first
      else Nav.focus(navItem(S.screen));
      return;
    }
    if (S.screen !== 'home') { showScreen('home'); Nav.focus(navItem('home')); clearTimeout(S.navT); S.navT = null; return; }
    if (Date.now() - S.lastBack < 2000) exitApp();
    else { S.lastBack = Date.now(); toast('اضغط رجوع مرة أخرى للخروج'); }
  }
  function exitApp() {
    try { if (window.webOS && webOS.platformBack) { webOS.platformBack(); return; } } catch (e) {}
    window.close();
  }

  function toggleFav(id) {
    if (!id || !S.byId[id]) return;
    var i = S.favs.indexOf(id), added = i < 0;
    if (added) { S.favs.unshift(id); storeItem(S.byId[id]); } else S.favs.splice(i, 1);
    save('favs', S.favs);
    var thumbs = document.querySelectorAll('.card[data-id="' + id + '"] .card-thumb');
    for (var k = 0; k < thumbs.length; k++) {
      var star = thumbs[k].querySelector('.fav-star');
      if (added && !star) thumbs[k].insertAdjacentHTML('beforeend', '<span class="fav-star">★</span>');
      if (!added && star) star.parentNode.removeChild(star);
    }
    var hb = document.querySelector('.btn[data-action="fav"][data-id="' + id + '"]');
    if (hb) hb.textContent = added ? '★ في المفضلة' : '☆ أضف للمفضلة';
    S.homeDirty = true; S.myDirty = true;
    toast(added ? 'أُضيفت إلى المفضلة' : 'أُزيلت من المفضلة');
  }
  function addRecent(id) {
    var i = S.recent.indexOf(id); if (i >= 0) S.recent.splice(i, 1);
    S.recent.unshift(id); S.recent = S.recent.slice(0, 30);
    storeItem(S.byId[id]);
    save('recent', S.recent); S.homeDirty = true; S.myDirty = true;
  }

  /* ---------- iPhone: movies & episodes the web player can't decode (mkv…) open in the native player (VLC) ---------- */
  var NativeVod = (function () {
    var plug = null;
    function get() {
      if (plug !== null) return plug;
      var C = window.Capacitor;
      plug = (C && C.isNativePlatform && C.isNativePlatform() && C.registerPlugin) ? C.registerPlugin('AttiehPlayer') : false;
      return plug;
    }
    function wants(ch) { return !!(ch && ch.vod && !ch.isSeries && ch.url && get() && !/\.(m3u8|mp4|m4v|mov)(\?|$)/i.test(ch.url)); }
    function play(ch) {
      var p = S.pos[ch.id], it = ch.sk ? S.intro[ch.sk] : null;
      if (ch.sk) rememberEp(ch);
      addRecent(ch.id);
      get().play({
        url: ch.url, title: ch.stitle && !ch.isSeries ? ch.stitle : ch.name, subtitle: ch.type === 'series' ? epLabel(ch) : (ch.group || ''),
        start: p ? p.t : 0, introStart: it ? it.s : -1, introEnd: it ? it.e : -1, introAuto: !!(it && it.auto),
        hasNext: !!nextEp(ch), rtl: !I18N.isLtr(),
        labels: { skipIntro: I18N.t('تخطي الشارة ⏭'), next: I18N.t('الحلقة التالية'), audio: I18N.t('الصوت'), subs: I18N.t('الترجمة'),
                  off: I18N.t('بدون'), cancel: I18N.t('إلغاء'), error: I18N.t('تعذّر التشغيل. جرّب عنواناً آخر أو تأكد من الاشتراك.') }
      }).then(function (r) {
        r = r || {};
        var t = +r.position || 0, d = +r.duration || 0;
        if (d > 0) {
          if (r.ended || t > d - Math.min(60, d * 0.06)) { delete S.pos[ch.id]; S.done[ch.id] = 1; save('done', S.done); }
          else if (t >= 10) S.pos[ch.id] = { t: Math.floor(t), d: Math.floor(d) };
          save('pos', S.pos);
        }
        S.myDirty = true; S.homeDirty = true; updateCardsFor(ch);
        var nx = nextEp(ch);
        if (nx && (r.next || (r.ended && S.settings.autoNext !== false))) { setTimeout(function () { play(nx); }, 250); return; }
        if (S.screen === 'series' && ch.sk === S.curSeries) openSeries(S.curSeries, ch.id);
        else if (S.screen === 'info' && ch.id === S.curInfo) renderInfo();
        else if (S.screen === 'home') renderHome();
      }, function (e) { toast('تعذّر التشغيل: ' + ((e && e.message) || ''), true); });
    }
    function nextEp(ch) {
      var se = ch.sk && S.series[ch.sk]; if (!se || !se.eps) return null;
      return se.eps[se.eps.indexOf(ch) + 1] || null;
    }
    return { wants: wants, play: play };
  })();

  /* ---------- touch screens: drag lists with a finger, an on-screen back button ---------- */
  function initTouch() {
    if (!('ontouchstart' in window)) return;
    document.documentElement.classList.add('touch');
    var T = null;
    document.addEventListener('touchstart', function (e) {
      T = null;
      if (Player.isOpen() || S.am || e.touches.length !== 1) return;
      var t = e.touches[0], tr = closest(e.target, 'rail-track'), sc = closest(e.target, 'scroller');
      if (!sc) { var side = closest(e.target, 'groups'), wrap = closest(e.target, 'grid-wrap'); if (side) sc = side.querySelector('.scroller'); else if (wrap) sc = wrap.querySelector('.scroller'); }
      if (!sc || !closest(sc, 'screen') || !closest(sc, 'screen').classList.contains('active')) sc = mainScroller();
      T = { x: t.clientX, y: t.clientY, tr: tr, sc: sc, tx0: tr ? (tr._tx || 0) : 0, ty0: sc ? (sc._ty || 0) : 0, axis: null };
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!T) return;
      var t = e.touches[0], dx = t.clientX - T.x, dy = t.clientY - T.y;
      if (!T.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        T.axis = Math.abs(dx) > Math.abs(dy) && T.tr ? 'x' : 'y';
        if (T.tr) T.tr.style.transition = 'none';
        if (T.sc) { T.sc.style.transition = 'none'; if (T.sc.id === 'home-scroller') { var ps = T.sc.querySelectorAll('.past'); for (var i = 0; i < ps.length; i++) ps[i].classList.remove('past'); } }
      }
      e.preventDefault();
      if (T.axis === 'x') {
        var tr = T.tr, over = Math.max(0, tr.scrollWidth - tr.parentNode.clientWidth + Nav.rem(8)), rtl = !I18N.isLtr();
        var tx = Math.max(rtl ? 0 : -over, Math.min(rtl ? over : 0, T.tx0 + dx));
        tr._tx = tx; tr.style.transform = 'translate3d(' + tx + 'px,0,0)';
      } else if (T.sc) {
        var sc = T.sc, H = sc.parentNode.clientHeight, padB = Nav.rem(+(sc.getAttribute('data-pad-bottom') || 0));
        var min = Math.min(0, H - sc.scrollHeight - padB), ty = Math.max(min, Math.min(0, T.ty0 + dy));
        sc._ty = ty; sc.style.transform = 'translate3d(0,' + ty + 'px,0)';
        if (S.grids[sc.id] && ty - min < H) appendGrid(sc.id);
      }
    }, { passive: false });
    document.addEventListener('touchend', function () {
      if (T && T.axis) { S.dragEnd = Date.now(); if (T.tr) T.tr.style.transition = ''; if (T.sc) T.sc.style.transition = ''; }
      T = null;
    }, { passive: true });
    document.addEventListener('click', function (e) {          // the tap that ends a drag isn't a tap
      if (Date.now() - (S.dragEnd || 0) < 350) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    $('m-back').addEventListener('click', function (e) { e.stopPropagation(); back(); updBack(); }, true);
  }
  function updBack() {
    var f = $('prof-form'), can = S.screen === 'info' || S.screen === 'series' || (S.screen === 'profiles' && f && f.className.indexOf('show') >= 0);
    document.body.classList.toggle('can-back', !!can);
  }

  /* ---------- data loading ---------- */
  function setChannels(list, demo) {
    S.channels = list; S.byId = {}; S.kind = { live: kindState(), movies: kindState(), shows: kindState() }; S.series = {}; S.searchable = [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i], K = S.kind[kindOf(c)];
      S.byId[c.id] = tidy(c);
      var item = c;
      if (c.isSeries) {
        c.eps = c.eps || []; c.seasons = c.seasons || []; c.loaded = false;
        S.series[c.sk] = c;
      } else if (c.sk) {                       // episodes collapse into one series card
        var se = S.series[c.sk];
        if (!se) {
          se = S.series[c.sk] = { id: 'S' + M3U.hash(c.sk), isSeries: true, sk: c.sk, name: c.stitle, logo: c.logo, group: c.group, vod: true, type: 'series', eps: [], seasons: [] };
          S.byId[se.id] = se;
        } else { item = null; if (!se.logo && c.logo) se.logo = c.logo; }
        se.eps.push(c);
        if (item) item = se;
      }
      if (!item) continue;
      K.list.push(item); S.searchable.push(item);
      if (!K.by[item.group]) { K.by[item.group] = []; K.groups.push(item.group); }
      K.by[item.group].push(item);
    }
    var saved = load('eps', {});
    Object.keys(saved).forEach(function (id) { if (!S.byId[id] && S.series[saved[id].sk]) S.byId[id] = tidy(saved[id]); });
    Object.keys(S.series).forEach(function (k) {
      var se = S.series[k], seen = {};
      if (se.xseries) return;
      se.eps.forEach(function (e, idx) { e._o = idx; });
      se.eps.sort(function (a, b) { return (a.s - b.s) || (a.e - b.e) || (a._o - b._o); });
      se.eps.forEach(function (e, idx) { if (!e.e) e.e = idx + 1; if (!seen[e.s]) { seen[e.s] = 1; se.seasons.push(e.s); } });
    });
    S.demo = !!demo; S.myDirty = true; S.grids = {}; S.lastFocus = {};
    navItem('movies').classList.toggle('hidden', !S.kind.movies.list.length);
    navItem('shows').classList.toggle('hidden', !S.kind.shows.list.length);
    renderHome();
    if (S.kind[S.screen]) renderBrowse(S.screen);
    prerender();
    hideSplash();
  }

  function loadDemo() {
    var list = M3U.parse(DEMO);
    EPG.demo(list.filter(function (c) { return !c.vod; }));
    setChannels(list, true);
  }

  function loadPlaylist(url, epgUrl, silentFallback) {
    loader('جارِ تحميل المحتوى…');
    return fetchData(url).then(function (text) {
      var list = M3U.parse(text);
      if (!list.length) throw new Error('القائمة فارغة أو غير صالحة');
      S.settings.m3u = url; S.settings.epg = epgUrl || '';
      save('settings', S.settings);
      if (!save('cache', { t: Date.now(), list: list })) { try { localStorage.removeItem('amira.cache'); } catch (e) {} }
      EPG.clear();
      setChannels(list, false);
      loader(null);
      showScreen('home'); focusHome();
      var nm = S.kind.movies.list.length, ns = S.kind.shows.list.length;
      toast('تم تحميل ' + S.kind.live.list.length + ' قناة' + (nm ? ' و' + nm + ' فيلم' : '') + (ns ? ' و' + ns + ' مسلسل' : ''));
      if (epgUrl) loadEpg(epgUrl);
    }).catch(function (err) {
      loader(null); hideSplash();
      toast('تعذّر تحميل القائمة: ' + err.message, true);
      if (silentFallback) {
        var cache = load('cache', null);
        if (cache && cache.list && cache.list.length) { setChannels(cache.list, false); if (S.settings.epg) loadEpg(S.settings.epg, true); }
        else loadDemo();
        focusHome();
      }
    });
  }

  function loadXtream() {
    loginXtream($('set-xs').value, $('set-xu').value, $('set-xp').value);
  }
  function loginXtream(s, u, p) {
    s = String(s || '').trim().replace(/\/+$/, ''); u = String(u || '').trim(); p = String(p || '');
    if (!s || !u || !p) { toast('أكمل بيانات السيرفر واسم المستخدم وكلمة المرور', true); return; }
    if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
    var q = 'username=' + encodeURIComponent(u) + '&password=' + encodeURIComponent(p);
    S.settings.xs = s; S.settings.xu = u; S.settings.xp = p;
    upsertPl({ type: 'xtream', xs: s, xu: u, xp: p }); S.formsTouched = false;
    loadXtreamApi(true);
  }

  /* ---------- Xtream Codes API (player_api.php) — what IPTV apps use; works when get.php is blocked ---------- */
  function xq() { var st = S.settings; return 'username=' + encodeURIComponent(st.xu) + '&password=' + encodeURIComponent(st.xp); }
  /* Some panels block bursts of requests ("flood protection"), so API calls go out one or two at a time
     with a short gap, and the important ones (logins, category lists) jump the queue. */
  var apiQ = [[], [], []], apiBusy = 0, apiLast = 0;
  function apiNext() { for (var i = 0; i < 3; i++) if (apiQ[i].length) return apiQ[i].shift(); return null; }
  function apiPump() {
    var pending = apiQ[0].length + apiQ[1].length + apiQ[2].length;
    if (apiBusy >= 2 || !pending) return;
    if (!apiQ[0].length && !apiQ[1].length && apiBusy >= 1) return;     // background work never takes both lanes
    var wait = Math.max(0, apiLast + 90 - Date.now());
    if (wait) { clearTimeout(apiPump.t); apiPump.t = setTimeout(apiPump, wait); return; }
    var j = apiNext(); apiBusy++; apiLast = Date.now();
    fetchData(j.url).then(function (t) {
      apiBusy--; apiPump();
      try { j.ok(JSON.parse(t)); } catch (e) { j.no(new Error('رد غير متوقع من السيرفر')); }
    }, function (e) { apiBusy--; apiPump(); j.no(e); });
    apiPump();
  }
  function xapi(action, extra, urgent) {
    var url = S.settings.xs + '/player_api.php?' + xq() + (action ? '&action=' + action : '') + (extra || '');
    return new Promise(function (ok, no) {
      var j = { url: url, ok: ok, no: no };
      apiQ[urgent === 'low' ? 2 : urgent ? 0 : 1].push(j);
      apiPump();
    });
  }
  function xpath(kind, id, ext) {
    var st = S.settings;
    return st.xs + '/' + kind + '/' + encodeURIComponent(st.xu) + '/' + encodeURIComponent(st.xp) + '/' + id + '.' + ext;
  }
  /* ---------- lazy catalogue: only category names at login; each category's items when it is opened ---------- */
  var XK = {
    live:   { cats: 'get_live_categories',   items: 'get_live_streams' },
    movies: { cats: 'get_vod_categories',    items: 'get_vod_streams' },
    shows:  { cats: 'get_series_categories', items: 'get_series' }
  };
  function makeItem(k, it, i, g) {
    if (k === 'live') return { id: 'l' + it.stream_id, num: +it.num || i + 1, name: it.name || '', logo: it.stream_icon || '', group: g,
      tvgId: it.epg_channel_id || '', sid: it.stream_id, vod: false, type: 'live', url: xpath('live', it.stream_id, S.settings.liveExt || 'm3u8') };
    if (k === 'movies') return { id: 'm' + it.stream_id, num: i + 1, name: it.name || '', logo: it.stream_icon || '', group: g, tvgId: '',
      vod: true, type: 'movie', sid: it.stream_id, added: +it.added || 0, rating: parseFloat(it.rating) || 0, url: xpath('movie', it.stream_id, it.container_extension || 'mp4') };
    return { id: 'S' + it.series_id, isSeries: true, xseries: it.series_id, sk: 'x' + it.series_id, name: it.name || '',
      logo: it.cover || '', group: g, vod: true, type: 'series', plot: it.plot || '', rating: parseFloat(it.rating) || 0, added: +it.last_modified || 0,
      year: (it.releaseDate || it.release_date || '').slice(0, 4), genre: it.genre || '', eps: [], seasons: [],
      bd: (it.backdrop_path && it.backdrop_path.length && typeof it.backdrop_path[0] === 'string') ? it.backdrop_path[0] : '' };
  }
  /* provider prefixes like "AR-EG: " / "EN | " say nothing about the title — drop them from movies & series */
  var TAG_RE = /^\s*(?:[\[(|]\s*[A-Z]{2,3}(?:[-_][A-Z0-9]{1,4}){0,3}\s*[\])|]\s*[:|\-\u2013]?|[A-Z]{2,3}(?:[-_][A-Z0-9]{1,4}){0,3}\s*[:|])\s*/;
  function untag(t) { return typeof t === 'string' ? t.replace(TAG_RE, '') || t : t; }
  function tidy(o) {
    if (o && (o.vod || o.isSeries)) { o.name = untag(o.name); if (o.stitle) o.stitle = untag(o.stitle); if (o.etitle) o.etitle = untag(o.etitle); }
    return o;
  }
  function adopt(o) {
    tidy(o);                       // register a fetched item, keeping series state already in memory
    if (o.isSeries) {
      var old = S.series[o.sk];
      if (old && old.loaded) { old.name = o.name || old.name; old.logo = o.logo || old.logo; old.group = o.group; o = old; }
      else { o.eps = []; o.seasons = []; o.loaded = false; S.series[o.sk] = o; }
    }
    S.byId[o.id] = o;
    return o;
  }
  function fetchGroup(k, g, bg) {
    if (bg === undefined && S.idxLow) bg = 'low';
    var K = S.kind[k];
    if (!K.lazy || K.by[g]) return Promise.resolve(K.by[g] || []);
    if (K.loading[g]) return K.loading[g];
    var cid = K.gid[g];
    var pr = K.loading[g] = xapi(XK[k].items, cid != null ? '&category_id=' + encodeURIComponent(cid) : '', bg === 'low' ? 'low' : !(bg || S.prerendering)).then(function (arr) {
      var items = (Array.isArray(arr) ? arr : []).map(function (it, i) { return adopt(makeItem(k, it, i, g)); });
      K.by[g] = items;
      Array.prototype.push.apply(K.list, items);
      if (k !== 'live') { clearTimeout(S.newT); S.newT = setTimeout(refreshNewRail, 1500); }
      delete K.loading[g];
      return items;
    }, function (err) { delete K.loading[g]; throw err; });
    return pr;
  }
  /* a tiny queue so the home page fetches a couple of categories at a time, not everything at once */
  var fetchQ = [], fetchBusy = 0;
  function queueFetch(k, g, done) {
    fetchQ.push([k, g, done]); pump();
  }
  function pump() {
    while (fetchBusy < 2 && fetchQ.length) {
      var j = fetchQ.shift(); fetchBusy++;
      (function (j) {
        fetchGroup(j[0], j[1], true).then(function (items) { fetchBusy--; j[2](items); pump(); },
                                    function () { fetchBusy--; j[2](null); pump(); });
      })(j);
    }
  }

  function setCatalog(cats, demo) {
    S.channels = []; S.byId = {}; S.series = {}; S.searchable = []; S.searchAll = null;
    S.kind = { live: kindState(), movies: kindState(), shows: kindState() };
    fetchQ = [];
    ['live', 'movies', 'shows'].forEach(function (k) {
      var K = S.kind[k]; K.lazy = true; K.gid = {}; K.loading = {}; K.sort = (S.settings.sorts || {})[k] || 'def';
      (cats[k] || []).forEach(function (c) {
        var name = String(c.category_name || 'أخرى');
        if (K.gid[name] != null) name += ' (' + c.category_id + ')';
        K.gid[name] = c.category_id; K.groups.push(name);
      });
      var pins = pinsOf(k).filter(function (g) { return K.gid[g] != null; });
      K.sel = pins[0] || K.groups[0] || '__all';
    });
    restoreStore();
    S.demo = !!demo; S.myDirty = true; S.grids = {}; S.lastFocus = {};
    navItem('movies').classList.toggle('hidden', !S.kind.movies.groups.length);
    navItem('shows').classList.toggle('hidden', !S.kind.shows.groups.length);
    renderHome();
    if (S.kind[S.screen]) renderBrowse(S.screen);
    prerender();
    hideSplash();
  }

  /* favourites / recently watched survive restarts without loading their whole category */
  function storeItem(o) {
    if (!o || !S.settings.api) return;
    var st = load('items', {}), c = {};
    ['id', 'num', 'name', 'logo', 'group', 'tvgId', 'sid', 'vod', 'type', 'url', 'rating', 'added', 'isSeries', 'xseries', 'sk', 'stitle', 's', 'e', 'bd', 'year', 'genre'].forEach(function (f) { if (o[f] != null) c[f] = o[f]; });
    st[o.id] = c;
    var keys = Object.keys(st); if (keys.length > 400) delete st[keys[0]];
    save('items', st);
  }
  function restoreStore() {
    var st = load('items', {});
    Object.keys(st).forEach(function (id) {
      if (S.byId[id]) return;
      var o = st[id];
      tidy(o);
      if (o.isSeries) { o.eps = []; o.seasons = []; o.loaded = false; S.series[o.sk] = o; }
      S.byId[id] = o;
    });
    var saved = load('eps', {});
    Object.keys(saved).forEach(function (id) { if (!S.byId[id]) S.byId[id] = tidy(saved[id]); });
  }

  function seqCats() {
    var out = [];
    return catsOf('live').then(function (r) { out.push(r); return catsOf('movies'); })
      .then(function (r) { out.push(r); return catsOf('shows'); })
      .then(function (r) { out.push(r); return out; });
  }
  /* one category list, retried once; null means the server didn't answer (not "empty") */
  function catsOf(k) {
    function once() { return xapi(XK[k].cats, '', true).then(function (r) { if (!Array.isArray(r)) throw new Error('bad'); return r; }); }
    return once().catch(function () { return new Promise(function (res) { setTimeout(res, 2500); }).then(once); })
      .catch(function () { return null; })
      .then(function (r) {
        if (r && r.length) return r;
        // some servers return no category list even though the content exists:
        // check the items directly and, if there are any, offer one "all" category
        return xapi(XK[k].items).then(function (items) {
          if (Array.isArray(items) && items.length) {
            S.catsFallback = S.catsFallback || {}; S.catsFallback[k] = true;
            return [{ category_id: null, category_name: { live: 'كل القنوات', movies: 'كل الأفلام', shows: 'كل المسلسلات' }[k] }];
          }
          return r;          // genuinely empty ([]) or still failing (null)
        }, function () { return r; });
      });
  }
  /* quietly re-check the category lists; rebuild only if something actually changed */
  function refreshCats() {
    if (!S.settings.api || Player.isOpen()) return;
    seqCats().then(function (r) {
      var old = (load('cache', null) || {}).cats || {}, cats = {}, ok = true, changed = false;
      ['live', 'movies', 'shows'].forEach(function (k, i) {
        if (r[i] === null) { ok = false; cats[k] = old[k] || []; }
        else { cats[k] = r[i]; if ((old[k] || []).length !== r[i].length) changed = true; }
      });
      save('cache', { t: ok ? Date.now() : 0, cats: cats });
      if (changed && !Player.isOpen()) {
        var scr = S.screen;
        setCatalog(cats, false);
        if (scr !== 'home' && S.kind[scr]) showScreen(scr);
        toast('تم تحديث المحتوى');
      }
    });
  }

  function loadXtreamApi(interactive, silentFallback) {
    loader('جارِ تسجيل الدخول…');
    return xapi('', '', true).then(function (info) {
      var ui = info && info.user_info;
      if (!ui || String(ui.auth) !== '1') throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
      if (ui.status && ui.status !== 'Active') throw new Error('الاشتراك غير فعّال (' + ui.status + ')');
      var fmts = ui.allowed_output_formats || [];
      S.settings.liveExt = (fmts.length && fmts.indexOf('m3u8') < 0 && fmts.indexOf('ts') >= 0) ? 'ts' : 'm3u8';
      S.settings.expiry = ui.exp_date ? +ui.exp_date * 1000 : null;
      S.settings.maxConn = +ui.max_connections || 1;
      loader('جارِ تحميل الفئات…');
      return seqCats();
    }).then(function (r) {
      // a failed request must never wipe a section: fall back to what we had before
      var old = (load('cache', null) || {}).cats || {}, failed = [];
      var cats = {};
      ['live', 'movies', 'shows'].forEach(function (k, i) {
        if (r[i] === null) { failed.push(k); cats[k] = old[k] || []; } else cats[k] = r[i];
      });
      if (!cats.live.length && !cats.movies.length && !cats.shows.length) throw new Error('تعذّر تحميل الفئات من السيرفر');
      if (failed.length) setTimeout(function () {
        toast('تعذّر تحميل ' + failed.map(function (k) { return { live: 'القنوات', movies: 'الأفلام', shows: 'المسلسلات' }[k]; }).join(' و') + ' — رح أعيد المحاولة', true);
      }, 2500);
      S.settings.m3u = ''; S.settings.api = true; S.settings.epg = S.settings.xs + '/xmltv.php?' + xq();
      save('settings', S.settings);
      save('cache', { t: failed.length ? 0 : Date.now(), cats: cats });   // partial result: refresh again next time
      if (failed.length) setTimeout(refreshCats, 20000);
      EPG.clear();
      setCatalog(cats, false);
      loader(null);
      showScreen('home'); focusHome();
      var exp = S.settings.expiry ? ' · ينتهي ' + new Date(S.settings.expiry).toLocaleDateString('ar') : '';
      toast('تم تسجيل الدخول' + exp);
    }).catch(function (err) {
      loader(null); hideSplash();
      toast('تعذّر الدخول: ' + err.message, true);
      if (silentFallback) {
        var cache = load('cache', null);
        if (cache && cache.cats) setCatalog(cache.cats, false); else loadDemo();
        focusHome();
      }
    });
  }

  function P_OPEN() { return Player.isOpen() || Player.isMini(); }      // the channel you're watching gets its programme first
  /* fill "on now" info for live cards on screen — a couple of requests at a time */
  var epgQ = [], epgBusy = 0, epgAsked = {};
  function epgFill(list) {
    if (!S.settings.api) return;
    (list || []).forEach(function (c) { if (c && !c.vod && c.sid && !epgAsked[c.id] && !EPG.has(c)) { epgAsked[c.id] = 1; epgQ.push(c); } });
    epgPump();
  }
  function epgPump() {
    while (epgBusy < 2 && epgQ.length) {
      var c = epgQ.shift(); epgBusy++;
      (function (c) {
        shortEpg(c).then(function () { epgBusy--; updateCardsFor(c); if (S.guide) refreshGuideRow(c); epgPump(); }, function () { epgBusy--; if (S.guide) refreshGuideRow(c); epgPump(); });
      })(c);
    }
  }
  function updateCardsFor(ch) {
    var cards = document.querySelectorAll('.card[data-id="' + ch.id + '"]'), m = meta(ch);
    for (var i = 0; i < cards.length; i++) {
      var p = cards[i].querySelector('.progress');
      cards[i].querySelector('.card-now').textContent = m.sub;
      if (p) { p.className = 'progress' + (m.pct == null ? ' empty' : ''); p.firstChild.style.width = (m.pct || 0) + '%'; }
    }
  }

  /* programme info for one live channel, fetched only when it is played */
  function shortEpg(ch) {
    if (!S.settings.api || !ch.sid || EPG.has(ch)) return Promise.resolve();
    function b64(t) { try { return decodeURIComponent(escape(atob(t || ''))); } catch (e) { return t || ''; } }
    return xapi('get_short_epg', '&stream_id=' + ch.sid + '&limit=8', P_OPEN() || ch._guideNow ? true : 'low').then(function (d) {
      var l = (d && d.epg_listings) || [];
      if (!l.length) return;
      EPG.put(ch, l.map(function (x) {
        return { start: +x.start_timestamp * 1000, stop: +x.stop_timestamp * 1000, title: b64(x.title), desc: b64(x.description) };
      }));
    }, function () {});
  }

  /* episodes of an Xtream series are fetched when the series is opened */
  function ensureSeries(se) {
    if (!se.xseries || se.loaded) return Promise.resolve(se);
    loader('جارِ تحميل الحلقات…');
    return xapi('get_series_info', '&series_id=' + se.xseries, true).then(function (d) {
      var eps = [], seasons = d && d.episodes ? d.episodes : {};
      Object.keys(seasons).forEach(function (sn) {
        (seasons[sn] || []).forEach(function (ep) {
          var e = S.byId['e' + ep.id] || {};
          e.id = 'e' + ep.id; e.sk = se.sk; e.stitle = se.name; e.vod = true; e.type = 'series';
          e.s = +(ep.season || sn) || 1; e.e = +ep.episode_num || 0; e.group = se.group;
          e.name = se.name + ' S' + pad2(e.s) + ' E' + pad2(e.e); e.etitle = untag(ep.title || '');
          e.logo = (ep.info && ep.info.movie_image) || se.logo;
          e.url = xpath('series', ep.id, ep.container_extension || 'mp4');
          S.byId[e.id] = e; eps.push(e);
        });
      });
      if (d && d.info) {
        var inf = d.info;
        se.plot = inf.plot || se.plot; if (!se.logo) se.logo = inf.cover || '';
        se.cast = inf.cast || ''; se.director = inf.director || ''; se.genre = inf.genre || se.genre;
        se.year = (inf.releaseDate || inf.release_date || se.year || '').slice(0, 4);
        se.rating = parseFloat(inf.rating) || se.rating;
        var bd = inf.backdrop_path; se.backdrop = (Array.isArray(bd) ? bd[0] : bd) || '';
      }
      eps.sort(function (a, b) { return (a.s - b.s) || (a.e - b.e); });
      se.eps = eps; se.seasons = [];
      var seen = {};
      eps.forEach(function (e, i) { if (!e.e) e.e = i + 1; if (!seen[e.s]) { seen[e.s] = 1; se.seasons.push(e.s); } });
      se.loaded = true; loader(null);
      if (!eps.length) throw new Error('لا توجد حلقات');
      return se;
    }).catch(function (err) { loader(null); toast('تعذّر تحميل الحلقات: ' + err.message, true); throw err; });
  }
  /* episodes played from "continue watching" survive restarts */
  function rememberEp(ch) {
    if (!ch || !ch.sk || ch.sk.charAt(0) !== 'x') return;
    var m = load('eps', {});
    m[ch.id] = { id: ch.id, sk: ch.sk, stitle: ch.stitle, s: ch.s, e: ch.e, name: ch.name, logo: ch.logo, group: ch.group, url: ch.url, vod: true, type: 'series' };
    var k = Object.keys(m); if (k.length > 300) delete m[k[0]];
    save('eps', m);
  }

  function loadEpg(url, quiet) {
    if (!quiet) toast('جارِ تحميل دليل البرامج…');
    fetchData(url, true).then(function (buf) {
      var bytes = new Uint8Array(buf);
      if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
        if (!window.pako) throw new Error('ملف مضغوط غير مدعوم');
        bytes = pako.ungzip(bytes);
      }
      var n = EPG.parse(new TextDecoder('utf-8').decode(bytes));
      refreshLive();
      if (!quiet) toast('دليل البرامج جاهز (' + n + ' قناة)');
    }).catch(function (err) {
      if (!quiet) toast('تعذّر تحميل دليل البرامج: ' + err.message, true);
    });
  }

  /* ---------- player ---------- */
  var Player = (function () {
    var P = {
      open: false, ch: null, list: [], hls: null, usingJs: false, triedAlt: false, live: true,
      osdT: null, numBuf: '', numT: null,
      seekTarget: null, seekT: null, seekReps: 0, lastSeekKey: 0, lastSave: 0,
      eps: null, upnext: false, upT: null, upShown: false, panel: false, sel: 0
    };
    var video;

    function isWebOS() { return !!(window.PalmSystem || /Web0S|webOS/i.test(navigator.userAgent)) || IS_IOS; }   // (iPhone: its own HLS player is best too)
    function isHlsUrl(u) { return /\.m3u8($|\?)/i.test(u) || /output=(m3u8|hls)/i.test(u); }
    function hlsJsOk() { return !!(window.Hls && Hls.isSupported()); }

    /* playback mode: 'vod' (finite, seekable), 'dvr' (live with a rewind window) or 'live' */
    /* movies/episodes are always treated as seekable files, even when the TV reports the length late */
    function mode() {
      if (P.ch && P.ch.vod) return 'vod';
      var d = video.duration;
      if (!P.live && isFinite(d) && d > 0) return 'vod';
      var s = video.seekable;
      if (s && s.length && s.end(s.length - 1) - s.start(0) > 30) return 'dvr';
      return 'live';
    }
    function vodLen() {
      var d = video.duration;
      if (isFinite(d) && d > 0) return d;
      var s = video.seekable;
      if (s && s.length && s.end(s.length - 1) > 0) return s.end(s.length - 1);
      var p = P.ch && S.pos[P.ch.id];
      return p && p.d ? p.d : 0;
    }
    function range() {
      if (mode() === 'vod') return [0, vodLen()];
      var s = video.seekable;
      return s && s.length ? [s.start(0), s.end(s.length - 1)] : [0, 0];
    }

    function msg(state, text) {
      var m = $('player-msg');
      if (!state) { m.className = 'player-msg'; return; }
      m.className = 'player-msg show' + (state === 'error' ? ' error' : '');
      $('msg-text').textContent = text || '';
    }
    function stop() {
      cancelSeek();
      if (P.freePreview) P.freePreview();
      if (P.hls) { try { P.hls.destroy(); } catch (e) {} P.hls = null; }
      video.removeAttribute('src');
      try { video.load(); } catch (e) {}
      $('pause-icon').className = 'pause-icon';
    }
    function tryPlay() { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    function start(url, useJs) {
      P.usingJs = useJs;
      if (useJs) {
        var h = P.hls = new Hls({ enableWorker: true, maxBufferLength: 30, backBufferLength: 60 });
        h.on(Hls.Events.ERROR, function (ev, d) {
          if (!d.fatal) return;
          if (d.type === Hls.ErrorTypes.MEDIA_ERROR) h.recoverMediaError(); else fail();
        });
        h.on(Hls.Events.LEVEL_LOADED, function (ev, d) { P.live = !!(d.details && d.details.live); fill(); });
        h.on(Hls.Events.MANIFEST_PARSED, tryPlay);
        h.loadSource(url); h.attachMedia(video);
      } else {
        video.src = url; tryPlay();
      }
    }
    function fail() {
      var u = P.ch.url;
      if (!P.triedAlt) {
        P.triedAlt = true;
        var alt = !P.usingJs;
        if (!alt || (hlsJsOk() && isHlsUrl(u))) { stop(); start(u, alt); return; }
      }
      msg('error', 'تعذّر التشغيل. جرّب عنواناً آخر أو تأكد من الاشتراك.');
    }

    function play(ch) {
      if (P.ch && P.ch !== ch) savePos();
      if (P.ch && !P.ch.vod && P.ch !== ch && !ch.vod) P.prevLive = P.ch;
      try { if (P.rate && ch.vod) video.playbackRate = P.rate; } catch (e) {}
      var keepAuto = P.autoResumeTo;
      P.scrub = null;
      hideUpNext(); closePanel(); closeDialog(); P.upShown = false; P.resumed = false; P.resumeAsk = false;
      P.autoResumeTo = keepAuto;
      P.introMark = null; P.introSkipped = false; $('skipintro').className = 'skipintro';
      P.ch = ch; P.triedAlt = false; P.live = !ch.vod;
      if (P.mini) { P.list = P.list || [ch]; }
      P.eps = ch.sk && S.series[ch.sk] ? S.series[ch.sk].eps : null;
      if (!P.mini) rememberEp(ch);
      if (!ch.vod) shortEpg(ch).then(function () { if (P.ch === ch) fill(); });
      if (P.eps && !S.intro[ch.sk] && !S.settings.introHint) {
        S.settings.introHint = 1; save('settings', S.settings);
        setTimeout(function () { if (P.ch === ch) toast('لتخطي الشارة: حرّك المؤشر واكبس «✂ الشارة» تحت الفيديو، أو الزر ' + KD.y, false, true); }, 4000);
      }
      if (!P.mini) addRecent(ch.id);
      stop(); msg('loading', 'جارِ التحميل…');
      fill(); showOsd();
      start(ch.url, isHlsUrl(ch.url) && hlsJsOk() && !isWebOS());
    }

    /* ---- resume position for movies/episodes ---- */
    function savePos() {
      if (!P.ch || !video || !P.ch.vod || P.resumeAsk || P.scrub != null) return;
      var t = video.currentTime, d = vodLen();
      if (!(d > 0) || !isFinite(d) || t < 10) return;
      if (t > d - Math.min(60, d * 0.06)) { delete S.pos[P.ch.id]; markDone(); }
      else S.pos[P.ch.id] = { t: Math.floor(t), d: Math.floor(d) };
      var keys = Object.keys(S.pos);
      if (keys.length > 200) delete S.pos[keys[0]];
      save('pos', S.pos);
    }

    /* ---- small modal inside the player: exit confirm and resume prompt ---- */
    function dialog(title, sub, btns, onBack) {
      P.dlg = { btns: btns, sel: 0, onBack: onBack };
      $('pdialog-title').textContent = title;
      $('pdialog-sub').innerHTML = sub || '';
      var h = '';
      btns.forEach(function (b, i) { h += '<div class="pbtn' + (b.primary ? ' primary' : '') + (i === 0 ? ' sel' : '') + '" data-i="' + i + '">' + esc(b.label) + '</div>'; });
      $('pdialog-btns').innerHTML = h;
      $('pdialog').className = 'pdialog show';
      clearTimeout(P.osdT); $('osd').className = 'osd hidden';
    }
    function closeDialog() { P.dlg = null; $('pdialog').className = 'pdialog'; }
    function dlgSelect(i) {
      var kids = $('pdialog-btns').children;
      for (var k = 0; k < kids.length; k++) kids[k].classList.toggle('sel', k === i);
      P.dlg.sel = i;
    }
    function dlgRun(i) { var b = P.dlg.btns[i]; closeDialog(); b.run(); }
    function dialogKey(k) {
      var d = P.dlg, n = d.btns.length;
      k = LR(k);
      if (k === KEY.LEFT) dlgSelect(Math.min(n - 1, d.sel + 1));          // RTL: left = next button
      else if (k === KEY.RIGHT) dlgSelect(Math.max(0, d.sel - 1));
      else if (k === KEY.ENTER) dlgRun(d.sel);
      else if (k === KEY.BACK || k === KEY.BACKSPACE || k === KEY.ESC) { var f = d.onBack; closeDialog(); if (f) f(); }
      return true;
    }
    function askExit() {
      var wasPaused = video.paused;
      video.pause();
      var sub = '';
      var L = vodLen();
      if (P.ch.vod && L > 0) {
        savePos();
        sub = 'توقفت عند ' + dur(video.currentTime) + ' من ' + dur(L) + ' — بتقدر تكمل من نفس المكان لاحقاً' +
          '<div class="progress"><i style="width:' + (video.currentTime / L * 100) + '%"></i></div>';
      }
      function resume() { if (!wasPaused) tryPlay(); showOsd(); }
      dialog('بدك تطلع من المشاهدة؟', sub + '<div style="margin-top:.8rem;opacity:.7">اضغط رجوع مرة ثانية للخروج مباشرة</div>', [
        { label: 'متابعة المشاهدة', primary: true, run: resume },
        { label: 'خروج', run: close }
      ], resume);
      P.dlg.isExit = true;
    }
    function askResume(p) {
      P.resumeAsk = true;
      video.pause();
      dialog('تابع من حيث توقفت؟', 'وصلت إلى ' + dur(p.t) + ' من ' + dur(p.d) +
        '<div class="progress"><i style="width:' + (p.t / p.d * 100) + '%"></i></div>', [
        { label: '▶ تابع من ' + dur(p.t), primary: true, run: function () { P.resumeAsk = false; seekTo(p.t); } },
        { label: 'من البداية', run: function () { P.resumeAsk = false; seekTo(0); } }
      ], function () { P.resumeAsk = false; seekTo(p.t); });
    }
    /* Seeking on the TV's own player (mkv files behind a redirect) is slow: it can take several seconds and
       currentTime keeps the old value until it finishes. So: wait until the player can play, set the time once,
       and judge the result only on the 'seeked' event — never by a short timer, and never reload the file. */
    function seekTo(t) {
      var ch = P.ch, keepPaused = video.paused && P.seekKeepPaused, tries = 0;
      P.lastSeek = { want: Math.round(t), res: 'جارٍ…' };
      clearTimeout(P.seekChk);
      if (P.seekOff) { video.removeEventListener('seeked', P.seekOff); P.seekOff = null; }
      if (video.readyState < 1) {                       // no metadata yet: do it as soon as the player is ready
        P.lastSeek.res = 'بانتظار جاهزية المشغّل';
        var ready = function () { video.removeEventListener('loadedmetadata', ready); video.removeEventListener('canplay', ready); if (P.ch === ch) seekTo(t); };
        video.addEventListener('loadedmetadata', ready); video.addEventListener('canplay', ready);
        return;
      }
      function onSeeked() {
        if (P.ch !== ch) return;
        if (Math.abs(video.currentTime - t) < 8) {
          P.lastSeek.res = 'تم (' + dur(video.currentTime) + ')';
          video.removeEventListener('seeked', onSeeked); P.seekOff = null; clearTimeout(P.seekChk);
        } else if (++tries < 3) { P.lastSeek.res = 'إعادة محاولة ' + tries; set(); }
        else { P.lastSeek.res = 'رفض المشغّل (' + dur(video.currentTime) + ')'; video.removeEventListener('seeked', onSeeked); P.seekOff = null; }
      }
      function set() {
        try { video.currentTime = t; } catch (e) { P.lastSeek.err = String(e && e.message || e); }
        if (!keepPaused) tryPlay();
        clearTimeout(P.seekChk);
        P.seekChk = setTimeout(function () {             // safety net: no 'seeked' at all within 15s
          if (P.ch !== ch || !P.seekOff) return;
          if (!video.seeking && Math.abs(video.currentTime - t) > 8 && ++tries < 3) set();
          else if (!video.seeking) { P.lastSeek.res = Math.abs(video.currentTime - t) < 8 ? 'تم' : 'لا استجابة'; }
        }, 15000);
      }
      P.seekOff = onSeeked;
      video.addEventListener('seeked', onSeeked);
      set(); showOsd();
    }

    /* ---- skip intro: mark it once per series, then every episode gets a "skip" button (or auto-skip) ---- */
    function introOf() { return P.ch && P.ch.sk ? S.intro[P.ch.sk] : null; }
    function saveIntro(v) {
      if (v) S.intro[P.ch.sk] = v; else delete S.intro[P.ch.sk];
      save('intro', S.intro);
    }
    function introButton() {
      if (!P.eps) return;
      var it = introOf();
      if (P.introMark != null) {                     // second press: end of the intro
        var a = P.introMark, b = video.currentTime;
        P.introMark = null;
        if (b - a < 5) { toast('الشارة قصيرة جداً، جرّب مرة ثانية', true); renderCtrls(mode()); return; }
        var v = { s: Math.max(0, Math.floor(a)), e: Math.floor(b), auto: false };
        dialog('تم تحديد الشارة: ' + dur(v.s) + ' ← ' + dur(v.e), 'رح تنطبق على كل حلقات «' + (P.ch.stitle || '') + '»', [
          { label: '⚡ تخطّي تلقائي بكل الحلقات', primary: true, run: function () { v.auto = true; saveIntro(v); toast('تم — الشارة رح تتخطّى تلقائياً بكل الحلقات'); tryPlay(); } },
          { label: '⏭ زر «تخطي الشارة» بس', run: function () { saveIntro(v); toast('تم — رح يطلعلك زر تخطي الشارة'); tryPlay(); } }
        ], function () { v.auto = true; saveIntro(v); tryPlay(); });
        renderCtrls(mode());
        return;
      }
      if (it) {
        video.pause();
        dialog('شارة هالمسلسل محددة', dur(it.s) + ' ← ' + dur(it.e) + (it.auto ? ' · تخطّي تلقائي' : ' · زر تخطي'), [
          { label: 'تعديل', primary: true, run: function () { saveIntro(null); startMark(); } },
          { label: it.auto ? 'زر بدل التلقائي' : 'خلّيها تلقائي', run: function () { it.auto = !it.auto; saveIntro(it); tryPlay(); } },
          { label: 'مسح', run: function () { saveIntro(null); toast('انمسحت الشارة'); tryPlay(); } }
        ], function () { tryPlay(); });
        return;
      }
      startMark();
    }
    function startMark() {
      P.introMark = video.currentTime;
      tryPlay(); showOsd(); renderCtrls(mode());
      toast('حدّدت بداية الشارة عند ' + dur(P.introMark) + ' — اضغط مرة ثانية لما تخلص (' + KD.y + ' أو الزر)', false, true);
    }
    function skipIntro() {
      var it = introOf(); if (!it) return;
      $('skipintro').className = 'skipintro';
      seekTo(it.e); P.introSkipped = true;
    }
    function checkIntro() {
      var it = introOf(), el = $('skipintro');
      if (!it || P.introMark != null || P.dlg || P.seekTarget != null || video.seeking || P.seekOff || P.scrub != null) { if (el.className !== 'skipintro') el.className = 'skipintro'; return; }
      var t = video.currentTime, inIntro = t >= it.s - 0.5 && t < it.e - 2;
      if (inIntro && it.auto && !P.introSkipped) { P.introSkipped = true; toast('⏭ تم تخطي الشارة'); seekTo(it.e); return; }
      var show = inIntro && !it.auto;
      el.className = 'skipintro' + (show ? ' show' : '');
      if (!inIntro && t > it.e) P.introSkipped = false;
    }

    /* playback info overlay (blue key or D) — helps diagnose what the TV's player supports */
    function debugTick() {
      var el = $('pdebug'); if (!el || !P.dbg) return;
      function rg(r) { var o = []; for (var i = 0; r && i < r.length; i++) o.push(Math.round(r.start(i)) + '–' + Math.round(r.end(i))); return o.join(', ') || '—'; }
      var it = introOf(), ls = P.lastSeek || {};
      el.innerHTML = [
        'الوضع: ' + mode() + ' · المشغّل: ' + (P.usingJs ? 'hls.js' : 'الشاشة'),
        'المدة: ' + (isFinite(video.duration) ? Math.round(video.duration) : String(video.duration)) + ' · الوقت: ' + Math.round(video.currentTime),
        'قابل للتقديم: ' + rg(video.seekable) + ' · محمّل: ' + rg(video.buffered),
        'readyState ' + video.readyState + ' · network ' + video.networkState + (video.error ? ' · خطأ ' + video.error.code : ''),
        'آخر تقديم: ' + (ls.want != null ? ls.want + ' ← ' + ls.res + (ls.err ? ' (' + ls.err + ')' : '') : '—'),
        'الشارة: ' + (it ? it.s + '–' + it.e + (it.auto ? ' تلقائي' : ' زر') : (P.eps ? 'غير محددة' : 'ليس مسلسل')),
        'المعاينة: ' + (S.settings.preview === false ? 'متوقفة' : (S.settings.previewBlocked && S.settings.preview !== 'force' ? 'وقت بس (السيرفر رفض اتصال ثاني)' : 'صورة (اتصال ثاني)' + ($('prev-vid').getAttribute('src') ? ' · مفتوح' : ''))) + ' · اتصالات: ' + (S.settings.maxConn || '?'),
        'الرابط: …' + esc(String(P.ch && P.ch.url || '').replace(/\/\/[^/]+\/(\w+)\/[^/]+\/[^/]+\//, '//…/$1/…/').slice(-38))
      ].join('<br>');
    }
    function toggleDebug() {
      P.dbg = !P.dbg;
      $('pdebug').className = P.dbg ? 'show' : '';
      clearInterval(P.dbgT);
      if (P.dbg) { debugTick(); P.dbgT = setInterval(debugTick, 1000); }
    }

    /* ---- previous channel (like the TV's "back" channel button) ---- */
    function prevChannel() {
      var pc = P.prevLive;
      if (!pc || pc === P.ch) { toast('ما في قناة سابقة'); return; }
      if (P.list.indexOf(pc) < 0) P.list = [pc].concat(P.list);
      play(pc); showOsd();
    }

    /* ---- options panel: audio, subtitles, subtitle size, speed, sleep timer ---- */
    var SPEEDS = [0.75, 1, 1.25, 1.5, 2], SLEEPS = [0, 15, 30, 60, 90, 120], CUES = [['صغير', '1.3rem'], ['متوسط', '1.6rem'], ['كبير', '2.1rem'], ['كبير جداً', '2.7rem']];
    function trackList(list) { var a = []; if (!list) return a; for (var i = 0; i < list.length; i++) a.push(list[i]); return a; }
    function tName(t, i, kind) {
      var n = (t.label || '').trim(), l = (t.language || '').trim();
      var LN = { ar: 'عربي', ara: 'عربي', en: 'إنجليزي', eng: 'إنجليزي', fr: 'فرنسي', fre: 'فرنسي', fra: 'فرنسي', tr: 'تركي', tur: 'تركي', es: 'إسباني', de: 'ألماني', hi: 'هندي' };
      return n || LN[l.toLowerCase()] || l || (kind + ' ' + (i + 1));
    }
    function optRows() {
      var rows = [], m = mode();
      var at = trackList(video.audioTracks);
      rows.push({ id: 'audio', label: 'الصوت', opts: at.length > 1 ? at.map(function (t, i) { return { t: tName(t, i, 'مسار'), on: t.enabled, run: function () { at.forEach(function (x, j) { x.enabled = j === i; }); } }; })
        : [{ t: at.length === 1 ? tName(at[0], 0, 'مسار') : 'مسار واحد', on: true, na: true, run: function () {} }] });
      var tt = trackList(video.textTracks).filter(function (t) { return t.kind === 'subtitles' || t.kind === 'captions'; });
      var subs = [{ t: 'بدون', on: !tt.some(function (t) { return t.mode === 'showing'; }), run: function () { tt.forEach(function (x) { x.mode = 'disabled'; }); } }];
      tt.forEach(function (t, i) { subs.push({ t: tName(t, i, 'ترجمة'), on: t.mode === 'showing', run: function () { tt.forEach(function (x, j) { x.mode = j === i ? 'showing' : 'disabled'; }); S.settings.subLang = t.language || ''; save('settings', S.settings); } }); });
      if (!tt.length) subs = [{ t: 'ما في ترجمة بالملف', on: true, na: true, run: function () {} }];
      rows.push({ id: 'subs', label: 'الترجمة', opts: subs });
      var cue = S.settings.cue == null ? 1 : S.settings.cue;
      rows.push({ id: 'cue', label: 'حجم الترجمة', opts: CUES.map(function (c, i) { return { t: c[0], on: i === cue, run: function () { S.settings.cue = i; save('settings', S.settings); applyCue(); } }; }) });
      if (m === 'vod') rows.push({ id: 'speed', label: 'سرعة التشغيل', opts: SPEEDS.map(function (v) { return { t: v === 1 ? 'عادي' : v + '×', on: Math.abs(video.playbackRate - v) < .01, run: function () { video.playbackRate = v; P.rate = v; } }; }) });
      var left = P.sleepAt ? Math.max(1, Math.round((P.sleepAt - Date.now()) / 60000)) : 0;
      rows.push({ id: 'sleep', label: 'مؤقت النوم' + (left ? ' — باقي ' + left + ' د' : ''), opts: SLEEPS.map(function (v) {
        return { t: v ? v + ' د' : 'إيقاف', on: v ? (P.sleepMin === v && !!P.sleepAt) : !P.sleepAt, run: function () { setSleep(v); } };
      }) });
      return rows;
    }
    function applyCue() { var c = CUES[S.settings.cue == null ? 1 : S.settings.cue]; document.documentElement.style.setProperty('--cue', c[1]); }
    function drawOpts() {
      var rows = P.optRows = optRows(), h = '';
      if (P.optR >= rows.length) P.optR = rows.length - 1;
      rows.forEach(function (r, ri) {
        if (P.optR === ri && P.optC == null) P.optC = Math.max(0, r.opts.map(function (o) { return o.on; }).indexOf(true));
        h += '<div class="prow' + (ri === P.optR ? ' cur' : '') + '"><div class="prow-label">' + esc(r.label) + '</div><div class="prow-opts">';
        r.opts.forEach(function (o, oi) {
          h += '<div class="popt' + (o.on ? ' on' : '') + (o.na ? ' na' : '') + (ri === P.optR && oi === P.optC ? ' sel' : '') + '" data-r="' + ri + '" data-o="' + oi + '">' + esc(o.t) + '</div>';
        });
        h += '</div></div>';
      });
      $('popts-rows').innerHTML = h;
    }
    function openOpts() {
      P.opts = true; P.optR = 0; P.optC = null;
      clearTimeout(P.osdT); $('osd').className = 'osd hidden';
      drawOpts(); $('popts').className = 'popts show';
    }
    function closeOpts() { P.opts = false; $('popts').className = 'popts'; showOsd(); }
    function optsKey(k) {
      var rows = P.optRows || [];
      if (k === KEY.UP) { if (P.optR > 0) { P.optR--; P.optC = null; drawOpts(); } }
      else if (k === KEY.DOWN) { if (P.optR < rows.length - 1) { P.optR++; P.optC = null; drawOpts(); } }
      else if (LR(k) === KEY.LEFT) { var n = rows[P.optR].opts.length; if (P.optC < n - 1) { P.optC++; drawOpts(); } }
      else if (LR(k) === KEY.RIGHT) { if (P.optC > 0) { P.optC--; drawOpts(); } }
      else if (k === KEY.ENTER) { var o = rows[P.optR].opts[P.optC]; if (o && !o.na) { o.run(); setTimeout(drawOpts, 60); } }
      else if (k === KEY.BACK || k === KEY.BACKSPACE || k === KEY.ESC) closeOpts();
      return true;
    }
    /* sleep timer: warns a minute before, then stops and leaves the app — any key cancels the countdown */
    function setSleep(min) {
      clearInterval(P.sleepT); P.sleepAt = 0; P.sleepMin = min; $('sleep-note').className = 'sleep-note';
      if (!min) { toast('انلغى مؤقت النوم'); return; }
      P.sleepAt = Date.now() + min * 60000;
      toast('😴 رح يطفي بعد ' + min + ' دقيقة');
      P.sleepT = setInterval(function () {
        var left = P.sleepAt - Date.now(), note = $('sleep-note');
        if (left <= 60000 && left > 0) { note.textContent = '😴 رح يطفي بعد ' + Math.ceil(left / 1000) + ' ث — اضغط أي زر للإلغاء'; note.className = 'sleep-note show'; }
        if (left <= 0) {
          clearInterval(P.sleepT); P.sleepAt = 0; note.className = 'sleep-note';
          if (P.open) close();
          exitApp();
        }
      }, 1000);
    }
    function sleepNudge() {           // a key press during the final minute cancels the timer
      if (P.sleepAt && P.sleepAt - Date.now() <= 60000) { setSleep(0); return true; }
      return false;
    }

    function markDone() {
      if (!P.ch) return;
      S.done[P.ch.id] = 1;
      var keys = Object.keys(S.done); if (keys.length > 3000) delete S.done[keys[0]];
      save('done', S.done);
    }

    /* ---- episodes: next / previous / up-next card / episodes strip ---- */
    function epAt(d) {
      if (!P.eps) return null;
      return P.eps[P.eps.indexOf(P.ch) + d] || null;
    }
    function goEp(d) {
      var e = epAt(d);
      if (e) { savePos(); play(e); toast('▶ ' + epLabel(e)); }
      else toast(d > 0 ? 'هذه آخر حلقة متوفرة' : 'هذه أول حلقة');
    }
    function showUpNext(countdown) {
      var nx = epAt(1); if (!nx) return;
      var se = S.series[nx.sk];
      P.upnext = true;
      $('upnext-thumb').setAttribute('style', bg(se));
      $('upnext-thumb').innerHTML = (se.logo ? '<img src="' + esc(se.logo) + '" onerror="this.style.display=\'none\'">' : '') + '<span>' + nx.e + '</span>';
      $('upnext-title').textContent = epLabel(nx);
      $('upnext-hint').textContent = countdown ? 'OK للتشغيل الآن · رجوع للإلغاء' : 'اضغط OK للانتقال · CH+ في أي وقت';
      clearInterval(P.upT);
      var n = countdown, c = $('upnext-count');
      c.innerHTML = countdown ? '<i>' + n + '</i>' : '';
      if (countdown) P.upT = setInterval(function () {
        n--; if (n <= 0) { clearInterval(P.upT); goEp(1); return; }
        c.innerHTML = '<i>' + n + '</i>';
      }, 1000);
      $('upnext').className = 'upnext show';
    }
    function hideUpNext() {
      clearInterval(P.upT); P.upnext = false;
      if ($('upnext')) $('upnext').className = 'upnext';
    }
    function remPx(n) { return n * parseFloat(getComputedStyle(document.documentElement).fontSize); }
    function scrollPanel() {
      var strip = $('ep-strip'), el = strip.children[P.sel]; if (!el) return;
      var vp = strip.parentNode, pad = remPx(4), W = vp.clientWidth, tx = strip._tx || 0;
      var x = strip.offsetLeft + el.offsetLeft + tx, w = el.offsetWidth;
      if (x < pad) tx += pad - x; else if (x + w > W - pad) tx -= (x + w) - (W - pad);
      if (tx < 0) tx = 0;
      strip._tx = tx; strip.style.transform = 'translate3d(' + tx + 'px,0,0)';
    }
    function openPanel() {
      if (!P.eps) return;
      var se = S.series[P.ch.sk], ci = P.eps.indexOf(P.ch), h = '';
      P.sel = Math.max(0, ci);
      P.eps.forEach(function (e, i) {
        var p = S.pos[e.id], done = S.done[e.id];
        h += '<div class="ep-mini' + (i === ci ? ' cur' : '') + (i === P.sel ? ' sel' : '') + '">' +
          '<div class="t" style="' + bg(se) + '">' + (se.logo ? '<img src="' + esc(se.logo) + '" onerror="this.style.display=\'none\'">' : '') + '<span>' + e.e + '</span></div>' +
          '<div class="n">' + (i === ci ? '▶ ' : (done ? '✓ ' : '')) + esc(epLabel(e)) + '</div>' +
          '<div class="progress' + (p ? '' : ' empty') + '"><i style="width:' + (p ? p.t / p.d * 100 : 0) + '%"></i></div></div>';
      });
      var strip = $('ep-strip'); strip.innerHTML = h; strip._tx = 0; strip.style.transform = '';
      $('ep-panel-title').innerHTML = esc(se.name) + '<small>' + P.eps.length + ' حلقة · ◀▶ للتنقل · OK للتشغيل · ▲ للإغلاق</small>';
      P.panel = true; $('ep-panel').className = 'ep-panel show';
      clearTimeout(P.osdT); $('osd').className = 'osd hidden';
      scrollPanel();
    }
    function closePanel() {
      P.panel = false;
      if ($('ep-panel')) $('ep-panel').className = 'ep-panel';
    }
    function movePanel(d) {
      var kids = $('ep-strip').children, n = Math.max(0, Math.min(kids.length - 1, P.sel + d));
      if (n === P.sel) return;
      kids[P.sel].classList.remove('sel'); kids[n].classList.add('sel'); P.sel = n;
      scrollPanel();
    }
    function panelKey(k) {
      switch (k) {
        case KEY.LEFT: movePanel(I18N.isLtr() ? -1 : 1); break;
        case KEY.RIGHT: movePanel(I18N.isLtr() ? 1 : -1); break;
        case KEY.ENTER: var e = P.eps[P.sel]; closePanel(); if (e !== P.ch) play(e); else showOsd(); break;
        case KEY.UP: case KEY.BACK: case KEY.BACKSPACE: case KEY.ESC: closePanel(); showOsd(); break;
        case KEY.CHUP: closePanel(); goEp(1); break;
        case KEY.CHDOWN: closePanel(); goEp(-1); break;
      }
      return true;
    }

    /* ---- seeking: presses accumulate into one target, committed once you pause pressing ---- */
    function seekBy(dir, fixed) {
      var m = mode();
      if (m === 'live') { showOsd(); toast('هذا البث لا يدعم التقديم والترجيع'); return; }
      var now = Date.now();
      P.seekReps = now - P.lastSeekKey < 700 ? P.seekReps + 1 : 0;
      P.lastSeekKey = now;
      var step = fixed || (P.seekReps < 6 ? 10 : P.seekReps < 14 ? 30 : P.seekReps < 24 ? 60 : 120);
      var r = range(), base = P.seekTarget != null ? P.seekTarget : (P.seekOff && P.lastSeek ? P.lastSeek.want : video.currentTime);
      P.seekTarget = Math.max(r[0], Math.min(r[1] - 2, base + dir * step));
      $('seek').className = 'seek show seeking';
      renderSeek();
      showOsd();
      clearTimeout(P.seekT);
      P.seekT = setTimeout(commitSeek, SEEK_COMMIT);
    }
    function commitSeek() {
      clearTimeout(P.seekT);
      if (P.seekTarget == null) return;
      var tgt = P.seekTarget;
      P.seekTarget = null;
      P.seekKeepPaused = true; seekTo(tgt); P.seekKeepPaused = false;
      $('seek').className = 'seek show';
      savePos(); renderSeek(); showOsd();
    }
    function cancelSeek() {
      clearTimeout(P.seekT);
      P.seekTarget = null;
      $('seek').className = 'seek' + (P.open && mode() !== 'live' ? ' show' : '');
    }
    function goLive() {
      if (mode() !== 'dvr') return;
      var r = range(); try { video.currentTime = r[1] - 3; } catch (e) {}
      tryPlay(); toast('عدت إلى البث المباشر');
    }
    function togglePause() {
      if (video.paused) tryPlay(); else video.pause();
      showOsd();
    }

    function renderCtrls(m) {
      $('pctrls').className = 'pctrls show' + (m === 'live' ? ' live' : '');
      $('pc-prevch').classList.toggle('hidden', !(m === 'live' && P.prevLive && P.prevLive !== P.ch));
      $('pc-play').textContent = video.paused ? '▶' : '❚❚';
      $('pc-next').classList.toggle('hidden', !epAt(1));
      $('pc-intro').classList.toggle('hidden', !P.eps);
      $('pc-intro').classList.toggle('marking', P.introMark != null);
      $('pc-intro').textContent = P.introMark != null ? '✂ هون بتخلص الشارة' : '✂ الشارة';
      $('pc-eps').classList.toggle('hidden', !P.eps);
    }
    function renderSeek() {
      var m = mode(), sk = $('seek');
      renderCtrls(m);
      if (m === 'live') { sk.className = 'seek'; $('osd-behind').textContent = ''; return; }
      if (sk.className.indexOf('show') < 0) sk.className = 'seek show';
      var r = range(), span = Math.max(1, r[1] - r[0]);
      var cur = P.seekTarget != null ? P.seekTarget : video.currentTime;
      var f = Math.max(0, Math.min(1, (cur - r[0]) / span));
      var buf = 0, b = video.buffered;
      for (var i = 0; i < b.length; i++) if (b.start(i) <= video.currentTime + 1 && b.end(i) >= video.currentTime) buf = b.end(i);
      $('seek-fill').style.width = (f * 100) + '%';
      $('seek-buf').style.width = (Math.max(0, Math.min(1, (buf - r[0]) / span)) * 100) + '%';
      $('seek-thumb').style.left = (f * 100) + '%';
      if (m === 'vod') {
        $('seek-cur').textContent = dur(cur);
        $('seek-dur').textContent = vodLen() ? dur(vodLen()) : '--:--';
        $('seek-tip').textContent = (P.seekTarget != null && P.seekTarget < video.currentTime ? '⏪ ' : '⏩ ') + dur(cur);
        $('osd-behind').textContent = '';
      } else {
        var behind = r[1] - cur;
        $('seek-cur').textContent = '-' + dur(behind);
        $('seek-dur').textContent = 'مباشر';
        $('seek-tip').textContent = '-' + dur(behind);
        $('osd-behind').innerHTML = behind > 15 ? 'متأخر ' + dur(behind) + ' عن المباشر · ' + KD.g + ' للعودة' : '';
      }
    }

    function fill() {
      if (P.mini) { fillMiniInfo(); return; }
      var ch = P.ch; if (!ch) return;
      var m = mode();
      var logo = $('osd-logo');
      logo.setAttribute('style', bg(ch));
      logo.innerHTML = ch.logo ? '<img src="' + esc(ch.logo) + '" onerror="this.parentNode.textContent=\'' + esc(initials(ch.name)) + '\'">' : esc(initials(ch.name));
      $('osd-num').textContent = P.eps ? epLabel(ch) : (ch.vod ? ch.group : 'قناة ' + ch.num);
      $('osd-name').textContent = (P.eps ? ch.stitle : ch.name) + (isFav(ch.id) ? '  ★' : '');
      var badgeEl = $('osd-badge');
      if (m === 'vod') {
        badgeEl.textContent = ch.type === 'series' ? 'حلقة' : 'فيلم'; badgeEl.className = 'badge-live badge-vod';
        $('osd-now').textContent = ''; $('osd-time').textContent = ''; $('osd-next').textContent = '';
        $('osd-progress-wrap').className = 'progress big empty';
        var nx = epAt(1);
        $('osd-next').textContent = nx ? 'التالية: ' + epLabel(nx) : '';
        $('osd-hint').innerHTML = P.eps
          ? '◀▶ ترجيع/تقديم · ▼ الحلقات · CH+/CH− التالية/السابقة · ' + KD.y + ' تحديد الشارة · OK إيقاف/تشغيل · رجوع للخروج'
          : '◀▶ ترجيع/تقديم · ⏪⏩ ‎30 ث · OK إيقاف/تشغيل · ⚙ الصوت والترجمة والسرعة · رجوع للخروج';
      } else {
        badgeEl.textContent = 'مباشر'; badgeEl.className = 'badge-live';
        var info = EPG.now(ch);
        $('osd-now').textContent = info ? info.cur.title : 'بث مباشر';
        $('osd-time').textContent = info ? fmt(info.cur.start) + ' – ' + fmt(info.cur.stop) : '';
        $('osd-progress-wrap').className = 'progress big' + (info && m === 'live' ? '' : ' empty');
        $('osd-progress').style.width = (info ? pct(info.cur) : 0) + '%';
        $('osd-next').textContent = info && info.next ? 'التالي: ' + fmt(info.next.start) + ' ' + info.next.title : '';
        $('osd-hint').innerHTML = (m === 'dvr' ? '◀▶ ترجيع/تقديم · ' + KD.g + ' للمباشر · ' : '') + '▲▼ تغيير القناة · OK ' + (m === 'dvr' ? 'إيقاف/تشغيل' : 'المعلومات') + ' · الأرقام للانتقال · رجوع للخروج';
      }
      renderSeek();
    }

    function osdVisible() { return $('osd').className.indexOf('hidden') < 0; }
    function showOsd() {
      $('osd').className = 'osd';
      renderSeek();
      clearTimeout(P.osdT);
      P.osdT = setTimeout(function hide() {
        if (P.seekTarget != null || (video.paused && mode() !== 'live')) { P.osdT = setTimeout(hide, 2000); return; }
        $('osd').className = 'osd hidden';
      }, 5000);
    }
    function toggleOsd() {
      if (!osdVisible()) showOsd();
      else { clearTimeout(P.osdT); $('osd').className = 'osd hidden'; }
    }
    function zap(d) {
      var l = P.list, i = l.indexOf(P.ch); if (i < 0) i = 0;
      play(l[(i + d + l.length) % l.length]);
    }
    function digit(n) {
      if (P.numBuf.length >= 4) return;
      P.numBuf += n;
      var ne = $('numentry'); ne.textContent = P.numBuf; ne.className = 'numentry show';
      clearTimeout(P.numT);
      P.numT = setTimeout(function () {
        var num = +P.numBuf, raw = P.numBuf; P.numBuf = ''; ne.className = 'numentry';
        if (raw === '0') { prevChannel(); return; }              // a single 0 = previous channel
        var L = S.kind.live.list, ch = null;
        for (var i = 0; i < L.length; i++) if (L[i].num === num) { ch = L[i]; break; }
        if (ch) { P.list = L; play(ch); } else toast('لا توجد قناة بالرقم ' + num, true);
      }, 1500);
    }

    /* ---- mini preview: the same player shrunk into the box at the top-left of the channels tab ---- */
    function placeMini() {
      var r = $('lp-box').getBoundingClientRect(), pl = $('player');
      pl.style.top = r.top + 'px'; pl.style.left = r.left + 'px'; pl.style.width = r.width + 'px'; pl.style.height = r.height + 'px';
      pl.style.right = 'auto'; pl.style.bottom = 'auto';
    }
    function unplace() { var pl = $('player'); pl.style.top = pl.style.left = pl.style.width = pl.style.height = pl.style.right = pl.style.bottom = ''; }
    function mini(ch, list) {
      if (P.open && !P.mini) return;                       // never steal from the full-screen player
      if (P.mini && P.ch === ch) return;
      P.list = (list && list.length) ? list : [ch];
      if (P.list.indexOf(ch) < 0) P.list = [ch].concat(P.list);
      P.open = true; P.mini = true; P.fromMini = false;
      placeMini(); $('player').className = 'open mini';
      play(ch);
      markPreviewing();
      fillMiniInfo();
    }
    function markPreviewing() {
      var old = document.querySelectorAll('#grid-live .previewing');
      for (var i = 0; i < old.length; i++) old[i].classList.remove('previewing');
      if (P.mini && P.ch) { var c = document.querySelector('#grid-live .card[data-id="' + P.ch.id + '"]'); if (c) c.classList.add('previewing'); }
    }
    function fillMiniInfo() {
      var box = $('lp-info'); if (!box) return;
      if (!P.mini || !P.ch) { box.innerHTML = ''; return; }
      var ch = P.ch, info = EPG.now(ch);
      box.innerHTML = '<b>' + ch.num + ' · ' + esc(ch.name) + '</b>' +
        (info ? '<div class="lp-now">الآن: ' + esc(info.cur.title) + ' <span class="muted" style="direction:ltr;display:inline-block">' + fmt(info.cur.start) + '–' + fmt(info.cur.stop) + '</span></div>' +
                '<div class="progress"><i style="width:' + pct(info.cur) + '%"></i></div>' +
                (info.next ? '<div class="lp-next">التالي: ' + fmt(info.next.start) + ' ' + esc(info.next.title) + '</div>' : '') : '<div class="lp-now muted">بث مباشر</div>') +
        '<div class="lp-hint">OK على نفس القناة أو على الشاشة الصغيرة = شاشة كاملة · CH+/CH− تقليب</div>';
    }
    function expand() {
      if (!P.mini) return;
      P.mini = false; P.fromMini = true;
      unplace(); $('player').className = 'open';
      addRecent(P.ch.id);
      fill(); showOsd();
    }
    function shrink() {                                    // back from full screen to the preview box
      closePanel(); closeDialog(); hideUpNext();
      P.opts = false; $('popts').className = 'popts';
      P.mini = true; P.fromMini = false;
      placeMini(); $('player').className = 'open mini';
      fillMiniInfo(); markPreviewing();
      var c = document.querySelector('#grid-live .card[data-id="' + P.ch.id + '"]') || document.querySelector('#grid-live .g-row[data-id="' + P.ch.id + '"]');
      if (c) Nav.focus(c);
    }
    function zapMini(d) { if (P.mini) { zap(d); markPreviewing(); fillMiniInfo(); var c = document.querySelector('#grid-live .card[data-id="' + P.ch.id + '"]'); if (c) Nav.focus(c); } }

    function open(ch, list) {
      if (NativeVod.wants(ch)) { NativeVod.play(ch); return; }
      P.list = (list && list.length) ? list : (S.channels.length ? S.channels : [ch]);
      if (P.list.indexOf(ch) < 0) P.list = [ch].concat(P.list);
      if (P.mini) { P.mini = false; unplace(); }
      P.fromMini = false;
      P.open = true; $('player').className = 'open';
      if (!!S.settings.debug !== !!P.dbg) toggleDebug();
      play(ch);
    }
    function close(force) {
      if (!force && P.fromMini && !P.mini && S.screen === 'live') { shrink(); return; }   // leaving full screen → back to the preview
      savePos();
      var last = P.ch;
      P.mini = false; P.fromMini = false; unplace();
      var lpi = $('lp-info'); if (lpi) lpi.innerHTML = '';
      hideUpNext(); closePanel(); closeDialog();
      P.opts = false; $('popts').className = 'popts';
      stop(); P.open = false; P.ch = null; P.eps = null; msg(null);
      clearTimeout(P.numT); P.numBuf = ''; $('numentry').className = 'numentry';
      $('player').className = '';
      updateCards();
      S.myDirty = true; S.homeDirty = true;
      if (S.screen === 'series' && last && last.sk === S.curSeries) openSeries(S.curSeries, last.id);
      if (S.screen === 'info' && last && last.id === S.curInfo) renderInfo();
    }

    function handleKey(k) {
      var m = mode();
      if (P.scrub != null && P.scrubEnd) P.scrubEnd(false);
      // two quick presses of Back leave the video straight away (no need to pick "خروج")
      if (k === KEY.BACK || k === KEY.BACKSPACE || k === KEY.ESC) {
        var now = Date.now(), quick = now - (P.lastBackKey || 0) < 1500;
        P.lastBackKey = now;
        if (quick && (!P.dlg || P.dlg.isExit) && !P.panel) { P.lastBackKey = 0; closeDialog(); close(); return true; }
      }
      if (sleepNudge()) return true;
      if (P.opts) return optsKey(k);
      if (P.dlg) return dialogKey(k);
      if (P.panel) return panelKey(k);
      if (P.upnext) {
        if (k === KEY.ENTER) { goEp(1); return true; }
        if (k === KEY.BACK || k === KEY.BACKSPACE || k === KEY.ESC) { hideUpNext(); showOsd(); return true; }
      }
      switch (k) {
        case KEY.LEFT: seekBy(-1); break;
        case KEY.RIGHT: seekBy(1); break;
        case KEY.RW: seekBy(-1, 30); break;
        case KEY.FF: seekBy(1, 30); break;
        case KEY.ENTER:
          if (m === 'live') toggleOsd();
          else if (P.seekTarget != null) commitSeek();
          else if ($('skipintro').className.indexOf('show') >= 0) skipIntro();
          else togglePause();
          break;
        case KEY.YELLOW: case 73: introButton(); break;     // yellow key (or I on a keyboard)
        case KEY.BLUE: case 68: toggleDebug(); break;       // blue key (or D): playback info
        case KEY.SPACE: case KEY.PLAYPAUSE: case KEY.MEDIA_PP: togglePause(); break;
        case KEY.PLAY: tryPlay(); showOsd(); break;
        case KEY.PAUSE: video.pause(); showOsd(); break;
        case KEY.STOP: askExit(); break;
        case KEY.UP: if (m === 'vod') showOsd(); else zap(1); break;
        case KEY.DOWN: if (P.eps) openPanel(); else if (m === 'vod') showOsd(); else zap(-1); break;
        case KEY.CHUP: if (P.eps) goEp(1); else zap(1); break;
        case KEY.CHDOWN: if (P.eps) goEp(-1); else zap(-1); break;
        case KEY.GREEN: goLive(); break;
        case KEY.RED: case KEY.F: toggleFav(P.ch.id); fill(); showOsd(); break;
        case KEY.BACK: case KEY.BACKSPACE: case KEY.ESC:
          if (P.seekTarget != null) { cancelSeek(); renderSeek(); }
          else if (P.numBuf) { P.numBuf = ''; clearTimeout(P.numT); $('numentry').className = 'numentry'; }
          else if (!osdVisible() && m === 'live') showOsd();
          else askExit();
          break;
        default:
          if (m !== 'vod' && k >= 48 && k <= 57) digit(k - 48);
          else if (m !== 'vod' && k >= 96 && k <= 105) digit(k - 96);
          else return false;
      }
      return true;
    }

    function init() {
      video = $('video');
      video.addEventListener('playing', function () { msg(null); if (P.eps) checkIntro(); });
      video.addEventListener('waiting', function () { if (P.open) msg('loading', 'جارِ التحميل…'); });
      video.addEventListener('seeking', function () { if (P.open) msg('loading', ''); });
      video.addEventListener('seeked', function () { if (!video.paused) msg(null); });
      video.addEventListener('canplay', function () { if (video.paused === false || P.seekTarget == null) msg(null); });
      video.addEventListener('pause', function () { if (P.open && !video.ended && !P.dlg && P.scrub == null && mode() !== 'live') $('pause-icon').className = 'pause-icon show'; });
      video.addEventListener('play', function () { $('pause-icon').className = 'pause-icon'; $('pc-play').textContent = '❚❚'; });
      video.addEventListener('pause', function () { $('pc-play').textContent = '▶'; });
      video.addEventListener('loadedmetadata', function () {
        if (!P.open || !P.ch) return;
        applyCue();
        try {
          var want = S.settings.subLang;
          if (want) trackList(video.textTracks).forEach(function (t) { if (t.language === want) t.mode = 'showing'; });
          if (P.rate && P.ch.vod) video.playbackRate = P.rate;
        } catch (e) {}
        if (!P.usingJs && !isFinite(video.duration)) P.live = true;
        if (!P.usingJs && isFinite(video.duration) && P.ch.vod) P.live = false;
        var p = S.pos[P.ch.id], it0 = P.eps && introOf();
        if (P.autoResumeTo != null) {
          var to = P.autoResumeTo; P.autoResumeTo = null; P.resumed = true; P.introSkipped = true;
          var back = function () { video.removeEventListener('playing', back); seekTo(to); };
          video.addEventListener('playing', back);
        }
        else if (it0 && it0.auto && !P.resumed && !(p && p.t >= 10) && it0.s <= 15) {
          P.resumed = true; P.introSkipped = true;
          var startAfter = function () { video.removeEventListener('playing', startAfter); if (P.ch && introOf() === it0) { seekTo(it0.e); toast('⏭ تم تخطي الشارة'); } };
          video.addEventListener('playing', startAfter);
        }
        else if (P.ch.vod && p && p.t >= 10 && !P.resumed) {
          P.resumed = true;
          askResume({ t: p.t, d: vodLen() || p.d });
        }
        fill();
      });
      video.addEventListener('timeupdate', function () {
        if (!P.open) return;
        if (osdVisible() && P.seekTarget == null) renderSeek();
        if (P.eps) checkIntro();
        var now = Date.now();
        if (now - P.lastSave > 10000) { P.lastSave = now; savePos(); }
        if (P.eps && P.seekTarget == null && video.duration > 60) {
          var left = video.duration - video.currentTime;
          if (left < 25 && !P.upShown && !P.panel && epAt(1)) { P.upShown = true; showUpNext(0); }
          else if (left > 35 && P.upShown) { P.upShown = false; if (P.upnext) hideUpNext(); }
        }
      });
      video.addEventListener('ended', function () {
        if (!P.ch || !P.ch.vod) return;
        delete S.pos[P.ch.id]; save('pos', S.pos); markDone();
        if (P.eps && epAt(1)) showUpNext(S.settings.autoNext === false ? 0 : 8);
        else { toast(P.eps ? 'انتهت آخر حلقة متوفرة' : 'انتهى العرض'); setTimeout(function () { if (P.open && video.ended) close(); }, 1500); }
      });
      video.addEventListener('error', function () {
        if (!P.open || P.usingJs || !video.getAttribute('src')) return;
        if ($('prev-vid').getAttribute('src') && P.previewBroke) return;   // handled by the preview guard
        fail();
      });
      /* ---- Magic Remote pointer: seek bar (click / drag) and on-screen buttons ---- */
      var track = document.querySelector('.seek-track'), drag = false;
      function posAt(x) {
        var r = track.getBoundingClientRect(), f = Math.max(0, Math.min(1, (x - r.left) / r.width)), rg = range();
        return rg[0] + f * (rg[1] - rg[0]);
      }
      track.addEventListener('mousedown', function (e) {
        if (mode() === 'live') return;
        e.preventDefault(); e.stopPropagation();
        if (scrubMode()) { scrubEnd(true, posAt(e.clientX)); hidePreview(); return; }   // click while previewing: go there
        drag = true;
        P.seekTarget = posAt(e.clientX); $('seek').className = 'seek show seeking'; renderSeek(); showOsd();
      });
      document.addEventListener('mousemove', function (e) {
        if (!P.open) return;
        if (drag) { P.seekTarget = posAt(e.clientX); renderSeek(); showOsd(); showPreview(e.clientX); return; }
        if (!P.dlg && !P.panel) showOsd();
      });
      document.addEventListener('mouseup', function (e) {
        if (!drag) return;
        drag = false; P.seekTarget = posAt(e.clientX); commitSeek(); hidePreview();
      });
      track.addEventListener('click', function (e) { e.stopPropagation(); });
      track.addEventListener('mouseenter', function () { track.classList.add('hover'); });
      track.addEventListener('mouseleave', function () {
        track.classList.remove('hover'); if (drag) return;
        hidePreview();
        clearTimeout(scrubT);
        if (P.scrub != null) scrubBackT = setTimeout(function () { scrubEnd(false); }, 700);
      });
      track.addEventListener('mousemove', function (e) { if (mode() !== 'live') showPreview(e.clientX); });
      /* a small second video shows the frame under the pointer — only when the subscription allows 2+ connections,
         so it never kicks the main stream off a single-connection account */
      var pv = $('prev-vid'), pvT = 0, pvWant = null, pvFree = null;
      function previewAllowed() {
        return mode() === 'vod' && S.settings.preview !== false && P.ch && P.ch.vod &&
               (!S.settings.api || (S.settings.maxConn || 1) > 1 || S.settings.preview === 'force' || !S.settings.previewBlocked);
      }
      function showPreview(x) {
        var r = track.getBoundingClientRect(), f = Math.max(0, Math.min(1, (x - r.left) / r.width));
        var t = posAt(x), box = $('seek-prev'), img = previewAllowed();
        box.style.left = (f * 100) + '%';
        $('prev-time').textContent = mode() === 'vod' ? dur(t) : '-' + dur(range()[1] - t);
        box.className = 'seek-prev show' + (img ? ' img' : '') + (scrubMode() ? ' scrub' : '');
        clearTimeout(pvFree);
        if (scrubMode()) { scrubTo(t); return; }
        if (!img) return;
        if (pv.getAttribute('src') !== P.ch.url) { pv.setAttribute('src', P.ch.url); pv.preload = 'auto'; armGuard(); }
        pvWant = t;
        var now = Date.now();
        if (now - pvT > 250) { pvT = now; try { pv.currentTime = t; } catch (err) {} }
        else setTimeout(function () { if (pvWant === t) { pvT = Date.now(); try { pv.currentTime = t; } catch (err) {} } }, 260);
      }
      /* Single-connection accounts: preview by pausing the main video and showing the frame full-screen.
         Leave the bar → it jumps back to where you were; click → it continues from the new spot. */
      var scrubT = null, scrubBackT = null;
      function scrubMode() {
        return false;   // full-screen scrub preview turned off on request — keeps the time-only bubble
        return mode() === 'vod' && S.settings.preview !== false && S.settings.preview !== 'force' &&
               S.settings.api && (S.settings.maxConn || 1) < 2 && S.settings.previewBlocked;
      }
      function scrubTo(t) {
        clearTimeout(scrubBackT); clearTimeout(scrubT);
        scrubT = setTimeout(function () {                // wait until the pointer rests, so we don't spam the server
          if (!P.open) return;
          if (P.scrub == null) { P.scrub = { from: video.currentTime, wasPaused: video.paused }; video.pause(); }
          try { video.currentTime = t; } catch (e) {}
          $('pause-icon').className = 'pause-icon';
        }, 450);
      }
      function scrubEnd(commit, t) {
        clearTimeout(scrubT); clearTimeout(scrubBackT);
        if (P.scrub == null) return false;
        var sc = P.scrub; P.scrub = null;
        if (commit) { seekTo(t); tryPlay(); }
        else { try { video.currentTime = sc.from; } catch (e) {} if (!sc.wasPaused) tryPlay(); }
        return true;
      }
      P.scrubEnd = scrubEnd;
      var guardT = null, guardOn = false;
      function armGuard() {
        if ((S.settings.maxConn || 1) > 1 || !S.settings.api) return;   // only needed for 1-connection accounts
        guardOn = true; P.guardAt = video.currentTime;
      }
      function previewBroke(why) {
        if (!guardOn || !P.open) return;
        guardOn = false;
        var t = Math.max(P.guardAt || 0, video.currentTime || 0), ch = P.ch;
        freePreview(); $('seek-prev').className = 'seek-prev';
        S.settings.previewBlocked = true; save('settings', S.settings);
        toast('السيرفر ما سمح باتصال ثاني — رجعت المعاينة للوقت بس', true);
        P.autoResumeTo = t;
        play(ch);
      }
      P.previewBroke = previewBroke;
      video.addEventListener('error', function () { if (guardOn) previewBroke('error'); });
      video.addEventListener('waiting', function () {
        if (!guardOn) return;
        clearTimeout(guardT);
        guardT = setTimeout(function () { if (guardOn && video.readyState < 3 && !video.paused) previewBroke('stall'); }, 6000);
      });
      video.addEventListener('playing', function () { clearTimeout(guardT); });
      pv.addEventListener('error', function () { if (pv.getAttribute('src')) { freePreview(); $('seek-prev').className = 'seek-prev show'; } });
      function hidePreview() {
        $('seek-prev').className = 'seek-prev';
        clearTimeout(pvFree);
        pvFree = setTimeout(freePreview, 3000);       // release the extra connection soon after
      }
      function freePreview() { guardOn = false; clearTimeout(guardT); pv.removeAttribute('src'); try { pv.load(); } catch (e) {} }
      P.freePreview = function () { clearTimeout(pvFree); $('seek-prev').className = 'seek-prev'; freePreview(); };
      $('pctrls').addEventListener('click', function (e) {
        e.stopPropagation();
        var b = closest(e.target, 'pc'); if (!b) return;
        var c = b.getAttribute('data-c');
        if (c === 'play') togglePause();
        else if (c === 'back') seekBy(-1, 10);
        else if (c === 'fwd') seekBy(1, 10);
        else if (c === 'next') goEp(1);
        else if (c === 'eps') openPanel();
        else if (c === 'exit') askExit();
        else if (c === 'intro') introButton();
        else if (c === 'opts') openOpts();
        else if (c === 'prevch') prevChannel();
        renderCtrls(mode());
      });
      $('ep-strip').addEventListener('click', function (e) {
        e.stopPropagation();
        var m = closest(e.target, 'ep-mini'); if (!m || !P.eps) return;
        var i = Array.prototype.indexOf.call($('ep-strip').children, m), ep = P.eps[i];
        closePanel(); if (ep && ep !== P.ch) play(ep); else showOsd();
      });
      $('upnext').addEventListener('click', function (e) { e.stopPropagation(); goEp(1); });
      $('popts').addEventListener('click', function (e) {
        e.stopPropagation();
        var o = closest(e.target, 'popt'); if (!o) return;
        P.optR = +o.getAttribute('data-r'); P.optC = +o.getAttribute('data-o');
        var op = P.optRows[P.optR].opts[P.optC]; if (op && !op.na) op.run();
        setTimeout(drawOpts, 60);
      });
      $('skipintro').addEventListener('click', function (e) { e.stopPropagation(); skipIntro(); });
      $('pdialog').addEventListener('click', function (e) {
        e.stopPropagation();
        var b = closest(e.target, 'pbtn'); if (b && P.dlg) dlgRun(+b.getAttribute('data-i'));
      });
      $('pdialog').addEventListener('mouseover', function (e) {
        var b = closest(e.target, 'pbtn'); if (b && P.dlg) dlgSelect(+b.getAttribute('data-i'));
      });
      $('player').addEventListener('click', function () {
        if (P.mini) { expand(); return; }
        if (P.dlg) return;
        if (P.panel) { closePanel(); showOsd(); return; }
        if (mode() === 'live') toggleOsd(); else togglePause();
      });
      document.addEventListener('visibilitychange', function () {
        if (!P.open) return;
        if (document.hidden) { savePos(); video.pause(); }
        else if (mode() === 'live') play(P.ch); else if (!P.dlg) tryPlay();
      });
    }

    /* touching the wheel while watching must not change anything — it only brings up the controls.
       It seeks only when the pointer is right on the timeline. */
    function wheel(dir, target) {
      if (P.dlg || P.panel) return handleKey(dir > 0 ? KEY.LEFT : KEY.RIGHT);
      if (target && closest(target, 'seek') && mode() !== 'live') { seekBy(dir > 0 ? 1 : -1); return; }
      showOsd();
    }
    function resumeAt(t) { P.autoResumeTo = t; }
    return { init: init, open: open, close: close, handleKey: handleKey, wheel: wheel, resumeAt: resumeAt, refresh: fill,
             mini: mini, expand: expand, zapMini: zapMini, placeMini: function () { if (P.mini) placeMini(); },
             isMini: function () { return !!(P.open && P.mini); }, current: function () { return P.ch; },
             isOpen: function () { return P.open && !P.mini; } };
  })();

  /* ---------- input ---------- */
  var ARROWS = { 37: 1, 38: 1, 39: 1, 40: 1 };
  function onKey(e) {
    var k = e.keyCode, now = Date.now();
    if (S.am) {                                          // app modal has the keys (on-screen keypad, no TV keyboard)
      e.preventDefault();
      if (k === KEY.BACK || k === KEY.ESC) { var ob = S.am.onBack; if (ob) ob(); else amClose(); return; }
      if (k === KEY.BACKSPACE) { if (S.am.pad && $('am-input').value) amType('del'); else { var ob2 = S.am.onBack; if (ob2) ob2(); else amClose(); } return; }
      if (k >= 48 && k <= 57) { amType(String(k - 48)); return; }
      if (k >= 96 && k <= 105) { amType(String(k - 96)); return; }
      var cur2 = Nav.current(), kps = [].slice.call(document.querySelectorAll('#am-pad [data-kp]')), bts = [].slice.call(document.querySelectorAll('#am-btns [data-am]'));
      var ki = kps.indexOf(cur2), bi = bts.indexOf(cur2);
      if (k === KEY.ENTER) { if (ki >= 0) amPress(cur2.getAttribute('data-kp')); else if (bi >= 0) S.am.btns[bi].run(); return; }
      if (ki >= 0) {
        var r = Math.floor(ki / 3), c = ki % 3;
        if (k === KEY.LEFT && c > 0) Nav.focus(kps[ki - 1]);
        else if (k === KEY.RIGHT && c < 2) Nav.focus(kps[ki + 1]);
        else if (k === KEY.UP && r > 0) Nav.focus(kps[ki - 3]);
        else if (k === KEY.DOWN) Nav.focus(r < 3 ? kps[ki + 3] : bts[0]);
        return;
      }
      if (bi >= 0) {
        if (k === KEY.UP && S.am.pad) Nav.focus(kps[10]);
        else if (k === KEY.LEFT || k === KEY.RIGHT) { var sib = bts[bi + (LR(k) === KEY.LEFT ? 1 : -1)]; if (sib) Nav.focus(sib); }   // RTL row
        return;
      }
      if (bts[0]) Nav.focus(S.am.pad ? kps[0] : bts[0]);
      return;
    }
    if (S.peLangs && S.screen === 'profiles' && (k === KEY.UP || k === KEY.DOWN || k === KEY.LEFT || k === KEY.RIGHT)) {
      e.preventDefault();
      var lsx = [].slice.call(document.querySelectorAll('.pe-lang')), li = lsx.indexOf(Nav.current());
      if (k === KEY.UP && li > 0) Nav.focus(lsx[li - 1]); else if (k === KEY.DOWN && li < lsx.length - 1) Nav.focus(lsx[li + 1]); else if (li < 0) Nav.focus(lsx[0]);
      return;
    }
    if (!S.splashGone && $('splash')) { if (k === KEY.ENTER || k === KEY.BACK) e.preventDefault(); return; }
    // When a key is held the TV floods repeats; pace them so animations stay smooth.
    if (ARROWS[k] && e.repeat && now - S.lastKey < (Player.isOpen() ? 110 : 85)) { e.preventDefault(); return; }
    if (ARROWS[k]) S.lastKey = now;

    if (Player.isOpen()) { if (Player.handleKey(k)) e.preventDefault(); return; }
    var ae = document.activeElement;
    if (ae && ae.tagName === 'INPUT') {
      if (k === KEY.UP || k === KEY.DOWN) { ae.blur(); Nav.move(k === KEY.UP ? 'up' : 'down'); e.preventDefault(); }
      else if (k === KEY.ENTER || k === KEY.BACK || k === KEY.ESC) { ae.blur(); e.preventDefault(); }
      return;
    }
    var cur = Nav.current();
    switch (k) {
      case KEY.LEFT: case KEY.RIGHT:
        if (cur && (cur.classList.contains('nav-item') || cur.id === 'avatar-btn')) { if (LR(k) === KEY.LEFT) enterContent(); break; }   // side rail → content
        Nav.move(k === KEY.LEFT ? 'left' : 'right');
        var nc = Nav.current();                              // stepping into the side rail lands on the current tab
        if (nc && nc !== cur && nc.classList.contains('nav-item') && navItem(S.screen) && nc !== navItem(S.screen)) { S.navEnter = true; Nav.focus(navItem(S.screen)); S.navEnter = false; clearTimeout(S.navT); S.navT = null; }
        break;
      case KEY.UP: Nav.move('up'); break;
      case KEY.DOWN: Nav.move('down'); break;
      case KEY.ENTER: activate(cur); break;
      case KEY.BACK: case KEY.BACKSPACE: case KEY.ESC:
        if (Player.isMini() && cur && cur.id === 'lp-box') { Player.close(true); break; }
        back(); break;
      case KEY.CHUP: case KEY.CHDOWN: if (Player.isMini()) Player.zapMini(k === KEY.CHUP ? 1 : -1); break;
      case KEY.GREEN: if (cur && cur.classList.contains('group-item')) toggleHide(cur.getAttribute('data-kind'), cur.getAttribute('data-group')); break;
      case KEY.YELLOW: if (cur && cur.classList.contains('group-item')) toggleLock(cur.getAttribute('data-kind'), cur.getAttribute('data-group')); break;
      case 72: if (cur && cur.classList.contains('group-item')) toggleHide(cur.getAttribute('data-kind'), cur.getAttribute('data-group')); break;   // H on a keyboard
      case 76: if (cur && cur.classList.contains('group-item')) toggleLock(cur.getAttribute('data-kind'), cur.getAttribute('data-group')); break;   // L on a keyboard
      case KEY.RED: case KEY.F:
        if (cur && cur.classList.contains('group-item')) togglePin(cur.getAttribute('data-kind'), cur.getAttribute('data-group'));
        else if (cur) toggleFav(cur.getAttribute('data-id'));
        break;
      default: return;
    }
    e.preventDefault();
  }

  /* Settings can be pushed from a computer:
     ares-launch -d tv com.ahmad.amira.iptv -p '{"xs":"http://server","xu":"user","xp":"pass"}'
     or  -p '{"m3u":"http://.../list.m3u","epg":"http://.../epg.xml"}' */
  function launchParams() {
    try {
      var lp = window.PalmSystem && PalmSystem.launchParams;
      return typeof lp === 'string' ? (lp ? JSON.parse(lp) : null) : lp || null;
    } catch (e) { return null; }
  }
  function applyParams(p) {
    if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { return false; } }
    if (!p) return false;
    if (p.xs && p.xu && p.xp) { loginXtream(p.xs, p.xu, p.xp); return true; }
    if (p.m3u) { loadPlaylist(p.m3u, p.epg || ''); return true; }
    return false;
  }

  function mainScroller() {
    var map = { home: 'home-scroller', live: 'grid-live', movies: 'grid-movies', shows: 'grid-shows', favs: 'mylist-scroller',
                series: 'series-scroller', info: 'info-scroller', search: 'search-grid', settings: 'settings-form' };
    return $(map[S.screen]);
  }
  function wheelScroll(sc, dir) {
    var vp = sc.parentNode, H = vp.clientHeight, full = sc.scrollHeight;
    var padB = Nav.rem(+(sc.getAttribute('data-pad-bottom') || 0));
    var min = Math.min(0, H - full - padB), ty = sc._ty || 0;
    var step = Math.max(Nav.rem(5), H * 0.2);
    var nt = Math.max(min, Math.min(0, ty - dir * step));
    if (nt === ty && dir > 0 && S.grids[sc.id] && S.grids[sc.id].n < S.grids[sc.id].list.length) { appendGrid(sc.id); return true; }
    if (nt === ty) return false;
    sc._ty = nt; sc.style.transform = 'translate3d(0,' + nt + 'px,0)';
    if (dir > 0 && S.grids[sc.id] && nt - min < H) appendGrid(sc.id);
    return true;
  }

  function scale() {
    var b = Math.min(window.innerWidth / 1920, window.innerHeight / 1080) * 16;
    document.documentElement.style.fontSize = b + 'px';
    Nav.setBase(b);
  }
  function tick() {
    var now = new Date(), t = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    $('clock').textContent = t; $('osd-clock').textContent = t;
  }

  /* Amira's own short startup sound (synthesised — no audio file): a soft whoosh, a low swell and a rising chime */
  function playIntroSound() {
    if (S.settings.introSound === false) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      var ac = new AC(), t0 = ac.currentTime + 0.05;
      if (ac.state === 'suspended' && ac.resume) ac.resume();
      var master = ac.createGain(); master.gain.value = 0.32; master.connect(ac.destination);
      var echo = ac.createDelay(); echo.delayTime.value = 0.18;
      var fb = ac.createGain(); fb.gain.value = 0.28;
      var wet = ac.createGain(); wet.gain.value = 0.35;
      echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(master);
      // whoosh: filtered noise sweeping up
      var len = Math.floor(ac.sampleRate * 0.9), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var nz = ac.createBufferSource(); nz.buffer = buf;
      var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(4200, t0 + 0.7);
      var ng = ac.createGain(); ng.gain.setValueAtTime(0.0001, t0); ng.gain.exponentialRampToValueAtTime(0.35, t0 + 0.45); ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
      nz.connect(bp); bp.connect(ng); ng.connect(master); nz.start(t0); nz.stop(t0 + 0.9);
      // low swell
      var lo = ac.createOscillator(); lo.type = 'sine'; lo.frequency.setValueAtTime(55, t0 + 0.3); lo.frequency.exponentialRampToValueAtTime(82, t0 + 1.2);
      var lg = ac.createGain(); lg.gain.setValueAtTime(0.0001, t0 + 0.3); lg.gain.exponentialRampToValueAtTime(0.9, t0 + 0.6); lg.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
      lo.connect(lg); lg.connect(master); lo.start(t0 + 0.3); lo.stop(t0 + 2.3);
      // chime: rising notes with a bell-like overtone
      [[659.3, 0.42], [987.8, 0.58], [1318.5, 0.74], [1661.2, 0.9]].forEach(function (n, k) {
        var at = t0 + n[1];
        [[1, 'triangle', 0.5], [2.01, 'sine', 0.16]].forEach(function (pt) {
          var o = ac.createOscillator(); o.type = pt[1]; o.frequency.value = n[0] * pt[0];
          var g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(pt[2] * (k === 3 ? 0.7 : 1), at + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, at + (k === 3 ? 1.8 : 1.1));
          o.connect(g); g.connect(master); g.connect(echo); o.start(at); o.stop(at + 2);
        });
      });
      setTimeout(function () { try { ac.close(); } catch (e) {} }, 4000);
    } catch (e) {}
  }

  function init() {
    scale();
    initTouch();
    window.addEventListener('resize', function () { scale(); Player.placeMini(); });
    Nav.setOnFocus(onFocus);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('click', function (e) {
      var el = closest(e.target, 'focusable');
      if (el && !Player.isOpen()) {
        S.hover = true; Nav.focus(el, true); S.hover = false;
        if (el.classList.contains('nav-item')) { showScreen(el.getAttribute('data-screen')); document.body.classList.remove('nav-open'); return; }
        if (e.target.getAttribute && e.target.getAttribute('data-pin')) { togglePin(el.getAttribute('data-kind'), el.getAttribute('data-group')); return; }
        var gt = e.target.getAttribute && e.target.getAttribute('data-gt');
        if (gt === 'hide') { toggleHide(el.getAttribute('data-kind'), el.getAttribute('data-group')); return; }
        if (gt === 'lock') { toggleLock(el.getAttribute('data-kind'), el.getAttribute('data-group')); return; }
        if (el.classList.contains('group-item')) { clearTimeout(S.gt); selectGroup(el.getAttribute('data-kind'), el.getAttribute('data-group')); return; }
        activate(el);
      }
    });
    // LG Magic Remote pointer: moving it highlights what's under it (no tab/group switch until you click).
    // Driven by mousemove so content sliding under a still pointer never steals focus.
    document.addEventListener('mousemove', function (e) {
      if (Player.isOpen()) return;
      var el = closest(e.target, 'focusable');
      if (el && el !== Nav.current()) { S.hover = true; Nav.focus(el, true); S.hover = false; }
    });
    // Magic Remote scroll wheel: one notch = one move (rows up/down; sideways inside a row)
    var lastWheel = 0;
    window.addEventListener('wheel', function (e) {
      e.preventDefault();
      var now = Date.now();
      if (now - lastWheel < (Player.isOpen() ? 140 : 70)) return;
      lastWheel = now;
      var dx = e.deltaX, dy = e.deltaY;
      if (Player.isOpen()) { Player.wheel(dy > 0 ? 1 : -1, e.target); return; }
      var cur = Nav.current(), onNav = cur && cur.classList.contains('nav-item');
      if (Math.abs(dx) > Math.abs(dy)) { if (!onNav) Nav.move(dx > 0 ? 'left' : 'right'); return; }
      // The wheel only ever scrolls lists — it never touches the top tabs.
      // scroll whatever list is under the pointer; anywhere else scrolls the page's main list
      var sc = closest(e.target, 'scroller'), side = closest(e.target, 'groups'), wrap = closest(e.target, 'grid-wrap');
      if (!sc && side) sc = side.querySelector('.scroller');
      if (!sc && wrap) sc = wrap.querySelector('.scroller');
      if (!sc || !closest(sc, 'screen') || !closest(sc, 'screen').classList.contains('active')) sc = mainScroller();
      if (sc) wheelScroll(sc, dy > 0 ? 1 : -1);
    }, { passive: false });
    ['set-m3u', 'set-epg', 'set-xs', 'set-xu', 'set-xp', 'set-plname'].forEach(function (id) { $(id).addEventListener('input', function () { S.formsTouched = true; }); });
    $('search-input').addEventListener('input', function () { clearTimeout(S.st); S.st = setTimeout(runSearch, 300); });
    $('prof-name').addEventListener('input', function () { if (S.profAv == null) peFill(); });
    ['live', 'movies', 'shows'].forEach(function (k) {
      $('q-' + k).addEventListener('input', function () { clearTimeout(S.kst); S.kst = setTimeout(function () { kindSearch(k); }, 300); });
    });
    $('amodal').addEventListener('click', function (e) {
      e.stopPropagation();
      var kp = closest(e.target, 'kp'); if (kp && S.am) { amPress(kp.getAttribute('data-kp')); return; }
      var b = closest(e.target, 'btn'); if (b && S.am && b.hasAttribute('data-am')) S.am.btns[+b.getAttribute('data-am')].run();
    }, true);

    document.addEventListener('click', function (e) {
      if (!e.target.classList || !e.target.classList.contains('ks-clear')) return;
      var k = e.target.getAttribute('data-kind'); $('q-' + k).value = ''; kindSearch(k);
    }, true);
    Player.init();

    S.settings = rawLoad('settings', {});
    playIntroSound();
    initProfiles(); loadProfileData();
    S.intro = load('intro', {});
    migratePlaylists();
    var myPl0 = load('pl', null);
    if (myPl0 && myPl0 !== S.settings.activePl && plById(myPl0)) {          // this profile uses another playlist
      var pp = plById(myPl0); S.settings.activePl = myPl0;
      if (pp.type === 'xtream') { S.settings.xs = pp.xs; S.settings.xu = pp.xu; S.settings.xp = pp.xp; S.settings.api = true; }
      else { S.settings.api = false; S.settings.m3u = pp.m3u; S.settings.epg = pp.epg; }
      save('settings', S.settings);
    }
    applyTheme(S.settings.theme);
    document.addEventListener('webOSRelaunch', function (e) {
      if (Player.isOpen()) Player.close();
      applyParams(e && e.detail);
    });
    tick();
    setInterval(tick, 15000);
    setInterval(refreshLive, 60000);
    setTimeout(startData, 1150);        // let the logo animation run smoothly first; the heavy loading starts right after
  }
  function startData() {
    var cache = load('cache', null);
    if (applyParams(launchParams())) { /* credentials pushed from the computer */ }
    else if (S.settings.api && S.settings.xs) {
      if (cache && cache.cats && (cache.cats.live || []).length + (cache.cats.movies || []).length + (cache.cats.shows || []).length) {
        setCatalog(cache.cats, false); focusHome();
        var c = cache.cats;
        if (Date.now() - cache.t > 6 * 3600e3 || !(c.movies || []).length || !(c.shows || []).length) setTimeout(refreshCats, 3000);
      }
      else loadXtreamApi(false, true);
    }
    else if (S.settings.m3u) {
      if (cache && cache.list && cache.list.length && Date.now() - cache.t < 12 * 3600e3) {
        setChannels(cache.list, false); focusHome();
        if (S.settings.epg) loadEpg(S.settings.epg, true);
      } else {
        loadPlaylist(S.settings.m3u, S.settings.epg, true);
      }
    } else {
      loadDemo(); focusHome();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

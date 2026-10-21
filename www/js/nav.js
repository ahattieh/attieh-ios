/* Spatial navigation for TV remotes (geometry based, RTL safe, ES5). */
var Nav = (function () {
  var current = null, onFocus = null, base = 16, rtl = true;

  function rem(n) { return n * base; }
  function visible(el) { return el.getClientRects().length > 0; }
  function closest(el, cls) {
    while (el && el !== document) {
      if (el.classList && el.classList.contains(cls)) return el;
      el = el.parentNode;
    }
    return null;
  }
  function candidates() {
    var all = document.querySelectorAll('#topnav .focusable, .screen.active .focusable'), out = [];
    for (var i = 0; i < all.length; i++) if (visible(all[i])) out.push(all[i]);
    return out;
  }
  function gap(a1, a2, b1, b2) { if (a2 < b1) return b1 - a2; if (b2 < a1) return a1 - b2; return 0; }

  /* O(1) moves inside rails, grids, group lists and the top nav — no layout scan. */
  function fast(dir) {
    var c = current, p = c.parentNode;
    if (!rtl) dir = dir === 'left' ? 'right' : dir === 'right' ? 'left' : dir;   // DOM order runs the other way in LTR
    if (p.classList.contains('rail-track')) {
      if (dir === 'left') return { el: c.nextElementSibling };
      if (dir === 'right') return c.previousElementSibling ? { el: c.previousElementSibling } : null;   // first card: fall through to the side rail
      return null;
    }
    if (p.classList.contains('grid') && c.classList.contains('card')) {
      var kids = p.children, n = kids.length, i = Array.prototype.indexOf.call(kids, c), cols = 1;
      var top = kids[0].offsetTop;
      while (cols < n && kids[cols].offsetTop === top) cols++;
      var col = i % cols;
      if (dir === 'left') return { el: col < cols - 1 ? (kids[i + 1] || null) : null };
      if (dir === 'right') return col > 0 ? { el: kids[i - 1] } : null;
      if (dir === 'up') return i - cols >= 0 ? { el: kids[i - cols] } : null;
      if (i + cols < n) return { el: kids[i + cols] };
      return { el: Math.floor(i / cols) < Math.floor((n - 1) / cols) ? kids[n - 1] : null };
    }
    if (c.classList.contains('group-item')) {
      var sib = c;
      if (dir === 'up') { do { sib = sib.previousElementSibling; } while (sib && !sib.classList.contains('group-item')); return sib ? { el: sib } : null; }
      if (dir === 'down') { do { sib = sib.nextElementSibling; } while (sib && !sib.classList.contains('group-item')); return { el: sib }; }
      return null;
    }
    if (c.classList.contains('nav-item') && (dir === 'up' || dir === 'down')) {      // side rail: vertical
      var s = c;
      do { s = dir === 'down' ? s.nextElementSibling : s.previousElementSibling; } while (s && !visible(s));
      return s ? { el: s } : null;
    }
    return null;
  }

  function move(dir) {
    if (!current || !visible(current)) {
      var c = candidates(); if (c.length) focus(c[0]); return false;
    }
    var f = fast(dir);
    if (f) { if (f.el) focus(f.el); return !!f.el; }
    var r0 = current.getBoundingClientRect();
    var cx0 = (r0.left + r0.right) / 2, cy0 = (r0.top + r0.bottom) / 2;
    var list = candidates(), strict = null, ss = Infinity, loose = null, ls = Infinity;
    for (var i = 0; i < list.length; i++) {
      var el = list[i]; if (el === current) continue;
      var r = el.getBoundingClientRect();
      var cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, p, o, s, horiz = false;
      if (dir === 'left') { if (cx >= cx0 - 1) continue; p = Math.max(0, r0.left - r.right); o = gap(r.top, r.bottom, r0.top, r0.bottom); s = p + o * 3 + Math.abs(cy - cy0) * 0.2; horiz = true; }
      else if (dir === 'right') { if (cx <= cx0 + 1) continue; p = Math.max(0, r.left - r0.right); o = gap(r.top, r.bottom, r0.top, r0.bottom); s = p + o * 3 + Math.abs(cy - cy0) * 0.2; horiz = true; }
      else if (dir === 'up') { if (cy >= cy0 - 1) continue; p = Math.max(0, r0.top - r.bottom); o = gap(r.left, r.right, r0.left, r0.right); s = p + o * 1.5 + Math.abs(cx - cx0) * 0.4; }
      else { if (cy <= cy0 + 1) continue; p = Math.max(0, r.top - r0.bottom); o = gap(r.left, r.right, r0.left, r0.right); s = p + o * 1.5 + Math.abs(cx - cx0) * 0.4; }
      if (s < ls) { ls = s; loose = el; }
      if (!horiz || o < rem(2)) { if (s < ss) { ss = s; strict = el; } }
    }
    var best = strict || loose;
    if (best) focus(best);
    return !!best;
  }

  function offsetWithin(el, anc) {
    var t = 0;
    while (el && el !== anc) { t += el.offsetTop; el = el.offsetParent; }
    return t;
  }

  function ensureVisible(el) {
    var track = closest(el, 'rail-track');
    if (track) {
      var vp = track.parentNode, pad = rem(4), W = vp.clientWidth, tx = track._tx || 0;
      var x = track.offsetLeft + el.offsetLeft + tx, w = el.offsetWidth;
      if (x < pad) tx += pad - x;
      else if (x + w > W - pad) tx -= (x + w) - (W - pad);
      if (rtl ? tx < 0 : tx > 0) tx = 0;
      track._tx = tx; track.style.transform = 'translate3d(' + tx + 'px,0,0)';
    }
    var sc = closest(el, 'scroller');
    if (sc) {
      var vp2 = sc.parentNode, H = vp2.clientHeight, ty = sc._ty || 0;
      var padT = rem(+(sc.getAttribute('data-pad-top') || 0));
      var padB = rem(+(sc.getAttribute('data-pad-bottom') || 0));
      if (closest(el, 'hero')) ty = 0;
      else {
        var target = closest(el, 'rail') || el;
        var y = offsetWithin(target, sc) + ty, h = target.offsetHeight;
        if (y < padT) ty += padT - y;
        else if (y + h > H - padB) ty -= (y + h) - (H - padB);
        if (ty > 0) ty = 0;
      }
      sc._ty = ty; sc.style.transform = 'translate3d(0,' + ty + 'px,0)';
    }
  }

  function focus(el, noScroll) {
    if (!el) return;
    if (current && current !== el) current.classList.remove('focused');
    current = el;
    el.classList.add('focused');
    if (!noScroll) ensureVisible(el);
    if (onFocus) onFocus(el);
  }

  return {
    move: move,
    focus: focus,
    rem: rem,
    current: function () { return current; },
    closest: closest,
    setBase: function (b) { base = b; },
    setRtl: function (v) { rtl = !!v; },
    setOnFocus: function (f) { onFocus = f; },
    resetScroll: function (sc) { if (sc) { sc._ty = 0; sc.style.transform = ''; } }
  };
})();

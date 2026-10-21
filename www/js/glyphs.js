/* Amira IPTV — the TV's fonts are missing many symbols/emoji (they show as ☒ boxes).
   Every such symbol in the interface is swapped for a small drawn icon, wherever and whenever it appears. */
var Glyphs = (function () {
  var P = {
    '🔒': 'M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6zm3 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
    '🔓': 'M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6-9h-1V6a5 5 0 0 0-9.9-1l1.9.6A3 3 0 0 1 15 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z',
    '👁': 'M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    '📺': 'M21 6h-7.6l3.3-3.3-.7-.7L12 6 8 2l-.7.7L10.6 6H3a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm0 13H3V8h18v11z',
    '👶': 'M9 11.8a1.3 1.3 0 1 0 0 2.5 1.3 1.3 0 0 0 0-2.5zm6 0a1.3 1.3 0 1 0 0 2.5 1.3 1.3 0 0 0 0-2.5zM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 0 1-8-8v-.9a10 10 0 0 0 5.2-5.4A10 10 0 0 0 17.4 9c.9 0 1.7-.1 2.5-.3.1.4.1.9.1 1.3a8 8 0 0 1-8 10z',
    '📅': 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V9h14v11zM7 11h5v5H7z',
    '😴': 'M12 3a9 9 0 1 0 9 9c0-.5 0-1-.1-1.4A5.5 5.5 0 0 1 12.4 3.1L12 3z',
    '🎬': 'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V4h-4z',
    '🎞': 'M4 6H2v14a2 2 0 0 0 2 2h14v-2H4V6zm16-4H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-8 12.5v-9l6 4.5-6 4.5z',
    '🗑': 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    '⚙': 'M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.3 7.3 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.7a7.6 7.6 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.4a.5.5 0 0 0 .1.6L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6a.5.5 0 0 0-.1.6l2 3.5a.5.5 0 0 0 .6.2l2.5-1a7.3 7.3 0 0 0 1.7 1l.4 2.6a.5.5 0 0 0 .5.4h4a.5.5 0 0 0 .5-.4l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.5 1a.5.5 0 0 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
    '⚡': 'M7 2v11h3v9l7-12h-4l4-8z',
    '✂': 'M9.6 7.6A4 4 0 1 0 6 10c.6 0 1.1-.1 1.6-.4L10 12l-2.4 2.4A4 4 0 1 0 10 18c0-.6-.1-1.1-.4-1.6L12 14l7 7h3v-1L9.6 7.6zM6 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM19 3l-6 6 2 2 7-7V3z',
    '⏭': 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
    '⏪': 'M11 18V6l-8.5 6 8.5 6zm.5-6 8.5 6V6l-8.5 6z',
    '⏩': 'M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z',
    '✕': 'M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z',
    '✓': 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
    '☆': 'M22 9.2l-7.2-.6L12 2 9.2 8.6 2 9.2l5.5 4.7L5.8 21 12 17.3 18.2 21l-1.6-7.1L22 9.2zM12 15.4l-3.8 2.3 1-4.3-3.3-2.9 4.4-.4L12 6.1l1.7 4 4.4.4-3.3 2.9 1 4.3-3.8-2.3z',
    '★': 'M12 17.3 18.2 21l-1.6-7 5.4-4.7-7.2-.6L12 2 9.2 8.7 2 9.3l5.4 4.7L5.8 21z',
    '❚': 'M9 5h5v14H9z',
    '→': 'M12 4l-1.4 1.4 5.6 5.6H4v2h12.2l-5.6 5.6L12 20l8-8z',
    '←': 'M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z',
    '▲': 'M12 6 4 18h16z', '▼': 'M12 18 4 6h16z', '◀': 'M6 12 18 4v16z', '▶': 'M18 12 6 4v16z', '▾': 'M12 16 6 9h12z', '▸': 'M16 12 9 6v12z',
    '●': 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z'
  };
  var NEW = '🆕';
  var keys = Object.keys(P).concat([NEW]);
  /* any other emoji / pictograph (often inside provider category or title names) can't be drawn either — it is dropped */
  var OTHER = '[\u2190-\u21FF\u2300-\u23FF\u2460-\u24FF\u25A0-\u25FF\u2600-\u27BF\u2900-\u297F\u2B00-\u2BFF\u3030\u303D\u3297\u3299\uFE0E\uFE0F\u20E3]|[\uD83C-\uD83E][\uDC00-\uDFFF]';
  var RE = new RegExp('(' + keys.join('|') + ')|' + OTHER);
  var REG = new RegExp('(' + keys.join('|') + ')|' + OTHER, 'g');
  var STRIP = new RegExp('(' + keys.join('|') + ')\\s?', 'g');
  var NO = /^(SCRIPT|STYLE|TEXTAREA|INPUT|svg|SVG|path|OPTION|TITLE)$/;

  function icon(ch) {
    if (ch === NEW) return '<b class="gl-new">NEW</b>';
    return '<svg class="gl" viewBox="0 0 24 24" fill="currentColor"><path d="' + P[ch] + '"/></svg>';
  }
  function html(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }).replace(REG, function (m) { return P[m] || m === NEW ? icon(m) : ''; }).replace(/\u200D/g, ''); }
  function fix(n) {
    var v = n.nodeValue, p = n.parentNode;
    if (!v || !p || !RE.test(v) || NO.test(p.nodeName) || p.namespaceURI === 'http://www.w3.org/2000/svg') return;
    var span = document.createElement('span');
    span.className = 'gl-t';
    span.innerHTML = html(v);
    var f = document.createDocumentFragment();
    while (span.firstChild) f.appendChild(span.firstChild);
    p.replaceChild(f, n);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { fix(root); return; }
    if (root.nodeType !== 1 || NO.test(root.nodeName)) return;
    var tw = document.createTreeWalker(root, 4, null, false), n, list = [];
    while ((n = tw.nextNode())) if (RE.test(n.nodeValue)) list.push(n);
    for (var i = 0; i < list.length; i++) fix(list[i]);
  }
  function start() {
    walk(document.body);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') fix(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  /* text without the symbols — used by the translator to match phrases once their icons were swapped out */
  function strip(s) { return String(s).replace(STRIP, '').trim(); }
  return { start: start, strip: strip, html: html };
})();

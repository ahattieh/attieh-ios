/* Amira IPTV — profile avatars, drawn as small SVGs (no image files needed) */
var Avatars = (function () {
  var BG = [['#ff5f6d', '#ffc371'], ['#36d1dc', '#5b86e5'], ['#a18cd1', '#fbc2eb'], ['#11998e', '#38ef7d'], ['#f857a6', '#ff5858'],
            ['#4776e6', '#8e54e9'], ['#f7971e', '#ffd200'], ['#00c6ff', '#0072ff'], ['#ee0979', '#ff6a00'], ['#7f00ff', '#e100ff']];
  var SKIN = ['#f8d5bd', '#eab38e', '#cf9268', '#a06842', '#704629'];
  var HAIR = ['#2b1d16', '#5a3a22', '#a8562a', '#e0a940', '#151515', '#d6d6d6'];
  var SHIRT = ['#1f2a44', '#ffffff', '#2fd18b', '#ff4d6d', '#ffd23f', '#3a86ff', '#8338ec', '#fb5607'];
  var WRAP = ['#1d3557', '#e63946', '#2a9d8f', '#6d597a', '#f4a261', '#264653'];
  var COUNT = 36, cache = {};

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function c(v) { return Math.max(0, Math.min(255, Math.round(v * f))); }
    return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }
  function svg(i) {
    i = ((i % COUNT) + COUNT) % COUNT;
    var bg = BG[i % BG.length], skin = SKIN[(i * 3 + 1) % SKIN.length], hc = HAIR[(i * 5 + 2) % HAIR.length],
        shirt = SHIRT[(i * 7 + 3) % SHIRT.length], st = i % 9, wrap = WRAP[(i * 5) % WRAP.length];
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>' +
      '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + bg[0] + '"/><stop offset="1" stop-color="' + bg[1] + '"/></linearGradient>' +
      '<clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#c)">' +
      '<rect width="100" height="100" fill="url(#g)"/>';
    // confetti
    for (var k = 0; k < 7; k++) {
      var x = (k * 37 + i * 13) % 92 + 4, y = (k * 23 + i * 29) % 40 + 4, r = (k * 47 + i * 11) % 180;
      o += '<rect x="' + x + '" y="' + y + '" width="7" height="3" rx="1.5" fill="#fff" opacity=".22" transform="rotate(' + r + ' ' + x + ' ' + y + ')"/>';
    }
    var hijab = st === 5;
    // behind-the-head hair / wrap
    if (st === 1) o += '<path d="M29 48 Q27 19 50 19 Q73 19 71 48 L73 80 Q61 72 59 62 L41 62 Q39 72 27 80 Z" fill="' + hc + '"/>';
    if (st === 3) { for (var a = 0; a < 12; a++) { var an = Math.PI * (0.95 + a * 1.1 / 11); o += '<circle cx="' + (50 + 20 * Math.cos(an)).toFixed(1) + '" cy="' + (42 + 20 * Math.sin(an)).toFixed(1) + '" r="8" fill="' + hc + '"/>'; } }
    if (st === 7) o += '<path d="M30 52 Q27 20 50 20 Q73 20 70 52 L70 62 Q64 60 64 50 L36 50 Q36 60 30 62 Z" fill="' + hc + '"/>';
    if (hijab) o += '<path d="M24 100 Q22 64 29 45 Q31 16 50 16 Q69 16 71 45 Q78 64 76 100 Z" fill="' + wrap + '"/>';
    // shirt + neck
    if (!hijab) {
      o += '<path d="M14 100 Q16 74 50 72 Q84 74 86 100 Z" fill="' + shirt + '"/>' +
           '<path d="M42 72 Q50 80 58 72" fill="none" stroke="' + shade(shirt.length === 7 ? shirt : '#888888', .8) + '" stroke-width="2"/>' +
           '<rect x="44" y="60" width="12" height="13" rx="4" fill="' + shade(skin, .9) + '"/>';
    }
    // ears + head
    var hx = hijab ? 14.5 : 17, hy = hijab ? 17.5 : 20;
    if (!hijab) o += '<circle cx="33" cy="48" r="3.6" fill="' + shade(skin, .93) + '"/><circle cx="67" cy="48" r="3.6" fill="' + shade(skin, .93) + '"/>';
    o += '<ellipse cx="50" cy="' + (hijab ? 48 : 46) + '" rx="' + hx + '" ry="' + hy + '" fill="' + skin + '"/>';
    if (hijab) o += '<path d="M35 40 Q37 27 50 27 Q63 27 65 40 Q60 32 50 32 Q40 32 35 40 Z" fill="' + shade(wrap, .8) + '"/>';
    // hair on top
    if (st === 0 || st === 4 || st === 8) o += '<path d="M33 44 Q31 22 50 22 Q69 22 67 44 Q64 31 50 31 Q37 31 33 44 Z" fill="' + hc + '"/>';
    if (st === 1) o += '<path d="M33 42 Q34 23 50 23 Q66 23 67 42 Q58 30 44 34 Q38 36 33 42 Z" fill="' + hc + '"/>';
    if (st === 2) o += '<circle cx="50" cy="20" r="8" fill="' + hc + '"/><path d="M33 43 Q32 24 50 24 Q68 24 67 43 Q62 32 50 32 Q38 32 33 43 Z" fill="' + hc + '"/>';
    if (st === 3) o += '<path d="M34 40 Q36 28 50 28 Q64 28 66 40 Q58 33 50 34 Q42 33 34 40 Z" fill="' + hc + '"/>';
    if (st === 7) o += '<path d="M33 46 Q31 23 50 23 Q69 23 67 46 Q60 33 48 33 Q38 35 33 46 Z" fill="' + hc + '"/>';
    if (st === 8) o += '<path d="M31 37 Q32 18 50 18 Q68 18 69 37 Z" fill="' + shirt + '"/><path d="M48 35 L82 37 Q80 42 66 40 Z" fill="' + shade(shirt.length === 7 ? shirt : '#888888', .75) + '"/>';
    // beard
    if (st === 4 || st === 6) o += '<path d="M33 48 Q34 71 50 71 Q66 71 67 48 Q63 58 50 58 Q37 58 33 48 Z" fill="' + hc + '"/>';
    if (st === 6) o += '<path d="M36 33 Q50 24 64 33" fill="none" stroke="' + shade(skin, .85) + '" stroke-width="2" opacity=".6"/>';
    // face
    var ey = hijab ? 48 : 47;
    o += '<path d="M40 ' + (ey - 5) + ' Q43 ' + (ey - 7) + ' 46 ' + (ey - 5) + ' M54 ' + (ey - 5) + ' Q57 ' + (ey - 7) + ' 60 ' + (ey - 5) + '" fill="none" stroke="' + (hijab ? '#3a2a20' : hc) + '" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle cx="43" cy="' + ey + '" r="1.9" fill="#2a1a12"/><circle cx="57" cy="' + ey + '" r="1.9" fill="#2a1a12"/>' +
      '<circle cx="39" cy="' + (ey + 6) + '" r="3" fill="#ff7a7a" opacity=".22"/><circle cx="61" cy="' + (ey + 6) + '" r="3" fill="#ff7a7a" opacity=".22"/>' +
      '<path d="M44 ' + (ey + 9) + ' Q50 ' + (ey + 14) + ' 56 ' + (ey + 9) + '" fill="' + (st === 4 || st === 6 ? '#fff' : 'none') + '" stroke="#7a3b2b" stroke-width="1.6" stroke-linecap="round"/>';
    o += '</g></svg>';
    return o;
  }
  function url(i) {
    if (!cache[i]) cache[i] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(i));
    return cache[i];
  }
  return { count: COUNT, url: url };
})();

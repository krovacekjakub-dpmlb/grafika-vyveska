/* DPMLB – výlukové vývěsky
 * Minimální generátor QR kódu (bajtový režim, úroveň opravy M, verze 1–10) bez externích závislostí.
 * Postup podle ISO/IEC 18004; výstupem je vektorové SVG.
 */
(function () {
  'use strict';
  const DP = window.DP;

  // [celkový počet kódových slov, EC slov na blok, [[počet bloků, datových slov v bloku], …]] pro úroveň M
  const TABLE = {
    1: [26, 10, [[1, 16]]],
    2: [44, 16, [[1, 28]]],
    3: [70, 26, [[1, 44]]],
    4: [100, 18, [[2, 32]]],
    5: [134, 24, [[2, 43]]],
    6: [172, 16, [[4, 27]]],
    7: [196, 18, [[4, 31]]],
    8: [242, 22, [[2, 38], [2, 39]]],
    9: [292, 22, [[3, 36], [2, 37]]],
    10: [346, 26, [[4, 43], [1, 44]]],
  };
  const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };

  function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
  }
  function rsDivisor(degree) {
    const r = new Array(degree).fill(0);
    r[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < r.length; j++) {
        r[j] = gfMul(r[j], root);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return r;
  }
  function rsRemainder(data, div) {
    const res = new Array(div.length).fill(0);
    for (const b of data) {
      const f = b ^ res.shift();
      res.push(0);
      for (let i = 0; i < res.length; i++) res[i] ^= gfMul(div[i], f);
    }
    return res;
  }

  function utf8(str) {
    return Array.from(unescape(encodeURIComponent(str))).map((c) => c.charCodeAt(0));
  }

  DP.qrMatrix = function (text) {
    const bytes = utf8(text);
    let ver = 0;
    for (let v = 1; v <= 10; v++) {
      const dataCap = TABLE[v][2].reduce((a, g) => a + g[0] * g[1], 0);
      const bits = 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
      if (bits <= dataCap * 8) {
        ver = v;
        break;
      }
    }
    if (!ver) throw new Error('Text pro QR kód je příliš dlouhý.');
    const [, ecLen, groups] = TABLE[ver];
    const dataCap = groups.reduce((a, g) => a + g[0] * g[1], 0);

    // bitový proud
    const bb = [];
    const put = (val, len) => {
      for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
    };
    put(0b0100, 4);
    put(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach((b) => put(b, 8));
    put(0, Math.min(4, dataCap * 8 - bb.length));
    while (bb.length % 8) bb.push(0);
    const data = [];
    for (let i = 0; i < bb.length; i += 8) data.push(parseInt(bb.slice(i, i + 8).join(''), 2));
    for (let pad = 0xec; data.length < dataCap; pad ^= 0xec ^ 0x11) data.push(pad);

    // bloky + EC
    const div = rsDivisor(ecLen);
    const blocks = [];
    let k = 0;
    groups.forEach(([n, len]) => {
      for (let i = 0; i < n; i++) {
        const d = data.slice(k, k + len);
        k += len;
        blocks.push({ d, e: rsRemainder(d, div) });
      }
    });
    const final = [];
    const maxD = Math.max(...blocks.map((b) => b.d.length));
    for (let i = 0; i < maxD; i++) blocks.forEach((b) => i < b.d.length && final.push(b.d[i]));
    for (let i = 0; i < ecLen; i++) blocks.forEach((b) => final.push(b.e[i]));

    // matice
    const size = ver * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, dark) => {
      m[y][x] = !!dark;
      fn[y][x] = true;
    };
    for (let i = 0; i < size; i++) {
      set(6, i, i % 2 === 0);
      set(i, 6, i % 2 === 0);
    }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const x = cx + dx,
            y = cy + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          set(x, y, d !== 2 && d !== 4);
        }
    };
    finder(3, 3);
    finder(size - 4, 3);
    finder(3, size - 4);
    const al = ALIGN[ver];
    al.forEach((ay, i) =>
      al.forEach((ax, j) => {
        const last = al.length - 1;
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      })
    );
    const drawFormat = (mask) => {
      const d = (0 << 3) | mask; // úroveň M = 00
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const bits = ((d << 10) | r) ^ 0x5412;
      const b = (i) => (bits >>> i) & 1;
      for (let i = 0; i <= 5; i++) set(8, i, b(i));
      set(8, 7, b(6));
      set(8, 8, b(7));
      set(7, 8, b(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, b(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, b(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, b(i));
      set(8, size - 8, 1);
    };
    drawFormat(0); // rezervace
    if (ver >= 7) {
      let r = ver;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const bits = (ver << 12) | r;
      for (let i = 0; i < 18; i++) {
        const bit = (bits >>> i) & 1;
        const a = size - 11 + (i % 3),
          b = Math.floor(i / 3);
        set(a, b, bit);
        set(b, a, bit);
      }
    }
    // data
    let bi = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++)
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const up = ((right + 1) & 2) === 0;
          const y = up ? size - 1 - vert : vert;
          if (!fn[y][x] && bi < final.length * 8) {
            m[y][x] = ((final[bi >>> 3] >>> (7 - (bi & 7))) & 1) === 1;
            bi++;
          }
        }
    }
    const maskFn = [
      (x, y) => (x + y) % 2 === 0,
      (x, y) => y % 2 === 0,
      (x) => x % 3 === 0,
      (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
      (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
      (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
      (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
    ];
    const applyMask = (k) => {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && maskFn[k](x, y)) m[y][x] = !m[y][x];
    };
    const penalty = () => {
      let p = 0;
      const line = (get) => {
        for (let a = 0; a < size; a++) {
          let run = 1;
          for (let b = 1; b < size; b++) {
            if (get(a, b) === get(a, b - 1)) {
              run++;
              if (run === 5) p += 3;
              else if (run > 5) p++;
            } else run = 1;
          }
          for (let b = 0; b + 10 < size; b++) {
            const s = [];
            for (let t = 0; t < 11; t++) s.push(get(a, b + t) ? 1 : 0);
            const str = s.join('');
            if (str === '10111010000' || str === '00001011101') p += 40;
          }
        }
      };
      line((a, b) => m[a][b]);
      line((a, b) => m[b][a]);
      let dark = 0;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          if (m[y][x]) dark++;
          if (x < size - 1 && y < size - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
        }
      p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
      return p;
    };
    let best = 0,
      bestP = Infinity;
    for (let k2 = 0; k2 < 8; k2++) {
      applyMask(k2);
      drawFormat(k2);
      const pp = penalty();
      if (pp < bestP) {
        bestP = pp;
        best = k2;
      }
      applyMask(k2);
    }
    applyMask(best);
    drawFormat(best);
    return m;
  };

  /** SVG QR kódu (bez tiché zóny – tu řeší rozvržení) */
  DP.qrSvg = function (text, color) {
    let m;
    try {
      m = DP.qrMatrix(text);
    } catch (e) {
      return '';
    }
    const n = m.length;
    let d = '';
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) if (m[y][x]) d += `M${x} ${y}h1v1h-1z`;
    return `<svg class="qr" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" aria-label="QR kód: ${DP.esc(text)}"><path fill="${color || '#274C77'}" d="${d}"/></svg>`;
  };
})();

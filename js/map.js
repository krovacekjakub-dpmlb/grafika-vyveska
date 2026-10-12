/* DPMLB – výlukové vývěsky
 * Grafické symboly (označník zastávky, výstražný trojúhelník) a vykreslení mapek do SVG.
 *
 * Souřadnice mapky: viewBox 0 0 1381.5 1021.1 = rozměr mapového pole předlohy (138,15 × 102,11 mm v A5),
 * 1 jednotka = 0,1 mm v měřítku předlohy. Ve větších formátech se celé SVG jen zvětší.
 */
(function () {
  'use strict';
  const DP = window.DP;

  const C = (DP.COLORS = {
    orange: '#EF7C00',
    red: '#D6130E',
    blue: '#274C77',
    panel: '#EBEBEB',
    watermark: '#F0F0F0',
    grey: '#A3AFBC',
    greyLine: '#9AA6B2',
    road: '#B6C2CE',
    cream: '#FAF3D7',
  });
  const MW = (DP.MAP_W = 1381.5);
  const MH = (DP.MAP_H = 1021.1);
  const esc = DP.esc;
  const r1 = (n) => Math.round(n * 10) / 10;

  /* ---------- Symboly ---------- */

  /** Piktogram autobusu (24×24) */
  function busIcon(color) {
    return (
      `<rect x="5" y="3" width="14" height="16" rx="2.6" fill="${color}"/>` +
      `<rect x="7.1" y="6.1" width="9.8" height="6.4" rx="1" fill="#fff"/>` +
      `<rect x="8.4" y="4.2" width="7.2" height="0.9" rx="0.45" fill="#fff"/>` +
      `<circle cx="8.6" cy="15.6" r="1.15" fill="#fff"/><circle cx="15.4" cy="15.6" r="1.15" fill="#fff"/>` +
      `<rect x="6.6" y="18.2" width="2.6" height="2.6" rx="0.7" fill="${color}"/><rect x="14.8" y="18.2" width="2.6" height="2.6" rx="0.7" fill="${color}"/>` +
      `<path d="M5 7.2H3.9V10.6M19 7.2h1.1V10.6" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round"/>`
    );
  }

  function arrowGlyph(dir, color) {
    // vnitřní šipka v rámečku 26×18 se středem v 0,0
    const d = dir === 'right' ? 'M-7 0H6M1.5-4.5L6 0L1.5 4.5' : 'M7 0H-6M-1.5-4.5L-6 0L-1.5 4.5';
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  /**
   * Označník zastávky. (x,y) = pata sloupku. Výška 185 (18,5 mm), hlava 86 × 86.
   * opts: color, arrow ('left'|'right'|null), cancelled (šedý + červený křížek), faded
   */
  DP.signSvg = function (x, y, opts) {
    const col = opts.cancelled || opts.faded ? C.grey : opts.color;
    const op = opts.cancelled || opts.faded ? ' opacity="0.9"' : '';
    let s = `<g class="sign" transform="translate(${r1(x)} ${r1(y)})"${opts.attrs || ''}>`;
    s += `<g${op}>`;
    s += `<rect x="-5" y="-100" width="10" height="100" fill="${col}"/>`;
    s += `<rect x="-43" y="-185" width="86" height="86" rx="11" fill="${col}"/>`;
    s += `<rect x="-31" y="-173" width="62" height="62" rx="7" fill="#fff"/>`;
    s += `<g transform="translate(0 -142) scale(2.3) translate(-12 -12)">${busIcon(col)}</g>`;
    if (opts.arrow === 'left' || opts.arrow === 'right') {
      s += `<rect x="-18" y="-89" width="36" height="28" rx="4.5" fill="${col}"/>`;
      s += `<rect x="-14" y="-85" width="28" height="20" rx="2.6" fill="#fff"/>`;
      s += `<g transform="translate(0 -75)">${arrowGlyph(opts.arrow, col)}</g>`;
    }
    s += '</g>';
    if (opts.cancelled) {
      s += `<path d="M-60 -190L62 -95M62 -190L-60 -95" stroke="${C.red}" stroke-width="11" stroke-linecap="butt"/>`;
    }
    // neviditelná plocha pro uchopení myší v editoru
    s += `<rect class="hit" x="-50" y="-195" width="100" height="200" fill="transparent"/>`;
    s += '</g>';
    return s;
  };

  /** Bílý výstražný trojúhelník do záhlaví (viewBox 0 0 100 85) */
  DP.headerTriangleSvg = function (color) {
    return (
      `<svg class="p-warn" viewBox="0 0 100 85" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path d="M50 6 L94 79 L6 79 Z" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round"/>` +
      `<path d="M45.2 27h9.6l-1.6 30h-6.4z" fill="${color}" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="67.5" r="5.4" fill="${color}"/></svg>`
    );
  };

  /** Velký světlý trojúhelník v panelu „Popis změny“ */
  DP.watermarkSvg = function () {
    return (
      `<svg class="p-watermark" viewBox="0 0 100 84.5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<path d="M50 6 L94.5 79 L5.5 79 Z" fill="${C.watermark}" stroke="${C.watermark}" stroke-width="11" stroke-linejoin="round"/>` +
      `<path d="M44.6 28.5h10.8l-2.4 30.5h-6z" fill="${C.panel}" stroke="${C.panel}" stroke-width="2" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="68.2" r="5.3" fill="${C.panel}"/></svg>`
    );
  };

  /* ---------- Pomocné: popisky jako HTML vrstva nad SVG ---------- */

  function labelHtml(text, cls, ax, ay, side, stopId) {
    const tr = { left: 'translate(-100%,0)', right: 'translate(0,0)', below: 'translate(-50%,0)', above: 'translate(-50%,-100%)' }[side];
    return (
      `<div class="m-label ${cls} side-${side}" data-stop="${esc(stopId || '')}" style="left:${r1((ax / MW) * 100)}%;top:${r1((ay / MH) * 100)}%;transform:${tr}">` +
      esc(text).replace(/\n/g, '<br>') +
      `</div>`
    );
  }

  function labelClass(kind) {
    if (kind === 'zrusena') return 'lbl-red';
    if (DP.isNewKind(kind)) return 'lbl-orange';
    if (kind === 'puvodni') return 'lbl-grey';
    return 'lbl-note';
  }

  /** Umístění popisku vůči označníku s patou v (x,y) */
  function labelAnchor(x, y, side, kind) {
    const top = y - 185;
    switch (side) {
      case 'left':
        return [x - 57, top + 1];
      case 'right':
        return [x + (kind === 'zrusena' ? 52 : 57), top + 5];
      case 'above':
        return [x, top - 10];
      default:
        return [x, y + 13];
    }
  }

  function autoSide(s) {
    if (s.labelSide && s.labelSide !== 'auto') return s.labelSide;
    if (s.kind === 'zrusena' || s.kind === 'puvodni') return 'right';
    if (DP.isNewKind(s.kind)) return 'left';
    return 'below';
  }

  function signOpts(s, arrowAuto) {
    const arrow = s.arrow === 'auto' ? arrowAuto : s.arrow === 'none' ? null : s.arrow;
    return {
      color: DP.isNewKind(s.kind) ? C.orange : C.blue,
      cancelled: s.kind === 'zrusena',
      faded: s.kind === 'puvodni',
      arrow,
      attrs: ` data-stop="${esc(s.id)}"`,
    };
  }

  function moveArrow(x1, y1, x2, y2, label) {
    const dir = x2 > x1 ? 1 : -1;
    const ax1 = x1 + dir * 58,
      ax2 = x2 - dir * 58;
    let s = `<path d="M${r1(ax1)} ${r1(y1)}H${r1(ax2 - dir * 4)}" stroke="${C.orange}" stroke-width="7" stroke-dasharray="16 11" fill="none"/>`;
    s += `<path d="M${r1(ax2 - dir * 26)} ${r1(y1 - 15)}L${r1(ax2)} ${r1(y1)}L${r1(ax2 - dir * 26)} ${r1(y1 + 15)}Z" fill="${C.orange}"/>`;
    if (label) s += `<text x="${r1((ax1 + ax2) / 2)}" y="${r1(y1 - 16)}" class="m-dist" text-anchor="middle">${esc(label)}</text>`;
    return s;
  }

  /* ---------- 1) Podkladová mapa + značky ---------- */
  function renderBackground(p) {
    const stops = p.stops.filter((s) => s.showOnMap !== false);
    const dirs = Array.from(new Set(stops.map((s) => s.direction.trim()).filter(Boolean)));
    const arrowAuto = (s) => (dirs.indexOf(s.direction.trim()) === 1 ? 'right' : 'left');
    let svg = `<image href="${esc(p.map.image)}" x="0" y="0" width="${MW}" height="${MH}" preserveAspectRatio="xMidYMid slice"/>`;
    let html = '';
    // výchozí poloha značek bez souřadnic – rozestavit doprostřed, aby šly přetáhnout
    const pos = (s, i) => s.pos || { x: 0.3 + 0.12 * (i % 4), y: 0.45 + 0.16 * Math.floor(i / 4), missing: true };
    const order = stops.map((s, i) => ({ s, i })).sort((a, b) => (DP.isOrigKind(b.s.kind) ? 1 : 0) - (DP.isOrigKind(a.s.kind) ? 1 : 0));
    if (p.map.showMoveArrow) {
      stops.forEach((n, i) => {
        if (!DP.isNewKind(n.kind) || !n.pairId) return;
        const oi = stops.findIndex((x) => x.id === n.pairId);
        if (oi < 0) return;
        const a = pos(stops[oi], oi),
          b = pos(n, i);
        svg += moveArrow(a.x * MW, a.y * MH - 30, b.x * MW, b.y * MH - 30, n.distance.trim());
      });
    }
    order.forEach(({ s, i }) => {
      const P = pos(s, i);
      const x = P.x * MW,
        y = P.y * MH;
      svg += DP.signSvg(x, y, signOpts(s, arrowAuto(s)));
      if (P.missing) svg += `<circle cx="${r1(x)}" cy="${r1(y)}" r="16" fill="none" stroke="${C.red}" stroke-width="4" stroke-dasharray="6 5" class="editor-only"/>`;
      const side = autoSide(s);
      const txt = DP.mapLabel(p, s);
      if (side !== 'none' && txt) {
        const [ax, ay] = labelAnchor(x, y, side, s.kind);
        html += labelHtml(txt, labelClass(s.kind), ax, ay, side, s.id);
      }
    });
    return { svg, html };
  }

  /* ---------- 2) Schéma přesunu zastávky (bez podkladové mapy) ---------- */
  function renderStopScheme(p) {
    const stops = p.stops.filter((s) => s.showOnMap !== false);
    const dirs = Array.from(new Set(stops.map((s) => s.direction.trim()).filter(Boolean)));
    const sideOf = (s) => (dirs.length > 1 && s.direction.trim() === dirs[1] ? 'bottom' : 'top'); // nahoře jízda doleva, dole doprava
    const ROAD_Y = 545,
      ROAD_H = 96;
    const roadTop = ROAD_Y - ROAD_H / 2,
      roadBot = ROAD_Y + ROAD_H / 2;
    let svg = `<rect x="0" y="0" width="${MW}" height="${MH}" fill="${C.cream}"/>`;
    svg += `<rect x="0" y="${roadTop}" width="${MW}" height="${ROAD_H}" fill="${C.road}"/>`;
    svg += `<path d="M0 ${ROAD_Y}H${MW}" stroke="#fff" stroke-width="4" stroke-dasharray="40 30"/>`;

    // stanoviště (sites): skupina původní + náhradní / samostatná zastávka
    const byId = {};
    stops.forEach((s) => (byId[s.id] = s));
    const sites = [];
    const siteOf = {};
    stops.forEach((s) => {
      if (DP.isOrigKind(s.kind)) {
        const site = { name: s.name.trim(), orig: s, news: [], others: [] };
        sites.push(site);
        siteOf[s.id] = site;
      }
    });
    stops.forEach((s) => {
      if (DP.isNewKind(s.kind)) {
        const site = s.pairId && siteOf[s.pairId];
        if (site) site.news.push(s);
        else sites.push({ name: s.name.trim(), orig: null, news: [s], others: [] });
      }
    });
    stops.forEach((s) => {
      if (DP.KINDS[s.kind].route === 'both') {
        const site = sites.find((x) => x.name && x.name === s.name.trim());
        if (site) site.others.push(s);
        else sites.push({ name: s.name.trim(), orig: null, news: [], others: [s] });
      }
    });

    let html = '';
    const n = sites.length || 1;
    const slotW = MW / n;
    const OFF = Math.min(330, slotW * 0.55);
    const yTop = roadTop - 10; // pata označníku nad silnicí
    const yBot = roadBot + 20 + 185; // označník pod silnicí
    const names = Array.from(new Set(sites.map((s) => s.name).filter(Boolean)));

    sites.forEach((site, i) => {
      const cx = slotW * (i + 0.5);
      const anchorSide = site.orig ? sideOf(site.orig) : site.news[0] ? sideOf(site.news[0]) : sideOf(site.others[0]);
      const travel = anchorSide === 'top' ? -1 : 1;
      const placed = [];
      if (site.orig) {
        const nw = site.news[0];
        const sh = nw ? (nw.shift === 'pred' ? -1 : 1) * travel : 0;
        const xo = cx - (sh * OFF) / 2;
        placed.push({ s: site.orig, x: xo });
        site.news.forEach((nn, k) => {
          const sh2 = (nn.shift === 'pred' ? -1 : 1) * travel;
          placed.push({ s: nn, x: xo + sh2 * OFF * (k + 1), from: xo });
        });
      } else {
        site.news.forEach((nn, k) => placed.push({ s: nn, x: cx + (k - (site.news.length - 1) / 2) * OFF }));
      }
      site.others.forEach((o, k) => {
        const sameSide = placed.some((q) => sideOf(q.s) === sideOf(o));
        placed.push({ s: o, x: (placed.length ? placed[0].x : cx) + (sameSide ? (k + 1) * 160 : 0) });
      });
      placed.forEach((q) => {
        const side = sideOf(q.s);
        const y = side === 'top' ? yTop : yBot;
        const arrow = q.s.arrow === 'auto' ? (side === 'top' ? 'left' : 'right') : q.s.arrow === 'none' ? null : q.s.arrow;
        const o = signOpts(q.s, arrow);
        o.arrow = arrow;
        if (q.from != null) svg += moveArrow(q.from, y - 32, q.x, y - 32, q.s.distance.trim());
        svg += DP.signSvg(q.x, y, o);
        let ls = q.s.labelSide && q.s.labelSide !== 'auto' ? q.s.labelSide : null;
        if (!ls) {
          if (DP.KINDS[q.s.kind].route === 'both') ls = side === 'top' ? 'above' : 'below';
          else {
            const partner = placed.find((z) => z !== q && DP.KINDS[z.s.kind].route !== 'both' && sideOf(z.s) === side);
            ls = partner ? (partner.x > q.x ? 'left' : 'right') : 'right';
          }
        }
        const txt = DP.mapLabel(p, q.s);
        if (ls !== 'none' && txt) {
          const [ax, ay] = labelAnchor(q.x, y, ls, q.s.kind);
          html += labelHtml(txt, labelClass(q.s.kind), ax, ay, ls, q.s.id);
        }
      });
      if (names.length > 1 && site.name) {
        svg += `<text x="${r1(cx)}" y="${ROAD_Y - 300}" class="m-sitename" text-anchor="middle">${esc(site.name)}</text>`;
      }
    });

    // směry jízdy na vozovce
    const dTop = dirs[0],
      dBot = dirs[1];
    const yT = ROAD_Y - 24,
      yB = ROAD_Y + 24;
    if (dTop) {
      svg += `<path d="M30 ${yT}h46M44 ${yT - 12}L30 ${yT}L44 ${yT + 12}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
      svg += `<text x="92" y="${yT + 10}" class="m-roaddir">${esc(dTop)}</text>`;
    }
    if (dBot) {
      svg += `<path d="M${MW - 30} ${yB}h-46M${MW - 44} ${yB - 12}L${MW - 30} ${yB}L${MW - 44} ${yB + 12}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
      svg += `<text x="${MW - 92}" y="${yB + 10}" class="m-roaddir" text-anchor="end">${esc(dBot)}</text>`;
    }
    svg = svg.replace(`<path d="M0 ${ROAD_Y}H${MW}" stroke="#fff" stroke-width="4" stroke-dasharray="40 30"/>`, `<path d="M0 ${ROAD_Y}H${MW}" stroke="#fff" stroke-width="3" stroke-dasharray="40 30" opacity="0.9"/>`);
    if (p.map.showSchemeNote) svg += `<text x="${MW - 24}" y="${MH - 22}" class="m-note" text-anchor="end">schematické znázornění – nezobrazuje skutečnou polohu v měřítku</text>`;
    return { svg, html };
  }

  /* ---------- 3) Schéma změny trasy ---------- */
  function textW(str, size) {
    return String(str).length * size * 0.58;
  }

  function stopMark(s, x, y) {
    const k = s.kind;
    if (k === 'zrusena')
      return `<circle cx="${x}" cy="${y}" r="15" fill="#fff" stroke="${C.greyLine}" stroke-width="6"/><path d="M${x - 19} ${y - 19}L${x + 19} ${y + 19}M${x + 19} ${y - 19}L${x - 19} ${y + 19}" stroke="${C.red}" stroke-width="8"/>`;
    if (k === 'puvodni') return `<circle cx="${x}" cy="${y}" r="15" fill="#fff" stroke="${C.greyLine}" stroke-width="6"/>`;
    if (k === 'nova') return `<circle cx="${x}" cy="${y}" r="17" fill="${C.orange}" stroke="#fff" stroke-width="5"/>`;
    if (DP.isNewKind(k)) return `<circle cx="${x}" cy="${y}" r="15" fill="#fff" stroke="${C.orange}" stroke-width="7"/>`;
    return `<circle cx="${x}" cy="${y}" r="15" fill="#fff" stroke="${C.blue}" stroke-width="7"/>`;
  }

  function chevrons(x1, x2, y, color, dir) {
    let s = '';
    const step = 150;
    const len = Math.abs(x2 - x1);
    if (len < 90) return '';
    const n = Math.max(1, Math.floor(len / step));
    for (let i = 0; i < n; i++) {
      const cx = Math.min(x1, x2) + (len * (i + 0.5)) / n;
      const d = dir > 0 ? `M${cx - 5} ${y - 7}L${cx + 3} ${y}L${cx - 5} ${y + 7}` : `M${cx + 5} ${y - 7}L${cx - 3} ${y}L${cx + 5} ${y + 7}`;
      s += `<path d="${d}" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return s;
  }

  function renderRouteScheme(p) {
    const R = DP.routeModel(p);
    const segs = R.segs;
    const Y = 390,
      YB = 615;
    const DFS = 24; // velikost písma směrů
    const wrapDir = (t) => {
      t = t.trim();
      if (!t) return [];
      if (t.length <= 16) return [t];
      const words = t.split(' ');
      let a = '',
        b = '';
      words.forEach((w) => ((a + ' ' + w).trim().length <= Math.ceil(t.length / 2) + 3 && !b ? (a = (a + ' ' + w).trim()) : (b = (b + ' ' + w).trim())));
      return b ? [a, b] : [a];
    };
    const dirR = wrapDir(p.route.dirRight ? 'směr ' + p.route.dirRight.trim() : '');
    const dirL = p.route.bothWays ? wrapDir(p.route.dirLeft ? 'směr ' + p.route.dirLeft.trim() : '') : [];
    const dw = (arr) => Math.max(0, ...arr.map((t) => textW(t, DFS)));
    const M_L = Math.max(100, dw(dirL) + 122),
      M_R = Math.max(110, dw(dirR) + 132);
    // sloupce: kotva = 1 sloupec, objízdný úsek = tolik sloupců, kolik má delší větev
    let cols = 0;
    segs.forEach((g) => {
      if (g.type === 'anchor') {
        g.col = cols;
        cols += 1;
      } else {
        g.k = Math.max(g.orig.length, g.div.length, 1);
        g.c0 = cols - 1; // předchozí kotva (může být -1)
        cols += g.k;
      }
    });
    let step = cols > 1 ? (MW - M_L - M_R) / (cols - 1) : 0;
    // názvy nad osou jsou otočené doprava nahoru – nesmějí přesáhnout pravý okraj
    {
      let c = 0;
      const fs0 = Math.max(20, Math.min(28, step * 0.42 || 28));
      segs.forEach((g) => {
        const names = g.type === 'anchor' ? [g.stop] : g.orig;
        names.forEach((s2, j) => {
          const col = g.type === 'anchor' ? g.col : g.c0 + (g.k + 1) * ((j + 1) / (g.orig.length + 1));
          const need = textW(s2.name || '?', fs0) * 0.79 + 20;
          if (col > 0) step = Math.min(step, (MW - 12 - M_L - need) / col);
        });
        void c;
      });
      step = Math.max(step, 40);
    }
    const xc = (c) => M_L + c * step;
    const oneWay = !p.route.bothWays;

    let lines = '', marks = '', labels = '';
    const used = new Set();
    const fsz = Math.max(20, Math.min(28, step * 0.42 || 28));

    const nameText = (s, x, y, below) => {
      const lab = DP.stopLines(p, s);
      const all = p.lines.filter((l) => l.label.trim()).length;
      const suffix = s.lineIds && s.lineIds.length && lab.length < all ? ` (jen ${lab.join(', ')})` : '';
      const cls = 'r-name ' + (s.kind === 'zrusena' || s.kind === 'puvodni' ? 'is-off' : DP.isNewKind(s.kind) ? 'is-new' : '');
      const ang = below ? 38 : -38;
      const tx = x + (below ? 10 : 8),
        ty = y + (below ? 34 : -26);
      return `<text class="${cls}" style="font-size:${r1(fsz)}px" transform="translate(${r1(tx)} ${r1(ty)}) rotate(${ang})">${esc(s.name || '?')}${suffix ? `<tspan class="r-only">${esc(suffix)}</tspan>` : ''}</text>`;
    };

    // výchozí a koncový bod linie
    const firstX = xc(0) - 70,
      lastX = xc(Math.max(cols - 1, 0)) + 80;
    segs.forEach((g, i) => {
      if (g.type === 'anchor') {
        const x = xc(g.col);
        // úsek ke kotvě následující bez objízdky
        const nx = segs[i + 1];
        if (nx && nx.type === 'anchor') {
          lines += `<path d="M${r1(x)} ${Y}H${r1(xc(nx.col))}" class="r-line served"/>`;
          if (oneWay) lines += chevrons(x, xc(nx.col), Y, '#fff', 1);
        }
        used.add('served');
        marks += stopMark(g.stop, r1(x), Y);
        labels += nameText(g.stop, x, Y, false);
        return;
      }
      // objízdný úsek
      const prev = segs[i - 1],
        next = segs[i + 1];
      const xa = prev ? xc(prev.col) : firstX;
      const xb = next ? xc(next.col) : lastX;
      // původní trasa (přerušovaně)
      if (g.orig.length || (prev && next)) {
        lines += `<path d="M${r1(xa)} ${Y}H${r1(xb)}" class="r-line orig"/>`;
        used.add('orig');
      }
      g.orig.forEach((s, j) => {
        const x = xa + ((xb - xa) * (j + 1)) / (g.orig.length + 1);
        marks += stopMark(s, r1(x), Y);
        labels += nameText(s, x, Y, false);
        used.add(s.kind);
      });
      // změněná trasa
      if (g.div.length || (prev && next)) {
        const dx = Math.min(80, (xb - xa) / 4);
        const startX = prev ? xa : xa + dx,
          endX = next ? xb : xb - dx;
        let d = prev ? `M${r1(xa)} ${Y}L${r1(xa + dx)} ${YB}` : `M${r1(xa + dx)} ${YB}`;
        d += `H${r1(xb - dx)}`;
        if (next) d += `L${r1(xb)} ${Y}`;
        lines += `<path d="${d}" class="r-line div"/>`;
        if (oneWay) lines += chevrons(xa + dx, xb - dx, YB, "#fff", 1);
        used.add('div');
        g.div.forEach((s, j) => {
          const x = xa + dx + ((xb - xa - 2 * dx) * (j + 1)) / (g.div.length + 1);
          marks += stopMark(s, r1(x), YB);
          labels += nameText(s, x, YB, true);
          used.add(s.kind);
        });
        void startX;
        void endX;
      }
    });
    // přesah linie na začátku a konci + šipky směru
    const firstSeg = segs[0],
      lastSeg = segs[segs.length - 1];
    let ends = '';
    if (firstSeg && firstSeg.type === 'anchor') {
      lines = `<path d="M${r1(firstX)} ${Y}H${r1(xc(firstSeg.col))}" class="r-line served"/>` + lines;
    }
    if (lastSeg && lastSeg.type === 'anchor') {
      lines = `<path d="M${r1(xc(lastSeg.col))} ${Y}H${r1(lastX - 6)}" class="r-line served"/>` + lines;
    }
    const dirText = (lines, x, anchor) =>
      `<text class="r-dir" style="font-size:${DFS}px" text-anchor="${anchor}">${lines
        .map((t, i) => `<tspan x="${r1(x)}" y="${r1(Y + 8 - ((lines.length - 1) * DFS * 1.15) / 2 + i * DFS * 1.15)}">${esc(t)}</tspan>`)
        .join('')}</text>`;
    ends += `<path d="M${r1(lastX - 8)} ${Y - 22}L${r1(lastX + 20)} ${Y}L${r1(lastX - 8)} ${Y + 22}Z" fill="${C.blue}"/>`;
    if (dirR.length) ends += dirText(dirR, lastX + 34, 'start');
    if (p.route.bothWays) {
      ends += `<path d="M${r1(firstX + 8)} ${Y - 22}L${r1(firstX - 20)} ${Y}L${r1(firstX + 8)} ${Y + 22}Z" fill="${C.blue}"/>`;
      if (dirL.length) ends += dirText(dirL, firstX - 34, 'end');
    }

    // označení linek
    const lbls = p.lines.map((l) => l.label.trim()).filter(Boolean);
    let badges = '';
    const bs = lbls.length > 6 ? 40 : 50;
    lbls.forEach((t, i) => {
      const bw = Math.max(bs * 1.08, bs * (0.34 * t.length + 0.4));
      const perRow = Math.max(1, Math.floor(560 / (bw + 8)));
      const row = Math.floor(i / perRow),
        col = i % perRow;
      const x = 28 + col * (bw + 8),
        y = 26 + row * (bs + 8);
      badges += `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(bw)}" height="${bs}" fill="${C.orange}"/><text x="${r1(x + bw / 2)}" y="${r1(y + bs * 0.72)}" class="r-badge" style="font-size:${r1(bs * 0.62)}px" text-anchor="middle">${esc(t)}</text>`;
    });

    // legenda
    const items = [];
    if (used.has('served')) items.push(['line', C.blue, '', 'trasa linky beze změny']);
    if (used.has('div')) items.push(['line', C.orange, '', 'změněná trasa']);
    if (used.has('orig')) items.push(['line', C.greyLine, '22 14', 'původní trasa – mimo provoz']);
    if (used.has('served')) items.push(['stop', 'beze', '', 'obsluhovaná zastávka']);
    if (used.has('zrusena')) items.push(['stop', 'zrusena', '', 'zrušená zastávka']);
    if (used.has('puvodni')) items.push(['stop', 'puvodni', '', 'neobsluhovaná zastávka']);
    if (used.has('nahradni') || used.has('presunuta')) items.push(['stop', 'nahradni', '', 'náhradní zastávka']);
    if (used.has('nova')) items.push(['stop', 'nova', '', 'nová zastávka']);
    let legend = '';
    if (p.map.showLegend) {
      const LF = 23;
      let lx = 28,
        ly = MH - 92;
      items.forEach((it) => {
        const w = 70 + textW(it[3], LF) + 40;
        if (lx + w > MW - 20) {
          lx = 28;
          ly += 46;
        }
        if (it[0] === 'line') legend += `<path d="M${lx} ${ly}h56" stroke="${it[1]}" stroke-width="${it[2] ? 9 : 13}" ${it[2] ? `stroke-dasharray="${it[2]}"` : ''}/>`;
        else legend += stopMark({ kind: it[1] }, lx + 28, ly);
        legend += `<text x="${lx + 70}" y="${ly + 8}" class="r-legend">${esc(it[3])}</text>`;
        lx += w;
      });
      if (items.length) legend = `<g class="r-legend-box">${legend}</g>`;
    }
    let note = '';
    if (p.map.showSchemeNote) note = `<text x="${MW - 24}" y="44" class="m-note" text-anchor="end">schematické znázornění – není v měřítku</text>`;
    // legenda je při 2 řádcích výš; poznámku pak posuneme
    const svg = `<rect x="0" y="0" width="${MW}" height="${MH}" fill="#fff"/>${lines}${ends}${marks}${labels}${badges}${legend}${note}`;
    return { svg, html: '' };
  }

  /** Hlavní vstup: vrátí HTML obsahu mapového pole */
  DP.renderMap = function (p) {
    const mode = DP.mapMode(p);
    let r = { svg: '', html: '' };
    if (mode === 'background' && p.map.image) r = renderBackground(p);
    else if (mode === 'background') r = { svg: `<rect width="${MW}" height="${MH}" fill="${C.cream}"/><text x="${MW / 2}" y="${MH / 2}" class="m-note editor-only" text-anchor="middle">Nahrajte podkladovou mapu</text>`, html: '' };
    else if (mode === 'stopScheme') r = renderStopScheme(p);
    else if (mode === 'routeScheme') r = renderRouteScheme(p);
    if (!r.svg && !r.html) return '';
    return (
      `<svg class="m-svg" viewBox="0 0 ${MW} ${MH}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${r.svg}</svg>` +
      `<div class="m-overlay">${r.html}</div>`
    );
  };
})();

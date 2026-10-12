/* DPMLB – výlukové vývěsky
 * Sestavení vývěsky. Stejný kód používá pracovní náhled v editoru i tisková stránka,
 * takže se obsah při přechodu do tisku nemůže lišit.
 *
 * Všechny rozměry jsou v „mm předlohy“ (A5 na šířku) a násobí se proměnnou --k
 * (A4 na šířku = 297/210). Měřeno z 03e-vyluka_zastavky.pdf.
 */
(function () {
  'use strict';
  const DP = window.DP;
  const esc = DP.esc;
  const U = (v) => `calc(var(--u) * ${Math.round(v * 1000) / 1000})`;

  /** Rozložení čtverečků linek v záhlaví */
  DP.layoutLines = function (labels) {
    const n = labels.length;
    const H1 = 10.92, // výška čtverečku v předloze
      ASP = 1.081, // šířka / výška v předloze (11,81 × 10,92 mm)
      G = 1.3, // mezera
      WMAX = 58,
      HMAX = 22;
    if (!n) return { boxes: [], width: 0, h: H1 };
    const widthOf = (t, h) => Math.max(h * ASP, h * (0.36 * Math.max(t.length, 1) + 0.37));
    let best = null;
    for (let r = 1; r <= Math.min(n, 4); r++) {
      const c = Math.ceil(n / r);
      let h = Math.min(H1, (HMAX - (r - 1) * G) / r);
      // šířka řádku podle nejdelších popisků
      const rowW = (hh) => {
        let mx = 0;
        for (let i = 0; i < r; i++) {
          const row = labels.slice(i * c, i * c + c);
          const w = row.reduce((a, t) => a + widthOf(t, hh), 0) + (row.length - 1) * G;
          mx = Math.max(mx, w);
        }
        return mx;
      };
      while (rowW(h) > WMAX && h > 3) h -= 0.1;
      const cand = { r, c, h, w: rowW(h) };
      if (!best) best = cand;
      if (cand.h >= 7.6) {
        best = cand;
        break;
      } // co nejméně řad, dokud jsou čtverečky dost velké
      if (cand.h > best.h) best = cand;
    }
    const boxes = [];
    const top0 = 14.1 - (best.r * best.h + (best.r - 1) * G) / 2; // svislý střed záhlaví
    for (let i = 0; i < best.r; i++) {
      let x = 9.02;
      labels.slice(i * best.c, i * best.c + best.c).forEach((t) => {
        const w = widthOf(t, best.h);
        boxes.push({ t, x, y: top0 + i * (best.h + G), w, h: best.h });
        x += w + G;
      });
    }
    return { boxes, width: best.w, h: best.h, rows: best.r };
  };

  DP.renderPoster = function (p, opts) {
    opts = opts || {};
    const F = DP.FORMATS[p.format] || DP.FORMATS.a4l;
    const labels = p.lines.map((l) => l.label.trim()).filter(Boolean);
    const LL = DP.layoutLines(labels);
    const triX = 9.02 + (LL.width || 11.81) + 3.68;
    const titleX = triX + 8.26 + 3.41;
    const pageH = F.pageH / F.k;
    const mk = F.layout === 'port' ? 201.1 / 138.15 : F.k;

    let h = `<div class="poster ${F.layout === 'port' ? 'port' : 'land'} fmt-${p.format}" style="--k:${F.k};--mk:${mk};--pw:${F.pageW}mm;--ph:${F.pageH}mm" data-format="${p.format}">`;
    h += `<div class="p-inner" style="height:${U(pageH)}">`;

    // záhlaví
    h += '<header class="p-head">';
    LL.boxes.forEach((b) => {
      h += `<div class="p-line" style="left:${U(b.x)};top:${U(b.y)};width:${U(b.w)};height:${U(b.h)};--fs:${((22.6 * b.h) / 10.92).toFixed(2)}"><span>${esc(b.t)}</span></div>`;
    });
    h += `<div class="p-warn-wrap" style="left:${U(triX)}">${DP.headerTriangleSvg(DP.COLORS.orange)}</div>`;
    h += `<div class="p-titles" style="left:${U(titleX)}"><div class="p-headline">${esc(p.headline)}</div><div class="p-title">${esc(p.title)}</div></div>`;
    h += `<img class="p-logo" src="assets/logo-dpmlb.svg" alt="DPMLB">`;
    h += '</header>';

    // termín
    h += `<div class="p-datebar"><span>${esc(DP.dateText(p))}</span></div>`;

    // mapa
    const mapHtml = DP.renderMap(p);
    h += `<div class="p-map${mapHtml ? '' : ' is-empty'}" data-mode="${DP.mapMode(p)}">${mapHtml}</div>`;

    // panel Popis změny
    h += '<aside class="p-panel">';
    h += DP.watermarkSvg();
    h += `<h2 class="p-h2">${esc(p.descHeading)}</h2>`;
    const desc = p.descAuto ? DP.generateDescription(p) : p.description;
    h += `<div class="p-desc">${DP.richText(desc)}</div>`;
    h += `<div class="p-more${p.showQr ? '' : ' no-qr'}"><div class="p-more-txt"><strong>${esc(p.linkLabel).replace(/\n/g, '<br>')}</strong><span>${esc(p.linkText)}</span></div>${p.showQr && p.qrUrl.trim() ? `<div class="p-qr">${DP.qrSvg(p.qrUrl.trim(), DP.COLORS.blue)}</div>` : ''}</div>`;
    h += '</aside>';

    h += '</div></div>';
    return h;
  };

  /** Kontrola přetečení po vykreslení (vyžaduje načtená písma) */
  DP.measurePoster = function (root) {
    const W = [];
    const el = root.querySelector('.poster');
    if (!el) return W;
    const desc = el.querySelector('.p-desc');
    const contentH = desc ? [].reduce.call(desc.children, (a, c) => Math.max(a, c.offsetTop + c.offsetHeight), 0) : 0;
    if (desc && contentH > desc.clientHeight + 1) {
      W.push({ level: 'error', msg: 'Popis změny se nevejde do vyhrazeného prostoru – na vývěsce bude oříznut. Text zkraťte (písmo se automaticky nezmenšuje).' });
      // oříznout na celé řádky, aby nebyl vidět přepůlený řádek
      const lh = parseFloat(getComputedStyle(desc).lineHeight);
      if (lh) {
        const avail = desc.clientHeight;
        desc.style.bottom = 'auto';
        desc.style.height = Math.floor(avail / lh) * lh + 'px';
      }
    } else if (desc && contentH > desc.clientHeight * 0.9) {
      W.push({ level: 'warn', msg: 'Popis změny téměř vyplňuje vyhrazený prostor.' });
    }
    const titles = el.querySelector('.p-titles');
    const logo = el.querySelector('.p-logo');
    if (titles && logo) {
      const t = titles.getBoundingClientRect(),
        lg = logo.getBoundingClientRect();
      const title = titles.querySelector('.p-title');
      const lh = parseFloat(getComputedStyle(title).lineHeight) || 1;
      const lines = Math.round(title.getBoundingClientRect().height / (lh * (t.height ? 1 : 1)));
      if (titles.scrollWidth > titles.clientWidth + 1 || t.right > lg.left - 2) W.push({ level: 'error', msg: 'Název výluky je příliš dlouhý – přesahuje k logu.' });
      if (lines > 2) W.push({ level: 'error', msg: 'Název výluky se zalomí na více než dva řádky a nevejde se do záhlaví. Zkraťte jej.' });
      else if (lines === 2) W.push({ level: 'info', msg: 'Název výluky je zalomen na dva řádky.' });
    }
    el.querySelectorAll('.p-line span').forEach((s) => {
      const box = s.parentElement;
      let fs = parseFloat(getComputedStyle(s).fontSize);
      const min = fs * 0.62;
      while (s.scrollWidth > box.clientWidth * 0.94 && fs > min) {
        fs *= 0.95;
        s.style.fontSize = fs + 'px';
      }
      if (s.scrollWidth > box.clientWidth) W.push({ level: 'warn', msg: `Označení linky „${s.textContent}“ se nevejde do čtverečku.` });
    });
    const dbar = el.querySelector('.p-datebar span');
    if (dbar && dbar.scrollWidth > dbar.parentElement.clientWidth) W.push({ level: 'error', msg: 'Text termínu je delší než červený pruh.' });
    const more = el.querySelector('.p-more-txt span');
    if (more && more.scrollWidth > more.clientWidth + 1) W.push({ level: 'warn', msg: 'Text informačního odkazu je příliš dlouhý.' });
    // popisky na mapě mimo mapové pole
    const map = el.querySelector('.p-map');
    if (map) {
      const mr = map.getBoundingClientRect();
      map.querySelectorAll('.m-label').forEach((l) => {
        const r = l.getBoundingClientRect();
        if (r.left < mr.left - 1 || r.right > mr.right + 1 || r.top < mr.top - 1 || r.bottom > mr.bottom + 1)
          W.push({ level: 'warn', msg: `Popisek „${l.textContent.slice(0, 30)}…“ přesahuje okraj mapky – posuňte značku nebo změňte stranu popisku.` });
      });
    }
    const L = DP.layoutLines([].map.call(el.querySelectorAll('.p-line span'), (s) => s.textContent));
    if (L.boxes.length && L.h < 5) W.push({ level: 'warn', msg: 'Linek je mnoho – jejich čtverečky jsou velmi malé. Zvažte uvedení části linek jen v textu.' });
    return W;
  };

  /** Vloží vývěsku do kontejneru a po načtení písem zkontroluje rozvržení */
  DP.mountPoster = function (container, p) {
    container.innerHTML = DP.renderPoster(p);
    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const imgs = [].slice.call(container.querySelectorAll('img'));
    return Promise.all([ready].concat(imgs.map((i) => (i.complete ? null : new Promise((r) => ((i.onload = r), (i.onerror = r))))))).then(() =>
      DP.measurePoster(container)
    );
  };
})();

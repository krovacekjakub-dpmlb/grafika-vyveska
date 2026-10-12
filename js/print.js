/* DPMLB – výlukové vývěsky: tisková stránka
 * Načte uloženou vývěsku (?id=…) nebo testovací vzor (?vzor=debr) a zobrazí ji samotnou.
 */
(function () {
  'use strict';
  const DP = window.DP;
  const qs = new URLSearchParams(location.search);
  const sheet = document.getElementById('sheet');
  let p = null;
  if (qs.get('vzor')) {
    const s = DP.SAMPLES.find((x) => x.key === qs.get('vzor'));
    if (s) p = s.make();
    if (p && qs.get('format') && DP.FORMATS[qs.get('format')]) p.format = qs.get('format');
  } else {
    p = DP.store.get(qs.get('id') || DP.store.currentId());
  }
  const back = document.querySelector('.print-bar .sec');
  back.onclick = () => (location.href = 'index.html' + (p && !qs.get('vzor') ? '?id=' + encodeURIComponent(p.id) : ''));

  if (!p) {
    sheet.innerHTML = '<div class="missing">Vývěska nebyla nalezena v tomto prohlížeči.<br><a href="index.html">Otevřít editor</a></div>';
    return;
  }
  const F = DP.FORMATS[p.format];
  document.getElementById('page-size').textContent = `@page { size: ${F.css}; margin: 0; }`;
  document.documentElement.style.setProperty('--pw', F.pageW + 'mm');
  document.documentElement.style.setProperty('--ph', F.pageH + 'mm');
  document.getElementById('fmt-hint').textContent = F.label.replace(/\s*\(.*\)$/, '');
  document.title = (p.title || 'Vývěska') + ' – tisk';
  DP.mountPoster(sheet, p).then((issues) => {
    document.body.setAttribute('data-ready', '1');
    if (issues.length) console.warn('Upozornění k rozvržení vývěsky:', issues.map((i) => i.msg).join('\n'));
  });
  if (qs.get('print') === '1') window.addEventListener('load', () => setTimeout(() => window.print(), 300));
})();

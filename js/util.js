/* DPMLB – výlukové vývěsky
 * Společné pomocné funkce. Bez závislostí, funguje i při otevření přes file://.
 */
(function () {
  'use strict';
  const DP = (window.DP = window.DP || {});

  DP.uid = function (prefix) {
    return (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  };

  DP.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  DP.clone = function (o) {
    return JSON.parse(JSON.stringify(o));
  };

  /* ---------- Čeština: data ---------- */
  // Genitiv dnů (od/do pondělí, úterý, středy, …), index dle Date.getDay()
  DP.DAY_GEN = ['neděle', 'pondělí', 'úterý', 'středy', 'čtvrtka', 'pátku', 'soboty'];
  DP.DAY_NOM = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  DP.MONTH_GEN = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

  /** 'YYYY-MM-DD' -> Date (lokální půlnoc) nebo null */
  DP.parseISO = function (s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getMonth() === m - 1 ? dt : null;
  };

  /** „úterý 22. září 2026“ (genitiv dne) */
  DP.fmtDayDate = function (dt, withYear) {
    return DP.DAY_GEN[dt.getDay()] + ' ' + dt.getDate() + '. ' + DP.MONTH_GEN[dt.getMonth()] + (withYear ? ' ' + dt.getFullYear() : '');
  };

  /**
   * Text termínu, např. „od úterý 22. září 2026 do pátku 31. října“.
   * Rok u konce se uvádí jen tehdy, když se liší od roku začátku (jako v předloze).
   */
  DP.fmtRange = function (fromISO, toISO, opts) {
    opts = opts || {};
    const f = DP.parseISO(fromISO);
    const t = DP.parseISO(toISO);
    const yStart = opts.yearStart !== false;
    if (f && t) {
      const sameYear = f.getFullYear() === t.getFullYear();
      if (+f === +t) return 'v ' + DP.DAY_NOM[f.getDay()].replace(/^středa$/, 'středu').replace(/^neděle$/, 'neděli').replace(/^sobota$/, 'sobotu') + ' ' + f.getDate() + '. ' + DP.MONTH_GEN[f.getMonth()] + (yStart ? ' ' + f.getFullYear() : '');
      return 'od ' + DP.fmtDayDate(f, yStart) + ' do ' + DP.fmtDayDate(t, !sameYear);
    }
    if (f) return 'od ' + DP.fmtDayDate(f, yStart) + ' do odvolání';
    if (t) return 'do ' + DP.fmtDayDate(t, yStart);
    return '';
  };

  DP.capFirst = function (s) {
    s = String(s || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  /**
   * Kontrola dnů v týdnu v libovolném textu: najde spojení „pátku 31. října [2026]“
   * a ověří, zda den v týdnu odpovídá datu. Rok bere z textu, jinak z fallbackYears.
   */
  DP.checkWeekdays = function (text, fallbackYear) {
    const issues = [];
    if (!text) return issues;
    const dayAlt = DP.DAY_GEN.concat(DP.DAY_NOM, ['středu', 'sobotu', 'neděli']).map((d) => d.toLowerCase());
    const uniq = Array.from(new Set(dayAlt)).sort((a, b) => b.length - a.length).join('|');
    const re = new RegExp('(' + uniq + ')\\s+(\\d{1,2})\\.\\s*(' + DP.MONTH_GEN.join('|') + ')(?:\\s+(\\d{4}))?', 'gi');
    let m;
    const lastYear = { v: fallbackYear };
    while ((m = re.exec(text))) {
      const dayWord = m[1].toLowerCase();
      const d = Number(m[2]);
      const mon = DP.MONTH_GEN.indexOf(m[3].toLowerCase());
      const year = m[4] ? Number(m[4]) : lastYear.v;
      if (m[4]) lastYear.v = Number(m[4]);
      if (!year) continue;
      const dt = new Date(year, mon, d);
      const real = dt.getDay();
      const ok = [DP.DAY_GEN[real], DP.DAY_NOM[real], { 3: 'středu', 6: 'sobotu', 0: 'neděli' }[real]].filter(Boolean);
      if (ok.indexOf(dayWord) === -1) {
        issues.push({ found: m[0], real: DP.DAY_NOM[real], date: d + '. ' + (mon + 1) + '. ' + year });
      }
    }
    return issues;
  };

  /* ---------- Jednoduchý formát popisu ----------
   * **tučně**, prázdný řádek = nový odstavec, jednoduchý zalomení řádku = <br>
   */
  DP.richText = function (src) {
    const paras = String(src || '')
      .replace(/\r\n/g, '\n')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    return paras
      .map((p) => {
        let h = DP.esc(p).replace(/\n/g, '<br>');
        h = h.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
        return '<p>' + h + '</p>';
      })
      .join('');
  };

  DP.debounce = function (fn, ms) {
    let t;
    return function () {
      const a = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, a), ms);
    };
  };

  DP.joinCs = function (arr) {
    arr = arr.filter(Boolean);
    if (arr.length <= 1) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' a ' + arr[arr.length - 1];
  };
})();

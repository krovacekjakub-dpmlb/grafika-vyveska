/* DPMLB – výlukové vývěsky
 * Datový model, výchozí hodnoty, testovací vzory, ukládání (localStorage) a kontrola dat.
 */
(function () {
  'use strict';
  const DP = window.DP;

  DP.VERSION = 1;

  DP.FORMATS = {
    a4l: { label: 'A4 na šířku (předloha zvětšená na A4)', pageW: 297, pageH: 210, css: 'A4 landscape', k: 297 / 210, layout: 'land' },
    a5l: { label: 'A5 na šířku (původní velikost předlohy)', pageW: 210, pageH: 148, css: 'A5 landscape', k: 1, layout: 'land' },
    a4p: { label: 'A4 na výšku (odvozená varianta)', pageW: 210, pageH: 297, css: 'A4 portrait', k: 1, layout: 'port' },
  };

  DP.TYPES = {
    presun: { label: 'Přesun zastávky', map: 'stop' },
    zruseni: { label: 'Zrušení zastávky', map: 'stop' },
    trasa: { label: 'Změna trasy linky', map: 'route' },
    usek: { label: 'Zrušení části trasy', map: 'route' },
    nahradni: { label: 'Zavedení náhradní zastávky', map: 'stop' },
    kombinace: { label: 'Kombinace více typů omezení', map: 'route' },
    jine: { label: 'Jiné dopravní omezení', map: 'stop' },
  };

  /* route: 'orig' = jen původní trasa (neobsluhováno), 'div' = jen změněná trasa, 'both' = obsluhováno v obou případech */
  DP.KINDS = {
    puvodni: { label: 'Původní zastávka', route: 'orig', mapLabel: 'původní poloha\nzastávky', color: 'grey' },
    presunuta: { label: 'Přesunutá zastávka', route: 'div', mapLabel: 'přesunutá\nzastávka', color: 'orange' },
    zrusena: { label: 'Zrušená zastávka', route: 'orig', mapLabel: 'zrušená\nzastávka', color: 'red' },
    nahradni: { label: 'Náhradní zastávka', route: 'div', mapLabel: 'náhradní\nzastávka', color: 'orange' },
    nova: { label: 'Nová zastávka', route: 'div', mapLabel: 'nová\nzastávka', color: 'orange' },
    beze: { label: 'Zastávka beze změny', route: 'both', mapLabel: null, color: 'blue' },
    trvala: { label: 'Trvalá zastávka na změněné trase', route: 'both', mapLabel: null, color: 'blue' },
  };
  DP.isOrigKind = (k) => k === 'puvodni' || k === 'zrusena';
  DP.isNewKind = (k) => k === 'presunuta' || k === 'nahradni' || k === 'nova';

  DP.newStop = function (o) {
    return Object.assign(
      {
        id: DP.uid('z'),
        name: '',
        lineIds: [], // prázdné = všechny dotčené linky
        direction: '',
        kind: 'beze',
        note: '', // vlastní popisek na mapě (prázdné = automatický)
        pairId: '', // u přesunuté/náhradní: odkaz na původní stanoviště
        shift: 'za', // schéma: náhradní stanoviště „za“ / „před“ původním (ve směru jízdy)
        distance: '', // např. „cca 80 m“ – jen zadaný údaj, nic se nedopočítává
        pos: null, // {x,y} 0–1 vůči podkladové mapě
        labelSide: 'auto',
        arrow: 'auto',
        showOnMap: true,
      },
      o || {}
    );
  };

  DP.newPoster = function () {
    return {
      v: DP.VERSION,
      id: DP.uid('v'),
      name: '',
      updatedAt: new Date().toISOString(),
      format: 'a4l',
      type: 'presun',
      lines: [{ id: DP.uid('l'), label: '' }],
      headline: 'Omezení dopravy',
      title: '',
      dateFrom: '',
      dateTo: '',
      timeLimit: '',
      dateTextAuto: true,
      dateText: '',
      reason: '',
      reasonVerb: 'auto',
      extraInfo: '',
      descHeading: 'Popis změny',
      descAuto: true,
      description: '',
      linkLabel: 'více informací\no výluce na',
      linkText: 'www.dpmlb.cz',
      qrUrl: 'https://dpmlb.cz/',
      showQr: true,
      stops: [],
      route: { dirRight: '', dirLeft: '', bothWays: true },
      map: { mode: 'auto', image: '', imageName: '', showMoveArrow: false, showSchemeNote: true, showLegend: true },
    };
  };

  /** Doplní chybějící klíče (kompatibilita starších / importovaných dat) */
  DP.normalize = function (p) {
    const base = DP.newPoster();
    const out = Object.assign(base, p || {});
    out.route = Object.assign(base.route, (p && p.route) || {});
    out.map = Object.assign(DP.newPoster().map, (p && p.map) || {});
    out.lines = (out.lines || []).map((l) => ({ id: l.id || DP.uid('l'), label: String(l.label == null ? '' : l.label) }));
    out.stops = (out.stops || []).map((s) => DP.newStop(s));
    if (!DP.FORMATS[out.format]) out.format = 'a4l';
    if (!DP.TYPES[out.type]) out.type = 'jine';
    return out;
  };

  /** Jaký druh mapky se kreslí */
  DP.mapMode = function (p) {
    if (p.map.mode && p.map.mode !== 'auto') return p.map.mode;
    const t = DP.TYPES[p.type] || DP.TYPES.jine;
    if (t.map === 'route') {
      return p.stops.length ? 'routeScheme' : p.map.image ? 'background' : 'none';
    }
    if (p.map.image) return 'background';
    return p.stops.length ? 'stopScheme' : 'none';
  };

  DP.dateText = function (p) {
    if (!p.dateTextAuto) return p.dateText || '';
    let t = DP.fmtRange(p.dateFrom, p.dateTo);
    if (t && p.timeLimit) t += ', ' + p.timeLimit.trim();
    return t;
  };

  DP.lineLabel = function (p, id) {
    const l = p.lines.find((x) => x.id === id);
    return l ? l.label : '';
  };

  DP.stopLines = function (p, s) {
    const ids = s.lineIds && s.lineIds.length ? s.lineIds : p.lines.map((l) => l.id);
    return ids.map((id) => DP.lineLabel(p, id)).filter(Boolean);
  };

  /* ---------- Kontrola zadaných dat (bez vykreslování) ---------- */
  DP.validate = function (p) {
    const W = [];
    const add = (level, msg) => W.push({ level, msg });
    const labels = p.lines.map((l) => l.label.trim()).filter(Boolean);
    if (!labels.length) add('error', 'Není zadána žádná dotčená linka.');
    if (!p.title.trim()) add('error', 'Chybí název výluky.');
    const f = DP.parseISO(p.dateFrom),
      t = DP.parseISO(p.dateTo);
    if (!f) add('warn', 'Chybí datum začátku platnosti.');
    if (f && t && t < f) add('error', 'Datum konce je dříve než datum začátku.');

    // nesoulad dne v týdnu (např. „pátku 31. října“, když je to sobota)
    const yr = f ? f.getFullYear() : t ? t.getFullYear() : null;
    const chk = (txt, where) =>
      DP.checkWeekdays(txt, yr).forEach((i) =>
        add('warn', `${where}: „${i.found}“ – ${i.date} je ve skutečnosti ${i.real}. Údaj ověřte; aplikace jej sama neopravuje.`)
      );
    chk(DP.dateText(p), 'Termín v červeném pruhu');
    chk(p.description, 'Popis změny');
    if (!p.dateTextAuto && f) {
      const auto = DP.fmtRange(p.dateFrom, p.dateTo);
      const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
      if (auto && norm(p.dateText).indexOf(norm(auto).replace(/^od /, '').split(' do ')[0]) === -1)
        add('info', 'Ručně zadaný text termínu neobsahuje zadané datum začátku – zkontrolujte shodu.');
    }
    if (/\s/.test(p.linkText.trim())) add('warn', `Informační odkaz „${p.linkText}“ obsahuje mezeru. Je to záměr?`);
    if (p.showQr && !p.qrUrl.trim()) add('warn', 'QR kód je zapnutý, ale není zadána adresa, kterou má obsahovat.');

    // zastávky
    const mode = DP.mapMode(p);
    const byId = {};
    p.stops.forEach((s) => (byId[s.id] = s));
    p.stops.forEach((s, i) => {
      const n = `Zastávka č. ${i + 1}${s.name ? ' („' + s.name + '“)' : ''}`;
      if (!s.name.trim()) add('warn', `${n}: chybí název.`);
      if (DP.isNewKind(s.kind) && s.kind !== 'nova' && !s.pairId && mode !== 'routeScheme')
        add('warn', `${n}: ${DP.KINDS[s.kind].label.toLowerCase()} není propojena s původním stanovištěm.`);
      if (s.pairId && !byId[s.pairId]) add('warn', `${n}: propojené původní stanoviště už neexistuje.`);
      if (mode === 'background' && s.showOnMap && !s.pos) add('warn', `${n}: na podkladové mapě zatím nemá polohu – přetáhněte značku v náhledu.`);
      if ((mode === 'stopScheme' || mode === 'background') && !s.direction.trim() && (s.kind !== 'nova'))
        add('info', `${n}: není zadán směr jízdy.`);
    });

    if (mode === 'stopScheme') {
      const dirs = Array.from(new Set(p.stops.map((s) => s.direction.trim()).filter(Boolean)));
      if (dirs.length > 2) add('warn', 'Schéma přesunu umí znázornit dva protisměry jedné ulice. Zadáno je více směrů – zvažte podkladovou mapu.');
      add('info', 'Mapka je schematická (bez podkladové mapy) – nezobrazuje skutečnou geografii. Pro přesné umístění nahrajte podkladovou mapu.');
    }
    if (mode === 'routeScheme') {
      const R = DP.routeModel(p);
      R.problems.forEach((m) => add('warn', m));
      if (!p.route.dirRight.trim()) add('info', 'Změna trasy: není zadán směr jízdy (koncová zastávka vpravo ve schématu).');
    }
    if (mode === 'none' && p.stops.length === 0) add('info', 'Mapka nebude zobrazena – nejsou zadány zastávky ani podkladová mapa.');
    return W;
  };

  /* ---------- Model trasy pro schéma ----------
   * Zastávky v pořadí, ve kterém je uživatel zadal. 'both' = kotvy na společné části,
   * mezi kotvami vzniká objízdný úsek: větev 'orig' (původní, neobsluhovaná) a 'div' (změněná trasa).
   */
  DP.routeModel = function (p) {
    const stops = p.stops.filter((s) => s.showOnMap !== false);
    const problems = [];
    const segs = []; // {type:'anchor', stop} | {type:'bypass', orig:[], div:[]}
    let cur = null;
    stops.forEach((s) => {
      const r = DP.KINDS[s.kind].route;
      if (r === 'both') {
        cur = null;
        segs.push({ type: 'anchor', stop: s });
      } else {
        if (!cur) {
          cur = { type: 'bypass', orig: [], div: [] };
          segs.push(cur);
        }
        cur[r].push(s);
      }
    });
    segs.forEach((g, i) => {
      if (g.type !== 'bypass') return;
      g.startOpen = i === 0;
      g.endOpen = i === segs.length - 1;
      if (g.startOpen && g.endOpen && segs.length === 1)
        problems.push('Schéma trasy: chybí zastávky beze změny/trvalé, mezi kterými se trasa odklání. Odklon nelze jednoznačně zakreslit.');
      else if ((g.startOpen || g.endOpen) && g.div.length)
        problems.push('Schéma trasy: změněná trasa začíná nebo končí bez návaznosti na společnou zastávku – zakreslena je jen schematicky jako samostatná větev.');
    });
    if (stops.length && !stops.some((s) => DP.KINDS[s.kind].route !== 'both'))
      problems.push('Schéma trasy: žádná zastávka není zrušená, náhradní ani nová – změna trasy není z dat patrná.');
    return { segs, problems };
  };

  /* ---------- Ukládání ---------- */
  const KEY = 'dpmlb-vyvesky-v1';
  DP.store = {
    _read() {
      try {
        return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
      } catch (e) {
        return {};
      }
    },
    _write(db) {
      localStorage.setItem(KEY, JSON.stringify(db));
    },
    list() {
      const db = this._read();
      return Object.values(db.items || {}).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    },
    get(id) {
      const db = this._read();
      return db.items && db.items[id] ? DP.normalize(db.items[id]) : null;
    },
    /** vrací null nebo chybovou hlášku (např. plné úložiště kvůli velké mapě) */
    save(p) {
      const db = this._read();
      db.items = db.items || {};
      p.updatedAt = new Date().toISOString();
      db.items[p.id] = p;
      db.currentId = p.id;
      try {
        this._write(db);
        return null;
      } catch (e) {
        return 'Úložiště prohlížeče je plné (pravděpodobně kvůli velké podkladové mapě). Zmenšete obrázek nebo smažte starší vývěsky.';
      }
    },
    remove(id) {
      const db = this._read();
      if (db.items) delete db.items[id];
      if (db.currentId === id) db.currentId = null;
      this._write(db);
    },
    currentId() {
      return this._read().currentId || null;
    },
  };
})();

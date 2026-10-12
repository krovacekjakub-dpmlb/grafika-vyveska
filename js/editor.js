/* DPMLB – výlukové vývěsky: editor */
(function () {
  'use strict';
  const DP = window.DP;
  const esc = DP.esc;
  const $ = (s, r) => (r || document).querySelector(s);

  let P = null; // aktuální vývěska
  let step = 'zakladni';
  let lastIssues = [];

  /* ---------- Načtení ---------- */
  function load() {
    const qs = new URLSearchParams(location.search);
    const id = qs.get('id') || DP.store.currentId();
    P = (id && DP.store.get(id)) || null;
    if (!P) {
      P = DP.SAMPLES[0].make();
      P.name = 'Debř, škola – přesun zastávky (vzor)';
      DP.store.save(P);
    }
    if (qs.get('id')) history.replaceState(null, '', location.pathname);
  }

  /* ---------- Pomocné pro formulář ---------- */
  const fld = (label, inner, hint, cls) =>
    `<label class="fld ${cls || ''}"><span class="lbl">${label}</span>${inner}${hint ? `<small class="hint">${hint}</small>` : ''}</label>`;
  const inp = (k, val, attrs) => `<input data-k="${k}" value="${esc(val)}" ${attrs || ''}>`;
  const ta = (k, val, rows, attrs) => `<textarea data-k="${k}" rows="${rows || 3}" ${attrs || ''}>${esc(val)}</textarea>`;
  const sel = (k, val, opts, attrs) =>
    `<select data-k="${k}" ${attrs || ''}>${opts.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const chk = (k, val, label) => `<label class="chk"><input type="checkbox" data-k="${k}"${val ? ' checked' : ''}> ${label}</label>`;
  const isRouteType = () => ['trasa', 'usek', 'kombinace'].indexOf(P.type) >= 0;

  function get(path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), P);
  }
  function set(path, v) {
    const ks = path.split('.');
    const last = ks.pop();
    ks.reduce((o, k) => o[k], P)[last] = v;
  }

  /* ---------- Kroky ---------- */
  function stepZakladni() {
    let h = '<h2>Základní informace</h2>';
    h += '<div class="grid2">';
    h += fld('Typ omezení', sel('type', P.type, Object.entries(DP.TYPES).map(([k, t]) => [k, t.label])), 'Podle typu se nabízí odpovídající zastávky, text a mapka.');
    h += fld('Formát tisku', sel('format', P.format, Object.entries(DP.FORMATS).map(([k, f]) => [k, f.label])), 'Předloha je A5 na šířku; „A4 na šířku“ je její přesné zvětšení.');
    h += '</div>';

    h += '<fieldset><legend>Dotčené linky</legend><div class="lines">';
    P.lines.forEach((l, i) => {
      h += `<div class="line-row"><span class="line-chip">${esc(l.label || '?')}</span><input data-line="${l.id}" data-f="label" value="${esc(l.label)}" placeholder="např. 61" maxlength="5" aria-label="Označení linky ${i + 1}">
      <button type="button" class="ic" data-a="lineUp" data-id="${l.id}" title="Posunout dříve" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="ic" data-a="lineDown" data-id="${l.id}" title="Posunout později" ${i === P.lines.length - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" class="ic danger" data-a="lineDel" data-id="${l.id}" title="Odebrat linku" ${P.lines.length === 1 ? 'disabled' : ''}>✕</button></div>`;
    });
    h += `</div><button type="button" class="add" data-a="lineAdd">+ Přidat linku</button></fieldset>`;

    h += '<fieldset><legend>Nadpis</legend>';
    h += fld('Horní řádek nadpisu', inp('headline', P.headline));
    h += fld('Název výluky', `<div class="row">${inp('title', P.title, 'placeholder="např. Přesun zastávky Debř, škola"')}<button type="button" data-a="suggestTitle">Navrhnout</button></div>`);
    h += '</fieldset>';

    h += '<fieldset><legend>Platnost</legend><div class="grid3">';
    h += fld('Začátek platnosti', inp('dateFrom', P.dateFrom, 'type="date"'));
    h += fld('Konec platnosti', inp('dateTo', P.dateTo, 'type="date"'), 'Prázdné = do odvolání');
    h += fld('Časové omezení', inp('timeLimit', P.timeLimit, 'placeholder="např. v pracovních dnech 8:00–15:00"'), 'Nepovinné');
    h += '</div>';
    h += chk('dateTextAuto', P.dateTextAuto, 'Text termínu sestavit automaticky z dat');
    h += fld('Text termínu v červeném pruhu', inp('dateText', DP.dateText(P), P.dateTextAuto ? 'readonly class="ro"' : ''), P.dateTextAuto ? 'Pro ruční úpravu zrušte zaškrtnutí výše.' : '');
    h += '</fieldset>';

    h += '<fieldset><legend>Důvod a doplňující informace</legend>';
    h += `<div class="grid-reason">${fld('Důvod omezení', inp('reason', P.reason, 'placeholder="např. stavební výkopové práce na havárii vodovodu"'), 'Do textu se vloží jako „Důvodem je/jsou …“')}${fld('Tvar', sel('reasonVerb', P.reasonVerb, [['auto', 'automaticky (' + DP.reasonVerb(Object.assign({}, P, { reasonVerb: 'auto' })) + ')'], ['je', 'Důvodem je'], ['jsou', 'Důvodem jsou']]))}</div>`;
    h += fld('Doplňující informace pro cestující', ta('extraInfo', P.extraInfo, 2), 'Nepovinné – vloží se jako samostatný odstavec.');
    h += '</fieldset>';

    h += '<fieldset><legend>Informační odkaz</legend><div class="grid2">';
    h += fld('Text nad odkazem', ta('linkLabel', P.linkLabel, 2));
    h += fld('Zobrazený odkaz', inp('linkText', P.linkText));
    h += '</div><div class="grid2">';
    h += fld('Adresa v QR kódu', inp('qrUrl', P.qrUrl, 'placeholder="https://dpmlb.cz/"'));
    h += `<div class="fld">${chk('showQr', P.showQr, 'Zobrazit QR kód')}</div>`;
    h += '</div></fieldset>';
    h += navBtns(null, 'zastavky');
    return h;
  }

  function stopCard(s, i) {
    const K = DP.KINDS[s.kind];
    const origs = P.stops.filter((x) => DP.isOrigKind(x.kind) && x.id !== s.id);
    const dirs = Array.from(new Set(P.stops.map((x) => x.direction.trim()).filter(Boolean)));
    const k = (f) => `data-stop="${s.id}" data-f="${f}"`;
    let h = `<div class="stop kind-${s.kind}" id="card-${s.id}">`;
    h += `<div class="stop-head"><span class="num">${i + 1}</span><span class="dot"></span><b>${esc(s.name || 'Nová zastávka')}</b><em>${esc(K.label)}${s.direction ? ' · směr ' + esc(s.direction) : ''}</em>
      <span class="sp"></span>
      <button type="button" class="ic" data-a="stopUp" data-id="${s.id}" title="Posunout dříve" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="ic" data-a="stopDown" data-id="${s.id}" title="Posunout později" ${i === P.stops.length - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" class="ic" data-a="stopDup" data-id="${s.id}" title="Duplikovat">⧉</button>
      <button type="button" class="ic danger" data-a="stopDel" data-id="${s.id}" title="Odstranit">✕</button></div>`;
    h += '<div class="grid3">';
    h += fld('Název zastávky', `<input ${k('name')} value="${esc(s.name)}" placeholder="přesně podle jízdního řádu">`);
    h += fld('Typ zastávky', `<select ${k('kind')}>${Object.entries(DP.KINDS).map(([v, t]) => `<option value="${v}"${v === s.kind ? ' selected' : ''}>${esc(t.label)}</option>`).join('')}</select>`);
    h += fld('Směr jízdy (na …)', `<input ${k('direction')} value="${esc(s.direction)}" list="dl-dirs" placeholder="např. Hrdlořezy">`);
    h += '</div>';
    if (P.lines.length > 1) {
      h += `<div class="fld"><span class="lbl">Linky obsluhující zastávku <small>(nic nezaškrtnuto = všechny dotčené linky)</small></span><div class="chips">${P.lines
        .map((l) => `<label class="chip"><input type="checkbox" ${k('lineIds')} value="${l.id}"${s.lineIds.indexOf(l.id) >= 0 ? ' checked' : ''}> ${esc(l.label || '?')}</label>`)
        .join('')}</div></div>`;
    }
    if (DP.isNewKind(s.kind) && s.kind !== 'nova') {
      h += '<div class="grid3 pair">';
      h += fld(
        'Nahrazuje stanoviště',
        `<select ${k('pairId')}><option value="">— vyberte původní / zrušenou zastávku —</option>${origs
          .map((o) => `<option value="${o.id}"${o.id === s.pairId ? ' selected' : ''}>${esc(o.name || '(bez názvu)')}${o.direction ? ' – směr ' + esc(o.direction) : ''}</option>`)
          .join('')}</select>`,
        origs.length ? 'Propojí původní a náhradní stanoviště jako jednu změnu.' : 'Nejprve přidejte původní nebo zrušenou zastávku.'
      );
      h += fld('Poloha vůči původnímu', `<select ${k('shift')}><option value="za"${s.shift === 'za' ? ' selected' : ''}>za původním (ve směru jízdy)</option><option value="pred"${s.shift === 'pred' ? ' selected' : ''}>před původním</option></select>`, 'Použije se ve schématu bez podkladové mapy.');
      h += fld('Vzdálenost (nepovinné)', `<input ${k('distance')} value="${esc(s.distance)}" placeholder="např. cca 60 m">`, 'Uveďte jen ověřený údaj.');
      h += '</div>';
    }
    h += `<details class="more"${s.note ? ' open' : ''}><summary>Popisek a značka na mapce</summary><div class="grid3">`;
    h += fld('Popisek na mapce', `<textarea ${k('note')} rows="2" placeholder="${esc(DP.mapLabel(P, Object.assign({}, s, { note: '' })) || '(bez popisku)')}">${esc(s.note)}</textarea>`, 'Prázdné = automatický popisek. Nový řádek = zalomení.', 'span2');
    h += fld(
      'Strana popisku',
      `<select ${k('labelSide')}>${[['auto', 'automaticky'], ['left', 'vlevo'], ['right', 'vpravo'], ['below', 'pod značkou'], ['above', 'nad značkou'], ['none', 'bez popisku']]
        .map(([v, t]) => `<option value="${v}"${s.labelSide === v ? ' selected' : ''}>${t}</option>`)
        .join('')}</select>`
    );
    h += fld(
      'Šipka na označníku',
      `<select ${k('arrow')}>${[['auto', 'automaticky podle směru'], ['left', '←'], ['right', '→'], ['none', 'bez šipky']]
        .map(([v, t]) => `<option value="${v}"${s.arrow === v ? ' selected' : ''}>${t}</option>`)
        .join('')}</select>`
    );
    h += `<div class="fld"><label class="chk"><input type="checkbox" ${k('showOnMap')}${s.showOnMap !== false ? ' checked' : ''}> Zobrazit na mapce</label>${
      s.pos ? `<button type="button" class="link" data-a="stopResetPos" data-id="${s.id}">Zrušit polohu na podkladové mapě</button>` : ''
    }</div>`;
    h += `</div></details>`;
    h += `<datalist id="dl-dirs">${dirs.map((d) => `<option value="${esc(d)}">`).join('')}</datalist>`;
    h += '</div>';
    return h;
  }

  function stepZastavky() {
    let h = '<h2>Zastávky</h2>';
    if (isRouteType()) h += '<p class="note">Zadávejte zastávky <b>v pořadí po trase</b> (ve směru vpravo ve schématu). Zastávky beze změny a trvalé tvoří společnou část trasy, mezi nimi se zakreslí původní (neobsluhovaný) úsek a změněná trasa.</p>';
    else h += '<p class="note">U přesunu zadejte <b>zrušené / původní stanoviště</b> a k němu <b>přesunutou nebo náhradní zastávku</b> a propojte je. Zastávky, které zůstávají na místě (např. v protisměru), zadejte jako „Zastávka beze změny“.</p>';
    h += '<div class="quick">';
    if (!isRouteType()) {
      h += '<button type="button" class="add" data-a="addMovePair">+ Přesun zastávky (původní + přesunuté stanoviště)</button>';
      h += '<button type="button" class="add" data-a="addStop" data-kind="beze">+ Zastávka beze změny</button>';
      h += '<button type="button" class="add" data-a="addStop" data-kind="zrusena">+ Zrušená zastávka</button>';
    } else {
      h += '<button type="button" class="add" data-a="addStop" data-kind="beze">+ Zastávka beze změny</button>';
      h += '<button type="button" class="add" data-a="addStop" data-kind="zrusena">+ Zrušená</button>';
      h += '<button type="button" class="add" data-a="addStop" data-kind="nahradni">+ Náhradní</button>';
      h += '<button type="button" class="add" data-a="addStop" data-kind="nova">+ Nová</button>';
      h += '<button type="button" class="add" data-a="addStop" data-kind="trvala">+ Trvalá na změněné trase</button>';
    }
    h += '</div>';
    if (!P.stops.length) h += '<p class="empty">Zatím nejsou zadány žádné zastávky.</p>';
    P.stops.forEach((s, i) => (h += stopCard(s, i)));
    if (isRouteType()) {
      h += '<fieldset><legend>Směr jízdy ve schématu trasy</legend><div class="grid3">';
      h += fld('Směr vpravo (konec schématu)', inp('route.dirRight', P.route.dirRight, 'placeholder="např. Sídliště Západ"'));
      h += fld('Směr vlevo (začátek schématu)', inp('route.dirLeft', P.route.dirLeft));
      h += `<div class="fld">${chk('route.bothWays', P.route.bothWays, 'Změna platí v obou směrech')}</div>`;
      h += '</div></fieldset>';
    }
    h += navBtns('zakladni', 'mapa');
    return h;
  }

  function stepMapa() {
    const mode = DP.mapMode(P);
    let h = '<h2>Mapka</h2>';
    h += fld(
      'Druh mapky',
      sel('map.mode', P.map.mode, [
        ['auto', 'automaticky podle typu omezení (nyní: ' + modeName(mode) + ')'],
        ['background', 'podkladová mapa se značkami zastávek'],
        ['stopScheme', 'schéma přesunu zastávky (bez podkladu)'],
        ['routeScheme', 'schéma změny trasy'],
        ['none', 'bez mapky'],
      ])
    );
    h += '<fieldset><legend>Podkladová mapa</legend>';
    h += `<p class="note">Nahrajte výřez mapy (PNG/JPG), např. export z mapového podkladu, který máte právo použít. Aplikace nepoužívá žádné online mapové služby. Doporučený poměr stran 1,35 : 1 (širší než vyšší).</p>`;
    h += `<div class="row"><input type="file" id="map-file" accept="image/png,image/jpeg,image/webp"><span class="muted">${P.map.image ? 'Nahráno: ' + esc(P.map.imageName || 'obrázek') : 'Bez podkladové mapy'}</span>${
      P.map.image ? '<button type="button" data-a="mapRemove" class="danger-txt">Odebrat</button>' : ''
    }</div>`;
    if (mode === 'background') h += '<p class="note ok">Značky zastávek umístěte <b>přetažením myší v náhledu</b> vpravo. Popisky se posouvají spolu se značkou; jejich stranu nastavíte u zastávky.</p>';
    h += chk('map.showMoveArrow', P.map.showMoveArrow, 'Na podkladové mapě zobrazit šipku od původního k přesunutému stanovišti (předloha ji nemá)');
    h += '</fieldset>';
    h += '<fieldset><legend>Schémata</legend>';
    h += chk('map.showLegend', P.map.showLegend, 'Legenda ve schématu trasy');
    h += chk('map.showSchemeNote', P.map.showSchemeNote, 'Poznámka „schematické znázornění“ (doporučeno – schéma není geograficky přesné)');
    h += '</fieldset>';
    h += navBtns('zastavky', 'text');
    return h;
  }

  function modeName(m) {
    return { background: 'podkladová mapa', stopScheme: 'schéma přesunu', routeScheme: 'schéma trasy', none: 'bez mapky' }[m] || m;
  }

  function stepText() {
    const gen = DP.generateDescription(P);
    const cur = P.descAuto ? gen : P.description;
    let h = '<h2>Text vývěsky</h2>';
    h += fld('Nadpis panelu', inp('descHeading', P.descHeading));
    h += `<div class="row between"><label class="chk"><input type="checkbox" data-k="descAuto"${P.descAuto ? ' checked' : ''}> Sestavovat text automaticky z vyplněných údajů</label>
      <button type="button" data-a="regen">Vložit nový návrh z údajů</button></div>`;
    h += fld(
      'Popis změny',
      `<textarea id="desc" data-k="description" rows="12">${esc(cur)}</textarea>`,
      '<b>**tučně**</b> = tučné písmo · prázdný řádek = nový odstavec. Úpravou textu se automatické sestavování vypne. Názvy zastávek zůstávají přesně podle zadání.'
    );
    h += `<p class="muted" id="desc-count">${cur.length} znaků</p>`;
    h += navBtns('mapa', 'kontrola');
    return h;
  }

  function stepKontrola() {
    let h = '<h2>Kontrola a tisk</h2>';
    h += '<div id="check-list" class="check-list"></div>';
    h += '<fieldset><legend>Tisk</legend><ol class="howto">';
    h += `<li>Klikněte na <b>Otevřít tiskovou stránku</b> – otevře se samostatná stránka jen s vývěskou.</li>`;
    h += `<li>Stiskněte <b>Ctrl + P</b> nebo tlačítko „Tisk / uložit jako PDF“.</li>`;
    h += `<li>Nastavte: cíl <b>Uložit jako PDF</b> (nebo tiskárnu), papír <b>${esc(DP.FORMATS[P.format].label.replace(/\s*\(.*\)$/, ''))}</b>, okraje <b>Žádné</b>, měřítko <b>100 %</b> (Výchozí), zapnuté <b>Grafika na pozadí</b>.</li>`;
    h += `</ol><button type="button" class="primary big" data-a="print">Otevřít tiskovou stránku</button></fieldset>`;
    h += '<fieldset><legend>Uložení</legend><p class="note">Vývěska se průběžně ukládá <b>jen v tomto prohlížeči na tomto počítači</b> (localStorage). Data se nesynchronizují mezi počítači ani uživateli a smazáním dat prohlížeče se ztratí. Pro zálohu nebo přenos použijte <b>Export JSON</b>.</p>';
    h += fld('Interní název (jen pro seznam uložených)', inp('name', P.name, 'placeholder="' + esc(P.title || 'bez názvu') + '"'));
    h += '</fieldset>';
    h += navBtns('text', null);
    return h;
  }

  function navBtns(prev, next) {
    return `<div class="nav">${prev ? `<button type="button" data-step-go="${prev}">← Zpět</button>` : '<span></span>'}${next ? `<button type="button" class="primary-soft" data-step-go="${next}">Pokračovat →</button>` : ''}</div>`;
  }

  function focusKey(el) {
    if (!el || !el.dataset) return null;
    if (el.dataset.k) return `[data-k="${el.dataset.k}"]`;
    if (el.dataset.line) return `[data-line="${el.dataset.line}"]`;
    if (el.dataset.stop && el.dataset.f) return `[data-stop="${el.dataset.stop}"][data-f="${el.dataset.f}"]` + (el.type === 'checkbox' ? `[value="${el.value}"]` : '');
    return null;
  }

  function renderForm() {
    const f = $('#form');
    const y = f.parentElement.scrollTop;
    const ae = document.activeElement;
    const fk = f.contains(ae) ? focusKey(ae) : null;
    let selStart = null;
    try {
      selStart = ae && ae.selectionStart != null ? [ae.selectionStart, ae.selectionEnd] : null;
    } catch (e) {}
    f.innerHTML = { zakladni: stepZakladni, zastavky: stepZastavky, mapa: stepMapa, text: stepText, kontrola: stepKontrola }[step]();
    document.querySelectorAll('#steps [data-step]').forEach((b) => b.classList.toggle('on', b.dataset.step === step));
    f.parentElement.scrollTop = y;
    if (fk) {
      const el = f.querySelector(fk);
      if (el) {
        el.focus({ preventScroll: true });
        try {
          if (selStart) el.setSelectionRange(selStart[0], selStart[1]);
        } catch (e) {}
      }
    }
    renderChecks();
  }

  /* ---------- Náhled ---------- */
  let renderSeq = 0;
  function renderPreview() {
    const seq = ++renderSeq;
    const box = $('#preview');
    DP.mountPoster(box, P).then((issues) => {
      if (seq !== renderSeq) return;
      lastIssues = DP.validate(P).concat(issues);
      box.querySelector('.poster').classList.add('is-editing');
      fitPreview();
      renderWarnings();
      $('#drag-hint').hidden = DP.mapMode(P) !== 'background';
    });
    $('#fmt-label').textContent = DP.FORMATS[P.format].label;
  }

  function fitPreview() {
    const wrap = $('#preview-wrap');
    const scale = $('#preview-scale');
    const poster = $('#preview .poster');
    if (!poster) return;
    const w = poster.offsetWidth,
      h = poster.offsetHeight;
    const s = Math.min(1.6, (wrap.clientWidth - 2) / w);
    scale.style.transform = `scale(${s})`;
    scale.style.width = w + 'px';
    scale.style.height = h + 'px';
    wrap.style.height = h * s + 'px';
  }

  function renderWarnings() {
    const order = { error: 0, warn: 1, info: 2 };
    const list = lastIssues.slice().sort((a, b) => order[a.level] - order[b.level]);
    const html = list.length
      ? '<ul>' + list.map((w) => `<li class="w-${w.level}"><span>${{ error: 'Chyba', warn: 'Upozornění', info: 'Info' }[w.level]}</span>${esc(w.msg)}</li>`).join('') + '</ul>'
      : '<p class="w-ok">Bez upozornění – vývěska je připravena k tisku.</p>';
    $('#warnings').innerHTML = html;
    const n = list.filter((w) => w.level !== 'info').length;
    const b = $('#warn-count');
    b.textContent = n || '';
    b.className = 'badge' + (list.some((w) => w.level === 'error') ? ' err' : n ? ' warn' : '');
    renderChecks();
  }
  function renderChecks() {
    const c = $('#check-list');
    if (c) c.innerHTML = $('#warnings').innerHTML;
  }

  /* ---------- Ukládání ---------- */
  const autosave = DP.debounce(() => {
    const err = DP.store.save(P);
    const st = $('#save-state');
    if (err) {
      st.textContent = 'Neuloženo!';
      st.className = 'save-state err';
      st.title = err;
    } else {
      st.textContent = 'Uloženo v prohlížeči ' + new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
      st.className = 'save-state';
      st.title = 'Ukládá se automaticky jen v tomto prohlížeči.';
    }
  }, 400);
  const previewSoon = DP.debounce(renderPreview, 120);
  function changed(structural) {
    if (structural) renderForm();
    previewSoon();
    autosave();
  }

  /* ---------- Události formuláře ---------- */
  function onField(e) {
    const t = e.target;
    if (t.dataset.k) {
      const k = t.dataset.k;
      let v = t.type === 'checkbox' ? t.checked : t.value;
      if (k === 'description') {
        set('description', v);
        if (P.descAuto) {
          P.descAuto = false;
          const cb = $('[data-k="descAuto"]');
          if (cb) cb.checked = false;
        }
        const c = $('#desc-count');
        if (c) c.textContent = v.length + ' znaků';
        return changed(false);
      }
      if (k === 'dateText' && P.dateTextAuto) return;
      set(k, v);
      if (k === 'dateTextAuto' && !v && !P.dateText) P.dateText = DP.fmtRange(P.dateFrom, P.dateTo);
      if (k === 'descAuto' && v === false && !P.description) P.description = DP.generateDescription(Object.assign({}, P, { descAuto: true }));
      const structural = ['type', 'format', 'dateTextAuto', 'descAuto', 'map.mode'].indexOf(k) >= 0;
      if (['dateFrom', 'dateTo', 'timeLimit'].indexOf(k) >= 0 && P.dateTextAuto) {
        const dt = $('[data-k="dateText"]');
        if (dt) dt.value = DP.dateText(P);
      }
      return changed(structural);
    }
    if (t.dataset.line) {
      const l = P.lines.find((x) => x.id === t.dataset.line);
      l.label = t.value.trim();
      const chip = t.parentElement.querySelector('.line-chip');
      if (chip) chip.textContent = l.label || '?';
      return changed(false);
    }
    if (t.dataset.stop && t.dataset.f) {
      const s = P.stops.find((x) => x.id === t.dataset.stop);
      if (!s) return;
      const f = t.dataset.f;
      if (f === 'lineIds') {
        const set2 = new Set(s.lineIds);
        t.checked ? set2.add(t.value) : set2.delete(t.value);
        s.lineIds = P.lines.map((l) => l.id).filter((id) => set2.has(id));
      } else if (f === 'showOnMap') s.showOnMap = t.checked;
      else s[f] = t.value;
      const structural = f === 'kind';
      if (f === 'name' || f === 'direction') {
        // aktualizovat záhlaví karty a nabídky bez překreslení formuláře (zachová fokus)
        const card = document.getElementById('card-' + s.id);
        if (card) {
          card.querySelector('.stop-head b').textContent = s.name || 'Nová zastávka';
          card.querySelector('.stop-head em').textContent = DP.KINDS[s.kind].label + (s.direction ? ' · směr ' + s.direction : '');
        }
        document.querySelectorAll(`select[data-f="pairId"] option[value="${s.id}"]`).forEach((o) => (o.textContent = (s.name || '(bez názvu)') + (s.direction ? ' – směr ' + s.direction : '')));
      }
      if (f === 'kind' && DP.isNewKind(s.kind) && !s.pairId) {
        const o = P.stops.find((x) => DP.isOrigKind(x.kind));
        if (o && s.kind !== 'nova') s.pairId = o.id;
      }
      return changed(structural);
    }
  }

  function move(arr, id, d) {
    const i = arr.findIndex((x) => x.id === id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  const actions = {
    lineAdd() {
      P.lines.push({ id: DP.uid('l'), label: '' });
      changed(true);
      setTimeout(() => {
        const ins = document.querySelectorAll('[data-line]');
        ins[ins.length - 1].focus();
      });
    },
    lineUp: (id) => (move(P.lines, id, -1), changed(true)),
    lineDown: (id) => (move(P.lines, id, 1), changed(true)),
    lineDel(id) {
      P.lines = P.lines.filter((l) => l.id !== id);
      P.stops.forEach((s) => (s.lineIds = s.lineIds.filter((x) => x !== id)));
      changed(true);
    },
    suggestTitle() {
      const t = DP.suggestTitle(P);
      if (t) {
        P.title = t;
        changed(true);
      }
    },
    addStop(_, btn) {
      const name = P.stops.length ? P.stops[P.stops.length - 1].name : '';
      const s = DP.newStop({ kind: btn.dataset.kind, name: isRouteType() ? '' : name });
      P.stops.push(s);
      changed(true);
      focusCard(s.id);
    },
    addMovePair() {
      const o = DP.newStop({ kind: 'zrusena' });
      const n = DP.newStop({ kind: 'presunuta', pairId: o.id });
      P.stops.push(o, n);
      changed(true);
      focusCard(o.id);
    },
    stopUp: (id) => (move(P.stops, id, -1), changed(true)),
    stopDown: (id) => (move(P.stops, id, 1), changed(true)),
    stopDup(id) {
      const i = P.stops.findIndex((s) => s.id === id);
      const c = DP.clone(P.stops[i]);
      c.id = DP.uid('z');
      if (c.pos) c.pos = { x: Math.min(0.95, c.pos.x + 0.04), y: c.pos.y };
      P.stops.splice(i + 1, 0, c);
      changed(true);
    },
    stopDel(id) {
      P.stops = P.stops.filter((s) => s.id !== id);
      P.stops.forEach((s) => s.pairId === id && (s.pairId = ''));
      changed(true);
    },
    stopResetPos(id) {
      P.stops.find((s) => s.id === id).pos = null;
      changed(true);
    },
    mapRemove() {
      P.map.image = '';
      P.map.imageName = '';
      changed(true);
    },
    regen() {
      if (!P.descAuto && P.description && !confirm('Nahradit ručně upravený text novým návrhem z vyplněných údajů?')) return;
      P.description = DP.generateDescription(Object.assign({}, P, { descAuto: true }));
      P.descAuto = false;
      changed(true);
    },
    print: () => openPrint(),
  };

  function focusCard(id) {
    setTimeout(() => {
      const c = document.getElementById('card-' + id);
      if (c) {
        c.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const i = c.querySelector('input');
        i && i.focus({ preventScroll: true });
      }
    }, 30);
  }

  /* ---------- Horní lišta ---------- */
  function openPrint() {
    const err = DP.store.save(P);
    if (err) return alert(err);
    const hasErr = lastIssues.some((w) => w.level === 'error');
    if (hasErr && !confirm('Vývěska obsahuje chyby (viz upozornění). Přesto otevřít tiskovou stránku?')) return;
    window.open('tisk.html?id=' + encodeURIComponent(P.id), '_blank');
  }

  function dialog(html) {
    $('#dlg-body').innerHTML = html;
    const d = $('#dlg');
    if (!d.open) d.showModal();
  }

  function library() {
    const items = DP.store.list();
    let h = '<h3>Uložené vývěsky v tomto prohlížeči</h3>';
    h += '<p class="muted">Ukládá se jen lokálně (localStorage). Na jiném počítači je neuvidíte – použijte Export/Import JSON.</p>';
    if (!items.length) h += '<p>Žádné uložené vývěsky.</p>';
    h += '<ul class="lib">';
    items.forEach((it) => {
      const lines = (it.lines || []).map((l) => l.label).filter(Boolean).join(', ');
      h += `<li class="${it.id === P.id ? 'cur' : ''}"><div><b>${esc(it.name || it.title || 'bez názvu')}</b><small>${esc(lines ? 'linky ' + lines + ' · ' : '')}${esc(it.title || '')} · upraveno ${new Date(it.updatedAt).toLocaleString('cs-CZ')}</small></div>
      <button type="button" data-lib="open" data-id="${it.id}">Otevřít</button><button type="button" data-lib="dup" data-id="${it.id}">Nová podle této</button><button type="button" class="danger-txt" data-lib="del" data-id="${it.id}">Smazat</button></li>`;
    });
    h += '</ul>';
    dialog(h);
  }

  function samples() {
    let h = '<h3>Vzory a testovací vývěsky</h3><p class="muted">Otevře se jako nová vývěska (původní data zůstanou uložena).</p><ul class="lib">';
    DP.SAMPLES.forEach((s) => (h += `<li><div><b>${esc(s.label)}</b></div><button type="button" data-sample="${s.key}">Otevřít</button></li>`));
    h += '</ul>';
    dialog(h);
  }

  function setPoster(np) {
    P = DP.normalize(np);
    DP.store.save(P);
    step = 'zakladni';
    renderForm();
    renderPreview();
    autosave();
  }

  function duplicateOf(src) {
    const c = DP.clone(src);
    c.id = DP.uid('v');
    c.name = (src.name || src.title || 'Vývěska') + ' – kopie';
    return c;
  }

  function exportJson() {
    const data = JSON.stringify({ app: 'dpmlb-vyvesky', version: DP.VERSION, exportedAt: new Date().toISOString(), poster: P }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    const slug = (P.title || 'vyveska')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    a.href = URL.createObjectURL(blob);
    a.download = `vyveska-${slug || 'dpmlb'}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 500);
  }

  function importJson(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(r.result);
        const p = j && j.poster ? j.poster : j;
        if (!p || !Array.isArray(p.lines)) throw new Error('Soubor neobsahuje data vývěsky.');
        let np = DP.normalize(p);
        if (DP.store.get(np.id) && !confirm('Vývěska s tímto ID už v prohlížeči je. Přepsat ji importovanou verzí? (Zrušit = importovat jako novou)')) np.id = DP.uid('v');
        setPoster(np);
      } catch (e) {
        alert('Import se nezdařil: ' + e.message);
      }
    };
    r.readAsText(file);
  }

  /** Zmenšení nahraného obrázku, aby se vešel do úložiště prohlížeče */
  function loadMapImage(file) {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 2600;
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        P.map.image = c.toDataURL('image/jpeg', 0.88);
        P.map.imageName = file.name + ` (${c.width}×${c.height} px)`;
        if (P.map.mode === 'auto' || P.map.mode === 'stopScheme') P.map.mode = 'background';
        const ratio = c.width / c.height;
        if (Math.abs(ratio - 1.353) > 0.15) alert('Poměr stran obrázku se liší od mapového pole vývěsky (1,35 : 1). Obrázek bude oříznut na střed.');
        changed(true);
      };
      img.onerror = () => alert('Obrázek se nepodařilo načíst.');
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* ---------- Přetahování značek v náhledu ---------- */
  function setupDrag() {
    const box = $('#preview');
    let drag = null;
    box.addEventListener('pointerdown', (e) => {
      if (DP.mapMode(P) !== 'background') return;
      const t = e.target.closest('[data-stop]');
      const map = box.querySelector('.p-map');
      if (!t || !map || !t.dataset.stop) return;
      const s = P.stops.find((x) => x.id === t.dataset.stop);
      if (!s) return;
      const r = map.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width,
        fy = (e.clientY - r.top) / r.height;
      const cur = s.pos || stopDefaultPos(s);
      drag = { s, dx: cur.x - fx, dy: cur.y - fy, el: t };
      box.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    box.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const r = box.querySelector('.p-map').getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width + drag.dx));
      const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height + drag.dy));
      drag.s.pos = { x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 };
      drawMapOnly();
    });
    const end = () => {
      if (!drag) return;
      drag = null;
      changed(step === 'zastavky');
    };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
  }
  function stopDefaultPos(s) {
    const vis = P.stops.filter((x) => x.showOnMap !== false);
    const i = vis.indexOf(s);
    return { x: 0.3 + 0.12 * (i % 4), y: 0.45 + 0.16 * Math.floor(i / 4) };
  }
  function drawMapOnly() {
    const m = $('#preview .p-map');
    if (m) m.innerHTML = DP.renderMap(P);
  }

  /* ---------- Start ---------- */
  function init() {
    load();
    const form = $('#form');
    form.addEventListener('input', onField);
    form.addEventListener('change', (e) => {
      if (e.target.id === 'map-file') {
        if (e.target.files[0]) loadMapImage(e.target.files[0]);
        return;
      }
      onField(e);
    });
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]');
      if (a && actions[a.dataset.a]) {
        e.preventDefault();
        return actions[a.dataset.a](a.dataset.id, a);
      }
      const st = e.target.closest('[data-step],[data-step-go]');
      if (st) {
        step = st.dataset.step || st.dataset.stepGo;
        renderForm();
        $('.editor').scrollTop = 0;
        return;
      }
      const top = e.target.closest('[data-act]');
      if (top) {
        const act = top.dataset.act;
        if (act === 'new') {
          if (confirm('Založit novou prázdnou vývěsku? Aktuální zůstane uložena v seznamu.')) setPoster(DP.newPoster());
        } else if (act === 'library') library();
        else if (act === 'samples') samples();
        else if (act === 'duplicate') setPoster(duplicateOf(P));
        else if (act === 'export') exportJson();
        else if (act === 'import') $('#import-file').click();
        else if (act === 'print') openPrint();
        return;
      }
      const lib = e.target.closest('[data-lib]');
      if (lib) {
        const id = lib.dataset.id;
        if (lib.dataset.lib === 'open') setPoster(DP.store.get(id));
        if (lib.dataset.lib === 'dup') setPoster(duplicateOf(DP.store.get(id)));
        if (lib.dataset.lib === 'del') {
          if (!confirm('Opravdu smazat tuto vývěsku z prohlížeče?')) return;
          DP.store.remove(id);
          if (id === P.id) {
            const rest = DP.store.list();
            setPoster(rest[0] ? DP.store.get(rest[0].id) : DP.newPoster());
          }
          library();
          return;
        }
        $('#dlg').close();
        return;
      }
      const smp = e.target.closest('[data-sample]');
      if (smp) {
        const s = DP.SAMPLES.find((x) => x.key === smp.dataset.sample);
        setPoster(s.make());
        $('#dlg').close();
      }
    });
    $('#import-file').addEventListener('change', (e) => {
      if (e.target.files[0]) importJson(e.target.files[0]);
      e.target.value = '';
    });
    window.addEventListener('resize', DP.debounce(fitPreview, 100));
    setupDrag();
    renderForm();
    renderPreview();
    window.DP_EDITOR = { get: () => P, set: setPoster, issues: () => lastIssues, go: (s) => ((step = s), renderForm()) };
  }
  document.addEventListener('DOMContentLoaded', init);
})();

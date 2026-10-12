/* DPMLB – výlukové vývěsky
 * Automatické sestavení návrhu textů. Používá výhradně zadané údaje –
 * nic nedopočítává (jízdní řády, spoje, vzdálenosti apod.).
 */
(function () {
  'use strict';
  const DP = window.DP;

  const q = (s) => '„' + s + '“';
  const qList = (arr) => DP.joinCs(arr.map(q));
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

  function linesGen(p) {
    const l = p.lines.map((x) => x.label.trim()).filter(Boolean);
    if (!l.length) return '';
    return (l.length === 1 ? 'linky ' : 'linek ') + DP.joinCs(l);
  }

  /** „je“ / „jsou“ k důvodu omezení */
  DP.reasonVerb = function (p) {
    if (p.reasonVerb === 'je' || p.reasonVerb === 'jsou') return p.reasonVerb;
    const first = (p.reason || '').toLowerCase().split(/[\s,]+/).slice(0, 3).join(' ');
    return /\b(práce|opravy|úpravy|uzavírky|stavby|akce|slavnosti|oslavy|trhy|závody)\b/.test(first) ? 'jsou' : 'je';
  };

  DP.suggestTitle = function (p) {
    const orig = p.stops.find((s) => DP.isOrigKind(s.kind)) || p.stops.find((s) => DP.isNewKind(s.kind)) || p.stops[0];
    const nm = orig && orig.name.trim();
    switch (p.type) {
      case 'presun':
        return nm ? 'Přesun zastávky ' + nm : 'Přesun zastávky';
      case 'zruseni':
        return nm ? 'Zrušení zastávky ' + nm : 'Zrušení zastávky';
      case 'nahradni':
        return nm ? 'Náhradní zastávka za zastávku ' + nm : 'Náhradní zastávka';
      case 'trasa':
        return 'Změna trasy';
      case 'usek':
        return 'Zrušení části trasy';
      default:
        return '';
    }
  };

  function stopSentences(p) {
    const out = [];
    const byId = {};
    p.stops.forEach((s) => (byId[s.id] = s));
    const paired = new Set();
    const newOnes = p.stops.filter((s) => (s.kind === 'presunuta' || s.kind === 'nahradni') && s.name.trim());

    // přesuny / náhrady se známým původním stanovištěm
    const moves = newOnes.map((n) => ({ n, o: byId[n.pairId] })).filter((x) => x.o);
    moves.forEach(({ o }) => paired.add(o.id));

    const moveTxt = [];
    moves.forEach(({ n, o }) => {
      const dir = (o.direction || n.direction).trim();
      const isMove = n.kind === 'presunuta';
      let t = isMove
        ? `dochází k dočasnému **přemístění autobusové zastávky ${q(o.name)}${dir ? ' ve směru na ' + dir : ''}**.`
        : `je za zastávku ${q(o.name)}${dir ? ' ve směru na ' + dir : ''} zavedena **náhradní zastávka${n.name.trim() !== o.name.trim() ? ' ' + q(n.name) : ''}**.`;
      let t2 = '';
      if (isMove) t2 = 'V provozu bude po tuto dobu náhradní stanoviště zastávky' + (n.name.trim() !== o.name.trim() ? ' ' + q(n.name) : '') + '.';
      if (n.distance.trim()) t2 += (t2 ? ' ' : '') + `Náhradní stanoviště se nachází ${n.distance.trim()} ${n.shift === 'pred' ? 'před' : 'za'} původním stanovištěm.`;
      if (n.note.trim() && !/\n/.test(n.note)) t2 += (t2 ? ' ' : '') + DP.capFirst(n.note.trim().replace(/\.?$/, '.'));
      moveTxt.push({ t, t2 });
    });

    // zrušené bez náhrady
    const cancelled = p.stops.filter((s) => s.kind === 'zrusena' && !paired.has(s.id) && s.name.trim());
    // náhradní/přesunuté bez vazby
    const loose = newOnes.filter((n) => !byId[n.pairId]);
    const created = p.stops.filter((s) => s.kind === 'nova' && s.name.trim());
    return { moveTxt, cancelled, loose, created };
  }

  function routeSentences(p, lg) {
    const R = DP.routeModel(p);
    const parts = [];
    const segs = R.segs;
    const between = [];
    segs.forEach((g, i) => {
      if (g.type !== 'bypass') return;
      const a = segs[i - 1] && segs[i - 1].stop;
      const b = segs[i + 1] && segs[i + 1].stop;
      between.push({ a, b, g });
    });
    const spoje = lg ? 'spoje ' + lg : 'spoje';
    if (p.type === 'usek') {
      between.forEach(({ a, b, g }) => {
        if (a && b) parts.push(`nejsou ${spoje} vedeny v úseku mezi zastávkami ${q(a.name)} a ${q(b.name)}.`);
        else if (a) parts.push(`jsou ${spoje} ukončeny v zastávce ${q(a.name)}.`);
        else if (b) parts.push(`jsou ${spoje} vedeny až od zastávky ${q(b.name)}.`);
      });
    } else {
      const pairs = between.filter((x) => x.a && x.b);
      if (pairs.length) parts.push(`jsou ${spoje} vedeny **po změněné trase** ${pairs.map((x) => `mezi zastávkami ${q(x.a.name)} a ${q(x.b.name)}`).join(' a ')}.`);
      else if (between.length) parts.push(`jsou ${spoje} vedeny **po změněné trase**.`);
    }
    const orig = [].concat(...between.map((x) => x.g.orig)).filter((s) => s.name.trim());
    const div = [].concat(...between.map((x) => x.g.div)).filter((s) => s.name.trim());
    const extra = [];
    const origNames = uniq(orig.map((s) => s.name.trim()));
    if (origNames.length) extra.push(origNames.length === 1 ? `Bez obsluhy je zastávka **${q(origNames[0])}**.` : `Bez obsluhy jsou zastávky **${qList(origNames)}**.`);
    if (div.length) {
      const items = div.map((s) => q(s.name.trim()) + (s.kind === 'nahradni' ? ' (náhradní zastávka)' : s.kind === 'nova' ? ' (nová zastávka)' : ''));
      extra.push(`Na změněné trase zastavují spoje ${div.length === 1 ? 'v zastávce' : 'v zastávkách'} ${DP.joinCs(items)}.`);
    }
    return { lead: parts.join(' '), extra };
  }

  DP.generateDescription = function (p) {
    const f = DP.parseISO(p.dateFrom),
      t = DP.parseISO(p.dateTo);
    let when = '';
    if (f || t) when = DP.capFirst(DP.fmtRange(p.dateFrom, p.dateTo, { yearStart: false }));
    if (when && p.timeLimit.trim()) when += ', ' + p.timeLimit.trim() + ',';
    const W = when ? `**${when}** ` : '';
    const lg = linesGen(p);
    const paras = [];
    const S = stopSentences(p);
    const routeType = p.type === 'trasa' || p.type === 'usek' || (p.type === 'kombinace' && DP.mapMode(p) === 'routeScheme');

    if (routeType) {
      const R = routeSentences(p, lg);
      if (R.lead) paras.push(W + R.lead);
      if (R.extra.length) paras.push(R.extra.join(' '));
      if (p.type === 'kombinace') S.moveTxt.forEach((m) => paras.push(DP.capFirst(m.t) + (m.t2 ? ' ' + m.t2 : '')));
    } else {
      let first = true;
      const lead = () => {
        const x = first ? W : '';
        first = false;
        return x;
      };
      S.moveTxt.forEach((m) => {
        const x = lead();
        paras.push((x ? x + m.t : DP.capFirst(m.t)) + (m.t2 ? '\n\n' + m.t2 : ''));
      });
      if (S.cancelled.length) {
        const names = uniq(S.cancelled.map((s) => s.name.trim()));
        const dirs = uniq(S.cancelled.map((s) => s.direction.trim()));
        const dirTxt = dirs.length === 1 ? ' ve směru na ' + dirs[0] : '';
        const x = lead();
        const verb = names.length === 1 ? 'nebude obsluhována zastávka' : 'nebudou obsluhovány zastávky';
        paras.push((x ? x + verb : DP.capFirst(verb)) + ` **${qList(names)}**${dirTxt}.`);
      }
      S.loose.forEach((n) => {
        const x = lead();
        const verb = `je zavedena ${n.kind === 'nahradni' ? 'náhradní' : 'přesunutá'} zastávka **${q(n.name.trim())}**${n.direction.trim() ? ' ve směru na ' + n.direction.trim() : ''}.`;
        paras.push(x ? x + verb : DP.capFirst(verb));
      });
      if (S.created.length) {
        const names = uniq(S.created.map((s) => s.name.trim()));
        const x = lead();
        const verb = names.length === 1 ? `je do trasy zařazena nová zastávka **${q(names[0])}**.` : `jsou do trasy zařazeny nové zastávky **${qList(names)}**.`;
        paras.push(x ? x + verb : DP.capFirst(verb));
      }
      if (!paras.length && W) paras.push(W.trim() + ' ' + 'platí dopravní omezení' + (lg ? ' ' + lg : '') + '.');
      if (p.lines.filter((l) => l.label.trim()).length > 1 && paras.length) paras[paras.length - 1] += ` Týká se ${lg}.`;
    }

    // přiřadí odstavec s důvodem
    const reason = (p.reason || '').trim().replace(/\.+$/, '');
    if (reason) {
      const sent = `Důvodem ${DP.reasonVerb(p)} ${reason}.`;
      if (paras.length) {
        // spojit s posledním odstavcem stejně jako v předloze
        const last = paras.pop().split('\n\n');
        last[last.length - 1] += ' ' + sent;
        paras.push(last.join('\n\n'));
      } else paras.push(sent);
    }
    if (p.extraInfo.trim()) paras.push(p.extraInfo.trim());
    return paras.join('\n\n');
  };

  /** Popisek značky na mapce (automatický nebo vlastní) */
  DP.mapLabel = function (p, s) {
    if (s.note && s.note.trim()) return s.note;
    if (s.kind === 'beze' || s.kind === 'trvala') {
      return s.direction.trim() ? `zastávka ve směru ${s.direction.trim()} zůstává v původní poloze` : 'zastávka zůstává v původní poloze';
    }
    return DP.KINDS[s.kind].mapLabel;
  };
})();

/* DPMLB – výlukové vývěsky
 * Testovací vzory. Vzor 1 přebírá údaje z předlohy 03e-vyluka_zastavky.pdf doslova
 * (včetně údajů, na které editor upozorní jako na možný rozpor).
 * Vzory 2–4 jsou smyšlená TESTOVACÍ data pro ověření funkcí – nejsou to skutečné výluky.
 */
(function () {
  'use strict';
  const DP = window.DP;

  function poster(o) {
    return DP.normalize(Object.assign(DP.newPoster(), o));
  }

  DP.SAMPLES = [
    {
      key: 'debr',
      label: 'Test 1 – Přesun zastávky Debř, škola (podle předlohy)',
      make() {
        const L = DP.uid('l');
        const zr = DP.uid('z');
        return poster({
          name: 'Debř, škola – přesun zastávky (vzor)',
          format: 'a4l',
          type: 'presun',
          lines: [{ id: L, label: '61' }],
          headline: 'Omezení dopravy',
          title: 'Přesun zastávky Debř, škola',
          dateFrom: '2026-09-22',
          dateTo: '2026-10-31',
          dateTextAuto: false,
          dateText: 'od úterý 22. září 2026 do pátku 31. října',
          reason: 'stavební výkopové práce na havárii vodovodu',
          reasonVerb: 'jsou',
          descAuto: false,
          description:
            '**Od úterý 22. září do pátku 31. října** dochází k dočasnému **přemístění autobusové zastávky „Debř, škola“ ve směru na Hrdlořezy**.\n\nV provozu bude po tuto dobu náhradní stanoviště zastávky. Důvodem jsou stavební výkopové práce na havárii vodovodu.',
          linkText: 'www. dpmlb.cz',
          qrUrl: 'https://dpmlb.cz/',
          stops: [
            DP.newStop({ id: zr, name: 'Debř, škola', direction: 'Hrdlořezy', kind: 'zrusena', pos: { x: 0.5274, y: 0.588 }, labelSide: 'right', arrow: 'left' }),
            DP.newStop({ name: 'Debř, škola', direction: 'Hrdlořezy', kind: 'presunuta', pairId: zr, shift: 'za', pos: { x: 0.4346, y: 0.5037 }, labelSide: 'left', arrow: 'left' }),
            DP.newStop({
              name: 'Debř, škola',
              direction: 'Mladá Boleslav',
              kind: 'beze',
              pos: { x: 0.5616, y: 0.6654 },
              labelSide: 'below',
              arrow: 'right',
              note: 'zastávka ve směru\nMladá Boleslav\nzůstává v původní\npoloze',
            }),
          ],
          map: { mode: 'background', image: 'assets/vzory/debr-skola-mapa.jpg', imageName: 'debr-skola-mapa.jpg (z předlohy)', showMoveArrow: false, showSchemeNote: true, showLegend: true },
        });
      },
    },
    {
      key: 'trasa',
      label: 'Test 2 – Změna trasy (smyšlená testovací data)',
      make() {
        const L = DP.uid('l');
        const z = (name, kind) => DP.newStop({ name, kind, direction: 'Sídliště Západ' });
        return poster({
          name: 'TEST – změna trasy',
          type: 'trasa',
          lines: [{ id: L, label: '25' }],
          title: 'Objízdná trasa – TESTOVACÍ VÝVĚSKA',
          dateFrom: '2026-11-02',
          dateTo: '2026-11-27',
          timeLimit: 'v pracovních dnech 8:00–15:00',
          reason: 'oprava komunikace',
          reasonVerb: 'je',
          stops: [
            z('Testovací nádraží', 'beze'),
            z('Komenského (test)', 'beze'),
            z('Školní (test)', 'zrusena'),
            z('U Pošty (test)', 'zrusena'),
            z('Nemocnice (test)', 'nahradni'),
            z('Sídliště Jih (test)', 'nova'),
            z('Náměstí (test)', 'trvala'),
            z('Sídliště Západ (test)', 'beze'),
          ],
          route: { dirRight: 'Sídliště Západ (test)', dirLeft: 'Testovací nádraží', bothWays: true },
          map: { mode: 'auto', image: '', showLegend: true, showSchemeNote: true },
        });
      },
    },
    {
      key: 'vice',
      label: 'Test 3 – Více linek (smyšlená testovací data)',
      make() {
        const labels = ['1', '3', '7', '12', '25', '61', '62', '140', 'N91'];
        const lines = labels.map((t) => ({ id: DP.uid('l'), label: t }));
        const o = DP.uid('z');
        const P = poster({
          name: 'TEST – více linek',
          type: 'presun',
          lines,
          title: 'Přesun zastávky Testovací náměstí',
          dateFrom: '2026-12-01',
          dateTo: '2027-01-15',
          reason: 'stavební práce',
          stops: [
            DP.newStop({ id: o, name: 'Testovací náměstí', direction: 'Centrum', kind: 'zrusena' }),
            DP.newStop({ name: 'Testovací náměstí', direction: 'Centrum', kind: 'presunuta', pairId: o, shift: 'za', distance: 'cca 60 m' }),
            DP.newStop({ name: 'Testovací náměstí', direction: 'Nádraží', kind: 'beze' }),
          ],
          map: { mode: 'auto', image: '' },
        });
        return P;
      },
    },
    {
      key: 'dlouhy',
      label: 'Test 4 – Dlouhý text (kontrola přetečení)',
      make() {
        const P = DP.SAMPLES[0].make();
        P.name = 'TEST – dlouhý text';
        P.description +=
          '\n\nCestující ve směru na Hrdlořezy prosíme, aby po celou dobu omezení využívali náhradní stanoviště, které je označeno přenosným označníkem zastávky. Upozorňujeme, že v místě stavby se může pohybovat stavební technika, a dbejte proto zvýšené opatrnosti při přecházení komunikace.\n\nPo dobu výluky nejsou dotčeny ostatní zastávky linky. Případné další změny budou zveřejněny s dostatečným předstihem. Tento odstavec je záměrně velmi dlouhý, aby bylo možné ověřit, že aplikace na nedostatek místa upozorní a text nepřeteče do dalších částí vývěsky, například do spodní části s odkazem a QR kódem. Pokračujeme dalšími větami, které slouží pouze k testování rozvržení textu v panelu Popis změny a nemají žádný informační význam pro cestující.';
        return P;
      },
    },
  ];
})();

# Výlukové vývěsky DPMLB

Webová aplikace pro tvorbu informačních vývěsek o dopravních omezeních Dopravního podniku Mladá Boleslav.
Zaměstnanec vyplní formulář, aplikace sestaví text a mapku a otevře **samostatnou tiskovou stránku** s hotovou vývěskou,
kterou lze rovnou vytisknout nebo uložit jako PDF (Ctrl + P).

Grafika vychází z předlohy `03e-vyluka_zastavky.pdf` – rozměry, barvy a pozice prvků byly změřeny přímo z PDF.

## Spuštění

Aplikace je čistě statická (HTML + CSS + JavaScript + SVG), **nemá žádné závislosti ani build krok** a funguje i bez internetu.

- **Lokálně:** stačí otevřít `index.html` v Google Chrome nebo Microsoft Edge (dvojklikem, funguje i přes `file://`).
- **Přes lokální server (doporučeno pro sdílení v síti):** v adresáři projektu spusťte např. `python -m http.server 8000`
  a otevřete `http://localhost:8000/`.

## Nasazení na GitHub Pages

1. Nahrajte obsah této složky do repozitáře na GitHubu (soubor `index.html` musí být v kořeni).
2. V repozitáři otevřete **Settings → Pages**, jako zdroj zvolte **Deploy from a branch**, větev `main` a složku `/ (root)`.
3. Po chvíli bude aplikace dostupná na `https://<uživatel>.github.io/<repozitář>/`.

Soubor `.nojekyll` zajišťuje, že GitHub Pages soubory nijak nezpracovává. Totéž funguje na libovolném statickém hostingu
(firemní web server, Netlify, intranet).

> Uložené vývěsky jsou vždy v prohlížeči konkrétního uživatele (viz níže) – nasazení na web je nesdílí mezi kolegy.

## Pracovní postup

1. **Základní informace** – typ omezení, formát, linky (přidat / odebrat / změnit pořadí), název, platnost,
   časové omezení, důvod, doplňující informace, informační odkaz a QR kód.
2. **Zastávky** – libovolný počet zastávek s typem (původní, přesunutá, zrušená, náhradní, nová, beze změny,
   trvalá na změněné trase), směrem jízdy a linkami. Přesunutou/náhradní zastávku lze propojit s původním stanovištěm.
3. **Mapka** – automaticky podle typu omezení:
   - *podkladová mapa se značkami* (jako v předloze) – nahrajete vlastní výřez mapy a značky přetáhnete myší v náhledu,
   - *schéma přesunu zastávky* – bez podkladu, ulice se dvěma směry, původní a nové stanoviště a šipka přesunu,
   - *schéma změny trasy* – linie ve stylu PID/IDOL: trasa beze změny, změněná trasa, původní neobsluhovaný úsek
     (přerušovaně), zrušené / náhradní / nové zastávky, směry jízdy, označení linek a legenda.
4. **Text vývěsky** – návrh textu se sestaví z údajů; lze jej libovolně upravit (`**tučně**`, prázdný řádek = odstavec).
5. **Kontrola a tisk** – přehled upozornění a tlačítko **Otevřít tiskovou stránku**.

## Tisk / uložení do PDF

Na tiskové stránce stiskněte **Ctrl + P** (nebo tlačítko „Tisk / uložit jako PDF“) a nastavte:

| Volba | Hodnota |
|---|---|
| Cíl | Uložit jako PDF (nebo tiskárna) |
| Papír | podle zvoleného formátu (výchozí **A4 na šířku**) |
| Okraje | **Žádné** (nebo Výchozí – stránka si je nastaví sama na 0) |
| Měřítko | **100 %** / Výchozí |
| Grafika na pozadí | **zapnuto** |

Velikost papíru a nulové okraje nastavuje stránka sama přes CSS `@page`. Text zůstává v PDF textem a mapky jsou vektorové (SVG).
Vývěska je navržena na celou plochu listu („na spadávku“) – při tisku na kancelářské tiskárně bez tisku do kraje
může tiskárna okraj listu nepotisknout.

### Formáty

- **A4 na šířku** – předloha (A5 na šířku) přesně zvětšená na A4 (měřítko 297/210). Výchozí.
- **A5 na šířku** – původní velikost předlohy.
- **A4 na výšku** – odvozená varianta (záhlaví a mapa podle předlohy, panel „Popis změny“ pod mapou). Předloha na výšku
  neexistuje, proto jde o návrh rozvržení k odsouhlasení.

## Ukládání dat

- Rozpracovaná vývěska se **ukládá automaticky do úložiště prohlížeče (localStorage)** – jen na tomto počítači,
  v tomto prohlížeči a pro tohoto uživatele. Data se **nesynchronizují** mezi počítači a smazáním dat prohlížeče se ztratí.
- **Uložené vývěsky** – seznam, otevření, smazání a „Nová podle této“ (kopie).
- **Export / Import JSON** – záloha a přenos vývěsky na jiný počítač. Nahraná podkladová mapa je součástí JSON.
- Kapacita úložiště prohlížeče je cca 5 MB; nahrané mapy se proto automaticky zmenšují (max. 2600 px, JPEG).

## Kontroly v editoru

Editor upozorňuje mimo jiné na: chybějící údaje, nesoulad dne v týdnu a data (např. „pátku 31. října“, když je
31. 10. 2026 sobota), mezeru v odkazu, nepropojené náhradní stanoviště, zastávky bez polohy na mapě, nejednoznačné
schéma trasy, příliš dlouhý název nebo popis (text se **nezmenšuje**, ale ořízne se na celé řádky a editor hlásí chybu)
a popisky přesahující mapku. Aplikace údaje sama neopravuje.

## Testovací data

V editoru **Vzory a testy**, případně soubory ve složce `data/` (lze je načíst přes Import JSON):

| Soubor | Obsah |
|---|---|
| `test1-presun-debr-skola.json` | Data z předlohy (linka 61, Debř, škola) včetně podkladové mapy z předlohy. Údaje převzaty doslova – editor upozorní na rozpor „pátku 31. října“ (sobota) a na mezeru v „www. dpmlb.cz“. |
| `test2-zmena-trasy.json` | Smyšlená testovací změna trasy (zrušené, náhradní, nová a trvalá zastávka). |
| `test3-vice-linek.json` | Smyšlený přesun zastávky pro 9 linek – rozložení čtverečků do mřížky. |
| `test4-dlouhy-text.json` | Předloha s příliš dlouhým popisem – kontrola přetečení. |

Tisková stránka umí zobrazit vzor i přímo: `tisk.html?vzor=debr` (případně `&format=a5l` / `a4p`).

## Struktura projektu

```
index.html            editor
tisk.html             samostatná tisková stránka (jen vývěska)
css/poster.css        grafika vývěsky – rozměry v mm předlohy, tisk A4/A5
css/editor.css        vzhled editoru
js/util.js            pomocné funkce, české formáty dat, kontrola dnů v týdnu
js/model.js           datový model, typy omezení a zastávek, kontrola dat, localStorage
js/text.js            automatické sestavení textu a popisků
js/map.js             SVG symboly a vykreslení mapek (podklad, schéma přesunu, schéma trasy)
js/poster.js          sestavení vývěsky (sdílí editor i tisk), rozložení linek, kontrola přetečení
js/qr.js              vlastní generátor QR kódu (bez knihoven)
js/samples.js         testovací vzory
js/editor.js          formulář, náhled, přetahování značek, ukládání, export/import
js/print.js           tisková stránka
assets/logo-dpmlb.svg logo vyříznuté z předlohy (vektor + rastrový znak města z předlohy)
assets/vzory/         podkladová mapa z předlohy pro test 1
fonts/                písma
data/                 testovací data JSON
```

Externí závislosti: **žádné**. Žádná placená API ani online mapové služby.

## Písmo

Předloha používá písmo **Alcyone** (komerční licence), které není součástí projektu. Aplikace jej použije automaticky, pokud je:

- nainstalované v systému (Light, Regular, SemiBold, Bold), **nebo**
- jeho soubory leží ve `fonts/alcyone/` pod názvy `Alcyone-Light`, `Alcyone-Regular`, `Alcyone-SemiBold`, `Alcyone-Bold`
  s příponou `.woff2` nebo `.otf` (jen pokud to licence písma dovoluje – u veřejného repozitáře je ověřte).

Jinak se použije náhradní písmo **Poppins** (SIL Open Font License, `fonts/poppins/OFL.txt`), které je o něco širší –
rozvržení je proto ověřené i s ním. Dokud nejsou soubory Alcyone ve složce, prohlížeč v konzoli hlásí, že je nenašel; je to neškodné.

## Známá omezení a doporučení

- **Logo:** znak města v logu je v předloze uložen jako malý rastrový obrázek (71 × 78 px). Pro ostré logo nahraďte
  `assets/logo-dpmlb.svg` vektorovou verzí loga (stejný poměr stran 45 : 37,6).
- **Schémata** nejsou geograficky přesná a vývěska to uvádí. Přesnou polohu ukáže jen nahraná podkladová mapa.
- Schéma změny trasy zakresluje jednu linii trasy pro všechny dotčené linky; zastávky obsluhované jen částí linek
  jsou označeny „(jen …)“. Zcela odlišně vedené linky je vhodné řešit samostatnými vývěskami.
- Schéma přesunu znázorní nejvýše dva protisměry jedné ulice; složitější situace řešte podkladovou mapou.

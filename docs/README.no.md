# CC-Viewer

Claude Code forespørselsovervåkingssystem som fanger opp og visualiserer alle API-forespørsler og -svar fra Claude Code i sanntid (original tekst, ingen sensur). Praktisk for utviklere å overvåke sin egen kontekst, nyttig for å gjennomgå og feilsøke under Vibe Coding-prosessen.
Den nyeste versjonen av CC-Viewer tilbyr også løsninger for serverdistribuert webutvikling, samt verktøy for mobilprogrammering. Velkommen til å bruke det i dine egne prosjekter. I fremtiden vil flere plugin-funksjoner bli tilgjengelige, med støtte for skydistribusjon.

Først den morsomme delen - du kan se dette på mobilen:

<img width="1700" height="790" alt="image" src="https://github.com/user-attachments/assets/da3e519f-ff66-4cd2-81d1-f4e131215f6c" />

<font color="#999">(Nåværende versjon har ikke god iOS-kompatibilitet, 2026.04.01 vil optimalisere for iOS)</font>

[English](../README.md) | [简体中文](./README.zh.md) | [繁體中文](./README.zh-TW.md) | [한국어](./README.ko.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Dansk](./README.da.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | Norsk | [Português (Brasil)](./README.pt-BR.md) | [ไทย](./README.th.md) | [Türkçe](./README.tr.md) | [Українська](./README.uk.md)

## Bruksanvisning

### Installasjon

```bash
npm install -g cc-viewer --registry=https://registry.npmjs.org
```

### Programmeringsmodus

ccv er en direkte erstatning for claude, alle parametere sendes videre til claude mens Web Viewer startes samtidig.

```bash
ccv                    # == claude (interaktiv modus)
ccv -c                 # == claude --continue (fortsett forrige samtale)
ccv -r                 # == claude --resume (gjenoppta samtale)
ccv -p "hello"         # == claude --print "hello" (utskriftsmodus)
ccv --d                # == claude --dangerously-skip-permissions (snarvei)
ccv --model opus       # == claude --model opus
```

Etter oppstart av programmeringsmodus åpnes websiden automatisk.

Du kan bruke claude direkte på websiden, samtidig som du kan se komplette forespørselsmeldinger og se kodeendringer.

Og det som ser enda mer sexy ut - du kan til og med programmere på mobilen!


### Loggmodus

⚠️ Hvis du fortsatt foretrekker å bruke det opprinnelige claude-verktøyet eller VS Code-plugin, vennligst bruk denne modusen.

I denne modusen starter du ```claude``` eller ```claude --dangerously-skip-permissions```

En loggprosess vil automatisk starte og registrere forespørselslogger til ~/.claude/cc-viewer/*yourproject*/date.jsonl

Start loggmodus:
```bash
ccv -logger
```

Når konsollen ikke kan skrive ut den spesifikke porten, er standardporten for første oppstart 127.0.0.1:7008. Hvis flere eksisterer samtidig, økes siste siffer, som 7009, 7010

Denne kommandoen vil automatisk oppdage den lokale Claude Code-installasjonsmetoden (NPM eller Native Install) og tilpasse seg.

- **NPM-versjon av claude code**: Injiserer automatisk avlyttingsskript i Claude Codes `cli.js`.
- **Native-versjon av claude code**: Oppdager automatisk `claude`-binærfilen, konfigurerer lokal transparent proxy og setter opp Zsh Shell Hook for automatisk trafikkviderekobling.
- Dette prosjektet anbefaler å bruke npm-metoden for å installere claude code.

Avinstaller loggmodus:
```bash
ccv --uninstall
```

### Feilsøking (Troubleshooting)

Hvis du støter på oppstartsproblemer, finnes det en ultimat feilsøkingsløsning:
Steg 1: Åpne claude code i hvilken som helst katalog;
Steg 2: Gi claude code følgende instruksjon:
```
Jeg har installert cc-viewer npm-pakken, men etter å ha kjørt ccv fungerer det fortsatt ikke effektivt. Sjekk cc-viewers cli.js og findcc.js, og tilpass den lokale claude code-distribusjonsmetoden basert på det spesifikke miljøet. Når du tilpasser, prøv å begrense endringsomfanget til findcc.js.
```
Å la Claude Code sjekke feil selv er mer effektivt enn å konsultere noen eller lese dokumentasjon!

Etter at instruksjonen ovenfor er fullført, vil findcc.js bli oppdatert. Hvis prosjektet ditt ofte krever lokal distribusjon, eller hvis forked kode ofte må løse installasjonsproblemer, behold denne filen. Neste gang kan du bare kopiere filen. For øyeblikket bruker mange prosjekter og selskaper claude code ikke på Mac-distribusjon, men på serverhostet distribusjon, så forfatteren har separert findcc.js-filen for å gjøre det lettere å spore cc-viewer kildekodeoppdateringer i fremtiden.

### Andre hjelpeinstruksjoner

Sjekk
```bash
ccv -h
```

### Konfigurasjonsoverstyring (Configuration Override)

Hvis du trenger å bruke et tilpasset API-endepunkt (for eksempel bedriftsproxy), konfigurer bare i `~/.claude/settings.json` eller sett `ANTHROPIC_BASE_URL`-miljøvariabelen. `ccv` vil automatisk gjenkjenne og videresende forespørsler korrekt.

### Stille modus (Silent Mode)

Som standard er `ccv` i stille modus når den kjører rundt `claude`, noe som sikrer at terminalutgangen din forblir ryddig og konsistent med den opprinnelige opplevelsen. Alle logger fanges opp i bakgrunnen og kan sees på `http://localhost:7008`.

Etter konfigurasjonen er fullført, bruk `claude`-kommandoen som normalt. Besøk `http://localhost:7008` for å se overvåkingsgrensesnittet.


## Funksjoner


### Programmeringsmodus

Etter oppstart med ccv kan du se:

<img width="1500" height="725" alt="image" src="https://github.com/user-attachments/assets/a64a381e-5a68-430c-b594-6d57dc01f4d3" />

Du kan se kode-diff direkte etter redigering er fullført:

<img width="1500" height="728" alt="image" src="https://github.com/user-attachments/assets/2a4acdaa-fc5f-4dc0-9e5f-f3273f0849b2" />

Selv om du kan åpne filer og programmere manuelt, anbefales ikke manuell programmering - det er gammeldags programmering!

### Mobilprogrammering

Du kan til og med skanne QR-kode for å programmere på mobile enheter:

<img width="3018" height="1460" alt="image" src="https://github.com/user-attachments/assets/8debf48e-daec-420c-b37a-609f8b81cd20" />

Oppfyller fantasien din om mobilprogrammering. I tillegg er det en plugin-mekanisme, hvis du trenger å tilpasse dine egne programmeringsvaner, kan du følge opp med plugin hooks-oppdateringer.

### Loggmodus (Se fullstendig claude code-samtale)

<img width="1500" height="720" alt="image" src="https://github.com/user-attachments/assets/519dd496-68bd-4e76-84d7-2a3d14ae3f61" />

- Fanger opp alle API-forespørsler sendt av Claude Code i sanntid, sikrer at det er originaltekst, ikke sensurerte logger (dette er veldig viktig!!!)
- Gjenkjenner og merker automatisk Main Agent og Sub Agent-forespørsler (undertyper: Plan, Search, Bash)
- MainAgent-forespørsler støtter Body Diff JSON, sammenfoldet visning av forskjeller fra forrige MainAgent-forespørsel (viser kun endrede/nye felt)
- Hver forespørsel viser inline Token-bruksstatistikk (input/output Token, cache-opprettelse/lesing, treffrate)
- Kompatibel med Claude Code Router (CCR) og andre proxy-scenarier - matcher forespørsler gjennom API-bane-mønster som fallback

### Samtalemodus

Klikk på «Samtalemodus»-knappen øverst til høyre for å parse Main Agents fullstendige samtalehistorikk til et chat-grensesnitt:

<img width="1500" height="730" alt="image" src="https://github.com/user-attachments/assets/c973f142-748b-403f-b2b7-31a5d81e33e6" />

- Støtter foreløpig ikke Agent Team-visning
- Brukermeldinger høyrejustert (blå boble), Main Agent-svar venstrejustert (mørk boble)
- `thinking`-blokker sammenfoldet som standard, rendret som Markdown, klikk for å utvide og se tankeprosessen; støtter ett-klikks oversettelse (funksjonen er fortsatt ustabil)
- Brukervalg-meldinger (AskUserQuestion) vises i spørsmål-svar-format
- Toveis modussynkronisering: Når du bytter til samtalemodus, navigeres automatisk til samtalen som tilsvarer den valgte forespørselen; når du bytter tilbake til originaltekstmodus, navigeres automatisk til den valgte forespørselen
- Innstillingspanel: Kan bytte standard sammenfoldet tilstand for verktøyresultater og tankeblokker
- Mobil samtalevisning: I mobil CLI-modus, klikk på «Samtalevisning»-knappen i topplinjen for å åpne en skrivebeskyttet samtalevisning og bla gjennom fullstendig samtalehistorikk på mobilen

### Statistikkverktøy

«Datastatistikk»-svevepanelet i Header-området:

<img width="1500" height="729" alt="image" src="https://github.com/user-attachments/assets/b23f9a81-fc3d-4937-9700-e70d84e4e5ce" />

- Viser cache creation/read-antall og cache-treffrate
- Cache-gjenoppbyggingsstatistikk: Viser antall ganger og cache_creation tokens gruppert etter årsak (TTL, system/tools/model-endringer, meldingstrunkering/modifikasjon, key-endringer)
- Verktøybruksstatistikk: Viser kallfrekvens for hvert verktøy sortert etter antall kall
- Skill-bruksstatistikk: Viser kallfrekvens for hver Skill sortert etter antall kall
- Konsepthjelp (?)-ikon: Klikk for å se innebygd dokumentasjon for MainAgent, CacheRebuild og ulike verktøy

### Logghåndtering

Gjennom CC-Viewer-rullegardinmenyen øverst til venstre:

<img width="1200" height="672" alt="image" src="https://github.com/user-attachments/assets/8cf24f5b-9450-4790-b781-0cd074cd3b39" />

- Importer lokale logger: Bla gjennom historiske loggfiler, gruppert etter prosjekt, åpne i nytt vindu
- Last inn lokal JSONL-fil: Velg direkte lokal `.jsonl`-fil for lasting og visning (støtter maks 500MB)
- Lagre gjeldende logg som: Last ned gjeldende overvåket JSONL-loggfil
- Slå sammen logger: Slå sammen flere JSONL-loggfiler til én samtale for enhetlig analyse
- Se bruker-Prompt: Ekstraher og vis alle brukerinndata, støtter tre visningsmodi - originaltekstmodus (originalt innhold), kontekstmodus (systemtagger kan foldes sammen), Text-modus (ren tekst); skråstrekkommandoer (`/model`, `/context`, etc.) vises som separate oppføringer; kommandorelaterte tagger skjules automatisk fra Prompt-innhold
- Eksporter Prompt som TXT: Eksporter bruker-Prompt (ren tekst, uten systemtagger) som lokal `.txt`-fil

### Automatisk oppdatering

CC-Viewer sjekker automatisk for oppdateringer ved oppstart (maks én gang hver 4. time). Innenfor samme hovedversjon (som 1.x.x → 1.y.z) oppdateres automatisk, trer i kraft ved neste oppstart. På tvers av hovedversjoner vises kun varslingsmelding.

Automatisk oppdatering følger Claude Code global konfigurasjon `~/.claude/settings.json`. Hvis Claude Code har deaktivert automatiske oppdateringer (`autoUpdates: false`), vil CC-Viewer også hoppe over automatisk oppdatering.

### Flerspråklig støtte

CC-Viewer støtter 18 språk og bytter automatisk basert på systemspråkmiljø:

简体中文 | English | 繁體中文 | 한국어 | Deutsch | Español | Français | Italiano | Dansk | 日本語 | Polski | Русский | العربية | Norsk | Português (Brasil) | ไทย | Türkçe | Українська

## License

MIT

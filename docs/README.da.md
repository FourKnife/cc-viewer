# CC-Viewer

Claude Code overvågningssystem til API-anmodninger. Fanger og visualiserer alle API-anmodninger og -svar fra Claude Code i realtid (rå tekst, uden beskæring). Gør det nemt for udviklere at overvåge deres kontekst og gennemgå eller fejlfinde under Vibe Coding.
Den nyeste version af CC-Viewer tilbyder også serverbaseret webprogrammering samt værktøjer til mobilprogrammering. Du er velkommen til at bruge det i dine egne projekter — flere funktioner vil blive tilgængelige i fremtiden, herunder understøttelse af cloud-deployment.

Først den interessante del, du kan se det på mobilenheder:

<img width="1700" height="790" alt="image" src="https://github.com/user-attachments/assets/da3e519f-ff66-4cd2-81d1-f4e131215f6c" />

<font color="#999">(Den nuværende version er ikke særlig kompatibel med iOS, optimering til iOS kommer 2026.04.01)</font>

[English](../README.md) | [简体中文](./README.zh.md) | [繁體中文](./README.zh-TW.md) | [한국어](./README.ko.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | Dansk | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [Norsk](./README.no.md) | [Português (Brasil)](./README.pt-BR.md) | [ไทย](./README.th.md) | [Türkçe](./README.tr.md) | [Українська](./README.uk.md)

## Sådan bruges det

### Installation

```bash
npm install -g cc-viewer --registry=https://registry.npmjs.org
```

### Programmeringstilstand

ccv er en direkte erstatning for claude, alle parametre sendes videre til claude, mens Web Viewer startes samtidig.

```bash
ccv                    # == claude (interaktiv tilstand)
ccv -c                 # == claude --continue (fortsæt sidste samtale)
ccv -r                 # == claude --resume (genoptag samtale)
ccv -p "hello"         # == claude --print "hello" (print-tilstand)
ccv --d                # == claude --dangerously-skip-permissions (genvej)
ccv --model opus       # == claude --model opus
```

Når programmeringstilstanden er startet, åbnes websiden automatisk.

Du kan bruge Claude direkte på websiden og samtidig se de fulde anmodningsdata samt kodeændringer.

Og endnu mere imponerende — du kan endda programmere fra din mobilenhed!


### Logger-tilstand

⚠️ Hvis du stadig foretrækker at bruge det native claude-værktøj eller VS Code-plugin, skal du bruge denne tilstand.

I denne tilstand starter ```claude``` eller ```claude --dangerously-skip-permissions```

automatisk en logproces, der registrerer anmodningslogfiler til ~/.claude/cc-viewer/*yourproject*/date.jsonl

Start logger-tilstand:
```bash
ccv -logger
```

Når konsollen ikke kan udskrive den specifikke port, er standardporten for den første opstart 127.0.0.1:7008. Hvis der findes flere, fortsætter de i rækkefølge som 7009, 7010

Kommandoen registrerer automatisk, hvordan Claude Code er installeret lokalt (NPM eller Native Install) og tilpasser sig derefter.

- **NPM-version af claude code**: Injicerer automatisk et interceptor-script i Claude Codes `cli.js`.
- **Native-version af claude code**: Registrerer automatisk den binære `claude`-fil, konfigurerer en lokal transparent proxy og opsætter en Zsh Shell Hook til automatisk at videresende trafik.
- Det anbefales at bruge den NPM-installerede version af Claude Code med dette projekt.

Afinstaller logger-tilstand:
```bash
ccv --uninstall
```

### Fejlfinding (Troubleshooting)

Hvis du oplever problemer med at starte, er her en ultimativ fejlfindingsmetode:
Trin 1: Åbn Claude Code i en vilkårlig mappe.
Trin 2: Giv Claude Code følgende instruktion:
```
Jeg har installeret npm-pakken cc-viewer, men efter at have kørt ccv virker den stadig ikke korrekt. Undersøg cli.js og findcc.js i cc-viewer, og tilpas den lokale Claude Code-installation baseret på det specifikke miljø. Begræns ændringerne til findcc.js så vidt muligt.
```
At lade Claude Code selv undersøge fejlen er mere effektivt end at spørge nogen eller læse dokumentation!

Når ovenstående instruktion er udført, opdateres findcc.js. Hvis dit projekt ofte kræver lokal deployment, eller hvis du har forket koden og ofte skal løse installationsproblemer, kan du beholde denne fil og kopiere den direkte næste gang. I dag deployer mange projekter og virksomheder Claude Code på servere i stedet for Mac, så forfatteren har adskilt findcc.js for at gøre det nemmere at følge kildekodeopdateringer af cc-viewer.

### Andre hjælpekommandoer

Tjek hjælp
```bash
ccv -h
```

### Konfigurationsoverskrivning (Configuration Override)

Hvis du har brug for et brugerdefineret API-endpoint (f.eks. en virksomhedsproxy), skal du blot konfigurere det i `~/.claude/settings.json` eller sætte miljøvariablen `ANTHROPIC_BASE_URL`. `ccv` registrerer det automatisk og videresender anmodninger korrekt.

### Lydløs tilstand (Silent Mode)

Som standard kører `ccv` i lydløs tilstand, når den wrapper `claude`, så dit terminaloutput forbliver rent og konsistent med den native oplevelse. Alle logfiler fanges i baggrunden og kan ses via `http://localhost:7008`.

Når konfigurationen er færdig, kan du bare bruge `claude`-kommandoen som normalt. Besøg `http://localhost:7008` for at se overvågningsgrænsefladen.


## Funktioner


### Programmeringstilstand

Efter start med ccv kan du se:

<img width="1500" height="725" alt="image" src="https://github.com/user-attachments/assets/a64a381e-5a68-430c-b594-6d57dc01f4d3" />

Du kan se kode-diff direkte efter redigering er fuldført:

<img width="1500" height="728" alt="image" src="https://github.com/user-attachments/assets/2a4acdaa-fc5f-4dc0-9e5f-f3273f0849b2" />

Selvom du kan åbne filer og programmere manuelt, anbefales manuel programmering ikke, det er gammeldags programmering!

### Mobilprogrammering

Du kan endda scanne en QR-kode for at programmere på mobilenheder:

<img width="3018" height="1460" alt="image" src="https://github.com/user-attachments/assets/8debf48e-daec-420c-b37a-609f8b81cd20" />

Opfylder din forestilling om mobilprogrammering, og der er også en plugin-mekanisme. Hvis du har brug for at tilpasse dine programmeringsvaner, kan du følge plugin-hooks-opdateringer senere.

### Logger-tilstand (se den fulde Claude Code-samtale)

<img width="1500" height="720" alt="image" src="https://github.com/user-attachments/assets/519dd496-68bd-4e76-84d7-2a3d14ae3f61" />

- Fanger alle API-anmodninger fra Claude Code i realtid, sikrer at det er den originale tekst og ikke beskårne logfiler (dette er meget vigtigt!!!)
- Identificerer og markerer automatisk Main Agent- og Sub Agent-anmodninger (undertyper: Plan, Search, Bash)
- MainAgent-anmodninger understøtter Body Diff JSON, viser forskelle fra den forrige MainAgent-anmodning i sammenfoldet visning (viser kun ændrede/nye felter)
- Hver anmodning viser inline token-forbrugsstatistik (input/output tokens, cache creation/read, hitrate)
- Kompatibel med Claude Code Router (CCR) og andre proxy-scenarier — matcher anmodninger via API-stifallback-mønster

### Samtaletilstand

Klik på knappen "Samtaletilstand" øverst til højre for at parse Main Agents fulde samtalehistorik til en chat-grænseflade:

<img width="1500" height="730" alt="image" src="https://github.com/user-attachments/assets/c973f142-748b-403f-b2b7-31a5d81e33e6" />

- Understøtter ikke Agent Team-visning endnu
- Brugermeddelelser højrejusteret (blå boble), Main Agent-svar venstrejusteret (mørk boble)
- `thinking`-blokke er som standard sammenfoldet, renderet i Markdown, klik for at udvide og se tankegangen; understøtter oversættelse med ét klik (funktionen er stadig ustabil)
- Brugervalgsmeddelelser (AskUserQuestion) vises i spørgsmål-svar-format
- Tovejs-tilstandssynkronisering: når du skifter til samtaletilstand, navigeres automatisk til samtalen svarende til den valgte anmodning; når du skifter tilbage til originalteksttilstand, navigeres automatisk til den valgte anmodning
- Indstillingspanel: kan skifte standardsammenfoldet tilstand for værktøjsresultater og thinking-blokke
- Mobil samtalevisning: i mobil CLI-tilstand, klik på "Samtalevisning"-knappen i toplinjen for at åbne en skrivebeskyttet samtalevisning og gennemse den fulde samtalehistorik på mobilen

### Statistikværktøj

Det svævende "Datastatistik"-panel i header-området:

<img width="1500" height="729" alt="image" src="https://github.com/user-attachments/assets/b23f9a81-fc3d-4937-9700-e70d84e4e5ce" />

- Viser antal cache creation/read og cache-hitrate
- Cache-genopbygningsstatistik: viser antal og cache_creation tokens grupperet efter årsag (TTL, system/tools/model-ændringer, beskedafskæring/-ændring, nøgleændring)
- Værktøjsanvendelsesstatistik: viser kaldsfrekvens for hvert værktøj sorteret efter antal kald
- Skill-anvendelsesstatistik: viser kaldsfrekvens for hver Skill sorteret efter antal kald
- Koncepthjælp (?)-ikon: klik for at se indbygget dokumentation for MainAgent, CacheRebuild og hvert værktøj

### Logadministration

Via CC-Viewer-rullemenuen øverst til venstre:

<img width="1200" height="672" alt="image" src="https://github.com/user-attachments/assets/8cf24f5b-9450-4790-b781-0cd074cd3b39" />

- Importer lokale logfiler: gennemse historiske logfiler, grupperet efter projekt, åbner i nyt vindue
- Indlæs lokal JSONL-fil: vælg og indlæs en lokal `.jsonl`-fil direkte (understøtter op til 500MB)
- Gem nuværende log som: download den aktuelle overvågnings-JSONL-logfil
- Flet logfiler: kombiner flere JSONL-logfiler til én session for samlet analyse
- Se bruger-Prompts: udtræk og vis alle brugerinput med tre visningstilstande — Råteksttilstand (råt indhold), Konteksttilstand (systemtags kan foldes), Teksttilstand (kun ren tekst); slash-kommandoer (`/model`, `/context` osv.) vises som selvstændige poster; kommandorelaterede tags skjules automatisk fra Prompt-indholdet
- Eksporter Prompt til TXT: eksporter brugerprompter (kun tekst, uden systemtags) til en lokal `.txt`-fil

### Automatisk opdatering

CC-Viewer tjekker automatisk for opdateringer ved opstart (højst én gang hver 4. time). Inden for samme hovedversion (f.eks. 1.x.x → 1.y.z) opdateres automatisk, og ændringerne træder i kraft ved næste opstart. Ved skift af hovedversion vises kun en notifikation.

Automatisk opdatering følger Claude Codes globale konfiguration `~/.claude/settings.json`. Hvis Claude Code har deaktiveret automatisk opdatering (`autoUpdates: false`), springer CC-Viewer også automatisk opdatering over.

### Flersproget understøttelse

CC-Viewer understøtter 18 sprog og skifter automatisk baseret på systemets sprogindstilling:

简体中文 | English | 繁體中文 | 한국어 | Deutsch | Español | Français | Italiano | Dansk | 日本語 | Polski | Русский | العربية | Norsk | Português (Brasil) | ไทย | Türkçe | Українська

## License

MIT

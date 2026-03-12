# CC-Viewer

Claude Code Anfragenüberwachungssystem, das alle API-Anfragen und -Antworten in Echtzeit erfasst und visualisiert (Originaltext, ungekürzt). Ermöglicht Entwicklern die Überwachung ihres Contexts, um Probleme beim Vibe Coding nachzuvollziehen und zu beheben.
Die neueste Version von CC-Viewer bietet außerdem eine Lösung für serverbasiertes Web-Programmieren sowie Tools für die mobile Programmierung. Wir laden alle ein, diese in ihren eigenen Projekten einzusetzen. In Zukunft werden weitere Plugin-Funktionen und Cloud-Deployment-Unterstützung folgen.

Zunächst der interessante Teil, den Sie auf Mobilgeräten sehen können:

<img width="1700" height="790" alt="image" src="https://github.com/user-attachments/assets/da3e519f-ff66-4cd2-81d1-f4e131215f6c" />

<font color="#999">(Die aktuelle Version ist nicht sehr gut mit iOS kompatibel, am 01.04.2026 wird eine iOS-Optimierung durchgeführt)</font>

[English](../README.md) | [简体中文](./README.zh.md) | [繁體中文](./README.zh-TW.md) | [한국어](./README.ko.md) | [日本語](./README.ja.md) | Deutsch | [Español](./README.es.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Dansk](./README.da.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [Norsk](./README.no.md) | [Português (Brasil)](./README.pt-BR.md) | [ไทย](./README.th.md) | [Türkçe](./README.tr.md) | [Українська](./README.uk.md)

## Verwendung

### Installation

```bash
npm install -g cc-viewer --registry=https://registry.npmjs.org
```

### Programmiermodus

ccv ist ein direkter Ersatz für claude, alle Parameter werden an claude weitergegeben, während gleichzeitig der Web Viewer gestartet wird.

```bash
ccv                    # == claude (interaktiver Modus)
ccv -c                 # == claude --continue (letzte Konversation fortsetzen)
ccv -r                 # == claude --resume (Konversation wiederherstellen)
ccv -p "hello"         # == claude --print "hello" (Druckmodus)
ccv --d                # == claude --dangerously-skip-permissions (Schnellzugriff)
ccv --model opus       # == claude --model opus
```

Nach dem Start des Programmiermodus wird automatisch eine Webseite geöffnet.

Sie können Claude direkt auf der Webseite verwenden und gleichzeitig die vollständigen Anfragenprotokolle einsehen sowie Codeänderungen überprüfen.

Und noch besser — Sie können sogar auf dem Mobilgerät programmieren!


### Logger-Modus

⚠️ Wenn Sie weiterhin das native claude-Tool oder das VS Code-Plugin verwenden möchten, nutzen Sie bitte diesen Modus.

In diesem Modus wird beim Starten von ```claude``` oder ```claude --dangerously-skip-permissions```

automatisch ein Log-Prozess gestartet, der Anfragen automatisch in ~/.claude/cc-viewer/*yourproject*/date.jsonl protokolliert.

Logger-Modus starten:
```bash
ccv -logger
```

Wenn der spezifische Port nicht in der Konsole ausgegeben werden kann, ist der erste Standardport 127.0.0.1:7008. Bei mehreren gleichzeitigen Instanzen werden die Ports fortlaufend erhöht, z. B. 7009, 7010.

Dieser Befehl erkennt automatisch die Installationsmethode von Claude Code (NPM oder Native Install) und passt sich entsprechend an.

- **NPM-Version von claude code**: Injiziert automatisch das Interceptor-Skript in `cli.js` von Claude Code.
- **Native-Version von claude code**: Erkennt automatisch die `claude`-Binärdatei, konfiguriert einen lokalen transparenten Proxy und richtet einen Zsh Shell Hook ein, um den Datenverkehr automatisch weiterzuleiten.
- Dieses Projekt empfiehlt die Verwendung der über NPM installierten Version von claude code.

Logger-Modus deinstallieren:
```bash
ccv --uninstall
```

### Fehlerbehebung (Troubleshooting)

Wenn Sie auf Startprobleme stoßen, gibt es eine ultimative Lösung:
Schritt 1: Öffnen Sie Claude Code in einem beliebigen Verzeichnis;
Schritt 2: Geben Sie Claude Code folgende Anweisung:
```
Ich habe das npm-Paket cc-viewer installiert, aber nach dem Ausführen von ccv funktioniert es immer noch nicht richtig. Schau dir cli.js und findcc.js von cc-viewer an und passe die lokale Claude Code-Deployment-Methode entsprechend der konkreten Umgebung an. Beschränke die Änderungen dabei möglichst auf findcc.js.
```
Claude Code selbst die Fehler prüfen zu lassen ist effektiver als jede andere Person zu fragen oder Dokumentation zu lesen!

Nachdem die obigen Anweisungen abgeschlossen sind, wird findcc.js aktualisiert. Wenn Ihr Projekt häufig lokal bereitgestellt werden muss oder der geforkte Code regelmäßig Installationsprobleme lösen muss, behalten Sie diese Datei einfach. Beim nächsten Mal können Sie sie direkt kopieren. Derzeit setzen viele Projekte und Unternehmen Claude Code nicht auf dem Mac ein, sondern auf serverseitig gehosteten Deployments. Daher hat der Autor findcc.js ausgelagert, um das Tracking von cc-viewer-Quellcode-Updates zu erleichtern.

### Weitere Hilfsbefehle

Anzeigen:
```bash
ccv -h
```

### Konfigurationsüberschreibung (Configuration Override)

Wenn Sie einen benutzerdefinierten API-Endpunkt verwenden müssen (z. B. Unternehmens-Proxy), konfigurieren Sie ihn einfach in `~/.claude/settings.json` oder setzen Sie die Umgebungsvariable `ANTHROPIC_BASE_URL`. `ccv` erkennt diese Einstellungen automatisch und leitet Anfragen korrekt weiter.

### Stiller Modus (Silent Mode)

Standardmäßig läuft `ccv` beim Wrappen von `claude` im stillen Modus, um sicherzustellen, dass Ihre Terminalausgabe sauber bleibt und identisch mit der nativen Erfahrung ist. Alle Protokolle werden im Hintergrund erfasst und sind unter `http://localhost:7008` einsehbar.

Nach Abschluss der Konfiguration verwenden Sie den `claude`-Befehl wie gewohnt. Öffnen Sie `http://localhost:7008`, um die Überwachungsoberfläche anzuzeigen.


## Funktionen


### Programmiermodus

Nach dem Start mit ccv sehen Sie:

<img width="1500" height="725" alt="image" src="https://github.com/user-attachments/assets/a64a381e-5a68-430c-b594-6d57dc01f4d3" />

Sie können nach Abschluss der Bearbeitung direkt den Code-Diff anzeigen:

<img width="1500" height="728" alt="image" src="https://github.com/user-attachments/assets/2a4acdaa-fc5f-4dc0-9e5f-f3273f0849b2" />

Obwohl Sie Dateien öffnen und manuell programmieren können, wird dies nicht empfohlen – das ist altmodisches Programmieren!

### Mobile Programmierung

Sie können sogar einen QR-Code scannen, um auf Mobilgeräten zu programmieren:

<img width="3018" height="1460" alt="image" src="https://github.com/user-attachments/assets/8debf48e-daec-420c-b37a-609f8b81cd20" />

Erfüllt Ihre Vorstellungen von mobiler Programmierung. Außerdem gibt es einen Plugin-Mechanismus – wenn Sie Anpassungen an Ihre Programmiergewohnheiten vornehmen möchten, können Sie später die Plugin-Hooks-Updates verfolgen.

### Logger-Modus (Claude Code vollständige Konversation anzeigen)

<img width="1500" height="720" alt="image" src="https://github.com/user-attachments/assets/519dd496-68bd-4e76-84d7-2a3d14ae3f61" />

- Erfasst in Echtzeit alle von Claude Code gesendeten API-Anfragen, stellt sicher, dass es sich um den Originaltext handelt und nicht um gekürzte Logs (das ist sehr wichtig!!!)
- Erkennt und markiert automatisch Main Agent und Sub Agent Anfragen (Untertypen: Plan, Search, Bash)
- MainAgent-Anfragen unterstützen Body Diff JSON, zeigen die Unterschiede zur vorherigen MainAgent-Anfrage eingeklappt an (nur geänderte/neue Felder werden angezeigt)
- Jede Anfrage zeigt inline Token-Nutzungsstatistiken an (Eingabe-/Ausgabe-Token, Cache-Erstellung/-Lesung, Trefferquote)
- Kompatibel mit Claude Code Router (CCR) und anderen Proxy-Szenarien – Anfragen werden über API-Pfadmuster-Fallback abgeglichen

### Konversationsmodus

Klicken Sie auf die Schaltfläche „Konversationsmodus" oben rechts, um den vollständigen Konversationsverlauf des Main Agent als Chat-Oberfläche zu analysieren:

<img width="1500" height="730" alt="image" src="https://github.com/user-attachments/assets/c973f142-748b-403f-b2b7-31a5d81e33e6" />

- Agent Team-Anzeige wird derzeit nicht unterstützt
- Benutzernachrichten rechtsbündig (blaue Sprechblase), Main Agent-Antworten linksbündig (dunkle Sprechblase)
- `thinking`-Blöcke standardmäßig eingeklappt, als Markdown gerendert, zum Anzeigen des Denkprozesses aufklappen; unterstützt Ein-Klick-Übersetzung (Funktion noch nicht stabil)
- Benutzerauswahl-Nachrichten (AskUserQuestion) werden im Frage-Antwort-Format angezeigt
- Bidirektionale Modussynchronisation: Beim Wechsel in den Konversationsmodus wird automatisch zur Konversation der ausgewählten Anfrage navigiert; beim Zurückwechseln in den Originalmodus wird automatisch zur ausgewählten Anfrage navigiert
- Einstellungspanel: Kann den Standard-Einklappzustand von Tool-Ergebnissen und Thinking-Blöcken umschalten
- Mobile Konversationsansicht: Im mobilen CLI-Modus können Sie auf die Schaltfläche „Konversationsansicht" in der oberen Leiste klicken, um eine schreibgeschützte Konversationsansicht einzublenden und den vollständigen Konversationsverlauf auf dem Handy zu durchsuchen

### Statistik-Tools

Hover-Panel „Datenstatistik" im Header-Bereich:

<img width="1500" height="729" alt="image" src="https://github.com/user-attachments/assets/b23f9a81-fc3d-4937-9700-e70d84e4e5ce" />

- Anzeige von Cache-Erstellungs-/Lesezählern und Cache-Trefferquote
- Cache-Rebuild-Statistiken: nach Grund gruppiert (TTL, System-/Tools-/Modelländerung, Nachrichtenkürzung/-änderung, Schlüsseländerung) mit Anzahl und cache_creation-Token
- Tool-Nutzungsstatistiken: Aufrufanzahl pro Tool, nach Häufigkeit sortiert
- Skill-Nutzungsstatistiken: Aufrufhäufigkeit pro Skill, nach Häufigkeit sortiert
- Konzepthilfe (?)-Icons: Klicken zum Anzeigen der integrierten Dokumentation für MainAgent, CacheRebuild und jedes Tool

### Log-Verwaltung

Über das CC-Viewer-Dropdown-Menü oben links:

<img width="1200" height="672" alt="image" src="https://github.com/user-attachments/assets/8cf24f5b-9450-4790-b781-0cd074cd3b39" />

- Lokale Logs importieren: Historische Log-Dateien durchsuchen, nach Projekt gruppiert, öffnet in neuem Fenster
- Lokale JSONL-Datei laden: Eine lokale `.jsonl`-Datei direkt auswählen und laden (bis zu 500MB)
- Aktuelles Log speichern unter: Aktuelle Überwachungs-JSONL-Log-Datei herunterladen
- Logs zusammenführen: Mehrere JSONL-Log-Dateien zu einer Sitzung zusammenführen für einheitliche Analyse
- Benutzer-Prompts anzeigen: Alle Benutzereingaben extrahieren und anzeigen, mit drei Ansichtsmodi — Originalmodus (Rohinhalt), Kontextmodus (Systemtags einklappbar), Textmodus (reiner Text); Slash-Befehle (`/model`, `/context` usw.) als eigenständige Einträge; befehlsbezogene Tags werden automatisch aus dem Prompt-Inhalt ausgeblendet
- Prompts als TXT exportieren: Benutzer-Prompts (reiner Text, ohne Systemtags) in eine lokale `.txt`-Datei exportieren

### Automatische Updates

CC-Viewer prüft beim Start automatisch auf Updates (maximal einmal alle 4 Stunden). Innerhalb derselben Hauptversion (z. B. 1.x.x → 1.y.z) wird automatisch aktualisiert und beim nächsten Start wirksam. Bei einem Hauptversionswechsel wird nur eine Benachrichtigung angezeigt.

Die automatische Aktualisierung folgt der globalen Claude Code-Konfiguration `~/.claude/settings.json`. Wenn Claude Code die automatischen Updates deaktiviert hat (`autoUpdates: false`), überspringt CC-Viewer die automatische Aktualisierung ebenfalls.

### Mehrsprachige Unterstützung

CC-Viewer unterstützt 18 Sprachen und wechselt automatisch basierend auf der Systemsprache:

简体中文 | English | 繁體中文 | 한국어 | Deutsch | Español | Français | Italiano | Dansk | 日本語 | Polski | Русский | العربية | Norsk | Português (Brasil) | ไทย | Türkçe | Українська

## License

MIT

# CC-Viewer

System monitorowania żądań Claude Code — przechwytuje i wizualizuje w czasie rzeczywistym wszystkie żądania i odpowiedzi API Claude Code (surowy tekst, bez cenzury). Pomaga programistom monitorować w��asny kontekst, ułatwiając przegląd i diagnozowanie problemów podczas Vibe Coding.
Najnowsza wersja CC-Viewer oferuje również rozwiązanie do programowania webowego na serwerze oraz narzędzia do programowania mobilnego. Zapraszamy do stosowania w swoich projektach — w przyszłości zostanie udostępnionych więcej funkcji wtyczek z obsługą wdrożeń w chmurze.

Zacznijmy od ciekawej części — możesz to zobaczyć na urządzeniu mobilnym:

<img width="1700" height="790" alt="image" src="https://github.com/user-attachments/assets/da3e519f-ff66-4cd2-81d1-f4e131215f6c" />

<font color="#999">(Obecna wersja nie jest w pełni kompatybilna z iOS — optymalizacja dla iOS planowana na 2026.04.01)</font>

[English](../README.md) | [简体中文](./README.zh.md) | [繁體中文](./README.zh-TW.md) | [한국어](./README.ko.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Dansk](./README.da.md) | Polski | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [Norsk](./README.no.md) | [Português (Brasil)](./README.pt-BR.md) | [ไทย](./README.th.md) | [Türkçe](./README.tr.md) | [Українська](./README.uk.md)

## Użycie

### Instalacja

```bash
npm install -g cc-viewer --registry=https://registry.npmjs.org
```

### Tryb programowania

`ccv` jest bezpośrednim zamiennikiem `claude` — wszystkie argumenty są przekazywane do `claude`, a jednocześnie uruchamiany jest Web Viewer.

```bash
ccv                    # == claude (tryb interaktywny)
ccv -c                 # == claude --continue (kontynuuj ostatnią rozmowę)
ccv -r                 # == claude --resume (wznów rozmowę)
ccv -p "hello"         # == claude --print "hello" (tryb drukowania)
ccv --d                # == claude --dangerously-skip-permissions (skrót)
ccv --model opus       # == claude --model opus
```

Po uruchomieniu trybu programowania strona internetowa otwiera się automatycznie.

Możesz używać Claude bezpośrednio w przeglądarce, przeglądać pełne treści żądań oraz sprawdzać zmiany w kodzie.

A co najlepsze — możesz nawet programować na urządzeniu mobilnym!


### Tryb logowania

⚠️ Jeśli nadal wolisz używać natywnych narzędzi Claude lub wtyczki VS Code, skorzystaj z tego trybu.

W tym trybie uruchom ```claude``` lub ```claude --dangerously-skip-permissions```.

Automatycznie zostanie uruchomiony proces logowania, który zapisuje logi żądań do `~/.claude/cc-viewer/*twojprojekt*/data.jsonl`.

Uruchomienie trybu logowania:
```bash
ccv -logger
```

Gdy konsola nie może wydrukować konkretnego portu, domyślny pierwszy port to 127.0.0.1:7008. Przy wielu instancjach kolejne porty to 7009, 7010 itd.

Polecenie automatycznie wykrywa sposób instalacji Claude Code (NPM lub Native Install) i odpowiednio się dostosowuje.

- **Wersja NPM claude code**: automatycznie wstrzykuje skrypt przechwytujący do `cli.js` Claude Code.
- **Natywna wersja claude code**: automatycznie wykrywa plik binarny `claude`, konfiguruje lokalny przezroczysty proxy i ustawia Zsh Shell Hook do automatycznego przekierowania ruchu.
- Projekt zaleca instalację claude code przez npm.

Odinstalowanie trybu logowania:
```bash
ccv --uninstall
```

### Rozwiązywanie problemów (Troubleshooting)

Jeśli napotkasz problemy z uruchomieniem, oto ostateczne rozwiązanie:
Krok 1: Otwórz Claude Code w dowolnym katalogu.
Krok 2: Wydaj Claude Code następujące polecenie:
```
Zainstalowałem pakiet npm cc-viewer, ale po uruchomieniu ccv nadal nie działa poprawnie. Sprawdź cli.js i findcc.js w cc-viewer i dostosuj je do lokalnego sposobu wdrożenia claude code w tym środowisku. Ogranicz zakres zmian do pliku findcc.js.
```
Pozwolenie Claude Code na samodzielne sprawdzenie błędów jest skuteczniejsze niż konsultowanie się z kimkolwiek lub czytanie dokumentacji!

Po wykonaniu powyższego polecenia plik findcc.js zostanie zaktualizowany. Jeśli Twój projekt często wymaga lokalnego wdrożenia lub rozwidlony kod często wymaga rozwiązywania problemów instalacyjnych, zachowaj ten plik — następnym razem wystarczy go skopiować. Ponieważ wiele projektów i firm używa Claude Code na serwerach, a nie na Macu, autor wyodrębnił plik findcc.js, aby ułatwić śledzenie aktualizacji kodu źródłowego cc-viewer.

### Inne polecenia pomocnicze

Pomoc:
```bash
ccv -h
```

### Nadpisanie konfiguracji (Configuration Override)

Jeśli potrzebujesz użyć niestandardowego punktu końcowego API (np. proxy firmowego), skonfiguruj go w `~/.claude/settings.json` lub ustaw zmienną środowiskową `ANTHROPIC_BASE_URL`. `ccv` automatycznie to rozpozna i poprawnie przekaże żądania.

### Tryb cichy (Silent Mode)

Domyślnie `ccv` działa w trybie cichym podczas owijania `claude`, zapewniając czysty wynik terminala zgodny z natywnym doświadczeniem. Wszystkie logi są przechwytywane w tle i dostępne pod adresem `http://localhost:7008`.

Po konfiguracji używaj normalnie polecenia `claude`. Odwiedź `http://localhost:7008`, aby zobaczyć interfejs monitorowania.


## Funkcje


### Tryb programowania

Po uruchomieniu za pomocą `ccv` zobaczysz:

<img width="1500" height="725" alt="image" src="https://github.com/user-attachments/assets/a64a381e-5a68-430c-b594-6d57dc01f4d3" />

Możesz bezpośrednio przeglądać diff kodu po zakończeniu edycji:

<img width="1500" height="728" alt="image" src="https://github.com/user-attachments/assets/2a4acdaa-fc5f-4dc0-9e5f-f3273f0849b2" />

Choć możesz otwierać pliki i programować ręcznie, nie jest to zalecane — to metoda z poprzedniej epoki!

### Programowanie mobilne

Możesz nawet zeskanować kod QR i programować na urządzeniu mobilnym:

<img width="3018" height="1460" alt="image" src="https://github.com/user-attachments/assets/8debf48e-daec-420c-b37a-609f8b81cd20" />

Spełnia Twoje wyobrażenia o programowaniu mobilnym. Dostępny jest również mechanizm wtyczek — jeśli chcesz dostosować go do swoich nawyków programistycznych, możesz śledzić aktualizacje hooków wtyczek.

### Tryb logowania (przeglądanie pełnej sesji claude code)

<img width="1500" height="720" alt="image" src="https://github.com/user-attachments/assets/519dd496-68bd-4e76-84d7-2a3d14ae3f61" />

- Przechwytuje w czasie rzeczywistym wszystkie żądania API wysyłane przez Claude Code — zapewnia oryginalny tekst, a nie ocenzurowane logi (to bardzo ważne!!!)
- Automatycznie identyfikuje i oznacza żądania Main Agent i Sub Agent (podtypy: Plan, Search, Bash)
- Żądania MainAgent obsługują Body Diff JSON — zwinięty widok różnic względem poprzedniego żądania MainAgent (wyświetla tylko zmienione/nowe pola)
- Statystyki użycia tokenów wyświetlane inline przy każdym żądaniu (tokeny wejściowe/wyjściowe, tworzenie/odczyt cache, współczynnik trafień)
- Kompatybilny z Claude Code Router (CCR) i innymi scenariuszami proxy — dopasowuje żądania na podstawie wzorca ścieżki API

### Tryb rozmowy

Kliknij przycisk „Tryb rozmowy" w prawym górnym rogu, aby przetworzyć pełną historię rozmów Main Agent w interfejs czatu:

<img width="1500" height="730" alt="image" src="https://github.com/user-attachments/assets/c973f142-748b-403f-b2b7-31a5d81e33e6" />

- Wyświetlanie Agent Team nie jest jeszcze obsługiwane
- Wiadomości użytkownika wyrównane do prawej (niebieskie dymki), odpowiedzi Main Agent wyrównane do lewej (ciemne dymki)
- Bloki `thinking` domyślnie zwinięte, renderowane w Markdown — kliknij, aby rozwinąć i zobaczyć proces myślenia; obsługuje tłumaczenie jednym kliknięciem (funkcja niestabilna)
- Wiadomości z wyborem użytkownika (AskUserQuestion) wyświetlane w formacie pytanie-odpowiedź
- Dwukierunkowa synchronizacja trybów: przełączenie na tryb rozmowy automatycznie lokalizuje rozmowę odpowiadającą wybranemu żądaniu; powrót do trybu oryginalnego automatycznie lokalizuje wybrane żądanie
- Panel ustawień: możliwość przełączania domyślnego stanu zwinięcia wyników narzędzi i bloków myślenia
- Przeglądanie rozmów na telefonie: w trybie CLI na telefonie kliknij przycisk „Przeglądanie rozmów" na górnym pasku, aby wysunąć widok rozmowy tylko do odczytu i przeglądać pełną historię rozmów na telefonie

### Narzędzia statystyczne

Pływający panel „Statystyki danych" w obszarze nagłówka:

<img width="1500" height="729" alt="image" src="https://github.com/user-attachments/assets/b23f9a81-fc3d-4937-9700-e70d84e4e5ce" />

- Wyświetla liczbę operacji cache creation/read oraz współczynnik trafień cache
- Statystyki przebudowy cache: pogrupowane według przyczyny (TTL, zmiany system/tools/model, obcięcie/modyfikacja wiadomości, zmiana klucza) — liczba wystąpień i tokeny cache_creation
- Statystyki użycia narzędzi: częstotliwość wywołań poszczególnych narzędzi posortowana według liczby wywołań
- Statystyki użycia Skill: częstotliwość wywołań poszczególnych Skill posortowana według liczby wywołań
- Ikona pomocy kontekstowej (?): kliknij, aby zobaczyć wbudowaną dokumentację MainAgent, CacheRebuild i poszczególnych narzędzi

### Zarządzanie logami

Przez menu rozwijane CC-Viewer w lewym górnym rogu:

<img width="1200" height="672" alt="image" src="https://github.com/user-attachments/assets/8cf24f5b-9450-4790-b781-0cd074cd3b39" />

- Importuj lokalne logi: przeglądaj historyczne pliki logów pogrupowane według projektu, otwieraj w nowym oknie
- Załaduj lokalny plik JSONL: bezpośrednio wybierz lokalny plik `.jsonl` do załadowania i przeglądania (obsługuje do 500 MB)
- Zapisz bieżący log jako: pobierz bieżący monitorowany plik logu JSONL
- Scal logi: połącz wiele plików logów JSONL w jedną sesję do ujednoliconej analizy
- Wyświetl Prompt użytkownika: wyodrębnij i wyświetl wszystkie dane wejściowe użytkownika z obsługą trzech trybów widoku — tryb oryginalny (surowa treść), tryb kontekstowy (tagi systemowe zwijalne), tryb tekstowy (czysty tekst); polecenia slash (`/model`, `/context` itp.) wyświetlane jako osobne wpisy; tagi związane z poleceniami automatycznie ukrywane z treści Prompt
- Eksportuj Prompt do TXT: eksportuj Prompt użytkownika (czysty tekst, bez tagów systemowych) do lokalnego pliku `.txt`

### Automatyczne aktualizacje

CC-Viewer automatycznie sprawdza aktualizacje przy uruchomieniu (maksymalnie raz na 4 godziny). W ramach tej samej głównej wersji (np. 1.x.x → 1.y.z) aktualizacje są stosowane automatycznie i wchodzą w życie przy następnym uruchomieniu. Aktualizacje między głównymi wersjami wyświetlają tylko powiadomienie.

Automatyczne aktualizacje są zgodne z globalną konfiguracją Claude Code `~/.claude/settings.json`. Jeśli Claude Code ma wyłączone automatyczne aktualizacje (`autoUpdates: false`), CC-Viewer również pominie automatyczne aktualizacje.

### Obsługa wielu języków

CC-Viewer obsługuje 18 języków i automatycznie przełącza się na podstawie języka systemu:

简体中文 | English | 繁體中文 | 한국어 | Deutsch | Español | Français | Italiano | Dansk | 日本語 | Polski | Русский | العربية | Norsk | Português (Brasil) | ไทย | Türkçe | Українська

## Licencja

MIT

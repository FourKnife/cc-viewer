# CC-Viewer

Sistema de monitoramento de requisições do Claude Code, captura e exibe em tempo real todas as requisições e respostas da API do Claude Code (texto original, sem cortes). Ajuda desenvolvedores a monitorar seu contexto para revisão e solução de problemas durante sessões de Vibe Coding.
A versão mais recente do CC-Viewer também oferece uma solução de programação web com deploy em servidor e ferramentas de programação mobile. Sinta-se à vontade para usar nos seus projetos — mais funcionalidades de plugins e suporte a deploy em nuvem estão a caminho.

Primeiro, veja a parte interessante, você pode ver no mobile:

<img width="1700" height="790" alt="image" src="https://github.com/user-attachments/assets/da3e519f-ff66-4cd2-81d1-f4e131215f6c" />

<font color="#999">(A versão atual não é muito compatível com iOS, otimizações para iOS serão feitas em 01/04/2026)</font>

[English](../README.md) | [简体中文](./README.zh.md) | [繁體中文](./README.zh-TW.md) | [한국어](./README.ko.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Dansk](./README.da.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [Norsk](./README.no.md) | Português (Brasil) | [ไทย](./README.th.md) | [Türkçe](./README.tr.md) | [Українська](./README.uk.md)

## Como usar

### Instalação

```bash
npm install -g cc-viewer --registry=https://registry.npmjs.org
```

### Modo de programação

ccv é um substituto direto do claude, todos os parâmetros são passados para o claude, enquanto inicia o Web Viewer.

```bash
ccv                    # == claude (modo interativo)
ccv -c                 # == claude --continue (continuar última conversa)
ccv -r                 # == claude --resume (retomar conversa)
ccv -p "hello"         # == claude --print "hello" (modo de impressão)
ccv --d                # == claude --dangerously-skip-permissions (atalho)
ccv --model opus       # == claude --model opus
```

Após iniciar o modo de programação, a página web será aberta automaticamente.

Você pode usar o Claude diretamente na página web, além de visualizar as requisições completas e as alterações de código.

E o mais interessante: você pode até programar pelo celular!


### Modo logger

⚠️ Se você ainda prefere usar a ferramenta nativa do claude, ou o plugin do VS Code, use este modo.

Neste modo, ao iniciar ```claude``` ou ```claude --dangerously-skip-permissions```

Um processo de log será iniciado automaticamente para registrar as requisições em ~/.claude/cc-viewer/*yourproject*/date.jsonl

Iniciar modo logger:
```bash
ccv -logger
```

Quando a porta específica não pode ser impressa no console, a primeira porta padrão é 127.0.0.1:7008. Se houver múltiplas instâncias, as portas seguem em sequência, como 7009, 7010

O comando detecta automaticamente o método de instalação local do Claude Code (NPM ou Native Install) e faz a adaptação.

- **Claude Code via NPM**: injeta automaticamente o script de interceptação no `cli.js` do Claude Code.
- **Claude Code via Native**: detecta automaticamente o binário `claude`, configura um proxy transparente local e define um Zsh Shell Hook para redirecionar o tráfego automaticamente.
- Este projeto recomenda preferencialmente o Claude Code instalado via npm.

Desinstalar modo logger:
```bash
ccv --uninstall
```

### Solução de problemas (Troubleshooting)

Se você encontrar problemas ao iniciar, existe uma solução definitiva:
Primeiro passo: abra o Claude Code em qualquer diretório;
Segundo passo: dê a seguinte instrução ao Claude Code:
```
Eu instalei o pacote npm cc-viewer, mas após executar ccv ele não funciona corretamente. Verifique os arquivos cli.js e findcc.js do cc-viewer e, com base no ambiente específico, adapte o método de deploy local do Claude Code. Ao adaptar, tente limitar as alterações ao findcc.js.
```
Deixar o próprio Claude Code verificar os erros é mais eficaz do que consultar qualquer pessoa ou ler qualquer documentação!

Após concluir as instruções acima, o findcc.js será atualizado. Se o seu projeto precisa frequentemente de deploy local, ou se o código forkado precisa resolver problemas de instalação com frequência, basta manter esse arquivo. Na próxima vez, é só copiar. Atualmente, muitos projetos e empresas que usam o Claude Code não fazem deploy em Mac, mas sim em servidores hospedados, por isso o autor separou o findcc.js para facilitar o acompanhamento das atualizações do código-fonte do cc-viewer.

### Outros comandos auxiliares

Consultar
```bash
ccv -h
```

### Substituição de configuração (Configuration Override)

Se você precisa usar um endpoint de API personalizado (por exemplo, proxy corporativo), basta configurar no `~/.claude/settings.json` ou definir a variável de ambiente `ANTHROPIC_BASE_URL`. O `ccv` detecta automaticamente e encaminha as requisições corretamente.

### Modo silencioso (Silent Mode)

Por padrão, o `ccv` opera em modo silencioso ao encapsular o `claude`, garantindo que a saída do seu terminal permaneça limpa, consistente com a experiência nativa. Todos os logs são capturados em segundo plano e podem ser visualizados em `http://localhost:7008`.

Após a configuração, basta usar o comando `claude` normalmente. Acesse `http://localhost:7008` para ver a interface de monitoramento.


## Funcionalidades


### Modo de programação

Após iniciar com ccv você pode ver:

<img width="1500" height="725" alt="image" src="https://github.com/user-attachments/assets/a64a381e-5a68-430c-b594-6d57dc01f4d3" />

Você pode visualizar o diff do código diretamente após a edição ser concluída:

<img width="1500" height="728" alt="image" src="https://github.com/user-attachments/assets/2a4acdaa-fc5f-4dc0-9e5f-f3273f0849b2" />

Embora você possa abrir arquivos e programar manualmente, não é recomendado usar programação manual, isso é programação antiga!

### Programação mobile

Você pode até escanear um código QR para programar em dispositivos móveis:

<img width="3018" height="1460" alt="image" src="https://github.com/user-attachments/assets/8debf48e-daec-420c-b37a-609f8b81cd20" />

Satisfaz sua imaginação sobre programação mobile, além disso há um mecanismo de plugins, se você precisar personalizar de acordo com seus hábitos de programação, pode acompanhar as atualizações dos hooks de plugins posteriormente.

### Modo logger (visualizar sessão completa do claude code)

<img width="1500" height="720" alt="image" src="https://github.com/user-attachments/assets/519dd496-68bd-4e76-84d7-2a3d14ae3f61" />

- Captura em tempo real todas as requisições de API enviadas pelo Claude Code, garantindo que seja o texto original, não logs cortados (isso é muito importante!!!)
- Identifica e marca automaticamente requisições do Main Agent e Sub Agent (subtipos: Plan, Search, Bash)
- Requisições do MainAgent suportam Body Diff JSON, exibindo de forma recolhida as diferenças em relação à última requisição do MainAgent (mostra apenas campos alterados/novos)
- Cada requisição exibe estatísticas de uso de Token inline (tokens de entrada/saída, criação/leitura de cache, taxa de acerto)
- Compatível com Claude Code Router (CCR) e outros cenários de proxy — correspondência de requisições por padrão de caminho de API como fallback

### Modo de conversa

Clique no botão "Modo de conversa" no canto superior direito para analisar o histórico completo de conversas do Main Agent em uma interface de chat:

<img width="1500" height="730" alt="image" src="https://github.com/user-attachments/assets/c973f142-748b-403f-b2b7-31a5d81e33e6" />

- Ainda não suporta exibição de Agent Team
- Mensagens do usuário alinhadas à direita (balão azul), respostas do Main Agent alinhadas à esquerda (balão escuro)
- Blocos `thinking` recolhidos por padrão, renderizados em Markdown, clique para expandir e ver o processo de pensamento; suporta tradução com um clique (funcionalidade ainda não estável)
- Mensagens de escolha do usuário (AskUserQuestion) exibidas em formato de pergunta e resposta
- Sincronização bidirecional de modo: ao alternar para o modo de conversa, posiciona automaticamente na conversa correspondente à requisição selecionada; ao voltar para o modo original, posiciona automaticamente na requisição selecionada
- Painel de configurações: pode alternar o estado de recolhimento padrão de resultados de ferramentas e blocos de pensamento
- Navegação de conversa no celular: no modo CLI mobile, clique no botão "Navegação de conversa" na barra superior para deslizar uma visualização de conversa somente leitura, navegando pelo histórico completo de conversas no celular

### Ferramentas de estatísticas

Painel flutuante "Estatísticas de dados" na área do cabeçalho:

<img width="1500" height="729" alt="image" src="https://github.com/user-attachments/assets/b23f9a81-fc3d-4937-9700-e70d84e4e5ce" />

- Exibe quantidade de criação/leitura de cache e taxa de acerto de cache
- Estatísticas de reconstrução de cache: agrupadas por motivo (TTL, alteração de system/tools/model, truncamento/modificação de mensagens, alteração de key), mostrando contagem e tokens de cache_creation
- Estatísticas de uso de ferramentas: exibe a frequência de chamadas de cada ferramenta ordenada por número de chamadas
- Estatísticas de uso de Skill: exibe a frequência de chamadas de cada Skill ordenada por número de chamadas
- Ícone de ajuda conceitual (?): clique para ver a documentação integrada do MainAgent, CacheRebuild e diversas ferramentas

### Gerenciamento de logs

Através do menu suspenso CC-Viewer no canto superior esquerdo:

<img width="1200" height="672" alt="image" src="https://github.com/user-attachments/assets/8cf24f5b-9450-4790-b781-0cd074cd3b39" />

- Importar logs locais: navegar por arquivos de log históricos, agrupados por projeto, abrir em nova janela
- Carregar arquivo JSONL local: selecionar diretamente um arquivo `.jsonl` local para visualização (suporta até 500 MB)
- Salvar log atual como: baixar o arquivo de log JSONL de monitoramento atual
- Mesclar logs: mesclar vários arquivos de log JSONL em uma única sessão para análise unificada
- Ver Prompts do usuário: extrair e exibir todas as entradas do usuário, suporta três modos de visualização — modo Original (conteúdo original), modo Contexto (tags do sistema recolhíveis), modo Text (texto puro); comandos slash (`/model`, `/context`, etc.) exibidos como entradas independentes; tags relacionadas a comandos automaticamente ocultadas do conteúdo do Prompt
- Exportar Prompts como TXT: exportar prompts do usuário (texto puro, sem tags do sistema) como arquivo `.txt` local

### Atualização automática

O CC-Viewer verifica automaticamente atualizações ao iniciar (no máximo uma vez a cada 4 horas). Dentro da mesma versão principal (ex. 1.x.x → 1.y.z), as atualizações são aplicadas automaticamente e entram em vigor na próxima inicialização. Mudanças de versão principal exibem apenas uma notificação.

A atualização automática segue a configuração global do Claude Code em `~/.claude/settings.json`. Se o Claude Code tiver as atualizações automáticas desativadas (`autoUpdates: false`), o CC-Viewer também ignorará as atualizações automáticas.

### Suporte multilíngue

CC-Viewer suporta 18 idiomas, alternando automaticamente de acordo com o idioma do sistema:

简体中文 | English | 繁體中文 | 한국어 | Deutsch | Español | Français | Italiano | Dansk | 日本語 | Polski | Русский | العربية | Norsk | Português (Brasil) | ไทย | Türkçe | Українська

## License

MIT

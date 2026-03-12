# CC-Viewer

Claude Code 請求監控系統，即時擷取並視覺化展示 Claude Code 的所有 API 請求與回應（原始文字，不做刪減）。方便開發者監控自己的 Context，以利於 Vibe Coding 過程中回顧和排查問題。
最新版本的 CC-Viewer 還提供了伺服器部署 web 程式設計的方案，以及行動裝置程式設計的工具。歡迎大家在自己的專案中應用，未來也將開放更多外掛功能，支援雲端部署。

先看有趣的部分，你可以在行動裝置上看到：

<img width="1700" height="790" alt="image" src="https://github.com/user-attachments/assets/da3e519f-ff66-4cd2-81d1-f4e131215f6c" />

<font color="#999">(目前版本 iOS 相容性不太好，2026.04.01 會針對 iOS 做最佳化)</font>

[English](../README.md) | [简体中文](./README.zh.md) | 繁體中文 | [한국어](./README.ko.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Dansk](./README.da.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [Norsk](./README.no.md) | [Português (Brasil)](./README.pt-BR.md) | [ไทย](./README.th.md) | [Türkçe](./README.tr.md) | [Українська](./README.uk.md)

## 使用方法

### 安裝

```bash
npm install -g cc-viewer --registry=https://registry.npmjs.org
```

### 程式設計模式

ccv 是 claude 的直接替身，所有參數透傳給 claude，同時啟動 Web Viewer。

```bash
ccv                    # == claude（互動模式）
ccv -c                 # == claude --continue（繼續上次對話）
ccv -r                 # == claude --resume（恢復對話）
ccv -p "hello"         # == claude --print "hello"（列印模式）
ccv --d                # == claude --dangerously-skip-permissions（快捷方式）
ccv --model opus       # == claude --model opus
```

程式設計模式啟動後，會主動開啟 web 頁面。

你可以在 web 頁面中直接使用 claude，同時可以檢視完整的請求報文和查看程式碼變更。

更令人驚豔的是，你甚至可以用行動裝置進行程式設計！


### 日誌模式

⚠️如果你仍然習慣使用 claude 原生工具，或者 VS Code 外掛，請使用該模式。

這個模式下面啟動 ```claude``` 或者 ```claude --dangerously-skip-permissions```

會自動啟動一個日誌程序自動記錄請求日誌到 ~/.claude/cc-viewer/*yourproject*/date.jsonl

啟動日誌模式：
```bash
ccv -logger
```

在控制台無法列印具體連接埠的時候，預設第一個啟動連接埠是 127.0.0.1:7008。同時存在多個末尾順延，如 7009、7010

該命令會自動偵測本機 Claude Code 的安裝方式（NPM 或 Native Install）並進行適配。

- **NPM 版本 claude code**：自動向 Claude Code 的 `cli.js` 中注入攔截腳本。
- **Native 版本 claude code**：自動偵測 `claude` 二進位檔案，設定本機透明代理，並設置 Zsh Shell Hook 自動轉發流量。
- 本專案更推薦使用 npm 方式安裝的 claude code。

卸載日誌模式：
```bash
ccv --uninstall
```

### 常見問題排查 (Troubleshooting)

如果你遇到無法啟動的問題，有一個終極排查方案：
第一步：任意目錄開啟 claude code；
第二步：給 claude code 下指令，內容如下：
```
我已經安裝了cc-viewer這個npm套件，但是執行ccv以後仍然無法有效運行。查看cc-viewer的cli.js 和 findcc.js，根據具體的環境，適配本地的claude code的部署方式。適配的時候修改範圍盡量約束在findcc.js中。
```
讓 Claude Code 自己檢查錯誤是比諮詢任何人以及看任何文件更有效的手段！

以上指令完成後，會更新 findcc.js。如果你的專案工程經常需要本機部署，或者 fork 出去的程式碼要經常解決安裝問題，保留這個檔案就可以。下次直接複製檔案。現階段很多專案和公司用 claude code 都不是 mac 部署，而是伺服器端託管部署，所以作者剝離了 findcc.js 這個檔案，方便後續追蹤 cc-viewer 的原始碼更新。

### 其他輔助指令

查閱
```bash
ccv -h
```

### 設定覆寫 (Configuration Override)

如果您需要使用自訂 API 端點（例如企業代理），只需在 `~/.claude/settings.json` 中設定或設置 `ANTHROPIC_BASE_URL` 環境變數。`ccv` 會自動識別並正確轉發請求。

### 靜默模式 (Silent Mode)

預設情況下，`ccv` 在包裹 `claude` 執行時處於靜默模式，確保您的終端輸出保持整潔，與原生體驗一致。所有日誌都在背景擷取，並可透過 `http://localhost:7008` 查看。

設定完成後，正常使用 `claude` 命令即可。存取 `http://localhost:7008` 查看監控介面。


## 功能


### 程式設計模式

在使用 ccv 啟動後可以看見：

<img width="1500" height="725" alt="image" src="https://github.com/user-attachments/assets/a64a381e-5a68-430c-b594-6d57dc01f4d3" />

你可以直接在編輯完成後查看程式碼 diff：

<img width="1500" height="728" alt="image" src="https://github.com/user-attachments/assets/2a4acdaa-fc5f-4dc0-9e5f-f3273f0849b2" />

雖然你可以開啟檔案手動撰寫程式碼，但並不推薦手動程式設計，那是古法程式設計！

### 行動裝置程式設計

你甚至可以掃碼，實現在行動裝置上進行程式設計：

<img width="3018" height="1460" alt="image" src="https://github.com/user-attachments/assets/8debf48e-daec-420c-b37a-609f8b81cd20" />

滿足你對行動裝置程式設計的想像，另外還有外掛機制，如果你需要針對自己的程式設計習慣定制，後續可以跟進外掛的 hooks 更新。

### 日誌模式（查看 claude code 完整會話）

<img width="1500" height="720" alt="image" src="https://github.com/user-attachments/assets/519dd496-68bd-4e76-84d7-2a3d14ae3f61" />

- 即時擷取 Claude Code 發出的所有 API 請求，確保是原文，而不是被刪減之後的日誌（這很重要！！！）
- 自動識別並標記 Main Agent 和 Sub Agent 請求（子類型：Plan、Search、Bash）
- MainAgent 請求支援 Body Diff JSON，摺疊展示與上一次 MainAgent 請求的差異（僅顯示變更/新增欄位）
- 每個請求內嵌顯示 Token 用量統計（輸入/輸出 Token、快取建立/讀取、命中率）
- 相容 Claude Code Router（CCR）及其他代理場景 — 透過 API 路徑模式兜底匹配請求

### 對話模式

點擊右上角「對話模式」按鈕，將 Main Agent 的完整對話歷史解析為聊天介面：

<img width="1500" height="730" alt="image" src="https://github.com/user-attachments/assets/c973f142-748b-403f-b2b7-31a5d81e33e6" />

- 暫不支援 Agent Team 的展示
- 使用者訊息右對齊（藍色氣泡），Main Agent 回覆左對齊（深色氣泡）
- `thinking` 區塊預設摺疊，以 Markdown 渲染，點擊展開查看思考過程；支援一鍵翻譯（功能尚不穩定）
- 使用者選擇型訊息（AskUserQuestion）以問答形式展示
- 雙向模式同步：切換到對話模式時自動定位到選中請求對應的對話；切回原文模式時自動定位到選中的請求
- 設定面板：可切換工具結果和思考區塊的預設摺疊狀態
- 手機端對話瀏覽：在手機端 CLI 模式下，點擊頂部列的「對話瀏覽」按鈕，即可滑出唯讀對話視圖，在手機上瀏覽完整對話歷史

### 統計工具

Header 區域的「資料統計」懸浮面板：

<img width="1500" height="729" alt="image" src="https://github.com/user-attachments/assets/b23f9a81-fc3d-4937-9700-e70d84e4e5ce" />

- 顯示 cache creation/read 數量及快取命中率
- 快取重建統計：按原因分組（TTL、system/tools/model 變更、訊息截斷/修改、key 變更）顯示次數和 cache_creation tokens
- 工具使用統計：按呼叫次數排序展示各工具的呼叫頻率
- Skill 使用統計：按呼叫次數排序展示各 Skill 的呼叫頻率
- 概念說明 (?) 圖示：點擊可查看 MainAgent、CacheRebuild 及各工具的內建文件

### 日誌管理

透過左上角 CC-Viewer 下拉選單：

<img width="1200" height="672" alt="image" src="https://github.com/user-attachments/assets/8cf24f5b-9450-4790-b781-0cd074cd3b39" />

- 匯入本機日誌：瀏覽歷史日誌檔案，按專案分組，在新視窗開啟
- 載入本機 JSONL 檔案：直接選擇本機 `.jsonl` 檔案載入檢視（支援最大 500MB）
- 目前日誌另存為：下載目前監控的 JSONL 日誌檔案
- 合併日誌：將多個 JSONL 日誌檔案合併為一個工作階段，統一分析
- 檢視使用者 Prompt：擷取並展示所有使用者輸入，支援三種檢視模式 — 原文模式（原始內容）、上下文模式（系統標籤可摺疊）、Text 模式（純文字）；斜線命令（`/model`、`/context` 等）作為獨立條目展示；命令相關標籤自動從 Prompt 內容中隱藏
- 匯出 Prompt 為 TXT：將使用者 Prompt（純文字，不含系統標籤）匯出為本機 `.txt` 檔案

### 自動更新

CC-Viewer 啟動時自動檢查更新（每 4 小時最多一次）。同一大版本內（如 1.x.x → 1.y.z）自動更新，下次啟動生效。跨大版本僅顯示通知提示。

自動更新跟隨 Claude Code 全域設定 `~/.claude/settings.json`。如果 Claude Code 停用了自動更新（`autoUpdates: false`），CC-Viewer 也會跳過自動更新。

### 多語言支援

CC-Viewer 支援 18 種語言，根據系統語言環境自動切換：

簡體中文 | English | 繁體中文 | 한국어 | Deutsch | Español | Français | Italiano | Dansk | 日本語 | Polski | Русский | العربية | Norsk | Português (Brasil) | ไทย | Türkçe | Українська

## License

MIT

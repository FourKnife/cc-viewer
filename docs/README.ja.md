# CC-Viewer

Claude Code リクエスト監視システム。Claude Code のすべての API リクエストとレスポンスをリアルタイムでキャプチャし、可視化表示します（原文のまま、省略なし）。開発者が自身の Context を監視し、Vibe Coding 中の振り返りや問題調査に役立てることができます。
最新版の CC-Viewer では、サーバーデプロイによる Web プログラミング環境や、モバイル端末でのプログラミングツールも提供しています。ぜひご自身のプロジェクトでご活用ください。今後さらに多くのプラグイン機能やクラウドデプロイのサポートも予定しています。

まず面白い部分から。モバイル端末では以下が表示されます：

<img width="1700" height="790" alt="image" src="https://github.com/user-attachments/assets/da3e519f-ff66-4cd2-81d1-f4e131215f6c" />

<font color="#999">(現在のバージョンは iOS との互換性があまり良くありません。2026.04.01 に iOS 向けの最適化を行う予定です)</font>

[English](../README.md) | [简体中文](./README.zh.md) | [繁體中文](./README.zh-TW.md) | [한국어](./README.ko.md) | 日本語 | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Dansk](./README.da.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [Norsk](./README.no.md) | [Português (Brasil)](./README.pt-BR.md) | [ไทย](./README.th.md) | [Türkçe](./README.tr.md) | [Українська](./README.uk.md)

## 使い方

### インストール

```bash
npm install -g cc-viewer --registry=https://registry.npmjs.org
```

### プログラミングモード

ccv は claude の直接的な代替品です。すべてのパラメータを claude に透過的に渡し、同時に Web Viewer を起動します。

```bash
ccv                    # == claude（インタラクティブモード）
ccv -c                 # == claude --continue（前回の対話を継続）
ccv -r                 # == claude --resume（対話を再開）
ccv -p "hello"         # == claude --print "hello"（プリントモード）
ccv --d                # == claude --dangerously-skip-permissions（ショートカット）
ccv --model opus       # == claude --model opus
```

プログラミングモードを起動すると、自動的に Web ページが開きます。

Web ページ上で直接 Claude を使用でき、完全なリクエスト内容の確認やコード差分の表示も可能です。

さらに魅力的なことに、モバイル端末からもプログラミングができます！


### ログモード

⚠️ claude のネイティブツールや VS Code プラグインを引き続き使用したい場合は、このモードをご利用ください。

こ���モードでは ```claude``` または ```claude --dangerously-skip-permissions``` を起動すると

自動的にログプロセスが起動し、リクエストログを ~/.claude/cc-viewer/*yourproject*/date.jsonl に自動記録します

ログモードを起動：
```bash
ccv -logger
```

コンソールに具体的なポートが表示されない場合、デフォルトの最初の起動ポートは 127.0.0.1:7008 です。複数同時に存在する場合は末尾が順次増加し、7009、7010 となります

このコマンドはローカルの Claude Code のインストール方式（NPM またはネイティブインストール）を自動検出し、適切に対応します。

- **NPM 版 claude code**：Claude Code の `cli.js` にインターセプトスクリプトを自動注入します。
- **ネイティブ版 claude code**：`claude` バイナリを自動検出し、ローカル透過プロキシを設定、Zsh Shell Hook によるトラフィック自動転送を構成します。
- 本プロジェクトでは NPM 方式でインストールした claude code の使用を推奨しています。

ログモードをアンインストール：
```bash
ccv --uninstall
```

### よくある問題のトラブルシューティング (Troubleshooting)

起動できない問題が発生した場合、究極の解決方法があります：
第一ステップ：任意のディレクトリで claude code を開きます。
第二ステップ：claude code に以下の指示を出します：
```
cc-viewer という npm パッケージをインストール済みですが、ccv を実行しても正常に動作しません。cc-viewer の cli.js と findcc.js を確認し、現在の環境に合わせてローカルの claude code のデプロイ方式に適合させてください。変更範囲はできるだけ findcc.js 内に限定してください。
```
Claude Code 自身にエラーを調査させることが、誰かに相談したりドキュメントを読んだりするよりも効果的な手段です！

上記の指示が完了すると、findcc.js が更新されます。プロジェクトで頻繁にローカルデプロイが必要な場合や、フォークしたコードでインストール問題を解決する必要がある場合は、このファイルを保持しておけば、次回はファイルをコピーするだけで済みます。現段階では多くのプロジェクトや企業が claude code を Mac ではなくサーバーサイドでホスティングデプロイしているため、作者は findcc.js を分離し、cc-viewer のソースコード更新を追跡しやすくしています。

### その他の補助コマンド

確認
```bash
ccv -h
```

### 設定のオーバーライド (Configuration Override)

カスタム API エンドポイント（企業プロキシなど）を使用する場合は、`~/.claude/settings.json` で設定するか、`ANTHROPIC_BASE_URL` 環境変数を設定してください。`ccv` が自動的に認識し、リクエストを正しく転送します。

### サイレントモード (Silent Mode)

デフォルトでは、`ccv` は `claude` をラップして実行する際にサイレントモードで動作し、ターミナル出力をクリーンに保ち、ネイティブと同じ体験を提供します。すべてのログはバックグラウンドでキャプチャされ、`http://localhost:7008` から確認できます。

設定完了後は、通常通り `claude` コマンドを使用してください。`http://localhost:7008` にアクセスして監視画面を確認できます。


## 機能


### プログラミングモード

ccv で起動すると以下が表示されます：

<img width="1500" height="725" alt="image" src="https://github.com/user-attachments/assets/a64a381e-5a68-430c-b594-6d57dc01f4d3" />

編集完了後、直接コード差分を確認できます：

<img width="1500" height="728" alt="image" src="https://github.com/user-attachments/assets/2a4acdaa-fc5f-4dc0-9e5f-f3273f0849b2" />

ファイルを開いて手動でプログラミングすることもできますが、手動プログラミングは推奨しません。それは古式プログラミングです！

### モバイルプログラミング

QR コードをスキャンして、モバイル端末でプログラミングすることもできます：

<img width="3018" height="1460" alt="image" src="https://github.com/user-attachments/assets/8debf48e-daec-420c-b37a-609f8b81cd20" />

モバイルプログラミングの理想を実現します。さらにプラグイン機構も用意されており、ご自身のプログラミング習慣に合わせたカスタマイズが必要な場合は、今後のプラグイン hooks の更新をお待ちください。

### ログモード（claude code の完全な会話を表示）

<img width="1500" height="720" alt="image" src="https://github.com/user-attachments/assets/519dd496-68bd-4e76-84d7-2a3d14ae3f61" />

- Claude Code が送信するすべての API リクエストをリアルタイムでキャプチャ。省略されたログではなく、原文であることを保証します（これが非常に重要です！！！）
- Main Agent と Sub Agent のリクエストを自動識別・タグ付け（サブタイプ：Plan、Search、Bash）
- MainAgent リクエストは Body Diff JSON に対応し、前回の MainAgent リクエストとの差分を折りたたみ表示（変更・追加フィールドのみ表示）
- 各リクエストに Token 使用量統計をインライン表示（入力/出力 Token、キャッシュ作成/読み取り、ヒット率）
- Claude Code Router（CCR）やその他のプロキシ環境に対応 — API パスパターンによるフォールバックマッチング

### 会話モード

右上の「会話モード」ボタンをクリックすると、Main Agent の完全な会話履歴がチャット画面として表示されます：

<img width="1500" height="730" alt="image" src="https://github.com/user-attachments/assets/c973f142-748b-403f-b2b7-31a5d81e33e6" />

- Agent Team の表示には現在未対応
- ユーザーメッセージは右寄せ（青い吹き出し）、Main Agent の返信は左寄せ（ダーク吹き出し）
- `thinking` ブロックはデフォルトで折りたたまれ、Markdown でレンダリング。クリックで思考プロセスを展開表示。ワンクリック翻訳にも対応（機能はまだ不安定）
- ユーザー選択型メッセージ（AskUserQuestion）は Q&A 形式で表示
- 双方向モード同期：会話モードに切り替えると選択中のリクエストに対応する会話に自動移動。原文モードに戻ると選択中のリクエストに自動移動
- 設定パネル：ツール結果と thinking ブロックのデフォルト折りたたみ状態を切り替え可能
- モバイル端末での会話閲覧：モバイル端末の CLI モードで、トップバーの「会話閲覧」ボタンをタップすると、読み取り専用の会話ビューがスライド表示され、モバイルで完全な会話履歴を閲覧可能

### 統計ツール

ヘッダー領域の「データ統計」フローティングパネル：

<img width="1500" height="729" alt="image" src="https://github.com/user-attachments/assets/b23f9a81-fc3d-4937-9700-e70d84e4e5ce" />

- cache creation/read の数量とキャッシュヒット率を表示
- キャッシュ再構築統計：原因別にグループ化（TTL、system/tools/model 変更、メッセージの切り詰め/修正、key 変更）して回数と cache_creation tokens を表示
- ツール使用統計：呼び出し回数順に各ツールの使用頻度を表示
- Skill 使用統計：呼び出し回数順に各 Skill の使用頻度を表示
- コンセプトヘルプ (?) アイコン：クリックで MainAgent、CacheRebuild、各ツールの組み込みドキュメントを表示

### ログ管理

左上の CC-Viewer ドロップダウンメニューから：

<img width="1200" height="672" alt="image" src="https://github.com/user-attachments/assets/8cf24f5b-9450-4790-b781-0cd074cd3b39" />

- ローカルログのインポート：履歴ログファイルを閲覧、プロジェクト別にグループ化、新しいウィンドウで開く
- ローカル JSONL ファイルの読み込み：ローカルの `.jsonl` ファイルを直接選択して読み込み（最大 500MB 対応）
- 現在のログを名前を付けて保存：現在監視中の JSONL ログファイルをダウンロード
- ログの結合：複数の JSONL ログファイルを一つのセッションに結合し、統合分析
- ユーザー Prompt の表示：すべてのユーザー入力を抽出・表示。3 つの表示モードに対応 — 原文モード（元のコンテンツ）、コンテキストモード（システムタグ折りたたみ可能）、Text モード（プレーンテキスト）。スラッシュコマンド（`/model`、`/context` など）は独立したエントリとして表示。コマンド関連タグは Prompt コンテンツから自動的に非表示
- Prompt を TXT にエクスポート：ユーザー Prompt（プレーンテキスト、システムタグなし）をローカルの `.txt` ファイルとしてエクスポート

### 自動更新

CC-Viewer は起動時に自動的に更新を確認します（最大 4 時間に 1 回）。同一メジャーバージョン内（例：1.x.x → 1.y.z）は自動更新され、次回起動時に反映されます。メジャーバージョンをまたぐ場合は通知のみ表示されます。

自動更新は Claude Code のグローバル設定 `~/.claude/settings.json` に従います。Claude Code で自動更新が無効化されている場合（`autoUpdates: false`）、CC-Viewer も自動更新をスキップします。

### 多言語サポート

CC-Viewer は 18 言語に対応し、システムの言語環境に応じて自動的に切り替わります：

简体中文 | English | 繁體中文 | 한국어 | Deutsch | Español | Français | Italiano | Dansk | 日本語 | Polski | Русский | العربية | Norsk | Português (Brasil) | ไทย | Türkçe | Українська

## License

MIT

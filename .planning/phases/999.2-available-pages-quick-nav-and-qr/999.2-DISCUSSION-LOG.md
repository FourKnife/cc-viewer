# Phase 999.2: Available Pages 快速导航 + 二维码生成 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 999.2-available-pages-quick-nav-and-qr
**Areas discussed:** QR 生成方式, QR 展示方式, 页面列表 UI

---

## QR 生成方式

| Option | Description | Selected |
|--------|-------------|----------|
| stdin 命令（推荐） | 发送 `sim <pageName>\n` 给运行中的进程，利用项目自带 qr 功能 | ✓ |
| 前端本地生成 | 用 qrcode.js 库从 URL 直接生成 QR，无需 stdin | |

**User's choice:** stdin 命令
**Notes:** 用户明确说明：在进程运行中输入 `sim 页面名称` 即可生成二维码，只需想办法发送到已执行进程的 stdin 即可。

---

## QR 展示方式

| Option | Description | Selected |
|--------|-------------|----------|
| 展示在日志区 | 点 QR 按钮后发 stdin，QR 码 ASCII 内容出现在日志滚动区 | ✓ |
| 解析成图片 | 自动检测日志里的 ASCII QR，转成可扫描图片 | |

**User's choice:** 展示在日志区
**Notes:** 用户认为简单展示在日志区即可，用手机扫日志里的 ASCII QR 码。

---

## 页面列表 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 两个按钮：名称 + QR | 每个页面 [页面名][QR] 两个并排按钮 | ✓ |
| 展开菜单 | 鼠标悬停展开操作菜单 | |

**User's choice:** 两个按钮：名称 + QR
**Notes:** 简单直接，操作一目了然。

---

## Claude's Discretion

- QR 按钮 icon：`QrcodeOutlined`（Ant Design）
- QR 按钮 tooltip 文字
- 日志自动滚动（保持现有逻辑）

## Deferred Ideas

- 解析 ASCII QR 码渲染为图片 — 延后
- 其他 stdin 命令（web、help 等）的 UI 快捷入口 — 延后

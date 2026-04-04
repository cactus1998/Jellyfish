# Jellyfish 📈 (Discord Online Counter Bot)

這是一個專門用來統計伺服器 **「最高同時在線人數」** 的 Discord 機器人。

## 💡 功能介紹
- **自動追蹤**：機器人會持續監看成員的在線狀態。
- **永久紀錄**：最高紀錄會存存在 `data.json` 中，即使機器人重啟也不會遺失。
- **查詢指令**：使用 `/peak` 斜線指令即可查看目前的最高紀錄。
- **語音頻道顯示**：提供 `/setchannel` 指令，將最高人數實時顯示在指定的語音頻道名稱上。

## 🚀 快速開始

### 1. 填寫 Token
請打開 `.env` 檔案，將 `在此貼上你的機器人Token` 換成你從 Discord Developer Portal 取得的標記。

### 2. 開放權限 (Intents)
在 [Discord Developer Portal](https://discord.com/developers/applications) 的 **Bot** 分頁中，請務必開啟以下權限：
- [x] **Server Members Intent**
- [x] **Presence Intent** (這是統計在線人數最重要的權限！)

### 3. 安裝與執行
在 `Jellyfish` 資料夾中開啟終端機，執行以下指令：

```bash
# 安裝依賴 (如果你還沒安裝)
npm install

# 啟動機器人
npm start
```

## 🛠️ 指令列表
- `/peak`：查看最高人數紀錄與達成時間。
- `/setchannel`：設定一個語音頻道來同步顯示最高在線人數。

## 📂 檔案說明
- `index.js`：機器人主程式。
- `data.json`：儲存最高紀錄的資料庫。
- `config.json`：基礎設定。
- `.env`：放置私密 Token (請勿公開分享此檔案)。

---
*由 Antigravity AI 製作*

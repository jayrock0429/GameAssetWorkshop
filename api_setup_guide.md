# Google Cloud Console API 啟用指南

為了能夠使用 **Imagen 3 (AI 繪圖)** 功能，您需要在 Google Cloud Console 中手動啟用相關 API 並綁定您的專案。

### 步驟 1: 進入 Google Cloud Console

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 在頂部導航欄，確認選中的是您建立 API Key 的那個 **專案 (Project)**。

### 步驟 2: 啟用 Vertex AI API

**這是使用 Gemini 與 Imagen 模型的基礎服務。**

1. 在左側選單中，點擊 **「APIs & Services (API 和服務)」** > **「Library (程式庫)」**。
2. 在搜尋框輸入：`Vertex AI API`。
3. 點擊搜尋結果中的 **Vertex AI API**。
4. 點擊藍色的 **「ENABLE (啟用)」** 按鈕。
   - 若已啟用，會顯示「MANAGE (管理)」，則無需動作。

### 步驟 3: 確認計費帳戶 (Billing)

**大多數 AI 圖像生成模型需要專案綁定計費帳戶 (Billing Account)，即便是免費額度內。**

1. 若在啟用 API 時跳出提示，請依指示綁定信用卡或計費帳戶。
2. Google Cloud 通常提供 $300 美元的免費試用額度。

### 步驟 4: 檢查權限

1. 啟用後，請等待約 1-2 分鐘讓設定生效。
2. 回到本系統，重新執行 Dashboard 的「一鍵啟動流水線」測試。

---

### 常見問題

**Q: 為什麼我有 API Key 但還是不能用？**
A: API Key 只是鑰匙，但如果「門 (API Service)」沒開，鑰匙也無法轉動。預設情況下，Google Cloud 專案不會自動啟用 Vertex AI Video/Image 生成功能，需手動開啟。

**Q: 啟用後還是 404？**
A: 請確認您的 API Key 是否有設 **「API 限制 (API Restrictions)」**？

- 前往 **APIs & Services** > **Credentials (憑證)**。
- 點擊您的 API Key。
- 如果選了「Restrict key (限制金鑰)」，請確保 **Vertex AI API** 有在白名單中。

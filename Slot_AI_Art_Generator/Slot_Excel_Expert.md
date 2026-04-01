# Slot Excel 進階解讀 Skill (Slot_Excel_Expert.md)

本 Skill 旨在提升 AI 偵錯與解讀「Slot 遊戲企劃 Excel」的準確度，結合了 GitHub 金標 (GitHub Gold Standard) 規則與 Slot 美術開發的特定邏輯。

## 1. 核心解讀與對應規則 (Interpretation & Mapping)

### 專業顏色編碼 (Financial-Grade Color Mapping)

AI 在讀取或產出 Excel 時，必須遵循以下語意對齊：

- **藍色字體 (RGB: 0,0,255)**：手動輸入的原始企劃數據 (如原始文字描述)。
- **黑色字體 (RGB: 0,0,0)**：由 AI 計算或衍生的公式結果。
- **綠色字體 (RGB: 0,128,0)**：跨工作表的引用數據。
- **黃色背景 (RGB: 255,255,0)**：需要美術人員「特別注意」或「人工確認」的視覺衝突項。

### 零硬編碼原則 (Zero Hardcoding)

- 輸出的 Excel 報表嚴禁直接填入數字結果。
- 必須使用 Excel 公式 (如 `=SUM()`, `=IF()`) 呈現計算過程，確保企劃書具備「動態自癒」能力。

## 2. Slot 領域專屬解讀 (Domain-Specific Logic)

### 視覺對齊語法 (Visual Alignment Syntax)

AI 在解析企劃書時，應具備以下聯想與對應能力：

- **ID 匹配**：`M1` = `SYM_1` = `High-Pay Character 1`。
- **特徵抓取**：識別描述中的「橘紅」、「頭部特寫」、「表情」等關鍵詞，並自動對應至 `image_prompt`。
- **參考圖關聯**：自動搜尋對應欄位中的 URL 或圖片路徑，並將其標記為 `reference_image`。

## 3. 數據清洗與驗證 (Cleaning & Validation)

### 企劃書防呆

- 自動過濾 Excel 中的 `nan`, `Unnamed` 與空值。
- 檢查「代表色」是否與「主體描述」產生視覺衝突 (例如：描述說是黑夜，背景卻描述為明亮)。

## 4. 工具鏈應用 (Tooling Workflow)

1. **預讀 (Analysis)**：使用 `pandas` 讀取 `sheet_name=None` 以獲取全域主題。
2. **精修 (Refinement)**：使用 `openpyxl` 保留原有模板樣式，並注入正確的顏色編碼與公式。
3. **驗證 (Audit)**：執行 `recalc.py` 確保產出的 Excel 無 `#REF!` 錯誤。

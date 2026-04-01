# AI自動美術生成系統 - 任務計畫清單

## 狀態標記

- [ ] 待處理
- [/] 進行中
- [x] 已完成

---

## 階段一：架構解耦與防呆優化 [已完成]

- [x] 1. 抽離 API 呼叫層 (`api_client.py`)
- [x] 2. 抽離影像處理層 (`image_processor.py`)
- [x] 3. 主程式瘦身 (`slot_ai_creator.py`)

## 階段二：模型優先順序調整 (2.5 -> 3.0 -> 4.0) [已完成]

- [x] 1. 修改 `api_client.py` 模型序列
- [x] 2. 執行 API 健康檢查腳本
- [x] 3. 驗證 E2E 生成流程

## 階段三：通用版面限制 (Universal Layout Constraints)

目標：確保盤面空間占 70%~75%，限制 UI 高度避免壓縮核心遊戲區域。

- [x] 1. **更新 `image_processor.py` 的合成邏輯**
  - 強制 Header 最大高度為 12% 畫布高度。
  - 強制 Base 最大高度為 15% 畫布高度。
  - 實作超標時自動垂直壓縮。
- [x] 2. **修正 `slot_ai_creator.py` 預設佈局**
  - 調整 Cabinet 與 H5_Mobile 的 StartY 與盤面高度以符合 73% 原則（已確認並精確修正格子寬高）。
- [x] 3. **連動測試驗證**
  - 使用端到端測試驗證 UI 縮放後的合成效果。
- [x] 4. **Git 上傳完成**
  - 推送到遠端倉庫並更新進度。

## 階段四：經驗總結 (Self-Improvement Loop) [已完成]

- [x] 更新 `tasks/lessons.md`
- [x] 產出 `walkthrough.md`

## 階段五：工作區與版本控管收斂 [進行中]

- [x] 1. 將 `GameAssetWorkshop` 從 `D:\AG` 移出並建立獨立 Git repo。
- [x] 2. 修正 `.gitignore`，排除資料庫檔、壓測輸出、預覽圖、zip 包與本機設定。
- [x] 3. 收斂 Git 追蹤內容，移除已誤收的衍生檔並建立清理 commit。
- [ ] 4. 設定新 repo 的遠端 `origin`。

# 子代理實作指令 (Watermark Feature)

請執行以下步驟：

1.  **修改檔案**：`d:\AG\GameAssetWorkshop\Slot_AI_Art_Generator\ImageResizer.js`
    - 新增 `applyWatermark(inputPath, outputPath, watermarkPath)` 方法。
    - 使用 `sharp` 的 `.composite()` 功能將浮水印圖片疊加在主圖右下角。
2.  **修改測試**：`d:\AG\GameAssetWorkshop\Slot_AI_Art_Generator\test_resizer.js`
    - 新增測試案例來呼叫 `applyWatermark`。
    - 使用 `watermark.png` 作為來源。
3.  **執行驗證**：使用 `pnpm node test_resizer.js` 確保功能正常。
4.  **回報**：完成後輸出「Mission Accomplished」。

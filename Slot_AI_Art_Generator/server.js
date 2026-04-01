/**
 * Slot 美術生成系統 - Web Server (Node.js/Express)
 * 功能：提供 Web 介面並支援 Excel 上傳與 Pipeline 串接
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const XLSX = require('xlsx');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 設定 Multer (暫存於記憶體)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // 服務前端頁面
app.use('/output_assets', express.static(path.join(__dirname, 'output_assets'))); // 共享生成出的圖片

/**
 * 輔助函式：將 Excel Buffer 轉換為純文字/JSON 描述
 */
function parseExcelToText(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let combinedText = "";

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        // 將分頁轉換為 JSON 物件陣列或是 CSV 格式文字
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        combinedText += `\n--- Sheet: ${sheetName} ---\n`;
        combinedText += JSON.stringify(jsonData, null, 2);
    });

    return combinedText;
}

/**
 * API：解析企劃書 (只解析不生成)
 */
app.post('/api/parse', upload.single('excelFile'), async (req, res) => {
    try {
        let docText = "";
        const targetLayout = req.body.targetLayout || 'Landscape';
        const customStyle = req.body.customStyle || '';
        const gridSize = req.body.gridSize || '5x3'; // 新增：預設 5x3

        if (req.file) {
            docText = parseExcelToText(req.file.buffer);
        } else if (req.body.docText) {
            docText = req.body.docText;
        } else {
            return res.status(400).json({ error: '請上傳 Excel 檔案或輸入企劃文本。' });
        }

        const { parseDesignDoc } = require('./slot_pipeline');
        const designData = await parseDesignDoc(docText, targetLayout, gridSize, customStyle);

        res.json({
            success: true,
            designData: designData
        });
    } catch (error) {
        console.error('[Parse Error]', error.message);
        res.status(500).json({ error: '解析失敗：' + error.message });
    }
});

/**
 * API：執行生成任務
 */
app.post('/api/generate', async (req, res) => {
    try {
        const { designData, selectedAssetIds } = req.body;

        if (!designData || !designData.assets) {
            return res.status(400).json({ error: '缺少設計數據 (designData)。' });
        }

        // 如果有傳入 selectedAssetIds，則只生成選取的資產
        if (selectedAssetIds && Array.isArray(selectedAssetIds)) {
            designData.assets = designData.assets.filter(asset =>
                selectedAssetIds.includes(asset.asset_id)
            );
        }

        if (designData.assets.length === 0) {
            return res.status(400).json({ error: '沒有選取的資產可供生成。' });
        }

        const gridSize = req.body.gridSize || '5x3';
        console.log(`[Server] 開始為主題「${designData.theme}」生成 ${designData.assets.length} 項資產... (Grid: ${gridSize})`);

        // 簡化監控邏輯，避免誤觸中止
        const reqState = { aborted: false };

        const { generateSlotAssets } = require('./slot_pipeline');
        const results = await generateSlotAssets(designData, gridSize, reqState);

        res.json({
            success: true,
            theme: designData.theme,
            results: results
        });

    } catch (error) {
        console.error('[Generate Error]', error.message);
        res.status(500).json({ error: '生成時發生錯誤：' + error.message });
    }
});

// 啟動伺服器
const server = app.listen(PORT, () => {
    console.log(`\n=== Slot 美術生成系統 (Excel 版) 已啟動 ===`);
    console.log(`存取位址：http://localhost:${PORT}`);
    console.log(`==========================================\n`);
});

// 錯誤處理：捕捉啟動時的異常 (例如連接埠被佔用)
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`\n[啟動失敗] 連接埠 ${PORT} 已被佔用！`);
        console.error(`請確認是否有其他 Node.js 程序正在執行，或嘗試關閉黑色視窗後重新啟動。`);
        process.exit(1);
    } else {
        console.error(`[伺服器錯誤]`, error.message);
        process.exit(1);
    }
});

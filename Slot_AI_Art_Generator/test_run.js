/**
 * Slot Pipeline 快速測試腳本
 * 使用執行方式：node test_run.js
 */

const { parseDesignDoc, generateSlotAssets } = require('./slot_pipeline');

// 模擬一份簡單的企劃書內容
const sampleDesignDoc = `
這是一款「古埃及神話」主題的老虎機遊戲：
1. 背景圖：金字塔內部壁畫，兩側有神秘火把。 (圖層名稱: bg)
2. 柱子框框：包覆在畫面上下的古老鑲金邊框。 (圖層名稱: pillar)
3. H1 符號：阿努比斯 (Anubis) 側臉，黑色皮膚，配戴華麗金飾。 (圖層名稱: sym)
4. 全域風格：3D 高質感渲染、濃厚金屬光澤、動漫風格勾邊。
`;

console.log('--- [測試啟動] 正在執行 Slot 美術自動化管線 ---');
console.log('目標版型: Landscape (對應 5x3_L.psd)');

(async () => {
    try {
        const parsedData = await parseDesignDoc(sampleDesignDoc, 'Landscape');
        await generateSlotAssets(parsedData);
        console.log('--- [測試結束] 請查看 ./output_assets 資料夾 ---');
    } catch (err) {
        console.error('執行過程中發生錯誤：', err);
    }
})();

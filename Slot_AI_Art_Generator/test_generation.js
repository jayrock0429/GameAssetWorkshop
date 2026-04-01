/**
 * 自主測試腳本 v1.1 - 七龍珠主題測試
 * 
 * 驗證系統如何運用「風格 DNA」主題適應策略處理 Mecha/Anime 風格。
 */

const { parseDesignDoc, generateSlotAssets } = require('./slot_pipeline');
const path = require('path');
const fs = require('fs-extra');

async function runTest() {
    console.log("🚀 開始執行自主測試：七龍珠主題 (Dragon Ball)...");

    const testDoc = `
遊戲名稱：龍珠Ｚ：天下第一武道會 (Dragon Ball Z: Budokai)
遊戲背景：布瑪的膠囊公司 (Capsule Corp) 高科技實驗室，充滿白色與黃色的金屬裝飾、液壓管線與能量線條。
符號設定：
1. 超級賽亞人悟空 (Goku): 高獎符號，發光的金氣鬥氣。
2. 四星龍珠 (Dragon Ball): 中獎符號，橙色晶瑩剔透，內有紅色星星，表面有高質感反射。
3. 膠囊 (Capsule): Scatter 符號，充滿科技感，金屬質感。
4. 神龍 (Shenron): Wild 符號。
5. A, K, Q, J: 低獎字母，膠囊公司高科技金屬風格，黃色與白色幾何切割感。
盤面規格：5x3
版型：Landscape (橫向)
    `;

    try {
        // 第一步：企劃解析
        const designData = await parseDesignDoc(testDoc, "Landscape", "5x3", "");
        console.log("✅ 企劃解析成功！產生的資產數量:", designData.assets.length);

        // 第二步：資產生成 (選取龍珠與膠囊公司風 Pillar)
        const selectedAssetIds = [
            designData.assets.find(a => a.asset_id.includes('bg'))?.asset_id,
            designData.assets.find(a => (a.asset_id.toLowerCase().includes('dragon') || a.asset_id.toLowerCase().includes('ball')))?.asset_id,
            designData.assets.find(a => a.asset_id.includes('pillar'))?.asset_id
        ].filter(Boolean);

        const filteredDesignData = {
            ...designData,
            assets: designData.assets.filter(a => selectedAssetIds.includes(a.asset_id))
        };

        console.log(`🎬 開始生成選取的資產 (${selectedAssetIds.join(', ')}) ...`);

        const reqState = { aborted: false };
        const results = await generateSlotAssets(filteredDesignData, "5x3", reqState);

        console.log("\n✨ 七龍珠測試完成！結果：");
        results.forEach(res => {
            console.log(`- [${res.status.toUpperCase()}] ID: ${res.id} -> ${res.path || res.error}`);
        });

    } catch (error) {
        console.error("❌ 測試失敗：", error);
    }
}

runTest();

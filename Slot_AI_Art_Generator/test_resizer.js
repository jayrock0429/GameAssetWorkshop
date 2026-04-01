const ImageResizer = require('./ImageResizer');
const path = require('path');
const fs = require('fs-extra');

async function runTest() {
    const resizer = new ImageResizer();
    const sourceImage = path.join(__dirname, '..', 'KnockoutClash_basegameL_資產出圖版本.jpg');
    const outputImage = path.join(__dirname, 'output_assets', 'test_resized.jpg');

    console.log('🧪 開始測試 ImageResizer...');

    try {
        // 確保輸出目錄乾淨
        await fs.remove(path.dirname(outputImage));

        console.log(`📸 正在縮放圖片: ${sourceImage}`);
        await resizer.resize(sourceImage, outputImage, 500);

        // 新增：測試浮水印功能
        const watermarkSource = path.join(__dirname, 'watermark.png');
        const watermarkedOutput = path.join(__dirname, 'output_assets', 'test_watermarked.jpg');
        
        if (await fs.pathExists(watermarkSource)) {
            console.log(`💧 正在套用浮水印: ${watermarkSource}`);
            await resizer.applyWatermark(outputImage, watermarkedOutput, watermarkSource);
            console.log(`✅ 浮水印測試成功！📍 路徑: ${watermarkedOutput}`);
        } else {
            console.warn(`⚠️ 找不到 watermark.png，跳過浮水印測試。`);
        }

        const exists = await fs.pathExists(outputImage);
        if (exists) {
            const stats = await fs.stat(outputImage);
            console.log(`✅ 測試成功！`);
            console.log(`📍 輸出路徑: ${outputImage}`);
            console.log(`📏 檔案大小: ${(stats.size / 1024).toFixed(2)} KB`);
        } else {
            console.error('❌ 測試失敗：輸出檔案未生成');
        }
    } catch (error) {
        console.error(`❌ 測試過程中發生錯誤: ${error.message}`);
    }
}

runTest();

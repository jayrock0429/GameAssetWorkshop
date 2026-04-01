const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

/**
 * ImageResizer 核心類別
 * 負責處理單張及批次圖片縮放任務
 */
class ImageResizer {
    /**
     * 縮放單張圖片
     * @param {string} inputPath 輸入路徑
     * @param {string} outputPath 輸出路徑
     * @param {number} width 目標寬度
     * @param {number} [height] 目標高度 (可選，預設依比例)
     */
    async resize(inputPath, outputPath, width, height = null) {
        try {
            if (!(await fs.pathExists(inputPath))) {
                throw new Error(`找不到輸入檔案: ${inputPath}`);
            }

            await fs.ensureDir(path.dirname(outputPath));

            const options = {
                fit: 'inside',
                withoutEnlargement: true
            };

            await sharp(inputPath)
                .resize(width, height, options)
                .toFile(outputPath);

            return { success: true, path: outputPath };
        } catch (error) {
            console.error(`[ImageResizer Error]: ${error.message}`);
            throw error;
        }
    }

    /**
     * 批次縮放目錄下的圖片
     * @param {string} inputDir 輸入目錄
     * @param {string} outputDir 輸出目錄
     * @param {number} width 目標寬度
     */
    async batchResize(inputDir, outputDir, width) {
        const files = await fs.readdir(inputDir);
        const results = [];

        for (const file of files) {
            if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
                const input = path.join(inputDir, file);
                const output = path.join(outputDir, file);
                results.push(await this.resize(input, output, width));
            }
        }
        return results;
    }

    /**
     * 套用浮水印到圖片右下角
     * @param {string} inputPath 輸入圖片路徑
     * @param {string} outputPath 輸出圖片路徑
     * @param {string} watermarkPath 浮水印圖片路徑
     */
    async applyWatermark(inputPath, outputPath, watermarkPath) {
        try {
            if (!(await fs.pathExists(inputPath)) || !(await fs.pathExists(watermarkPath))) {
                throw new Error(`找不到輸入檔案或浮水印檔案。`);
            }

            await fs.ensureDir(path.dirname(outputPath));

            await sharp(inputPath)
                .composite([{
                    input: watermarkPath,
                    gravity: 'southeast' // 疊加在右下角
                }])
                .toFile(outputPath);

            return { success: true, path: outputPath };
        } catch (error) {
            console.error(`[ImageResizer Watermark Error]: ${error.message}`);
            throw error;
        }
    }
}

module.exports = ImageResizer;

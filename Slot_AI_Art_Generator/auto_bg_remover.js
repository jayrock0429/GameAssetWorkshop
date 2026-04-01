// auto_bg_remover.js
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

/**
 * 檢查系統是否安裝了 rembg (Python 庫)
 * 若未安裝，回傳 false
 */
function checkRembg() {
    try {
        execSync('rembg --version', { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * 對指定的 PNG 檔案進行去背
 * @param {string} inputPath 
 * @param {string} outputPath 
 */
function removeBackground(inputPath, outputPath) {
    console.log(`[Rembg] 正在對 ${path.basename(inputPath)} 執行高精度去背...`);
    try {
        // 使用 rembg 進行去背
        execSync(`rembg i "${inputPath}" "${outputPath}"`);
        return true;
    } catch (error) {
        console.error(`[Rembg 錯誤] 去背失敗: ${error.message}`);
        return false;
    }
}

module.exports = {
    checkRembg,
    removeBackground
};

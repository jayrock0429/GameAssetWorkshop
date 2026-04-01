const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function checkDims() {
    const assetsDir = path.join(__dirname, 'output_assets');
    const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.png'));

    console.log("--- 資產尺寸驗證 ---");
    for (const file of files) {
        const filePath = path.join(assetsDir, file);
        const metadata = await sharp(filePath).metadata();
        console.log(`[${file}] 尺寸: ${metadata.width}x${metadata.height}`);
    }
}

checkDims();

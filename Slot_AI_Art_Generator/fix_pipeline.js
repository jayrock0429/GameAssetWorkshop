const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');

const filePath = path.join(__dirname, 'slot_pipeline.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix ReferenceError by removing 'currentDims' and handling sizes dynamically
content = content.replace(
    /let targetDim = currentDims\[layerKey\];/g,
    'let targetDim = null;'
);

// 2. Ensure Background and Pillar get default dimensions if targetDim is still null
content = content.replace(
    /const isBackground = layerKey\.includes\('bg'\);/g,
    'const isBackground = layerKey.includes(\'bg\');\n      if (!targetDim) {\n        targetDim = { width: baseWidth, height: baseHeight };\n      }'
);

// 3. Update result object to include full path information
content = content.replace(
    /results\.push\(\{ id: "all_mockup", status: "success", isMockup: true \}\);/g,
    'results.push({ id: "all_mockup", path: mockupPath, status: "success", isMockup: true });'
);

// 4. Optimize compositeSlotScreen to cache symbol buffers
const optimizedComposite = `async function compositeSlotScreen(outputDir, results, gridSize, isLandscape) {
  try {
    const [cols, rows] = gridSize.split('x').map(Number);
    const mockupPath = path.join(outputDir, 'final_game_mockup.png');
    
    const bg = results.find(r => r.status === 'success' && r.id.toLowerCase().includes('bg'));
    const pillar = results.find(r => r.status === 'success' && (r.id.toLowerCase().includes('pillar') || r.id.toLowerCase().includes('grid')));
    const syms = results.filter(r => r.status === 'success' && r.id.toLowerCase().includes('sym'));

    if (!bg || !pillar || syms.length === 0) {
      console.log("[合成跳過] 缺少背景、盤框或符號，無法合成模擬畫面。");
      return null;
    }

    const baseWidth = isLandscape ? 1920 : 1080;
    const baseHeight = isLandscape ? 1080 : 1920;

    // 取得背景為基底，並確保尺寸正確
    let baseCanvas = sharp(bg.path).resize(baseWidth, baseHeight, { fit: 'cover' });

    // 計算盤面位置
    const gridW = baseWidth * 0.75;
    const gridH = baseHeight * 0.70;
    const startX = (baseWidth - gridW) / 2;
    const startY = (baseHeight - gridH) / 2;
    const cellW = Math.floor(gridW / cols);
    const cellH = Math.floor(gridH / rows);

    const compositeLayers = [];

    // --- 效能優化：快取唯一符號的 Buffer ---
    const symBufferCache = new Map();
    const getSymBuffer = async (symPath) => {
      if (symBufferCache.has(symPath)) return symBufferCache.get(symPath);
      const buf = await sharp(symPath)
        .resize(cellW, cellH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();
      symBufferCache.set(symPath, buf);
      return buf;
    };

    // 3. 填入符號
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const targetSym = syms[(r * cols + c) % syms.length];
        const symBuffer = await getSymBuffer(targetSym.path);
        compositeLayers.push({
          input: symBuffer,
          left: Math.round(startX + (c * cellW)),
          top: Math.round(startY + (r * cellH))
        });
      }
    }

    // 4. 疊加盤框 (放在符號上方)
    const pillarBuffer = await sharp(pillar.path)
      .resize(baseWidth, baseHeight, { fit: 'contain' })
      .toBuffer();
    
    compositeLayers.push({ input: pillarBuffer, left: 0, top: 0 });

    // 5. 執行最終合成
    await baseCanvas.composite(compositeLayers).toFile(mockupPath);
    console.log("[合成成功] 已產生全螢幕模擬圖：" + mockupPath);
    return mockupPath;
  } catch (err) {
    console.error("[合成異常]", err.message);
    return null;
  }
}`;

// Use a more aggressive replacement for compositeSlotScreen
const searchStart = content.indexOf('async function compositeSlotScreen');
if (searchStart !== -1) {
    fs.writeFileSync(filePath, content.substring(0, searchStart) + optimizedComposite, 'utf8');
    console.log('Fixed slot_pipeline.js successfully.');
} else {
    // If somehow missing, append it
    fs.writeFileSync(filePath, content + '\n\n' + optimizedComposite, 'utf8');
}

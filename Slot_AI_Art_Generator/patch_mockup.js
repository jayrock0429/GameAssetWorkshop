const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'slot_pipeline.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Find the end of generateSlotAssets function
// It ends with '  return results;\n}'
const returnLine = '  return results;';
const lastIdx = content.lastIndexOf(returnLine);
if (lastIdx !== -1) {
    // Find the closing brace of the function
    const closingBraceIdx = content.indexOf('}', lastIdx);
    if (closingBraceIdx !== -1) {
        const insertion = `
  // --- 新增：自動全畫面合成邏輯 ---
  try {
    const mockupPath = await compositeSlotScreen(outputDir, results, gridSize, isLandscape);
    if (mockupPath) {
      results.push({ id: "all_mockup", status: "success", isMockup: true });
    }
  } catch (err) {
    console.error("[合成失敗] 無法產生模擬畫面：", err.message);
  }
`;
        content = content.substring(0, lastIdx) + insertion + '\n' + content.substring(lastIdx);
    }
}

// 2. Append compositeSlotScreen function at the very end (before exports if needed, or just end)
const newFunction = `
/**
 * 第三階段：合成模擬畫面 (Background + Symbols in Grid + Pillar Frame)
 */
async function compositeSlotScreen(outputDir, results, gridSize, isLandscape) {
  const [cols, rows] = gridSize.split('x').map(Number);
  const baseWidth = isLandscape ? 1920 : 1080;
  const baseHeight = isLandscape ? 1080 : 1920;

  // 尋找必要資產
  const bg = results.find(r => r.status === 'success' && r.id.toLowerCase().includes('bg'));
  const pillar = results.find(r => r.status === 'success' && (r.id.toLowerCase().includes('pillar') || r.id.toLowerCase().includes('grid')));
  const syms = results.filter(r => r.status === 'success' && r.id.toLowerCase().includes('sym'));

  if (!bg || !pillar || syms.length === 0) {
    console.warn("[合成跳過] 缺少必要的背景、盤框或符號資產。");
    return null;
  }

  console.log(\`--- 正在合成全螢幕模擬畫面 (\${gridSize}) ---\`);

  // 1. 準備背景 (作為底圖)
  let baseCanvas = sharp(bg.path).resize(baseWidth, baseHeight, { fit: 'cover' });

  // 2. 計算盤面格子區域 (假設佔畫面中間 75% 寬度與 80% 高度)
  const gridW = baseWidth * 0.75;
  const gridH = baseHeight * 0.8;
  const cellW = Math.floor(gridW / cols);
  const cellH = Math.floor(gridH / rows);
  
  const startX = Math.floor((baseWidth - gridW) / 2);
  const startY = Math.floor((baseHeight - gridH) / 2);

  const compositeLayers = [];

  // 3. 填入符號 (循環使用已生成的符號填滿格子)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const symIdx = (r * cols + c) % syms.length;
      const targetSym = syms[symIdx];
      
      // 讀取符號並縮放
      const symBuffer = await sharp(targetSym.path)
        .resize(cellW, cellH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

      compositeLayers.push({
        input: symBuffer,
        left: startX + (c * cellW),
        top: startY + (r * cellH)
      });
    }
  }

  // 4. 覆蓋盤框 (Pillar) - 縮放到剛好包住盤面區域
  const pillarBuffer = await sharp(pillar.path)
    .resize(Math.floor(gridW * 1.05), Math.floor(gridH * 1.05), { fit: 'fill' })
    .toBuffer();

  compositeLayers.push({
    input: pillarBuffer,
    left: Math.floor(startX - (gridW * 0.025)),
    top: Math.floor(startY - (gridH * 0.025))
  });

  // 5. 執行最終合成
  const mockupFileName = "final_game_mockup.png";
  const mockupPath = path.join(outputDir, mockupFileName);

  await baseCanvas.composite(compositeLayers).toFile(mockupPath);
  console.log(\`[成功] 模擬畫面已生成：\${mockupFileName}\`);

  return mockupPath;
}
`;

// Insert before module.exports
const exportPos = content.indexOf('module.exports');
if (exportPos !== -1) {
    content = content.substring(0, exportPos) + newFunction + '\n' + content.substring(exportPos);
} else {
    content += newFunction;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched slot_pipeline.js with mockup logic');

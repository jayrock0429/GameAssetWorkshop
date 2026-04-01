/**
 * composite.ts — 本地合成系統
 * 使用 sharp 將背景、符號網格、邊框疊合，輸出最終遊戲截圖
 *
 * 支援佈局：3x3, 5x3, 5x4 及任意 grid_cols x grid_rows
 * 超採樣：輸出尺寸 = 引擎目標尺寸 x SUPERSAMPLE_FACTOR (預設 4x)
 */

import sharp, { OverlayOptions } from 'sharp';
import fs from 'fs';
import path from 'path';

// ─── 常數設定 ───────────────────────────────────────────────────
const SUPERSAMPLE_FACTOR = 4;           // 輸出圖為引擎尺寸的 4 倍
const ENGINE_WIDTH = 1920;              // 引擎目標寬度 (px)
const ENGINE_HEIGHT = 1080;             // 引擎目標高度 (px)
const OUTPUT_WIDTH = ENGINE_WIDTH * SUPERSAMPLE_FACTOR;   // 7680
const OUTPUT_HEIGHT = ENGINE_HEIGHT * SUPERSAMPLE_FACTOR; // 4320

// 遊戲區域佔整張畫面的比例（留邊給 UI）
const REEL_AREA = {
    left: 0.18,   // 18% 左邊距
    top: 0.12,    // 12% 上邊距
    right: 0.18,  // 18% 右邊距
    bottom: 0.20, // 20% 下邊距
};

// ─── 型別 ────────────────────────────────────────────────────────
export type CompositeLayout = {
    cols: number;    // 捲軸欄數（e.g. 3, 5）
    rows: number;    // 捲軸列數（e.g. 3, 4）
    symbolGap?: number;  // 格子間距比例（相對於格子寬度，預設 0.05）
};

export type CompositeAssets = {
    bgPath?: string;       // 背景圖絕對路徑
    framePath?: string;    // 邊框圖絕對路徑（中空，mixBlendMode: screen 邏輯）
    symbolPaths: string[]; // 符號圖路徑陣列（依順序填入格子，不足則循環）
};

export type CompositeOptions = {
    layout: CompositeLayout;
    assets: CompositeAssets;
    outputPath: string;    // 輸出檔案的絕對路徑
    scale?: number;        // 覆蓋超採樣倍率（預設 SUPERSAMPLE_FACTOR）
};

// ─── 工具函式 ─────────────────────────────────────────────────────

/** 讀取圖片，回傳 sharp 實例（找不到檔案則回傳 null） */
function loadImage(filePath: string | undefined): sharp.Sharp | null {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return sharp(filePath);
}

/** 讀取圖片為 Buffer，並縮放至指定尺寸 */
async function resizeToBuffer(
    filePath: string,
    width: number,
    height: number,
    fit: keyof sharp.FitEnum = 'cover'
): Promise<Buffer> {
    return sharp(filePath)
        .resize(width, height, { fit, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
}

// ─── 主函式 ───────────────────────────────────────────────────────

/**
 * 合成老虎機畫面
 *
 * 圖層順序（由下至上）：
 * 1. 背景 (bg)       — 全尺寸，objectFit: cover
 * 2. 符號網格        — 依 layout.cols x layout.rows 排列於遊戲區域
 * 3. 邊框 (frame)    — 疊在符號上方，全尺寸（黑色區域透明，靠 multiply 邏輯）
 *
 * @returns 輸出 PNG 的絕對路徑
 */
export async function compositeSlotScreen(options: CompositeOptions): Promise<string> {
    const { layout, assets, outputPath } = options;
    const scale = options.scale ?? SUPERSAMPLE_FACTOR;

    const totalW = ENGINE_WIDTH * scale;
    const totalH = ENGINE_HEIGHT * scale;

    // ── 1. 建立畫布（純黑底）
    let canvas = sharp({
        create: {
            width: totalW,
            height: totalH,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 1 },
        },
    }).png();

    const layers: OverlayOptions[] = [];

    // ── 2. 背景層
    if (assets.bgPath && fs.existsSync(assets.bgPath)) {
        const bgBuf = await resizeToBuffer(assets.bgPath, totalW, totalH, 'cover');
        layers.push({ input: bgBuf, top: 0, left: 0 });
    }

    // ── 3. 計算遊戲區域 (reel area) 的像素座標
    const reelLeft   = Math.round(totalW * REEL_AREA.left);
    const reelTop    = Math.round(totalH * REEL_AREA.top);
    const reelRight  = Math.round(totalW * (1 - REEL_AREA.right));
    const reelBottom = Math.round(totalH * (1 - REEL_AREA.bottom));
    const reelW      = reelRight - reelLeft;
    const reelH      = reelBottom - reelTop;

    // ── 4. 符號網格層
    const { cols, rows, symbolGap = 0.05 } = layout;
    const totalSymbols = cols * rows;
    const validSymbols = assets.symbolPaths.filter(p => fs.existsSync(p));

    if (validSymbols.length > 0) {
        const gapPx = Math.round((reelW / cols) * symbolGap);
        const cellW = Math.round((reelW - gapPx * (cols + 1)) / cols);
        const cellH = Math.round((reelH - gapPx * (rows + 1)) / rows);

        for (let i = 0; i < totalSymbols; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const symbolPath = validSymbols[i % validSymbols.length];

            const symBuf = await resizeToBuffer(symbolPath, cellW, cellH, 'contain');

            const x = reelLeft + gapPx + col * (cellW + gapPx);
            const y = reelTop  + gapPx + row * (cellH + gapPx);

            layers.push({ input: symBuf, top: y, left: x, blend: 'over' });
        }
    }

    // ── 5. 邊框層（蓋在符號上方，全尺寸）
    if (assets.framePath && fs.existsSync(assets.framePath)) {
        const frameBuf = await resizeToBuffer(assets.framePath, totalW, totalH, 'fill');
        // 使用 'screen' blend：frame 中的純黑區域 = 透明，有色邊框正常顯示
        layers.push({ input: frameBuf, top: 0, left: 0, blend: 'screen' });
    }

    // ── 6. 合成所有圖層並輸出
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });

    await canvas.composite(layers).toFile(outputPath);

    return outputPath;
}

// ─── 預設佈局快捷 ─────────────────────────────────────────────────

/** 標準佈局預設集 */
export const SLOT_LAYOUTS: Record<string, CompositeLayout> = {
    '3x3': { cols: 3, rows: 3 },
    '5x3': { cols: 5, rows: 3 },  // 最常見的老虎機佈局
    '5x4': { cols: 5, rows: 4 },
    '6x4': { cols: 6, rows: 4 },
    '4x5': { cols: 4, rows: 5 },
};

/**
 * 從 project 設定自動選取最接近的佈局
 */
export function resolveLayout(cols: number, rows: number): CompositeLayout {
    const key = `${cols}x${rows}`;
    return SLOT_LAYOUTS[key] ?? { cols, rows };
}

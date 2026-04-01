/**
 * layerGenerator.ts — 符號圖層自動生成工具
 *
 * 從已去背的 no_bg 圖層，以 sharp 程式化合成以下附加圖層：
 *   - glow   : 發光/光暈效果層（用於遊戲引擎的 screen 疊合模式）
 *   - shadow : 陰影層（用於遊戲引擎的 multiply 疊合模式）
 *
 * 這些圖層不需要額外 AI API 呼叫，純本地處理，適合大量批次生成。
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import type Database from 'better-sqlite3';
import { upsertMagicLayer } from './db';
import { layerImageUrl, outputDir, toAbsPath } from './paths';

// ─── 圖層類型定義 ────────────────────────────────────────────────────────────
export type SymbolLayerType = 'glow' | 'shadow';

// ─── 工具：讀取圖片元數據 ───────────────────────────────────────────────────
async function getImageSize(filePath: string): Promise<{ width: number; height: number }> {
    const meta = await sharp(filePath).metadata();
    return { width: meta.width ?? 512, height: meta.height ?? 512 };
}

// ─── 發光層生成 ──────────────────────────────────────────────────────────────

/**
 * 從 no_bg 圖層生成「發光效果層」。
 *
 * 邏輯：
 * 1. 讀取去背圖（透明背景）
 * 2. 製作兩層高斯模糊（大/小）並疊加，模擬 bloom 光暈
 * 3. 提升亮度與飽和度，強化發光感
 * 4. 輸出為純黑背景 PNG（供遊戲引擎以 screen 模式疊合）
 *
 * @param noBgPath  去背圖的絕對路徑
 * @param outputPath 輸出路徑
 */
export async function generateGlowLayer(noBgPath: string, outputPath: string): Promise<void> {
    const { width, height } = await getImageSize(noBgPath);

    // 製作兩層不同半徑的模糊，模擬光暈的「核心+擴散」效果
    const coreGlow = await sharp(noBgPath)
        .blur(8)                                       // 較小模糊 = 近核心光芒
        .modulate({ brightness: 2.0, saturation: 1.8 })
        .png()
        .toBuffer();

    const outerGlow = await sharp(noBgPath)
        .blur(28)                                      // 較大模糊 = 外圍光暈
        .modulate({ brightness: 1.5, saturation: 1.4 })
        .png()
        .toBuffer();

    // 在純黑底上疊合兩層 glow（使用 add 混合模式累加亮度）
    await sharp({
        create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
    })
        .png()
        .composite([
            { input: outerGlow, blend: 'add' },
            { input: coreGlow,  blend: 'add' },
        ])
        .toFile(outputPath);
}

// ─── 陰影層生成 ──────────────────────────────────────────────────────────────

/**
 * 從 no_bg 圖層生成「陰影層」。
 *
 * 邏輯：
 * 1. 讀取去背圖
 * 2. 將所有像素著色為接近黑色（保留 alpha 形狀）
 * 3. 套用高斯模糊讓陰影邊緣柔化
 * 4. 輸出為透明背景 PNG，位置往右下偏移，供遊戲引擎以 multiply 模式疊合
 *
 * @param noBgPath  去背圖的絕對路徑
 * @param outputPath 輸出路徑
 */
export async function generateShadowLayer(noBgPath: string, outputPath: string): Promise<void> {
    const { width, height } = await getImageSize(noBgPath);
    const offsetPx = Math.round(width * 0.045); // 右下偏移約 4.5% 寬度

    // 製作深色模糊的陰影本體（保留原圖形狀但全染黑）
    const shadowBody = await sharp(noBgPath)
        .tint({ r: 10, g: 5, b: 20 })              // 偏深藍黑色（比純黑更自然）
        .modulate({ brightness: 0.05 })              // 壓暗到幾乎全黑
        .blur(14)                                    // 柔化邊緣
        .png()
        .toBuffer();

    // 建立透明畫布並以偏移量合成陰影
    await sharp({
        create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
        .png()
        .composite([{ input: shadowBody, top: offsetPx, left: offsetPx, blend: 'over' }])
        .toFile(outputPath);
}

// ─── DB 整合：建立 magic_layer 記錄 ─────────────────────────────────────────

/**
 * 從 no_bg 圖層路徑生成指定類型的圖層，並寫入 magic_layers 表。
 *
 * @param db         Better-SQLite3 資料庫實例
 * @param assetId    資產 ID
 * @param projectId  專案 ID
 * @param noBgPath   no_bg 圖層的 public-relative 路徑（e.g. /output/proj/asset_no_bg.png）
 * @param layerType  'glow' | 'shadow'
 * @returns 建立的圖層物件，失敗時回傳 null
 */
export async function createSymbolLayer(
    db: Database.Database,
    assetId: string,
    projectId: string,
    noBgPath: string,
    layerType: SymbolLayerType
): Promise<{ id: string; layer_type: string; image_path: string } | null> {
    try {
        const inputAbsPath = toAbsPath(noBgPath);
        if (!fs.existsSync(inputAbsPath)) {
            console.warn(`[LayerGenerator] no_bg 圖層不存在，跳過 ${layerType}:`, inputAbsPath);
            return null;
        }

        const dir = outputDir(projectId);
        fs.mkdirSync(dir, { recursive: true });
        const outputAbsPath = path.join(dir, `${assetId}_${layerType}.png`);

        if (layerType === 'glow') {
            await generateGlowLayer(inputAbsPath, outputAbsPath);
        } else if (layerType === 'shadow') {
            await generateShadowLayer(inputAbsPath, outputAbsPath);
        }

        const layerImagePath = layerImageUrl(projectId, assetId, layerType);
        const layerId = upsertMagicLayer(db, assetId, layerType, layerImagePath);

        console.log(`[LayerGenerator] ✅ ${layerType} 圖層建立完成:`, layerImagePath);
        return { id: layerId, layer_type: layerType, image_path: layerImagePath };
    } catch (err) {
        console.error(`[LayerGenerator] ❌ 建立 ${layerType} 圖層失敗:`, err);
        return null;
    }
}

/**
 * VFX Layer Extractor
 * 從主圖或 no_bg 圖層中，透過 HSL 色彩分析提取出發光特效（冷色調：青/藍/紫/白光）
 *
 * 輸出格式：純 RGB PNG（無 alpha），背景強制為 #000000
 * 使用場景：Screen 疊加模式（黑色 = 透明不疊加，亮色 = 發光顯示）
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import type Database from 'better-sqlite3';
import { LayerType, upsertMagicLayer } from './db';
import { layerImageUrl, outputDir, toAbsPath } from './paths';

/** 將 RGB (0-255) 轉換為 HSL (H: 0-360, S: 0-1, L: 0-1) */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    const delta = max - min;

    if (delta === 0) return { h: 0, s: 0, l };

    const s = delta / (1 - Math.abs(2 * l - 1));

    let h = 0;
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;

    h = ((h * 60) + 360) % 360;
    return { h, s, l };
}

/**
 * 判斷像素是否為「特效像素」應保留
 *
 * 保留條件（以 Screen 混合模式設計）：
 *   1. 冷色調 (H: 150~310，青→藍→紫) + 足夠飽和 + 足夠亮度 → 閃電/能量光
 *   2. 極高亮度白光 (L > 0.80, S < 0.35) 且非暖色 → 閃光核心
 *
 * 移除條件：
 *   - 原圖幾乎透明 (a < 10)
 *   - 暖色調高飽和 (H: 15~85, S > 0.3) → 金色/黃色主體字
 *   - 低亮度 (L < 0.20) → 暗部/陰影/背景
 */
function isVfxPixel(h: number, s: number, l: number, originalAlpha: number): boolean {
    if (originalAlpha < 10) return false;

    const isCool = h >= 150 && h <= 310;
    const isWarm = h >= 15  && h <= 85;

    if (isWarm && s > 0.3) return false;
    if (l < 0.20) return false;
    if (isCool && s > 0.20 && l > 0.25) return true;
    if (l > 0.80 && s < 0.35 && !isWarm) return true;

    return false;
}

/**
 * 從指定圖片提取 VFX 層，輸出為純黑底 RGB PNG
 */
export async function extractVfxLayer(inputPath: string, outputPath: string): Promise<void> {
    const { data: vfxBuf, width, height } = await extractVfxBuffer(inputPath);
    await sharp(vfxBuf, { raw: { width, height, channels: 3 } })
        .blur(1.5)
        .png()
        .toFile(outputPath);
}

/**
 * 內部：提取 VFX 像素，回傳 3-channel RGB buffer 與尺寸（不寫檔）
 */
async function extractVfxBuffer(inputPath: string): Promise<{ data: Buffer; width: number; height: number }> {
    const { width, height } = await sharp(inputPath).metadata();
    if (!width || !height) throw new Error(`無法讀取圖片尺寸: ${inputPath}`);

    const { data } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const src = Buffer.from(data);
    const totalPixels = width * height;
    const dst = Buffer.alloc(totalPixels * 3, 0);

    for (let i = 0; i < totalPixels; i++) {
        const si = i * 4;
        const di = i * 3;
        const r = src[si], g = src[si + 1], b = src[si + 2], a = src[si + 3];
        const { h, s, l } = rgbToHsl(r, g, b);
        if (isVfxPixel(h, s, l, a)) {
            dst[di] = r; dst[di + 1] = g; dst[di + 2] = b;
        }
    }
    return { data: dst, width, height };
}

/**
 * 外部調用：直接提供 VFX 圖片路徑與人物去背路徑，執行分割
 */
export async function splitVfxFrontBack(
    vfxPath: string,
    noBgPath: string,
    outputFrontPath: string,
    outputBackPath: string
): Promise<void> {
    const { width, height } = await sharp(vfxPath).metadata();
    if (!width || !height) throw new Error('VFX 圖片尺寸無效');

    const { data: vfxData } = await sharp(vfxPath)
        .resize(width, height)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    await splitVfxByMask(
        Buffer.from(vfxData),
        noBgPath,
        width,
        height,
        outputFrontPath,
        outputBackPath,
        true
    );
}

/**
 * 依人物遮罩（no_bg alpha）將 VFX 分割為前景/後景特效層
 */
async function splitVfxByMask(
    vfxData: Buffer,
    noBgPath: string,
    width: number,
    height: number,
    outputFrontPath: string,
    outputBackPath: string,
    isRgba: boolean = false
): Promise<void> {
    const { data: maskData } = await sharp(noBgPath).resize(width, height).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const mask = Buffer.from(maskData);

    const frontDst = Buffer.alloc(width * height * 3, 0);
    const backDst  = Buffer.alloc(width * height * 3, 0);

    const channels = isRgba ? 4 : 3;

    for (let i = 0; i < width * height; i++) {
        const si = i * channels;
        const r = vfxData[si], g = vfxData[si + 1], b = vfxData[si + 2];
        if (r === 0 && g === 0 && b === 0) continue;

        const charAlpha = mask[i * 4 + 3];
        const di = i * 3;
        if (charAlpha > 50) {
            frontDst[di] = r; frontDst[di + 1] = g; frontDst[di + 2] = b;
        } else {
            backDst[di]  = r; backDst[di + 1]  = g; backDst[di + 2]  = b;
        }
    }

    await Promise.all([
        sharp(frontDst, { raw: { width, height, channels: 3 } }).blur(1.5).png().toFile(outputFrontPath),
        sharp(backDst,  { raw: { width, height, channels: 3 } }).blur(1.5).png().toFile(outputBackPath),
    ]);
}

/**
 * 提取 VFX 圖層並在 DB 中建立/替換記錄。
 * - 一律生成 vfx（完整特效）
 * - 若 no_bg 圖層存在，額外生成 vfx_front + vfx_back
 */
export async function createVfxLayer(
    db: Database.Database,
    assetId: string,
    projectId: string,
    imagePath: string
): Promise<{ id: string; layer_type: string; image_path: string }> {
    const noBgLayer = db.prepare(
        "SELECT image_path FROM magic_layers WHERE asset_id = ? AND layer_type = 'no_bg'"
    ).get(assetId) as { image_path: string } | undefined;

    const sourceRelPath = noBgLayer?.image_path ?? imagePath;
    const inputPath = toAbsPath(sourceRelPath);
    if (!fs.existsSync(inputPath)) throw new Error(`輸入圖片不存在 (path: ${sourceRelPath})`);

    const dir = outputDir(projectId);
    fs.mkdirSync(dir, { recursive: true });

    const { data: vfxBuf, width, height } = await extractVfxBuffer(inputPath);
    const vfxFilename = `${assetId}_vfx.png`;
    const vfxAbsPath  = path.join(dir, vfxFilename);
    await sharp(vfxBuf, { raw: { width, height, channels: 3 } }).blur(1.5).png().toFile(vfxAbsPath);

    const vfxImagePath = layerImageUrl(projectId, assetId, LayerType.VFX);
    const layerId = upsertMagicLayer(db, assetId, LayerType.VFX, vfxImagePath);

    if (noBgLayer) {
        try {
            await _splitAndUpsert(db, assetId, projectId, vfxBuf, noBgLayer.image_path, width, height);
            console.log('[extractVfx] ✅ 前/後景特效分割完成');
        } catch (err) {
            console.warn('[extractVfx] 前/後景分割失敗（不影響主流程）:', err);
        }
    }

    return { id: layerId, layer_type: LayerType.VFX, image_path: vfxImagePath };
}

/**
 * 重新執行前/後景拆分並更新 DB。
 * 在 generate-base 或 remove-bg 後，當已有 vfx 圖層時呼叫。
 *
 * @param db
 * @param assetId
 * @param projectId
 * @param vfxAbsPath  vfx 圖層的絕對路徑
 * @param noBgAbsPath no_bg 圖層的絕對路徑
 */
export async function resplitVfxFrontBack(
    db: Database.Database,
    assetId: string,
    projectId: string,
    vfxAbsPath: string,
    noBgAbsPath: string
): Promise<void> {
    const dir = outputDir(projectId);
    fs.mkdirSync(dir, { recursive: true });

    const frontAbs = path.join(dir, `${assetId}_vfx_front.png`);
    const backAbs  = path.join(dir, `${assetId}_vfx_back.png`);
    await splitVfxFrontBack(vfxAbsPath, noBgAbsPath, frontAbs, backAbs);

    upsertMagicLayer(db, assetId, LayerType.VFX_FRONT, layerImageUrl(projectId, assetId, LayerType.VFX_FRONT));
    upsertMagicLayer(db, assetId, LayerType.VFX_BACK,  layerImageUrl(projectId, assetId, LayerType.VFX_BACK));
}

// ─── 內部：分割 vfx buffer 並更新 DB ───────────────────────────────────────
async function _splitAndUpsert(
    db: Database.Database,
    assetId: string,
    projectId: string,
    vfxBuf: Buffer,
    noBgRelPath: string,
    width: number,
    height: number
): Promise<void> {
    const dir = outputDir(projectId);
    const noBgAbsPath = toAbsPath(noBgRelPath);
    const frontAbs = path.join(dir, `${assetId}_vfx_front.png`);
    const backAbs  = path.join(dir, `${assetId}_vfx_back.png`);

    await splitVfxByMask(vfxBuf, noBgAbsPath, width, height, frontAbs, backAbs);

    upsertMagicLayer(db, assetId, LayerType.VFX_FRONT, layerImageUrl(projectId, assetId, LayerType.VFX_FRONT));
    upsertMagicLayer(db, assetId, LayerType.VFX_BACK,  layerImageUrl(projectId, assetId, LayerType.VFX_BACK));
}

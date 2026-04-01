/**
 * Background removal utility
 *
 * 主力演算法：BFS（去白色背景） + RMBG（去陰影殘留） + VFX 移除
 * ──────────────────────────────────────────────────────────────
 * 1. BFS 從四角出發，去掉與角落同色的背景（白色 → 透明）
 *    → 深色斗篷（≠白色）不受影響，能正確保留
 * 2. BFS=前景 且 RMBG=背景 的衝突像素：
 *    → 亮度 < 120：暗色像素（深色斗篷）→ 保留
 *    → 亮度 ≥ 120：亮色像素（地面陰影/白邊殘留）→ 刪除
 * 3. VFX 像素移除：對前景像素做 HSL 分析
 *    → 高亮度、高飽和、冷色系（藍綠色焰）→ 設為透明，留給 vfx 層
 *    → 但需要保留「身體本身有的藍色盔甲」→ 用亮度 + 飽和度雙重把關
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import type Database from 'better-sqlite3';
import { LayerType, upsertMagicLayer } from './db';
import { layerImageUrl, outputDir, toAbsPath } from './paths';

export const AUTO_REMOVE_BG_TYPES = new Set([
    'character', 'high', 'medium', 'royal', 'special', 'button', 'title'
]);

// ── RMBG-1.4 模型單例 ───────────────────────────────────────────────────────
let _rmbgModel: unknown = null;
let _rmbgProcessor: unknown = null;
let _rmbgLoading: Promise<void> | null = null;

async function loadRmbgModel(): Promise<{ model: unknown; processor: unknown }> {
    if (_rmbgModel && _rmbgProcessor) return { model: _rmbgModel, processor: _rmbgProcessor };
    if (!_rmbgLoading) {
        _rmbgLoading = (async () => {
            console.log('[RMBG] 載入 BRIA RMBG-1.4 模型（首次需下載 ~176MB）...');
            const { AutoModel, AutoProcessor, env } = await import('@huggingface/transformers');
            env.cacheDir = path.join(process.cwd(), '.hf-cache');
            _rmbgProcessor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
                config: {
                    do_normalize: true, do_pad: false, do_rescale: true, do_resize: true,
                    image_mean: [0.5, 0.5, 0.5], feature_extractor_type: 'ImageFeatureExtractor',
                    image_std: [1, 1, 1], resample: 2,
                    rescale_factor: 0.00392156862745098, size: { width: 1024, height: 1024 },
                },
            });
            _rmbgModel = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
                // @ts-expect-error: custom model_type
                config: { model_type: 'custom' },
            });
            console.log('[RMBG] ✅ 模型載入完成');
        })();
    }
    await _rmbgLoading;
    return { model: _rmbgModel!, processor: _rmbgProcessor! };
}

// ── RGB → HSL 轉換 ────────────────────────────────────────────────────────────
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rf = r / 255, gf = g / 255, bf = b / 255;
    const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === rf) h = ((gf - bf) / d + (gf < bf ? 6 : 0)) / 6;
    else if (max === gf) h = ((bf - rf) / d + 2) / 6;
    else h = ((rf - gf) / d + 4) / 6;
    return { h: h * 360, s, l };
}

// ── 判斷是否為 VFX 特效像素（火焰/光暈） ────────────────────────────────────────
// 標準：冷色系（H:150-310）+ 高飽和（S>0.55）+ 高亮度（L>0.55）
// 這樣的像素才是半透明發光特效，不是實體盔甲
function isVfxPixel(r: number, g: number, b: number): boolean {
    const { h, s, l } = rgbToHsl(r, g, b);
    const isCoolHue = (h >= 150 && h <= 310);
    return isCoolHue && s > 0.55 && l > 0.55;
}

// ── 取得 RMBG-1.4 alpha 遮罩 ─────────────────────────────────────────────────
async function getRmbgAlphaMask(inputPath: string, width: number, height: number): Promise<Uint8Array> {
    const { RawImage } = await import('@huggingface/transformers');
    const { model, processor } = await loadRmbgModel();
    const image = await (RawImage as { read: (p: string) => Promise<{ width: number; height: number }> }).read(inputPath);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { pixel_values } = await (processor as any)(image);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { output } = await (model as any)({ input: pixel_values });
    const maskRaw = await (RawImage as unknown as {
        fromTensor: (t: unknown) => { resize: (w: number, h: number) => Promise<{ data: Uint8ClampedArray }> }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).fromTensor((output[0] as any).mul(255).to('uint8')).resize(width, height);
    return new Uint8Array(maskRaw.data);
}

// ── 主力：BFS + RMBG + VFX 移除 ──────────────────────────────────────────────
async function removeBackgroundEnhanced(inputPath: string, outputPath: string): Promise<void> {
    const { data: origData, info } = await sharp(inputPath)
        .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height;
    const src = Buffer.from(origData);

    // ── Step 1: BFS 從角落擴散（白色背景識別） ─────────────────────────────
    function getPx(x: number, y: number) {
        const i = (y * w + x) * 4;
        return { r: src[i], g: src[i + 1], b: src[i + 2] };
    }
    function colorDist(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
        return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
    }
    const corners = [getPx(0, 0), getPx(w - 1, 0), getPx(0, h - 1), getPx(w - 1, h - 1)];
    const bgColor = {
        r: Math.round(corners.reduce((s, c) => s + c.r, 0) / 4),
        g: Math.round(corners.reduce((s, c) => s + c.g, 0) / 4),
        b: Math.round(corners.reduce((s, c) => s + c.b, 0) / 4),
    };
    const BFS_TOL = 45;
    const bfsIsBg = new Uint8Array(w * h);
    const visited = new Uint8Array(w * h);
    const queue: number[] = [];

    function seedBfs(idx: number) {
        if (!visited[idx] && colorDist(getPx(idx % w, Math.floor(idx / w)), bgColor) < BFS_TOL) {
            visited[idx] = 1; bfsIsBg[idx] = 1; queue.push(idx);
        }
    }
    for (let x = 0; x < w; x++) { seedBfs(x); seedBfs((h - 1) * w + x); }
    for (let y = 1; y < h - 1; y++) { seedBfs(y * w); seedBfs(y * w + w - 1); }

    let head = 0;
    while (head < queue.length) {
        const idx = queue[head++];
        const x = idx % w, y = Math.floor(idx / w);
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const nIdx = ny * w + nx;
            if (visited[nIdx]) continue;
            visited[nIdx] = 1;
            if (colorDist(getPx(nx, ny), bgColor) < BFS_TOL) { bfsIsBg[nIdx] = 1; queue.push(nIdx); }
        }
    }

    // ── Step 2: RMBG 推理 ──────────────────────────────────────────────────
    const rmbgMask = await getRmbgAlphaMask(inputPath, w, h);
    const RMBG_THRESH = 30;

    // ── Step 3: 合成最終 alpha ────────────────────────────────────────────
    const buf = Buffer.from(origData);
    for (let i = 0; i < w * h; i++) {
        const r = src[i * 4], g = src[i * 4 + 1], b = src[i * 4 + 2];
        const bfsFg = !bfsIsBg[i];               // BFS 認為是前景
        const rmbgFg = rmbgMask[i] >= RMBG_THRESH; // RMBG 認為是前景

        if (!bfsFg) {
            // BFS 確認是背景（白色，與角落同色）→ 透明
            buf[i * 4 + 3] = 0;
        } else if (rmbgFg) {
            // 兩者都說前景 → 保留（但移除 VFX 像素）
            if (isVfxPixel(r, g, b)) {
                buf[i * 4 + 3] = 0;  // 高亮火焰/光暈 → 透明（留給 vfx 層）
            } else {
                buf[i * 4 + 3] = 255; // 實體主體 → 完全不透明
            }
        } else {
            // BFS=前景 但 RMBG=背景（衝突）→ 用亮度判斷
            // 暗色像素（深色斗篷/裝甲）→ 保留；亮色像素（地面陰影）→ 刪除
            const brightness = (r + g + b) / 3;
            buf[i * 4 + 3] = brightness < 120 ? 255 : 0;
        }
    }

    await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(outputPath);
}

// ── 備援：純 BFS ─────────────────────────────────────────────────────────────
async function removeBackgroundFloodFill(inputPath: string, outputPath: string): Promise<void> {
    const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    const buf = Buffer.from(data);
    function px(x: number, y: number) { const i = (y * width + x) * 4; return { r: buf[i], g: buf[i + 1], b: buf[i + 2] }; }
    function dist(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
        return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
    }
    const corners = [px(0, 0), px(width - 1, 0), px(0, height - 1), px(width - 1, height - 1)];
    const bgColor = {
        r: Math.round(corners.reduce((s, c) => s + c.r, 0) / 4),
        g: Math.round(corners.reduce((s, c) => s + c.g, 0) / 4),
        b: Math.round(corners.reduce((s, c) => s + c.b, 0) / 4),
    };
    const FILL_TOL = 45, EDGE_TOL = 70;
    const visited = new Uint8Array(width * height);
    const isBg = new Uint8Array(width * height);
    const seeds = [0, width - 1, (height - 1) * width, (height - 1) * width + width - 1];
    seeds.forEach(i => { visited[i] = 1; isBg[i] = 1; });
    const queue: number[] = [...seeds];
    let head = 0;
    while (head < queue.length) {
        const idx = queue[head++];
        const x = idx % width, y = Math.floor(idx / width);
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const nIdx = ny * width + nx;
            if (visited[nIdx]) continue;
            visited[nIdx] = 1;
            if (dist(px(nx, ny), bgColor) < FILL_TOL) { isBg[nIdx] = 1; queue.push(nIdx); }
        }
    }
    for (let i = 0; i < width * height; i++) {
        if (isBg[i]) { buf[i * 4 + 3] = 0; }
        else {
            const d = dist(px(i % width, Math.floor(i / width)), bgColor);
            if (d < EDGE_TOL) buf[i * 4 + 3] = Math.round((d / EDGE_TOL) * 255);
        }
    }
    await sharp(buf, { raw: { width, height, channels: 4 } }).png().toFile(outputPath);
}

// ── 備援 2：亮度閾值 ──────────────────────────────────────────────────────────
export async function removeWhiteBackground(inputPath: string, outputPath: string): Promise<void> {
    const { width, height } = await sharp(inputPath).metadata();
    if (!width || !height) throw new Error(`無法讀取圖片尺寸: ${inputPath}`);
    const { data } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const buf = Buffer.from(data);
    for (let i = 0; i < width * height * 4; i += 4) {
        const r = buf[i], g = buf[i + 1], b = buf[i + 2];
        const brightness = r * 0.299 + g * 0.587 + b * 0.114;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (brightness > 240 && sat < 20) buf[i + 3] = 0;
        else if (brightness > 210 && sat < 45) buf[i + 3] = Math.max(0, 255 - Math.round(((brightness - 210) / 30) * 255));
        else if (brightness < 15 && sat < 20) buf[i + 3] = 0;
        else if (brightness < 45 && sat < 30) buf[i + 3] = Math.max(0, Math.round((brightness / 45) * 255));
    }
    await sharp(buf, { raw: { width, height, channels: 4 } }).png().toFile(outputPath);
}

// ── 主函式 ────────────────────────────────────────────────────────────────────
export async function createNoBgLayer(
    db: Database.Database,
    assetId: string,
    projectId: string,
    imagePath: string
): Promise<{ id: string; layer_type: string; image_path: string }> {
    const inputPath = toAbsPath(imagePath);
    if (!fs.existsSync(inputPath)) throw new Error(`圖片檔案不存在 (path: ${imagePath})`);

    const dir = outputDir(projectId);
    fs.mkdirSync(dir, { recursive: true });
    const outputPath = path.join(dir, `${assetId}_no_bg.png`);

    let success = false;

    try {
        await removeBackgroundEnhanced(inputPath, outputPath);
        console.log('[createNoBgLayer] ✅ BFS+RMBG+VFX 去背成功');
        success = true;
    } catch (e1) {
        console.warn('[createNoBgLayer] ⚠️ 主力去背失敗，改用純 BFS:', e1 instanceof Error ? e1.message : e1);
    }

    if (!success) {
        try {
            await removeBackgroundFloodFill(inputPath, outputPath);
            console.log('[createNoBgLayer] ✅ 純 BFS 去背成功');
            success = true;
        } catch (e2) {
            console.warn('[createNoBgLayer] ⚠️ BFS 失敗，使用亮度閾值:', e2 instanceof Error ? e2.message : e2);
        }
    }

    if (!success) {
        await removeWhiteBackground(inputPath, outputPath);
        console.log('[createNoBgLayer] ✅ 亮度閾值去背成功（最後備援）');
    }

    const noBgImagePath = layerImageUrl(projectId, assetId, LayerType.NO_BG);
    const layerId = upsertMagicLayer(db, assetId, LayerType.NO_BG, noBgImagePath);
    return { id: layerId, layer_type: LayerType.NO_BG, image_path: noBgImagePath };
}

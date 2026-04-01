import { NextRequest, NextResponse } from 'next/server';
import { getDb, LayerType, upsertMagicLayer } from '@/lib/db';
import { generateImage } from '@/lib/generator';
import { resplitVfxFrontBack } from '@/lib/extractVfx';
import { outputDir, layerImageUrl, toAbsPath } from '@/lib/paths';
import fs from 'fs';
import path from 'path';

// 特效通道強制規範：純黑底、純特效、無主體物
const VFX_FORCED_PREFIX = 'Visual effects only on PURE BLACK BACKGROUND. Particle effects, glowing magic, energy aura, sparkles, light trails, floating orbs. ';
const VFX_FORCED_SUFFIX = ' PURE BLACK BACKGROUND. NO character body. NO physical objects. NO main subject. Only light and particle effects floating in black void.';
const VFX_NEGATIVE = 'white background, gray background, colored solid background, character, figure, object body, face, main subject, solid shape, horizon';

// POST /api/assets/[id]/generate-vfx
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: assetId } = await params;
    const db = getDb();

    try {
        const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as Record<string, string> | undefined;
        if (!asset) return NextResponse.json({ error: '資產不存在' }, { status: 404 });

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(asset.project_id) as Record<string, string> | undefined;
        if (!project) return NextResponse.json({ error: '所屬專案不存在' }, { status: 404 });

        const vfxInput = (asset.vfx_prompt || asset.prompt || asset.name).trim();
        const styleContext = project.style_analysis || project.style_guide || 'AAA Casino 3D Style';

        const prompt = [
            '[CRITICAL: PURE BLACK BACKGROUND. VFX EFFECTS ONLY. NO SUBJECTS.]',
            VFX_FORCED_PREFIX,
            `Effects inspired by: ${vfxInput}. Theme: ${project.theme}.`,
            `Style reference: ${styleContext}.`,
            VFX_FORCED_SUFFIX,
            'Ultra-AAA quality, 8k resolution, maximum detail on light effects.',
        ].join(' ');

        console.log('[generate-vfx] Calling Imagen API, prompt length:', prompt.length);
        const imageBuffer = await generateImage({ prompt, negativePrompt: VFX_NEGATIVE, aspectRatio: '1:1' });

        const dir = outputDir(asset.project_id);
        fs.mkdirSync(dir, { recursive: true });
        const vfxFilePath = path.join(dir, `${assetId}_vfx.png`);
        fs.writeFileSync(vfxFilePath, imageBuffer);

        const vfxImagePath = layerImageUrl(asset.project_id, assetId, LayerType.VFX);
        // 清除舊版命名殘留
        db.prepare("DELETE FROM magic_layers WHERE asset_id = ? AND layer_type = 'vfx_composite'").run(assetId);
        upsertMagicLayer(db, assetId, LayerType.VFX, vfxImagePath);
        console.log('[generate-vfx] ✅ VFX 圖層已儲存:', vfxImagePath);

        // 若 no_bg 存在，自動拆分前/後景
        const noBgLayer = db.prepare(
            "SELECT image_path FROM magic_layers WHERE asset_id = ? AND layer_type = ?"
        ).get(assetId, LayerType.NO_BG) as { image_path: string } | undefined;

        if (noBgLayer) {
            const noBgAbsPath = toAbsPath(noBgLayer.image_path);
            if (fs.existsSync(noBgAbsPath)) {
                try {
                    await resplitVfxFrontBack(db, assetId, asset.project_id, vfxFilePath, noBgAbsPath);
                    console.log('[generate-vfx] ✅ 前/後景特效拆分完成');
                } catch (err) {
                    console.warn('[generate-vfx] 前/後景拆分失敗（不影響主流程）:', err);
                }
            }
        }

        const updatedAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as Record<string, unknown>;
        const magicLayers = db.prepare('SELECT id, layer_type, image_path FROM magic_layers WHERE asset_id = ?').all(assetId);
        return NextResponse.json({ ...updatedAsset, magic_layers: magicLayers });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[generate-vfx Error]:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

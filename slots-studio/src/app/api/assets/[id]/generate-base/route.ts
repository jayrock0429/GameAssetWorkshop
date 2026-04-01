import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildPrompt, generateImage, logToSheets } from '@/lib/generator';
import { createNoBgLayer } from '@/lib/removeBackground';
import { resplitVfxFrontBack } from '@/lib/extractVfx';
import { LayerType } from '@/lib/db';
import { outputDir, assetImageUrl, toAbsPath } from '@/lib/paths';
import fs from 'fs';
import path from 'path';

// 強制主體通道規範：白底/透明底、無特效、乾淨主體
const BASE_FORCED_NEGATIVE = 'special effects, glow effects, particles, energy aura, sparkles, light trails, VFX, colored background, complex background';

// POST /api/assets/[id]/generate-base
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: assetId } = await params;
    const db = getDb();

    try {
        const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as Record<string, string> | undefined;
        if (!asset) return NextResponse.json({ error: '資產不存在' }, { status: 404 });

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(asset.project_id) as Record<string, string> | undefined;
        if (!project) return NextResponse.json({ error: '所屬專案不存在' }, { status: 404 });

        db.prepare("UPDATE assets SET status = 'generating', updated_at = datetime('now') WHERE id = ?").run(assetId);

        const aspectRatio =
            asset.element_type === 'bg'    ? '16:9' :
            asset.element_type === 'frame' ? '16:9' : '1:1';

        const baseSubjectInput = (asset.base_prompt || asset.prompt || asset.name).trim();
        const elementPromptWithConstraint = `${baseSubjectInput}, white or transparent background, no special effects, clean isolated subject`;

        const { prompt, negativePrompt } = buildPrompt({
            elementType: asset.element_type,
            valueTier: asset.value_tier,
            elementPrompt: elementPromptWithConstraint,
            styleGuide: project.style_guide,
            theme: project.theme,
            styleAnalysis: project.style_analysis || '',
        });

        const finalNegativePrompt = negativePrompt + ', ' + BASE_FORCED_NEGATIVE;

        console.log('[generate-base] Calling Imagen API, prompt length:', prompt.length);
        const imageBuffer = await generateImage({ prompt, negativePrompt: finalNegativePrompt, aspectRatio });

        const dir = outputDir(asset.project_id);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${assetId}.png`), imageBuffer);
        const imagePath = assetImageUrl(asset.project_id, assetId);

        const coverCheck = db.prepare('SELECT cover_image FROM projects WHERE id = ?').get(asset.project_id) as { cover_image: string } | undefined;
        if (!coverCheck?.cover_image) {
            db.prepare("UPDATE projects SET cover_image = ?, updated_at = datetime('now') WHERE id = ?").run(imagePath, asset.project_id);
        }

        db.prepare("UPDATE assets SET image_path = ?, status = 'done', updated_at = datetime('now') WHERE id = ?").run(imagePath, assetId);

        // 自動去背
        console.log('[generate-base] Auto-removing background for composite...');
        const layer = await createNoBgLayer(db, assetId, asset.project_id, imagePath).catch(err => {
            console.warn('[generate-base] 自動去背失敗（不影響主流程）:', err);
            return null;
        });

        // 若已有 vfx 且去背成功，重新執行前/後景拆分
        if (layer) {
            const vfxLayer = db.prepare(
                "SELECT image_path FROM magic_layers WHERE asset_id = ? AND layer_type = ?"
            ).get(assetId, LayerType.VFX) as { image_path: string } | undefined;

            if (vfxLayer) {
                console.log('[generate-base] 偵測到 vfx 圖層，重新執行前/後景拆分...');
                try {
                    await resplitVfxFrontBack(
                        db, assetId, asset.project_id,
                        toAbsPath(vfxLayer.image_path),
                        toAbsPath(layer.image_path)
                    );
                    console.log('[generate-base] ✅ 前/後景特效拆分完成');
                } catch (err) {
                    console.warn('[generate-base] 前/後景拆分失敗:', err);
                }
            }
        }

        await logToSheets({
            asset_id: assetId,
            asset_name: asset.name,
            project_name: project.name,
            element_type: asset.element_type,
            status: 'success',
            prompt: prompt.slice(0, 300),
            source: 'generate-base (composite channel)',
        });

        const updatedAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as Record<string, unknown>;
        const magicLayers = db.prepare('SELECT id, layer_type, image_path FROM magic_layers WHERE asset_id = ?').all(assetId);
        return NextResponse.json({ ...updatedAsset, magic_layers: magicLayers });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[generate-base Error]:', msg);
        db.prepare("UPDATE assets SET status = 'failed', updated_at = datetime('now') WHERE id = ?").run(assetId);

        // 失敗也記錄到 Sheets
        const failedAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as Record<string, string> | undefined;
        const failedProject = failedAsset
            ? db.prepare('SELECT name FROM projects WHERE id = ?').get(failedAsset.project_id) as Record<string, string> | undefined
            : undefined;
        await logToSheets({
            asset_id: assetId,
            asset_name: failedAsset?.name || assetId,
            project_name: failedProject?.name || '未知專案',
            element_type: failedAsset?.element_type || 'unknown',
            status: 'failed',
            source: 'generate-base (composite channel)',
        });

        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

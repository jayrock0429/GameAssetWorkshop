import { NextRequest, NextResponse } from 'next/server';
import { getDb, LayerType } from '@/lib/db';
import { createNoBgLayer } from '@/lib/removeBackground';
import { resplitVfxFrontBack } from '@/lib/extractVfx';
import { toAbsPath } from '@/lib/paths';
import fs from 'fs';

// POST /api/assets/[id]/remove-bg
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: assetId } = await params;
    const db = getDb();

    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as Record<string, string> | undefined;
    if (!asset) return NextResponse.json({ error: '資產不存在' }, { status: 404 });
    if (!asset.image_path) return NextResponse.json({ error: '資產尚未生成圖片，請先生成主圖' }, { status: 400 });

    try {
        console.log('[remove-bg] 開始去背處理:', { assetId, project_id: asset.project_id, image_path: asset.image_path });
        const layer = await createNoBgLayer(db, assetId, asset.project_id, asset.image_path);
        console.log('[remove-bg] ✅ no_bg 圖層已建立:', layer.image_path);

        // 若已有 vfx 圖層，自動重新執行前/後景拆分
        const vfxLayer = db.prepare(
            "SELECT image_path FROM magic_layers WHERE asset_id = ? AND layer_type = ?"
        ).get(assetId, LayerType.VFX) as { image_path: string } | undefined;

        if (vfxLayer) {
            const vfxAbsPath = toAbsPath(vfxLayer.image_path);
            const noBgAbsPath = toAbsPath(layer.image_path);
            if (fs.existsSync(vfxAbsPath) && fs.existsSync(noBgAbsPath)) {
                console.log('[remove-bg] 偵測到 vfx 圖層，重新執行前/後景拆分...');
                try {
                    await resplitVfxFrontBack(db, assetId, asset.project_id, vfxAbsPath, noBgAbsPath);
                    console.log('[remove-bg] ✅ 前/後景特效拆分完成');
                } catch (err) {
                    console.warn('[remove-bg] 前/後景拆分失敗（不影響去背主流程）:', err);
                }
            }
        }

        // 加入時間戳到 image_path，強制瀏覽器重新載入（防止快取舊圖）
        const bustPath = layer.image_path.split('?')[0] + `?t=${Date.now()}`;
        db.prepare('UPDATE magic_layers SET image_path = ? WHERE id = ?').run(bustPath, layer.id);

        const savedLayer = db.prepare('SELECT * FROM magic_layers WHERE id = ?').get(layer.id);
        return NextResponse.json(savedLayer);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[remove-bg] ❌ 去背失敗:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

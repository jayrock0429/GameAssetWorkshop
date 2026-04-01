import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createVfxLayer } from '@/lib/extractVfx';

// POST /api/assets/[id]/extract-vfx - 分離特效圖層（冷色調發光特效）
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: assetId } = await params;
    const db = getDb();

    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as Record<string, string> | undefined;
    if (!asset) return NextResponse.json({ error: '資產不存在' }, { status: 404 });
    if (!asset.image_path) return NextResponse.json({ error: '資產尚未生成圖片，請先生成主圖' }, { status: 400 });

    try {
        console.log('[extract-vfx] 開始特效分離:', { assetId, project_id: asset.project_id, image_path: asset.image_path });

        const layer = await createVfxLayer(db, assetId, asset.project_id, asset.image_path);

        console.log('[extract-vfx] ✅ VFX 圖層已生成:', layer.image_path);

        const savedLayer = db.prepare('SELECT * FROM magic_layers WHERE id = ?').get(layer.id);
        return NextResponse.json(savedLayer);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[extract-vfx] ❌ 特效分離失敗:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSymbolLayer, type SymbolLayerType } from '@/lib/layerGenerator';

const ALLOWED_LAYER_TYPES: SymbolLayerType[] = ['glow', 'shadow'];

// POST /api/assets/[id]/generate-layer
// Body: { layer_type: 'glow' | 'shadow' }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: assetId } = await params;
    const db = getDb();

    try {
        const body = await req.json();
        const layerType = body.layer_type as SymbolLayerType;

        if (!ALLOWED_LAYER_TYPES.includes(layerType)) {
            return NextResponse.json({ error: `不支援的圖層類型: ${layerType}` }, { status: 400 });
        }

        const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as Record<string, string> | undefined;
        if (!asset) return NextResponse.json({ error: '資產不存在' }, { status: 404 });

        // 需要先有 no_bg 圖層才能生成 glow / shadow
        const noBgLayer = db.prepare("SELECT image_path FROM magic_layers WHERE asset_id = ? AND layer_type = 'no_bg'").get(assetId) as { image_path: string } | undefined;
        if (!noBgLayer?.image_path) {
            return NextResponse.json({ error: '請先生成「去背」圖層（no_bg），再生成此圖層' }, { status: 422 });
        }

        const result = await createSymbolLayer(db, assetId, asset.project_id, noBgLayer.image_path, layerType);
        if (!result) {
            return NextResponse.json({ error: `${layerType} 圖層生成失敗` }, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[generate-layer API Error]:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { toAbsPath } from '@/lib/paths';
import fs from 'fs';

// 不允許刪除的圖層（主圖由 DELETE /api/assets/[id] 處理）
const NON_DELETABLE = new Set(['composite', 'main']);

// DELETE /api/assets/[id]/layers/[layerType]
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; layerType: string }> }
) {
    const { id: assetId, layerType } = await params;

    if (NON_DELETABLE.has(layerType)) {
        return NextResponse.json({ error: '此圖層不可刪除' }, { status: 400 });
    }

    const db = getDb();

    const layer = db.prepare(
        'SELECT * FROM magic_layers WHERE asset_id = ? AND layer_type = ?'
    ).get(assetId, layerType) as { id: string; image_path: string } | undefined;

    if (!layer) {
        return NextResponse.json({ error: '圖層不存在' }, { status: 404 });
    }

    // 刪除實體檔案（忽略錯誤，DB 記錄一定刪除）
    try {
        // image_path 可能帶有 ?t=xxx cache buster，去掉後再轉絕對路徑
        const cleanPath = layer.image_path.split('?')[0];
        const absPath = toAbsPath(cleanPath);
        if (fs.existsSync(absPath)) {
            fs.unlinkSync(absPath);
        }
    } catch (fileErr) {
        console.warn('[delete-layer] 刪除檔案失敗（不影響 DB 刪除）:', fileErr);
    }

    // 刪除 DB 記錄
    db.prepare('DELETE FROM magic_layers WHERE asset_id = ? AND layer_type = ?').run(assetId, layerType);

    return NextResponse.json({ success: true, deleted: layerType });
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/projects/[id]/reel-config - 讀取每捲軸的符號排列
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const db = getDb();

        const project = db.prepare('SELECT id, grid_cols FROM projects WHERE id = ?').get(projectId) as { id: string; grid_cols: number } | undefined;
        if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

        const reelRows = db.prepare(`
            SELECT reel_index, symbol_ids
            FROM reel_config
            WHERE project_id = ?
            ORDER BY reel_index ASC
        `).all(projectId) as Array<{ reel_index: number; symbol_ids: string }>;

        // 組裝：每個 reel 的 asset_ids 陣列，並 join assets 取得詳情
        const reels: Record<number, Array<{ asset_id: string; name: string; image_path: string; element_type: string }>> = {};

        for (const row of reelRows) {
            let assetIds: string[] = [];
            try { assetIds = JSON.parse(row.symbol_ids); } catch { assetIds = []; }

            const enriched = assetIds.map((assetId: string) => {
                const asset = db.prepare(
                    'SELECT id, name, image_path, element_type FROM assets WHERE id = ?'
                ).get(assetId) as { id: string; name: string; image_path: string; element_type: string } | undefined;

                return asset
                    ? { asset_id: asset.id, name: asset.name, image_path: asset.image_path, element_type: asset.element_type }
                    : { asset_id: assetId, name: '(已刪除)', image_path: '', element_type: '' };
            });

            reels[row.reel_index] = enriched;
        }

        return NextResponse.json({ reels });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// PUT /api/projects/[id]/reel-config - 儲存每捲軸的 asset_id 陣列
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const { reels } = await req.json() as { reels: Record<string, string[]> };

        if (!reels || typeof reels !== 'object') {
            return NextResponse.json({ error: 'reels 必須為物件 { [reelIndex]: string[] }' }, { status: 400 });
        }

        const db = getDb();

        const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
        if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

        const upsert = db.prepare(`
            INSERT INTO reel_config (id, project_id, reel_index, symbol_ids)
            VALUES (?, ?, ?, ?)
            ON CONFLICT DO NOTHING
        `);

        const update = db.prepare(`
            UPDATE reel_config SET symbol_ids = ? WHERE project_id = ? AND reel_index = ?
        `);

        const saveAll = db.transaction((reelMap: Record<string, string[]>) => {
            for (const [reelIndexStr, assetIds] of Object.entries(reelMap)) {
                const reelIndex = parseInt(reelIndexStr, 10);
                if (isNaN(reelIndex)) continue;

                const symbolJson = JSON.stringify(assetIds);

                // 嘗試 insert，若已存在則 update
                const existing = db.prepare(
                    'SELECT id FROM reel_config WHERE project_id = ? AND reel_index = ?'
                ).get(projectId, reelIndex) as { id: string } | undefined;

                if (existing) {
                    update.run(symbolJson, projectId, reelIndex);
                } else {
                    upsert.run(uuidv4(), projectId, reelIndex, symbolJson);
                }
            }
        });

        saveAll(reels);

        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

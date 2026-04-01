import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { compositeSlotScreen, resolveLayout } from '@/lib/composite';
import { toAbsPath } from '@/lib/paths';
import path from 'path';
import fs from 'fs';

// POST /api/projects/[id]/composite - 合成老虎機畫面並回傳圖片 URL
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const db = getDb();

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
        if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

        // 取得背景
        const bgAsset = db.prepare(
            "SELECT * FROM assets WHERE project_id = ? AND element_type = 'bg' AND status = 'done' LIMIT 1"
        ).get(projectId) as any;

        // 取得邊框
        const frameAsset = db.prepare(
            "SELECT * FROM assets WHERE project_id = ? AND element_type = 'frame' AND status = 'done' LIMIT 1"
        ).get(projectId) as any;

        // 取得所有符號（依 sort_order），優先使用去背版本
        const symbolAssets = db.prepare(`
            SELECT a.*, COALESCE(ml.image_path, a.image_path) AS display_path
            FROM assets a
            LEFT JOIN magic_layers ml ON ml.asset_id = a.id AND ml.layer_type = 'no_bg'
            WHERE a.project_id = ?
              AND a.element_type IN ('high', 'medium', 'special', 'royal', 'character')
              AND a.status = 'done'
            ORDER BY a.sort_order ASC
        `).all(projectId) as any[];

        const outputPath = path.join(process.cwd(), 'public', 'output', projectId, 'composite.png');

        await compositeSlotScreen({
            layout: resolveLayout(project.grid_cols || 5, project.grid_rows || 3),
            assets: {
                bgPath: bgAsset?.image_path ? toAbsPath(bgAsset.image_path) : undefined,
                framePath: frameAsset?.image_path ? toAbsPath(frameAsset.image_path) : undefined,
                symbolPaths: symbolAssets
                    .map((a: any) => toAbsPath(a.display_path))
                    .filter((p: string) => fs.existsSync(p)),
            },
            outputPath,
        });

        return NextResponse.json({
            imagePath: `/output/${projectId}/composite.png?t=${Date.now()}`,
            timestamp: new Date().toISOString(),
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

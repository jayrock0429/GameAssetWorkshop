import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/projects/[id]/assets - 取得專案所有資產
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = getDb();
        const assets = db.prepare(`
      SELECT a.*, 
        (SELECT json_group_array(json_object('id', ml.id, 'layer_type', ml.layer_type, 'image_path', ml.image_path))
         FROM magic_layers ml WHERE ml.asset_id = a.id) as magic_layers
      FROM assets a 
      WHERE a.project_id = ? 
      ORDER BY a.sort_order ASC, a.created_at ASC
    `).all(id);

        return NextResponse.json(assets.map(a => {
            const assetObj = a as Record<string, unknown>;
            return {
                ...assetObj,
                magic_layers: JSON.parse((assetObj.magic_layers as string) || '[]').filter((l: Record<string, string>) => l.id)
            };
        }));
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[API Error]:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// POST /api/projects/[id]/assets - 新增資產
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const body = await req.json();
        const { name, element_type, symbol_type = 'Custom', value_tier = 'Medium', prompt = '' } = body;

        if (!name || !element_type) {
            return NextResponse.json({ error: 'name 和 element_type 為必填' }, { status: 400 });
        }

        const db = getDb();
        const assetId = uuidv4();
        const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM assets WHERE project_id = ?').get(projectId) as { m: number | null } | undefined)?.m ?? -1;

        db.prepare(`
      INSERT INTO assets (id, project_id, name, element_type, symbol_type, value_tier, prompt, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(assetId, projectId, name, element_type, symbol_type, value_tier, prompt, maxOrder + 1);

        const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
        return NextResponse.json(asset, { status: 201 });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[API Error]:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

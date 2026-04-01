import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// PATCH /api/assets/[id] - 更新資產 prompt、名稱等
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const db = getDb();

        const fields = Object.keys(body).filter(k => ['name', 'prompt', 'base_prompt', 'vfx_prompt', 'element_type', 'symbol_type', 'value_tier', 'image_path', 'sort_order'].includes(k));
        if (fields.length === 0) return NextResponse.json({ error: '無有效欄位' }, { status: 400 });

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => body[f]);

        db.prepare(`UPDATE assets SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);

        const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
        return NextResponse.json(asset);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// DELETE /api/assets/[id] - 刪除資產
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = getDb();
        db.prepare('DELETE FROM assets WHERE id = ?').run(id);
        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

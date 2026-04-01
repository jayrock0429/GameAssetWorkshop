import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/projects/[id] - 取得單一專案
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = getDb();
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });
        return NextResponse.json(project);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// PATCH /api/projects/[id] - 更新專案
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const db = getDb();

        const fields = Object.keys(body).filter(k => ['name', 'theme', 'style_guide', 'style_model', 'style_analysis', 'grid_cols', 'grid_rows', 'cover_image'].includes(k));
        if (fields.length === 0) return NextResponse.json({ error: '無有效欄位' }, { status: 400 });

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => body[f]);

        db.prepare(`UPDATE projects SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        return NextResponse.json(project);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// DELETE /api/projects/[id] - 刪除專案
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = getDb();
        db.prepare('DELETE FROM projects WHERE id = ?').run(id);
        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

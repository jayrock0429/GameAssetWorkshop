import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/projects/[id]/paylines - 讀取所有彩金線
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const db = getDb();

        const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
        if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

        const paylines = db.prepare(`
            SELECT id, project_id, line_index, pattern, color, enabled
            FROM paylines
            WHERE project_id = ?
            ORDER BY line_index ASC
        `).all(projectId);

        return NextResponse.json({ paylines });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// POST /api/projects/[id]/paylines - 新增一條彩金線
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const { pattern, color } = await req.json() as { pattern: number[]; color?: string };

        if (!Array.isArray(pattern)) {
            return NextResponse.json({ error: 'pattern 必須為數字陣列' }, { status: 400 });
        }

        const db = getDb();

        const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
        if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

        // 自動計算下一個 line_index
        const maxRow = db.prepare(`
            SELECT COALESCE(MAX(line_index), -1) AS max_index
            FROM paylines WHERE project_id = ?
        `).get(projectId) as { max_index: number };

        const nextIndex = maxRow.max_index + 1;
        const id = uuidv4();

        db.prepare(`
            INSERT INTO paylines (id, project_id, line_index, pattern, color, enabled)
            VALUES (?, ?, ?, ?, ?, 1)
        `).run(id, projectId, nextIndex, JSON.stringify(pattern), color ?? '#ffffff');

        const payline = db.prepare('SELECT * FROM paylines WHERE id = ?').get(id);
        return NextResponse.json({ payline }, { status: 201 });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// DELETE /api/projects/[id]/paylines?line_id=xxx - 刪除指定彩金線
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const { searchParams } = new URL(req.url);
        const lineId = searchParams.get('line_id');

        if (!lineId) {
            return NextResponse.json({ error: '必須提供 line_id 查詢參數' }, { status: 400 });
        }

        const db = getDb();

        const existing = db.prepare(
            'SELECT id FROM paylines WHERE id = ? AND project_id = ?'
        ).get(lineId, projectId);

        if (!existing) {
            return NextResponse.json({ error: '彩金線不存在' }, { status: 404 });
        }

        db.prepare('DELETE FROM paylines WHERE id = ?').run(lineId);

        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

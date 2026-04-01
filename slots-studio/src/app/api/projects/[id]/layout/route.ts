import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/projects/[id]/layout - 讀取 layout_config JSON
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const db = getDb();

        const project = db.prepare(
            'SELECT id, layout_config FROM projects WHERE id = ?'
        ).get(projectId) as { id: string; layout_config: string } | undefined;

        if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

        let layoutConfig: Record<string, unknown> = {};
        try {
            layoutConfig = JSON.parse(project.layout_config || '{}');
        } catch {
            layoutConfig = {};
        }

        return NextResponse.json({ layout_config: layoutConfig });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// PUT /api/projects/[id]/layout - 更新 layout_config JSON
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const body = await req.json();

        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return NextResponse.json({ error: 'body 必須為物件' }, { status: 400 });
        }

        const db = getDb();

        const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
        if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

        const layoutJson = JSON.stringify(body);
        db.prepare(
            "UPDATE projects SET layout_config = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(layoutJson, projectId);

        return NextResponse.json({ layout_config: body });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

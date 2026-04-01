import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/projects/[id]/paytable - 讀取所有符號的賠付設定
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const db = getDb();

        const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
        if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

        const entries = db.prepare(`
            SELECT
                pt.id, pt.project_id, pt.asset_id,
                pt.pays_1, pt.pays_2, pt.pays_3, pt.pays_4, pt.pays_5,
                a.name AS asset_name,
                a.image_path AS asset_image_path,
                a.element_type,
                a.sort_order
            FROM paytable pt
            JOIN assets a ON a.id = pt.asset_id
            WHERE pt.project_id = ?
            ORDER BY a.sort_order ASC
        `).all(projectId);

        return NextResponse.json({ entries });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// PUT /api/projects/[id]/paytable - 批次 upsert 賠付設定
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const { entries } = await req.json() as {
            entries: Array<{
                asset_id: string;
                pays_1?: number;
                pays_2?: number;
                pays_3?: number;
                pays_4?: number;
                pays_5?: number;
            }>;
        };

        if (!Array.isArray(entries)) {
            return NextResponse.json({ error: 'entries 必須為陣列' }, { status: 400 });
        }

        const db = getDb();

        const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
        if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

        const upsert = db.prepare(`
            INSERT INTO paytable (id, project_id, asset_id, pays_1, pays_2, pays_3, pays_4, pays_5)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(project_id, asset_id) DO UPDATE SET
                pays_1 = excluded.pays_1,
                pays_2 = excluded.pays_2,
                pays_3 = excluded.pays_3,
                pays_4 = excluded.pays_4,
                pays_5 = excluded.pays_5
        `);

        const upsertMany = db.transaction((rows: typeof entries) => {
            for (const row of rows) {
                upsert.run(
                    uuidv4(),
                    projectId,
                    row.asset_id,
                    row.pays_1 ?? 0,
                    row.pays_2 ?? 0,
                    row.pays_3 ?? 1,
                    row.pays_4 ?? 3,
                    row.pays_5 ?? 5,
                );
            }
        });

        upsertMany(entries);

        const updated = db.prepare(`
            SELECT
                pt.id, pt.project_id, pt.asset_id,
                pt.pays_1, pt.pays_2, pt.pays_3, pt.pays_4, pt.pays_5,
                a.name AS asset_name,
                a.image_path AS asset_image_path,
                a.element_type,
                a.sort_order
            FROM paytable pt
            JOIN assets a ON a.id = pt.asset_id
            WHERE pt.project_id = ?
            ORDER BY a.sort_order ASC
        `).all(projectId);

        return NextResponse.json({ entries: updated });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

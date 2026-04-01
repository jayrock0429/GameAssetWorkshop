import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/projects - 取得所有專案
export async function GET() {
    try {
        const db = getDb();
        const projects = db.prepare(`
            SELECT p.*, COUNT(a.id) as asset_count 
            FROM projects p 
            LEFT JOIN assets a ON p.id = a.project_id 
            GROUP BY p.id 
            ORDER BY p.updated_at DESC
        `).all();
        return NextResponse.json(projects);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[API GET Error] /api/projects:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// POST /api/projects - 建立新專案
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, theme, style_guide = '', style_model = 'casino_slots_style', grid_cols = 5, grid_rows = 3 } = body;

        if (!name || !theme) {
            return NextResponse.json({ error: 'name 和 theme 為必填欄位' }, { status: 400 });
        }

        const cols = Number(grid_cols);
        const rows = Number(grid_rows);
        if (!Number.isInteger(cols) || cols < 1 || cols > 12) {
            return NextResponse.json({ error: 'grid_cols 必須為 1~12 的整數' }, { status: 400 });
        }
        if (!Number.isInteger(rows) || rows < 1 || rows > 8) {
            return NextResponse.json({ error: 'grid_rows 必須為 1~8 的整數' }, { status: 400 });
        }

        const db = getDb();
        const id = uuidv4();

        db.prepare(`
      INSERT INTO projects (id, name, theme, style_guide, style_model, grid_cols, grid_rows)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, theme, style_guide, style_model, cols, rows);

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        return NextResponse.json(project, { status: 201 });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

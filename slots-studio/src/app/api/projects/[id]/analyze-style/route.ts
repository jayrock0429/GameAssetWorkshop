import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { analyzeStyleFromImages } from '@/lib/generator';

// POST /api/projects/[id]/analyze-style
// Body: multipart/form-data, field name "images" (multiple files)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params;
    const db = getDb();

    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

    try {
        const formData = await req.formData();
        const files = formData.getAll('images') as File[];
        if (files.length === 0) {
            return NextResponse.json({ error: '請至少上傳一張範例圖' }, { status: 400 });
        }

        // 轉換成 base64
        const imagesBase64: string[] = [];
        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            imagesBase64.push(buffer.toString('base64'));
        }

        const styleAnalysis = await analyzeStyleFromImages(imagesBase64);

        // 存入 DB
        db.prepare("UPDATE projects SET style_analysis = ?, updated_at = datetime('now') WHERE id = ?")
            .run(styleAnalysis, projectId);

        return NextResponse.json({ style_analysis: styleAnalysis });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

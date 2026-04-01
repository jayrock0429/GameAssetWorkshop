import { NextRequest, NextResponse } from 'next/server';
import { parseBrief } from '@/lib/generator';

// POST /api/parse-brief - 解析文案 Brief 為資產清單
export async function POST(req: NextRequest) {
    try {
        const { briefText } = await req.json();
        if (!briefText) return NextResponse.json({ error: 'briefText 為必填' }, { status: 400 });

        const result = await parseBrief(briefText);
        return NextResponse.json(result);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { convertExcelToBrief } from '@/lib/generator';

// POST /api/parse-excel - 解析 Excel/CSV 文件並轉換為 Brief 格式
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        if (!file) return NextResponse.json({ error: '請上傳文件' }, { status: 400 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        // 將所有工作表轉換為 CSV 文字
        let tableContent = '';
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            if (csv.trim()) {
                tableContent += `=== 工作表: ${sheetName} ===\n${csv}\n\n`;
            }
        }

        if (!tableContent.trim()) {
            return NextResponse.json({ error: '試算表無法讀取內容，請確認文件格式' }, { status: 400 });
        }

        const briefText = await convertExcelToBrief(tableContent);
        return NextResponse.json({ briefText });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

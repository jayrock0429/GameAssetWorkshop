import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildPrompt, generateImage, logToSheets } from '@/lib/generator';
import { AUTO_REMOVE_BG_TYPES, createNoBgLayer } from '@/lib/removeBackground';
import path from 'path';
import fs from 'fs';

// POST /api/assets/[id]/generate - 觸發 AI 生成
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: assetId } = await params;
    console.log('[Generate API] Received POST request for asset:', assetId);
    const db = getDb();

    try {
        const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as Record<string, string> | undefined;
        console.log('[Generate API] Found asset:', asset ? asset.name : 'NOT FOUND');
        if (!asset) return NextResponse.json({ error: '資產不存在' }, { status: 404 });

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(asset.project_id) as Record<string, string> | undefined;
        console.log('[Generate API] Found project:', project ? project.name : 'NOT FOUND');
        if (!project) return NextResponse.json({ error: '所屬專案不存在' }, { status: 404 });

        // 更新狀態為生成中
        db.prepare("UPDATE assets SET status = 'generating', updated_at = datetime('now') WHERE id = ?").run(assetId);

        // 決定圖片比例
        const aspectRatio =
            asset.element_type === 'symbol' ? '1:1' :
            asset.element_type === 'bg' ? '16:9' :
            asset.element_type === 'frame' ? '16:9' : '1:1';

        // 注入「規格化」指令
        let extraStyle = "";
        if (asset.element_type === 'symbol') {
            extraStyle = ", high-end slot symbol, isolated on solid plain background, centered composition, ample space around object, professional product shot";
        } else if (asset.element_type === 'frame') {
            extraStyle = ", empty center, rectangular game frame border, luxury slot UI, cinematic lighting";
        } else if (asset.element_type === 'bg') {
            extraStyle = ", immersive environment, blurred details, cinematic depth of field, 8k resolution";
        }

        const { prompt, negativePrompt } = buildPrompt({
            elementType: asset.element_type,
            valueTier: asset.value_tier,
            elementPrompt: (asset.prompt || asset.name) + extraStyle,
            styleGuide: project.style_guide,
            theme: project.theme,
            styleAnalysis: project.style_analysis || '',
        });

        // 強化負向提示詞
        const finalNegativePrompt = negativePrompt + (asset.element_type === 'symbol' ? ", complex background, cluttered, text, watermark, cropped object, blurry edges" : "");

        // 呼叫 Imagen API
        console.log('[Generate API] Calling Imagen API with prompt length:', prompt.length);
        const imageBuffer = await generateImage({ prompt, negativePrompt: finalNegativePrompt, aspectRatio });
        console.log('[Generate API] Image buffer received, size:', imageBuffer.length);

        // 儲存圖片
        const outputDir = path.join(process.cwd(), 'public', 'output', asset.project_id);
        fs.mkdirSync(outputDir, { recursive: true });
        const filename = `${assetId}.png`;
        const filePath = path.join(outputDir, filename);
        console.log('[Generate API] Writing file to:', filePath);
        fs.writeFileSync(filePath, imageBuffer);

        const imagePath = `/output/${asset.project_id}/${filename}`;

        // 如果是第一個資產，設為專案封面
        const coverCheck = db.prepare('SELECT cover_image FROM projects WHERE id = ?').get(asset.project_id) as { cover_image: string } | undefined;
        if (!coverCheck?.cover_image) {
            db.prepare("UPDATE projects SET cover_image = ?, updated_at = datetime('now') WHERE id = ?").run(imagePath, asset.project_id);
        }

        // 更新資產
        db.prepare("UPDATE assets SET image_path = ?, status = 'done', updated_at = datetime('now') WHERE id = ?").run(imagePath, assetId);

        // 自動移除背景（針對符號類型；失敗不影響主流程）
        if (AUTO_REMOVE_BG_TYPES.has(asset.element_type)) {
            console.log('[Generate API] Auto-removing background for element_type:', asset.element_type);
            await createNoBgLayer(db, assetId, asset.project_id, imagePath)
                .catch(err => console.warn('[Generate API] 自動去背失敗（不影響主流程）:', err));
        }

        // ✅ 寫入 Google Sheets 追蹤記錄（成功）
        await logToSheets({
            asset_id: assetId,
            asset_name: asset.name,
            project_name: project.name,
            element_type: asset.element_type,
            status: 'success',
            prompt: prompt.slice(0, 300), // 截短避免超過 Sheets 欄位限制
        });

        const updatedAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as Record<string, unknown>;
        const magicLayers = db.prepare('SELECT id, layer_type, image_path FROM magic_layers WHERE asset_id = ?').all(assetId);
        return NextResponse.json({ ...updatedAsset, magic_layers: magicLayers });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Generate API Error]:', msg);
        db.prepare("UPDATE assets SET status = 'failed', updated_at = datetime('now') WHERE id = ?").run(assetId);

        // ❌ 寫入 Google Sheets 追蹤記錄（失敗）
        // 注意：此時 try 外部已無 asset/project 變數，需重新查詢
        const failedAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as Record<string, string> | undefined;
        const failedProject = failedAsset
            ? db.prepare('SELECT name FROM projects WHERE id = ?').get(failedAsset.project_id) as Record<string, string> | undefined
            : undefined;
        await logToSheets({
            asset_id: assetId,
            asset_name: failedAsset?.name || assetId,       // 可讀名稱，fallback 為 UUID
            project_name: failedProject?.name || '未知專案', // 主題名稱，fallback 有意義的字串
            element_type: failedAsset?.element_type || 'unknown',
            status: 'failed',
        });

        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

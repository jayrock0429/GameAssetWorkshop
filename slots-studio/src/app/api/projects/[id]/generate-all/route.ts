import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildPrompt, generateImage, logToSheets } from '@/lib/generator';
import { AUTO_REMOVE_BG_TYPES, createNoBgLayer } from '@/lib/removeBackground';
import { assetImageUrl, outputDir } from '@/lib/paths';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/projects/[id]/generate-all
 *
 * 批次生成專案內所有 pending 資產（狀態為 'pending' 或 'failed'）。
 * 使用 Body: { mode?: 'pending_only' | 'all' }
 *   - pending_only（預設）：只處理 pending 與 failed
 *   - all：重新生成全部資產（包含已完成）
 *
 * 回傳：每個資產的處理結果 { assetId, name, status, error? }
 * 執行時序：循序處理（避免並行超出 API Rate Limit）
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params;
    const db = getDb();

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Record<string, string> | undefined;
    if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const mode: 'pending_only' | 'all' = body.mode === 'all' ? 'all' : 'pending_only';

    const query = mode === 'all'
        ? "SELECT * FROM assets WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC"
        : "SELECT * FROM assets WHERE project_id = ? AND status IN ('pending', 'failed') ORDER BY sort_order ASC, created_at ASC";

    const assets = db.prepare(query).all(projectId) as Record<string, string>[];

    if (assets.length === 0) {
        return NextResponse.json({ message: '沒有需要生成的資產', results: [] });
    }

    console.log(`[generate-all] 開始批次生成，共 ${assets.length} 個資產，模式: ${mode}`);

    const results: Array<{ assetId: string; name: string; status: 'success' | 'failed'; error?: string }> = [];

    for (const asset of assets) {
        const assetId = asset.id;
        console.log(`[generate-all] 處理資產 ${assetId} (${asset.name})`);

        try {
            db.prepare("UPDATE assets SET status = 'generating', updated_at = datetime('now') WHERE id = ?").run(assetId);

            const aspectRatio =
                asset.element_type === 'bg'    ? '16:9' :
                asset.element_type === 'frame' ? '16:9' : '1:1';

            const { prompt, negativePrompt } = buildPrompt({
                elementType: asset.element_type,
                valueTier: asset.value_tier,
                elementPrompt: asset.prompt || asset.name,
                styleGuide: project.style_guide,
                theme: project.theme,
                styleAnalysis: project.style_analysis || '',
                styleDnaKey: project.style_model !== 'casino_slots_style' ? project.style_model : undefined,
            });

            const imageBuffer = await generateImage({ prompt, negativePrompt, aspectRatio });

            const dir = outputDir(projectId);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, `${assetId}.png`), imageBuffer);
            const imagePath = assetImageUrl(projectId, assetId);

            // 設定專案封面（第一個成功的資產）
            const coverCheck = db.prepare('SELECT cover_image FROM projects WHERE id = ?').get(projectId) as { cover_image: string } | undefined;
            if (!coverCheck?.cover_image) {
                db.prepare("UPDATE projects SET cover_image = ?, updated_at = datetime('now') WHERE id = ?").run(imagePath, projectId);
            }

            db.prepare("UPDATE assets SET image_path = ?, status = 'done', updated_at = datetime('now') WHERE id = ?").run(imagePath, assetId);

            // 自動去背
            if (AUTO_REMOVE_BG_TYPES.has(asset.element_type)) {
                await createNoBgLayer(db, assetId, projectId, imagePath).catch(err => {
                    console.warn(`[generate-all] 資產 ${assetId} 自動去背失敗:`, err);
                });
            }

            await logToSheets({
                asset_id: assetId,
                asset_name: asset.name,
                project_name: project.name,
                element_type: asset.element_type,
                status: 'success',
                prompt: prompt.slice(0, 300),
                source: 'generate-all (batch)',
            });

            results.push({ assetId, name: asset.name, status: 'success' });
            console.log(`[generate-all] ✅ ${asset.name} 完成`);

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[generate-all] ❌ ${asset.name} 失敗:`, msg);
            db.prepare("UPDATE assets SET status = 'failed', updated_at = datetime('now') WHERE id = ?").run(assetId);

            await logToSheets({
                asset_id: assetId,
                asset_name: asset.name,
                project_name: project.name,
                element_type: asset.element_type,
                status: 'failed',
                source: 'generate-all (batch)',
            });

            results.push({ assetId, name: asset.name, status: 'failed', error: msg });
        }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.filter(r => r.status === 'failed').length;

    console.log(`[generate-all] 批次完成：成功 ${successCount}，失敗 ${failCount}`);

    return NextResponse.json({
        message: `批次生成完成：${successCount} 成功，${failCount} 失敗`,
        total: results.length,
        successCount,
        failCount,
        results,
    });
}

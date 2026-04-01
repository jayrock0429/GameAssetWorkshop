import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';
import sharp from 'sharp';

// GET /api/projects/[id]/download - 打包下載資產
// query: type=zip|spritesheet, scale=1|2
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') ?? 'zip';          // 'zip' | 'spritesheet'
        const scale = parseInt(searchParams.get('scale') ?? '1', 10) || 1;

        const db = getDb();

        const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(projectId) as { name: string } | undefined;
        if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

        const assets = db.prepare("SELECT * FROM assets WHERE project_id = ? AND status = 'done'").all(projectId) as any[];

        if (assets.length === 0) {
            return NextResponse.json({ error: '沒有可下載的完成資產' }, { status: 400 });
        }

        // 收集有效的圖片路徑
        const validAssets = assets
            .filter(a => a.image_path)
            .map(a => {
                const cleanPath = a.image_path.startsWith('/') ? a.image_path.slice(1) : a.image_path;
                const filePath = path.join(process.cwd(), 'public', cleanPath);
                return { ...a, filePath };
            })
            .filter(a => fs.existsSync(a.filePath));

        if (validAssets.length === 0) {
            return NextResponse.json({ error: '沒有可用的圖片檔案' }, { status: 400 });
        }

        // ── Spritesheet 模式：垂直拼接所有完成資產圖片 ──────────────────────
        if (type === 'spritesheet') {
            // 讀取第一張圖決定基準尺寸
            const firstMeta = await sharp(validAssets[0].filePath).metadata();
            const baseW = Math.round((firstMeta.width ?? 512) * scale);
            const baseH = Math.round((firstMeta.height ?? 512) * scale);

            // 縮放所有圖片為相同尺寸 Buffer
            const buffers: Buffer[] = await Promise.all(
                validAssets.map(a =>
                    sharp(a.filePath)
                        .resize(baseW, baseH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        .png()
                        .toBuffer()
                )
            );

            const totalH = baseH * buffers.length;

            // 建立空白畫布並垂直拼接
            const composites = buffers.map((buf, idx) => ({
                input: buf,
                top: idx * baseH,
                left: 0,
            }));

            const spriteBuffer = await sharp({
                create: {
                    width: baseW,
                    height: totalH,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                },
            })
                .png()
                .composite(composites)
                .toBuffer();

            return new NextResponse(spriteBuffer as unknown as BodyInit, {
                status: 200,
                headers: {
                    'Content-Type': 'image/png',
                    'Content-Disposition': `attachment; filename="${encodeURIComponent(project.name)}_spritesheet@${scale}x.png"`,
                },
            });
        }

        // ── ZIP 模式（預設）────────────────────────────────────────────────
        const zip = new JSZip();
        const folder = zip.folder(project.name);

        for (const asset of validAssets) {
            const fileContent = fs.readFileSync(asset.filePath);
            const fileName = `${asset.element_type}_${asset.name}_${asset.id.slice(0, 8)}.png`;
            folder?.file(fileName, fileContent);
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        return new NextResponse(Buffer.from(zipBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(project.name)}.zip"`,
            },
        });

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

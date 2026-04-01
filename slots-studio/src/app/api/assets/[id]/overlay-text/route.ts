import { NextRequest, NextResponse } from 'next/server';
import { getDb, upsertMagicLayer } from '@/lib/db';
import { layerImageUrl, toAbsPath, outputDir } from '@/lib/paths';
import sharp from 'sharp';
import fs from 'fs';

interface OverlayStyle {
    color?: string;
    fontSize?: number;
    position?: 'top' | 'center' | 'bottom';
}

async function addTextOverlay(
    inputPath: string,
    outputPath: string,
    text: string,
    style: OverlayStyle
): Promise<void> {
    const { width, height } = await sharp(inputPath).metadata();
    const w = width || 512;
    const h = height || 512;
    const fontSize = style.fontSize || Math.round(w * 0.15);

    let y: number;
    if (style.position === 'top') {
        y = fontSize + 20;
    } else if (style.position === 'bottom') {
        y = h - 20;
    } else {
        y = Math.round(h / 2 + fontSize / 3);
    }

    const strokeWidth = Math.round(fontSize * 0.05);
    const color = style.color || '#FFD700';

    const svg = `<svg width="${w}" height="${h}">
    <text x="${w / 2}" y="${y}" text-anchor="middle"
      font-family="Arial Black, sans-serif" font-weight="900"
      font-size="${fontSize}" fill="${color}"
      stroke="#000" stroke-width="${strokeWidth}"
      paint-order="stroke fill">${text}</text>
  </svg>`;

    await sharp(inputPath)
        .composite([{ input: Buffer.from(svg), gravity: 'center' }])
        .png()
        .toFile(outputPath);
}

// POST /api/assets/[id]/overlay-text - 在圖片上疊加文字
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: assetId } = await params;
        const { text, style = {} } = await req.json() as { text: string; style?: OverlayStyle };

        if (!text || typeof text !== 'string' || text.trim() === '') {
            return NextResponse.json({ error: 'text 為必填' }, { status: 400 });
        }

        const db = getDb();

        const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as any;
        if (!asset) return NextResponse.json({ error: '資產不存在' }, { status: 404 });

        if (!asset.image_path) {
            return NextResponse.json({ error: '資產尚未有圖片' }, { status: 400 });
        }

        const inputPath = toAbsPath(asset.image_path);
        if (!fs.existsSync(inputPath)) {
            return NextResponse.json({ error: '原始圖片檔案不存在' }, { status: 400 });
        }

        // 確保輸出目錄存在
        const outDir = outputDir(asset.project_id);
        fs.mkdirSync(outDir, { recursive: true });

        const overlayImageUrl = layerImageUrl(asset.project_id, assetId, 'overlay');
        const outputPath = toAbsPath(overlayImageUrl);

        await addTextOverlay(inputPath, outputPath, text.trim(), style);

        // 儲存為新的 magic_layer
        upsertMagicLayer(db, assetId, 'overlay', overlayImageUrl);

        // 更新 asset 的 overlay_text 和 overlay_style
        db.prepare(
            "UPDATE assets SET overlay_text = ?, overlay_style = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(text.trim(), JSON.stringify(style), assetId);

        const updatedAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
        const overlayLayer = db.prepare(
            "SELECT * FROM magic_layers WHERE asset_id = ? AND layer_type = 'overlay'"
        ).get(assetId);

        return NextResponse.json({
            asset: updatedAsset,
            overlay_layer: overlayLayer,
            overlay_image_url: overlayImageUrl,
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

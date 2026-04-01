/**
 * lib/paths.ts — 統一輸出路徑管理
 *
 * 所有 /public/output 的路徑建構都從這裡來，避免各 route 各自硬編碼。
 */
import path from 'path';

/** public-relative 路徑（供前端與 DB 儲存）e.g. /output/proj-id/asset-id.png */
export function assetImageUrl(projectId: string, assetId: string): string {
    return `/output/${projectId}/${assetId}.png`;
}

/** public-relative 路徑 for magic layer e.g. /output/proj-id/asset-id_no_bg.png */
export function layerImageUrl(projectId: string, assetId: string, layerType: string): string {
    return `/output/${projectId}/${assetId}_${layerType}.png`;
}

/** 絕對路徑 — 輸出目錄 */
export function outputDir(projectId: string): string {
    return path.join(process.cwd(), 'public', 'output', projectId);
}

/** 絕對路徑 — 由 public-relative 路徑轉換 */
export function toAbsPath(publicRelPath: string): string {
    return path.join(process.cwd(), 'public', publicRelPath);
}

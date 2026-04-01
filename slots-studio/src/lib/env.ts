/**
 * lib/env.ts — 統一環境變數讀取
 *
 * Windows 上 OS 環境變數可能以空字串覆蓋 .env.local，
 * 因此手動解析 .env.local 作為 fallback。
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';

const _localEnv: Record<string, string> = (() => {
    const result: Record<string, string> = {};
    const envPath = path.join(process.cwd(), '.env.local');
    if (!existsSync(envPath)) return result;
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (key && val) result[key] = val;
    }
    return result;
})();

/** 讀取環境變數，OS env 為空時自動 fallback 到 .env.local */
export function getEnv(key: string): string {
    return process.env[key] || _localEnv[key] || '';
}

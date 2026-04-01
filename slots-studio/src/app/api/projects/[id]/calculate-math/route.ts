import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface PaytableMap {
    [assetId: string]: {
        pays_1: number;
        pays_2: number;
        pays_3: number;
        pays_4: number;
        pays_5: number;
        [key: string]: number;
    };
}

interface ParsedPayline {
    pattern: number[];
    enabled: number;
}

function simulateRTP(
    reels: string[][],
    paytable: PaytableMap,
    paylines: ParsedPayline[],
    simulations = 50000
): { rtp: number; hitFrequency: number; volatility: 'Low' | 'Medium' | 'High' } {
    const activePaylines = paylines.filter(p => p.enabled !== 0);

    let totalBet = 0;
    let totalPayout = 0;
    let hits = 0;

    for (let i = 0; i < simulations; i++) {
        totalBet += activePaylines.length; // 每線下注 1

        // 隨機選取每捲軸位置
        const positions = reels.map(reel => Math.floor(Math.random() * reel.length));

        let spinPayout = 0;
        for (const line of activePaylines) {
            const symbols = line.pattern.map((row, col) => {
                if (col >= reels.length) return '';
                const reelPos = (positions[col] + row) % reels[col].length;
                return reels[col][reelPos];
            });

            // 計算連中：從左到右相同符號
            let matchCount = 1;
            const firstSymbol = symbols[0];
            if (!firstSymbol) continue;

            for (let s = 1; s < symbols.length; s++) {
                if (symbols[s] === firstSymbol) matchCount++;
                else break;
            }

            if (matchCount >= 3) {
                const payout = paytable[firstSymbol]?.[`pays_${matchCount}`] ?? 0;
                spinPayout += payout;
            }
        }

        if (spinPayout > 0) hits++;
        totalPayout += spinPayout;
    }

    const rtp = totalBet > 0 ? (totalPayout / totalBet) * 100 : 0;
    const hitFrequency = (hits / simulations) * 100;
    const volatility: 'Low' | 'Medium' | 'High' = rtp > 97 ? 'Low' : rtp > 94 ? 'Medium' : 'High';

    return {
        rtp: Math.round(rtp * 10) / 10,
        hitFrequency: Math.round(hitFrequency * 10) / 10,
        volatility,
    };
}

// POST /api/projects/[id]/calculate-math - 計算 RTP
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: projectId } = await params;
        const db = getDb();

        const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
        if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

        // 讀取 reel_config（每捲軸符號條帶）
        const reelRows = db.prepare(`
            SELECT reel_index, symbol_ids
            FROM reel_config
            WHERE project_id = ?
            ORDER BY reel_index ASC
        `).all(projectId) as Array<{ reel_index: number; symbol_ids: string }>;

        if (reelRows.length === 0) {
            return NextResponse.json({ error: '尚未設定捲軸符號，請先配置 reel config' }, { status: 400 });
        }

        // 建立 reels 陣列（string[][] of asset_ids）
        const reels: string[][] = [];
        for (const row of reelRows) {
            let assetIds: string[] = [];
            try { assetIds = JSON.parse(row.symbol_ids); } catch { assetIds = []; }
            reels[row.reel_index] = assetIds;
        }

        // 過濾掉空捲軸
        const validReels = reels.filter(r => Array.isArray(r) && r.length > 0);
        if (validReels.length === 0) {
            return NextResponse.json({ error: '所有捲軸皆為空，無法計算' }, { status: 400 });
        }

        // 讀取 paytable
        const paytableRows = db.prepare(`
            SELECT asset_id, pays_1, pays_2, pays_3, pays_4, pays_5
            FROM paytable
            WHERE project_id = ?
        `).all(projectId) as Array<{
            asset_id: string;
            pays_1: number; pays_2: number; pays_3: number; pays_4: number; pays_5: number;
        }>;

        const paytable: PaytableMap = {};
        for (const row of paytableRows) {
            paytable[row.asset_id] = {
                pays_1: row.pays_1,
                pays_2: row.pays_2,
                pays_3: row.pays_3,
                pays_4: row.pays_4,
                pays_5: row.pays_5,
            };
        }

        if (Object.keys(paytable).length === 0) {
            return NextResponse.json({ error: '尚未設定賠付表，請先配置 paytable' }, { status: 400 });
        }

        // 讀取 paylines
        const paylineRows = db.prepare(`
            SELECT pattern, enabled
            FROM paylines
            WHERE project_id = ?
            ORDER BY line_index ASC
        `).all(projectId) as Array<{ pattern: string; enabled: number }>;

        if (paylineRows.length === 0) {
            return NextResponse.json({ error: '尚未設定彩金線，請先配置 paylines' }, { status: 400 });
        }

        const paylines: ParsedPayline[] = paylineRows.map(row => {
            let pattern: number[] = [];
            try { pattern = JSON.parse(row.pattern); } catch { pattern = []; }
            return { pattern, enabled: row.enabled };
        });

        // 進行蒙地卡羅模擬
        const result = simulateRTP(validReels, paytable, paylines, 50000);

        return NextResponse.json(result);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

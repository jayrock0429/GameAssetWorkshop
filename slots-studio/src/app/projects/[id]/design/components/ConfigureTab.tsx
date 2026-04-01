'use client';

import { useState, useEffect, useRef } from 'react';

type Asset = {
    id: string;
    name: string;
    element_type: string;
    status: string;
    image_path: string | null;
    value_tier: string;
    magic_layers?: { id: string; asset_id: string; layer_type: string; image_path: string }[];
};

type PaytableRow = {
    pays_1: number;
    pays_2: number;
    pays_3: number;
    pays_4: number;
    pays_5: number;
};

type Payline = {
    id: string;
    pattern: number[];
    color: string;
};

type MathResult = {
    rtp: number;
    hitFrequency: number;
    volatility: string;
};

interface ConfigureTabProps {
    projectId: string;
    gridCols: number;
    gridRows: number;
}

const PAYLINE_COLORS = [
    '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6',
    '#f97316', '#ec4899', '#06b6d4', '#84cc16', '#e11d48',
];

const DEFAULT_PAYLINES_PATTERNS: number[][] = [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
];

function getSymbolImage(asset: Asset): string {
    const noBg = asset.magic_layers?.find(l => l.layer_type === 'no_bg');
    return (noBg ? noBg.image_path : asset.image_path) || '';
}

// Draggable symbol item in a reel
function ReelSymbolItem({
    assetId,
    asset,
    index,
    reelIndex,
    onRemove,
    onDragStart,
    onDragOver,
    onDrop,
}: {
    assetId: string;
    asset: Asset | undefined;
    index: number;
    reelIndex: number;
    onRemove: (reelIndex: number, symbolIndex: number) => void;
    onDragStart: (e: React.DragEvent, reelIndex: number, symbolIndex: number) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, reelIndex: number, symbolIndex: number) => void;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            draggable
            onDragStart={e => onDragStart(e, reelIndex, index)}
            onDragOver={onDragOver}
            onDrop={e => onDrop(e, reelIndex, index)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 8px',
                background: hovered ? '#2a2a38' : '#1e1e2a',
                borderRadius: 6,
                cursor: 'grab',
                border: '1px solid #333',
                position: 'relative',
                transition: 'background 0.15s',
            }}
        >
            <span style={{ fontSize: 10, color: '#555', width: 14, flexShrink: 0 }}>{index + 1}</span>
            {asset ? (
                <img
                    src={getSymbolImage(asset)}
                    alt={asset.name}
                    style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }}
                />
            ) : (
                <div style={{ width: 28, height: 28, background: '#333', borderRadius: 4, flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 11, color: '#ccc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {asset?.name || assetId.slice(0, 8)}
            </span>
            {hovered && (
                <button
                    onClick={() => onRemove(reelIndex, index)}
                    style={{
                        position: 'absolute',
                        right: 4,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: 3,
                        color: '#fff',
                        fontSize: 10,
                        width: 16,
                        height: 16,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                    }}
                >x</button>
            )}
        </div>
    );
}

// Payline SVG visualizer
function PaylineVisualizer({
    gridCols,
    gridRows,
    paylines,
    highlightId,
    onHighlight,
}: {
    gridCols: number;
    gridRows: number;
    paylines: Payline[];
    highlightId: string | null;
    onHighlight: (id: string | null) => void;
}) {
    const cellW = 36;
    const cellH = 32;
    const gap = 3;
    const svgW = gridCols * (cellW + gap) - gap;
    const svgH = gridRows * (cellH + gap) - gap;

    function cellCenter(col: number, row: number): [number, number] {
        return [col * (cellW + gap) + cellW / 2, row * (cellH + gap) + cellH / 2];
    }

    const visiblePaylines = highlightId
        ? paylines.filter(pl => pl.id === highlightId)
        : paylines;

    return (
        <div style={{ position: 'relative' }}>
            <svg width={svgW} height={svgH} style={{ display: 'block' }}>
                {/* Grid cells */}
                {Array.from({ length: gridRows }).map((_, row) =>
                    Array.from({ length: gridCols }).map((_, col) => (
                        <rect
                            key={`${col}-${row}`}
                            x={col * (cellW + gap)}
                            y={row * (cellH + gap)}
                            width={cellW}
                            height={cellH}
                            rx={4}
                            fill="#1a1a2a"
                            stroke="#333"
                            strokeWidth={1}
                        />
                    ))
                )}

                {/* Paylines */}
                {visiblePaylines.map(pl => {
                    const points = pl.pattern
                        .slice(0, gridCols)
                        .map((row, col) => cellCenter(col, Math.min(row, gridRows - 1)));
                    const pathD = points
                        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`)
                        .join(' ');
                    return (
                        <path
                            key={pl.id}
                            d={pathD}
                            stroke={pl.color}
                            strokeWidth={highlightId === pl.id ? 3 : 1.5}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={highlightId && highlightId !== pl.id ? 0.2 : 0.85}
                        />
                    );
                })}

                {/* Dots on active payline */}
                {highlightId && visiblePaylines.map(pl =>
                    pl.pattern.slice(0, gridCols).map((row, col) => {
                        const [cx, cy] = cellCenter(col, Math.min(row, gridRows - 1));
                        return (
                            <circle
                                key={`dot-${col}`}
                                cx={cx}
                                cy={cy}
                                r={4}
                                fill={pl.color}
                                stroke="#fff"
                                strokeWidth={1}
                            />
                        );
                    })
                )}
            </svg>
        </div>
    );
}

export default function ConfigureTab({ projectId, gridCols, gridRows }: ConfigureTabProps) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [reels, setReels] = useState<string[][]>(() =>
        Array.from({ length: gridCols }, () => [])
    );
    const [paytable, setPaytable] = useState<Record<string, PaytableRow>>({});
    const [paylines, setPaylines] = useState<Payline[]>([]);
    const [mathResult, setMathResult] = useState<MathResult | null>(null);
    const [highlightPayline, setHighlightPayline] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [initDone, setInitDone] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    const dragSource = useRef<{ reelIndex: number; symbolIndex: number } | null>(null);
    const dragFromPool = useRef<string | null>(null);

    // Load all data on mount
    useEffect(() => {
        async function loadAll() {
            try {
                const [assetsRes, reelRes, paytableRes, paylinesRes] = await Promise.all([
                    fetch(`/api/projects/${projectId}/assets`),
                    fetch(`/api/projects/${projectId}/reel-config`),
                    fetch(`/api/projects/${projectId}/paytable`),
                    fetch(`/api/projects/${projectId}/paylines`),
                ]);

                const assetsData: Asset[] = await assetsRes.json().catch(() => []);
                const reelData = await reelRes.json().catch(() => null);
                const paytableData = await paytableRes.json().catch(() => null);
                const paylinesData = await paylinesRes.json().catch(() => null);

                const symbolAssets = Array.isArray(assetsData)
                    ? assetsData.filter(a =>
                        ['character', 'high', 'medium', 'royal', 'special'].includes(a.element_type) && a.image_path
                    )
                    : [];
                setAssets(symbolAssets);

                // Reels
                if (Array.isArray(reelData) && reelData.length > 0) {
                    const reelArr: string[][] = Array.from({ length: gridCols }, () => []);
                    reelData.forEach((r: { reel_index: number; symbol_ids: string }) => {
                        if (r.reel_index < gridCols) {
                            try {
                                reelArr[r.reel_index] = JSON.parse(r.symbol_ids) || [];
                            } catch { reelArr[r.reel_index] = []; }
                        }
                    });
                    setReels(reelArr);
                } else {
                    // Initialize with 5 symbols per reel if assets available
                    if (symbolAssets.length > 0) {
                        const defaultReels = Array.from({ length: gridCols }, (_, ri) =>
                            symbolAssets.map(a => a.id)
                        );
                        setReels(defaultReels);
                    }
                }

                // Paytable
                if (Array.isArray(paytableData) && paytableData.length > 0) {
                    const ptMap: Record<string, PaytableRow> = {};
                    paytableData.forEach((row: any) => {
                        ptMap[row.asset_id] = {
                            pays_1: row.pays_1 ?? 0,
                            pays_2: row.pays_2 ?? 0,
                            pays_3: row.pays_3 ?? 1,
                            pays_4: row.pays_4 ?? 3,
                            pays_5: row.pays_5 ?? 5,
                        };
                    });
                    setPaytable(ptMap);
                } else if (symbolAssets.length > 0) {
                    const ptMap: Record<string, PaytableRow> = {};
                    symbolAssets.forEach(a => {
                        const multiplier = a.value_tier === 'High' ? 3 : a.value_tier === 'Medium' ? 1.5 : 1;
                        ptMap[a.id] = {
                            pays_1: 0,
                            pays_2: 0,
                            pays_3: Math.round(multiplier * 1),
                            pays_4: Math.round(multiplier * 3),
                            pays_5: Math.round(multiplier * 5),
                        };
                    });
                    setPaytable(ptMap);
                }

                // Paylines
                if (Array.isArray(paylinesData) && paylinesData.length > 0) {
                    const pls: Payline[] = paylinesData.map((pl: any) => ({
                        id: pl.id,
                        pattern: JSON.parse(pl.pattern || '[]'),
                        color: pl.color || '#ffffff',
                    }));
                    setPaylines(pls);
                } else {
                    // Default paylines
                    const defaultPls: Payline[] = DEFAULT_PAYLINES_PATTERNS.map((pattern, i) => ({
                        id: `default-${i}`,
                        pattern,
                        color: PAYLINE_COLORS[i % PAYLINE_COLORS.length],
                    }));
                    setPaylines(defaultPls);
                }
            } catch (e) {
                console.error('ConfigureTab load error:', e);
            } finally {
                setInitDone(true);
            }
        }
        loadAll();
    }, [projectId, gridCols]);

    // ── Reel Drag & Drop ──────────────────────────────────────────
    function handlePoolDragStart(e: React.DragEvent, assetId: string) {
        dragFromPool.current = assetId;
        dragSource.current = null;
        e.dataTransfer.effectAllowed = 'copy';
    }

    function handleReelItemDragStart(e: React.DragEvent, reelIndex: number, symbolIndex: number) {
        dragSource.current = { reelIndex, symbolIndex };
        dragFromPool.current = null;
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleReelDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.dataTransfer.dropEffect = dragFromPool.current ? 'copy' : 'move';
    }

    function handleReelDrop(e: React.DragEvent, targetReelIndex: number, targetSymbolIndex: number) {
        e.preventDefault();
        if (dragFromPool.current) {
            // Add from symbol pool
            const assetId = dragFromPool.current;
            setReels(prev => {
                const next = prev.map(r => [...r]);
                next[targetReelIndex] = [
                    ...next[targetReelIndex].slice(0, targetSymbolIndex),
                    assetId,
                    ...next[targetReelIndex].slice(targetSymbolIndex),
                ];
                return next;
            });
            dragFromPool.current = null;
        } else if (dragSource.current) {
            // Move within or between reels
            const { reelIndex: srcReel, symbolIndex: srcIdx } = dragSource.current;
            setReels(prev => {
                const next = prev.map(r => [...r]);
                const [moved] = next[srcReel].splice(srcIdx, 1);
                const destIdx = srcReel === targetReelIndex && srcIdx < targetSymbolIndex
                    ? targetSymbolIndex - 1
                    : targetSymbolIndex;
                next[targetReelIndex].splice(destIdx, 0, moved);
                return next;
            });
            dragSource.current = null;
        }
    }

    function handleReelDropZone(e: React.DragEvent, targetReelIndex: number) {
        e.preventDefault();
        if (dragFromPool.current) {
            const assetId = dragFromPool.current;
            setReels(prev => {
                const next = prev.map(r => [...r]);
                next[targetReelIndex] = [...next[targetReelIndex], assetId];
                return next;
            });
            dragFromPool.current = null;
        }
    }

    function handleRemoveFromReel(reelIndex: number, symbolIndex: number) {
        setReels(prev => {
            const next = prev.map(r => [...r]);
            next[reelIndex].splice(symbolIndex, 1);
            return next;
        });
    }

    function handleRandomize() {
        if (assets.length === 0) return;
        const shuffled = [...assets].sort(() => Math.random() - 0.5);
        const randomReels = Array.from({ length: gridCols }, (_, ri) =>
            Array.from({ length: 5 }, (_, si) => shuffled[(ri * 5 + si) % shuffled.length].id)
        );
        setReels(randomReels);
    }

    function handleResetReels() {
        setReels(Array.from({ length: gridCols }, () => []));
    }

    // ── Paytable ─────────────────────────────────────────────────
    function handlePaytableChange(assetId: string, field: keyof PaytableRow, value: string) {
        const num = parseFloat(value) || 0;
        setPaytable(prev => ({
            ...prev,
            [assetId]: { ...(prev[assetId] || { pays_1: 0, pays_2: 0, pays_3: 1, pays_4: 3, pays_5: 5 }), [field]: num },
        }));
    }

    async function handleCalculateMath() {
        setCalculating(true);
        try {
            // Simple RTP calculation based on paytable and reel config
            const totalSpins = 100000;
            let totalReturn = 0;
            let hits = 0;

            // Count symbol frequency per reel
            const reelFreq: Record<string, number>[] = reels.map(reel => {
                const freq: Record<string, number> = {};
                reel.forEach(id => { freq[id] = (freq[id] || 0) + 1; });
                return freq;
            });

            // For each symbol, calculate contribution
            assets.forEach(asset => {
                const pt = paytable[asset.id];
                if (!pt) return;

                const probs = reels.map((reel, ri) => {
                    if (reel.length === 0) return 0;
                    return (reelFreq[ri][asset.id] || 0) / reel.length;
                });

                // 3-of-a-kind or more from left
                const prob3 = probs.slice(0, 3).reduce((a, b) => a * b, 1);
                const prob4 = probs.slice(0, 4).reduce((a, b) => a * b, 1);
                const prob5 = probs.reduce((a, b) => a * b, 1);

                const numPaylines = paylines.length || 1;

                const contrib3 = prob3 * pt.pays_3 * numPaylines;
                const contrib4 = prob4 * pt.pays_4 * numPaylines;
                const contrib5 = prob5 * pt.pays_5 * numPaylines;

                totalReturn += contrib3 + contrib4 + contrib5;
                if (prob3 > 0 || prob4 > 0 || prob5 > 0) hits += (prob3 + prob4 + prob5) * numPaylines;
            });

            const rtp = Math.min(99, Math.max(50, totalReturn * 100));
            const hitFreq = Math.min(50, Math.max(5, hits * 100));
            const volatility = rtp > 96 ? 'Low' : rtp > 92 ? 'Medium' : 'High';

            setMathResult({ rtp: parseFloat(rtp.toFixed(2)), hitFrequency: parseFloat(hitFreq.toFixed(2)), volatility });
        } catch (e) {
            console.error('Math calculation error:', e);
        } finally {
            setCalculating(false);
        }
    }

    // ── Paylines ──────────────────────────────────────────────────
    function handleAddPayline() {
        if (paylines.length >= 20) return;
        const newPattern = Array.from({ length: gridCols }, () => Math.floor(Math.random() * gridRows));
        setPaylines(prev => [...prev, {
            id: `pl-${Date.now()}`,
            pattern: newPattern,
            color: PAYLINE_COLORS[prev.length % PAYLINE_COLORS.length],
        }]);
    }

    function handleRemovePayline(id: string) {
        setPaylines(prev => prev.filter(pl => pl.id !== id));
        if (highlightPayline === id) setHighlightPayline(null);
    }

    function handleResetPaylines() {
        const defaultPls: Payline[] = DEFAULT_PAYLINES_PATTERNS.slice(0, 5).map((pattern, i) => ({
            id: `reset-${i}-${Date.now()}`,
            pattern,
            color: PAYLINE_COLORS[i],
        }));
        setPaylines(defaultPls);
        setHighlightPayline(null);
    }

    function handleClearPaylines() {
        setPaylines([]);
        setHighlightPayline(null);
    }

    // ── Save All ──────────────────────────────────────────────────
    async function handleSaveAll() {
        setSaving(true);
        setSaveMsg('');
        try {
            await Promise.all([
                // Save reel config
                fetch(`/api/projects/${projectId}/reel-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reels }),
                }),
                // Save paytable
                fetch(`/api/projects/${projectId}/paytable`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paytable }),
                }),
                // Save paylines
                fetch(`/api/projects/${projectId}/paylines`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paylines }),
                }),
            ]);
            setSaveMsg('已儲存');
            setTimeout(() => setSaveMsg(''), 2000);
        } catch (e) {
            console.error('Save error:', e);
            setSaveMsg('儲存失敗');
        } finally {
            setSaving(false);
        }
    }

    if (!initDone) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' }}>
                <div style={{ color: '#888', fontSize: 14 }}>載入配置中...</div>
            </div>
        );
    }

    const symbolAssets = assets;

    return (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#0a0a0f' }}>
            {/* ── LEFT: Reel Configuration (60%) ── */}
            <div style={{
                width: '60%',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid #222',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #222',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#e0e0f0' }}>Reel Configuration</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={handleRandomize}
                            style={{
                                padding: '5px 12px', fontSize: 12, fontWeight: 600,
                                background: 'rgba(124,108,248,0.15)', border: '1px solid rgba(124,108,248,0.35)',
                                color: '#a89cf8', borderRadius: 6, cursor: 'pointer',
                            }}
                        >Randomize</button>
                        <button
                            onClick={handleResetReels}
                            style={{
                                padding: '5px 12px', fontSize: 12, fontWeight: 600,
                                background: '#1a1a22', border: '1px solid #333',
                                color: '#888', borderRadius: 6, cursor: 'pointer',
                            }}
                        >Reset</button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Symbol Pool */}
                    <div style={{
                        background: '#111118', border: '1px solid #222', borderRadius: 10, padding: 12,
                    }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#666', letterSpacing: '0.08em', marginBottom: 10, textTransform: 'uppercase' }}>
                            Symbol Pool — 拖入捲軸
                        </div>
                        {symbolAssets.length === 0 ? (
                            <div style={{ fontSize: 12, color: '#555', padding: '8px 0' }}>尚無已完成的符號資產</div>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {symbolAssets.map(asset => (
                                    <div
                                        key={asset.id}
                                        draggable
                                        onDragStart={e => handlePoolDragStart(e, asset.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '4px 10px 4px 6px',
                                            background: '#1a1a28',
                                            border: '1px solid #333',
                                            borderRadius: 20,
                                            cursor: 'grab',
                                            userSelect: 'none',
                                        }}
                                        title={`拖入捲軸：${asset.name}`}
                                    >
                                        <img
                                            src={getSymbolImage(asset)}
                                            alt={asset.name}
                                            style={{ width: 24, height: 24, objectFit: 'contain' }}
                                        />
                                        <span style={{ fontSize: 11, color: '#ccc' }}>{asset.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reels */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        {Array.from({ length: gridCols }).map((_, ri) => (
                            <div
                                key={ri}
                                onDragOver={handleReelDragOver}
                                onDrop={e => handleReelDropZone(e, ri)}
                                style={{
                                    flex: 1,
                                    background: '#111118',
                                    border: '1px solid #222',
                                    borderRadius: 10,
                                    padding: 10,
                                    minHeight: 200,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6,
                                }}
                            >
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#7c6cf8', marginBottom: 4, textAlign: 'center' }}>
                                    Reel {ri + 1}
                                    <span style={{ fontSize: 10, color: '#555', fontWeight: 400, marginLeft: 4 }}>({reels[ri]?.length || 0})</span>
                                </div>

                                {(reels[ri] || []).map((assetId, si) => {
                                    const asset = symbolAssets.find(a => a.id === assetId);
                                    return (
                                        <ReelSymbolItem
                                            key={`${ri}-${si}-${assetId}`}
                                            assetId={assetId}
                                            asset={asset}
                                            index={si}
                                            reelIndex={ri}
                                            onRemove={handleRemoveFromReel}
                                            onDragStart={handleReelItemDragStart}
                                            onDragOver={handleReelDragOver}
                                            onDrop={handleReelDrop}
                                        />
                                    );
                                })}

                                {/* Drop zone hint */}
                                <div
                                    onDragOver={handleReelDragOver}
                                    onDrop={e => handleReelDropZone(e, ri)}
                                    style={{
                                        flex: 1,
                                        minHeight: 32,
                                        border: '1px dashed #2a2a3a',
                                        borderRadius: 6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 10,
                                        color: '#444',
                                    }}
                                >
                                    +
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Save button */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #222', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        style={{
                            padding: '8px 24px', fontSize: 13, fontWeight: 700,
                            background: saving ? '#333' : '#7c6cf8',
                            border: 'none', color: '#fff', borderRadius: 8,
                            cursor: saving ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {saving ? '儲存中...' : '儲存全部配置'}
                    </button>
                    {saveMsg && <span style={{ fontSize: 12, color: saveMsg.includes('失敗') ? '#ef4444' : '#10b981' }}>{saveMsg}</span>}
                </div>
            </div>

            {/* ── MIDDLE: Game Math / Paytable (25%) ── */}
            <div style={{
                width: '25%',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid #222',
                overflow: 'hidden',
            }}>
                <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #222', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#e0e0f0' }}>Game Math</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Paytable</div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                    {/* Paytable header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 40px 40px 40px 40px 40px',
                        gap: 3,
                        marginBottom: 6,
                        padding: '4px 0',
                    }}>
                        <div style={{ fontSize: 10, color: '#555' }}>符號</div>
                        {[1, 2, 3, 4, 5].map(n => (
                            <div key={n} style={{ fontSize: 10, color: '#666', textAlign: 'center', fontWeight: 700 }}>{n}x</div>
                        ))}
                    </div>

                    {symbolAssets.length === 0 && (
                        <div style={{ fontSize: 12, color: '#555', padding: '8px 0' }}>尚無符號資產</div>
                    )}

                    {symbolAssets.map(asset => {
                        const pt = paytable[asset.id] || { pays_1: 0, pays_2: 0, pays_3: 1, pays_4: 3, pays_5: 5 };
                        return (
                            <div key={asset.id} style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 40px 40px 40px 40px 40px',
                                gap: 3,
                                marginBottom: 5,
                                alignItems: 'center',
                                padding: '4px 6px',
                                background: '#111118',
                                borderRadius: 6,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                                    <img src={getSymbolImage(asset)} style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
                                    <span style={{ fontSize: 10, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</span>
                                </div>
                                {(['pays_1', 'pays_2', 'pays_3', 'pays_4', 'pays_5'] as (keyof PaytableRow)[]).map(field => (
                                    <input
                                        key={field}
                                        type="number"
                                        value={pt[field]}
                                        onChange={e => handlePaytableChange(asset.id, field, e.target.value)}
                                        style={{
                                            width: '100%',
                                            background: '#1a1a22',
                                            border: '1px solid #2a2a38',
                                            color: '#e0e0f0',
                                            borderRadius: 4,
                                            padding: '3px 4px',
                                            fontSize: 11,
                                            textAlign: 'center',
                                        }}
                                        min={0}
                                        step={0.5}
                                    />
                                ))}
                            </div>
                        );
                    })}
                </div>

                {/* Calculate Math */}
                <div style={{ padding: 12, borderTop: '1px solid #222', flexShrink: 0 }}>
                    <button
                        onClick={handleCalculateMath}
                        disabled={calculating}
                        style={{
                            width: '100%', padding: '8px', fontSize: 13, fontWeight: 700,
                            background: calculating ? '#1a1a22' : 'rgba(79,142,247,0.2)',
                            border: `1px solid ${calculating ? '#333' : 'rgba(79,142,247,0.4)'}`,
                            color: calculating ? '#555' : '#4f8ef7',
                            borderRadius: 8, cursor: calculating ? 'not-allowed' : 'pointer',
                            marginBottom: 10,
                        }}
                    >
                        {calculating ? '計算中...' : 'Calculate Math'}
                    </button>

                    {mathResult && (
                        <div style={{ background: '#0f0f18', border: '1px solid #222', borderRadius: 8, padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: '#666' }}>RTP</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: mathResult.rtp >= 95 ? '#10b981' : mathResult.rtp >= 90 ? '#f59e0b' : '#ef4444' }}>
                                    {mathResult.rtp}%
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: '#666' }}>Hit Freq</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#4f8ef7' }}>{mathResult.hitFrequency}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, color: '#666' }}>Volatility</span>
                                <span style={{
                                    fontSize: 12, fontWeight: 700,
                                    color: mathResult.volatility === 'High' ? '#ef4444' : mathResult.volatility === 'Medium' ? '#f59e0b' : '#10b981',
                                }}>
                                    {mathResult.volatility}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── RIGHT: Paylines (15%) ── */}
            <div style={{
                width: '15%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                minWidth: 180,
            }}>
                <div style={{ padding: '16px 12px 12px', borderBottom: '1px solid #222', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#e0e0f0' }}>Paylines</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{paylines.length} lines</div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* SVG visualizer */}
                    <div style={{
                        background: '#0f0f18',
                        border: '1px solid #1e1e2a',
                        borderRadius: 8,
                        padding: 10,
                        display: 'flex',
                        justifyContent: 'center',
                        overflow: 'hidden',
                    }}>
                        <PaylineVisualizer
                            gridCols={gridCols}
                            gridRows={gridRows}
                            paylines={paylines}
                            highlightId={highlightPayline}
                            onHighlight={setHighlightPayline}
                        />
                    </div>

                    {/* Payline list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {paylines.map((pl, i) => (
                            <div
                                key={pl.id}
                                onClick={() => setHighlightPayline(highlightPayline === pl.id ? null : pl.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '5px 8px',
                                    background: highlightPayline === pl.id ? '#1a1a2e' : '#111118',
                                    border: `1px solid ${highlightPayline === pl.id ? pl.color + '55' : '#1e1e28'}`,
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: pl.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 10, color: '#888', flex: 1 }}>
                                    Line {i + 1}: [{pl.pattern.slice(0, gridCols).join(',')}]
                                </span>
                                <button
                                    onClick={e => { e.stopPropagation(); handleRemovePayline(pl.id); }}
                                    style={{
                                        background: 'none', border: 'none', color: '#555',
                                        fontSize: 11, cursor: 'pointer', padding: '0 2px',
                                    }}
                                >x</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payline actions */}
                <div style={{ padding: 10, borderTop: '1px solid #222', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                        onClick={handleAddPayline}
                        disabled={paylines.length >= 20}
                        style={{
                            width: '100%', padding: '7px', fontSize: 12, fontWeight: 700,
                            background: paylines.length >= 20 ? '#111' : 'rgba(124,108,248,0.15)',
                            border: `1px solid ${paylines.length >= 20 ? '#222' : 'rgba(124,108,248,0.35)'}`,
                            color: paylines.length >= 20 ? '#444' : '#a89cf8',
                            borderRadius: 6, cursor: paylines.length >= 20 ? 'not-allowed' : 'pointer',
                        }}
                    >+ Add Line</button>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            onClick={handleResetPaylines}
                            style={{
                                flex: 1, padding: '6px', fontSize: 11,
                                background: '#1a1a22', border: '1px solid #333',
                                color: '#888', borderRadius: 6, cursor: 'pointer',
                            }}
                        >Reset</button>
                        <button
                            onClick={handleClearPaylines}
                            style={{
                                flex: 1, padding: '6px', fontSize: 11,
                                background: '#1a1a22', border: '1px solid #333',
                                color: '#888', borderRadius: 6, cursor: 'pointer',
                            }}
                        >Clear</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

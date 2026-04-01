'use client';

import { useState, useEffect } from 'react';

type MagicLayer = {
    id: string;
    asset_id: string;
    layer_type: string;
    image_path: string;
};

type Asset = {
    id: string;
    name: string;
    element_type: string;
    status: string;
    image_path: string | null;
    value_tier: string;
    magic_layers?: MagicLayer[];
};

type Project = {
    id: string;
    name: string;
    theme: string;
    style_guide: string;
    style_analysis: string;
    grid_cols: number;
    grid_rows: number;
};

type LayerVisibility = {
    button: boolean;
    title: boolean;
    reels: boolean;
    background: boolean;
};

interface PreviewTabProps {
    project: Project;
    assets: Asset[];
}

function getSymbolImage(asset: Asset): string {
    const noBg = asset.magic_layers?.find(l => l.layer_type === 'no_bg');
    return (noBg ? noBg.image_path : asset.image_path) || '';
}

// Spin animation keyframes injected once
const SPIN_STYLE_ID = 'preview-spin-keyframes';
function injectSpinKeyframes() {
    if (typeof document !== 'undefined' && !document.getElementById(SPIN_STYLE_ID)) {
        const style = document.createElement('style');
        style.id = SPIN_STYLE_ID;
        style.textContent = `
            @keyframes spin-blur {
                from { filter: blur(3px) brightness(1.3) saturate(1.5); }
                to   { filter: blur(0px) brightness(1) saturate(1); }
            }
            @keyframes spin-reel {
                0%   { transform: translateY(-8px); opacity: 0.6; }
                50%  { transform: translateY(4px);  opacity: 1;   }
                100% { transform: translateY(0px);  opacity: 1;   }
            }
            @keyframes balance-pulse {
                0%, 100% { color: #e0e0f0; }
                50%       { color: #f59e0b; }
            }
        `;
        document.head.appendChild(style);
    }
}

export default function PreviewTab({ project, assets }: PreviewTabProps) {
    const [spinning, setSpinning] = useState(false);
    const [spinResult, setSpinResult] = useState<Asset[]>([]);
    const [balance, setBalance] = useState(1000);
    const [bet, setBet] = useState(10);
    const [winAmount, setWinAmount] = useState<number | null>(null);
    const [balancePulse, setBalancePulse] = useState(false);
    const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
        button: true,
        title: true,
        reels: true,
        background: true,
    });
    const [reelsExpanded, setReelsExpanded] = useState(true);
    const [exportOpen, setExportOpen] = useState(false);

    useEffect(() => {
        injectSpinKeyframes();
    }, []);

    const bgAsset = assets.find(a => a.element_type === 'bg' && a.image_path);
    const frameAsset = assets.find(a => a.element_type === 'frame' && a.image_path);
    const buttonAsset = assets.find(a => a.element_type === 'button' && a.image_path);
    const symbolAssets = assets.filter(a =>
        ['character', 'high', 'medium', 'royal', 'special'].includes(a.element_type) && a.image_path
    );

    const totalCells = project.grid_cols * project.grid_rows;

    // Initialize spin result
    useEffect(() => {
        if (symbolAssets.length > 0 && spinResult.length === 0) {
            const initial: Asset[] = Array.from({ length: totalCells }, (_, i) =>
                symbolAssets[i % symbolAssets.length]
            );
            setSpinResult(initial);
        }
    }, [assets]);

    function generateSpinResult(): Asset[] {
        if (symbolAssets.length === 0) return [];
        return Array.from({ length: totalCells }, () =>
            symbolAssets[Math.floor(Math.random() * symbolAssets.length)]
        );
    }

    async function handleSpin() {
        if (spinning || balance < bet) return;
        setBalance(prev => prev - bet);
        setWinAmount(null);
        setSpinning(true);

        await new Promise(r => setTimeout(r, 1500));

        const result = generateSpinResult();
        setSpinResult(result);

        // Simple win check: any 3+ consecutive same symbols in a row
        let win = 0;
        for (let row = 0; row < project.grid_rows; row++) {
            const rowSymbols = result.slice(row * project.grid_cols, (row + 1) * project.grid_cols);
            let streak = 1;
            for (let col = 1; col < rowSymbols.length; col++) {
                if (rowSymbols[col].id === rowSymbols[col - 1].id) {
                    streak++;
                } else {
                    streak = 1;
                }
                if (streak >= 3) {
                    win += bet * streak;
                }
            }
        }

        if (win > 0) {
            setBalance(prev => prev + win);
            setWinAmount(win);
            setBalancePulse(true);
            setTimeout(() => setBalancePulse(false), 1000);
        }

        setSpinning(false);
    }

    function handleReset() {
        setBalance(1000);
        setBet(10);
        setWinAmount(null);
        setSpinning(false);
        if (symbolAssets.length > 0) {
            setSpinResult(Array.from({ length: totalCells }, (_, i) => symbolAssets[i % symbolAssets.length]));
        }
    }

    function toggleLayer(layer: keyof LayerVisibility) {
        setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
    }

    async function handleExport(format: 'png' | 'mp4' | 'json') {
        setExportOpen(false);
        if (format === 'json') {
            const exportData = {
                project: { id: project.id, name: project.name, theme: project.theme, grid_cols: project.grid_cols, grid_rows: project.grid_rows },
                assets: assets.map(a => ({ id: a.id, name: a.name, element_type: a.element_type, image_path: a.image_path })),
                layers: layerVisibility,
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.name}_layout.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            alert(`Export ${format.toUpperCase()} — 需後端支援合成功能`);
        }
    }

    async function handleSaveLayout() {
        try {
            await fetch(`/api/projects/${project.id}/layout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ layers: layerVisibility }),
            });
            alert('佈局已儲存');
        } catch {
            alert('儲存佈局失敗');
        }
    }

    const eyeIcon = (visible: boolean) => visible ? '◉' : '○';

    return (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#0a0a0f' }}>
            {/* ── LEFT: Game Preview Canvas ── */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
                overflow: 'hidden',
            }}>
                {/* Game viewport */}
                <div style={{
                    width: '100%',
                    maxWidth: 900,
                    aspectRatio: '16 / 9',
                    position: 'relative',
                    background: '#000',
                    borderRadius: 20,
                    overflow: 'hidden',
                    boxShadow: spinning
                        ? '0 0 60px rgba(124,108,248,0.4), 0 20px 80px rgba(0,0,0,0.8)'
                        : '0 20px 60px rgba(0,0,0,0.7)',
                    border: '1px solid #222',
                    transition: 'box-shadow 0.3s',
                }}>
                    {/* Background layer */}
                    {layerVisibility.background && bgAsset && (
                        <img
                            src={bgAsset.image_path!}
                            alt="Background"
                            style={{
                                position: 'absolute', inset: 0,
                                width: '100%', height: '100%',
                                objectFit: 'cover', opacity: 0.75,
                                zIndex: 1,
                            }}
                        />
                    )}

                    {/* Dark overlay for contrast */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)',
                        zIndex: 2,
                    }} />

                    {/* Game Title */}
                    {layerVisibility.title && (
                        <div style={{
                            position: 'absolute', top: '6%', left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 10,
                            textAlign: 'center',
                        }}>
                            <div style={{
                                fontSize: 'clamp(14px, 2.5vw, 28px)',
                                fontWeight: 900,
                                color: '#fff',
                                textShadow: '0 0 20px rgba(124,108,248,0.8), 0 2px 4px rgba(0,0,0,0.9)',
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                            }}>
                                {project.name}
                            </div>
                            <div style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em', marginTop: 2 }}>
                                {project.theme}
                            </div>
                        </div>
                    )}

                    {/* Reels area */}
                    {layerVisibility.reels && (
                        <div style={{
                            position: 'absolute',
                            inset: '18% 8% 22%',
                            zIndex: 5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {/* Reel background panel */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0.55)',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.08)',
                                backdropFilter: 'blur(2px)',
                            }} />

                            {/* Symbol grid */}
                            <div style={{
                                position: 'relative',
                                zIndex: 6,
                                width: '96%',
                                height: '92%',
                                display: 'grid',
                                gridTemplateColumns: `repeat(${project.grid_cols}, 1fr)`,
                                gridTemplateRows: `repeat(${project.grid_rows}, 1fr)`,
                                gap: 6,
                                padding: 8,
                            }}>
                                {spinResult.map((symbol, idx) => {
                                    const col = idx % project.grid_cols;
                                    const animDelay = `${col * 0.08}s`;
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                borderRadius: 6,
                                                background: 'rgba(255,255,255,0.03)',
                                            }}
                                        >
                                            {symbol && (
                                                <img
                                                    src={getSymbolImage(symbol)}
                                                    alt={symbol.name}
                                                    style={{
                                                        width: '85%',
                                                        height: '85%',
                                                        objectFit: 'contain',
                                                        animation: spinning
                                                            ? `spin-reel 0.15s ease-in-out ${animDelay} infinite`
                                                            : 'none',
                                                        filter: spinning ? 'blur(1px)' : 'none',
                                                        transition: 'filter 0.2s',
                                                    }}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Frame overlay */}
                            {frameAsset && (
                                <img
                                    src={frameAsset.image_path!}
                                    alt="Frame"
                                    style={{
                                        position: 'absolute', inset: 0,
                                        width: '100%', height: '100%',
                                        objectFit: 'fill',
                                        zIndex: 8,
                                        mixBlendMode: 'screen',
                                    }}
                                />
                            )}
                        </div>
                    )}

                    {/* Win display */}
                    {winAmount !== null && !spinning && (
                        <div style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 20,
                            background: 'rgba(0,0,0,0.85)',
                            border: '2px solid #f59e0b',
                            borderRadius: 12,
                            padding: '12px 32px',
                            textAlign: 'center',
                            pointerEvents: 'none',
                            boxShadow: '0 0 40px rgba(245,158,11,0.4)',
                            animation: 'spin-blur 0.5s ease-out',
                        }}>
                            <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.2em' }}>WIN</div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{winAmount.toLocaleString()}</div>
                        </div>
                    )}

                    {/* Bottom UI bar */}
                    <div style={{
                        position: 'absolute',
                        bottom: '4%', left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 15,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        background: 'rgba(0,0,0,0.75)',
                        borderRadius: 40,
                        padding: '8px 24px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                        whiteSpace: 'nowrap',
                    }}>
                        {/* Reset */}
                        <button
                            onClick={handleReset}
                            style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: '#888', borderRadius: 20,
                                padding: '5px 14px', fontSize: 12,
                                cursor: 'pointer', fontWeight: 600,
                            }}
                        >Reset</button>

                        {/* Bet control */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>BET</span>
                            <button
                                onClick={() => setBet(prev => Math.max(1, prev - 1))}
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #333', color: '#aaa', width: 22, height: 22, borderRadius: 11, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            >-</button>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#e0e0f0', minWidth: 24, textAlign: 'center' }}>{bet}</span>
                            <button
                                onClick={() => setBet(prev => Math.min(balance, prev + 1))}
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #333', color: '#aaa', width: 22, height: 22, borderRadius: 11, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            >+</button>
                        </div>

                        {/* SPIN button */}
                        {layerVisibility.button ? (
                            buttonAsset ? (
                                <button
                                    onClick={handleSpin}
                                    disabled={spinning || balance < bet}
                                    style={{
                                        background: 'none', border: 'none',
                                        cursor: (spinning || balance < bet) ? 'not-allowed' : 'pointer',
                                        opacity: (spinning || balance < bet) ? 0.5 : 1,
                                        padding: 0,
                                    }}
                                >
                                    <img
                                        src={buttonAsset.image_path!}
                                        alt="Spin"
                                        style={{
                                            height: 44,
                                            objectFit: 'contain',
                                            animation: spinning ? 'spin-blur 0.1s ease-in-out infinite alternate' : 'none',
                                        }}
                                    />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSpin}
                                    disabled={spinning || balance < bet}
                                    style={{
                                        padding: '8px 28px',
                                        background: (spinning || balance < bet)
                                            ? '#333'
                                            : 'linear-gradient(135deg, #7c6cf8 0%, #4f8ef7 100%)',
                                        border: 'none',
                                        color: '#fff',
                                        borderRadius: 24,
                                        fontWeight: 900,
                                        fontSize: 15,
                                        cursor: (spinning || balance < bet) ? 'not-allowed' : 'pointer',
                                        letterSpacing: '0.05em',
                                        boxShadow: spinning ? 'none' : '0 4px 16px rgba(124,108,248,0.4)',
                                        animation: spinning ? 'spin-blur 0.1s ease-in-out infinite alternate' : 'none',
                                        transition: 'background 0.2s',
                                    }}
                                >
                                    {spinning ? 'SPINNING...' : 'SPIN'}
                                </button>
                            )
                        ) : null}

                        {/* Balance */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>BAL</span>
                            <span style={{
                                fontSize: 14, fontWeight: 700,
                                color: '#e0e0f0',
                                animation: balancePulse ? 'balance-pulse 0.5s ease-in-out' : 'none',
                            }}>
                                {balance.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <p style={{ marginTop: 16, color: '#444', fontSize: 11 }}>
                    * 模擬預覽 — 實際遊戲邏輯依引擎實作為準
                </p>
            </div>

            {/* ── RIGHT: Layers Panel ── */}
            <div style={{
                width: 220,
                background: '#111118',
                borderLeft: '1px solid #1e1e28',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
            }}>
                {/* Panel header */}
                <div style={{
                    padding: '16px 16px 12px',
                    borderBottom: '1px solid #1e1e28',
                }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#e0e0f0' }}>Layers</div>
                </div>

                {/* Layer list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>

                    {/* Button layer */}
                    <LayerRow
                        label="Button"
                        icon="🎯"
                        visible={layerVisibility.button}
                        onToggle={() => toggleLayer('button')}
                        available={!!buttonAsset}
                        thumbnail={buttonAsset?.image_path || null}
                    />

                    {/* Game Title layer */}
                    <LayerRow
                        label="Game Title"
                        icon="T"
                        visible={layerVisibility.title}
                        onToggle={() => toggleLayer('title')}
                        available
                        thumbnail={null}
                        iconStyle={{ fontWeight: 900, fontSize: 14, color: '#7c6cf8' }}
                    />

                    {/* Reels layer (expandable) */}
                    <div>
                        <div
                            onClick={() => setReelsExpanded(p => !p)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 16px',
                                cursor: 'pointer',
                                background: reelsExpanded ? 'rgba(124,108,248,0.06)' : 'transparent',
                                transition: 'background 0.15s',
                            }}
                        >
                            <button
                                onClick={e => { e.stopPropagation(); toggleLayer('reels'); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: layerVisibility.reels ? '#7c6cf8' : '#444', fontSize: 14, lineHeight: 1 }}
                                title={layerVisibility.reels ? '隱藏 Reels' : '顯示 Reels'}
                            >{eyeIcon(layerVisibility.reels)}</button>
                            <span style={{ fontSize: 13, marginRight: 'auto' }}>🎰</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#ccc', flex: 1 }}>Reels</span>
                            <span style={{ fontSize: 10, color: '#555' }}>{reelsExpanded ? '▾' : '▸'}</span>
                        </div>

                        {reelsExpanded && (
                            <div style={{ paddingLeft: 32, paddingBottom: 4 }}>
                                {symbolAssets.length === 0 ? (
                                    <div style={{ fontSize: 11, color: '#444', padding: '4px 16px' }}>尚無符號資產</div>
                                ) : (
                                    symbolAssets.slice(0, 6).map(asset => (
                                        <div key={asset.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '3px 16px', fontSize: 11, color: '#666',
                                        }}>
                                            <img src={getSymbolImage(asset)} style={{ width: 18, height: 18, objectFit: 'contain' }} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</span>
                                        </div>
                                    ))
                                )}
                                {symbolAssets.length > 6 && (
                                    <div style={{ padding: '2px 16px', fontSize: 10, color: '#444' }}>+{symbolAssets.length - 6} more...</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Background layer */}
                    <LayerRow
                        label="Background"
                        icon="🌆"
                        visible={layerVisibility.background}
                        onToggle={() => toggleLayer('background')}
                        available={!!bgAsset}
                        thumbnail={bgAsset?.image_path || null}
                    />

                    {/* Divider */}
                    <div style={{ margin: '8px 16px', borderTop: '1px solid #1e1e28' }} />

                    {/* Add Element */}
                    <button
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            width: '100%', padding: '8px 16px',
                            background: 'none', border: 'none',
                            color: '#555', fontSize: 12, cursor: 'pointer',
                            textAlign: 'left',
                        }}
                        onClick={() => alert('前往「設計」標籤新增元素')}
                    >
                        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                        <span>Add Element</span>
                    </button>
                </div>

                {/* Bottom actions */}
                <div style={{ padding: 12, borderTop: '1px solid #1e1e28', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Export dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setExportOpen(p => !p)}
                            style={{
                                width: '100%', padding: '7px 12px',
                                background: '#1a1a22', border: '1px solid #2a2a38',
                                color: '#aaa', borderRadius: 6, cursor: 'pointer',
                                fontSize: 12, fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}
                        >
                            <span>Export</span>
                            <span style={{ fontSize: 10, color: '#555' }}>{exportOpen ? '▲' : '▼'}</span>
                        </button>
                        {exportOpen && (
                            <div style={{
                                position: 'absolute', bottom: '110%', left: 0, right: 0,
                                background: '#1a1a28', border: '1px solid #2a2a3a',
                                borderRadius: 8, overflow: 'hidden',
                                boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
                                zIndex: 100,
                            }}>
                                {[
                                    { format: 'png', label: 'Export PNG', icon: '🖼' },
                                    { format: 'mp4', label: 'Export Video', icon: '🎬' },
                                    { format: 'json', label: 'Export Layout JSON', icon: '{ }' },
                                ].map(item => (
                                    <button
                                        key={item.format}
                                        onClick={() => handleExport(item.format as 'png' | 'mp4' | 'json')}
                                        style={{
                                            width: '100%', padding: '9px 14px',
                                            background: 'none', border: 'none',
                                            color: '#ccc', cursor: 'pointer', fontSize: 12,
                                            textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                                            borderBottom: '1px solid #1e1e28',
                                        }}
                                    >
                                        <span>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Save Layout */}
                    <button
                        onClick={handleSaveLayout}
                        style={{
                            width: '100%', padding: '8px 12px',
                            background: 'rgba(124,108,248,0.15)',
                            border: '1px solid rgba(124,108,248,0.35)',
                            color: '#a89cf8', borderRadius: 6,
                            cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        }}
                    >Save Layout</button>
                </div>
            </div>
        </div>
    );
}

// ── Reusable Layer Row ────────────────────────────────────────────
function LayerRow({
    label,
    icon,
    visible,
    onToggle,
    available,
    thumbnail,
    iconStyle,
}: {
    label: string;
    icon: string;
    visible: boolean;
    onToggle: () => void;
    available: boolean;
    thumbnail: string | null;
    iconStyle?: React.CSSProperties;
}) {
    const eyeIcon = (v: boolean) => v ? '◉' : '○';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 16px',
            opacity: available ? 1 : 0.4,
        }}>
            <button
                onClick={onToggle}
                disabled={!available}
                style={{
                    background: 'none', border: 'none', cursor: available ? 'pointer' : 'default',
                    padding: 0, color: visible && available ? '#7c6cf8' : '#444',
                    fontSize: 14, lineHeight: 1, flexShrink: 0,
                }}
                title={visible ? `隱藏 ${label}` : `顯示 ${label}`}
            >{eyeIcon(visible && available)}</button>

            {thumbnail ? (
                <div style={{
                    width: 28, height: 28, borderRadius: 4, overflow: 'hidden',
                    background: '#0a0a0f', flexShrink: 0, border: '1px solid #1e1e28',
                }}>
                    <img src={thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            ) : (
                <div style={{
                    width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                    background: '#1a1a22', border: '1px solid #1e1e28',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13,
                    ...(iconStyle || {}),
                }}>
                    {icon}
                </div>
            )}

            <span style={{ fontSize: 12, fontWeight: 600, color: '#ccc', flex: 1 }}>{label}</span>
            {!available && <span style={{ fontSize: 9, color: '#444' }}>none</span>}
        </div>
    );
}

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';

const ELEMENT_TYPES = [
    { key: 'character', label: '角色', icon: '👤', desc: '含背景 + 邊框', defaultCount: 2 },
    { key: 'high', label: '高分符號', icon: '⭐', desc: '高價值物件', defaultCount: 2 },
    { key: 'medium', label: '中分符號', icon: '🔷', desc: '中價值物件', defaultCount: 2 },
    { key: 'special_wild', label: '萬能 (Wild)', icon: '🃏', desc: '特殊 Wild 符號', isSpecial: true, defaultCount: 1 },
    { key: 'special_scatter', label: '分散 (Scatter)', icon: '💫', desc: '特殊 Scatter 符號', isSpecial: true, defaultCount: 1 },
    { key: 'special_bonus', label: '獎勵 (Bonus)', icon: '🎁', desc: '特殊 Bonus 符號', isSpecial: true, defaultCount: 1 },
    { key: 'royal', label: '牌面 (A,K,Q,J,10)', icon: '👑', desc: '撲克牌面符號', defaultCount: 5 },
    { key: 'bg', label: '背景圖', icon: '🌆', desc: '16:9 寬螢幕', defaultCount: 1 },
    { key: 'frame', label: '捲軸邊框', icon: '🖼', desc: '中空捲軸框', defaultCount: 1 },
    { key: 'button', label: '按鈕', icon: '🎯', desc: 'SPIN / MAX 按鈕', defaultCount: 2 },
];

type Tab = 'quick' | 'brief';

export default function NewGamePage() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('quick');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const [name, setName] = useState('');
    const [theme, setTheme] = useState('');
    const [styleGuide, setStyleGuide] = useState('');
    const [counts, setCounts] = useState<Record<string, number>>(
        Object.fromEntries(ELEMENT_TYPES.map(e => [e.key, e.defaultCount]))
    );

    const [briefText, setBriefText] = useState(BRIEF_TEMPLATE);
    const [parsedAssets, setParsedAssets] = useState<Array<Record<string, string>> | null>(null);
    const [parsing, setParsing] = useState(false);

    async function handleCreateQuick() {
        if (!name.trim()) { setError('請輸入遊戲名稱'); return; }
        if (!theme.trim()) { setError('請輸入主題'); return; }
        setError(''); setCreating(true);

        try {
            const pRes = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, theme, style_guide: styleGuide }),
            });
            const project = await pRes.json();
            if (project.error) throw new Error(project.error);

            const ROYAL_NAMES = ['A', 'K', 'Q', 'J', '10'];
            for (const et of ELEMENT_TYPES) {
                const count = counts[et.key] || 0;
                if (count === 0) continue;

                for (let i = 0; i < count; i++) {
                    let assetName = '';
                    let element_type = et.key;

                    if (et.key === 'character') { assetName = `角色 ${i + 1}`; element_type = 'character'; }
                    else if (et.key === 'high') { assetName = `高分符號 ${i + 1}`; element_type = 'high'; }
                    else if (et.key === 'medium') { assetName = `中分符號 ${i + 1}`; element_type = 'medium'; }
                    else if (et.key.startsWith('special_')) { assetName = et.label; element_type = 'special'; }
                    else if (et.key === 'royal') { assetName = `牌面 ${ROYAL_NAMES[i] || i + 1}`; element_type = 'royal'; }
                    else if (et.key === 'bg') { assetName = `${theme} 背景`; element_type = 'bg'; }
                    else if (et.key === 'frame') { assetName = `${theme} 捲軸邊框`; element_type = 'frame'; }
                    else if (et.key === 'button') { assetName = i === 0 ? 'SPIN 按鈕' : 'MAX 按鈕'; element_type = 'button'; }

                    await fetch(`/api/projects/${project.id}/assets`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: assetName,
                            element_type,
                            prompt: `${assetName} for ${theme} themed slot game`,
                            value_tier: et.key === 'character' || et.key === 'high' ? 'High' : et.key === 'medium' ? 'Medium' : 'Low',
                        }),
                    });
                }
            }

            router.push(`/projects/${project.id}/design`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '建立失敗');
            setCreating(false);
        }
    }

    async function handleParseBrief() {
        setParsing(true); setError('');
        try {
            const res = await fetch('/api/parse-brief', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ briefText }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setParsedAssets(data.assets);
            if (data.theme && !theme) setTheme(data.theme);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '解析失敗');
        } finally {
            setParsing(false);
        }
    }

    async function handleCreateFromBrief() {
        if (!parsedAssets) return;
        if (!name.trim()) { setError('請輸入遊戲名稱'); return; }
        setCreating(true); setError('');
        try {
            const pRes = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, theme: theme || parsedAssets[0]?.name, style_guide: styleGuide }),
            });
            const project = await pRes.json();
            if (project.error) throw new Error(project.error);

            for (const a of parsedAssets) {
                await fetch(`/api/projects/${project.id}/assets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(a),
                });
            }
            router.push(`/projects/${project.id}/design`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '建立失敗');
            setCreating(false);
        }
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ marginLeft: 180, flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-deep)' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 32px', height: 64, borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}>
                    <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>建立新遊戲</h1>
                </div>

                {/* Tabs */}
                <div style={{ borderBottom: '1px solid var(--border)', padding: '0 32px', background: 'var(--bg-sidebar)' }}>
                    {(['quick', 'brief'] as Tab[]).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '16px 0', marginRight: 32,
                            fontSize: 15, fontWeight: 600,
                            color: tab === t ? 'var(--accent-purple-light)' : 'var(--text-muted)',
                            borderBottom: tab === t ? '3px solid var(--accent-purple)' : '3px solid transparent',
                            transition: 'all 0.2s',
                        }}>
                            {t === 'quick' ? '快速建立' : '匯入文案 (Brief)'}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, overflow: 'auto' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 100px' }}>
                        {tab === 'quick' ? (
                            <QuickStartTab
                                name={name} setName={setName}
                                theme={theme} setTheme={setTheme}
                                styleGuide={styleGuide} setStyleGuide={setStyleGuide}
                                counts={counts} setCounts={setCounts}
                                creating={creating} error={error}
                                onSubmit={handleCreateQuick}
                            />
                        ) : (
                            <BriefTab
                                name={name} setName={setName}
                                theme={theme} setTheme={setTheme}
                                styleGuide={styleGuide} setStyleGuide={setStyleGuide}
                                briefText={briefText} setBriefText={setBriefText}
                                parsedAssets={parsedAssets}
                                parsing={parsing} creating={creating} error={error}
                                onParse={handleParseBrief}
                                onSubmit={handleCreateFromBrief}
                            />
                        )}
                    </div>
                </div>

                {/* 底部操作固定列 */}
                <div style={{
                    position: 'fixed', bottom: 0, right: 0, left: 180,
                    padding: '16px 32px', background: 'var(--bg-sidebar)',
                    borderTop: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                    backdropFilter: 'blur(10px)', zIndex: 50,
                }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn-ghost" style={{ padding: '10px 24px' }} onClick={() => history.back()}>取消</button>
                        <button className="btn-primary" style={{ padding: '10px 32px', minWidth: 140 }} onClick={tab === 'quick' ? handleCreateQuick : handleCreateFromBrief} disabled={creating || (tab === 'brief' && !parsedAssets)}>
                            {creating ? '建立中...' : '建立遊戲'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

function QuickStartTab({ name, setName, theme, setTheme, styleGuide, setStyleGuide, counts, setCounts, creating, error }: Record<string, unknown> & {
    name: string; setName: (v: string) => void;
    theme: string; setTheme: (v: string) => void;
    styleGuide: string; setStyleGuide: (v: string) => void;
    counts: Record<string, number>; setCounts: (v: Record<string, number>) => void;
    creating: boolean; error: string;
}) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 380px', gap: 40 }}>
            {/* 左側：基本設定 */}
            <div>
                <div className="card" style={{ padding: 28, position: 'sticky', top: 0 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', color: 'var(--text-primary)' }}>遊戲基本設定</h2>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>遊戲名稱</label>
                        <input className="input-field" placeholder="輸入老虎機遊戲名稱..." value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>主題 <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                        <input className="input-field" placeholder="例：古埃及、外太空、中國神話..." value={theme} onChange={e => setTheme(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>風格指南</label>
                        <textarea className="input-field" placeholder="例：明亮光澤、鮮豔色彩、半 3D 光影..." value={styleGuide} onChange={e => setStyleGuide(e.target.value)} style={{ height: 120 }} />
                    </div>
                    {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '12px', fontSize: 14, color: 'var(--accent-red)', marginTop: 24 }}>{error}</div>}
                </div>
            </div>

            {/* 右側：資產計數 */}
            <div>
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>選擇要生成的元素數量</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {ELEMENT_TYPES.map(et => (
                            <div key={et.key} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 0', borderBottom: '1px solid var(--border)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 20 }}>{et.icon}</span>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{et.label}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{et.desc}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <button className="btn-ghost" style={{ width: 32, height: 32, padding: 0, justifyContent: 'center', fontSize: 18, borderRadius: 8 }}
                                        onClick={() => setCounts({ ...counts, [et.key]: Math.max(0, (counts[et.key] || 0) - 1) })}>−</button>
                                    <span style={{ fontSize: 15, fontWeight: 700, minWidth: 24, textAlign: 'center', color: 'var(--accent-purple-light)' }}>{counts[et.key] || 0}</span>
                                    <button className="btn-ghost" style={{ width: 32, height: 32, padding: 0, justifyContent: 'center', fontSize: 18, borderRadius: 8 }}
                                        onClick={() => setCounts({ ...counts, [et.key]: (counts[et.key] || 0) + 1 })}>+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function BriefTab({ name, setName, theme, setTheme, styleGuide, setStyleGuide, briefText, setBriefText, parsedAssets, parsing, creating, error, onParse, onSubmit }: Record<string, unknown> & {
    name: string; setName: (v: string) => void;
    theme: string; setTheme: (v: string) => void;
    styleGuide: string; setStyleGuide: (v: string) => void;
    briefText: string; setBriefText: (v: string) => void;
    parsedAssets: Array<Record<string, string>> | null;
    parsing: boolean; creating: boolean; error: string;
    onParse: () => void; onSubmit: () => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [importFileName, setImportFileName] = useState('');

    async function handleImportExcel(file: File) {
        setImporting(true);
        setImportFileName(file.name);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/parse-excel', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setBriefText(data.briefText);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : '導入失敗，請確認文件格式');
            setImportFileName('');
        } finally {
            setImporting(false);
        }
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 40 }}>
            {/* 文案輸入 */}
            <div>
                <div className="card" style={{ padding: 24 }}>
                    {/* 工具列：標籤 + 瀏覽文件 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>貼上遊戲美術企劃文案 (Brief)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {importFileName && !importing && (
                                <span style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 500 }}>
                                    ✓ {importFileName}
                                </span>
                            )}
                            <button
                                className="btn-ghost"
                                style={{ padding: '6px 14px', fontSize: 13 }}
                                disabled={importing}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {importing ? '⏳ 分析中...' : '📂 瀏覽文件'}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                style={{ display: 'none' }}
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImportExcel(file);
                                    e.target.value = '';
                                }}
                            />
                        </div>
                    </div>
                    <textarea
                        className="input-field"
                        value={briefText}
                        onChange={e => setBriefText(e.target.value)}
                        style={{ height: 600, fontFamily: 'var(--font-geist-mono)', fontSize: 13, resize: 'none', lineHeight: 1.6 }}
                    />
                    <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>
                            空白 ・ 簡易 ・ <span style={{ color: 'var(--accent-purple-light)', fontWeight: 700 }}>詳細風格系統</span>
                        </span>
                        <button className="btn-primary" style={{ padding: '10px 24px' }} onClick={onParse} disabled={parsing}>
                            {parsing ? '正在理解文案...' : '🤖 AI 深度解析並建立資產清單'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 右側：覆蓋與結果 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, fontWeight: 700, textTransform: 'uppercase' }}>覆蓋與修正</div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>遊戲名稱</label>
                        <input className="input-field" placeholder="輸入遊戲名稱..." value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>主題</label>
                        <input className="input-field" value={theme} onChange={e => setTheme(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>風格指南</label>
                        <textarea className="input-field" value={styleGuide} onChange={e => setStyleGuide(e.target.value)} style={{ height: 80 }} />
                    </div>
                </div>

                {parsedAssets && (
                    <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--accent-green)' }}>
                        <div style={{ fontSize: 14, color: 'var(--accent-green)', marginBottom: 16, fontWeight: 700 }}>✓ AI 解析完成（已識別 {parsedAssets.length} 個元素）</div>
                        <div style={{ maxHeight: 300, overflow: 'auto', paddingRight: 4 }}>
                            {parsedAssets.map((a, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>{a.name}</span>
                                    <span className={`badge badge-${a.element_type}`} style={{ transform: 'scale(0.9)' }}>{a.element_type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)', borderRadius: 12, padding: '16px', fontSize: 14, color: 'var(--accent-red)' }}>{error}</div>}
            </div>
        </div>
    );
}

const BRIEF_TEMPLATE = `老虎機遊戲美術企劃 (SLOT GAME ART ASSET BRIEF)

Theme: [你的遊戲主題]

GAME TITLE (1)
標題文字：[遊戲名稱]
[描述標題的字型風格、材質、裝飾元素]

REEL FRAME (1)
[描述捲軸邊框的建築風格、材質、裝飾圖案]

BACKGROUND (1)
[描述背景場景：環境、地標、氛圍、光線、景深]

SPIN BUTTON (1)
[描述 SPIN 按鈕的形狀、材質、中心圖案、裝飾細節]

CHARACTER SET (2)
角色 1 — [名稱]
[描述角色1：外觀、服裝、姿勢、視覺特徵]

角色 2 — [名稱]
[描述角色2]

HIGH SYMBOLS (3)
高分1 — [名稱/物件]：[描述]
高分2 — [名稱/物件]：[描述]
高分3 — [名稱/物件]：[描述]

SPECIAL SYMBOLS
Wild：[描述 Wild 符號設計]
Scatter：[描述 Scatter 符號設計]

ROYALS
標準撲克牌面 A、K、Q、J、10，採用 [Your Theme] 主題風格`;

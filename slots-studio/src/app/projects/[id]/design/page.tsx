'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import ConfigureTab from './components/ConfigureTab';
import PreviewTabFull from './components/PreviewTab';

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
    prompt: string;      // legacy
    base_prompt: string; // 主體通道提示詞
    vfx_prompt: string;  // 特效通道提示詞
    value_tier: string;
    magic_layers: MagicLayer[];
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

type Tab = '設計' | '配置' | '設定' | '預覽' | '下載';

export default function DesignPage() {
    const { id: projectId } = useParams();
    const [activeTab, setActiveTab] = useState<Tab>('設計');
    const [project, setProject] = useState<Project | null>(null);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // 加載資料
    async function loadData() {
        try {
            const [pRes, aRes] = await Promise.all([
                fetch(`/api/projects/${projectId}`),
                fetch(`/api/projects/${projectId}/assets`)
            ]);
            const pData = await pRes.json();
            const aData = await aRes.json();
            setProject(pData && !pData.error ? pData : null);
            setAssets(Array.isArray(aData) ? aData : []);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('加載設計頁面失敗:', msg);
            // The original instruction's `return NextResponse.json(...)` is a server-side construct
            // and cannot be placed in a client-side React component.
            // Keeping the original client-side error handling for syntactic correctness.
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadData(); }, [projectId]);

    async function handleDelete(assetId: string) {
        if (!window.confirm('確定要刪除這個資產嗎？此操作無法復原。')) return;
        try {
            const res = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('刪除失敗');
            setAssets(prev => prev.filter(a => a.id !== assetId));
            if (selectedAssetId === assetId) setSelectedAssetId(null);
        } catch (err) {
            console.error('刪除資產失敗:', err);
            alert('刪除失敗，請稍後再試');
        }
    }

    // 重新加載單一資產（magic layers 更新後用）
    async function refreshAsset(assetId: string) {
        try {
            const res = await fetch(`/api/projects/${projectId}/assets`);
            const data = await res.json();
            if (Array.isArray(data)) setAssets(data);
        } catch { /* silent */ }
    }

    async function handleGenerate(assetId: string) {
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'generating' } : a));
        try {
            const res = await fetch(`/api/assets/${assetId}/generate-base`, { method: 'POST' }); // 僅生成主體，強制排除特效
            const data = await res.json();
            
            if (!res.ok || data.error) {
                console.error('生成失敗:', data.error || '未知錯誤');
                setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'failed' } : a));
                return;
            }
            
            setAssets(prev => prev.map(a => a.id === assetId ? data : a));
        } catch (err) {
            console.error('生成發生異常:', err);
            setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'failed' } : a));
        }
    }

    if (loading) return <div style={{ background: 'var(--bg-deep)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>載入中...</div>;

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ marginLeft: 180, flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-deep)' }}>
                {/* Top Header */}
                <div style={{
                    height: 64, borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 32px', background: 'var(--bg-sidebar)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ background: 'var(--bg-hover)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{project?.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--accent-purple-light)', fontWeight: 600 }}>{project?.theme}</div>
                        </div>

                        <nav style={{ display: 'flex', gap: 8, background: 'var(--bg-deep)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
                            {(['設計', '配置', '設定', '預覽', '下載'] as Tab[]).map((tab) => (
                                <div key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                        cursor: 'pointer',
                                        background: activeTab === tab ? 'var(--bg-sidebar)' : 'transparent',
                                        boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                                        color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                                        transition: 'all 0.2s',
                                    }}>{tab}</div>
                            ))}
                        </nav>
                    </div>

                    {activeTab === '設計' && (
                        <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }} onClick={() => setShowAddModal(true)}>
                            + 新增元素
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {activeTab === '設計' && (
                        <DesignGrid
                            assets={assets}
                            selectedAssetId={selectedAssetId}
                            setSelectedAssetId={setSelectedAssetId}
                            handleGenerate={handleGenerate}
                            handleDelete={handleDelete}
                            project={project!}
                            onRefreshAsset={refreshAsset}
                        />
                    )}
                    {activeTab === '配置' && project && (
                        <ConfigureTab
                            projectId={projectId as string}
                            gridCols={project.grid_cols}
                            gridRows={project.grid_rows}
                        />
                    )}
                    {activeTab === '設定' && (
                        <SettingsTab project={project!} setProject={setProject} />
                    )}
                    {activeTab === '預覽' && (
                        <PreviewTabFull project={project!} assets={assets} />
                    )}
                    {activeTab === '下載' && (
                        <DownloadTab project={project!} assets={assets} />
                    )}
                </div>
            </main>

            {/* Add Element Modal */}
            {showAddModal && (
                <AddElementModal
                    projectId={projectId as string}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}

// 子組件：設計網格
function DesignGrid({ assets, selectedAssetId, setSelectedAssetId, handleGenerate, handleDelete, project, onRefreshAsset }: any) {
    const selectedAsset = assets.find((a: any) => a.id === selectedAssetId);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [lightboxAssetId, setLightboxAssetId] = useState<string | null>(null);
    const lightboxAsset = assets.find((a: any) => a.id === lightboxAssetId) || null;

    // 組合式生成：雙通道提示詞 state（切換資產時同步重置）
    const [editedBasePrompt, setEditedBasePrompt] = useState('');
    const [editedVfxPrompt, setEditedVfxPrompt] = useState('');
    const [generatingChannel, setGeneratingChannel] = useState<'base' | 'vfx' | null>(null);

    useEffect(() => {
        // base_prompt 優先；fallback 到舊 prompt 欄位保持向下相容
        setEditedBasePrompt(selectedAsset?.base_prompt || selectedAsset?.prompt || '');
        setEditedVfxPrompt(selectedAsset?.vfx_prompt || '');
    }, [selectedAssetId]);

    // 儲存 base_prompt（失焦自動存）
    async function handleSaveBasePrompt() {
        if (!selectedAsset || editedBasePrompt === (selectedAsset.base_prompt || selectedAsset.prompt)) return;
        try {
            await fetch(`/api/assets/${selectedAsset.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base_prompt: editedBasePrompt }),
            });
        } catch (e) { console.error('保存主體提示詞失敗:', e); }
    }

    // 儲存 vfx_prompt（失焦自動存）
    async function handleSaveVfxPrompt() {
        if (!selectedAsset || editedVfxPrompt === selectedAsset.vfx_prompt) return;
        try {
            await fetch(`/api/assets/${selectedAsset.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vfx_prompt: editedVfxPrompt }),
            });
        } catch (e) { console.error('保存特效提示詞失敗:', e); }
    }

    // 生成主體通道（儲存提示詞 → 呼叫 generate-base → 自動去背 → 刷新）
    async function handleGenerateBase() {
        if (!selectedAsset) return;
        setGeneratingChannel('base');
        try {
            if (editedBasePrompt !== (selectedAsset.base_prompt || selectedAsset.prompt)) {
                await fetch(`/api/assets/${selectedAsset.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base_prompt: editedBasePrompt }),
                });
            }
            const res = await fetch(`/api/assets/${selectedAsset.id}/generate-base`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok || data.error) console.error('主體生成失敗:', data.error);
            await onRefreshAsset(selectedAsset.id);
        } catch (e) {
            console.error('主體生成異常:', e);
        } finally {
            setGeneratingChannel(null);
        }
    }

    // 生成特效通道（儲存提示詞 → 呼叫 generate-vfx → 存為 vfx 圖層，若有 no_bg 自動拆分 vfx_front/vfx_back → 刷新）
    async function handleGenerateVfx() {
        if (!selectedAsset) return;
        setGeneratingChannel('vfx');
        try {
            if (editedVfxPrompt !== selectedAsset.vfx_prompt) {
                await fetch(`/api/assets/${selectedAsset.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ vfx_prompt: editedVfxPrompt }),
                });
            }
            const res = await fetch(`/api/assets/${selectedAsset.id}/generate-vfx`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok || data.error) console.error('特效生成失敗:', data.error);
            await onRefreshAsset(selectedAsset.id);
        } catch (e) {
            console.error('特效生成異常:', e);
        } finally {
            setGeneratingChannel(null);
        }
    }

    return (
        <>
            <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
                <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>遊戲元素管理</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>共 {assets.length} 個資產</div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: 20,
                }}>
                    {assets.map((asset: any) => (
                        <div key={asset.id}
                            onClick={() => setSelectedAssetId(asset.id)}
                            onMouseEnter={() => setHoveredId(asset.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            style={{
                                aspectRatio: '1 / 1.1',
                                background: selectedAssetId === asset.id ? 'var(--bg-hover)' : 'var(--bg-sidebar)',
                                borderRadius: 16,
                                border: `2px solid ${selectedAssetId === asset.id ? 'var(--accent-purple)' : 'transparent'}`,
                                cursor: 'pointer',
                                overflow: 'visible',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.2s',
                                boxShadow: selectedAssetId === asset.id ? '0 8px 24px rgba(124, 58, 237, 0.2)' : 'none',
                                position: 'relative',
                            }}>
                            {/* 刪除按鈕（hover 顯示） */}
                            <button
                                onClick={e => { e.stopPropagation(); handleDelete(asset.id); }}
                                style={{
                                    position: 'absolute', top: -8, right: -8, zIndex: 30,
                                    width: 22, height: 22, borderRadius: '50%',
                                    background: '#ef4444',
                                    border: '2px solid #0f0f11', cursor: 'pointer', color: '#fff',
                                    fontSize: 11, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: hoveredId === asset.id ? 1 : 0,
                                    transition: 'opacity 0.15s',
                                    pointerEvents: hoveredId === asset.id ? 'auto' : 'none',
                                }}
                                title="刪除資產"
                            >✕</button>
                            <div style={{ flex: 1, background: '#111', position: 'relative', borderRadius: 12, margin: 8, overflow: 'hidden' }}>
                                {asset.image_path ? (
                                    <img src={asset.image_path} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 24, gap: 8 }}>
                                        <span style={{ opacity: 0.3 }}>{asset.status === 'generating' ? '⏳' : '🖼'}</span>
                                        {asset.status === 'generating' && <div style={{ fontSize: 10, color: 'var(--accent-purple-light)', fontWeight: 700 }}>生成中...</div>}
                                    </div>
                                )}
                                {/* 放大按鈕（有圖且 hover 時顯示） */}
                                {asset.image_path && hoveredId === asset.id && (
                                    <button
                                        onClick={e => { e.stopPropagation(); setLightboxAssetId(asset.id); }}
                                        style={{
                                            position: 'absolute', top: 6, right: 6, zIndex: 20,
                                            width: 28, height: 28, borderRadius: 6,
                                            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            cursor: 'pointer', color: '#fff', fontSize: 14,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                        title="查看大圖"
                                    >⛶</button>
                                )}
                                {!asset.image_path && asset.status !== 'generating' && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', opacity: hoveredId === asset.id ? 1 : 0, transition: 'opacity 0.2s' }}>
                                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); handleGenerate(asset.id); }}>⚡ 生成</button>
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: '0 12px 12px' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</div>
                                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                    <span className={`badge badge-${asset.element_type}`} style={{ fontSize: 9 }}>{asset.element_type}</span>
                                    {asset.value_tier !== 'Low' && <span className="badge" style={{ fontSize: 9, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-gold)' }}>{asset.value_tier}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedAsset && (
                <div style={{
                    width: 380, background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', padding: 24, overflowY: 'auto'
                }}>
                    {/* 預覽縮圖：顯示組合式疊加結果（主體去背 + 特效 screen 疊合） */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div
                            style={{ width: 100, height: 100, borderRadius: 12, background: 'repeating-conic-gradient(#1a1a20 0% 25%, #222228 0% 50%) 0 0 / 10px 10px', overflow: 'hidden', cursor: selectedAsset.image_path ? 'zoom-in' : 'default', position: 'relative', flexShrink: 0 }}
                            onClick={() => { if (selectedAsset.image_path) setLightboxAssetId(selectedAsset.id); }}
                            title={selectedAsset.image_path ? '點擊查看大圖與圖層管理' : ''}
                        >
                            {selectedAsset.magic_layers?.find((l: MagicLayer) => l.layer_type === 'no_bg')
                                ? <img src={selectedAsset.magic_layers.find((l: MagicLayer) => l.layer_type === 'no_bg')!.image_path} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                : selectedAsset.image_path
                                    ? <img src={selectedAsset.image_path} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : null
                            }
                            {selectedAsset.magic_layers?.find((l: MagicLayer) => l.layer_type === 'vfx') && (
                                <img src={selectedAsset.magic_layers.find((l: MagicLayer) => l.layer_type === 'vfx')!.image_path} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'screen' }} />
                            )}
                            {generatingChannel && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--accent-purple-light)', fontWeight: 700 }}>
                                    {generatingChannel === 'base' ? '生成主體...' : '生成特效...'}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 16 }}>{selectedAsset.name}</h3>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>ID: {selectedAsset.id.slice(0, 8)}</p>
                            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                                {selectedAsset.image_path && <span style={{ fontSize: 9, background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderRadius: 3, padding: '1px 5px' }}>主體 ✓</span>}
                                {selectedAsset.magic_layers?.find((l: MagicLayer) => l.layer_type === 'no_bg') && <span style={{ fontSize: 9, background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderRadius: 3, padding: '1px 5px' }}>去背 ✓</span>}
                                {selectedAsset.magic_layers?.find((l: MagicLayer) => l.layer_type === 'vfx') && <span style={{ fontSize: 9, background: 'rgba(124,58,237,0.2)', color: 'var(--accent-purple-light)', borderRadius: 3, padding: '1px 5px' }}>特效 ✓</span>}
                            </div>
                        </div>
                    </div>

                    {/* 組合式生成 — 主體通道 */}
                    <div style={{ marginBottom: 16, padding: 16, background: 'var(--bg-deep)', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <span style={{ fontSize: 14 }}>🏛</span>
                            <label style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>主體提示詞 (Base)</label>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>自動加入：白底、無特效</span>
                        </div>
                        <textarea
                            className="input-field"
                            value={editedBasePrompt}
                            onChange={e => setEditedBasePrompt(e.target.value)}
                            onBlur={handleSaveBasePrompt}
                            placeholder="描述主體物件（角色、符號、道具等）..."
                            style={{ height: 80, fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}
                        />
                        <button
                            className="btn-primary"
                            style={{ width: '100%', padding: '8px', fontSize: 13, fontWeight: 700 }}
                            onClick={handleGenerateBase}
                            disabled={generatingChannel !== null}
                        >
                            {generatingChannel === 'base' ? '⏳ 生成主體中...' : '⚡ 重新生成主體'}
                        </button>
                    </div>

                    {/* 組合式生成 — 特效通道 */}
                    <div style={{ marginBottom: 20, padding: 16, background: 'rgba(124,58,237,0.06)', borderRadius: 12, border: '1px solid rgba(124,58,237,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <span style={{ fontSize: 14 }}>✨</span>
                            <label style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-purple-light)' }}>特效提示詞 (VFX)</label>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>自動加入：純黑底、純特效</span>
                        </div>
                        <textarea
                            className="input-field"
                            value={editedVfxPrompt}
                            onChange={e => setEditedVfxPrompt(e.target.value)}
                            onBlur={handleSaveVfxPrompt}
                            placeholder="描述特效類型（發光、粒子、魔法陣、能量波等）..."
                            style={{ height: 80, fontSize: 12, lineHeight: 1.5, marginBottom: 8, borderColor: 'rgba(124,58,237,0.3)' }}
                        />
                        <button
                            style={{
                                width: '100%', padding: '8px', fontSize: 13, fontWeight: 700,
                                background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)',
                                color: 'var(--accent-purple-light)', borderRadius: 8,
                                cursor: generatingChannel !== null ? 'not-allowed' : 'pointer',
                                opacity: generatingChannel !== null ? 0.6 : 1,
                            }}
                            onClick={handleGenerateVfx}
                            disabled={generatingChannel !== null}
                        >
                            {generatingChannel === 'vfx' ? '⏳ 生成特效中...' : '✨ 重新生成特效'}
                        </button>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <button className="btn-ghost" style={{ width: '100%', color: 'var(--accent-red)' }} onClick={() => handleDelete(selectedAsset.id)}>🗑 刪除資產</button>
                    </div>
                </div>
            )}

            {/* 大圖 Lightbox */}
            {lightboxAsset && (
                <ImageLightbox
                    asset={lightboxAsset}
                    onClose={() => setLightboxAssetId(null)}
                    onRegenerate={() => { handleGenerate(lightboxAsset.id); setLightboxAssetId(null); }}
                    onLayerGenerated={(assetId: string) => onRefreshAsset(assetId)}
                />
            )}
        </>
    );
}

// 圖層的顯示設定
const LAYER_META: Record<string, { label: string; sublabel: string; badge?: string; bgPreview: string; bgCanvas: string }> = {
    composite:  { label: '合成預覽',  sublabel: '主體 + 特效',        badge: '組合式',   bgPreview: 'repeating-conic-gradient(#1a1a20 0% 25%, #222228 0% 50%) 0 0 / 8px 8px', bgCanvas: 'repeating-conic-gradient(#111118 0% 25%, #1a1a22 0% 50%) 0 0 / 24px 24px' },
    main:       { label: '主體圖',    sublabel: '原始生成',           bgPreview: '#222',  bgCanvas: '#0f0f13' },
    no_bg:      { label: '去背主體',  sublabel: '透明 PNG',           badge: '透明背景',  bgPreview: 'repeating-conic-gradient(#333 0% 25%, #555 0% 50%) 0 0 / 8px 8px', bgCanvas: 'repeating-conic-gradient(#1e1e24 0% 25%, #2a2a30 0% 50%) 0 0 / 20px 20px' },
    glow:       { label: '發光層',    sublabel: 'Screen 疊合',        badge: '外發光',    bgPreview: '#000',  bgCanvas: '#000' },
    shadow:     { label: '陰影層',    sublabel: 'Multiply 疊合',      badge: '落地陰影',  bgPreview: '#fff',  bgCanvas: '#fff' },
    vfx:        { label: '特效層',    sublabel: 'Screen 疊合',        badge: '完整特效',  bgPreview: '#050510', bgCanvas: '#020208' },
    vfx_front:  { label: '前景特效',  sublabel: '人物上方 · Screen',  badge: '前景',      bgPreview: '#050510', bgCanvas: '#020208' },
    vfx_back:   { label: '後景特效',  sublabel: '人物後方 · Screen',  badge: '後景',      bgPreview: '#050510', bgCanvas: '#020208' },
};

function ImageLightbox({ asset, onClose, onRegenerate, onLayerGenerated }: {
    asset: any;
    onClose: () => void;
    onRegenerate: () => void;
    onLayerGenerated: (assetId: string) => void;
}) {
    const [viewingLayer, setViewingLayer] = useState<string>('composite');
    const [removingBg, setRemovingBg] = useState(false);
    const [generatingLayer, setGeneratingLayer] = useState<string | null>(null);
    const [extractingVfx, setExtractingVfx] = useState(false);
    const [deletingLayer, setDeletingLayer] = useState<string | null>(null);
    const [layerError, setLayerError] = useState('');

    const noBgLayer      = asset.magic_layers?.find((l: MagicLayer) => l.layer_type === 'no_bg');
    const glowLayer      = asset.magic_layers?.find((l: MagicLayer) => l.layer_type === 'glow');
    const shadowLayer    = asset.magic_layers?.find((l: MagicLayer) => l.layer_type === 'shadow');
    const vfxLayer       = asset.magic_layers?.find((l: MagicLayer) => l.layer_type === 'vfx');
    const vfxFrontLayer  = asset.magic_layers?.find((l: MagicLayer) => l.layer_type === 'vfx_front');
    const vfxBackLayer   = asset.magic_layers?.find((l: MagicLayer) => l.layer_type === 'vfx_back');
    const canComposite = !!(asset.image_path);

    // 根據當前選取的圖層決定展示圖片路徑（composite 由獨立 JSX 處理）
    function getDisplayImage(): string {
        if (viewingLayer === 'no_bg'       && noBgLayer)      return noBgLayer.image_path;
        if (viewingLayer === 'glow'        && glowLayer)      return glowLayer.image_path;
        if (viewingLayer === 'shadow'      && shadowLayer)    return shadowLayer.image_path;
        if (viewingLayer === 'vfx'         && vfxLayer)       return vfxLayer.image_path;
        if (viewingLayer === 'vfx_front'   && vfxFrontLayer)  return vfxFrontLayer.image_path;
        if (viewingLayer === 'vfx_back'    && vfxBackLayer)   return vfxBackLayer.image_path;
        return asset.image_path;
    }
    const displayImage = getDisplayImage();
    const currentMeta = LAYER_META[viewingLayer] ?? LAYER_META.composite;

    // ESC 鍵關閉
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    async function handleRemoveBg() {
        setRemovingBg(true); setLayerError('');
        console.log('[Lightbox] 開始去背，asset.id:', asset.id, '  image_path:', asset.image_path);
        try {
            const res = await fetch(`/api/assets/${asset.id}/remove-bg`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || '移除失敗');
            onLayerGenerated(asset.id);
            setViewingLayer('no_bg');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : '移除背景失敗';
            console.error('[Lightbox] ❌ 去背失敗:', msg, '  asset.id:', asset.id);
            setLayerError(msg);
        } finally {
            setRemovingBg(false);
        }
    }

    async function handleDeleteLayer(layerType: string) {
        if (!window.confirm(`確定要刪除「${LAYER_META[layerType]?.label ?? layerType}」圖層嗎？`)) return;
        setDeletingLayer(layerType); setLayerError('');
        try {
            const res = await fetch(`/api/assets/${asset.id}/layers/${layerType}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || '刪除失敗');
            // 若刪除的是當前查看圖層，切換回 composite
            if (viewingLayer === layerType) setViewingLayer('composite');
            onLayerGenerated(asset.id);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : '刪除圖層失敗';
            setLayerError(msg);
        } finally {
            setDeletingLayer(null);
        }
    }

    async function handleGenerateLayer(layerType: 'glow' | 'shadow') {
        setGeneratingLayer(layerType); setLayerError('');
        console.log(`[Lightbox] 開始生成 ${layerType} 圖層，asset.id:`, asset.id);
        try {
            const res = await fetch(`/api/assets/${asset.id}/generate-layer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ layer_type: layerType }),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || '生成失敗');
            onLayerGenerated(asset.id);
            setViewingLayer(layerType); // 自動切換到新圖層
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : `${layerType} 圖層生成失敗`;
            console.error(`[Lightbox] ❌ ${layerType} 圖層生成失敗:`, msg, '  asset.id:', asset.id);
            setLayerError(msg);
        } finally {
            setGeneratingLayer(null);
        }
    }

    async function handleExtractVfx() {
        setExtractingVfx(true); setLayerError('');
        console.log('[Lightbox] 開始分離特效層，asset.id:', asset.id);
        try {
            const res = await fetch(`/api/assets/${asset.id}/extract-vfx`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || '特效分離失敗');
            onLayerGenerated(asset.id);
            setViewingLayer('vfx');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : '特效分離失敗';
            console.error('[Lightbox] ❌ 特效分離失敗:', msg, '  asset.id:', asset.id);
            setLayerError(msg);
        } finally {
            setExtractingVfx(false);
        }
    }

    function handleDownload(imagePath: string, suffix: string) {
        const a = document.createElement('a');
        a.href = imagePath;
        a.download = `${asset.name}_${suffix}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // 左側面板的圖層列表定義（動態根據已有圖層顯示）
    // deletable: composite/main 不可刪，其餘 magic layers 可刪
    const layerItems = [
        { key: 'composite',  image: noBgLayer?.image_path ?? asset.image_path, available: canComposite,    deletable: false },
        { key: 'main',       image: asset.image_path,           available: !!asset.image_path,             deletable: false },
        { key: 'no_bg',      image: noBgLayer?.image_path,      available: !!noBgLayer,                    deletable: true },
        { key: 'glow',       image: glowLayer?.image_path,      available: !!glowLayer,                    deletable: true },
        { key: 'shadow',     image: shadowLayer?.image_path,    available: !!shadowLayer,                  deletable: true },
        { key: 'vfx',        image: vfxLayer?.image_path,       available: !!vfxLayer,                     deletable: true },
        { key: 'vfx_front',  image: vfxFrontLayer?.image_path,  available: !!vfxFrontLayer,                deletable: true },
        { key: 'vfx_back',   image: vfxBackLayer?.image_path,   available: !!vfxBackLayer,                 deletable: true },
    ].filter(l => l.available);

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            {/* 主容器：左側面板 + 中央圖片 */}
            <div onClick={e => e.stopPropagation()} style={{
                display: 'flex', gap: 0, alignItems: 'stretch',
                maxWidth: '95vw', maxHeight: '92vh',
                background: '#1a1a1f', borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.1)',
                overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.9)',
            }}>
                {/* 左側：圖層面板 */}
                <div style={{
                    width: 210, background: '#111116', borderRight: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', flexDirection: 'column', padding: '20px 0', overflowY: 'auto',
                }}>
                    <div style={{ padding: '0 16px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        圖層 ({layerItems.length})
                    </div>

                    {/* 已有圖層列表 */}
                    {layerItems.map(layer => {
                        const meta = LAYER_META[layer.key];
                        const isActive = viewingLayer === layer.key;
                        const isDeleting = deletingLayer === layer.key;
                        return (
                            <div key={layer.key}
                                onClick={() => setViewingLayer(layer.key)}
                                style={{
                                    padding: '8px 12px 8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                    background: isActive ? 'rgba(124,58,237,0.15)' : 'transparent',
                                    borderLeft: isActive ? '3px solid var(--accent-purple)' : '3px solid transparent',
                                    transition: 'background 0.15s',
                                    position: 'relative',
                                }}
                                className="layer-item-row"
                            >
                                <div style={{
                                    width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
                                    background: meta.bgPreview,
                                }}>
                                    {layer.image && <img src={layer.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{meta.label}</div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{meta.sublabel}</div>
                                </div>
                                {/* 刪除按鈕（僅可刪除的圖層顯示） */}
                                {layer.deletable && (
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDeleteLayer(layer.key); }}
                                        disabled={isDeleting || deletingLayer !== null}
                                        title={`刪除 ${meta.label}`}
                                        style={{
                                            flexShrink: 0,
                                            width: 22, height: 22,
                                            borderRadius: 4, border: 'none',
                                            background: isDeleting ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.0)',
                                            color: isDeleting ? '#f87171' : 'rgba(255,255,255,0.25)',
                                            fontSize: 14, lineHeight: '22px', textAlign: 'center',
                                            cursor: deletingLayer ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.15s',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                        onMouseEnter={e => {
                                            if (!deletingLayer) {
                                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.2)';
                                                (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isDeleting) {
                                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.0)';
                                                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)';
                                            }
                                        }}
                                    >
                                        {isDeleting ? '…' : '×'}
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* 分層操作區塊 */}
                    <div style={{ margin: '16px 16px 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>
                            生成圖層
                        </div>

                        {/* 去背按鈕 */}
                        <button
                            className="btn-ghost"
                            style={{
                                width: '100%', padding: '8px 10px', fontSize: 12,
                                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                                opacity: (removingBg || generatingLayer !== null) ? 0.6 : 1,
                                cursor: (removingBg || generatingLayer !== null) ? 'not-allowed' : 'pointer',
                            }}
                            onClick={handleRemoveBg}
                            disabled={removingBg || generatingLayer !== null}
                        >
                            {removingBg ? '⏳ 處理中...' : (noBgLayer ? '🔄 重新去背' : '✂️ 移除背景')}
                        </button>

                        {/* 發光層生成 */}
                        <button
                            className="btn-ghost"
                            style={{
                                width: '100%', padding: '8px 10px', fontSize: 12,
                                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                                opacity: (noBgLayer && !generatingLayer) ? 1 : 0.4,
                                cursor: (!noBgLayer || generatingLayer) ? 'not-allowed' : 'pointer',
                            }}
                            onClick={() => handleGenerateLayer('glow')}
                            disabled={!noBgLayer || !!generatingLayer}
                        >
                            {generatingLayer === 'glow' ? '⏳ 生成中...' : (glowLayer ? '🔄 重新生成發光' : '🔆 生成發光層')}
                        </button>

                        {/* 陰影層生成 */}
                        <button
                            className="btn-ghost"
                            style={{
                                width: '100%', padding: '8px 10px', fontSize: 12,
                                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                                opacity: (noBgLayer && !generatingLayer) ? 1 : 0.4,
                                cursor: (!noBgLayer || generatingLayer) ? 'not-allowed' : 'pointer',
                            }}
                            onClick={() => handleGenerateLayer('shadow')}
                            disabled={!noBgLayer || !!generatingLayer}
                        >
                            {generatingLayer === 'shadow' ? '⏳ 生成中...' : (shadowLayer ? '🔄 重新生成陰影' : '🌑 生成陰影層')}
                        </button>

                        {/* 分離特效層按鈕（有 no_bg 時自動分割前/後景） */}
                        <button
                            className="btn-ghost"
                            style={{
                                width: '100%', padding: '8px 10px', fontSize: 12,
                                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6,
                                opacity: (asset.image_path && !extractingVfx && !removingBg) ? 1 : 0.4,
                                cursor: (!asset.image_path || extractingVfx || removingBg) ? 'not-allowed' : 'pointer',
                            }}
                            onClick={() => asset.image_path && handleExtractVfx()}
                            disabled={!asset.image_path || extractingVfx || removingBg}
                            title={noBgLayer ? '將自動分割前景/後景特效' : '建議先去背，可自動分割前/後景'}
                        >
                            {extractingVfx ? '⏳ 分離中...' : (vfxLayer ? '🔄 重新分離特效' : '✨ 分離特效層')}
                        </button>

                        {layerError && <div style={{ fontSize: 11, color: 'var(--accent-red)', marginTop: 8, lineHeight: 1.4 }}>{layerError}</div>}
                    </div>
                </div>

                {/* 中央：圖片 + 頂部工具列 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {/* 頂部工具列 */}
                    <div style={{
                        height: 52, borderBottom: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0 20px', flexShrink: 0,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{asset.name}</span>
                            <span className={`badge badge-${asset.element_type}`} style={{ fontSize: 10 }}>{asset.element_type}</span>
                            {currentMeta.badge && (
                                <span style={{ fontSize: 11, background: 'rgba(124,58,237,0.2)', color: 'var(--accent-purple-light)', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>
                                    {currentMeta.badge}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* 下載當前圖層 */}
                            <button
                                onClick={() => handleDownload(displayImage, viewingLayer)}
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title={`下載 ${currentMeta.label}`}
                            >↓</button>
                            {/* 重新生成主圖 */}
                            <button
                                onClick={onRegenerate}
                                style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: 'var(--accent-purple-light)', padding: '0 14px', height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                            >⚡ 重新生成</button>
                            {/* 關閉 */}
                            <button
                                onClick={onClose}
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="關閉 (ESC)"
                            >✕</button>
                        </div>
                    </div>

                    {/* 圖片展示區 */}
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 32, overflow: 'hidden',
                        background: currentMeta.bgCanvas,
                        transition: 'background 0.3s',
                        position: 'relative',
                    }}>
                        {viewingLayer === 'composite' ? (
                            /* 組合式 Canvas：主體去背在底，特效 screen 疊合在頂 */
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                {/* 1. 後景特效（人物後方）screen blend */}
                                {vfxBackLayer && (
                                    <img src={vfxBackLayer.image_path} alt="後景特效"
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12, mixBlendMode: 'screen' }} />
                                )}
                                
                                {/* 2. 落地陰影（人物下方）multiply blend */}
                                {shadowLayer && (
                                    <img src={shadowLayer.image_path} alt="陰影層"
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12, mixBlendMode: 'multiply' }} />
                                )}

                                {/* 3. 底層：主體圖（優先 no_bg 透明版，fallback 原圖） */}
                                <img
                                    src={noBgLayer?.image_path ?? asset.image_path}
                                    alt={`${asset.name} - 主體`}
                                    style={{ maxWidth: '100%', maxHeight: 'calc(92vh - 180px)', objectFit: 'contain', borderRadius: 12, display: 'block', position: 'relative' }}
                                />

                                {/* 4. 發光層（疊在人物上方）screen blend */}
                                {glowLayer && (
                                    <img src={glowLayer.image_path} alt="發光層"
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12, mixBlendMode: 'screen' }} />
                                )}

                                {/* 5. 前景特效（人物上方）screen blend */}
                                {vfxFrontLayer ? (
                                    <img src={vfxFrontLayer.image_path} alt="前景特效"
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12, mixBlendMode: 'screen' }} />
                                ) : vfxLayer ? (
                                    <img src={vfxLayer.image_path} alt="特效層"
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12, mixBlendMode: 'screen' }} />
                                ) : (
                                    !vfxBackLayer && (
                                        <div style={{ position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.5)', padding: '2px 10px', borderRadius: 6 }}>
                                            尚無特效圖層 — 點擊「分離特效」即可疊合
                                        </div>
                                    )
                                )}
                            </div>
                        ) : (
                            /* 單圖層預覽 */
                            <img
                                src={displayImage}
                                alt={asset.name}
                                style={{
                                    maxWidth: '100%', maxHeight: '100%',
                                    objectFit: 'contain', borderRadius: 12,
                                    boxShadow: viewingLayer === 'main' ? '0 16px 60px rgba(0,0,0,0.8)' : 'none',
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 子組件：設定分頁
function SettingsTab({ project, setProject }: any) {
    const [formData, setFormData] = useState({ ...project });
    const [saving, setSaving] = useState(false);
    const [refImages, setRefImages] = useState<File[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeError, setAnalyzeError] = useState('');

    async function handleSave() {
        setSaving(true);
        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const updated = await res.json();
            setProject(updated);
            alert('已儲存專案設定');
        } catch (err) {
            alert('儲存失敗');
        } finally {
            setSaving(false);
        }
    }

    async function handleAnalyze() {
        if (refImages.length === 0) return;
        setAnalyzing(true);
        setAnalyzeError('');
        try {
            const fd = new FormData();
            refImages.forEach(f => fd.append('images', f));
            const res = await fetch(`/api/projects/${project.id}/analyze-style`, { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || '分析失敗');
            const newAnalysis = data.style_analysis;
            setFormData((prev: any) => ({ ...prev, style_analysis: newAnalysis }));
            setProject((prev: any) => ({ ...prev, style_analysis: newAnalysis }));
            setRefImages([]);
        } catch (e: any) {
            setAnalyzeError(e.message || '分析時發生錯誤');
        } finally {
            setAnalyzing(false);
        }
    }

    return (
        <div style={{ flex: 1, padding: 40, maxWidth: 800, margin: '0 auto', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 32 }}>專案設定</h2>
            <div className="card" style={{ padding: 32 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                    <div>
                        <label style={{ fontWeight: 700, display: 'block', marginBottom: 8 }}>遊戲名稱</label>
                        <input className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                        <label style={{ fontWeight: 700, display: 'block', marginBottom: 8 }}>遊戲主題</label>
                        <input className="input-field" value={formData.theme} onChange={e => setFormData({ ...formData, theme: e.target.value })} />
                    </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                    <label style={{ fontWeight: 700, display: 'block', marginBottom: 8 }}>風格指南 (Style Guide)</label>
                    <textarea className="input-field" value={formData.style_guide} onChange={e => setFormData({ ...formData, style_guide: e.target.value })} style={{ height: 80 }} />
                </div>

                {/* 範例圖分析區塊 */}
                <div style={{ marginBottom: 24, padding: 24, background: 'var(--bg-deep)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 18 }}>🎨</span>
                        <label style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent-purple-light)' }}>
                            範例圖美術分析 (Style DNA)
                        </label>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                        上傳你的範例圖（可多張），AI 將自動分析美術品質、光照、色彩、材質等特徵，並注入到後續所有生圖 Prompt 中。
                    </p>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={e => setRefImages(Array.from(e.target.files || []))}
                            style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}
                        />
                        <button
                            className="btn-primary"
                            style={{ padding: '8px 20px', fontSize: 13, whiteSpace: 'nowrap' }}
                            onClick={handleAnalyze}
                            disabled={analyzing || refImages.length === 0}
                        >
                            {analyzing ? '🔍 分析中...' : `🔍 分析 ${refImages.length > 0 ? `(${refImages.length}張)` : ''}`}
                        </button>
                    </div>

                    {analyzeError && (
                        <div style={{ fontSize: 12, color: 'var(--accent-red)', marginBottom: 12 }}>⚠ {analyzeError}</div>
                    )}

                    <div>
                        <label style={{ fontWeight: 700, fontSize: 12, display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>
                            Style DNA（可手動編輯）
                        </label>
                        <textarea
                            className="input-field"
                            value={formData.style_analysis || ''}
                            onChange={e => setFormData({ ...formData, style_analysis: e.target.value })}
                            placeholder="尚未分析。上傳範例圖後點擊「分析」即可自動產生..."
                            style={{ height: 120, fontSize: 12, lineHeight: 1.6, fontFamily: 'monospace' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>
                    <div>
                        <label style={{ fontWeight: 700, display: 'block', marginBottom: 8 }}>捲軸欄數 (Cols)</label>
                        <input type="number" className="input-field" value={formData.grid_cols} onChange={e => setFormData({ ...formData, grid_cols: parseInt(e.target.value) })} />
                    </div>
                    <div>
                        <label style={{ fontWeight: 700, display: 'block', marginBottom: 8 }}>捲軸列數 (Rows)</label>
                        <input type="number" className="input-field" value={formData.grid_rows} onChange={e => setFormData({ ...formData, grid_rows: parseInt(e.target.value) })} />
                    </div>
                </div>

                <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 700 }} onClick={handleSave} disabled={saving}>
                    {saving ? '正在儲存...' : '儲存變更'}
                </button>
            </div>
        </div>
    );
}

// 子組件：預覽分頁（簡易版，已由 PreviewTabFull 取代）
function PreviewTabLegacy({ project, assets }: any) {
    const bg = assets.find((a: any) => a.element_type === 'bg' && a.image_path);
    const frame = assets.find((a: any) => a.element_type === 'frame' && a.image_path);
    const symbols = assets.filter((a: any) => ['character', 'high', 'medium', 'royal', 'special'].includes(a.element_type) && a.image_path);

    // 優先使用去背圖層，沒有則用原圖
    function getSymbolImage(asset: any): string {
        const noBg = asset.magic_layers?.find((l: any) => l.layer_type === 'no_bg');
        return noBg ? noBg.image_path : asset.image_path;
    }

    // 簡單的隨機填充邏輯
    const gridItems = [];
    const totalItems = project.grid_cols * project.grid_rows;
    for (let i = 0; i < totalItems; i++) {
        if (symbols.length > 0) {
            gridItems.push(symbols[i % symbols.length]);
        }
    }

    return (
        <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
                width: '100%',
                maxWidth: 1000,
                aspectRatio: '16 / 9',
                position: 'relative',
                background: '#000',
                borderRadius: 24,
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                border: '1px solid var(--border)'
            }}>
                {/* 背景 */}
                {bg && <img src={bg.image_path} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />}

                {/* 遊戲區域 */}
                <div style={{
                    position: 'absolute',
                    inset: '15%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {/* 符號網格（在邊框下層） */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${project.grid_cols}, 1fr)`,
                        gridTemplateRows: `repeat(${project.grid_rows}, 1fr)`,
                        gap: 8,
                        width: '94%',
                        height: '90%',
                        zIndex: 5,
                        position: 'relative'
                    }}>
                        {gridItems.map((s, idx) => (
                            <div key={idx} style={{ padding: 4 }}>
                                {/* 使用去背圖層（透明 PNG）讓符號正確疊合 */}
                                <img src={getSymbolImage(s)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                        ))}
                    </div>

                    {/* 邊框（在符號上層）：mix-blend-mode: screen 讓黑色區域透明 */}
                    {frame && (
                        <img
                            src={frame.image_path}
                            style={{
                                position: 'absolute', inset: 0,
                                width: '100%', height: '100%',
                                objectFit: 'fill', zIndex: 10,
                                mixBlendMode: 'screen'
                            }}
                        />
                    )}
                </div>

                <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: 20, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>LIVE PREVIEW: {project.theme} ({project.grid_cols}x{project.grid_rows})</span>
                </div>
            </div>
            <p style={{ marginTop: 24, color: 'var(--text-muted)', fontSize: 13 }}>* 此預覽為模擬排列，實際遊戲效果依引擎實作為準</p>
        </div>
    );
}

// 子組件：下載分頁
function DownloadTab({ project, assets }: any) {
    const readyAssets = assets.filter((a: any) => a.image_path);
    const [downloading, setDownloading] = useState(false);

    async function handleDownload() {
        setDownloading(true);
        try {
            const response = await fetch(`/api/projects/${project.id}/download`);
            if (!response.ok) throw new Error('下載失敗');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.name}_Assets.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('打包失敗，請確認是否已有資產生成完成');
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div style={{ flex: 1, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ padding: 48, maxWidth: 500, width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 24 }}>📦</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>打包資產下載</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
                    我們將自動為您整理專案中 **{readyAssets.length} 個** 已完成生成的資產，並打包成 ZIP 壓縮檔。
                </p>

                <div style={{ background: 'var(--bg-deep)', padding: 16, borderRadius: 12, marginBottom: 32, textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-purple-light)', marginBottom: 8 }}>包含內容：</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        • 高解析度 PNG 圖片 (透明背景)<br />
                        • 依元素類型命名分類<br />
                        • 專案風格指南 (README.txt)
                    </div>
                </div>

                <button
                    className="btn-primary"
                    style={{ width: '100%', padding: '16px', fontSize: 18, fontWeight: 800 }}
                    onClick={handleDownload}
                    disabled={downloading || readyAssets.length === 0}
                >
                    {downloading ? '正在打包中...' : '立即下載 ZIP'}
                </button>
                {readyAssets.length === 0 && (
                    <p style={{ marginTop: 12, color: 'var(--accent-red)', fontSize: 12 }}>⚠ 目前尚無已完成生成的資產</p>
                )}
            </div>
        </div>
    );
}

const ADD_ELEMENT_TYPES = [
    { key: 'character', label: '角色', icon: '👤', desc: '主要角色符號', tier: 'High' },
    { key: 'high', label: '高分符號', icon: '⭐', desc: '高價值物件', tier: 'High' },
    { key: 'medium', label: '中分符號', icon: '🔷', desc: '中價值物件', tier: 'Medium' },
    { key: 'special', label: '特殊符號', icon: '✨', desc: 'Wild / Scatter / Bonus', tier: 'High' },
    { key: 'royal', label: '牌面符號', icon: '👑', desc: 'A, K, Q, J, 10', tier: 'Low' },
    { key: 'bg', label: '背景圖', icon: '🌆', desc: '16:9 場景', tier: 'Low' },
    { key: 'frame', label: '捲軸框', icon: '🖼', desc: '捲軸容器邊框', tier: 'Low' },
    { key: 'button', label: '按鈕', icon: '🎯', desc: 'SPIN / UI 按鈕', tier: 'Low' },
];

function AddElementModal({ projectId, onClose, onSuccess }: { projectId: string; onClose: () => void; onSuccess: () => void }) {
    const [name, setName] = useState('');
    const [type, setType] = useState('character');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (!name.trim()) return alert('請輸入名稱');
        setSubmitting(true);
        try {
            const selectedType = ADD_ELEMENT_TYPES.find(t => t.key === type);
            const res = await fetch(`/api/projects/${projectId}/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    element_type: type,
                    value_tier: selectedType?.tier || 'Medium',
                    prompt: `${name} for slot game`,
                }),
            });
            if (!res.ok) throw new Error('新增失敗');
            onSuccess();
        } catch (err) {
            alert('新增資產失敗');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
            <div className="card" style={{ width: 560, padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>新增遊戲元素</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>填寫名稱並選擇類型以加入新元素到專案中。</p>

                <div style={{ marginBottom: 24 }}>
                    <label style={{ fontWeight: 700, display: 'block', marginBottom: 8, fontSize: 13 }}>元素名稱</label>
                    <input
                        className="input-field"
                        placeholder="例如：太陽神、神秘金字塔、Wild 標誌..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                        autoFocus
                    />
                </div>

                <div style={{ marginBottom: 32 }}>
                    <label style={{ fontWeight: 700, display: 'block', marginBottom: 12, fontSize: 13 }}>選擇元素類型</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {ADD_ELEMENT_TYPES.map(t => (
                            <div
                                key={t.key}
                                onClick={() => setType(t.key)}
                                style={{
                                    padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)',
                                    background: type === t.key ? 'rgba(124,58,237,0.1)' : 'var(--bg-deep)',
                                    borderColor: type === t.key ? 'var(--accent-purple)' : 'var(--border)',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: 12
                                }}
                            >
                                <span style={{ fontSize: 20 }}>{t.icon}</span>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: type === t.key ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{t.label}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                    <button className="btn-ghost" onClick={onClose} disabled={submitting}>取消</button>
                    <button className="btn-primary" onClick={handleSubmit} disabled={submitting || !name.trim()}>
                        {submitting ? '新增中...' : '確認新增'}
                    </button>
                </div>
            </div>
        </div>
    );
}

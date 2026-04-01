import React, { useState, useRef, useEffect } from 'react';

const Sidebar = ({ mockMode, setMockMode, onStart, status }) => {
    const [requirement, setRequirement] = useState('');
    const [layoutMode, setLayoutMode] = useState('Cabinet');
    const [selectedPsd, setSelectedPsd] = useState('');
    const [importedSymbols, setImportedSymbols] = useState(null);
    const [selectedSymbols, setSelectedSymbols] = useState({});
    const [isUploading, setIsUploading] = useState(false);
    
    // Style configurations
    const [styles, setStyles] = useState({});
    const [selectedStyle, setSelectedStyle] = useState('3D_Premium');

    const psdInputRef = useRef(null);
    const xlsxInputRef = useRef(null);

    const handleStart = () => {
        if (!requirement) return alert('請輸入主題與風格敘述');
        const symbolsToGenerate = importedSymbols
            ? importedSymbols.filter(s => selectedSymbols[s])
            : null;

        onStart({
            requirement,
            layout_mode: layoutMode,
            psd_name: selectedPsd || null,
            symbols: symbolsToGenerate,
            style: selectedStyle
        });
    };

    useEffect(() => {
        // Fetch available styles from backend on mount
        fetch('/api/styles')
            .then(res => res.json())
            .then(data => {
                setStyles(data);
                if (data['PG_Flagship']) {
                    setSelectedStyle('PG_Flagship'); // Default to PG if available
                }
            })
            .catch(err => console.error('Failed to fetch styles:', err));
    }, []);

    const toggleSymbol = (sym) => {
        setSelectedSymbols(prev => ({
            ...prev,
            [sym]: !prev[sym]
        }));
    };

    const handlePSDSelect = (e) => {
        const file = e.target.files[0];
        if (file) setSelectedPsd(file.name);
    };

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch('/api/import-doc', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.status === 'success') {
                setImportedSymbols(data.manifest.symbols);
                // 預設全部選取
                const initialSelection = {};
                data.manifest.symbols.forEach(s => initialSelection[s] = true);
                setSelectedSymbols(initialSelection);

                setRequirement(`[文件導入] ${data.manifest.theme_hint} 主題`);
                alert(`成功導入！偵測到 ${data.manifest.symbols.length} 個符號需求。`);
            } else {
                alert("導入失敗: " + data.message);
            }
        } catch (err) {
            alert("請求出錯: " + err.message);
        } finally {
            setIsUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    return (
        <div className="bg-slate-950/50 border-r border-white/10 p-6 flex flex-col gap-8 overflow-y-auto">
            <section>
                <h3 className="text-cyan-400 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                    ✨ AI Autonomous
                </h3>
                <textarea
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white mb-4 focus:border-cyan-400 focus:outline-none h-32"
                    placeholder="輸入主題與風格描述..."
                    value={requirement}
                    onChange={(e) => setRequirement(e.target.value)}
                />
                <label className="flex items-center gap-2 text-sm text-slate-300 mb-4 cursor-pointer">
                    <input
                        type="checkbox"
                        className="accent-cyan-400"
                        checked={mockMode}
                        onChange={(e) => setMockMode(e.target.checked)}
                    />
                    免 API 錢模式 (Mock 測試)
                </label>
                <button
                    className={`w-full py-4 rounded-xl font-bold flex justify-center items-center transition-all ${status === 'queued' || status === 'running'
                        ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-[0_0_20px_rgba(255,0,85,0.4)]'
                        }`}
                    onClick={handleStart}
                    disabled={status === 'queued' || status === 'running'}
                >
                    {status === 'queued' || status === 'running' ? '處理中...' : '一鍵啟動流水線'}
                </button>
            </section>

            <section>
                <h3 className="text-cyan-400 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                    📁 PSD Templates
                </h3>
                <input
                    type="file"
                    ref={psdInputRef}
                    accept=".psd"
                    className="hidden"
                    onChange={handlePSDSelect}
                />
                <button
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 font-bold mb-2"
                    onClick={() => psdInputRef.current?.click()}
                >
                    選擇 PSD 模板
                </button>
                <p className="text-xs text-slate-400 break-all mb-2">
                    {selectedPsd ? `已選 PSD: ${selectedPsd}` : '若無選擇將套用系統預設佈局'}
                </p>
                {selectedPsd && (
                    <button onClick={() => setSelectedPsd('')} className="text-xs text-red-400 hover:text-red-300">
                        清除選擇
                    </button>
                )}
            </section>

            <section>
                <h3 className="text-cyan-400 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                    📄 Art Specification
                </h3>
                <input
                    type="file"
                    ref={xlsxInputRef}
                    accept=".xlsx"
                    className="hidden"
                    onChange={handleExcelUpload}
                />
                <button
                    className={`w-full py-3 rounded-xl border border-red-500/50 text-red-500 font-bold transition-colors shadow-[0_0_10px_rgba(239,68,68,0.2)] ${isUploading ? 'opacity-50 cursor-wait' : 'hover:bg-red-500/20'
                        }`}
                    onClick={() => !isUploading && xlsxInputRef.current?.click()}
                    disabled={isUploading}
                >
                    {isUploading ? '導入中...' : '導入企劃文件 (.xlsx)'}
                </button>
                {importedSymbols && (
                    <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10 max-h-60 flex flex-col">
                        <p className="text-xs text-slate-400 mb-2 font-semibold">待生成符號清單 ({importedSymbols.length}):</p>
                        <div className="flex-1 overflow-y-auto text-xs text-cyan-400 flex flex-col gap-2 pr-2 custom-scrollbar">
                            {importedSymbols.map(sym => (
                                <label key={sym} className="flex items-start gap-3 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors group">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 accent-cyan-400 w-4 h-4 rounded border-white/20 bg-black/40"
                                        checked={!!selectedSymbols[sym]}
                                        onChange={() => toggleSymbol(sym)}
                                    />
                                    <span className="break-all leading-relaxed flex-1 group-hover:text-cyan-300">
                                        {sym}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            <section>
                <h3 className="text-cyan-400 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                    🎨 Style Tuning
                </h3>
                <select 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-cyan-400 focus:outline-none mb-2"
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                >
                    {Object.entries(styles).map(([key, config]) => (
                        <option key={key} value={key}>
                            {config.label || key}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-slate-400">選擇 AI 美術輸出的視覺標準</p>
            </section>
        </div>
    );
};

export default Sidebar;

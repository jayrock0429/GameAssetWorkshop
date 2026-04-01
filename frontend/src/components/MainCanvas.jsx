import React from 'react';

const MainCanvas = ({ logs, status, output }) => {
    return (
        <div className="flex flex-col p-6 gap-6 overflow-y-auto">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-lg shadow-cyan-500/5">
                <h3 className="text-cyan-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    📐 盤面客製化 (Custom Layout)
                </h3>
                <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2">
                        <label className="text-xs text-slate-400 mb-2 block">模板 / 模式</label>
                        <select className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none">
                            <option>直版 (Mobile H5)</option>
                            <option>橫版 (Cabinet)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-2 block">欄位 (Cols)</label>
                        <input type="number" defaultValue={5} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-2 block">列數 (Rows)</label>
                        <input type="number" defaultValue={3} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none" />
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4">
                    <div>
                        <label className="text-xs text-slate-400 mb-2 block">起始 X</label>
                        <input type="text" placeholder="預設" className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none placeholder:text-slate-600" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-2 block">起始 Y</label>
                        <input type="text" placeholder="預設" className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none placeholder:text-slate-600" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-2 block">單格 W</label>
                        <input type="text" placeholder="預設" className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none placeholder:text-slate-600" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-2 block">單格 H</label>
                        <input type="text" placeholder="預設" className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none placeholder:text-slate-600" />
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-black rounded-xl border border-white/10 relative overflow-hidden flex flex-col items-center justify-center p-4">
                {output && (output.image_url || output.scene) ? (
                    <img src={output.image_url || `/output/${output.scene}`} alt="Scene" className="max-w-full max-h-full object-contain" />
                ) : (
                    <div className="text-center opacity-50 flex flex-col items-center gap-4">
                        <div className="text-4xl">🎨</div>
                        <p className="text-sm">Pipeline 產出將於此預覽</p>
                    </div>
                )}

                {status === 'running' || status === 'queued' ? (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-10 backdrop-blur-sm">
                        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-cyan-400 font-bold animate-pulse">處理中...</p>
                        <div className="bg-black/50 p-4 rounded-xl border border-white/10 max-w-md w-full max-h-40 overflow-y-auto text-xs text-slate-300 font-mono">
                            {logs.map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default MainCanvas;

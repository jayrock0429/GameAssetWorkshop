'use client';

import { useState, useEffect } from 'react';

interface SniperModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetInfo: {
    tagName: string;
    className: string;
    id: string;
    html: string;
  } | null;
}

export default function SniperModal({ isOpen, onClose, targetInfo }: SniperModalProps) {
  const [instruction, setInstruction] = useState('');
  const [isSending, setIsSending] = useState(false);

  // 當彈窗開啟時，重置輸入框
  useEffect(() => {
    if (isOpen) setInstruction('');
  }, [isOpen]);

  if (!isOpen || !targetInfo) return null;

  const handleSend = async () => {
    if (!instruction.trim()) return;
    setIsSending(true);
    try {
      // ── postMessage 穿越 iframe → AI Manager UI ───────────────────────────
      // 不使用 fetch('/api/ai-edit')，那會打到本機 3001 port 而非總部 3000 port。
      // window.parent.postMessage 可直接穿越 iframe 邊界，不受 port 限制。
      // ─────────────────────────────────────────────────────────────────────
      const payload = {
        type: 'AI_EDIT_REQUEST',          // 固定識別碼，讓總部辨識來源
        instruction: instruction.trim(),
        className: targetInfo.className || targetInfo.tagName,
        tagName: targetInfo.tagName,
        id: targetInfo.id,
        cwd: 'D:\\AG\\GameAssetWorkshop\\slots-studio', // 子系統工作路徑
        timestamp: Date.now(),
      };

      // 傳給父視窗（AI Manager UI iframe 容器）
      window.parent.postMessage(payload, '*');

      // 同時保留本機 API 寫入（方便本機偵錯，失敗不影響主流程）
      fetch('/api/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {/* 靜默忽略 */});

      alert('✅ 指令已傳送至總部！');
      onClose();
    } catch (error) {
      alert('❌ 傳送失敗，請重試。');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#1a1a2e] border border-cyan-500/30 w-full max-w-lg rounded-2xl shadow-[0_0_50px_rgba(0,255,255,0.2)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-cyan-900/20 border-b border-cyan-500/30 px-6 py-4 flex justify-between items-center">
          <h3 className="text-cyan-400 font-bold flex items-center gap-2">
            <span className="text-xl">🎯</span> AI 狙擊指令框
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl">✕</button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-cyan-500/70 uppercase tracking-wider">元件標示</label>
            <div className="bg-black/40 rounded-lg p-3 border border-white/5 font-mono text-xs text-gray-300 break-all">
              <span className="text-purple-400">{targetInfo.tagName.toLowerCase()}</span>
              {targetInfo.id && <span className="text-yellow-400">#{targetInfo.id}</span>}
              {targetInfo.className && <span className="text-cyan-400">.{targetInfo.className.split(' ').join('.')}</span>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-cyan-500/70 uppercase tracking-wider">修改需求 (總導演指令)</label>
            <textarea
              autoFocus
              className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-gray-600 resize-none"
              placeholder="例如：將此按鈕改為金色漸層，並增加光暈效果..."
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
                if (e.key === 'Escape') onClose();
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/20 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSend}
            disabled={isSending || !instruction.trim()}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-cyan-900/20 flex items-center gap-2"
          >
            {isSending ? '🚀 傳送中...' : '📡 傳送給總部'}
          </button>
        </div>
      </div>
    </div>
  );
}

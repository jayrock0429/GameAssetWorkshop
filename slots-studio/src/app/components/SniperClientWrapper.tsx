'use client';

import { useState, useEffect } from 'react';
import SniperModal from './SniperModal';

export default function SniperClientWrapper({ children }: { children: React.ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [targetInfo, setTargetInfo] = useState<{
    tagName: string;
    className: string;
    id: string;
    html: string;
  } | null>(null);

  useEffect(() => {
    if (!isEditMode) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // 避免攔截彈窗內部或浮動按鈕的點擊
      if (target.closest('.sniper-ignore')) return;

      e.preventDefault();
      e.stopPropagation();
      
      setTargetInfo({
        tagName: target.tagName,
        className: target.className || '',
        id: target.id || '',
        html: target.outerHTML,
      });
      setModalOpen(true);
      setIsEditMode(false); // 點擊後暫時關閉狙擊模式，專注於彈窗
    };

    // 在捕獲階段攔截，確保在 React 元件自身的事件之前觸發
    window.addEventListener('click', handleClick, true);
    return () => window.removeEventListener('click', handleClick, true);
  }, [isEditMode]);

  // 快捷鍵監聽: Alt + S 切換模式, Esc 關閉彈窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只有在非輸入狀態下才觸發 Alt+S
      if (e.altKey && e.key.toLowerCase() === 's') {
        const activeElement = document.activeElement;
        const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || (activeElement as HTMLElement)?.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          setIsEditMode(prev => !prev);
        }
      }
      if (e.key === 'Escape') {
        setModalOpen(false);
        setIsEditMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* 動態注入 UI 狙擊模式樣式 */}
      {isEditMode && (
        <style jsx global>{`
          * {
            outline: 1px solid rgba(0, 255, 255, 0.2) !important;
          }
          *:hover {
            outline: 2px solid #00ffff !important;
            outline-offset: -2px;
            cursor: crosshair !important;
          }
        `}</style>
      )}

      {children}

      {/* 全域浮動按鈕 */}
      <div className="sniper-ignore fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
        {isEditMode && (
          <div className="bg-black/80 backdrop-blur-md border border-cyan-500/50 text-cyan-400 text-[10px] px-3 py-1 rounded-full animate-pulse uppercase tracking-widest font-bold shadow-[0_0_15px_rgba(0,255,255,0.3)]">
            Sniper Mode Active
          </div>
        )}
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`
            w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 pointer-events-auto
            ${isEditMode 
              ? 'bg-cyan-500 text-black shadow-[0_0_30px_rgba(6,182,212,0.6)] border-none' 
              : 'bg-[#1a1a2e] text-cyan-500 border border-cyan-500/30 hover:border-cyan-500 shadow-black/50'}
          `}
          title="UI 狙擊模式 (Alt + S)"
        >
          {isEditMode ? '🎯' : '🛠️'}
        </button>
      </div>

      <div className="sniper-ignore">
        <SniperModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          targetInfo={targetInfo} 
        />
      </div>
    </>
  );
}

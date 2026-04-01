import React from 'react';

const ReviewCard = ({ title, src }) => (
    <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-300 font-medium">{title}</span>
            <button className="text-[10px] px-3 py-1 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors">
                Reroll
            </button>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-xl h-32 flex items-center justify-center overflow-hidden">
            {src ? (
                <img src={src.startsWith('/') ? src : `/output/${src}`} alt={title} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
            ) : (
                <span className="text-slate-600">--</span>
            )}
        </div>
    </div>
);

const Inspector = ({ output }) => {
    return (
        <div className="bg-slate-950/50 border-l border-white/10 p-6 flex flex-col overflow-y-auto w-[350px]">
            <h3 className="text-cyan-400 text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                📦 Component Review
            </h3>

            <ReviewCard title="Background" src={output?.components_url?.background || output?.background} />
            <ReviewCard title="UI Cabinet" src={output?.components_url?.cabinet || output?.cabinet} />
            <ReviewCard title="Master Symbol" src={output?.components_url?.symbols?.[0] || output?.symbols?.[0]} />
            <ReviewCard title="Spin Button" src={output?.components_url?.spin_button || output?.spin_button} />
        </div>
    );
};

export default Inspector;

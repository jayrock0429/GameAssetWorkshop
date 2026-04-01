import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MainCanvas from './components/MainCanvas';
import Inspector from './components/Inspector';

function App() {
  const [taskStatus, setTaskStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [generatedImages, setGeneratedImages] = useState({});
  const [mockMode, setMockMode] = useState(false);

  const handleStartPipeline = async (params) => {
    try {
      setTaskStatus('queued');
      setLogs(['Pipeline started...']);
      const res = await fetch('/api/fully-autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, mock: mockMode })
      });
      const data = await res.json();
      if (data.task_id) {
        startPolling(data.task_id);
      }
    } catch (err) {
      setLogs(prev => [...prev, `[Error] ${err.message}`]);
    }
  };

  const startPolling = (taskId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/task/${taskId}`);
        const data = await res.json();

        if (data.status) setTaskStatus(data.status);
        if (data.logs) setLogs(data.logs);

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          if (data.status === 'completed' && data.result) {
            setGeneratedImages(data.result);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 1000);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900 text-slate-50 relative">
      <nav className="h-16 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur border-b border-white/10 z-50">
        <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          AI自動化生成slot美術資源系統
        </div>
        <div className="flex gap-4 text-xs">
          <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5">
            C:\Antigracity\GameAssetWorkshop
          </span>
          <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5">
            Mode: {mockMode ? 'Mock [ON]' : 'Real [OFF]'}
          </span>
        </div>
      </nav>

      <div className="flex-1 grid grid-cols-[320px_1fr_350px] overflow-hidden">
        <Sidebar
          mockMode={mockMode}
          setMockMode={setMockMode}
          onStart={handleStartPipeline}
          status={taskStatus}
        />
        <MainCanvas logs={logs} status={taskStatus} output={generatedImages} />
        <Inspector output={generatedImages} />
      </div>
    </div>
  );
}

export default App;

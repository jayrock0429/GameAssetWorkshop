'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from './components/Sidebar';

interface Project {
  id: string;
  name: string;
  theme: string;
  style_guide: string;
  cover_image: string;
  style_model: string;
  asset_count: number;
  created_at: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        setProjects(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch projects failed:', err);
        setProjects([]);
        setLoading(false);
      });
  }, []);

  const handleDeleteProject = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`確定要刪除「${name}」？此操作無法復原，所有資產也會一併刪除。`)) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('刪除失敗');
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('刪除失敗，請稍後再試');
    }
  }, []);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.theme.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-deep)' }}>
      <Sidebar />
      <main style={{ marginLeft: 180, flex: 1, padding: 0, display: 'flex', flexDirection: 'column' }}>
        {/* 頂部 Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', height: 56,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-sidebar)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>⊟</button>
            <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>我的遊戲</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>🔍</span>
              <input
                className="input-field"
                placeholder="搜尋..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, width: 200, height: 34, fontSize: 13 }}
              />
            </div>
            <Link href="/new">
              <button className="btn-primary">+ 新增遊戲</button>
            </Link>
          </div>
        </div>

        {/* 主內容 */}
        <div style={{ padding: 24, flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>
              <span className="animate-spin" style={{ display: 'inline-block', marginRight: 8 }}>⟳</span>
              載入中...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎰</div>
              <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
                {search ? '找不到符合的遊戲' : '還沒有遊戲專案'}
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
                {search ? '請嘗試其他搜尋關鍵字' : '建立你的第一個 AI 老虎機遊戲吧！'}
              </p>
              {!search && (
                <Link href="/new">
                  <button className="btn-primary">+ 新增遊戲</button>
                </Link>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {filtered.map(p => (
                <ProjectCard key={p.id} project={p} onDelete={handleDeleteProject} />
              ))}
              {/* 快速新增卡 */}
              <Link href="/new" style={{ textDecoration: 'none' }}>
                <div style={{
                  borderRadius: 16,
                  border: '2px dashed var(--border)',
                  height: 220,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                  color: 'var(--text-muted)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-purple)'; e.currentTarget.style.color = 'var(--accent-purple-light)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <span style={{ fontSize: 32, marginBottom: 8 }}>+</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>新增遊戲</span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: (id: string, name: string) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 刪除按鈕 */}
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(project.id, project.name); }}
        style={{
          position: 'absolute', top: -8, right: -8, zIndex: 30,
          width: 22, height: 22, borderRadius: '50%',
          background: '#ef4444',
          border: '2px solid var(--bg-deep)', cursor: 'pointer', color: '#fff',
          fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
          pointerEvents: hovered ? 'auto' : 'none',
        }}
        title="刪除遊戲"
      >✕</button>

      <Link href={`/projects/${project.id}/design`} style={{ textDecoration: 'none' }}>
        <div style={{
          borderRadius: 16,
          overflow: 'hidden',
          border: `1px solid ${hovered ? 'var(--border-light)' : 'var(--border)'}`,
          background: 'var(--bg-card)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          height: 220,
          display: 'flex', flexDirection: 'column',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
        }}>
          {/* 封面圖 */}
          <div style={{ flex: 1, position: 'relative', background: 'var(--bg-deep)', overflow: 'hidden' }}>
            {project.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.cover_image} alt={project.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* 菱格背景紋路 */}
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20Z' fill='none' stroke='%23ffffff12' stroke-width='1'/%3E%3C/svg%3E")`,
                  backgroundSize: '40px 40px',
                }}/>
                {/* 中心老虎機 SVG */}
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"
                  style={{ filter: 'drop-shadow(0 0 12px rgba(99,102,241,0.6))', position: 'relative' }}>
                  <rect x="2" y="10" width="48" height="32" rx="6" stroke="#6366f1" strokeWidth="2" fill="#1e1b4b" fillOpacity="0.8"/>
                  <rect x="8" y="16" width="10" height="20" rx="3" fill="#312e81" stroke="#818cf8" strokeWidth="1"/>
                  <rect x="21" y="16" width="10" height="20" rx="3" fill="#312e81" stroke="#818cf8" strokeWidth="1"/>
                  <rect x="34" y="16" width="10" height="20" rx="3" fill="#312e81" stroke="#818cf8" strokeWidth="1"/>
                  <circle cx="13" cy="26" r="3" fill="#f59e0b"/>
                  <circle cx="26" cy="26" r="3" fill="#0ea5e9"/>
                  <circle cx="39" cy="26" r="3" fill="#f59e0b"/>
                  <line x1="19" y1="10" x2="19" y2="42" stroke="#6366f1" strokeWidth="0.75" strokeOpacity="0.5"/>
                  <line x1="33" y1="10" x2="33" y2="42" stroke="#6366f1" strokeWidth="0.75" strokeOpacity="0.5"/>
                  <rect x="20" y="4" width="12" height="6" rx="2" fill="#4f46e5"/>
                </svg>
              </div>
            )}
            <div style={{
              position: 'absolute', top: 8, left: 8,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
              borderRadius: 6, padding: '3px 8px',
              fontSize: 11, color: 'white', fontWeight: 500,
            }}>
              {project.asset_count || 0} 個資產
            </div>
          </div>
          {/* 資訊區 */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.name}
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span>主題：<span style={{ color: 'var(--text-secondary)' }}>{project.theme}</span></span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              模型：<span style={{ color: 'var(--text-secondary)' }}>{project.style_model?.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

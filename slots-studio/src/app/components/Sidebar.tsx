'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
    { href: '/', icon: '⊞', label: '我的遊戲' },
    { href: '/new', icon: '+', label: '新增遊戲' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside style={{
            width: 180, // 從 200px 縮小
            minWidth: 180,
            background: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: 100,
        }}>
            {/* Logo */}
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                        flexShrink: 0,
                    }}>
                        {/* 老虎機捲軸 SVG 圖示 */}
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="1" y="4" width="20" height="14" rx="3" stroke="white" strokeWidth="1.5"/>
                            <rect x="4" y="7" width="4" height="8" rx="1.5" fill="white" fillOpacity="0.9"/>
                            <rect x="9" y="7" width="4" height="8" rx="1.5" fill="white" fillOpacity="0.7"/>
                            <rect x="14" y="7" width="4" height="8" rx="1.5" fill="white" fillOpacity="0.9"/>
                            <line x1="8" y1="4" x2="8" y2="18" stroke="white" strokeWidth="0.75" strokeOpacity="0.4"/>
                            <line x1="14" y1="4" x2="14" y2="18" stroke="white" strokeWidth="0.75" strokeOpacity="0.4"/>
                            <circle cx="6" cy="11" r="1.2" fill="#0ea5e9"/>
                            <circle cx="11" cy="11" r="1.2" fill="#f59e0b"/>
                            <circle cx="16" cy="11" r="1.2" fill="#0ea5e9"/>
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>老虎機<br />工作室</div>
                    </div>
                </Link>
            </div>

            {/* 導覽 */}
            <nav style={{ padding: '12px 10px', flex: 1 }}>
                {NAV_ITEMS.map(item => {
                    const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                    return (
                        <Link key={item.href} href={item.href} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px', borderRadius: 10, marginBottom: 4,
                            textDecoration: 'none', fontSize: 14, fontWeight: active ? 600 : 500,
                            background: active ? 'var(--bg-hover)' : 'transparent',
                            color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                            transition: 'all 0.15s ease',
                            border: active ? '1px solid var(--border-light)' : '1px solid transparent',
                        }}>
                            <span style={{
                                fontSize: 18,
                                minWidth: 24,
                                textAlign: 'center',
                                filter: active ? 'drop-shadow(0 0 4px var(--accent-purple))' : 'none'
                            }}>{item.icon}</span>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* 底部保留空隙 */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--border)', opacity: 0.5, fontSize: 10, textAlign: 'center', color: 'var(--text-muted)' }}>
                v1.0.0 Stable
            </div>
        </aside>
    );
}

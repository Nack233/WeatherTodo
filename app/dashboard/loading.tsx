import React from 'react';

export default function DashboardLoading() {
    return (
        <div className="app-container" style={{ minHeight: '100vh' }}>
            {/* Sidebar Skeleton (Desktop) */}
            <aside className="sidebar">
                <div className="brand">
                    <div className="skeleton-box skeleton-circle" style={{ width: '34px', height: '34px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <div className="skeleton-box" style={{ height: '14px', width: '80%' }} />
                        <div className="skeleton-box" style={{ height: '10px', width: '50%' }} />
                    </div>
                </div>
                <nav className="nav-menu" style={{ gap: '0.75rem', marginTop: '1rem' }}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="skeleton-box"
                            style={{ height: '44px', borderRadius: '12px', opacity: 0.7 }}
                        />
                    ))}
                </nav>
            </aside>

            {/* Main Area Skeleton */}
            <main className="main-content">
                <header className="main-header">
                    <div className="header-info" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="skeleton-box skeleton-title" style={{ width: '220px', height: '24px' }} />
                        <div className="skeleton-box skeleton-text" style={{ width: '140px', height: '14px' }} />
                    </div>
                    <div className="header-actions">
                        <div className="skeleton-box skeleton-circle" style={{ width: '38px', height: '38px' }} />
                    </div>
                </header>

                <div className="tab-panel active" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Top Stats Banner */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="skeleton-box card"
                                style={{ height: '100px', borderRadius: '16px' }}
                            />
                        ))}
                    </div>

                    {/* Main Content Panels */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        <div className="skeleton-box card" style={{ height: '360px', borderRadius: '16px' }} />
                        <div className="skeleton-box card" style={{ height: '360px', borderRadius: '16px' }} />
                    </div>
                </div>
            </main>
        </div>
    );
}

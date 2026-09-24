'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useTheme } from '../providers';
import { DEFAULT_LOCATIONS, type SavedLocation } from '@/app/data/thailand-locations';
import dynamic from 'next/dynamic';

// Skeleton loading fallback for tab panels
function TabSkeleton() {
    return (
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    style={{
                        height: i === 1 ? '120px' : '80px',
                        borderRadius: '16px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        animation: 'skeleton-shimmer 1.5s infinite linear',
                    }}
                />
            ))}
        </div>
    );
}

// Sub-components — lazy loaded per tab to reduce initial JS bundle
const Overview   = dynamic(() => import('./overview'),     { loading: () => <TabSkeleton /> });
const Weather    = dynamic(() => import('./weather'),      { loading: () => <TabSkeleton /> });
const Todo       = dynamic(() => import('./todo'),         { loading: () => <TabSkeleton /> });
const Calendar   = dynamic(() => import('./calendar'),    { loading: () => <TabSkeleton /> });
const Tracker    = dynamic(() => import('./tracker'),     { loading: () => <TabSkeleton /> });
const FuelPrices = dynamic(() => import('./fuel-prices'), { loading: () => <TabSkeleton /> });

// Floating assistant widget lazy loaded on client
const MascotLineWidget = dynamic(() => import('@/app/components/MascotLineWidget'), { ssr: false });

// Icons
import { 
    Home, CloudSun, CheckSquare, 
    Calendar as CalendarIcon, Wallet, MapPin, 
    Moon, Sun, LogOut 
} from 'lucide-react';

const VALID_TABS = ['dashboard', 'weather', 'todo', 'calendar', 'tracker', 'fuel-prices'] as const;
type TabType = typeof VALID_TABS[number];

function isValidTab(tab: string | null): tab is TabType {
    return Boolean(tab && (VALID_TABS as readonly string[]).includes(tab));
}

function DashboardContent() {
    const { user, logout, isLoading } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const activeTab: TabType = isValidTab(tabParam) ? tabParam : 'dashboard';

    const handleTabChange = useCallback((newTab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (newTab === 'dashboard') {
            params.delete('tab');
        } else {
            params.set('tab', newTab);
        }
        const qs = params.toString();
        router.replace(qs ? `/dashboard?${qs}` : '/dashboard', { scroll: false });
    }, [router, searchParams]);

    const [currentDateStr, setCurrentDateStr] = useState<string>('');
    const [locationBadge, setLocationBadge] = useState<string>('ไทย');

    // Dynamic location badge from localStorage (event-driven, no polling)
    useEffect(() => {
        const updateBadge = () => {
            try {
                const raw = localStorage.getItem('weather_saved_locations');
                const activeId = localStorage.getItem('weather_active_location');
                if (raw) {
                    const locs: SavedLocation[] = JSON.parse(raw);
                    if (locs.length > 0) {
                        const active = locs.find((l) => l.id === activeId) || locs[0];
                        setLocationBadge(active.province ? `${active.province}, ไทย` : 'ไทย');
                        return;
                    }
                }
            } catch { /* ignore */ }
            setLocationBadge(`${DEFAULT_LOCATIONS[0].province}, ไทย`);
        };
        updateBadge();
        // Listen for storage and custom weather location change events
        window.addEventListener('storage', updateBadge);
        window.addEventListener('weather_location_change', updateBadge);
        return () => {
            window.removeEventListener('storage', updateBadge);
            window.removeEventListener('weather_location_change', updateBadge);
        };
    }, []);

    // Local Date display
    useEffect(() => {
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        setCurrentDateStr(today.toLocaleDateString('th-TH', options));
    }, []);

    if (isLoading || !user) {
        return (
            <div className="loading-screen">
                กำลังโหลด...
            </div>
        );
    }

    const getPageTitle = () => {
        switch (activeTab) {
            case 'dashboard': return 'ยินดีต้อนรับสู่แดชบอร์ด';
            case 'weather': return 'ข้อมูลพยากรณ์อากาศ';
            case 'todo': return 'รายการต้องทำ (To-Do List)';
            case 'calendar': return 'ปฏิทินกิจกรรมและการนัดหมาย';
            case 'tracker': return 'บันทึกรายรับ-รายจ่าย';
            case 'fuel-prices': return 'ราคาน้ำมัน EPPO';
            default: return 'แดชบอร์ด';
        }
    };

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Overview user={user} setActiveTab={handleTabChange} />;
            case 'weather':
                return <Weather />;
            case 'todo':
                return <Todo />;
            case 'calendar':
                return <Calendar />;
            case 'tracker':
                return <Tracker />;
            case 'fuel-prices':
                return <FuelPrices />;
            default:
                return <Overview user={user} setActiveTab={handleTabChange} />;
        }
    };

    const handleLogout = async () => {
        await logout();
        // Middleware will redirect to /login on next navigation
        window.location.href = '/login';
    };

    return (
        <div className="app-container">
            {/* Sidebar Navigation (Desktop) */}
            <aside className="sidebar">
                <div className="brand">
                    <Image src="/logo-daybase.png" alt="Day Base" width={34} height={34} className="brand-logo-img" priority />
                    <div>
                        <span className="brand-name">Day Base</span>
                        <span className="brand-subtitle">DAILY WORKSPACE</span>
                    </div>
                </div>
                <nav className="nav-menu">
                    <button 
                        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => handleTabChange('dashboard')}
                    >
                        <Home />
                        <span>แดชบอร์ด</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'weather' ? 'active' : ''}`}
                        onClick={() => handleTabChange('weather')}
                    >
                        <CloudSun />
                        <span>พยากรณ์อากาศ</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'todo' ? 'active' : ''}`}
                        onClick={() => handleTabChange('todo')}
                    >
                        <CheckSquare />
                        <span>รายการต้องทำ</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
                        onClick={() => handleTabChange('calendar')}
                    >
                        <CalendarIcon />
                        <span>ปฏิทินกิจกรรม</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'tracker' ? 'active' : ''}`}
                        onClick={() => handleTabChange('tracker')}
                    >
                        <Wallet />
                        <span>รายรับ-รายจ่าย</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'fuel-prices' ? 'active' : ''}`}
                        onClick={() => handleTabChange('fuel-prices')}
                    >
                        <MapPin />
                        <span>ราคาน้ำมัน</span>
                    </button>
                </nav>
                <div className="sidebar-footer">
                    <div className="location-badge">
                        <div className="location-badge-inner">
                            <MapPin size={15} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                            <span className="location-badge-text">{locationBadge}</span>
                        </div>
                        <span className="location-badge-dot" />
                    </div>
                    <button className="btn-logout" onClick={handleLogout}>
                        <LogOut size={16} />
                        <span>ออกจากระบบ</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                {/* Header */}
                <header className="main-header">
                    <div className="header-info">
                        <h1 id="page-title">{getPageTitle()}</h1>
                        <p id="current-date-display">{currentDateStr}</p>
                    </div>
                    <div className="header-actions">
                        <div className="header-user-badge">
                            <div className="header-user-avatar">
                                {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
                            </div>
                            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>สวัสดี, {user.name}</span>
                        </div>
                        <button 
                            id="theme-toggle" 
                            className="header-btn" 
                            onClick={toggleTheme} 
                            title={theme === 'dark' ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </header>

                {/* Render Dynamic Content Panel */}
                <div className="tab-panel active">
                    {renderActiveTabContent()}
                </div>
            </main>

            {/* Bottom Navigation Bar (Mobile only) */}
            <nav className="bottom-nav">
                <button 
                    className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => handleTabChange('dashboard')}
                >
                    <Home />
                    <span>แดชบอร์ด</span>
                </button>
                <button 
                    className={`bottom-nav-item ${activeTab === 'weather' ? 'active' : ''}`}
                    onClick={() => handleTabChange('weather')}
                >
                    <CloudSun />
                    <span>อากาศ</span>
                </button>
                <button 
                    className={`bottom-nav-item ${activeTab === 'todo' ? 'active' : ''}`}
                    onClick={() => handleTabChange('todo')}
                >
                    <CheckSquare />
                    <span>งาน</span>
                </button>
                <button 
                    className={`bottom-nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
                    onClick={() => handleTabChange('calendar')}
                >
                    <CalendarIcon />
                    <span>ปฏิทิน</span>
                </button>
                <button 
                    className={`bottom-nav-item ${activeTab === 'tracker' ? 'active' : ''}`}
                    onClick={() => handleTabChange('tracker')}
                >
                    <Wallet />
                    <span>การเงิน</span>
                </button>
                <button 
                    className={`bottom-nav-item ${activeTab === 'fuel-prices' ? 'active' : ''}`}
                    onClick={() => handleTabChange('fuel-prices')}
                >
                    <MapPin />
                    <span>น้ำมัน</span>
                </button>
            </nav>

            {/* Floating Mascot LINE Bot Assistant Widget */}
            <MascotLineWidget userEmail={user?.email || ''} userName={user?.name || 'คุณ'} />
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-primary)'
            }}>
                กำลังโหลด...
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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

// Icons
import { 
    LayoutDashboard, Home, CloudSun, CheckSquare, 
    Calendar as CalendarIcon, Wallet, MapPin, 
    Moon, Sun, LogOut 
} from 'lucide-react';

export default function DashboardPage() {
    const { user, logout, isLoading } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [currentDateStr, setCurrentDateStr] = useState<string>('');
    const [locationBadge, setLocationBadge] = useState<string>('ไทย');

    // Dynamic location badge from localStorage
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
        // Listen for storage changes (from weather tab)
        window.addEventListener('storage', updateBadge);
        const interval = setInterval(updateBadge, 3000);
        return () => { window.removeEventListener('storage', updateBadge); clearInterval(interval); };
    }, []);

    // Protected Route Verification
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [user, isLoading, router]);

    // Local Date display
    useEffect(() => {
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        setCurrentDateStr(today.toLocaleDateString('th-TH', options));
    }, []);

    if (isLoading || !user) {
        return (
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
                return <Overview user={user} setActiveTab={setActiveTab} />;
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
                return <Overview user={user} setActiveTab={setActiveTab} />;
        }
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };


    return (
        <div className="app-container">
            {/* Sidebar Navigation (Desktop) */}
            <aside className="sidebar">
                <div className="brand">
                    <LayoutDashboard className="brand-icon" />
                    <span className="brand-name">Personal Dashboard</span>
                </div>
                <nav className="nav-menu">
                    <button 
                        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <Home />
                        <span>แดชบอร์ด</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'weather' ? 'active' : ''}`}
                        onClick={() => setActiveTab('weather')}
                    >
                        <CloudSun />
                        <span>พยากรณ์อากาศ</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'todo' ? 'active' : ''}`}
                        onClick={() => setActiveTab('todo')}
                    >
                        <CheckSquare />
                        <span>รายการต้องทำ</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
                        onClick={() => setActiveTab('calendar')}
                    >
                        <CalendarIcon />
                        <span>ปฏิทินกิจกรรม</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'tracker' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tracker')}
                    >
                        <Wallet />
                        <span>รายรับ-รายจ่าย</span>
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'fuel-prices' ? 'active' : ''}`}
                        onClick={() => setActiveTab('fuel-prices')}
                    >
                        <MapPin />
                        <span>ราคาน้ำมัน</span>
                    </button>
                </nav>
                <div className="sidebar-footer">
                    <div className="location-badge">
                        <MapPin />
                        <span>{locationBadge}</span>
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
                        <div className="header-username">
                            สวัสดี, <span>{user.name}</span>
                        </div>
                        <button 
                            id="theme-toggle" 
                            className="header-btn" 
                            onClick={toggleTheme} 
                            title={theme === 'dark' ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'}
                        >
                            {theme === 'dark' ? <Sun /> : <Moon />}
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
                    onClick={() => setActiveTab('dashboard')}
                >
                    <Home />
                    <span>แดชบอร์ด</span>
                </button>
                <button 
                    className={`bottom-nav-item ${activeTab === 'weather' ? 'active' : ''}`}
                    onClick={() => setActiveTab('weather')}
                >
                    <CloudSun />
                    <span>อากาศ</span>
                </button>
                <button 
                    className={`bottom-nav-item ${activeTab === 'todo' ? 'active' : ''}`}
                    onClick={() => setActiveTab('todo')}
                >
                    <CheckSquare />
                    <span>งาน</span>
                </button>
                <button 
                    className={`bottom-nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
                    onClick={() => setActiveTab('calendar')}
                >
                    <CalendarIcon />
                    <span>ปฏิทิน</span>
                </button>
                <button 
                    className={`bottom-nav-item ${activeTab === 'tracker' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tracker')}
                >
                    <Wallet />
                    <span>การเงิน</span>
                </button>
                <button 
                    className={`bottom-nav-item ${activeTab === 'fuel-prices' ? 'active' : ''}`}
                    onClick={() => setActiveTab('fuel-prices')}
                >
                    <MapPin />
                    <span>น้ำมัน</span>
                </button>
            </nav>
        </div>
    );
}

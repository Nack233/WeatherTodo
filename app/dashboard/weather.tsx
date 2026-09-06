'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, 
    CloudRain, CloudLightning, Snowflake, Thermometer, 
    Droplets, Wind, RefreshCw, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { LocationPickerModal, LocationChips } from './location-picker';
import { DEFAULT_LOCATIONS, type SavedLocation } from '@/app/data/thailand-locations';
import { getWeatherMeta } from '@/utils/weather-codes';

// ============================================================
// Types
// ============================================================
interface WeatherInfo {
    current: {
        time: string;
        temperature_2m: number;
        relative_humidity_2m: number;
        apparent_temperature: number;
        precipitation: number;
        weather_code: number;
        cloud_cover: number;
        wind_speed_10m: number;
    };
    hourly: {
        time: string[];
        temperature_2m: number[];
        weather_code: number[];
        precipitation_probability: number[];
    };
    daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
    };
}

interface WeatherCacheEntry {
    timestamp: number;
    data: WeatherInfo;
}

type WeatherCache = Record<string, WeatherCacheEntry>;

// ============================================================
// Helpers
// ============================================================
const STORAGE_KEY_LOCATIONS = 'weather_saved_locations';
const STORAGE_KEY_ACTIVE = 'weather_active_location';

function loadSavedLocations(): SavedLocation[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_LOCATIONS);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch { /* ignore */ }
    return DEFAULT_LOCATIONS;
}

function saveLocations(locations: SavedLocation[]) {
    localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations));
}

function loadActiveId(locations: SavedLocation[]): string {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_ACTIVE);
        if (saved && locations.some((l) => l.id === saved)) return saved;
    } catch { /* ignore */ }
    return locations[0]?.id || '';
}

function cacheKeyFor(loc: SavedLocation): string {
    return `weather_${loc.lat.toFixed(4)}_${loc.lon.toFixed(4)}`;
}

// ============================================================
// Component
// ============================================================
export default function Weather() {
    const [locations, setLocations] = useState<SavedLocation[]>([]);
    const [activeId, setActiveId] = useState<string>('');
    const [weatherData, setWeatherData] = useState<WeatherInfo | null>(null);
    const [updateTime, setUpdateTime] = useState<string>('--:--');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
    const [hourlyViewMode, setHourlyViewMode] = useState<'next24' | 'today'>('next24');

    const railRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef<boolean>(false);
    const startXRef = useRef<number>(0);
    const scrollLeftRef = useRef<number>(0);

    // Mouse drag-to-scroll
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!railRef.current) return;
        isDraggingRef.current = true;
        startXRef.current = e.pageX - railRef.current.offsetLeft;
        scrollLeftRef.current = railRef.current.scrollLeft;
        railRef.current.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingRef.current || !railRef.current) return;
        e.preventDefault();
        const x = e.pageX - railRef.current.offsetLeft;
        const walk = (x - startXRef.current) * 1.5;
        railRef.current.scrollLeft = scrollLeftRef.current - walk;
    };

    const handleMouseUpOrLeave = () => {
        if (!railRef.current) return;
        isDraggingRef.current = false;
        railRef.current.style.cursor = 'grab';
    };

    // Smooth button scroll
    const scrollRail = (direction: 'left' | 'right') => {
        if (!railRef.current) return;
        const scrollAmount = 360;
        railRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    // Mouse wheel horizontal scroll conversion
    useEffect(() => {
        const el = railRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                el.scrollLeft += e.deltaY * 1.2;
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    // Auto-scroll to current hour
    useEffect(() => {
        if (!railRef.current) return;
        const currentPill = railRef.current.querySelector('[data-current="true"]') as HTMLElement;
        if (currentPill) {
            currentPill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [weatherData, hourlyViewMode]);

    // Init from localStorage
    useEffect(() => {
        const locs = loadSavedLocations();
        setLocations(locs);
        setActiveId(loadActiveId(locs));
    }, []);

    const renderWeatherIcon = (iconName: string, className?: string) => {
        switch(iconName) {
            case 'sun': return <Sun className={className} />;
            case 'cloud-sun': return <CloudSun className={className} />;
            case 'cloud': return <Cloud className={className} />;
            case 'cloud-fog': return <CloudFog className={className} />;
            case 'cloud-drizzle': return <CloudDrizzle className={className} />;
            case 'cloud-rain': return <CloudRain className={className} />;
            case 'cloud-lightning': return <CloudLightning className={className} />;
            case 'snowflake': return <Snowflake className={className} />;
            default: return <CloudSun className={className} />;
        }
    };

    const isValidWeatherCache = (data: unknown): data is WeatherInfo => {
        if (!data || typeof data !== 'object') return false;
        const w = data as Partial<WeatherInfo>;
        return Boolean(
            w.current &&
            typeof w.current.temperature_2m === 'number' &&
            w.hourly && Array.isArray(w.hourly.time) && w.hourly.time.length > 0 &&
            w.daily && Array.isArray(w.daily.time) && w.daily.time.length > 0
        );
    };

    const getTimeLabel = (timeStr: string) => {
        if (!timeStr) return '--:--';
        const timePart = timeStr.split('T')[1] || timeStr;
        return timePart.slice(0, 5);
    };

    const getHourlyForecast = (data: WeatherInfo, mode: 'next24' | 'today' = 'next24') => {
        if (!data?.hourly?.time || !Array.isArray(data.hourly.time)) {
            return [];
        }
        const currentTime = data.current?.time || data.hourly.time[0] || '';
        const dayPrefix = currentTime?.slice(0, 10) || '';
        const currentHourPrefix = currentTime?.slice(0, 13) || '';

        let startIndex = data.hourly.time.findIndex((time) => time.startsWith(currentHourPrefix));
        if (startIndex === -1) {
            startIndex = data.hourly.time.findIndex((time) => time >= currentTime);
            if (startIndex === -1) startIndex = 0;
        }

        if (mode === 'next24') {
            return data.hourly.time
                .slice(startIndex, startIndex + 24)
                .map((time) => {
                    const originalIdx = data.hourly.time.indexOf(time);
                    const isTomorrow = dayPrefix ? !time.startsWith(dayPrefix) : false;
                    return {
                        time,
                        temperature: Math.round(data.hourly.temperature_2m?.[originalIdx] ?? 0),
                        precipitationProbability: data.hourly.precipitation_probability?.[originalIdx] ?? 0,
                        code: data.hourly.weather_code?.[originalIdx] ?? 0,
                        isCurrent: time.startsWith(currentHourPrefix),
                        isTomorrow
                    };
                });
        }

        // Full day (00:00 - 23:00) of today
        return data.hourly.time
            .map((time, index) => ({
                time,
                temperature: Math.round(data.hourly.temperature_2m?.[index] ?? 0),
                precipitationProbability: data.hourly.precipitation_probability?.[index] ?? 0,
                code: data.hourly.weather_code?.[index] ?? 0,
                isCurrent: time.startsWith(currentHourPrefix),
                isTomorrow: false
            }))
            .filter((item) => !dayPrefix || item.time.startsWith(dayPrefix))
            .slice(0, 24);
    };

    const fetchWeather = useCallback(async (loc: SavedLocation, force = false) => {
        setIsLoading(true);
        const cKey = cacheKeyFor(loc);
        const cacheAgeLimit = 15 * 60 * 1000; // 15 mins
        const now = Date.now();

        // Check LocalStorage cache
        const cacheStr = localStorage.getItem('weather_cache');
        let cacheObj: WeatherCache = {};
        if (cacheStr) {
            try {
                const parsedCache = JSON.parse(cacheStr) as Partial<WeatherCache>;
                cacheObj = parsedCache as WeatherCache;
            } catch {
                cacheObj = {};
            }
        }

        const cachedEntry = cacheObj[cKey];
        if (!force && cachedEntry && isValidWeatherCache(cachedEntry.data) && (now - cachedEntry.timestamp < cacheAgeLimit)) {
            setWeatherData(cachedEntry.data);
            const timeObj = new Date(cachedEntry.timestamp);
            setUpdateTime(`อัปเดตล่าสุด: ${timeObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`);
            setIsLoading(false);
            return;
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Bangkok`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('API fetch failed');
            const data = await response.json();
            
            if (isValidWeatherCache(data)) {
                // Update cache
                cacheObj[cKey] = {
                    timestamp: now,
                    data: data
                };
                localStorage.setItem('weather_cache', JSON.stringify(cacheObj));
                
                setWeatherData(data);
                const timeObj = new Date(now);
                setUpdateTime(`อัปเดตล่าสุด: ${timeObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`);
            } else {
                throw new Error('Invalid weather data structure received');
            }
        } catch (error) {
            console.error('Error fetching weather:', error);
            // Fallback to old cache if valid
            if (cachedEntry && isValidWeatherCache(cachedEntry.data)) {
                setWeatherData(cachedEntry.data);
                const timeObj = new Date(cachedEntry.timestamp);
                setUpdateTime(`แคชเก่า (${timeObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)`);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch weather when active location changes
    useEffect(() => {
        if (!activeId || locations.length === 0) return;
        const loc = locations.find((l) => l.id === activeId);
        if (!loc) return;

        localStorage.setItem(STORAGE_KEY_ACTIVE, activeId);
        const timer = window.setTimeout(() => {
            void fetchWeather(loc);
        }, 0);

        return () => window.clearTimeout(timer);
    }, [activeId, locations, fetchWeather]);

    // Handlers
    const handleAddLocation = (loc: SavedLocation) => {
        const updated = [...locations, loc];
        setLocations(updated);
        saveLocations(updated);
        setActiveId(loc.id);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('weather_location_change'));
        }
    };

    const handleRemoveLocation = (id: string) => {
        const updated = locations.filter((l) => l.id !== id);
        if (updated.length === 0) {
            // Don't allow removing all — reset to defaults
            setLocations(DEFAULT_LOCATIONS);
            saveLocations(DEFAULT_LOCATIONS);
            setActiveId(DEFAULT_LOCATIONS[0].id);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('weather_location_change'));
            }
            return;
        }
        setLocations(updated);
        saveLocations(updated);
        if (activeId === id) {
            setActiveId(updated[0].id);
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('weather_location_change'));
        }
    };

    const handleSelectLocation = (id: string) => {
        setActiveId(id);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('weather_location_change'));
        }
    };

    const activeLoc = locations.find((l) => l.id === activeId);
    const currentMeta = weatherData ? getWeatherMeta(weatherData.current.weather_code) : { text: 'กำลังโหลด...', icon: 'sun' };
    const hourlyForecast = weatherData ? getHourlyForecast(weatherData, hourlyViewMode) : [];
    const maxHourlyRainChance = hourlyForecast.length > 0 ? Math.max(...hourlyForecast.map((item) => item.precipitationProbability)) : 0;

    const getDayName = (dateStr: string, index: number) => {
        if (index === 0) return 'วันนี้';
        if (index === 1) return 'พรุ่งนี้';
        
        const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        const date = new Date(dateStr);
        return dayNames[date.getDay()];
    };

    // Build display name for active location
    const displayName = activeLoc?.name || 'เลือกสถานที่';
    const displayDistrict = [activeLoc?.district, activeLoc?.province].filter(Boolean).join(', ');

    const getAmbientGlowClass = (icon: string) => {
        if (icon.includes('rain') || icon.includes('lightning') || icon.includes('drizzle')) return 'ambient-glow-rain';
        if (icon.includes('cloud') || icon.includes('fog')) return 'ambient-glow-cloud';
        return 'ambient-glow-sun';
    };

    return (
        <div>
            {/* Location Chips Bar */}
            <LocationChips
                locations={locations}
                activeId={activeId}
                onSelect={handleSelectLocation}
                onRemove={handleRemoveLocation}
                onAddClick={() => setIsPickerOpen(true)}
            />

            <div className="bento-weather-grid">
                {/* 1. Bento Hero Card (Span 7) */}
                <div className="bento-card glass-effect bento-col-7 bento-hero-weather">
                    <div className={`ambient-weather-glow ${getAmbientGlowClass(currentMeta.icon)}`} />
                    <div className="bento-hero-header">
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <h2 style={{ fontSize: '1.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{displayName}</h2>
                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', fontWeight: 700, letterSpacing: '0.5px' }}>
                                    LIVE
                                </span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.92rem' }}>{displayDistrict}</p>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                อัปเดตล่าสุด {updateTime}
                            </div>
                        </div>
                        <button 
                            className="icon-btn" 
                            onClick={() => activeLoc && fetchWeather(activeLoc, true)}
                            title="รีเฟรชข้อมูลสภาพอากาศ"
                            disabled={isLoading}
                            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)' }}
                        >
                            <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="bento-hero-body">
                        <div>
                            <div className="bento-hero-temp">
                                {weatherData ? `${Math.round(weatherData.current.temperature_2m)}°` : '--°'}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.5rem' }}>
                                <span className="weather-highlight-pill" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}>
                                    💧 โอกาสฝน {maxHourlyRainChance}%
                                </span>
                                {weatherData && (
                                    <span className="weather-highlight-pill muted" style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}>
                                        รู้สึกเหมือน {Math.round(weatherData.current.apparent_temperature)}°C
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="bento-hero-condition">
                            {renderWeatherIcon(currentMeta.icon, "bento-hero-condition-icon animate-float")}
                            <span className="bento-hero-condition-name">{currentMeta.text}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Bento Stat Tiles (Span 5) - 2x2 Matrix */}
                <div className="bento-col-5">
                    <div className="bento-metrics-grid">
                        {/* Tile 1: Feels Like */}
                        <div className="bento-metric-tile glass-effect">
                            <div className="bento-tile-top">
                                <span className="bento-tile-label">รู้สึกเหมือน</span>
                                <div className="bento-tile-icon-box amber">
                                    <Thermometer size={18} />
                                </div>
                            </div>
                            <div>
                                <div className="bento-tile-value">{weatherData ? `${Math.round(weatherData.current.apparent_temperature)}°C` : '--'}</div>
                                <div className="bento-tile-sub">อุณหภูมิร่างกายรับรู้</div>
                            </div>
                        </div>

                        {/* Tile 2: Humidity */}
                        <div className="bento-metric-tile glass-effect">
                            <div className="bento-tile-top">
                                <span className="bento-tile-label">ความชื้นสัมพัทธ์</span>
                                <div className="bento-tile-icon-box cyan">
                                    <Droplets size={18} />
                                </div>
                            </div>
                            <div>
                                <div className="bento-tile-value">{weatherData ? `${weatherData.current.relative_humidity_2m}%` : '--'}</div>
                                <div className="bento-tile-sub">{weatherData && weatherData.current.relative_humidity_2m > 75 ? 'ความชื้นสูง' : 'ระดับปกติ'}</div>
                            </div>
                        </div>

                        {/* Tile 3: Wind Speed */}
                        <div className="bento-metric-tile glass-effect">
                            <div className="bento-tile-top">
                                <span className="bento-tile-label">ความเร็วลม</span>
                                <div className="bento-tile-icon-box blue">
                                    <Wind size={18} />
                                </div>
                            </div>
                            <div>
                                <div className="bento-tile-value">{weatherData ? `${weatherData.current.wind_speed_10m}` : '--'} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>กม./ชม.</span></div>
                                <div className="bento-tile-sub">ระดับลมผิวพื้น</div>
                            </div>
                        </div>

                        {/* Tile 4: Cloud Cover */}
                        <div className="bento-metric-tile glass-effect">
                            <div className="bento-tile-top">
                                <span className="bento-tile-label">ปริมาณเมฆ</span>
                                <div className="bento-tile-icon-box purple">
                                    <Cloud size={18} />
                                </div>
                            </div>
                            <div>
                                <div className="bento-tile-value">{weatherData ? `${weatherData.current.cloud_cover}%` : '--'}</div>
                                <div className="bento-tile-sub">{weatherData && weatherData.current.cloud_cover > 70 ? 'เมฆมาก' : 'ท้องฟ้าโปร่ง'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Hourly Forecast Rail (Span 12) */}
                <div className="bento-card glass-effect bento-col-12">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CloudSun size={20} style={{ color: 'var(--accent-cyan)' }} />
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                พยากรณ์รายชั่วโมง (Hourly Rail)
                            </h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div className="segmented-pill-bar">
                                <button 
                                    type="button"
                                    className={`segmented-pill-btn ${hourlyViewMode === 'next24' ? 'active' : ''}`}
                                    onClick={() => setHourlyViewMode('next24')}
                                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                                >
                                    24 ชม. ข้างหน้า
                                </button>
                                <button 
                                    type="button"
                                    className={`segmented-pill-btn ${hourlyViewMode === 'today' ? 'active' : ''}`}
                                    onClick={() => setHourlyViewMode('today')}
                                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                                >
                                    ทั้งวัน (00:00 - 23:00)
                                </button>
                            </div>

                            {/* Mouse Scroll Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <button 
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => scrollRail('left')}
                                    title="เลื่อนไปทางซ้าย (หรือใช้ลูกกลิ้งเมาส์ / ลากเมาส์)"
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button 
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => scrollRail('right')}
                                    title="เลื่อนไปทางขวา (หรือใช้ลูกกลิ้งเมาส์ / ลากเมาส์)"
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {weatherData ? (
                        <div 
                            ref={railRef}
                            className="bento-hourly-rail"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUpOrLeave}
                            onMouseLeave={handleMouseUpOrLeave}
                            style={{ cursor: 'grab', userSelect: 'none' }}
                        >
                            {hourlyForecast.map((item, i) => {
                                const meta = getWeatherMeta(item.code);
                                return (
                                    <div 
                                        key={item.time || i} 
                                        data-current={item.isCurrent ? 'true' : 'false'}
                                        className="bento-hourly-pill"
                                        style={item.isCurrent ? { 
                                            borderColor: 'var(--accent-cyan)', 
                                            background: 'rgba(6, 182, 212, 0.1)',
                                            boxShadow: '0 0 16px rgba(6, 182, 212, 0.2)'
                                        } : {}}
                                    >
                                        {item.isCurrent ? (
                                            <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'var(--accent-cyan)', color: '#000', fontWeight: 700, marginBottom: '-0.3rem' }}>
                                                ตอนนี้
                                            </span>
                                        ) : item.isTomorrow ? (
                                            <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '-0.3rem' }}>
                                                พรุ่งนี้
                                            </span>
                                        ) : null}
                                        <span className="bento-hourly-time" style={item.isCurrent ? { color: 'var(--accent-cyan)', fontWeight: 700 } : {}}>
                                            {getTimeLabel(item.time)}
                                        </span>
                                        {renderWeatherIcon(meta.icon, 'bento-hourly-icon')}
                                        <span className="bento-hourly-temp">{item.temperature}°</span>
                                        <span className="bento-hourly-rain" title="โอกาสเกิดฝน">
                                            <CloudRain size={11} />
                                            {item.precipitationProbability}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state-text" style={{ padding: '2rem 0' }}>กำลังโหลดพยากรณ์รายชั่วโมง...</div>
                    )}
                </div>

                {/* 4. 7-Day Forecast Bento (Span 12) */}
                <div className="bento-card glass-effect bento-col-12">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        <Thermometer size={20} style={{ color: 'var(--accent-yellow)' }} />
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                            พยากรณ์อากาศล่วงหน้า 7 วัน (7-Day Trend)
                        </h3>
                    </div>

                    {weatherData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {weatherData.daily.time.map((time, idx) => {
                                const code = weatherData.daily.weather_code[idx];
                                const meta = getWeatherMeta(code);
                                const minTemp = Math.round(weatherData.daily.temperature_2m_min[idx]);
                                const maxTemp = Math.round(weatherData.daily.temperature_2m_max[idx]);
                                const rainProb = weatherData.daily.precipitation_probability_max[idx];

                                return (
                                    <div key={idx} className="bento-daily-row">
                                        <span className="bento-daily-day">{getDayName(time, idx)}</span>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '140px' }}>
                                            {renderWeatherIcon(meta.icon, "forecast-icon text-cyan")}
                                            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{meta.text}</span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: '75px', color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>
                                            <CloudRain size={14} />
                                            <span>{rainProb}%</span>
                                        </div>

                                        <div className="bento-daily-bar-container">
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '28px', textAlign: 'right' }}>
                                                {minTemp}°
                                            </span>
                                            <div className="bento-temp-bar-bg">
                                                <div 
                                                    className="bento-temp-bar-fill" 
                                                    style={{ 
                                                        width: `${Math.min(100, Math.max(15, (maxTemp - minTemp) * 10))}%`,
                                                        marginLeft: `${Math.min(60, Math.max(0, (minTemp - 15) * 4))}%` 
                                                    }} 
                                                />
                                            </div>
                                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: '28px' }}>
                                                {maxTemp}°
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state-text" style={{ padding: '2rem 0' }}>กำลังโหลดพยากรณ์รายวัน...</div>
                    )}
                </div>
            </div>

            {/* Location Picker Modal */}
            <LocationPickerModal
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onAddLocation={handleAddLocation}
                existingLocations={locations}
            />
        </div>
    );
}

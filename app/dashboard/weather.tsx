'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, 
    CloudRain, CloudLightning, Snowflake, Thermometer, 
    Droplets, Wind, RefreshCw 
} from 'lucide-react';
import { LocationPickerModal, LocationChips } from './location-picker';
import { DEFAULT_LOCATIONS, type SavedLocation } from '@/app/data/thailand-locations';

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

    // Init from localStorage
    useEffect(() => {
        const locs = loadSavedLocations();
        setLocations(locs);
        setActiveId(loadActiveId(locs));
    }, []);

    const weatherCodes: Record<number, { text: string; icon: string }> = {
        0: { text: 'ท้องฟ้าโปร่ง', icon: 'sun' },
        1: { text: 'ท้องฟ้าโปร่งส่วนใหญ่', icon: 'cloud-sun' },
        2: { text: 'มีเมฆบางส่วน', icon: 'cloud-sun' },
        3: { text: 'ท้องฟ้าครึ้มมีเมฆหนา', icon: 'cloud' },
        45: { text: 'มีหมอกจัด', icon: 'cloud-fog' },
        48: { text: 'มีหมอกน้ำค้างแข็ง', icon: 'cloud-fog' },
        71: { text: 'ฝนตกปรอยๆ เล็กน้อย', icon: 'cloud-drizzle' },
        51: { text: 'ฝนตกปรอยๆ เล็กน้อย', icon: 'cloud-drizzle' },
        53: { text: 'ฝนตกปรอยๆ ปานกลาง', icon: 'cloud-drizzle' },
        55: { text: 'ฝนตกปรอยๆ หนาแน่น', icon: 'cloud-drizzle' },
        61: { text: 'ฝนตกเล็กน้อย', icon: 'cloud-rain' },
        63: { text: 'ฝนตกปานกลาง', icon: 'cloud-rain' },
        65: { text: 'ฝนตกหนัก', icon: 'cloud-rain' },
        80: { text: 'ฝนไล่ช้างตกเบาบาง', icon: 'cloud-rain' },
        81: { text: 'ฝนไล่ช้างตกปานกลาง', icon: 'cloud-rain' },
        82: { text: 'ฝนไล่ช้างตกหนักมาก', icon: 'cloud-lightning' },
        95: { text: 'พายุฝนฟ้าคะนอง', icon: 'cloud-lightning' },
        96: { text: 'พายุฝนฟ้าคะนองมีลูกเห็บตกเล็กน้อย', icon: 'cloud-lightning' },
        99: { text: 'พายุฝนฟ้าคะนองมีลูกเห็บตกหนัก', icon: 'cloud-lightning' }
    };

    const getWeatherMeta = (code: number) => {
        return weatherCodes[code] || { text: 'สภาพอากาศทั่วไป', icon: 'cloud-sun' };
    };

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

    const getHourlyForecast = (data: WeatherInfo) => {
        if (!data?.hourly?.time || !Array.isArray(data.hourly.time)) {
            return [];
        }
        const currentTime = data.current?.time || data.hourly.time[0] || '';
        const dayPrefix = currentTime?.slice(0, 10) || '';
        const startIndex = data.hourly.time.findIndex((time) => time === currentTime);

        return data.hourly.time
            .map((time, index) => ({
                time,
                temperature: Math.round(data.hourly.temperature_2m?.[index] ?? 0),
                precipitationProbability: data.hourly.precipitation_probability?.[index] ?? 0,
                code: data.hourly.weather_code?.[index] ?? 0
            }))
            .filter((item, index) => {
                if (dayPrefix && !item.time.startsWith(dayPrefix)) {
                    return false;
                }

                if (startIndex >= 0) {
                    return index >= startIndex;
                }

                return true;
            })
            .slice(0, 12);
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
    };

    const handleRemoveLocation = (id: string) => {
        const updated = locations.filter((l) => l.id !== id);
        if (updated.length === 0) {
            // Don't allow removing all — reset to defaults
            setLocations(DEFAULT_LOCATIONS);
            saveLocations(DEFAULT_LOCATIONS);
            setActiveId(DEFAULT_LOCATIONS[0].id);
            return;
        }
        setLocations(updated);
        saveLocations(updated);
        if (activeId === id) {
            setActiveId(updated[0].id);
        }
    };

    const handleSelectLocation = (id: string) => {
        setActiveId(id);
    };

    const activeLoc = locations.find((l) => l.id === activeId);
    const currentMeta = weatherData ? getWeatherMeta(weatherData.current.weather_code) : { text: 'กำลังโหลด...', icon: 'sun' };
    const hourlyForecast = weatherData ? getHourlyForecast(weatherData) : [];
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

            <div className="weather-detail-layout">
                {/* Current Weather Card */}
                <div className="card weather-main-card" style={{ position: 'relative' }}>
                    <button 
                        className="icon-btn" 
                        onClick={() => activeLoc && fetchWeather(activeLoc, true)}
                        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}
                        title="รีเฟรชข้อมูลสภาพอากาศ"
                        disabled={isLoading}
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>

                    <div className="weather-main-header">
                        <div className="location-details">
                            <h2>{displayName}</h2>
                            <p>{displayDistrict}</p>
                        </div>
                        <div className="weather-main-time" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {updateTime}
                        </div>
                        <div className="weather-highlight-row">
                            <span className="weather-highlight-pill">
                                โอกาสฝนสูงสุดวันนี้ {maxHourlyRainChance}%
                            </span>
                            <span className="weather-highlight-pill muted">
                                รายชั่วโมง {hourlyForecast.length} ช่วงเวลา
                            </span>
                        </div>
                    </div>

                    {weatherData ? (
                        <div className="weather-main-body" style={{ marginTop: '1.5rem' }}>
                            <div className="temp-condition">
                                <span className="giant-temp">{Math.round(weatherData.current.temperature_2m)}°C</span>
                                <div className="condition-group">
                                    {renderWeatherIcon(currentMeta.icon, "weather-huge-icon animate-float")}
                                    <span className="condition-text">{currentMeta.text}</span>
                                </div>
                            </div>

                            <div className="weather-sub-stats" style={{ marginTop: '2.5rem' }}>
                                <div className="sub-stat">
                                    <Thermometer />
                                    <div className="stat-info">
                                        <span className="label">รู้สึกเหมือน</span>
                                        <span className="value">{Math.round(weatherData.current.apparent_temperature)}°C</span>
                                    </div>
                                </div>
                                <div className="sub-stat">
                                    <Droplets />
                                    <div className="stat-info">
                                        <span className="label">ความชื้น</span>
                                        <span className="value">{weatherData.current.relative_humidity_2m}%</span>
                                    </div>
                                </div>
                                <div className="sub-stat">
                                    <Wind />
                                    <div className="stat-info">
                                        <span className="label">ความเร็วลม</span>
                                        <span className="value">{weatherData.current.wind_speed_10m} กม./ชม.</span>
                                    </div>
                                </div>
                                <div className="sub-stat">
                                    <Cloud />
                                    <div className="stat-info">
                                        <span className="label">เมฆปกคลุม</span>
                                        <span className="value">{weatherData.current.cloud_cover}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state-text" style={{ padding: '4rem 0' }}>
                            กำลังโหลดพิกัดพยากรณ์อากาศ...
                        </div>
                    )}
                </div>

                <div className="weather-side-column">
                    <div className="card forecast-card hourly-forecast-card">
                        <h3 className="section-title">พยากรณ์รายชั่วโมงของวันนี้</h3>
                        {weatherData ? (
                            <div className="hourly-forecast-list">
                                {hourlyForecast.map((item) => {
                                    const meta = getWeatherMeta(item.code);

                                    return (
                                        <div key={item.time} className="hourly-forecast-item">
                                            <span className="hourly-time">{getTimeLabel(item.time)}</span>
                                            <span className="hourly-condition">
                                                {renderWeatherIcon(meta.icon, 'hourly-icon')}
                                                <span>{meta.text}</span>
                                            </span>
                                            <span className="hourly-temp">{item.temperature}°</span>
                                            <span className="rain-prob hourly-rain-prob" title="โอกาสเกิดฝน">
                                                <CloudRain size={14} />
                                                {item.precipitationProbability}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state-text">
                                กำลังโหลดพยากรณ์รายชั่วโมง...
                            </div>
                        )}
                    </div>

                    <div className="card forecast-card">
                        <h3 className="section-title">พยากรณ์อากาศล่วงหน้า 7 วัน</h3>
                        {weatherData ? (
                            <div className="forecast-list">
                                {weatherData.daily.time.map((time, idx) => {
                                    const code = weatherData.daily.weather_code[idx];
                                    const meta = getWeatherMeta(code);
                                    const minTemp = Math.round(weatherData.daily.temperature_2m_min[idx]);
                                    const maxTemp = Math.round(weatherData.daily.temperature_2m_max[idx]);
                                    const rainProb = weatherData.daily.precipitation_probability_max[idx];

                                    return (
                                        <div key={idx} className="forecast-item">
                                            <span className="day">{getDayName(time, idx)}</span>
                                            <span className="rain-prob" title="โอกาสเกิดฝน">
                                                <CloudRain size={14} style={{ display: 'inline', marginRight: '2px', verticalAlign: 'middle' }} />
                                                {rainProb}%
                                            </span>
                                            <span style={{ justifySelf: 'center' }}>
                                                {renderWeatherIcon(meta.icon, "forecast-icon text-cyan")}
                                            </span>
                                            <span className="temp-range">
                                                <span className="temp-min">{minTemp}°</span>
                                                <span className="temp-max">{maxTemp}°</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state-text">
                                กำลังโหลดพยากรณ์รายวัน...
                            </div>
                        )}
                    </div>
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

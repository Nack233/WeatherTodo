'use client';

import React, { useState, useEffect } from 'react';
import { 
    Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, 
    CloudRain, CloudLightning, Snowflake, Thermometer, 
    Droplets, Wind, RefreshCw 
} from 'lucide-react';

interface WeatherInfo {
    current: {
        temperature_2m: number;
        relative_humidity_2m: number;
        apparent_temperature: number;
        precipitation: number;
        weather_code: number;
        cloud_cover: number;
        wind_speed_10m: number;
    };
    daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
    };
}

export default function Weather() {
    const locations = {
        pongnamron: {
            name: 'ตำบลโป่งน้ำร้อน',
            district: 'อำเภอโป่งน้ำร้อน, จันทบุรี',
            lat: 12.9167,
            lon: 102.2667
        },
        saton: {
            name: 'ตำบลสะตอน',
            district: 'อำเภอสอยดาว, จันทบุรี',
            lat: 13.1300,
            lon: 102.2600
        }
    };

    const [activeLoc, setActiveLoc] = useState<'pongnamron' | 'saton'>('pongnamron');
    const [weatherData, setWeatherData] = useState<WeatherInfo | null>(null);
    const [updateTime, setUpdateTime] = useState<string>('--:--');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const weatherCodes: Record<number, { text: string; icon: string }> = {
        0: { text: 'ท้องฟ้าโปร่ง', icon: 'sun' },
        1: { text: 'ท้องฟ้าโปร่งส่วนใหญ่', icon: 'cloud-sun' },
        2: { text: 'มีเมฆบางส่วน', icon: 'cloud-sun' },
        3: { text: 'ท้องฟ้าครึ้มมีเมฆหนา', icon: 'cloud' },
        45: { text: 'มีหมอกจัด', icon: 'cloud-fog' },
        48: { text: 'มีหมอกน้ำค้างแข็ง', icon: 'cloud-fog' },
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

    const fetchWeather = async (locKey: 'pongnamron' | 'saton', force = false) => {
        setIsLoading(true);
        const loc = locations[locKey];
        const cacheKey = `weather_${locKey}`;
        const cacheAgeLimit = 15 * 60 * 1000; // 15 mins
        const now = Date.now();

        // Check LocalStorage cache
        const cacheStr = localStorage.getItem('weather_cache');
        let cacheObj: any = {};
        if (cacheStr) {
            try {
                cacheObj = JSON.parse(cacheStr);
            } catch (e) {
                cacheObj = {};
            }
        }

        if (!force && cacheObj[cacheKey] && (now - cacheObj[cacheKey].timestamp < cacheAgeLimit)) {
            setWeatherData(cacheObj[cacheKey].data);
            const timeObj = new Date(cacheObj[cacheKey].timestamp);
            setUpdateTime(`อัปเดตล่าสุด: ${timeObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`);
            setIsLoading(false);
            return;
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Bangkok`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('API fetch failed');
            const data = await response.json();
            
            // Update cache
            cacheObj[cacheKey] = {
                timestamp: now,
                data: data
            };
            localStorage.setItem('weather_cache', JSON.stringify(cacheObj));
            
            setWeatherData(data);
            const timeObj = new Date(now);
            setUpdateTime(`อัปเดตล่าสุด: ${timeObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`);
        } catch (error) {
            console.error('Error fetching weather:', error);
            // Fallback to old cache if available
            if (cacheObj[cacheKey]) {
                setWeatherData(cacheObj[cacheKey].data);
                const timeObj = new Date(cacheObj[cacheKey].timestamp);
                setUpdateTime(`แคชเก่า (${timeObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Load initial weather
    useEffect(() => {
        fetchWeather(activeLoc);
    }, [activeLoc]);

    const activeInfo = locations[activeLoc];
    const currentMeta = weatherData ? getWeatherMeta(weatherData.current.weather_code) : { text: 'กำลังโหลด...', icon: 'sun' };

    const getDayName = (dateStr: string, index: number) => {
        if (index === 0) return 'วันนี้';
        if (index === 1) return 'พรุ่งนี้';
        
        const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        const date = new Date(dateStr);
        return dayNames[date.getDay()];
    };

    return (
        <div>
            <div className="weather-controls">
                <button 
                    className={`btn-toggle ${activeLoc === 'pongnamron' ? 'active' : ''}`}
                    onClick={() => setActiveLoc('pongnamron')}
                >
                    ตำบลโป่งน้ำร้อน (อ.โป่งน้ำร้อน)
                </button>
                <button 
                    className={`btn-toggle ${activeLoc === 'saton' ? 'active' : ''}`}
                    onClick={() => setActiveLoc('saton')}
                >
                    ตำบลสะตอน (อ.สอยดาว)
                </button>
            </div>

            <div className="weather-detail-layout">
                {/* Current Weather Card */}
                <div className="card weather-main-card" style={{ position: 'relative' }}>
                    <button 
                        className="icon-btn" 
                        onClick={() => fetchWeather(activeLoc, true)}
                        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}
                        title="รีเฟรชข้อมูลสภาพอากาศ"
                        disabled={isLoading}
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>

                    <div className="weather-main-header">
                        <div className="location-details">
                            <h2>{activeInfo.name}</h2>
                            <p>{activeInfo.district}</p>
                        </div>
                        <div className="weather-main-time" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {updateTime}
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

                {/* Forecast Card */}
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
    );
}

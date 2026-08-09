'use client';

import React, { useState, useEffect } from 'react';
import { CloudRain, CheckSquare, Calendar, Wallet, TrendingUp, TrendingDown, Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudLightning, Snowflake } from 'lucide-react';
import { User } from '../providers';
import { getTodos } from '@/app/actions/todo-actions';
import { getCalendarEvents } from '@/app/actions/calendar-actions';
import { getExpenses } from '@/app/actions/tracker-actions';

type CalendarEventSummary = {
    id: string;
    title: string;
    time: string;
    tag: string | null;
};

interface OverviewProps {
    user: User | null;
    setActiveTab: (tab: string) => void;
}

export default function Overview({ user, setActiveTab }: OverviewProps) {
    const [weatherTemp, setWeatherTemp] = useState<string>('--°C');
    const [weatherDesc, setWeatherDesc] = useState<string>('กำลังโหลดข้อมูล...');
    const [weatherIcon, setWeatherIcon] = useState<string>('sun');

    const [todoCount, setTodoCount] = useState<string>('0/0 รายการ');
    const [todoPercent, setTodoPercent] = useState<number>(0);
    const [todoList, setTodoList] = useState<string[]>([]);

    const [todayEvents, setTodayEvents] = useState<CalendarEventSummary[]>([]);

    const [balanceText, setBalanceText] = useState<string>('฿0.00');
    const [incomeText, setIncomeText] = useState<string>('฿0.00');
    const [expenseText, setExpenseText] = useState<string>('฿0.00');

    const getWeatherMeta = (code: number) => {
        const metaMap: Record<number, { text: string; icon: string }> = {
            0: { text: 'ท้องฟ้าโปร่ง', icon: 'sun' },
            1: { text: 'ท้องฟ้าโปร่งเป็นส่วนใหญ่', icon: 'cloud-sun' },
            2: { text: 'มีเมฆบางส่วน', icon: 'cloud-sun' },
            3: { text: 'ท้องฟ้าครึ้มมีเมฆหนา', icon: 'cloud' },
            45: { text: 'มีหมอกจัด', icon: 'cloud-fog' },
            48: { text: 'มีหมอกน้ำค้างแข็ง', icon: 'cloud-fog' },
            51: { text: 'ฝนตกปรอยๆ', icon: 'cloud-drizzle' },
            53: { text: 'ฝนตกปรอยๆ ปานกลาง', icon: 'cloud-drizzle' },
            55: { text: 'ฝนตกปรอยๆ หนาแน่น', icon: 'cloud-drizzle' },
            61: { text: 'ฝนตกเล็กน้อย', icon: 'cloud-rain' },
            63: { text: 'ฝนตกปานกลาง', icon: 'cloud-rain' },
            65: { text: 'ฝนตกหนัก', icon: 'cloud-rain' },
            80: { text: 'ฝนไล่ช้างตก', icon: 'cloud-rain' },
            81: { text: 'ฝนไล่ช้างตกปานกลาง', icon: 'cloud-rain' },
            82: { text: 'ฝนไล่ช้างตกหนัก', icon: 'cloud-lightning' },
            95: { text: 'พายุฝนฟ้าคะนอง', icon: 'cloud-lightning' },
            96: { text: 'พายุฝนฟ้าคะนองมีลูกเห็บตกเล็กน้อย', icon: 'cloud-lightning' },
            99: { text: 'พายุฝนฟ้าคะนองมีลูกเห็บตกหนัก', icon: 'cloud-lightning' }
        };

        return metaMap[code] || { text: 'สภาพอากาศทั่วไป', icon: 'cloud-sun' };
    };

    const renderWeatherIcon = (iconName: string) => {
        switch (iconName) {
            case 'sun': return <Sun className="weather-giant-icon animate-float" />;
            case 'cloud-sun': return <CloudSun className="weather-giant-icon animate-float" />;
            case 'cloud': return <Cloud className="weather-giant-icon animate-float" />;
            case 'cloud-fog': return <CloudFog className="weather-giant-icon animate-float" />;
            case 'cloud-drizzle': return <CloudDrizzle className="weather-giant-icon animate-float" />;
            case 'cloud-rain': return <CloudRain className="weather-giant-icon animate-float" />;
            case 'cloud-lightning': return <CloudLightning className="weather-giant-icon animate-float" />;
            case 'snowflake': return <Snowflake className="weather-giant-icon animate-float" />;
            default: return <CloudSun className="weather-giant-icon animate-float" />;
        }
    };

    // Load states on mount
    useEffect(() => {
        const loadOverview = async () => {
            try {
                const weatherResponse = await fetch('https://api.open-meteo.com/v1/forecast?latitude=12.9167&longitude=102.2667&current=temperature_2m,weather_code&timezone=Asia/Bangkok', { cache: 'no-store' });
                if (weatherResponse.ok) {
                    const weatherData = await weatherResponse.json();
                    const temp = Math.round(weatherData.current.temperature_2m);
                    const weatherMeta = getWeatherMeta(weatherData.current.weather_code);
                    setWeatherTemp(`${temp}°C`);
                    setWeatherDesc(weatherMeta.text);
                    setWeatherIcon(weatherMeta.icon);
                } else {
                    const cached = localStorage.getItem('weather_cache');
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        const pongCache = parsed['weather_pongnamron'];
                        if (pongCache) {
                            const temp = Math.round(pongCache.data.current.temperature_2m);
                            const weatherMeta = getWeatherMeta(pongCache.data.current.weather_code);
                            setWeatherTemp(`${temp}°C`);
                            setWeatherDesc(weatherMeta.text);
                            setWeatherIcon(weatherMeta.icon);
                        }
                    }
                }
            } catch {
                const cached = localStorage.getItem('weather_cache');
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        const pongCache = parsed['weather_pongnamron'];
                        if (pongCache) {
                            const temp = Math.round(pongCache.data.current.temperature_2m);
                            const weatherMeta = getWeatherMeta(pongCache.data.current.weather_code);
                            setWeatherTemp(`${temp}°C`);
                            setWeatherDesc(weatherMeta.text);
                            setWeatherIcon(weatherMeta.icon);
                        }
                    } catch {
                        // Keep defaults if both live fetch and cache fail.
                    }
                }
            }

            const [todosResult, eventsResult, expensesResult] = await Promise.all([
                getTodos(),
                getCalendarEvents(),
                getExpenses(),
            ]);

            if (!todosResult.error && todosResult.data) {
                const active = todosResult.data.filter((t) => !t.completed);
                const total = todosResult.data.length;
                const completed = total - active.length;
                const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

                setTodoCount(`${completed}/${total} รายการ`);
                setTodoPercent(percent);
                setTodoList(active.slice(0, 3).map((t) => t.title));
            }

            if (!eventsResult.error && eventsResult.data) {
                const todayStr = new Date().toISOString().split('T')[0];
                const list = eventsResult.data
                    .filter((event) => event.start_date.split('T')[0] === todayStr)
                    .map((event) => ({
                        id: event.id,
                        title: event.title,
                        time: event.start_date.includes('T') ? event.start_date.split('T')[1].slice(0, 5) : 'ตลอดวัน',
                        tag: event.color,
                    }))
                    .sort((a, b) => a.time.localeCompare(b.time));

                setTodayEvents(list.slice(0, 2));
            }

            if (!expensesResult.error && expensesResult.data) {
                let inc = 0;
                let exp = 0;
                expensesResult.data.forEach((t) => {
                    if (t.type === 'income') inc += Number(t.amount);
                    else exp += Number(t.amount);
                });
                const bal = inc - exp;

                const formatShort = (val: number) => '฿' + val.toLocaleString('th-TH', { maximumFractionDigits: 0 });
                setBalanceText(formatShort(bal));
                setIncomeText(formatShort(inc));
                setExpenseText(formatShort(exp));
            }
        };

        void loadOverview();
    }, []);

    // Helper to get matching accent border color for event tag
    const getEventBorderColor = (tag: string | null) => {
        if (tag === 'tag-red') return 'var(--accent-red)';
        if (tag === 'tag-green') return 'var(--accent-green)';
        if (tag === 'tag-yellow') return 'var(--accent-yellow)';
        return 'var(--primary)';
    };

    return (
        <div className="dashboard-grid">
            {/* Quick Weather Widget */}
            <div className="card weather-quick-card ripple" onClick={() => setActiveTab('weather')}>
                <div className="card-header">
                    <span className="card-tag">อากาศวันนี้ {user?.name ? `· ${user.name}` : ''}</span>
                    <CloudRain className="card-icon-header text-cyan" />
                </div>
                <div className="weather-quick-body">
                    <div className="weather-quick-info">
                        <h3>{weatherTemp}</h3>
                        <p>{weatherDesc}</p>
                        <span className="location-sub">ตำบลโป่งน้ำร้อน · ข้อมูลสดจาก Open-Meteo</span>
                    </div>
                    <div className="weather-quick-graphic">
                        {renderWeatherIcon(weatherIcon)}
                    </div>
                </div>
            </div>

            {/* To-Do Summary Widget */}
            <div className="card todo-quick-card ripple" onClick={() => setActiveTab('todo')}>
                <div className="card-header">
                    <span className="card-tag">งานค้างของคุณ</span>
                    <CheckSquare className="card-icon-header text-purple" />
                </div>
                <div className="todo-quick-body">
                    <div className="todo-progress-container">
                        <div className="todo-progress-text">
                            <span>{todoCount}</span>
                            <span>{todoPercent}%</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress" style={{ width: `${todoPercent}%` }}></div>
                        </div>
                    </div>
                    <ul className="quick-list">
                        {todoList.length === 0 ? (
                            <li className="empty-state-text">ไม่มีงานที่กำลังดำเนินการ</li>
                        ) : (
                            todoList.map((t, idx) => (
                                <li key={idx}>{t}</li>
                            ))
                        )}
                    </ul>
                </div>
            </div>

            {/* Calendar Summary Widget */}
            <div className="card calendar-quick-card ripple" onClick={() => setActiveTab('calendar')}>
                <div className="card-header">
                    <span className="card-tag">กิจกรรมวันนี้</span>
                    <Calendar className="card-icon-header text-green" />
                </div>
                <div className="calendar-quick-body">
                    <div className="quick-event-today">
                        {todayEvents.length === 0 ? (
                            <div className="empty-state-text">วันนี้ไม่มีกิจกรรมที่บันทึกไว้</div>
                        ) : (
                            todayEvents.map((ev, idx) => (
                                <div 
                                    key={idx} 
                                    className="quick-event-item" 
                                    style={{ borderLeft: `3px solid ${getEventBorderColor(ev.tag)}` }}
                                >
                                    <span className="title">{ev.title}</span>
                                    <span className="time">{ev.time} น.</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Finance Summary Widget */}
            <div className="card finance-quick-card ripple" onClick={() => setActiveTab('tracker')}>
                <div className="card-header">
                    <span className="card-tag">กระเป๋าเงินวันนี้</span>
                    <Wallet className="card-icon-header text-yellow" />
                </div>
                <div className="finance-quick-body">
                    <div className="balance-amount">{balanceText}</div>
                    <div className="finance-quick-row">
                        <div className="finance-mini-stat income">
                            <span className="label"><TrendingUp size={12} /> รายรับ</span>
                            <span className="val">{incomeText}</span>
                        </div>
                        <div className="finance-mini-stat expense">
                            <span className="label"><TrendingDown size={12} /> รายจ่าย</span>
                            <span className="val">{expenseText}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

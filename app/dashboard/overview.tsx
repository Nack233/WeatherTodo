'use client';

import React, { useState, useEffect } from 'react';
import { CloudRain, CheckSquare, Calendar, Wallet, TrendingUp, TrendingDown, Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudLightning, Snowflake } from 'lucide-react';
import { User } from '../providers';
import { getTodos } from '@/app/actions/todo-actions';
import { getCalendarEvents } from '@/app/actions/calendar-actions';
import { getExpenses } from '@/app/actions/tracker-actions';
import { useToast } from '@/app/components/Toast';
import AiBriefingCard from './ai-briefing-card';

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

function formatEventDateDisplay(startDateStr: string): string {
    if (!startDateStr) return '';
    const [datePart, timePart] = startDateStr.split('T');
    const timeDisplay = timePart ? `${timePart.slice(0, 5)} น.` : '(ตลอดวัน)';

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    if (datePart === todayStr) {
        return `วันนี้ ${timeDisplay}`;
    }
    if (datePart === tomorrowStr) {
        return `พรุ่งนี้ ${timeDisplay}`;
    }

    const eventDate = new Date(startDateStr.includes('T') ? startDateStr : `${startDateStr}T00:00:00`);
    if (isNaN(eventDate.getTime())) {
        return `${datePart} ${timeDisplay}`;
    }

    const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const day = eventDate.getDate();
    const month = thaiMonthsShort[eventDate.getMonth()];
    const isCurrentYear = eventDate.getFullYear() === now.getFullYear();
    const yearDisplay = isCurrentYear ? '' : ` ${eventDate.getFullYear() + 543}`;

    return `${day} ${month}${yearDisplay} ${timeDisplay}`;
}

export default function Overview({ user, setActiveTab }: OverviewProps) {
    const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(true);
    const [isTodoLoading, setIsTodoLoading] = useState<boolean>(true);
    const [isEventsLoading, setIsEventsLoading] = useState<boolean>(true);
    const [isExpensesLoading, setIsExpensesLoading] = useState<boolean>(true);

    const [weatherTemp, setWeatherTemp] = useState<string>('--°C');
    const [weatherDesc, setWeatherDesc] = useState<string>('กำลังโหลดข้อมูล...');
    const [weatherIcon, setWeatherIcon] = useState<string>('sun');

    const { showToast } = useToast();
    const [todoCount, setTodoCount] = useState<string>('0/0 รายการ');
    const [todoPercent, setTodoPercent] = useState<number>(0);
    const [todoTotal, setTodoTotal] = useState<number>(0);
    const [todoCompleted, setTodoCompleted] = useState<number>(0);
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

    // Load states on mount with parallel fetching & instant cache hydration
    useEffect(() => {
        // 1. Instant Cache Hydration for Weather (0ms UI render)
        const loadCachedWeather = () => {
            try {
                const cached = localStorage.getItem('weather_cache');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    const pongCache = parsed['weather_pongnamron'];
                    if (pongCache?.data?.current) {
                        const temp = Math.round(pongCache.data.current.temperature_2m);
                        const weatherMeta = getWeatherMeta(pongCache.data.current.weather_code);
                        setWeatherTemp(`${temp}°C`);
                        setWeatherDesc(weatherMeta.text);
                        setWeatherIcon(weatherMeta.icon);
                        setIsWeatherLoading(false);
                    }
                }
            } catch {
                // Ignore cache read errors
            }
        };

        // 2. Weather Fetch (Parallel & Non-blocking)
        const fetchWeatherAsync = async () => {
            try {
                // Check if existing cache is fresh (less than 10 mins old)
                const cached = localStorage.getItem('weather_cache');
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        const pongCache = parsed['weather_pongnamron'];
                        if (pongCache?.timestamp && (Date.now() - pongCache.timestamp < 10 * 60 * 1000)) {
                            setIsWeatherLoading(false);
                            return; // Cache is still fresh
                        }
                    } catch {}
                }

                const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=12.9167&longitude=102.2667&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Bangkok');
                if (response.ok) {
                    const weatherData = await response.json();
                    if (weatherData?.current) {
                        const temp = Math.round(weatherData.current.temperature_2m);
                        const weatherMeta = getWeatherMeta(weatherData.current.weather_code);
                        setWeatherTemp(`${temp}°C`);
                        setWeatherDesc(weatherMeta.text);
                        setWeatherIcon(weatherMeta.icon);

                        try {
                            const newCache = {
                                weather_pongnamron: {
                                    timestamp: Date.now(),
                                    data: weatherData
                                }
                            };
                            localStorage.setItem('weather_cache', JSON.stringify(newCache));
                        } catch {}
                    }
                }
            } catch {
                // Graceful fallback to existing cache/defaults if offline
            } finally {
                setIsWeatherLoading(false);
            }
        };

        // 3. Supabase Data Fetch (Parallel with Weather)
        const loadSupabaseData = async () => {
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
                setTodoTotal(total);
                setTodoCompleted(completed);
                setTodoList(active.slice(0, 3).map((t) => t.title));
            }
            setIsTodoLoading(false);

            if (!eventsResult.error && eventsResult.data) {
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

                type TempSummary = CalendarEventSummary & { timestamp: number };
                const upcoming: TempSummary[] = [];
                const past: TempSummary[] = [];

                eventsResult.data.forEach((event) => {
                    const dateObj = new Date(event.start_date.includes('T') ? event.start_date : `${event.start_date}T00:00:00`);
                    const timeMs = dateObj.getTime();
                    const summary: TempSummary = {
                        id: event.id,
                        title: event.title,
                        time: formatEventDateDisplay(event.start_date),
                        tag: event.color,
                        timestamp: timeMs,
                    };

                    if (isNaN(timeMs) || timeMs >= todayStart) {
                        upcoming.push(summary);
                    } else {
                        past.push(summary);
                    }
                });

                upcoming.sort((a, b) => a.timestamp - b.timestamp);
                past.sort((a, b) => b.timestamp - a.timestamp);

                const list = [...upcoming, ...past];
                setTodayEvents(list.slice(0, 3));
            }
            setIsEventsLoading(false);

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
            setIsExpensesLoading(false);
        };

        // Trigger tasks asynchronously and in parallel
        loadCachedWeather();
        void fetchWeatherAsync();
        void loadSupabaseData();
    }, []);

    // Helper to get matching accent border color for event tag
    const getEventBorderColor = (tag: string | null) => {
        if (tag === 'tag-red') return 'var(--accent-red)';
        if (tag === 'tag-green') return 'var(--accent-green)';
        if (tag === 'tag-yellow') return 'var(--accent-yellow)';
        return 'var(--primary)';
    };

    return (
        <div className="overview-container">
            {/* AI Daily Briefing Hero Banner */}
            <AiBriefingCard 
                data={{
                    userName: user?.name,
                    weather: {
                        temp: weatherTemp,
                        desc: weatherDesc,
                        icon: weatherIcon
                    },
                    todos: {
                        total: todoTotal,
                        completed: todoCompleted,
                        percent: todoPercent,
                        list: todoList
                    },
                    events: todayEvents.map((ev) => ({ title: ev.title, time: ev.time })),
                    expenses: {
                        balance: balanceText,
                        income: incomeText,
                        expense: expenseText
                    }
                }}
                onShowToast={(msg, type) => showToast(msg, type === 'error' ? 'error' : 'success')}
            />

            <div className="dashboard-grid">
            {/* Quick Weather Widget */}
            <div className="card weather-quick-card ripple" onClick={() => setActiveTab('weather')}>
                <div className="card-header">
                    <span className="card-tag">อากาศวันนี้ {user?.name ? `· ${user.name}` : ''}</span>
                    <CloudRain className="card-icon-header text-cyan" />
                </div>
                {isWeatherLoading ? (
                    <div className="weather-quick-body">
                        <div className="weather-quick-info" style={{ width: '100%' }}>
                            <div className="skeleton-box skeleton-title" style={{ width: '90px', marginBottom: '0.6rem' }} />
                            <div className="skeleton-box skeleton-text" style={{ width: '130px', marginBottom: '0.4rem' }} />
                            <div className="skeleton-box skeleton-text" style={{ width: '180px' }} />
                        </div>
                        <div className="weather-quick-graphic">
                            <div className="skeleton-box skeleton-circle" />
                        </div>
                    </div>
                ) : (
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
                )}
            </div>

            {/* To-Do Summary Widget */}
            <div className="card todo-quick-card ripple" onClick={() => setActiveTab('todo')}>
                <div className="card-header">
                    <span className="card-tag">งานค้างของคุณ</span>
                    <CheckSquare className="card-icon-header text-purple" />
                </div>
                {isTodoLoading ? (
                    <div className="todo-quick-body">
                        <div className="skeleton-box skeleton-text" style={{ height: '1.2rem', marginBottom: '0.8rem' }} />
                        <div className="skeleton-box skeleton-text" style={{ marginBottom: '0.45rem' }} />
                        <div className="skeleton-box skeleton-text" style={{ marginBottom: '0.45rem', width: '85%' }} />
                        <div className="skeleton-box skeleton-text" style={{ width: '65%' }} />
                    </div>
                ) : (
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
                )}
            </div>

            {/* Calendar Summary Widget */}
            <div className="card calendar-quick-card ripple" onClick={() => setActiveTab('calendar')}>
                <div className="card-header">
                    <span className="card-tag">กิจกรรมเร็วๆ นี้</span>
                    <Calendar className="card-icon-header text-green" />
                </div>
                {isEventsLoading ? (
                    <div className="calendar-quick-body">
                        <div className="quick-event-today">
                            <div className="skeleton-box" style={{ height: '2.6rem', marginBottom: '0.6rem', borderRadius: '0 8px 8px 0' }} />
                            <div className="skeleton-box" style={{ height: '2.6rem', borderRadius: '0 8px 8px 0' }} />
                        </div>
                    </div>
                ) : (
                    <div className="calendar-quick-body">
                        <div className="quick-event-today">
                            {todayEvents.length === 0 ? (
                                <div className="empty-state-text">ไม่มีกิจกรรมที่บันทึกไว้</div>
                            ) : (
                                todayEvents.map((ev, idx) => (
                                    <div 
                                        key={ev.id || idx} 
                                        className="quick-event-item" 
                                        style={{ borderLeft: `3px solid ${getEventBorderColor(ev.tag)}` }}
                                    >
                                        <span className="title">{ev.title}</span>
                                        <span className="time">{ev.time}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Finance Summary Widget */}
            <div className="card finance-quick-card ripple" onClick={() => setActiveTab('tracker')}>
                <div className="card-header">
                    <span className="card-tag">กระเป๋าเงินวันนี้</span>
                    <Wallet className="card-icon-header text-yellow" />
                </div>
                {isExpensesLoading ? (
                    <div className="finance-quick-body">
                        <div className="skeleton-box skeleton-title" style={{ width: '130px', height: '2.2rem', marginBottom: '1rem' }} />
                        <div className="finance-quick-row">
                            <div className="skeleton-box" style={{ height: '2.5rem', flex: 1 }} />
                            <div className="skeleton-box" style={{ height: '2.5rem', flex: 1 }} />
                        </div>
                    </div>
                ) : (
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
                )}
            </div>
        </div>
        </div>
    );
}

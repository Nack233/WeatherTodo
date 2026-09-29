'use client';

import React, { useState, useEffect } from 'react';
import { CloudRain, CheckSquare, Calendar, Wallet, TrendingUp, TrendingDown, Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudLightning, Snowflake } from 'lucide-react';
import { User } from '../providers';
import { getTodos } from '@/app/actions/todo-actions';
import { getCalendarEvents } from '@/app/actions/calendar-actions';
import { getExpenses } from '@/app/actions/tracker-actions';
import { useToast } from '@/app/components/Toast';
import AiBriefingCard from './ai-briefing-card';
import { getWeatherMeta } from '@/utils/weather-codes';

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

const OVERVIEW_CACHE_KEY = 'dashboard_overview_cache';

interface OverviewCacheData {
    timestamp: number;
    todoCount: string;
    todoPercent: number;
    todoTotal: number;
    todoCompleted: number;
    todoList: string[];
    todayEvents: CalendarEventSummary[];
    balanceText: string;
    incomeText: string;
    expenseText: string;
}

function formatEventDateDisplay(startDateStr: string): string {
    if (!startDateStr || typeof startDateStr !== 'string') return '';
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

        // 2. Instant Cache Hydration for Overview Cards (0ms UI render)
        const loadCachedOverview = () => {
            try {
                const cached = localStorage.getItem(OVERVIEW_CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached) as Partial<OverviewCacheData>;
                    if (parsed) {
                        if (parsed.todoCount !== undefined) {
                            setTodoCount(parsed.todoCount);
                            setTodoPercent(parsed.todoPercent ?? 0);
                            setTodoTotal(parsed.todoTotal ?? 0);
                            setTodoCompleted(parsed.todoCompleted ?? 0);
                            setTodoList(parsed.todoList ?? []);
                            setIsTodoLoading(false);
                        }
                        if (parsed.todayEvents !== undefined && Array.isArray(parsed.todayEvents)) {
                            setTodayEvents(parsed.todayEvents);
                            setIsEventsLoading(false);
                        }
                        if (parsed.balanceText !== undefined) {
                            setBalanceText(parsed.balanceText);
                            setIncomeText(parsed.incomeText ?? '฿0.00');
                            setExpenseText(parsed.expenseText ?? '฿0.00');
                            setIsExpensesLoading(false);
                        }
                    }
                }
            } catch {
                // Ignore cache parse error
            }
        };

        // 3. Weather Fetch (Parallel & Non-blocking)
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

        // 4. Supabase Data Fetch (Decoupled, Resilient, & Cache-Persisted)
        const loadSupabaseData = async () => {
            try {
                const [todosSettled, eventsSettled, expensesSettled] = await Promise.allSettled([
                    getTodos(),
                    getCalendarEvents(),
                    getExpenses(),
                ]);

                let updatedTodoCount = todoCount;
                let updatedTodoPercent = todoPercent;
                let updatedTodoTotal = todoTotal;
                let updatedTodoCompleted = todoCompleted;
                let updatedTodoList = todoList;
                let updatedTodayEvents = todayEvents;
                let updatedBalance = balanceText;
                let updatedIncome = incomeText;
                let updatedExpense = expenseText;

                // --- 4.1 Process Todos ---
                try {
                    if (todosSettled.status === 'fulfilled') {
                        const todosResult = todosSettled.value;
                        if (!todosResult.error && Array.isArray(todosResult.data)) {
                            const active = todosResult.data.filter((t) => !t.completed);
                            const total = todosResult.data.length;
                            const completed = total - active.length;
                            const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

                            updatedTodoCount = `${completed}/${total} รายการ`;
                            updatedTodoPercent = percent;
                            updatedTodoTotal = total;
                            updatedTodoCompleted = completed;
                            updatedTodoList = active.slice(0, 3).map((t) => t.title);

                            setTodoCount(updatedTodoCount);
                            setTodoPercent(updatedTodoPercent);
                            setTodoTotal(updatedTodoTotal);
                            setTodoCompleted(updatedTodoCompleted);
                            setTodoList(updatedTodoList);
                        }
                    }
                } catch (todoErr) {
                    console.error('[Overview] Error parsing todos:', todoErr);
                } finally {
                    setIsTodoLoading(false);
                }

                // --- 4.2 Process Calendar Events ---
                try {
                    if (eventsSettled.status === 'fulfilled') {
                        const eventsResult = eventsSettled.value;
                        if (!eventsResult.error && Array.isArray(eventsResult.data)) {
                            const now = new Date();
                            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

                            type TempSummary = CalendarEventSummary & { timestamp: number };
                            const upcoming: TempSummary[] = [];
                            const past: TempSummary[] = [];

                            eventsResult.data.forEach((event) => {
                                if (!event) return;
                                const sDate = event.start_date || '';
                                const dateObj = new Date(sDate.includes('T') ? sDate : `${sDate}T00:00:00`);
                                const timeMs = dateObj.getTime();
                                const summary: TempSummary = {
                                    id: event.id,
                                    title: event.title || 'กิจกรรม',
                                    time: formatEventDateDisplay(sDate),
                                    tag: event.color || null,
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

                            const list = [...upcoming, ...past].slice(0, 3);
                            updatedTodayEvents = list;
                            setTodayEvents(list);
                        }
                    }
                } catch (eventErr) {
                    console.error('[Overview] Error parsing calendar events:', eventErr);
                } finally {
                    setIsEventsLoading(false);
                }

                // --- 4.3 Process Expenses ---
                try {
                    if (expensesSettled.status === 'fulfilled') {
                        const expensesResult = expensesSettled.value;
                        if (!expensesResult.error && Array.isArray(expensesResult.data)) {
                            let inc = 0;
                            let exp = 0;
                            expensesResult.data.forEach((t) => {
                                if (!t) return;
                                const amt = Number(t.amount) || 0;
                                if (t.type === 'income') inc += amt;
                                else exp += amt;
                            });
                            const bal = inc - exp;

                            const formatShort = (val: number) => '฿' + val.toLocaleString('th-TH', { maximumFractionDigits: 0 });
                            updatedBalance = formatShort(bal);
                            updatedIncome = formatShort(inc);
                            updatedExpense = formatShort(exp);

                            setBalanceText(updatedBalance);
                            setIncomeText(updatedIncome);
                            setExpenseText(updatedExpense);
                        }
                    }
                } catch (expErr) {
                    console.error('[Overview] Error parsing expenses:', expErr);
                } finally {
                    setIsExpensesLoading(false);
                }

                // --- 4.4 Persist to Local Cache ---
                try {
                    const cacheToSave: OverviewCacheData = {
                        timestamp: Date.now(),
                        todoCount: updatedTodoCount,
                        todoPercent: updatedTodoPercent,
                        todoTotal: updatedTodoTotal,
                        todoCompleted: updatedTodoCompleted,
                        todoList: updatedTodoList,
                        todayEvents: updatedTodayEvents,
                        balanceText: updatedBalance,
                        incomeText: updatedIncome,
                        expenseText: updatedExpense,
                    };
                    localStorage.setItem(OVERVIEW_CACHE_KEY, JSON.stringify(cacheToSave));
                } catch {
                    // Ignore storage quota errors
                }
            } catch (fatalErr) {
                console.error('[Overview] loadSupabaseData fatal error:', fatalErr);
            } finally {
                // Guaranteed safety: all skeleton flags turn off even if an unhandled error occurs
                setIsTodoLoading(false);
                setIsEventsLoading(false);
                setIsExpensesLoading(false);
            }
        };

        // Trigger tasks asynchronously and in parallel with instant cache display
        loadCachedWeather();
        loadCachedOverview();
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
            <div className="card glass-effect weather-quick-card ripple" onClick={() => setActiveTab('weather')} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                <div className="ambient-weather-glow ambient-glow-sun" style={{ width: '180px', height: '180px', top: '-20px', right: '-20px', opacity: 0.2 }} />
                <div className="card-header" style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="card-tag">สภาพอากาศวันนี้</span>
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', fontWeight: 700 }}>LIVE</span>
                    </div>
                    <CloudRain className="card-icon-header text-cyan" />
                </div>
                {isWeatherLoading ? (
                    <div className="weather-quick-body" style={{ position: 'relative', zIndex: 1 }}>
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
                    <div className="weather-quick-body" style={{ position: 'relative', zIndex: 1 }}>
                        <div className="weather-quick-info">
                            <h3 style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-1px' }}>{weatherTemp}</h3>
                            <p style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--accent-cyan)' }}>{weatherDesc}</p>
                            <span className="location-sub">พิกัดใช้งานปัจจุบัน · แตะเพื่อดูรายละเอียด →</span>
                        </div>
                        <div className="weather-quick-graphic">
                            {renderWeatherIcon(weatherIcon)}
                        </div>
                    </div>
                )}
            </div>

            {/* To-Do Summary Widget */}
            <div className="card glass-effect todo-quick-card ripple" onClick={() => setActiveTab('todo')} style={{ cursor: 'pointer' }}>
                <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="card-tag">งานค้างของคุณ</span>
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)', fontWeight: 700 }}>
                            {todoCount}
                        </span>
                    </div>
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
                                <span style={{ fontWeight: 600 }}>ความคืบหน้ารวม</span>
                                <span style={{ fontWeight: 700, color: 'var(--accent-purple)' }}>{todoPercent}%</span>
                            </div>
                            <div className="progress-bar" style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px' }}>
                                <div className="progress" style={{ width: `${todoPercent}%`, borderRadius: '999px', background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))' }}></div>
                            </div>
                        </div>
                        <ul className="quick-list">
                            {todoList.length === 0 ? (
                                <li className="empty-state-text" style={{ padding: '0.75rem' }}>ไม่มีงานที่กำลังดำเนินการ 🎉</li>
                            ) : (
                                todoList.map((t, idx) => (
                                    <li key={idx} style={{ borderRadius: '10px', padding: '0.65rem 0.85rem' }}>{t}</li>
                                ))
                            )}
                        </ul>
                    </div>
                )}
            </div>

            {/* Calendar Summary Widget */}
            <div className="card glass-effect calendar-quick-card ripple" onClick={() => setActiveTab('calendar')} style={{ cursor: 'pointer' }}>
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
                                <div className="empty-state-text" style={{ padding: '1rem 0' }}>ไม่มีกิจกรรมที่บันทึกไว้</div>
                            ) : (
                                todayEvents.map((ev, idx) => (
                                    <div 
                                        key={ev.id || idx} 
                                        className="quick-event-item" 
                                        style={{ borderLeft: `3.5px solid ${getEventBorderColor(ev.tag)}`, borderRadius: '10px', padding: '0.7rem 0.9rem' }}
                                    >
                                        <span className="title" style={{ fontWeight: 600 }}>{ev.title}</span>
                                        <span className="time">{ev.time}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Finance Summary Widget */}
            <div className="card glass-effect finance-quick-card ripple" onClick={() => setActiveTab('tracker')} style={{ cursor: 'pointer' }}>
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
                        <div className="balance-amount" style={{ fontSize: '2.4rem', fontWeight: 800 }}>{balanceText}</div>
                        <div className="finance-quick-row">
                            <div className="finance-mini-stat income" style={{ borderRadius: '12px' }}>
                                <span className="label"><TrendingUp size={13} /> รายรับ</span>
                                <span className="val" style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{incomeText}</span>
                            </div>
                            <div className="finance-mini-stat expense" style={{ borderRadius: '12px' }}>
                                <span className="label"><TrendingDown size={13} /> รายจ่าย</span>
                                <span className="val" style={{ color: 'var(--accent-red)', fontWeight: 700 }}>{expenseText}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
}

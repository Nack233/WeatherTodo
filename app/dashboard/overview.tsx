'use client';

import React, { useState, useEffect } from 'react';
import { CloudRain, CheckSquare, Calendar, Wallet, TrendingUp, TrendingDown, Sun } from 'lucide-react';
import { User } from '../providers';

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

    const [todayEvents, setTodayEvents] = useState<any[]>([]);

    const [balanceText, setBalanceText] = useState<string>('฿0.00');
    const [incomeText, setIncomeText] = useState<string>('฿0.00');
    const [expenseText, setExpenseText] = useState<string>('฿0.00');

    // Load states on mount
    useEffect(() => {
        // 1. Weather
        const cached = localStorage.getItem('weather_cache');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                const pongCache = parsed['weather_pongnamron'];
                if (pongCache) {
                    const temp = Math.round(pongCache.data.current.temperature_2m);
                    setWeatherTemp(`${temp}°C`);
                    
                    const code = pongCache.data.current.weather_code;
                    const metaMap: Record<number, { text: string; icon: string }> = {
                        0: { text: 'ท้องฟ้าโปร่ง', icon: 'sun' },
                        1: { text: 'ท้องฟ้าโปร่งเป็นส่วนใหญ่', icon: 'cloud-sun' },
                        2: { text: 'มีเมฆบางส่วน', icon: 'cloud-sun' },
                        3: { text: 'ท้องฟ้าครึ้มมีเมฆหนา', icon: 'cloud' },
                        51: { text: 'ฝนตกปรอยๆ', icon: 'cloud-drizzle' },
                        61: { text: 'ฝนตกเบาบาง', icon: 'cloud-rain' },
                        63: { text: 'ฝนตกปานกลาง', icon: 'cloud-rain' },
                        65: { text: 'ฝนตกหนัก', icon: 'cloud-rain' },
                        80: { text: 'ฝนไล่ช้างตก', icon: 'cloud-rain' },
                        95: { text: 'พายุฝนฟ้าคะนอง', icon: 'cloud-lightning' }
                    };
                    const weatherMeta = metaMap[code] || { text: 'สภาพอากาศทั่วไป', icon: 'cloud-sun' };
                    setWeatherDesc(weatherMeta.text);
                    setWeatherIcon(weatherMeta.icon);
                }
            } catch (e) {}
        }

        // 2. To-Do
        const todosStr = localStorage.getItem('todos');
        if (todosStr) {
            try {
                const todos = JSON.parse(todosStr);
                const active = todos.filter((t: any) => !t.completed);
                const total = todos.length;
                const completed = total - active.length;
                const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

                setTodoCount(`${completed}/${total} รายการ`);
                setTodoPercent(percent);
                setTodoList(active.slice(0, 3).map((t: any) => t.title));
            } catch (e) {}
        }

        // 3. Calendar
        const eventsStr = localStorage.getItem('calendar_events');
        if (eventsStr) {
            try {
                const events = JSON.parse(eventsStr);
                const todayStr = new Date().toISOString().split('T')[0];
                const list = events[todayStr] || [];
                list.sort((a: any, b: any) => a.time.localeCompare(b.time));
                setTodayEvents(list.slice(0, 2));
            } catch (e) {}
        }

        // 4. Finance
        const txStr = localStorage.getItem('transactions');
        if (txStr) {
            try {
                const txs = JSON.parse(txStr);
                let inc = 0;
                let exp = 0;
                txs.forEach((t: any) => {
                    if (t.type === 'income') inc += t.amount;
                    else exp += t.amount;
                });
                const bal = inc - exp;

                const formatShort = (val: number) => '฿' + val.toLocaleString('th-TH', { maximumFractionDigits: 0 });
                setBalanceText(formatShort(bal));
                setIncomeText(formatShort(inc));
                setExpenseText(formatShort(exp));
            } catch (e) {}
        }
    }, []);

    // Helper to get matching accent border color for event tag
    const getEventBorderColor = (tag: string) => {
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
                    <span className="card-tag">อากาศวันนี้</span>
                    <CloudRain className="card-icon-header text-cyan" />
                </div>
                <div className="weather-quick-body">
                    <div className="weather-quick-info">
                        <h3>{weatherTemp}</h3>
                        <p>{weatherDesc}</p>
                        <span className="location-sub">ตำบลโป่งน้ำร้อน</span>
                    </div>
                    <div className="weather-quick-graphic">
                        <Sun className="weather-giant-icon animate-float" />
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

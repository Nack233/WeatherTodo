'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/app/components/Toast';
import type { CalendarEvent } from '@/types/database';
import {
    getCalendarEvents,
    createCalendarEvent,
    deleteCalendarEvent,
} from '@/app/actions/calendar-actions';

const THAI_MONTH_NAMES = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function Calendar() {
    const [eventsList, setEventsList] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [selectedDateStr, setSelectedDateStr] = useState<string>('');

    // Form States
    const [eventTitle, setEventTitle] = useState('');
    const [eventTime, setEventTime] = useState('09:00');
    const [eventTag, setEventTag] = useState('tag-blue');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    const { showToast } = useToast();

    // Fetch events from Supabase
    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        const result = await getCalendarEvents();
        if (result.error) {
            setFetchError(result.error);
        } else {
            setEventsList(result.data ?? []);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchEvents();
        const todayStr = new Date().toISOString().split('T')[0];
        setSelectedDateStr(todayStr);
    }, [fetchEvents]);

    // Build events lookup map by YYYY-MM-DD
    const eventsMap: Record<string, CalendarEvent[]> = {};
    eventsList.forEach(ev => {
        // Extract YYYY-MM-DD from start_date
        const dateKey = ev.start_date.split('T')[0];
        if (!eventsMap[dateKey]) {
            eventsMap[dateKey] = [];
        }
        eventsMap[dateKey].push(ev);
    });

    // Calendar grid calculation
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    // Add event
    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDateStr || !eventTitle.trim()) return;
        setIsSubmitting(true);

        const start_date = `${selectedDateStr}T${eventTime}:00`;

        const result = await createCalendarEvent({
            title: eventTitle.trim(),
            start_date,
            color: eventTag,
            all_day: false,
        });

        if (result.error) {
            showToast(`บันทึกกิจกรรมล้มเหลว: ${result.error}`, 'error');
        } else if (result.data) {
            setEventsList(prev => [...prev, result.data!]);
            showToast('บันทึกกิจกรรมสำเร็จ! ✓', 'success');
            setEventTitle('');
        }

        setIsSubmitting(false);
    };

    // Delete event
    const handleDeleteEvent = async (eventId: string) => {
        if (deletingIds.has(eventId)) return;

        setDeletingIds(prev => new Set(prev).add(eventId));

        const result = await deleteCalendarEvent(eventId);

        setDeletingIds(prev => {
            const next = new Set(prev);
            next.delete(eventId);
            return next;
        });

        if (result.error) {
            showToast(`ลบกิจกรรมล้มเหลว: ${result.error}`, 'error');
        } else {
            setEventsList(prev => prev.filter(e => e.id !== eventId));
            showToast('ลบกิจกรรมแล้ว', 'success');
        }
    };

    const getSelectedDateLabel = () => {
        if (!selectedDateStr) return '--';
        const date = new Date(selectedDateStr + 'T00:00:00');
        return date.toLocaleDateString('th-TH', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const getEventBorderColor = (tag: string | null) => {
        if (tag === 'tag-red') return 'var(--accent-red)';
        if (tag === 'tag-green') return 'var(--accent-green)';
        if (tag === 'tag-yellow') return 'var(--accent-yellow)';
        return 'var(--primary)';
    };

    // Helper: format time for display
    const formatTimeDisplay = (startDateStr: string) => {
        if (!startDateStr.includes('T')) return 'ตลอดวัน';
        const timePart = startDateStr.split('T')[1];
        return timePart.substring(0, 5); // HH:mm
    };

    // Build grid cells
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
        cells.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let day = 1; day <= totalDays; day++) {
        const cellDate = new Date(year, month, day);
        const offset = cellDate.getTimezoneOffset();
        const localCellDate = new Date(cellDate.getTime() - (offset * 60 * 1000));
        const cellDateStr = localCellDate.toISOString().split('T')[0];

        const isToday = cellDateStr === todayStr;
        const isSelected = cellDateStr === selectedDateStr;
        const dayEvents = eventsMap[cellDateStr] || [];

        cells.push(
            <div
                key={`day-${day}`}
                className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDateStr(cellDateStr)}
            >
                <span className="number">{day}</span>
                {dayEvents.length > 0 && (
                    <div className="dots">
                        {dayEvents.slice(0, 3).map(ev => (
                            <span key={ev.id} className={`dot ${ev.color || 'tag-blue'}`} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const activeDayEvents = eventsMap[selectedDateStr] || [];
    activeDayEvents.sort((a, b) => a.start_date.localeCompare(b.start_date));

    return (
        <div className="calendar-layout">
            {/* Calendar View */}
            <div className="card calendar-view-card">
                <div className="calendar-nav">
                    <button className="icon-btn" onClick={handlePrevMonth} aria-label="เดือนก่อนหน้า">
                        <ChevronLeft />
                    </button>
                    <h3>{THAI_MONTH_NAMES[month]} {year + 543}</h3>
                    <button className="icon-btn" onClick={handleNextMonth} aria-label="เดือนถัดไป">
                        <ChevronRight />
                    </button>
                </div>
                <div className="calendar-weekdays">
                    <div>อา.</div>
                    <div>จ.</div>
                    <div>อ.</div>
                    <div>พ.</div>
                    <div>พฤ.</div>
                    <div>ศ.</div>
                    <div>ส.</div>
                </div>
                {isLoading ? (
                    <div className="calendar-grid" style={{ opacity: 0.5 }}>
                        {cells}
                    </div>
                ) : (
                    <div className="calendar-grid">
                        {cells}
                    </div>
                )}
            </div>

            {/* Calendar Details & Form */}
            <div className="calendar-detail-pane">
                {/* Add Event Card */}
                <div className="card event-form-card">
                    <h3 className="section-title">
                        เพิ่มกิจกรรมสำหรับวันที่{' '}
                        <span id="event-selected-date-label" style={{ color: 'var(--accent-cyan)' }}>
                            {getSelectedDateLabel()}
                        </span>
                    </h3>
                    <form onSubmit={handleAddEvent}>
                        <div className="form-group">
                            <label htmlFor="event-title">ชื่อกิจกรรม</label>
                            <input
                                type="text"
                                id="event-title"
                                placeholder="เช่น นัดพบแพทย์, ประชุมทีม..."
                                value={eventTitle}
                                onChange={e => setEventTitle(e.target.value)}
                                required
                                disabled={isSubmitting || !selectedDateStr}
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="event-time">เวลา</label>
                                <input
                                    type="time"
                                    id="event-time"
                                    value={eventTime}
                                    onChange={e => setEventTime(e.target.value)}
                                    required
                                    disabled={isSubmitting || !selectedDateStr}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="event-tag">ป้ายสี</label>
                                <select
                                    id="event-tag"
                                    value={eventTag}
                                    onChange={e => setEventTag(e.target.value)}
                                    disabled={isSubmitting || !selectedDateStr}
                                >
                                    <option value="tag-blue">สีน้ำเงิน (ทั่วไป)</option>
                                    <option value="tag-red">สีแดง (สำคัญมาก)</option>
                                    <option value="tag-green">สีเขียว (ส่วนตัว)</option>
                                    <option value="tag-yellow">สีเหลือง (การเงิน)</option>
                                </select>
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={isSubmitting || !selectedDateStr || !eventTitle.trim()}
                        >
                            {isSubmitting
                                ? <><Loader2 size={18} className="spin" /> กำลังบันทึก...</>
                                : <><Plus size={18} /> บันทึกกิจกรรม</>
                            }
                        </button>
                    </form>
                </div>

                {/* Selected Day Events List Card */}
                <div className="card day-events-card">
                    <h3 className="section-title">กิจกรรมในวันที่เลือก</h3>
                    {fetchError ? (
                        <div className="alert-message error" style={{ margin: '0.5rem 0' }}>
                            <AlertCircle size={16} />
                            <span>{fetchError}</span>
                        </div>
                    ) : (
                        <div className="events-list">
                            {isLoading ? (
                                <div className="empty-state-text">กำลังโหลดกิจกรรม...</div>
                            ) : activeDayEvents.length === 0 ? (
                                <div className="empty-state-text">ไม่มีกิจกรรมบันทึกไว้ในวันนี้</div>
                            ) : (
                                activeDayEvents.map(ev => {
                                    const isDeleting = deletingIds.has(ev.id);
                                    const colorTag = ev.color || 'tag-blue';
                                    return (
                                        <div
                                            key={ev.id}
                                            className={`event-item ${colorTag}`}
                                            style={{
                                                borderLeft: `4px solid ${getEventBorderColor(colorTag)}`,
                                                opacity: isDeleting ? 0.5 : 1,
                                            }}
                                        >
                                            <div className="event-details">
                                                <span className="title">{ev.title}</span>
                                                <span className="time">
                                                    <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                                    {formatTimeDisplay(ev.start_date)} น.
                                                </span>
                                            </div>
                                            <button
                                                className="icon-btn delete-event-btn"
                                                onClick={() => handleDeleteEvent(ev.id)}
                                                disabled={isDeleting}
                                                title="ลบกิจกรรม"
                                            >
                                                {isDeleting
                                                    ? <Loader2 size={16} className="spin" />
                                                    : <Trash2 size={16} className="text-red" />
                                                }
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

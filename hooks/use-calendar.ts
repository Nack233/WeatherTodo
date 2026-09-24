'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CalendarEvent } from '@/types/database';
import {
    getCalendarEvents,
    createCalendarEvent,
    deleteCalendarEvent,
} from '@/app/actions/calendar-actions';
import type { ToastType } from '@/app/components/Toast';

interface UseCalendarOptions {
    onShowToast?: (msg: string, type: ToastType) => void;
}

export function useCalendar({ onShowToast }: UseCalendarOptions = {}) {
    const [eventsList, setEventsList] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

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
    }, [fetchEvents]);

    // Create Calendar Event
    const addEvent = async (params: {
        title: string;
        start_date: string;
        color?: string;
        description?: string | null;
        all_day?: boolean;
    }) => {
        if (!params.title.trim() || !params.start_date) return false;

        const result = await createCalendarEvent({
            title: params.title.trim(),
            start_date: params.start_date,
            color: params.color || 'tag-blue',
            description: params.description?.trim() || null,
            all_day: params.all_day ?? false,
        });

        if (result.error) {
            onShowToast?.(`เพิ่มกิจกรรมล้มเหลว: ${result.error}`, 'error');
            return false;
        } else if (result.data) {
            setEventsList((prev) => [...prev, result.data!]);
            onShowToast?.('บันทึกกิจกรรมเรียบร้อยแล้ว! 📅', 'success');
            return true;
        }
        return false;
    };

    // Delete Calendar Event
    const deleteEvent = async (id: string) => {
        if (deletingIds.has(id)) return;

        setDeletingIds((prev) => new Set(prev).add(id));
        const result = await deleteCalendarEvent(id);

        setDeletingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });

        if (result.error) {
            onShowToast?.(`ลบกิจกรรมล้มเหลว: ${result.error}`, 'error');
        } else {
            setEventsList((prev) => prev.filter((ev) => ev.id !== id));
            onShowToast?.('ลบกิจกรรมเรียบร้อยแล้ว', 'info');
        }
    };

    return {
        eventsList,
        isLoading,
        fetchError,
        deletingIds,
        fetchEvents,
        addEvent,
        deleteEvent,
    };
}

'use server';

import { createClient } from '@/utils/supabase/server';
import type { CalendarEvent, CalendarEventInsert, ActionResult } from '@/types/database';
import { ensureProfileExists } from '@/utils/supabase/profile';

// ==========================================
// READ — Fetch calendar events for user
// ==========================================
export async function getCalendarEvents(): Promise<ActionResult<CalendarEvent[]>> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .order('start_date', { ascending: true });

        if (error) {
            console.error('[getCalendarEvents]', error.message);
            return { error: error.message };
        }

        return { data: data as CalendarEvent[] };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูลปฏิทิน';
        console.error('[getCalendarEvents] unexpected:', message);
        return { error: message };
    }
}

// ==========================================
// CREATE — Add a calendar event
// ==========================================
export async function createCalendarEvent(input: CalendarEventInsert): Promise<ActionResult<CalendarEvent>> {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' };
        }

        const profileResult = await ensureProfileExists(supabase, user);
        if ('error' in profileResult) {
            return { error: profileResult.error };
        }

        const { data, error } = await supabase
            .from('calendar_events')
            .insert({
                ...input,
                user_id: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('[createCalendarEvent]', error.message);
            return { error: error.message };
        }

        return { data: data as CalendarEvent };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างกิจกรรม';
        console.error('[createCalendarEvent] unexpected:', message);
        return { error: message };
    }
}

// ==========================================
// DELETE — Remove a calendar event
// ==========================================
export async function deleteCalendarEvent(id: string): Promise<ActionResult> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[deleteCalendarEvent]', error.message);
            return { error: error.message };
        }

        return {};
    } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบกิจกรรม';
        console.error('[deleteCalendarEvent] unexpected:', message);
        return { error: message };
    }
}

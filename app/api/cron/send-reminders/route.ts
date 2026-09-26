import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { pushLineMessage, createTodoReminderFlex } from '@/utils/line/line-client';

async function processReminders(request: NextRequest) {
    // 1. Authorization check
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const querySecret = url.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production') {
        const isAuthorized = Boolean(cronSecret) && (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret);
        if (!isAuthorized) {
            console.warn('[Cron:Reminders] Unauthorized attempt to trigger reminders in production');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    } else if (cronSecret) {
        const isAuthorized = authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
        if (!isAuthorized) {
            console.warn('[Cron:Reminders] Unauthorized attempt to trigger reminders');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const supabase = createAdminClient();
        const nowIso = new Date().toISOString();

        // 2. Fetch pending reminders that have arrived and not yet sent
        const { data: pendingTodos, error: fetchError } = await supabase
            .from('todos')
            .select('id, user_id, title, description, priority, due_date, reminder_at')
            .not('reminder_at', 'is', null)
            .lte('reminder_at', nowIso)
            .eq('is_reminded', false)
            .eq('completed', false);

        if (fetchError) {
            console.error('[Cron:Reminders] Error querying pending todos:', fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!pendingTodos || pendingTodos.length === 0) {
            return NextResponse.json({
                status: 'success',
                message: 'No pending reminders due at this time',
                processed: 0,
                sent: 0,
                timestamp: nowIso,
            });
        }

        console.log(`[Cron:Reminders] Found ${pendingTodos.length} reminders to process`);

        // 3. Find LINE accounts for all affected users
        const userIds = Array.from(new Set(pendingTodos.map(t => t.user_id)));
        const { data: lineAccounts, error: accountError } = await supabase
            .from('line_accounts')
            .select('user_id, line_user_id')
            .in('user_id', userIds);

        if (accountError) {
            console.error('[Cron:Reminders] Error querying LINE accounts:', accountError);
        }

        const lineUserMap = new Map<string, string>();
        lineAccounts?.forEach(acc => {
            if (acc.line_user_id) {
                lineUserMap.set(acc.user_id, acc.line_user_id);
            }
        });

        // 4. Send reminders
        let sentCount = 0;
        const nowCompletedTime = new Date().toISOString();

        for (const todo of pendingTodos) {
            const lineUserId = lineUserMap.get(todo.user_id);

            if (lineUserId) {
                // Format display time for Thai users
                let formattedTime = 'ถึงเวลาแล้ว!';
                if (todo.reminder_at) {
                    try {
                        const d = new Date(todo.reminder_at);
                        formattedTime =
                            d.toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Bangkok',
                            }) + ' น.';
                    } catch {
                        // ignore formatting error
                    }
                }

                const flexBubble = createTodoReminderFlex({
                    id: todo.id,
                    title: todo.title,
                    description: todo.description,
                    priority: todo.priority,
                    dueDate: todo.due_date,
                    reminderTime: formattedTime,
                });

                const pushed = await pushLineMessage(lineUserId, [
                    {
                        type: 'flex',
                        altText: `⏰ แจ้งเตือนงาน: ${todo.title}`,
                        contents: flexBubble,
                    },
                ]);

                if (pushed) {
                    sentCount++;
                }
            } else {
                console.log(`[Cron:Reminders] User ${todo.user_id} has no linked LINE account. Marking reminded.`);
            }

            // Always mark is_reminded = true to prevent infinite retry loops
            await supabase
                .from('todos')
                .update({
                    is_reminded: true,
                    reminded_at: nowCompletedTime,
                })
                .eq('id', todo.id);
        }

        return NextResponse.json({
            status: 'success',
            processed: pendingTodos.length,
            sent: sentCount,
            timestamp: nowCompletedTime,
        });
    } catch (err) {
        console.error('[Cron:Reminders] Unexpected error in reminder scheduler:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    return processReminders(request);
}

export async function POST(request: NextRequest) {
    return processReminders(request);
}

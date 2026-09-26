import { createAdminClient } from '@/utils/supabase/admin';
import { analyzeLineIntent } from './ai-intent';
import {
    replyLineMessage,
    createTodoAddedFlex,
    createTodoListFlex,
    createExpenseAddedFlex,
    createHelpFlex,
    DEFAULT_QUICK_REPLY,
} from './line-client';
import type { LineWebhookEvent, AiIntentResult } from '@/types/line';

const DEFAULT_LOCATION = { name: 'จันทบุรี', lat: 12.6114, lon: 102.1039 };

const WEATHER_CODE_TEXT: Record<number, string> = {
    0: 'ท้องฟ้าโปร่ง',
    1: 'ท้องฟ้าโปร่งส่วนใหญ่',
    2: 'มีเมฆบางส่วน',
    3: 'ท้องฟ้าครึ้มมีเมฆหนา',
    45: 'มีหมอกจัด',
    48: 'มีหมอกน้ำค้างแข็ง',
    51: 'ฝนตกปรอยๆ เล็กน้อย',
    53: 'ฝนตกปรอยๆ ปานกลาง',
    55: 'ฝนตกปรอยๆ หนาแน่น',
    61: 'ฝนตกเล็กน้อย',
    63: 'ฝนตกปานกลาง',
    65: 'ฝนตกหนัก',
    80: 'ฝนไล่ช้างตกเบาบาง',
    81: 'ฝนไล่ช้างตกปานกลาง',
    82: 'ฝนไล่ช้างตกหนักมาก',
    95: 'พายุฝนฟ้าคะนอง',
    96: 'พายุฝนฟ้าคะนองมีลูกเห็บตกเล็กน้อย',
    99: 'พายุฝนฟ้าคะนองมีลูกเห็บตกหนัก',
};

/**
 * Resolve Supabase user_id from LINE User ID
 */
export async function resolveUserId(lineUserId: string): Promise<string | null> {
    try {
        const supabase = createAdminClient();

        // 1. Check line_accounts mapping table
        const { data: lineAccount } = await supabase
            .from('line_accounts')
            .select('user_id')
            .eq('line_user_id', lineUserId)
            .maybeSingle();

        if (lineAccount?.user_id) {
            return lineAccount.user_id;
        }

        // Return null if not linked (fail-closed for security)
        return null;
    } catch (err) {
        console.error('[LINE Service] resolveUserId error:', err);
        return null;
    }
}

/**
 * Link LINE User ID to a Supabase user via secure 6-digit Pairing Code generated from Dashboard
 */
export async function linkAccountByCode(lineUserId: string, inputCode: string): Promise<{ success: boolean; message: string }> {
    try {
        const cleanCode = inputCode.replace(/[^0-9]/g, '').trim();
        if (cleanCode.length !== 6) {
            return {
                success: false,
                message: 'รหัสผูกบัญชีต้องเป็นตัวเลข 6 หลักค่า เช่น "ผูกบัญชี 123456" ตรวจสอบรหัสได้จากหน้าเว็บ Dashboard นะคะ 💖',
            };
        }

        const supabase = createAdminClient();

        // Search user with matching active pairing code in user_metadata
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError || !authData.users) {
            console.error('[LINE Service] listUsers error:', authError);
            return {
                success: false,
                message: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบฐานข้อมูลชั่วคราว ลองใหม่อีกครั้งนะคะ',
            };
        }

        const now = Date.now();
        const matchedUser = authData.users.find(u => {
            const meta = u.user_metadata;
            if (!meta?.line_pairing_code || !meta?.line_pairing_expires) return false;
            return String(meta.line_pairing_code) === cleanCode && Number(meta.line_pairing_expires) > now;
        });

        if (!matchedUser) {
            return {
                success: false,
                message: 'ง่าา ไม่พบรหัสผูกบัญชีนี้ หรือรหัสอาจหมดอายุแล้วค่า 🥺\nกรุณากด "ขอรหัสผูกบัญชีใหม่" บนหน้าเว็บ Dashboard แล้วลองใหม่อีกครั้งน้า ✨',
            };
        }

        // Upsert binding in line_accounts
        const displayName = matchedUser.user_metadata?.full_name || matchedUser.user_metadata?.name || matchedUser.email || 'LINE User';
        const { error: upsertError } = await supabase.from('line_accounts').upsert({
            line_user_id: lineUserId,
            user_id: matchedUser.id,
            display_name: displayName,
            updated_at: new Date().toISOString(),
        });

        if (upsertError) {
            console.error('[LINE Service] upsert error:', upsertError);
            return {
                success: false,
                message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการผูกบัญชี กรุณาลองใหม่อีกครั้งนะคะ',
            };
        }

        // Clear pairing code immediately so it cannot be reused
        await supabase.auth.admin.updateUserById(matchedUser.id, {
            user_metadata: {
                ...matchedUser.user_metadata,
                line_pairing_code: null,
                line_pairing_expires: null,
            },
        });

        const maskedEmail = (matchedUser.email || '').replace(/(.{2})(.*)(@.*)/, '$1***$3');
        return {
            success: true,
            message: `เย้! ผูกบัญชี LINE กับ ${maskedEmail ? `อีเมล ${maskedEmail}` : 'บัญชีของคุณ'} สำเร็จเรียบร้อยแล้วค่า 🎉 ต่อไปนี้เรามาลุยงานไปด้วยกันนะค๊า ✨💖`,
        };
    } catch (err) {
        console.error('[LINE Service] linkAccountByCode error:', err);
        return {
            success: false,
            message: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่ในภายหลังนะคะ',
        };
    }
}

/**
 * Fetch current weather from Open-Meteo
 */
async function fetchCurrentWeather() {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${DEFAULT_LOCATION.lat}&longitude=${DEFAULT_LOCATION.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Asia/Bangkok`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data?.current;
    } catch {
        return null;
    }
}

/**
 * Process incoming LINE Webhook message event
 */
export async function handleLineMessageEvent(event: LineWebhookEvent): Promise<void> {
    const replyToken = event.replyToken;
    const lineUserId = event.source.userId;
    const text = event.message?.text?.trim();

    if (!replyToken || !lineUserId || !text) {
        return;
    }

    const supabase = createAdminClient();

    // 1. Check AI intent
    const rawIntent = await analyzeLineIntent(text);
    console.log('[LINE Service] Analyzed Intent:', JSON.stringify(rawIntent));

    const intents: AiIntentResult[] = Array.isArray(rawIntent) ? rawIntent : [rawIntent];
    const firstIntent = intents[0] || { action: 'general_chat', confidence: 0.5 };

    // Handle Help
    if (firstIntent.action === 'help') {
        await replyLineMessage(replyToken, [
            {
                type: 'flex',
                altText: 'วิธีใช้งานผู้ช่วย AI Day Base',
                contents: createHelpFlex(),
                quickReply: DEFAULT_QUICK_REPLY,
            },
        ]);
        return;
    }

    // Handle Weather Query (does not require login)
    if (firstIntent.action === 'get_weather') {
        const weather = await fetchCurrentWeather();
        if (weather) {
            const desc = WEATHER_CODE_TEXT[weather.weather_code] || 'สภาพอากาศทั่วไป';
            const msg = `🌤️ รายงานสภาพอากาศ อ.เมือง จันทบุรี วันนี้ค่า ✨\n\n🌡️ อุณหภูมิ: ${Math.round(weather.temperature_2m)}°C (รู้สึกเหมือน ${Math.round(weather.apparent_temperature)}°C)\n☁️ สภาพท้องฟ้า: ${desc}\n💧 ความชื้น: ${weather.relative_humidity_2m}%\n🌧️ ปริมาณฝน: ${weather.precipitation} มม.\n💨 ความเร็วลม: ${weather.wind_speed_10m} กม./ชม.\n\nอย่าลืมดูแลสุขภาพและพกร่มด้วยนะคะ 💖☔`;
            await replyLineMessage(replyToken, [
                {
                    type: 'text',
                    text: msg,
                    quickReply: DEFAULT_QUICK_REPLY,
                },
            ]);
        } else {
            await replyLineMessage(replyToken, [
                {
                    type: 'text',
                    text: 'งืออ ขออภัยด้วยน้า ตอนนี้เบสดึงข้อมูลสภาพอากาศไม่ได้ชั่วคราวค่า 🥺 ลองใหม่อีกทีนะค๊า',
                    quickReply: DEFAULT_QUICK_REPLY,
                },
            ]);
        }
        return;
    }

    // Handle Account Linking Request via Pairing Code
    if (firstIntent.action === 'link_account') {
        const rawCode = firstIntent.link_account?.code || text.match(/\d{6}/)?.[0];
        const isEmailInput = Boolean(firstIntent.link_account?.email || text.includes('@'));

        if (isEmailInput && !rawCode) {
            await replyLineMessage(replyToken, [
                {
                    type: 'text',
                    text: '🔒 เพื่อความปลอดภัยของข้อมูล บัญชีจะไม่สามารถผูกด้วยอีเมลตรงๆ ได้น้า ✨\n\n📌 วิธีผูกบัญชีที่ถูกต้อง:\n1. ล็อกอินบนหน้าเว็บ Dashboard\n2. กดที่รูปมาสคอตน้องเบสเพื่อขอ "รหัสผูกบัญชี 6 หลัก"\n3. นำรหัสมาพิมพ์ส่งให้เบส เช่น "ผูกบัญชี 123456" ได้เลยค่า 💖',
                    quickReply: DEFAULT_QUICK_REPLY,
                },
            ]);
            return;
        }

        if (!rawCode) {
            await replyLineMessage(replyToken, [
                {
                    type: 'text',
                    text: '📌 วิธีผูกบัญชีกับ LINE Bot:\n1. ล็อกอินบนหน้าเว็บ Dashboard แล้วกดที่รูปมาสคอต\n2. คัดลอกรหัสผูกบัญชี 6 หลัก\n3. พิมพ์ส่งให้เบส เช่น "ผูกบัญชี 123456" ได้เลยนะคะ ✨💖',
                    quickReply: DEFAULT_QUICK_REPLY,
                },
            ]);
            return;
        }

        const linkResult = await linkAccountByCode(lineUserId, rawCode);
        await replyLineMessage(replyToken, [
            {
                type: 'text',
                text: linkResult.message,
                quickReply: DEFAULT_QUICK_REPLY,
            },
        ]);
        return;
    }

    // Handle General Greetings / Chat (does not strictly require login)
    if (intents.length === 1 && firstIntent.action === 'general_chat' && (text.includes('สวัสดี') || text.includes('หวัดดี') || text.includes('hello') || text.includes('hi'))) {
        const greetingReply = firstIntent.chat_response || 'สวัสดีค่า! น้องเบสผู้ช่วยประจำ Day Base มาแล้วว ✨ มีอะไรให้เบสช่วยจัดการ To-Do หรือจดรายจ่ายบอกเบสได้เลยน้า 💖';
        await replyLineMessage(replyToken, [
            {
                type: 'text',
                text: `👋 ${greetingReply}`,
                quickReply: DEFAULT_QUICK_REPLY,
            },
        ]);
        return;
    }

    // Resolve User ID for data operations
    const userId = await resolveUserId(lineUserId);

    if (!userId) {
        // Unlinked user guidance
        await replyLineMessage(replyToken, [
            {
                type: 'text',
                text: '👋 สวัสดีค่า! บัญชี LINE ยังไม่ได้ผูกกับระบบ Day Base Dashboard น้า ✨\n\n📌 วิธีเชื่อมต่อบัญชี:\n1. เข้าสู่ระบบบนหน้าเว็บ Dashboard\n2. กดรูปมาสคอตน้องเบส แล้วคัดลอก "รหัสผูกบัญชี 6 หลัก"\n3. นำรหัสมาพิมพ์บอกเบส เช่น "ผูกบัญชี 123456" ได้เลยค่า 💖',
                quickReply: DEFAULT_QUICK_REPLY,
            },
        ]);
        return;
    }

    // Check if there are multiple todos or expenses to add
    const todosToAdd = intents.filter(i => i.action === 'add_todo');
    const expensesToAdd = intents.filter(i => i.action === 'add_expense');

    if (todosToAdd.length > 1) {
        const rows = todosToAdd.map(t => {
            let reminderAt: string | null = null;
            if (t.todo?.reminder_time) {
                const targetDate = t.todo.due_date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
                reminderAt = `${targetDate}T${t.todo.reminder_time}:00+07:00`;
            }
            return {
                user_id: userId,
                title: t.todo?.title || text,
                priority: t.todo?.priority || 'medium',
                due_date: t.todo?.due_date || null,
                reminder_at: reminderAt,
                is_reminded: false,
                completed: false,
            };
        });

        const { data: newTodos, error } = await supabase.from('todos').insert(rows).select();

        if (error || !newTodos || newTodos.length === 0) {
            await replyLineMessage(replyToken, [
                {
                    type: 'text',
                    text: `งืออ เกิดข้อผิดพลาดในการบันทึก To-Do ค่า: ${error?.message || 'โปรดลองใหม่อีกครั้งน้า'} 🥺`,
                },
            ]);
        } else {
            const summaryTitles = newTodos
                .map((t, idx) => `${idx + 1}. 📝 ${t.title} ${t.due_date ? `(📅 ${t.due_date})` : ''}`)
                .join('\n');
            await replyLineMessage(replyToken, [
                {
                    type: 'text',
                    text: `✨ เบสจดงาน ${newTodos.length} รายการให้เรียบร้อยแล้วค่าา 🎉\n\n${summaryTitles}\n\nสู้ๆ น้า เป็นกำลังใจให้เสมอค่า 💖`,
                    quickReply: DEFAULT_QUICK_REPLY,
                },
            ]);
        }
        return;
    }

    if (expensesToAdd.length > 1) {
        const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        const rows = expensesToAdd.map(e => ({
            user_id: userId,
            amount: e.expense?.amount || 0,
            type: e.expense?.type || 'expense',
            category: e.expense?.category || 'ทั่วไป',
            note: e.expense?.note || null,
            transaction_date: todayDateStr,
        }));

        const { data: newExp, error } = await supabase.from('expenses').insert(rows).select();

        if (error || !newExp) {
            await replyLineMessage(replyToken, [
                {
                    type: 'text',
                    text: `งืออ เกิดข้อผิดพลาดในการบันทึกรายจ่ายค่า: ${error?.message || 'โปรดลองใหม่อีกครั้งน้า'} 🥺`,
                },
            ]);
        } else {
            const summaryExp = newExp
                .map((x, idx) => `${idx + 1}. ${x.type === 'expense' ? '💸' : '💰'} ${x.note || x.category}: ฿${x.amount}`)
                .join('\n');
            await replyLineMessage(replyToken, [
                {
                    type: 'text',
                    text: `✨ เบสจดบันทึกการเงิน ${newExp.length} รายการให้เรียบร้อยแล้วค่า 💸\n\n${summaryExp}\n\n💖`,
                    quickReply: DEFAULT_QUICK_REPLY,
                },
            ]);
        }
        return;
    }

    // ==========================================
    // DISPATCH SINGLE ACTION
    // ==========================================

    switch (firstIntent.action) {
        case 'add_todo': {
            const todoInput = firstIntent.todo || { title: text };
            let reminderAt: string | null = null;
            if (todoInput.reminder_time) {
                const targetDate = todoInput.due_date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
                reminderAt = `${targetDate}T${todoInput.reminder_time}:00+07:00`;
            }

            const { data: newTodo, error } = await supabase
                .from('todos')
                .insert({
                    user_id: userId,
                    title: todoInput.title,
                    priority: todoInput.priority || 'medium',
                    due_date: todoInput.due_date || null,
                    reminder_at: reminderAt,
                    is_reminded: false,
                    completed: false,
                })
                .select()
                .single();

            if (error || !newTodo) {
                await replyLineMessage(replyToken, [
                    {
                        type: 'text',
                        text: `งืออ เกิดข้อผิดพลาดในการบันทึก To-Do ค่า: ${error?.message || 'โปรดลองใหม่อีกครั้งน้า'} 🥺`,
                    },
                ]);
            } else {
                await replyLineMessage(replyToken, [
                    {
                        type: 'flex',
                        altText: `เพิ่มงาน: ${newTodo.title}`,
                        contents: createTodoAddedFlex({
                            title: newTodo.title,
                            priority: newTodo.priority,
                            dueDate: newTodo.due_date,
                            reminderTime: todoInput.reminder_time ? `${todoInput.reminder_time} น.` : null,
                        }),
                        quickReply: DEFAULT_QUICK_REPLY,
                    },
                ]);
            }
            break;
        }

        case 'list_todos': {
            const { data: todos, error } = await supabase
                .from('todos')
                .select('*')
                .eq('user_id', userId)
                .order('completed', { ascending: true })
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false });

            if (error || !todos) {
                await replyLineMessage(replyToken, [
                    {
                        type: 'text',
                        text: 'งืออ เกิดข้อผิดพลาดในการดึงรายการงานค่า 🥺',
                    },
                ]);
            } else {
                await replyLineMessage(replyToken, [
                    {
                        type: 'flex',
                        altText: 'รายการสิ่งที่ต้องทำ (To-Do)',
                        contents: createTodoListFlex(todos),
                        quickReply: DEFAULT_QUICK_REPLY,
                    },
                ]);
            }
            break;
        }

        case 'complete_todo': {
            const keyword = firstIntent.complete_todo?.keyword || text;
            // Find uncompleted todo matching keyword
            const { data: todos } = await supabase
                .from('todos')
                .select('*')
                .eq('user_id', userId)
                .eq('completed', false);

            const match = todos?.find(t =>
                t.title.toLowerCase().includes(keyword.toLowerCase())
            ) || todos?.[0]; // Fallback to first uncompleted todo if ambiguous

            if (match) {
                await supabase
                    .from('todos')
                    .update({ completed: true, updated_at: new Date().toISOString() })
                    .eq('id', match.id);

                await replyLineMessage(replyToken, [
                    {
                        type: 'text',
                        text: `🎉 เก่งมากเลยค่า! ติ๊กถูกงาน "${match.title}" ให้ว่าทำเสร็จแล้วน้า พักผ่อนได้เลยงับ 💖✨`,
                        quickReply: DEFAULT_QUICK_REPLY,
                    },
                ]);
            } else {
                await replyLineMessage(replyToken, [
                    {
                        type: 'text',
                        text: `🔍 ง่าา ไม่พบงานที่ตรงกับ "${keyword}" หรืออาจทำงานนี้เสร็จไปแล้วน้า ✨`,
                        quickReply: DEFAULT_QUICK_REPLY,
                    },
                ]);
            }
            break;
        }

        case 'add_expense': {
            const exp = firstIntent.expense;
            if (!exp || !exp.amount) {
                await replyLineMessage(replyToken, [
                    {
                        type: 'text',
                        text: 'ตัวเองระบุจำนวนเงินที่จะจดด้วยน้า เช่น "กินข้าว 60 บาท" ค่า 💸✨',
                    },
                ]);
                return;
            }

            const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

            const { error } = await supabase.from('expenses').insert({
                user_id: userId,
                amount: exp.amount,
                type: exp.type,
                category: exp.category || 'ทั่วไป',
                note: exp.note || null,
                transaction_date: todayDateStr,
            });

            if (error) {
                await replyLineMessage(replyToken, [
                    {
                        type: 'text',
                        text: `งืออ เกิดข้อผิดพลาดในการบันทึกรายรับ-รายจ่ายค่า: ${error.message} 🥺`,
                    },
                ]);
            } else {
                await replyLineMessage(replyToken, [
                    {
                        type: 'flex',
                        altText: `บันทึก${exp.type === 'expense' ? 'รายจ่าย' : 'รายรับ'} ฿${exp.amount}`,
                        contents: createExpenseAddedFlex({
                            type: exp.type,
                            amount: exp.amount,
                            category: exp.category,
                            note: exp.note,
                        }),
                        quickReply: DEFAULT_QUICK_REPLY,
                    },
                ]);
            }
            break;
        }

        case 'list_expenses':
        case 'get_summary': {
            const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
            const { data: todayExpenses } = await supabase
                .from('expenses')
                .select('*')
                .eq('user_id', userId)
                .eq('transaction_date', todayDateStr);

            let incomeTotal = 0;
            let expenseTotal = 0;

            todayExpenses?.forEach(item => {
                if (item.type === 'income') incomeTotal += Number(item.amount);
                else expenseTotal += Number(item.amount);
            });

            const net = incomeTotal - expenseTotal;
            const summaryMsg = `📊 สรุปการเงินประจำวันนี้ (${todayDateStr}) มาแล้วค่า ✨\n\n💰 รายรับ: +฿${incomeTotal.toLocaleString('th-TH')}\n💸 รายจ่าย: -฿${expenseTotal.toLocaleString('th-TH')}\n⚖️ ยอดสุทธิวันนี้: ${net >= 0 ? '+' : ''}฿${net.toLocaleString('th-TH')}\n\nบันทึกวันนี้ทั้งหมด ${todayExpenses?.length || 0} รายการค่า 💖`;

            await replyLineMessage(replyToken, [
                {
                    type: 'text',
                    text: summaryMsg,
                    quickReply: DEFAULT_QUICK_REPLY,
                },
            ]);
            break;
        }

        case 'general_chat':
        default: {
            const replyMsg =
                firstIntent.chat_response ||
                'เบสพร้อมช่วยจัดการ To-Do, บันทึกค่าใช้จ่าย และเช็กสภาพอากาศให้เสมอน้า พิมพ์บอกเบสได้เลยค่า ✨🎀';
            await replyLineMessage(replyToken, [
                {
                    type: 'text',
                    text: replyMsg,
                    quickReply: DEFAULT_QUICK_REPLY,
                },
            ]);
            break;
        }
    }
}

/**
 * Handle LINE Postback Events (e.g. user taps "✅ ทำเสร็จแล้ว" button on reminder card)
 */
export async function handleLinePostbackEvent(event: LineWebhookEvent): Promise<void> {
    const postbackData = event.postback?.data;
    const replyToken = event.replyToken;
    const lineUserId = event.source.userId;

    if (!replyToken || !lineUserId || !postbackData) return;

    try {
        const params = new URLSearchParams(postbackData);
        const action = params.get('action');
        const todoId = params.get('todo_id');

        if (action === 'complete_todo' && todoId) {
            const supabase = createAdminClient();
            const userId = await resolveUserId(lineUserId);

            if (!userId) {
                await replyLineMessage(replyToken, [
                    {
                        type: 'text',
                        text: 'ไม่พบบัญชีที่เชื่อมโยงกับ LINE นี้ค่า กรุณาผูกบัญชีใน Dashboard ก่อนนะคะ 💖',
                    },
                ]);
                return;
            }

            const { data: updatedTodo, error } = await supabase
                .from('todos')
                .update({ completed: true })
                .eq('id', todoId)
                .eq('user_id', userId)
                .select('title')
                .maybeSingle();

            if (error || !updatedTodo) {
                await replyLineMessage(replyToken, [
                    {
                        type: 'text',
                        text: 'งืออ อัปเดตสถานะงานไม่สำเร็จ หรืออาจถูกลบไปแล้วค่า 🥺',
                    },
                ]);
                return;
            }

            await replyLineMessage(replyToken, [
                {
                    type: 'text',
                    text: `🎉 เก่งมากเลยค่าา! น้องเบสบันทึกว่าทำ "${updatedTodo.title}" เสร็จเรียบร้อยแล้วนะคะ 💖✨`,
                    quickReply: DEFAULT_QUICK_REPLY,
                },
            ]);
        }
    } catch (err) {
        console.error('[LINE Service] handleLinePostbackEvent error:', err);
    }
}

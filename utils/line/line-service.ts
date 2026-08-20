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
import type { LineWebhookEvent, LineMessage } from '@/types/line';

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

        // 2. If no direct binding found, check if there's only 1 profile in the database
        // (Enables seamless zero-friction setup for single-user dashboard)
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .limit(2);

        if (profiles && profiles.length === 1) {
            const singleUserId = profiles[0].id;
            // Auto-link for convenience
            await supabase.from('line_accounts').upsert({
                line_user_id: lineUserId,
                user_id: singleUserId,
                display_name: 'LINE User',
            });
            return singleUserId;
        }

        return null;
    } catch (err) {
        console.error('[LINE Service] resolveUserId error:', err);
        return null;
    }
}

/**
 * Link LINE User ID to a Supabase user by email
 */
export async function linkAccountByEmail(lineUserId: string, email: string): Promise<boolean> {
    try {
        const supabase = createAdminClient();

        // Search user in auth
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError || !authData.users) {
            console.error('[LINE Service] listUsers error:', authError);
            return false;
        }

        const matchedUser = authData.users.find(
            u => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (!matchedUser) {
            return false;
        }

        const { error } = await supabase.from('line_accounts').upsert({
            line_user_id: lineUserId,
            user_id: matchedUser.id,
            display_name: matchedUser.email || 'Linked User',
            updated_at: new Date().toISOString(),
        });

        return !error;
    } catch (err) {
        console.error('[LINE Service] linkAccountByEmail error:', err);
        return false;
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
    const intent = await analyzeLineIntent(text);
    console.log('[LINE Service] Analyzed Intent:', JSON.stringify(intent));

    // Handle Help
    if (intent.action === 'help') {
        await replyLineMessage(replyToken, [
            {
                type: 'flex',
                altText: 'วิธีใช้งานผู้ช่วย AI WeatherTodo',
                contents: createHelpFlex(),
                quickReply: DEFAULT_QUICK_REPLY,
            },
        ]);
        return;
    }

    // Handle Weather Query (does not require login)
    if (intent.action === 'get_weather') {
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
                    text: 'งืออ ขออภัยด้วยน้า ตอนนี้น้องดึงข้อมูลสภาพอากาศไม่ได้ชั่วคราวค่า 🥺 ลองใหม่อีกทีนะค๊า',
                    quickReply: DEFAULT_QUICK_REPLY,
                },
            ]);
        }
        return;
    }

    // Handle Account Linking Request
    if (intent.action === 'link_account' && intent.link_account?.email) {
        const success = await linkAccountByEmail(lineUserId, intent.link_account.email);
        if (success) {
            await replyLineMessage(replyToken, [
                {
                    type: 'text',
                    text: `เย้! ผูกบัญชี LINE กับอีเมล ${intent.link_account.email} สำเร็จเรียบร้อยแล้วค่า 🎉 ต่อไปนี้เรามาลุยงานไปด้วยกันนะค๊า ✨💖`,
                    quickReply: DEFAULT_QUICK_REPLY,
                },
            ]);
        } else {
            await replyLineMessage(replyToken, [
                {
                    type: 'text',
                    text: `ง่าา ไม่พบบัญชีอีเมล ${intent.link_account.email} ในระบบ WeatherTodo เลยค่า 🥺 ลองตรวจสอบอีเมลที่ใช้สมัครบนหน้าเว็บอีกครั้งนะค๊า`,
                    quickReply: DEFAULT_QUICK_REPLY,
                },
            ]);
        }
        return;
    }

    // Handle General Greetings / Chat (does not strictly require login)
    if (intent.action === 'general_chat' && (text.includes('สวัสดี') || text.includes('หวัดดี') || text.includes('hello') || text.includes('hi'))) {
        const greetingReply = intent.chat_response || 'สวัสดีค่า! หนูน้องผู้ช่วย WeatherTodo มาแล้วว ✨ มีอะไรให้ช่วยจัดการ To-Do หรือจดรายจ่ายบอกเค้าได้เลยน้า 💖';
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
                text: '👋 สวัสดีค่า! บัญชี LINE ยังไม่ได้ผูกกับระบบ WeatherTodo Dashboard น้า ✨\n\n📌 วิธีผูกบัญชีง่ายม๊าก:\nพิมพ์คำว่า: "ผูกบัญชี อีเมลของคุณ" ได้เลยค่า เช่น\n👉 ผูกบัญชี ' + (intent.link_account?.email || 'your-email@gmail.com'),
                quickReply: DEFAULT_QUICK_REPLY,
            },
        ]);
        return;
    }

    // ==========================================
    // DISPATCH ACTIONS
    // ==========================================

    switch (intent.action) {
        case 'add_todo': {
            const todoInput = intent.todo || { title: text };
            const { data: newTodo, error } = await supabase
                .from('todos')
                .insert({
                    user_id: userId,
                    title: todoInput.title,
                    priority: todoInput.priority || 'medium',
                    due_date: todoInput.due_date || null,
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
            const keyword = intent.complete_todo?.keyword || text;
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
            const exp = intent.expense;
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
                intent.chat_response ||
                'เค้าพร้อมช่วยจัดการ To-Do, บันทึกค่าใช้จ่าย และเช็กสภาพอากาศให้เสมอน้า พิมพ์บอกเค้าได้เลยค่า ✨🎀';
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

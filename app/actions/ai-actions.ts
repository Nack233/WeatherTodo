'use server';

import { BriefingInputData, generateDailyBriefing } from '@/utils/ai-briefing';
import { callOpenRouterCompletion, OpenRouterChatMessage } from '@/utils/openrouter';
import { buildBriefingPrompt, buildNongBaseSystemPrompt, buildNongBaseChatPrompt } from '@/app/data/prompts';

import { createClient } from '@/utils/supabase/server';

export type AiSourceType = 'gemini' | 'openrouter' | 'synthesis';

export async function fetchAiBriefing(data: BriefingInputData): Promise<{ text: string; source: AiSourceType }> {
    // SECURITY: Ensure user is authenticated before calling AI APIs
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error('Unauthorized');
    }

    const prompt = buildBriefingPrompt(data);

    // 1. Try Gemini 3.5 Flash Lite first
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
        try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': geminiKey,
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                }),
                next: { revalidate: 300 } // Cache for 5 minutes
            });

            if (response.ok) {
                const resData = await response.json();
                const aiText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (aiText) {
                    return { text: aiText.trim(), source: 'gemini' };
                }
            } else {
                console.warn(`[AI Briefing] Gemini API returned ${response.status}. Switching to OpenRouter MiniMax M3...`);
            }
        } catch (geminiErr) {
            console.warn('[AI Briefing] Gemini request error. Switching to OpenRouter MiniMax M3...', geminiErr);
        }
    }

    // 2. Fallback to OpenRouter MiniMax M3 (Free)
    try {
        const openRouterText = await callOpenRouterCompletion([
            { role: 'user', content: prompt }
        ], { temperature: 0.5 });

        if (openRouterText) {
            return { text: openRouterText, source: 'openrouter' };
        }
    } catch (openRouterErr) {
        console.warn('[AI Briefing] OpenRouter fallback failed:', openRouterErr);
    }

    // 3. Fallback to local heuristic synthesis engine
    return {
        text: generateDailyBriefing(data),
        source: 'synthesis'
    };
}

export async function chatWithNongBase(
    message: string,
    history: { sender: 'user' | 'bot'; text: string }[],
    data: BriefingInputData
): Promise<{ reply: string; source: AiSourceType }> {
    // SECURITY: Ensure user is authenticated before calling AI APIs
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error('Unauthorized');
    }

    const trimmedMsg = message.trim().slice(0, 500);
    const systemPrompt = buildNongBaseSystemPrompt(data);

    // 1. Try Gemini first
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
        try {
            const geminiPrompt = buildNongBaseChatPrompt(trimmedMsg, history, data);

            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': geminiKey,
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: geminiPrompt }] }]
                }),
                cache: 'no-store'
            });

            if (response.ok) {
                const resData = await response.json();
                const aiText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (aiText) {
                    return { reply: aiText.trim(), source: 'gemini' };
                }
            } else {
                console.warn(`[AI Chat] Gemini API returned ${response.status}. Switching to OpenRouter MiniMax M3...`);
            }
        } catch (geminiErr) {
            console.warn('[AI Chat] Gemini error. Switching to OpenRouter MiniMax M3...', geminiErr);
        }
    }

    // 2. Fallback to OpenRouter MiniMax M3 (Free)
    try {
        const messages: OpenRouterChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-4).map(m => ({
                role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
                content: m.text
            })),
            { role: 'user', content: trimmedMsg }
        ];

        const openRouterReply = await callOpenRouterCompletion(messages, { temperature: 0.6 });
        if (openRouterReply) {
            return { reply: openRouterReply, source: 'openrouter' };
        }
    } catch (openRouterErr) {
        console.warn('[AI Chat] OpenRouter fallback failed:', openRouterErr);
    }

    // 3. Fallback to local rule-based responses
    return {
        reply: generateSmartMascotReply(trimmedMsg, data),
        source: 'synthesis'
    };
}

function generateSmartMascotReply(msg: string, data: BriefingInputData): string {
    const lower = msg.toLowerCase();
    const name = data.userName || 'คุณ';

    // Weather
    if (/(อากาศ|ฝน|แดด|ร้อน|หนาว|อุณหภูมิ|สภาพอากาศ)/.test(lower)) {
        return `สภาพอากาศวันนี้อยู่ที่ประมาณ ${data.weather?.temp || '--'} ค่ะ สภาพอากาศเป็น${data.weather?.desc || 'ปกติ'} อย่าลืมดูแลสุขภาพและพกร่มติดตัวไว้นะคะคุณ ${name} 🌤️`;
    }

    // Todos
    if (/(งาน|สิ่งที่ต้องทำ|todo|การบ้าน|ค้าง|เหลืออะไร)/.test(lower)) {
        const pending = data.todos ? data.todos.total - data.todos.completed : 0;
        if (pending === 0) {
            return `ยินดีด้วยค่าคุณ ${name}! วันนี้ไม่มีงานค้างเลย ยอดเยี่ยมที่สุดเลยค่ะ พักผ่อนให้สบายใจเลยน้า 🎉✨`;
        }
        const firstFew = data.todos?.list.slice(0, 3).join(', ') || '';
        return `ตอนนี้มีงานค้างอยู่ ${pending} งานค่ะ เช่น ${firstFew} ค่อยๆ ทำไปทีละอย่างนะคะ น้องเบสเป็นกำลังใจให้อยู่ตรงนี้เสมอค่า สู้ๆ! 💪💕`;
    }

    // Calendar
    if (/(ปฏิทิน|นัด|กิจกรรม|ตาราง|มีนัด|event)/.test(lower)) {
        if (!data.events || data.events.length === 0) {
            return `วันนี้ไม่มีนัดหมายในปฏิทินเลยค่ะคุณ ${name} ตารางว่างโล่งสบายๆ จัดสรรเวลาทำสิ่งที่ชอบได้เต็มที่เลยนะคะ 📅✨`;
        }
        const eventSummary = data.events.map(e => `${e.title} ตอน ${e.time}`).join(', ');
        return `วันนี้คุณ ${name} มีนัดหมายดังนี้ค่ะ: ${eventSummary} เตรียมตัวให้พร้อมนะคะ น้องเบสคอยเชียร์อยู่ค่า ⏰`;
    }

    // Finance / Money
    if (/(เงิน|กระเป๋า|จ่าย|ใช้|เหลือ|รายรับ|รายจ่าย|งบ)/.test(lower)) {
        return `กระเป๋าเงินวันนี้เหลืออยู่ ${data.expenses?.balance || '฿0'} ค่ะ (มีรายรับ ${data.expenses?.income || '฿0'} และรายจ่าย ${data.expenses?.expense || '฿0'}) บริหารการเงินได้เก่งมากๆ เลยนะคะคุณ ${name} 💰✨`;
    }

    // Encouragement
    if (/(เหนื่อย|ท้อ|ขอกำลังใจ|กำลังใจ|เครียด|ไม่ไหว)/.test(lower)) {
        return `กอดๆ นะคะคุณ ${name}! เหนื่อยก็พักสักนิดน้า น้องเบสอยากบอกว่าคุณเก่งมากๆ แล้วในทุกๆ วัน อย่าลืมยิ้มให้ตัวเองเยอะๆ นะคะ น้องเบสจะอยู่เคียงข้างเสมอเลยน้า 💕🌸`;
    }

    // Greetings
    if (/(สวัสดี|ดีจ้า|ฮัลโหล|hello|hi|หวัดดี)/.test(lower)) {
        return `สวัสดีค่าคุณ ${name}! น้องเบสมาแล้ววว วันนี้มีอะไรอยากให้เบสช่วยดูไหมคะ ถามเรื่องอากาศ งาน หรือจะคุยเล่นกับเบสก็ได้น้า ยินดีมากๆ เลยค่ะ 💖`;
    }

    // Default friendly reply
    return `น้องเบสรับทราบค่าคุณ ${name}! มีอะไรอยากรู้เกี่ยวกับสภาพอากาศ งานที่ต้องทำ หรือเรื่องการเงิน สอบถามเบสได้ตลอดเวลาเลยนะคะ เบสพร้อมตอบเสมอค่า ✨😊`;
}

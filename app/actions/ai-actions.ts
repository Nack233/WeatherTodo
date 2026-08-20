'use server';

import { BriefingInputData, generateDailyBriefing } from '@/utils/ai-briefing';

export async function fetchAiBriefing(data: BriefingInputData): Promise<{ text: string; source: 'gemini' | 'synthesis' }> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        // Fallback to built-in smart synthesis engine if no API Key
        return {
            text: generateDailyBriefing(data),
            source: 'synthesis'
        };
    }

    try {
        const prompt = `คุณคือ "เบส" (Base) ผู้ช่วย AI ส่วนตัวประจำวันสำหรับระบบ Day Base แดชบอร์ด (แทนตัวเองว่าเบส สไตล์สาวน้อยน่ารัก สดใส มีพลังบวก)
ช่วยเขียนบทสรุปภาพรวมประจำวันสั้นๆ (ความยาว 3-4 ประโยค) ในสไตล์ที่เป็นกันเอง สุภาพ มีพลังบวก และเป็นภาษาไทย
โดยอ้างอิงจากข้อมูลล่าสุดดังต่อไปนี้:
- ชื่อผู้ใช้: ${data.userName || 'คุณ'}
- สภาพอากาศ: อุณหภูมิ ${data.weather?.temp || '--'}, สภาพ ${data.weather?.desc || 'ปกติ'}
- งานค้าง (To-Do): ค้าง ${data.todos ? data.todos.total - data.todos.completed : 0} งานจากทั้งหมด ${data.todos?.total || 0} งาน (งานแรก: ${data.todos?.list[0] || 'ไม่มี'})
- กิจกรรมถัดไป: ${data.events && data.events.length > 0 ? `${data.events[0].title} (${data.events[0].time})` : 'ไม่มีกิจกรรม'}
- สรุปเงินคงเหลือ: ${data.expenses?.balance || '฿0'}

ให้สรุปและให้คำแนะนำแบบสั้นกระชับ อ่านง่าย`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        }
    } catch {
        // Ignore API errors and fallback gracefully
    }

    return {
        text: generateDailyBriefing(data),
        source: 'synthesis'
    };
}

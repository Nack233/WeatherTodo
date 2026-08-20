import type { AiIntentResult, AiIntentResponse } from '@/types/line';

/**
 * Fallback heuristic parser when AI API is unavailable
 */
function fallbackIntentParser(message: string, todayStr: string): AiIntentResult {
    const trimmed = message.trim();

    // Link account
    const linkMatch = trimmed.match(/ผูกบัญชี\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (linkMatch) {
        return {
            action: 'link_account',
            confidence: 0.95,
            link_account: { email: linkMatch[1] },
        };
    }

    // Help
    if (/^(ช่วย(เหลือ)?|วิธีใช้(งาน)?|help|\?)$/i.test(trimmed)) {
        return { action: 'help', confidence: 0.99 };
    }

    // Weather
    if (/(อากาศ|ฝน|แดด|สภาพอากาศ|weather)/i.test(trimmed)) {
        return { action: 'get_weather', confidence: 0.9 };
    }

    // List Todos
    if (/(งาน|สิ่งที่ต้องทำ|todo|รายการงาน|มีงานอะไร|การบ้าน|การงาน)/i.test(trimmed) && /(มี|ดู|แสดง|ขอดู|ลิสต์|สรุป|อะไร)/i.test(trimmed)) {
        return { action: 'list_todos', confidence: 0.9 };
    }

    // Complete Todo
    const doneMatch = trimmed.match(/(ทำ|ส่ง|เสร็จ|เรียบร้อย)\s*(.+)\s*(แล้ว|เสร็จแล้ว)?/);
    if (doneMatch && doneMatch[2] && !trimmed.includes('บาท') && !trimmed.includes('จ่าย')) {
        return {
            action: 'complete_todo',
            confidence: 0.8,
            complete_todo: { keyword: doneMatch[2].trim() },
        };
    }

    // Expense / Income
    const moneyMatch = trimmed.match(/(\d+[\d,]*(\.\d+)?)\s*(บาท|฿)/) || trimmed.match(/(จ่าย|ซื้อ|กิน|ค่า|ได้เงิน|รับเงิน|เงินเดือน)\s*.*?\s*(\d+[\d,]*)/);
    if (moneyMatch) {
        const numStr = (moneyMatch[1] || moneyMatch[2] || '').replace(/,/g, '');
        const amount = parseFloat(numStr);
        if (!isNaN(amount) && amount > 0) {
            const isIncome = /(ได้เงิน|รับเงิน|เงินเดือน|โอนเข้า|รายรับ|ขายได้)/.test(trimmed);
            let category = 'ทั่วไป';
            if (/(กิน|ข้าว|กะเพรา|กาแฟ|น้ำ|ชา|อาหาร|ขนม|บุฟเฟต์)/.test(trimmed)) category = 'อาหาร';
            else if (/(น้ำมัน|bts|mrt|แท็กซี่|เดินทาง|รถ|ค่าน้ำมัน)/.test(trimmed)) category = 'เดินทาง';
            else if (/(ช้อป|ซื้อของ|เสื้อ|กางเกง|รองเท้า)/.test(trimmed)) category = 'ช้อปปิ้ง';
            else if (/(ค่าไฟ|ค่าน้ำ|ค่าเน็ต|ค่าห้อง|ค่าบ้าน)/.test(trimmed)) category = 'บิลและที่อยู่';

            return {
                action: 'add_expense',
                confidence: 0.85,
                expense: {
                    amount,
                    type: isIncome ? 'income' : 'expense',
                    category,
                    note: trimmed,
                },
            };
        }
    }

    // Calculate relative dates for fallback
    const calcDate = (offsetDays: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    };

    let calculatedDueDate = todayStr;
    if (/พรุ่งนี้/.test(trimmed)) {
        calculatedDueDate = calcDate(1);
    } else if (/มะรืน(นี้)?/.test(trimmed)) {
        calculatedDueDate = calcDate(2);
    }

    // Add Todo (Explicit keywords or common action verbs like ซื้อ/ไป/ทำ/นัด/ส่ง)
    const isTodoAction = /(เพิ่ม|เตือน|บันทึก|ต้องทำ|อย่าลืม|ซื้อ|ไป|นัด|ส่ง|ทำ|โทร|ซ่อม|อ่าน|จอง)/.test(trimmed);
    if (isTodoAction || /พรุ่งนี้|มะรืน/.test(trimmed)) {
        const match = trimmed.match(/(?:เพิ่ม|เตือน|บันทึก|ต้องทำ|อย่าลืม)\s*(?:งาน|ว่า|ให้)?\s*(.+)/);
        const title = match ? match[1].trim() : trimmed;
        const isHigh = /(ด่วน|สำคัญ|มาก|รีบ)/.test(trimmed);
        return {
            action: 'add_todo',
            confidence: 0.8,
            todo: {
                title,
                priority: isHigh ? 'high' : 'medium',
                due_date: calculatedDueDate,
                category: /ซื้อ/.test(trimmed) ? 'ส่วนตัว' : 'ทั่วไป',
            },
        };
    }

    return {
        action: 'general_chat',
        confidence: 0.5,
        chat_response: 'สวัสดีค่า! น้องเบสผู้ช่วยประจำ Day Base มาแล้วว ✨ มีอะไรให้เบสช่วยจัดการ To-Do หรือจดรายจ่ายบอกเบสได้เลยน้า 💖',
    };
}

/**
 * Use Gemini AI to extract intent and parameters from user's natural language
 */
export async function analyzeLineIntent(userMessage: string): Promise<AiIntentResponse> {
    const today = new Date();
    // Thai local date format YYYY-MM-DD
    const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    const dayOfWeek = today.toLocaleDateString('th-TH', { weekday: 'long', timeZone: 'Asia/Bangkok' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return fallbackIntentParser(userMessage, todayStr);
    }

    const systemPrompt = `คุณคือ "เบส" (Base) AI ผู้ช่วยส่วนตัวสาวน้อยสุดน่ารัก ร่าเริง และสดใส (สไตล์อนิเมะสาวน้อยคิวท์ๆ สวมฮู้ด Day Base ถือแก้วกาแฟ) ประจำระบบ Day Base
บุคลิกและสไตล์การพูด:
- เป็นผู้หญิงน่ารัก สดใส ร่าเริง อ่อนหวาน ขี้เล่นนิดๆ และเต็มไปด้วยพลังบวก คอยให้กำลังใจเจ้านาย/ผู้ใช้อยู่เสมอ
- ใช้คำลงท้ายหวานๆ น่ารัก เช่น "ค่ะ", "นะคะ", "น้า ✨", "งับ", "ค่าา"
- สรรพนามแทนตัวเอง: ให้แทนตัวเองว่า "เบส" หรือ "น้องเบส" เสมอ และเรียกผู้ใช้ด้วยความเคารพอย่างเป็นกันเอง (เช่น "ตัวเอง", "คุณ", "เจ้านาย")
- เมื่อต้องตอบข้อความทั่วไป (chat_response) ให้ตอบสั้นๆ 1-3 ประโยค กระชับ น่ารัก มีอีโมจิน่ารักๆ (✨, 💖, 🎀, 🌸, ☕)

บริบทเวลาปัจจุบัน:
- วันนี้คือวัน: ${dayOfWeek}
- วันที่ปัจจุบัน: ${todayStr} (เวลาประเทศไทย)

Action Types ที่เป็นไปได้:
1. "add_todo": ผู้ใช้ต้องการเพิ่มสิ่งที่ต้องทำ/บันทึกงาน/เตือนความจำ
   - สกัด: title (ข้อความงาน), priority ("low"|"medium"|"high"), due_date (รูปแบบ "YYYY-MM-DD" คำนวณจาก "พรุ่งนี้", "มะรืนนี้", "วันศุกร์" โดยอิงจากวันที่ปัจจุบัน ${todayStr}), category ("ทั่วไป"|"งาน"|"การเงิน"|"สุขภาพ"|"ส่วนตัว")
2. "list_todos": ผู้ใช้ต้องการดูรายการงาน/สิ่งที่ต้องทำค้างอยู่
3. "complete_todo": ผู้ใช้บอกว่าทำงานอะไรเสร็จแล้ว
   - สกัด: keyword (คำหรือชื่องานที่ทำเสร็จ)
4. "add_expense": ผู้ใช้ต้องการบันทึกรายจ่าย หรือ รายรับ
   - สกัด: amount (ตัวเลข), type ("expense"|"income"), category ("อาหาร"|"เดินทาง"|"ช้อปปิ้ง"|"บิลและที่อยู่"|"สุขภาพ"|"ความบันเทิง"|"เงินเดือน"|"อื่นๆ"), note (หมายเหตุสั้นๆ)
5. "list_expenses": ผู้ใช้ต้องการดูยอดเงิน/สรุปรายรับรายจ่าย
6. "get_weather": ผู้ใช้ถามเรื่องสภาพอากาศ ฝนตก อุณหภูมิ
7. "link_account": ผู้ใช้พิมพ์อีเมลหรือแจ้งต้องการผูกบัญชี
   - สกัด: email
8. "help": ผู้ใช้ถามวิธีใช้งาน หรือพิมพ์ help/?
9. "general_chat": ข้อความทักทาย หรือคำถามทั่วไปที่ไม่เข้าหมวดหมู่ข้างต้น
   - สกัด: chat_response (คำตอบภาษาไทยสไตล์สาวน้อยน่ารัก สดใส มีพลังบวก)

ส่งออกคำตอบในรูปแบบ JSON ONLY เท่านั้น:
- หากมี 1 คำสั่ง ให้ส่งออกเป็น JSON Object โครงสร้างนี้:
{
  "action": "add_todo" | "list_todos" | "complete_todo" | "add_expense" | "list_expenses" | "get_weather" | "link_account" | "help" | "general_chat",
  "confidence": 0.0 - 1.0,
  "todo": { "title": string, "priority": "low"|"medium"|"high", "due_date": "YYYY-MM-DD" | null, "category": string },
  "complete_todo": { "keyword": string },
  "expense": { "amount": number, "type": "expense"|"income", "category": string, "note": string },
  "link_account": { "email": string },
  "chat_response": string
}
- หากผู้ใช้สั่งงานหลายอย่างในประโยคเดียว ให้ส่งออกเป็น JSON Array ของ Object ข้างต้น เช่น [ { "action": "add_todo", ... }, { "action": "add_todo", ... } ]`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: systemPrompt },
                                { text: `ข้อความของผู้ใช้: "${userMessage}"` },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: 'application/json',
                    },
                }),
            }
        );

        if (!response.ok) {
            console.error('[AI Intent] Gemini API error:', response.status, await response.text());
            return fallbackIntentParser(userMessage, todayStr);
        }

        const data = await response.json();
        const rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawJsonText) {
            return fallbackIntentParser(userMessage, todayStr);
        }

        const parsed = JSON.parse(rawJsonText) as AiIntentResponse;
        if (Array.isArray(parsed) && parsed.length === 1) {
            return parsed[0];
        }
        return parsed;
    } catch (err) {
        console.error('[AI Intent] Parse error:', err);
        return fallbackIntentParser(userMessage, todayStr);
    }
}

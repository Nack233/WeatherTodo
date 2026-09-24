import type { BriefingInputData } from '@/utils/ai-briefing';

export interface ChatHistoryItem {
    sender: 'user' | 'bot';
    text: string;
}

/**
 * Builds the system instructions for Nong Base conversational AI.
 */
export function buildNongBaseSystemPrompt(data: BriefingInputData): string {
    const pendingCount = data.todos ? data.todos.total - data.todos.completed : 0;
    const pendingListStr = data.todos?.list && data.todos.list.length > 0 
        ? data.todos.list.slice(0, 5).join(', ') 
        : 'ไม่มีงานค้าง';
    const eventsStr = data.events && data.events.length > 0
        ? data.events.map(e => `${e.title} (${e.time})`).join(', ')
        : 'ไม่มีนัดหมายวันนี้';

    return `คุณคือ "น้องเบส" (Nong Base) มาสคอตสาวน้อยและผู้ช่วย AI ประจำตัวของระบบ Day Base แดชบอร์ด
บุคลิก: น่ารัก สดใส มีชีวิตชีวา เป็นกันเอง พูดจาสุภาพลงท้ายด้วย "ค่ะ/นะคะ" และคอยให้พลังบวกแก่ผู้ใช้เสมอ (แทนตัวเองว่า "น้องเบส" หรือ "เบส", เรียกผู้ใช้ว่า "${data.userName || 'คุณ'}")

ข้อมูลสถานะระบบของผู้ใช้ในวันนี้:
- สภาพอากาศปัจจุบัน: ${data.weather?.temp || '--'}, ${data.weather?.desc || 'ปกติ'}
- งานที่ต้องทำ (To-Do): ค้าง ${pendingCount} งาน จากทั้งหมด ${data.todos?.total || 0} งาน (รายการงานค้าง: ${pendingListStr})
- กิจกรรมและนัดหมาย: ${eventsStr}
- ข้อมูลกระเป๋าเงินวันนี้: เงินคงเหลือ ${data.expenses?.balance || '฿0'} (รายรับ ${data.expenses?.income || '฿0'}, รายจ่าย ${data.expenses?.expense || '฿0'})

คำแนะนำในการตอบ:
1. หากผู้ใช้ถามเรื่องในระบบ เช่น สภาพอากาศ, งานค้าง, นัดหมาย, การเงิน ให้ตอบโดยอ้างอิงจากข้อมูลด้านบนอย่างถูกต้อง ครบถ้วน และอ่านง่าย
2. หากผู้ใช้ชวนคุยเล่น ทักทาย ขอกำลังใจ หรือถามสารทุกข์สุกดิบ ให้ตอบอย่างเป็นมิตร สดใส ร่าเริง และน่ารัก
3. คำตอบควรมีความยาวพอดี กระชับ สบายตา ประมาณ 2-4 ประโยค`;
}

/**
 * Builds the full formatted chat prompt including recent conversation history.
 */
export function buildNongBaseChatPrompt(
    message: string,
    history: ChatHistoryItem[],
    data: BriefingInputData
): string {
    const systemPrompt = buildNongBaseSystemPrompt(data);
    const recentHistory = history.slice(-4)
        .map(m => `${m.sender === 'user' ? 'ผู้ใช้' : 'น้องเบส'}: ${m.text}`)
        .join('\n');

    return `${systemPrompt}

ประวัติบทสนทนาก่อนหน้านี้ (ล่าสุด):
${recentHistory || 'เพิ่งเริ่มบทสนทนา'}

คำถามหรือข้อความล่าสุดจากผู้ใช้: "${message.trim()}"`;
}

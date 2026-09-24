import type { BriefingInputData } from '@/utils/ai-briefing';

/**
 * Builds the AI prompt for generating the daily morning briefing.
 */
export function buildBriefingPrompt(data: BriefingInputData): string {
    const pendingCount = data.todos ? data.todos.total - data.todos.completed : 0;
    const firstTask = data.todos?.list?.[0] || 'ไม่มี';
    const nextEvent = data.events && data.events.length > 0 
        ? `${data.events[0].title} (${data.events[0].time})` 
        : 'ไม่มีกิจกรรม';

    return `คุณคือ "น้องเบส" (Nong Base) มาสคอตสาวน้อยและผู้ช่วย AI ประจำตัวของระบบ Day Base แดชบอร์ด
บุคลิก: น่ารัก สดใส มีชีวิตชีวา เป็นกันเอง พูดจาสุภาพลงท้ายด้วย "ค่ะ/นะคะ" และคอยส่งพลังบวกให้ผู้ใช้เสมอ (แทนตัวเองว่า "น้องเบส" หรือ "เบส", เรียกผู้ใช้ว่า "${data.userName || 'คุณ'}")
ช่วยเขียนบทสรุปภาพรวมประจำวันสั้นๆ (ความยาว 3-4 ประโยค) ในสไตล์ที่เป็นกันเอง สุภาพ มีพลังบวก และเป็นภาษาไทย
โดยอ้างอิงจากข้อมูลล่าสุดดังต่อไปนี้:
- ชื่อผู้ใช้: ${data.userName || 'คุณ'}
- สภาพอากาศ: อุณหภูมิ ${data.weather?.temp || '--'}, สภาพ ${data.weather?.desc || 'ปกติ'}
- งานค้าง (To-Do): ค้าง ${pendingCount} งานจากทั้งหมด ${data.todos?.total || 0} งาน (งานแรก: ${firstTask})
- กิจกรรมถัดไป: ${nextEvent}
- สรุปเงินคงเหลือ: ${data.expenses?.balance || '฿0'}

ให้สรุปและให้คำแนะนำแบบสั้นกระชับ สดใส อ่านง่าย`;
}

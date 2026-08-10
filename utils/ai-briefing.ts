// ==========================================
// AI DAILY BRIEFING SYNTHESIS ENGINE
// ==========================================

export interface BriefingInputData {
    userName?: string;
    weather?: {
        temp: string;
        desc: string;
        icon?: string;
        precipitationProb?: number;
    };
    todos?: {
        total: number;
        completed: number;
        percent: number;
        list: string[];
    };
    events?: {
        title: string;
        time: string;
    }[];
    expenses?: {
        balance: string;
        income: string;
        expense: string;
    };
    fuel?: {
        brand?: string;
        gas95Price?: string | number;
        dieselPrice?: string | number;
    };
}

export function generateDailyBriefing(data: BriefingInputData): string {
    const name = data.userName || 'คุณ';
    const hour = new Date().getHours();

    // 1. Time-based Greeting
    let greeting = '';
    if (hour >= 5 && hour < 12) {
        greeting = `สวัสดีตอนเช้าครับคุณ ${name} ☀️`;
    } else if (hour >= 12 && hour < 17) {
        greeting = `สวัสดีตอนบ่ายครับคุณ ${name} 🌤️`;
    } else if (hour >= 17 && hour < 21) {
        greeting = `สวัสดีตอนเย็นครับคุณ ${name} 🌙`;
    } else {
        greeting = `สวัสดีช่วงดึกครับคุณ ${name} ✨`;
    }

    const sentences: string[] = [greeting];

    // 2. Weather & Contextual Advice
    if (data.weather && data.weather.temp !== '--°C') {
        const weatherDesc = data.weather.desc;
        const temp = data.weather.temp;
        let weatherSentence = `สภาพอากาศวันนี้ในพื้นที่โป่งน้ำร้อน อุณหภูมิประมาณ ${temp} (${weatherDesc})`;

        // Smart Advice based on weather text or rain probability
        if (weatherDesc.includes('ฝน') || (data.weather.precipitationProb && data.weather.precipitationProb > 40)) {
            weatherSentence += ' — มีโอกาสเกิดฝนตก อย่าลืมพกร่มติดตัวและระมัดระวังการเดินทางนะครับ ☔';
        } else if (weatherDesc.includes('โปร่ง') || weatherDesc.includes('แดด')) {
            weatherSentence += ' — ท้องฟ้าแจ่มใส เหมาะกับการทำกิจกรรมกลางแจ้งครับ 😎';
        } else {
            weatherSentence += ' — สภาพอากาศค่อนข้างปกติครับ';
        }
        sentences.push(weatherSentence);
    } else {
        sentences.push('ระบบกำลังอัปเดตข้อมูลสภาพอากาศล่าสุดให้คุณครับ');
    }

    // 3. To-Do & Task Productivity Summary
    if (data.todos && data.todos.total > 0) {
        const activeCount = data.todos.total - data.todos.completed;
        if (activeCount === 0) {
            sentences.push('🎉 ยอดเยี่ยมมาก! คุณสะสางงานใน To-Do List ครบหมดแล้วทุกรายการครับ');
        } else {
            let taskText = `คุณมีงานค้างอยู่อีก ${activeCount} รายการ (ความคืบหน้าภาพรวม ${data.todos.percent}%)`;
            if (data.todos.list.length > 0) {
                taskText += ` โดยงานสำคัญที่ควรเน้นก่อนคือ "${data.todos.list[0]}"`;
            }
            sentences.push(taskText);
        }
    } else {
        sentences.push('ยังไม่มีรายการงานค้างในระบบ คุณสามารถเพิ่มงานใหม่ได้ในหมวด To-Do List ครับ');
    }

    // 4. Upcoming Calendar Events
    if (data.events && data.events.length > 0) {
        const nextEvent = data.events[0];
        sentences.push(`📅 กิจกรรมถัดไปของคุณคือ "${nextEvent.title}" (${nextEvent.time})`);
    }

    // 5. Financial Overview
    if (data.expenses && data.expenses.balance !== '฿0') {
        sentences.push(`💰 สรุปภาพรวมกระเป๋าเงิน ยอดเงินคงเหลือสุทธิเดือนนี้อยู่ที่ ${data.expenses.balance}`);
    }

    // 6. Motivational Closing
    const closings = [
        'ขอให้วันนี้เป็นวันที่ราบรื่นและเต็มไปด้วยพลังบวกครับ! 🚀',
        'ลุยงานวันนี้ด้วยความมั่นใจครับ! 💪',
        'รักษาสุขภาพและพักผ่อนให้เพียงพอนะครับ 🌟'
    ];
    const randomClosing = closings[Math.floor(Math.random() * closings.length)];
    sentences.push(randomClosing);

    return sentences.join(' ');
}

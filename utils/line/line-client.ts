import crypto from 'crypto';
import type { LineMessage, LineFlexBubble, LineQuickReply } from '@/types/line';

const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

/**
 * Validate LINE Webhook request signature
 */
export function validateLineSignature(
    body: string,
    signature: string | null,
    channelSecret: string
): boolean {
    if (!signature || !channelSecret) return false;

    const secret = channelSecret.trim();
    const hash = crypto
        .createHmac('sha256', secret)
        .update(Buffer.from(body, 'utf-8'))
        .digest('base64');

    return hash === signature;
}

/**
 * Send reply message via LINE Messaging API
 */
export async function replyLineMessage(
    replyToken: string,
    messages: LineMessage[]
): Promise<boolean> {
    const accessToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL__ACCESS_TOKEN)?.trim();
    if (!accessToken) {
        console.error('[LINE Client] LINE_CHANNEL_ACCESS_TOKEN is not configured in environment');
        return false;
    }

    try {
        console.log('[LINE Client] Sending reply to LINE with token:', replyToken.slice(0, 8) + '...');
        const response = await fetch(LINE_REPLY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                replyToken,
                messages: messages.slice(0, 5), // LINE supports max 5 messages per reply
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[LINE Client] Reply failed with status:', response.status, errorText);
            return false;
        }

        console.log('[LINE Client] Reply sent successfully!');
        return true;
    } catch (err) {
        console.error('[LINE Client] Network error replying:', err);
        return false;
    }
}

// ==========================================
// QUICK REPLIES
// ==========================================
export const DEFAULT_QUICK_REPLY: LineQuickReply = {
    items: [
        {
            type: 'action',
            action: {
                type: 'message',
                label: '📋 ดูงานทั้งหมด',
                text: 'วันนี้มีงานอะไรต้องทำบ้าง',
            },
        },
        {
            type: 'action',
            action: {
                type: 'message',
                label: '☀️ สภาพอากาศ',
                text: 'สภาพอากาศวันนี้เป็นอย่างไร',
            },
        },
        {
            type: 'action',
            action: {
                type: 'message',
                label: '📊 สรุปยอดเงิน',
                text: 'สรุปการเงินวันนี้',
            },
        },
        {
            type: 'action',
            action: {
                type: 'message',
                label: '💡 วิธีใช้งาน',
                text: 'ช่วยอะไรได้บ้าง',
            },
        },
    ],
};

// ==========================================
// FLEX MESSAGE GENERATORS
// ==========================================

/**
 * Flex message when a Todo item is added
 */
export function createTodoAddedFlex(todo: {
    title: string;
    priority?: string;
    dueDate?: string | null;
}): LineFlexBubble {
    const priorityColor =
        todo.priority === 'high' ? '#EF4444' : todo.priority === 'medium' ? '#F59E0B' : '#10B981';
    const priorityText =
        todo.priority === 'high' ? 'ด่วนมาก 🔥' : todo.priority === 'medium' ? 'ปานกลาง ⚡' : 'ทั่วไป 🌸';

    return {
        type: 'bubble',
        size: 'mega',
        header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#0F172A',
            paddingAll: '16px',
            contents: [
                {
                    type: 'text',
                    text: '✨ จดงานให้เรียบร้อยแล้วค่าา 📝',
                    weight: 'bold',
                    size: 'md',
                    color: '#38BDF8',
                },
            ],
        },
        body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            backgroundColor: '#1E293B',
            paddingAll: '16px',
            contents: [
                {
                    type: 'text',
                    text: todo.title,
                    weight: 'bold',
                    size: 'lg',
                    color: '#FFFFFF',
                    wrap: true,
                },
                {
                    type: 'separator',
                    color: '#334155',
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'text',
                            text: 'ความสำคัญ:',
                            size: 'sm',
                            color: '#94A3B8',
                            flex: 2,
                        },
                        {
                            type: 'text',
                            text: priorityText,
                            size: 'sm',
                            color: priorityColor,
                            weight: 'bold',
                            flex: 3,
                        },
                    ],
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'text',
                            text: 'กำหนดส่ง:',
                            size: 'sm',
                            color: '#94A3B8',
                            flex: 2,
                        },
                        {
                            type: 'text',
                            text: todo.dueDate || 'ไม่มีกำหนด',
                            size: 'sm',
                            color: '#F8FAFC',
                            flex: 3,
                        },
                    ],
                },
            ],
        },
    };
}

/**
 * Flex message showing the Todo list
 */
export function createTodoListFlex(
    todos: Array<{ id: string; title: string; completed: boolean; priority: string; due_date: string | null }>
): LineFlexBubble {
    if (todos.length === 0) {
        return {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#0F172A',
                paddingAll: '16px',
                contents: [
                    {
                        type: 'text',
                        text: '📋 รายการสิ่งที่ต้องทำ ✨',
                        weight: 'bold',
                        size: 'md',
                        color: '#38BDF8',
                    },
                ],
            },
            body: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#1E293B',
                paddingAll: '20px',
                contents: [
                    {
                        type: 'text',
                        text: '🎉 ว้าว! ไม่มีงานค้างเลยค่า พักผ่อนให้สบายใจเลยน้า 💖',
                        color: '#94A3B8',
                        size: 'sm',
                        wrap: true,
                        align: 'center',
                    },
                ],
            },
        };
    }

    const todoItems = todos.slice(0, 8).map((todo, idx) => {
        const icon = todo.completed ? '☑️' : '⬜';
        const priorityBadge =
            todo.priority === 'high' ? ' 🔴' : todo.priority === 'medium' ? ' 🟡' : '';

        return {
            type: 'box' as const,
            layout: 'horizontal' as const,
            spacing: 'sm',
            margin: 'md',
            contents: [
                {
                    type: 'text' as const,
                    text: `${idx + 1}.`,
                    size: 'sm' as const,
                    color: '#64748B',
                    flex: 1,
                },
                {
                    type: 'text' as const,
                    text: `${icon} ${todo.title}${priorityBadge}`,
                    size: 'sm' as const,
                    color: todo.completed ? '#64748B' : '#F1F5F9',
                    decoration: (todo.completed ? 'line-through' : 'none') as 'none' | 'line-through',
                    wrap: true,
                    flex: 8,
                },
            ],
        };
    });

    return {
        type: 'bubble',
        size: 'mega',
        header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#0F172A',
            paddingAll: '16px',
            contents: [
                {
                    type: 'text',
                    text: `📋 รายการงาน (${todos.filter(t => !t.completed).length} งานที่ต้องทำ) ✨`,
                    weight: 'bold',
                    size: 'md',
                    color: '#38BDF8',
                },
            ],
        },
        body: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#1E293B',
            paddingAll: '16px',
            contents: [
                ...todoItems,
                ...(todos.length > 8
                    ? [
                          {
                              type: 'text' as const,
                              text: `...และอีก ${todos.length - 8} รายการบนเว็บ Dashboard น้า 💖`,
                              size: 'xs' as const,
                              color: '#94A3B8',
                              margin: 'lg' as const,
                              align: 'center' as const,
                          },
                      ]
                    : []),
            ],
        },
    };
}

/**
 * Flex message when an expense/income is added
 */
export function createExpenseAddedFlex(expense: {
    type: 'expense' | 'income';
    amount: number;
    category?: string;
    note?: string;
}): LineFlexBubble {
    const isExpense = expense.type === 'expense';
    const titleText = isExpense ? '💸 จดรายจ่ายให้แล้วน้า ✨' : '💰 เย้! จดรายรับให้แล้วค่า ✨';
    const headerColor = isExpense ? '#EF4444' : '#10B981';
    const formattedAmount = `฿${expense.amount.toLocaleString('th-TH')}`;

    return {
        type: 'bubble',
        size: 'mega',
        header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#0F172A',
            paddingAll: '16px',
            contents: [
                {
                    type: 'text',
                    text: titleText,
                    weight: 'bold',
                    size: 'md',
                    color: headerColor,
                },
            ],
        },
        body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            backgroundColor: '#1E293B',
            paddingAll: '16px',
            contents: [
                {
                    type: 'text',
                    text: formattedAmount,
                    weight: 'bold',
                    size: '3xl',
                    color: headerColor,
                    align: 'center',
                },
                {
                    type: 'separator',
                    color: '#334155',
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'text',
                            text: 'หมวดหมู่:',
                            size: 'sm',
                            color: '#94A3B8',
                            flex: 2,
                        },
                        {
                            type: 'text',
                            text: expense.category || 'ทั่วไป',
                            size: 'sm',
                            color: '#F8FAFC',
                            flex: 3,
                        },
                    ],
                },
                ...(expense.note
                    ? [
                          {
                              type: 'box' as const,
                              layout: 'horizontal' as const,
                              contents: [
                                  {
                                      type: 'text' as const,
                                      text: 'โน้ต:',
                                      size: 'sm' as const,
                                      color: '#94A3B8',
                                      flex: 2,
                                  },
                                  {
                                      type: 'text' as const,
                                      text: expense.note,
                                      size: 'sm' as const,
                                      color: '#F8FAFC',
                                      flex: 3,
                                  },
                              ],
                          },
                      ]
                    : []),
            ],
        },
    };
}

/**
 * Help message flex card
 */
export function createHelpFlex(): LineFlexBubble {
    return {
        type: 'bubble',
        size: 'mega',
        header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#0F172A',
            paddingAll: '16px',
            contents: [
                {
                    type: 'text',
                    text: '✨ หนูน้องผู้ช่วย AI WeatherTodo 🎀',
                    weight: 'bold',
                    size: 'md',
                    color: '#38BDF8',
                },
            ],
        },
        body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            backgroundColor: '#1E293B',
            paddingAll: '16px',
            contents: [
                {
                    type: 'text',
                    text: 'ตัวเองพิมพ์บอกสิ่งที่ต้องการได้เลยน้า เช่น:',
                    size: 'sm',
                    color: '#E2E8F0',
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    spacing: 'xs',
                    contents: [
                        {
                            type: 'text',
                            text: '📝 • "เตือนซื้อของเข้าบ้าน พรุ่งนี้"',
                            size: 'xs',
                            color: '#94A3B8',
                        },
                        {
                            type: 'text',
                            text: '📝 • "เพิ่มงาน ส่งรายงาน ด่วนมาก"',
                            size: 'xs',
                            color: '#94A3B8',
                        },
                        {
                            type: 'text',
                            text: '📋 • "วันนี้มีงานอะไรต้องทำบ้าง"',
                            size: 'xs',
                            color: '#94A3B8',
                        },
                        {
                            type: 'text',
                            text: '💸 • "กินข้าวกะเพราไป 60 บาท"',
                            size: 'xs',
                            color: '#94A3B8',
                        },
                        {
                            type: 'text',
                            text: '💰 • "รับเงินเดือน 30,000"',
                            size: 'xs',
                            color: '#94A3B8',
                        },
                        {
                            type: 'text',
                            text: '☀️ • "สภาพอากาศวันนี้เป็นไง"',
                            size: 'xs',
                            color: '#94A3B8',
                        },
                        {
                            type: 'text',
                            text: '🔗 • "ผูกบัญชี email@gmail.com"',
                            size: 'xs',
                            color: '#94A3B8',
                        },
                    ],
                },
            ],
        },
    };
}

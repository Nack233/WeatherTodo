'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BriefingInputData } from '@/utils/ai-briefing';
import { chatWithNongBase } from '@/app/actions/ai-actions';

export interface ChatMessage {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    time: string;
}

interface UseMascotChatOptions {
    data: BriefingInputData;
    activeTab: 'briefing' | 'chat';
    onShowToast?: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export function useMascotChat({ data, activeTab, onShowToast }: UseMascotChatOptions) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState<string>('');
    const [isChatSending, setIsChatSending] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Initialize first bot greeting in chat
    useEffect(() => {
        if (messages.length === 0) {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const userName = data.userName || 'คุณ';
            setMessages([
                {
                    id: 'init-1',
                    sender: 'bot',
                    text: `สวัสดีค่าคุณ ${userName}! น้องเบสมาแล้ววว ✨ วันนี้มีอะไรอยากให้เบสช่วยดูไหมคะ ถามเรื่องงาน อากาศ ปฏิทิน กระเป๋าเงิน หรือคุยเล่นกับเบสก็ได้น้า ยินดีตอบเสมอค่า 💖`,
                    time: timeStr,
                },
            ]);
        }
    }, [messages.length, data.userName]);

    // Auto-scroll chat to bottom
    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'chat') {
            scrollToBottom();
        }
    }, [messages, isChatSending, activeTab, scrollToBottom]);

    // Send Chat Message
    const handleSendMessage = async (textToSend?: string) => {
        const query = (textToSend || inputMessage).trim();
        if (!query || isChatSending) return;

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const userMsg: ChatMessage = {
            id: `usr-${Date.now()}`,
            sender: 'user',
            text: query,
            time: timeStr,
        };

        const updatedHistory = [...messages, userMsg];
        setMessages(updatedHistory);
        setInputMessage('');
        setIsChatSending(true);

        try {
            const apiHistory = updatedHistory.map((m) => ({ sender: m.sender, text: m.text }));
            const res = await chatWithNongBase(query, apiHistory, data);

            const botNow = new Date();
            const botTimeStr = `${String(botNow.getHours()).padStart(2, '0')}:${String(botNow.getMinutes()).padStart(2, '0')}`;

            const botMsg: ChatMessage = {
                id: `bot-${Date.now()}`,
                sender: 'bot',
                text: res.reply,
                time: botTimeStr,
            };
            setMessages((prev) => [...prev, botMsg]);
        } catch {
            const botNow = new Date();
            const botTimeStr = `${String(botNow.getHours()).padStart(2, '0')}:${String(botNow.getMinutes()).padStart(2, '0')}`;
            setMessages((prev) => [
                ...prev,
                {
                    id: `bot-${Date.now()}`,
                    sender: 'bot',
                    text: 'ขออภัยนะคะคุณ พอดีระบบติดขัดเล็กน้อย แต่น้องเบสพร้อมช่วยเหลือเสมอ ลองถามใหม่อีกครั้งได้เลยน้า 💕',
                    time: botTimeStr,
                },
            ]);
        } finally {
            setIsChatSending(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    // Clear chat history
    const handleClearChat = () => {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setMessages([
            {
                id: 'init-fresh',
                sender: 'bot',
                text: `เริ่มบทสนทนาใหม่แล้วค่าคุณ ${data.userName || 'คุณ'}! มีอะไรอยากให้น้องเบสช่วยดูแล ถามมาได้เลยนะคะ ✨`,
                time: timeStr,
            },
        ]);
        if (onShowToast) onShowToast('ล้างประวัติการสนทนาแล้ว', 'info');
    };

    return {
        messages,
        inputMessage,
        setInputMessage,
        isChatSending,
        messagesEndRef,
        inputRef,
        handleSendMessage,
        handleClearChat,
    };
}

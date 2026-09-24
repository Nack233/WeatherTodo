'use client';

import React from 'react';
import Image from 'next/image';
import { Send, Copy, Check, Volume2, VolumeX, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/hooks/use-mascot-chat';

export const QUICK_PROMPTS = [
    { label: '🌤️ อากาศวันนี้เป็นไง?', query: 'วันนี้สภาพอากาศเป็นยังไงบ้าง ฝนจะตกไหม?' },
    { label: '📋 มีงานอะไรค้างบ้าง?', query: 'ช่วยสรุปงานค้างที่ต้องทำในระบบให้หน่อย' },
    { label: '📅 วันนี้มีนัดหมายไหม?', query: 'วันนี้มีนัดหมายหรือกิจกรรมอะไรในปฏิทินบ้าง?' },
    { label: '💰 สรุปกระเป๋าเงินวันนี้', query: 'สรุปการเงินวันนี้ให้หน่อย มีเงินเหลือเท่าไหร่?' },
    { label: '💖 ขอกำลังใจหน่อย', query: 'วันนี้น้องเบสช่วยให้กำลังใจหน่อยได้ไหม เหนื่อยนิดหน่อย' },
    { label: '✨ เล่าอะไรสนุกๆ หน่อย', query: 'น้องเบสมีเรื่องน่ารักๆ หรือเกร็ดความรู้มาเล่าให้ฟังไหม' },
];

interface MascotChatViewProps {
    messages: ChatMessage[];
    inputMessage: string;
    setInputMessage: (msg: string) => void;
    isChatSending: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    inputRef: React.RefObject<HTMLInputElement | null>;
    handleSendMessage: (text?: string) => Promise<void>;
    handleCopy: (text: string, msgId?: string) => Promise<void>;
    handleToggleSpeech: (text: string) => Promise<void>;
    copiedMessageId: string | null;
    isSpeaking: boolean;
    speakingText: string | null;
    isLoadingAudio: boolean;
}

export function MascotChatView({
    messages,
    inputMessage,
    setInputMessage,
    isChatSending,
    messagesEndRef,
    inputRef,
    handleSendMessage,
    handleCopy,
    handleToggleSpeech,
    copiedMessageId,
    isSpeaking,
    speakingText,
    isLoadingAudio,
}: MascotChatViewProps) {
    return (
        <div className="mascot-chat-view">
            {/* Message Stream */}
            <div className="mascot-chat-messages">
                {messages.map((m) => (
                    <div key={m.id} className={`mascot-message-row ${m.sender}`}>
                        {m.sender === 'bot' && (
                            <div className="mascot-mini-avatar" title="น้องเบส">
                                <Image 
                                    src="/mascottran.png" 
                                    alt="น้องเบส" 
                                    width={26} 
                                    height={26} 
                                />
                            </div>
                        )}

                        <div className="mascot-bubble-wrap">
                            <div className={`mascot-bubble ${m.sender}`}>
                                {m.text}
                            </div>

                            <div className="mascot-bubble-footer">
                                <span>{m.time}</span>
                                {m.sender === 'bot' && (
                                    <>
                                        <button 
                                            type="button"
                                            className="mascot-bubble-action-btn"
                                            onClick={() => void handleCopy(m.text, m.id)}
                                            title="คัดลอกข้อความ"
                                        >
                                            {copiedMessageId === m.id ? <Check size={12} className="text-green" /> : <Copy size={12} />}
                                        </button>
                                        <button 
                                            type="button"
                                            className="mascot-bubble-action-btn"
                                            onClick={() => void handleToggleSpeech(m.text)}
                                            disabled={isLoadingAudio && speakingText === m.text}
                                            title={
                                                isLoadingAudio && speakingText === m.text
                                                    ? 'กำลังสร้างเสียง...'
                                                    : isSpeaking && speakingText === m.text
                                                    ? 'หยุดอ่าน'
                                                    : 'อ่านออกเสียง (ElevenLabs)'
                                            }
                                        >
                                            {isLoadingAudio && speakingText === m.text ? (
                                                <Loader2 size={12} className="animate-spin text-purple" />
                                            ) : isSpeaking && speakingText === m.text ? (
                                                <VolumeX size={12} className="text-purple" />
                                            ) : (
                                                <Volume2 size={12} />
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {isChatSending && (
                    <div className="mascot-message-row bot">
                        <div className="mascot-mini-avatar">
                            <Image 
                                src="/mascottran.png" 
                                alt="น้องเบส" 
                                width={26} 
                                height={26} 
                            />
                        </div>
                        <div className="mascot-typing-box">
                            <span>น้องเบสกำลังคิด</span>
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="mascot-quick-chips">
                {QUICK_PROMPTS.map((qp, idx) => (
                    <button 
                        key={idx}
                        type="button"
                        className="mascot-quick-chip"
                        onClick={() => void handleSendMessage(qp.query)}
                        disabled={isChatSending}
                    >
                        {qp.label}
                    </button>
                ))}
            </div>

            {/* 21st.dev Floating Input Bar */}
            <form 
                className="mascot-input-bar"
                onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendMessage();
                }}
            >
                <input 
                    ref={inputRef}
                    type="text"
                    className="mascot-input-field"
                    placeholder="ถามเรื่องงาน อากาศ การเงิน หรือชวนน้องเบสคุยเล่น..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isChatSending}
                />
                
                <div className="mascot-input-actions">
                    <button 
                        type="submit"
                        className="mascot-send-btn"
                        disabled={!inputMessage.trim() || isChatSending}
                        title="ส่งข้อความหาน้องเบส"
                    >
                        <Send size={16} style={{ transform: 'translateX(1px)' }} />
                    </button>
                </div>
            </form>
        </div>
    );
}

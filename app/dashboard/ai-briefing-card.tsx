'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { 
    RefreshCw, 
    Volume2, 
    VolumeX, 
    Copy, 
    Check, 
    ChevronDown, 
    ChevronUp, 
    Bot, 
    Send, 
    Sparkles, 
    MessageSquare, 
    SunMedium, 
    RotateCcw,
    Loader2
} from 'lucide-react';
import { BriefingInputData, generateDailyBriefing } from '@/utils/ai-briefing';
import { fetchAiBriefing, chatWithNongBase } from '@/app/actions/ai-actions';

interface AiBriefingCardProps {
    data: BriefingInputData;
    onShowToast?: (msg: string, type: 'success' | 'info' | 'error') => void;
}

interface ChatMessage {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    time: string;
}

const QUICK_PROMPTS = [
    { label: '🌤️ อากาศวันนี้เป็นไง?', query: 'วันนี้สภาพอากาศเป็นยังไงบ้าง ฝนจะตกไหม?' },
    { label: '📋 มีงานอะไรค้างบ้าง?', query: 'ช่วยสรุปงานค้างที่ต้องทำในระบบให้หน่อย' },
    { label: '📅 วันนี้มีนัดหมายไหม?', query: 'วันนี้มีนัดหมายหรือกิจกรรมอะไรในปฏิทินบ้าง?' },
    { label: '💰 สรุปกระเป๋าเงินวันนี้', query: 'สรุปการเงินวันนี้ให้หน่อย มีเงินเหลือเท่าไหร่?' },
    { label: '💖 ขอกำลังใจหน่อย', query: 'วันนี้น้องเบสช่วยให้กำลังใจหน่อยได้ไหม เหนื่อยนิดหน่อย' },
    { label: '✨ เล่าอะไรสนุกๆ หน่อย', query: 'น้องเบสมีเรื่องน่ารักๆ หรือเกร็ดความรู้มาเล่าให้ฟังไหม' }
];

export default function AiBriefingCard({ data, onShowToast }: AiBriefingCardProps) {
    const [activeTab, setActiveTab] = useState<'briefing' | 'chat'>('briefing');
    const [briefingText, setBriefingText] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    
    // Audio / Speech State (ElevenLabs AI Voice + Web Speech fallback)
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    const [speakingText, setSpeakingText] = useState<string | null>(null);
    const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
    const [isElevenLabsVoice, setIsElevenLabsVoice] = useState<boolean>(false);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const audioCacheRef = useRef<Map<string, string>>(new Map());

    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
    const [sourceTag, setSourceTag] = useState<'gemini' | 'openrouter' | 'synthesis'>('synthesis');

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState<string>('');
    const [isChatSending, setIsChatSending] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Initial Daily Briefing Generation
    const generateBriefing = useCallback(async (forceFresh = false) => {
        setIsGenerating(true);
        try {
            const res = await fetchAiBriefing(data);
            setBriefingText(res.text);
            setSourceTag(res.source);
            if (forceFresh && onShowToast) {
                onShowToast('อัปเดตบทสรุปน้องเบสเรียบร้อยแล้ว', 'success');
            }
        } catch {
            const fallbackText = generateDailyBriefing(data);
            setBriefingText(fallbackText);
            setSourceTag('synthesis');
        } finally {
            setIsGenerating(false);
        }
    }, [data, onShowToast]);

    // Initial mount briefing fetch
    useEffect(() => {
        if (!briefingText) {
            void generateBriefing();
        }
    }, [generateBriefing, briefingText]);

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
                    time: timeStr
                }
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

    // Clean up audio object URLs on unmount
    useEffect(() => {
        const audioMap = audioCacheRef.current;
        return () => {
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            audioMap.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    // Fallback Browser Speech Synthesis
    const fallbackToBrowserSpeech = useCallback((textToSpeak: string) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            setIsSpeaking(false);
            setSpeakingText(null);
            setIsLoadingAudio(false);
            if (onShowToast) onShowToast('เบราว์เซอร์ไม่รองรับระบบเสียงพูด', 'error');
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'th-TH';
        utterance.rate = 1.0;
        utterance.pitch = 1.05;

        // Select female Thai voice if available
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find((v) => 
            v.lang.startsWith('th') && (v.name.includes('Premwadee') || v.name.includes('Female') || v.name.includes('Google') || v.name.includes('หญิง'))
        );
        const thaiVoice = femaleVoice || voices.find((v) => v.lang.startsWith('th'));
        if (thaiVoice) {
            utterance.voice = thaiVoice;
        }

        utterance.onstart = () => {
            setIsSpeaking(true);
            setSpeakingText(textToSpeak);
            setIsLoadingAudio(false);
            setIsElevenLabsVoice(false);
        };
        utterance.onend = () => {
            setIsSpeaking(false);
            setSpeakingText(null);
        };
        utterance.onerror = () => {
            setIsSpeaking(false);
            setSpeakingText(null);
            setIsLoadingAudio(false);
        };

        window.speechSynthesis.speak(utterance);
    }, [onShowToast]);

    // ElevenLabs AI Voice + Fallback Player
    const handleToggleSpeech = async (textToSpeak: string) => {
        if (!textToSpeak) return;

        // If currently speaking this exact text, toggle to stop
        if ((isSpeaking || isLoadingAudio) && speakingText === textToSpeak) {
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            setIsSpeaking(false);
            setSpeakingText(null);
            setIsLoadingAudio(false);
            return;
        }

        // Stop any currently playing audio or speech
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        setSpeakingText(textToSpeak);
        setIsLoadingAudio(true);

        // 1. Check client-side Audio cache first
        const cachedUrl = audioCacheRef.current.get(textToSpeak);
        if (cachedUrl) {
            const audio = new Audio();
            currentAudioRef.current = audio;
            audio.onplay = () => {
                setIsSpeaking(true);
                setIsLoadingAudio(false);
                setIsElevenLabsVoice(true);
            };
            audio.onended = () => {
                setIsSpeaking(false);
                setSpeakingText(null);
                currentAudioRef.current = null;
            };
            audio.onerror = () => {
                audioCacheRef.current.delete(textToSpeak);
                fallbackToBrowserSpeech(textToSpeak);
            };
            
            try {
                audio.src = cachedUrl;
                await audio.play();
                return;
            } catch {
                audioCacheRef.current.delete(textToSpeak);
                fallbackToBrowserSpeech(textToSpeak);
                return;
            }
        }

        // 2. Fetch ElevenLabs Audio from /api/tts
        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToSpeak }),
            });

            if (res.ok && res.headers.get('content-type')?.includes('audio/mpeg')) {
                const blob = await res.blob();
                const audioUrl = URL.createObjectURL(blob);
                audioCacheRef.current.set(textToSpeak, audioUrl);

                const audio = new Audio();
                currentAudioRef.current = audio;

                audio.onplay = () => {
                    setIsSpeaking(true);
                    setIsLoadingAudio(false);
                    setIsElevenLabsVoice(true);
                };
                audio.onended = () => {
                    setIsSpeaking(false);
                    setSpeakingText(null);
                    currentAudioRef.current = null;
                };
                audio.onerror = () => {
                    audioCacheRef.current.delete(textToSpeak);
                    fallbackToBrowserSpeech(textToSpeak);
                };

                audio.src = audioUrl;
                await audio.play();
            } else {
                const errJson = await res.json().catch(() => ({}));
                console.warn('[TTS API Warning] Falling back to browser speech:', errJson);
                fallbackToBrowserSpeech(textToSpeak);
            }
        } catch (err) {
            console.error('[TTS Fetch Error]', err);
            fallbackToBrowserSpeech(textToSpeak);
        }
    };

    // Copy to Clipboard
    const handleCopy = async (text: string, msgId?: string) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            if (msgId) {
                setCopiedMessageId(msgId);
                setTimeout(() => setCopiedMessageId(null), 2000);
            } else {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }
            if (onShowToast) onShowToast('คัดลอกข้อความเรียบร้อยแล้ว', 'success');
        } catch {
            if (onShowToast) onShowToast('คัดลอกไม่สำเร็จ', 'error');
        }
    };

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
            time: timeStr
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
                time: botTimeStr
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
                    time: botTimeStr
                }
            ]);
        } finally {
            setIsChatSending(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    // Quick prompt click handler
    const handleQuickPromptClick = (query: string) => {
        setActiveTab('chat');
        setIsCollapsed(false);
        void handleSendMessage(query);
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
                time: timeStr
            }
        ]);
        if (onShowToast) onShowToast('ล้างประวัติการสนทนาแล้ว', 'info');
    };

    return (
        <div className="card ai-briefing-card">
            {/* Header */}
            <div className="ai-briefing-header">
                {/* Mascot Avatar & Title */}
                <div className="ai-briefing-title">
                    <div className="mascot-avatar-wrapper" title="น้องเบส (Nong Base)">
                        <div className="mascot-avatar-inner">
                            <Image 
                                src="/mascottran.png" 
                                alt="น้องเบส Mascot" 
                                width={44} 
                                height={44} 
                                className="mascot-avatar-img"
                                priority
                            />
                        </div>
                        <span className="mascot-status-dot" title="ออนไลน์พร้อมคุย" />
                    </div>

                    <div className="ai-title-text">
                        <h3>
                            น้องเบส
                            <span className="mascot-badge-online">ออนไลน์พร้อมคุย ✨</span>
                            {isSpeaking && isElevenLabsVoice && (
                                <span 
                                    style={{ 
                                        fontSize: '0.65rem', 
                                        padding: '0.1rem 0.45rem', 
                                        borderRadius: '999px', 
                                        background: 'rgba(236, 72, 153, 0.15)', 
                                        color: '#f472b6', 
                                        border: '1px solid rgba(236, 72, 153, 0.3)', 
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.2rem'
                                    }}
                                >
                                    🎙️ ElevenLabs AI
                                </span>
                            )}
                        </h3>
                        <span className="ai-subtitle">
                            {sourceTag === 'gemini' 
                                ? 'ผู้ช่วย AI ประจำตัว (Gemini) · ระบบ Day Base' 
                                : sourceTag === 'openrouter' 
                                ? 'ผู้ช่วย AI ประจำตัว (MiniMax M3) · ระบบ Day Base' 
                                : 'สรุปข้อมูลภาพรวม & แชทอัจฉริยะ'}
                        </span>
                    </div>
                </div>

                {/* 21st.dev Segmented Pill Tabs */}
                <div className="mascot-tab-nav">
                    <button 
                        type="button"
                        className={`mascot-tab-btn ${activeTab === 'briefing' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('briefing');
                            setIsCollapsed(false);
                        }}
                    >
                        <SunMedium size={14} />
                        <span>สรุปประจำวัน</span>
                    </button>

                    <button 
                        type="button"
                        className={`mascot-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('chat');
                            setIsCollapsed(false);
                            setTimeout(() => inputRef.current?.focus(), 150);
                        }}
                    >
                        <MessageSquare size={14} />
                        <span>คุยกับน้องเบส</span>
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="ai-briefing-actions">
                    {activeTab === 'briefing' && (
                        <>
                            <button 
                                type="button"
                                className={`ai-action-btn ${isSpeaking && speakingText === briefingText ? 'active' : ''}`}
                                onClick={() => void handleToggleSpeech(briefingText)}
                                disabled={isLoadingAudio && speakingText === briefingText}
                                title={
                                    isLoadingAudio && speakingText === briefingText
                                        ? 'กำลังสร้างเสียงสังเคราะห์ ElevenLabs...'
                                        : isSpeaking && speakingText === briefingText
                                        ? 'หยุดอ่านเสียง'
                                        : 'ฟังเสียงน้องเบสอ่านสรุป (ElevenLabs Voice)'
                                }
                            >
                                {isLoadingAudio && speakingText === briefingText ? (
                                    <Loader2 size={16} className="animate-spin text-purple" />
                                ) : isSpeaking && speakingText === briefingText ? (
                                    <VolumeX size={16} />
                                ) : (
                                    <Volume2 size={16} />
                                )}
                            </button>

                            <button 
                                type="button"
                                className="ai-action-btn"
                                onClick={() => void handleCopy(briefingText)}
                                title="คัดลอกข้อความสรุป"
                            >
                                {isCopied ? <Check size={16} className="text-green" /> : <Copy size={16} />}
                            </button>

                            <button 
                                type="button"
                                className={`ai-action-btn ${isGenerating ? 'spinning' : ''}`}
                                onClick={() => void generateBriefing(true)}
                                disabled={isGenerating}
                                title="สร้างบทสรุปใหม่"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </>
                    )}

                    {activeTab === 'chat' && messages.length > 1 && (
                        <button 
                            type="button"
                            className="ai-action-btn"
                            onClick={handleClearChat}
                            title="ล้างประวัติการสนทนา"
                        >
                            <RotateCcw size={15} />
                        </button>
                    )}

                    <button 
                        type="button"
                        className="ai-action-btn"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? 'ขยายกล่องข้อความ' : 'ย่อกล่องข้อความ'}
                    >
                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                </div>
            </div>

            {/* Card Body */}
            {!isCollapsed && (
                <>
                    {/* View 1: Daily Briefing Mode */}
                    {activeTab === 'briefing' && (
                        <div className="ai-briefing-body">
                            {isGenerating ? (
                                <div className="ai-loading-state">
                                    <Bot className="bot-pulse" size={22} />
                                    <span>น้องเบสกำลังรวบรวมข้อมูลประจำวันของคุณ...</span>
                                </div>
                            ) : (
                                <>
                                    <p className="ai-briefing-text">{briefingText}</p>
                                    
                                    {/* Quick action chips to jump into chat */}
                                    <div className="mascot-quick-chips">
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginRight: '0.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Sparkles size={12} className="text-purple" /> ถามน้องเบส:
                                        </span>
                                        {QUICK_PROMPTS.slice(0, 4).map((qp, idx) => (
                                            <button 
                                                key={idx}
                                                type="button"
                                                className="mascot-quick-chip"
                                                onClick={() => handleQuickPromptClick(qp.query)}
                                                title={`ถาม: ${qp.query}`}
                                            >
                                                {qp.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* View 2: Interactive Mascot Chat Mode */}
                    {activeTab === 'chat' && (
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
                    )}
                </>
            )}
        </div>
    );
}

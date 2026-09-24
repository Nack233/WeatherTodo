'use client';

import React, { useState } from 'react';
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
    Sparkles, 
    MessageSquare, 
    SunMedium, 
    RotateCcw,
    Loader2
} from 'lucide-react';
import type { BriefingInputData } from '@/utils/ai-briefing';
import { useAiBriefing } from '@/hooks/use-ai-briefing';
import { useMascotChat } from '@/hooks/use-mascot-chat';
import { MascotChatView, QUICK_PROMPTS } from './mascot-chat-view';

interface AiBriefingCardProps {
    data: BriefingInputData;
    onShowToast?: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export default function AiBriefingCard({ data, onShowToast }: AiBriefingCardProps) {
    const [activeTab, setActiveTab] = useState<'briefing' | 'chat'>('briefing');
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

    // AI Briefing & Audio hook
    const {
        briefingText,
        isGenerating,
        sourceTag,
        isSpeaking,
        speakingText,
        isLoadingAudio,
        isElevenLabsVoice,
        isCopied,
        copiedMessageId,
        generateBriefing,
        handleToggleSpeech,
        handleCopy,
    } = useAiBriefing({ data, onShowToast });

    // Nong Base Chat hook
    const {
        messages,
        inputMessage,
        setInputMessage,
        isChatSending,
        messagesEndRef,
        inputRef,
        handleSendMessage,
        handleClearChat,
    } = useMascotChat({ data, activeTab, onShowToast });

    // Quick prompt click handler: jump into chat tab and trigger query
    const handleQuickPromptClick = (query: string) => {
        setActiveTab('chat');
        setIsCollapsed(false);
        void handleSendMessage(query);
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

                {/* Segmented Pill Tabs */}
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
                        <MascotChatView
                            messages={messages}
                            inputMessage={inputMessage}
                            setInputMessage={setInputMessage}
                            isChatSending={isChatSending}
                            messagesEndRef={messagesEndRef}
                            inputRef={inputRef}
                            handleSendMessage={handleSendMessage}
                            handleCopy={handleCopy}
                            handleToggleSpeech={handleToggleSpeech}
                            copiedMessageId={copiedMessageId}
                            isSpeaking={isSpeaking}
                            speakingText={speakingText}
                            isLoadingAudio={isLoadingAudio}
                        />
                    )}
                </>
            )}
        </div>
    );
}

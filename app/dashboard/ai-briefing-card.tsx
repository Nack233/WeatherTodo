'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, Volume2, VolumeX, Copy, Check, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { BriefingInputData, generateDailyBriefing } from '@/utils/ai-briefing';
import { fetchAiBriefing } from '@/app/actions/ai-actions';

interface AiBriefingCardProps {
    data: BriefingInputData;
    onShowToast?: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export default function AiBriefingCard({ data, onShowToast }: AiBriefingCardProps) {
    const [briefingText, setBriefingText] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
    const [sourceTag, setSourceTag] = useState<'gemini' | 'synthesis'>('synthesis');

    const generateBriefing = useCallback(async (forceFresh = false) => {
        setIsGenerating(true);
        try {
            const res = await fetchAiBriefing(data);
            setBriefingText(res.text);
            setSourceTag(res.source);
            if (forceFresh && onShowToast) {
                onShowToast('อัปเดตบทสรุป AI ใหม่เรียบร้อยแล้ว', 'success');
            }
        } catch {
            const fallbackText = generateDailyBriefing(data);
            setBriefingText(fallbackText);
            setSourceTag('synthesis');
        } finally {
            setIsGenerating(false);
        }
    }, [data, onShowToast]);

    // Initial synthesis on mount or data changes
    useEffect(() => {
        if (!briefingText) {
            void generateBriefing();
        }
    }, [generateBriefing, briefingText]);

    // Speech Synthesis (TTS) Toggle
    const handleToggleSpeech = () => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            if (onShowToast) onShowToast('เบราว์เซอร์ของคุณไม่รองรับการอ่านเสียงพูด', 'error');
            return;
        }

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        window.speechSynthesis.cancel(); // Clear any ongoing speech
        const utterance = new SpeechSynthesisUtterance(briefingText);
        utterance.lang = 'th-TH';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    };

    // Copy to Clipboard
    const handleCopy = async () => {
        if (!briefingText) return;
        try {
            await navigator.clipboard.writeText(briefingText);
            setIsCopied(true);
            if (onShowToast) onShowToast('คัดลอกบทสรุปเรียบร้อยแล้ว', 'success');
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            if (onShowToast) onShowToast('คัดลอกไม่สำเร็จ', 'error');
        }
    };

    return (
        <div className="card ai-briefing-card">
            {/* Header */}
            <div className="ai-briefing-header">
                <div className="ai-briefing-title">
                    <div className="ai-badge-icon">
                        <Sparkles className="sparkle-icon" size={18} />
                    </div>
                    <div className="ai-title-text">
                        <h3>AI Daily Briefing</h3>
                        <span className="ai-subtitle">
                            {sourceTag === 'gemini' ? 'ประมวลผลด้วย Gemini AI' : 'สรุปข้อมูลภาพรวมอัจฉริยะ'}
                        </span>
                    </div>
                </div>

                <div className="ai-briefing-actions">
                    <button 
                        className={`ai-action-btn ${isSpeaking ? 'active' : ''}`}
                        onClick={handleToggleSpeech}
                        title={isSpeaking ? 'หยุดอ่านเสียง' : 'ฟังเสียงอ่านภาษาไทย'}
                    >
                        {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>

                    <button 
                        className="ai-action-btn"
                        onClick={handleCopy}
                        title="คัดลอกข้อความสรุป"
                    >
                        {isCopied ? <Check size={16} className="text-green" /> : <Copy size={16} />}
                    </button>

                    <button 
                        className={`ai-action-btn ${isGenerating ? 'spinning' : ''}`}
                        onClick={() => void generateBriefing(true)}
                        disabled={isGenerating}
                        title="สร้างบทสรุปใหม่"
                    >
                        <RefreshCw size={16} />
                    </button>

                    <button 
                        className="ai-action-btn"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? 'ขยายบทสรุป' : 'ย่อบทสรุป'}
                    >
                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                </div>
            </div>

            {/* Body Content */}
            {!isCollapsed && (
                <div className="ai-briefing-body">
                    {isGenerating ? (
                        <div className="ai-loading-state">
                            <Bot className="bot-pulse" size={24} />
                            <span>กำลังประมวลผลบทสรุปประจำวัน...</span>
                        </div>
                    ) : (
                        <p className="ai-briefing-text">{briefingText}</p>
                    )}
                </div>
            )}
        </div>
    );
}

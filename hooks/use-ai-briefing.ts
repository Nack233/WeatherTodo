'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BriefingInputData, generateDailyBriefing } from '@/utils/ai-briefing';
import { fetchAiBriefing } from '@/app/actions/ai-actions';

interface UseAiBriefingOptions {
    data: BriefingInputData;
    onShowToast?: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export function useAiBriefing({ data, onShowToast }: UseAiBriefingOptions) {
    const [briefingText, setBriefingText] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [sourceTag, setSourceTag] = useState<'gemini' | 'openrouter' | 'synthesis'>('synthesis');

    // Audio / Speech State (ElevenLabs AI Voice + Web Speech fallback)
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    const [speakingText, setSpeakingText] = useState<string | null>(null);
    const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
    const [isElevenLabsVoice, setIsElevenLabsVoice] = useState<boolean>(false);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const audioCacheRef = useRef<Map<string, string>>(new Map());

    // Copying state
    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

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

    return {
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
    };
}

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useMascotStatus } from '@/hooks/use-mascot-status';
import { MascotModal } from './MascotModal';
import '@/app/styles/mascot-widget.css';

interface MascotLineWidgetProps {
    userEmail?: string;
    userName?: string;
}

export default function MascotLineWidget({ userEmail = '', userName = 'คุณ' }: MascotLineWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showBubble, setShowBubble] = useState(true);

    const {
        status,
        isLoading,
        copied,
        commandText,
        pairingCode,
        isGeneratingCode,
        checkStatus,
        handleGenerateNewCode,
        handleCopyCommand,
    } = useMascotStatus(userEmail);

    return (
        <>
            {/* FLOATING MASCOT BUTTON (Bottom-Right) */}
            <div className="mascot-floating-container">
                {/* Speech Bubble Tooltip */}
                {showBubble && !isOpen && (
                    <div
                        className="mascot-speech-bubble"
                        onClick={() => {
                            setIsOpen(true);
                            setShowBubble(false);
                        }}
                    >
                        <div className="bubble-content">
                            <span className="bubble-icon">✨</span>
                            <span className="bubble-text">
                                {status?.isLinked ? 'คุยกับฉันใน LINE ได้นะ!' : 'เชื่อมต่อ LINE Bot กับฉันสิ!'}
                            </span>
                        </div>
                        <button
                            className="bubble-close-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowBubble(false);
                            }}
                            title="ปิด"
                        >
                            <X size={12} />
                        </button>
                        <div className="bubble-arrow" />
                    </div>
                )}

                {/* Main Floating Mascot Button */}
                <button
                    id="mascot-line-widget-btn"
                    className="mascot-standing-btn"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        setShowBubble(false);
                        if (!isOpen) void checkStatus();
                    }}
                    title="ผู้ช่วย AI LINE Bot"
                >
                    <Image
                        src="/mascottran.png"
                        alt="WeatherTodo Mascot"
                        width={200}
                        height={150}
                        style={{ width: '85px', height: 'auto', display: 'block' }}
                        className="mascot-standing-img"
                        priority
                    />
                </button>
            </div>

            {/* Modal Dialog */}
            <MascotModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                status={status}
                isLoading={isLoading}
                checkStatus={checkStatus}
                userEmail={userEmail}
                commandText={commandText}
                pairingCode={pairingCode}
                isGeneratingCode={isGeneratingCode}
                handleGenerateNewCode={handleGenerateNewCode}
                copied={copied}
                handleCopyCommand={handleCopyCommand}
            />
        </>
    );
}

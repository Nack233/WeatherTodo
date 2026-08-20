'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
    MessageCircle, Copy, Check, X, Sparkles,
    CheckCircle2, AlertCircle, ArrowRight, ShieldCheck,
    ExternalLink, RefreshCw
} from 'lucide-react';
import { getLineAccountStatus, type LineAccountStatus } from '@/app/actions/line-actions';

interface MascotLineWidgetProps {
    userEmail?: string;
    userName?: string;
}

export default function MascotLineWidget({ userEmail = '', userName = 'คุณ' }: MascotLineWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState<LineAccountStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showBubble, setShowBubble] = useState(true);

    const commandText = `ผูกบัญชี ${userEmail}`;

    const checkStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getLineAccountStatus();
            if (res.data) {
                setStatus(res.data);
            }
        } catch {
            // Ignore error
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void checkStatus();
    }, [checkStatus]);

    const handleCopyCommand = async () => {
        try {
            await navigator.clipboard.writeText(commandText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback
        }
    };

    return (
        <>
            {/* ==========================================
                FLOATING MASCOT BUTTON (Bottom-Right)
               ========================================== */}
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

                {/* Main Floating Mascot Button (Standing character without circular frame) */}
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

            {/* ==========================================
                MODAL / POPUP DIALOG
               ========================================== */}
            {isOpen && (
                <div className="mascot-modal-backdrop" onClick={() => setIsOpen(false)}>
                    <div
                        className="mascot-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="mascot-modal-header">
                            <div className="mascot-header-info">
                                <div className="mascot-header-avatar">
                                    <Image
                                        src="/mascottran.png"
                                        alt="Mascot"
                                        width={48}
                                        height={75}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                </div>
                                <div>
                                    <h3 className="mascot-title">ผู้ช่วย AI WeatherBot</h3>
                                    <p className="mascot-subtitle">สั่งงานผ่าน LINE ได้ทุกที่ ทุกเวลา</p>
                                </div>
                            </div>
                            <button
                                className="mascot-close-btn"
                                onClick={() => setIsOpen(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="mascot-modal-body">
                            {/* Connection Status Banner */}
                            <div className={`mascot-status-card ${status?.isLinked ? 'is-connected' : 'not-connected'}`}>
                                <div className="status-icon-area">
                                    {status?.isLinked ? (
                                        <CheckCircle2 size={24} className="text-emerald-400" />
                                    ) : (
                                        <AlertCircle size={24} className="text-amber-400" />
                                    )}
                                </div>
                                <div className="status-text-area">
                                    <div className="status-title">
                                        {status?.isLinked ? 'เชื่อมต่อ LINE สำเร็จแล้ว' : 'ยังไม่ได้เชื่อมต่อกับ LINE'}
                                    </div>
                                    <div className="status-desc">
                                        {status?.isLinked
                                            ? `บัญชีของคุณ (${userEmail}) ผูกกับ LINE Bot เรียบร้อยแล้ว`
                                            : 'ผูกบัญชีเพื่อสั่งเพิ่มงานและบันทึกรายจ่ายผ่าน LINE'}
                                    </div>
                                </div>
                                <button
                                    className="status-refresh-btn"
                                    onClick={checkStatus}
                                    disabled={isLoading}
                                    title="รีเฟรชสถานะ"
                                >
                                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {/* Link Instructions Box (If not linked or for reference) */}
                            <div className="mascot-step-box">
                                <div className="step-title">
                                    <ShieldCheck size={16} className="step-icon" />
                                    <span>วิธีเชื่อมต่อกับ LINE Bot (ทำครั้งเดียว):</span>
                                </div>

                                {/* Step 1: Add Friend via QR */}
                                <div className="step-item-wrapper">
                                    <div className="step-header">
                                        <span className="step-num">1</span>
                                        <span>สแกน QR Code เพื่อเพิ่มเพื่อนใน LINE:</span>
                                    </div>
                                    <div className="qr-card">
                                        <div className="qr-image-wrapper">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src="https://qr-official.line.me/gs/M_388hgqcs_GW.png?oat_content=qr"
                                                alt="LINE Bot QR Code"
                                                className="qr-image"
                                            />
                                        </div>
                                        <div className="qr-details">
                                            <div className="qr-bot-badge">
                                                <span className="line-brand-dot" />
                                                <span>LINE Official Account</span>
                                            </div>
                                            <p className="qr-hint">สแกนด้วยกล้องมือถือ หรือกดปุ่มด้านล่างเพื่อเปิด LINE ทันที</p>
                                            <a
                                                href="https://line.me/R/ti/p/@388hgqcs"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-add-line"
                                            >
                                                <MessageCircle size={15} />
                                                <span>เพิ่มเพื่อนใน LINE</span>
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2: Send Command */}
                                <div className="step-item-wrapper" style={{ marginTop: '12px' }}>
                                    <div className="step-header">
                                        <span className="step-num">2</span>
                                        <span>คัดลอกคำสั่งด้านล่างนี้ไปพิมพ์ส่งในแชท:</span>
                                    </div>

                                    {/* Quick Copy Box */}
                                    <div className="command-copy-container">
                                        <code className="command-code-text">{commandText}</code>
                                        <button
                                            className={`command-copy-btn ${copied ? 'copied' : ''}`}
                                            onClick={handleCopyCommand}
                                        >
                                            {copied ? (
                                                <>
                                                    <Check size={15} />
                                                    <span>คัดลอกแล้ว!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={15} />
                                                    <span>คัดลอก</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Features Showcase */}
                            <div className="mascot-features-section">
                                <h4 className="features-heading">
                                    <Sparkles size={16} /> สิ่งที่คุณทำผ่าน LINE Bot ได้:
                                </h4>
                                <div className="features-grid">
                                    <div className="feature-item">
                                        <span className="feature-emoji">📝</span>
                                        <div>
                                            <strong>สั่งเพิ่ม To-Do</strong>
                                            <p>&quot;เตือนซื้อของเข้าบ้าน พรุ่งนี้ ด่วน&quot;</p>
                                        </div>
                                    </div>
                                    <div className="feature-item">
                                        <span className="feature-emoji">💸</span>
                                        <div>
                                            <strong>บันทึกรายรับ-รายจ่าย</strong>
                                            <p>&quot;กินข้าวไป 65 บาท&quot;</p>
                                        </div>
                                    </div>
                                    <div className="feature-item">
                                        <span className="feature-emoji">📋</span>
                                        <div>
                                            <strong>ดูสิ่งที่ต้องทำ</strong>
                                            <p>&quot;วันนี้มีงานอะไรบ้าง&quot;</p>
                                        </div>
                                    </div>
                                    <div className="feature-item">
                                        <span className="feature-emoji">🌤️</span>
                                        <div>
                                            <strong>เช็กสภาพอากาศ</strong>
                                            <p>&quot;อากาศวันนี้เป็นไง&quot;</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="mascot-modal-footer">
                            <button
                                className="btn-done-link"
                                onClick={() => setIsOpen(false)}
                            >
                                เข้าใจแล้ว
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Component Embedded Styles */}
            <style jsx>{`
                .mascot-floating-container {
                    position: fixed;
                    bottom: 4px;
                    right: 28px;
                    z-index: 990;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    pointer-events: none;
                    animation: mascotBreathe 3.5s ease-in-out infinite;
                }

                @media (max-width: 768px) {
                    .mascot-floating-container {
                        bottom: 74px;
                        right: 14px;
                    }
                }

                /* Speech Bubble */
                .mascot-speech-bubble {
                    pointer-events: auto;
                    position: relative;
                    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95));
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(56, 189, 248, 0.35);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 15px rgba(56, 189, 248, 0.2);
                    border-radius: 16px;
                    padding: 8px 12px 8px 14px;
                    margin-bottom: 4px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    animation: bubbleFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }

                .mascot-speech-bubble:hover {
                    transform: translateY(-2px) scale(1.02);
                    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4), 0 0 20px rgba(56, 189, 248, 0.35);
                }

                .bubble-content {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .bubble-icon {
                    font-size: 14px;
                }

                .bubble-text {
                    font-size: 13px;
                    font-weight: 600;
                    color: #F8FAFC;
                    white-space: nowrap;
                    font-family: inherit;
                }

                .bubble-close-btn {
                    background: transparent;
                    border: none;
                    color: #94A3B8;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2px;
                    border-radius: 50%;
                    margin-left: 4px;
                    transition: color 0.15s;
                }

                .bubble-close-btn:hover {
                    color: #FFFFFF;
                }

                .bubble-arrow {
                    position: absolute;
                    bottom: -6px;
                    right: 36px;
                    width: 12px;
                    height: 6px;
                    background: inherit;
                    clip-path: polygon(0 0, 100% 0, 50% 100%);
                }

                /* Standing Mascot Button (No circle, transparent background) */
                .mascot-standing-btn {
                    pointer-events: auto;
                    background: transparent;
                    border: none;
                    box-shadow: none;
                    padding: 0;
                    margin: 0;
                    cursor: pointer;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    position: relative;
                    outline: none;
                    width: 85px;
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .mascot-standing-img {
                    width: 85px !important;
                    max-width: 85px !important;
                    height: auto !important;
                    aspect-ratio: 287 / 446;
                    object-fit: contain;
                    display: block;
                    filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.45)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease;
                }

                @media (max-width: 768px) {
                    .mascot-standing-btn {
                        width: 70px;
                    }
                    .mascot-standing-img {
                        width: 70px !important;
                        max-width: 70px !important;
                    }
                }

                .mascot-standing-btn:hover .mascot-standing-img {
                    transform: scale(1.08) translateY(-4px) rotate(2deg);
                    filter: drop-shadow(0 14px 20px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 14px rgba(56, 189, 248, 0.55));
                }

                .mascot-standing-btn:active .mascot-standing-img {
                    transform: scale(0.95);
                }

                @keyframes mascotBreathe {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-6px);
                    }
                }

                /* ==========================================
                   MODAL STYLING
                   ========================================== */
                .mascot-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.65);
                    backdrop-filter: blur(8px);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    animation: backdropFade 0.25s ease;
                }

                .mascot-modal-content {
                    background: #0F172A;
                    border: 1px solid rgba(56, 189, 248, 0.25);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(56, 189, 248, 0.15);
                    border-radius: 24px;
                    width: 100%;
                    max-width: 480px;
                    overflow: hidden;
                    animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    color: #F8FAFC;
                }

                .mascot-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 18px 20px;
                    background: #1E293B;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }

                .mascot-header-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .mascot-header-avatar {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: rgba(56, 189, 248, 0.1);
                    border: 1.5px solid rgba(56, 189, 248, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }

                .mascot-title {
                    font-size: 17px;
                    font-weight: 700;
                    color: #F8FAFC;
                    margin: 0;
                }

                .mascot-subtitle {
                    font-size: 12px;
                    color: #94A3B8;
                    margin: 2px 0 0 0;
                }

                .mascot-close-btn {
                    background: rgba(255, 255, 255, 0.06);
                    border: none;
                    color: #94A3B8;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .mascot-close-btn:hover {
                    background: rgba(255, 255, 255, 0.12);
                    color: #FFFFFF;
                }

                .mascot-modal-body {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    max-height: 70vh;
                    overflow-y: auto;
                }

                /* Status Card */
                .mascot-status-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 14px;
                    border-radius: 14px;
                    border: 1px solid;
                }

                .mascot-status-card.is-connected {
                    background: rgba(16, 185, 129, 0.1);
                    border-color: rgba(16, 185, 129, 0.3);
                }

                .mascot-status-card.not-connected {
                    background: rgba(245, 158, 11, 0.1);
                    border-color: rgba(245, 158, 11, 0.3);
                }

                .status-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #F8FAFC;
                }

                .status-desc {
                    font-size: 12px;
                    color: #94A3B8;
                    margin-top: 2px;
                }

                .status-refresh-btn {
                    background: transparent;
                    border: none;
                    color: #94A3B8;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-left: auto;
                    transition: color 0.15s;
                }

                .status-refresh-btn:hover {
                    color: #38BDF8;
                }

                /* Step Box */
                .mascot-step-box {
                    background: #1E293B;
                    border-radius: 16px;
                    padding: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.06);
                }

                .step-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    color: #38BDF8;
                    margin-bottom: 12px;
                }

                .step-item-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .step-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    color: #CBD5E1;
                    font-weight: 500;
                }

                .step-num {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: rgba(56, 189, 248, 0.2);
                    color: #38BDF8;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: 700;
                    flex-shrink: 0;
                }

                /* QR Card */
                .qr-card {
                    background: #0B1120;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 14px;
                    padding: 12px 14px;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .qr-image-wrapper {
                    background: #FFFFFF;
                    padding: 6px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }

                .qr-image {
                    width: 86px;
                    height: 86px;
                    object-fit: contain;
                    display: block;
                }

                .qr-details {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    flex: 1;
                }

                .qr-bot-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #06C755;
                    letter-spacing: 0.3px;
                }

                .line-brand-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #06C755;
                }

                .qr-hint {
                    font-size: 11px;
                    color: #94A3B8;
                    margin: 0;
                    line-height: 1.4;
                }

                .btn-add-line {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: #06C755;
                    color: #FFFFFF;
                    font-size: 12px;
                    font-weight: 600;
                    padding: 6px 12px;
                    border-radius: 8px;
                    text-decoration: none;
                    align-self: flex-start;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 8px rgba(6, 199, 85, 0.3);
                    margin-top: 2px;
                }

                .btn-add-line:hover {
                    background: #05B34C;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 14px rgba(6, 199, 85, 0.45);
                }

                /* Command Copy Box */
                .command-copy-container {
                    display: flex;
                    align-items: center;
                    background: #0B1120;
                    border: 1px dashed rgba(56, 189, 248, 0.4);
                    border-radius: 10px;
                    padding: 6px 8px 6px 12px;
                    gap: 8px;
                }

                .command-code-text {
                    flex: 1;
                    font-family: monospace;
                    font-size: 13px;
                    color: #38BDF8;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .command-copy-btn {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    background: #0284C7;
                    color: #FFFFFF;
                    border: none;
                    border-radius: 8px;
                    padding: 6px 12px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                }

                .command-copy-btn:hover {
                    background: #0369A1;
                }

                .command-copy-btn.copied {
                    background: #10B981;
                }

                /* Features Grid */
                .mascot-features-section {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .features-heading {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #94A3B8;
                    margin: 0;
                }

                .features-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }

                @media (max-width: 480px) {
                    .features-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .feature-item {
                    background: #1E293B;
                    border-radius: 12px;
                    padding: 10px 12px;
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.04);
                }

                .feature-emoji {
                    font-size: 18px;
                    line-height: 1.2;
                }

                .feature-item strong {
                    display: block;
                    font-size: 12px;
                    color: #F1F5F9;
                }

                .feature-item p {
                    margin: 2px 0 0 0;
                    font-size: 11px;
                    color: #64748B;
                }

                /* Footer */
                .mascot-modal-footer {
                    padding: 14px 20px;
                    background: #1E293B;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    display: flex;
                    justify-content: flex-end;
                }

                .btn-done-link {
                    background: linear-gradient(135deg, #0284C7, #0369A1);
                    color: #FFFFFF;
                    border: none;
                    border-radius: 10px;
                    padding: 8px 18px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-done-link:hover {
                    background: #0284C7;
                    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
                }

                /* Animations */
                @keyframes floatAnimation {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-6px);
                    }
                }

                @keyframes bubbleFloat {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-3px);
                    }
                }

                @keyframes bubbleFadeIn {
                    from {
                        opacity: 0;
                        transform: scale(0.8) translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }

                @keyframes pulseDot {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.3);
                        opacity: 0.7;
                    }
                }

                @keyframes backdropFade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes modalSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.96);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </>
    );
}

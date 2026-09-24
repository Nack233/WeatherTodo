'use client';

import React from 'react';
import Image from 'next/image';
import {
    MessageCircle, Copy, Check, X, Sparkles,
    CheckCircle2, AlertCircle, ShieldCheck,
    ExternalLink, RefreshCw
} from 'lucide-react';
import type { LineAccountStatus } from '@/app/actions/line-actions';

interface MascotModalProps {
    isOpen: boolean;
    onClose: () => void;
    status: LineAccountStatus | null;
    isLoading: boolean;
    checkStatus: () => void;
    userEmail: string;
    commandText: string;
    copied: boolean;
    handleCopyCommand: () => void;
}

export function MascotModal({
    isOpen,
    onClose,
    status,
    isLoading,
    checkStatus,
    userEmail,
    commandText,
    copied,
    handleCopyCommand,
}: MascotModalProps) {
    if (!isOpen) return null;

    return (
        <div className="mascot-modal-backdrop" onClick={onClose}>
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
                        onClick={onClose}
                        title="ปิดหน้าต่าง"
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

                    {/* Link Instructions Box */}
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
                        onClick={onClose}
                    >
                        เข้าใจแล้ว
                    </button>
                </div>
            </div>
        </div>
    );
}

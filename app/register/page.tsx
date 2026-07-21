'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../providers';
import { LayoutDashboard, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
    const { user, register, isLoading } = useAuth();
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (!isLoading && user) {
            router.replace('/dashboard');
        }
    }, [user, isLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (password !== confirmPassword) {
            setErrorMsg('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
            return;
        }

        if (password.length < 6) {
            setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร (ตามข้อกำหนดของ Supabase)');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await register(email, name, password);
            if (result.success) {
                setSuccessMsg('สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี หรือเข้าสู่ระบบได้เลยหากปิด Confirm Email ใน Supabase');
            } else {
                // Translate common Supabase error messages to Thai
                const errMap: Record<string, string> = {
                    'User already registered': 'อีเมลนี้ถูกสมัครสมาชิกแล้ว กรุณาใช้อีเมลอื่น',
                    'Password should be at least 6 characters': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
                };
                setErrorMsg(errMap[result.error ?? ''] ?? result.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่');
            }
        } catch {
            setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading || user) {
        return (
            <div className="auth-container">
                <p style={{ color: 'var(--text-secondary)' }}>กำลังโหลด...</p>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="card auth-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        <LayoutDashboard />
                        <span>Chanthaburi</span>
                    </div>
                    <p>สมัครสมาชิกเพื่อเข้าใช้งานระบบแดชบอร์ด</p>
                </div>

                {errorMsg && (
                    <div className="alert-message error">
                        <AlertCircle size={16} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="alert-message success">
                        <CheckCircle2 size={16} />
                        <span>{successMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">ชื่อผู้แสดง / ชื่อเล่น</label>
                        <input
                            type="text"
                            id="name"
                            placeholder="เช่น นายสะตอน, พี่โหน่ง..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">อีเมล</label>
                        <input
                            type="email"
                            id="email"
                            placeholder="example@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">รหัสผ่าน</label>
                        <input
                            type="password"
                            id="password"
                            placeholder="อย่างน้อย 6 ตัวอักษร..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">ยืนยันรหัสผ่านอีกครั้ง</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            placeholder="พิมพ์รหัสผ่านเดิมอีกครั้ง..."
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        style={{ marginTop: '1.5rem' }}
                        disabled={isSubmitting}
                    >
                        <UserPlus size={18} />
                        {isSubmitting ? 'กำลังดำเนินการ...' : 'สมัครสมาชิก'}
                    </button>
                </form>

                <div className="auth-footer-link">
                    <span>มีบัญชีสมาชิกอยู่แล้ว? </span>
                    <Link href="/login">เข้าสู่ระบบได้ที่นี่</Link>
                </div>
            </div>
        </div>
    );
}

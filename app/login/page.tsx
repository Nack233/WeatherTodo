'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../providers';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { LayoutDashboard, LogIn, AlertCircle } from 'lucide-react';

function LoginForm() {
    const { user, login, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Read error query param if redirected from OAuth callback failure
    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam) {
            if (errorParam === 'oauth_failed' || errorParam === 'oauth_callback_failed' || errorParam === 'oauth_error') {
                setErrorMsg('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google กรุณาลองใหม่อีกครั้ง');
            } else {
                setErrorMsg('เกิดข้อผิดพลาดในการยืนยันตัวตน กรุณาลองใหม่อีกครั้ง');
            }
        }
    }, [searchParams]);

    // Redirect if already logged in
    useEffect(() => {
        if (!isLoading && user) {
            router.replace('/dashboard');
        }
    }, [user, isLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setIsSubmitting(true);

        try {
            const success = await login(email, password);
            if (success) {
                router.replace('/dashboard');
            } else {
                setErrorMsg('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
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
                        <span>Personal Dashboard</span>
                    </div>
                    <p>ระบบแดชบอร์ดสภาพอากาศและเครื่องมือช่วยเหลือ</p>
                </div>

                {errorMsg && (
                    <div className="alert-message error">
                        <AlertCircle size={16} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Google Sign-in Option */}
                <GoogleAuthButton
                    mode="login"
                    disabled={isSubmitting}
                    onError={(err) => setErrorMsg(err)}
                />

                <div className="auth-divider">
                    <span>หรือใช้อีเมล</span>
                </div>

                <form onSubmit={handleSubmit}>
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
                            placeholder="พิมพ์รหัสผ่านของคุณ..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        style={{ marginTop: '1.5rem' }}
                        disabled={isSubmitting}
                    >
                        <LogIn size={18} />
                        {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                    </button>
                </form>

                <div className="auth-footer-link">
                    <span>ยังไม่มีบัญชีใช่ไหม? </span>
                    <Link href="/register">สมัครสมาชิกใหม่</Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="auth-container">
                <p style={{ color: 'var(--text-secondary)' }}>กำลังโหลด...</p>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}

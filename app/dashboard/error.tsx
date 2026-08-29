'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Dashboard error boundary captured:', error);
    }, [error]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
        }}>
            <div className="card" style={{
                maxWidth: '480px',
                width: '100%',
                textAlign: 'center',
                padding: '2.5rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.25rem',
            }}>
                <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-red)',
                }}>
                    <AlertTriangle size={28} />
                </div>

                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        เกิดข้อผิดพลาดในการแสดงผลแดชบอร์ด
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        ระบบพบข้อผิดพลาดที่ไม่คาดคิด คุณสามารถลองโหลดใหม่อีกครั้งได้
                    </p>
                </div>

                <button
                    onClick={() => reset()}
                    className="btn btn-primary"
                    style={{ marginTop: '0.5rem' }}
                >
                    <RefreshCw size={16} />
                    <span>ลองอีกครั้ง</span>
                </button>
            </div>
        </div>
    );
}

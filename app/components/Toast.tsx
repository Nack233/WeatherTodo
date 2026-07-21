'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

// ==========================================
// TYPES
// ==========================================
export type ToastType = 'success' | 'error';

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

// ==========================================
// CONTEXT
// ==========================================
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ==========================================
// PROVIDER
// ==========================================
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-dismiss after 3.5s
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
    }, []);

    const dismiss = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div className="toast-container" aria-live="polite" aria-atomic="false">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`toast toast-${toast.type}`}
                        role="alert"
                    >
                        <span className="toast-icon">
                            {toast.type === 'success'
                                ? <CheckCircle size={18} />
                                : <XCircle size={18} />
                            }
                        </span>
                        <span className="toast-message">{toast.message}</span>
                        <button
                            className="toast-close"
                            onClick={() => dismiss(toast.id)}
                            aria-label="ปิด"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// ==========================================
// HOOK
// ==========================================
export function useToast(): ToastContextType {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return ctx;
}

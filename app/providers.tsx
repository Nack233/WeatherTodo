'use client';

import React from 'react';
import { AuthProvider, User, useAuth } from './providers/auth-provider';
import { ThemeProvider, useTheme } from './providers/theme-provider';
import { ToastProvider } from '@/app/components/Toast';

export { useAuth, useTheme };
export type { User };
export { AuthProvider } from './providers/auth-provider';
export { ThemeProvider } from './providers/theme-provider';

/**
 * Root Providers component composing ThemeProvider, AuthProvider, and ToastProvider.
 * Decoupled into independent contexts to prevent theme changes from causing auth tree re-renders.
 */
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

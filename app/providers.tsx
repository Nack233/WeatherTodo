'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { ToastProvider } from '@/app/components/Toast';

// ==========================================
// 1. AUTHENTICATION TYPES & CONTEXT
// ==========================================
export interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    register: (email: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==========================================
// 2. THEME TYPES & CONTEXT
// ==========================================
interface ThemeContextType {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper: map Supabase user to our User type
function mapUser(supabaseUser: SupabaseUser): User {
    return {
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        name: supabaseUser.user_metadata?.name ?? supabaseUser.email ?? 'ผู้ใช้งาน',
    };
}

// ==========================================
// 3. COMBINED PROVIDERS COMPONENT
// ==========================================
export function Providers({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    const supabase = createClient();

    // Initialize Auth Session and Theme on Mount
    useEffect(() => {
        // Get current session on mount
        const initSession = async () => {
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            setUser(supabaseUser ? mapUser(supabaseUser) : null);
            setIsLoading(false);
        };
        initSession();

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ? mapUser(session.user) : null);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Theme initialization
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
        const initialTheme = savedTheme || 'dark';
        setTheme(initialTheme);
        document.documentElement.setAttribute('data-theme', initialTheme);
    }, []);

    // Theme toggler implementation
    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        localStorage.setItem('theme', nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
    };

    // Registration implementation (email + name + password → Supabase Auth)
    const register = async (email: string, name: string, password: string): Promise<{ success: boolean; error?: string }> => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name },
            },
        });

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    };

    // Login implementation (email + password → Supabase Auth)
    const login = async (email: string, password: string): Promise<boolean> => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return !error;
    };

    // Logout implementation
    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </AuthContext.Provider>
        </ThemeContext.Provider>
    );
}

// ==========================================
// 4. CUSTOM CONSUMPTION HOOKS
// ==========================================
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

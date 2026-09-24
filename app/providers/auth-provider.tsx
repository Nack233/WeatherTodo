'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';

// ==========================================
// AUTHENTICATION TYPES & CONTEXT
// ==========================================
export interface User {
    id: string;
    email: string;
    name: string;
}

export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    register: (email: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signInWithGoogle: () => Promise<{ error?: string }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper: map Supabase user to our User type
function mapUser(supabaseUser: SupabaseUser): User {
    return {
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        name: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.display_name ?? supabaseUser.user_metadata?.name ?? supabaseUser.email ?? 'ผู้ใช้งาน',
    };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const supabase = useMemo(() => createClient(), []);

    // Initialize Auth Session on Mount
    useEffect(() => {
        const initSession = async () => {
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            setUser(supabaseUser ? mapUser(supabaseUser) : null);
            setIsLoading(false);
        };
        initSession();

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            setUser(session?.user ? mapUser(session.user) : null);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    // Google OAuth implementation
    const signInWithGoogle = async (): Promise<{ error?: string }> => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            return { error: error.message };
        }
        return {};
    };

    // Logout implementation
    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, signInWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

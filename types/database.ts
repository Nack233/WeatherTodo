// ==========================================
// DATABASE TYPES — Supabase Tables
// ==========================================

// -------------------------------------------
// TODOS
// -------------------------------------------
export type Priority = 'low' | 'medium' | 'high';

export interface Todo {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    completed: boolean;
    priority: Priority;
    due_date: string | null;       // ISO date string "YYYY-MM-DD"
    created_at: string;            // ISO datetime string
    updated_at: string;            // ISO datetime string
}

export interface TodoInsert {
    title: string;
    description?: string | null;
    completed?: boolean;
    priority?: Priority;
    due_date?: string | null;
}

export interface TodoUpdate {
    title?: string;
    description?: string | null;
    completed?: boolean;
    priority?: Priority;
    due_date?: string | null;
}

// -------------------------------------------
// EXPENSES & TRACKER
// -------------------------------------------
export type TransactionType = 'income' | 'expense';

export interface Expense {
    id: string;
    user_id: string;
    category: string;
    category_id?: string | null;
    amount: number;
    type: TransactionType;
    note: string | null;
    transaction_date: string;      // ISO date string "YYYY-MM-DD"
    created_at: string;
}

export interface ExpenseInsert {
    category: string;
    amount: number;
    type: TransactionType;
    note?: string | null;
    transaction_date: string;
}

// -------------------------------------------
// CALENDAR EVENTS
// -------------------------------------------
export interface CalendarEvent {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    start_date: string;            // ISO string (e.g., "2026-07-22" or ISO timestamp)
    end_date: string | null;
    all_day: boolean;
    color: string;                 // e.g. "tag-blue", "tag-green", "tag-purple", "tag-red"
    created_at: string;
}

export interface CalendarEventInsert {
    title: string;
    description?: string | null;
    start_date: string;
    end_date?: string | null;
    all_day?: boolean;
    color?: string;
}

// -------------------------------------------
// SETTINGS
// -------------------------------------------
export interface Settings {
    user_id: string;
    theme: 'dark' | 'light';
    default_location: string | null;
    currency: string;
    created_at: string;
}

// -------------------------------------------
// FUEL PRICES
// -------------------------------------------
export interface FuelPrice {
    id: string;
    brand: string;
    fuel_type: string;
    price: number;
    effective_date: string;
    created_at: string | null;
}

export interface FuelPriceInsert {
    brand: string;
    fuel_type: string;
    price: number;
    effective_date?: string;
}

// -------------------------------------------
// GENERIC ACTION RESULT
// -------------------------------------------
export interface ActionResult<T = void> {
    data?: T;
    error?: string;
}

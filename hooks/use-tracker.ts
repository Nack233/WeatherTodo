'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Expense, TransactionType } from '@/types/database';
import {
    getExpenses,
    createExpense,
    deleteExpense,
} from '@/app/actions/tracker-actions';
import type { ToastType } from '@/app/components/Toast';

interface UseTrackerOptions {
    onShowToast?: (msg: string, type: ToastType) => void;
}

export function useTracker({ onShowToast }: UseTrackerOptions = {}) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    // Fetch expenses from Supabase
    const fetchExpenses = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        const result = await getExpenses();
        if (result.error) {
            setFetchError(result.error);
        } else {
            setExpenses(result.data ?? []);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    // Create Expense
    const addExpense = async (params: {
        category: string;
        amount: number;
        type: TransactionType;
        note?: string | null;
        transaction_date: string;
    }) => {
        if (isNaN(params.amount) || params.amount <= 0 || !params.transaction_date) return false;

        const result = await createExpense({
            category: params.category,
            amount: params.amount,
            type: params.type,
            note: params.note?.trim() || null,
            transaction_date: params.transaction_date,
        });

        if (result.error) {
            onShowToast?.(`บันทึกล้มเหลว: ${result.error}`, 'error');
            return false;
        } else if (result.data) {
            setExpenses((prev) => [result.data!, ...prev]);
            onShowToast?.('บันทึกรายการสำเร็จ! 💸', 'success');
            return true;
        }
        return false;
    };

    // Delete Expense
    const deleteExpenseItem = async (id: string) => {
        if (deletingIds.has(id)) return;

        setDeletingIds((prev) => new Set(prev).add(id));
        const result = await deleteExpense(id);

        setDeletingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });

        if (result.error) {
            onShowToast?.(`ลบรายการล้มเหลว: ${result.error}`, 'error');
        } else {
            setExpenses((prev) => prev.filter((item) => item.id !== id));
            onShowToast?.('ลบรายการเรียบร้อยแล้ว', 'info');
        }
    };

    return {
        expenses,
        isLoading,
        fetchError,
        deletingIds,
        fetchExpenses,
        addExpense,
        deleteExpenseItem,
    };
}

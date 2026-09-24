'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Todo, Priority } from '@/types/database';
import {
    getTodos,
    createTodo,
    toggleTodo,
    deleteTodo,
} from '@/app/actions/todo-actions';

import type { ToastType } from '@/app/components/Toast';

interface UseTodosOptions {
    onShowToast?: (msg: string, type: ToastType) => void;
}

export function useTodos({ onShowToast }: UseTodosOptions = {}) {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

    // Fetch todos on mount
    const fetchTodos = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        const result = await getTodos();
        if (result.error) {
            setFetchError(result.error);
        } else {
            setTodos(result.data ?? []);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchTodos();
    }, [fetchTodos]);

    // Create Todo
    const addTodo = async (params: {
        title: string;
        description?: string | null;
        priority: Priority;
        due_date?: string | null;
    }) => {
        if (!params.title.trim()) return false;

        const result = await createTodo({
            title: params.title.trim(),
            description: params.description?.trim() || null,
            priority: params.priority,
            due_date: params.due_date || null,
        });

        if (result.error) {
            onShowToast?.(`เพิ่มงานล้มเหลว: ${result.error}`, 'error');
            return false;
        } else if (result.data) {
            setTodos((prev) => [result.data!, ...prev]);
            onShowToast?.('เพิ่มรายการงานสำเร็จ! ✓', 'success');
            return true;
        }
        return false;
    };

    // Toggle Todo
    const toggleTodoItem = async (todo: Todo) => {
        if (togglingIds.has(todo.id)) return;

        const newCompleted = !todo.completed;

        // Optimistic update
        setTodos((prev) =>
            prev.map((t) => (t.id === todo.id ? { ...t, completed: newCompleted } : t))
        );
        setTogglingIds((prev) => new Set(prev).add(todo.id));

        const result = await toggleTodo(todo.id, newCompleted);

        setTogglingIds((prev) => {
            const next = new Set(prev);
            next.delete(todo.id);
            return next;
        });

        if (result.error) {
            // Revert optimistic update
            setTodos((prev) =>
                prev.map((t) => (t.id === todo.id ? { ...t, completed: todo.completed } : t))
            );
            onShowToast?.(`อัปเดตสถานะล้มเหลว: ${result.error}`, 'error');
        } else {
            onShowToast?.(
                newCompleted ? 'ทำเครื่องหมายเสร็จแล้ว ✓' : 'ย้ายกลับสู่รายการที่ยังทำอยู่',
                'success'
            );
        }
    };

    // Delete Todo
    const deleteTodoItem = async (id: string) => {
        if (deletingIds.has(id)) return;

        setDeletingIds((prev) => new Set(prev).add(id));
        const result = await deleteTodo(id);

        setDeletingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });

        if (result.error) {
            onShowToast?.(`ลบงานล้มเหลว: ${result.error}`, 'error');
        } else {
            setTodos((prev) => prev.filter((t) => t.id !== id));
            onShowToast?.('ลบงานเรียบร้อยแล้ว', 'info');
        }
    };

    return {
        todos,
        isLoading,
        fetchError,
        deletingIds,
        togglingIds,
        fetchTodos,
        addTodo,
        toggleTodoItem,
        deleteTodoItem,
    };
}

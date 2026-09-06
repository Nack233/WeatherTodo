'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Calendar, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/app/components/Toast';
import type { Todo, Priority } from '@/types/database';
import {
    getTodos,
    createTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
} from '@/app/actions/todo-actions';

// ==========================================
// HELPERS
// ==========================================
const PRIORITY_LABELS: Record<Priority, string> = {
    low: 'ต่ำ',
    medium: 'ปานกลาง',
    high: 'สูง',
};

const PRIORITY_CLASS: Record<Priority, string> = {
    low: 'priority-low',
    medium: 'priority-medium',
    high: 'priority-high',
};

const CATEGORIES = ['ทั่วไป', 'งาน', 'การเงิน', 'สุขภาพ', 'ส่วนตัว'] as const;

function getThaiDateLabel(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
}

function isOverdue(todo: Todo): boolean {
    if (todo.completed || !todo.due_date) return false;
    const due = new Date(todo.due_date + 'T00:00:00');
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
}

// ==========================================
// SKELETON LOADER
// ==========================================
function TodoSkeleton() {
    return (
        <ul className="todo-list-items">
            {[1, 2, 3].map(i => (
                <li key={i} className="todo-item todo-skeleton">
                    <div className="skeleton skeleton-checkbox" />
                    <div className="todo-item-info" style={{ flex: 1 }}>
                        <div className="skeleton skeleton-text" style={{ width: `${55 + i * 12}%` }} />
                        <div className="skeleton skeleton-text-sm" style={{ width: '40%', marginTop: '6px' }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function Todo() {
    // --- State ---
    const [todos, setTodos] = useState<Todo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Form
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [dueDate, setDueDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Filter
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

    // Deleting IDs (for per-item loading state)
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

    const { showToast } = useToast();

    // --- Fetch todos on mount ---
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
        setDueDate(new Date().toISOString().split('T')[0]);
    }, [fetchTodos]);

    // --- Create ---
    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setIsSubmitting(true);

        const result = await createTodo({
            title: title.trim(),
            description: description.trim() || null,
            priority,
            due_date: dueDate || null,
        });

        if (result.error) {
            showToast(`เพิ่มงานล้มเหลว: ${result.error}`, 'error');
        } else if (result.data) {
            setTodos(prev => [result.data!, ...prev]);
            showToast('เพิ่มรายการงานสำเร็จ! ✓', 'success');
            // Reset form
            setTitle('');
            setDescription('');
            setPriority('medium');
            setDueDate(new Date().toISOString().split('T')[0]);
            setShowAdvanced(false);
        }

        setIsSubmitting(false);
    };

    // --- Toggle ---
    const handleToggle = async (todo: Todo) => {
        if (togglingIds.has(todo.id)) return;

        const newCompleted = !todo.completed;

        // Optimistic update
        setTodos(prev =>
            prev.map(t => t.id === todo.id ? { ...t, completed: newCompleted } : t)
        );
        setTogglingIds(prev => new Set(prev).add(todo.id));

        const result = await toggleTodo(todo.id, newCompleted);

        setTogglingIds(prev => {
            const next = new Set(prev);
            next.delete(todo.id);
            return next;
        });

        if (result.error) {
            // Revert optimistic update
            setTodos(prev =>
                prev.map(t => t.id === todo.id ? { ...t, completed: todo.completed } : t)
            );
            showToast(`อัปเดตสถานะล้มเหลว: ${result.error}`, 'error');
        } else {
            showToast(
                newCompleted ? 'ทำเครื่องหมายเสร็จแล้ว ✓' : 'ย้ายกลับสู่รายการที่ยังทำอยู่',
                'success'
            );
        }
    };

    // --- Delete ---
    const handleDelete = async (id: string) => {
        if (deletingIds.has(id)) return;

        setDeletingIds(prev => new Set(prev).add(id));

        const result = await deleteTodo(id);

        setDeletingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });

        if (result.error) {
            showToast(`ลบงานล้มเหลว: ${result.error}`, 'error');
        } else {
            setTodos(prev => prev.filter(t => t.id !== id));
            showToast('ลบรายการงานแล้ว', 'success');
        }
    };

    // --- Filtering & sorting ---
    const filteredTodos = todos
        .filter(t => {
            if (filter === 'active') return !t.completed;
            if (filter === 'completed') return t.completed;
            return true;
        })
        .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
            if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
            if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
            return 0;
        });

    const total = todos.length;
    const completedCount = todos.filter(t => t.completed).length;
    const progressPercent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

    return (
        <div className="todo-layout">
            <div className="card glass-effect todo-form-card" style={{ borderRadius: '20px' }}>
                <h3 className="section-title">
                    <span style={{ background: 'linear-gradient(135deg, var(--text-primary), var(--accent-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>
                        เพิ่มรายการงานใหม่
                    </span>
                </h3>
                <form onSubmit={handleAddTask}>
                    <div className="form-group">
                        <label htmlFor="todo-title" style={{ fontSize: '0.85rem', fontWeight: 600 }}>ชื่องาน / กิจกรรม</label>
                        <input
                            type="text"
                            id="todo-title"
                            placeholder="พิมพ์สิ่งที่คุณต้องทำ..."
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            disabled={isSubmitting}
                            style={{ borderRadius: '12px' }}
                        />
                    </div>

                    <button
                        type="button"
                        className="todo-advanced-toggle"
                        onClick={() => setShowAdvanced(v => !v)}
                        style={{ borderRadius: '8px' }}
                    >
                        {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {showAdvanced ? 'ซ่อนรายละเอียดเพิ่มเติม' : 'เพิ่มรายละเอียด (ไม่บังคับ)'}
                    </button>

                    {showAdvanced && (
                        <div className="todo-advanced-fields">
                            <div className="form-group">
                                <label htmlFor="todo-desc" style={{ fontSize: '0.85rem', fontWeight: 600 }}>รายละเอียด</label>
                                <input
                                    type="text"
                                    id="todo-desc"
                                    placeholder="รายละเอียดเพิ่มเติม..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    disabled={isSubmitting}
                                    style={{ borderRadius: '12px' }}
                                />
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label htmlFor="todo-priority" style={{ fontSize: '0.85rem', fontWeight: 600 }}>ความสำคัญ</label>
                                    <select
                                        id="todo-priority"
                                        value={priority}
                                        onChange={e => setPriority(e.target.value as Priority)}
                                        disabled={isSubmitting}
                                        style={{ borderRadius: '12px' }}
                                    >
                                        <option value="low">ต่ำ (Low)</option>
                                        <option value="medium">ปานกลาง (Medium)</option>
                                        <option value="high">สูง (High)</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="todo-due" style={{ fontSize: '0.85rem', fontWeight: 600 }}>กำหนดส่ง</label>
                                    <input
                                        type="date"
                                        id="todo-due"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        disabled={isSubmitting}
                                        style={{ borderRadius: '12px' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={isSubmitting || !title.trim()}
                        style={{ marginTop: '1.25rem', borderRadius: '14px', padding: '0.85rem' }}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="spin" />
                                <span>กำลังบันทึก...</span>
                            </>
                        ) : (
                            <>
                                <Plus size={18} />
                                <span>เพิ่มรายการ</span>
                            </>
                        )}
                    </button>
                </form>
            </div>

            <div className="card glass-effect todo-list-card" style={{ borderRadius: '20px' }}>
                <div className="todo-list-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <h3 className="section-title" style={{ margin: 0 }}>รายการงาน</h3>
                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)', fontWeight: 700 }}>
                            {completedCount}/{total}
                        </span>
                    </div>
                    
                    <div className="segmented-pill-bar">
                        {(['all', 'active', 'completed'] as const).map(f => (
                            <button
                                key={f}
                                className={`segmented-pill-btn ${filter === f ? 'active' : ''}`}
                                onClick={() => setFilter(f)}
                            >
                                {f === 'all' ? 'ทั้งหมด' : f === 'active' ? 'กำลังทำ' : 'เสร็จแล้ว'}
                            </button>
                        ))}
                    </div>
                </div>

                {total > 0 && (
                    <div className="todo-progress-summary" style={{ borderRadius: '14px', background: 'rgba(255, 255, 255, 0.02)' }}>
                        <div className="progress-details">
                            <span style={{ fontWeight: 500 }}>ความคืบหน้าภาพรวม</span>
                            <strong style={{ color: 'var(--accent-purple)' }}>{completedCount}/{total} ({progressPercent}%)</strong>
                        </div>
                        <div className="progress-bar" style={{ height: '8px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.06)' }}>
                            <div className="progress" style={{ width: `${progressPercent}%`, borderRadius: '999px', background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))' }} />
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <TodoSkeleton />
                ) : fetchError ? (
                    <div className="alert-message error" style={{ margin: '1rem 0' }}>
                        <AlertCircle size={16} />
                        <span>{fetchError}</span>
                        <button className="btn" style={{ marginLeft: 'auto' }} onClick={fetchTodos}>ลองอีกครั้ง</button>
                    </div>
                ) : (
                    <ul className="todo-list-items" style={{ gap: '0.85rem' }}>
                        {filteredTodos.length === 0 ? (
                            <li className="empty-state-text" style={{ padding: '2.5rem 0' }}>
                                {filter === 'all' ? 'ยังไม่มีรายการงาน กด "เพิ่มรายการ" เพื่อเริ่มต้น 📝' : 'ไม่มีรายการงานในหมวดหมู่นี้'}
                            </li>
                        ) : (
                            filteredTodos.map(task => {
                                const overdue = isOverdue(task);
                                const isDeleting = deletingIds.has(task.id);
                                const isToggling = togglingIds.has(task.id);
                                return (
                                    <li
                                        key={task.id}
                                        className={`todo-card-interactive priority-${task.priority} ${task.completed ? 'completed' : ''} ${overdue ? 'overdue-item' : ''}`}
                                        style={{ opacity: isDeleting ? 0.5 : 1 }}
                                    >
                                        <div className="todo-item-left">
                                            <label className="checkbox-wrapper">
                                                <input
                                                    type="checkbox"
                                                    checked={task.completed}
                                                    onChange={() => handleToggle(task)}
                                                    disabled={isToggling || isDeleting}
                                                />
                                                <span className="checkmark" />
                                            </label>
                                            <div className="todo-item-info">
                                                <span className="title" style={{ fontWeight: 600 }}>{task.title}</span>
                                                {task.description && (
                                                    <span className="todo-desc" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{task.description}</span>
                                                )}
                                                <div className="todo-meta" style={{ marginTop: '0.35rem' }}>
                                                    <span className={`priority-badge ${PRIORITY_CLASS[task.priority]}`} style={{ borderRadius: '6px' }}>
                                                        {PRIORITY_LABELS[task.priority]}
                                                    </span>
                                                    {task.due_date && (
                                                        <span className={`todo-due ${overdue ? 'overdue' : ''}`}>
                                                            <Calendar size={12} style={{ display: 'inline', marginRight: '2px', verticalAlign: 'middle' }} />
                                                            {getThaiDateLabel(task.due_date)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            className="icon-btn delete-btn"
                                            onClick={() => handleDelete(task.id)}
                                            disabled={isDeleting || isToggling}
                                            title="ลบรายการ"
                                            style={{ borderRadius: '10px' }}
                                        >
                                            {isDeleting
                                                ? <Loader2 size={16} className="spin" />
                                                : <Trash2 size={16} className="text-red" />
                                            }
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
}

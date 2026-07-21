'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/app/components/Toast';
import type { Expense, TransactionType } from '@/types/database';
import {
    getExpenses,
    createExpense,
    deleteExpense,
} from '@/app/actions/tracker-actions';

const CATEGORIES_CONFIG = {
    income: [
        { name: 'เงินเดือน 💰', value: 'เงินเดือน' },
        { name: 'รายได้เสริม 💼', value: 'รายได้เสริม' },
        { name: 'โบนัส 🎁', value: 'โบนัส' },
        { name: 'อื่นๆ 🪙', value: 'อื่นๆ' }
    ],
    expense: [
        { name: 'อาหาร / เครื่องดื่ม 🍔', value: 'อาหาร' },
        { name: 'การเดินทาง / น้ำมัน 🚗', value: 'การเดินทาง' },
        { name: 'สาธารณูปโภค (น้ำ/ไฟ) ⚡', value: 'สาธารณูปโภค' },
        { name: 'ช้อปปิ้ง 🛍️', value: 'ช้อปปิ้ง' },
        { name: 'บันเทิง / พักผ่อน 🎬', value: 'บันเทิง' },
        { name: 'อื่นๆ 💸', value: 'อื่นๆ' }
    ]
};

const CATEGORY_COLORS: Record<string, string> = {
    'อาหาร': '#06b6d4',      // Cyan
    'การเดินทาง': '#a855f7', // Purple
    'สาธารณูปโภค': '#f59e0b',// Yellow
    'ช้อปปิ้ง': '#ec4899',   // Pink
    'บันเทิง': '#3b82f6',   // Blue
    'อื่นๆ': '#64748b'       // Muted Gray
};

export default function Tracker() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Form States
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<TransactionType>('income');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    // Filter States
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

    const { showToast } = useToast();

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
        setDate(new Date().toISOString().split('T')[0]);
    }, [fetchExpenses]);

    // Set default category when type changes
    useEffect(() => {
        const list = CATEGORIES_CONFIG[type];
        if (list && list.length > 0) {
            setCategory(list[0].value);
        }
    }, [type]);

    // Add transaction
    const handleAddTx = async (e: React.FormEvent) => {
        e.preventDefault();
        const amtNum = parseFloat(amount);
        if (!desc.trim() || isNaN(amtNum) || amtNum <= 0 || !date) return;
        setIsSubmitting(true);

        const result = await createExpense({
            note: desc.trim(),
            amount: amtNum,
            type,
            category,
            transaction_date: date,
        });

        if (result.error) {
            showToast(`บันทึกธุรกรรมล้มเหลว: ${result.error}`, 'error');
        } else if (result.data) {
            setExpenses(prev => [result.data!, ...prev]);
            showToast('บันทึกธุรกรรมสำเร็จ! ✓', 'success');
            setDesc('');
            setAmount('');
        }

        setIsSubmitting(false);
    };

    // Delete transaction
    const handleDeleteTx = async (id: string) => {
        if (deletingIds.has(id)) return;

        setDeletingIds(prev => new Set(prev).add(id));

        const result = await deleteExpense(id);

        setDeletingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });

        if (result.error) {
            showToast(`ลบรายการล้มเหลว: ${result.error}`, 'error');
        } else {
            setExpenses(prev => prev.filter(t => t.id !== id));
            showToast('ลบรายการเรียบร้อยแล้ว', 'success');
        }
    };

    // Financial calculations
    let totalIncome = 0;
    let totalExpense = 0;
    expenses.forEach(t => {
        if (t.type === 'income') totalIncome += Number(t.amount);
        else totalExpense += Number(t.amount);
    });
    const netBalance = totalIncome - totalExpense;

    // Filter transaction list
    const filteredTxs = expenses.filter(t => {
        const noteText = t.note || '';
        const matchSearch = noteText.toLowerCase().includes(search.toLowerCase()) ||
            t.category.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'all' || t.type === filterType;
        return matchSearch && matchType;
    });

    // Sort: newest transaction_date first
    filteredTxs.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));

    // Expense categories calculation
    const expenseTotals: Record<string, number> = {};
    CATEGORIES_CONFIG.expense.forEach(c => {
        expenseTotals[c.value] = 0;
    });
    expenses.filter(t => t.type === 'expense').forEach(t => {
        const amt = Number(t.amount);
        if (expenseTotals[t.category] !== undefined) {
            expenseTotals[t.category] += amt;
        } else {
            expenseTotals['อื่นๆ'] = (expenseTotals['อื่นๆ'] || 0) + amt;
        }
    });

    const formatMoney = (val: number) => '฿' + val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatShort = (val: number) => '฿' + val.toLocaleString('th-TH', { maximumFractionDigits: 0 });

    // Donut Segments calculation
    const segments: React.ReactNode[] = [];
    let cumulativePercent = 0;

    Object.entries(expenseTotals).forEach(([cat, amt]) => {
        if (amt > 0 && totalExpense > 0) {
            const color = CATEGORY_COLORS[cat] || '#64748b';
            const circumference = 100;
            const strokeDashValue = (amt / totalExpense) * circumference;
            const strokeDashOffset = circumference - cumulativePercent + 25; // start at top (12 o'clock)

            segments.push(
                <circle
                    key={cat}
                    className="donut-segment"
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke={color}
                    strokeWidth="4"
                    strokeDasharray={`${strokeDashValue} ${circumference - strokeDashValue}`}
                    strokeDashoffset={strokeDashOffset.toString()}
                />
            );
            cumulativePercent += strokeDashValue;
        }
    });

    return (
        <div>
            {/* Finance Dashboard Overview */}
            <div className="finance-stats-grid">
                <div className="card stat-card total-balance-card">
                    <div className="stat-icon-wrapper bg-blue-glow">
                        <Wallet />
                    </div>
                    <div className="stat-info">
                        <span className="label">ยอดเงินคงเหลือสุทธิ</span>
                        <h2 className="amount">{isLoading ? '...' : formatMoney(netBalance)}</h2>
                    </div>
                </div>
                <div className="card stat-card income-card">
                    <div className="stat-icon-wrapper bg-green-glow">
                        <TrendingUp />
                    </div>
                    <div className="stat-info">
                        <span className="label">รายรับทั้งหมด</span>
                        <h2 className="amount text-green">{isLoading ? '...' : formatMoney(totalIncome)}</h2>
                    </div>
                </div>
                <div className="card stat-card expense-card">
                    <div className="stat-icon-wrapper bg-red-glow">
                        <TrendingDown />
                    </div>
                    <div className="stat-info">
                        <span className="label">รายจ่ายทั้งหมด</span>
                        <h2 className="amount text-red">{isLoading ? '...' : formatMoney(totalExpense)}</h2>
                    </div>
                </div>
            </div>

            <div className="tracker-layout">
                {/* Transaction Form */}
                <div className="card transaction-form-card">
                    <h3 className="section-title">บันทึกธุรกรรมใหม่</h3>
                    <form onSubmit={handleAddTx}>
                        <div className="form-row">
                            <div className="form-group flex-2">
                                <label htmlFor="tracker-desc">รายการ / คำอธิบาย</label>
                                <input
                                    type="text"
                                    id="tracker-desc"
                                    placeholder="เช่น ค่าข้าวกลางวัน, เงินเดือน..."
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="form-group flex-1">
                                <label>ประเภท</label>
                                <div className="type-selector">
                                    <div
                                        className={`type-btn income ${type === 'income' ? 'active' : ''}`}
                                        onClick={() => setType('income')}
                                    >
                                        รายรับ
                                    </div>
                                    <div
                                        className={`type-btn expense ${type === 'expense' ? 'active' : ''}`}
                                        onClick={() => setType('expense')}
                                    >
                                        รายจ่าย
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="tracker-amount">จำนวนเงิน (บาท)</label>
                                <input
                                    type="number"
                                    id="tracker-amount"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="tracker-category">หมวดหมู่</label>
                                <select
                                    id="tracker-category"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    disabled={isSubmitting}
                                >
                                    {CATEGORIES_CONFIG[type].map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="tracker-date">วันที่</label>
                                <input
                                    type="date"
                                    id="tracker-date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={isSubmitting || !desc.trim() || !amount}
                        >
                            {isSubmitting
                                ? <><Loader2 size={18} className="spin" /> กำลังบันทึก...</>
                                : <><Plus size={18} /> บันทึกธุรกรรม</>
                            }
                        </button>
                    </form>
                </div>

                {/* Category Chart & Summary */}
                <div className="card chart-card">
                    <h3 className="section-title">สัดส่วนค่าใช้จ่ายตามหมวดหมู่</h3>
                    <div className="chart-content">
                        <div className="chart-visualization">
                            <svg width="150" height="150" viewBox="0 0 42 42" className="donut-chart" id="expense-donut-chart">
                                <circle className="donut-hole" cx="21" cy="21" r="15.915" fill="transparent" />
                                <circle className="donut-ring" cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                                {segments}
                            </svg>
                            <div className="chart-center-text">
                                <span className="label">รายจ่าย</span>
                                <span className="val" style={{ color: 'var(--accent-cyan)' }}>{formatShort(totalExpense)}</span>
                            </div>
                        </div>
                        <div className="chart-legend" style={{ width: '100%' }}>
                            {totalExpense === 0 ? (
                                <div className="empty-state-text">ยังไม่มีประวัติรายจ่ายของหมวดหมู่</div>
                            ) : (
                                Object.entries(expenseTotals).map(([cat, amt]) => {
                                    if (amt === 0) return null;
                                    const color = CATEGORY_COLORS[cat] || '#64748b';
                                    const pct = Math.round((amt / totalExpense) * 100);
                                    return (
                                        <div key={cat} className="legend-item" style={{ marginBottom: '0.4rem' }}>
                                            <div className="legend-label-group">
                                                <span className="legend-color" style={{ backgroundColor: color }} />
                                                <span>{cat}</span>
                                            </div>
                                            <span>{formatShort(amt)} <span className="percentage">({pct}%)</span></span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Transaction List Card */}
                <div className="card transactions-list-card">
                    <div className="list-header">
                        <h3 className="section-title">ประวัติรายการ</h3>
                        <div className="list-filters">
                            <input
                                type="text"
                                id="tracker-search"
                                placeholder="ค้นหารายการ..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <select
                                id="tracker-filter-type"
                                value={filterType}
                                onChange={e => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                            >
                                <option value="all">ทั้งหมด</option>
                                <option value="income">เฉพาะรายรับ</option>
                                <option value="expense">เฉพาะรายจ่าย</option>
                            </select>
                        </div>
                    </div>

                    <div className="table-container">
                        {fetchError ? (
                            <div className="alert-message error" style={{ margin: '1rem' }}>
                                <AlertCircle size={16} />
                                <span>{fetchError}</span>
                            </div>
                        ) : isLoading ? (
                            <div className="empty-state-text" style={{ padding: '3rem 0' }}>
                                กำลังโหลดข้อมูลประวัติรายการ...
                            </div>
                        ) : filteredTxs.length === 0 ? (
                            <div id="tracker-empty-state" className="empty-state-text" style={{ padding: '3rem 0' }}>
                                ไม่มีประวัติการบันทึกรายรับ-รายจ่าย
                            </div>
                        ) : (
                            <table className="transaction-table">
                                <thead>
                                    <tr>
                                        <th>วันที่</th>
                                        <th>รายการ</th>
                                        <th>หมวดหมู่</th>
                                        <th className="text-right">จำนวนเงิน</th>
                                        <th className="text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTxs.map(t => {
                                        const isInc = t.type === 'income';
                                        const dateObj = new Date(t.transaction_date + 'T00:00:00');
                                        const dateLabel = dateObj.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
                                        const isDeleting = deletingIds.has(t.id);

                                        return (
                                            <tr key={t.id} style={{ opacity: isDeleting ? 0.5 : 1 }}>
                                                <td>{dateLabel}</td>
                                                <td><strong>{t.note || t.category}</strong></td>
                                                <td><span className="category-badge">{t.category}</span></td>
                                                <td className={`amount-cell text-right ${isInc ? 'text-green' : 'text-red'}`}>
                                                    {isInc ? '+' : '-'}{formatMoney(Number(t.amount))}
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        className="icon-btn delete-tx-btn"
                                                        onClick={() => handleDeleteTx(t.id)}
                                                        disabled={isDeleting}
                                                        title="ลบรายการ"
                                                    >
                                                        {isDeleting
                                                            ? <Loader2 size={16} className="spin" />
                                                            : <Trash2 size={16} className="text-red" />
                                                        }
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

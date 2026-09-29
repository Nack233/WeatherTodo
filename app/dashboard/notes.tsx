'use client';

import React, { useState } from 'react';
import { useNotes } from '@/hooks/use-notes';
import type { UserNote, NoteCategory, UserNoteInsert } from '@/types/database';
import { chatWithNongBase } from '@/app/actions/ai-actions';
import { 
    BookOpen, Plus, Search, Sparkles, Pin, 
    Trash2, Edit3, Copy, Check, 
    Bot, X, Lightbulb, RefreshCw, Zap
} from 'lucide-react';

const CATEGORIES: { id: string; label: string; icon: string }[] = [
    { id: 'all', label: 'ทั้งหมด', icon: '📁' },
    { id: 'pinned', label: 'ปักหมุด', icon: '📌' },
    { id: 'it_gadget', label: 'อุปกรณ์ & ไอที', icon: '💻' },
    { id: 'personal', label: 'ข้อมูลส่วนตัว', icon: '👤' },
    { id: 'work', label: 'งาน & โปรเจกต์', icon: '💼' },
    { id: 'finance', label: 'การเงิน', icon: '💰' },
    { id: 'general', label: 'ทั่วไป', icon: '📝' },
];

const COLOR_OPTIONS = [
    { id: 'tag-blue', label: 'ฟ้า', color: '#38BDF8' },
    { id: 'tag-purple', label: 'ม่วง', color: '#A855F7' },
    { id: 'tag-emerald', label: 'เขียว', color: '#10B981' },
    { id: 'tag-amber', label: 'ส้ม', color: '#F59E0B' },
    { id: 'tag-rose', label: 'ชมพู', color: '#F43F5E' },
];

const QUICK_PROMPTS = [
    { label: 'สเปกคอมผมอะไรนะ?', icon: '💻' },
    { label: 'ข้อมูลและรหัสสำคัญ', icon: '🔑' },
    { label: 'โปรเจกต์งานที่กำลังทำ', icon: '💼' },
    { label: 'สรุปรายการที่บันทึกไว้', icon: '📝' },
];

export default function NotesTab() {
    const {
        notes,
        stats,
        isLoading,
        isSaving,
        isEnhancing,
        error,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        refreshNotes,
        createNote,
        updateNote,
        deleteNote,
        togglePinNote,
        aiEnhanceNote,
    } = useNotes();

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [modalTitle, setModalTitle] = useState('');
    const [modalContent, setModalContent] = useState('');
    const [modalCategory, setModalCategory] = useState<NoteCategory>('general');
    const [modalTagsInput, setModalTagsInput] = useState('');
    const [modalColor, setModalColor] = useState('tag-blue');
    const [modalKeyFacts, setModalKeyFacts] = useState<Record<string, string>>({});

    // Quick copy indicator
    const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

    // Ask Nong Base Knowledge Bar
    const [askQuery, setAskQuery] = useState('');
    const [isAskingAi, setIsAskingAi] = useState(false);
    const [aiAnswer, setAiAnswer] = useState<string | null>(null);
    const [copiedAnswer, setCopiedAnswer] = useState(false);

    // Open Modal for New Note
    const handleOpenNewModal = () => {
        setEditingNoteId(null);
        setModalTitle('');
        setModalContent('');
        setModalCategory('general');
        setModalTagsInput('');
        setModalColor('tag-blue');
        setModalKeyFacts({});
        setIsModalOpen(true);
    };

    // Open Modal for Edit
    const handleOpenEditModal = (note: UserNote) => {
        setEditingNoteId(note.id);
        setModalTitle(note.title);
        setModalContent(note.content);
        setModalCategory(note.category || 'general');
        setModalTagsInput((note.tags || []).join(', '));
        setModalColor(note.color || 'tag-blue');
        setModalKeyFacts(note.key_facts || {});
        setIsModalOpen(true);
    };

    // Trigger AI Auto-Enhance in Modal
    const handleTriggerAiEnhance = async () => {
        if (!modalContent.trim()) return;
        const enhanced = await aiEnhanceNote(modalContent);
        if (enhanced) {
            setModalTitle(enhanced.title);
            setModalContent(enhanced.content);
            setModalCategory(enhanced.category);
            setModalTagsInput(enhanced.tags.join(', '));
            setModalKeyFacts(enhanced.key_facts || {});
        }
    };

    // Save Note from Modal
    const handleSaveModal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalTitle.trim() || !modalContent.trim()) return;

        const tags = modalTagsInput
            .split(',')
            .map(t => t.trim().replace(/^#/, ''))
            .filter(Boolean);

        const payload: UserNoteInsert = {
            title: modalTitle.trim(),
            content: modalContent.trim(),
            category: modalCategory,
            tags,
            key_facts: modalKeyFacts,
            color: modalColor,
        };

        if (editingNoteId) {
            const success = await updateNote(editingNoteId, payload);
            if (success) setIsModalOpen(false);
        } else {
            const success = await createNote(payload);
            if (success) setIsModalOpen(false);
        }
    };

    // Quick Copy Key-Facts or Content
    const handleQuickCopy = (note: UserNote) => {
        let copyText = '';
        if (note.key_facts && Object.keys(note.key_facts).length > 0) {
            copyText = `[${note.title}]\n` + Object.entries(note.key_facts).map(([k, v]) => `${k}: ${v}`).join('\n');
        } else {
            copyText = `[${note.title}]\n${note.content}`;
        }

        navigator.clipboard.writeText(copyText).then(() => {
            setCopiedNoteId(note.id);
            setTimeout(() => setCopiedNoteId(null), 2000);
        });
    };

    // Copy AI Answer
    const handleCopyAnswer = () => {
        if (!aiAnswer) return;
        navigator.clipboard.writeText(aiAnswer).then(() => {
            setCopiedAnswer(true);
            setTimeout(() => setCopiedAnswer(false), 2000);
        });
    };

    // Ask Nong Base from Knowledge Base
    const handleAskNongBase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!askQuery.trim() || isAskingAi) return;

        setIsAskingAi(true);
        setAiAnswer(null);

        try {
            const result = await chatWithNongBase(
                askQuery,
                [],
                {
                    userName: 'คุณ',
                    notes: notes.map(n => ({
                        title: n.title,
                        content: n.content,
                        tags: n.tags,
                        key_facts: n.key_facts,
                    })),
                }
            );

            if (result && result.reply) {
                setAiAnswer(result.reply);
            } else {
                setAiAnswer('งืออ ขออภัยด้วยน้า ตอนนี้น้องเบสยังหาข้อมูลไม่เจอ ลองถามใหม่อีกครั้งนะคะ ✨');
            }
        } catch (err) {
            console.error('[NotesTab] Ask Nong Base error:', err);
            setAiAnswer('เกิดข้อผิดพลาดในการเชื่อมต่อกับน้องเบส ลองใหม่อีกครั้งนะคะ');
        } finally {
            setIsAskingAi(false);
        }
    };

    return (
        <div className="notes-container">
            {/* 1. Header & Bento Stats Section */}
            <div className="notes-header">
                <div className="notes-title-group">
                    <div className="notes-header-icon">
                        <BookOpen size={24} />
                    </div>
                    <div className="notes-title-text">
                        <h2>
                            สมุดโน้ตและความจำ AI
                            <span className="notes-title-badge">Second Brain</span>
                        </h2>
                        <p>จดบันทึกสเปกคอม, ข้อมูลสำคัญ หรือสิ่งของ เพื่อให้น้องเบสช่วยจำและตอบคำถามได้ตลอด 24 ชม.</p>
                    </div>
                </div>

                <div className="notes-header-right">
                    <div className="notes-header-stats-chips">
                        <span className="notes-stat-chip">
                            📝 บันทึกทั้งหมด: <strong>{stats.total}</strong>
                        </span>
                        <span className="notes-stat-chip">
                            📌 ปักหมุด: <strong>{stats.pinned}</strong>
                        </span>
                    </div>

                    <div className="notes-header-actions">
                        <button 
                            className="btn-header-refresh" 
                            onClick={refreshNotes} 
                            title="รีเฟรชข้อมูล"
                            disabled={isLoading}
                        >
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button className="btn-new-note" onClick={handleOpenNewModal}>
                            <Plus size={18} />
                            <span>จดบันทึกใหม่</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Ask Nong Base Knowledge Bar (21st.dev Bento Command Bar) */}
            <div className="notes-ask-card">
                <div className="notes-ask-glow" />

                <div className="notes-ask-header">
                    <div className="notes-ask-header-title">
                        <Bot size={19} />
                        <span>ถามน้องเบสจากสมุดบันทึกความจำ (AI Knowledge Recall)</span>
                    </div>
                    <div className="notes-ask-header-hint">
                        <Sparkles size={14} />
                        <span>ค้นหาความจำแบบเรียลไทม์</span>
                    </div>
                </div>

                <form onSubmit={handleAskNongBase} className="notes-ask-input-wrap">
                    <div className="notes-input-field-wrapper">
                        <Sparkles size={18} className="notes-ask-input-icon" />
                        <input
                            type="text"
                            className="notes-ask-input"
                            placeholder="ลองถามน้องเบส เช่น &quot;สเปกคอมผมอะไรนะ&quot; หรือ &quot;การ์ดจอผมรุ่นไหน&quot;..."
                            value={askQuery}
                            onChange={e => setAskQuery(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn-ask-ai" disabled={isAskingAi || !askQuery.trim()}>
                        {isAskingAi ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                <span>กำลังค้น...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                <span>ถามน้องเบส</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Quick Suggestion Prompts */}
                <div className="notes-quick-prompts">
                    <span className="notes-prompt-label">💡 ตัวอย่างคำถาม:</span>
                    {QUICK_PROMPTS.map((prompt, idx) => (
                        <button
                            key={idx}
                            type="button"
                            className="notes-prompt-pill"
                            onClick={() => setAskQuery(prompt.label)}
                        >
                            <span>{prompt.icon}</span>
                            <span>{prompt.label}</span>
                        </button>
                    ))}
                </div>

                {aiAnswer && (
                    <div className="notes-ai-answer-box">
                        <div className="notes-ai-answer-top">
                            <span className="notes-ai-badge">
                                <Bot size={14} /> น้องเบสตอบกลับ
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <button
                                    className="btn-card-action"
                                    onClick={handleCopyAnswer}
                                    title={copiedAnswer ? 'คัดลอกแล้ว!' : 'คัดลอกคำตอบ'}
                                >
                                    {copiedAnswer ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
                                </button>
                                <button
                                    className="btn-card-action"
                                    onClick={() => setAiAnswer(null)}
                                    title="ปิดคำตอบ"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        </div>
                        <div className="notes-ai-answer-content">{aiAnswer}</div>
                    </div>
                )}
            </div>

            {/* 3. Controls Bar: Search & Category Pills */}
            <div className="notes-controls-bar">
                <div className="notes-search-wrap">
                    <Search size={18} className="notes-search-icon" />
                    <input
                        type="text"
                        className="notes-search-input"
                        placeholder="ค้นหาบันทึก, สเปก, แฮชแท็ก หรือเนื้อหา..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                            title="ล้างข้อความค้นหา"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="notes-category-pills">
                    {CATEGORIES.map(cat => {
                        const count =
                            cat.id === 'all'
                                ? stats.total
                                : cat.id === 'pinned'
                                ? stats.pinned
                                : cat.id === 'it_gadget'
                                ? stats.itGadget
                                : cat.id === 'personal'
                                ? stats.personal
                                : cat.id === 'work'
                                ? stats.work
                                : cat.id === 'finance'
                                ? stats.finance
                                : undefined;

                        return (
                            <button
                                key={cat.id}
                                className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat.id)}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                                {count !== undefined && count > 0 && (
                                    <span className="category-pill-count">
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '14px', color: '#FCA5A5', fontSize: '0.88rem' }}>
                    {error}
                </div>
            )}

            {/* 4. Notes Grid */}
            {isLoading ? (
                <div className="notes-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div
                            key={i}
                            style={{
                                height: '220px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '20px',
                                animation: 'skeleton-shimmer 1.5s infinite linear',
                            }}
                        />
                    ))}
                </div>
            ) : notes.length === 0 ? (
                <div className="notes-empty-state">
                    <div className="notes-empty-icon">
                        <Lightbulb size={28} />
                    </div>
                    <h3>ยังไม่มีบันทึกในหมวดหมู่นี้</h3>
                    <p>
                        {searchQuery
                            ? `ไม่พบบันทึกที่ตรงกับ "${searchQuery}"`
                            : 'เริ่มต้นจดบันทึกสเปกคอมพิวเตอร์ หรือข้อมูลที่คุณต้องการให้น้องเบสช่วยจำได้เลย!'}
                    </p>
                    <button className="btn-new-note" onClick={handleOpenNewModal}>
                        <Plus size={18} />
                        <span>สร้างบันทึกแรก</span>
                    </button>
                </div>
            ) : (
                <div className="notes-grid">
                    {notes.map(note => {
                        const hasKeyFacts = note.key_facts && Object.keys(note.key_facts).length > 0;
                        const isCopied = copiedNoteId === note.id;

                        return (
                            <div key={note.id} className={`note-card ${note.is_pinned ? 'pinned' : ''}`}>
                                <div className={`note-card-accent-bar ${note.color || 'tag-blue'}`} />

                                <div>
                                    <div className="note-card-header">
                                        <span className="note-category-badge">
                                            {note.category === 'it_gadget' ? '💻 สเปก & ไอที' :
                                             note.category === 'personal' ? '👤 ส่วนตัว' :
                                             note.category === 'work' ? '💼 งาน' :
                                             note.category === 'finance' ? '💰 การเงิน' : '📝 ทั่วไป'}
                                        </span>

                                        <div className="note-card-actions">
                                            <button
                                                className={`btn-card-action ${note.is_pinned ? 'active-pin' : ''}`}
                                                onClick={() => togglePinNote(note.id, note.is_pinned)}
                                                title={note.is_pinned ? 'ยกเลิกปักหมุด' : 'ปักหมุดไว้บนสุด'}
                                            >
                                                <Pin size={16} />
                                            </button>
                                            <button
                                                className="btn-card-action"
                                                onClick={() => handleOpenEditModal(note)}
                                                title="แก้ไขบันทึก"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                className="btn-card-action"
                                                onClick={() => {
                                                    if (confirm(`คุณต้องการลบบันทึก "${note.title}" ใช่หรือไม่?`)) {
                                                        deleteNote(note.id);
                                                    }
                                                }}
                                                title="ลบบันทึก"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="note-card-body" style={{ marginTop: '0.6rem' }}>
                                        <h3>{note.title}</h3>
                                        <div className="note-card-preview">{note.content}</div>

                                        {/* Key-Facts Grid (e.g. CPU, GPU, RAM) */}
                                        {hasKeyFacts && (
                                            <div className="note-facts-grid">
                                                {Object.entries(note.key_facts).slice(0, 6).map(([key, val]) => (
                                                    <div key={key} className="note-fact-item">
                                                        <span className="note-fact-key">{key}:</span>
                                                        <span className="note-fact-val">{String(val)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Tags List */}
                                        {note.tags && note.tags.length > 0 && (
                                            <div className="note-tags-list">
                                                {note.tags.map((tag, idx) => (
                                                    <span key={idx} className="note-tag">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="note-card-footer">
                                    <span>
                                        {new Date(note.updated_at).toLocaleDateString('th-TH', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: '2-digit',
                                        })}
                                    </span>

                                    <button
                                        className={`btn-quick-copy ${isCopied ? 'copied' : ''}`}
                                        onClick={() => handleQuickCopy(note)}
                                        title="คัดลอกข้อมูล/สเปกนี้"
                                    >
                                        {isCopied ? (
                                             <>
                                                <Check size={14} />
                                                <span>คัดลอกแล้ว!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={14} />
                                                <span>{hasKeyFacts ? 'ก็อปปี้สเปก' : 'คัดลอก'}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 5. Create / Edit Note Modal */}
            {isModalOpen && (
                <div className="note-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="note-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="note-modal-header">
                            <h3>{editingNoteId ? '✏️ แก้ไขบันทึกความจำ' : '📝 เพิ่มบันทึกความจำใหม่'}</h3>
                            <button className="btn-card-action" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveModal}>
                            <div className="note-modal-body">
                                <div className="note-form-group">
                                    <label>ชื่อเรื่อง / หัวข้อ</label>
                                    <input
                                        type="text"
                                        className="note-input"
                                        placeholder="เช่น สเปกคอมพิวเตอร์ทำงาน, รหัส Wi-Fi บ้าน"
                                        value={modalTitle}
                                        onChange={e => setModalTitle(e.target.value)}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="note-form-group">
                                        <label>หมวดหมู่</label>
                                        <select
                                            className="note-input"
                                            value={modalCategory}
                                            onChange={e => setModalCategory(e.target.value as NoteCategory)}
                                        >
                                            <option value="it_gadget">💻 อุปกรณ์ & ไอที / สเปก</option>
                                            <option value="personal">👤 ข้อมูลส่วนตัว</option>
                                            <option value="work">💼 งาน & โปรเจกต์</option>
                                            <option value="finance">💰 การเงิน</option>
                                            <option value="general">📝 ทั่วไป</option>
                                        </select>
                                    </div>

                                    <div className="note-form-group">
                                        <label>สีแท็ก</label>
                                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
                                            {COLOR_OPTIONS.map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    style={{
                                                        width: '26px',
                                                        height: '26px',
                                                        borderRadius: '50%',
                                                        backgroundColor: c.color,
                                                        border: modalColor === c.id ? '2px solid #FFFFFF' : '2px solid transparent',
                                                        cursor: 'pointer',
                                                        boxShadow: modalColor === c.id ? `0 0 8px ${c.color}` : 'none',
                                                    }}
                                                    onClick={() => setModalColor(c.id)}
                                                    title={c.label}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="note-form-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label>เนื้อหาบันทึก / สเปก</label>
                                        <button
                                            type="button"
                                            className="btn-ai-enhance"
                                            onClick={handleTriggerAiEnhance}
                                            disabled={isEnhancing || !modalContent.trim()}
                                            title="แปลงข้อความร่าง/สเปกที่พิมพ์สั้นๆ ให้เป็นระเบียบพร้อมสกัดสเปกอัตโนมัติ"
                                        >
                                            {isEnhancing ? (
                                                <>
                                                    <RefreshCw size={14} className="animate-spin" />
                                                    <span>AI กำลังจัดระเบียบ...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={14} />
                                                    <span>✨ AI จัดระเบียบ & สกัดข้อมูล</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <textarea
                                        className="note-textarea"
                                        placeholder="พิมพ์สเปกหรือข้อความได้ตามใจชอบ เช่น:&#10;CPU: Ryzen 5 7600X&#10;GPU: Radeon RX 9060XT&#10;RAM: 32GB DDR5 6000MHz&#10;SSD: 1TB M.2 NVMe"
                                        value={modalContent}
                                        onChange={e => setModalContent(e.target.value)}
                                        rows={5}
                                        required
                                    />
                                </div>

                                {/* Key-Facts Preview / Editor if any extracted */}
                                {Object.keys(modalKeyFacts).length > 0 && (
                                    <div className="note-form-group">
                                        <label style={{ color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Zap size={14} /> ข้อมูลสำคัญที่สกัดได้ (Key-Facts):
                                        </label>
                                        <div className="note-facts-grid" style={{ margin: 0 }}>
                                            {Object.entries(modalKeyFacts).map(([k, v]) => (
                                                <div key={k} className="note-fact-item">
                                                    <span className="note-fact-key">{k}:</span>
                                                    <span className="note-fact-val">{v}</span>
                                                    <button
                                                        type="button"
                                                        style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0 2px' }}
                                                        onClick={() => {
                                                            const copy = { ...modalKeyFacts };
                                                            delete copy[k];
                                                            setModalKeyFacts(copy);
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="note-form-group">
                                    <label>แฮชแท็ก (คั่นด้วยเครื่องหมายจุลภาค , )</label>
                                    <input
                                        type="text"
                                        className="note-input"
                                        placeholder="เช่น คอมพิวเตอร์, สเปก, ryzen, hardware"
                                        value={modalTagsInput}
                                        onChange={e => setModalTagsInput(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="note-modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                                    ยกเลิก
                                </button>
                                <button type="submit" className="btn-submit-note" disabled={isSaving}>
                                    {isSaving ? 'กำลังบันทึก...' : editingNoteId ? 'บันทึกการแก้ไข' : 'สร้างบันทึก'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

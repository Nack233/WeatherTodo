'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserNote, UserNoteInsert, UserNoteUpdate } from '@/types/database';
import {
    getUserNotes,
    createNote,
    updateNote,
    deleteNote,
    togglePinNote,
    aiEnhanceNote,
    type EnhancedNoteData,
} from '@/app/actions/note-actions';

export function useNotes() {
    const [notes, setNotes] = useState<UserNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filtering & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Fetch notes on mount
    const fetchNotes = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getUserNotes();
            if (result.error) {
                setError(result.error);
            } else if (result.data) {
                setNotes(result.data);
            }
        } catch (err) {
            console.error('[useNotes] fetch error:', err);
            setError('เกิดข้อผิดพลาดในการโหลดข้อมูลบันทึก');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    // Add Note
    const handleCreateNote = async (input: UserNoteInsert): Promise<boolean> => {
        setIsSaving(true);
        setError(null);
        try {
            const res = await createNote(input);
            if (res.error || !res.data) {
                setError(res.error || 'ไม่สามารถสร้างบันทึกได้');
                return false;
            }
            setNotes(prev => [res.data as UserNote, ...prev]);
            return true;
        } catch (err) {
            console.error('[useNotes] create error:', err);
            setError('เกิดข้อผิดพลาดในการสร้างบันทึก');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // Update Note
    const handleUpdateNote = async (id: string, input: UserNoteUpdate): Promise<boolean> => {
        setIsSaving(true);
        setError(null);
        try {
            const res = await updateNote(id, input);
            if (res.error || !res.data) {
                setError(res.error || 'ไม่สามารถอัปเดตบันทึกได้');
                return false;
            }
            setNotes(prev => prev.map(n => (n.id === id ? (res.data as UserNote) : n)));
            return true;
        } catch (err) {
            console.error('[useNotes] update error:', err);
            setError('เกิดข้อผิดพลาดในการอัปเดตบันทึก');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    // Delete Note
    const handleDeleteNote = async (id: string): Promise<boolean> => {
        setError(null);
        try {
            const res = await deleteNote(id);
            if (res.error) {
                setError(res.error);
                return false;
            }
            setNotes(prev => prev.filter(n => n.id !== id));
            return true;
        } catch (err) {
            console.error('[useNotes] delete error:', err);
            setError('เกิดข้อผิดพลาดในการลบบันทึก');
            return false;
        }
    };

    // Toggle Pin
    const handleTogglePin = async (id: string, currentPinned: boolean) => {
        const newPinned = !currentPinned;
        // Optimistic UI update
        setNotes(prev =>
            prev.map(n => (n.id === id ? { ...n, is_pinned: newPinned } : n)).sort((a, b) => {
                if (a.is_pinned === b.is_pinned) {
                    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                }
                return a.is_pinned ? -1 : 1;
            })
        );

        try {
            const res = await togglePinNote(id, newPinned);
            if (res.error) {
                // Revert on error
                setNotes(prev => prev.map(n => (n.id === id ? { ...n, is_pinned: currentPinned } : n)));
                setError(res.error);
            }
        } catch (err) {
            console.error('[useNotes] pin toggle error:', err);
            setNotes(prev => prev.map(n => (n.id === id ? { ...n, is_pinned: currentPinned } : n)));
        }
    };

    // AI Format & Enhance
    const handleAiEnhance = async (draft: string): Promise<EnhancedNoteData | null> => {
        setIsEnhancing(true);
        setError(null);
        try {
            const res = await aiEnhanceNote(draft);
            if (res.error || !res.data) {
                setError(res.error || 'AI ไม่สามารถจัดระเบียบข้อมูลได้');
                return null;
            }
            return res.data;
        } catch (err) {
            console.error('[useNotes] aiEnhance error:', err);
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ AI');
            return null;
        } finally {
            setIsEnhancing(false);
        }
    };

    // Filtered Notes
    const filteredNotes = useMemo(() => {
        return notes.filter(note => {
            // Category filter
            if (selectedCategory === 'pinned' && !note.is_pinned) return false;
            if (selectedCategory !== 'all' && selectedCategory !== 'pinned' && note.category !== selectedCategory) {
                return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const titleMatch = note.title.toLowerCase().includes(q);
                const contentMatch = note.content.toLowerCase().includes(q);
                const tagMatch = (note.tags || []).some(t => t.toLowerCase().includes(q));
                const factsMatch = JSON.stringify(note.key_facts || {}).toLowerCase().includes(q);
                return titleMatch || contentMatch || tagMatch || factsMatch;
            }

            return true;
        });
    }, [notes, selectedCategory, searchQuery]);

    // Statistics
    const stats = useMemo(() => {
        return {
            total: notes.length,
            pinned: notes.filter(n => n.is_pinned).length,
            itGadget: notes.filter(n => n.category === 'it_gadget').length,
            personal: notes.filter(n => n.category === 'personal').length,
            work: notes.filter(n => n.category === 'work').length,
            finance: notes.filter(n => n.category === 'finance').length,
        };
    }, [notes]);

    return {
        notes: filteredNotes,
        allNotes: notes,
        stats,
        isLoading,
        isSaving,
        isEnhancing,
        error,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        refreshNotes: fetchNotes,
        createNote: handleCreateNote,
        updateNote: handleUpdateNote,
        deleteNote: handleDeleteNote,
        togglePinNote: handleTogglePin,
        aiEnhanceNote: handleAiEnhance,
    };
}

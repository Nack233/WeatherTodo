'use server';

import { createClient } from '@/utils/supabase/server';
import type { UserNote, UserNoteInsert, UserNoteUpdate, ActionResult, NoteCategory } from '@/types/database';
import { callOpenRouterCompletion, extractJsonFromText } from '@/utils/openrouter';

export interface EnhancedNoteData {
    title: string;
    content: string;
    category: NoteCategory;
    tags: string[];
    key_facts: Record<string, string>;
}

/**
 * Fetch all notes for the authenticated user
 */
export async function getUserNotes(): Promise<ActionResult<UserNote[]>> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ' };
        }

        const { data, error } = await supabase
            .from('user_notes')
            .select('*')
            .eq('user_id', user.id)
            .order('is_pinned', { ascending: false })
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('[Note Actions] Error fetching notes:', error);
            return { error: 'ไม่สามารถโหลดข้อมูลบันทึกได้: ' + error.message };
        }

        return { data: (data || []) as UserNote[] };
    } catch (err) {
        console.error('[Note Actions] Unexpected error in getUserNotes:', err);
        return { error: 'เกิดข้อผิดพลาดในการโหลดบันทึก' };
    }
}

/**
 * Create a new user note
 */
export async function createNote(input: UserNoteInsert): Promise<ActionResult<UserNote>> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ' };
        }

        if (!input.title?.trim() || !input.content?.trim()) {
            return { error: 'กรุณากรอกหัวข้อและเนื้อหาบันทึก' };
        }

        const { data, error } = await supabase
            .from('user_notes')
            .insert({
                user_id: user.id,
                title: input.title.trim(),
                content: input.content.trim(),
                category: input.category || 'general',
                tags: input.tags || [],
                key_facts: input.key_facts || {},
                is_pinned: Boolean(input.is_pinned),
                color: input.color || 'tag-blue',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error || !data) {
            console.error('[Note Actions] Error creating note:', error);
            return { error: 'ไม่สามารถบันทึกข้อมูลได้: ' + (error?.message || 'Unknown error') };
        }

        return { data: data as UserNote };
    } catch (err) {
        console.error('[Note Actions] Unexpected error in createNote:', err);
        return { error: 'เกิดข้อผิดพลาดในการสร้างบันทึก' };
    }
}

/**
 * Update an existing note
 */
export async function updateNote(id: string, input: UserNoteUpdate): Promise<ActionResult<UserNote>> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ' };
        }

        const updatePayload: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (input.title !== undefined) updatePayload.title = input.title.trim();
        if (input.content !== undefined) updatePayload.content = input.content.trim();
        if (input.category !== undefined) updatePayload.category = input.category;
        if (input.tags !== undefined) updatePayload.tags = input.tags;
        if (input.key_facts !== undefined) updatePayload.key_facts = input.key_facts;
        if (input.is_pinned !== undefined) updatePayload.is_pinned = input.is_pinned;
        if (input.color !== undefined) updatePayload.color = input.color;

        const { data, error } = await supabase
            .from('user_notes')
            .update(updatePayload)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error || !data) {
            console.error('[Note Actions] Error updating note:', error);
            return { error: 'ไม่สามารถอัปเดตบันทึกได้: ' + (error?.message || 'Unknown error') };
        }

        return { data: data as UserNote };
    } catch (err) {
        console.error('[Note Actions] Unexpected error in updateNote:', err);
        return { error: 'เกิดข้อผิดพลาดในการอัปเดตบันทึก' };
    }
}

/**
 * Delete a note
 */
export async function deleteNote(id: string): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ' };
        }

        const { error } = await supabase
            .from('user_notes')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error('[Note Actions] Error deleting note:', error);
            return { error: 'ไม่สามารถลบบันทึกได้: ' + error.message };
        }

        return {};
    } catch (err) {
        console.error('[Note Actions] Unexpected error in deleteNote:', err);
        return { error: 'เกิดข้อผิดพลาดในการลบบันทึก' };
    }
}

/**
 * Toggle pinned status for a note
 */
export async function togglePinNote(id: string, isPinned: boolean): Promise<ActionResult<UserNote>> {
    return updateNote(id, { is_pinned: isPinned });
}

/**
 * AI Magic: Enhance raw notes into structured format with title, markdown content, tags, and key-facts
 */
export async function aiEnhanceNote(rawDraft: string): Promise<ActionResult<EnhancedNoteData>> {
    try {
        const text = rawDraft.trim();
        if (!text) {
            return { error: 'กรุณากรอกข้อความเพื่อส่งให้ AI จัดระเบียบ' };
        }

        const systemPrompt = `คุณคือผู้ช่วย AI อัจฉริยะสำหรับจัดการและจัดระเบียบสมุดโน้ตส่วนตัว (Smart Knowledge & Memory)
หน้าที่ของคุณ:
1. รับข้อความร่าง/สเปก/บันทึกย่อจากผู้ใช้
2. สกัดและจัดระเบียบข้อมูลให้เรียบร้อย น่าอ่าน กระชับ สวยงามในรูปแบบ Markdown
3. กำหนดชื่อหัวข้อ (title) ที่ตรงประเด็น ชัดเจน
4. จำแนกหมวดหมู่ (category) เลือกระหว่าง: "it_gadget" (อุปกรณ์/คอม/มือถือ/ฮาร์ดแวร์), "personal" (ข้อมูลส่วนตัว/ไซส์/สุขภาพ), "work" (งาน/โปรเจกต์), "finance" (การเงิน/บัญชี), "general" (ทั่วไป)
5. สกัดแท็ก (tags) สั้นๆ 2-5 คำสำคัญภาษาไทย/อังกฤษ เช่น ["คอมพิวเตอร์", "สเปก", "ฮาร์ดแวร์", "ryzen", "9060xt"]
6. สกัด Key-Facts (key_facts) ที่เป็นคู่ Key-Value ชัดเจน เพื่อให้ดึงไปตอบหรือก็อปปี้สเปกได้ง่าย เช่น:
   {"CPU": "Ryzen 5 7600X", "GPU": "Radeon RX 9060XT", "RAM": "32GB DDR5 6000MHz", "SSD": "1TB M.2 NVMe", "Power Supply": "750W 80+ Gold"}

ส่งออกผลลัพธ์เป็น JSON Object ONLY โครงสร้างดังนี้:
{
  "title": "string",
  "content": "string (Markdown formatted note)",
  "category": "it_gadget" | "personal" | "work" | "finance" | "general",
  "tags": ["tag1", "tag2"],
  "key_facts": { "Key": "Value" }
}`;

        // 1. Try Gemini
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            try {
                const response = await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': geminiKey,
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [
                                        { text: systemPrompt },
                                        { text: `ข้อความของผู้ใช้:\n${text}` },
                                    ],
                                },
                            ],
                            generationConfig: {
                                temperature: 0.2,
                                responseMimeType: 'application/json',
                            },
                        }),
                    }
                );

                if (response.ok) {
                    const resData = await response.json();
                    const rawJson = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (rawJson) {
                        const parsed = extractJsonFromText<EnhancedNoteData>(rawJson);
                        if (parsed && parsed.title && parsed.content) {
                            return { data: parsed };
                        }
                    }
                }
            } catch (geminiErr) {
                console.warn('[Note Actions] Gemini enhancement failed, trying fallback...', geminiErr);
            }
        }

        // 2. Fallback to OpenRouter
        try {
            const rawJson = await callOpenRouterCompletion([
                { role: 'system', content: `${systemPrompt}\n\nส่งออกคำตอบเป็น JSON ONLY เท่านั้น` },
                { role: 'user', content: `ข้อความของผู้ใช้:\n${text}` },
            ], {
                temperature: 0.2,
                responseFormat: { type: 'json_object' },
            });

            if (rawJson) {
                const parsed = extractJsonFromText<EnhancedNoteData>(rawJson);
                if (parsed && parsed.title && parsed.content) {
                    return { data: parsed };
                }
            }
        } catch (openRouterErr) {
            console.warn('[Note Actions] OpenRouter enhancement failed, falling back to heuristic...', openRouterErr);
        }

        // 3. Fallback Heuristic
        const lines = text.split('\n').filter(Boolean);
        const firstLine = lines[0] || 'บันทึกใหม่';
        const isIt = /(cpu|gpu|ram|ssd|ryzen|geforce|intel|spec|สเปก|คอม|การ์ดจอ)/i.test(text);

        return {
            data: {
                title: firstLine.slice(0, 40),
                content: text,
                category: isIt ? 'it_gadget' : 'general',
                tags: isIt ? ['คอมพิวเตอร์', 'สเปก'] : ['บันทึก'],
                key_facts: {},
            },
        };
    } catch (err) {
        console.error('[Note Actions] Unexpected error in aiEnhanceNote:', err);
        return { error: 'ไม่สามารถจัดระเบียบข้อมูลด้วย AI ได้ในขณะนี้' };
    }
}

/**
 * Retrieve notes relevant to user query for AI context
 */
export async function searchNotesForUser(query: string, limit = 5): Promise<UserNote[]> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const cleanQ = query.trim().toLowerCase();
        const { data } = await supabase
            .from('user_notes')
            .select('*')
            .eq('user_id', user.id)
            .order('is_pinned', { ascending: false })
            .order('updated_at', { ascending: false })
            .limit(25);

        if (!data || data.length === 0) return [];

        // Rank by keyword matches
        const scored = data.map((note) => {
            let score = 0;
            const titleLow = note.title.toLowerCase();
            const contentLow = note.content.toLowerCase();
            const tagsLow = (note.tags || []).join(' ').toLowerCase();
            const factsLow = JSON.stringify(note.key_facts || {}).toLowerCase();

            // Match words
            const words = cleanQ.split(/\s+/).filter(w => w.length > 1);
            words.forEach(word => {
                if (titleLow.includes(word)) score += 5;
                if (tagsLow.includes(word)) score += 4;
                if (factsLow.includes(word)) score += 3;
                if (contentLow.includes(word)) score += 2;
            });

            if (note.is_pinned) score += 1;
            return { note: note as UserNote, score };
        });

        // Filter and sort by relevance score
        const relevant = scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.note);

        // If no specific match found, return pinned or recent notes
        if (relevant.length === 0) {
            return data.slice(0, limit) as UserNote[];
        }

        return relevant.slice(0, limit);
    } catch (err) {
        console.error('[Note Actions] searchNotesForUser error:', err);
        return [];
    }
}

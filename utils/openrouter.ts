/**
 * OpenRouter AI API Helper
 * Provides fallback to MiniMax M3 (Free) when Gemini quota is exhausted.
 */

export interface OpenRouterChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OpenRouterOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'json_object' };
}

export const DEFAULT_OPENROUTER_MODEL = 'minimax/minimax-m3:free';

/**
 * Call OpenRouter Chat Completions endpoint
 */
export async function callOpenRouterCompletion(
    messages: OpenRouterChatMessage[],
    options: OpenRouterOptions = {}
): Promise<string | null> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.warn('[OpenRouter] OPENROUTER_API_KEY is not configured in environment.');
        return null;
    }

    const model = options.model || DEFAULT_OPENROUTER_MODEL;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://daybase.app',
                'X-Title': 'Day Base Mascot AI',
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: options.temperature ?? 0.3,
                max_tokens: options.maxTokens ?? 1024,
                ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
            }),
            cache: 'no-store',
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[OpenRouter] API Error (${response.status} - ${response.statusText}):`, errText);
            return null;
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content === 'string') {
            return content.trim();
        }

        return null;
    } catch (err) {
        console.error('[OpenRouter] Request failed:', err);
        return null;
    }
}

/**
 * Safely extract and parse JSON from an LLM response string.
 * Handles markdown code fences (```json ... ```) and leading/trailing extra text.
 */
export function extractJsonFromText<T = unknown>(text: string): T | null {
    if (!text) return null;

    const trimmed = text.trim();

    // 1. Direct parse attempt
    try {
        return JSON.parse(trimmed) as T;
    } catch {
        // Fall through to pattern extraction
    }

    // 2. Extract from markdown code blocks e.g. ```json ... ``` or ``` ... ```
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
        try {
            return JSON.parse(codeBlockMatch[1].trim()) as T;
        } catch {
            // Continue to substring search
        }
    }

    // 3. Find first { or [ and matching last } or ]
    const firstBrace = trimmed.indexOf('{');
    const firstBracket = trimmed.indexOf('[');

    let startIdx = -1;
    let endIdx = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIdx = firstBrace;
        endIdx = trimmed.lastIndexOf('}');
    } else if (firstBracket !== -1) {
        startIdx = firstBracket;
        endIdx = trimmed.lastIndexOf(']');
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const candidate = trimmed.substring(startIdx, endIdx + 1);
        try {
            return JSON.parse(candidate) as T;
        } catch {
            // Parsing failed
        }
    }

    return null;
}

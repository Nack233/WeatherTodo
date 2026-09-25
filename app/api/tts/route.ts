import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// In-memory rate limiter per user (15 requests per minute window)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const timestamps = (rateLimitMap.get(key) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }
    timestamps.push(now);
    rateLimitMap.set(key, timestamps);
    return true;
}

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Require authenticated user session to prevent API quota/financial drain
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login to use Text-to-Speech.' },
                { status: 401 }
            );
        }

        // Rate limiting per authenticated user
        if (!checkRateLimit(user.id)) {
            return NextResponse.json(
                { error: 'Too many requests. Please wait a moment before trying again.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const text = body.text?.trim();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // SECURITY: Limit maximum text length to prevent credit exhaustion
        if (text.length > 500) {
            return NextResponse.json(
                { error: 'Text too long. Maximum allowed is 500 characters.' },
                { status: 400 }
            );
        }

        const apiKey = process.env.ELEVENLABS_API_KEY;
        const voiceId = process.env.ELEVENLABS_VOICE_ID || 'cgSgspJ2msm6clMCkdW9';
        const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_v3';

        if (!apiKey) {
            return NextResponse.json(
                { error: 'ELEVENLABS_API_KEY is not configured', fallback: true },
                { status: 400 }
            );
        }

        // Call ElevenLabs Text-to-Speech API
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({
                text,
                model_id: modelId,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        console.log(`[TTS API] ElevenLabs response for voice ${voiceId} (model: ${modelId}):`, response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs TTS error:', response.status, errorText);
            return NextResponse.json(
                { error: `ElevenLabs API error: ${response.statusText}`, fallback: true },
                { status: response.status }
            );
        }

        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.byteLength.toString(),
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (err: unknown) {
        console.error('TTS handler exception:', err);
        return NextResponse.json(
            { error: 'Internal server error', fallback: true },
            { status: 500 }
        );
    }
}

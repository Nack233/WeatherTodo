import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const text = body.text?.trim();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
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

import { createClient } from '@/utils/supabase/server';
import { ensureProfileExists } from '@/utils/supabase/profile';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // SECURITY: Validate redirect target to prevent open redirect attacks
    const nextRaw = searchParams.get('next') ?? '/dashboard';
    const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/dashboard';

    if (code) {
        try {
            const supabase = await createClient();
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);

            if (!error && data?.user) {
                // Ensure profile exists with user metadata from Google
                try {
                    await ensureProfileExists(supabase, data.user);
                } catch {
                    // Non-blocking if profile upsert fails
                }

                const isLocalEnv = process.env.NODE_ENV === 'development';
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

                // SECURITY: Prevent Host Header Injection / Open Redirect by preferring configured siteUrl or request origin
                let redirectOrigin = origin;
                if (!isLocalEnv && siteUrl) {
                    try {
                        redirectOrigin = new URL(siteUrl).origin;
                    } catch {
                        redirectOrigin = origin;
                    }
                }

                return NextResponse.redirect(`${redirectOrigin}${next}`);
            }
        } catch {
            return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
        }
    }

    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}

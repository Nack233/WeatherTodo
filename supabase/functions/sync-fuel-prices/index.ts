import { createClient } from 'npm:@supabase/supabase-js@2';
import { syncFuelPrices } from '../_shared/fuel-sync.ts';

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
        },
    });
}

export default async function handler(request: Request): Promise<Response> {
    try {
        void request;

        const url = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!url || !serviceRoleKey) {
            return jsonResponse(
                {
                    status: 'error',
                    error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
                },
                500,
            );
        }

        const supabase = createClient(url, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        const result = await syncFuelPrices(supabase);

        return jsonResponse({
            status: 'success',
            syncedCount: result.syncedCount,
            effectiveDate: result.effectiveDate,
            updatedLabel: result.updatedLabel,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'sync failed';
        return jsonResponse({ status: 'error', error: message }, 500);
    }
}

if (import.meta.main) {
    Deno.serve(handler);
}
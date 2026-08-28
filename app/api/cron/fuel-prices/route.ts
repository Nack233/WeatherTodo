import { NextRequest, NextResponse } from 'next/server';
import { syncEppoFuelPricesToSupabase } from '@/app/actions/fuel-actions';

export async function GET(request: NextRequest) {
    // SECURITY: Verify cron secret to prevent unauthorized triggers
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await syncEppoFuelPricesToSupabase();
        return NextResponse.json({
            status: 'success',
            syncedCount: result.syncedCount,
            effectiveDate: result.effectiveDate,
            updatedLabel: result.updatedLabel,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'sync failed';
        return NextResponse.json({ status: 'error', error: message }, { status: 500 });
    }
}
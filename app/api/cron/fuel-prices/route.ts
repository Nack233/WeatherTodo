import { NextResponse } from 'next/server';
import { syncEppoFuelPricesToSupabase } from '@/app/actions/fuel-actions';

export async function GET() {
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
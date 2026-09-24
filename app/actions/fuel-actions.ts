'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import {
    fetchEppoFuelPrices,
    syncFuelPrices,
    type FuelPriceSnapshot,
    type FuelPriceSyncResult,
} from '@/supabase/functions/_shared/fuel-sync';

export async function getEppoFuelPrices(): Promise<FuelPriceSnapshot> {
    return fetchEppoFuelPrices();
}

export async function syncEppoFuelPricesToSupabase(): Promise<FuelPriceSyncResult> {
    const supabase = createAdminClient();
    return syncFuelPrices(supabase);
}
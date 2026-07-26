import { createAdminClient } from '@/utils/supabase/admin';
import {
    fetchEppoFuelPrices,
    groupFuelRows,
    syncFuelPrices,
    type FuelBrandBlock,
    type FuelPriceDbRow,
    type FuelPriceRow,
    type FuelPriceSnapshot,
    type FuelPriceSyncResult,
} from '@/supabase/functions/_shared/fuel-sync';

export type { FuelBrandBlock, FuelPriceDbRow, FuelPriceRow, FuelPriceSnapshot, FuelPriceSyncResult };

export { groupFuelRows };

export async function getEppoFuelPrices(): Promise<FuelPriceSnapshot> {
    return fetchEppoFuelPrices();
}

export async function syncEppoFuelPricesToSupabase(): Promise<FuelPriceSyncResult> {
    const supabase = createAdminClient();
    return syncFuelPrices(supabase);
}
import { createAdminClient } from '@/utils/supabase/admin';

export type FuelPriceRow = {
    fuelType: string;
    brand: string;
    price: string;
};

export type FuelPriceSnapshot = {
    updatedLabel: string;
    pageTitle: string;
    rows: FuelPriceRow[];
    sourceUrl: string;
    effectiveDate: string;
};

export type FuelBrandBlock = {
    brand: string;
    badge: string;
    accent: string;
    topPrice: number | null;
    items: Array<{
        fuelType: string;
        price: number;
    }>;
};

export type FuelPriceDbRow = {
    brand: string;
    fuel_type: string;
    price: number;
    effective_date: string;
};

const SOURCE_URL = 'https://www.eppo.go.th/wp-json/oil-api/v1/oil-prices';

type EppoOilApiResponse = {
    status: string;
    last_updated: string;
    data: {
        ptt: Record<string, string>;
        bcp: Record<string, string>;
        pt: Record<string, string>;
    };
};

const BRAND_ORDER = ['PTT', 'BCP', 'PT'] as const;

const FUEL_MAP: Record<(typeof BRAND_ORDER)[number], Array<{ fuelType: string; key: string }>> = {
    PTT: [
        { fuelType: 'Gasoline 95', key: 'oil_ptt_gl95' },
        { fuelType: 'Gasohol 95', key: 'oil_ptt_gh95' },
        { fuelType: 'Gasohol 91', key: 'oil_ptt_gh91' },
        { fuelType: 'E20', key: 'oil_ptt_e20' },
        { fuelType: 'E85', key: 'oil_ptt_e85' },
        { fuelType: 'Diesel B7', key: 'oil_ptt_ds' },
        { fuelType: 'Diesel B20', key: 'oil_ptt_dsb20' },
        { fuelType: 'Diesel Premium', key: 'oil_ptt_pds' },
        { fuelType: 'Gasohol 95 Premium', key: 'oil_ptt_gs95p' },
        { fuelType: 'Gasohol 99 Premium', key: 'oil_ptt_gs99p' },
    ],
    BCP: [
        { fuelType: 'Gasoline 95', key: 'oil_bcp_gl95' },
        { fuelType: 'Gasohol 95', key: 'oil_bcp_gh95' },
        { fuelType: 'Gasohol 91', key: 'oil_bcp_gh91' },
        { fuelType: 'E20', key: 'oil_bcp_e20' },
        { fuelType: 'E85', key: 'oil_bcp_e85' },
        { fuelType: 'Diesel B7', key: 'oil_bcp_ds' },
        { fuelType: 'Diesel B20', key: 'oil_bcp_dsb20' },
        { fuelType: 'Diesel Premium', key: 'oil_bcp_pds' },
        { fuelType: 'Gasohol 95 Premium', key: 'oil_bcp_gs95p' },
        { fuelType: 'Gasohol 99 Premium', key: 'oil_bcp_gs99p' },
    ],
    PT: [
        { fuelType: 'Gasoline 95', key: 'oil_pt_gl95' },
        { fuelType: 'Gasohol 95', key: 'oil_pt_gh95' },
        { fuelType: 'Gasohol 91', key: 'oil_pt_gh91' },
        { fuelType: 'E20', key: 'oil_pt_e20' },
        { fuelType: 'E85', key: 'oil_pt_e85' },
        { fuelType: 'Diesel B7', key: 'oil_pt_ds' },
        { fuelType: 'Diesel B20', key: 'oil_pt_dsb20' },
        { fuelType: 'Diesel Premium', key: 'oil_pt_pds' },
        { fuelType: 'Gasohol 95 Premium', key: 'oil_pt_gs95p' },
        { fuelType: 'Gasohol 99 Premium', key: 'oil_pt_gs99p' },
    ],
};

function parseEppoEffectiveDate(payload: EppoOilApiResponse) {
    const candidateDates = [
        payload.data.ptt.oil_ptt_date,
        payload.data.bcp.oil_bcp_date,
        payload.data.pt.oil_pt_date,
    ].filter(Boolean);

    return candidateDates[0] ?? new Date().toISOString().split('T')[0];
}

function buildFuelRows(payload: EppoOilApiResponse): FuelPriceRow[] {
    const rows: FuelPriceRow[] = [];

    for (const brand of BRAND_ORDER) {
        const brandKey = brand.toLowerCase() as keyof EppoOilApiResponse['data'];
        const brandData = payload.data[brandKey];

        FUEL_MAP[brand].forEach(({ fuelType, key }) => {
            const price = brandData[key];
            if (!price || price === '-') return;
            rows.push({ fuelType, brand, price });
        });
    }

    rows.sort((left, right) => {
        const fuelCompare = left.fuelType.localeCompare(right.fuelType, 'th');
        if (fuelCompare !== 0) return fuelCompare;
        return BRAND_ORDER.indexOf(left.brand as (typeof BRAND_ORDER)[number]) - BRAND_ORDER.indexOf(right.brand as (typeof BRAND_ORDER)[number]);
    });

    return rows;
}

function toDbRows(rows: FuelPriceRow[], effectiveDate: string): FuelPriceDbRow[] {
    return rows.map((row) => ({
        brand: row.brand,
        fuel_type: row.fuelType,
        price: Number(row.price),
        effective_date: effectiveDate,
    }));
}

export function groupFuelRows(rows: FuelPriceRow[]): FuelBrandBlock[] {
    const palette: Record<(typeof BRAND_ORDER)[number], { badge: string; accent: string }> = {
        PTT: { badge: 'PTT', accent: 'var(--accent-cyan)' },
        BCP: { badge: 'BCP', accent: 'var(--accent-green)' },
        PT: { badge: 'PT', accent: 'var(--accent-yellow)' },
    };

    return BRAND_ORDER.map((brand) => {
        const items = rows
            .filter((row) => row.brand === brand)
            .map((row) => ({
                fuelType: row.fuelType,
                price: Number(row.price),
            }))
            .sort((left, right) => left.fuelType.localeCompare(right.fuelType, 'th'));

        return {
            brand,
            badge: palette[brand].badge,
            accent: palette[brand].accent,
            topPrice: items[0]?.price ?? null,
            items,
        };
    });
}

export async function getEppoFuelPrices(): Promise<FuelPriceSnapshot> {
    const response = await fetch(SOURCE_URL, {
        headers: {
            'accept': 'application/json',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'accept-language': 'th-TH,th;q=0.9,en;q=0.8',
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`EPPO fetch failed with status ${response.status}`);
    }

    const payload = (await response.json()) as EppoOilApiResponse;

    if (payload.status !== 'success') {
        throw new Error('EPPO oil API returned a non-success status');
    }

    const effectiveDate = parseEppoEffectiveDate(payload);
    const rows = buildFuelRows(payload);

    return {
        updatedLabel: payload.last_updated,
        pageTitle: 'ราคาน้ำมันขายปลีกตามแบรนด์',
        rows,
        sourceUrl: SOURCE_URL,
        effectiveDate,
    };
}

export async function syncEppoFuelPricesToSupabase() {
    const snapshot = await getEppoFuelPrices();
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('fuel_prices')
        .upsert(toDbRows(snapshot.rows, snapshot.effectiveDate), {
            onConflict: 'brand,fuel_type,effective_date',
        });

    if (error) {
        throw new Error(error.message);
    }

    return {
        ...snapshot,
        syncedCount: snapshot.rows.length,
    };
}
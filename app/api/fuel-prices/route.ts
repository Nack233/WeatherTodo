import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getEppoFuelPrices } from '@/app/actions/fuel-actions';

function formatThaiDate(dateString: string) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export async function GET() {
    try {
        try {
            const supabase = createAdminClient();
            const { data, error } = await supabase
                .from('fuel_prices')
                .select('brand, fuel_type, price, effective_date, created_at')
                .order('effective_date', { ascending: false })
                .order('brand', { ascending: true })
                .order('fuel_type', { ascending: true });

            if (error) {
                throw new Error(error.message);
            }

            if (data && data.length > 0) {
                const effectiveDate = data[0].effective_date;
                const rows = data
                    .filter((row) => row.effective_date === effectiveDate)
                    .map((row) => ({
                        fuelType: row.fuel_type,
                        brand: row.brand,
                        price: Number(row.price).toFixed(2),
                    }));

                return NextResponse.json({
                    updatedLabel: `อัปเดตล่าสุด: ${formatThaiDate(effectiveDate)}`,
                    pageTitle: 'ราคาน้ำมันขายปลีกตามแบรนด์',
                    rows,
                    sourceUrl: 'https://www.eppo.go.th/wp-json/oil-api/v1/oil-prices',
                    effectiveDate,
                }, { status: 200 });
            }
        } catch {
            // Fall back to live EPPO data if the table is empty or the admin client is unavailable.
        }

        const liveData = await getEppoFuelPrices();
        return NextResponse.json(liveData, { status: 200 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'โหลดราคาน้ำมันไม่สำเร็จ';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
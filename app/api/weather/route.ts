import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const lat = searchParams.get('lat');
        const lon = searchParams.get('lon');

        if (!lat || !lon) {
            return NextResponse.json(
                { error: 'Missing required query parameters: lat, lon' },
                { status: 400 }
            );
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        if (isNaN(latitude) || isNaN(longitude)) {
            return NextResponse.json(
                { error: 'Invalid coordinates: lat and lon must be numbers' },
                { status: 400 }
            );
        }

        const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Bangkok`;

        const response = await fetch(openMeteoUrl, {
            next: { revalidate: 900 }, // 15-minute server-side ISR cache
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Upstream weather service returned status ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
            },
        });
    } catch (err) {
        console.error('[Weather API Proxy Error]:', err);
        return NextResponse.json(
            { error: 'Internal server error while fetching weather data' },
            { status: 500 }
        );
    }
}

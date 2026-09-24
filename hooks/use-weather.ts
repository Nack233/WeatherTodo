'use client';

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_LOCATIONS, type SavedLocation } from '@/app/data/thailand-locations';

export interface WeatherInfo {
    current: {
        time: string;
        temperature_2m: number;
        relative_humidity_2m: number;
        apparent_temperature: number;
        precipitation: number;
        weather_code: number;
        cloud_cover: number;
        wind_speed_10m: number;
    };
    hourly: {
        time: string[];
        temperature_2m: number[];
        weather_code: number[];
        precipitation_probability: number[];
    };
    daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
    };
}

interface WeatherCacheEntry {
    timestamp: number;
    data: WeatherInfo;
}

type WeatherCache = Record<string, WeatherCacheEntry>;

const STORAGE_KEY_LOCATIONS = 'weather_saved_locations';
const STORAGE_KEY_ACTIVE = 'weather_active_location';

function loadSavedLocations(): SavedLocation[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_LOCATIONS);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch { /* ignore */ }
    return DEFAULT_LOCATIONS;
}

function saveLocations(locations: SavedLocation[]) {
    localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations));
}

function loadActiveId(locations: SavedLocation[]): string {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_ACTIVE);
        if (saved && locations.some((l) => l.id === saved)) return saved;
    } catch { /* ignore */ }
    return locations[0]?.id || '';
}

function cacheKeyFor(loc: SavedLocation): string {
    return `weather_${loc.lat.toFixed(4)}_${loc.lon.toFixed(4)}`;
}

function isValidWeatherCache(data: unknown): data is WeatherInfo {
    if (!data || typeof data !== 'object') return false;
    const w = data as Partial<WeatherInfo>;
    return Boolean(
        w.current &&
        typeof w.current.temperature_2m === 'number' &&
        w.hourly && Array.isArray(w.hourly.time) && w.hourly.time.length > 0 &&
        w.daily && Array.isArray(w.daily.time) && w.daily.time.length > 0
    );
}

export function useWeather() {
    const [locations, setLocations] = useState<SavedLocation[]>([]);
    const [activeId, setActiveId] = useState<string>('');
    const [weatherData, setWeatherData] = useState<WeatherInfo | null>(null);
    const [updateTime, setUpdateTime] = useState<string>('--:--');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Init from localStorage
    useEffect(() => {
        const locs = loadSavedLocations();
        setLocations(locs);
        setActiveId(loadActiveId(locs));
    }, []);

    const fetchWeather = useCallback(async (loc: SavedLocation, force = false) => {
        setIsLoading(true);
        const cKey = cacheKeyFor(loc);
        const cacheAgeLimit = 15 * 60 * 1000; // 15 mins
        const now = Date.now();

        // Check LocalStorage cache
        const cacheStr = localStorage.getItem('weather_cache');
        let cacheObj: WeatherCache = {};
        if (cacheStr) {
            try {
                const parsedCache = JSON.parse(cacheStr) as Partial<WeatherCache>;
                cacheObj = parsedCache as WeatherCache;
            } catch {
                cacheObj = {};
            }
        }

        const cachedEntry = cacheObj[cKey];
        if (!force && cachedEntry && isValidWeatherCache(cachedEntry.data) && (now - cachedEntry.timestamp < cacheAgeLimit)) {
            setWeatherData(cachedEntry.data);
            const timeObj = new Date(cachedEntry.timestamp);
            setUpdateTime(`อัปเดตล่าสุด: ${timeObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`);
            setIsLoading(false);
            return;
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Bangkok`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('API fetch failed');
            const data = await response.json();

            if (isValidWeatherCache(data)) {
                cacheObj[cKey] = {
                    timestamp: now,
                    data: data,
                };
                localStorage.setItem('weather_cache', JSON.stringify(cacheObj));

                setWeatherData(data);
                const timeObj = new Date(now);
                setUpdateTime(`อัปเดตล่าสุด: ${timeObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`);
            } else {
                throw new Error('Invalid weather data structure received');
            }
        } catch (error) {
            console.error('Error fetching weather:', error);
            if (cachedEntry && isValidWeatherCache(cachedEntry.data)) {
                setWeatherData(cachedEntry.data);
                const timeObj = new Date(cachedEntry.timestamp);
                setUpdateTime(`แคชเก่า (${timeObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)`);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch weather when active location changes
    useEffect(() => {
        if (!activeId || locations.length === 0) return;
        const currentLoc = locations.find((l) => l.id === activeId) || locations[0];
        if (currentLoc) {
            void fetchWeather(currentLoc);
        }
    }, [activeId, locations, fetchWeather]);

    const activeLocation = locations.find((l) => l.id === activeId) || locations[0] || DEFAULT_LOCATIONS[0];

    const selectLocation = (id: string) => {
        setActiveId(id);
        localStorage.setItem(STORAGE_KEY_ACTIVE, id);
        window.dispatchEvent(new Event('weather_location_change'));
    };

    const addLocation = (loc: SavedLocation) => {
        const next = [...locations, loc];
        setLocations(next);
        saveLocations(next);
        selectLocation(loc.id);
    };

    const removeLocation = (id: string) => {
        const next = locations.filter((l) => l.id !== id);
        if (next.length === 0) {
            setLocations(DEFAULT_LOCATIONS);
            saveLocations(DEFAULT_LOCATIONS);
            selectLocation(DEFAULT_LOCATIONS[0].id);
            return;
        }
        setLocations(next);
        saveLocations(next);
        if (activeId === id) {
            selectLocation(next[0].id);
        }
    };

    return {
        locations,
        activeId,
        activeLocation,
        weatherData,
        updateTime,
        isLoading,
        fetchWeather,
        selectLocation,
        addLocation,
        removeLocation,
    };
}

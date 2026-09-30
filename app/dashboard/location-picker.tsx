'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    X, ChevronLeft, ChevronRight, MapPin, Search, Plus, Loader2,
    RefreshCw, Thermometer, Droplets, CloudRain, Sun,
    CloudSun, Cloud, CloudFog, CloudDrizzle, CloudLightning,
    Snowflake, AlertCircle, Check, Compass, Sparkles
} from 'lucide-react';
import {
    REGIONS, type Region, type Province, type SavedLocation,
    generateLocationId, MAX_LOCATIONS
} from '@/app/data/thailand-locations';
import {
    searchDistricts, getDistrictsByProvince, type ThailandDistrict
} from '@/app/data/thailand-districts';
import { getWeatherMeta } from '@/utils/weather-codes';

// ============================================================
// Geocoding API helper (Open-Meteo) for Subdistricts & Places
// ============================================================
interface GeoResult {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    admin1?: string; // จังหวัด
    admin2?: string; // อำเภอ
    admin3?: string; // ตำบล
    country: string;
}

async function searchOnlineLocations(query: string): Promise<GeoResult[]> {
    if (!query || query.length < 2) return [];
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=th&country_code=TH`;
    try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || []) as GeoResult[];
    } catch {
        return [];
    }
}

// Popular / Recommended Districts for quick pick
const POPULAR_DISTRICTS = [
    { name: 'สอยดาว', province: 'จันทบุรี', region: 'ภาคตะวันออก', lat: 13.2060, lon: 102.2007 },
    { name: 'หัวหิน', province: 'ประจวบคีรีขันธ์', region: 'ภาคตะวันตก', lat: 12.5684, lon: 99.9577 },
    { name: 'หาดใหญ่', province: 'สงขลา', region: 'ภาคใต้', lat: 6.9580, lon: 100.4419 },
    { name: 'แม่ริม', province: 'เชียงใหม่', region: 'ภาคเหนือ', lat: 18.9142, lon: 98.9452 },
    { name: 'บางรัก', province: 'กรุงเทพมหานคร', region: 'ภาคกลาง', lat: 13.7307, lon: 100.5244 },
    { name: 'เกาะสมุย', province: 'สุราษฎร์ธานี', region: 'ภาคใต้', lat: 9.5357, lon: 99.9357 },
    { name: 'ปากช่อง', province: 'นครราชสีมา', region: 'ภาคตะวันออกเฉียงเหนือ', lat: 14.7080, lon: 101.4161 },
    { name: 'โป่งน้ำร้อน', province: 'จันทบุรี', region: 'ภาคตะวันออก', lat: 12.9176, lon: 102.3849 },
];

interface WeatherMiniData {
    temperature: number;
    apparent: number;
    humidity: number;
    weatherCode: number;
    rainChance: number;
}

// ============================================================
// LocationPickerModal (Hybrid Instant Search & Province Browser)
// ============================================================
interface LocationPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddLocation: (loc: SavedLocation) => void;
    existingLocations: SavedLocation[];
    onReplaceLocation?: (oldId: string, newLoc: SavedLocation) => void;
    activeLocationId?: string;
}

type TabMode = 'search' | 'browse';

export function LocationPickerModal({
    isOpen,
    onClose,
    onAddLocation,
    existingLocations,
    onReplaceLocation,
    activeLocationId,
}: LocationPickerModalProps) {
    const [tabMode, setTabMode] = useState<TabMode>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [onlineResults, setOnlineResults] = useState<GeoResult[]>([]);
    const [isSearchingOnline, setIsSearchingOnline] = useState(false);

    // Selected location for preview
    const [selectedTarget, setSelectedTarget] = useState<{
        name: string;
        district: string;
        province: string;
        region: string;
        lat: number;
        lon: number;
    } | null>(null);

    // Weather preview data
    const [previewWeather, setPreviewWeather] = useState<WeatherMiniData | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const previewCache = useRef<Map<string, { timestamp: number; data: WeatherMiniData }>>(new Map());

    // Quota replacement state
    const [pendingReplaceLoc, setPendingReplaceLoc] = useState<SavedLocation | null>(null);

    // Browse by Province mode states
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
    const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
    const [browseQuery, setBrowseQuery] = useState<string>('');

    // Region pills horizontal rail ref and drag/scroll logic
    const regionRailRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
    const [canScrollRight, setCanScrollRight] = useState<boolean>(true);
    const isRegionDraggingRef = useRef<boolean>(false);
    const regionStartXRef = useRef<number>(0);
    const regionScrollLeftRef = useRef<number>(0);
    const hasRegionDraggedRef = useRef<boolean>(false);

    const updateRegionScrollButtons = useCallback(() => {
        if (!regionRailRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = regionRailRef.current;
        setCanScrollLeft(scrollLeft > 4);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }, []);

    const handleScrollRegion = (direction: 'left' | 'right') => {
        if (!regionRailRef.current) return;
        const scrollAmount = 180;
        regionRailRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
        setTimeout(updateRegionScrollButtons, 250);
    };

    const handleRegionMouseDown = (e: React.MouseEvent) => {
        if (!regionRailRef.current) return;
        isRegionDraggingRef.current = true;
        hasRegionDraggedRef.current = false;
        regionStartXRef.current = e.pageX - regionRailRef.current.offsetLeft;
        regionScrollLeftRef.current = regionRailRef.current.scrollLeft;
    };

    const handleRegionMouseMove = (e: React.MouseEvent) => {
        if (!isRegionDraggingRef.current || !regionRailRef.current) return;
        const x = e.pageX - regionRailRef.current.offsetLeft;
        const walk = (x - regionStartXRef.current) * 1.5;
        if (Math.abs(walk) > 4) {
            hasRegionDraggedRef.current = true;
        }
        regionRailRef.current.scrollLeft = regionScrollLeftRef.current - walk;
        updateRegionScrollButtons();
    };

    const handleRegionMouseUpOrLeave = () => {
        isRegionDraggingRef.current = false;
    };

    const handleRegionWheel = (e: React.WheelEvent) => {
        if (!regionRailRef.current) return;
        if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
            updateRegionScrollButtons();
        }
    };

    const handleRegionClick = (r: Region | null, e: React.MouseEvent<HTMLButtonElement>) => {
        if (hasRegionDraggedRef.current) return;
        setSelectedRegion(r);
        e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        setTimeout(updateRegionScrollButtons, 300);
    };

    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setTabMode('search');
            setSearchQuery('');
            setOnlineResults([]);
            setSelectedTarget(null);
            setPreviewWeather(null);
            setPendingReplaceLoc(null);
            setSelectedRegion(null);
            setSelectedProvince(null);
            setBrowseQuery('');
            setTimeout(() => searchInputRef.current?.focus(), 150);
        }
    }, [isOpen]);

    // Check scroll buttons when switching to browse mode or changing selectedProvince
    useEffect(() => {
        if (isOpen && tabMode === 'browse' && !selectedProvince) {
            const timer = setTimeout(updateRegionScrollButtons, 150);
            window.addEventListener('resize', updateRegionScrollButtons);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateRegionScrollButtons);
            };
        }
    }, [isOpen, tabMode, selectedProvince, updateRegionScrollButtons]);

    // Local instant district results (matches from 928 districts)
    const localDistrictResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return searchDistricts(searchQuery, 15);
    }, [searchQuery]);

    // Debounced online geocoding for subdistricts / specific places
    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (value.trim().length < 2) {
            setOnlineResults([]);
            setIsSearchingOnline(false);
            return;
        }

        setIsSearchingOnline(true);
        debounceRef.current = setTimeout(async () => {
            const results = await searchOnlineLocations(value);
            setOnlineResults(results);
            setIsSearchingOnline(false);
        }, 350);
    }, []);

    // Fetch mini weather preview when selectedTarget changes
    useEffect(() => {
        if (!selectedTarget) {
            setPreviewWeather(null);
            return;
        }

        const cacheKey = `${selectedTarget.lat.toFixed(2)}_${selectedTarget.lon.toFixed(2)}`;
        const cached = previewCache.current.get(cacheKey);
        const now = Date.now();

        if (cached && now - cached.timestamp < 10 * 60 * 1000) {
            setPreviewWeather(cached.data);
            return;
        }

        let isCancelled = false;
        setIsLoadingPreview(true);

        const fetchPreview = async () => {
            try {
                const proxyUrl = `/api/weather?lat=${selectedTarget.lat}&lon=${selectedTarget.lon}`;
                const fallbackUrl = `https://api.open-meteo.com/v1/forecast?latitude=${selectedTarget.lat}&longitude=${selectedTarget.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code&hourly=precipitation_probability&timezone=Asia/Bangkok`;
                
                let res = await fetch(proxyUrl);
                if (!res.ok) {
                    res = await fetch(fallbackUrl);
                }
                if (!res.ok) throw new Error('Preview fetch failed');

                const data = await res.json();
                if (isCancelled) return;

                const cur = data.current || {};
                const hourlyRain = data.hourly?.precipitation_probability;
                const rainChance = Array.isArray(hourlyRain) && hourlyRain.length > 0 ? Math.max(...hourlyRain.slice(0, 12)) : 0;

                const miniData: WeatherMiniData = {
                    temperature: Math.round(cur.temperature_2m ?? 30),
                    apparent: Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 30),
                    humidity: Math.round(cur.relative_humidity_2m ?? 65),
                    weatherCode: cur.weather_code ?? 0,
                    rainChance,
                };

                previewCache.current.set(cacheKey, { timestamp: now, data: miniData });
                setPreviewWeather(miniData);
            } catch (err) {
                console.warn('Preview weather error:', err);
                if (!isCancelled) setPreviewWeather(null);
            } finally {
                if (!isCancelled) setIsLoadingPreview(false);
            }
        };

        void fetchPreview();

        return () => {
            isCancelled = true;
        };
    }, [selectedTarget]);

    // Districts of selected province in Browse mode
    const provinceDistricts = useMemo(() => {
        return selectedProvince ? getDistrictsByProvince(selectedProvince.name) : [];
    }, [selectedProvince]);

    // Filtered provinces for Browse tab
    const displayedProvinces = useMemo(() => {
        const list = selectedRegion ? selectedRegion.provinces : REGIONS.flatMap(r => r.provinces);
        if (!browseQuery.trim()) return list;
        const q = browseQuery.trim().toLowerCase().replace(/^(จังหวัด|จ\s*\.)/g, '');
        return list.filter(p => p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q));
    }, [selectedRegion, browseQuery]);

    // Filtered districts for selected province in Browse tab
    const displayedDistricts = useMemo(() => {
        if (!selectedProvince) return [];
        const list = provinceDistricts;
        if (!browseQuery.trim()) return list;
        const q = browseQuery.trim().toLowerCase().replace(/^(อำเภอ|เขต|อ\s*\.)/g, '');
        return list.filter(d => d.name.toLowerCase().includes(q) || d.nameEn.toLowerCase().includes(q));
    }, [selectedProvince, provinceDistricts, browseQuery]);

    const handleSelectProvince = (prov: Province) => {
        setSelectedProvince(prov);
        setBrowseQuery('');
    };

    const handleBackToProvinces = () => {
        setSelectedProvince(null);
        setBrowseQuery('');
    };

    // Confirm selection
    const handleConfirmTarget = () => {
        if (!selectedTarget) return;

        // Check if already in existingLocations
        const existing = existingLocations.find(
            (l) => l.name === selectedTarget.name && l.province === selectedTarget.province
        );

        if (existing) {
            onAddLocation(existing);
            onClose();
            return;
        }

        const newLoc: SavedLocation = {
            id: generateLocationId(),
            name: selectedTarget.name,
            district: selectedTarget.district,
            province: selectedTarget.province,
            region: selectedTarget.region,
            lat: selectedTarget.lat,
            lon: selectedTarget.lon,
        };

        if (existingLocations.length < MAX_LOCATIONS) {
            onAddLocation(newLoc);
            onClose();
        } else {
            // Quota full -> show replacement dialog
            setPendingReplaceLoc(newLoc);
        }
    };

    const handleConfirmReplace = (oldLocationId: string) => {
        if (!pendingReplaceLoc) return;
        if (onReplaceLocation) {
            onReplaceLocation(oldLocationId, pendingReplaceLoc);
        } else {
            onAddLocation(pendingReplaceLoc);
        }
        setPendingReplaceLoc(null);
        onClose();
    };

    const renderWeatherIcon = (iconName: string, className?: string) => {
        switch (iconName) {
            case 'sun': return <Sun className={className} />;
            case 'cloud-sun': return <CloudSun className={className} />;
            case 'cloud': return <Cloud className={className} />;
            case 'cloud-fog': return <CloudFog className={className} />;
            case 'cloud-drizzle': return <CloudDrizzle className={className} />;
            case 'cloud-rain': return <CloudRain className={className} />;
            case 'cloud-lightning': return <CloudLightning className={className} />;
            case 'snowflake': return <Snowflake className={className} />;
            default: return <CloudSun className={className} />;
        }
    };

    if (!isOpen) return null;

    const weatherMeta = previewWeather ? getWeatherMeta(previewWeather.weatherCode) : null;
    const isTargetActive = selectedTarget && existingLocations.some(
        (l) => l.id === activeLocationId && l.name === selectedTarget.name && l.province === selectedTarget.province
    );

    return (
        <div className="loc-modal-backdrop" onClick={onClose}>
            <div className="loc-modal enhanced-loc-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="loc-modal-header">
                    <div className="loc-modal-header-left">
                        <div className="thai-map-header-icon" style={{ width: 34, height: 34 }}>
                            <Compass size={18} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>ค้นหาและเพิ่มอำเภอ / จุดพยากรณ์</h3>
                            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                ค้นหาได้ครบทั้ง 928 อำเภอทั่วไทย หรือเลือกดูตามจังหวัด
                            </p>
                        </div>
                    </div>
                    <button className="loc-close-btn" onClick={onClose} title="ปิดหน้าต่าง">
                        <X size={20} />
                    </button>
                </div>

                {/* Mode Switcher Tabs */}
                <div className="loc-tab-bar">
                    <button
                        className={`loc-tab-btn ${tabMode === 'search' ? 'active' : ''}`}
                        onClick={() => {
                            setTabMode('search');
                            setTimeout(() => searchInputRef.current?.focus(), 100);
                        }}
                    >
                        <Search size={15} />
                        <span>ค้นหาด่วนทั่วไทย (928 อำเภอ)</span>
                    </button>
                    <button
                        className={`loc-tab-btn ${tabMode === 'browse' ? 'active' : ''}`}
                        onClick={() => setTabMode('browse')}
                    >
                        <Compass size={15} />
                        <span>เลือกตามจังหวัด / ภูมิภาค</span>
                    </button>
                </div>

                {/* Main Body */}
                <div className="loc-modal-body loc-modal-split-body">
                    {/* Left Column: Search & Lists */}
                    <div className="loc-search-col">
                        {tabMode === 'search' ? (
                            <>
                                {/* Search Input with Left Padding Fix */}
                                <div className="loc-search-input-wrapper">
                                    <Search size={18} className="loc-search-icon" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        className="loc-search-input"
                                        style={{ paddingLeft: '2.85rem' }}
                                        placeholder="พิมพ์ชื่ออำเภอ เช่น สอยดาว, หัวหิน, หาดใหญ่, แม่ริม..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                    />
                                    {isSearchingOnline && (
                                        <Loader2 size={16} className="loc-search-spinner animate-spin" />
                                    )}
                                </div>

                                {/* Results View */}
                                <div className="loc-search-results-container">
                                    {searchQuery.trim().length === 0 ? (
                                        /* Popular / Recommended Section */
                                        <div>
                                            <div className="loc-section-label">
                                                <Sparkles size={14} style={{ color: 'var(--accent-yellow, #f59e0b)' }} />
                                                <span>อำเภอยอดนิยม & แนะนำ</span>
                                            </div>
                                            <div className="loc-popular-grid">
                                                {POPULAR_DISTRICTS.map((item) => (
                                                    <button
                                                        key={`${item.province}-${item.name}`}
                                                        className={`loc-popular-chip ${selectedTarget?.name === `อำเภอ${item.name}` ? 'active' : ''}`}
                                                        onClick={() => setSelectedTarget({
                                                            name: `อำเภอ${item.name}`,
                                                            district: `อำเภอ${item.name}`,
                                                            province: item.province,
                                                            region: item.region,
                                                            lat: item.lat,
                                                            lon: item.lon,
                                                        })}
                                                        title={`อำเภอ${item.name} (${item.province})`}
                                                    >
                                                        <MapPin size={14} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                                                        <span className="loc-popular-chip-name">อ.{item.name}</span>
                                                        <span className="loc-popular-chip-prov">({item.province})</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Search Results */
                                        <div className="loc-results-list">
                                            {localDistrictResults.length === 0 && onlineResults.length === 0 && !isSearchingOnline ? (
                                                <div className="loc-search-empty">
                                                    ไม่พบอำเภอหรือสถานที่สำหรับ &quot;{searchQuery}&quot;
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Local 928 Districts matches */}
                                                    {localDistrictResults.map((dist) => {
                                                        const isSelected = selectedTarget?.lat === dist.lat && selectedTarget?.lon === dist.lon;
                                                        const distLabel = dist.name.startsWith('เขต') || dist.name.startsWith('อำเภอ') ? dist.name : `อำเภอ${dist.name}`;
                                                        return (
                                                            <button
                                                                key={dist.id}
                                                                className={`loc-result-card ${isSelected ? 'active' : ''}`}
                                                                onClick={() => setSelectedTarget({
                                                                    name: distLabel,
                                                                    district: distLabel,
                                                                    province: dist.province,
                                                                    region: dist.regionName,
                                                                    lat: dist.lat,
                                                                    lon: dist.lon,
                                                                })}
                                                            >
                                                                <div className="loc-result-badge-icon">
                                                                    <MapPin size={16} />
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                        <span className="loc-result-name">{distLabel}</span>
                                                                        <span className="loc-tag-badge">อำเภอ</span>
                                                                    </div>
                                                                    <div className="loc-result-sub">
                                                                        จ.{dist.province} ({dist.provinceEn}) • {dist.regionName}
                                                                    </div>
                                                                </div>
                                                                <span className="loc-result-coords">
                                                                    {dist.lat.toFixed(2)}°, {dist.lon.toFixed(2)}°
                                                                </span>
                                                            </button>
                                                        );
                                                    })}

                                                    {/* Online Geocoding subdistrict matches */}
                                                    {onlineResults.map((item) => {
                                                        const isSelected = selectedTarget?.lat === item.latitude && selectedTarget?.lon === item.longitude;
                                                        const subtitle = [item.admin3, item.admin2, item.admin1].filter(Boolean).join(', ');
                                                        return (
                                                            <button
                                                                key={`online-${item.id}-${item.latitude}-${item.longitude}`}
                                                                className={`loc-result-card ${isSelected ? 'active' : ''}`}
                                                                onClick={() => setSelectedTarget({
                                                                    name: item.admin3 || item.admin2 || item.name,
                                                                    district: item.admin2 || item.admin1 || '',
                                                                    province: item.admin1 || '',
                                                                    region: '',
                                                                    lat: item.latitude,
                                                                    lon: item.longitude,
                                                                })}
                                                            >
                                                                <div className="loc-result-badge-icon online">
                                                                    <MapPin size={16} />
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                        <span className="loc-result-name">{item.name}</span>
                                                                        <span className="loc-tag-badge sub">ตำบล/สถานที่</span>
                                                                    </div>
                                                                    {subtitle && <div className="loc-result-sub">{subtitle}</div>}
                                                                </div>
                                                                <span className="loc-result-coords">
                                                                    {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Browse by Province Tab */
                            <div className="loc-browse-container">
                                {!selectedProvince ? (
                                    <>
                                        {/* Province Search Input */}
                                        <div className="loc-search-input-wrapper" style={{ marginBottom: '0.4rem' }}>
                                            <Search size={16} className="loc-search-icon" />
                                            <input
                                                type="text"
                                                className="loc-search-input"
                                                style={{ paddingLeft: '2.85rem', paddingRight: browseQuery ? '2.5rem' : '1rem' }}
                                                placeholder="ค้นหาชื่อจังหวัด (เช่น เชียงใหม่, จันทบุรี, ขอนแก่น...)"
                                                value={browseQuery}
                                                onChange={(e) => setBrowseQuery(e.target.value)}
                                            />
                                            {browseQuery && (
                                                <button
                                                    className="loc-search-clear-btn"
                                                    onClick={() => setBrowseQuery('')}
                                                    title="ล้างข้อความค้นหา"
                                                >
                                                    <X size={15} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Region selector pills */}
                                        <div className="loc-region-nav-wrapper">
                                            <button
                                                type="button"
                                                className={`loc-region-nav-btn left ${!canScrollLeft ? 'hidden' : ''}`}
                                                onClick={() => handleScrollRegion('left')}
                                                disabled={!canScrollLeft}
                                                aria-label="เลื่อนภูมิภาคไปทางซ้าย"
                                                title="เลื่อนไปทางซ้าย"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <div
                                                ref={regionRailRef}
                                                className="loc-region-filter-bar"
                                                onMouseDown={handleRegionMouseDown}
                                                onMouseMove={handleRegionMouseMove}
                                                onMouseUp={handleRegionMouseUpOrLeave}
                                                onMouseLeave={handleRegionMouseUpOrLeave}
                                                onWheel={handleRegionWheel}
                                                onScroll={updateRegionScrollButtons}
                                            >
                                                <button
                                                    className={`loc-region-pill ${!selectedRegion ? 'active' : ''}`}
                                                    onClick={(e) => handleRegionClick(null, e)}
                                                >
                                                    ทั้งหมด
                                                </button>
                                                {REGIONS.map((r) => (
                                                    <button
                                                        key={r.id}
                                                        className={`loc-region-pill ${selectedRegion?.id === r.id ? 'active' : ''}`}
                                                        onClick={(e) => handleRegionClick(r, e)}
                                                    >
                                                        {r.icon} {r.name}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                className={`loc-region-nav-btn right ${!canScrollRight ? 'hidden' : ''}`}
                                                onClick={() => handleScrollRegion('right')}
                                                disabled={!canScrollRight}
                                                aria-label="เลื่อนภูมิภาคไปทางขวา"
                                                title="เลื่อนไปทางขวา"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>

                                        {/* Province list */}
                                        {displayedProvinces.length === 0 ? (
                                            <div className="loc-search-empty" style={{ padding: '2rem 1rem' }}>
                                                ไม่พบจังหวัดที่ตรงกับ &quot;{browseQuery}&quot;
                                            </div>
                                        ) : (
                                            <div className="loc-province-grid">
                                                {displayedProvinces.map((prov) => (
                                                    <button
                                                        key={prov.nameEn}
                                                        className="loc-province-card-btn"
                                                        onClick={() => handleSelectProvince(prov)}
                                                        title={`${prov.name} (${prov.nameEn})`}
                                                    >
                                                        <div className="loc-card-pin-icon">
                                                            <MapPin size={16} />
                                                        </div>
                                                        <div className="loc-card-text-col">
                                                            <span className="loc-card-title">{prov.name}</span>
                                                            <span className="loc-card-subtitle">{prov.nameEn}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    /* Showing districts of the chosen province */
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                            <button
                                                className="loc-back-btn"
                                                onClick={handleBackToProvinces}
                                                title="ย้อนกลับไปเลือกจังหวัด"
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                                    อำเภอใน จ.{selectedProvince.name} ({provinceDistricts.length} อำเภอ)
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                    คลิกอำเภอที่ต้องการเพื่อดูพยากรณ์อากาศสด
                                                </div>
                                            </div>
                                        </div>

                                        {/* District Search Input */}
                                        <div className="loc-search-input-wrapper" style={{ marginBottom: '0.65rem' }}>
                                            <Search size={16} className="loc-search-icon" />
                                            <input
                                                type="text"
                                                className="loc-search-input"
                                                style={{ paddingLeft: '2.85rem', paddingRight: browseQuery ? '2.5rem' : '1rem' }}
                                                placeholder={`ค้นหาอำเภอใน จ.${selectedProvince.name}...`}
                                                value={browseQuery}
                                                onChange={(e) => setBrowseQuery(e.target.value)}
                                            />
                                            {browseQuery && (
                                                <button
                                                    className="loc-search-clear-btn"
                                                    onClick={() => setBrowseQuery('')}
                                                    title="ล้างข้อความค้นหา"
                                                >
                                                    <X size={15} />
                                                </button>
                                            )}
                                        </div>

                                        {displayedDistricts.length === 0 ? (
                                            <div className="loc-search-empty" style={{ padding: '2rem 1rem' }}>
                                                ไม่พบอำเภอที่ตรงกับ &quot;{browseQuery}&quot; ใน จ.{selectedProvince.name}
                                            </div>
                                        ) : (
                                            <div className="loc-district-grid">
                                                {displayedDistricts.map((d) => {
                                                    const isSelected = selectedTarget?.lat === d.lat && selectedTarget?.lon === d.lon;
                                                    const dName = d.name.startsWith('เขต') || d.name.startsWith('อำเภอ') ? d.name : `อำเภอ${d.name}`;
                                                    return (
                                                        <button
                                                            key={d.id}
                                                            className={`loc-district-card-btn ${isSelected ? 'active' : ''}`}
                                                            onClick={() => setSelectedTarget({
                                                                name: dName,
                                                                district: dName,
                                                                province: d.province,
                                                                region: d.regionName,
                                                                lat: d.lat,
                                                                lon: d.lon,
                                                            })}
                                                            title={`${dName} (${d.nameEn})`}
                                                        >
                                                            <div className="loc-card-pin-icon">
                                                                <MapPin size={16} />
                                                            </div>
                                                            <div className="loc-card-text-col">
                                                                <span className="loc-card-title">{dName}</span>
                                                                <span className="loc-card-subtitle">{d.nameEn}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Live Weather Preview & Confirm Card */}
                    <div className="loc-preview-col">
                        {selectedTarget ? (
                            <div className="loc-preview-card">
                                <span className="thai-preview-badge-region">
                                    {selectedTarget.province} {selectedTarget.region ? `• ${selectedTarget.region}` : ''}
                                </span>

                                <div style={{ marginTop: '0.4rem' }}>
                                    <h4 className="loc-preview-title">{selectedTarget.name}</h4>
                                    <div className="loc-preview-sub">
                                        พิกัด: {selectedTarget.lat.toFixed(2)}°N, {selectedTarget.lon.toFixed(2)}°E
                                    </div>
                                </div>

                                {/* Weather Box */}
                                <div className="thai-preview-weather-box" style={{ marginTop: '0.85rem' }}>
                                    {isLoadingPreview ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', gap: '0.5rem', color: 'var(--text-muted)' }}>
                                            <RefreshCw size={16} className="animate-spin" />
                                            <span style={{ fontSize: '0.82rem' }}>กำลังโหลดข้อมูลอากาศ...</span>
                                        </div>
                                    ) : previewWeather && weatherMeta ? (
                                        <>
                                            <div className="thai-preview-weather-top">
                                                <div>
                                                    <div className="thai-preview-temp" style={{ fontSize: '2.1rem' }}>
                                                        {previewWeather.temperature}°C
                                                    </div>
                                                    <div className="thai-preview-condition-text">
                                                        {weatherMeta.text}
                                                    </div>
                                                </div>
                                                {renderWeatherIcon(weatherMeta.icon, "thai-preview-condition-icon")}
                                            </div>

                                            <div className="thai-preview-metrics">
                                                <div className="thai-preview-metric-item">
                                                    <span className="thai-preview-metric-label">
                                                        <Thermometer size={12} style={{ display: 'inline', marginRight: 3 }} />
                                                        รู้สึกเหมือน
                                                    </span>
                                                    <span className="thai-preview-metric-val">
                                                        {previewWeather.apparent}°C
                                                    </span>
                                                </div>
                                                <div className="thai-preview-metric-item">
                                                    <span className="thai-preview-metric-label">
                                                        <Droplets size={12} style={{ display: 'inline', marginRight: 3 }} />
                                                        ความชื้น
                                                    </span>
                                                    <span className="thai-preview-metric-val">
                                                        {previewWeather.humidity}%
                                                    </span>
                                                </div>
                                                <div className="thai-preview-metric-item" style={{ gridColumn: 'span 2' }}>
                                                    <span className="thai-preview-metric-label">
                                                        <CloudRain size={12} style={{ display: 'inline', marginRight: 3 }} />
                                                        โอกาสฝนตกสูงสุดวันนี้
                                                    </span>
                                                    <span className="thai-preview-metric-val">
                                                        {previewWeather.rainChance}%
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '0.8rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                            คลิกเพื่อดูสภาพอากาศสด
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                    {isTargetActive ? (
                                        <div className="thai-preview-select-btn active-loc">
                                            <Check size={16} />
                                            <span>กำลังเป็นจุดพยากรณ์หลัก</span>
                                        </div>
                                    ) : (
                                        <button
                                            className="thai-preview-select-btn"
                                            onClick={handleConfirmTarget}
                                        >
                                            <MapPin size={16} />
                                            <span>เลือกสถานที่นี้ ({selectedTarget.name})</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="loc-preview-placeholder">
                                <MapPin size={32} style={{ color: 'var(--accent-cyan)', opacity: 0.5, marginBottom: '0.5rem' }} />
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                    ยังไม่ได้เลือกอำเภอ
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                                    คลิกเลือกอำเภอจากผลการค้นหาด้านซ้ายเพื่อดูพยากรณ์อากาศสด
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quota Full Replacement Dialog Overlay */}
                {pendingReplaceLoc && (
                    <div className="thai-replace-dialog-backdrop">
                        <div className="thai-replace-dialog">
                            <h3 className="thai-replace-dialog-title">
                                <AlertCircle size={20} />
                                <span>รายการสถานที่ครบโควตา {MAX_LOCATIONS} แห่ง</span>
                            </h3>
                            <p className="thai-replace-dialog-desc">
                                คุณมีสถานที่โปรดครบ {MAX_LOCATIONS} แห่งแล้ว กรุณาเลือกว่าต้องการแทนที่สถานที่เดิมด้วย{' '}
                                <strong style={{ color: 'var(--accent-cyan)' }}>
                                    {pendingReplaceLoc.name}
                                </strong>:
                            </p>

                            <div className="thai-replace-list">
                                {existingLocations.map((loc) => (
                                    <button
                                        key={loc.id}
                                        className="thai-replace-item-btn"
                                        onClick={() => handleConfirmReplace(loc.id)}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{loc.name}</div>
                                            {loc.district && (
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                    {loc.district}, {loc.province}
                                                </div>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>
                                            แทนที่อันนี้ ➜
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <button
                                className="thai-replace-cancel-btn"
                                onClick={() => setPendingReplaceLoc(null)}
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================
// LocationChips — shows selected locations as removable chips
// ============================================================
interface LocationChipsProps {
    locations: SavedLocation[];
    activeId: string;
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
    onAddClick: () => void;
    onMapClick?: () => void;
}

export function LocationChips({ locations, activeId, onSelect, onRemove, onAddClick, onMapClick }: LocationChipsProps) {
    return (
        <div className="loc-chips-bar">
            <div className="loc-chips-scroll">
                {locations.map((loc) => (
                    <div
                        key={loc.id}
                        className={`loc-chip ${loc.id === activeId ? 'active' : ''}`}
                        onClick={() => onSelect(loc.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(loc.id); }}
                    >
                        <MapPin size={14} />
                        <span className="loc-chip-name">{loc.name}</span>
                        {loc.district && loc.district !== loc.name && (
                            <span className="loc-chip-district">({loc.district})</span>
                        )}
                        <button
                            className="loc-chip-remove"
                            onClick={(e) => { e.stopPropagation(); onRemove(loc.id); }}
                            title="ลบสถานที่นี้"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {onMapClick && (
                    <button
                        className="loc-add-btn loc-map-btn"
                        onClick={onMapClick}
                        title="เปิดแผนที่ประเทศไทยเพื่อเลือกจังหวัด"
                        style={{
                            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.15))',
                            borderColor: 'rgba(6, 182, 212, 0.35)',
                            color: 'var(--accent-cyan)'
                        }}
                    >
                        <MapPin size={15} />
                        <span>แผนที่ประเทศไทย</span>
                    </button>
                )}
                {locations.length < MAX_LOCATIONS && (
                    <button className="loc-add-btn" onClick={onAddClick}>
                        <Plus size={16} />
                        <span>ค้นหา/เพิ่มอำเภอ</span>
                    </button>
                )}
            </div>
        </div>
    );
}

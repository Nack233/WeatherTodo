'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    X, MapPin, Search, Plus, RefreshCw, ZoomIn, ZoomOut,
    RotateCcw, Thermometer, Droplets, CloudRain, Sun,
    CloudSun, Cloud, CloudFog, CloudDrizzle, CloudLightning,
    Snowflake, AlertCircle, Check
} from 'lucide-react';
import {
    THAILAND_SVG_PROVINCES, SVG_VIEWBOX, type ThailandSvgProvince
} from '@/app/data/thailand-map-svg';
import {
    type SavedLocation, generateLocationId, MAX_LOCATIONS, REGIONS
} from '@/app/data/thailand-locations';
import { getDistrictsByProvince, type ThailandDistrict } from '@/app/data/thailand-districts';
import { getWeatherMeta } from '@/utils/weather-codes';

// Regional Color Mapping
const REGION_PALETTE: Record<string, string> = {
    north: '#10b981',     // Emerald
    northeast: '#f59e0b', // Amber
    central: '#3b82f6',   // Blue
    east: '#06b6d4',      // Cyan
    west: '#8b5cf6',      // Purple
    south: '#f43f5e',     // Rose
};

interface WeatherMiniData {
    temperature: number;
    apparent: number;
    humidity: number;
    weatherCode: number;
    rainChance: number;
}

interface ThailandMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectLocation: (loc: SavedLocation) => void;
    existingLocations: SavedLocation[];
    activeLocationId?: string;
    onReplaceLocation?: (oldId: string, newLoc: SavedLocation) => void;
}

export function ThailandMapModal({
    isOpen,
    onClose,
    onSelectLocation,
    existingLocations,
    activeLocationId,
    onReplaceLocation,
}: ThailandMapModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRegionId, setSelectedRegionId] = useState<string>('all');
    const [selectedProvince, setSelectedProvince] = useState<ThailandSvgProvince | null>(null);
    const [selectedDistrict, setSelectedDistrict] = useState<ThailandDistrict | null>(null);
    const [hoveredProvince, setHoveredProvince] = useState<ThailandSvgProvince | null>(null);
    
    // Zoom and pan
    const [zoom, setZoom] = useState<number>(1);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Weather preview data
    const [weatherPreview, setWeatherPreview] = useState<WeatherMiniData | null>(null);
    const [isLoadingWeather, setIsLoadingWeather] = useState(false);

    // Quota full replacement state
    const [pendingReplaceLocation, setPendingReplaceLocation] = useState<SavedLocation | null>(null);

    // Weather cache for preview to avoid spamming
    const previewCache = useRef<Map<string, { timestamp: number; data: WeatherMiniData }>>(new Map());

    // Reset when modal opens or closes
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setSelectedRegionId('all');
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setPendingReplaceLocation(null);
            setSelectedDistrict(null);

            // Default select the active location's province if matched, or Chanthaburi
            const active = existingLocations.find((l) => l.id === activeLocationId) || existingLocations[0];
            const activeProvName = active?.province || active?.name || 'จันทบุรี';
            const matched = THAILAND_SVG_PROVINCES.find((p) => p.name === activeProvName || activeProvName.includes(p.name));
            if (matched) {
                setSelectedProvince(matched);
            } else {
                setSelectedProvince(THAILAND_SVG_PROVINCES[0]);
            }
        }
    }, [isOpen, activeLocationId, existingLocations]);

    // Get all districts of the selected province
    const provinceDistricts = useMemo(() => {
        return selectedProvince ? getDistrictsByProvince(selectedProvince.name) : [];
    }, [selectedProvince]);

    // Fetch mini weather preview when selectedProvince or selectedDistrict changes
    useEffect(() => {
        if (!selectedProvince) {
            setWeatherPreview(null);
            return;
        }

        const targetLat = selectedDistrict?.lat ?? selectedProvince.lat;
        const targetLon = selectedDistrict?.lon ?? selectedProvince.lon;

        const cacheKey = `${targetLat.toFixed(2)}_${targetLon.toFixed(2)}`;
        const cached = previewCache.current.get(cacheKey);
        const now = Date.now();

        if (cached && now - cached.timestamp < 10 * 60 * 1000) {
            setWeatherPreview(cached.data);
            return;
        }

        let isCancelled = false;
        setIsLoadingWeather(true);

        const fetchPreview = async () => {
            try {
                const proxyUrl = `/api/weather?lat=${targetLat}&lon=${targetLon}`;
                const fallbackUrl = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code&hourly=precipitation_probability&timezone=Asia/Bangkok`;
                
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
                setWeatherPreview(miniData);
            } catch (err) {
                console.warn('Weather preview fetch error:', err);
                if (!isCancelled) {
                    setWeatherPreview(null);
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingWeather(false);
                }
            }
        };

        void fetchPreview();

        return () => {
            isCancelled = true;
        };
    }, [selectedProvince, selectedDistrict]);

    // Filter matching provinces
    const filteredProvinces = useMemo(() => {
        let list = THAILAND_SVG_PROVINCES;

        if (selectedRegionId !== 'all') {
            list = list.filter((p) => p.regionId === selectedRegionId);
        }

        if (searchQuery.trim().length > 0) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (p) => p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q)
            );
        }

        return list;
    }, [selectedRegionId, searchQuery]);

    // Handle Search Submit / Enter
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && filteredProvinces.length > 0) {
            setSelectedProvince(filteredProvinces[0]);
        }
    };

    // Zoom Handlers
    const handleZoomIn = () => setZoom((prev) => Math.min(2.5, prev + 0.25));
    const handleZoomOut = () => setZoom((prev) => Math.max(0.8, prev - 0.25));
    const handleResetZoom = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    // Pan Drag Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y,
        });
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    // Confirm selecting province or district
    const handleConfirmSelection = () => {
        if (!selectedProvince) return;

        const targetLat = selectedDistrict?.lat ?? selectedProvince.lat;
        const targetLon = selectedDistrict?.lon ?? selectedProvince.lon;
        const locationName = selectedDistrict
            ? (selectedDistrict.name.startsWith('เขต') || selectedDistrict.name.startsWith('อำเภอ') ? selectedDistrict.name : `อำเภอ${selectedDistrict.name}`)
            : selectedProvince.name;
        const districtName = selectedDistrict ? `อำเภอ${selectedDistrict.name}` : '';

        // Check if already in existingLocations
        const existing = existingLocations.find(
            (l) => selectedDistrict
                ? (l.name === locationName || l.district === districtName)
                : (l.province === selectedProvince.name && !l.district)
        );

        if (existing) {
            onSelectLocation(existing);
            onClose();
            return;
        }

        const newLoc: SavedLocation = {
            id: generateLocationId(),
            name: locationName,
            district: districtName,
            province: selectedProvince.name,
            region: selectedProvince.regionName,
            lat: targetLat,
            lon: targetLon,
        };

        if (existingLocations.length < MAX_LOCATIONS) {
            onSelectLocation(newLoc);
            onClose();
        } else {
            // Quota full -> show replacement dialog
            setPendingReplaceLocation(newLoc);
        }
    };

    const handleConfirmReplace = (oldLocationId: string) => {
        if (!pendingReplaceLocation) return;
        if (onReplaceLocation) {
            onReplaceLocation(oldLocationId, pendingReplaceLocation);
        } else {
            onSelectLocation(pendingReplaceLocation);
        }
        setPendingReplaceLocation(null);
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

    const weatherMeta = weatherPreview ? getWeatherMeta(weatherPreview.weatherCode) : null;
    const isCurrentActive = selectedProvince && existingLocations.some(
        (l) => l.id === activeLocationId && (l.province === selectedProvince.name || l.name === selectedProvince.name)
    );

    return (
        <div className="thai-map-modal-backdrop" onClick={onClose}>
            <div className="thai-map-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="thai-map-header">
                    <div className="thai-map-header-left">
                        <div className="thai-map-header-icon">
                            <MapPin size={22} />
                        </div>
                        <div>
                            <h2 className="thai-map-title">แผนที่เลือกจังหวัดประเทศไทย</h2>
                            <p className="thai-map-subtitle">
                                คลิกเลือกจังหวัดบนแผนที่ หรือค้นหาชื่อจังหวัดเพื่อดูพยากรณ์อากาศ
                            </p>
                        </div>
                    </div>
                    <button
                        className="thai-map-close-btn"
                        onClick={onClose}
                        title="ปิดหน้าต่างแผนที่"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Controls Bar: Search & Region Filters */}
                <div className="thai-map-controls">
                    <div className="thai-map-search-wrapper">
                        <Search size={16} className="thai-map-search-icon" />
                        <input
                            type="text"
                            className="thai-map-search-input"
                            style={{ paddingLeft: '2.85rem' }}
                            placeholder="ค้นหาจังหวัด (เช่น เชียงใหม่, ภูเก็ต)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                        />
                    </div>

                    <div className="thai-map-region-pills">
                        <button
                            className={`thai-map-region-btn ${selectedRegionId === 'all' ? 'active' : ''}`}
                            onClick={() => setSelectedRegionId('all')}
                        >
                            <span>🇹🇭 ทั้งหมด</span>
                        </button>
                        {REGIONS.map((reg) => (
                            <button
                                key={reg.id}
                                className={`thai-map-region-btn ${selectedRegionId === reg.id ? 'active' : ''}`}
                                onClick={() => setSelectedRegionId(reg.id)}
                            >
                                <span>{reg.icon}</span>
                                <span>{reg.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Modal Main Body (SVG Viewport + Side Preview Panel) */}
                <div className="thai-map-body">
                    {/* Viewport for SVG Map */}
                    <div
                        className="thai-map-viewport"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUpOrLeave}
                        onMouseLeave={handleMouseUpOrLeave}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                        {/* Hover Tooltip Badge */}
                        {hoveredProvince && (
                            <div className="thai-map-hover-badge">
                                <MapPin size={14} style={{ color: 'var(--accent-cyan, #06b6d4)' }} />
                                <span>{hoveredProvince.name}</span>
                                <span style={{ opacity: 0.6, fontSize: '0.78rem' }}>({hoveredProvince.nameEn})</span>
                            </div>
                        )}

                        {/* Zoom Controls */}
                        <div className="thai-map-zoom-tools" onClick={(e) => e.stopPropagation()}>
                            <button className="thai-map-zoom-btn" onClick={handleZoomIn} title="ซูมเข้า">
                                <ZoomIn size={18} />
                            </button>
                            <button className="thai-map-zoom-btn" onClick={handleZoomOut} title="ซูมออก">
                                <ZoomOut size={18} />
                            </button>
                            <button className="thai-map-zoom-btn" onClick={handleResetZoom} title="รีเซ็ตมุมมอง">
                                <RotateCcw size={16} />
                            </button>
                        </div>

                        {/* Interactive SVG Thailand Map */}
                        <div
                            className="thai-map-svg-container"
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            }}
                        >
                            <svg
                                viewBox={SVG_VIEWBOX}
                                className="thai-map-svg"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <g id="thailand-provinces">
                                    {THAILAND_SVG_PROVINCES.map((prov) => {
                                        const isSelected = selectedProvince?.id === prov.id;
                                        const isHovered = hoveredProvince?.id === prov.id;
                                        const isMatchedByFilter = filteredProvinces.some((p) => p.id === prov.id);
                                        const baseColor = REGION_PALETTE[prov.regionId] || '#3b82f6';

                                        let pathClass = 'thai-province-path';
                                        if (isSelected) pathClass += ' active';
                                        else if (!isMatchedByFilter) pathClass += ' dimmed';
                                        else if (searchQuery.trim().length > 0 && isMatchedByFilter) pathClass += ' highlighted';

                                        return (
                                            <path
                                                key={prov.id}
                                                d={prov.d}
                                                id={prov.id}
                                                fill={baseColor}
                                                className={pathClass}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedProvince(prov);
                                                }}
                                                onMouseEnter={() => setHoveredProvince(prov)}
                                                onMouseLeave={() => setHoveredProvince((curr) => curr?.id === prov.id ? null : curr)}
                                            >
                                                <title>{prov.name} ({prov.nameEn}) - {prov.regionName}</title>
                                            </path>
                                        );
                                    })}
                                </g>
                            </svg>
                        </div>
                    </div>

                    {/* Side Preview & Action Panel */}
                    <div className="thai-map-side-panel">
                        {selectedProvince ? (
                            <div className="thai-preview-content">
                                <span className="thai-preview-badge-region">
                                    {selectedProvince.regionName}
                                </span>

                                <div>
                                    <h3 className="thai-preview-title">
                                        {selectedDistrict
                                            ? (selectedDistrict.name.startsWith('เขต') || selectedDistrict.name.startsWith('อำเภอ') ? selectedDistrict.name : `อ.${selectedDistrict.name}`)
                                            : selectedProvince.name}
                                    </h3>
                                    <div className="thai-preview-title-en">
                                        {selectedDistrict ? `${selectedDistrict.nameEn}, ${selectedProvince.nameEn}` : selectedProvince.nameEn} • {(selectedDistrict?.lat ?? selectedProvince.lat).toFixed(2)}°N, {(selectedDistrict?.lon ?? selectedProvince.lon).toFixed(2)}°E
                                    </div>
                                </div>

                                {/* District Selector Chips */}
                                {provinceDistricts.length > 0 && (
                                    <div className="thai-preview-districts-section">
                                        <div className="thai-preview-districts-header">
                                            <span>📍 อำเภอในจังหวัด ({provinceDistricts.length})</span>
                                            {selectedDistrict && (
                                                <button
                                                    className="thai-district-reset-btn"
                                                    onClick={() => setSelectedDistrict(null)}
                                                >
                                                    ดูรวมทั้งจังหวัด
                                                </button>
                                            )}
                                        </div>
                                        <div className="thai-district-chips-scroll">
                                            <button
                                                className={`thai-district-chip ${!selectedDistrict ? 'active' : ''}`}
                                                onClick={() => setSelectedDistrict(null)}
                                            >
                                                ศูนย์กลางจังหวัด
                                            </button>
                                            {provinceDistricts.map((d) => (
                                                <button
                                                    key={d.id}
                                                    className={`thai-district-chip ${selectedDistrict?.id === d.id ? 'active' : ''}`}
                                                    onClick={() => setSelectedDistrict(d)}
                                                    title={`${d.name} (${d.nameEn})`}
                                                >
                                                    {d.name.startsWith('เขต') || d.name.startsWith('อำเภอ') ? d.name : `อ.${d.name}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Live Weather Mini Box */}
                                <div className="thai-preview-weather-box">
                                    {isLoadingWeather ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', gap: '0.6rem', color: 'var(--text-muted)' }}>
                                            <RefreshCw size={18} className="animate-spin" />
                                            <span style={{ fontSize: '0.85rem' }}>กำลังโหลดข้อมูลอากาศ...</span>
                                        </div>
                                    ) : weatherPreview && weatherMeta ? (
                                        <>
                                            <div className="thai-preview-weather-top">
                                                <div>
                                                    <div className="thai-preview-temp">
                                                        {weatherPreview.temperature}°C
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
                                                        {weatherPreview.apparent}°C
                                                    </span>
                                                </div>
                                                <div className="thai-preview-metric-item">
                                                    <span className="thai-preview-metric-label">
                                                        <Droplets size={12} style={{ display: 'inline', marginRight: 3 }} />
                                                        ความชื้น
                                                    </span>
                                                    <span className="thai-preview-metric-val">
                                                        {weatherPreview.humidity}%
                                                    </span>
                                                </div>
                                                <div className="thai-preview-metric-item" style={{ gridColumn: 'span 2' }}>
                                                    <span className="thai-preview-metric-label">
                                                        <CloudRain size={12} style={{ display: 'inline', marginRight: 3 }} />
                                                        โอกาสฝนตกสูงสุดวันนี้
                                                    </span>
                                                    <span className="thai-preview-metric-val">
                                                        {weatherPreview.rainChance}%
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            คลิกเพื่อดูพยากรณ์อากาศสด
                                        </div>
                                    )}
                                </div>

                                {/* Action Button */}
                                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                    {isCurrentActive ? (
                                        <div className="thai-preview-select-btn active-loc">
                                            <Check size={18} />
                                            <span>กำลังเป็นจุดพยากรณ์หลัก</span>
                                        </div>
                                    ) : (
                                        <button
                                            className="thai-preview-select-btn"
                                            onClick={handleConfirmSelection}
                                        >
                                            <MapPin size={18} />
                                            <span>
                                                เลือก{selectedDistrict 
                                                    ? ` ${selectedDistrict.name.startsWith('เขต') ? selectedDistrict.name : `อ.${selectedDistrict.name}`} (${selectedProvince.name})`
                                                    : ` ${selectedProvince.name}`}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="thai-preview-empty">
                                <div className="thai-preview-empty-icon">
                                    <MapPin size={28} />
                                </div>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                                    ยังไม่ได้เลือกจังหวัด
                                </h4>
                                <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                                    คลิกเลือกจังหวัดบนแผนที่ประเทศไทย หรือพิมพ์ค้นหาจากช่องด้านบน
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quota Full Replacement Dialog Overlay */}
                {pendingReplaceLocation && (
                    <div className="thai-replace-dialog-backdrop">
                        <div className="thai-replace-dialog">
                            <h3 className="thai-replace-dialog-title">
                                <AlertCircle size={20} />
                                <span>รายการสถานที่ครบโควตา {MAX_LOCATIONS} แห่ง</span>
                            </h3>
                            <p className="thai-replace-dialog-desc">
                                คุณมีสถานที่โปรดครบ {MAX_LOCATIONS} แห่งแล้ว กรุณาเลือกว่าต้องการแทนที่สถานที่ใดด้วย{' '}
                                <strong style={{ color: 'var(--accent-cyan)' }}>
                                    {pendingReplaceLocation.name}
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
                                onClick={() => setPendingReplaceLocation(null)}
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

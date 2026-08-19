'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, MapPin, Search, Plus, Loader2 } from 'lucide-react';
import {
    REGIONS, type Region, type Province, type SavedLocation,
    generateLocationId, MAX_LOCATIONS,
} from '@/app/data/thailand-locations';

// ============================================================
// Geocoding API helper — uses Open-Meteo geocoding
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

async function searchLocations(query: string): Promise<GeoResult[]> {
    if (!query || query.length < 2) return [];
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=15&language=th&country_code=TH`;
    try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || []) as GeoResult[];
    } catch {
        return [];
    }
}

// ============================================================
// LocationPickerModal
// ============================================================
interface LocationPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddLocation: (loc: SavedLocation) => void;
    existingLocations: SavedLocation[];
}

type PickerStep = 'region' | 'province' | 'search';

export function LocationPickerModal({
    isOpen, onClose, onAddLocation, existingLocations,
}: LocationPickerModalProps) {
    const [step, setStep] = useState<PickerStep>('region');
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
    const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep('region');
            setSelectedRegion(null);
            setSelectedProvince(null);
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isOpen]);

    // Focus search input when step changes to search
    useEffect(() => {
        if (step === 'search' && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [step]);

    // Debounced search
    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (value.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        debounceRef.current = setTimeout(async () => {
            const results = await searchLocations(value);
            setSearchResults(results);
            setIsSearching(false);
        }, 400);
    }, []);

    const handleRegionSelect = (region: Region) => {
        setSelectedRegion(region);
        setStep('province');
    };

    const handleProvinceSelect = (province: Province) => {
        setSelectedProvince(province);
        setStep('search');
        // Pre-fill search with province name
        setSearchQuery(province.name);
        setIsSearching(true);
        searchLocations(province.name).then((results) => {
            setSearchResults(results);
            setIsSearching(false);
        });
    };

    const handleAddFromSearch = (result: GeoResult) => {
        if (existingLocations.length >= MAX_LOCATIONS) return;

        const loc: SavedLocation = {
            id: generateLocationId(),
            name: result.admin3 || result.admin2 || result.name,
            district: result.admin2 || result.admin1 || '',
            province: result.admin1 || selectedProvince?.name || '',
            region: selectedRegion?.name || '',
            lat: result.latitude,
            lon: result.longitude,
        };
        onAddLocation(loc);
        onClose();
    };

    // Quick-add province itself (use province center coords)
    const handleAddProvince = (province: Province) => {
        if (existingLocations.length >= MAX_LOCATIONS) return;

        const loc: SavedLocation = {
            id: generateLocationId(),
            name: province.name,
            district: '',
            province: province.name,
            region: selectedRegion?.name || '',
            lat: province.lat,
            lon: province.lon,
        };
        onAddLocation(loc);
        onClose();
    };

    const handleBack = () => {
        if (step === 'search') {
            setStep('province');
            setSearchQuery('');
            setSearchResults([]);
        } else if (step === 'province') {
            setStep('region');
            setSelectedRegion(null);
        }
    };

    if (!isOpen) return null;

    const isFull = existingLocations.length >= MAX_LOCATIONS;

    return (
        <div className="loc-modal-backdrop" onClick={onClose}>
            <div className="loc-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="loc-modal-header">
                    <div className="loc-modal-header-left">
                        {step !== 'region' && (
                            <button className="loc-back-btn" onClick={handleBack}>
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <h3>
                            {step === 'region' && 'เลือกภูมิภาค'}
                            {step === 'province' && selectedRegion?.name}
                            {step === 'search' && `ค้นหาใน ${selectedProvince?.name || ''}`}
                        </h3>
                    </div>
                    <button className="loc-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Breadcrumb */}
                <div className="loc-breadcrumb">
                    <span
                        className={step === 'region' ? 'active' : 'clickable'}
                        onClick={() => { setStep('region'); setSelectedRegion(null); }}
                    >
                        ภูมิภาค
                    </span>
                    {selectedRegion && (
                        <>
                            <span className="loc-breadcrumb-sep">›</span>
                            <span
                                className={step === 'province' ? 'active' : 'clickable'}
                                onClick={() => { setStep('province'); }}
                            >
                                {selectedRegion.name}
                            </span>
                        </>
                    )}
                    {selectedProvince && step === 'search' && (
                        <>
                            <span className="loc-breadcrumb-sep">›</span>
                            <span className="active">{selectedProvince.name}</span>
                        </>
                    )}
                </div>

                {isFull && (
                    <div className="loc-limit-warning">
                        ⚠️ เพิ่มสถานที่ได้สูงสุด {MAX_LOCATIONS} แห่ง กรุณาลบสถานที่เดิมก่อน
                    </div>
                )}

                {/* Body */}
                <div className="loc-modal-body">
                    {/* Step 1: Region Selection */}
                    {step === 'region' && (
                        <div className="loc-region-grid">
                            {REGIONS.map((region) => (
                                <button
                                    key={region.id}
                                    className="loc-region-card"
                                    onClick={() => handleRegionSelect(region)}
                                    style={{ '--region-gradient': region.color } as React.CSSProperties}
                                >
                                    <span className="loc-region-icon">{region.icon}</span>
                                    <span className="loc-region-name">{region.name}</span>
                                    <span className="loc-region-count">{region.provinces.length} จังหวัด</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Province Selection */}
                    {step === 'province' && selectedRegion && (
                        <div className="loc-province-list">
                            {selectedRegion.provinces.map((province) => (
                                <div key={province.nameEn} className="loc-province-item">
                                    <button
                                        className="loc-province-btn"
                                        onClick={() => handleProvinceSelect(province)}
                                    >
                                        <MapPin size={16} />
                                        <span className="loc-province-name">{province.name}</span>
                                        <span className="loc-province-name-en">{province.nameEn}</span>
                                    </button>
                                    <button
                                        className="loc-quick-add-btn"
                                        onClick={() => handleAddProvince(province)}
                                        disabled={isFull}
                                        title={`เพิ่ม ${province.name} (ศูนย์กลางจังหวัด)`}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 3: Search District/Subdistrict */}
                    {step === 'search' && (
                        <div className="loc-search-panel">
                            <div className="loc-search-input-wrapper">
                                <Search size={18} className="loc-search-icon" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    className="loc-search-input"
                                    placeholder="ค้นหาอำเภอ, ตำบล, หรือสถานที่..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                />
                                {isSearching && <Loader2 size={18} className="loc-search-spinner animate-spin" />}
                            </div>

                            <div className="loc-search-results">
                                {searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
                                    <div className="loc-search-empty">
                                        ไม่พบผลลัพธ์สำหรับ &quot;{searchQuery}&quot;
                                    </div>
                                )}
                                {searchResults.map((result) => {
                                    const subtitle = [result.admin3, result.admin2, result.admin1]
                                        .filter(Boolean)
                                        .join(', ');
                                    return (
                                        <button
                                            key={`${result.id}-${result.latitude}-${result.longitude}`}
                                            className="loc-search-result-item"
                                            onClick={() => handleAddFromSearch(result)}
                                            disabled={isFull}
                                        >
                                            <MapPin size={16} className="loc-result-icon" />
                                            <div className="loc-result-info">
                                                <span className="loc-result-name">{result.name}</span>
                                                {subtitle && <span className="loc-result-sub">{subtitle}</span>}
                                            </div>
                                            <span className="loc-result-coords">
                                                {result.latitude.toFixed(2)}°, {result.longitude.toFixed(2)}°
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
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
}

export function LocationChips({ locations, activeId, onSelect, onRemove, onAddClick }: LocationChipsProps) {
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
                        {loc.district && <span className="loc-chip-district">({loc.district})</span>}
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
            {locations.length < MAX_LOCATIONS && (
                <button className="loc-add-btn" onClick={onAddClick}>
                    <Plus size={16} />
                    <span>เพิ่มสถานที่</span>
                </button>
            )}
        </div>
    );
}

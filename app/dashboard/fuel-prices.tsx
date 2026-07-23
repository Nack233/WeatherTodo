'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Fuel, Globe, BadgeInfo, Clock3, Database, ChevronRight } from 'lucide-react';
import { groupFuelRows, type FuelBrandBlock, type FuelPriceSnapshot } from '@/app/actions/fuel-actions';

export default function FuelPrices() {
    const [data, setData] = useState<FuelPriceSnapshot | null>(null);
    const [brandBlocks, setBrandBlocks] = useState<FuelBrandBlock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/fuel-prices', { cache: 'no-store' });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.error || 'โหลดราคาน้ำมันไม่สำเร็จ');
            }

            const snapshot = payload as FuelPriceSnapshot;
            setData(snapshot);
            setBrandBlocks(groupFuelRows(snapshot.rows));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'โหลดราคาน้ำมันไม่สำเร็จ');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="fuel-prices-page">
            <div className="fuel-hero card">
                <div className="fuel-hero-top">
                    <div>
                        <span className="fuel-kicker">EPPO Fuel Monitor</span>
                        <h2 className="fuel-title">ราคาน้ำมันขายปลีกตาม 3 แบรนด์</h2>
                        <p className="fuel-subtitle">อ่านจากตารางที่ซิงก์เข้าฐานข้อมูลทุกวันตอน 07:00 น.</p>
                    </div>
                    <button className="btn btn-primary fuel-refresh-btn" onClick={loadData} disabled={isLoading}>
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        รีเฟรชข้อมูล
                    </button>
                </div>

                <div className="fuel-hero-metrics">
                    <div className="fuel-metric">
                        <Clock3 size={16} />
                        <div>
                            <span className="label">อัปเดตล่าสุด</span>
                            <strong>{data?.updatedLabel ?? 'กำลังโหลดข้อมูล...'}</strong>
                        </div>
                    </div>
                    <div className="fuel-metric">
                        <Database size={16} />
                        <div>
                            <span className="label">แหล่งข้อมูล</span>
                            <strong>Supabase fuel_prices</strong>
                        </div>
                    </div>
                    <div className="fuel-metric">
                        <Globe size={16} />
                        <div>
                            <span className="label">ต้นทาง</span>
                            <strong>EPPO API</strong>
                        </div>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="card fuel-error-card">{error}</div>
            ) : null}

            {isLoading ? (
                <div className="card fuel-loading-card">
                    <div className="empty-state-text">กำลังโหลดข้อมูลจาก EPPO...</div>
                </div>
            ) : brandBlocks.length ? (
                <div className="fuel-brand-grid">
                    {brandBlocks.map((brand) => (
                        <div className="card fuel-brand-card" key={brand.brand} style={{ borderTopColor: brand.accent }}>
                            <div className="fuel-brand-header">
                                <div>
                                    <span className="fuel-brand-badge" style={{ background: brand.accent }}>
                                        {brand.badge}
                                    </span>
                                    <h3>{brand.brand}</h3>
                                </div>
                                <ChevronRight size={18} />
                            </div>

                            <div className="fuel-brand-price">
                                <span className="label">ราคาน้ำมันที่มีข้อมูล</span>
                                <strong>{brand.items.length} รายการ</strong>
                            </div>

                            <div className="fuel-brand-list">
                                {brand.items.map((item) => (
                                    <div className="fuel-item-row" key={`${brand.brand}-${item.fuelType}`}>
                                        <div className="fuel-item-name">{item.fuelType}</div>
                                        <div className="fuel-item-price">฿{item.price.toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                ) : (
                <div className="card fuel-loading-card">
                    <div className="empty-state-text">ไม่พบข้อมูลราคาน้ำมันจากหน้า EPPO</div>
                </div>
            )}
        </div>
    );
}
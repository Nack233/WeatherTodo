import React from 'react';

export default function RegisterLoading() {
    return (
        <div className="auth-container">
            <div className="card auth-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center', width: '100%', maxWidth: '440px' }}>
                <div className="skeleton-box skeleton-circle" style={{ width: '48px', height: '48px', margin: '0 auto' }} />
                <div className="skeleton-box" style={{ width: '150px', height: '22px' }} />
                <div className="skeleton-box" style={{ width: '230px', height: '14px' }} />

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div className="skeleton-box" style={{ width: '100%', height: '42px', borderRadius: '8px' }} />
                    <div className="skeleton-box" style={{ width: '100%', height: '42px', borderRadius: '8px' }} />
                    <div className="skeleton-box" style={{ width: '100%', height: '42px', borderRadius: '8px' }} />
                    <div className="skeleton-box" style={{ width: '100%', height: '42px', borderRadius: '8px' }} />
                    <div className="skeleton-box" style={{ width: '100%', height: '44px', borderRadius: '8px', marginTop: '0.5rem' }} />
                </div>
            </div>
        </div>
    );
}

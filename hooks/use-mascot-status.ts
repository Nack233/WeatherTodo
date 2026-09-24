'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLineAccountStatus, type LineAccountStatus } from '@/app/actions/line-actions';

export function useMascotStatus(userEmail = '') {
    const [status, setStatus] = useState<LineAccountStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const commandText = `ผูกบัญชี ${userEmail}`;

    const checkStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getLineAccountStatus();
            if (res.data) {
                setStatus(res.data);
            }
        } catch {
            // Ignore error
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void checkStatus();
    }, [checkStatus]);

    const handleCopyCommand = async () => {
        try {
            await navigator.clipboard.writeText(commandText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback
        }
    };

    return {
        status,
        isLoading,
        copied,
        commandText,
        checkStatus,
        handleCopyCommand,
    };
}

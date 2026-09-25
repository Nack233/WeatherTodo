'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getLineAccountStatus,
    getActivePairingCode,
    generateLinePairingCode,
    type LineAccountStatus
} from '@/app/actions/line-actions';

export function useMascotStatus(userEmail = '') {
    const [status, setStatus] = useState<LineAccountStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);

    const commandText = pairingCode
        ? `ผูกบัญชี ${pairingCode}`
        : `ผูกบัญชี ${userEmail}`;

    const checkStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getLineAccountStatus();
            if (res.data) {
                setStatus(res.data);
            }

            // If not linked, check active pairing code or generate one
            if (!res.data?.isLinked) {
                const codeRes = await getActivePairingCode();
                if (codeRes.data) {
                    setPairingCode(codeRes.data.code);
                    setCodeExpiresAt(codeRes.data.expiresAt);
                } else {
                    const newCode = await generateLinePairingCode();
                    if (newCode.data) {
                        setPairingCode(newCode.data.code);
                        setCodeExpiresAt(newCode.data.expiresAt);
                    }
                }
            }
        } catch {
            // Ignore error
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleGenerateNewCode = async () => {
        setIsGeneratingCode(true);
        try {
            const res = await generateLinePairingCode();
            if (res.data) {
                setPairingCode(res.data.code);
                setCodeExpiresAt(res.data.expiresAt);
            }
        } catch {
            // Ignore error
        } finally {
            setIsGeneratingCode(false);
        }
    };

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
        pairingCode,
        codeExpiresAt,
        isGeneratingCode,
        checkStatus,
        handleGenerateNewCode,
        handleCopyCommand,
    };
}


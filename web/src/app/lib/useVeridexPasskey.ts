"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// NO top-level imports from @veridex/sdk — barrel export causes SSR init crash.
// All SDK access via dynamic import (same pattern as sera/dashboard).

/**
 * Minimal credential shape matching the SDK's PasskeyCredential.
 * Declared locally to avoid importing the type at module scope.
 */
export interface PasskeyCredential {
    credentialId: string;
    publicKeyX: bigint;
    publicKeyY: bigint;
    keyHash: string;
}

const STORAGE_KEY = "auvra_veridex_credential";
const STORAGE_ALL_KEY = "auvra_veridex_credentials";

/** Serialisable shape for localStorage (BigInts → strings). */
interface StoredCredential {
    credentialId: string;
    publicKeyX: string;
    publicKeyY: string;
    keyHash: string;
    label?: string;
    createdAt?: number;
}

/** Lazily load the SDK module (client-side only). */
let sdkPromise: Promise<typeof import("@veridex/sdk")> | null = null;
function loadSDK() {
    if (!sdkPromise) {
        sdkPromise = import("@veridex/sdk");
    }
    return sdkPromise;
}

/**
 * Ensure PasskeyManager is initialised (lazy, deduped).
 * Called at the start of every action — no race condition.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let managerInstance: any = null;
async function getManager() {
    if (managerInstance) return managerInstance;
    const { PasskeyManager } = await loadSDK();
    managerInstance = new PasskeyManager({
        rpName: "Auvra by Veridex",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
    });
    return managerInstance;
}

/**
 * React hook wrapping the Veridex SDK PasskeyManager.
 *
 * Provides `register` (new passkey) and `authenticate` (existing passkey)
 * flows that produce a real WebAuthn PasskeyCredential. Falls back to
 * this when the thirdweb passkey flow fails ("No challenge received").
 */
export function useVeridexPasskey() {
    const [credential, setCredential] = useState<PasskeyCredential | null>(null);
    const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [supported, setSupported] = useState(true);
    const [ready, setReady] = useState(false);

    // ── Helpers: persist entire credential list ──

    const persistAll = (creds: PasskeyCredential[]) => {
        try {
            const serialised: StoredCredential[] = creds.map((c) => ({
                credentialId: c.credentialId,
                publicKeyX: c.publicKeyX.toString(),
                publicKeyY: c.publicKeyY.toString(),
                keyHash: c.keyHash,
                createdAt: Date.now(),
            }));
            localStorage.setItem(STORAGE_ALL_KEY, JSON.stringify(serialised));
        } catch { /* storage full / private mode */ }
    };

    const persistActive = (cred: PasskeyCredential) => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    credentialId: cred.credentialId,
                    publicKeyX: cred.publicKeyX.toString(),
                    publicKeyY: cred.publicKeyY.toString(),
                    keyHash: cred.keyHash,
                }),
            );
        } catch { /* storage full / private mode */ }
    };

    const deserialise = (data: StoredCredential): PasskeyCredential => ({
        credentialId: data.credentialId,
        publicKeyX: BigInt(data.publicKeyX),
        publicKeyY: BigInt(data.publicKeyY),
        keyHash: data.keyHash,
    });

    const addToList = (cred: PasskeyCredential) => {
        setCredentials((prev) => {
            if (prev.some((c) => c.credentialId === cred.credentialId)) return prev;
            const next = [...prev, cred];
            persistAll(next);
            return next;
        });
    };

    // Warm-up: start loading the SDK on mount (non-blocking)
    useEffect(() => {
        (async () => {
            try {
                await getManager();
                const { PasskeyManager } = await loadSDK();
                setSupported(PasskeyManager.isSupported());
                setReady(true);
            } catch (err) {
                console.warn("Veridex SDK PasskeyManager init failed:", err);
                setSupported(false);
            }
        })();

        // Rehydrate all stored credentials
        try {
            const rawAll = localStorage.getItem(STORAGE_ALL_KEY);
            if (rawAll) {
                const parsed: StoredCredential[] = JSON.parse(rawAll);
                setCredentials(parsed.map(deserialise));
            }
        } catch { /* ignore */ }

        // Rehydrate last-active credential
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data: StoredCredential = JSON.parse(stored);
                setCredential(deserialise(data));
            }
        } catch { /* ignore */ }
    }, []);

    /**
     * Register a brand-new passkey (WebAuthn ceremony).
     * Adds to multi-credential store automatically.
     * Returns the credential or throws.
     */
    const register = useCallback(async (username = "auvra-admin") => {
        setLoading(true);
        setError(null);
        try {
            const manager = await getManager();
            const cred = await manager.register(username, username);
            setCredential(cred);
            persistActive(cred);
            addToList(cred);
            return cred;
        } catch (err: any) {
            const msg = err?.message ?? "Passkey registration failed";
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Authenticate with an existing discoverable passkey.
     * Adds to multi-credential store automatically.
     * Returns the credential or throws.
     */
    const authenticate = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const manager = await getManager();
            const result = await manager.authenticate();
            setCredential(result.credential);
            persistActive(result.credential);
            addToList(result.credential);
            return result.credential;
        } catch (err: any) {
            const msg = err?.message ?? "Passkey authentication failed";
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Remove a credential from the multi-credential store by ID.
     */
    const removeCredential = useCallback((credentialId: string) => {
        setCredentials((prev) => {
            const next = prev.filter((c) => c.credentialId !== credentialId);
            persistAll(next);
            return next;
        });
        // If the removed credential is the active one, clear it
        setCredential((prev) => {
            if (prev?.credentialId === credentialId) {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
            return prev;
        });
    }, []);

    /**
     * Set a specific stored credential as the active one.
     */
    const selectCredential = useCallback((credentialId: string) => {
        setCredentials((prev) => {
            const target = prev.find((c) => c.credentialId === credentialId);
            if (target) {
                setCredential(target);
                persistActive(target);
            }
            return prev;
        });
    }, []);

    /**
     * Convert the credential to the shape the ai-worker /api/config expects
     * (hex strings instead of BigInts, for JSON serialisation).
     */
    const toAgentConfig = useCallback(
        (cred: PasskeyCredential) => ({
            credentialId: cred.credentialId,
            publicKeyX: `0x${cred.publicKeyX.toString(16).padStart(64, "0")}`,
            publicKeyY: `0x${cred.publicKeyY.toString(16).padStart(64, "0")}`,
            keyHash: cred.keyHash,
        }),
        [],
    );

    return {
        credential,
        /** All credentials stored in this browser. */
        credentials,
        loading,
        error,
        supported,
        ready,
        register,
        authenticate,
        toAgentConfig,
        /** Remove a stored credential by ID. */
        removeCredential,
        /** Switch the active credential to a different stored one. */
        selectCredential,
    };
}

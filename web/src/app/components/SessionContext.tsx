"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useRef,
    type ReactNode,
} from "react";

// ── Types ────────────────────────────────────────────

export type AuthMethod = "thirdweb" | "veridex" | null;

export interface SessionCredential {
    credentialId: string;
    publicKeyX: string;
    publicKeyY: string;
    keyHash: string;
}

export interface AuvraSettings {
    aiWorkerUrl: string;
    sessionTimeoutMinutes: number;
    autoTrigger: boolean;
    notificationsEnabled: boolean;
    agentSpendLimitUsdc: number;
    targetProtocol: string;
    targetChain: string;
    customTargetAddress: string;
    // Demo tuning (pushed to AI worker at runtime)
    demoFrequencyBlocks: number;
    demoFlashLoanEth: number;
    threatThreshold: number;
    aiTemperature: number;
    scanIntervalMs: number;
    highValueThresholdEth: number;
}

export interface SessionState {
    isAuthenticated: boolean;
    vaultAddress: string | null;
    authMethod: AuthMethod;
    credential: SessionCredential | null;
    /** All credentials registered/used in this browser (persisted across sessions). */
    credentials: SessionCredential[];
    sessionStartedAt: number | null;
    settings: AuvraSettings;
}

interface SessionContextValue extends SessionState {
    login: (
        credential: SessionCredential,
        vaultAddress: string,
        method: AuthMethod,
    ) => void;
    logout: () => void;
    updateSettings: (patch: Partial<AuvraSettings>) => void;
    /** Add a credential to the persistent multi-credential store. */
    addCredential: (cred: SessionCredential) => void;
    /** Remove a credential by its credentialId. */
    removeCredential: (credentialId: string) => void;
    /** Switch the active session to a different stored credential. */
    switchCredential: (credentialId: string) => void;
    sessionTimeRemaining: number; // seconds
}

// ── Defaults ─────────────────────────────────────────

const DEFAULT_SETTINGS: AuvraSettings = {
    aiWorkerUrl:
        typeof window !== "undefined"
            ? localStorage.getItem("auvra_ai_worker_url") ||
            process.env.NEXT_PUBLIC_AI_WORKER_URL ||
            "http://localhost:4000"
            : "http://localhost:4000",
    sessionTimeoutMinutes: 30,
    autoTrigger: false,
    notificationsEnabled: true,
    agentSpendLimitUsdc: 1.0,
    targetProtocol: "Chainlink CCIP",
    targetChain: "Base Sepolia",
    customTargetAddress: "",
    demoFrequencyBlocks: 10,
    demoFlashLoanEth: 50000,
    threatThreshold: 0.8,
    aiTemperature: 0.1,
    scanIntervalMs: 12000,
    highValueThresholdEth: 0.01,
};

const STORAGE_SESSION = "auvra_session";
const STORAGE_SETTINGS = "auvra_settings";
const STORAGE_CREDENTIALS = "auvra_credentials";

// ── Context ──────────────────────────────────────────

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error("useSession must be used within <SessionProvider>");
    return ctx;
}

// ── Provider ─────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<SessionState>(() => {
        // Rehydrate from localStorage
        if (typeof window === "undefined") {
            return {
                isAuthenticated: false,
                vaultAddress: null,
                authMethod: null,
                credential: null,
                credentials: [],
                sessionStartedAt: null,
                settings: DEFAULT_SETTINGS,
            };
        }

        let settings = DEFAULT_SETTINGS;
        try {
            const raw = localStorage.getItem(STORAGE_SETTINGS);
            if (raw) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        } catch { /* ignore */ }

        // Rehydrate multi-credential store
        let credentials: SessionCredential[] = [];
        try {
            const raw = localStorage.getItem(STORAGE_CREDENTIALS);
            if (raw) credentials = JSON.parse(raw);
        } catch { /* ignore */ }

        let session: Omit<SessionState, "settings"> = {
            isAuthenticated: false,
            vaultAddress: null,
            authMethod: null,
            credential: null,
            credentials,
            sessionStartedAt: null,
        };
        try {
            const raw = localStorage.getItem(STORAGE_SESSION);
            if (raw) {
                const parsed = JSON.parse(raw);
                const elapsed = (Date.now() - (parsed.sessionStartedAt ?? 0)) / 1000 / 60;
                if (elapsed < settings.sessionTimeoutMinutes) {
                    session = { ...parsed, credentials, isAuthenticated: true };
                } else {
                    localStorage.removeItem(STORAGE_SESSION);
                }
            }
        } catch { /* ignore */ }

        return { ...session, settings };
    });

    const [timeRemaining, setTimeRemaining] = useState(0);
    const activityRef = useRef(Date.now());

    // ── Persist settings ──
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(state.settings));
        } catch { /* ignore */ }
    }, [state.settings]);

    // ── Persist session ──
    useEffect(() => {
        if (state.isAuthenticated) {
            try {
                localStorage.setItem(
                    STORAGE_SESSION,
                    JSON.stringify({
                        vaultAddress: state.vaultAddress,
                        authMethod: state.authMethod,
                        credential: state.credential,
                        sessionStartedAt: state.sessionStartedAt,
                    }),
                );
            } catch { /* ignore */ }
        }
    }, [state.isAuthenticated, state.vaultAddress, state.authMethod, state.credential, state.sessionStartedAt]);

    // ── Persist credentials array ──
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_CREDENTIALS, JSON.stringify(state.credentials));
        } catch { /* ignore */ }
    }, [state.credentials]);

    // ── Activity tracking for session timeout ──
    useEffect(() => {
        const bump = () => { activityRef.current = Date.now(); };
        window.addEventListener("mousemove", bump, { passive: true });
        window.addEventListener("keydown", bump, { passive: true });
        window.addEventListener("click", bump, { passive: true });
        return () => {
            window.removeEventListener("mousemove", bump);
            window.removeEventListener("keydown", bump);
            window.removeEventListener("click", bump);
        };
    }, []);

    // ── Session timeout ticker ──
    useEffect(() => {
        if (!state.isAuthenticated) return;

        const interval = setInterval(() => {
            const idleSeconds = (Date.now() - activityRef.current) / 1000;
            const timeoutSeconds = state.settings.sessionTimeoutMinutes * 60;
            const remaining = Math.max(0, timeoutSeconds - idleSeconds);
            setTimeRemaining(Math.round(remaining));

            if (remaining <= 0) {
                // Auto-logout
                setState((prev) => ({
                    ...prev,
                    isAuthenticated: false,
                    vaultAddress: null,
                    authMethod: null,
                    credential: null,
                    sessionStartedAt: null,
                }));
                localStorage.removeItem(STORAGE_SESSION);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [state.isAuthenticated, state.settings.sessionTimeoutMinutes]);

    // ── Actions ──

    const login = useCallback(
        (credential: SessionCredential, vaultAddress: string, method: AuthMethod) => {
            activityRef.current = Date.now();
            setState((prev) => {
                // Auto-add to multi-credential store (dedup by credentialId)
                const exists = prev.credentials.some((c) => c.credentialId === credential.credentialId);
                const credentials = exists
                    ? prev.credentials
                    : [...prev.credentials, credential];
                return {
                    ...prev,
                    isAuthenticated: true,
                    vaultAddress,
                    authMethod: method,
                    credential,
                    credentials,
                    sessionStartedAt: Date.now(),
                };
            });
        },
        [],
    );

    const logout = useCallback(() => {
        setState((prev) => ({
            ...prev,
            isAuthenticated: false,
            vaultAddress: null,
            authMethod: null,
            credential: null,
            sessionStartedAt: null,
            // credentials array is preserved across logouts
        }));
        localStorage.removeItem(STORAGE_SESSION);
    }, []);

    const addCredential = useCallback((cred: SessionCredential) => {
        setState((prev) => {
            if (prev.credentials.some((c) => c.credentialId === cred.credentialId)) return prev;
            return { ...prev, credentials: [...prev.credentials, cred] };
        });
    }, []);

    const removeCredential = useCallback((credentialId: string) => {
        setState((prev) => ({
            ...prev,
            credentials: prev.credentials.filter((c) => c.credentialId !== credentialId),
            // If the removed credential is the active one, deauth
            ...(prev.credential?.credentialId === credentialId
                ? { isAuthenticated: false, credential: null, vaultAddress: null, authMethod: null, sessionStartedAt: null }
                : {}),
        }));
    }, []);

    const switchCredential = useCallback((credentialId: string) => {
        setState((prev) => {
            const target = prev.credentials.find((c) => c.credentialId === credentialId);
            if (!target) return prev;
            activityRef.current = Date.now();
            // Derive vault address from keyHash (same logic as dashboard)
            const vaultAddress = target.keyHash.startsWith("0x")
                ? `0x${target.keyHash.slice(2, 42)}`
                : `0x${target.keyHash.slice(0, 40)}`;
            return {
                ...prev,
                isAuthenticated: true,
                credential: target,
                vaultAddress,
                sessionStartedAt: Date.now(),
            };
        });
    }, []);

    const updateSettings = useCallback((patch: Partial<AuvraSettings>) => {
        setState((prev) => ({
            ...prev,
            settings: { ...prev.settings, ...patch },
        }));
    }, []);

    return (
        <SessionContext.Provider
            value={{
                ...state,
                login,
                logout,
                updateSettings,
                addCredential,
                removeCredential,
                switchCredential,
                sessionTimeRemaining: timeRemaining,
            }}
        >
            {children}
        </SessionContext.Provider>
    );
}

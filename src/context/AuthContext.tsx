// Path:    src/context/AuthContext.tsx
// Purpose: Auth context — manages Supabase session + user profile.
//          Shares same Supabase auth as yplabs (council_users table).
//
// ypwork reads from the SAME `council_users` table that yplabs uses,
// so the same login works for both apps. Only requirement: the user
// must be `approved = true` and `disabled = false`.

'use client';

import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';
import {
  getCachedProfileSync,
  getCachedProfile,
  setCachedProfile,
  clearCachedProfile,
  refreshCookieTTL,
} from '@/lib/profileCache';
import type { UserProfile } from '@/lib/types';

type AuthCtx = {
  loading: boolean;
  user: UserProfile | null;
  isMember: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  recoveryFailed: boolean;
  recoveryReason: string | null;
};

const AuthContext = createContext<AuthCtx>({
  loading: true,
  user: null,
  isMember: false,
  refresh: async () => {},
  signOut: async () => {},
  recoveryFailed: false,
  recoveryReason: null,
});

export function useAuth() { return useContext(AuthContext); }

// ─── Helpers ──────────────────────────────────────────────────────

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms)),
  ]);
}

async function fetchProfileDB(uid: string): Promise<UserProfile | null> {
  try {
    const sb = getBrowserSupabase();
    const { data, error } = await withTimeout(
      sb.from('council_users')
        .select('auth_uid,full_name,student_id,email,year,role,account_type,approved,disabled,avatar_url')
        .eq('auth_uid', uid)
        .limit(1)
        .maybeSingle(),
      5_000
    );
    if (error || !data) return null;
    if (!data.approved || data.disabled) return null;
    // Patch: council_users doesn't always have email column populated
    if (!data.email) data.email = '';
    return data as UserProfile;
  } catch {
    return null;
  }
}

// ─── AuthProvider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => getCachedProfileSync());
  const [loading, setLoading] = useState<boolean>(() => getCachedProfileSync() === null);
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  const [recoveryReason, setRecoveryReason] = useState<string | null>(null);

  const validating = useRef(false);

  async function backgroundValidate(uid: string) {
    if (validating.current) return;
    validating.current = true;
    try {
      const profile = await fetchProfileDB(uid);
      if (profile) {
        setCachedProfile(profile);
        setUser(profile);
      } else {
        clearCachedProfile();
        setUser(null);
        setRecoveryFailed(true);
        setRecoveryReason('บัญชีถูกปิดหรือไม่พบในระบบ');
        try { await getBrowserSupabase().auth.signOut(); } catch { /* ignore */ }
      }
    } catch {
      // Network error — keep cached state
    } finally {
      validating.current = false;
    }
  }

  useEffect(() => {
    let mounted = true;

    const safetyTimer = loading ? setTimeout(() => {
      if (!mounted) return;
      setUser(null);
      setLoading(false);
      setRecoveryFailed(true);
      setRecoveryReason('โหลดข้อมูลไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่');
    }, 8_000) : null;

    let sub: { unsubscribe: () => void } | null = null;

    try {
      const sb = getBrowserSupabase();

      const { data } = sb.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if (safetyTimer) clearTimeout(safetyTimer);

        // ── INITIAL_SESSION ─────────────────────────────────────
        if (event === 'INITIAL_SESSION') {
          if (!session?.user) {
            if (user) {
              clearCachedProfile();
              setUser(null);
            }
            setLoading(false);
            return;
          }

          const uid = session.user.id;
          const cached = getCachedProfile(uid);

          if (cached) {
            if (user?.auth_uid !== uid) setUser(cached);
            setLoading(false);
            void backgroundValidate(uid);
          } else {
            try {
              const profile = await withTimeout(fetchProfileDB(uid), 6_000);
              if (!mounted) return;
              if (profile) {
                setCachedProfile(profile);
                setUser(profile);
                setRecoveryFailed(false);
                setRecoveryReason(null);
              } else {
                clearCachedProfile();
                setUser(null);
                setRecoveryFailed(true);
                setRecoveryReason('ไม่พบข้อมูลโปรไฟล์ หรือบัญชีถูกปิด');
              }
            } catch {
              if (!mounted) return;
              setUser(null);
              setRecoveryFailed(true);
              setRecoveryReason('โหลดข้อมูลล้มเหลว กรุณาเข้าสู่ระบบใหม่');
            }
            if (mounted) setLoading(false);
          }
          return;
        }

        // ── SIGNED_IN ───────────────────────────────────────────
        if (event === 'SIGNED_IN') {
          if (!session?.user) return;
          const uid = session.user.id;
          const cached = getCachedProfile(uid);
          if (cached) {
            setUser(cached);
          } else {
            try {
              const profile = await withTimeout(fetchProfileDB(uid), 6_000);
              if (!mounted) return;
              if (profile) { setCachedProfile(profile); setUser(profile); }
              else setUser(null);
            } catch { /* ignore */ }
          }
          setRecoveryFailed(false);
          setRecoveryReason(null);
          if (mounted) setLoading(false);
          return;
        }

        // ── TOKEN_REFRESHED ─────────────────────────────────────
        if (event === 'TOKEN_REFRESHED') {
          if (session?.user?.id) refreshCookieTTL(session.user.id);
          if (mounted) setLoading(false);
          return;
        }

        // ── SIGNED_OUT ──────────────────────────────────────────
        if (event === 'SIGNED_OUT') {
          clearCachedProfile();
          setUser(null);
          setLoading(false);
          setRecoveryFailed(false);
          setRecoveryReason(null);
          return;
        }
      });

      sub = data.subscription;
    } catch (e) {
      if (safetyTimer) clearTimeout(safetyTimer);
      if (mounted) {
        setUser(null);
        setLoading(false);
        setRecoveryFailed(true);
        setRecoveryReason(`Supabase init error: ${String(e)}`);
      }
    }

    return () => {
      mounted = false;
      if (safetyTimer) clearTimeout(safetyTimer);
      try { sub?.unsubscribe(); } catch { /* ignore */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sb = getBrowserSupabase();
      const { data: { user: au } } = await sb.auth.getUser();
      if (!au) { setUser(null); clearCachedProfile(); return; }
      const p = await withTimeout(fetchProfileDB(au.id), 5_000);
      if (p) { setCachedProfile(p); setUser(p); }
      else { setUser(null); clearCachedProfile(); }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    clearCachedProfile();
    try {
      await getBrowserSupabase().auth.signOut();
    } catch {
      setUser(null);
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      loading,
      user,
      isMember: !!user,
      refresh,
      signOut,
      recoveryFailed,
      recoveryReason,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { getUserProfile } from '../api/user'; // getUserProfile 임포트

export interface SuneungData {
  korean: { grade: string; percentile: string };
  math: { grade: string; percentile: string };
  english: { grade: string };
  koreanHistory: { grade: string };
  inquiry1: { grade: string; percentile: string };
  inquiry2: { grade: string; percentile: string };
}

export type UserProfile = {
  id: string;
  name: string;
  major_interest: string;
  hope_university: string;
  hope_major: string;
  intro: string;
  suneung: SuneungData;
  created_at?: string;
  updated_at?: string;
} | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile;
  loading: boolean;
  isLoggedIn: boolean;
  signOut: () => Promise<void>;
  updateProfile: (newProfile: UserProfile) => void; // 프로필 업데이트 함수 추가
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile>(null); // 프로필 상태 초기화
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const userProfile = await getUserProfile(userId);
      setProfile(userProfile);
    } catch (error) {
      console.error("사용자 프로필을 가져오는 데 실패했습니다:", error);
      setProfile(null);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('세션 확인 오류:', error);
      } else {
        const currentSession = data.session;
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);
        setIsLoggedIn(!!currentSession);
        if (currentUser) {
          await fetchProfile(currentUser.id);
        }
      }
      setLoading(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoggedIn(!!session);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null); // 로그아웃 시 프로필 초기화
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null); // 로그아웃 시 프로필 초기화
    setIsLoggedIn(false);
  };

  const updateProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isLoggedIn,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내에서 사용해야 합니다.');
  }
  return context;
}
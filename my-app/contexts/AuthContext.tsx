import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// WebBrowser 설정
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithKakao: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 인증 상태 변화 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Supabase 프로젝트 URL 가져오기
      const { data } = supabase.auth.getSession();
      
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'myapp',
        path: 'auth',
      });

      console.log('Redirect URL:', redirectUrl);

      // Supabase Auth URL 직접 생성
      const supabaseUrl = supabase.supabaseUrl;
      const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
      
      console.log('Auth URL:', authUrl);

      // WebBrowser로 인증 페이지 열기
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUrl,
        {
          showInRecents: true,
        }
      );

      console.log('Auth result:', result);

      if (result.type === 'success' && result.url) {
        // URL에서 토큰 추출
        const url = result.url;
        if (url.includes('#access_token=') || url.includes('?access_token=')) {
          const urlParams = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
          const accessToken = urlParams.get('access_token');
          const refreshToken = urlParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            console.log('Setting session with tokens...');
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              throw error;
            }
          }
        }
      } else if (result.type === 'cancel') {
        throw new Error('로그인이 취소되었습니다.');
      }
      
    } catch (error) {
      console.error('Google 로그인 실패:', error);
      throw error;
    }
  };

  const signInWithKakao = async () => {
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'myapp',
        path: 'auth',
      });

      console.log('Redirect URL:', redirectUrl);

      // Supabase Auth URL 직접 생성
      const supabaseUrl = supabase.supabaseUrl;
      const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=kakao&redirect_to=${encodeURIComponent(redirectUrl)}`;
      
      console.log('Auth URL:', authUrl);

      // WebBrowser로 인증 페이지 열기
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUrl,
        {
          showInRecents: true,
        }
      );

      console.log('Auth result:', result);

      if (result.type === 'success' && result.url) {
        // URL에서 토큰 추출
        const url = result.url;
        if (url.includes('#access_token=') || url.includes('?access_token=')) {
          const urlParams = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
          const accessToken = urlParams.get('access_token');
          const refreshToken = urlParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            console.log('Setting session with tokens...');
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              throw error;
            }
          }
        }
      } else if (result.type === 'cancel') {
        throw new Error('로그인이 취소되었습니다.');
      }
      
    } catch (error) {
      console.error('Kakao 로그인 실패:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    signInWithGoogle,
    signInWithKakao,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
 
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '../lib/supabaseClient';
import { AuthProvider } from '@/contexts/AuthContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: undefined, // 조건부 라우팅 사용
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    console.log('[인증] 인증 상태 확인 시작...');
    
    const checkAuthState = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        console.log('[인증] 세션 확인 결과:', { 
          hasSession: !!data.session, 
          userId: data.session?.user?.id,
          error: error?.message 
        });
        
        setIsLoggedIn(!!data.session);
      } catch (err) {
        console.error('[인증] 세션 확인 오류:', err);
        setIsLoggedIn(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthState();

    // 실시간 세션 변경 감지
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[인증] 상태 변경:', { event, hasSession: !!session, userId: session?.user?.id });
      setIsLoggedIn(!!session);
      setAuthLoading(false);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // 폰트나 인증 상태가 로딩 중이면 로딩 화면 표시
  if (!loaded || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>
          {!loaded ? '앱 초기화 중...' : '인증 상태 확인 중...'}
        </Text>
      </View>
    );
  }

  console.log('[인증] 최종 인증 상태:', isLoggedIn);

  return (
    <RootLayoutNav isLoggedIn={isLoggedIn ?? false} />
  );
}

function RootLayoutNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const colorScheme = useColorScheme();

  console.log('[네비게이션] 라우팅 결정:', isLoggedIn ? '(tabs)' : '(auth)');

  return (
    <AuthProvider>
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          {isLoggedIn ? (
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          ) : (
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          )}
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  Alert, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
} from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useColorScheme } from '../../components/useColorScheme';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signInWithGoogle, signInWithKakao } = useAuth();
  const colorScheme = useColorScheme();

  // 다크모드 대응 색상 정의
  const themeColors = {
    background: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
    text: colorScheme === 'dark' ? '#ffffff' : '#333',
    secondaryText: colorScheme === 'dark' ? '#cccccc' : '#666666',
    labelText: colorScheme === 'dark' ? '#cccccc' : '#4a4a4a',
    inputBackground: colorScheme === 'dark' ? '#2d2d2d' : '#f5f5f5',
    inputText: colorScheme === 'dark' ? '#ffffff' : '#1a1a1a',
    dividerLine: colorScheme === 'dark' ? '#444444' : '#e0e0e0',
    loginButtonBorder: colorScheme === 'dark' ? '#ffffff' : '#007AFF',
    loginButtonText: colorScheme === 'dark' ? '#ffffff' : '#007AFF',
    placeholderText: colorScheme === 'dark' ? '#888888' : '#999999',
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('입력 오류', '모든 필드를 입력하세요.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('비밀번호 불일치', '비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        Alert.alert('회원가입 실패', error.message);
      } else {
        Alert.alert('회원가입 성공', '이메일을 확인하여 계정을 활성화해주세요.');
        router.replace('/(auth)/Login');
      }
    } catch (error) {
      Alert.alert('오류', '회원가입 중 문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/(tabs)/main');
    } catch (error) {
      Alert.alert('Google 로그인 실패', '로그인 중 문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithKakao();
      router.replace('/(tabs)/main');
    } catch (error) {
      Alert.alert('카카오 로그인 실패', '로그인 중 문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    router.push('/(auth)/Login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.contentContainer}>
          {/* EDVISOR 로고 텍스트 */}
          <Text style={styles.logoText}>EDVISOR</Text>
          <Text style={[styles.subtitleText, { color: themeColors.text }]}>당신의 교육 여정을 위한 AI기반 교육 상담사</Text>

          {/* 입력 폼 영역 */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: themeColors.labelText }]}>이메일</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.inputBackground, color: themeColors.inputText }]}
                placeholder="이메일을 입력하세요"
                placeholderTextColor={themeColors.placeholderText}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: themeColors.labelText }]}>비밀번호</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.inputBackground, color: themeColors.inputText }]}
                placeholder="비밀번호를 입력하세요"
                placeholderTextColor={themeColors.placeholderText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: themeColors.labelText }]}>비밀번호 확인</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.inputBackground, color: themeColors.inputText }]}
                placeholder="비밀번호를 다시 입력하세요"
                placeholderTextColor={themeColors.placeholderText}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? '가입 중...' : '회원가입'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: themeColors.dividerLine }]} />
              <Text style={[styles.dividerText, { color: themeColors.secondaryText }]}>또는</Text>
              <View style={[styles.dividerLine, { backgroundColor: themeColors.dividerLine }]} />
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton, 
                { 
                  borderColor: themeColors.loginButtonBorder,
                  backgroundColor: themeColors.background
                }
              ]}
              onPress={goToLogin}
            >
              <Text style={[styles.loginButtonText, { color: themeColors.loginButtonText }]}>로그인하기</Text>
            </TouchableOpacity>

            {/* 소셜 로그인 섹션 - 임시 비활성화 */}
            {false && (
            <View style={styles.socialSection}>
              <Text style={styles.socialTitle}>소셜 계정으로 로그인</Text>
              
              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton]}
                onPress={handleGoogleLogin}
                disabled={isLoading}
              >
                <Text style={styles.socialButtonText}>🔍 Google로 로그인</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.kakaoButton]}
                onPress={handleKakaoLogin}
                disabled={isLoading}
              >
                <Text style={[styles.socialButtonText, styles.kakaoButtonText]}>💬 카카오로 로그인</Text>
              </TouchableOpacity>
            </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a4a4a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#b3b3b3',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    color: '#666666',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  socialSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  socialTitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  socialButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  kakaoButtonText: {
    color: '#3C1E1E',
  },
}); 
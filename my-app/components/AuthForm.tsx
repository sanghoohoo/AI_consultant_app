
import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useColorScheme } from './useColorScheme';

// Props 타입 정의
interface AuthFormProps {
  isLogin: boolean;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  confirmPassword?: string;
  setConfirmPassword?: (password: string) => void;
  isLoading: boolean;
  onSubmit: () => void;
  onSwitch: () => void;
}

export default function AuthForm({
  isLogin,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  isLoading,
  onSubmit,
  onSwitch,
}: AuthFormProps) {
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
    switchButtonBorder: colorScheme === 'dark' ? '#ffffff' : '#007AFF',
    switchButtonText: colorScheme === 'dark' ? '#ffffff' : '#007AFF',
    placeholderText: colorScheme === 'dark' ? '#888888' : '#999999',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.logoText}>EDVISOR</Text>
          <Text style={[styles.subtitleText, { color: themeColors.text }]}>
            당신의 교육 여정을 위한 AI 기반 교육 상담사
          </Text>

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
                returnKeyType={isLogin ? 'done' : 'next'}
              />
            </View>

            {!isLogin && (
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
            )}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? (isLogin ? '로그인 중...' : '가입 중...') : (isLogin ? '로그인' : '회원가입')}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: themeColors.dividerLine }]} />
              <Text style={[styles.dividerText, { color: themeColors.secondaryText }]}>또는</Text>
              <View style={[styles.dividerLine, { backgroundColor: themeColors.dividerLine }]} />
            </View>

            <TouchableOpacity
              style={[
                styles.switchButton,
                {
                  borderColor: themeColors.switchButtonBorder,
                  backgroundColor: themeColors.background,
                },
              ]}
              onPress={onSwitch}
            >
              <Text style={[styles.switchButtonText, { color: themeColors.switchButtonText }]}>
                {isLogin ? '회원가입' : '로그인하기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
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
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  switchButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

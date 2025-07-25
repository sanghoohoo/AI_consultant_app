import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
  Switch,
} from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'expo-router';
import { useColorScheme } from '../../components/useColorScheme';

interface UserProfile {
  id: string;
  name?: string;
  major_interest?: string;
  hope_university?: string;
  hope_major?: string;
  intro?: string;
  suneung?: {
    korean: { grade: string; percentile: string };
    math: { grade: string; percentile: string };
    english: { grade: string };
    koreanHistory: { grade: string };
    inquiry1: { grade: string; percentile: string };
    inquiry2: { grade: string; percentile: string };
  };
}

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isDetailMode, setIsDetailMode] = useState(false); // 상세 입력 모드 토글
  const [isLoading, setIsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme();

  // 다크모드 대응 색상 정의
  const themeColors = {
    background: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
    cardBackground: colorScheme === 'dark' ? '#2d2d2d' : '#fff',
    text: colorScheme === 'dark' ? '#fff' : '#333',
    secondaryText: colorScheme === 'dark' ? '#ccc' : '#666',
    inputBackground: colorScheme === 'dark' ? '#3d3d3d' : '#f5f5f5',
    border: colorScheme === 'dark' ? '#444' : '#e9ecef',
    buttonBackground: colorScheme === 'dark' ? '#4d4d4d' : '#f5f5f5',
    activeButton: '#007AFF',
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
    selectionButton: colorScheme === 'dark' ? '#3d3d3d' : '#f8f9fa',
    addProfileBackground: colorScheme === 'dark' ? '#1a2a3a' : '#f0f8ff',
    percentileBackground: colorScheme === 'dark' ? '#1a2332' : '#e3f2fd',
    percentileText: colorScheme === 'dark' ? '#64b5f6' : '#1976d2',
    switchTrack: colorScheme === 'dark' ? '#767577' : '#81b0ff',
    switchThumb: colorScheme === 'dark' ? '#f4f3f4' : '#f4f3f4',
  };

  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    major_interest: '',
    hope_university: '',
    hope_major: '',
    intro: '',
    suneung: {
      korean: { grade: '', percentile: '' },
      math: { grade: '', percentile: '' },
      english: { grade: '' },
      koreanHistory: { grade: '' },
      inquiry1: { grade: '', percentile: '' },
      inquiry2: { grade: '', percentile: '' },
    },
  });

  // 사용자 정보 로드
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        setProfileLoading(true);
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        setUser(userData.user);

        if (userData.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('user_profile')
            .select('*')
            .eq('id', userData.user.id)
            .single();

          if (profileData) {
            setUserProfile(profileData);
            setFormData({
              name: profileData.name || '',
              major_interest: profileData.major_interest || '',
              hope_university: profileData.hope_university || '',
              hope_major: profileData.hope_major || '',
              intro: profileData.intro || '',
              suneung: profileData.suneung || {
                korean: { grade: '', percentile: '' },
                math: { grade: '', percentile: '' },
                english: { grade: '' },
                koreanHistory: { grade: '' },
                inquiry1: { grade: '', percentile: '' },
                inquiry2: { grade: '', percentile: '' },
              },
            });
          }
        }
      } catch (error) {
        console.error('사용자 정보 로드 오류:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    loadUserInfo();
  }, []);

  // 로그아웃 핸들러
  const handleLogout = async () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              router.replace('/(auth)/Login');
            } catch (error) {
              console.error('로그아웃 오류:', error);
              Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  // 프로필 저장 핸들러
  const handleSaveProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let profileDataToSave = { ...formData };

      // 희망 학과가 입력되었을 경우, 벡터 검색을 통해 희망 전공 계열을 자동 설정
      if (formData.hope_major) {
        // 1. 희망 학과 텍스트로 임베딩 생성
        const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('create-embedding', {
            body: { text: formData.hope_major }
        });

        if (embeddingError || !embeddingData.embedding) {
            throw new Error('희망 학과를 분석하는 중 오류가 발생했습니다.');
        }
        
        // 2. 생성된 임베딩으로 가장 유사한 전공 계열 검색
        const { data: matchData, error: matchError } = await supabase.rpc('match_major_fields', {
            query_embedding: embeddingData.embedding,
            match_threshold: 0.5, // 임계값을 약간 낮춰서 매칭 확률을 높임
            match_count: 1
        });

        if (matchError) {
            throw new Error('전공 계열을 찾는 중 오류가 발생했습니다.');
        }

        // 3. 매칭된 계열이 있으면 major_interest 업데이트
        if (matchData && matchData.length > 0) {
          profileDataToSave.major_interest = matchData[0].name;
        } else {
          // 매칭되는 항목이 없을 경우 '기타'로 설정하거나 사용자에게 알림
          profileDataToSave.major_interest = '기타'; 
        }
      }

      const { error } = await supabase
        .from('user_profile')
        .upsert({
          id: user.id,
          ...profileDataToSave,
        });

      if (error) throw error;

      // 로컬 상태 업데이트
      const updatedProfile = { id: user.id, ...profileDataToSave };
      setUserProfile(updatedProfile);
      setFormData(profileDataToSave);

      setModalVisible(false); // 모달 닫기
      Alert.alert('성공', '프로필이 저장되었습니다.');
    } catch (error: any) {
      console.error('프로필 저장 오류:', error);
      Alert.alert('오류', error.message || '프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 프로필 편집 모달 열기
  const openProfileModal = () => {
    setModalVisible(true);
  };

  // 총 백분위 계산
  const calculateTotalPercentile = () => {
    const korean = parseFloat(formData.suneung.korean.percentile) || 0;
    const math = parseFloat(formData.suneung.math.percentile) || 0;
    const inquiry1 = parseFloat(formData.suneung.inquiry1.percentile) || 0;
    const inquiry2 = parseFloat(formData.suneung.inquiry2.percentile) || 0;
    const inquiryAvg = (inquiry1 + inquiry2) / 2;
    return korean + math + inquiryAvg;
  };

  // 동적 스타일 생성
  const styles = createStyles(themeColors);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {/* 로딩 중 텍스트 제거 - 점선 효과 방지 */}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>설정</Text>
        </View>

        {/* 계정 정보 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 정보</Text>
          <View style={styles.accountInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.accountDetails}>
              <Text style={styles.emailText}>{user.email}</Text>
              <Text style={styles.joinDate}>
                가입일: {new Date(user.created_at).toLocaleDateString('ko-KR')}
              </Text>
            </View>
          </View>
        </View>

        {/* 프로필 정보 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>내 정보</Text>
            <TouchableOpacity style={styles.editButton} onPress={openProfileModal}>
              <Text style={styles.editButtonText}>편집</Text>
            </TouchableOpacity>
          </View>
          
          {profileLoading ? (
            <View style={styles.profileLoadingContainer}>
              {/* 로딩 중에는 빈 공간으로 유지 */}
            </View>
          ) : userProfile ? (
            <View style={styles.profileInfo}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>이름:</Text>
                <Text style={styles.profileValue}>{userProfile.name || '미입력'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>희망 전공:</Text>
                <Text style={styles.profileValue}>{userProfile.major_interest || '미입력'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>희망 대학:</Text>
                <Text style={styles.profileValue}>{userProfile.hope_university || '미입력'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>희망 학과:</Text>
                <Text style={styles.profileValue}>{userProfile.hope_major || '미입력'}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addProfileButton} onPress={openProfileModal}>
              <Text style={styles.addProfileText}>+ 내 정보 추가하기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 로그아웃 버튼 */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 프로필 편집 모달 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButton}>취소</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                내 정보 입력
              </Text>
              <TouchableOpacity onPress={handleSaveProfile} disabled={isLoading}>
                <Text style={[styles.saveButton, isLoading && styles.disabledButton]}>
                  {isLoading ? '저장 중...' : '저장'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 기본 정보 */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>기본 정보</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>이름</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="이름을 입력하세요"
                  placeholderTextColor={themeColors.secondaryText}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>희망 대학</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.hope_university}
                  onChangeText={(text) => setFormData({ ...formData, hope_university: text })}
                  placeholder="희망 대학명을 입력하세요"
                  placeholderTextColor={themeColors.secondaryText}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>희망 학과</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.hope_major}
                  onChangeText={(text) => setFormData({ ...formData, hope_major: text })}
                  placeholder="희망 학과명을 입력하세요"
                  placeholderTextColor={themeColors.secondaryText}
                />
              </View>
            </View>

            {/* 수능 정보 */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>수능 정보</Text>
              
              {/* 국어 */}
              <View style={styles.suneungRow}>
                <Text style={styles.suneungSubject}>국어</Text>
                <View style={styles.suneungInputs}>
                  <TextInput
                    style={styles.suneungInput}
                    value={formData.suneung.korean.grade}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      suneung: {
                        ...formData.suneung,
                        korean: { ...formData.suneung.korean, grade: text }
                      }
                    })}
                    placeholder="등급"
                    keyboardType="numeric"
                    placeholderTextColor={themeColors.secondaryText}
                  />
                  <TextInput
                    style={styles.suneungInput}
                    value={formData.suneung.korean.percentile}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      suneung: {
                        ...formData.suneung,
                        korean: { ...formData.suneung.korean, percentile: text }
                      }
                    })}
                    placeholder="백분위"
                    keyboardType="numeric"
                    placeholderTextColor={themeColors.secondaryText}
                  />
                </View>
              </View>

              {/* 수학 */}
              <View style={styles.suneungRow}>
                <Text style={styles.suneungSubject}>수학</Text>
                <View style={styles.suneungInputs}>
                  <TextInput
                    style={styles.suneungInput}
                    value={formData.suneung.math.grade}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      suneung: {
                        ...formData.suneung,
                        math: { ...formData.suneung.math, grade: text }
                      }
                    })}
                    placeholder="등급"
                    keyboardType="numeric"
                    placeholderTextColor={themeColors.secondaryText}
                  />
                  <TextInput
                    style={styles.suneungInput}
                    value={formData.suneung.math.percentile}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      suneung: {
                        ...formData.suneung,
                        math: { ...formData.suneung.math, percentile: text }
                      }
                    })}
                    placeholder="백분위"
                    keyboardType="numeric"
                    placeholderTextColor={themeColors.secondaryText}
                  />
                </View>
              </View>

              {/* 영어 */}
              <View style={styles.suneungRow}>
                <Text style={styles.suneungSubject}>영어</Text>
                <View style={styles.suneungInputs}>
                  <TextInput
                    style={styles.suneungInput}
                    value={formData.suneung.english.grade}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      suneung: {
                        ...formData.suneung,
                        english: { grade: text }
                      }
                    })}
                    placeholder="등급"
                    keyboardType="numeric"
                    placeholderTextColor={themeColors.secondaryText}
                  />
                  <View style={[styles.suneungInput, styles.disabledInput]}>
                    <Text style={styles.disabledText}>-</Text>
                  </View>
                </View>
              </View>

              {/* 총 백분위 표시 */}
              <View style={styles.totalPercentile}>
                <Text style={styles.totalPercentileText}>
                  총 백분위: {calculateTotalPercentile().toFixed(1)}
                </Text>
              </View>
            </View>

            {/* 자기소개서 초안 */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>자기소개서 초안</Text>
              <TextInput
                style={styles.textArea}
                value={formData.intro}
                onChangeText={(text) => setFormData({ ...formData, intro: text })}
                placeholder="자기소개서 초안을 작성하세요"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                placeholderTextColor={themeColors.secondaryText}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
// Styles remain the same
const createStyles = (themeColors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: themeColors.cardBackground,
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  section: {
    backgroundColor: themeColors.cardBackground,
    marginTop: 10,
    padding: 20,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.text,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  accountDetails: {
    flex: 1,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text,
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 14,
    color: themeColors.secondaryText,
  },
  profileInfo: {
    borderRadius: 8,
    padding: 15,
    backgroundColor: themeColors.inputBackground,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  profileLabel: {
    fontSize: 14,
    color: themeColors.secondaryText,
    fontWeight: '500',
  },
  profileValue: {
    fontSize: 14,
    color: themeColors.text,
    fontWeight: '500',
  },
  addProfileButton: {
    backgroundColor: themeColors.addProfileBackground,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  addProfileText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  profileLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  logoutButton: {
    backgroundColor: '#ff4757',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // 모달 스타일
  modalContainer: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  modalContent: {
    paddingBottom: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: themeColors.cardBackground,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.text,
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledButton: {
    color: themeColors.secondaryText,
  },
  formSection: {
    backgroundColor: themeColors.cardBackground,
    margin: 10,
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text,
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.text,
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: themeColors.inputBackground,
    color: themeColors.text,
  },
  textArea: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: themeColors.inputBackground,
    color: themeColors.text,
    minHeight: 100,
  },
  gradeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  gradeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: themeColors.buttonBackground,
  },
  gradeButtonActive: {
    backgroundColor: themeColors.activeButton,
  },
  gradeButtonText: {
    fontSize: 14,
    color: themeColors.text,
    fontWeight: '500',
  },
  gradeButtonTextActive: {
    color: '#fff',
  },
  majorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  majorButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: themeColors.buttonBackground,
  },
  majorButtonActive: {
    backgroundColor: themeColors.activeButton,
  },
  majorButtonText: {
    fontSize: 14,
    color: themeColors.text,
    fontWeight: '500',
  },
  majorButtonTextActive: {
    color: '#fff',
  },
  suneungRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  suneungSubject: {
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.text,
    width: 50,
  },
  suneungInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  suneungInput: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: themeColors.inputBackground,
    color: themeColors.text,
    textAlign: 'center',
  },
  disabledInput: {
    backgroundColor: themeColors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledText: {
    color: themeColors.secondaryText,
    fontSize: 14,
  },
  totalPercentile: {
    backgroundColor: themeColors.percentileBackground,
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  totalPercentileText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.percentileText,
    textAlign: 'center',
  },
  detailModeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: themeColors.cardBackground,
    margin: 10,
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailModeToggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
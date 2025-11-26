import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import {
  getInterestMajor,
  setInterestMajor,
  getComparativeStats,
  getPersonaComparison,
  generateComparisonReport,
  InterestMajor,
  ComparativeStats,
  PersonaComparison,
  ComparisonReport,
} from '../api/comparison';

interface ComparisonSectionProps {
  colorScheme: 'light' | 'dark' | null | undefined;
}

const ComparisonSection: React.FC<ComparisonSectionProps> = ({ colorScheme }) => {
  const { session } = useAuth();
  const [interestMajor, setInterestMajorState] = useState<InterestMajor | null>(null);
  const [comparativeStats, setComparativeStats] = useState<ComparativeStats | null>(null);
  const [personaComparison, setPersonaComparisonState] = useState<PersonaComparison | null>(null);
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMajorModal, setShowMajorModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // 학과 설정 입력
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');

  const theme = {
    background: colorScheme === 'dark' ? '#121212' : '#F2F2F7',
    card: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
    text: colorScheme === 'dark' ? '#EAEAEA' : '#333333',
    secondaryText: colorScheme === 'dark' ? '#A9A9A9' : '#8A8A8E',
    accent: '#0A84FF',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    border: colorScheme === 'dark' ? '#333333' : '#E5E5EA',
  };

  // 관심학과 불러오기
  useEffect(() => {
    if (session) {
      loadInterestMajor();
    }
  }, [session]);

  const loadInterestMajor = async () => {
    if (!session) return;

    try {
      const result = await getInterestMajor(session.access_token);
      if (result.success && result.major) {
        setInterestMajorState(result.major);
        loadComparisonData();
      }
    } catch (error) {
      console.error('관심학과 조회 실패:', error);
    }
  };

  const loadComparisonData = async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      const [stats, persona] = await Promise.all([
        getComparativeStats(session.access_token),
        getPersonaComparison(session.access_token),
      ]);
      setComparativeStats(stats);
      setPersonaComparisonState(persona);
    } catch (error) {
      console.error('비교 데이터 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetInterestMajor = async () => {
    if (!session || !university.trim() || !department.trim()) {
      Alert.alert('오류', '대학교와 학과를 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await setInterestMajor(
        { university: university.trim(), department: department.trim() },
        session.access_token
      );

      if (result.success && result.major) {
        setInterestMajorState(result.major);
        setShowMajorModal(false);
        setUniversity('');
        setDepartment('');
        Alert.alert('성공', '관심학과가 설정되었습니다.');
        loadComparisonData();
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '관심학과 설정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!session || !interestMajor) {
      Alert.alert('오류', '관심학과를 먼저 설정해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const generatedReport = await generateComparisonReport(session.access_token);
      setReport(generatedReport);
      setShowReportModal(true);
    } catch (error: any) {
      Alert.alert('오류', error.message || '리포트 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPercentileColor = (percentile?: number) => {
    if (!percentile) return theme.secondaryText;
    // percentile = 자신보다 성적이 나쁜 사람의 비율
    // 낮은 값 = 성적이 나쁨, 높은 값 = 성적이 좋음
    if (percentile >= 0.75) return theme.success;  // 상위 25%
    if (percentile >= 0.50) return theme.warning;  // 상위 50%
    return theme.danger;  // 하위 50%
  };

  const renderGradeComparison = () => {
    if (!comparativeStats || !comparativeStats.grade_stats || !comparativeStats.user_grade) {
      return (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>📈 성적 비교</Text>
          <Text style={[styles.noDataText, { color: theme.secondaryText }]}>
            성적 데이터가 부족합니다. 최소 5명의 지망생 데이터가 필요합니다.
          </Text>
        </View>
      );
    }

    const { grade_stats, user_grade } = comparativeStats;
    const userGrade = user_grade.user_grade_average;
    const avgGrade = grade_stats.avg_grade_average;
    const percentile = user_grade.percentile_rank;

    return (
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>📈 성적 비교</Text>

        {userGrade && avgGrade && (
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              내신 평균 비교
            </Text>
            <View style={styles.gradeComparisonRow}>
              <View style={styles.gradeItem}>
                <Text style={[styles.gradeLabel, { color: theme.secondaryText }]}>내 성적</Text>
                <Text style={[styles.gradeValue, { color: theme.text }]}>
                  {userGrade.toFixed(2)}
                </Text>
              </View>
              <Text style={[styles.vsText, { color: theme.accent }]}>VS</Text>
              <View style={styles.gradeItem}>
                <Text style={[styles.gradeLabel, { color: theme.secondaryText }]}>학과 평균</Text>
                <Text style={[styles.gradeValue, { color: theme.text }]}>
                  {avgGrade.toFixed(2)}
                </Text>
              </View>
            </View>

            {percentile !== undefined && (
              <View style={[styles.percentileBadge, { backgroundColor: getPercentileColor(percentile) }]}>
                <Text style={styles.percentileText}>
                  상위 {((1 - percentile) * 100).toFixed(0)}%
                </Text>
              </View>
            )}
          </View>
        )}

        {grade_stats.total_applicants && (
          <Text style={[styles.infoText, { color: theme.secondaryText }]}>
            📊 지망생 수: {grade_stats.total_applicants}명
          </Text>
        )}
      </View>
    );
  };

  if (!session) {
    return (
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          로그인이 필요합니다
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* 관심학과 설정 카드 */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 입시 상대비교</Text>

        {interestMajor ? (
          <View>
            <View style={styles.majorInfo}>
              <Text style={[styles.majorText, { color: theme.text }]}>
                🎯 {interestMajor.university} {interestMajor.department}
              </Text>
              <TouchableOpacity
                onPress={() => setShowMajorModal(true)}
                style={[styles.changeButton, { borderColor: theme.accent }]}
              >
                <Text style={[styles.changeButtonText, { color: theme.accent }]}>변경</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowMajorModal(true)}
            style={[styles.setMajorButton, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.setMajorButtonText}>관심학과 설정하기</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 성적 비교 카드 */}
      {isLoading ? (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : interestMajor ? (
        <>
          {renderGradeComparison()}

          {/* 모의고사 비교 카드 */}
          {comparativeStats?.mock_exam_stats?.user_avg_percentile && (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>📝 모의고사 성적</Text>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
                  최근 평균 백분위
                </Text>
                <Text style={[styles.gradeValue, { color: theme.text }]}>
                  {comparativeStats.mock_exam_stats.user_avg_percentile.toFixed(1)}%
                </Text>
              </View>
            </View>
          )}

          {/* 생기부 특성 비교 카드 */}
          {personaComparison && personaComparison.traits && personaComparison.traits.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>🎓 생기부 특성 비교</Text>
              <Text style={[styles.matchText, { color: theme.accent }]}>
                전체 매칭도: {(personaComparison.overall_match * 100).toFixed(0)}%
              </Text>

              {personaComparison.traits.slice(0, 5).map((trait, index) => {
                const percentage = (trait.user_strength / trait.average_strength) * 100;
                const color = trait.status === 'strong' ? theme.success : trait.status === 'weak' ? theme.danger : theme.warning;
                return (
                  <View key={index} style={styles.traitItem}>
                    <Text style={[styles.traitName, { color: theme.text }]}>{trait.trait}</Text>
                    <View style={styles.gradeComparisonRow}>
                      <View style={styles.gradeItem}>
                        <Text style={[styles.gradeLabel, { color: theme.secondaryText }]}>내 점수</Text>
                        <Text style={[styles.gradeValue, { color: theme.text }]}>
                          {trait.user_strength.toFixed(1)}
                        </Text>
                      </View>
                      <Text style={[styles.vsText, { color: theme.accent }]}>VS</Text>
                      <View style={styles.gradeItem}>
                        <Text style={[styles.gradeLabel, { color: theme.secondaryText }]}>평균</Text>
                        <Text style={[styles.gradeValue, { color: theme.text }]}>
                          {trait.average_strength.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.percentileBadge, { backgroundColor: color }]}>
                      <Text style={styles.percentileText}>
                        {percentage >= 100 ? '평균 이상' : '평균 이하'}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {personaComparison.recommendations && personaComparison.recommendations.length > 0 && (
                <View style={styles.recommendationsContainer}>
                  <Text style={[styles.recommendationsTitle, { color: theme.accent }]}>
                    💡 추천사항
                  </Text>
                  {personaComparison.recommendations.map((rec, index) => (
                    <Text key={index} style={[styles.recommendationText, { color: theme.text }]}>
                      • {rec}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 종합 리포트 생성 버튼 */}
          <TouchableOpacity
            onPress={handleGenerateReport}
            style={[styles.reportButton, { backgroundColor: theme.accent }]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.reportButtonText}>📄 AI 종합 리포트 생성</Text>
            )}
          </TouchableOpacity>
        </>
      ) : null}

      {/* 학과 설정 모달 */}
      <Modal
        visible={showMajorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMajorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>관심학과 설정</Text>

            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="대학교 (예: 서울대학교)"
              placeholderTextColor={theme.secondaryText}
              value={university}
              onChangeText={setUniversity}
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="학과 (예: 컴퓨터공학과)"
              placeholderTextColor={theme.secondaryText}
              value={department}
              onChangeText={setDepartment}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowMajorModal(false)}
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.border }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSetInterestMajor}
                style={[styles.modalButton, { backgroundColor: theme.accent }]}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>설정</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 리포트 모달 */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.reportModalContent, { backgroundColor: theme.card }]}>
            <ScrollView showsVerticalScrollIndicator={true}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>📄 종합 비교 리포트</Text>

              {report && report.success && (
                <>
                  <View style={styles.reportSection}>
                    <Text style={[styles.reportSectionTitle, { color: theme.accent }]}>
                      🎯 목표 학과
                    </Text>
                    <Text style={[styles.reportText, { color: theme.text }]}>
                      {interestMajor?.university} {interestMajor?.department}
                    </Text>
                  </View>

                  <View style={styles.reportSection}>
                    <Text style={[styles.reportSectionTitle, { color: theme.accent }]}>
                      💪 강점
                    </Text>
                    {report.report.strengths && report.report.strengths.length > 0 ? (
                      report.report.strengths.map((strength, index) => (
                        <Text key={index} style={[styles.reportText, { color: theme.text }]}>
                          • {strength}
                        </Text>
                      ))
                    ) : (
                      <Text style={[styles.reportText, { color: theme.secondaryText }]}>
                        데이터가 부족합니다.
                      </Text>
                    )}
                  </View>

                  <View style={styles.reportSection}>
                    <Text style={[styles.reportSectionTitle, { color: theme.accent }]}>
                      📉 보완이 필요한 점
                    </Text>
                    {report.report.improvements_needed && report.report.improvements_needed.length > 0 ? (
                      report.report.improvements_needed.map((improvement, index) => (
                        <Text key={index} style={[styles.reportText, { color: theme.text }]}>
                          • {improvement}
                        </Text>
                      ))
                    ) : (
                      <Text style={[styles.reportText, { color: theme.secondaryText }]}>
                        데이터가 부족합니다.
                      </Text>
                    )}
                  </View>

                  <View style={styles.reportSection}>
                    <Text style={[styles.reportSectionTitle, { color: theme.accent }]}>
                      ✅ 추천 활동
                    </Text>
                    {report.report.recommended_activities && report.report.recommended_activities.length > 0 ? (
                      report.report.recommended_activities.map((activity, index) => (
                        <Text key={index} style={[styles.reportText, { color: theme.text }]}>
                          {index + 1}. {activity}
                        </Text>
                      ))
                    ) : (
                      <Text style={[styles.reportText, { color: theme.secondaryText }]}>
                        데이터가 부족합니다.
                      </Text>
                    )}
                  </View>

                  <View style={styles.reportSection}>
                    <Text style={[styles.reportSectionTitle, { color: theme.secondaryText }]}>
                      생성 시각: {new Date(report.generated_at).toLocaleString('ko-KR')}
                    </Text>
                  </View>
                </>
              )}
              {report && !report.success && (
                <View style={styles.reportSection}>
                  <Text style={[styles.reportText, { color: theme.danger }]}>
                    {report.message || '리포트 생성에 실패했습니다.'}
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowReportModal(false)}
              style={[styles.closeButton, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  majorInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  majorText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  changeButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  setMajorButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  setMajorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statItem: {
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBarContainer: {
    marginVertical: 8,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
  },
  statMessage: {
    fontSize: 13,
    marginTop: 4,
  },
  scoreText: {
    fontSize: 15,
    marginVertical: 2,
  },
  matchText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  traitItem: {
    marginBottom: 12,
  },
  traitName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  recommendationsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    marginVertical: 4,
    lineHeight: 20,
  },
  reportButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 16,
    padding: 24,
  },
  reportModalContent: {
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    marginRight: 6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reportSection: {
    marginBottom: 20,
  },
  reportSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  reportText: {
    fontSize: 14,
    lineHeight: 20,
    marginVertical: 2,
  },
  successProbability: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
  },
  closeButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 20,
  },
  gradeComparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 12,
  },
  gradeItem: {
    alignItems: 'center',
    flex: 1,
  },
  gradeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  gradeValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  vsText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  percentileBadge: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
    marginTop: 12,
  },
  percentileText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ComparisonSection;
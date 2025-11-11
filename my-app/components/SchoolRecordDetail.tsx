import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { StudentProfile } from '../types/schoolRecord';

interface SchoolRecordDetailProps {
  data: StudentProfile;
  themeColors: any;
}

export default function SchoolRecordDetail({ data, themeColors }: SchoolRecordDetailProps) {
  const styles = createStyles(themeColors);

  return (
    <ScrollView
      style={styles.scrollView}
      nestedScrollEnabled={true}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.container}>
        {/* 기본 정보 */}
        {data.personal_info && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 기본 정보</Text>
            <View style={styles.row}>
              <Text style={styles.label}>이름:</Text>
              <Text style={styles.value}>
                {data.personal_info.student_name || data.personal_info.name || '미입력'}
              </Text>
            </View>
            {data.personal_info.school_name && (
              <View style={styles.row}>
                <Text style={styles.label}>학교:</Text>
                <Text style={styles.value}>{data.personal_info.school_name}</Text>
              </View>
            )}
            {data.personal_info.gender && (
              <View style={styles.row}>
                <Text style={styles.label}>성별:</Text>
                <Text style={styles.value}>{data.personal_info.gender}</Text>
              </View>
            )}
          </View>
        )}

        {/* 출결 상황 */}
        {data.attendance && data.attendance.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 출결 상황</Text>
            {data.attendance.map((record, index) => (
              <View key={index} style={styles.item}>
                <Text style={styles.itemHeader}>{record.grade_level}학년</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>수업일수:</Text>
                  <Text style={styles.value}>{record.class_days || 0}일</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>결석:</Text>
                  <Text style={styles.value}>{record.absence_days || 0}일</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>지각:</Text>
                  <Text style={styles.value}>{record.lateness || 0}회</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>조퇴:</Text>
                  <Text style={styles.value}>{record.early_leave || 0}회</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 수상 경력 */}
        {data.awards && data.awards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 수상 경력 ({data.awards.length}개)</Text>
            {data.awards.map((award, index) => (
              <View key={index} style={styles.item}>
                <Text style={styles.itemTitle}>{award.award_name}</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>학년:</Text>
                  <Text style={styles.value}>{award.grade_level}학년</Text>
                </View>
                {award.rank && (
                  <View style={styles.row}>
                    <Text style={styles.label}>등급:</Text>
                    <Text style={styles.value}>{award.rank}</Text>
                  </View>
                )}
                {award.awarding_institution && (
                  <View style={styles.row}>
                    <Text style={styles.label}>수여기관:</Text>
                    <Text style={styles.value}>{award.awarding_institution}</Text>
                  </View>
                )}
                {award.date && (
                  <View style={styles.row}>
                    <Text style={styles.label}>수상일:</Text>
                    <Text style={styles.value}>{award.date}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* 자격증 */}
        {data.certifications && data.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📜 자격증 ({data.certifications.length}개)</Text>
            {data.certifications.map((cert, index) => (
              <View key={index} style={styles.item}>
                <Text style={styles.itemTitle}>{cert.name}</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>학년:</Text>
                  <Text style={styles.value}>{cert.grade_level}학년</Text>
                </View>
                {cert.acquisition_date && (
                  <View style={styles.row}>
                    <Text style={styles.label}>취득일:</Text>
                    <Text style={styles.value}>{cert.acquisition_date}</Text>
                  </View>
                )}
                {cert.issuing_institution && (
                  <View style={styles.row}>
                    <Text style={styles.label}>발급기관:</Text>
                    <Text style={styles.value}>{cert.issuing_institution}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* 진로 희망 */}
        {data.career_hopes && data.career_hopes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 진로 희망</Text>
            {data.career_hopes.map((hope, index) => (
              <View key={index} style={styles.item}>
                <Text style={styles.itemHeader}>{hope.grade_level}학년</Text>
                {hope.student_hope && (
                  <View style={styles.row}>
                    <Text style={styles.label}>학생 희망:</Text>
                    <Text style={styles.value}>{hope.student_hope}</Text>
                  </View>
                )}
                {hope.parent_hope && (
                  <View style={styles.row}>
                    <Text style={styles.label}>학부모 희망:</Text>
                    <Text style={styles.value}>{hope.parent_hope}</Text>
                  </View>
                )}
                {hope.reason && (
                  <Text style={styles.content}>{hope.reason}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* 창의적 체험활동 - 자율 */}
        {data.creative_activities_autonomous && data.creative_activities_autonomous.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎨 창의적 체험활동 - 자율</Text>
            {data.creative_activities_autonomous.map((activity, index) => (
              <View key={index} style={styles.item}>
                <Text style={styles.itemHeader}>{activity.grade_level}학년 - {activity.activity_type}</Text>
                <Text style={styles.content}>{activity.activity_details}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 창의적 체험활동 - 동아리 */}
        {data.creative_activities_club && data.creative_activities_club.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎭 창의적 체험활동 - 동아리</Text>
            {data.creative_activities_club.map((activity, index) => (
              <View key={index} style={styles.item}>
                <Text style={styles.itemHeader}>{activity.grade_level}학년{activity.club_name ? ` - ${activity.club_name}` : ''}</Text>
                <Text style={styles.content}>{activity.activity_details}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 창의적 체험활동 - 봉사 */}
        {data.creative_activities_volunteer && data.creative_activities_volunteer.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤝 창의적 체험활동 - 봉사</Text>
            {data.creative_activities_volunteer.map((activity, index) => (
              <View key={index} style={styles.item}>
                <Text style={styles.itemHeader}>{activity.grade_level}학년</Text>
                {activity.place_or_agency && (
                  <View style={styles.row}>
                    <Text style={styles.label}>장소/기관:</Text>
                    <Text style={styles.value}>{activity.place_or_agency}</Text>
                  </View>
                )}
                {activity.hours !== undefined && (
                  <View style={styles.row}>
                    <Text style={styles.label}>봉사시간:</Text>
                    <Text style={styles.value}>{activity.hours}시간</Text>
                  </View>
                )}
                <Text style={styles.content}>{activity.activity_details}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 창의적 체험활동 - 진로 */}
        {data.creative_activities_career && data.creative_activities_career.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💼 창의적 체험활동 - 진로</Text>
            {data.creative_activities_career.map((activity, index) => (
              <View key={index} style={styles.item}>
                <Text style={styles.itemHeader}>{activity.grade_level}학년 - {activity.activity_type}</Text>
                <Text style={styles.content}>{activity.activity_details}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 독서 활동 */}
        {data.reading_activities && data.reading_activities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 독서 활동 ({data.reading_activities.length}권)</Text>
            {data.reading_activities.map((reading, index) => (
              <View key={index} style={styles.item}>
                <Text style={styles.itemTitle}>{reading.book_title_and_author}</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>학년:</Text>
                  <Text style={styles.value}>{reading.grade_level}학년</Text>
                </View>
                {reading.subject_or_area && (
                  <View style={styles.row}>
                    <Text style={styles.label}>분야:</Text>
                    <Text style={styles.value}>{reading.subject_or_area}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* 내신 평균 */}
        {data.grade_averages && data.grade_averages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 내신 평균</Text>
            {data.grade_averages
              .filter((g) => g.average_type === '학기별')
              .map((grade, index) => (
                <View key={index} style={styles.row}>
                  <Text style={styles.label}>{grade.grade_level}학년 {grade.semester}학기:</Text>
                  <Text style={styles.value}>{grade.grade_average.toFixed(2)}</Text>
                </View>
              ))}
          </View>
        )}

        {/* 교과 학습 발달 */}
        {data.subject_grades && data.subject_grades.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📖 교과 학습 발달 ({data.subject_grades.length}개 과목)</Text>
            <Text style={styles.label}>총 {data.subject_grades.length}개 과목 성적이 있습니다.</Text>
          </View>
        )}

        {/* 행동 특성 및 종합 의견 */}
        {data.behavioral_traits && data.behavioral_traits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💭 행동 특성 및 종합 의견</Text>
            {data.behavioral_traits.map((opinion, index) => (
              <View key={index} style={styles.item}>
                <Text style={styles.itemHeader}>{opinion.grade_level}학년</Text>
                <Text style={styles.content}>{opinion.opinion}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (themeColors: any) => StyleSheet.create({
  scrollView: {
    maxHeight: 400,
  },
  container: {
    padding: 10,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text,
    marginBottom: 12,
  },
  item: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: themeColors.inputBackground,
    borderRadius: 6,
  },
  itemHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text,
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
    color: themeColors.secondaryText,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 13,
    color: themeColors.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  content: {
    fontSize: 13,
    color: themeColors.text,
    lineHeight: 20,
    marginTop: 6,
  },
});
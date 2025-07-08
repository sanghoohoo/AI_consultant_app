import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '../../components/useColorScheme';

// 과목 데이터 타입 정의
interface Subject {
  id: string;
  name: string;
  teacher: string;
  classroom: string;
  color: string;
}

// 시간표 셀 데이터 타입
interface TimetableCell {
  day: number; // 0: 월, 1: 화, 2: 수, 3: 목, 4: 금
  period: number; // 1~7교시
  subject?: Subject;
}

const { width } = Dimensions.get('window');
const CELL_WIDTH = (width - 80 - 32) / 5; // 요일별 셀 너비 (화면 너비 - 시간 열 80px - 패딩 32px) / 5

// 미리 정의된 과목 색상
const SUBJECT_COLORS = [
  '#007AFF', '#FF6B6B', '#34C759', '#FF9500', '#8E44AD',
  '#3498DB', '#E67E22', '#95A5A6', '#E91E63', '#9C27B0',
  '#2196F3', '#00BCD4', '#4CAF50', '#FFEB3B', '#FF5722'
];

// 요일 이름
const DAYS = ['월', '화', '수', '목', '금'];

// 교시 시간
const PERIODS = [
  { period: '1교시', time: '09:00~09:50' },
  { period: '2교시', time: '10:00~10:50' },
  { period: '3교시', time: '11:00~11:50' },
  { period: '4교시', time: '12:00~12:50' },
  { period: '5교시', time: '13:30~14:20' },
  { period: '6교시', time: '14:30~15:20' },
  { period: '7교시', time: '15:30~16:20' }
];

export default function TimetableScreen() {
  const colorScheme = useColorScheme();
  const [timetable, setTimetable] = useState<TimetableCell[]>([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{day: number, period: number} | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState({
    name: '',
    teacher: '',
    classroom: '',
    color: SUBJECT_COLORS[0]
  });

  // 다크모드 대응 색상 정의 (다른 탭들과 통일)
  const themeColors = {
    background: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
    cardBackground: colorScheme === 'dark' ? '#2d2d2d' : '#fff',
    text: colorScheme === 'dark' ? '#fff' : '#333',
    secondaryText: colorScheme === 'dark' ? '#ccc' : '#666',
    border: colorScheme === 'dark' ? '#444' : '#e0e0e0',
    inputBackground: colorScheme === 'dark' ? '#3d3d3d' : '#f9f9f9',
    inputBorder: colorScheme === 'dark' ? '#555' : '#e0e0e0',
    modalBackground: colorScheme === 'dark' ? '#2d2d2d' : '#fff',
    accent: '#007AFF',
    danger: '#FF6B6B',
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadTimetableData();
  }, []);

  // 시간표 데이터 로드
  const loadTimetableData = async () => {
    try {
      const savedTimetable = await AsyncStorage.getItem('timetable');
      const savedSubjects = await AsyncStorage.getItem('subjects');
      
      if (savedTimetable) {
        setTimetable(JSON.parse(savedTimetable));
      }
      if (savedSubjects) {
        setSubjects(JSON.parse(savedSubjects));
      }
    } catch (error) {
      console.error('시간표 데이터 로드 오류:', error);
    }
  };

  // 시간표 데이터 저장
  const saveTimetableData = async (newTimetable: TimetableCell[], newSubjects: Subject[]) => {
    try {
      await AsyncStorage.setItem('timetable', JSON.stringify(newTimetable));
      await AsyncStorage.setItem('subjects', JSON.stringify(newSubjects));
    } catch (error) {
      console.error('시간표 데이터 저장 오류:', error);
    }
  };

  // 특정 셀의 과목 가져오기
  const getSubjectForCell = (day: number, period: number): Subject | undefined => {
    const cell = timetable.find(c => c.day === day && c.period === period);
    return cell?.subject;
  };

  // 셀 터치 핸들러
  const handleCellPress = (day: number, period: number) => {
    setSelectedCell({ day, period });
    const existingSubject = getSubjectForCell(day, period);
    
    if (existingSubject) {
      // 기존 과목이 있으면 편집 모드
      setNewSubject({
        name: existingSubject.name,
        teacher: existingSubject.teacher,
        classroom: existingSubject.classroom,
        color: existingSubject.color
      });
    } else {
      // 새 과목 추가 모드
      setNewSubject({
        name: '',
        teacher: '',
        classroom: '',
        color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]
      });
    }
    setShowSubjectModal(true);
  };

  // 과목 저장
  const saveSubject = async () => {
    if (!selectedCell || !newSubject.name.trim()) {
      Alert.alert('오류', '과목명을 입력해주세요.');
      return;
    }

    const subjectId = `${selectedCell.day}-${selectedCell.period}`;
    const subject: Subject = {
      id: subjectId,
      name: newSubject.name.trim(),
      teacher: newSubject.teacher.trim(),
      classroom: newSubject.classroom.trim(),
      color: newSubject.color
    };

    // 시간표 업데이트
    const updatedTimetable = timetable.filter(
      c => !(c.day === selectedCell.day && c.period === selectedCell.period)
    );
    updatedTimetable.push({
      day: selectedCell.day,
      period: selectedCell.period,
      subject
    });

    // 과목 목록 업데이트
    const updatedSubjects = subjects.filter(s => s.id !== subjectId);
    updatedSubjects.push(subject);

    setTimetable(updatedTimetable);
    setSubjects(updatedSubjects);
    await saveTimetableData(updatedTimetable, updatedSubjects);

    setShowSubjectModal(false);
    setSelectedCell(null);
    Alert.alert('성공', '과목이 저장되었습니다.');
  };

  // 과목 삭제
  const deleteSubject = async () => {
    if (!selectedCell) return;

    Alert.alert(
      '과목 삭제',
      '이 과목을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const updatedTimetable = timetable.filter(
              c => !(c.day === selectedCell.day && c.period === selectedCell.period)
            );
            const subjectId = `${selectedCell.day}-${selectedCell.period}`;
            const updatedSubjects = subjects.filter(s => s.id !== subjectId);

            setTimetable(updatedTimetable);
            setSubjects(updatedSubjects);
            await saveTimetableData(updatedTimetable, updatedSubjects);

            setShowSubjectModal(false);
            setSelectedCell(null);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: themeColors.cardBackground, borderBottomColor: themeColors.border }]}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>시간표</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 시간표 컨테이너 */}
        <View style={[styles.timetableCard, { backgroundColor: themeColors.cardBackground }]}>
          
          {/* 요일 헤더 */}
          <View style={styles.headerRow}>
            <View style={[styles.timeHeaderCell, { backgroundColor: themeColors.accent }]}>
              <Text style={styles.timeHeaderText}>시간</Text>
            </View>
            {DAYS.map((day, index) => (
              <View key={index} style={[styles.dayHeaderCell, { backgroundColor: themeColors.accent }]}>
                <Text style={styles.dayHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* 시간표 그리드 */}
          {PERIODS.map((periodInfo, periodIndex) => (
            <View key={periodIndex} style={styles.timeRow}>
              {/* 교시 시간 */}
              <View style={[styles.timeCell, { 
                backgroundColor: themeColors.cardBackground, 
                borderColor: themeColors.border 
              }]}>
                <Text style={[styles.periodText, { color: themeColors.text }]}>
                  {periodInfo.period}
                </Text>
                <Text style={[styles.timeText, { color: themeColors.secondaryText }]}>
                  {periodInfo.time}
                </Text>
              </View>

              {/* 요일별 셀 */}
              {DAYS.map((_, dayIndex) => {
                const subject = getSubjectForCell(dayIndex, periodIndex + 1);
                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.subjectCell,
                      { 
                        backgroundColor: subject ? subject.color : themeColors.cardBackground,
                        borderColor: themeColors.border
                      }
                    ]}
                    onPress={() => handleCellPress(dayIndex, periodIndex + 1)}
                    activeOpacity={0.7}
                  >
                    {subject ? (
                      <View style={styles.subjectInfo}>
                        <Text style={styles.subjectName} numberOfLines={2}>
                          {subject.name}
                        </Text>
                        {subject.teacher && (
                          <Text style={styles.teacherName} numberOfLines={1}>
                            {subject.teacher}
                          </Text>
                        )}
                        {subject.classroom && (
                          <Text style={styles.classroomName} numberOfLines={1}>
                            {subject.classroom}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={[styles.emptyCell, { color: themeColors.secondaryText }]}>+</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 과목 추가/편집 모달 */}
      <Modal
        visible={showSubjectModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSubjectModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <TouchableOpacity
              onPress={() => setShowSubjectModal(false)}
              style={styles.modalButton}
            >
              <Text style={[styles.modalButtonText, { color: themeColors.secondaryText }]}>취소</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              {getSubjectForCell(selectedCell?.day || 0, selectedCell?.period || 0) ? '과목 편집' : '과목 추가'}
            </Text>
            <TouchableOpacity onPress={saveSubject} style={styles.modalButton}>
              <Text style={[styles.modalButtonText, { color: themeColors.accent, fontWeight: '600' }]}>저장</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* 과목명 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themeColors.text }]}>과목명 *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: themeColors.inputBackground,
                    borderColor: themeColors.inputBorder,
                    color: themeColors.text
                  }
                ]}
                placeholder="과목명을 입력하세요"
                placeholderTextColor={themeColors.secondaryText}
                value={newSubject.name}
                onChangeText={(text) => setNewSubject(prev => ({ ...prev, name: text }))}
              />
            </View>

            {/* 담당교사 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themeColors.text }]}>담당교사</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: themeColors.inputBackground,
                    borderColor: themeColors.inputBorder,
                    color: themeColors.text
                  }
                ]}
                placeholder="담당교사를 입력하세요"
                placeholderTextColor={themeColors.secondaryText}
                value={newSubject.teacher}
                onChangeText={(text) => setNewSubject(prev => ({ ...prev, teacher: text }))}
              />
            </View>

            {/* 강의실 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themeColors.text }]}>강의실</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: themeColors.inputBackground,
                    borderColor: themeColors.inputBorder,
                    color: themeColors.text
                  }
                ]}
                placeholder="강의실을 입력하세요"
                placeholderTextColor={themeColors.secondaryText}
                value={newSubject.classroom}
                onChangeText={(text) => setNewSubject(prev => ({ ...prev, classroom: text }))}
              />
            </View>

            {/* 색상 선택 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themeColors.text }]}>과목 색상</Text>
              <View style={styles.colorGrid}>
                {SUBJECT_COLORS.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      newSubject.color === color && styles.selectedColor
                    ]}
                    onPress={() => setNewSubject(prev => ({ ...prev, color }))}
                    activeOpacity={0.8}
                  />
                ))}
              </View>
            </View>

            {/* 삭제 버튼 (편집 모드일 때만) */}
            {getSubjectForCell(selectedCell?.day || 0, selectedCell?.period || 0) && (
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: themeColors.danger }]}
                onPress={deleteSubject}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteButtonText}>과목 삭제</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  timetableCard: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
  },
  timeHeaderCell: {
    width: 80,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  dayHeaderCell: {
    width: CELL_WIDTH,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  timeRow: {
    flexDirection: 'row',
  },
  timeCell: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    padding: 8,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 12,
  },
  subjectCell: {
    width: CELL_WIDTH,
    height: 80,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  subjectInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  subjectName: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 2,
  },
  teacherName: {
    fontSize: 9,
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 1,
  },
  classroomName: {
    fontSize: 8,
    color: 'white',
    textAlign: 'center',
    opacity: 0.8,
  },
  emptyCell: {
    fontSize: 20,
    opacity: 0.3,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalButtonText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#333',
    borderWidth: 3,
  },
  deleteButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

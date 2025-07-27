
import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getTimetable, saveTimetable } from '../../api/timetable';
import { searchSubjects, getAllSubjects, Subject } from '../../api/subjects';
import { Course } from '../../types/timetable';
import { useColorScheme } from '../../components/useColorScheme';

const { width } = Dimensions.get('window');
const CELL_WIDTH = (width - 80 - 32) / 5;

const SUBJECT_COLORS = [
  '#007AFF', '#FF6B6B', '#34C759', '#FF9500', '#8E44AD',
  '#3498DB', '#E67E22', '#95A5A6', '#E91E63', '#9C27B0',
  '#2196F3', '#00BCD4', '#4CAF50', '#FFEB3B', '#FF5722'
];

const DAYS = ['월', '화', '수', '목', '금'];
const PERIODS = [
  { period: '1교시', time: '09:00~09:50' },
  { period: '2교시', time: '10:00~10:50' },
  { period: '3교시', time: '11:00~11:50' },
  { period: '4교시', time: '12:00~12:50' },
  { period: '5교시', time: '13:30~14:20' },
  { period: '6교시', time: '14:30~15:20' },
  { period: '7교시', time: '15:30~16:20' }
];

const GRADES = [
  { label: '1학년', value: 1 },
  { label: '2학년', value: 2 },
  { label: '3학년', value: 3 },
];
const SEMESTERS = [
  { label: '1학기', value: 1 },
  { label: '2학기', value: 2 },
];

export default function TimetableScreen() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();

  const [grade, setGrade] = useState(1);
  const [semester, setSemester] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCourseModalVisible, setIsCourseModalVisible] = useState(false);
  const [isPickerModalVisible, setIsPickerModalVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ day: string; startTime: string } | null>(null);
  const [newCourse, setNewCourse] = useState<Partial<Course>>({});
  const [tempGrade, setTempGrade] = useState(grade);
  const [tempSemester, setTempSemester] = useState(semester);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Subject[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const themeColors = {
    background: colorScheme === 'dark' ? '#121212' : '#f2f2f7',
    cardBackground: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
    text: colorScheme === 'dark' ? '#EAEAEA' : '#333333',
    secondaryText: colorScheme === 'dark' ? '#A9A9A9' : '#8A8A8E',
    border: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    inputBackground: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
    modalBackground: colorScheme === 'dark' ? '#252525' : '#F9F9F9',
    accent: '#0A84FF',
    danger: '#FF453A',
    selectedItem: colorScheme === 'dark' ? '#0A84FF' : '#E5F3FF',
    selectedItemText: colorScheme === 'dark' ? '#FFFFFF' : '#007AFF',
  };

  const fetchTimetable = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await getTimetable(user.id, grade, semester);
      setCourses(data || []);
    } catch (error) {
      Alert.alert('오류', '시간표를 불러오는 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [user, grade, semester]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  useEffect(() => {
    const fetchAll = async () => {
      const results = await getAllSubjects();
      setSearchResults(results);
    };

    const search = async () => {
      const results = await searchSubjects(searchQuery);
      setSearchResults(results);
    };

    if (!isSearchFocused) {
      setSearchResults([]);
      return;
    }

    if (searchQuery.length > 1) {
      const debounce = setTimeout(() => search(), 300);
      return () => clearTimeout(debounce);
    } else {
      fetchAll();
    }
  }, [searchQuery, isSearchFocused]);

  const handleCellPress = (day: string, startTime: string) => {
    const existingCourse = courses.find(c => c.day === day && c.startTime === startTime);
    setSelectedCell({ day, startTime });
    setNewCourse(existingCourse || { day, startTime, color: SUBJECT_COLORS[courses.length % SUBJECT_COLORS.length] });
    setSearchQuery(existingCourse?.name || '');
    setSearchResults([]);
    setIsCourseModalVisible(true);
  };

  const handleSaveCourse = async () => {
    if (!user || !selectedCell || !newCourse.name) {
      Alert.alert('오류', '과목명을 입력해주세요.');
      return;
    }

    const updatedCourses = courses.filter(c => !(c.day === selectedCell.day && c.startTime === selectedCell.startTime));
    const courseToSave: Course = {
      id: newCourse.id || `${selectedCell.day}-${selectedCell.startTime}`,
      name: newCourse.name,
      day: selectedCell.day,
      startTime: newCourse.startTime,
      endTime: newCourse.endTime || '',
      classroom: newCourse.classroom || '',
      professor: newCourse.professor || '',
      credits: newCourse.credits || 0,
      color: newCourse.color || SUBJECT_COLORS[0],
    };
    updatedCourses.push(courseToSave);

    try {
      await saveTimetable(user.id, grade, semester, updatedCourses);
      setCourses(updatedCourses);
      setIsCourseModalVisible(false);
      Alert.alert('성공', '시간표가 저장되었습니다.');
    } catch (error) {
      Alert.alert('오류', '시간표 저장 중 오류가 발생했습니다.');
      console.error(error);
    }
  };

  const handleDeleteCourse = async () => {
    if (!user || !selectedCell) return;

    Alert.alert('과목 삭제', '이 과목을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const updatedCourses = courses.filter(c => !(c.day === selectedCell.day && c.startTime === selectedCell.startTime));
          try {
            await saveTimetable(user.id, grade, semester, updatedCourses);
            setCourses(updatedCourses);
            setIsCourseModalVisible(false);
          } catch (error) {
            Alert.alert('오류', '과목 삭제 중 오류가 발생했습니다.');
            console.error(error);
          }
        },
      },
    ]);
  };

  const getCourseForCell = (day: string, startTime: string) => {
    return courses.find(c => c.day === day && c.startTime === startTime);
  };

  const handlePickerConfirm = () => {
    setGrade(tempGrade);
    setSemester(tempSemester);
    setIsPickerModalVisible(false);
  };

  const renderCourseModal = () => (
    <Modal
      visible={isCourseModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setIsCourseModalVisible(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground }]}>
        <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={() => setIsCourseModalVisible(false)} style={styles.modalButton}>
            <Text style={[styles.modalButtonText, { color: themeColors.accent }]}>취소</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: themeColors.text }]}>
            {newCourse.id ? '과목 편집' : '과목 추가'}
          </Text>
          <TouchableOpacity onPress={handleSaveCourse} style={styles.modalButton}>
            <Text style={[styles.modalButtonText, { color: themeColors.accent, fontWeight: '600' }]}>저장</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          style={styles.modalContent}
          data={searchResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.searchResultItem,
                {
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.cardBackground,
                },
                index === 0 && styles.firstSearchResultItem,
                index === searchResults.length - 1 && styles.lastSearchResultItem,
              ]}
              onPress={() => {
                setNewCourse(prev => ({ ...prev, name: item.name }));
                setSearchQuery(item.name);
                setSearchResults([]);
              }}
            >
              <Text style={{ color: themeColors.text }}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            <View>
              <View style={[styles.inputGroup, { marginBottom: searchResults.length > 0 ? 0 : 24 }]}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>과목 검색</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder, color: themeColors.text }]}
                  placeholder="과목명을 검색하세요"
                  placeholderTextColor={themeColors.secondaryText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
              </View>
            </View>
          }
          ListFooterComponent={
            <View style={searchResults.length > 0 ? { marginTop: 24 } : {}}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>과목명 *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder, color: themeColors.text }]}
                  placeholder="과목명을 입력하세요"
                  placeholderTextColor={themeColors.secondaryText}
                  value={newCourse.name}
                  onChangeText={(text) => setNewCourse(prev => ({ ...prev, name: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>강의실</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder, color: themeColors.text }]}
                  placeholder="강의실을 입력하세요"
                  placeholderTextColor={themeColors.secondaryText}
                  value={newCourse.classroom}
                  onChangeText={(text) => setNewCourse(prev => ({ ...prev, classroom: text }))}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>색상</Text>
                <View style={styles.colorGrid}>
                  {SUBJECT_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        newCourse.color === color && styles.selectedColor
                      ]}
                      onPress={() => setNewCourse(prev => ({ ...prev, color }))}
                      activeOpacity={0.8}
                    />
                  ))}
                </View>
              </View>
              {newCourse.id && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteCourse}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.deleteButtonText, { color: themeColors.danger }]}>과목 삭제</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity 
          onPress={() => {
            setTempGrade(grade);
            setTempSemester(semester);
            setIsPickerModalVisible(true);
          }}
          style={styles.headerTitleContainer}
          activeOpacity={0.8}
        >
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{`${grade}학년 ${semester}학기`}</Text>
          <Text style={[styles.headerTitleIcon, { color: themeColors.secondaryText }]}> ▾</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={themeColors.accent} style={{ flex: 1 }} />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.timetableCard, { backgroundColor: themeColors.cardBackground }]}>
            <View style={styles.headerRow}>
              <View style={[styles.timeHeaderCell, { backgroundColor: themeColors.accent }]}>
                <Text style={styles.timeHeaderText}>시간</Text>
              </View>
              {DAYS.map((day) => (
                <View key={day} style={[styles.dayHeaderCell, { backgroundColor: themeColors.accent }]}>
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

            {PERIODS.map((periodInfo) => (
              <View key={periodInfo.period} style={styles.timeRow}>
                <View style={[styles.timeCell, { borderColor: themeColors.border }]}>
                  <Text style={[styles.periodText, { color: themeColors.text }]}>{periodInfo.period}</Text>
                  <Text style={[styles.timeText, { color: themeColors.secondaryText }]}>{periodInfo.time}</Text>
                </View>

                {DAYS.map((day) => {
                  const course = getCourseForCell(day, periodInfo.time.split('~')[0]);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.subjectCell,
                        { 
                          backgroundColor: course ? course.color : themeColors.cardBackground,
                          borderColor: themeColors.border
                        }
                      ]}
                      onPress={() => handleCellPress(day, periodInfo.time.split('~')[0])}
                      activeOpacity={0.7}
                    >
                      {course ? (
                        <View style={styles.subjectInfo}>
                          <Text style={styles.subjectName} numberOfLines={2}>{course.name}</Text>
                          {course.classroom && <Text style={styles.classroomName} numberOfLines={1}>{course.classroom}</Text>}
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
      )}

      {renderCourseModal()}

      <Modal
        visible={isPickerModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPickerModalVisible(false)}
      >
        <TouchableOpacity style={styles.pickerModalContainer} activeOpacity={1} onPress={() => setIsPickerModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.pickerModalContent, { backgroundColor: themeColors.modalBackground }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: themeColors.border }]}>
              <TouchableOpacity onPress={() => setIsPickerModalVisible(false)} style={styles.modalButton}>
                <Text style={{ color: themeColors.secondaryText, fontSize: 16 }}>취소</Text>
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: themeColors.text }]}>학년/학기 선택</Text>
              <TouchableOpacity onPress={handlePickerConfirm} style={styles.modalButton}>
                <Text style={{ color: themeColors.accent, fontSize: 16, fontWeight: '600' }}>확인</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerBody}>
              <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                {GRADES.map(item => (
                  <TouchableOpacity 
                    key={item.value} 
                    onPress={() => setTempGrade(item.value)}
                    style={[styles.pickerItem, tempGrade === item.value && { backgroundColor: themeColors.selectedItem }]}  
                  >
                    <Text style={[styles.pickerItemText, { color: themeColors.text }, tempGrade === item.value && { color: themeColors.selectedItemText, fontWeight: '600' }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                {SEMESTERS.map(item => (
                  <TouchableOpacity 
                    key={item.value} 
                    onPress={() => setTempSemester(item.value)}
                    style={[styles.pickerItem, tempSemester === item.value && { backgroundColor: themeColors.selectedItem }]}
                  >
                    <Text style={[styles.pickerItemText, { color: themeColors.text }, tempSemester === item.value && { color: themeColors.selectedItemText, fontWeight: '600' }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitleIcon: {
    fontSize: 18,
    marginLeft: 5,
  },
  content: { flex: 1, padding: 16 },
  timetableCard: { borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, overflow: 'hidden' },
  headerRow: { flexDirection: 'row' },
  timeHeaderCell: { width: 80, height: 50, justifyContent: 'center', alignItems: 'center' },
  timeHeaderText: { fontSize: 14, fontWeight: '600', color: 'white' },
  dayHeaderCell: { width: CELL_WIDTH, height: 50, justifyContent: 'center', alignItems: 'center' },
  dayHeaderText: { fontSize: 14, fontWeight: '600', color: 'white' },
  timeRow: { flexDirection: 'row' },
  timeCell: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderRightWidth: 1, padding: 4 },
  periodText: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  timeText: { fontSize: 10, textAlign: 'center', lineHeight: 12 },
  subjectCell: { width: CELL_WIDTH, height: 80, borderBottomWidth: 1, borderRightWidth: 1, justifyContent: 'center', alignItems: 'center', padding: 4 },
  subjectInfo: { alignItems: 'center', justifyContent: 'center', height: '100%', padding: 2 },
  subjectName: { fontSize: 12, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 2 },
  classroomName: { fontSize: 10, color: 'white', textAlign: 'center', opacity: 0.9 },
  emptyCell: { fontSize: 24, opacity: 0.2 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalButton: { paddingHorizontal: 8, paddingVertical: 8 },
  modalButtonText: { fontSize: 17 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalContent: { flex: 1, padding: 20 },
  inputGroup: { marginBottom: 24 },
  inputLabel: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  textInput: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  colorOption: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  selectedColor: { borderColor: '#333', borderWidth: 3 },
  deleteButton: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  pickerModalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, 
    shadowRadius: 10,
    elevation: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  pickerBody: {
    flexDirection: 'row',
    height: 220,
    marginTop: 12,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 2,
    marginHorizontal: 10,
  },
  pickerItemText: {
    fontSize: 18,
    textAlign: 'center',
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  firstSearchResultItem: {
    borderTopWidth: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  lastSearchResultItem: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
});

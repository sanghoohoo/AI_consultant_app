import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { uploadWithRetry, pollTaskStatus } from '../api/academic';
import { TaskStatus } from '../types/schoolRecord';

interface SchoolRecordUploadProps {
  accessToken: string;
  userEmail: string;
  themeColors: any;
  onUploadComplete: () => void;
}

export default function SchoolRecordUpload({
  accessToken,
  userEmail,
  themeColors,
  onUploadComplete,
}: SchoolRecordUploadProps) {
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [taskStatus, setTaskStatus] = useState('');

  // 파일 선택
  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];

      // 파일 크기 확인 (50MB)
      if (file.size && file.size > 50 * 1024 * 1024) {
        Alert.alert('파일 크기 오류', '파일 크기는 50MB 이하여야 합니다.');
        return;
      }

      setSelectedFile(file);
    } catch (error) {
      console.error('파일 선택 오류:', error);
      Alert.alert('오류', '파일을 선택할 수 없습니다.');
    }
  };

  // 업로드 시작
  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('알림', 'PDF 파일을 먼저 선택해주세요.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setTaskStatus('업로드 준비 중...');

    try {
      // 1단계: 파일 업로드
      setTaskStatus('PDF 파일 업로드 중...');
      setUploadProgress(10);

      const uploadResult = await uploadWithRetry(
        selectedFile.uri,
        selectedFile.name,
        userEmail,
        accessToken,
        3 // 최대 3회 재시도
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.message || '업로드에 실패했습니다.');
      }

      // 2단계: 작업 ID가 있으면 폴링 시작
      if (uploadResult.task_id) {
        setTaskStatus('생기부 분석 중...');
        setUploadProgress(30);

        await pollTaskStatus(
          uploadResult.task_id,
          accessToken,
          40, // 최대 40회 시도
          (status: TaskStatus) => {
            // 진행 상황 업데이트
            setTaskStatus(status.current_step || '처리 중...');
            setUploadProgress(30 + (status.progress * 0.7)); // 30-100%
          }
        );
      }

      // 3단계: 완료
      setUploadProgress(100);
      setTaskStatus('완료!');

      Alert.alert(
        '업로드 완료',
        `생기부 데이터가 성공적으로 처리되었습니다.\n(${uploadResult.total_records || 0}개 레코드)`,
        [
          {
            text: '확인',
            onPress: () => {
              setSelectedFile(null);
              setUploadProgress(0);
              setTaskStatus('');
              onUploadComplete();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('업로드 오류:', error);

      let errorTitle = '업로드 실패';
      let errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';

      if (error.message.includes('타임아웃') || error.message.includes('시간 초과')) {
        errorTitle = '처리 시간 초과';
        errorMessage = 'PDF 처리에 시간이 너무 오래 걸립니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('네트워크')) {
        errorTitle = '네트워크 오류';
        errorMessage = '서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.';
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorTitle = '인증 오류';
        errorMessage = '로그인이 만료되었습니다. 다시 로그인해주세요.';
      }

      Alert.alert(errorTitle, errorMessage, [
        { text: '취소', style: 'cancel' },
        { text: '재시도', onPress: handleUpload },
      ]);

      setTaskStatus('');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const styles = createStyles(themeColors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>생기부 PDF 업로드</Text>
      <Text style={styles.description}>
        학교생활기록부 PDF 파일을 업로드하면 자동으로 분석하여 정보를 추출합니다.
      </Text>

      {/* 파일 선택 버튼 */}
      <TouchableOpacity
        style={styles.filePickButton}
        onPress={handleFilePick}
        disabled={isUploading}
      >
        <Text style={styles.filePickButtonText}>
          {selectedFile ? '다른 파일 선택' : 'PDF 파일 선택'}
        </Text>
      </TouchableOpacity>

      {/* 선택된 파일 정보 */}
      {selectedFile && (
        <View style={styles.fileInfo}>
          <Text style={styles.fileInfoLabel}>선택된 파일:</Text>
          <Text style={styles.fileInfoValue} numberOfLines={1}>
            {selectedFile.name}
          </Text>
          {selectedFile.size && (
            <Text style={styles.fileInfoSize}>
              ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </Text>
          )}
        </View>
      )}

      {/* 업로드 버튼 */}
      <TouchableOpacity
        style={[
          styles.uploadButton,
          (!selectedFile || isUploading) && styles.uploadButtonDisabled,
        ]}
        onPress={handleUpload}
        disabled={!selectedFile || isUploading}
      >
        {isUploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.uploadButtonText}>처리 중...</Text>
          </View>
        ) : (
          <Text style={styles.uploadButtonText}>업로드 및 분석 시작</Text>
        )}
      </TouchableOpacity>

      {/* 진행 상황 */}
      {isUploading && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${uploadProgress}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(uploadProgress)}% - {taskStatus}
          </Text>
        </View>
      )}

      {/* 안내 문구 */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📌 안내사항</Text>
        <Text style={styles.infoText}>• PDF 파일만 업로드 가능합니다</Text>
        <Text style={styles.infoText}>• 최대 파일 크기: 50MB</Text>
        <Text style={styles.infoText}>• 처리 시간: 약 1-2분 소요</Text>
        <Text style={styles.infoText}>
          • 업로드 후 자동으로 10개 섹션의 데이터가 추출됩니다
        </Text>
      </View>
    </View>
  );
}

const createStyles = (themeColors: any) =>
  StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: themeColors.cardBackground,
      borderRadius: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: themeColors.text,
      marginBottom: 8,
    },
    description: {
      fontSize: 14,
      color: themeColors.secondaryText,
      marginBottom: 20,
      lineHeight: 20,
    },
    filePickButton: {
      backgroundColor: themeColors.activeButton,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 15,
    },
    filePickButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    fileInfo: {
      backgroundColor: themeColors.inputBackground,
      padding: 15,
      borderRadius: 8,
      marginBottom: 15,
    },
    fileInfoLabel: {
      fontSize: 12,
      color: themeColors.secondaryText,
      marginBottom: 5,
    },
    fileInfoValue: {
      fontSize: 14,
      color: themeColors.text,
      fontWeight: '500',
      marginBottom: 5,
    },
    fileInfoSize: {
      fontSize: 12,
      color: themeColors.secondaryText,
    },
    uploadButton: {
      backgroundColor: '#28a745',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 15,
    },
    uploadButtonDisabled: {
      backgroundColor: themeColors.secondaryText,
      opacity: 0.5,
    },
    uploadButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    uploadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    progressContainer: {
      marginBottom: 15,
    },
    progressBar: {
      height: 8,
      backgroundColor: themeColors.inputBackground,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      backgroundColor: themeColors.activeButton,
    },
    progressText: {
      fontSize: 12,
      color: themeColors.secondaryText,
      textAlign: 'center',
    },
    infoBox: {
      backgroundColor: themeColors.addProfileBackground,
      padding: 15,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: themeColors.activeButton,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: themeColors.text,
      marginBottom: 10,
    },
    infoText: {
      fontSize: 13,
      color: themeColors.secondaryText,
      marginBottom: 5,
      lineHeight: 18,
    },
  });
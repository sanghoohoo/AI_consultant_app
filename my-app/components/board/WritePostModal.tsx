
import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WritePostModalProps {
  visible: boolean;
  onClose: () => void;
  newPost: { title: string; content: string };
  setNewPost: (post: { title: string; content: string }) => void;
  onSubmit: () => void;
  themeColors: any; // TODO: Define a proper type for themeColors
}

export default function WritePostModal({
  visible,
  onClose,
  newPost,
  setNewPost,
  onSubmit,
  themeColors,
}: WritePostModalProps) {
  const handleSubmit = () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      Alert.alert('오류', '제목과 내용을 모두 입력해주세요.');
      return;
    }
    onSubmit();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground }]}>
        <View style={[styles.modalHeader, { backgroundColor: themeColors.modalBackground, borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.modalButton}>
            <Text style={[styles.modalButtonText, { color: themeColors.text }]}>취소</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: themeColors.text }]}>새 게시글</Text>
          <TouchableOpacity onPress={handleSubmit} style={styles.modalButton}>
            <Text style={[styles.modalButtonText, styles.submitButton]}>등록</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={[styles.modalContent, { backgroundColor: themeColors.modalBackground }]}>
          <TextInput
            style={[
              styles.titleInput,
              {
                backgroundColor: themeColors.inputBackground,
                borderColor: themeColors.inputBorder,
                color: themeColors.text,
              },
            ]}
            placeholder="제목을 입력하세요"
            placeholderTextColor={themeColors.secondaryText}
            value={newPost.title}
            onChangeText={(text) => setNewPost((prev) => ({ ...prev, title: text }))}
            multiline={false}
          />
          <TextInput
            style={[
              styles.contentInput,
              {
                backgroundColor: themeColors.inputBackground,
                borderColor: themeColors.inputBorder,
                color: themeColors.text,
              },
            ]}
            placeholder="내용을 입력하세요"
            placeholderTextColor={themeColors.secondaryText}
            value={newPost.content}
            onChangeText={(text) => setNewPost((prev) => ({ ...prev, content: text }))}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalButtonText: {
    fontSize: 16,
  },
  submitButton: {
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  contentInput: {
    fontSize: 16,
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 200,
  },
});

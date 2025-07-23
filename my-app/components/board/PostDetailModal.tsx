
import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Post, Comment } from '../../types/board';

interface PostDetailModalProps {
  visible: boolean;
  onClose: () => void;
  selectedPost: Post | null;
  comments: Comment[];
  newComment: string;
  setNewComment: (text: string) => void;
  createComment: () => void;
  togglePostLike: (postId: string) => void;
  toggleCommentLike: (commentId: string) => void;
  deletePost: (postId: string, authorId: string) => void;
  deleteComment: (commentId: string, authorId: string) => void;
  likedPosts: Set<string>;
  likedComments: Set<string>;
  user: any; // TODO: Define a proper type for user
  themeColors: any; // TODO: Define a proper type for themeColors
  colorScheme: 'light' | 'dark' | null | undefined;
}

export default function PostDetailModal({
  visible,
  onClose,
  selectedPost,
  comments,
  newComment,
  setNewComment,
  createComment,
  togglePostLike,
  toggleCommentLike,
  deletePost,
  deleteComment,
  likedPosts,
  likedComments,
  user,
  themeColors,
  colorScheme,
}: PostDetailModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground }]}>
        <View style={[styles.modalHeader, { backgroundColor: themeColors.modalBackground, borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.modalButton}>
            <Text style={[styles.modalButtonText, { color: themeColors.text }]}>닫기</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: themeColors.text }]}>게시글</Text>
          {selectedPost && user?.id === selectedPost.author_id ? (
            <TouchableOpacity
              onPress={() => deletePost(selectedPost.id, selectedPost.author_id)}
              style={styles.modalButton}
            >
              <Text style={[styles.modalButtonText, styles.deleteText]}>삭제</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.modalButton} />
          )}
        </View>

        {selectedPost && (
          <ScrollView style={[styles.modalContent, { backgroundColor: themeColors.modalBackground }]}>
            <View style={styles.postDetailContainer}>
              {selectedPost.is_pinned && <Text style={styles.pinnedBadge}>📌 공지</Text>}
              <Text style={[styles.postDetailTitle, { color: themeColors.text }]}>{selectedPost.title}</Text>

              <View style={styles.postDetailInfo}>
                <Text style={[styles.postDetailAuthor, { color: themeColors.secondaryText }]}>{selectedPost.author_name}</Text>
                <Text style={[styles.postDetailDate, { color: themeColors.secondaryText }]}>
                  {new Date(selectedPost.created_at).toLocaleString('ko-KR')}
                </Text>
              </View>

              <View style={styles.postDetailStats}>
                <Text style={[styles.postDetailStat, { color: themeColors.secondaryText }]}>👁 {selectedPost.view_count}</Text>
                <Text style={[styles.postDetailStat, { color: themeColors.secondaryText }]}>💬 {selectedPost.comment_count}</Text>
                <Text style={[styles.postDetailStat, { color: themeColors.secondaryText }]}>❤️ {selectedPost.like_count}</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

              <Text style={[styles.postDetailContent, { color: themeColors.text }]}>{selectedPost.content}</Text>

              {/* 댓글 섹션 */}
              <View style={styles.commentsSection}>
                {/* 좋아요 버튼 */}
                <View style={styles.postActions}>
                  <TouchableOpacity
                    onPress={() => togglePostLike(selectedPost.id)}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: likedPosts.has(selectedPost.id)
                          ? (colorScheme === 'dark' ? '#4a0e0e' : '#FFE8E8')
                          : themeColors.inputBackground,
                        borderColor: likedPosts.has(selectedPost.id)
                          ? (colorScheme === 'dark' ? '#dc2626' : '#FFB6B6')
                          : themeColors.inputBorder,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.actionButtonIcon,
                        likedPosts.has(selectedPost.id) && styles.likeActionButtonIconActive,
                      ]}
                    >
                      {likedPosts.has(selectedPost.id) ? '❤️' : '🤍'}
                    </Text>
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: themeColors.text },
                        likedPosts.has(selectedPost.id) && styles.likeActionButtonTextActive,
                      ]}
                    >
                      좋아요
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 댓글 작성 */}
                <View style={[styles.commentInputContainer, { backgroundColor: themeColors.modalBackground }]}>
                  <TextInput
                    style={[
                      styles.commentInput,
                      {
                        backgroundColor: themeColors.inputBackground,
                        borderColor: themeColors.inputBorder,
                        color: themeColors.text,
                      },
                    ]}
                    placeholder="댓글을 입력하세요..."
                    placeholderTextColor={themeColors.secondaryText}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.commentSubmitButton,
                      !newComment.trim() && { opacity: 0.5 },
                    ]}
                    onPress={createComment}
                    disabled={!newComment.trim()}
                  >
                    <Text style={styles.commentSubmitText}>등록</Text>
                  </TouchableOpacity>
                </View>

                {/* 댓글 목록 */}
                {comments.map((comment) => (
                  <View key={comment.id} style={[styles.commentItem, { backgroundColor: themeColors.cardBackground }]}>
                    <View style={styles.commentHeader}>
                      <Text style={[styles.commentAuthor, { color: themeColors.text }]}>{comment.author_name}</Text>
                      <View style={styles.commentActions}>
                        <Text style={[styles.commentDate, { color: themeColors.secondaryText }]}>
                          {new Date(comment.created_at).toLocaleString('ko-KR')}
                        </Text>
                        {user?.id === comment.author_id && (
                          <TouchableOpacity
                            onPress={() => deleteComment(comment.id, comment.author_id)}
                            style={[styles.commentDeleteButton, { backgroundColor: themeColors.likeActive }]}
                          >
                            <Text style={styles.commentDeleteText}>삭제</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.commentContent, { color: themeColors.text }]}>{comment.content}</Text>
                    <View style={styles.commentFooter}>
                      <TouchableOpacity
                        onPress={() => toggleCommentLike(comment.id)}
                        style={styles.commentLikeButton}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.commentLikeCount,
                            { color: themeColors.secondaryText },
                            likedComments.has(comment.id) && { color: themeColors.likeActive, fontWeight: '600' },
                          ]}
                        >
                          {likedComments.has(comment.id) ? '❤️' : '🤍'} {comment.like_count}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {comments.length === 0 && (
                  <Text style={[styles.noComments, { color: themeColors.secondaryText }]}>첫 번째 댓글을 작성해보세요!</Text>
                )}
              </View>
            </View>
          </ScrollView>
        )}
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
  deleteText: {
    color: '#FF6B6B',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  postDetailContainer: {
    padding: 16,
  },
  postDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 32,
  },
  postDetailInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  postDetailAuthor: {
    fontSize: 16,
    fontWeight: '600',
  },
  postDetailDate: {
    fontSize: 14,
  },
  postDetailStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  postDetailStat: {
    fontSize: 14,
    marginRight: 16,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  postDetailContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  commentsSection: {
    marginTop: 16,
  },
  commentInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 100,
  },
  commentSubmitButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#007AFF',
  },
  commentSubmitText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  commentItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentDate: {
    fontSize: 12,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  commentLikeButton: {
    padding: 4,
  },
  commentLikeCount: {
    fontSize: 12,
  },
  noComments: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 20,
    marginBottom: 20,
  },
  pinnedBadge: {
    fontSize: 14,
    marginRight: 6,
  },
  postActions: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionButtonIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  likeActionButtonIconActive: {
    // 이모지 자체는 색상 변경이 어려움
  },
  likeActionButtonTextActive: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentDeleteButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    opacity: 0.8,
  },
  commentDeleteText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
});

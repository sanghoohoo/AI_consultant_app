
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useColorScheme } from '../../components/useColorScheme';
import { Category, Post, Comment } from '../../types/board';
import {
  fetchCategoriesAPI,
  fetchPostsAPI,
  createPostAPI,
  fetchCommentsAPI,
  createCommentAPI,
  toggleLikeAPI,
  deletePostAPI,
  deleteCommentAPI,
} from '../../api/board';

import PostList from '../../components/board/PostList';
import WritePostModal from '../../components/board/WritePostModal';
import PostDetailModal from '../../components/board/PostDetailModal';

export default function BoardScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [showMyPosts, setShowMyPosts] = useState(false);

  // 다크모드 대응 색상 정의
  const themeColors = {
    background: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
    cardBackground: colorScheme === 'dark' ? '#2d2d2d' : '#fff',
    text: colorScheme === 'dark' ? '#fff' : '#333',
    secondaryText: colorScheme === 'dark' ? '#ccc' : '#666',
    border: colorScheme === 'dark' ? '#444' : '#e1e1e1',
    inputBackground: colorScheme === 'dark' ? '#3d3d3d' : '#fff',
    inputBorder: colorScheme === 'dark' ? '#555' : '#ddd',
    categoryActive: '#007AFF',
    categoryInactive: colorScheme === 'dark' ? '#3d3d3d' : '#e1e1e1',
    categoryActiveText: '#fff',
    categoryInactiveText: colorScheme === 'dark' ? '#ccc' : '#666',
    modalBackground: colorScheme === 'dark' ? '#2d2d2d' : '#fff',
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
    likeActive: '#ff3b30',
    likeInactive: colorScheme === 'dark' ? '#666' : '#ccc',
  };

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategoriesAPI();
      setCategories(data);
      if (data.length > 0 && !selectedCategory && !showMyPosts) {
        setSelectedCategory(data[0].id);
      }
    } catch (error) {
      console.error('카테고리 가져오기 오류:', error);
    }
  }, [selectedCategory, showMyPosts]);

  const loadPosts = useCallback(async (categoryId?: number) => {
    if (!categoryId && !showMyPosts) return;
    setLoading(true);
    try {
      const data = await fetchPostsAPI(categoryId || null, showMyPosts ? user?.id : undefined);
      setPosts(data);
    } catch (error) {
      console.error('게시글 가져오기 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [showMyPosts, user?.id]);

  const handleCreatePost = async () => {
    if (!user || !selectedCategory) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    try {
      await createPostAPI({
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        category_id: selectedCategory,
        author_id: user.id,
        author_name: user.email?.split('@')[0] || '익명',
      });
      Alert.alert('성공', '게시글이 작성되었습니다.');
      setShowWriteModal(false);
      setNewPost({ title: '', content: '' });
      loadPosts(selectedCategory);
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      Alert.alert('오류', '게시글 작성에 실패했습니다.');
    }
  };

  const incrementViewCount = async (postId: string) => {
    try {
      await supabase
        .from('board_views')
        .insert({
          post_id: postId,
          user_id: user?.id,
          ip_address: null
        });
    } catch (error) {
      console.log('조회수 증가 오류 (중복 가능):', error);
    }
  };

  const loadComments = useCallback(async (postId: string) => {
    try {
      const data = await fetchCommentsAPI(postId);
      setComments(data);
    } catch (error) {
      console.error('댓글 가져오기 오류:', error);
    }
  }, []);

  const handleCreateComment = async () => {
    if (!user || !selectedPost || !newComment.trim()) {
      Alert.alert('오류', '댓글 내용을 입력해주세요.');
      return;
    }
    try {
      await createCommentAPI({
        content: newComment.trim(),
        post_id: selectedPost.id,
        author_id: user.id,
        author_name: user.email?.split('@')[0] || '익명',
      });
      setNewComment('');
      loadComments(selectedPost.id);
      loadPosts(selectedCategory!);
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      Alert.alert('오류', '댓글 작성에 실패했습니다.');
    }
  };

  const checkUserLikes = useCallback(async (postId: string) => {
    if (!user) return;
    try {
      const { data: likes } = await supabase
        .from('board_likes')
        .select('post_id, comment_id')
        .eq('user_id', user.id);

      if (likes) {
        const postLikes = new Set(
          likes.filter(like => like.post_id !== null).map(like => like.post_id)
        );
        const commentLikes = new Set(
          likes.filter(like => like.comment_id !== null).map(like => like.comment_id)
        );
        setLikedPosts(postLikes);
        setLikedComments(commentLikes);
      }
    } catch (error) {
      console.error('좋아요 상태 확인 오류:', error);
    }
  }, [user]);

  const handleTogglePostLike = async (postId: string) => {
    if (!user) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }
    try {
      await toggleLikeAPI(user.id, postId, undefined);
      await checkUserLikes(postId);
      loadPosts(selectedCategory!);
      if (selectedPost && selectedPost.id === postId) {
        const { data: updatedPost } = await supabase
          .from('board_posts')
          .select('*')
          .eq('id', postId)
          .single();
        if (updatedPost) {
          setSelectedPost(updatedPost);
        }
      }
    } catch (error) {
      console.error('좋아요 처리 오류:', error);
      Alert.alert('오류', '좋아요 처리에 실패했습니다.');
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!user) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }
    try {
      await toggleLikeAPI(user.id, undefined, commentId);
      await checkUserLikes(selectedPost?.id || '');
      if (selectedPost) {
        loadComments(selectedPost.id);
      }
    } catch (error) {
      console.error('댓글 좋아요 처리 오류:', error);
      Alert.alert('오류', '좋아요 처리에 실패했습니다.');
    }
  };

  const handleDeletePost = async (postId: string, authorId: string) => {
    if (!user || user.id !== authorId) {
      Alert.alert('오류', '본인이 작성한 게시글만 삭제할 수 있습니다.');
      return;
    }
    Alert.alert(
      '게시글 삭제',
      '정말로 이 게시글을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePostAPI(postId);
              Alert.alert('성공', '게시글이 삭제되었습니다.');
              if (showDetailModal && selectedPost?.id === postId) {
                setShowDetailModal(false);
                setSelectedPost(null);
                setComments([]);
                setNewComment('');
              }
              loadPosts(selectedCategory || undefined);
            } catch (error) {
              console.error('게시글 삭제 오류:', error);
              Alert.alert('오류', '게시글 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteComment = async (commentId: string, authorId: string) => {
    if (!user || user.id !== authorId) {
      Alert.alert('오류', '본인이 작성한 댓글만 삭제할 수 있습니다.');
      return;
    }
    Alert.alert(
      '댓글 삭제',
      '정말로 이 댓글을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCommentAPI(commentId);
              Alert.alert('성공', '댓글이 삭제되었습니다.');
              if (selectedPost) {
                loadComments(selectedPost.id);
              }
              loadPosts(selectedCategory || undefined);
            } catch (error) {
              console.error('댓글 삭제 오류:', error);
              Alert.alert('오류', '댓글 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCategories();
    await loadPosts(selectedCategory || undefined);
    if (user) {
      await checkUserLikes(selectedPost?.id || '');
    }
    setRefreshing(false);
  }, [loadCategories, loadPosts, checkUserLikes, selectedCategory, selectedPost, user]);

  const openPostDetail = useCallback(async (post: Post) => {
    setSelectedPost(post);
    setShowDetailModal(true);
    incrementViewCount(post.id);
    await loadComments(post.id);
    await checkUserLikes(post.id);
  }, [loadComments, checkUserLikes]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (selectedCategory || showMyPosts) {
      loadPosts(selectedCategory || undefined);
    }
  }, [selectedCategory, showMyPosts, loadPosts]);

  useEffect(() => {
    if (user) {
      checkUserLikes(selectedPost?.id || '');
    }
  }, [user, checkUserLikes, selectedPost]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* 카테고리 탭 */}
      <View style={[styles.categoryContainer, { backgroundColor: themeColors.cardBackground, borderBottomColor: themeColors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryList}>
            {/* 내가 쓴 글 토글 */}
            <TouchableOpacity
              style={[
                styles.categoryTab,
                styles.myPostsTab,
                { 
                  backgroundColor: showMyPosts ? themeColors.categoryActive : themeColors.categoryInactive,
                  borderColor: themeColors.border 
                }
              ]}
              onPress={() => {
                setShowMyPosts(!showMyPosts);
                if (!showMyPosts) {
                  setSelectedCategory(null);
                }
              }}
            >
              <Text style={styles.categoryIcon}>📝</Text>
              <Text style={[
                styles.categoryName,
                { color: showMyPosts ? themeColors.categoryActiveText : themeColors.categoryInactiveText }
              ]}>
                내가 쓴 글
              </Text>
            </TouchableOpacity>
            
            {/* 카테고리 목록 */}
            {categories.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.categoryTab,
                  { 
                    backgroundColor: (selectedCategory === item.id && !showMyPosts) ? themeColors.categoryActive : themeColors.categoryInactive,
                    borderColor: themeColors.border 
                  }
                ]}
                onPress={() => {
                  setSelectedCategory(item.id);
                  setShowMyPosts(false);
                }}
              >
                <Text style={styles.categoryIcon}>{item.icon}</Text>
                <Text style={[
                  styles.categoryName,
                  { color: (selectedCategory === item.id && !showMyPosts) ? themeColors.categoryActiveText : themeColors.categoryInactiveText }
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 게시글 목록 */}
      <PostList
        posts={posts}
        themeColors={themeColors}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onPostPress={openPostDetail}
        showMyPosts={showMyPosts}
      />

      {/* 글쓰기 버튼 */}
      <TouchableOpacity
        style={styles.writeButton}
        onPress={() => setShowWriteModal(true)}
      >
        <Text style={styles.writeButtonText}>✏️</Text>
      </TouchableOpacity>

      {/* 글쓰기 모달 */}
      <WritePostModal
        visible={showWriteModal}
        onClose={() => setShowWriteModal(false)}
        newPost={newPost}
        setNewPost={setNewPost}
        onSubmit={handleCreatePost}
        themeColors={themeColors}
      />

      {/* 게시글 상세보기 모달 */}
      <PostDetailModal
        visible={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPost(null);
          setComments([]);
          setNewComment('');
        }}
        selectedPost={selectedPost}
        comments={comments}
        newComment={newComment}
        setNewComment={setNewComment}
        createComment={handleCreateComment}
        togglePostLike={handleTogglePostLike}
        toggleCommentLike={handleToggleCommentLike}
        deletePost={handleDeletePost}
        deleteComment={handleDeleteComment}
        likedPosts={likedPosts}
        likedComments={likedComments}
        user={user}
        themeColors={themeColors}
        colorScheme={colorScheme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryContainer: {
    borderBottomWidth: 1,
  },
  categoryList: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  writeButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  writeButtonText: {
    fontSize: 24,
    color: 'white',
  },
  myPostsTab: {
    backgroundColor: '#E8F4FD',
  },
});

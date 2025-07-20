
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Post } from '../../types/board';

interface PostListProps {
  posts: Post[];
  themeColors: any; // TODO: Define a proper type for themeColors
  refreshing: boolean;
  onRefresh: () => void;
  onPostPress: (post: Post) => void;
  showMyPosts: boolean;
}

export default function PostList({
  posts,
  themeColors,
  refreshing,
  onRefresh,
  onPostPress,
  showMyPosts,
}: PostListProps) {
  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={[
        styles.postItem,
        { backgroundColor: themeColors.cardBackground, borderBottomColor: themeColors.border },
        item.is_pinned && styles.pinnedPost,
      ]}
      onPress={() => onPostPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.postHeader}>
        <View style={styles.postTitleContainer}>
          {item.is_pinned && <Text style={styles.pinnedBadge}>📌</Text>}
          <Text style={[styles.postTitle, { color: themeColors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      </View>
      <Text style={[styles.postContentText, { color: themeColors.secondaryText }]} numberOfLines={3}>
        {item.content}
      </Text>
      <View style={styles.postFooter}>
        <Text style={[styles.postAuthor, { color: themeColors.secondaryText }]}>{item.author_name}</Text>
        <View style={styles.postStats}>
          <Text style={[styles.postStat, { marginLeft: 0, color: themeColors.secondaryText }]}>👁 {item.view_count}</Text>
          <Text style={[styles.postStat, { color: themeColors.secondaryText }]}>💬 {item.comment_count}</Text>
          <Text style={[styles.postStat, { color: themeColors.secondaryText }]}>❤️ {item.like_count}</Text>
        </View>
      </View>
      <Text style={[styles.postDate, { color: themeColors.secondaryText }]}>
        {new Date(item.created_at).toLocaleString('ko-KR')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={posts}
      renderItem={renderPost}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.postList}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={() => (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: themeColors.text }]}>
            {showMyPosts ? '작성한 게시글이 없습니다.' : '게시글이 없습니다.'}
          </Text>
          <Text style={[styles.emptySubText, { color: themeColors.secondaryText }]}>
            {showMyPosts ? '첫 번째 게시글을 작성해보세요!' : '첫 번째 게시글을 작성해보세요!'}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  postList: {
    padding: 16,
  },
  postItem: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pinnedPost: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pinnedBadge: {
    fontSize: 14,
    marginRight: 6,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  postContentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  postAuthor: {
    fontSize: 12,
    fontWeight: '500',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStat: {
    fontSize: 12,
    marginLeft: 12,
  },
  postDate: {
    fontSize: 11,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
  },
});

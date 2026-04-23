import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, Share, Modal, TextInput, ScrollView } from 'react-native';
import { useAppContext } from '../store/AppContext';

export function HomeScreen({ onNavigateToProfile }: { onNavigateToProfile?: (userId: string) => void }) {
  const { state } = useAppContext();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [activeComments, setActiveComments] = useState<any[]>([]);
  const [sendingPostId, setSendingPostId] = useState<{ id: string, content: string } | null>(null);
  // Modal for viewing an individual/original post (used when opening reposts)
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedPostComments, setSelectedPostComments] = useState<any[]>([]);
  const [selectedPostLoading, setSelectedPostLoading] = useState(false);

  // Fetch posts helper so we can call it after repost actions
  const fetchPosts = async () => {
    try {
      setLoading(true);
      if (!state.token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/posts`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [state.token]);

  const openPostModal = async (postId: string) => {
    if (!postId) return;
    const found = posts.find(p => p.id === postId || p.originalPostId === postId);
    if (found) setSelectedPost(found);
    setSelectedPostLoading(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/posts/${postId}/comments`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedPostComments(data);
      }
    } catch (e) {
      console.error('Error loading post comments', e);
    } finally {
      setSelectedPostLoading(false);
    }
  };

  
  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(posts.map(p => p.id === postId ? { ...p, likesCount: data.likesCount, hasLiked: !p.hasLiked } : p));
      }
    } catch (e) {}
  };

  const handleRepost = async (postId: string) => {
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/posts/${postId}/repost`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (res.ok) {
        // refresh the feed so repost clones appear/disappear like LinkedIn
        await fetchPosts();
      }
    } catch (e) {
      console.error('Repost error', e);
    }
  };

const handleCommentClick = async (postId: string) => {
    setCommentingPostId(postId);
    setCommentText('');
    setActiveComments([]);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/posts/${postId}/comments`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveComments(data);
      }
    } catch (e) {}
  };

  const handleComment = async (postId: string, text: string) => {
    if (!text.trim()) return;
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/posts/${postId}/comment`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${state.token}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({ content: text })
      });
      if (res.ok) {
         const data = await res.json();
         setPosts(posts.map(p => p.id === postId ? { ...p, commentsCount: data.commentsCount } : p));
         // Optimistically prepend comment
         setActiveComments([{ id: Date.now().toString(), content: text, user: { name: state.activeUser?.name, avatarUrl: state.activeUser?.avatarUrl }, createdAt: new Date().toISOString() }, ...activeComments]);
      }
    } catch (e) {}
  };

  const handleCommentInModal = async (postId: string, text: string) => {
    if (!text.trim()) return;
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/posts/${postId}/comment`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${state.token}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({ content: text })
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(posts.map(p => p.id === postId ? { ...p, commentsCount: data.commentsCount } : p));
        setSelectedPostComments([{ id: Date.now().toString(), content: text, user: { name: state.activeUser?.name, avatarUrl: state.activeUser?.avatarUrl }, createdAt: new Date().toISOString() }, ...selectedPostComments]);
        setCommentText('');
      }
    } catch (e) {
      console.error('Failed to post comment in modal', e);
    }
  };

  const submitComment = () => {
    if (commentingPostId && commentText) {
      handleComment(commentingPostId, commentText);
      setCommentText('');
    }
  };

  const handleSendAction = async (method: 'native' | 'whatsapp' | 'message', userId?: string) => {
    if (!sendingPostId) return;
    const shareText = `Check out this post on ConnectIn: "${sendingPostId.content.substring(0,50)}..."`;
    try {
      if (method === 'native') await Share.share({ message: shareText });
      // Add other providers via Linking API if needed (whatsapp://send?text=...)
    } catch(e) {}
    setSendingPostId(null);
  };

  const renderPost = ({ item }: { item: any }) => {
    // If repost clone — render as an outer repost wrapper with nested original post
    if (item.isRepostClone) {
      return (
        <View style={styles.postContainer}>
          {/* Repost Header matches LinkedIn exactly */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
            <TouchableOpacity onPress={() => onNavigateToProfile?.(item.repostedById)} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Image source={{ uri: (item.repostedByAvatar && !item.repostedByAvatar.includes('faker-js') ? item.repostedByAvatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.repostedByName || 'Someone')}&background=random`) }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} />
              <Text style={{ color: '#4B5563', fontSize: 13 }}>
                <Text style={{ fontWeight: 'bold', color: '#111827' }}>{item.repostedByName || 'Someone'}</Text> reposted this
              </Text>
            </TouchableOpacity>
            <TouchableOpacity hitSlop={{top: 10, bottom: 10, left: 10, right: 10}} style={{ marginRight: 16 }}>
              <Text style={{ color: '#6B7280', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }}>•••</Text>
            </TouchableOpacity>
            <TouchableOpacity hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={{ color: '#6B7280', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={0.9} onPress={() => openPostModal(item.originalPostId)}>
            <View>
              {/* Original Post Header */}
              <View style={styles.postHeader}>
                <TouchableOpacity onPress={() => onNavigateToProfile?.(item.author.id)}>
                  <Image
                    source={{ uri: (item.author.avatarUrl && !item.author.avatarUrl.includes('faker-js') ? item.author.avatarUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author.name || 'User')}&background=random`) }} 
                    style={styles.avatar}
                  />
                </TouchableOpacity>
                <View style={styles.headerText}>
                  <TouchableOpacity onPress={() => onNavigateToProfile?.(item.author.id)}>
                    <Text style={styles.authorName}>{item.author.name}</Text>
                  </TouchableOpacity>
                  <Text style={styles.authorRole}>{item.author.role}</Text>
                  <Text style={styles.timeAgo}>{new Date(item.originalCreatedAt || item.createdAt).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'transparent' }}>•••</Text> 
                  {/* Hide the inner ••• so it matches LinkedIn (only top level ••• shows in reposts typically, or we can leave it hidden for neatness) */}
                </TouchableOpacity>
              </View>

              <Text style={styles.postContent}>{item.content}</Text>
              {item.imageUrl && (
                <Image style={styles.postImage} source={{ uri: item.imageUrl.replace('http://localhost:4000', process.env.EXPO_PUBLIC_API_URL || 'http://10.0.69.111:4000') }} />
              )}
            </View>
          </TouchableOpacity>

          {/* Engagement Stats for the original post */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>👍 💙 👏 {item.likesCount || 0}</Text>
            <Text style={styles.statsText}>{item.commentsCount || 0} comments • {item.repostsCount || 0} reposts</Text>
          </View>

          {/* Action Buttons (operate on original post id) */}
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.originalPostId || item.id)}>
              <Text style={[styles.actionText, item.hasLiked && { color: "#2563EB" }]}>👍 Like</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleCommentClick(item.originalPostId || item.id)}>
              <Text style={styles.actionText}>💬 Comment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleRepost(item.originalPostId || item.id)}>
              <Text style={[styles.actionText, item.hasReposted && { color: "#10B981" }]}>🔁 Repost</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setSendingPostId({ id: item.originalPostId || item.id, content: item.content })}>
              <Text style={styles.actionText}>↗️ Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Normal post fallback
    return (
      <View style={styles.postContainer}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity onPress={() => onNavigateToProfile?.(item.author.id)}>
            <Image
              source={{ uri: (item.author.avatarUrl && !item.author.avatarUrl.includes('faker-js') ? item.author.avatarUrl : null) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author.name || 'User')}&background=random` }} 
              style={styles.avatar}
            />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <TouchableOpacity onPress={() => onNavigateToProfile?.(item.author.id)}>
              <Text style={styles.authorName}>{item.author.name}</Text>
            </TouchableOpacity>
            <Text style={styles.authorRole}>{item.author.role}</Text>
            <Text style={styles.timeAgo}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.moreOptions}>•••</Text>
          </TouchableOpacity>
        </View>

        {/* Post Content */}
        <Text style={styles.postContent}>{item.content}</Text>

        {/* Image if available */}
        {item.imageUrl && (
          <TouchableOpacity onPress={() => onNavigateToProfile?.(item.author.id)}>
              <Image style={styles.postImage} source={{ uri: item.imageUrl.replace('http://localhost:4000', process.env.EXPO_PUBLIC_API_URL || 'http://10.0.69.111:4000') }} />
          </TouchableOpacity>
        )}

        {/* Engagement Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>👍 💙 👏 {item.likesCount || 0}</Text>
          <Text style={styles.statsText}>{item.commentsCount || 0} comments • {item.repostsCount || 0} reposts</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.originalPostId || item.id)}>
            <Text style={[styles.actionText, item.hasLiked && { color: "#2563EB" }]}>👍 Like</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleCommentClick(item.originalPostId || item.id)}>
            <Text style={styles.actionText}>💬 Comment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleRepost(item.originalPostId || item.id)}>
            <Text style={[styles.actionText, item.hasReposted && { color: "#10B981" }]}>🔁 Repost</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setSendingPostId({ id: item.originalPostId || item.id, content: item.content })}>
            <Text style={styles.actionText}>↗️ Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.feed}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
           <View style={{ padding: 24, alignItems: 'center'}}>
             <Text style={{ color: '#6B7280', fontSize: 16 }}>No posts found in your feed.</Text>
           </View>
        }
      />

      {/* Comment Modal */}
      <Modal visible={!!commentingPostId} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', height: '80%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Comments</Text>
            <FlatList 
              data={activeComments}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                  <Image source={{ uri: (item.user?.avatarUrl && !item.user.avatarUrl.includes('faker-js') ? item.user.avatarUrl : null) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user?.name || 'User')}&background=random` }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }} />
                  <View style={{ flex: 1, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{item.user?.name}</Text>
                    <Text style={{ fontSize: 14, color: '#374151', marginTop: 4 }}>{item.content}</Text>
                  </View>
                </View>
              )}
            />
            <View style={{ borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 16 }}>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, minHeight: 60, textAlignVertical: 'top' }}
                placeholder="What are your thoughts?"
                multiline
                value={commentText}
                onChangeText={setCommentText}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 12 }}>
                <TouchableOpacity onPress={() => setCommentingPostId(null)} style={{ padding: 12 }}>
                  <Text style={{ color: '#6B7280', fontWeight: 'bold' }}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={submitComment} style={{ backgroundColor: '#6366F1', padding: 12, borderRadius: 8 }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Send / Share Modal */}
      <Modal visible={!!sendingPostId} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Send to Connections</Text>
            
            {/* Mock Connections List */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity key={i} style={{ alignItems: 'center', marginRight: 16 }} onPress={() => handleSendAction('message', `user-${i}`)}>
                  <Image source={{ uri: `https://i.pravatar.cc/150?img=${i+10}` }} style={{ width: 56, height: 56, borderRadius: 28, marginBottom: 8 }} />
                  <Text style={{ fontSize: 12, color: '#374151' }}>User {i}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 16, gap: 12 }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={() => handleSendAction('native')}>
                <Text style={{ fontSize: 24, marginRight: 16 }}>📱</Text>
                <Text style={{ fontSize: 16, fontWeight: '500' }}>More Options (Native Share)</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={{ padding: 16, alignItems: 'center', marginTop: 8 }} onPress={() => setSendingPostId(null)}>
              <Text style={{ color: '#6B7280', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Post Detail Modal (for opening original posts from reposts) */}
      <Modal visible={!!selectedPost} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', height: '80%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
            {selectedPostLoading ? (
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#6366F1" />
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Image source={{ uri: (selectedPost?.author?.avatarUrl && !selectedPost.author.avatarUrl.includes('faker-js') ? selectedPost.author.avatarUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPost?.author?.name || 'User')}&background=random`) }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{selectedPost?.author?.name}</Text>
                    <Text style={{ color: '#6B7280' }}>{new Date(selectedPost?.originalCreatedAt || selectedPost?.createdAt).toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setSelectedPost(null); setSelectedPostComments([]); }}>
                    <Text style={{ color: '#6B7280', fontWeight: '600' }}>Close</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: '#1F2937', marginBottom: 12 }}>{selectedPost?.content}</Text>
                  {selectedPost?.imageUrl && <Image source={{ uri: selectedPost.imageUrl.replace('http://localhost:4000', process.env.EXPO_PUBLIC_API_URL || 'http://10.0.69.111:4000') }} style={{ width: '100%', height: 240, marginBottom: 12 }} />}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ color: '#6B7280' }}>{selectedPost?.likesCount || 0} likes</Text>
                    <Text style={{ color: '#6B7280' }}>{selectedPost?.commentsCount || 0} comments</Text>
                  </View>

                  <FlatList
                    data={selectedPostComments}
                    keyExtractor={c => c.id}
                    renderItem={({ item }) => (
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Image source={{ uri: (item.user?.avatarUrl && !item.user.avatarUrl.includes('faker-js') ? item.user.avatarUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user?.name || 'User')}&background=random`) }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }} />
                        <View style={{ flex: 1, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 }}>
                          <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{item.user?.name}</Text>
                          <Text style={{ fontSize: 14, color: '#374151', marginTop: 4 }}>{item.content}</Text>
                        </View>
                      </View>
                    )}
                  />
                </ScrollView>

                <View style={{ borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 12 }}>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, minHeight: 60, textAlignVertical: 'top' }}
                    placeholder="Write a comment"
                    multiline
                    value={commentText}
                    onChangeText={setCommentText}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                    <TouchableOpacity onPress={() => { if (selectedPost) handleCommentInModal(selectedPost.originalPostId || selectedPost.id, commentText); }} style={{ backgroundColor: '#6366F1', padding: 12, borderRadius: 8 }}>
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>Post</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // modern off-white background
  },
  feed: {
    paddingBottom: 20,
  },
  postContainer: {
    backgroundColor: 'white',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  postHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerText: {
    flex: 1,
    justifyContent: 'center',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  authorRole: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  moreOptions: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  postContent: {
    fontSize: 15,
    color: '#1F2937',
    paddingHorizontal: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 300,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statsText: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  }
});

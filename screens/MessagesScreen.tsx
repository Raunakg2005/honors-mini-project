 import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, TextInput, ScrollView, Modal, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';  
import { useAppContext } from '../store/AppContext';
import { UserProfile } from '../types';

interface MessageThread {
  id: string;
  participant: UserProfile;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
}

export function MessagesScreen({ initialUserId }: { initialUserId?: string }) {
  const { state } = useAppContext();
  
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeThread, setActiveThread] = useState<MessageThread | null>(null);
  const [composingMsg, setComposingMsg] = useState('');
  const [chatMessages, setChatMessages] = useState<{id: string, text: string, sentByMe: boolean}[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [activeRoleFilter, setActiveRoleFilter] = useState<string | null>(null);
  const [showRoleListModal, setShowRoleListModal] = useState(false);

  // Derive unique job titles securely
  const uniqueRoles = Array.from(new Set(threads.map(t => t.participant.role).filter(Boolean)));

  // Fetch threads on mount
  React.useEffect(() => {
    const fetchThreads = async () => {
      try {
        setLoadingThreads(true);
        const [res, connRes] = await Promise.all([
          fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/messages/threads`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
          }),
          fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/${state.activeUser?.id}/connections`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
          })
        ]);

        if (res.ok && connRes.ok) {
          const data = await res.json();
          const connData = await connRes.json();
          
          // Map connection list to thread objects
          const connectionsThreads = connData.map((conn: any) => {
            const existingThread = data.find((t: any) => t.participant.id === conn.id);
            if (existingThread) {
              return existingThread;
            } else {
              return {
                id: `thread-${conn.id}`,
                participant: conn,
                lastMessage: 'Tap to start a conversation...',
                timestamp: new Date(0).toISOString(),
                unread: false
              } as MessageThread;
            }
          });

          // Sort threads by timestamp descending (most recent first)
          const sortedData = connectionsThreads.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setThreads(sortedData);

          if (initialUserId) {
             const existingThread = sortedData.find((t: any) => t.participant.id === initialUserId);
             if (existingThread) {
               handleThreadPress(existingThread);
             } else {
               // If thread doesn't exist yet, create a dummy one dynamically without saving to DB yet
               // Fetch user info briefly
               fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/${initialUserId}`, {
                 headers: { 'Authorization': `Bearer ${state.token}` }
               }).then(r => r.json()).then(user => {
                 const newThread = {
                   id: `thread-${user.id}`,
                   participant: user,
                   lastMessage: 'Start a conversation...',
                   timestamp: new Date().toISOString(),
                   unread: false
                 } as MessageThread;
                 setThreads(prev => [newThread, ...prev]);
                 handleThreadPress(newThread);
               }).catch(console.error);
             }
          }
        }
      } catch (err) {
        console.error('Failed to fetch threads', err);
      } finally {
        setLoadingThreads(false);
      }
    };
    if (state.token) fetchThreads();
  }, [state.token, initialUserId]);

  const handleThreadPress = async (thread: MessageThread) => {
    setActiveThread(thread);
    setChatMessages([]);
    setLoadingChat(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/messages/${thread.participant.id}`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (res.ok) {
        const messages = await res.json();
        setChatMessages(messages.map((m: any) => ({
          id: m.id,
          text: m.content,
          sentByMe: m.senderId === state.activeUser?.id
        })));
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    } finally {
      setLoadingChat(false);
    }
  };

  const sendMessage = async () => {
    if (composingMsg.trim() && activeThread) {
      const tempMsg = composingMsg;
      setComposingMsg('');
      // Optimistic update
      const fakeId = Date.now().toString();
      setChatMessages((prev) => [...prev, { id: fakeId, text: tempMsg, sentByMe: true }]);

      // Optimistic update thread list
      setThreads(prev => {
        const updated = prev.filter(t => t.id !== activeThread.id);
        const thisThread = prev.find(t => t.id === activeThread.id) || activeThread;
        return [{ ...thisThread, lastMessage: tempMsg, timestamp: new Date().toISOString() }, ...updated];
      });

      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/messages/${activeThread.participant.id}`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: tempMsg })
        });
        if (!res.ok) {
          // Revert if error
          setChatMessages((prev) => prev.filter(m => m.id !== fakeId));
          alert('Failed to send message');
        }
      } catch (e) {
         setChatMessages((prev) => prev.filter(m => m.id !== fakeId));
         alert('Network error');
      }
    }
  };

  if (activeThread) {
    return (
      <View style={styles.container}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setActiveThread(null)} style={styles.backButton}>
             <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Image source={{ uri: (activeThread.participant.avatarUrl && !activeThread.participant.avatarUrl.includes('faker-js') ? activeThread.participant.avatarUrl : null) || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeThread.participant.name || 'User')}&background=random` }} style={styles.chatAvatar} />
          <Text style={styles.chatName}>{activeThread.participant.name}</Text>
        </View>
        <KeyboardAvoidingView 
           style={{ flex: 1 }} 
           behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView style={styles.chatBody} contentContainerStyle={{ padding: 16 }}>
            {chatMessages.map(msg => (
              <View key={msg.id} style={[styles.messageBubble, msg.sentByMe ? styles.myMessage : styles.theirMessage]}>
                <Text style={msg.sentByMe ? styles.myMessageText : styles.theirMessageText}>{msg.text}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Write a message..."
              value={composingMsg}
              onChangeText={setComposingMsg}
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  const renderThread = ({ item }: { item: MessageThread }) => (
    <TouchableOpacity style={styles.threadItem} onPress={() => handleThreadPress(item)}>
      <Image source={{ uri: (item.participant.avatarUrl && !item.participant.avatarUrl.includes('faker-js') ? item.participant.avatarUrl : null) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.participant.name || 'User')}&background=random` }} style={styles.avatar} />
      <View style={styles.threadContent}>
        <View style={styles.threadHeader}>
          <Text style={styles.participantName}>{item.participant.name}</Text>
          <Text style={[styles.timestamp, item.unread && styles.unreadText]}>{new Date(item.timestamp).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.roleText} numberOfLines={1}>{item.participant.role}</Text>
        <Text style={[styles.lastMessage, item.unread && styles.unreadMessage]} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messaging</Text>
        <TouchableOpacity style={styles.listBtn} onPress={() => setShowRoleListModal(true)}>
          <Text style={styles.listBtnText}>List</Text>
        </TouchableOpacity>
      </View>

      {/* Role List Modal */}
      <Modal visible={showRoleListModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Job Titles List</Text>
              <TouchableOpacity onPress={() => setShowRoleListModal(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <TouchableOpacity 
                style={[styles.roleListItem, activeRoleFilter === null && styles.roleListItemActive]}
                onPress={() => { setActiveRoleFilter(null); setShowRoleListModal(false); }}>
                <Text style={[styles.roleListText, activeRoleFilter === null && styles.roleListTextActive]}>All Connections</Text>
              </TouchableOpacity>
              {uniqueRoles.map((role: any, idx: number) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.roleListItem, activeRoleFilter === role && styles.roleListItemActive]}
                  onPress={() => { setActiveRoleFilter(role); setShowRoleListModal(false); }}>
                  <Text style={[styles.roleListText, activeRoleFilter === role && styles.roleListTextActive]}>{role}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Active Filter Pill */}
      {activeRoleFilter && (
        <View style={styles.activeFilterBar}>
          <Text style={styles.activeFilterText}>Filtered by: {activeRoleFilter}</Text>
          <TouchableOpacity onPress={() => setActiveRoleFilter(null)}>
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Message Threads List */}
      {threads.length > 0 ? (
        <FlatList
          data={threads.filter(t => {
            const matchesSearch = t.participant.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = activeRoleFilter ? t.participant.role === activeRoleFilter : true;
            return matchesSearch && matchesRole;
          })}
          keyExtractor={(item) => item.id}
          renderItem={renderThread}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No connections yet</Text>
          <Text style={styles.emptySubtitle}>Start swiping in the Network tab to connect with peers and chat!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // modern off-white
  },
  header: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 55, // Account for Android notch safely
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  listBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  listBtnText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  roleListItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  roleListItemActive: {
    backgroundColor: '#EEF2FF',
  },
  roleListText: {
    fontSize: 16,
    color: '#374151',
  },
  roleListTextActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  activeFilterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#EEF2FF',
    borderBottomWidth: 1,
    borderBottomColor: '#C7D2FE',
  },
  activeFilterText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
  },
  clearFilterText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },  
  searchContainer: {
    padding: 12,
    backgroundColor: '#FFF',
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 0,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlignVertical: 'center',
  },
  listContainer: {
    flexGrow: 1,
  },
  threadItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFF',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
  },
  threadContent: {
    flex: 1,
    justifyContent: 'center',
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  roleText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#4B5563',
  },
  unreadText: {
    color: '#6366F1',
    fontWeight: '700',
  },
  unreadMessage: {
    color: '#111827',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 55,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
  },
  backButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  chatName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  chatBody: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    marginBottom: 12,
    borderRadius: 16,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  myMessageText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 20,
  },
  theirMessageText: {
    color: '#1F2937',
    fontSize: 15,
    lineHeight: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#6366F1',
    fontWeight: '700',
    fontSize: 16,
  }
});
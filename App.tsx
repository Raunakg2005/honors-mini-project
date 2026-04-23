import React, { useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, View, TouchableOpacity, Text, TextInput, StatusBar, Platform } from 'react-native';
import { AppProvider, useAppContext } from './store/AppContext';
import { LoginScreen } from './screens/LoginScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { HomeScreen } from './screens/HomeScreen';
import { FeedScreen } from './screens/FeedScreen';
import { SearchScreen } from './screens/SearchScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { PostScreen } from './screens/PostScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { GlobalSearchScreen } from './screens/GlobalSearchScreen';

// "linkedin" style tab type
type TabType = 'home' | 'network' | 'post' | 'notifications' | 'jobs' | 'messages' | 'profile' | 'otherProfile';

export function MainApp() {
    const { state, dispatch } = useAppContext();
    const [activeTab, setActiveTab] = useState<TabType>('home');
    const [authView, setAuthView] = useState<'login' | 'signup'>('login'); 
    const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

    // Fetch unread messages periodically
    useEffect(() => {
      let interval: any;
      if (state.token) {
        const fetchUnread = async () => {
          try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/messages/threads`, {
              headers: { 'Authorization': `Bearer ${state.token}` }
            });
            if (res.ok) {
              const threads = await res.json();
              const unreadCount = threads.filter((t: any) => t.unread).length;
              dispatch({ type: 'SET_UNREAD_MESSAGES', payload: unreadCount });
            }
          } catch (e) {}
        };
        fetchUnread();
        interval = setInterval(fetchUnread, 10000); // check roughly every 10 seconds
      }
      return () => clearInterval(interval);
    }, [state.token]);

    // Expose deep navigation to child screens
    const handleNavigateToProfile = (userId: string) => {
      setViewingProfileId(userId);
      setActiveTab('otherProfile');
    };

    // Global search state passed down to screens that need it
    const [globalSearch, setGlobalSearch] = useState('');
    const [initialMessageUserId, setInitialMessageUserId] = useState<string | null>(null);

    // Expose deep navigation to message screen
    const handleNavigateToMessages = (userId?: string) => {
      if (userId) setInitialMessageUserId(userId);
      setActiveTab('messages');
    };

    // Authentication Flow Router
    if (!state.activeUser) {
      if (authView === 'login') {
        return <LoginScreen onNavigateToSignUp={() => setAuthView('signup')} />;
      }
      return <SignUpScreen onNavigateToLogin={() => setAuthView('login')} />;
    }

  // Main Authenticated App
  const renderContent = () => {
    // Determine if we show global search override
    if (globalSearch.trim().length > 0) {
      return <GlobalSearchScreen searchText={globalSearch} onNavigateToProfile={(id) => {
        setGlobalSearch(''); // Clear search when navigating
        handleNavigateToProfile(id);
      }} />;
    }

    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigateToProfile={handleNavigateToProfile} />;
      case 'network':
        return <FeedScreen  />;
      case 'post':
        return <PostScreen onClose={() => setActiveTab('home')} />;      
      case 'notifications':
        return <NotificationsScreen />;
      case 'jobs':
        return <SearchScreen globalSearchText={globalSearch} />;
      case 'messages':
        const messagesProps = initialMessageUserId ? { initialUserId: initialMessageUserId } : {};
        return <MessagesScreen {...messagesProps} />;
      case 'profile':
        return <ProfileScreen onNavigateToProfile={handleNavigateToProfile} />;
      case 'otherProfile':
        return (
           <View style={{ flex: 1 }}>
             <TouchableOpacity
               style={{ padding: 16, backgroundColor: 'white' }}
               onPress={() => setActiveTab('home')}
             >
               <Text style={{ color: '#6366F1', fontWeight: 'bold' }}>← Back to Feed</Text>
             </TouchableOpacity>
             {viewingProfileId && <ProfileScreen userId={viewingProfileId} onNavigateToProfile={handleNavigateToProfile} onNavigateToMessages={() => handleNavigateToMessages(viewingProfileId)} />}
           </View>
        );
    }
  };

  const renderHeader = () => {
    // Hide default header if we are inside messages screen itself
    if (activeTab === 'messages') return null;
    
    return (
      <View style={styles.globalHeader}>
        <TouchableOpacity onPress={() => setActiveTab('profile')}>
          <View style={styles.headerAvatarPlaceholder}>
            <Text style={styles.headerAvatarText}>{state.activeUser?.name?.charAt(0) || 'U'}</Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerSearchBar}>
          <TextInput
            style={styles.headerSearchInput}
            placeholder="Search..."
            placeholderTextColor="#666"
            value={globalSearch}
            onChangeText={setGlobalSearch}
          />
        </View>

        <TouchableOpacity onPress={() => setActiveTab('messages')} style={styles.headerMsgBtn}>
          <Text style={styles.headerMsgIcon}>💬</Text>
          {state.unreadMessagesCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{state.unreadMessagesCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      {renderHeader()}
      
      {/* Main Content Area */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Minimal Custom Bottom Tab Bar - LinkedIn Style */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabButton} 
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.iconText, activeTab === 'home' && styles.activeIconText]}>🏠</Text>
          <Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabButton} 
          onPress={() => setActiveTab('network')}
        >
          <Text style={[styles.iconText, activeTab === 'network' && styles.activeIconText]}>👥</Text>
          <Text style={[styles.tabText, activeTab === 'network' && styles.activeTabText]}>Network</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabButton} 
          onPress={() => setActiveTab('post')}
        >
          <Text style={[styles.iconText, activeTab === 'post' && styles.activeIconText]}>➕</Text>
          <Text style={[styles.tabText, activeTab === 'post' && styles.activeTabText]}>Post</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabButton} 
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.iconText, activeTab === 'notifications' && styles.activeIconText]}>🔔</Text>
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>Notifications</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <AppProvider>
      <SafeAreaView style={styles.wrapper}>
        <MainApp />
      </SafeAreaView>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Modern off-white background
  },
  content: {
    flex: 1,
  },
  globalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 55, // Account for Android notch/status bar safely
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6366F1', // Modern Indigo
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    
    
    
    
    elevation: 3,
  },
  headerAvatarText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  headerSearchBar: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    height: 38, // Slightly taller for a nice modern pill
    borderRadius: 19, // Pill shape
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerSearchInput: {
    color: '#1F2937',
    fontSize: 15,
    height: '100%',
    paddingVertical: 0, // Fixes Android bounce
    textAlignVertical: 'center', // Fixes Android vertical alignment
    includeFontPadding: false,
  },
  headerMsgBtn: {
    marginLeft: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMsgIcon: {
    fontSize: 18,
    color: '#4B5563',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444', // Red-500
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    height: 65,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingBottom: 5,
    elevation: 8,
    
    
    
    
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 22,
    marginBottom: 2,
    opacity: 0.5,
  },
  activeIconText: {
    opacity: 1,
  },
  tabText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#6366F1', // Modern Indigo
    fontWeight: '700',
  }
});

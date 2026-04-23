import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { useAppContext } from '../store/AppContext';
import { Ionicons } from '@expo/vector-icons';

interface PendingConnection {
  id: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
    avatarUrl: string | null;
  };
}

const ConnectionRequestCard = ({ request, onRespond }: { request: PendingConnection, onRespond: (id: string, status: string) => void }) => {
  return (
    <View style={styles.cardContainer}>
      <Image
        source={{ uri: (request.user.avatarUrl && !request.user.avatarUrl.includes('faker-js')) ? request.user.avatarUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(request.user.name)}&background=random` }}
        style={styles.avatar}
      />
      <View style={styles.infoContainer}>
        <Text style={styles.userName}>{request.user.name}</Text>
        <Text style={styles.userRole} numberOfLines={1}>{request.user.role}</Text>
        <Text style={styles.timeText}>Sent a connection request</Text>
      </View>
      <View style={styles.actionContainer}>
        <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => onRespond(request.id, 'REJECTED')}>
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={() => onRespond(request.id, 'ACCEPTED')}>
          <Ionicons name="checkmark" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export function NotificationsScreen() {
  const { state } = useAppContext();
  const [requests, setRequests] = useState<PendingConnection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/connections/pending`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      console.error('Failed to fetch connection requests', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (id: string, status: string) => {
    try {
      // Optimistic update
      setRequests(prev => prev.filter(req => req.id !== id));

      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/connections/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (!res.ok) {
        Alert.alert('Error', 'Failed to update connection status');
        fetchRequests(); // Revert
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
      fetchRequests(); // Revert
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={48} color="#CCC" />
      <Text style={styles.emptyTitle}>You're all caught up!</Text>
      <Text style={styles.emptySubtitle}>No new connection requests or notifications.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>
      
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ConnectionRequestCard request={item} onRespond={handleRespond} />}
        contentContainerStyle={requests.length === 0 ? styles.emptyList : styles.listContent}
        refreshing={loading}
        onRefresh={fetchRequests}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={
          requests.length > 0 ? (
            <Text style={styles.sectionTitle}>Connection Requests ({requests.length})</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F2EF', // LinkedIn background
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#0A66C2', // LinkedIn blue
    fontWeight: '500',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#F3F2EF',
  },
  acceptButton: {
    backgroundColor: '#0A66C2',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  }
});
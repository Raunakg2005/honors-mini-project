import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { UserProfile } from '../types';
import { useAppContext } from '../store/AppContext';
import { Job } from './SearchScreen'; // Importing the Job type from there

interface GlobalSearchScreenProps {
  searchText: string;
  onNavigateToProfile?: (userId: string) => void;
}

type SearchMode = 'People' | 'Jobs';

export function GlobalSearchScreen({ searchText, onNavigateToProfile }: GlobalSearchScreenProps) {
  const { state } = useAppContext();
  const [activeTab, setActiveTab] = useState<SearchMode>('People');

  const [people, setPeople] = useState<UserProfile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      setIsSearching(true);
      try {
        if (activeTab === 'People') {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://10.0.69.111:4000'}/api/profiles`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
          });
          const json = await response.json();
          // Filter by search text locally
          const filtered = (json.data || []).filter((p: UserProfile) =>
            (p.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (p.role || '').toLowerCase().includes(searchText.toLowerCase())
          );
          setPeople(filtered);
        } else if (activeTab === 'Jobs') {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://10.0.69.111:4000'}/api/jobs`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
          });
          const data = await response.json();
          // Filter by search text locally
          const filtered = (Array.isArray(data) ? data : []).filter((j: Job) => 
            (j.title || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (j.company || '').toLowerCase().includes(searchText.toLowerCase())
          );
          setJobs(filtered);
        }
      } catch (error) {
        console.error("Failed to fetch search results.", error);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText, activeTab]);

  const renderPerson = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => { if(onNavigateToProfile) onNavigateToProfile(item.id); }}>
      <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.name}</Text>
        <Text style={styles.resultSub}>{item.role}</Text>
        <Text style={styles.resultMeta}>{item.location}</Text>
      </View>
      <TouchableOpacity style={styles.connectBtn}>
        <Text style={styles.connectText}>Connect</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderJob = ({ item }: { item: Job }) => (
    <View style={styles.resultItem}>
      <View style={styles.logoPlaceholder}>
        <Text style={styles.logoLetter}>{item.company.charAt(0)}</Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultSub}>{item.company}</Text>
        <Text style={styles.resultMeta}>{item.location} • {item.type}</Text>
      </View>
      <TouchableOpacity style={styles.applyBtn}>
        <Text style={styles.applyText}>Apply</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'People' && styles.tabButtonActive]}
          onPress={() => setActiveTab('People')}
        >
          <Text style={[styles.tabText, activeTab === 'People' && styles.tabTextActive]}>People</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'Jobs' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Jobs')}
        >
          <Text style={[styles.tabText, activeTab === 'Jobs' && styles.tabTextActive]}>Jobs</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.resultsPrompt}>
        Showing {activeTab.toLowerCase()} results for "{searchText}"
      </Text>

      {isSearching ? (
        <ActivityIndicator size="large" color="#0A66C2" style={{ marginTop: 40 }} />
      ) : activeTab === 'People' ? (
        <FlatList
          data={people}
          keyExtractor={(item) => item.id}
          renderItem={renderPerson}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No people found matching "{searchText}".</Text>
          }
        />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No jobs found matching "{searchText}".</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#6366F1',
  },
  resultsPrompt: {
    padding: 16,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logoLetter: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366F1',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  resultSub: {
    fontSize: 14,
    color: '#374151',
    marginTop: 2,
    fontWeight: '500',
  },
  resultMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  connectBtn: {
    borderWidth: 1,
    borderColor: '#6366F1',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 12,
  },
  connectText: {
    color: '#6366F1',
    fontWeight: '700',
    fontSize: 14,
  },
  applyBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 12,
  },
  applyText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6B7280',
    fontSize: 16,
  }
});
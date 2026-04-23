import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar
} from 'react-native';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  logoUrl: string;
  postedDate: string;
  type: string;
}

const JOB_FILTERS = ['Remote', 'On-site', 'Full-time', 'Contract'];

export interface JobsScreenProps {
  globalSearchText?: string;
}

export function SearchScreen({ globalSearchText = '' }: JobsScreenProps) {
  const [activeFilter, setActiveFilter] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://10.0.69.111:4000'}/api/jobs`);
        const data = await response.json();
        setJobs(data || []);
      } catch (error) {
        console.error("Failed to fetch jobs.", error);
      } finally {
        setIsSearching(false);
      }
    };
    fetchJobs();
  }, []);

  const toggleFilter = (filter: string) => {
    setActiveFilter(prev => prev === filter ? '' : filter);
  };

  const renderFilterChips = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {JOB_FILTERS.map(filter => (
          <TouchableOpacity
            key={filter}
            onPress={() => toggleFilter(filter)}
            style={[styles.chip, activeFilter === filter && styles.chipActive]}
          >
            <Text style={[styles.chipText, activeFilter === filter && styles.chipTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const filteredJobs = jobs.filter(job => {
    const query = globalSearchText.toLowerCase();
    const matchesQuery = job.title.toLowerCase().includes(query) || 
                         job.company.toLowerCase().includes(query);
    const matchesFilter = activeFilter ? job.type.includes(activeFilter) || job.location.includes(activeFilter) : true;
    return matchesQuery && matchesFilter;
  });

  const renderJob = ({ item }: { item: Job }) => (
    <View style={styles.resultItem}>
      <View style={styles.logoPlaceholder}>
        <Text style={styles.logoLetter}>{item.company.charAt(0)}</Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultCompany}>{item.company}</Text>
        <Text style={styles.resultSub}>{item.location} • {item.type}</Text>
        <Text style={styles.resultDate}>{item.postedDate}</Text>
      </View>
      <TouchableOpacity style={styles.applyBtn}>
        <Text style={styles.applyText}>Apply</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Jobs</Text>
      </View>

      {renderFilterChips()}

      <View style={styles.listContainer}>
        {isSearching ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredJobs}
            keyExtractor={item => item.id}
            renderItem={renderJob}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No jobs match your criteria.</Text>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 55, // Full safe-area coverage
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
  searchContainer: {
    padding: 12,
    backgroundColor: '#FFF',
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 0,
    height: 40,
    borderRadius: 20, // pill
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlignVertical: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  chipRow: {
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  chipText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFF',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  resultCompany: {
    fontSize: 14,
    color: '#374151',
    marginTop: 2,
    fontWeight: '500',
  },
  resultSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  resultDate: {
    fontSize: 12,
    color: '#059669', // Emerald green
    marginTop: 4,
    fontWeight: '600',
  },
  applyBtn: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
  },
  applyText: {
    color: '#6366F1',
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
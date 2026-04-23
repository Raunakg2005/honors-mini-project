import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { useAppContext } from '../store/AppContext';
import { SwipeCard } from '../components/SwipeCard';
import { sortDeckForUser } from '../utils/recommendationEngine';
import { SwipeDirection, UserProfile } from '../types';

export function FeedScreen() {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'network' | 'swipe'>('network'); // Toggle between list and swipe deck

  // Load and sort data
  useEffect(() => {
    const initializeData = async () => {
      try {
        if (!state.token) {
           setLoading(false);
           return;
        }

        // 1. Fetching Recommended profiles securely over Bearer Token
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/profiles/recommended`, {
          headers: {
            'Authorization': `Bearer ${state.token}`
          }
        });
        
        if (!response.ok) {
           throw new Error("Failed to fetch recommended profiles.");
        }

        const json = await response.json();
        
        // 2. Data from backend goes directly into context deck
        const sortedDeck = json.data || [];
        
        dispatch({ type: 'SET_DECK', payload: sortedDeck });
      } catch (error) {
        console.error("Failed to fetch profiles. Ensure backend is running.", error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [dispatch, state.token]);

  const handleSwipe = (action: SwipeDirection) => {
    if (state.deck.length === 0) return;
    const targetCard = state.deck[0];
    
    // Process the state change (removes from active deck array)
    dispatch({ 
      type: 'RECORD_SWIPE', 
      payload: { targetId: targetCard.id, action } 
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4B5563" />
      </View>
    );
  }

  if (view === 'network') {
    return (
      <ScrollView style={styles.networkContainer}>
        {/* Header */}
        <View style={styles.networkHeader}>
          <Text style={styles.networkTitle}>My Network</Text>
        </View>

        {/* Manage Network Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage my network</Text>
          <View style={styles.manageItem}>
            <Text style={styles.manageText}>Connections</Text>
            <Text style={styles.manageCount}>{(state.swipeHistory || []).filter(s => s.action === 'like').length}</Text>
          </View>
        </View>

        {/* Invitations Section */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Invitations</Text>
            <Text style={styles.linkText}>Show all</Text>
          </View>
          <Text style={styles.subTextLight}>No pending invitations</Text>
        </View>

        {/* Recommendations Teaser */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <Text style={styles.subTextLight}>Grow your professional network</Text>

          <TouchableOpacity style={styles.recommendationCard} onPress={() => setView('swipe')}>
            <Text style={styles.recCardTitle}>Discover New Peers</Text>
            <Text style={styles.recCardSubtitle}>
              Swipe to connect with {state.deck.length} relevant professionals in your field.
            </Text>
            <View style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Start Swiping</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Swipe Deck View
  // To build a stack of cards visually, we map them out backwards
  return (
    <View style={styles.container}>
      <View style={styles.swipeHeader}>
        <TouchableOpacity onPress={() => setView('network')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back to Network</Text>
        </TouchableOpacity>
      </View>
      {state.deck.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No more profiles to show.</Text>
          <Text style={styles.subText}>You've swiped on everyone!</Text>
        </View>
      ) : (
        [...state.deck].reverse().map((profile, index) => {
          // Because we reverse the array to render, the top card is the LAST item in the map.
          const isTopCard = index === state.deck.length - 1;
          return (
            <SwipeCard
              key={profile.id}
              profile={profile}
              onSwipe={handleSwipe}
              isTopCard={isTopCard}
            />
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  subText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  networkContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  networkHeader: {
    backgroundColor: '#FFF',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 55,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  networkTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  section: {
    backgroundColor: '#FFF',
    marginTop: 8,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  manageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  manageText: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  manageCount: {
    fontSize: 16,
    color: '#6B7280',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkText: {
    color: '#6366F1', // modern indigo
    fontSize: 15,
    fontWeight: '600',
  },
  subTextLight: {
    fontSize: 14,
    color: '#6B7280',
  },
  recommendationCard: {
    marginTop: 16,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12, // slightly rounder
    alignItems: 'center',
  },
  recCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  recCardSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionBtn: {
    backgroundColor: '#6366F1', // modern indigo
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  swipeHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 55,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    
    
    
    
    elevation: 2,
  },
  backBtnText: {
    color: '#6366F1', // modern indigo
    fontWeight: '700',
    fontSize: 14,
  }
});

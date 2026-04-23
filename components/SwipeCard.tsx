import React, { useRef, useMemo } from 'react';
import {
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  View,
  Text,
  Image,
} from 'react-native';
import { UserProfile, SwipeDirection } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 250;

interface SwipeCardProps {
  profile: UserProfile;
  onSwipe: (action: SwipeDirection) => void;
  isTopCard: boolean;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({ profile, onSwipe, isTopCard }) => {
  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          position.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) {
            forceSwipe('right');
          } else if (gesture.dx < -SWIPE_THRESHOLD) {
            forceSwipe('left');
          } else {
            resetPosition();
          }
        },
      }),
    [position, onSwipe]
  );

  const forceSwipe = (direction: 'right' | 'left') => {
    const x = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction: 'right' | 'left') => {
    const action = direction === 'right' ? 'like' : 'pass';
    onSwipe(action);
    position.setValue({ x: 0, y: 0 }); // Reset for next card
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 4,
      useNativeDriver: false,
    }).start();
  };

  // Interpolations for smooth animations
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const animatedStyle = {
    transform: [...position.getTranslateTransform(), { rotate }],
  };

  if (!isTopCard) {
    return (
      <View style={[styles.card, styles.nextCard]}>
        <Image source={{ uri: profile.avatarUrl }} style={styles.image} />
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.role}>{profile.role}</Text>
          {profile.company ? <Text style={styles.company}>at {profile.company}</Text> : null}
          <Text style={styles.industryLocation}>{profile.industry} • {profile.location}</Text>
          {profile.education ? <Text style={styles.metaText}>🎓 {profile.education}</Text> : null}
          {profile.experience ? <Text style={styles.metaText}>💼 {profile.experience}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.card, animatedStyle]}
    >
      <Image source={{ uri: profile.avatarUrl }} style={styles.image} />
      
      {/* Feedback Labels */}
      <Animated.View style={[styles.feedbackLabel, styles.likeLabel, { opacity: likeOpacity }]}>
        <Text style={styles.likeText}>CONNECT</Text>
      </Animated.View>
      
      <Animated.View style={[styles.feedbackLabel, styles.nopeLabel, { opacity: nopeOpacity }]}>
        <Text style={styles.nopeText}>PASS</Text>
      </Animated.View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.role}>{profile.role || 'New Member'}</Text>
        {profile.company ? <Text style={styles.company}>at {profile.company}</Text> : null}
        <Text style={styles.industryLocation}>{profile.industry || ''} {profile.location ? `• ${profile.location}` : ''}</Text>
        {profile.education ? <Text style={styles.metaText}>🎓 {profile.education}</Text> : null}
        {profile.experience ? <Text style={styles.metaText}>💼 {profile.experience}</Text> : null}
        {profile.bio ? <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text> : null}
        <View style={styles.skillsContainer}>
          {Array.isArray(profile.skills) ? profile.skills.slice(0, 4).map((skill: string, i: number) => (
            <Text key={i} style={styles.skillBadge}>{skill}</Text>
          )) : (typeof profile.skills === 'string' ? (profile.skills as string).split(',').slice(0, 4).map((skill: string, i: number) => (
            <Text key={i} style={styles.skillBadge}>{skill.trim()}</Text>
          )) : null)}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.9,
    height: 500,
    backgroundColor: 'white',
    borderRadius: 20,
    
    
    
    
    elevation: 8,
    alignSelf: 'center',
    top: 50,
  },
  nextCard: {
    top: 60, // Slight visual stacking effect
    zIndex: -1,
  },
  image: {
    width: '100%',
    height: 230,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  infoContainer: {
    padding: 20,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
  },
  role: {
    fontSize: 18,
    color: '#4B5563',
    marginTop: 4,
    fontWeight: '600'
  },
  industryLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  skillBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    fontSize: 12,
    color: '#374151',
    overflow: 'hidden',
  },
  feedbackLabel: {
    position: 'absolute',
    top: 40,
    padding: 10,
    borderWidth: 4,
    borderRadius: 10,
    transform: [{ rotate: '-20deg' }],
    zIndex: 10,
  },
  likeLabel: {
    left: 40,
    borderColor: '#4CAF50',
  },
  likeText: {
    color: '#4CAF50',
    fontSize: 32,
    fontWeight: 'bold',
  },
  nopeLabel: {
    right: 40,
    borderColor: '#F44336',
  },
  nopeText: {
    color: '#F44336',
    fontSize: 32,
    fontWeight: 'bold',
  },
  company: { 
    fontSize: 16, 
    color: '#4B5563', 
    fontWeight: '500' 
  },
  bio: { 
    fontSize: 14, 
    color: '#374151', 
    marginTop: 8, 
    fontStyle: 'italic' 
  },
  metaText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
    fontWeight: '500'
  }
});
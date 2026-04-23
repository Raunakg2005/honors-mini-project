import React, { createContext, useReducer, useContext, ReactNode, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, SwipeAction, MatchState, SearchFilters, SwipeDirection, Post } from '../types';

interface AppState {
  activeUser: UserProfile | null;
  token: string | null;
  deck: UserProfile[];
  swipeHistory: SwipeAction[];
  matches: MatchState[];
  filters: SearchFilters;
  posts: Post[];
  unreadMessagesCount: number;
}

type Action =
  | { type: 'SET_ACTIVE_USER'; payload: UserProfile }
  | { type: 'SET_TOKEN'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_DECK'; payload: UserProfile[] }
  | { type: 'RECORD_SWIPE'; payload: { targetId: string; action: SwipeDirection } }
  | { type: 'ADD_MATCH'; payload: MatchState }
  | { type: 'SET_FILTERS'; payload: SearchFilters }
  | { type: 'RESET_DECK' }
  | { type: 'ADD_POST'; payload: Post }
  | { type: 'SET_UNREAD_MESSAGES'; payload: number }
  | { type: 'RESTORE_SESSION'; payload: { user: UserProfile, token: string } };

const initialState: AppState = {
  activeUser: null,
  token: null,
  deck: [],
  swipeHistory: [],
  matches: [],
  filters: {},
  unreadMessagesCount: 0,
  posts: [
    {
      id: 'mock-1',
      authorId: 'u1',
      authorName: 'John Doe',
      authorRole: 'Software Engineer at Google',
      authorAvatar: 'https://i.pravatar.cc/150?img=12',
      content: 'Just successfully deployed our new microservices architecture! Really proud of the team. #engineering #cloud',
      timestamp: Date.now() - 3600000,
      likes: 42,
      comments: 5
    }
  ],
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_ACTIVE_USER':
      return { ...state, activeUser: action.payload };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'RESTORE_SESSION':
      return { ...state, activeUser: action.payload.user, token: action.payload.token };
    case 'LOGOUT':
      return { ...initialState };
    case 'SET_DECK':
      return { ...state, deck: action.payload };
    case 'RECORD_SWIPE': {
      const newAction: SwipeAction = {
        userId: state.activeUser?.id || 'unknown',
        targetId: action.payload.targetId,
        action: action.payload.action,
        timestamp: Date.now(),
      };
      return {
        ...state,
        swipeHistory: [...state.swipeHistory, newAction],
        deck: state.deck.filter((profile) => profile.id !== action.payload.targetId),
      };
    }
    case 'ADD_MATCH':
      return { ...state, matches: [...state.matches, action.payload] };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    case 'RESET_DECK':
      return { ...state, deck: [], swipeHistory: [] };
    case 'ADD_POST':
      return { ...state, posts: [action.payload, ...state.posts] };
    case 'SET_UNREAD_MESSAGES':
      return { ...state, unreadMessagesCount: action.payload };
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isReady, setIsReady] = useState(false);

  // Load session on startup
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userData');

        if (storedToken && storedUser) {
          dispatch({ 
            type: 'RESTORE_SESSION', 
            payload: { token: storedToken, user: JSON.parse(storedUser) } 
          });
        }
      } catch (e) {
        console.error('Failed to load session session', e);
      } finally {
        setIsReady(true);
      }
    };
    bootstrapAsync();
  }, []);

  // Save session when user changes (Login/Logout mechanics)
  useEffect(() => {
    const saveSessionAsync = async () => {
      try {
        if (state.token && state.activeUser) {
          await AsyncStorage.setItem('userToken', state.token);
          await AsyncStorage.setItem('userData', JSON.stringify(state.activeUser));
        } else if (state.token === null && state.activeUser === null && isReady) {
          // Completely flush storage on explicit logout
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
        }
      } catch (e) {
        console.error('Failed to save session', e);
      }
    };
    if (isReady) saveSessionAsync();
  }, [state.token, state.activeUser, isReady]);

  if (!isReady) {
    return null; // or a Splash screen
  }

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

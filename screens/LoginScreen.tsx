import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useAppContext } from '../store/AppContext';
import { UserProfile } from '../types';

interface LoginScreenProps {
  onNavigateToSignUp: () => void;
}

export function LoginScreen({ onNavigateToSignUp }: LoginScreenProps) {
  const { dispatch } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://10.0.69.111:4000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      dispatch({ type: 'SET_TOKEN', payload: data.token });
      dispatch({ type: 'SET_ACTIVE_USER', payload: data.user });
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Connect<Text style={styles.logoIn}>In</Text></Text>
      
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.subtitle}>Stay updated on your professional world</Text>

      {errorMsg ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorCardText}>{errorMsg}</Text>
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Email or Phone"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        placeholderTextColor="#9CA3AF"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#9CA3AF"
      />

      <TouchableOpacity style={styles.forgotBtn}>
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.loginBtn, isLoading && { opacity: 0.7 }]} 
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.loginBtnText}>Sign in</Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity style={styles.googleBtn} onPress={handleLogin}>
        <Text style={styles.googleBtnText}>Sign in with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.newToLinkedIn} onPress={onNavigateToSignUp}>
        <Text style={styles.newToText}>New to ConnectIn? <Text style={styles.joinNow}>Join now</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 24,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6366F1',
    marginBottom: 40,
    letterSpacing: -1,
  },
  logoIn: {
    backgroundColor: '#6366F1',
    color: 'white',
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 32,
  },
  errorCard: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    
    
    
    
    elevation: 2,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorCardText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    color: '#111827',
  },
  forgotBtn: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  forgotText: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 14,
  },
  loginBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
    
    
    
    
    elevation: 4,
  },
  loginBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  orText: {
    marginHorizontal: 16,
    color: '#6B7280',
  },
  googleBtn: {
    borderWidth: 1,
    borderColor: '#6B7280',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  googleBtnText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  newToLinkedIn: {
    marginTop: 32,
    alignItems: 'center',
  },
  newToText: {
    fontSize: 16,
    color: '#111827',
  },
  joinNow: {
    color: '#6366F1',
    fontWeight: '700',
  }
});

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useAppContext } from '../store/AppContext';
import { UserProfile } from '../types';

interface SignUpScreenProps {
  onNavigateToLogin: () => void;
}

export function SignUpScreen({ onNavigateToLogin }: SignUpScreenProps) {
  const { dispatch } = useAppContext();
  
  // Registration Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://10.0.69.111:4000'}/api/roles`)
      .then(res => res.json())
      .then(data => setAvailableRoles(data))
      .catch(console.error);
  }, []);

  const handleRegister = async () => {
    // 1. Basic validation
    if (!firstName || !lastName || !email || !password || !role) {
      setErrorMsg("Please fill out all fields to complete registration.");
      return;
    }
    
    setErrorMsg(null);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://10.0.69.111:4000'}/api/auth/register`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          name: `${firstName} ${lastName}`, 
          role 
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      dispatch({ type: 'SET_TOKEN', payload: data.token });
      dispatch({ type: 'SET_ACTIVE_USER', payload: data.user });
    } catch(error: any) {
      setErrorMsg(error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.logo}>Connect<Text style={styles.logoIn}>In</Text></Text>
        
        <Text style={styles.title}>Join ConnectIn</Text>
        <Text style={styles.subtitle}>Make the most of your professional life</Text>

        {errorMsg ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorCardText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email or phone number</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Professional Role</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Software Engineer, Designer"
            value={role}
            onFocus={() => setShowRoleDropdown(true)}
            onChangeText={(t) => { setRole(t); setShowRoleDropdown(true); }}
          />
          {showRoleDropdown && (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderTopWidth: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, marginBottom: 16, maxHeight: 150 }}>
              <ScrollView nestedScrollEnabled={true}>
                {availableRoles.filter(r => r.toLowerCase().includes(role.toLowerCase())).length > 0 ? (
                  availableRoles.filter(r => r.toLowerCase().includes(role.toLowerCase())).map((r, idx) => (
                     <TouchableOpacity key={idx} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }} onPress={() => { setRole(r); setShowRoleDropdown(false); }}>
                       <Text style={{ color: '#374151' }}>{r}</Text>
                     </TouchableOpacity>
                  ))
                ) : (
                  <TouchableOpacity style={{ padding: 12 }} onPress={() => setShowRoleDropdown(false)}>
                     <Text style={{ color: '#6B7280', fontStyle: 'italic' }}>Create new role: "{role}"</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Password (6+ characters)</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <Text style={styles.agreementText}>
          By clicking Agree & Join, you agree to the LinkedIn User Agreement, Privacy Policy, and Cookie Policy.
        </Text>

        <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}>
          <Text style={styles.registerBtnText}>Agree & Join</Text>
        </TouchableOpacity>

        <View style={styles.loginRedirect}>
          <Text style={styles.alreadyText}>Already on LinkedIn? </Text>
          <TouchableOpacity onPress={onNavigateToLogin}>
            <Text style={styles.signInLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: 'white',
  },
  container: {
    padding: 24,
    justifyContent: 'center',
    paddingBottom: 60, 
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6366F1',
    marginBottom: 40,
    marginTop: 20,
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
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 32,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 6,
    fontWeight: '500',
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
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  agreementText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    marginTop: 8,
  },
  registerBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
    
    
    
    
    elevation: 4,
  },
  registerBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginRedirect: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  alreadyText: {
    color: '#111827',
  },
  signInLink: {
    color: '#6366F1',
    fontWeight: '700',
  }
});

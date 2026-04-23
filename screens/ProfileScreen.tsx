import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Linking, FlatList, ActivityIndicator, Share } from 'react-native';
import { useAppContext } from '../store/AppContext';

export function ProfileScreen({ userId, onNavigateToMessages, onNavigateToProfile }: { userId?: string, onNavigateToMessages?: () => void, onNavigateToProfile?: (id: string) => void }) {
  const { state, dispatch } = useAppContext();
  const loggedInUser = state.activeUser;
  
  const [profileData, setProfileData] = useState<any>(loggedInUser);
  const [loading, setLoading] = useState(!userId ? false : true);

  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isConnectionsModalVisible, setConnectionsModalVisible] = useState(false);
  const [connectionsList, setConnectionsList] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [editSection, setEditSection] = useState<'basic' | 'about' | 'experience' | 'education' | 'skills'>('basic');
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [fullExperience, setFullExperience] = useState<any[]>([]);
  const [experienceForm, setExperienceForm] = useState({
    title: '', employmentType: '', company: '', current: true,
    startMonth: '', startYear: '', endMonth: '', endYear: '', location: '', locationType: '', description: '', foundJob: '', skills: ''
  });
  const [editForm, setEditForm] = useState({
    name: '',
    role: '',
    location: '',
    bio: '',
    skills: '',
    experience: '',
    education: ''
  });
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  React.useEffect(() => {
    const targetId = userId || loggedInUser?.id;

    if (!targetId) {
      setLoading(false);
      return;
    }

    // Fetch user profile (always run to get fresh connectionsCount)
    const fetchUser = async () => {
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/${targetId}`, {
          headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId, loggedInUser?.id, state.token]);

  const user = profileData;

  // Render a safe loading/fallback state if the user was magically wiped.
  if (loading || !user) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: '#6B7280' }}>Loading profile...</Text>
    </View>
  );

  const handleLogout = () => {
    // 1. Instantly trigger the LOGOUT payload built into AppContext to wipe memory
    dispatch({ type: 'LOGOUT' });
  };

  const handleConnect = async () => {
    if (!user || !user.id) return Alert.alert('Error', 'No user to connect to.');
    if (!state.token) return Alert.alert('Not signed in', 'Please sign in to send connection requests.');

    try {
      setIsConnecting(true);
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ connectedId: user.id })
      });

      if (res.ok) {
        setProfileData((prev: any) => ({ ...prev, connectionStatus: 'PENDING' }));
        Alert.alert('Connection Request Sent', `You have requested to connect with ${user.name}.`);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Failed', err.error || 'Failed to send connection request');
      }
    } catch (e) {
      console.error('Connect error', e);
      Alert.alert('Network error', 'Unable to send request');
    } finally {
      setIsConnecting(false);
    }
  };

const handleDisconnect = () => {
    Alert.alert(
      'Remove Connection',
      `Are you sure you want to unconnect from ${user?.name || 'this person'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unconnect', 
          style: 'destructive',
          onPress: async () => {
            if (!user || !user.id) return;
            if (!state.token) return;

            try {
              setIsConnecting(true);
              const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/connect/${user.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${state.token}`
                }
              });

              if (res.ok) {
                setProfileData((prev: any) => ({ ...prev, connectionStatus: null })); // Removed connection
                Alert.alert('Disconnected', `You have successfully removed your connection with ${user.name}.`);
              } else {
                const err = await res.json().catch(() => ({}));
                Alert.alert('Failed', err.error || 'Failed to disconnect');      
              }
            } catch (e) {
              console.error('Disconnect error', e);
              Alert.alert('Network error', 'Unable to disconnect');
            } finally {
              setIsConnecting(false);
            }
          }
        }
      ]
    );
  };

const handleEditProfile = async (section: 'basic' | 'about' | 'experience' | 'education' | 'skills' = 'basic', index: number = -1) => {
    setEditSection(section);
    setEditingIndex(index);

    if (section === 'basic') {
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/users`, {
          headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const roles = [...new Set(data.map((u: any) => u.role).filter(Boolean))] as string[];
          setAvailableRoles(roles);
        }
      } catch (e) {
        console.log('Failed fetching roles', e);
      }
    }

    if (section === 'experience') {
      let parsedExp: any[] = [];
      try { parsedExp = JSON.parse(user.experience || '[]'); } catch(e) {}
      if (!Array.isArray(parsedExp)) parsedExp = [];
      setFullExperience(parsedExp);
      
      let defaultForm = { title: '', employmentType: '', company: '', current: true, startMonth: '', startYear: '', endMonth: '', endYear: '', location: '', locationType: '', description: '', foundJob: '', skills: '' };
      if (index >= 0 && parsedExp[index]) {
        defaultForm = { ...defaultForm, ...parsedExp[index] };
      }
      setExperienceForm(defaultForm);
    }
    
    setEditForm({
      name: user.name || '',
      role: user.role || '',
      location: user.location || '',
      bio: user.bio || '',
      skills: Array.isArray(user.skills) ? user.skills.join(', ') : ((user.skills as any) || ''),
      experience: user.experience || '',
      education: user.education || ''
    });
    setEditModalVisible(true);
  };

  const saveProfile = async (deleteIndex?: number) => {
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/profiles/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({
           name: editForm.name,
           role: editForm.role,
           location: editForm.location,
           bio: editForm.bio,
           skills: editForm.skills,
           experience: editSection === 'experience' ? (() => {
             const newArr = [...fullExperience];
             if (deleteIndex !== undefined && deleteIndex >= 0) {
                newArr.splice(deleteIndex, 1);
             } else if (editingIndex >= 0) {
                newArr[editingIndex] = experienceForm;
             } else {
                newArr.push(experienceForm);
             }
             return JSON.stringify(newArr);
           })() : editForm.experience,
           education: editForm.education
        })
      });
      if (res.ok) {
        const json = await res.json();
        const updatedUser = json.data;
        dispatch({ type: 'SET_ACTIVE_USER', payload: updatedUser });
        setProfileData(updatedUser);
        setEditModalVisible(false);
      } else {
        alert("Failed to update profile");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating profile");
    }
  };

  // Safely parse skills array whether backend sent a CSV string, null, or actual array.
  const parsedSkills = Array.isArray(user.skills)
    ? user.skills
    : ((user.skills as any) || '').split(',').map((s: string) => s.trim()).filter(Boolean);

  // Safe Fallback avatar
  const safeAvatar = (user.avatarUrl && !user.avatarUrl.includes('faker-js') ? user.avatarUrl : null) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`;

  return (
    <>
      {/* EDIT MODAL */}
      <Modal visible={isEditModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              {editSection === 'basic' ? 'Edit Basic Info' : 
               editSection === 'about' ? 'Edit About' : 
               editSection === 'experience' ? 'Edit Experience' : 
               editSection === 'education' ? 'Edit Education' : 
               editSection === 'skills' ? 'Edit Skills' : 'Edit Profile'}
            </Text>
          </View>
          <ScrollView style={{ padding: 16 }}>
            {editSection === 'basic' && (
              <>
                <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Name</Text>
                <TextInput style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 16 }} value={editForm.name} onChangeText={(t) => setEditForm({...editForm, name: t})} />

                <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Role</Text>
                  <TextInput style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: showRoleDropdown ? 0 : 16 }} value={editForm.role} onFocus={() => setShowRoleDropdown(true)} onChangeText={(t) => { setEditForm({...editForm, role: t}); setShowRoleDropdown(true); }} />
                  {showRoleDropdown && (
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderTopWidth: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, marginBottom: 16, maxHeight: 150 }}>
                      <ScrollView nestedScrollEnabled={true}>
                        {availableRoles.filter(r => r.toLowerCase().includes(editForm.role.toLowerCase())).length > 0 ? (
                          availableRoles.filter(r => r.toLowerCase().includes(editForm.role.toLowerCase())).map((role, idx) => (
                             <TouchableOpacity key={idx} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }} onPress={() => { setEditForm({...editForm, role}); setShowRoleDropdown(false); }}>
                               <Text style={{ color: '#374151' }}>{role}</Text>
                             </TouchableOpacity>
                          ))
                        ) : (
                          <TouchableOpacity style={{ padding: 12 }} onPress={() => setShowRoleDropdown(false)}>
                             <Text style={{ color: '#6B7280', fontStyle: 'italic' }}>Create new role: "{editForm.role}"</Text>
                          </TouchableOpacity>
                        )}
                      </ScrollView>
                    </View>
                  )}

                <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Location</Text>
                <TextInput style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 16 }} value={editForm.location} onChangeText={(t) => setEditForm({...editForm, location: t})} />
              </>
            )}

            {editSection === 'about' && (
              <>
                <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Bio (About)</Text>
                <TextInput style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 16, height: 120, textAlignVertical: 'top' }} value={editForm.bio} onChangeText={(t) => setEditForm({...editForm, bio: t})} multiline />
              </>
            )}

            {editSection === 'experience' && (
              <>
                  <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Title*</Text>
                  <TextInput style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 16 }} placeholder="Ex: Retail Sales Manager" value={experienceForm.title} onChangeText={(t) => setExperienceForm({...experienceForm, title: t})} />

                  <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Employment type</Text>
                  <TextInput style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 16 }} placeholder="Please select" value={experienceForm.employmentType} onChangeText={(t) => setExperienceForm({...experienceForm, employmentType: t})} />

                  <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Company or organization*</Text>
                  <TextInput style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 16 }} placeholder="Ex: Microsoft" value={experienceForm.company} onChangeText={(t) => setExperienceForm({...experienceForm, company: t})} />

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <TouchableOpacity onPress={() => setExperienceForm({ ...experienceForm, current: !experienceForm.current })} style={{ width: 24, height: 24, borderWidth: 2, borderColor: '#6B7280', borderRadius: 4, marginRight: 8, backgroundColor: experienceForm.current ? '#10B981' : 'transparent' }} />
                    <Text style={{ fontSize: 16, color: '#374151' }}>I am currently working in this role</Text>
                  </View>

                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>Start date</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    <TextInput style={{ flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB' }} placeholder="Month*" value={experienceForm.startMonth} onChangeText={(t) => setExperienceForm({...experienceForm, startMonth: t})} />
                    <TextInput style={{ flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB' }} placeholder="Year*" value={experienceForm.startYear} onChangeText={(t) => setExperienceForm({...experienceForm, startYear: t})} />
                  </View>

                  {!experienceForm.current && (
                    <>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>End date</Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                        <TextInput style={{ flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB' }} placeholder="Month*" value={experienceForm.endMonth} onChangeText={(t) => setExperienceForm({...experienceForm, endMonth: t})} />
                        <TextInput style={{ flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB' }} placeholder="Year*" value={experienceForm.endYear} onChangeText={(t) => setExperienceForm({...experienceForm, endYear: t})} />
                      </View>
                    </>
                  )}

                  <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Location</Text>
                  <TextInput style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 16 }} placeholder="Ex: London, United Kingdom" value={experienceForm.location} onChangeText={(t) => setExperienceForm({...experienceForm, location: t})} />

                  <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Location type</Text>
                  <TextInput style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 16 }} placeholder="Pick a location type (ex: remote)" value={experienceForm.locationType} onChangeText={(t) => setExperienceForm({...experienceForm, locationType: t})} />

                  <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Description</Text>
                  <TextInput style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 16, height: 100, textAlignVertical: 'top' }} placeholder="Describe your responsibilities" value={experienceForm.description} onChangeText={(t) => setExperienceForm({...experienceForm, description: t})} multiline />                </>
              )}
            {editSection === 'education' && (
              <>
                <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Education details</Text>
                <TextInput style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 16, height: 120, textAlignVertical: 'top' }} value={editForm.education} onChangeText={(t) => setEditForm({...editForm, education: t})} multiline />
              </>
            )}

            {editSection === 'skills' && (
              <>
                <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 4 }}>Skills (comma separated)</Text>
                <TextInput style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 24 }} value={editForm.skills} onChangeText={(t) => setEditForm({...editForm, skills: t})} />
              </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 40 }}>
                {editSection === 'experience' && editingIndex >= 0 && (
                  <TouchableOpacity style={{ flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#FEE2E2', borderRadius: 8, marginRight: 8 }} onPress={() => saveProfile(editingIndex)}>
                    <Text style={{ color: '#DC2626', fontWeight: 'bold' }}>Delete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={{ flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, marginRight: 8 }} onPress={() => setEditModalVisible(false)}>
                  <Text style={{ color: '#4B5563', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#6366F1', borderRadius: 8, marginLeft: 8 }} onPress={() => saveProfile()}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* CONNECTIONS MODAL */}
      <Modal visible={isConnectionsModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setConnectionsModalVisible(false)} style={{ marginRight: 16 }}>
              <Text style={{ fontSize: 20, color: '#6B7280' }}>{'<'} Back</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Connections</Text>
          </View>
          {loadingConnections ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : connectionsList.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#6B7280' }}>No connections yet.</Text>
            </View>
          ) : (
            <FlatList
              data={connectionsList}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}>
                  <Image
                    source={{ uri: (item.avatarUrl && !item.avatarUrl.includes('faker-js') ? item.avatarUrl : null) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'User')}&background=random` }}
                    style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F2937' }}>{item.name}</Text>
                    <Text style={{ fontSize: 14, color: '#4B5563', marginTop: 2 }}>{item.role || 'Member'}</Text>
                  </View>
                  <TouchableOpacity style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#6366F1' }}
                    onPress={() => {
                      setConnectionsModalVisible(false);
                      if (onNavigateToProfile) onNavigateToProfile(item.id);
                    }}
                  >
                    <Text style={{ color: '#6366F1', fontWeight: '500' }}>View Profile</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      <ScrollView style={styles.container}>
      {/* Cover Photo */}
      <View style={styles.coverPhoto} />
      
      {/* Profile Info */}
      <View style={styles.profileHeader}>
        <Image source={{ uri: safeAvatar }} style={styles.avatar} />
        
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.role}>{user.role || 'New Member'}</Text>
        <Text style={styles.location}>{user.location || 'Location not set'}</Text>
        
<TouchableOpacity style={styles.connectionStats} onPress={() => {
          setConnectionsModalVisible(true);
          const fetchConnections = async () => {
            try {
              setLoadingConnections(true);
              const targetId = userId || loggedInUser?.id;
              const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/${targetId}/connections`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
              });
              if (res.ok) {
                const data = await res.json();
                setConnectionsList(data);
              }
            } catch (err) {
              console.error(err);
            } finally {
              setLoadingConnections(false);
            }
          };
          fetchConnections();
        }}>
          <Text style={styles.statText}>
            <Text style={styles.statNumber}>{user.connectionsCount || 0}</Text> Connections
          </Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          {(!userId || userId === loggedInUser?.id) ? (
            <>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => handleEditProfile('basic')}>
                <Text style={styles.primaryBtnText}>Edit Profile</Text>
              </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => Share.share({ message: `Check out ${user.name}'s profile on ConnectIn!` })}>
                <Text style={styles.secondaryBtnText}>Share Profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={[styles.primaryBtn, user.connectionStatus === 'PENDING' ? { backgroundColor: '#D1D5DB' } : (user.connectionStatus === 'ACCEPTED' ? { backgroundColor: '#ef4444' } : null)]} onPress={user.connectionStatus === 'ACCEPTED' ? handleDisconnect : handleConnect} disabled={isConnecting || user.connectionStatus === 'PENDING'}>
                <Text style={styles.primaryBtnText}>{user.connectionStatus === 'PENDING' ? 'Requested' : (user.connectionStatus === 'ACCEPTED' ? 'Unconnect' : (isConnecting ? 'Sending...' : 'Connect'))}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryBtn, user.connectionStatus !== 'ACCEPTED' ? { opacity: 0.5, borderColor: '#E5E7EB' } : null]} onPress={() => { if (user.connectionStatus !== 'ACCEPTED') { Alert.alert('Connection Required', 'You need to be mutually connected to send a message.'); return; } if (onNavigateToMessages) { onNavigateToMessages(); } else { Alert.alert('Message', 'Check the Messages tab to start chatting.'); } }} disabled={user.connectionStatus !== 'ACCEPTED'}>
                <Text style={[styles.secondaryBtnText, user.connectionStatus !== 'ACCEPTED' ? { color: '#9CA3AF' } : null]}>Message</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

{/* Main Feature: Experience Section */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.cardTitle}>Experience</Text>
          {(!userId || userId === loggedInUser?.id) && (
            <TouchableOpacity onPress={() => handleEditProfile('experience')}>
               <Text style={{ fontSize: 24, color: '#6B7280' }}>+</Text>  
            </TouchableOpacity>
          )}
        </View>
        {(()=>{
          if (!user.experience) return <Text style={styles.cardBody}>No professional experience added yet. Add your employment history to stand out in the network.</Text>;
          try {
            const expArray = JSON.parse(user.experience);
            if (Array.isArray(expArray)) {
              return expArray.map((exp: any, idx: number) => (
                <View key={idx} style={{ marginBottom: 16, borderLeftWidth: 2, borderLeftColor: '#E5E7EB', paddingLeft: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{exp.title || 'Untitled Role'}</Text>
                      <Text style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>{exp.company || 'Unknown Company'} {exp.employmentType ? `• ${exp.employmentType}` : ''}</Text>
                    </View>
                    {(!userId || userId === loggedInUser?.id) && (
                      <TouchableOpacity onPress={() => handleEditProfile('experience', idx)} style={{ padding: 4 }}>
                        <Text style={{ fontSize: 14, color: '#6366F1', fontWeight: 'bold' }}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>{exp.startMonth} {exp.startYear} - {exp.current ? 'Present' : `${exp.endMonth} ${exp.endYear}`} {exp.location ? `• ${exp.location}` : ''}</Text>
                  {exp.description ? <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20 }}>{exp.description}</Text> : null}
                </View>
              ));
            }
          } catch {
            return <Text style={styles.cardBody}>{user.experience}</Text>;
          }
        })()}
      </View>

      {/* Main Feature: Education Section */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.cardTitle}>Education</Text>
          {(!userId || userId === loggedInUser?.id) && (
            <TouchableOpacity onPress={() => handleEditProfile('education')}>
               <Text style={{ fontSize: 24, color: '#6B7280' }}>+</Text>  
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.cardBody}>{user.education || 'Add your educational background.'}</Text>
      </View>

      {/* About Section */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.cardTitle}>About</Text>
          {(!userId || userId === loggedInUser?.id) && (
            <TouchableOpacity onPress={() => handleEditProfile('about')}>
               <Text style={{ fontSize: 24, color: '#6B7280' }}>+</Text>  
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.cardBody}>{user.bio || 'This user hasn\'t added a bio yet.'}</Text>
      </View>

      {/* Skills Section */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.cardTitle}>Skills</Text>
          {(!userId || userId === loggedInUser?.id) && (
            <TouchableOpacity onPress={() => handleEditProfile('skills')}>
               <Text style={{ fontSize: 24, color: '#6B7280' }}>+</Text>  
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.skillsContainer}>
          {parsedSkills.length > 0 ? parsedSkills.map((skill: string, i: number) => (
            <Text key={i} style={styles.skillBadge}>{skill}</Text>
          )) : (
            <Text style={styles.cardBody}>No skills listed.</Text>
          )}
        </View>
      </View>

      {/* Logout - Only show if own profile */}
      {(!userId || userId === loggedInUser?.id) && (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Sign out</Text>
        </TouchableOpacity>
      )}
      
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  coverPhoto: {
    height: 120,
    backgroundColor: '#818CF8', // modern gradient-like color
  },
  profileHeader: {
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
    marginTop: -60,
    marginBottom: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  role: {
    fontSize: 16,
    color: '#1F2937',
    marginTop: 4,
  },
  location: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  connectionStats: {
    marginTop: 12,
  },
  statText: {
    color: '#6366F1',
    fontWeight: '700',
  },
  statNumber: {
    color: '#111827',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  primaryBtnText: {
    color: 'white',
    fontWeight: '700',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#9CA3AF',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  secondaryBtnText: {
    color: '#4B5563',
    fontWeight: '700',
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  logoutBtn: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    borderRadius: 12,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 16,
  }
});

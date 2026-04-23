const fs = require('fs');

let text = fs.readFileSync('../app/screens/ProfileScreen.tsx', 'utf-8');

const topImports = "import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Modal, TextInput } from 'react-native';";

if (!text.includes('isEditing')) {
  text = text.replace("import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';", topImports);

  const editLogic = `  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user.name || '',
    role: user.role || '',
    location: user.location || '',
    bio: user.bio || '',
    skills: Array.isArray(user.skills) ? user.skills.join(', ') : (user.skills || '')
  });

  const handleEditProfile = () => {
    setEditForm({
      name: user.name || '',
      role: user.role || '',
      location: user.location || '',
      bio: user.bio || '',
      skills: Array.isArray(user.skills) ? user.skills.join(', ') : (user.skills || '')
    });
    setIsEditing(true);
  };

  const saveProfile = async () => {
    try {
      const res = await fetch(\`\${process.env.EXPO_PUBLIC_API_URL}/api/user/settings\`, {
        method: 'PUT',
        headers: {
          'Authorization': \`Bearer \${state.token}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setIsEditing(false);
        alert("Profile updated! Navigating to reload data...");
        // Fast hard fallback
        dispatch({ type: 'LOGOUT' }); 
      } else {
        alert("Failed to update profile.");
      }
    } catch(e) {
      console.error(e);
    }
  };

  const EditModal = () => (
    <Modal visible={isEditing} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#F9FAFB' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Edit Profile</Text>
        
        <Text style={{ fontWeight: '600', marginTop: 10 }}>Name</Text>
        <TextInput style={styles.input} value={editForm.name} onChangeText={t => setEditForm({...editForm, name: t})} />
        
        <Text style={{ fontWeight: '600', marginTop: 10 }}>Headline / Role</Text>
        <TextInput style={styles.input} value={editForm.role} onChangeText={t => setEditForm({...editForm, role: t})} />
        
        <Text style={{ fontWeight: '600', marginTop: 10 }}>Location</Text>
        <TextInput style={styles.input} value={editForm.location} onChangeText={t => setEditForm({...editForm, location: t})} />
        
        <Text style={{ fontWeight: '600', marginTop: 10 }}>About / Bio</Text>
        <TextInput style={[styles.input, { height: 80 }]} multiline value={editForm.bio} onChangeText={t => setEditForm({...editForm, bio: t})} />
        
        <Text style={{ fontWeight: '600', marginTop: 10 }}>Skills (comma separated)</Text>
        <TextInput style={styles.input} value={editForm.skills} onChangeText={t => setEditForm({...editForm, skills: t})} />
        
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 30 }]} onPress={saveProfile}>
          <Text style={styles.primaryBtnText}>Save Changes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 10 }]} onPress={() => setIsEditing(false)}>
          <Text style={styles.secondaryBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );`;

  // Find handleEditProfile to replace
  const oldFunc = `  const handleEditProfile = () => {
    // This is where we will route to the Onboarding / Edit Profile sequence
    alert("Navigating to Edit Profile screen! (To be built next)");
  };`;
  text = text.replace(oldFunc, editLogic);
  
  if(!text.includes('import React, { useState }')) {
    text = text.replace('import React from \'react\';', "import React, { useState } from 'react';");
  }

  // Inject the EditModal component
  text = text.replace('<ScrollView style={styles.container}>\r\n      {/* Cover Photo */}', '<>\n      <EditModal />\n      <ScrollView style={styles.container}>\n      {/* Cover Photo */}').replace('<ScrollView style={styles.container}>\n      {/* Cover Photo */}', '<>\n      <EditModal />\n      <ScrollView style={styles.container}>\n      {/* Cover Photo */}');
  text = text.replace('</ScrollView>', '</ScrollView>\n    </>');

  // Add styles
  text = text.replace('});', `  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    fontSize: 16
  }
});`);

  fs.writeFileSync('../app/screens/ProfileScreen.tsx', text);
  console.log("Profile Edit Logic Added");
} else {
  console.log("Already added.");
}

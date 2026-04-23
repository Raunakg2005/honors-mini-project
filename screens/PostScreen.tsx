import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, Modal, Animated, ActivityIndicator } from 'react-native';
import { useAppContext } from '../store/AppContext';
import * as ImagePicker from 'expo-image-picker';

interface PostScreenProps {
  onClose?: () => void;
}

export function PostScreen({ onClose }: PostScreenProps) {
  const { state, dispatch } = useAppContext();
  const [postText, setPostText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);

  // A mock current user to show in the composer
  // If your auth flow has `state.activeUser`, you should use that instead.
  const currentUser = state.activeUser || {
    id: 'u-me',
    name: 'You',
    avatarUrl: 'https://i.pravatar.cc/150?img=11',
    role: 'React Native Developer'
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (postText.trim() || selectedImage) {
      setIsUploading(true);
      let uploadedImageUrl = null;
      let postSuccess = false;
      
      try {
        if (selectedImage) {
          const formData = new FormData() as any;
          const uriParts = selectedImage.split('.');
          const fileType = uriParts.length > 1 ? uriParts[uriParts.length - 1] : 'jpeg';

          if (Platform.OS === 'web') {
            const res = await fetch(selectedImage);
            const blob = await res.blob();
            formData.append('file', blob, 'photo.jpg');
          } else {
            formData.append('file', {
              uri: selectedImage,
              name: `photo.${fileType}`,
              type: `image/${fileType}`,
            });
          }

          const uploadRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/upload`, {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${state.token}`
            }
          });
          
          if (!uploadRes.ok) {
             const errorText = await uploadRes.text();
             console.error('Upload failure:', uploadRes.status, errorText);
             throw new Error('Image upload failed');
          }
          
          const uploadData = await uploadRes.json();
          if (uploadData.url) {
             uploadedImageUrl = `${process.env.EXPO_PUBLIC_API_URL}${uploadData.url}`;
          }
        }

        setShowSuccessCard(true);
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/posts`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}` 
          },
          body: JSON.stringify({
            content: postText,
            imageUrl: uploadedImageUrl
          })
        });

        if (response.ok) {
          const postData = await response.json();
          dispatch({ type: 'ADD_POST', payload: postData });
          postSuccess = true;
        } else {
          alert('Failed to create post');
          setShowSuccessCard(false);
        }
      } catch (error) {
        console.error(error);
        alert('Error creating post');
        setShowSuccessCard(false);
      } finally {
        setIsUploading(false);
      }

      if (postSuccess) {
        setTimeout(() => {
          setShowSuccessCard(false);
          setPostText('');
          setSelectedImage(null);
          if (onClose) onClose();
        }, 1800);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Success Modal */}
      <Modal transparent={true} visible={showSuccessCard} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successText}>Post successful!</Text>
            <Text style={styles.successSubtext}>Your post has been shared with your network.</Text>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share post</Text>
        </View>
        <TouchableOpacity 
          style={[styles.postButton, (!postText.trim() && !selectedImage) && styles.postButtonDisabled]} 
          onPress={handlePost}
          disabled={(!postText.trim() && !selectedImage)}
        >
          <Text style={[styles.postButtonText, (!postText.trim() && !selectedImage) && styles.postButtonTextDisabled]}>
            Post
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollContent}>
          {/* User Info Section */}
          <View style={styles.userInfo}>
            <Image 
              source={{ uri: currentUser.avatarUrl || 'https://via.placeholder.com/150' }} 
              style={styles.avatar} 
            />
            <View>
              <Text style={styles.userName}>{currentUser.name}</Text>
              <TouchableOpacity style={styles.visibilityPill}>
                <Text style={styles.visibilityText}>🌍 Anyone ▾</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Text Input */}
          <TextInput
            style={styles.input}
            placeholder="What do you want to talk about?"
            placeholderTextColor="#666"
            multiline
            autoFocus
            value={postText}
            onChangeText={setPostText}
            textAlignVertical="top"
          />

          {/* Render selected image preview */}
          {selectedImage && (
            <View style={{ margin: 16, position: 'relative' }}>
              <Image source={{ uri: selectedImage }} style={{ width: '100%', height: 250, borderRadius: 12 }} />
              <TouchableOpacity
                style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20 }}
                onPress={() => setSelectedImage(null)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Media Attachments Tray at the bottom */}
        <View style={styles.attachmentTray}>
          <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
            <Text style={styles.trayIcon}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.trayIcon}>🎥</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.trayIcon}>📄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.trayIcon}>💼</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.trayIcon}>⭐</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 45, // Safe area
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    backgroundColor: '#FFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    marginRight: 16,
  },
  closeIcon: {
    fontSize: 22,
    color: '#666',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  postButton: {
    backgroundColor: '#0A66C2',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  postButtonDisabled: {
    backgroundColor: '#EBEBEB',
  },
  postButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  postButtonTextDisabled: {
    color: '#A0A0A0',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  visibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  visibilityText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    minHeight: 250,
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
  },
  attachmentTray: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    backgroundColor: '#FFF',
  },
  iconButton: {
    marginRight: 20,
    padding: 8,
  },
  trayIcon: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    
    
    
    
    elevation: 6,
  },
  successIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5F4E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 32,
    color: '#057642',
    fontWeight: 'bold',
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  }
});
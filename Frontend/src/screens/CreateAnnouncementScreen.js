import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { createAnnouncement } from '../services/announcementService';

const CreateAnnouncementScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      await createAnnouncement({ title, content });
      Alert.alert('Success', 'Announcement posted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Announcement Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter title..."
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Content</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Write your announcement here..."
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting
          ? <ActivityIndicator color="#FFF" />
          : <Text style={styles.buttonText}>Post Announcement</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#34495E', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#E0E6ED', marginBottom: 4,
  },
  textArea: { minHeight: 140, paddingTop: 12 },
  button: {
    backgroundColor: '#27AE60', padding: 15, borderRadius: 10,
    alignItems: 'center', marginTop: 24,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

export default CreateAnnouncementScreen;

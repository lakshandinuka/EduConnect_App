import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput, ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import {
  createKBFAQ,
  deleteKBFAQ,
  getAdminKBFAQs,
  updateKBFAQ,
} from '../services/knowledgeBaseService';

const emptyForm = { question: '', answer: '', category: 'General', status: 'PUBLISHED', sortOrder: '0' };

const ManageKBFAQsScreen = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');

  const fetchFaqs = async () => {
    try {
      const data = await getAdminKBFAQs();
      setFaqs(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load FAQs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchFaqs(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((faq) =>
      (faq.question || '').toLowerCase().includes(q)
      || (faq.answer || '').toLowerCase().includes(q)
      || (faq.category || '').toLowerCase().includes(q)
    );
  }, [faqs, query]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEdit = (faq) => {
    setEditing(faq);
    setForm({
      question: faq.question || '',
      answer: faq.answer || '',
      category: faq.category || 'General',
      status: faq.status || 'PUBLISHED',
      sortOrder: String(faq.sortOrder || 0),
    });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      Alert.alert('Error', 'Question and answer are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form, sortOrder: Number(form.sortOrder) || 0 };
      if (editing) {
        await updateKBFAQ(editing.id, payload);
      } else {
        await createKBFAQ(payload);
      }
      setModalVisible(false);
      fetchFaqs();
    } catch (error) {
      Alert.alert('Error', 'Failed to save FAQ');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = (faq) => {
    Alert.alert('Delete FAQ', 'Delete this FAQ?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteKBFAQ(faq.id);
            fetchFaqs();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete FAQ');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.question}>{item.question}</Text>
        <View style={[styles.badge, { backgroundColor: item.status === 'PUBLISHED' ? '#27AE60' : '#F39C12' }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.category}>{item.category || 'General'}</Text>
      <Text style={styles.answer} numberOfLines={3}>{item.answer}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
          <Ionicons name="create-outline" size={18} color="#2C3E50" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => remove(item)}>
          <Ionicons name="trash-outline" size={18} color="#E74C3C" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#3498DB" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#7F8C8D" />
        <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Search FAQs" />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFaqs(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No FAQs found.</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editing ? 'Edit FAQ' : 'New FAQ'}</Text>
              <TextInput style={styles.input} value={form.question} onChangeText={(value) => setForm({ ...form, question: value })} placeholder="Question *" />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.answer}
                onChangeText={(value) => setForm({ ...form, answer: value })}
                placeholder="Answer *"
                multiline
                textAlignVertical="top"
              />
              <TextInput style={styles.input} value={form.category} onChangeText={(value) => setForm({ ...form, category: value })} placeholder="Category" />
              <TextInput style={styles.input} value={form.sortOrder} onChangeText={(value) => setForm({ ...form, sortOrder: value })} placeholder="Sort order" keyboardType="numeric" />
              <View style={styles.pickerContainer}>
                <Picker selectedValue={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                  <Picker.Item label="Published" value="PUBLISHED" />
                  <Picker.Item label="Draft" value="DRAFT" />
                </Picker>
              </View>
              <View style={styles.modalRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15 },
  list: { padding: 16, paddingBottom: 88 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  question: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  category: { color: '#3498DB', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  answer: { color: '#7F8C8D', marginTop: 8, lineHeight: 20 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F5F7FA', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  actionText: { color: '#2C3E50', fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: '#7F8C8D', marginTop: 30 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#3498DB', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, maxHeight: '86%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 16 },
  input: { backgroundColor: '#F5F7FA', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12, borderWidth: 1, borderColor: '#E0E6ED' },
  textArea: { minHeight: 120, paddingTop: 12 },
  pickerContainer: { backgroundColor: '#F5F7FA', borderRadius: 8, borderWidth: 1, borderColor: '#E0E6ED', marginBottom: 12 },
  modalRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#ECF0F1', borderRadius: 8, padding: 13, alignItems: 'center' },
  cancelText: { color: '#7F8C8D', fontWeight: 'bold' },
  saveBtn: { flex: 1, backgroundColor: '#3498DB', borderRadius: 8, padding: 13, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold' },
});

export default ManageKBFAQsScreen;

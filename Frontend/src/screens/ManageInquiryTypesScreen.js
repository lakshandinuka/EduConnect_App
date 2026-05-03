import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput
} from 'react-native';
import { getInquiryTypes, createInquiryType } from '../services/inquiryTypeService';
import { Ionicons } from '@expo/vector-icons';

const ManageInquiryTypesScreen = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTypes = async () => {
    try {
      const data = await getInquiryTypes();
      setTypes(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load inquiry types');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchTypes(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setSubmitting(true);
    try {
      await createInquiryType({ name, description });
      setName(''); setDescription('');
      setModalVisible(false);
      fetchTypes();
    } catch (e) {
      Alert.alert('Error', 'Failed to create inquiry type');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="help-circle-outline" size={22} color="#8E44AD" />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.name}>{item.name}</Text>
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
      </View>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#8E44AD" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={types}
        keyExtractor={(i) => i._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTypes(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No inquiry types found.</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Inquiry Type</Text>
            <TextInput style={styles.input} placeholder="Inquiry Type Name *" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Description (optional)" value={description} onChangeText={setDescription} />
            <View style={styles.row}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.createText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, elevation: 2,
  },
  iconWrap: { backgroundColor: '#F5EEF8', borderRadius: 10, padding: 10, marginRight: 14 },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  desc: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
  fab: {
    position: 'absolute', bottom: 20, right: 20, backgroundColor: '#8E44AD',
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5,
  },
  empty: { textAlign: 'center', color: '#7F8C8D', marginTop: 30 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 16 },
  input: {
    backgroundColor: '#F5F7FA', borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 11, marginBottom: 12, fontSize: 15, borderWidth: 1, borderColor: '#E0E6ED',
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: '#ECF0F1', borderRadius: 8, padding: 13, alignItems: 'center' },
  cancelText: { color: '#7F8C8D', fontWeight: 'bold' },
  createBtn: { flex: 1, backgroundColor: '#8E44AD', borderRadius: 8, padding: 13, alignItems: 'center' },
  createText: { color: '#FFF', fontWeight: 'bold' },
});

export default ManageInquiryTypesScreen;

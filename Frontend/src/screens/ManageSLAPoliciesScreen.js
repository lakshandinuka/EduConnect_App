import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput, ScrollView
} from 'react-native';
import { getSLAPolicies, createSLAPolicy } from '../services/slaPolicyService';
import { Ionicons } from '@expo/vector-icons';

const ManageSLAPoliciesScreen = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [responseTime, setResponseTime] = useState('');
  const [resolutionTime, setResolutionTime] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPolicies = async () => {
    try {
      const data = await getSLAPolicies();
      setPolicies(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load SLA policies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchPolicies(); }, []);

  const handleCreate = async () => {
    if (!name.trim() || !responseTime || !resolutionTime) { 
      Alert.alert('Error', 'Name, Response Time, and Resolution Time are required'); 
      return; 
    }
    setSubmitting(true);
    try {
      await createSLAPolicy({ 
        name, 
        responseTime: parseInt(responseTime), 
        resolutionTime: parseInt(resolutionTime),
        description 
      });
      setName(''); setResponseTime(''); setResolutionTime(''); setDescription('');
      setModalVisible(false);
      fetchPolicies();
    } catch (e) {
      Alert.alert('Error', 'Failed to create SLA policy');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="shield-checkmark-outline" size={22} color="#C0392B" />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.desc}>{item.description}</Text>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>Response: {item.responseTime}h</Text>
          <Text style={styles.timeText}>Resolution: {item.resolutionTime}h</Text>
        </View>
      </View>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#C0392B" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={policies}
        keyExtractor={(i) => i._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPolicies(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No SLA policies found.</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView>
              <Text style={styles.modalTitle}>Add SLA Policy</Text>
              <TextInput style={styles.input} placeholder="Policy Name *" value={name} onChangeText={setName} />
              <TextInput style={styles.input} placeholder="Response Time (hours) *" value={responseTime} onChangeText={setResponseTime} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Resolution Time (hours) *" value={resolutionTime} onChangeText={setResolutionTime} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} />
              <View style={styles.row}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.createText}>Add</Text>}
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, elevation: 2,
  },
  iconWrap: { backgroundColor: '#FDEDEC', borderRadius: 10, padding: 10, marginRight: 14 },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  desc: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
  timeRow: { flexDirection: 'row', marginTop: 8, gap: 15 },
  timeText: { fontSize: 12, color: '#C0392B', fontWeight: 'bold' },
  fab: {
    position: 'absolute', bottom: 20, right: 20, backgroundColor: '#C0392B',
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5,
  },
  empty: { textAlign: 'center', color: '#7F8C8D', marginTop: 30 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 16 },
  input: {
    backgroundColor: '#F5F7FA', borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 11, marginBottom: 12, fontSize: 15, borderWidth: 1, borderColor: '#E0E6ED',
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: '#ECF0F1', borderRadius: 8, padding: 13, alignItems: 'center' },
  cancelText: { color: '#7F8C8D', fontWeight: 'bold' },
  createBtn: { flex: 1, backgroundColor: '#C0392B', borderRadius: 8, padding: 13, alignItems: 'center' },
  createText: { color: '#FFF', fontWeight: 'bold' },
});

export default ManageSLAPoliciesScreen;

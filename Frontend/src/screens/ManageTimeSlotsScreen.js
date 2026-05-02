import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput
} from 'react-native';
import { getAllTimeSlots, createTimeSlot } from '../services/bookingService';
import { Ionicons } from '@expo/vector-icons';

const ManageTimeSlotsScreen = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSlots = async () => {
    try {
      const data = await getAllTimeSlots();
      setSlots(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load time slots');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSlots(); }, []);

  const handleCreate = async () => {
    if (!date || !startTime || !endTime) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      await createTimeSlot({ date, startTime, endTime });
      setDate(''); setStartTime(''); setEndTime('');
      setModalVisible(false);
      fetchSlots();
    } catch (e) {
      Alert.alert('Error', 'Failed to create time slot');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="time-outline" size={20} color="#9B59B6" />
        <Text style={styles.cardDate}>{new Date(item.date).toLocaleDateString()}</Text>
        <View style={[styles.badge, { backgroundColor: item.isAvailable ? '#27AE60' : '#E74C3C' }]}>
          <Text style={styles.badgeText}>{item.isAvailable ? 'AVAILABLE' : 'BOOKED'}</Text>
        </View>
      </View>
      <Text style={styles.timeText}>{item.startTime} – {item.endTime}</Text>
      {item.assignedStaff && (
        <Text style={styles.staffText}>Staff: {item.assignedStaff.name}</Text>
      )}
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#9B59B6" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={slots}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSlots(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No time slots found.</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Time Slot</Text>
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
            />
            <TextInput
              style={styles.input}
              placeholder="Start Time (e.g. 09:00)"
              value={startTime}
              onChangeText={setStartTime}
            />
            <TextInput
              style={styles.input}
              placeholder="End Time (e.g. 10:00)"
              value={endTime}
              onChangeText={setEndTime}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.createText}>Create</Text>}
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
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 5, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardDate: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginLeft: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  timeText: { fontSize: 15, color: '#9B59B6', fontWeight: '600' },
  staffText: { fontSize: 12, color: '#7F8C8D', marginTop: 4 },
  fab: {
    position: 'absolute', bottom: 20, right: 20, backgroundColor: '#9B59B6',
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center',
    alignItems: 'center', elevation: 5,
  },
  empty: { textAlign: 'center', color: '#7F8C8D', marginTop: 30 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 16 },
  input: {
    backgroundColor: '#F5F7FA', borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 11, marginBottom: 12, fontSize: 15, borderWidth: 1, borderColor: '#E0E6ED',
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: '#ECF0F1', borderRadius: 8, padding: 13, alignItems: 'center' },
  cancelText: { color: '#7F8C8D', fontWeight: 'bold' },
  createBtn: { flex: 1, backgroundColor: '#9B59B6', borderRadius: 8, padding: 13, alignItems: 'center' },
  createText: { color: '#FFF', fontWeight: 'bold' },
});

export default ManageTimeSlotsScreen;
